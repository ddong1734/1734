// 파일명: ui/uiGovTree.js
// ============================================================================
// 🕸️ 세계정부 스킬 웹
//
//   · 넥서스가 '세계정부' 인 팀만 열 수 있다
//   · 육각형 노드를 선으로 이은 거미줄 모양 (다른 게임의 스파이더 웹 방식)
//   · 노드를 한 번 누르면 오른쪽에 이름·설명이 뜨고,
//     한 번 더 누르면 열린다 (골드 차감 → 노드가 빛난다)
//   · 가운데 [세계정부] 를 열어야 동서남북 4개 기관이 나타난다
// ============================================================================

(function () {
    let cv = null, ctx = null;
    let selected = null;          // 지금 고른 노드 id
    let hitAreas = [];            // 클릭 판정용 [{id, x, y, r}]

    const STEP = 118;             // 노드 사이 거리
    const HEX_R = 46;             // 육각형 반지름

    const NAVY = "#151b52";
    const NAVY_L = "#3a47a8";
    const GOLD = "#f1c40f";

    function G() { return window.GovTree; }
    function myTree() {
        const t = window.govState && window.govState.tree;
        const tm = window.myPlayer && window.myPlayer.team;
        return (t && tm && t[tm]) ? t[tm] : {};
    }
    function isWG() {
        const g = window.govState && window.govState.gov;
        const tm = window.myPlayer && window.myPlayer.team;
        return !!(g && tm && g[tm] === 'wg');
    }

    /** 이 노드를 화면에 보여 줄 때가 되었는가 */
    function visible(node, tree) {
        if (!node.parent) return true;            // 가운데는 항상 보인다
        return !!tree[node.parent];               // 부모가 열려야 나타난다
    }

    /** ⬡ 육각형 하나 */
    function hex(cx, cy, r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 180 * (60 * i - 30);
            const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
    }

    window.renderGovTree = function () {
        cv = document.getElementById('govCanvas');
        if (!cv) return;
        ctx = cv.getContext('2d');

        const W = cv.width, H = cv.height;
        const ox = W / 2, oy = H / 2;
        const tree = myTree();
        const NODES = G().NODES;

        ctx.clearRect(0, 0, W, H);
        hitAreas = [];

        // ── 배경 격자 (거미줄 느낌) ────────────────────────────
        ctx.strokeStyle = "rgba(90,110,190,0.10)";
        ctx.lineWidth = 1;
        for (let r = 1; r <= 3; r++) {
            ctx.beginPath();
            ctx.arc(ox, oy, r * STEP, 0, Math.PI * 2);
            ctx.stroke();
        }

        // ── 연결선 ─────────────────────────────────────────────
        for (const id in NODES) {
            const n = NODES[id];
            if (!n.parent) continue;
            if (!visible(n, tree)) continue;
            const pn = NODES[n.parent];
            const x1 = ox + pn.x * STEP, y1 = oy + pn.y * STEP;
            const x2 = ox + n.x * STEP,  y2 = oy + n.y * STEP;
            const on = tree[id];
            ctx.strokeStyle = on ? "rgba(241,196,15,0.9)" : "rgba(130,150,210,0.45)";
            ctx.lineWidth = on ? 5 : 3;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }

        // ── 노드 ───────────────────────────────────────────────
        for (const id in NODES) {
            const n = NODES[id];
            if (!visible(n, tree)) continue;
            const x = ox + n.x * STEP, y = oy + n.y * STEP;
            const on = !!tree[id];
            const sel = (selected === id);
            hitAreas.push({ id: id, x: x, y: y, r: HEX_R });

            // 열린 노드는 빛난다
            if (on) {
                ctx.save();
                ctx.globalCompositeOperation = "screen";
                const gl = ctx.createRadialGradient(x, y, 4, x, y, HEX_R * 2.1);
                gl.addColorStop(0, "rgba(255,225,120,0.55)");
                gl.addColorStop(1, "rgba(255,200,60,0)");
                ctx.fillStyle = gl;
                ctx.beginPath(); ctx.arc(x, y, HEX_R * 2.1, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            hex(x, y, HEX_R);
            const bg = ctx.createLinearGradient(x - HEX_R, y - HEX_R, x + HEX_R, y + HEX_R);
            if (on) { bg.addColorStop(0, "#3d4bb8"); bg.addColorStop(1, NAVY); }
            else    { bg.addColorStop(0, "#242a44"); bg.addColorStop(1, "#161a2c"); }
            ctx.fillStyle = bg; ctx.fill();
            ctx.strokeStyle = on ? GOLD : (sel ? "#7f9bff" : "#39424f");
            ctx.lineWidth = on ? 4 : (sel ? 4 : 2.5);
            ctx.stroke();

            // 이름 (줄바꿈 지원)
            ctx.fillStyle = on ? "#fff8dc" : "#c8d0e0";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            const lines = n.name.split('\n');
            const fs = (lines.length > 1) ? 11 : 14;
            ctx.font = "bold " + fs + "px sans-serif";
            lines.forEach(function (ln, i) {
                ctx.fillText(ln, x, y - (lines.length - 1) * fs * 0.6 + i * fs * 1.2);
            });
        }

        drawPanel();
    };

    /** 오른쪽 설명 패널 */
    function drawPanel() {
        const el = document.getElementById('govPanel');
        if (!el) return;
        const NODES = G().NODES;
        const tree = myTree();

        if (!selected) {
            el.innerHTML = '<div style="color:#8fa3b8; font-size:14px; line-height:1.6;">'
                + '노드를 누르면 설명이 나옵니다.<br>한 번 더 누르면 열립니다.</div>';
            return;
        }
        const n = NODES[selected];
        const on = !!tree[selected];
        const gold = (window.myPlayer && window.myPlayer.gold) || 0;
        const can = G().canUnlock(tree, selected) && gold >= n.cost;

        el.innerHTML =
            '<div style="color:' + (on ? GOLD : '#dfe6ec') + '; font-size:20px; font-weight:bold; margin-bottom:8px;">'
          + n.name.replace(/\n/g, ' ') + '</div>'
          + '<div style="color:#bdc3c7; font-size:14px; line-height:1.6; margin-bottom:14px;">' + n.desc + '</div>'
          + '<div style="color:#f1c40f; font-size:14px; margin-bottom:12px;">비용: '
          + (n.cost > 0 ? n.cost.toLocaleString() + ' G' : '무료') + '</div>'
          + (on
              ? '<div style="color:#2ecc71; font-weight:bold; font-size:15px;">✔ 이미 열렸습니다</div>'
              : '<div style="color:' + (can ? '#8fd4ff' : '#7f8c8d') + '; font-size:13px;">'
                + (can ? '한 번 더 누르면 열립니다' : (gold < n.cost ? '골드가 부족합니다' : '앞 단계를 먼저 열어야 합니다'))
                + '</div>');
    }

    /** 캔버스 클릭 */
    function onTap(e) {
        if (!cv) return;
        const r = cv.getBoundingClientRect();
        const sx = (e.clientX - r.left) * (cv.width / r.width);
        const sy = (e.clientY - r.top) * (cv.height / r.height);

        for (let i = 0; i < hitAreas.length; i++) {
            const h = hitAreas[i];
            if (Math.hypot(sx - h.x, sy - h.y) > h.r) continue;

            if (selected !== h.id) {
                // 첫 번째 터치 — 설명만 보여 준다
                selected = h.id;
                window.renderGovTree();
            } else {
                // 두 번째 터치 — 실제로 연다
                const tree = myTree();
                if (!tree[h.id] && window.socket) window.socket.emit('govUnlock', h.id);
            }
            return;
        }
    }

    window.openGovTree = function () {
        const m = document.getElementById('govModal');
        if (!m) return;
        if (!isWG()) { if (window.showAlert) window.showAlert('세계정부가 아닙니다.'); return; }
        selected = null;
        m.style.display = 'flex';
        const c = document.getElementById('govCanvas');
        if (c && !c._bound) {
            c.addEventListener('pointerdown', onTap);
            c._bound = true;
        }
        window.renderGovTree();
    };

    window.closeGovTree = function () {
        const m = document.getElementById('govModal');
        if (m) m.style.display = 'none';
    };
})();
