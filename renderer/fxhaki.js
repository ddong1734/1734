// 파일명: renderer/fxhaki.js
// ============================================================================
// 🥊 패왕색 패기 (박힌범 전용)
// ----------------------------------------------------------------------------
//  · 검붉은 전기가 박힌범 중심에서 사방으로 뻗어나가고
//  · 붉은 파동이 전방위로 계속 퍼져나간다
//  · ⛓️ ctx.clip() 으로 바구니 사각형 안쪽만 그린다 → 바깥으로는 픽셀 하나도 못 나간다
//    (서버의 판정도 isInHinbeomArea 로 동일하게 막혀 있다)
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
    const flick = 0.75 + Math.random() * 0.25;

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

    // ── 1) 공간을 짓누르는 암막 ────────────────────────────────────────────
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(14, 0, 10, ${0.52 * hold})`;
    ctx.fillRect(A.minX, A.minY, aw, ah);

    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'screen';

    // ── 2) 중심 오라 (검붉은 → 자주 → 소멸) ────────────────────────────────
    ctx.globalAlpha = hold * (0.85 + Math.sin(now / 90) * 0.15);
    ctx.fillStyle = radial(ctx, 'hakiAura|' + Math.round(maxR), maxR * 0.02, maxR, [
        [0,    'rgba(255, 235, 240, 0.95)'],
        [0.12, 'rgba(255, 70, 110, 0.80)'],
        [0.34, 'rgba(150, 10, 60, 0.55)'],
        [0.62, 'rgba(70, 0, 60, 0.32)'],
        [1,    'rgba(30, 0, 30, 0)']
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
            ? `rgba(255, 40, 80, ${0.9 * flick})`
            : `rgba(190, 0, 70, ${0.8 * flick})`;
        ctx.lineWidth = (26 - phase * 18) * (1 + (r % 2) * 0.3);
        ctx.beginPath();
        ctx.ellipse(0, 0, rr, rr * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 파동 안쪽의 흰 심지
        ctx.globalAlpha = ringA * 0.55;
        ctx.strokeStyle = 'rgba(255, 220, 235, 1)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, rr, rr * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── 4) 검붉은 전기 — 중심에서 사방으로 뻗는 지그재그 ───────────────────
    const BOLTS = 14;
    ctx.lineJoin = 'round';
    for (let pass = 0; pass < 3; pass++) {
        // pass 0 = 두꺼운 암적색 / 1 = 진홍 / 2 = 흰 코어
        if (pass === 0)      { ctx.strokeStyle = `rgba(90, 0, 40, ${0.95 * hold})`;    ctx.lineWidth = 16; }
        else if (pass === 1) { ctx.strokeStyle = `rgba(230, 20, 70, ${0.95 * hold * flick})`; ctx.lineWidth = 8; }
        else                 { ctx.strokeStyle = `rgba(255, 225, 235, ${0.95 * hold * flick})`; ctx.lineWidth = 3; }
        ctx.globalAlpha = 1;

        for (let b = 0; b < BOLTS; b++) {
            let baseAng = (Math.PI * 2 / BOLTS) * b + now / 900 + prog * 0.6;
            let len = maxR * (0.72 + Math.abs(Math.sin(b * 2.1 + now / 130)) * 0.34);
            ctx.beginPath();
            for (let q = 0; q <= 8; q++) {
                let t = q / 8;
                let jitter = (q === 0 || q === 8) ? 0 : (Math.random() - 0.5) * 0.34;
                let ang = baseAng + jitter * (1 - t * 0.5);
                let rr = t * len;
                let px = Math.cos(ang) * rr;
                let py = Math.sin(ang) * rr * 0.78;
                if (q === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
    }

    // ── 5) 중심 코어 ───────────────────────────────────────────────────────
    ctx.globalAlpha = hold;
    ctx.fillStyle = radial(ctx, 'hakiCore', 2, 130, [
        [0,   'rgba(255, 255, 255, 1)'],
        [0.3, 'rgba(255, 120, 160, 0.9)'],
        [0.7, 'rgba(180, 0, 60, 0.5)'],
        [1,   'rgba(90, 0, 40, 0)']
    ]);
    ctx.beginPath(); ctx.arc(0, 0, 130 * (1 + Math.sin(now / 70) * 0.12), 0, Math.PI * 2); ctx.fill();

    // ── 6) 흩날리는 검붉은 입자 ────────────────────────────────────────────
    ctx.fillStyle = `rgba(255, 60, 100, ${0.85 * hold})`;
    for (let s = 0; s < 18; s++) {
        let sp = ((now / 700) + s * 0.11) % 1;
        let sa = s * 2.4 + now / 1100;
        let sr = sp * maxR;
        ctx.globalAlpha = (1 - sp) * hold;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.78, (7 - sp * 5) + 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
});
