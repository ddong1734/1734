// 파일명: fxkurusu.js
// ============================================================================
// 🕊️ 쿠루스 하나 — 신성력 이펙트
//
//   · kurusu_strike   : 평타 (성스러운 빛 베기)
//   · kurusu_gather   : 1번 [집회] — 주변 대상에게서 신성력을 빨아들인다
//   · kurusu_bless    : 2번 [축복] — 아군을 감싸는 회복의 파동
//   · kurusu_circle   : 3번 마방진 (2초간 아래를 향해 회전하며 그려진다)
//   · kurusu_beam     : 3번 빛 기둥 (마방진 중심에서 아래로 내리꽂힌다)
//   · kurusu_revive   : 여분의 목숨 — 황금빛을 뿜으며 되살아난다
//
//   🎨 신성력의 색 : 검은 테두리 + 밝은 노란빛
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';

const HOLY_CORE = "rgba(255, 252, 214, ";   // 심 (거의 흰 노랑)
const HOLY_MID  = "rgba(255, 219, 92, ";    // 본체 (밝은 노랑)
const HOLY_DEEP = "rgba(212, 152, 20, ";    // 뿌리 (짙은 금색)
const HOLY_FADE = "rgba(120, 80, 0, 0)";

// ────────────────────────────────────────────────────────────────────────────
// ⚔️ 평타 — 성스러운 빛 베기
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kurusu_strike', (ctx, fx, alpha, state) => {
    const dir = (fx.isLeft || fx.dir === -1) ? -1 : 1;
    const t = 1 - alpha;
    const R = 115;
    const swing = Math.min(1, t / 0.5);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(fx.x, fx.y);
    ctx.scale(dir, 1);
    ctx.globalAlpha = alpha;

    const a0 = -Math.PI * 0.55;
    const a1 = a0 + Math.PI * 0.9 * swing;

    ctx.beginPath();
    ctx.arc(0, 0, R, a0, a1);
    ctx.arc(0, 0, R * 0.52, a1, a0, true);
    ctx.closePath();
    let g = ctx.createRadialGradient(0, 0, R * 0.52, 0, 0, R);
    g.addColorStop(0, HOLY_FADE);
    g.addColorStop(0.6, HOLY_MID + (0.85 * alpha) + ")");
    g.addColorStop(1, HOLY_CORE + alpha + ")");
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = HOLY_CORE + (0.95 * alpha) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🕊️ 1번 [집회] — 주변 대상에게서 신성력을 빨아들인다
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kurusu_gather', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const R = fx.radius || 900;
    const t = 1 - alpha;
    const pts = fx.points || [];

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // ── 퍼졌다가 조여드는 신성 고리 ─────────────────────────────
    const ring = R * (1 - Math.pow(t, 0.65));
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = HOLY_MID + "0.9)";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, ring, 0, Math.PI * 2); ctx.stroke();

    ctx.globalAlpha = alpha * 0.3;
    ctx.strokeStyle = HOLY_CORE + "0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, ring * 1.08, 0, Math.PI * 2); ctx.stroke();

    // ── 각 대상에게서 빨려오는 빛줄기 ───────────────────────────
    for (let i = 0; i < pts.length; i++) {
        const P = pts[i];
        const f = Math.min(1, t / 0.8);
        const hx = P.x + (cx - P.x) * f;
        const hy = P.y + (cy - P.y) * f;

        ctx.globalAlpha = alpha * 0.85;
        let lg = ctx.createLinearGradient(P.x, P.y, hx, hy);
        lg.addColorStop(0, HOLY_FADE);
        lg.addColorStop(1, HOLY_CORE + "0.95)");
        ctx.strokeStyle = lg;
        ctx.lineWidth = 7; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(hx, hy); ctx.stroke();

        // 빨려오는 빛알갱이
        let bg = ctx.createRadialGradient(hx, hy, 1, hx, hy, 22);
        bg.addColorStop(0, HOLY_CORE + "1)");
        bg.addColorStop(0.5, HOLY_MID + "0.8)");
        bg.addColorStop(1, HOLY_FADE);
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(hx, hy, 22, 0, Math.PI * 2); ctx.fill();
    }

    // ── 시전자에게 모이는 빛 ────────────────────────────────────
    ctx.globalAlpha = alpha;
    const cr = 40 + t * 60;
    let cg = ctx.createRadialGradient(cx, cy, 3, cx, cy, cr);
    cg.addColorStop(0, HOLY_CORE + "1)");
    cg.addColorStop(0.4, HOLY_MID + "0.85)");
    cg.addColorStop(1, HOLY_FADE);
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🕊️ 2번 [축복] — 아군을 감싸는 회복의 파동
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kurusu_bless', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const R = fx.radius || 520;
    const t = 1 - alpha;
    const charged = !!fx.charged;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // ── 퍼져나가는 파동 3겹 ─────────────────────────────────────
    for (let k = 0; k < 3; k++) {
        const ft = Math.max(0, Math.min(1, t * 1.4 - k * 0.18));
        if (ft <= 0) continue;
        const rr = R * (1 - Math.pow(1 - ft, 2.2));
        ctx.globalAlpha = alpha * (1 - ft) * 0.85;
        ctx.strokeStyle = charged ? HOLY_CORE + "1)" : HOLY_MID + "0.95)";
        ctx.lineWidth = (charged ? 10 : 6) * (1 - ft) + 2;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
    }

    // ── 중심에서 솟는 신성한 빛 ─────────────────────────────────
    ctx.globalAlpha = alpha * 0.6;
    let g = ctx.createRadialGradient(cx, cy, 6, cx, cy, R * 0.5);
    g.addColorStop(0, HOLY_CORE + "0.9)");
    g.addColorStop(0.45, HOLY_MID + "0.4)");
    g.addColorStop(1, HOLY_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2); ctx.fill();

    // ── 축복받은 아군 각자에게 피어나는 빛 ──────────────────────
    const tg = fx.targets || [];
    for (let i = 0; i < tg.length; i++) {
        const P = tg[i];
        const up = t * 90;
        ctx.globalAlpha = alpha * 0.9;
        let pg = ctx.createRadialGradient(P.x, P.y - up, 3, P.x, P.y - up, 55);
        pg.addColorStop(0, HOLY_CORE + "1)");
        pg.addColorStop(0.45, HOLY_MID + "0.7)");
        pg.addColorStop(1, HOLY_FADE);
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(P.x, P.y - up, 55, 0, Math.PI * 2); ctx.fill();

        // 위로 오르는 빛기둥
        ctx.globalAlpha = alpha * 0.45;
        let cg2 = ctx.createLinearGradient(P.x, P.y + 40, P.x, P.y - 160);
        cg2.addColorStop(0, HOLY_FADE);
        cg2.addColorStop(0.5, HOLY_MID + "0.55)");
        cg2.addColorStop(1, HOLY_FADE);
        ctx.fillStyle = cg2;
        ctx.fillRect(P.x - 26, P.y - 160, 52, 200);

        // ✨ 강화 : 여분의 목숨을 상징하는 고리
        if (charged) {
            ctx.globalAlpha = alpha * 0.9;
            ctx.strokeStyle = HOLY_CORE + "1)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(P.x, P.y - 78 - up * 0.3, 46, 15, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🕊️ 3번 [야곱의 사다리] — 아래를 향해 회전하는 큰 마방진
//    2초 동안 바깥 고리 → 안쪽 고리 → 문양 순으로 자연스럽게 그려진다.
// ────────────────────────────────────────────────────────────────────────────
function drawMagicCircle(ctx, cx, cy, R, prog, alpha, spin, charged) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(cx, cy);
    // 아래를 바라보는 원 → 세로로 크게 눌러 원근을 준다
    ctx.scale(1, 0.34);
    ctx.rotate(spin);
    ctx.globalAlpha = alpha;

    const core = charged ? HOLY_CORE : HOLY_MID;

    // ── ① 바깥 이중 고리 (0 ~ 40%) ─────────────────────────────
    const p1 = Math.min(1, prog / 0.40);
    if (p1 > 0) {
        ctx.strokeStyle = core + (0.95 * alpha) + ")";
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p1); ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.93, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p1); ctx.stroke();
    }

    // ── ② 안쪽 고리 (25 ~ 70%) ─────────────────────────────────
    const p2 = Math.max(0, Math.min(1, (prog - 0.25) / 0.45));
    if (p2 > 0) {
        ctx.strokeStyle = core + (0.9 * alpha) + ")";
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p2); ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p2); ctx.stroke();
    }

    // ── ③ 방사 문양 + 별 (50 ~ 100%) ───────────────────────────
    const p3 = Math.max(0, Math.min(1, (prog - 0.50) / 0.50));
    if (p3 > 0) {
        const N = 12;
        ctx.strokeStyle = core + (0.85 * alpha * p3) + ")";
        ctx.lineWidth = 3;
        for (let k = 0; k < N; k++) {
            if (k / N > p3) break;
            const a = (k / N) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * R * 0.30, Math.sin(a) * R * 0.30);
            ctx.lineTo(Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93);
            ctx.stroke();
        }
        // 안쪽 별 문양
        ctx.strokeStyle = HOLY_CORE + (0.95 * alpha * p3) + ")";
        ctx.lineWidth = 4;
        ctx.beginPath();
        const S = 7, step = 3;
        for (let k = 0; k <= S; k++) {
            const a = ((k * step) % S) / S * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(a) * R * 0.58, y = Math.sin(a) * R * 0.58;
            if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
}

registerVisualFX('kurusu_circle', (ctx, fx, alpha, state) => {
    const R = fx.circleRadius || 420;
    const t = 1 - alpha;                     // 0 → 1 (그려지는 진행도)
    drawMagicCircle(ctx, fx.x, fx.y - 210, R, t, Math.min(1, alpha * 1.6),
                    state.mathNow / 1400, !!fx.charged);

    // 마방진 아래에 모여드는 빛
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * t * 0.7;
    let g = ctx.createRadialGradient(fx.x, fx.y - 210, 8, fx.x, fx.y - 210, R * 0.5 * t);
    g.addColorStop(0, HOLY_CORE + "1)");
    g.addColorStop(1, HOLY_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y - 210, R * 0.5 * t, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🕊️ 3번 빛 기둥 — 마방진 중심에서 아래로 내리꽂힌다
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kurusu_beam', (ctx, fx, alpha, state) => {
    const half = fx.halfWidth || 190;
    const charged = !!fx.charged;
    const t = 1 - alpha;
    const topY = fx.y - 210;
    const botY = fx.y + 2200;                // 화면 아래까지 충분히 내리꽂는다

    // 시작 0.12 구간에 순식간에 뻗는다
    const reach = Math.min(1, t / 0.12);
    const endY = topY + (botY - topY) * reach;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // ── 바깥 번짐 ───────────────────────────────────────────────
    ctx.globalAlpha = alpha * 0.5;
    let og = ctx.createLinearGradient(fx.x - half * 1.9, 0, fx.x + half * 1.9, 0);
    og.addColorStop(0, HOLY_FADE);
    og.addColorStop(0.5, HOLY_MID + "0.55)");
    og.addColorStop(1, HOLY_FADE);
    ctx.fillStyle = og;
    ctx.fillRect(fx.x - half * 1.9, topY, half * 3.8, endY - topY);

    // ── 본체 ────────────────────────────────────────────────────
    ctx.globalAlpha = alpha * 0.95;
    let bg = ctx.createLinearGradient(fx.x - half, 0, fx.x + half, 0);
    bg.addColorStop(0, HOLY_MID + "0.35)");
    bg.addColorStop(0.28, HOLY_CORE + "0.9)");
    bg.addColorStop(0.5, "rgba(255,255,255,1)");
    bg.addColorStop(0.72, HOLY_CORE + "0.9)");
    bg.addColorStop(1, HOLY_MID + "0.35)");
    ctx.fillStyle = bg;
    ctx.fillRect(fx.x - half, topY, half * 2, endY - topY);

    // ── 흔들리는 안쪽 심 ────────────────────────────────────────
    const wob = Math.sin(state.mathNow / 55) * half * 0.06;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fillRect(fx.x - half * 0.22 + wob, topY, half * 0.44, endY - topY);

    // ── 기둥을 타고 흐르는 빛띠 ─────────────────────────────────
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = HOLY_CORE + "0.8)";
    for (let k = 0; k < 6; k++) {
        const ft = ((state.mathNow / 380) + k / 6) % 1;
        const y = topY + (endY - topY) * ft;
        ctx.fillRect(fx.x - half * 0.85, y, half * 1.7, 16);
    }

    // ── 착지 지점 폭발광 ────────────────────────────────────────
    const gy = fx.y;
    ctx.globalAlpha = alpha * 0.8;
    let fg = ctx.createRadialGradient(fx.x, gy, 6, fx.x, gy, half * (charged ? 3.0 : 2.4));
    fg.addColorStop(0, "rgba(255,255,255,1)");
    fg.addColorStop(0.3, HOLY_CORE + "0.85)");
    fg.addColorStop(0.65, HOLY_MID + "0.45)");
    fg.addColorStop(1, HOLY_FADE);
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(fx.x, gy, half * (charged ? 3.0 : 2.4), 0, Math.PI * 2); ctx.fill();

    // 바닥에 퍼지는 고리
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = HOLY_CORE + "0.95)";
    ctx.lineWidth = 6;
    const rr = half * (1.2 + (t * 2 % 1) * 1.4);
    ctx.beginPath(); ctx.ellipse(fx.x, gy, rr, rr * 0.26, 0, 0, Math.PI * 2); ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // 마방진은 기둥이 나가는 동안 계속 돈다
    drawMagicCircle(ctx, fx.x, topY, (charged ? 620 : 420), 1,
                    alpha * 0.95, state.mathNow / 900, charged);
});

// ────────────────────────────────────────────────────────────────────────────
// ✨ 여분의 목숨 — 황금빛을 뿜으며 되살아난다
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kurusu_revive', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const R = 90 + t * 230;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 터져나가는 황금빛
    ctx.globalAlpha = alpha;
    let g = ctx.createRadialGradient(fx.x, fx.y, 6, fx.x, fx.y, R);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.28, HOLY_CORE + "0.95)");
    g.addColorStop(0.6, HOLY_MID + "0.6)");
    g.addColorStop(1, HOLY_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.fill();

    // 퍼지는 고리
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = HOLY_CORE + "1)";
    ctx.lineWidth = 8 * (1 - t) + 2;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R * 0.92, 0, Math.PI * 2); ctx.stroke();

    // 위로 솟는 깃털 같은 빛줄기
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = HOLY_CORE + "0.95)";
    ctx.lineWidth = 5; ctx.lineCap = "round";
    for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const r0 = R * 0.45, r1 = R * (1.05 + (k % 3) * 0.12);
        ctx.beginPath();
        ctx.moveTo(fx.x + Math.cos(a) * r0, fx.y + Math.sin(a) * r0 * 0.8);
        ctx.lineTo(fx.x + Math.cos(a) * r1, fx.y + Math.sin(a) * r1 * 0.8 - t * 60);
        ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});
