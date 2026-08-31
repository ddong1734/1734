// 파일명: fxkuzan.js
// ============================================================================
// ❄️ 쿠잔(해군) — 얼음 이펙트
//
//   🎨 배색 : 흰 심(#ffffff) · 밝은 하늘(#8fd8ff) · 깊은 파랑(#1a6fb0)
//            '날카로운 얼음 결정' 과 '뿜어져 나오는 냉기' 두 가지가 핵심이다.
//
//   · awaken_icicles : 각성 — 발밑에서 솟는 얼음 기둥
//   · ice_age        : 3번 [아이스 에이지] — 대지를 통째로 얼린다
//   · ice_glove      : 얼음 주먹
//   · trail_ice      : 지나간 자리의 서리
//   · pheasant_peck  : 1번 [퍼잔트백] 충격파
// ============================================================================

import { registerVisualFX, registerShockwave } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

const I_CORE = "rgba(255, 255, 255, ";
const I_PALE = "rgba(206, 242, 255, ";
const I_MAIN = "rgba(143, 216, 255, ";
const I_DEEP = "rgba(26, 111, 176, ";
const I_FADE = "rgba(12, 70, 130, 0)";

/** 🧊 길고 날카로운 얼음 결정 하나 */
function shard(ctx, x, y, len, ang, w, alpha, bright) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len * 0.3, -w);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.3, w);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, I_CORE + alpha + ")");
    g.addColorStop(0.28, (bright ? I_CORE : I_PALE) + alpha + ")");
    g.addColorStop(0.7, I_MAIN + (0.9 * alpha) + ")");
    g.addColorStop(1, I_FADE);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = I_CORE + (0.7 * alpha) + ")";
    ctx.lineWidth = Math.max(1, w * 0.28);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
    ctx.restore();
}

/** 🧊 땅에서 솟는 얼음 기둥 */
function pillar(ctx, x, y, h, w, alpha, tilt) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt || 0);
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(-w * 0.45, -h);
    ctx.lineTo(w * 0.3, -h * 0.82);
    ctx.lineTo(w, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, -h);
    g.addColorStop(0, I_DEEP + (0.92 * alpha) + ")");
    g.addColorStop(0.5, I_MAIN + (0.95 * alpha) + ")");
    g.addColorStop(1, I_CORE + alpha + ")");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = I_CORE + (0.85 * alpha) + ")";
    ctx.lineWidth = 2.5; ctx.stroke();
    // 능선 하이라이트
    ctx.strokeStyle = I_CORE + (0.6 * alpha) + ")";
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-w * 0.15, -h * 0.05); ctx.lineTo(-w * 0.35, -h * 0.9); ctx.stroke();
    ctx.restore();
}

/** ❄️ 눈꽃 */
function flake(ctx, x, y, r, alpha, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.strokeStyle = I_PALE + alpha + ")";
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.lineCap = "round";
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const ex = Math.cos(a) * r, ey = Math.sin(a) * r;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ex * 0.55, ey * 0.55);
        ctx.lineTo(ex * 0.55 + Math.cos(a + 0.9) * r * 0.3, ey * 0.55 + Math.sin(a + 0.9) * r * 0.3);
        ctx.moveTo(ex * 0.55, ey * 0.55);
        ctx.lineTo(ex * 0.55 + Math.cos(a - 0.9) * r * 0.3, ey * 0.55 + Math.sin(a - 0.9) * r * 0.3);
        ctx.stroke();
    }
    ctx.restore();
}

/** 🌬️ 냉기 안개 */
function mist(ctx, cx, cy, r, alpha) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r);
    g.addColorStop(0, I_CORE + (0.9 * alpha) + ")");
    g.addColorStop(0.32, I_PALE + (0.66 * alpha) + ")");
    g.addColorStop(0.68, I_MAIN + (0.4 * alpha) + ")");
    g.addColorStop(1, I_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
}

// ────────────────────────────────────────────────────────────────────────────
// 🧊 각성 — 발밑에서 얼음 기둥이 솟는다
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('awaken_icicles', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const tt = (state ? state.mathNow : 0) / 1000;
    RenderUtils.withContext(ctx, fx.x, fx.y + 45, () => {
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = alpha;
        mist(ctx, 0, -30, 150 + t * 90, alpha * 0.8);

        ctx.globalCompositeOperation = "source-over";
        const N = 18;
        for (let k = 0; k < N; k++) {
            const f = k / (N - 1);
            const px = -190 + f * 380 + Math.sin(k * 3.1) * 14;
            const grow = Math.min(1, t * 2.2 - f * 0.25);
            if (grow <= 0) continue;
            const h = (60 + ((k * 37) % 10) * 13) * grow;
            pillar(ctx, px, 0, h, 15 + (k % 3) * 4, alpha, Math.sin(k * 1.7) * 0.22);
        }

        // 사방으로 뻗는 결정
        ctx.globalCompositeOperation = "screen";
        for (let k = 0; k < 10; k++) {
            const a = -Math.PI + (k / 9) * Math.PI;
            shard(ctx, 0, -20, 120 + t * 70, a, 9, alpha * 0.9, k % 3 === 0);
        }
        // 흩날리는 눈
        ctx.globalCompositeOperation = "source-over";
        for (let k = 0; k < 10; k++) {
            const ff = ((tt * 0.9) + k / 10) % 1;
            flake(ctx, -160 + k * 34, -40 - ff * 130, 9 * (1 - ff * 0.5), alpha * (1 - ff), tt * 2 + k);
        }
    });
});

// ────────────────────────────────────────────────────────────────────────────
// ❄️ 아이스 에이지 — 대지를 통째로 얼린다 (가장 강렬해야 한다)
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('ice_age', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const tt = (state ? state.mathNow : 0) / 1000;
    // 밖으로 퍼지는 반경
    const R = 60 + (1 - Math.pow(1 - Math.min(1, t / 0.45), 2.4)) * 620;

    RenderUtils.withContext(ctx, fx.x, fx.y + 45, () => {
        // ── ① 지면을 덮는 얼음판 ─────────────────────────────
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = alpha * 0.92;
        const fg = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
        fg.addColorStop(0, "rgba(236,250,255,0.95)");
        fg.addColorStop(0.45, "rgba(168,226,255,0.8)");
        fg.addColorStop(0.8, "rgba(70,164,222,0.5)");
        fg.addColorStop(1, "rgba(20,90,150,0)");
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.42, 0, 0, Math.PI * 2); ctx.fill();

        // 얼음판을 가르는 균열
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 2.6;
        for (let k = 0; k < 16; k++) {
            const a = (k / 16) * Math.PI * 2;
            const len = R * (0.45 + ((k * 29) % 10) / 18);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * len * 0.55, Math.sin(a) * len * 0.42 * 0.55);
            ctx.lineTo(Math.cos(a + 0.16) * len, Math.sin(a + 0.16) * len * 0.42);
            ctx.stroke();
        }

        // ── ② 솟구치는 거대한 얼음 기둥 ──────────────────────
        const N = 22;
        for (let k = 0; k < N; k++) {
            const a = (k / N) * Math.PI * 2 + 0.2;
            const d = R * (0.32 + ((k * 41) % 10) / 15);
            const px = Math.cos(a) * d, py = Math.sin(a) * d * 0.42;
            const grow = Math.min(1, Math.max(0, t * 2.1 - (d / R) * 0.6));
            if (grow <= 0) continue;
            const h = (95 + ((k * 53) % 10) * 22) * grow;
            pillar(ctx, px, py, h, 17 + (k % 3) * 6, alpha, Math.sin(k * 2.3) * 0.2);
        }

        // ── ③ 중심에서 터지는 냉기 ───────────────────────────
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = alpha;
        mist(ctx, 0, -60, R * 0.62, alpha * 0.95);

        // 방사형 결정 24가닥
        for (let k = 0; k < 24; k++) {
            const a = (k / 24) * Math.PI * 2 + t * 0.35;
            shard(ctx, 0, -30, R * (0.62 + (k % 3) * 0.14), a, R * 0.035, alpha * 0.95, k % 4 === 0);
        }

        // ── ④ 퍼지는 서리 고리 3겹 ───────────────────────────
        for (let k = 0; k < 3; k++) {
            const rr = R * (0.55 + k * 0.22);
            ctx.strokeStyle = I_CORE + (0.85 * alpha * (1 - k * 0.25)) + ")";
            ctx.lineWidth = (7 - k * 2) * (1 - t * 0.4) + 1.5;
            ctx.beginPath(); ctx.ellipse(0, 0, rr, rr * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
        }

        // ── ⑤ 위로 치솟는 냉기 기둥 ──────────────────────────
        ctx.globalAlpha = alpha * 0.85;
        for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2 + tt * 0.4;
            const px = Math.cos(a) * R * 0.4, py = Math.sin(a) * R * 0.4 * 0.42;
            const h = 210 * (0.6 + Math.abs(Math.sin(tt * 3 + k)) * 0.55);
            const pg = ctx.createLinearGradient(px, py, px, py - h);
            pg.addColorStop(0, I_CORE + "0.9)");
            pg.addColorStop(0.3, I_PALE + "0.75)");
            pg.addColorStop(1, I_FADE);
            ctx.fillStyle = pg;
            ctx.beginPath();
            ctx.moveTo(px - 30, py);
            ctx.quadraticCurveTo(px - 9, py - h * 0.6, px, py - h);
            ctx.quadraticCurveTo(px + 9, py - h * 0.6, px + 30, py);
            ctx.closePath(); ctx.fill();
        }

        // ── ⑥ 흩날리는 눈꽃 ──────────────────────────────────
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = alpha * 0.9;
        for (let k = 0; k < 18; k++) {
            const a = (k / 18) * Math.PI * 2 + 0.4;
            const d = R * (0.4 + ((k * 23) % 10) / 13);
            flake(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.45 - t * 70,
                  11 + (k % 3) * 5, alpha * 0.9, tt + k);
        }
        ctx.globalAlpha = 1;
    });
});

// ────────────────────────────────────────────────────────────────────────────
// 🧤 얼음 주먹
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('ice_glove', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const tt = (state ? state.mathNow : 0) / 1000;
    const dir = (fx.isLeft || fx.dir === -1) ? -1 : 1;

    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.scale(dir, 1);
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = alpha;
        mist(ctx, 40, 0, 76 * (0.6 + t * 0.6), alpha * 0.9);

        // 앞으로 뻗는 결정 7개
        for (let k = 0; k < 7; k++) {
            const a = -0.95 + k * 0.32;
            shard(ctx, 10, 0, 96 + (k % 2) * 26, a, 10, alpha, k === 3);
        }
        // 각진 얼음 조각
        ctx.globalCompositeOperation = "source-over";
        for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + tt * 1.4;
            const px = 40 + Math.cos(a) * 34, py = Math.sin(a) * 30;
            ctx.save();
            ctx.translate(px, py); ctx.rotate(a + tt);
            ctx.beginPath();
            ctx.moveTo(0, -13); ctx.lineTo(10, 0); ctx.lineTo(0, 13); ctx.lineTo(-10, 0);
            ctx.closePath();
            const g = ctx.createLinearGradient(-10, -13, 10, 13);
            g.addColorStop(0, "rgba(255,255,255,0.95)");
            g.addColorStop(0.5, "rgba(160,228,255,0.9)");
            g.addColorStop(1, "rgba(40,130,195,0.85)");
            ctx.globalAlpha = alpha;
            ctx.fillStyle = g; ctx.fill();
            ctx.strokeStyle = "rgba(15,70,115,0.8)"; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        }
    });
});

// ────────────────────────────────────────────────────────────────────────────
// ❄️ 지나간 자리의 서리
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('trail_ice', (ctx, fx, alpha, state) => {
    const tt = (state ? state.mathNow : 0) / 1000;
    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    // 바닥 서리
    const g = ctx.createRadialGradient(fx.x, fx.y + 34, 3, fx.x, fx.y + 34, 60);
    g.addColorStop(0, I_PALE + "0.85)");
    g.addColorStop(0.6, I_MAIN + "0.4)");
    g.addColorStop(1, I_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(fx.x, fx.y + 34, 60, 22, 0, 0, Math.PI * 2); ctx.fill();
    // 작은 얼음 조각
    ctx.globalCompositeOperation = "source-over";
    for (let k = 0; k < 4; k++) {
        const px = fx.x + (k - 1.5) * 24;
        pillar(ctx, px, fx.y + 36, 16 + (k % 2) * 9, 6, alpha * 0.8, (k - 1.5) * 0.16);
    }
    for (let k = 0; k < 2; k++) {
        flake(ctx, fx.x + (k ? 26 : -26), fx.y + 22, 8, alpha * 0.75, tt + k);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🧊 퍼잔트백 — 얼음 창 충격파
// ────────────────────────────────────────────────────────────────────────────
registerShockwave('pheasant_peck', (ctx, sw, state) => {
    // ⚡ life 38 기준. 앞부분은 진하게, 끝에서만 옅어진다.
    const alpha = Math.min(1, Math.max(0, sw.life / 38) * 1.6);
    const pulse = 1 + Math.sin(state.mathNow / 50) * 0.12;
    const tt = state.mathNow / 1000;

    RenderUtils.withContext(ctx, sw.x, sw.y, () => {
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = "screen";
        ctx.scale(sw.dir * pulse, pulse);

        // 바깥 냉기
        mist(ctx, 70, 0, 260, alpha * 0.8);

        // 💨 뒤로 끌리는 속도선
        ctx.globalAlpha = alpha * 0.6;
        for (let k = -2; k <= 2; k++) {
            ctx.strokeStyle = I_PALE + "0.8)";
            ctx.lineWidth = 6 - Math.abs(k) * 1.5;
            ctx.beginPath();
            ctx.moveTo(-260, k * 26);
            ctx.lineTo(-40, k * 14);
            ctx.stroke();
        }
        ctx.globalAlpha = alpha;

        // 🧊 거대한 얼음 창 (중앙) — 더 길고 날카롭다
        ctx.beginPath();
        ctx.moveTo(-90, -52);
        ctx.lineTo(140, -12);
        ctx.lineTo(330, 0);
        ctx.lineTo(140, 12);
        ctx.lineTo(-90, 52);
        ctx.closePath();
        const sg = ctx.createLinearGradient(-90, 0, 330, 0);
        sg.addColorStop(0, I_CORE + "1)");
        sg.addColorStop(0.32, I_CORE + "0.98)");
        sg.addColorStop(0.72, I_MAIN + "0.85)");
        sg.addColorStop(1, I_FADE);
        ctx.fillStyle = sg; ctx.fill();
        ctx.strokeStyle = I_CORE + "0.9)"; ctx.lineWidth = 3; ctx.stroke();

        // 창을 감싸는 곁가지 결정
        for (let k = -2; k <= 2; k++) {
            if (k === 0) continue;
            shard(ctx, -30, k * 18, 250 - Math.abs(k) * 46, k * 0.11, 13, alpha * 0.95, Math.abs(k) === 1);
        }
        // 뒤에서 밀려 나오는 파편
        ctx.globalCompositeOperation = "source-over";
        for (let k = 0; k < 7; k++) {
            const px = -70 + k * 40, py = Math.sin(k * 1.9 + tt * 5) * 34;
            ctx.save();
            ctx.translate(px, py); ctx.rotate(tt * 2 + k);
            ctx.beginPath();
            ctx.moveTo(0, -11); ctx.lineTo(9, 0); ctx.lineTo(0, 11); ctx.lineTo(-9, 0);
            ctx.closePath();
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = "rgba(220,246,255,0.95)";
            ctx.fill();
            ctx.strokeStyle = "rgba(30,110,170,0.8)"; ctx.lineWidth = 1.8; ctx.stroke();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
    });
});
