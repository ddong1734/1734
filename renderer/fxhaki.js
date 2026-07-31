// 파일명: renderer/fxhaki.js
// ============================================================================
// 🥊 패왕색 패기 (박힌범 전용)
// ----------------------------------------------------------------------------
//  ✅ [변경] 자주색 계열을 전부 제거하고 붉은색으로 통일
//  ✅ [변경] 번개는 '하얀 심지' + 그 주위를 감아 도는 '검은 전기' 구조로 재작성
//     → 검정은 screen 합성에서 보이지 않으므로 반드시 source-over 로 그린다
//  · 붉은 파동이 전방위로 계속 퍼져나간다
//  · ⛓️ ctx.clip() 으로 바구니 사각형 안쪽만 그린다 → 바깥으로는 픽셀 하나도 못 나간다
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';

const DEFAULT_AREA = { minX: 13400, maxX: 18600, minY: -2400, maxY: -1340 };

// 그라디언트 캐시 — 로컬 좌표(0,0) 기준이므로 위치가 달라도 재사용 안전
const _grad = new Map();
function radial(ctx, key, r0, r1, stops) {
    let g = _grad.get(key);
    if (g) return g;
    g = ctx.createRadialGradient(0, 0, r0, 0, 0, r1);
    for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    _grad.set(key, g);
    return g;
}
if (typeof window !== 'undefined') {
    const prev = window.clearFxGradientCache;
    window.clearFxGradientCache = () => { _grad.clear(); if (prev) prev(); };
}

registerVisualFX('haki_burst', (ctx, fx, alpha, state) => {
    const A = fx.area || window.HINBEOM_AREA || DEFAULT_AREA;
    const aw = A.maxX - A.minX;
    const ah = A.maxY - A.minY;
    if (aw <= 0 || ah <= 0) return;

    // 4초 내내 최대 강도를 유지하고 마지막 25% 구간에서만 사그라든다
    const hold  = alpha > 0.25 ? 1 : (alpha / 0.25);
    const prog  = 1 - alpha;                  // 0 → 1
    const now   = state.mathNow;
    const flick = 0.78 + Math.random() * 0.22;

    // 방출 중심 (박힌범이 이동하면 그 위치를 따라간다)
    const h = state.hinbeom;
    const cx = (h && h.hp > 0) ? h.x : fx.x;
    const cy = (h && h.hp > 0) ? h.y : fx.y;

    const maxR = Math.hypot(aw, ah) * 0.62;   // 바구니 전체를 덮는 반경

    ctx.save();

    // ⛓️ 바구니 밖은 절대 그리지 않는다
    ctx.beginPath();
    ctx.rect(A.minX, A.minY, aw, ah);
    ctx.clip();

    // ── 1) 공간을 짓누르는 검붉은 암막 ─────────────────────────────────────
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(16, 0, 0, ${0.55 * hold})`;
    ctx.fillRect(A.minX, A.minY, aw, ah);

    ctx.translate(cx, cy);

    // ── 2) 중심 오라 (흰 코어 → 진홍 → 암적 → 소멸) ────────────────────────
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = hold * (0.85 + Math.sin(now / 90) * 0.15);
    ctx.fillStyle = radial(ctx, 'hakiAuraR|' + Math.round(maxR), maxR * 0.02, maxR, [
        [0,    'rgba(255, 245, 245, 0.95)'],
        [0.12, 'rgba(255, 60, 50, 0.85)'],
        [0.34, 'rgba(190, 10, 10, 0.55)'],
        [0.62, 'rgba(90, 0, 0, 0.34)'],
        [1,    'rgba(40, 0, 0, 0)']
    ]);
    ctx.beginPath(); ctx.arc(0, 0, maxR, 0, Math.PI * 2); ctx.fill();

    // ── 3) 붉은 파동 (전방위로 계속 퍼져나감) ──────────────────────────────
    const RING_COUNT = 5;
    const RING_SPEED = 0.55;                  // 초당 몇 바퀴 퍼지는가
    ctx.lineCap = 'round';
    for (let r = 0; r < RING_COUNT; r++) {
        let phase = ((now / 1000) * RING_SPEED + r / RING_COUNT) % 1;
        let rr = phase * maxR * 1.05;
        if (rr < 20) continue;
        let ringA = (1 - phase) * hold;
        ctx.globalAlpha = ringA * 0.9;
        ctx.strokeStyle = (r % 2 === 0)
            ? `rgba(255, 45, 45, ${0.92 * flick})`
            : `rgba(200, 0, 25, ${0.82 * flick})`;
        ctx.lineWidth = (26 - phase * 18) * (1 + (r % 2) * 0.3);
        ctx.beginPath();
        ctx.ellipse(0, 0, rr, rr * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 파동 안쪽의 흰 심지
        ctx.globalAlpha = ringA * 0.6;
        ctx.strokeStyle = 'rgba(255, 240, 240, 1)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, rr, rr * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── 4) 번개 : 하얀 심지 + 그 주위를 감아 도는 검은 전기 ────────────────
    const BOLTS = 14;
    const SEG = 10;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let b = 0; b < BOLTS; b++) {
        const baseAng = (Math.PI * 2 / BOLTS) * b + now / 900 + prog * 0.6;
        const len = maxR * (0.72 + Math.abs(Math.sin(b * 2.1 + now / 130)) * 0.34);

        // 번개 뼈대 좌표 미리 계산 (검은 전기와 하얀 심지가 같은 경로를 공유해야 한다)
        const px = -Math.sin(baseAng), py = Math.cos(baseAng);   // 진행 방향의 수직 벡터
        const pts = [];
        for (let q = 0; q <= SEG; q++) {
            const t = q / SEG;
            const jitter = (q === 0 || q === SEG) ? 0 : (Math.random() - 0.5) * 0.30;
            const ang = baseAng + jitter * (1 - t * 0.5);
            const rr = t * len;
            pts.push({ x: Math.cos(ang) * rr, y: Math.sin(ang) * rr * 0.78, t: t });
        }

        // ④-1 붉은 글로우 (screen)
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = hold;
        ctx.strokeStyle = `rgba(255, 40, 40, ${0.9 * flick})`;
        ctx.lineWidth = 15;
        ctx.beginPath();
        for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
        ctx.stroke();

        // ④-2 검은 전기가 하얀 번개를 감아 돈다 (source-over — screen 에서는 검정이 안 보인다)
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = hold;
        ctx.strokeStyle = `rgba(0, 0, 0, ${0.95 * flick})`;
        for (let c = 0; c < 2; c++) {                       // 두 가닥이 반대 위상으로 꼬인다
            ctx.lineWidth = 8 - c * 2.5;
            ctx.beginPath();
            for (let q = 0; q <= SEG; q++) {
                const p = pts[q];
                const coil = Math.sin(p.t * Math.PI * 5 + now / 55 + c * Math.PI) * (16 + p.t * 30);
                const xx = p.x + px * coil;
                const yy = p.y + py * coil * 0.78;
                if (q === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
        }

        // ④-3 하얀 번개 심지
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.98 * flick})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
        ctx.stroke();
    }

    // ── 5) 중심 코어 ───────────────────────────────────────────────────────
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = hold;
    ctx.fillStyle = radial(ctx, 'hakiCoreR', 2, 130, [
        [0,   'rgba(255, 255, 255, 1)'],
        [0.3, 'rgba(255, 110, 100, 0.9)'],
        [0.7, 'rgba(210, 0, 20, 0.5)'],
        [1,   'rgba(110, 0, 0, 0)']
    ]);
    ctx.beginPath(); ctx.arc(0, 0, 130 * (1 + Math.sin(now / 70) * 0.12), 0, Math.PI * 2); ctx.fill();

    // ── 6) 흩날리는 검붉은 입자 ────────────────────────────────────────────
    for (let s = 0; s < 18; s++) {
        let sp = ((now / 700) + s * 0.11) % 1;
        let sa = s * 2.4 + now / 1100;
        let sr = sp * maxR;
        ctx.globalAlpha = (1 - sp) * hold;
        // 짝수는 붉은 입자(screen), 홀수는 검은 재(source-over)
        if (s % 2 === 0) {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = 'rgba(255, 60, 60, 0.9)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        }
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.78, (7 - sp * 5) + 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
});

// 🐗 할배새끼 소환 시 바닥에서 솟구치는 붉은 기운
registerVisualFX('minion_spawn', (ctx, fx, alpha) => {
    const r = 1 - alpha;
    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    const R = 150 * r + 30;
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, R);
    g.addColorStop(0, 'rgba(255, 230, 230, 0.95)');
    g.addColorStop(0.35, 'rgba(255, 50, 50, 0.75)');
    g.addColorStop(1, 'rgba(120, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.6, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = `rgba(255, 70, 70, ${alpha})`;
    ctx.lineWidth = 8 * alpha + 2; ctx.lineCap = 'round';
    for (let s = 0; s < 8; s++) {
        const a2 = (Math.PI * 2 / 8) * s + r * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a2) * 20, Math.sin(a2) * 12);
        ctx.lineTo(Math.cos(a2) * R * 0.9, Math.sin(a2) * R * 0.55);
        ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
    ctx.lineWidth = 4;
    for (let s = 0; s < 5; s++) {
        const a3 = (Math.PI * 2 / 5) * s - r * 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a3) * 25, Math.sin(a3) * 15);
        ctx.lineTo(Math.cos(a3) * R * 0.7, Math.sin(a3) * R * 0.45);
        ctx.stroke();
    }
    ctx.restore();
});
