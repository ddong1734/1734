// 파일명: fxdaido.js
// ============================================================================
// ⚔️ 다이도 하가네 — 검 이펙트
//
//   · daido_slash        : 평타 한 번 (짧고 날카로운 호)
//   · daido_spin         : 평타 3연타 마무리 — 짧은 전방위 베기 (0.5초)
//   · daido_fury         : 1번 [무자비] — 1.5초간 사방으로 난무
//   · daido_rush         : 2번 [질풍참] — 2초 돌진 궤적 + 잔상
//   · daido_rush_tick    : 돌진 중 0.2초마다 터지는 베기
//   · daido_rush_finish  : 돌진 끝 360도 마무리 베기
//   · daido_iai_charge   : 3번 [일섬] 0.5초 발도 준비
//   · daido_iai          : [일섬] 전방 대참격
//
//   ⚠️ 칼날은 '가늘고 길게, 끝으로 갈수록 얇아지게' 그린다.
//      호(arc)의 안쪽/바깥쪽 반지름을 다르게 잡아 초승달 모양을 만든다.
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

// 🎨 다이도의 검광 — 푸른빛이 도는 은백색
const EDGE = "rgba(255, 255, 255, ";
const MID  = "rgba(180, 226, 255, ";
const DEEP = "rgba(70, 150, 230, ";
const FADE = "rgba(30, 90, 180, 0)";

/**
 * ⚔️ 검이 지나간 자리(호) 를 그린다.
 *    a0 → a1 각도 구간을, 안쪽 rIn / 바깥쪽 rOut 사이의 띠로 그린다.
 *    끝으로 갈수록 얇아져 칼끝처럼 보인다.
 */
function bladeArc(ctx, cx, cy, rIn, rOut, a0, a1, alpha, width) {
    const steps = 26;
    const w = (width === undefined) ? 1 : width;

    ctx.beginPath();
    // 바깥쪽 호 (a0 → a1)
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = a0 + (a1 - a0) * t;
        // 시작·끝이 가늘어지도록 두께를 사인으로 조절
        const k = Math.sin(Math.PI * t);
        const r = rIn + (rOut - rIn) * (0.35 + 0.65 * k) * w;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    // 안쪽 호 (a1 → a0)
    for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const a = a0 + (a1 - a0) * t;
        ctx.lineTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
    }
    ctx.closePath();

    const g = ctx.createRadialGradient(cx, cy, rIn, cx, cy, rOut);
    g.addColorStop(0, FADE);
    g.addColorStop(0.45, DEEP + (0.55 * alpha) + ")");
    g.addColorStop(0.78, MID + (0.9 * alpha) + ")");
    g.addColorStop(1, EDGE + alpha + ")");
    ctx.fillStyle = g;
    ctx.fill();

    // 칼날 바깥선 — 가장 밝은 심
    ctx.strokeStyle = EDGE + (0.95 * alpha) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, a0, a1, a1 < a0);
    ctx.stroke();
}

/** ✨ 베인 자리에 남는 짧은 섬광 선 */
function sparkLines(ctx, cx, cy, r, count, alpha, seedT) {
    ctx.strokeStyle = EDGE + (0.8 * alpha) + ")";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + seedT;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72);
        ctx.lineTo(cx + Math.cos(a) * r * 1.12, cy + Math.sin(a) * r * 1.12);
        ctx.stroke();
    }
}

// ============================================================================
// ⚔️ 평타 — 짧고 날카로운 호
// ============================================================================
registerVisualFX('daido_slash', (ctx, fx, alpha, state) => {
    const dir = (fx.isLeft || fx.dir === -1) ? -1 : 1;
    const t = 1 - alpha;
    const swing = Math.min(1, t / 0.55);
    const R = 120;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(fx.x, fx.y);
    ctx.scale(dir, 1);

    // 위에서 아래로 베어 내린다
    const a0 = -Math.PI * 0.62;
    const a1 = a0 + Math.PI * 0.95 * swing;
    bladeArc(ctx, 0, 0, R * 0.42, R, a0, a1, alpha, 1);

    ctx.globalAlpha = alpha * 0.7;
    sparkLines(ctx, 0, 0, R, 3, alpha, a1);

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 🌀 평타 3연타 마무리 — 짧은 전방위 베기 (0.5초)
// ============================================================================
registerVisualFX('daido_spin', (ctx, fx, alpha, state) => {
    const R = fx.radius || 170;
    const t = 1 - alpha;
    const turns = 2.2;                       // 0.5초 동안 2바퀴 조금 넘게

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 회전하는 칼날 3장
    for (let k = 0; k < 3; k++) {
        const base = t * Math.PI * 2 * turns + (k / 3) * Math.PI * 2;
        const a0 = base, a1 = base + Math.PI * 0.5;
        ctx.globalAlpha = alpha * (k === 0 ? 1 : 0.55);
        bladeArc(ctx, fx.x, fx.y, R * 0.5, R, a0, a1, alpha * (k === 0 ? 1 : 0.5), 0.9);
    }

    // 발밑에 퍼지는 원형 검압
    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = MID + "0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(fx.x, fx.y + 26, R * (0.7 + t * 0.5), R * 0.24, 0, 0, Math.PI * 2); ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// ⚔️ 1번 [무자비] — 1.5초간 사방으로 난무
// ============================================================================
registerVisualFX('daido_fury', (ctx, fx, alpha, state) => {
    let o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const R = fx.radius || 240;
    const t = 1 - alpha;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 사방을 훑는 칼날 5장 — 서로 다른 속도로 돈다
    for (let k = 0; k < 5; k++) {
        const spd = 5.5 + k * 1.7;
        const base = t * Math.PI * 2 * spd + (k / 5) * Math.PI * 2;
        const span = Math.PI * (0.34 + (k % 2) * 0.16);
        const rr = R * (0.72 + (k % 3) * 0.14);
        ctx.globalAlpha = alpha * (0.5 + (k === 0 ? 0.5 : 0.28));
        bladeArc(ctx, cx, cy, rr * 0.46, rr, base, base + span, alpha * 0.85, 0.85);
    }

    // 중심에서 터지는 검기
    ctx.globalAlpha = alpha * 0.5;
    let g = ctx.createRadialGradient(cx, cy, 6, cx, cy, R * 0.55);
    g.addColorStop(0, EDGE + "0.8)");
    g.addColorStop(0.5, MID + "0.35)");
    g.addColorStop(1, FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2); ctx.fill();

    // 바깥으로 튀는 섬광
    ctx.globalAlpha = alpha * 0.75;
    sparkLines(ctx, cx, cy, R, 8, alpha, state.mathNow / 90);

    // 범위 테두리 (희미하게)
    ctx.globalAlpha = alpha * 0.28;
    ctx.strokeStyle = MID + "0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 💨 2번 [질풍참] — 돌진 궤적 + 잔상
// ============================================================================
registerVisualFX('daido_rush', (ctx, fx, alpha, state) => {
    let o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const dir = (fx.dir === -1) ? -1 : 1;
    const R = fx.hitRadius || 190;
    const t = 1 - alpha;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // ── 뒤로 길게 남는 바람 궤적 ────────────────────────────────
    ctx.globalAlpha = alpha * 0.5;
    let tg = ctx.createLinearGradient(cx - dir * R * 3.4, cy, cx, cy);
    tg.addColorStop(0, FADE);
    tg.addColorStop(0.6, DEEP + "0.4)");
    tg.addColorStop(1, MID + "0.75)");
    ctx.fillStyle = tg;
    ctx.fillRect(Math.min(cx, cx - dir * R * 3.4), cy - R * 0.5, R * 3.4, R);

    // ── 잔상 칼날 4장 ───────────────────────────────────────────
    for (let k = 1; k <= 4; k++) {
        const bx = cx - dir * k * R * 0.62;
        const ga = alpha * (1 - k / 5) * 0.6;
        const base = t * Math.PI * 2 * 7 + k;
        ctx.globalAlpha = ga;
        bladeArc(ctx, bx, cy, R * 0.34, R * 0.72, base, base + Math.PI * 0.44, ga, 0.8);
    }

    // ── 몸 주위를 빠르게 도는 칼날 2장 ──────────────────────────
    for (let k = 0; k < 2; k++) {
        const base = t * Math.PI * 2 * 9 + k * Math.PI;
        ctx.globalAlpha = alpha;
        bladeArc(ctx, cx, cy, R * 0.42, R * 0.9, base, base + Math.PI * 0.5, alpha, 0.95);
    }

    // ── 진행 방향 앞쪽 충격파 ───────────────────────────────────
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = EDGE + "0.9)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(cx + dir * R * 0.55, cy, R * 0.28, R * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 💥 돌진 중 0.2초마다 터지는 베기
// ============================================================================
registerVisualFX('daido_rush_tick', (ctx, fx, alpha, state) => {
    const R = fx.radius || 190;
    const t = 1 - alpha;
    const base = t * Math.PI * 3;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    bladeArc(ctx, fx.x, fx.y, R * 0.4, R * 0.95, base, base + Math.PI * 0.75, alpha, 1);
    bladeArc(ctx, fx.x, fx.y, R * 0.4, R * 0.95, base + Math.PI, base + Math.PI * 1.75, alpha * 0.7, 1);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 🌪️ 돌진 끝 — 360도 마무리 베기
// ============================================================================
registerVisualFX('daido_rush_finish', (ctx, fx, alpha, state) => {
    const R = fx.radius || 330;
    const t = 1 - alpha;
    const grow = 1 - Math.pow(1 - Math.min(1, t / 0.35), 2.4);

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 한 바퀴를 크게 훑는 칼날
    const sweep = Math.PI * 2 * Math.min(1, t / 0.4);
    ctx.globalAlpha = alpha;
    bladeArc(ctx, fx.x, fx.y, R * 0.55 * grow, R * grow, -Math.PI / 2, -Math.PI / 2 + sweep, alpha, 1);

    // 퍼져 나가는 원형 충격파
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = EDGE + "0.95)";
    ctx.lineWidth = 7 * (1 - t) + 2;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R * grow, 0, Math.PI * 2); ctx.stroke();

    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = MID + "0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R * grow * 1.18, 0, Math.PI * 2); ctx.stroke();

    // 사방으로 뻗는 검격선
    ctx.globalAlpha = alpha * 0.8;
    sparkLines(ctx, fx.x, fx.y, R * grow, 12, alpha, 0);

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// ⚡ 3번 [일섬] — 0.5초 발도 준비
// ============================================================================
registerVisualFX('daido_iai_charge', (ctx, fx, alpha, state) => {
    let o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const dir = (fx.dir === -1) ? -1 : 1;
    const t = 1 - alpha;
    const range = fx.range || 620;
    const half = (fx.thickness || 300) / 2;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 벨 자리를 알리는 가는 선 (점점 진해진다)
    ctx.globalAlpha = 0.18 + t * 0.45;
    let lg = ctx.createLinearGradient(cx, cy, cx + dir * range, cy);
    lg.addColorStop(0, EDGE + "0.9)");
    lg.addColorStop(1, FADE);
    ctx.fillStyle = lg;
    ctx.fillRect(Math.min(cx, cx + dir * range), cy - (2 + t * 8), range, 4 + t * 16);

    // 칼집에서 모여드는 검기
    ctx.globalAlpha = 0.35 + t * 0.6;
    let g = ctx.createRadialGradient(cx, cy, 3, cx, cy, 60 + t * 90);
    g.addColorStop(0, EDGE + "1)");
    g.addColorStop(0.45, MID + "0.7)");
    g.addColorStop(1, FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 60 + t * 90, 0, Math.PI * 2); ctx.fill();

    // 빨려드는 기류
    ctx.strokeStyle = MID + (0.4 + t * 0.5) + ")";
    ctx.lineWidth = 3; ctx.lineCap = "round";
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + state.mathNow / 300;
        const far = 190 * (1 - t) + 40, near = far - 55;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * far, cy + Math.sin(a) * far);
        ctx.lineTo(cx + Math.cos(a) * near, cy + Math.sin(a) * near);
        ctx.stroke();
    }

    // 준비가 끝나기 직전 번쩍임
    if (t > 0.8) {
        ctx.globalAlpha = (t - 0.8) / 0.2;
        ctx.fillStyle = EDGE + "0.9)";
        ctx.fillRect(Math.min(cx, cx + dir * range), cy - half * 0.12, range, half * 0.24);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// ⚡ 3번 [일섬] — 전방 대참격
// ============================================================================
registerVisualFX('daido_iai', (ctx, fx, alpha, state) => {
    const dir = (fx.dir === -1) ? -1 : 1;
    const range = fx.range || 620;
    const half = (fx.thickness || 300) / 2;
    const t = 1 - alpha;
    const reach = Math.min(1, t / 0.16);      // 눈 깜짝할 사이에 끝까지
    const len = range * reach;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(fx.x, fx.y);
    ctx.scale(dir, 1);

    // ── 베어진 공간 (넓고 옅게) ─────────────────────────────────
    ctx.globalAlpha = alpha * 0.4;
    let og = ctx.createLinearGradient(0, -half, 0, half);
    og.addColorStop(0, FADE);
    og.addColorStop(0.5, DEEP + "0.5)");
    og.addColorStop(1, FADE);
    ctx.fillStyle = og;
    ctx.fillRect(0, -half, len, half * 2);

    // ── 칼자국 본체 — 가운데가 가장 두껍고 끝이 뾰족하다 ────────
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -half * 0.92, len, -half * 0.10);
    ctx.lineTo(len, half * 0.10);
    ctx.quadraticCurveTo(len * 0.45, half * 0.92, 0, 0);
    ctx.closePath();
    let bg = ctx.createLinearGradient(0, 0, len, 0);
    bg.addColorStop(0, EDGE + "1)");
    bg.addColorStop(0.45, MID + "0.95)");
    bg.addColorStop(1, DEEP + "0.4)");
    ctx.fillStyle = bg;
    ctx.fill();

    // 칼날 심
    ctx.globalAlpha = Math.min(1, alpha * 1.5);
    ctx.fillStyle = EDGE + "1)";
    ctx.fillRect(0, -4, len, 8);

    // ── 위아래로 갈라지는 경계선 ────────────────────────────────
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = EDGE + "0.95)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.45, -half * 0.92, len, -half * 0.10);
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.45,  half * 0.92, len,  half * 0.10);
    ctx.stroke();

    // ── 시작점 섬광 ─────────────────────────────────────────────
    ctx.globalAlpha = alpha;
    let fg = ctx.createRadialGradient(0, 0, 4, 0, 0, half * 1.1);
    fg.addColorStop(0, EDGE + "1)");
    fg.addColorStop(0.4, MID + "0.7)");
    fg.addColorStop(1, FADE);
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(0, 0, half * 1.1, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});
