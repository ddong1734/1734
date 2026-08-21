// 파일명: core/netKid.js
// ============================================================================
// 🧲 유스타스 키드 — 네트워크 수신
//
//   · kidAssign      : 1번 [어사인] 자기력 부여
//   · kidAssignBlast : 고철 폭발
//   · kidLaserCast   : 2번 [댐드 펑크] 차징 (3초)
//   · kidLaserFire   : 레이저포 발사 (4초)
//   · kidLaserTick   : 0.1초마다 각도 갱신
//   · kidLaserEnd    : 발사 종료
//   · kidGolemCast   : 3번 [펑크 로튼] 변신 (5초)
//   · kidGolemStart  : 골렘 완성
//   · kidGolemEnd    : 골렘 해제
// ============================================================================

window.registerNetModule('kid', function (socket, U) {

    const frames = (ms) => Math.max(1, Math.round(ms / (1000 / 60)));

    // ── 🧲 1번 [어사인] ──────────────────────────────────────────
    socket.on('kidAssign', (d) => {
        if (!d) return;
        window.visualFX.push({
            id: d.id, type: 'kid_assign',
            x: d.x, y: d.y, radius: d.radius || 430,
            targets: d.targets || [], golem: !!d.golem,
            durationMs: 620, life: 37, maxLife: 37
        });
    });

    socket.on('kidAssignBlast', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'kid_assign_blast', x: d.x, y: d.y,
            radius: d.radius || 250, golem: !!d.golem,
            durationMs: 560, life: 34, maxLife: 34
        });
    });

    // ── 🔫 2번 [댐드 펑크] ──────────────────────────────────────
    socket.on('kidLaserCast', (d) => {
        if (!d) return;
        const ms = d.castMs || 3000;
        window.visualFX.push({
            id: d.id, type: 'kid_laser_cast',
            x: d.x, y: d.y, angle: d.angle || 0, golem: !!d.golem,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        if (d.id === window.myId) {
            window.myPlayer.kidLaserCastEnd = Date.now() + ms;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
        }
    });

    socket.on('kidLaserFire', (d) => {
        if (!d) return;
        const ms = d.fireMs || 4000;
        window.visualFX.push({
            id: d.id, type: 'kid_laser',
            x: d.x, y: d.y, angle: d.angle || 0, liveAngle: d.angle || 0,
            range: d.range || 2600, halfWidth: d.halfWidth || 130,
            golem: !!d.golem,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        if (d.id === window.myId) {
            window.myPlayer.kidLaserCastEnd = 0;
            window.myPlayer.kidLaserFireEnd = Date.now() + ms;
        }
    });

    // 서버가 매 틱 각도를 보내 준다 — 이펙트를 그 각도로 돌린다
    socket.on('kidLaserTick', (d) => {
        if (!d) return;
        for (let i = 0; i < window.visualFX.length; i++) {
            const fx = window.visualFX[i];
            if (fx && fx.type === 'kid_laser' && fx.id === d.id) fx.liveAngle = d.angle;
        }
    });

    socket.on('kidLaserEnd', (d) => {
        if (!d) return;
        U.clearFXByType('kid_laser', d.id);
        if (d.id === window.myId) window.myPlayer.kidLaserFireEnd = 0;
    });

    // ── 🗿 3번 [펑크 로튼] ──────────────────────────────────────
    socket.on('kidGolemCast', (d) => {
        if (!d) return;
        const ms = d.castMs || 5000;
        window.visualFX.push({
            id: d.id, type: 'kid_golem_cast', x: d.x, y: d.y,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        if (d.id === window.myId) {
            window.myPlayer.kidGolemCastEnd = Date.now() + ms;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
        }
    });

    socket.on('kidGolemStart', (d) => {
        if (!d) return;
        const ms = d.durationMs || 20000;
        window.visualFX.push({
            id: d.id, type: 'kid_golem_aura', x: d.x, y: d.y, field: !!d.field,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        if (d.id === window.myId) {
            window.myPlayer.kidGolemCastEnd = 0;
            window.myPlayer.kidGolemEnd = Date.now() + ms;
            if (typeof window.showAlert === 'function') window.showAlert('🗿 고철 골렘!');
        }
    });

    socket.on('kidGolemEnd', (d) => {
        if (!d) return;
        U.clearFXByType('kid_golem_aura', d.id);
        if (d.id === window.myId) window.myPlayer.kidGolemEnd = 0;
    });
});
