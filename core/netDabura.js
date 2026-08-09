// 파일명: core/netDabura.js
// ============================================================================
// ⬛ 다부라 카라바 전용 네트워크 이벤트
//
//   · daburaLightStart / daburaLightBlast / daburaLightEnd
//        ☀️ [빛] — 위로 솟구친 뒤 아래로 2초간 연속폭발
//   · daburaDarkStart / daburaDarkPull / daburaDarkBlast / daburaDarkEnd
//        🌑 [어둠] — 어둠 구체 + 칼바람 소용돌이 (3초 흡인 후 폭발)
//   · daburaKickCharge / daburaKickLaunch / daburaKickBlast / daburaKickEnd
//        💫 [아광속 발차기] — 2초 응축 후 5초 활공, 적중 시 대폭발
// ============================================================================

window.registerNetModule('dabura', function (socket, U) {

    // ========================================================================
    // ☀️ 1번 [빛]
    // ========================================================================
    socket.on('daburaLightStart', (d) => {
        if (!d) return;
        let now = Date.now();
        let riseUntil = now + (d.riseTime || 180);
        let endAt = riseUntil + (d.duration || 2000);

        if (d.id === window.myId) {
            const p = window.myPlayer;
            p.dLightActive = true;
            p.dLightRiseUntil = riseUntil;
            p.dLightEnd = endAt;
            p.moveX = 0; p.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
            // 🎮 조이스틱 노브를 원위치로
            let knob = document.getElementById('knob');
            if (knob) knob.style.transform = 'translate(0px, 0px)';
        }
        if (window.players[d.id]) {
            window.players[d.id].dLightActive = true;
            window.players[d.id].dLightRiseUntil = riseUntil;
            window.players[d.id].dLightEnd = endAt;
        }

        // ☀️ 시전자 아래로 뻗는 '두 줄기 빛' (지속 이펙트)
        U.clearFXByType('dabura_light_beams', d.id);
        let totalDur = (d.riseTime || 180) + (d.duration || 2000);
        window.visualFX.push({
            type: 'dabura_light_beams',
            x: d.x, y: d.y,
            ownerId: d.id,
            radius: d.radius || 430,
            down: d.down || 200,
            square: !!d.square,
            durationMs: totalDur,
            life: U.frames(totalDur), maxLife: U.frames(totalDur)
        });
    });

    socket.on('daburaLightBlast', (d) => {
        if (!d) return;
        let dur = d.duration || 480;
        window.visualFX.push({
            type: 'dabura_light_blast',
            x: d.x, y: d.y,
            ownerId: d.ownerId || null,
            radius: d.radius || 430,
            square: !!d.square,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    socket.on('daburaLightEnd', (d) => {
        if (!d) return;
        if (d.id === window.myId) {
            const p = window.myPlayer;
            p.dLightActive = false;
            p.dLightEnd = 0;
            p.dLightRiseUntil = 0;
        }
        if (window.players[d.id]) {
            window.players[d.id].dLightActive = false;
            window.players[d.id].dLightEnd = 0;
            window.players[d.id].dLightRiseUntil = 0;
        }
        U.clearFXByType('dabura_light_beams', d.id);
    });

    // ========================================================================
    // 🌑 2번 [어둠]
    // ========================================================================
    socket.on('daburaDarkStart', (d) => {
        if (!d) return;
        let dur = d.duration || 3000;
        let endAt = Date.now() + dur;

        if (d.id === window.myId) {
            window.myPlayer.dDarkActive = true;
            window.myPlayer.dDarkEnd = endAt;
        }
        if (window.players[d.id]) {
            window.players[d.id].dDarkActive = true;
            window.players[d.id].dDarkEnd = endAt;
        }

        // 🌑 어둠 구체 + 칼바람 소용돌이 (지속 이펙트)
        U.clearFXByType('dabura_dark_vortex', d.id);
        window.visualFX.push({
            type: 'dabura_dark_vortex',
            x: d.x, y: d.y,
            ownerId: d.id,
            radius: d.radius || 900,
            coreR: d.coreR || 78,
            square: !!d.square,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    // 🌑 소용돌이에 끌려간다 (서버가 나에게만 보낸다)
    socket.on('daburaDarkPull', (d) => {
        if (!d) return;
        const p = window.myPlayer;
        if (!p || p.isDead) return;
        p.darkPullUntil = U.capUntil(d.until || (Date.now() + 120));
        if (Number.isFinite(d.x)) p.darkPullX = d.x;
        if (Number.isFinite(d.y)) p.darkPullY = d.y;
        if (Number.isFinite(d.pull)) p.darkPullPower = d.pull;
    });

    socket.on('daburaDarkBlast', (d) => {
        if (!d) return;
        let dur = d.duration || 640;
        window.visualFX.push({
            type: 'dabura_dark_blast',
            x: d.x, y: d.y,
            ownerId: d.ownerId || null,
            radius: d.radius || 520,
            square: !!d.square,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(420, 16, false);
    });

    socket.on('daburaDarkEnd', (d) => {
        if (!d) return;
        if (d.id === window.myId) {
            window.myPlayer.dDarkActive = false;
            window.myPlayer.dDarkEnd = 0;
        }
        if (window.players[d.id]) {
            window.players[d.id].dDarkActive = false;
            window.players[d.id].dDarkEnd = 0;
        }
        U.clearFXByType('dabura_dark_vortex', d.id);
    });

    // ========================================================================
    // 💫 3번 [아광속 발차기]
    // ========================================================================
    socket.on('daburaKickCharge', (d) => {
        if (!d) return;
        let dur = d.duration || 2000;
        let endAt = Date.now() + dur;

        if (d.id === window.myId) {
            const p = window.myPlayer;
            p.dKickCharging = true;
            p.dKickChargeEnd = endAt;
            p.dKickFlying = false;
            p.dKickFlyEnd = 0;
            p.moveX = 0; p.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
            let knob = document.getElementById('knob');
            if (knob) knob.style.transform = 'translate(0px, 0px)';
        }
        if (window.players[d.id]) {
            window.players[d.id].dKickCharging = true;
            window.players[d.id].dKickChargeEnd = endAt;
        }

        U.clearFXByType('dabura_kick_charge', d.id);
        window.visualFX.push({
            type: 'dabura_kick_charge',
            x: d.x, y: d.y,
            ownerId: d.id,
            square: !!d.square,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    socket.on('daburaKickLaunch', (d) => {
        if (!d) return;
        let dur = d.duration || 5000;
        let endAt = Date.now() + dur;

        if (d.id === window.myId) {
            const p = window.myPlayer;
            p.dKickCharging = false;
            p.dKickChargeEnd = 0;
            p.dKickFlying = true;
            p.dKickFlyEnd = endAt;
            p.vy = 0; p.knockbackForce = 0;
        }
        if (window.players[d.id]) {
            window.players[d.id].dKickCharging = false;
            window.players[d.id].dKickChargeEnd = 0;
            window.players[d.id].dKickFlying = true;
            window.players[d.id].dKickFlyEnd = endAt;
        }

        U.clearFXByType('dabura_kick_charge', d.id);
        // 💫 빛으로 변한 몸을 감싸는 지속 오라
        U.clearFXByType('dabura_kick_aura', d.id);
        window.visualFX.push({
            type: 'dabura_kick_aura',
            x: d.x, y: d.y,
            ownerId: d.id,
            square: !!d.square,
            durationMs: 1000,        // 매 프레임 갱신되어 사실상 지속 유지
            life: 60, maxLife: 60
        });
    });

    socket.on('daburaKickBlast', (d) => {
        if (!d) return;
        let dur = d.duration || 580;
        window.visualFX.push({
            type: 'dabura_kick_blast',
            x: d.x, y: d.y,
            ownerId: d.ownerId || null,
            radius: d.radius || 380,
            square: !!d.square,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(480, 20, false);
    });

    socket.on('daburaKickEnd', (d) => {
        if (!d) return;
        if (d.id === window.myId) {
            const p = window.myPlayer;
            p.dKickCharging = false;
            p.dKickChargeEnd = 0;
            p.dKickFlying = false;
            p.dKickFlyEnd = 0;
        }
        if (window.players[d.id]) {
            window.players[d.id].dKickCharging = false;
            window.players[d.id].dKickChargeEnd = 0;
            window.players[d.id].dKickFlying = false;
            window.players[d.id].dKickFlyEnd = 0;
        }
        U.clearFXByType('dabura_kick_charge', d.id);
        U.clearFXByType('dabura_kick_aura', d.id);
        U.clearFXByType('dabura_kick_trail', d.id);
    });
});