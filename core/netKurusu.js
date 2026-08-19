// 파일명: core/netKurusu.js
// ============================================================================
// 🕊️ 쿠루스 하나 — 네트워크 수신
//
//   · kurusuGather     : 1번 [집회] 신성력 흡수
//   · kurusuBless      : 2번 [축복] 회복 파동
//   · kurusuLadderCast : 3번 마방진 생성 (2초)
//   · kurusuLadderBeam : 3번 빛 기둥 발사 (3초)
//   · kurusuLadderTick : 0.2초마다 피해 — 여기서 화면 흔들림을 건다
//   · kurusuRevive     : 여분의 목숨으로 부활
//
//   📳 화면 흔들림은 shakeIds 에 내가 들어 있을 때만 걸린다.
//      (시전자와 실제로 맞은 대상만 흔들린다)
// ============================================================================

window.registerNetModule('kurusu', function (socket, U) {

    const frames = (ms) => Math.max(1, Math.round(ms / (1000 / 60)));

    // ── 🕊️ 1번 [집회] ─────────────────────────────────────────────
    socket.on('kurusuGather', (d) => {
        if (!d) return;
        window.visualFX.push({
            id: d.id, type: 'kurusu_gather',
            x: d.x, y: d.y, radius: d.radius || 900,
            points: d.points || [],
            durationMs: 700, life: 42, maxLife: 42
        });
    });

    // ── 🕊️ 2번 [축복] ─────────────────────────────────────────────
    socket.on('kurusuBless', (d) => {
        if (!d) return;
        window.visualFX.push({
            id: d.id, type: 'kurusu_bless',
            x: d.x, y: d.y, radius: d.radius || 520,
            charged: !!d.charged, targets: d.targets || [],
            durationMs: 900, life: 54, maxLife: 54
        });
    });

    // ── 🕊️ 3번 마방진 (2초) ───────────────────────────────────────
    socket.on('kurusuLadderCast', (d) => {
        if (!d) return;
        const ms = d.castMs || 2000;
        window.visualFX.push({
            id: d.id, type: 'kurusu_circle',
            x: d.x, y: d.y,
            circleRadius: d.circleRadius || 420, charged: !!d.charged,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
    });

    // ── 🕊️ 3번 빛 기둥 (3초) ──────────────────────────────────────
    socket.on('kurusuLadderBeam', (d) => {
        if (!d) return;
        const ms = d.beamMs || 3000;
        window.visualFX.push({
            id: d.id, type: 'kurusu_beam',
            x: d.x, y: d.y,
            halfWidth: d.halfWidth || 190, charged: !!d.charged,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
    });

    // ── 📳 0.2초마다 : 화면 흔들림 ────────────────────────────────
    socket.on('kurusuLadderTick', (d) => {
        if (!d || !Array.isArray(d.shakeIds)) return;
        // 시전자와 실제로 맞은 대상만 흔들린다
        if (d.shakeIds.indexOf(window.myId) === -1) return;
        window.kurusuShakeUntil = Date.now() + 260;
        window.kurusuShakePower = d.charged ? 9 : 6;
    });

    // ── ✨ 여분의 목숨으로 부활 ───────────────────────────────────
    socket.on('kurusuRevive', (d) => {
        if (!d) return;
        window.visualFX.push({
            id: d.id, type: 'kurusu_revive',
            x: d.x, y: d.y,
            durationMs: 800, life: 48, maxLife: 48
        });
        if (d.id === window.myId) {
            window.myPlayer.extraLives = d.left || 0;
            if (typeof window.showAlert === 'function') {
                window.showAlert('✨ 여분의 목숨으로 되살아났다!');
            }
        }
    });
});
