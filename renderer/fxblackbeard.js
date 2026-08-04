// 파일명: renderer/fxblackbeard.js
// ============================================================================
// ⚫ 검은수염 (암흑 왕좌 보스) + 🟪 지저스 바제스 전용 이펙트 모음
//  ✅ [수정] dark_floor 에서 '블랙홀 코어' 연출을 완전히 제거했다
//     (다층 파형 · 어둠 촉수 · 보랏빛 불티만 남긴다)
//  ⛓️ [추가] yami_slash  : 어둠어둠 크로우즈가 빗나갔을 때 남는 어둠 잔상
//  💥 [추가] gura_impact_super : 크로우즈 적중 후 이어지는 강화 파공아
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

const DEFAULT_DARK_AREA = { minX: 36000, maxX: 41000, minY: 600, maxY: 2060 };
const DEFAULT_DARK_GROUND = 2000;

// ── 공통 : 하얗게 갈라진 '대기의 균열' ───────────────────────────────────────
function drawAirCrack(ctx, cx, cy, scale, seedBase, alpha, mathNow, arms) {
    const ARMS = arms || 6;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let a = 0; a < ARMS; a++) {
        const ang = (Math.PI * 2 / ARMS) * a + seedBase * 0.35;
        const len = (300 + (a % 2) * 110) * scale;

        ctx.strokeStyle = `rgba(10, 0, 18, ${0.85 * alpha})`;
        ctx.lineWidth = 20 * scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let s = 1; s <= 4; s++) {
            let t = s / 4;
            let jitter = Math.sin(a * 2.3 + s * 1.7 + seedBase) * 34 * scale;
            let xx = Math.cos(ang) * len * t + Math.cos(ang + Math.PI / 2) * jitter;
            let yy = Math.sin(ang) * len * t + Math.sin(ang + Math.PI / 2) * jitter;
            ctx.lineTo(xx, yy);
        }
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
        ctx.lineWidth = 8 * scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let s = 1; s <= 4; s++) {
            let t = s / 4;
            let jitter = Math.sin(a * 2.3 + s * 1.7 + seedBase) * 34 * scale;
            let xx = Math.cos(ang) * len * t + Math.cos(ang + Math.PI / 2) * jitter;
            let yy = Math.sin(ang) * len * t + Math.sin(ang + Math.PI / 2) * jitter;
            ctx.lineTo(xx, yy);
        }
        ctx.stroke();
    }
    ctx.restore();
}

// ── 공통 : 하얀 번개 + 검붉은 전기 (한 가닥) ────────────────────────────────
function drawBoltPath(ctx, ang, len, scale, alpha, mathNow, seed) {
    const SEG = 8;
    const px = -Math.sin(ang), py = Math.cos(ang);
    let pts = [];
    for (let q = 0; q <= SEG; q++) {
        let t = q / SEG;
        let wob = (q === 0 || q === SEG) ? 0 : Math.sin(t * 7 + seed + mathNow / 190) * 0.10;
        let a2 = ang + wob * (1 - t * 0.4);
        pts.push({ x: Math.cos(a2) * len * t, y: Math.sin(a2) * len * t, t: t });
    }

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = "rgba(255, 60, 55, 0.85)";
    ctx.lineWidth = 18 * scale;
    ctx.beginPath();
    for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(96, 0, 16, 0.92)";
    ctx.lineWidth = 6 * scale;
    ctx.beginPath();
    for (let q = 0; q <= SEG; q++) {
        let p = pts[q];
        let coil = Math.sin(p.t * Math.PI * 4 + mathNow / 110 + seed) * (14 + p.t * 26) * scale;
        let xx = p.x + px * coil, yy = p.y + py * coil;
        if (q === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.98)";
    ctx.lineWidth = 5.5 * scale;
    ctx.beginPath();
    for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
    ctx.stroke();
}

// ============================================================================
// 🌊 암흑물질 장판 — 지면을 뒤덮으며 빠르고 자연스럽게 일렁이는 어둠
//    ✅ [수정] '블랙홀 코어' 연출을 제거하고 아래 요소만 남겼다.
//       ① 소용돌이치듯 빠르게 흐르는 다층 파형
//       ② 지면에서 빠르게 솟구쳤다 사라지는 어둠 촉수
//       ③ 빠르게 떠오르는 보랏빛 불티
// ============================================================================
registerVisualFX('dark_floor', (ctx, fx, alpha, state) => {
    const A = fx.area || (typeof window !== 'undefined' && window.DARK_AREA) || DEFAULT_DARK_AREA;
    const G = (typeof window !== 'undefined' && window.DARK_GROUND !== undefined) ? window.DARK_GROUND : DEFAULT_DARK_GROUND;
    const w = A.maxX - A.minX;
    if (w <= 0) return;

    const H = 45;            // 실제 판정 높이
    const GLOW_H = 520;      // 연출용 어둠이 솟아오르는 높이
    const now = state.mathNow;
    const hold = alpha > 0.15 ? 1 : (alpha / 0.15);

    ctx.save();
    ctx.beginPath();
    ctx.rect(A.minX, G - GLOW_H, w, GLOW_H + 80);
    ctx.clip();

    // ── ① 바닥 전체를 덮는 보랏빛 심연 그라디언트 ────────────────────────
    ctx.globalCompositeOperation = "screen";
    let baseGlow = ctx.createLinearGradient(0, G - GLOW_H, 0, G);
    baseGlow.addColorStop(0, "rgba(90, 20, 190, 0)");
    baseGlow.addColorStop(0.5, `rgba(126, 32, 224, ${0.20 * hold})`);
    baseGlow.addColorStop(0.82, `rgba(176, 76, 255, ${0.42 * hold})`);
    baseGlow.addColorStop(1, `rgba(214, 140, 255, ${0.6 * hold})`);
    ctx.fillStyle = baseGlow;
    ctx.fillRect(A.minX, G - GLOW_H, w, GLOW_H);
    ctx.globalCompositeOperation = "source-over";

    // ── ② 빠르게 흐르는 다층 파형 (5겹 · 서로 다른 속도와 방향) ───────────
    for (let L = 0; L < 5; L++) {
        let dir = (L % 2 === 0) ? 1 : -1;
        let amp = 62 - L * 9;
        let base = GLOW_H * (0.80 - L * 0.13);
        let spd = 340 + L * 130;                 // ✅ 빠르게
        let phase = dir * now / spd + L * 1.9;
        let stretch = 210 + L * 60;

        ctx.beginPath();
        ctx.moveTo(A.minX, G + 60);
        for (let sx = A.minX; sx <= A.maxX; sx += 32) {
            let t = (sx - A.minX) / stretch;
            let yy = G - base
                   + Math.sin(t + phase) * amp
                   + Math.sin(t * 2.3 - phase * 1.7) * amp * 0.55
                   + Math.sin(t * 4.1 + phase * 2.4) * amp * 0.28
                   + Math.sin(t * 7.7 - phase * 3.1) * amp * 0.12;
            ctx.lineTo(sx, yy);
        }
        ctx.lineTo(A.maxX, G + 60);
        ctx.closePath();

        if (L === 0)      ctx.fillStyle = `rgba(120, 36, 210, ${0.17 * hold})`;
        else if (L === 1) ctx.fillStyle = `rgba(86, 16, 168, ${0.22 * hold})`;
        else if (L === 2) ctx.fillStyle = `rgba(52, 6, 116, ${0.28 * hold})`;
        else if (L === 3) ctx.fillStyle = `rgba(26, 2, 62, ${0.36 * hold})`;
        else              ctx.fillStyle = `rgba(8, 0, 20, ${0.48 * hold})`;
        ctx.fill();

        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = `rgba(206, 132, 255, ${(0.34 - L * 0.055) * hold})`;
        ctx.lineWidth = 7 - L;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let sx = A.minX; sx <= A.maxX; sx += 32) {
            let t = (sx - A.minX) / stretch;
            let yy = G - base
                   + Math.sin(t + phase) * amp
                   + Math.sin(t * 2.3 - phase * 1.7) * amp * 0.55
                   + Math.sin(t * 4.1 + phase * 2.4) * amp * 0.28
                   + Math.sin(t * 7.7 - phase * 3.1) * amp * 0.12;
            if (sx === A.minX) ctx.moveTo(sx, yy); else ctx.lineTo(sx, yy);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
    }

    // ── ③ 지면에서 빠르게 솟구쳤다 사라지는 어둠 촉수 ────────────────────
    ctx.lineCap = "round";
    for (let t2 = 0; t2 < 30; t2++) {
        let cycle = ((now / 700) + t2 * 0.033) % 1;
        let tx = A.minX + ((t2 + 0.5) / 30) * w + Math.sin(t2 * 2.7 + now / 420) * 55;
        let grow = Math.sin(cycle * Math.PI) * (GLOW_H * 0.42);
        if (grow < 4) continue;

        let sway = Math.sin(t2 * 1.9 + now / 240) * 40;

        ctx.strokeStyle = `rgba(14, 0, 30, ${0.72 * hold * Math.sin(cycle * Math.PI)})`;
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.moveTo(tx, G + 10);
        ctx.quadraticCurveTo(tx + sway * 0.5, G - grow * 0.55, tx + sway, G - grow);
        ctx.stroke();

        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = `rgba(180, 90, 255, ${0.45 * hold * Math.sin(cycle * Math.PI)})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(tx, G + 10);
        ctx.quadraticCurveTo(tx + sway * 0.5, G - grow * 0.55, tx + sway, G - grow);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
    }

    // ── ④ 빠르게 떠오르는 보랏빛 불티 ────────────────────────────────────
    ctx.globalCompositeOperation = "screen";
    for (let s = 0; s < 26; s++) {
        let sp = ((now / 900) + s * 0.0385) % 1;
        let sxp = A.minX + ((s * 587) % w) + Math.sin(s + now / 500) * 40;
        let syp = G - sp * GLOW_H * 0.9;
        let sr = 9 - sp * 6;
        ctx.globalAlpha = (1 - sp) * 0.75 * hold;
        let og = ctx.createRadialGradient(sxp, syp, 1, sxp, syp, sr * 2.4);
        og.addColorStop(0, "rgba(236, 200, 255, 0.95)");
        og.addColorStop(0.5, "rgba(160, 70, 250, 0.45)");
        og.addColorStop(1, "rgba(80, 0, 160, 0)");
        ctx.fillStyle = og;
        ctx.beginPath(); ctx.arc(sxp, syp, sr * 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // ════════════════════════════════════════════════════════════════════
    // ⑤ 실제 판정 높이(45)의 암흑물질 본체 — 빠르게 요동친다
    // ════════════════════════════════════════════════════════════════════
    ctx.save();
    ctx.beginPath();
    ctx.rect(A.minX, G - H - 70, w, H + 90);
    ctx.clip();

    let base = ctx.createLinearGradient(0, G - H, 0, G);
    base.addColorStop(0, `rgba(70, 0, 120, ${0.6 * hold})`);
    base.addColorStop(0.45, `rgba(22, 0, 46, ${0.92 * hold})`);
    base.addColorStop(1, `rgba(3, 0, 8, ${0.98 * hold})`);
    ctx.fillStyle = base;
    ctx.fillRect(A.minX, G - H, w, H);

    for (let layer = 0; layer < 4; layer++) {
        let dir = (layer % 2 === 0) ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(A.minX, G + 20);
        let amp = 15 - layer * 3;
        let spd = 180 + layer * 70;          // ✅ 아주 빠르게 요동
        let phase = dir * now / spd + layer * 1.4;
        for (let sx = A.minX; sx <= A.maxX; sx += 26) {
            let t = (sx - A.minX) / 70;
            let yy = (G - H)
                   + Math.sin(t + phase) * amp
                   + Math.sin(t * 2.7 - phase * 1.9) * amp * 0.6
                   + Math.sin(t * 5.3 + phase * 2.6) * amp * 0.3
                   + layer * 6;
            ctx.lineTo(sx, yy);
        }
        ctx.lineTo(A.maxX, G + 20);
        ctx.closePath();
        ctx.fillStyle = layer === 0
            ? `rgba(112, 22, 190, ${0.44 * hold})`
            : (layer === 1 ? `rgba(62, 8, 118, ${0.5 * hold})`
            : (layer === 2 ? `rgba(30, 2, 60, ${0.56 * hold})` : `rgba(8, 0, 18, ${0.64 * hold})`));
        ctx.fill();
    }

    ctx.globalCompositeOperation = "screen";
    for (let s = 0; s < 30; s++) {
        let sp = ((now / 380) + s * 0.033) % 1;
        let sxp = A.minX + (sp * w * 1.15 + s * 331) % w;
        let syp = G - H * 0.55 + Math.sin(s * 2.1 + now / 190) * 16;
        ctx.globalAlpha = (0.4 + Math.sin(s + now / 160) * 0.35) * hold;
        ctx.fillStyle = "rgba(200, 120, 255, 0.9)";
        ctx.beginPath(); ctx.arc(sxp, syp, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    ctx.restore();
});

// ============================================================================
// 🔴 크로우즈 예고 — 시전 1초 전, 뻗어나갈 방향을 빨간색으로 표시
// ============================================================================
registerVisualFX('crows_telegraph', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    let sx = fx.x, sy = fx.y;
    let ex = (fx.x2 !== undefined) ? fx.x2 : fx.x;
    let ey = (fx.y2 !== undefined) ? fx.y2 : fx.y;
    let ang = Math.atan2(ey - sy, ex - sx);
    let len = Math.hypot(ex - sx, ey - sy);
    let half = (fx.radius || 45);
    let blink = 0.55 + Math.abs(Math.sin(now / 90)) * 0.45;

    RenderUtils.withRotation(ctx, sx, sy, ang, () => {
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = alpha * blink;
        let g = ctx.createLinearGradient(0, -half, 0, half);
        g.addColorStop(0, "rgba(255, 0, 0, 0)");
        g.addColorStop(0.5, "rgba(255, 30, 30, 0.65)");
        g.addColorStop(1, "rgba(255, 0, 0, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, -half, len, half * 2);
        ctx.globalCompositeOperation = "source-over";

        ctx.strokeStyle = `rgba(255, 45, 45, ${alpha * blink})`;
        ctx.lineWidth = 5;
        ctx.setLineDash([34, 22]);
        ctx.lineDashOffset = -now / 18;
        ctx.beginPath();
        ctx.moveTo(0, -half); ctx.lineTo(len, -half);
        ctx.moveTo(0, half);  ctx.lineTo(len, half);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = `rgba(255, 90, 90, ${alpha * blink})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

        ctx.strokeStyle = `rgba(255, 40, 40, ${alpha})`;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(len, 0, half * 0.9 * (1 + Math.sin(now / 110) * 0.12), 0, Math.PI * 2); ctx.stroke();
    });
});

// ============================================================================
// ⚫ 크로우즈 — 검은 촉수 다발이 길게 뻗어 대상을 끌어온다
// ============================================================================
registerVisualFX('crows_beam', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    let sx = fx.x, sy = fx.y;
    let ex = (fx.x2 !== undefined) ? fx.x2 : fx.x;
    let ey = (fx.y2 !== undefined) ? fx.y2 : fx.y;

    if (fx.targetId) {
        let t = (fx.targetId === state.myId) ? state.myPlayer : state.players[fx.targetId];
        if (t) { ex = t.x; ey = t.y; }
    }
    // ⛓️ 플레이어가 쓴 크로우즈는 시전자 몸 중앙에서 뻗어 나간다
    if (fx.ownerId) {
        let o = (fx.ownerId === state.myId) ? state.myPlayer : state.players[fx.ownerId];
        if (o) { sx = o.x; sy = o.y; }
    } else {
        const bb = state.blackbeard;
        if (bb && bb.hp > 0) { sx = bb.x; sy = bb.y; }
    }

    let ang = Math.atan2(ey - sy, ex - sx);
    let len = Math.hypot(ex - sx, ey - sy);
    if (len < 1) return;

    RenderUtils.withRotation(ctx, sx, sy, ang, () => {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = Math.min(1, alpha * 1.6);

        ctx.globalCompositeOperation = "screen";
        let aura = ctx.createLinearGradient(0, -80, 0, 80);
        aura.addColorStop(0, "rgba(120, 20, 200, 0)");
        aura.addColorStop(0.5, "rgba(150, 45, 240, 0.42)");
        aura.addColorStop(1, "rgba(120, 20, 200, 0)");
        ctx.fillStyle = aura;
        ctx.fillRect(0, -80, len, 160);
        ctx.globalCompositeOperation = "source-over";

        const STRANDS = 22;
        for (let s = 0; s < STRANDS; s++) {
            let spread = ((s / (STRANDS - 1)) - 0.5) * 2;
            let wob = Math.sin(s * 1.9 + now / 190) * 0.35;
            let tipY = spread * 26;
            let midY = spread * (120 + Math.abs(spread) * 90) + wob * 60;
            let endY = spread * (34 + Math.abs(spread) * 22);

            let sl = 0.55 + Math.abs(Math.sin(s * 2.7 + now / 240)) * 0.45;
            let thick = 3 + (1 - Math.abs(spread)) * 8;

            ctx.strokeStyle = `rgba(6, 0, 12, ${0.92 * sl})`;
            ctx.lineWidth = thick;
            ctx.beginPath();
            ctx.moveTo(0, tipY);
            ctx.bezierCurveTo(len * 0.28, midY, len * 0.68, midY * 0.55, len, endY);
            ctx.stroke();

            if (s % 3 === 0) {
                ctx.globalCompositeOperation = "screen";
                ctx.strokeStyle = `rgba(168, 72, 255, ${0.45 * sl})`;
                ctx.lineWidth = Math.max(1.5, thick * 0.35);
                ctx.beginPath();
                ctx.moveTo(0, tipY);
                ctx.bezierCurveTo(len * 0.28, midY, len * 0.68, midY * 0.55, len, endY);
                ctx.stroke();
                ctx.globalCompositeOperation = "source-over";
            }
        }

        for (let f = 0; f < 12; f++) {
            let t = ((now / 700) + f * 0.083) % 1;
            let fx0 = len * (1 - t);
            let fy0 = Math.sin(f * 2.1 + now / 300) * (60 + t * 120);
            ctx.strokeStyle = `rgba(10, 0, 20, ${(1 - t) * 0.7})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(fx0, fy0);
            ctx.quadraticCurveTo(fx0 + 90, fy0 * 1.15, fx0 + 190, fy0 * 1.3);
            ctx.stroke();
        }

        ctx.fillStyle = "rgba(4, 0, 10, 0.95)";
        ctx.beginPath(); ctx.ellipse(6, 0, 34, 58, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "screen";
        let core = ctx.createRadialGradient(6, 0, 4, 6, 0, 90);
        core.addColorStop(0, "rgba(190, 110, 255, 0.75)");
        core.addColorStop(0.5, "rgba(110, 20, 190, 0.35)");
        core.addColorStop(1, "rgba(40, 0, 80, 0)");
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(6, 0, 90, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";

        ctx.strokeStyle = "rgba(8, 0, 16, 0.95)";
        ctx.lineWidth = 11;
        ctx.beginPath(); ctx.ellipse(len, 0, 46, 52, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(176, 82, 255, ${0.75 + Math.sin(now / 100) * 0.25})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(len, 0, 46, 52, 0, 0, Math.PI * 2); ctx.stroke();

        ctx.globalAlpha = 1;
    });
});

// ============================================================================
// ⛓️ [신규] 어둠 잔상 — 크로우즈가 빗나갔을 때 전방에 남는 어둠 자국
//    fx.x / fx.y : 시전자 몸 중앙 · fx.x2 / fx.y2 : 사거리 끝점
// ============================================================================
registerVisualFX('yami_slash', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    let sx = fx.x, sy = fx.y;

    // 시전자가 살아 있으면 몸 중앙을 계속 따라간다
    if (fx.ownerId) {
        let o = (fx.ownerId === state.myId) ? state.myPlayer : state.players[fx.ownerId];
        if (o) { sx = o.x; sy = o.y; }
    }

    let ex = (fx.x2 !== undefined) ? fx.x2 : sx + 500;
    let ey = (fx.y2 !== undefined) ? fx.y2 : sy;
    let ang = Math.atan2(ey - sy, ex - sx);
    let len = Math.hypot(ex - sx, ey - sy);
    if (len < 1) return;

    let half = (fx.radius || 95);

    RenderUtils.withRotation(ctx, sx, sy, ang, () => {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = alpha;

        // 어둠 띠
        let band = ctx.createLinearGradient(0, -half, 0, half);
        band.addColorStop(0, "rgba(10, 0, 20, 0)");
        band.addColorStop(0.5, `rgba(8, 0, 16, ${0.72 * alpha})`);
        band.addColorStop(1, "rgba(10, 0, 20, 0)");
        ctx.fillStyle = band;
        ctx.fillRect(0, -half, len, half * 2);

        // 흩어지는 촉수 잔상
        const STRANDS = 12;
        for (let s = 0; s < STRANDS; s++) {
            let spread = ((s / (STRANDS - 1)) - 0.5) * 2;
            let sl = 0.5 + Math.abs(Math.sin(s * 2.3 + now / 200)) * 0.5;
            ctx.strokeStyle = `rgba(6, 0, 12, ${0.8 * sl * alpha})`;
            ctx.lineWidth = 4 + (1 - Math.abs(spread)) * 7;
            ctx.beginPath();
            ctx.moveTo(0, spread * 20);
            ctx.bezierCurveTo(len * 0.3, spread * (half * 0.9), len * 0.7, spread * (half * 0.5), len, spread * (half * 0.35));
            ctx.stroke();
        }

        // 보랏빛 발광
        ctx.globalCompositeOperation = "screen";
        let glow = ctx.createLinearGradient(0, -half, 0, half);
        glow.addColorStop(0, "rgba(120, 30, 220, 0)");
        glow.addColorStop(0.5, `rgba(160, 60, 250, ${0.35 * alpha})`);
        glow.addColorStop(1, "rgba(120, 30, 220, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, -half * 0.7, len, half * 1.4);

        // 흩어지는 입자
        for (let s = 0; s < 10; s++) {
            let sp = ((now / 320) + s * 0.1) % 1;
            let px = len * sp;
            let py = Math.sin(s * 2.1 + now / 160) * half * 0.6;
            ctx.globalAlpha = alpha * (1 - sp) * 0.9;
            ctx.fillStyle = "rgba(210, 160, 255, 0.9)";
            ctx.beginPath(); ctx.arc(px, py, 6 - sp * 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = "source-over";

        // 끝단 고리
        ctx.strokeStyle = `rgba(8, 0, 16, ${0.9 * alpha})`;
        ctx.lineWidth = 9;
        ctx.beginPath(); ctx.ellipse(len, 0, 30, half * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(176, 82, 255, ${0.7 * alpha})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.ellipse(len, 0, 30, half * 0.6, 0, 0, Math.PI * 2); ctx.stroke();

        ctx.globalAlpha = 1;
    });
});

// ── 끌려오는 플레이어의 암흑 잔상 ───────────────────────────────────────────
registerVisualFX('crows_trail', (ctx, fx, alpha) => {
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = "rgba(10, 0, 20, 0.75)";
        ctx.beginPath(); ctx.ellipse(0, 0, 44, 50, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(150, 60, 240, 0.5)";
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
    });
});

// ============================================================================
// 💥 파공아 — 하얗게 대기가 갈라지고 화면이 깨진다
// ============================================================================
registerVisualFX('gura_impact', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const R = fx.radius || 283;
    const scale = R / 110;
    const prog = 1 - alpha;

    ctx.save();
    ctx.translate(fx.x, fx.y);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    let g = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R * (1 + prog * 0.6));
    g.addColorStop(0, "rgba(255, 255, 255, 1)");
    g.addColorStop(0.4, "rgba(230, 220, 255, 0.75)");
    g.addColorStop(1, "rgba(120, 40, 200, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R * (1 + prog * 0.6), 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 18 * alpha + 4;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.55 + prog * 0.5), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(190, 90, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 8 * alpha + 2;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    drawAirCrack(ctx, fx.x, fx.y, scale * (0.5 + prog * 0.7), prog * 3.1, alpha, now, 6);
});

// ============================================================================
// 💥✨ [신규] 강화 파공아 — 크로우즈 적중 후 이어지는 시너지 일격
//    · 기본 파공아보다 넓고, 균열이 더 많고, 충격 링이 여러 겹으로 퍼진다
// ============================================================================
registerVisualFX('gura_impact_super', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const R = fx.radius || 368;
    const scale = R / 110;
    const prog = 1 - alpha;

    ctx.save();
    ctx.translate(fx.x, fx.y);

    // ── 중심 대폭발 ────────────────────────────────────────────────────
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    let g = ctx.createRadialGradient(0, 0, R * 0.06, 0, 0, R * (1.15 + prog * 0.7));
    g.addColorStop(0, "rgba(255, 255, 255, 1)");
    g.addColorStop(0.25, "rgba(245, 235, 255, 0.92)");
    g.addColorStop(0.55, "rgba(190, 110, 255, 0.6)");
    g.addColorStop(1, "rgba(90, 20, 180, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R * (1.15 + prog * 0.7), 0, Math.PI * 2); ctx.fill();

    // ── 다중 충격 링 (4겹) ──────────────────────────────────────────────
    for (let r = 0; r < 4; r++) {
        let rt = (prog + r * 0.22) % 1;
        let rr = R * (0.35 + rt * 0.95);
        let ra = alpha * (1 - rt) * 0.95;
        ctx.strokeStyle = (r % 2 === 0)
            ? `rgba(255, 255, 255, ${ra})`
            : `rgba(200, 120, 255, ${ra * 0.85})`;
        ctx.lineWidth = (22 - r * 4) * (1 - rt) + 3;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    }

    // ── 방사형 섬광 창 ─────────────────────────────────────────────────
    ctx.lineCap = "round";
    for (let s = 0; s < 16; s++) {
        let ang = (Math.PI * 2 / 16) * s + prog * 0.6;
        let r1 = R * 0.2;
        let r2 = R * (0.85 + prog * 0.75) * (s % 2 === 0 ? 1 : 0.7);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.lineWidth = 11 * alpha + 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
        ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(190, 90, 255, ${alpha * 0.7})`;
        ctx.lineWidth = 5 * alpha + 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
        ctx.lineTo(Math.cos(ang) * r2 * 1.12, Math.sin(ang) * r2 * 1.12);
        ctx.stroke();
    }

    // ── 튀어나가는 파편 ────────────────────────────────────────────────
    for (let s = 0; s < 22; s++) {
        let sp = ((now / 300) + s * 0.045) % 1;
        let sa = s * 2.35 + prog * 2;
        let sr = R * (0.3 + sp * 1.15);
        ctx.globalAlpha = alpha * (1 - sp) * 0.95;
        ctx.fillStyle = (s % 3 === 0) ? "rgba(255, 255, 255, 0.95)"
                      : (s % 3 === 1 ? "rgba(214, 160, 255, 0.9)" : "rgba(12, 0, 24, 0.85)");
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.85, 11 - sp * 7, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = alpha;

    // ── 어둠 코어 (검은 중심) ──────────────────────────────────────────
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * 0.85;
    let dc = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.34);
    dc.addColorStop(0, "rgba(4, 0, 10, 0.95)");
    dc.addColorStop(0.65, "rgba(24, 0, 48, 0.55)");
    dc.addColorStop(1, "rgba(30, 0, 60, 0)");
    ctx.fillStyle = dc;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.34, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // ── 대기의 균열 (두 겹 · 더 크고 촘촘하게) ──────────────────────────
    drawAirCrack(ctx, fx.x, fx.y, scale * (0.6 + prog * 0.9), prog * 3.1, alpha, now, 8);
    drawAirCrack(ctx, fx.x, fx.y, scale * (0.4 + prog * 0.65), prog * 5.7 + 1.1, alpha * 0.8, now, 6);
});

// ============================================================================
// 🌀 어둠 소용돌이 상승 — 검은수염이 어둠으로 변해 하늘로 솟구친다 (2초)
// ============================================================================
registerVisualFX('dark_rise', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const fromY = (fx.y2 !== undefined) ? fx.y2 : fx.y;
    const toY = (fx.radius !== undefined) ? fx.radius : fx.y;
    const t = 1 - alpha;
    const ease = t * t * (3 - 2 * t);
    const cy = fromY + (toY - fromY) * ease;
    const cx = fx.x;

    const R = 110 * (1 - ease * 0.25);

    ctx.save();
    ctx.translate(cx, cy);

    ctx.globalCompositeOperation = "source-over";
    let trailH = Math.abs(fromY - cy);
    if (trailH > 4) {
        let tg = ctx.createLinearGradient(0, 0, 0, trailH);
        tg.addColorStop(0, "rgba(10, 0, 20, 0.85)");
        tg.addColorStop(0.6, "rgba(40, 4, 74, 0.4)");
        tg.addColorStop(1, "rgba(20, 0, 40, 0)");
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(-R * 0.7, 0);
        ctx.quadraticCurveTo(-R * 0.35, trailH * 0.5, -R * 0.15, trailH);
        ctx.lineTo(R * 0.15, trailH);
        ctx.quadraticCurveTo(R * 0.35, trailH * 0.5, R * 0.7, 0);
        ctx.closePath();
        ctx.fill();
    }

    ctx.fillStyle = "rgba(3, 0, 8, 0.97)";
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.85, R * 1.1, 0, 0, Math.PI * 2); ctx.fill();

    ctx.lineCap = "round";
    for (let a = 0; a < 5; a++) {
        let base = now / 160 + a * (Math.PI * 2 / 5);
        ctx.strokeStyle = `rgba(150, 55, 245, ${0.55 + Math.sin(now / 120 + a) * 0.25})`;
        ctx.lineWidth = 7;
        ctx.beginPath();
        for (let s = 0; s <= 1.0001; s += 0.1) {
            let ang = base + s * Math.PI * 1.6;
            let rr = s * R;
            let xx = Math.cos(ang) * rr, yy = Math.sin(ang) * rr * 1.2;
            if (s === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
    }

    ctx.globalCompositeOperation = "screen";
    let core = ctx.createRadialGradient(0, 0, 4, 0, 0, R * 1.1);
    core.addColorStop(0, "rgba(235, 205, 255, 0.9)");
    core.addColorStop(0.35, "rgba(140, 45, 235, 0.5)");
    core.addColorStop(1, "rgba(30, 0, 60, 0)");
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.1, 0, Math.PI * 2); ctx.fill();

    for (let s = 0; s < 12; s++) {
        let sp = ((now / 420) + s * 0.083) % 1;
        let sa = s * 2.1;
        let sr = R * 1.4 * (1 - sp);
        ctx.globalAlpha = sp * 0.9;
        ctx.fillStyle = "rgba(200, 140, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 1.2 + sp * 60, 4.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    ctx.restore();
});

// ============================================================================
// 🌑 공중 강림 — 5초간 대기를 가르며 검붉은 전기를 띈 하얀 번개를 쏟아낸다
// ============================================================================
registerVisualFX('dark_descent', (ctx, fx, alpha, state) => {
    const A = fx.area || (typeof window !== 'undefined' && window.DARK_AREA) || DEFAULT_DARK_AREA;
    const G = (typeof window !== 'undefined' && window.DARK_GROUND !== undefined) ? window.DARK_GROUND : DEFAULT_DARK_GROUND;
    const now = state.mathNow;
    const w = A.maxX - A.minX;
    const hold = alpha > 0.15 ? 1 : (alpha / 0.15);

    let cx = fx.x, cy = fx.y;
    const bb = state.blackbeard;
    if (bb && bb.hp > 0) { cx = bb.x; cy = bb.y; }

    ctx.save();
    ctx.beginPath();
    ctx.rect(A.minX, A.minY - 1400, w, (G + 200) - (A.minY - 1400));
    ctx.clip();

    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(6, 0, 14, ${0.34 * hold})`;
    ctx.fillRect(A.minX, A.minY - 1400, w, (G + 200) - (A.minY - 1400));

    ctx.globalCompositeOperation = "screen";
    let col = ctx.createLinearGradient(0, cy, 0, G);
    col.addColorStop(0, `rgba(255, 245, 250, ${0.5 * hold})`);
    col.addColorStop(0.35, `rgba(210, 100, 255, ${0.24 * hold})`);
    col.addColorStop(1, "rgba(70, 0, 130, 0)");
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx - 190, cy);
    ctx.lineTo(cx + 190, cy);
    ctx.lineTo(cx + 520, G);
    ctx.lineTo(cx - 520, G);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    const BOLTS = 7;
    const fall = Math.max(360, G - cy);
    ctx.save();
    ctx.translate(cx, cy);
    for (let b = 0; b < BOLTS; b++) {
        let spread = (b / (BOLTS - 1)) - 0.5;
        let ang = Math.PI / 2 + spread * (Math.PI * 0.62);
        let phase = ((now / 620) + b * 0.14) % 1;
        let glow = 0.45 + (1 - Math.abs(phase - 0.5) * 2) * 0.55;
        let len = fall * (0.82 + Math.abs(Math.sin(b * 1.3 + now / 480)) * 0.2);
        drawBoltPath(ctx, ang, len, 1.0, hold * glow, now, b * 2.7);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    drawAirCrack(ctx, cx, cy + 60, 1.6, now / 900, hold * 0.95, now, 6);

    ctx.globalCompositeOperation = "screen";
    let pulse = 1 + Math.sin(now / 130) * 0.12;
    let aura = ctx.createRadialGradient(cx, cy, 40, cx, cy, 400 * pulse);
    aura.addColorStop(0, `rgba(255, 255, 255, ${0.8 * hold})`);
    aura.addColorStop(0.28, `rgba(255, 70, 70, ${0.45 * hold})`);
    aura.addColorStop(0.62, `rgba(90, 0, 40, ${0.28 * hold})`);
    aura.addColorStop(1, "rgba(16, 0, 12, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(cx, cy, 400 * pulse, 0, Math.PI * 2); ctx.fill();

    let ringT = ((now / 700) % 1);
    ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - ringT) * hold * 0.9})`;
    ctx.lineWidth = 18 * (1 - ringT) + 3;
    ctx.beginPath(); ctx.ellipse(cx, G, w * 0.5 * ringT, 78 * ringT, 0, 0, Math.PI * 2); ctx.stroke();

    let ringT2 = ((now / 700) + 0.5) % 1;
    ctx.strokeStyle = `rgba(190, 90, 255, ${(1 - ringT2) * hold * 0.7})`;
    ctx.lineWidth = 12 * (1 - ringT2) + 2;
    ctx.beginPath(); ctx.ellipse(cx, G, w * 0.5 * ringT2, 78 * ringT2, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";

    for (let s = 0; s < 8; s++) {
        let sp = ((now / 1100) + s * 0.125) % 1;
        let sa = s * 2.4;
        let sr = 120 + sp * 420;
        ctx.globalAlpha = (1 - sp) * hold * 0.8;
        ctx.fillStyle = (s % 2 === 0) ? "rgba(255, 90, 90, 0.85)" : "rgba(10, 0, 18, 0.8)";
        ctx.beginPath();
        ctx.arc(cx + Math.cos(sa) * sr, cy + Math.sin(sa) * sr * 0.7, 6 - sp * 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
});

// ============================================================================
// 🟪 바제스 등장 낙하 — 하늘에서 떨어지는 보랏빛 궤적
// ============================================================================
registerVisualFX('burgess_spawn', (ctx, fx, alpha, state) => {
    const bg = state.burgess;
    if (!bg || bg.hp <= 0) return;
    const R = fx.radius || 76;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    let g = ctx.createLinearGradient(bg.x, bg.y - R * 12, bg.x, bg.y);
    g.addColorStop(0, "rgba(160, 60, 250, 0)");
    g.addColorStop(0.55, "rgba(180, 90, 255, 0.35)");
    g.addColorStop(1, "rgba(216, 160, 255, 0.8)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bg.x - R * 1.4, bg.y);
    ctx.lineTo(bg.x + R * 1.4, bg.y);
    ctx.lineTo(bg.x + R * 0.4, bg.y - R * 12);
    ctx.lineTo(bg.x - R * 0.4, bg.y - R * 12);
    ctx.closePath(); ctx.fill();

    const now = state.mathNow;
    for (let s = 0; s < 14; s++) {
        let sp = ((now / 500) + s * 0.071) % 1;
        let sa = s * 2.2;
        let sr = R * 2.2 * (1 - sp);
        ctx.globalAlpha = alpha * (1 - sp) * 0.8;
        ctx.fillStyle = "rgba(220, 170, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(bg.x + Math.cos(sa) * sr, bg.y - sp * R * 8, 7 - sp * 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 🔴 바제스 점프 예고 — 착지 예정 지점 빨간 표시
// ============================================================================
registerVisualFX('burgess_telegraph', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const R = fx.radius || 340;
    let blink = 0.5 + Math.abs(Math.sin(now / 80)) * 0.5;
    let prog = 1 - alpha;

    ctx.save();
    ctx.translate(fx.x, fx.y);

    ctx.globalCompositeOperation = "screen";
    let g = ctx.createRadialGradient(0, 0, 10, 0, 0, R);
    g.addColorStop(0, `rgba(255, 90, 90, ${0.6 * blink})`);
    g.addColorStop(0.65, `rgba(255, 30, 30, ${0.32 * blink})`);
    g.addColorStop(1, "rgba(180, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.strokeStyle = `rgba(255, 45, 45, ${blink})`;
    ctx.lineWidth = 10;
    ctx.setLineDash([34, 24]); ctx.lineDashOffset = -now / 18;
    ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = `rgba(255, 120, 120, ${blink})`;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(0, 0, R * prog, R * 0.36 * prog, 0, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = `rgba(255, 70, 70, ${blink * 0.9})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-R * 0.28, 0); ctx.lineTo(R * 0.28, 0);
    ctx.moveTo(0, -R * 0.12); ctx.lineTo(0, R * 0.12);
    ctx.stroke();

    ctx.restore();

    if (fx.groundY !== undefined && fx.groundY > fx.y + 10) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = blink * 0.55;
        ctx.strokeStyle = "rgba(255, 60, 60, 0.75)";
        ctx.lineWidth = 5;
        ctx.setLineDash([28, 20]); ctx.lineDashOffset = -now / 22;
        ctx.beginPath();
        ctx.moveTo(fx.x, fx.y);
        ctx.lineTo(fx.x, fx.groundY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(255, 45, 45, ${blink * 0.8})`;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(fx.x, fx.groundY, R * 0.5, R * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
        ctx.restore();
    }
});

// ============================================================================
// 🦘 바제스 도약 — 지나간 자리에 보랏빛 호 (공중 목표 반영)
// ============================================================================
registerVisualFX('burgess_jump', (ctx, fx, alpha, state) => {
    const arc = fx.arc || 520;
    let t = 1 - alpha;
    let fromY = (fx.y !== undefined) ? fx.y : 0;
    let toY = (fx.y2 !== undefined) ? fx.y2 : fromY;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";

    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = "rgba(150, 60, 250, 0.7)";
    ctx.lineWidth = 44;
    ctx.beginPath();
    for (let s = 0; s <= 1.0001; s += 0.06) {
        if (s > t) break;
        let xx = fx.x + (fx.x2 - fx.x) * s;
        let baseY = fromY + (toY - fromY) * s;
        let yy = baseY - Math.sin(s * Math.PI) * arc;
        if (s === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = "rgba(216, 160, 255, 0.95)";
    ctx.lineWidth = 22;
    ctx.beginPath();
    for (let s = 0; s <= 1.0001; s += 0.06) {
        if (s > t) break;
        let xx = fx.x + (fx.x2 - fx.x) * s;
        let baseY = fromY + (toY - fromY) * s;
        let yy = baseY - Math.sin(s * Math.PI) * arc;
        if (s === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();

    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 🌪️ 바제스 착지 풍압 — 큰 충격파
// ============================================================================
registerVisualFX('burgess_blast', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const R = fx.radius || 450;
    let prog = 1 - alpha;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;

    let g = ctx.createRadialGradient(0, 0, 12, 0, 0, R * (0.4 + prog));
    g.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    g.addColorStop(0.35, "rgba(216, 160, 255, 0.65)");
    g.addColorStop(0.7, "rgba(150, 60, 240, 0.3)");
    g.addColorStop(1, "rgba(110, 30, 200, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.4 + prog), 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 26 * alpha + 5;
    ctx.beginPath(); ctx.ellipse(0, 0, R * (0.3 + prog), R * 0.4 * (0.3 + prog), 0, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = `rgba(190, 110, 255, ${alpha * 0.85})`;
    ctx.lineWidth = 14 * alpha + 3;
    ctx.beginPath(); ctx.ellipse(0, 0, R * (0.55 + prog * 0.7), R * 0.4 * (0.55 + prog * 0.7), 0, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = `rgba(140, 50, 230, ${alpha * 0.6})`;
    ctx.lineWidth = 9 * alpha + 2;
    ctx.beginPath(); ctx.ellipse(0, 0, R * (0.8 + prog * 0.5), R * 0.4 * (0.8 + prog * 0.5), 0, 0, Math.PI * 2); ctx.stroke();

    for (let s = 0; s < 24; s++) {
        let a2 = (Math.PI * 2 / 24) * s;
        let rr = R * (0.35 + prog * 0.95);
        ctx.strokeStyle = `rgba(226, 180, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a2) * rr * 0.35, Math.sin(a2) * rr * 0.16);
        ctx.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr * 0.4);
        ctx.stroke();
    }

    for (let s = 0; s < 16; s++) {
        let sp = ((now / 380) + s * 0.0625) % 1;
        let sa = s * 2.4;
        let sr = R * (0.3 + sp * 0.9);
        ctx.globalAlpha = alpha * (1 - sp) * 0.9;
        ctx.fillStyle = (s % 2 === 0) ? "rgba(216, 160, 255, 0.9)" : "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.4 - sp * 60, 9 - sp * 5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});