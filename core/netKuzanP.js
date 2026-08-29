// 파일명: core/netKuzanP.js
// ============================================================================
// ❄️ 쿠잔(해적) — 네트워크 수신
// ============================================================================

window.registerNetModule('kuzanp', function (socket, U) {

    const frames = (ms) => Math.max(1, Math.round(ms / (1000 / 60)));

    // ── ❄️ 1번 [아이스 볼] ──────────────────────────────────────
    socket.on('kuzanpBall', (d) => {
        if (!d) return;
        // 사거리를 속도로 나눠 살아 있을 시간을 구한다
        const ms = Math.round((d.range / d.speed) * (1000 / 60));
        window.visualFX.push({
            id: d.id, type: 'kuzanp_ball',
            x: d.x, y: d.y, dirX: d.dirX, dirY: d.dirY,
            speed: d.speed, radius: d.radius,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
    });

    socket.on('kuzanpBallBlast', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'kuzanp_ball_blast', x: d.x, y: d.y,
            radius: d.radius || 330,
            durationMs: 620, life: 37, maxLife: 37
        });
        U.clearFXByType('kuzanp_ball');
    });

    // ── 🧤 2번 [아이스 글러브] ──────────────────────────────────
    socket.on('kuzanpGlove', (d) => {
        if (!d) return;
        const ms = d.durationMs || 6000;
        window.visualFX.push({
            id: d.id, type: 'kuzanp_glove', x: d.x, y: d.y,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        if (d.id === window.myId) {
            window.myPlayer.kzGloveEnd = Date.now() + ms;
            if (typeof window.showAlert === 'function') window.showAlert('❄️ 아이스 글러브!');
        }
    });

    socket.on('kuzanpGloveEnd', (d) => {
        if (!d) return;
        U.clearFXByType('kuzanp_glove', d.id);
        if (d.id === window.myId) window.myPlayer.kzGloveEnd = 0;
    });

    socket.on('kuzanpFrostBurst', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'kuzanp_frost_burst', x: d.x, y: d.y,
            radius: d.radius || 190,
            durationMs: 420, life: 25, maxLife: 25
        });
    });

    socket.on('kuzanpFrostTrail', (d) => {
        if (!d) return;
        const ms = d.durationMs || 1000;
        window.visualFX.push({
            type: 'kuzanp_frost_trail', x: d.x, y: d.y,
            seed: Math.random() * 6.28,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
    });

    // ── 🧊 3번 [아이스 타임] ────────────────────────────────────
    socket.on('kuzanpDashCast', (d) => {
        if (!d) return;
        const ms = d.castMs || 500;
        window.visualFX.push({
            id: d.id, type: 'kuzanp_dash_cast', x: d.x, y: d.y,
            dirX: d.dirX, dirY: d.dirY,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        if (d.id === window.myId) {
            window.myPlayer.kzDashCastEnd = Date.now() + ms;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            clearInterval(window.autoAttackInterval);
        }
    });

    socket.on('kuzanpDash', (d) => {
        if (!d) return;
        const ms = d.durationMs || 900;
        window.visualFX.push({
            id: d.id, type: 'kuzanp_dash', x: d.x, y: d.y,
            dirX: d.dirX, dirY: d.dirY,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        if (d.id === window.myId) {
            window.myPlayer.kzDashCastEnd = 0;
            window.myPlayer.kzDashEnd = Date.now() + ms;
        }
    });

    socket.on('kuzanpDashEnd', (d) => {
        if (!d) return;
        U.clearFXByType('kuzanp_dash', d.id);
        if (d.id === window.myId) window.myPlayer.kzDashEnd = 0;
    });

    socket.on('kuzanpDashBlast', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'kuzanp_dash_blast', x: d.x, y: d.y,
            radius: d.radius || 380,
            durationMs: 900, life: 54, maxLife: 54
        });
    });
});
