// 파일명: fxkuzanp.js
// ============================================================================
// ❄️ 쿠잔(해적) — 얼음과 냉기 이펙트
//
//   🎨 배색 : 흰 심(#ffffff) · 밝은 청록(#4dd8ff) · 깊은 파랑(#0a6bb8)
//            영상처럼 '사방으로 뻗는 날카로운 얼음 결정' 이 핵심이다.
//
//   · kuzanp_strike     : 평타 (서리 낀 주먹)
//   · kuzanp_ball       : 1번 [아이스 볼] 날아가는 구슬
//   · kuzanp_ball_blast : 착탄 냉기 폭발
//   · kuzanp_glove      : 2번 [아이스 글러브] 착용 아우라
//   · kuzanp_frost_burst: 평타 냉기 폭발
//   · kuzanp_frost_trail: 지나간 자리의 서리 자국
//   · kuzanp_dash_cast  : 3번 [아이스 타임] 0.5초 결빙
//   · kuzanp_dash       : 냉기 돌진
//   · kuzanp_dash_blast : 돌진 착탄 대동결
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';

const I_CORE = "rgba(255, 255, 255, ";   // 심 (완전한 흰빛)
const I_MAIN = "rgba(77, 216, 255, ";    // 밝은 청록
const I_DEEP = "rgba(10, 107, 184, ";    // 깊은 파랑
const I_PALE = "rgba(198, 240, 255, ";   // 옅은 서리
const I_FADE = "rgba(8, 60, 120, 0)";

/**
 * 🧊 얼음 결정 하나 — 길고 날카로운 육각 파편.
 *    영상의 '방사형으로 뻗는 빛 창' 을 재현한다.
 */
function iceShard(ctx, x, y, len, ang, w, alpha, bright) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len * 0.32, -w);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.32, w);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, I_CORE + alpha + ")");
    g.addColorStop(0.28, (bright ? I_CORE : I_PALE) + alpha + ")");
    g.addColorStop(0.68, I_MAIN + (0.9 * alpha) + ")");
    g.addColorStop(1, I_FADE);
    ctx.fillStyle = g;
    ctx.fill();
    // 결정 능선
    ctx.strokeStyle = I_CORE + (0.75 * alpha) + ")";
    ctx.lineWidth = Math.max(1, w * 0.3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
    ctx.restore();
}

/** ❄️ 서리 결정(눈꽃) — 여섯 갈래 */
function frostFlake(ctx, x, y, r, alpha, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.strokeStyle = I_PALE + alpha + ")";
    ctx.lineWidth = Math.max(1, r * 0.13);
    ctx.lineCap = "round";
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const ex = Math.cos(a) * r, ey = Math.sin(a) * r;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();
        // 잔가지
        ctx.beginPath();
        ctx.moveTo(ex * 0.55, ey * 0.55);
        ctx.lineTo(ex * 0.55 + Math.cos(a + 0.9) * r * 0.28, ey * 0.55 + Math.sin(a + 0.9) * r * 0.28);
        ctx.moveTo(ex * 0.55, ey * 0.55);
        ctx.lineTo(ex * 0.55 + Math.cos(a - 0.9) * r * 0.28, ey * 0.55 + Math.sin(a - 0.9) * r * 0.28);
        ctx.stroke();
    }
    ctx.restore();
}

/** 🌬️ 냉기 안개 덩어리 */
function frostCloud(ctx, cx, cy, r, alpha) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r);
    g.addColorStop(0, I_CORE + (0.9 * alpha) + ")");
    g.addColorStop(0.3, I_PALE + (0.7 * alpha) + ")");
    g.addColorStop(0.66, I_MAIN + (0.45 * alpha) + ")");
    g.addColorStop(1, I_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
}

// ────────────────────────────────────────────────────────────────────────────
// ⚔️ 평타 — 서리 낀 주먹
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kuzanp_strike', (ctx, fx, alpha, state) => {
    const dir = (fx.isLeft || fx.dir === -1) ? -1 : 1;
    const t = 1 - alpha;
    const R = 108;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(fx.x, fx.y);
    ctx.scale(dir, 1);
    ctx.globalAlpha = alpha;

    frostCloud(ctx, 0, 0, R * (0.5 + t * 0.55), alpha * 0.85);
    // 앞으로 뻗는 얼음 결정 5개
    for (let k = 0; k < 5; k++) {
        const a = -0.85 + k * 0.42;
        iceShard(ctx, 0, 0, R * (0.9 + (k % 2) * 0.25), a, 9, alpha, k === 2);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// ❄️ 1번 [아이스 볼] — 날아가는 구슬
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kuzanp_ball', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const R = fx.radius || 60;
    const sp = fx.speed || 26;
    const frames = (fx.durationMs || 1000) / (1000 / 60);
    const travel = sp * frames * t;
    const dx = (fx.dirX === undefined) ? 1 : fx.dirX;
    const dy = (fx.dirY === undefined) ? 0 : fx.dirY;
    const cx = fx.x + dx * travel, cy = fx.y + dy * travel;
    const tt = state.mathNow / 1000;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 뒤로 끌리는 냉기 꼬리
    ctx.globalAlpha = alpha * 0.55;
    for (let k = 1; k <= 6; k++) {
        frostCloud(ctx, cx - dx * k * R * 0.5, cy - dy * k * R * 0.5,
                   R * (0.72 - k * 0.09), alpha * (0.5 - k * 0.07));
    }

    // 본체
    ctx.globalAlpha = alpha;
    frostCloud(ctx, cx, cy, R, alpha);

    // 🧊 사방으로 뻗은 얼음 결정 (영상의 핵심)
    for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + tt * 1.6;
        const len = R * (1.35 + Math.sin(tt * 7 + k) * 0.30);
        iceShard(ctx, cx, cy, len, a, R * 0.14, alpha * 0.95, k % 3 === 0);
    }

    // 흰 심
    ctx.globalAlpha = alpha;
    const cg = ctx.createRadialGradient(cx, cy, 1, cx, cy, R * 0.5);
    cg.addColorStop(0, "rgba(255,255,255,1)");
    cg.addColorStop(0.5, I_PALE + "0.9)");
    cg.addColorStop(1, I_FADE);
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ❄️ 착탄 — 냉기 폭발
registerVisualFX('kuzanp_ball_blast', (ctx, fx, alpha, state) => {
    const R = fx.radius || 330;
    const t = 1 - alpha;
    const rr = R * (1 - Math.pow(1 - Math.min(1, t / 0.35), 2.4));
    const tt = state.mathNow / 1000;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    ctx.globalAlpha = alpha;
    frostCloud(ctx, fx.x, fx.y, rr, alpha);

    // 방사형 결정 20가닥
    for (let k = 0; k < 20; k++) {
        const a = (k / 20) * Math.PI * 2 + t * 0.4;
        const len = rr * (0.9 + ((k * 37) % 10) / 22);
        iceShard(ctx, fx.x, fx.y, len, a, rr * 0.055, alpha * 0.95, k % 4 === 0);
    }

    // 퍼지는 서리 고리
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = I_CORE + "0.95)";
    ctx.lineWidth = 7 * (1 - t) + 2;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr * 0.95, 0, Math.PI * 2); ctx.stroke();

    // 흩날리는 눈꽃
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * 0.85;
    for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + 0.3;
        const d = rr * (0.45 + ((k * 29) % 10) / 15);
        frostFlake(ctx, fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d * 0.85,
                   9 + (k % 3) * 4, alpha * 0.9, tt + k);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🧤 2번 [아이스 글러브] — 착용 아우라
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kuzanp_glove', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    if (!o) return;
    const cx = o.x, cy = o.y;
    const tt = state.mathNow / 1000;
    const dir = (o.lastFacing === -1) ? -1 : 1;

    ctx.save();

    // 🧊 주먹을 감싼 얼음 장갑 (바라보는 쪽)
    const gx = cx + dir * 44, gy = cy + 6;
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.95;
    frostCloud(ctx, gx, gy, 42, alpha * 0.9);
    // 장갑을 이루는 각진 얼음 조각
    ctx.globalCompositeOperation = "source-over";
    for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + tt * 0.8;
        const px = gx + Math.cos(a) * 26, py = gy + Math.sin(a) * 26;
        ctx.save();
        ctx.translate(px, py); ctx.rotate(a + tt);
        ctx.beginPath();
        ctx.moveTo(0, -13); ctx.lineTo(10, 0); ctx.lineTo(0, 13); ctx.lineTo(-10, 0);
        ctx.closePath();
        const g = ctx.createLinearGradient(-10, -13, 10, 13);
        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(0.5, "rgba(150,225,255,0.9)");
        g.addColorStop(1, "rgba(30,120,190,0.85)");
        ctx.globalAlpha = alpha;
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = "rgba(10,60,110,0.8)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    }

    // ❄️ 몸을 감도는 냉기
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.5;
    frostCloud(ctx, cx, cy, 92, alpha * 0.45);
    // 발밑에서 피어오르는 냉기 입자
    ctx.globalAlpha = alpha * 0.8;
    for (let k = 0; k < 8; k++) {
        const f = ((state.mathNow / 680) + k / 8) % 1;
        const px = cx + Math.sin(k * 2.3 + tt) * 48;
        const py = cy + 42 - f * 130;
        frostFlake(ctx, px, py, 8 * (1 - f * 0.5), alpha * (1 - f) * 0.9, tt * 2 + k);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
});

// ❄️ 평타 냉기 폭발
registerVisualFX('kuzanp_frost_burst', (ctx, fx, alpha, state) => {
    const R = fx.radius || 190;
    const t = 1 - alpha;
    const rr = R * (1 - Math.pow(1 - Math.min(1, t / 0.4), 2.2));

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    frostCloud(ctx, fx.x, fx.y, rr, alpha);
    for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + t;
        iceShard(ctx, fx.x, fx.y, rr * 0.95, a, rr * 0.08, alpha * 0.95, k % 3 === 0);
    }
    ctx.strokeStyle = I_CORE + "0.9)";
    ctx.lineWidth = 4 * (1 - t) + 1.5;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr * 0.9, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ❄️ 지나간 자리의 서리 자국 (1초)
registerVisualFX('kuzanp_frost_trail', (ctx, fx, alpha, state) => {
    ctx.save();
    ctx.globalAlpha = alpha * 0.65;
    // 바닥에 깔린 서리
    const g = ctx.createRadialGradient(fx.x, fx.y + 30, 3, fx.x, fx.y + 30, 52);
    g.addColorStop(0, I_PALE + "0.8)");
    g.addColorStop(0.6, I_MAIN + "0.35)");
    g.addColorStop(1, I_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(fx.x, fx.y + 30, 52, 20, 0, 0, Math.PI * 2); ctx.fill();
    // 작은 눈꽃 3개
    for (let k = 0; k < 3; k++) {
        frostFlake(ctx, fx.x + (k - 1) * 22, fx.y + 26 + (k % 2) * 8,
                   7, alpha * 0.8, (fx.seed || 0) + k);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🧊 3번 [아이스 타임] — 0.5초 결빙
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kuzanp_dash_cast', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const t = 1 - alpha;                    // 0 → 1 (0.5초)
    const tt = state.mathNow / 1000;

    ctx.save();

    // ── 몸을 아래에서 위로 덮어 오르는 얼음 ──────────────────
    const cover = Math.min(1, t * 1.25);
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - 90, cy + 60 - 170 * cover, 180, 170 * cover + 10);
    ctx.clip();
    ctx.globalAlpha = alpha;
    // 얼음 몸체
    const bg = ctx.createLinearGradient(cx - 60, cy - 60, cx + 60, cy + 60);
    bg.addColorStop(0, "rgba(255,255,255,0.95)");
    bg.addColorStop(0.45, "rgba(168,232,255,0.9)");
    bg.addColorStop(1, "rgba(40,140,205,0.85)");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(cx, cy, 56, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 3; ctx.stroke();
    // 표면의 각진 결정면
    ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 54, cy + Math.sin(a) * 54);
        ctx.stroke();
    }
    ctx.restore();

    // ── 몸에서 삐죽 솟는 얼음 가시 ───────────────────────────
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    const N = Math.round(4 + cover * 10);
    for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2 + tt * 0.5;
        iceShard(ctx, cx, cy, 46 + cover * 52, a, 11, alpha * 0.95, k % 3 === 0);
    }

    // ── 주변으로 퍼지는 냉기 ─────────────────────────────────
    ctx.globalAlpha = alpha * 0.6;
    frostCloud(ctx, cx, cy, 96 + t * 70, alpha * 0.55);

    // ── 곧 나아갈 방향 예고 ──────────────────────────────────
    if (t > 0.6) {
        const w = (t - 0.6) / 0.4;
        const dx = (fx.dirX === undefined) ? 1 : fx.dirX;
        const dy = (fx.dirY === undefined) ? 0 : fx.dirY;
        ctx.globalAlpha = w * 0.55;
        const lg = ctx.createLinearGradient(cx, cy, cx + dx * 800, cy + dy * 800);
        lg.addColorStop(0, I_CORE + "0.9)");
        lg.addColorStop(1, I_FADE);
        ctx.strokeStyle = lg;
        ctx.lineWidth = 10 + w * 30;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * 800, cy + dy * 800); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
});

// 🧊 냉기 돌진
registerVisualFX('kuzanp_dash', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    if (!o) return;
    const cx = o.x, cy = o.y;
    const dx = (fx.dirX === undefined) ? 1 : fx.dirX;
    const dy = (fx.dirY === undefined) ? 0 : fx.dirY;
    const tt = state.mathNow / 1000;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 뒤로 길게 끌리는 냉기 잔상
    ctx.globalAlpha = alpha * 0.75;
    for (let k = 1; k <= 9; k++) {
        frostCloud(ctx, cx - dx * k * 34, cy - dy * k * 34,
                   62 - k * 4.5, alpha * (0.55 - k * 0.05));
    }

    // 몸을 감싼 얼음
    ctx.globalAlpha = alpha;
    frostCloud(ctx, cx, cy, 76, alpha);
    // 진행 방향으로 뻗은 얼음 창
    const ang = Math.atan2(dy, dx);
    for (let k = -2; k <= 2; k++) {
        iceShard(ctx, cx, cy, 150 - Math.abs(k) * 26, ang + k * 0.24, 15, alpha, k === 0);
    }
    // 몸 주위 얼음 파편
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + tt * 3;
        iceShard(ctx, cx, cy, 64, a, 8, alpha * 0.8, false);
    }

    // 흩날리는 눈보라
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * 0.8;
    for (let k = 0; k < 10; k++) {
        const f = ((state.mathNow / 240) + k / 10) % 1;
        const px = cx - dx * f * 260 + Math.sin(k * 2.1 + tt * 4) * 34;
        const py = cy - dy * f * 260 + Math.cos(k * 1.7 + tt * 3) * 30;
        frostFlake(ctx, px, py, 10 * (1 - f * 0.6), alpha * (1 - f) * 0.9, tt * 3 + k);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
});

// 🧊 돌진 착탄 — 대동결
registerVisualFX('kuzanp_dash_blast', (ctx, fx, alpha, state) => {
    const R = fx.radius || 380;
    const t = 1 - alpha;
    const rr = R * (1 - Math.pow(1 - Math.min(1, t / 0.32), 2.5));
    const tt = state.mathNow / 1000;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 섬광
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(fx.x, fx.y, 4, fx.x, fx.y, rr);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.2, I_CORE + "0.95)");
    g.addColorStop(0.55, I_MAIN + "0.7)");
    g.addColorStop(1, I_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr, 0, Math.PI * 2); ctx.fill();

    // 거대한 얼음 기둥 10개가 솟는다
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha;
    for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + 0.2;
        const d = rr * (0.35 + ((k * 31) % 10) / 20);
        const px = fx.x + Math.cos(a) * d;
        const py = fx.y + Math.sin(a) * d * 0.55;
        const h = (70 + ((k * 47) % 10) * 11) * Math.min(1, t / 0.3);
        ctx.beginPath();
        ctx.moveTo(px - 17, py);
        ctx.lineTo(px - 8, py - h);
        ctx.lineTo(px + 5, py - h * 0.82);
        ctx.lineTo(px + 17, py);
        ctx.closePath();
        const pg = ctx.createLinearGradient(px, py, px, py - h);
        pg.addColorStop(0, "rgba(60,160,215,0.92)");
        pg.addColorStop(0.5, "rgba(168,232,255,0.95)");
        pg.addColorStop(1, "rgba(255,255,255,0.98)");
        ctx.fillStyle = pg; ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2; ctx.stroke();
    }

    // 방사 결정 + 눈꽃
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.95;
    for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        iceShard(ctx, fx.x, fx.y, rr * (0.85 + (k % 3) * 0.12), a, rr * 0.05, alpha, k % 4 === 0);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * 0.85;
    for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + 0.4;
        const d = rr * (0.5 + ((k * 23) % 10) / 14);
        frostFlake(ctx, fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d * 0.8,
                   11 + (k % 3) * 5, alpha * 0.9, tt + k);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
});
