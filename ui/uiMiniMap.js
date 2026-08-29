// 파일명: ui/uiMiniMap.js
// ============================================================================
// 🗺️ 미니맵 — 전장 인원 박스 바로 아래
//
//   · 맵의 큰 구조(양 진영 · 중앙 정글 · 넥서스 · 상점)만 단순하게 그린다
//   · 아군(나 포함)의 현재 위치를 작은 파란 원으로 실시간 표시한다
//   · 적은 표시하지 않는다
// ============================================================================

(function () {
    let cv = null, ctx = null;

    // 맵 좌표 범위 (data.js 의 POIs 기준)
    const MAP_X0 = 10800, MAP_X1 = 21200;

    function ensure() {
        if (cv && cv.isConnected) return true;
        cv = document.getElementById('miniMap');
        if (!cv) return false;
        ctx = cv.getContext('2d');
        return true;
    }

    /** 월드 x → 미니맵 x */
    const mx = (x) => ((Math.max(MAP_X0, Math.min(MAP_X1, x)) - MAP_X0) / (MAP_X1 - MAP_X0)) * cv.width;

    window.drawMiniMap = function () {
        if (!ensure()) return;
        const W = cv.width, H = cv.height;
        ctx.clearRect(0, 0, W, H);

        // ── 진영 배경 (파랑 · 중앙 · 빨강) ──────────────────────
        const blueEnd = mx(12900), redStart = mx(19100);
        ctx.fillStyle = "rgba(52,152,219,0.22)";  ctx.fillRect(0, 0, blueEnd, H);
        ctx.fillStyle = "rgba(120,180,120,0.16)"; ctx.fillRect(blueEnd, 0, redStart - blueEnd, H);
        ctx.fillStyle = "rgba(231,76,60,0.22)";   ctx.fillRect(redStart, 0, W - redStart, H);

        // ── 지면선 ─────────────────────────────────────────────
        ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H - 12); ctx.lineTo(W, H - 12); ctx.stroke();

        // ── 넥서스 2개 ─────────────────────────────────────────
        const nexus = [[12250, "#3498db"], [19750, "#e74c3c"]];
        nexus.forEach(([x, c]) => {
            const px = mx(x);
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.moveTo(px, H - 24); ctx.lineTo(px + 5, H - 15);
            ctx.lineTo(px, H - 7);  ctx.lineTo(px - 5, H - 15);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 1; ctx.stroke();
        });

        // ── 상점 위치 표시 ─────────────────────────────────────
        ctx.fillStyle = "rgba(241,196,15,0.75)";
        [11800, 20200].forEach(x => ctx.fillRect(mx(x) - 2, H - 19, 4, 7));

        // ── 중앙 정글 (박힌범 바구니) ──────────────────────────
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(mx(13400), 6); ctx.lineTo(mx(18600), 6);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── 🔵 아군 위치 (나 포함) ─────────────────────────────
        const me = window.myPlayer;
        const myTeam = me && me.team;
        const all = window.players || {};
        const drawDot = (p, isMe) => {
            if (!p || p.isDead) return;
            const px = mx(p.x);
            // 높이는 대략적으로만 반영한다 (공중이면 위쪽)
            const ny = Math.max(6, Math.min(H - 14, H - 14 - ((1955 - (p.y || 1955)) / 3400) * (H - 22)));
            ctx.beginPath();
            ctx.arc(px, ny, isMe ? 4 : 3, 0, Math.PI * 2);
            ctx.fillStyle = isMe ? "#8fd4ff" : "#3498db";
            ctx.fill();
            ctx.strokeStyle = isMe ? "#ffffff" : "rgba(255,255,255,0.7)";
            ctx.lineWidth = isMe ? 1.6 : 1;
            ctx.stroke();
        };
        for (const id in all) {
            const p = all[id];
            if (!p || p.team !== myTeam) continue;      // 아군만
            drawDot(p, id === window.myId);
        }
        // players 에 내가 없을 수도 있으니 한 번 더 확인
        if (me && !(window.myId in all)) drawDot(me, true);
    };

    window.showMiniMap = function (on) {
        if (!ensure()) return;
        cv.style.display = on ? 'block' : 'none';
    };
})();
