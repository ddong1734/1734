// 파일명: core/netSukuna.js
// ============================================================================
// 🔥 저주의 왕 (헤이안 스쿠나) — 네트워크 수신
//
//   서버에서 오는 이벤트
//     · syncCursePortal  : 저주의 왕 입장 포탈 (검붉은 색)
//     · syncSukuna       : 스쿠나 전체 상태 (생성 · 부활 · 처치)
//     · sukunaUpdate     : 스쿠나 위치/체력 델타
//     · syncSukunaPortal : 처치 자리의 기지 귀환 포탈
//     · sukunaSlashTele  : 참격 예고 (불투명 빨간 박스)
//     · sukunaSlashFire  : 참격 발사
//     · sukunaBarrage    : 연속 참격 시작
//     · sukunaBowAim     : 화염 화살 조준 (2초)
//     · sukunaBowFire    : 화염 화살 착탄 대폭발
//     · syncSukunaFires  : 불길 장판 목록
// ============================================================================

window.registerNetModule('sukuna', function (socket, U) {

    // ── 🔥 입장 포탈 ────────────────────────────────────────────────
    socket.on('syncCursePortal', (pt) => {
        window.serverCursePortal = pt || null;
    });

    // ── 🔥 스쿠나 전체 상태 ─────────────────────────────────────────
    socket.on('syncSukuna', (sk) => {
        window.serverSukuna = sk || null;
    });

    // ── 🔥 스쿠나 델타 갱신 ─────────────────────────────────────────
    socket.on('sukunaUpdate', (d) => {
        if (!d) return;
        if (!window.serverSukuna) { window.serverSukuna = d; return; }
        Object.assign(window.serverSukuna, d);
    });

    // ── 🌀 처치 자리의 기지 귀환 포탈 ───────────────────────────────
    socket.on('syncSukunaPortal', (pt) => {
        window.serverSukunaPortal = pt || null;
    });

    // ── ⚠️ 참격 예고 (불투명 빨간 박스) ─────────────────────────────
    socket.on('sukunaSlashTele', (d) => {
        if (!d) return;
        const ms = d.teleMs || 1000;
        window.visualFX.push({
            id: 'sukuna', type: 'sukuna_slash_tele',
            x: d.x, y: d.y, w: d.w, h: d.h,
            durationMs: ms,
            life: Math.round(ms / (1000 / 60)), maxLife: Math.round(ms / (1000 / 60))
        });
    });

    // ── ⚔️ 참격 발사 ────────────────────────────────────────────────
    socket.on('sukunaSlashFire', (d) => {
        if (!d) return;
        window.visualFX.push({
            id: 'sukuna', type: 'sukuna_slash_fire',
            x: d.x, y: d.y, w: d.w, h: d.h,
            durationMs: 380, life: 23, maxLife: 23
        });
    });

    // ── ⚔️⚔️ 연속 참격 시작 (몸에서 칼날이 솟는 표시용) ─────────────
    socket.on('sukunaBarrage', (d) => {
        if (!d || !window.serverSukuna) return;
        window.serverSukuna.barrageUntil = Date.now() + (d.durMs || 2000);
    });

    // ── 🏹 화염 화살 조준 (2초 · 목표 고정) ─────────────────────────
    socket.on('sukunaBowAim', (d) => {
        if (!d) return;
        const ms = d.aimMs || 2000;
        window.visualFX.push({
            id: 'sukuna', type: 'sukuna_bow_aim',
            sx: d.sx, sy: d.sy, x: d.x, y: d.y,
            blastR: d.blastR || 420,
            durationMs: ms,
            life: Math.round(ms / (1000 / 60)), maxLife: Math.round(ms / (1000 / 60))
        });
    });

    // ── 💥 화염 화살 착탄 ───────────────────────────────────────────
    socket.on('sukunaBowFire', (d) => {
        if (!d) return;
        window.visualFX.push({
            id: 'sukuna', type: 'sukuna_bow_fire',
            x: d.x, y: d.y, blastR: d.blastR || 420,
            durationMs: 700, life: 42, maxLife: 42
        });
    });

    // ── 🔥 불길 장판 ────────────────────────────────────────────────
    socket.on('syncSukunaFires', (list) => {
        window.serverSukunaFires = Array.isArray(list) ? list : [];
    });
});
