// 파일명: core/netDomain.js
// ============================================================================
// 🌑 [유명이경 역월] 영역 전개 — 네트워크 수신
//
//   서버에서 오는 이벤트
//     · yumyeongCast   : 1초 시전 경직 시작
//     · domainOpen     : 영역 전개 시작 (4초 전개 연출이 여기서부터)
//     · syncDomains    : 현재 살아 있는 영역 목록 (단계 전환 때마다)
//     · domainCollapse : 15초가 끝나 붕괴가 시작됨
//     · domainClose    : 영역이 완전히 사라짐
//
//   window.serverDomains 에 목록을 담아 두면 렌더러가 알아서 그린다.
//   window.myDomainView 는 '지금 내가 어느 영역 안을 보고 있는가' 를 담는다.
// ============================================================================

window.registerNetModule('domain', function (socket, U) {

    // ── 🎬 1초 시전 경직 ────────────────────────────────────────────
        socket.on('yumyeongCast', (d) => {
            if (!d || !d.id) return;
            let castMs = d.castMs || 1000;
            let endAt = Date.now() + castMs;

            if (d.id === window.myId) {
                window.myPlayer.yumCasting = true;
                window.myPlayer.yumCastEnd = endAt;
            } else if (window.players[d.id]) {
                window.players[d.id].yumCasting = true;
                window.players[d.id].yumCastEnd = endAt;
            }

            // 🎇 시전 예고 — 발밑에서 검은 기운이 모여든다
            window.visualFX.push({
                id: d.id, type: 'yumyeong_cast',
                x: d.x, y: d.y,
                durationMs: castMs,
                life: Math.round(castMs / (1000 / 60)),
                maxLife: Math.round(castMs / (1000 / 60))
            });
        });

        // ── 🌑 영역 전개 시작 ───────────────────────────────────────
        socket.on('domainOpen', (dm) => {
            if (!dm) return;
            // 같은 주인의 예전 영역은 지운다
            window.serverDomains = (window.serverDomains || []).filter(d => d.ownerId !== dm.ownerId);
            window.serverDomains.push(dm);

            // 🎇 전개 순간의 방사형 만다라 (거미줄 원반)
            window.visualFX.push({
                id: dm.ownerId, type: 'yumyeong_open',
                x: dm.x, y: dm.y, radius: dm.radius,
                durationMs: 4000,
                life: 240, maxLife: 240
            });
        });

        // ── 📡 영역 목록 동기화 ─────────────────────────────────────
        socket.on('syncDomains', (list) => {
            window.serverDomains = Array.isArray(list) ? list : [];
        });

        // ── 💥 붕괴 시작 ────────────────────────────────────────────
        socket.on('domainCollapse', (dm) => {
            if (!dm) return;
            let cur = (window.serverDomains || []).find(d => d.ownerId === dm.ownerId);
            if (cur) { cur.phase = 'collapse'; cur.collapseEnd = dm.collapseEnd; }
        });

    // ── 🚧 영역 벽에 막혀 좌표가 보정됨 ────────────────────────────
    //    서버가 최종 판정한 위치로 즉시 되돌린다.
    socket.on('domainWallPush', (d) => {
        if (!d || !window.myPlayer) return;
        if (typeof d.x !== 'number' || typeof d.y !== 'number') return;
        window.myPlayer.x = d.x;
        window.myPlayer.y = d.y;
    });

    // ── 🚪 영역 소멸 ────────────────────────────────────────────────
    socket.on('domainClose', (d) => {
        if (!d) return;
        window.serverDomains = (window.serverDomains || []).filter(x => x.ownerId !== d.ownerId);
        if (window.myPlayer && window.myPlayer.domainId === d.ownerId) {
            window.myPlayer.domainId = null;
        }
    });
});
