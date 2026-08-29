// 파일명: ui/uiMiniMap.js
// ============================================================================
// 🗺️ 미니맵 — 전장 인원 박스 바로 아래
//
//   · 표시 범위 : 블루 정글 끝 ~ 레드 정글 끝 (박힌범 바구니까지 세로로 포함)
//   · 맵 구조   : 양 진영 배경 · 넥서스 · 상점 · 세로벽 · 가로벽(발판)
//   · 아군(나 포함)의 위치를 작은 파란 원으로 실시간 표시한다
//   · 적은 표시하지 않는다
// ============================================================================

(function () {
    let cv = null, ctx = null;

    // 🗺️ 표시 범위 — 양쪽 정글 끝까지 넉넉히 담는다
    const MAP_X0 = 11000, MAP_X1 = 21000;
    // 세로는 박힌범 바구니(y ≈ -2400) 부터 지면(y = 2000) 까지
    const MAP_Y0 = -2500, MAP_Y1 = 2100;

    // 🧱 세로벽 (index.js 의 SOLID_WALLS 와 같은 값)
    const WALLS = [
        { x: 11560, y: -900,  w: 40, h: 900 },
        { x: 20400, y: -900,  w: 40, h: 900 },
        { x: 13400, y: -2200, w: 40, h: 800 },
        { x: 18560, y: -2200, w: 40, h: 800 }
    ];

    function ensure() {
        if (cv && cv.isConnected) return true;
        cv = document.getElementById('miniMap');
        if (!cv) return false;
        ctx = cv.getContext('2d');
        return true;
    }

    /** 월드 좌표 → 미니맵 좌표 */
    const mx = (x) => ((Math.max(MAP_X0, Math.min(MAP_X1, x)) - MAP_X0) / (MAP_X1 - MAP_X0)) * cv.width;
    const my = (y) => ((Math.max(MAP_Y0, Math.min(MAP_Y1, y)) - MAP_Y0) / (MAP_Y1 - MAP_Y0)) * cv.height;

    window.drawMiniMap = function () {
        if (!ensure()) return;
        const W = cv.width, H = cv.height;
        ctx.clearRect(0, 0, W, H);

        // ── 진영 배경 (파랑 · 중앙 · 빨강) ──────────────────────
        const blueEnd = mx(12900), redStart = mx(19100);
        ctx.fillStyle = "rgba(52,152,219,0.20)";  ctx.fillRect(0, 0, blueEnd, H);
        ctx.fillStyle = "rgba(120,180,120,0.14)"; ctx.fillRect(blueEnd, 0, redStart - blueEnd, H);
        ctx.fillStyle = "rgba(231,76,60,0.20)";   ctx.fillRect(redStart, 0, W - redStart, H);

        // ── 🟫 가로벽(발판) ────────────────────────────────────
        const plats = window.PLATFORMS || [];
        ctx.fillStyle = "rgba(200,205,215,0.55)";
        for (let i = 0; i < plats.length; i++) {
            const p = plats[i];
            if (!p) continue;
            const x1 = mx(p.x - (p.w || 0) / 2), x2 = mx(p.x + (p.w || 0) / 2);
            const yy = my(p.y);
            if (x2 - x1 < 0.6) continue;
            ctx.fillRect(x1, yy - 0.6, Math.max(1, x2 - x1), 1.4);
        }

        // ── 지면선 ─────────────────────────────────────────────
        ctx.strokeStyle = "rgba(255,255,255,0.42)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, my(2000)); ctx.lineTo(W, my(2000)); ctx.stroke();

        // ── 🧱 세로벽 ──────────────────────────────────────────
        ctx.fillStyle = "rgba(255,235,160,0.85)";
        for (let i = 0; i < WALLS.length; i++) {
            const w = WALLS[i];
            const x1 = mx(w.x - w.w / 2);
            const y1 = my(w.y - w.h / 2), y2 = my(w.y + w.h / 2);
            ctx.fillRect(x1 - 0.6, y1, 1.6, Math.max(1.5, y2 - y1));
        }

        // ── 🏛️ 넥서스 ──────────────────────────────────────────
        [[12250, "#3498db"], [19750, "#e74c3c"]].forEach(function (n) {
            const px = mx(n[0]), py = my(1900);
            ctx.fillStyle = n[1];
            ctx.beginPath();
            ctx.moveTo(px, py - 4.5); ctx.lineTo(px + 3.2, py);
            ctx.lineTo(px, py + 4.5);  ctx.lineTo(px - 3.2, py);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 0.7; ctx.stroke();
        });

        // ── 🛒 상점 ────────────────────────────────────────────
        ctx.fillStyle = "rgba(241,196,15,0.8)";
        [11800, 20200].forEach(function (x) { ctx.fillRect(mx(x) - 1.2, my(1930), 2.4, 4); });

        // ── 🥊 박힌범 바구니 (중앙 상단) ───────────────────────
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.setLineDash([2, 2]); ctx.lineWidth = 0.8;
        ctx.strokeRect(mx(13400), my(-2400), mx(18600) - mx(13400), my(-1340) - my(-2400));
        ctx.setLineDash([]);

        // ── 🔵 아군 위치 (나 포함) ─────────────────────────────
        const me = window.myPlayer;
        const myTeam = me && me.team;
        const all = window.players || {};
        const dot = function (p, isMe) {
            if (!p || p.isDead) return;
            ctx.beginPath();
            ctx.arc(mx(p.x), my(p.y), isMe ? 2.6 : 2, 0, Math.PI * 2);
            ctx.fillStyle = isMe ? "#8fd4ff" : "#3498db";
            ctx.fill();
            ctx.strokeStyle = isMe ? "#ffffff" : "rgba(255,255,255,0.7)";
            ctx.lineWidth = isMe ? 1.1 : 0.7;
            ctx.stroke();
        };
        for (const id in all) {
            const p = all[id];
            if (!p || p.team !== myTeam) continue;      // 아군만
            dot(p, id === window.myId);
        }
        if (me && !(window.myId in all)) dot(me, true);
    };

    window.showMiniMap = function (on) {
        if (!ensure()) return;
        cv.style.display = on ? 'block' : 'none';
    };
})();
