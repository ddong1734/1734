// 파일명: renderer/fxblackbeard.js
// ============================================================================
// ⚫ 검은수염 (암흑 왕좌 보스) 전용 이펙트 모음
// ----------------------------------------------------------------------------
//  · dark_floor        : 맵 바닥 전체를 휘몰아치며 일렁이는 암흑물질 (높이 = 플레이어 절반)
//  · crows_telegraph   : 크로우즈 시전 1초 전 빨간색 조준 표시
//  · crows_beam        : 크로우즈 — 검은 촉수 다발이 길게 뻗어 대상을 끌어온다 (업로드 사진 참고)
//  · crows_trail       : 끌려오는 플레이어의 암흑 잔상
//  · gura_impact       : 파공아 — 하얗게 대기가 갈라지고 화면이 깨진다
//  · dark_descent      : 공중 강림 — 큰 파공아 + 하얀 번개에 검붉은 전기가 감도는 강림 이펙트
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

const DEFAULT_DARK_AREA = { minX: 22000, maxX: 27000, minY: -5200, maxY: -3940 };
const DEFAULT_DARK_GROUND = -4000;

// ── 공통 : 하얗게 갈라진 '대기의 균열' 그리기 ────────────────────────────────
function drawAirCrack(ctx, cx, cy, scale, seedBase, alpha, mathNow) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const ARMS = 9;
    for (let a = 0; a < ARMS; a++) {
        const ang = (Math.PI * 2 / ARMS) * a + seedBase * 0.7;
        const len = (300 + (a % 3) * 130) * scale;

        // 균열의 '두꺼운 검은 테두리'
        ctx.strokeStyle = `rgba(10, 0, 18, ${0.9 * alpha})`;
        ctx.lineWidth = 22 * scale;
        ctx.beginPath();
        let px = 0, py = 0;
        ctx.moveTo(0, 0);
        for (let s = 1; s <= 5; s++) {
            let t = s / 5;
            let jitter = Math.sin(a * 3.1 + s * 2.4 + seedBase) * 46 * scale;
            px = Math.cos(ang) * len * t + Math.cos(ang + Math.PI / 2) * jitter;
            py = Math.sin(ang) * len * t + Math.sin(ang + Math.PI / 2) * jitter;
            ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 균열 안쪽의 '하얗게 갈라진 대기'
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.98 * alpha})`;
        ctx.lineWidth = 9 * scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let s = 1; s <= 5; s++) {
            let t = s / 5;
            let jitter = Math.sin(a * 3.1 + s * 2.4 + seedBase) * 46 * scale;
            let xx = Math.cos(ang) * len * t + Math.cos(ang + Math.PI / 2) * jitter;
            let yy = Math.sin(ang) * len * t + Math.sin(ang + Math.PI / 2) * jitter;
            ctx.lineTo(xx, yy);
        }
        ctx.stroke();
    }

    // 중심에서 튀는 파편 (화면이 깨지는 느낌)
    for (let f = 0; f < 14; f++) {
        let fa = (Math.PI * 2 / 14) * f + seedBase;
        let fr = (120 + ((f * 71 + seedBase * 90) % 320)) * scale;
        ctx.save();
        ctx.translate(Math.cos(fa) * fr, Math.sin(fa) * fr);
        ctx.rotate(fa + mathNow / 400);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, -18 * scale);
        ctx.lineTo(13 * scale, 0);
        ctx.lineTo(0, 20 * scale);
        ctx.lineTo(-11 * scale, 2 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(10, 0, 18, ${0.8 * alpha})`;
        ctx.lineWidth = 3 * scale;
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

// ── 공통 : 하얀 번개 + 검붉은 전기가 감도는 다발 ────────────────────────────
function drawWhiteRedBolts(ctx, cx, cy, count, len, scale, alpha, mathNow, downward) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let b = 0; b < count; b++) {
        let baseAng = downward
            ? (Math.PI * 0.15 + (Math.PI * 0.7) * (b / Math.max(1, count - 1)))   // 아래쪽 부채꼴
            : ((Math.PI * 2 / count) * b + mathNow / 900);
        let L = len * (0.7 + Math.abs(Math.sin(b * 2.1 + mathNow / 130)) * 0.4);

        const SEG = 9;
        const px = -Math.sin(baseAng), py = Math.cos(baseAng);
        let pts = [];
        for (let q = 0; q <= SEG; q++) {
            let t = q / SEG;
            let jitter = (q === 0 || q === SEG) ? 0 : (Math.random() - 0.5) * 0.26;
            let ang = baseAng + jitter * (1 - t * 0.5);
            pts.push({ x: Math.cos(ang) * L * t, y: Math.sin(ang) * L * t, t: t });
        }

        // 붉은 글로우
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "rgba(255, 45, 45, 0.9)";
        ctx.lineWidth = 16 * scale;
        ctx.beginPath();
        for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
        ctx.stroke();

        // 검붉은 전기가 감아 돈다 (source-over 여야 검정이 보인다)
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = alpha;
        for (let c = 0; c < 2; c++) {
            ctx.strokeStyle = c === 0 ? "rgba(0, 0, 0, 0.95)" : "rgba(120, 0, 20, 0.9)";
            ctx.lineWidth = (8 - c * 3) * scale;
            ctx.beginPath();
            for (let q = 0; q <= SEG; q++) {
                let p = pts[q];
                let coil = Math.sin(p.t * Math.PI * 5 + mathNow / 55 + c * Math.PI) * (16 + p.t * 32) * scale;
                let xx = p.x + px * coil, yy = p.y + py * coil;
                if (q === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
        }

        // 하얀 심지
        ctx.strokeStyle = "rgba(255, 255, 255, 0.98)";
        ctx.lineWidth = 5.5 * scale;
        ctx.beginPath();
        for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
}

// ============================================================================
// 🌊 암흑물질 장판 — 맵 바닥 전체를 휘몰아치며 일렁인다 (높이 = 플레이어 절반 = 45)
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
    // 바구니 밖으로는 절대 새어나가지 않는다
    ctx.beginPath();
    ctx.rect(A.minX, G - H - 60, w, H + 80);
    ctx.clip();

    // 바닥을 덮는 암흑 본체
    let base = ctx.createLinearGradient(0, G - H, 0, G);
    base.addColorStop(0, `rgba(60, 0, 100, ${0.55 * hold})`);
    base.addColorStop(0.45, `rgba(20, 0, 40, ${0.9 * hold})`);
    base.addColorStop(1, `rgba(4, 0, 10, ${0.98 * hold})`);
    ctx.fillStyle = base;
    ctx.fillRect(A.minX, G - H, w, H);

    // 휘몰아치는 표면 파도 (3겹)
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

    // 표면에서 솟구치는 검보라 촉수
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

    // 흩날리는 보랏빛 입자
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
        // 붉은 조준 띠
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = alpha * blink;
        let g = ctx.createLinearGradient(0, -half, 0, half);
        g.addColorStop(0, "rgba(255, 0, 0, 0)");
        g.addColorStop(0.5, "rgba(255, 30, 30, 0.65)");
        g.addColorStop(1, "rgba(255, 0, 0, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, -half, len, half * 2);
        ctx.globalCompositeOperation = "source-over";

        // 테두리 (점선)
        ctx.strokeStyle = `rgba(255, 45, 45, ${alpha * blink})`;
        ctx.lineWidth = 5;
        ctx.setLineDash([34, 22]);
        ctx.lineDashOffset = -now / 18;
        ctx.beginPath();
        ctx.moveTo(0, -half); ctx.lineTo(len, -half);
        ctx.moveTo(0, half);  ctx.lineTo(len, half);
        ctx.stroke();
        ctx.setLineDash([]);

        // 중심선
        ctx.strokeStyle = `rgba(255, 90, 90, ${alpha * blink})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

        // 끝단 표적
        ctx.strokeStyle = `rgba(255, 40, 40, ${alpha})`;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(len, 0, half * 0.9 * (1 + Math.sin(now / 110) * 0.12), 0, Math.PI * 2); ctx.stroke();
    });
});

// ============================================================================
// ⚫ 크로우즈 — 검은 촉수 다발이 길게 뻗어 대상을 끌어온다 (업로드 사진 참고)
//    사진처럼 '한쪽 끝에서 다발이 수렴하고 반대쪽으로 여러 가닥이 흩날리는' 형태
// ============================================================================
registerVisualFX('crows_beam', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    let sx = fx.x, sy = fx.y;
    let ex = (fx.x2 !== undefined) ? fx.x2 : fx.x;
    let ey = (fx.y2 !== undefined) ? fx.y2 : fx.y;

    // 끌려오는 대상이 있으면 그 위치를 실시간 추적한다
    if (fx.targetId) {
        let t = (fx.targetId === state.myId) ? state.myPlayer : state.players[fx.targetId];
        if (t) { ex = t.x; ey = t.y; }
    }
    // 시전자(검은수염)도 이동하면 따라간다
    const bb = state.blackbeard;
    if (bb && bb.hp > 0) { sx = bb.x; sy = bb.y; }

    let ang = Math.atan2(ey - sy, ex - sx);
    let len = Math.hypot(ex - sx, ey - sy);
    if (len < 1) return;

    RenderUtils.withRotation(ctx, sx, sy, ang, () => {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = Math.min(1, alpha * 1.6);

        // ── 보랏빛 후광 (screen)
        ctx.globalCompositeOperation = "screen";
        let aura = ctx.createLinearGradient(0, -80, 0, 80);
        aura.addColorStop(0, "rgba(120, 20, 200, 0)");
        aura.addColorStop(0.5, "rgba(150, 45, 240, 0.42)");
        aura.addColorStop(1, "rgba(120, 20, 200, 0)");
        ctx.fillStyle = aura;
        ctx.fillRect(0, -80, len, 160);
        ctx.globalCompositeOperation = "source-over";

        // ── 검은 촉수 다발 (사진의 핵심 : 여러 가닥이 흩날린다)
        const STRANDS = 22;
        for (let s = 0; s < STRANDS; s++) {
            // 끝(수렴점)에서의 각도 분산 — 앞쪽은 모이고 뒤쪽은 퍼진다
            let spread = ((s / (STRANDS - 1)) - 0.5) * 2;      // -1 ~ 1
            let wob = Math.sin(s * 1.9 + now / 190) * 0.35;
            let tipY = spread * 26;                            // 검은수염 쪽 수렴
            let midY = spread * (120 + Math.abs(spread) * 90) + wob * 60;
            let endY = spread * (34 + Math.abs(spread) * 22);  // 대상 쪽 수렴

            let sl = 0.55 + Math.abs(Math.sin(s * 2.7 + now / 240)) * 0.45;
            let thick = 3 + (1 - Math.abs(spread)) * 8;

            ctx.strokeStyle = `rgba(6, 0, 12, ${0.92 * sl})`;
            ctx.lineWidth = thick;
            ctx.beginPath();
            ctx.moveTo(0, tipY);
            ctx.bezierCurveTo(len * 0.28, midY, len * 0.68, midY * 0.55, len, endY);
            ctx.stroke();

            // 촉수 위를 흐르는 보랏빛 광택
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

        // ── 뒤로 흩날리는 짧은 잔가닥 (사진의 흐르는 선들)
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

        // ── 시전자 쪽 수렴부 (사진의 뭉친 검은 덩어리)
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

        // ── 대상 쪽 포박 고리 (사진 오른쪽의 둥근 형태)
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
    const R = fx.radius || 113;                 // 검은수염 크기의 1.2배가 서버에서 전달된다
    const scale = R / 110;
    const prog = 1 - alpha;

    ctx.save();
    ctx.translate(fx.x, fx.y);

    // 충격 구체
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    let g = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R * (1 + prog * 1.5));
    g.addColorStop(0, "rgba(255, 255, 255, 1)");
    g.addColorStop(0.4, "rgba(230, 220, 255, 0.75)");
    g.addColorStop(1, "rgba(120, 40, 200, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R * (1 + prog * 1.5), 0, Math.PI * 2); ctx.fill();

    // 퍼지는 충격 링
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 16 * scale * alpha + 3;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.7 + prog * 1.8), 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // 하얗게 갈라진 대기 + 깨지는 화면
    drawAirCrack(ctx, fx.x, fx.y, scale * (0.6 + prog * 0.9), prog * 6.28, alpha, now);
});

// ============================================================================
// 🌑 공중 강림 — 5초간 공중에서 큰 파공아 + 하얀번개/검붉은전기를 아래로 쏟아낸다
// ============================================================================
registerVisualFX('dark_descent', (ctx, fx, alpha, state) => {
    const A = fx.area || (typeof window !== 'undefined' && window.DARK_AREA) || DEFAULT_DARK_AREA;
    const G = (typeof window !== 'undefined' && window.DARK_GROUND !== undefined) ? window.DARK_GROUND : DEFAULT_DARK_GROUND;
    const now = state.mathNow;
    const w = A.maxX - A.minX;
    const hold = alpha > 0.15 ? 1 : (alpha / 0.15);

    // 시전 중인 검은수염을 따라간다
    let cx = fx.x, cy = fx.y;
    const bb = state.blackbeard;
    if (bb && bb.hp > 0) { cx = bb.x; cy = bb.y; }

    ctx.save();
    // 공간 밖으로 새지 않게 클립
    ctx.beginPath();
    ctx.rect(A.minX, A.minY - 1400, w, (G + 200) - (A.minY - 1400));
    ctx.clip();

    // ── 1) 공간을 짓누르는 암막
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(6, 0, 14, ${0.5 * hold})`;
    ctx.fillRect(A.minX, A.minY - 1400, w, (G + 200) - (A.minY - 1400));

    // ── 2) 검은수염 아래로 쏟아지는 거대한 빛기둥
    ctx.globalCompositeOperation = "screen";
    let col = ctx.createLinearGradient(0, cy, 0, G);
    col.addColorStop(0, `rgba(255, 255, 255, ${0.55 * hold})`);
    col.addColorStop(0.4, `rgba(200, 90, 255, ${0.3 * hold})`);
    col.addColorStop(1, `rgba(80, 0, 140, 0)`);
    ctx.fillStyle = col;
    ctx.fillRect(cx - 420, cy, 840, G - cy);
    ctx.globalCompositeOperation = "source-over";

    // ── 3) 하얀 번개 + 검붉은 전기 (아래 방향 부채꼴)
    drawWhiteRedBolts(ctx, cx, cy, 11, Math.max(400, G - cy), 1.25, hold, now, true);

    // ── 4) 큰 파공아 — 하얗게 갈라진 대기가 계속 터진다
    let burst = Math.floor((now / 420) % 3);
    for (let k = 0; k < 3; k++) {
        let ka = (k === burst) ? hold : hold * 0.4;
        let kx = cx + Math.sin(k * 2.4 + now / 700) * 260;
        let ky = cy + 160 + k * 180;
        drawAirCrack(ctx, kx, ky, 1.5 + k * 0.35, k * 2.1 + now / 500, ka, now);
    }

    // ── 5) 검은수염 주위 압도적인 검붉은 오라
    ctx.globalCompositeOperation = "screen";
    let pulse = 1 + Math.sin(now / 90) * 0.18;
    let aura = ctx.createRadialGradient(cx, cy, 40, cx, cy, 460 * pulse);
    aura.addColorStop(0, `rgba(255, 255, 255, ${0.85 * hold})`);
    aura.addColorStop(0.25, `rgba(255, 60, 60, ${0.55 * hold})`);
    aura.addColorStop(0.6, `rgba(110, 0, 30, ${0.35 * hold})`);
    aura.addColorStop(1, "rgba(20, 0, 10, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(cx, cy, 460 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // ── 6) 바닥에 내리꽂히는 충격 파문
    let ringT = ((now / 500) % 1);
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - ringT) * hold})`;
    ctx.lineWidth = 22 * (1 - ringT) + 4;
    ctx.beginPath(); ctx.ellipse(cx, G, w * 0.5 * ringT, 90 * ringT, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(190, 80, 255, ${(1 - ringT) * hold * 0.8})`;
    ctx.lineWidth = 10 * (1 - ringT) + 2;
    ctx.beginPath(); ctx.ellipse(cx, G, w * 0.62 * ringT, 110 * ringT, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";

    // ── 7) 흩날리는 검붉은 재
    for (let s = 0; s < 22; s++) {
        let sp = ((now / 800) + s * 0.045) % 1;
        let sa = s * 2.4 + now / 1100;
        let sr = sp * 620;
        ctx.globalAlpha = (1 - sp) * hold;
        if (s % 2 === 0) {
            ctx.globalCompositeOperation = "screen";
            ctx.fillStyle = "rgba(255, 70, 70, 0.9)";
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        }
        ctx.beginPath();
        ctx.arc(cx + Math.cos(sa) * sr, cy + Math.sin(sa) * sr * 0.8, (8 - sp * 5) + 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    ctx.restore();
});