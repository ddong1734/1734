// 파일명: ui/uiAbyss.js
// ============================================================================
// ✴️ 어비스(오망성) — 좌표 선택 화면
//
//   · 확대된 미니맵 위에 7개 좌표가 표시된다
//   · 좌표를 누르면 확인 메시지가 뜨고, 확인해야 실제로 시전된다
//   · 시전하면 3초 경직 후 그 자리로 순간이동한다
// ============================================================================

(function () {
    // 표시 범위 — 미니맵보다 넓게 (바구니부터 지면까지)
    const X0 = 10900, X1 = 21100;
    const Y0 = -2600, Y1 = 2200;

    let cv = null, ctx = null, hits = [], picked = null;

    function spots() {
        return (window.GovTree && window.GovTree.ABYSS_SPOTS) ? window.GovTree.ABYSS_SPOTS : [];
    }
    const mx = (x) => ((Math.max(X0, Math.min(X1, x)) - X0) / (X1 - X0)) * cv.width;
    const my = (y) => ((Math.max(Y0, Math.min(Y1, y)) - Y0) / (Y1 - Y0)) * cv.height;

    function render() {
        cv = document.getElementById('abyssCanvas');
        if (!cv) return;
        ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        ctx.clearRect(0, 0, W, H);
        hits = [];

        // ── 진영 배경 ──────────────────────────────────────
        const bE = mx(12900), rS = mx(19100);
        ctx.fillStyle = "rgba(52,152,219,0.18)";  ctx.fillRect(0, 0, bE, H);
        ctx.fillStyle = "rgba(90,150,150,0.13)";  ctx.fillRect(bE, 0, rS - bE, H);
        ctx.fillStyle = "rgba(231,76,60,0.18)";   ctx.fillRect(rS, 0, W - rS, H);

        // ── 지형 ───────────────────────────────────────────
        const plats = (window.GameData && window.GameData.Map && window.GameData.Map.Platforms)
                    ? window.GameData.Map.Platforms : [];
        for (let i = 0; i < plats.length; i++) {
            const p = plats[i];
            if (!p) continue;
            const pw = p.w || 0, ph = p.h || 0;
            if (p.x + pw < X0 - 200 || p.x > X1 + 200) continue;
            if (pw > ph) {
                const x1 = mx(p.x), x2 = mx(p.x + pw);
                if (x2 - x1 < 1) continue;
                ctx.fillStyle = "rgba(210,220,235,0.72)";
                ctx.fillRect(x1, my(p.y) - 2, Math.max(2, x2 - x1), 4);
            } else {
                ctx.fillStyle = "rgba(255,232,150,0.9)";
                ctx.fillRect(mx(p.x) - 2, my(p.y), 4, Math.max(4, my(p.y + ph) - my(p.y)));
            }
        }
        // 지면
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, my(2000)); ctx.lineTo(W, my(2000)); ctx.stroke();

        // ── 넥서스 ─────────────────────────────────────────
        [[12250, "#3498db"], [19750, "#e74c3c"]].forEach(function (n) {
            const px = mx(n[0]), py = my(1900);
            ctx.fillStyle = n[1];
            ctx.beginPath();
            ctx.moveTo(px, py - 11); ctx.lineTo(px + 8, py);
            ctx.lineTo(px, py + 11); ctx.lineTo(px - 8, py);
            ctx.closePath(); ctx.fill();
        });

        // ── ✴️ 7개 좌표 ────────────────────────────────────
        const tt = (window.mathNow || Date.now()) / 1000;
        spots().forEach(function (s) {
            const px = mx(s.x), py = my(s.y);
            const sel = (picked && picked.id === s.id);
            hits.push({ id: s.id, name: s.name, x: px, y: py, r: 26 });

            // 맥동하는 고리
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            const pu = 0.8 + Math.sin(tt * 2.4 + s.x) * 0.2;
            const g = ctx.createRadialGradient(px, py, 2, px, py, 26 * pu);
            g.addColorStop(0, "rgba(255,255,255,0.95)");
            g.addColorStop(0.4, sel ? "rgba(255,120,220,0.8)" : "rgba(90,240,235,0.7)");
            g.addColorStop(1, "rgba(30,80,140,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(px, py, 26 * pu, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // 별 표시
            ctx.strokeStyle = sel ? "#ff8fdc" : "#7ff0ea";
            ctx.lineWidth = sel ? 3.5 : 2.5;
            ctx.beginPath();
            for (let k = 0; k < 5; k++) {
                const a = -Math.PI / 2 + (k * 2 / 5) * Math.PI * 2;
                const x2 = px + Math.cos(a) * 11, y2 = py + Math.sin(a) * 11;
                if (k === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
            }
            ctx.closePath(); ctx.stroke();

            // 이름
            ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
            ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 4; ctx.lineJoin = "round";
            ctx.strokeText(s.name, px, py + 34);
            ctx.fillStyle = sel ? "#ffc9ec" : "#cdf6f2";
            ctx.fillText(s.name, px, py + 34);
        });

        // 내 위치
        const me = window.myPlayer;
        if (me && !me.isDead) {
            ctx.beginPath(); ctx.arc(mx(me.x), my(me.y), 6, 0, Math.PI * 2);
            ctx.fillStyle = "#8fd4ff"; ctx.fill();
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
        }
    }

    function onTap(e) {
        if (!cv) return;
        const r = cv.getBoundingClientRect();
        const sx = (e.clientX - r.left) * (cv.width / r.width);
        const sy = (e.clientY - r.top) * (cv.height / r.height);
        for (let i = 0; i < hits.length; i++) {
            const h = hits[i];
            if (Math.hypot(sx - h.x, sy - h.y) > h.r) continue;
            picked = h;
            render();
            // 확인 메시지
            const el = document.getElementById('abyssConfirm');
            const nm = document.getElementById('abyssSpotName');
            if (nm) nm.textContent = h.name;
            if (el) el.style.display = 'flex';
            return;
        }
    }

    window.openAbyss = function () {
        const m = document.getElementById('abyssModal');
        if (!m) return;
        picked = null;
        m.style.display = 'flex';
        const c = document.getElementById('abyssCanvas');
        if (c && !c._bound) { c.addEventListener('pointerdown', onTap); c._bound = true; }
        render();
        if (!window._abyssTimer) {
            window._abyssTimer = setInterval(function () {
                const mm = document.getElementById('abyssModal');
                if (mm && mm.style.display === 'flex') render();
            }, 90);
        }
    };
    window.closeAbyss = function () {
        const m = document.getElementById('abyssModal');
        if (m) m.style.display = 'none';
        const c = document.getElementById('abyssConfirm');
        if (c) c.style.display = 'none';
        picked = null;
    };
    window.abyssConfirmYes = function () {
        if (picked && window.socket) window.socket.emit('abyssWarp', picked.id);
        window.closeAbyss();
    };
    window.abyssConfirmNo = function () {
        const c = document.getElementById('abyssConfirm');
        if (c) c.style.display = 'none';
        picked = null;
        render();
    };
})();
