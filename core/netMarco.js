// 파일명: core/netMarco.js
// ============================================================================
// 🔥 마르코 — 네트워크 수신
//
//   · marcoWings       : 스킬 시전 시 펼쳐지는 푸른 양날개
//   · marcoRegen       : 게이지가 가득 차 몸이 불꽃에 뒤덮인다 (3초)
//   · marcoBall        : 1번 [봉황인] 불꽃 덩어리
//   · marcoBallBlast   : 덩어리 폭발
//   · marcoFieldCast   : 2번 [봉리력] 응축
//   · marcoField       : 2번 불길 장판
//   · marcoShield      : 3번 [불사 엉겅퀴] 보호막
//   · marcoShieldHit   : 보호막이 공격을 막는 순간
//   · marcoShieldBlast : 보호막 회전 폭발
// ============================================================================

window.registerNetModule('marco', function (socket, U) {

    const frames = (ms) => Math.max(1, Math.round(ms / (1000 / 60)));

    // ── ✨ 푸른 양날개 ────────────────────────────────────────────
    socket.on('marcoWings', (d) => {
        if (!d) return;
        const ms = d.durationMs || 900;
        window.visualFX.push({
            id: d.id, type: 'marco_wings', x: d.x, y: d.y,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
    });

    // ── 🔥 재생 불꽃 (3초) ───────────────────────────────────────
    socket.on('marcoRegen', (d) => {
        if (!d) return;
        const ms = d.durationMs || 3000;
        window.visualFX.push({
            id: d.id, type: 'marco_regen', x: d.x, y: d.y,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        if (d.id === window.myId && typeof window.showAlert === 'function') {
            window.showAlert('🔥 불사조의 불꽃!');
        }
    });

    // ── 🔥 1번 [봉황인] ──────────────────────────────────────────
    socket.on('marcoBall', (d) => {
        if (!d) return;
        const ms = d.durationMs || 1500;
        window.visualFX.push({
            id: d.id, type: 'marco_ball',
            x: d.x, y: d.y, dirX: d.dirX, dirY: d.dirY,
            radius: d.radius || 150,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
    });

    socket.on('marcoBallBlast', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'marco_ball_blast', x: d.x, y: d.y,
            radius: d.radius || 330,
            durationMs: 560, life: 34, maxLife: 34
        });
    });

    // ── 🔥 2번 [봉리력] ──────────────────────────────────────────
    socket.on('marcoFieldCast', (d) => {
        if (!d) return;
        const ms = d.castMs || 1000;
        window.visualFX.push({
            id: d.id, type: 'marco_cast', x: d.x, y: d.y,
            radius: d.radius || 620,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        // 응축 중에는 조작이 봉인된다
        if (d.id === window.myId) {
            window.myPlayer.marcoCastEnd = Date.now() + ms;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
        }
    });

    socket.on('marcoField', (d) => {
        if (!d) return;
        const ms = d.durationMs || 3000;
        window.visualFX.push({
            id: d.id, type: 'marco_field', x: d.x, y: d.y,
            radius: d.radius || 620,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        if (d.id === window.myId) window.myPlayer.marcoCastEnd = 0;
    });

    // ── 🛡️ 3번 [불사 엉겅퀴] ────────────────────────────────────
    socket.on('marcoShield', (d) => {
        if (!d) return;
        const ms = d.durationMs || 2000;
        window.visualFX.push({
            id: d.id, type: 'marco_shield',
            x: d.x, y: d.y, dirX: d.dirX, dirY: d.dirY,
            radiusX: d.radiusX || 120, radiusY: d.radiusY || 260,
            offset: d.offset || 150,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        // 🛡️ 시전자를 감싸는 불꽃 방어막 (무적 표시)
        window.visualFX.push({
            id: d.id, type: 'marco_shield_self', x: d.x, y: d.y,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        // 보호막이 있는 동안 시전자는 그 자리에 고정된다
        if (d.id === window.myId) {
            window.myPlayer.marcoShieldEnd = Date.now() + ms;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
        }
    });

    socket.on('marcoShieldHit', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'marco_shield_hit', x: d.x, y: d.y,
            durationMs: 300, life: 18, maxLife: 18
        });
    });

    socket.on('marcoShieldBlast', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'marco_shield_blast', x: d.x, y: d.y,
            radius: d.radius || 460,
            durationMs: 640, life: 39, maxLife: 39
        });
        if (d.id === window.myId) window.myPlayer.marcoShieldEnd = 0;
    });
});
