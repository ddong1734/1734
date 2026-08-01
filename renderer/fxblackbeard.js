// 파일명: renderer/fxblackbeard.js
// ============================================================================
// ⚫ 검은수염 (암흑 왕좌 보스) 전용 이펙트 모음
// ----------------------------------------------------------------------------
//  · dark_floor        : 맵 바닥 전체를 휘몰아치며 일렁이는 암흑물질 (높이 = 플레이어 절반)
//  · crows_telegraph   : 크로우즈 시전 1초 전 빨간색 조준 표시
//  · crows_beam        : 크로우즈 — 검은 촉수 다발이 길게 뻗어 대상을 끌어온다
//  · crows_trail       : 끌려오는 플레이어의 암흑 잔상
//  · gura_impact       : 파공아 — 하얗게 대기가 갈라지고 화면이 깨진다
//  · dark_rise         : ✅ 어둠 소용돌이로 변해 하늘로 솟구치는 연출 (2초)
//  · dark_descent      : ✅ [재작업] 공중 강림 — 과한 난잡함을 걷어내고
//                        '중앙 대기 균열 + 좌우 대칭 번개 + 아래 충격 파문'으로 정돈
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

const DEFAULT_DARK_AREA = { minX: 22000, maxX: 27000, minY: -5200, maxY: -3940 };
const DEFAULT_DARK_GROUND = -4000;

// ── 공통 : 하얗게 갈라진 '대기의 균열' ───────────────────────────────────────
//    ✅ [정돈] 무작위 파편을 없애고 팔 개수를 고정해 좌우로 정연하게 갈라지도록 변경
function drawAirCrack(ctx, cx, cy, scale, seedBase, alpha, mathNow, arms) {
    const ARMS = arms || 6;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let a = 0; a < ARMS; a++) {
        const ang = (Math.PI * 2 / ARMS) * a + seedBase * 0.35;
        const len = (300 + (a % 2) * 110) * scale;

        // 균열 바깥의 어두운 테두리
        ctx.strokeStyle = `rgba(10, 0, 18, ${0.85 * alpha})`;
        ctx.lineWidth = 20 * scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let s = 1; s <= 4; s++) {
            let t = s / 4;
            // 결정론적 흔들림 (프레임마다 튀지 않는다)
            let jitter = Math.sin(a * 2.3 + s * 1.7 + seedBase) * 34 * scale;
            let xx = Math.cos(ang) * len * t + Math.cos(ang + Math.PI / 2) * jitter;
            let yy = Math.sin(ang) * len * t + Math.sin(ang + Math.PI / 2) * jitter;
            ctx.lineTo(xx, yy);
        }
        ctx.stroke();

        // 균열 안쪽의 하얀 대기
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
//    ✅ [정돈] 무작위 지터를 사인파 기반으로 바꿔 흔들림이 부드럽고 예측 가능하게
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

    // ① 붉은 글로우
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = "rgba(255, 60, 55, 0.85)";
    ctx.lineWidth = 18 * scale;
    ctx.beginPath();
    for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
    ctx.stroke();

    // ② 검붉은 전기가 심지를 감아 돈다 (한 가닥만 — 과밀 방지)
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

    // ③ 하얀 심지
    ctx.strokeStyle = "rgba(255, 255, 255, 0.98)";
    ctx.lineWidth = 5.5 * scale;
    ctx.beginPath();
    for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
    ctx.stroke();
}

// ============================================================================
// 🌊 블랙홀 — 맵 바닥 전체를 휘몰아치며 일렁이는 암흑물질 (높이 = 플레이어 절반 = 45)
// ============================================================================
registerVisualFX('dark_floor', (ctx, fx, alpha, state) => {
    const A = fx.area || (typeof window !== 'undefined' && window.DARK_AREA) || DEFAULT_DARK_AREA;
    const G = (typeof window !== 'undefined' && window.DARK_GROUND !== undefined) ? window.DARK_GROUND : DEFAULT_DARK_GROUND;
    const w = A.maxX - A.minX;
    if (w <= 0) return;

    const H = 45;                         // 플레이어 높이(90)의 절반
    const now = state.mathNow;
    const hold = alpha > 0.2 ? 1 : (alpha / 0.2);

    ctx.save();
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
// 💥 파공아 — 하얗게 대기가 갈라지고 화면이 깨진다 (판정이 커진 만큼 크게)
// ============================================================================
registerVisualFX('gura_impact', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const R = fx.radius || 283;                 // 서버에서 전달된 실제 판정 반경
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

    // 실제 판정 범위를 알려주는 충격 링
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 18 * alpha + 4;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.55 + prog * 0.5), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(190, 90, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 8 * alpha + 2;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // 하얗게 갈라진 대기 (정돈된 6갈래)
    drawAirCrack(ctx, fx.x, fx.y, scale * (0.5 + prog * 0.7), prog * 3.1, alpha, now, 6);
});

// ============================================================================
// 🌀 어둠 소용돌이 상승 — 검은수염이 일렁이는 어둠으로 변해 하늘로 솟구친다 (2초)
// ============================================================================
registerVisualFX('dark_rise', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const fromY = (fx.y2 !== undefined) ? fx.y2 : fx.y;   // 출발 Y
    const toY = (fx.radius !== undefined) ? fx.radius : fx.y;   // 도착 Y (radius 필드 재사용)
    const t = 1 - alpha;                        // 0 → 1
    const ease = t * t * (3 - 2 * t);
    const cy = fromY + (toY - fromY) * ease;
    const cx = fx.x;

    const R = 110 * (1 - ease * 0.25);

    ctx.save();
    ctx.translate(cx, cy);

    // ── 솟구치는 어둠 기둥 (지나온 자리)
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

    // ── 소용돌이 본체 (검은 심연)
    ctx.fillStyle = "rgba(3, 0, 8, 0.97)";
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.85, R * 1.1, 0, 0, Math.PI * 2); ctx.fill();

    // ── 회전하는 보랏빛 소용돌이 팔
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

    // ── 중심 코어
    ctx.globalCompositeOperation = "screen";
    let core = ctx.createRadialGradient(0, 0, 4, 0, 0, R * 1.1);
    core.addColorStop(0, "rgba(235, 205, 255, 0.9)");
    core.addColorStop(0.35, "rgba(140, 45, 235, 0.5)");
    core.addColorStop(1, "rgba(30, 0, 60, 0)");
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.1, 0, Math.PI * 2); ctx.fill();

    // ── 위로 빨려 올라가는 입자
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
//    ✅ [재작업] 난잡한 요소(무작위 파편 · 3중 균열 · 22개 재입자)를 제거하고
//       ① 중앙의 큰 대기 균열  ② 좌우 대칭 번개 부채꼴  ③ 아래 충격 파문
//       세 요소가 서로 조화를 이루도록 정돈했다.
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

    // ── ① 공간을 짓누르는 은은한 암막 (기존보다 옅게)
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(6, 0, 14, ${0.34 * hold})`;
    ctx.fillRect(A.minX, A.minY - 1400, w, (G + 200) - (A.minY - 1400));

    // ── ② 검은수염 아래로 내리쏟는 빛기둥 (부드러운 단일 기둥)
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

    // ── ③ 좌우 대칭 번개 부채꼴 (7가닥 · 고정 각도 → 어지럽지 않다)
    const BOLTS = 7;
    const fall = Math.max(360, G - cy);
    ctx.save();
    ctx.translate(cx, cy);
    for (let b = 0; b < BOLTS; b++) {
        // 아래 방향 부채꼴 (좌우 대칭)
        let spread = (b / (BOLTS - 1)) - 0.5;          // -0.5 ~ 0.5
        let ang = Math.PI / 2 + spread * (Math.PI * 0.62);
        // 각 가닥이 시간차를 두고 밝아진다 (동시에 번쩍이지 않게)
        let phase = ((now / 620) + b * 0.14) % 1;
        let glow = 0.45 + (1 - Math.abs(phase - 0.5) * 2) * 0.55;
        let len = fall * (0.82 + Math.abs(Math.sin(b * 1.3 + now / 480)) * 0.2);
        drawBoltPath(ctx, ang, len, 1.0, hold * glow, now, b * 2.7);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // ── ④ 중앙의 큰 대기 균열 (하나만 · 천천히 회전)
    drawAirCrack(ctx, cx, cy + 60, 1.6, now / 900, hold * 0.95, now, 6);

    // ── ⑤ 검은수염을 감싸는 검붉은 오라 (맥동)
    ctx.globalCompositeOperation = "screen";
    let pulse = 1 + Math.sin(now / 130) * 0.12;
    let aura = ctx.createRadialGradient(cx, cy, 40, cx, cy, 400 * pulse);
    aura.addColorStop(0, `rgba(255, 255, 255, ${0.8 * hold})`);
    aura.addColorStop(0.28, `rgba(255, 70, 70, ${0.45 * hold})`);
    aura.addColorStop(0.62, `rgba(90, 0, 40, ${0.28 * hold})`);
    aura.addColorStop(1, "rgba(16, 0, 12, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(cx, cy, 400 * pulse, 0, Math.PI * 2); ctx.fill();

    // ── ⑥ 바닥에 퍼지는 충격 파문 (2겹 · 규칙적)
    let ringT = ((now / 700) % 1);
    ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - ringT) * hold * 0.9})`;
    ctx.lineWidth = 18 * (1 - ringT) + 3;
    ctx.beginPath(); ctx.ellipse(cx, G, w * 0.5 * ringT, 78 * ringT, 0, 0, Math.PI * 2); ctx.stroke();

    let ringT2 = ((now / 700) + 0.5) % 1;
    ctx.strokeStyle = `rgba(190, 90, 255, ${(1 - ringT2) * hold * 0.7})`;
    ctx.lineWidth = 12 * (1 - ringT2) + 2;
    ctx.beginPath(); ctx.ellipse(cx, G, w * 0.5 * ringT2, 78 * ringT2, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";

    // ── ⑦ 조용히 흩날리는 재 (개수를 크게 줄여 시야를 가리지 않는다)
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