// 파일명: renderer/fxblackbeard.js
// ============================================================================
// ⚫ 검은수염 (암흑 왕좌 보스) 전용 이펙트 모음
//  ✅ [수정] dark_floor 에 '지면을 크게 뒤덮는 보랏빛 어둠 일렁임'을 추가
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

const DEFAULT_DARK_AREA = { minX: 28000, maxX: 33000, minY: 600, maxY: 2060 };
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
// 🌊 블랙홀 — 맵 바닥 전체를 휘몰아치며 일렁이는 암흑물질
//    ✅ [추가] 지면을 크게 뒤덮는 보랏빛 어둠 일렁임 (판정 높이와 별개인 연출층)
// ============================================================================
registerVisualFX('dark_floor', (ctx, fx, alpha, state) => {
    const A = fx.area || (typeof window !== 'undefined' && window.DARK_AREA) || DEFAULT_DARK_AREA;
    const G = (typeof window !== 'undefined' && window.DARK_GROUND !== undefined) ? window.DARK_GROUND : DEFAULT_DARK_GROUND;
    const w = A.maxX - A.minX;
    if (w <= 0) return;

    const H = 45;                         // 실제 판정 높이 = 플레이어 절반
    const GLOW_H = 460;                   // ✅ 연출용 보랏빛 어둠이 솟아오르는 높이
    const now = state.mathNow;
    const hold = alpha > 0.2 ? 1 : (alpha / 0.2);

    ctx.save();

    // ════════════════════════════════════════════════════════════════════
    // ✅ [신규] ① 지면을 크게 뒤덮는 보랏빛 어둠 (크고 느리게 일렁인다)
    // ════════════════════════════════════════════════════════════════════
    ctx.save();
    ctx.beginPath();
    ctx.rect(A.minX, G - GLOW_H, w, GLOW_H + 60);
    ctx.clip();

    // 넓게 퍼지는 보랏빛 발광 (screen)
    ctx.globalCompositeOperation = "screen";
    let bigGlow = ctx.createLinearGradient(0, G - GLOW_H, 0, G);
    bigGlow.addColorStop(0, "rgba(120, 30, 220, 0)");
    bigGlow.addColorStop(0.45, `rgba(138, 43, 226, ${0.22 * hold})`);
    bigGlow.addColorStop(0.8, `rgba(170, 70, 255, ${0.42 * hold})`);
    bigGlow.addColorStop(1, `rgba(200, 120, 255, ${0.55 * hold})`);
    ctx.fillStyle = bigGlow;
    ctx.fillRect(A.minX, G - GLOW_H, w, GLOW_H);

    // 크게 일렁이는 어둠의 파도 (4겹 · 서로 다른 속도 → 깊이감)
    for (let L = 0; L < 4; L++) {
        let amp = 78 - L * 15;                 // 진폭이 크다
        let base = GLOW_H * (0.72 - L * 0.15); // 층마다 높이가 다르다
        let spd = 2600 + L * 900;              // 느리게 일렁인다
        let phase = now / spd + L * 1.4;

        ctx.beginPath();
        ctx.moveTo(A.minX, G + 40);
        for (let sx = A.minX; sx <= A.maxX; sx += 55) {
            let t = (sx - A.minX) / 320;
            let yy = G - base
                   + Math.sin(t + phase) * amp
                   + Math.sin(t * 1.9 - phase * 1.3) * amp * 0.5
                   + Math.sin(t * 3.4 + phase * 0.7) * amp * 0.22;
            ctx.lineTo(sx, yy);
        }
        ctx.lineTo(A.maxX, G + 40);
        ctx.closePath();

        if (L === 0)      ctx.fillStyle = `rgba(96, 20, 180, ${0.20 * hold})`;
        else if (L === 1) ctx.fillStyle = `rgba(66, 8, 140, ${0.26 * hold})`;
        else if (L === 2) ctx.fillStyle = `rgba(38, 2, 82, ${0.34 * hold})`;
        else              ctx.fillStyle = `rgba(14, 0, 32, ${0.44 * hold})`;
        ctx.fill();

        // 파도 능선을 따라 흐르는 보랏빛 광택
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = `rgba(190, 110, 255, ${(0.30 - L * 0.06) * hold})`;
        ctx.lineWidth = 6 - L;
        ctx.beginPath();
        for (let sx = A.minX; sx <= A.maxX; sx += 55) {
            let t = (sx - A.minX) / 320;
            let yy = G - base
                   + Math.sin(t + phase) * amp
                   + Math.sin(t * 1.9 - phase * 1.3) * amp * 0.5
                   + Math.sin(t * 3.4 + phase * 0.7) * amp * 0.22;
            if (sx === A.minX) ctx.moveTo(sx, yy); else ctx.lineTo(sx, yy);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
    }

    // 크게 솟아오르는 어둠 기둥 (넓고 느리게 흔들린다)
    ctx.globalCompositeOperation = "source-over";
    for (let c = 0; c < 9; c++) {
        let cxp = A.minX + ((c + 0.5) / 9) * w + Math.sin(c * 1.6 + now / 1900) * 130;
        let ch = GLOW_H * (0.45 + Math.abs(Math.sin(c * 1.27 + now / 1500)) * 0.5);
        let cw = 170 + Math.sin(c * 2.1 + now / 1100) * 60;

        let pg = ctx.createLinearGradient(0, G, 0, G - ch);
        pg.addColorStop(0, `rgba(74, 12, 148, ${0.45 * hold})`);
        pg.addColorStop(0.55, `rgba(122, 40, 210, ${0.22 * hold})`);
        pg.addColorStop(1, "rgba(150, 70, 255, 0)");
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.moveTo(cxp - cw * 0.5, G + 30);
        ctx.quadraticCurveTo(cxp - cw * 0.22 + Math.sin(now / 800 + c) * 40, G - ch * 0.55, cxp + Math.sin(now / 640 + c) * 55, G - ch);
        ctx.quadraticCurveTo(cxp + cw * 0.22 + Math.sin(now / 800 + c) * 40, G - ch * 0.55, cxp + cw * 0.5, G + 30);
        ctx.closePath();
        ctx.fill();
    }

    // 크게 떠오르는 보랏빛 구체 (느리게 상승)
    ctx.globalCompositeOperation = "screen";
    for (let s = 0; s < 14; s++) {
        let sp = ((now / 3000) + s * 0.0714) % 1;
        let sxp = A.minX + ((s * 613) % w);
        let syp = G - sp * GLOW_H;
        let sr = 26 + Math.sin(s * 2.3 + now / 900) * 12;
        ctx.globalAlpha = (1 - sp) * 0.5 * hold;
        let og = ctx.createRadialGradient(sxp, syp, 2, sxp, syp, sr);
        og.addColorStop(0, "rgba(220, 170, 255, 0.9)");
        og.addColorStop(0.5, "rgba(150, 60, 240, 0.4)");
        og.addColorStop(1, "rgba(80, 0, 160, 0)");
        ctx.fillStyle = og;
        ctx.beginPath(); ctx.arc(sxp, syp, sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // ════════════════════════════════════════════════════════════════════
    // ② 실제 판정 높이(45)의 암흑물질 본체
    // ════════════════════════════════════════════════════════════════════
    ctx.beginPath();
    ctx.rect(A.minX, G - H - 60, w, H + 80);
    ctx.clip();

    let base = ctx.createLinearGradient(0, G - H, 0, G);
    base.addColorStop(0, `rgba(60, 0, 100, ${0.55 * hold})`);
    base.addColorStop(0.45, `rgba(20, 0, 40, ${0.9 * hold})`);
    base.addColorStop(1, `rgba(4, 0, 10, ${0.98 * hold})`);
    ctx.fillStyle = base;
    ctx.fillRect(A.minX, G - H, w, H);

    for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        ctx.moveTo(A.minX, G);
        let amp = 13 - layer * 3.5;
        let spd = 620 + layer * 260;
        let phase = now / spd + layer * 1.7;
        for (let sx = A.minX; sx <= A.maxX; sx += 40) {
            let t = (sx - A.minX) / 90;
            let yy = (G - H) + Math.sin(t + phase) * amp + Math.sin(t * 2.4 - phase * 1.4) * amp * 0.55 + layer * 7;
            ctx.lineTo(sx, yy);
        }
        ctx.lineTo(A.maxX, G);
        ctx.closePath();
        ctx.fillStyle = layer === 0
            ? `rgba(96, 14, 168, ${0.42 * hold})`
            : (layer === 1 ? `rgba(46, 4, 88, ${0.5 * hold})` : `rgba(12, 0, 24, ${0.6 * hold})`);
        ctx.fill();
    }

    ctx.lineCap = "round";
    for (let t2 = 0; t2 < 22; t2++) {
        let tx = A.minX + ((t2 + 0.5) / 22) * w + Math.sin(t2 * 2.3 + now / 700) * 40;
        let grow = (0.5 + Math.abs(Math.sin(t2 * 1.9 + now / 320)) * 0.5) * H * 0.95;
        ctx.strokeStyle = `rgba(20, 0, 36, ${0.85 * hold})`;
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(tx, G);
        ctx.quadraticCurveTo(tx + Math.sin(t2 + now / 280) * 26, G - grow * 0.6, tx + Math.sin(t2 * 1.4 + now / 220) * 34, G - grow);
        ctx.stroke();

        ctx.strokeStyle = `rgba(150, 55, 240, ${0.5 * hold})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tx, G);
        ctx.quadraticCurveTo(tx + Math.sin(t2 + now / 280) * 26, G - grow * 0.6, tx + Math.sin(t2 * 1.4 + now / 220) * 34, G - grow);
        ctx.stroke();
    }

    ctx.globalCompositeOperation = "screen";
    for (let s = 0; s < 20; s++) {
        let sp = ((now / 900) + s * 0.05) % 1;
        let sxp = A.minX + ((s * 421) % w);
        let syp = G - sp * H * 1.15;
        ctx.globalAlpha = (1 - sp) * hold;
        ctx.fillStyle = "rgba(186, 96, 255, 0.9)";
        ctx.beginPath(); ctx.arc(sxp, syp, 4.5 - sp * 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    ctx.restore();
});

// ============================================================================
// 🔴 크로우즈 예고 — 시전 1초 전, 뻗어나갈 방향을 빨간색으로 표시
//    (이 표시 안에 들어온 대상에게만 크로우즈가 적중한다)
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
    const bb = state.blackbeard;
    if (bb && bb.hp > 0) { sx = bb.x; sy = bb.y; }

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