// 파일명: renderer/fxkashimo.js
// ============================================================================
// ⚡ 카시모 하지메 전용 이펙트 — 전부 보라색(#a855f7) 계열
//    ✅ 카시모의 모든 스킬은 화면 흔들림을 발생시키지 않는다 (network 쪽에서 처리)
//
//  · kashimo_strike       : 평타 타격
//  · kashimo_counter      : 반격 전류 (플레이어 · 오크라 추적)
//  · kashimo_bolt_cast    : 1번 스킬 시전 섬광 (🏵️ 여의 강화)
//  · kashimo_bolt_hit     : 번개 적중 전격
//  · kashimo_sky_bolt     : 대기를 가르는 번개 (관통)
//  · kashimo_surge        : ✅ [재작성] 주력 방출 — 까칠까칠하고 빠르고 강렬한 번개
//  · kashimo_amber_aura   : 환수호박 오라
//  · kashimo_amber_trail  : ✅ 환수호박 '돌진 중'에만 남는 전기 잔상
//  · kashimo_amber_dash   : ✅ [신규] 전격 돌진 궤적 (출발↔도착 전류)
//  · kashimo_wave_blast   : 전자파 연쇄 폭발
//  · kashimo_wave_echo    : 뇌신 재폭발
//  · kashimo_sonic_charge / kashimo_sonic : 음파
//  · (투사체) kashimo_bolt : 🏵️ 여의 / 🌩️ 음파 번개(longBolt) 길이 반영
// ============================================================================

import { registerVisualFX, registerProjectile } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

// 🟣 공통 색상
const K_MAIN = 'rgba(196, 132, 252, 1)';   // 밝은 보라
const K_GLOW = 'rgba(168, 85, 247, ';      // 알파를 이어 붙여 쓴다

/** ⚡ 지그재그 번개 한 가닥. (0,0) → +x 방향 */
function drawBoltLine(ctx, length, amp, seed, mathNow, widths, colors) {
    const SEG = 9;
    const pts = [];
    for (let i = 0; i <= SEG; i++) {
        let t = i / SEG;
        let jitter = (i === 0 || i === SEG) ? 0
                   : Math.sin(t * 11 + seed + mathNow / 45) * amp
                   + (Math.random() - 0.5) * amp * 0.55;
        pts.push({ x: t * length, y: jitter });
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let w = 0; w < widths.length; w++) {
        ctx.strokeStyle = colors[w];
        ctx.lineWidth = widths[w];
        ctx.beginPath();
        for (let i = 0; i <= SEG; i++) {
            if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
            else ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
    }
    return pts;
}

/**
 * ⚡🌋 [신규] '까칠까칠한' 각진 번개 한 가닥.
 *    부드러운 sin 곡선 대신, 매 마디마다 크게 꺾이는 날카로운 지그재그를 그린다.
 *    가지(branch)가 무작위로 튀어나와 훨씬 거칠고 강렬해 보인다.
 *
 *    (0,0) → (0,-length) 방향 (위로 솟구침)
 */
function drawJaggedBolt(ctx, length, amp, seed, mathNow, widths, colors, branchChance) {
    const SEG = 14;
    const pts = [];
    // 🎲 seed + 시간으로 흔들리는 의사난수 (매 프레임 미세하게 달라진다)
    const rnd = (i) => {
        let v = Math.sin((i * 12.9898 + seed * 78.233 + mathNow * 0.012)) * 43758.5453;
        return (v - Math.floor(v)) * 2 - 1;       // -1 ~ 1
    };

    for (let i = 0; i <= SEG; i++) {
        let t = i / SEG;
        // 끝단은 모아 주고, 중간은 크게 벌어진다
        let taper = Math.sin(t * Math.PI) * 0.7 + 0.3;
        let jitter = (i === 0) ? 0 : rnd(i) * amp * taper;
        // 지그재그를 강제로 좌우 교대시켜 '각진' 느낌을 만든다
        let zig = (i % 2 === 0) ? 1 : -1;
        pts.push({ x: jitter * 0.55 + zig * amp * 0.28 * taper, y: -t * length });
    }

    ctx.lineCap = 'butt';        // ✅ 둥근 끝 대신 각진 끝 → 까칠한 느낌
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 6;

    for (let w = 0; w < widths.length; w++) {
        ctx.strokeStyle = colors[w];
        ctx.lineWidth = widths[w];
        ctx.beginPath();
        for (let i = 0; i <= SEG; i++) {
            if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
            else ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
    }

    // ⚡ 가지치기 — 몸통에서 짧게 튀어나오는 곁가지
    const bc = (branchChance === undefined) ? 0.55 : branchChance;
    for (let i = 2; i < SEG - 1; i++) {
        if (Math.abs(rnd(i * 3.1)) > (1 - bc)) continue;
        let p0 = pts[i];
        let side = (rnd(i * 5.7) >= 0) ? 1 : -1;
        let bLen = length * (0.06 + Math.abs(rnd(i * 7.3)) * 0.12);
        let bx = p0.x + side * bLen * 0.85;
        let by = p0.y - bLen * 0.5;
        let mx = p0.x + side * bLen * 0.35;
        let my = p0.y - bLen * 0.12;

        ctx.strokeStyle = colors[colors.length - 1];
        ctx.lineWidth = Math.max(1.2, widths[widths.length - 1] * 0.7);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(mx, my);
        ctx.lineTo(bx, by);
        ctx.stroke();
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return pts;
}

/** ⚡ 중심에서 사방으로 튀는 짧은 전격 가지 */
function drawSparkBurst(ctx, radius, count, alpha, mathNow, seed) {
    ctx.lineCap = 'round';
    for (let s = 0; s < count; s++) {
        let ang = (Math.PI * 2 / count) * s + mathNow / 260 + seed;
        let len = radius * (0.55 + Math.abs(Math.sin(s * 2.1 + mathNow / 120)) * 0.45);
        let midAng = ang + (Math.random() - 0.5) * 0.5;

        ctx.strokeStyle = K_GLOW + (0.75 * alpha) + ')';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(midAng) * len * 0.55, Math.sin(midAng) * len * 0.55);
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(midAng) * len * 0.55, Math.sin(midAng) * len * 0.55);
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.stroke();
    }
}

/** 🎯 종류별 대상 좌표를 추적한다 */
function traceTarget(state, kind, id, fallbackX, fallbackY) {
    let tx = fallbackX, ty = fallbackY;
    if (!kind || kind === 'player') {
        let t = (id === state.myId) ? state.myPlayer : state.players[id];
        if (t) { tx = t.x; ty = t.y; }
    } else if (kind === 'monster') {
        if (state.monster) { tx = state.monster.x; ty = state.monster.y; }
    } else if (kind === 'hinbeom') {
        if (state.hinbeom) { tx = state.hinbeom.x; ty = state.hinbeom.y; }
    } else if (kind === 'blackbeard') {
        if (state.blackbeard) { tx = state.blackbeard.x; ty = state.blackbeard.y; }
    } else if (kind === 'burgess') {
        if (state.burgess) { tx = state.burgess.x; ty = state.burgess.y; }
    } else if (kind === 'minion') {
        let mn = (state.minions || []).find(m => m.id === id);
        if (mn) { tx = mn.x; ty = mn.y; }
    } else if (kind === 'okra') {
        let ok = (state.okras || []).find(o => o.id === id);
        if (ok) { tx = ok.x; ty = ok.y; }
    }
    return { x: tx, y: ty };
}

// ============================================================================
// ⚡ 평타 타격
// ============================================================================
registerVisualFX('kashimo_strike', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const dir = fx.isLeft ? -1 : 1;
    const prog = 1 - alpha;

    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.scale(dir, 1);
        ctx.translate(prog * 45, 0);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = alpha;

        let aura = ctx.createRadialGradient(0, 0, 6, 0, 0, 86);
        aura.addColorStop(0, 'rgba(245, 230, 255, 0.95)');
        aura.addColorStop(0.35, K_GLOW + '0.65)');
        aura.addColorStop(1, 'rgba(88, 20, 160, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(0, 0, 86, 0, Math.PI * 2); ctx.fill();

        let spray = ctx.createLinearGradient(0, 0, 105, 0);
        spray.addColorStop(0, K_GLOW + (0.9 * alpha) + ')');
        spray.addColorStop(0.6, K_GLOW + (0.45 * alpha) + ')');
        spray.addColorStop(1, 'rgba(110, 20, 190, 0)');
        ctx.fillStyle = spray;
        ctx.beginPath();
        ctx.moveTo(8, -30);
        ctx.quadraticCurveTo(70, -12, 108, 0);
        ctx.quadraticCurveTo(70, 12, 8, 30);
        ctx.closePath();
        ctx.fill();

        drawSparkBurst(ctx, 74, 7, alpha, now, prog * 2);

        ctx.globalCompositeOperation = 'source-over';
        let core = ctx.createRadialGradient(10, -4, 4, 14, 0, 26);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.4, '#e9d5ff');
        core.addColorStop(0.8, '#7e22ce');
        core.addColorStop(1, '#2e0850');
        ctx.globalAlpha = alpha;
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(14, 0, 24, 0, Math.PI * 2); ctx.fill();

        ctx.globalCompositeOperation = 'screen';
        for (let s = 0; s < 8; s++) {
            let a2 = (s / 8) * Math.PI * 2 + prog * 4;
            let rr = 24 + prog * 62;
            ctx.fillStyle = (s % 2 === 0) ? `rgba(233, 213, 255, ${alpha})` : K_GLOW + alpha + ')';
            ctx.beginPath();
            ctx.arc(14 + Math.cos(a2) * rr, Math.sin(a2) * rr, (6 - prog * 3.5) + 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    });
});

// ============================================================================
// 🔌 반격 전류
// ============================================================================
registerVisualFX('kashimo_counter', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    let pos = traceTarget(state, fx.targetKind, fx.targetId, fx.x, fx.y);
    const R = 56;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    let g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.5);
    g.addColorStop(0, K_GLOW + (0.45 * alpha) + ')');
    g.addColorStop(0.6, K_GLOW + (0.22 * alpha) + ')');
    g.addColorStop(1, 'rgba(80, 10, 150, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, Math.PI * 2); ctx.fill();

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let b = 0; b < 4; b++) {
        let baseAng = (Math.PI * 2 / 4) * b + now / 150;
        let len = R * (0.7 + Math.abs(Math.sin(b * 1.9 + now / 90)) * 0.5);
        ctx.save();
        ctx.rotate(baseAng);
        drawBoltLine(ctx, len, 9, b * 2.3, now, [6, 2],
            [K_GLOW + (0.85 * alpha) + ')', `rgba(255, 255, 255, ${0.95 * alpha})`]);
        ctx.restore();
    }

    for (let s = 0; s < 6; s++) {
        let sp = ((now / 180) + s * 0.166) % 1;
        let sa = s * 2.4 + now / 200;
        let sr = R * (0.4 + sp * 0.8);
        ctx.globalAlpha = alpha * (1 - sp) * 0.95;
        ctx.fillStyle = (s % 2 === 0) ? '#f3e8ff' : K_MAIN;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.9, 4 - sp * 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡ 1번 스킬 시전 섬광 (🏵️ 여의 장착 시 더 크고 밝다)
// ============================================================================
registerVisualFX('kashimo_bolt_cast', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const dir = (fx.dir === -1) ? -1 : 1;
    const prog = 1 - alpha;
    const yeoui = !!fx.yeoui;

    let cx = fx.x, cy = fx.y;
    if (fx.ownerId) {
        let o = (fx.ownerId === state.myId) ? state.myPlayer : state.players[fx.ownerId];
        if (o) { cx = o.x; cy = o.y; }
    }

    ctx.save();
    ctx.translate(cx + dir * 60, cy - 10);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    // 🏵️ 여의 : 섬광 반경 1.5배
    let R = (yeoui ? 105 : 70) + prog * (yeoui ? 75 : 50);
    let g = ctx.createRadialGradient(0, 0, 4, 0, 0, R);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.3, 'rgba(233, 213, 255, 0.9)');
    g.addColorStop(0.65, K_GLOW + '0.5)');
    g.addColorStop(1, 'rgba(90, 20, 160, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    drawSparkBurst(ctx, R * 0.9, yeoui ? 13 : 9, alpha, now, 1.3);

    ctx.strokeStyle = K_GLOW + (alpha * 0.85) + ')';
    ctx.lineWidth = 9 * alpha + 2;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.4 + prog * 0.7), 0, Math.PI * 2); ctx.stroke();

    // 🏵️ 여의 : 금빛 링을 하나 덧대 강화 상태를 알린다
    if (yeoui) {
        ctx.strokeStyle = `rgba(255, 236, 150, ${alpha * 0.8})`;
        ctx.lineWidth = 5 * alpha + 1;
        ctx.beginPath(); ctx.arc(0, 0, R * (0.62 + prog * 0.8), 0, Math.PI * 2); ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡ 번개 적중 전격
// ============================================================================
registerVisualFX('kashimo_bolt_hit', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    let R = 90 + prog * 80;
    let g = ctx.createRadialGradient(0, 0, 5, 0, 0, R);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.28, 'rgba(233, 213, 255, 0.85)');
    g.addColorStop(0.62, K_GLOW + '0.45)');
    g.addColorStop(1, 'rgba(80, 10, 150, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    drawSparkBurst(ctx, R * 0.95, 11, alpha, now, 0.4);

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 10 * alpha + 2;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.35 + prog * 0.7), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = K_GLOW + (alpha * 0.8) + ')';
    ctx.lineWidth = 5 * alpha + 1;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.55 + prog * 0.85), 0, Math.PI * 2); ctx.stroke();

    for (let s = 0; s < 12; s++) {
        let sa = s * 2.2 + prog * 3;
        let sr = R * (0.3 + prog * 1.0);
        ctx.globalAlpha = alpha * (1 - prog * 0.7);
        ctx.fillStyle = (s % 2 === 0) ? '#ffffff' : K_MAIN;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.85, 7 - prog * 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡✨ 대기를 가르는 번개 (관통)
// ============================================================================
registerVisualFX('kashimo_sky_bolt', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;

    let ox = (fx.x2 !== undefined) ? fx.x2 : fx.x;
    let oy = (fx.y2 !== undefined) ? fx.y2 : fx.y;
    if (fx.ownerId) {
        let o = (fx.ownerId === state.myId) ? state.myPlayer : state.players[fx.ownerId];
        if (o) { ox = o.x; oy = o.y; }
    }

    let pos = traceTarget(state, fx.targetKind || 'player', fx.targetId, fx.x, fx.y);
    let tx = pos.x, ty = pos.y;

    let ex, ey;
    if (Number.isFinite(fx.endX) && Number.isFinite(fx.endY)) {
        ex = fx.endX; ey = fx.endY;
    } else {
        let ddx = tx - ox, ddy = ty - oy;
        let dd = Math.hypot(ddx, ddy) || 1;
        ex = ox + (ddx / dd) * (dd + 700);
        ey = oy + (ddy / dd) * (dd + 700);
    }

    let dx = ex - ox, dy = ey - oy;
    let full = Math.hypot(dx, dy) || 1;
    let ang = Math.atan2(dy, dx);
    let half = ((fx.radius !== undefined) ? fx.radius : 150) / 2;

    const strikeT = Math.min(1, prog / 0.25);
    let reach = full * strikeT;
    let toTarget = Math.hypot(tx - ox, ty - oy);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    let bodyR = 130 * (0.6 + strikeT * 0.9);
    let bodyG = ctx.createRadialGradient(ox, oy, 6, ox, oy, bodyR);
    bodyG.addColorStop(0, 'rgba(255, 255, 255, 1)');
    bodyG.addColorStop(0.25, 'rgba(240, 220, 255, 0.92)');
    bodyG.addColorStop(0.6, K_GLOW + (0.55 * alpha) + ')');
    bodyG.addColorStop(1, 'rgba(80, 10, 150, 0)');
    ctx.fillStyle = bodyG;
    ctx.beginPath(); ctx.arc(ox, oy, bodyR, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(ox, oy);
    drawSparkBurst(ctx, bodyR * 0.85, 12, alpha, now, 1.9);
    ctx.restore();

    if (reach > 4) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);

        let path = ctx.createLinearGradient(0, -half, 0, half);
        path.addColorStop(0, 'rgba(168, 85, 247, 0)');
        path.addColorStop(0.35, K_GLOW + (0.28 * alpha) + ')');
        path.addColorStop(0.5, K_GLOW + (0.45 * alpha) + ')');
        path.addColorStop(0.65, K_GLOW + (0.28 * alpha) + ')');
        path.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = path;
        ctx.fillRect(0, -half, reach, half * 2);

        for (let b = 0; b < 4; b++) {
            let amp = (half * 0.62) - b * (half * 0.13);
            drawBoltLine(
                ctx, reach, Math.max(8, amp), b * 3.1, now,
                [30 - b * 6, 13 - b * 3, 4.5],
                [
                    K_GLOW + (0.55 * alpha) + ')',
                    `rgba(196, 132, 252, ${0.9 * alpha})`,
                    `rgba(255, 255, 255, ${0.98 * alpha})`
                ]
            );
        }

        let tipG = ctx.createRadialGradient(reach, 0, 4, reach, 0, 80);
        tipG.addColorStop(0, 'rgba(255, 255, 255, 1)');
        tipG.addColorStop(0.4, 'rgba(233, 213, 255, 0.85)');
        tipG.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = tipG;
        ctx.beginPath(); ctx.arc(reach, 0, 80, 0, Math.PI * 2); ctx.fill();

        for (let s = 0; s < 16; s++) {
            let sp = ((now / 240) + s * 0.0625) % 1;
            let px = reach * sp;
            if (px > reach) continue;
            ctx.globalAlpha = alpha * (1 - Math.abs(sp - 0.5) * 1.4) * 0.9;
            ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : ((s % 3 === 1) ? '#e9d5ff' : K_MAIN);
            ctx.beginPath();
            ctx.arc(px, Math.sin(s * 2.3 + now / 90) * half * 0.55, 7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = alpha;

        ctx.restore();
    }

    if (reach >= toTarget - 4) {
        let R = 190 + prog * 130;
        ctx.save();
        ctx.translate(tx, ty);

        let g = ctx.createRadialGradient(0, 0, 8, 0, 0, R);
        g.addColorStop(0, 'rgba(255, 255, 255, 1)');
        g.addColorStop(0.22, 'rgba(240, 220, 255, 0.92)');
        g.addColorStop(0.55, K_GLOW + (0.5 * alpha) + ')');
        g.addColorStop(1, 'rgba(70, 10, 130, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

        drawSparkBurst(ctx, R * 0.85, 14, alpha, now, 0.9);

        for (let r = 0; r < 3; r++) {
            let rt = (prog + r * 0.28) % 1;
            let rr = R * (0.3 + rt * 0.95);
            let ra = alpha * (1 - rt) * 0.95;
            ctx.strokeStyle = (r % 2 === 0)
                ? `rgba(255, 255, 255, ${ra})`
                : K_GLOW + (ra * 0.9) + ')';
            ctx.lineWidth = (20 - r * 5) * (1 - rt) + 3;
            ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.lineCap = 'round';
        for (let s = 0; s < 14; s++) {
            let a2 = (Math.PI * 2 / 14) * s + prog * 0.7;
            let r1 = R * 0.18;
            let r2 = R * (0.8 + prog * 0.6) * (s % 2 === 0 ? 1 : 0.68);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
            ctx.lineWidth = 9 * alpha + 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a2) * r1, Math.sin(a2) * r1);
            ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
            ctx.stroke();
            ctx.strokeStyle = K_GLOW + (alpha * 0.75) + ')';
            ctx.lineWidth = 4 * alpha + 1;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a2) * r1, Math.sin(a2) * r1);
            ctx.lineTo(Math.cos(a2) * r2 * 1.14, Math.sin(a2) * r2 * 1.14);
            ctx.stroke();
        }

        for (let s = 0; s < 18; s++) {
            let sp = ((now / 280) + s * 0.055) % 1;
            let sa = s * 2.35 + prog * 2;
            let sr = R * (0.25 + sp * 1.1);
            ctx.globalAlpha = alpha * (1 - sp) * 0.95;
            ctx.fillStyle = (s % 2 === 0) ? '#ffffff' : K_MAIN;
            ctx.beginPath();
            ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.8 - sp * 50, 10 - sp * 6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = alpha;

        let cc = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.3);
        cc.addColorStop(0, `rgba(255, 255, 255, ${0.95 * alpha})`);
        cc.addColorStop(0.6, `rgba(233, 213, 255, ${0.5 * alpha})`);
        cc.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = cc;
        ctx.beginPath(); ctx.arc(0, 0, R * 0.3, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    if (strikeT >= 1) {
        let eR = 120 + prog * 70;
        ctx.save();
        ctx.translate(ex, ey);
        let eg = ctx.createRadialGradient(0, 0, 5, 0, 0, eR);
        eg.addColorStop(0, `rgba(255, 255, 255, ${0.75 * alpha})`);
        eg.addColorStop(0.35, `rgba(233, 213, 255, ${0.55 * alpha})`);
        eg.addColorStop(1, 'rgba(126, 34, 206, 0)');
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.arc(0, 0, eR, 0, Math.PI * 2); ctx.fill();
        drawSparkBurst(ctx, eR * 0.75, 8, alpha * 0.85, now, 2.6);
        ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡🌋 [재작성] 주력 방출
//    ✅ 까칠까칠하고 빠르고 강렬한 번개로 표현한다.
//       · 부드러운 곡선 줄기 → 각지고 날카로운 지그재그 번개 다발
//       · 줄기가 훨씬 빠르게 깜빡이며 매 프레임 형태가 크게 바뀐다
//       · 흰 코어가 강하게 명멸하고, 가지(branch)가 사방으로 튄다
//    🏵️ 여의 장착 시 좌우 범위 확대
// ============================================================================
registerVisualFX('kashimo_surge', (ctx, fx, alpha, state) => {
    const now = state.mathNow;

    let cx = fx.x, cy = fx.y;
    let owner = null;
    if (fx.ownerId) {
        owner = (fx.ownerId === state.myId) ? state.myPlayer : state.players[fx.ownerId];
        if (owner) { cx = owner.x; cy = owner.y; }
    }
    if (fx.ownerId && (!owner || owner.isDead)) { fx.active = false; return; }

    const HALF_W = (fx.radius !== undefined) ? (fx.radius / 2) : 360;
    const H      = (fx.arc !== undefined) ? fx.arc : 900;
    const yeoui  = !!fx.yeoui;
    const hold = (alpha > 0.94) ? ((1 - alpha) / 0.06) : (alpha < 0.08 ? (alpha / 0.08) : 1);

    // ⚡ 아주 빠른 명멸 (프레임마다 강도가 크게 튄다)
    const flick = 0.62 + Math.abs(Math.sin(now / 28)) * 0.38;
    const flick2 = 0.55 + Math.random() * 0.45;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = hold;

    // ── ① 기둥 형태의 바탕 (각진 사다리꼴) ──────────────────────────
    let col = ctx.createLinearGradient(0, 40, 0, -H);
    col.addColorStop(0, K_GLOW + (0.9 * hold * flick) + ')');
    col.addColorStop(0.12, 'rgba(240, 225, 255, ' + (0.72 * hold) + ')');
    col.addColorStop(0.42, K_GLOW + (0.42 * hold) + ')');
    col.addColorStop(0.78, 'rgba(126, 34, 206, ' + (0.2 * hold) + ')');
    col.addColorStop(1, 'rgba(126, 34, 206, 0)');
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-HALF_W * 0.55, 40);
    ctx.lineTo(HALF_W * 0.55, 40);
    ctx.lineTo(HALF_W, -H);
    ctx.lineTo(-HALF_W, -H);
    ctx.closePath();
    ctx.fill();

    // ── ② 까칠까칠한 번개 다발 (핵심) ───────────────────────────────
    //    매 프레임 형태가 크게 바뀌도록 seed 에 시간을 섞는다.
    const STRANDS = yeoui ? 15 : 11;
    for (let s = 0; s < STRANDS; s++) {
        // 좌우로 퍼지는 기준 위치
        let t = (STRANDS === 1) ? 0.5 : (s / (STRANDS - 1));
        let baseX = (t - 0.5) * HALF_W * 1.55;
        // 위로 뻗는 길이 (줄기마다 다르고 빠르게 요동)
        let topRatio = 0.62 + ((s * 37) % 40) / 100 + Math.abs(Math.sin(now / 90 + s)) * 0.16;
        let len = H * Math.min(1.05, topRatio);
        let amp = HALF_W * (0.16 + (s % 3) * 0.07);

        // ⚡ 줄기마다 다른 명멸 (일부는 순간적으로 사라진다 → 지지직거림)
        let strandFlick = 0.35 + Math.abs(Math.sin(now / (26 + s * 4) + s * 1.9)) * 0.65;
        if (strandFlick < 0.45 && (s % 3) === 0) continue;   // 빠르게 깜빡

        ctx.save();
        ctx.translate(baseX * 0.35, 30);
        ctx.globalAlpha = hold * strandFlick;

        drawJaggedBolt(
            ctx, len, amp,
            s * 3.7 + Math.floor(now / 40),          // 40ms 마다 형태가 완전히 바뀐다
            now,
            [17, 8, 2.8],
            [
                K_GLOW + (0.75 * flick) + ')',
                `rgba(216, 180, 254, ${0.92 * flick})`,
                `rgba(255, 255, 255, ${0.99 * flick2})`
            ],
            0.6
        );
        ctx.restore();
    }
    ctx.globalAlpha = hold;

    // ── ③ 중심 백광 코어 (강하게 명멸) ──────────────────────────────
    let coreW = (yeoui ? 46 : 34) * (0.75 + flick * 0.5);
    let coreG = ctx.createLinearGradient(0, 40, 0, -H * 0.98);
    coreG.addColorStop(0, `rgba(255, 255, 255, ${0.98 * hold * flick2})`);
    coreG.addColorStop(0.42, `rgba(245, 232, 255, ${0.65 * hold})`);
    coreG.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = coreG;
    ctx.beginPath();
    ctx.moveTo(-coreW * 0.45, 40);
    ctx.lineTo(coreW * 0.45, 40);
    ctx.lineTo(coreW * 0.85, -H * 0.98);
    ctx.lineTo(-coreW * 0.85, -H * 0.98);
    ctx.closePath();
    ctx.fill();

    // 코어를 가르는 굵은 각진 번개 1가닥
    ctx.save();
    ctx.translate(0, 30);
    ctx.globalAlpha = hold * flick2;
    drawJaggedBolt(
        ctx, H * 0.98, (yeoui ? 46 : 34),
        Math.floor(now / 33) * 1.7, now,
        [30, 14, 5],
        [
            K_GLOW + '0.8)',
            `rgba(233, 213, 255, ${0.95})`,
            'rgba(255, 255, 255, 1)'
        ],
        0.8
    );
    ctx.restore();
    ctx.globalAlpha = hold;

    // ── ④ 발밑 폭발 오라 (빠르게 맥동) ──────────────────────────────
    let auraPulse = 0.82 + Math.abs(Math.sin(now / 42)) * 0.42;
    let auraR = (yeoui ? 140 : 115) * auraPulse;
    let aura = ctx.createRadialGradient(0, 0, 8, 0, 0, auraR);
    aura.addColorStop(0, `rgba(255, 255, 255, ${0.95 * hold * flick2})`);
    aura.addColorStop(0.3, K_GLOW + (0.68 * hold) + ')');
    aura.addColorStop(1, 'rgba(88, 20, 160, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();

    drawSparkBurst(ctx, auraR * 0.95, yeoui ? 14 : 11, hold * flick, now, 0.7);

    // ── ⑤ 사방으로 튀는 짧은 각진 방전 (지면 근처) ─────────────────
    const ARCS = yeoui ? 10 : 7;
    for (let a = 0; a < ARCS; a++) {
        let ang = (Math.PI * 2 / ARCS) * a + now / 180;
        // 위쪽 절반은 기둥이 가리므로 아래·옆으로 퍼지게 한다
        let len = (yeoui ? 190 : 150) * (0.5 + Math.abs(Math.sin(a * 2.3 + now / 70)) * 0.75);
        ctx.save();
        ctx.translate(0, 30);
        ctx.rotate(ang + Math.PI / 2);      // drawJaggedBolt 는 -y 방향으로 그린다
        ctx.globalAlpha = hold * (0.4 + Math.abs(Math.sin(a + now / 60)) * 0.6);
        drawJaggedBolt(
            ctx, len, len * 0.22,
            a * 5.1 + Math.floor(now / 45), now,
            [10, 4.5, 1.8],
            [
                K_GLOW + '0.7)',
                `rgba(216, 180, 254, 0.9)`,
                'rgba(255, 255, 255, 0.98)'
            ],
            0.4
        );
        ctx.restore();
    }
    ctx.globalAlpha = hold;

    // ── ⑥ 빠르게 퍼지는 충격 링 (지면) ──────────────────────────────
    for (let r = 0; r < 4; r++) {
        let rt = ((now / 300) + r * 0.25) % 1;      // ✅ 훨씬 빠르게
        let rr = HALF_W * (0.3 + rt * 1.25);
        ctx.strokeStyle = (r % 2 === 0)
            ? `rgba(255, 255, 255, ${hold * (1 - rt) * 0.95})`
            : K_GLOW + (hold * (1 - rt) * 0.85) + ')';
        ctx.lineWidth = (16 - r * 3) * (1 - rt) + 2;
        ctx.beginPath();
        ctx.ellipse(0, 40, rr, rr * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── ⑦ 위로 솟구치는 전하 파편 (빠르게) ──────────────────────────
    for (let s = 0; s < (yeoui ? 50 : 38); s++) {
        let sp = ((now / 300) + s * 0.0263) % 1;    // ✅ 빠른 상승
        let sx = (Math.sin(s * 2.7 + now / 160) * HALF_W * 0.9) * (0.25 + sp * 0.85);
        let sy = 40 - sp * H * 0.98;
        ctx.globalAlpha = hold * (1 - sp) * 0.95;
        ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : ((s % 3 === 1) ? '#e9d5ff' : K_MAIN);
        // ✅ 동그란 입자 대신 각진 마름모 → 까칠한 느낌
        let sz = (8 - sp * 5.5) + 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy - sz);
        ctx.lineTo(sx + sz * 0.6, sy);
        ctx.lineTo(sx, sy + sz);
        ctx.lineTo(sx - sz * 0.6, sy);
        ctx.closePath();
        ctx.fill();
    }
    ctx.globalAlpha = hold;

    // ── ⑧ 기둥 꼭대기 방전 ──────────────────────────────────────────
    let topGlow = ctx.createRadialGradient(0, -H * 0.94, 8, 0, -H * 0.94, HALF_W * 1.2);
    topGlow.addColorStop(0, `rgba(255, 255, 255, ${0.6 * hold * flick})`);
    topGlow.addColorStop(0.45, K_GLOW + (0.28 * hold) + ')');
    topGlow.addColorStop(1, 'rgba(126, 34, 206, 0)');
    ctx.fillStyle = topGlow;
    ctx.beginPath(); ctx.arc(0, -H * 0.94, HALF_W * 1.2, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(0, -H * 0.94);
    drawSparkBurst(ctx, HALF_W * 0.75, yeoui ? 12 : 9, hold * flick, now, 3.3);
    ctx.restore();

    // ── ⑨ 시전 중 고정 표시 (발밑 링) ───────────────────────────────
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = hold * 0.9;
    ctx.strokeStyle = `rgba(233, 213, 255, ${0.5 + Math.abs(Math.sin(now / 70)) * 0.5})`;
    ctx.lineWidth = 5;
    ctx.setLineDash([14, 10]);
    ctx.lineDashOffset = -now / 14;              // ✅ 더 빠르게 회전
    ctx.beginPath();
    ctx.ellipse(0, 44, 80, 25, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡🔮 환수호박 — 시전자를 감싸는 전기 덩어리 오라
// ============================================================================
registerVisualFX('kashimo_amber_aura', (ctx, fx, alpha, state) => {
    const now = state.mathNow;

    let owner = null;
    if (fx.ownerId) owner = (fx.ownerId === state.myId) ? state.myPlayer : state.players[fx.ownerId];
    if (!owner || owner.isDead || !owner.amberActive) { fx.active = false; return; }

    fx.life = fx.maxLife;
    if (fx.endAt) fx.endAt = now + (fx.durationMs || 1000);

    const cx = owner.x, cy = owner.y;
    const R = 62;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'screen';

    let pulse = 1 + Math.sin(now / 70) * 0.18;
    let auraR = R * 2.3 * pulse;
    let aura = ctx.createRadialGradient(0, 0, R * 0.25, 0, 0, auraR);
    aura.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    aura.addColorStop(0.22, 'rgba(233, 213, 255, 0.78)');
    aura.addColorStop(0.5, K_GLOW + '0.55)');
    aura.addColorStop(0.78, 'rgba(126, 34, 206, 0.32)');
    aura.addColorStop(1, 'rgba(70, 10, 130, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();

    const LOBES = 11;
    ctx.beginPath();
    for (let i = 0; i <= LOBES; i++) {
        let a = (Math.PI * 2 / LOBES) * i;
        let wob = 1 + Math.sin(a * 3 + now / 90) * 0.16 + Math.sin(a * 5 - now / 140) * 0.11;
        let rr = R * 1.15 * wob;
        let xx = Math.cos(a) * rr, yy = Math.sin(a) * rr * 1.1;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.closePath();
    let bodyG = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.3);
    bodyG.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    bodyG.addColorStop(0.45, 'rgba(216, 180, 254, 0.8)');
    bodyG.addColorStop(1, K_GLOW + '0.45)');
    ctx.fillStyle = bodyG;
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 + Math.abs(Math.sin(now / 90)) * 0.25})`;
    ctx.lineWidth = 4;
    ctx.stroke();

    drawSparkBurst(ctx, R * 1.9, 12, 1.0, now, 0.5);

    for (let r = 0; r < 3; r++) {
        let rt = ((now / 700) + r * 0.333) % 1;
        let rr = R * (0.9 + rt * 1.4);
        ctx.strokeStyle = (r % 2 === 0)
            ? `rgba(233, 213, 255, ${(1 - rt) * 0.85})`
            : K_GLOW + ((1 - rt) * 0.75) + ')';
        ctx.lineWidth = (11 - r * 2) * (1 - rt) + 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, rr, rr * 0.62, Math.sin(now / 400 + r) * 0.5, 0, Math.PI * 2);
        ctx.stroke();
    }

    for (let s = 0; s < 14; s++) {
        let sp = ((now / 480) + s * 0.0714) % 1;
        let sa = s * 2.1 + now / 260;
        let sr = R * (0.6 + sp * 1.3);
        ctx.globalAlpha = (1 - sp) * 0.95;
        ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : ((s % 3 === 1) ? '#e9d5ff' : K_MAIN);
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.85 - sp * 42, (7 - sp * 4) + 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    let corePulse = 1 + Math.sin(now / 48) * 0.25;
    let cc = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.55 * corePulse);
    cc.addColorStop(0, 'rgba(255, 255, 255, 1)');
    cc.addColorStop(0.55, 'rgba(240, 220, 255, 0.7)');
    cc.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = cc;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.55 * corePulse, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡🔮 환수호박 — 전기 잔상
//    ✅ [수정] 이제 '전격 돌진 중'에만 생성된다. (평상시에는 나오지 않는다)
// ============================================================================
registerVisualFX('kashimo_amber_trail', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const R = 46;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha * 0.92;

    let rr = R * (1 + prog * 0.4);
    let g = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, rr * 1.7);
    g.addColorStop(0, `rgba(255, 255, 255, ${0.7 * alpha})`);
    g.addColorStop(0.3, `rgba(216, 180, 254, ${0.52 * alpha})`);
    g.addColorStop(0.65, K_GLOW + (0.34 * alpha) + ')');
    g.addColorStop(1, 'rgba(70, 10, 130, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rr * 1.7, 0, Math.PI * 2); ctx.fill();

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let b = 0; b < 3; b++) {
        let baseAng = (Math.PI * 2 / 3) * b + now / 190 + (fx.x % 7);
        let len = rr * (0.75 + Math.abs(Math.sin(b * 2.2 + now / 110)) * 0.55);
        ctx.save();
        ctx.rotate(baseAng);
        drawBoltLine(ctx, len, 11, b * 2.9 + (fx.y % 5), now,
            [9, 3.2],
            [K_GLOW + (0.7 * alpha) + ')', `rgba(255, 255, 255, ${0.85 * alpha})`]);
        ctx.restore();
    }

    const LOBES = 9;
    ctx.beginPath();
    for (let i = 0; i <= LOBES; i++) {
        let a = (Math.PI * 2 / LOBES) * i;
        let wob = 1 + Math.sin(a * 3 + now / 130 + fx.x * 0.01) * 0.2;
        let r2 = rr * 0.72 * wob;
        let xx = Math.cos(a) * r2, yy = Math.sin(a) * r2 * 1.05;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(233, 213, 255, ${0.6 * alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    for (let s = 0; s < 5; s++) {
        let sp = ((now / 340) + s * 0.2) % 1;
        let sa = s * 2.6 + now / 230;
        let sr = rr * (0.5 + sp * 0.85);
        ctx.globalAlpha = alpha * (1 - sp) * 0.85;
        ctx.fillStyle = (s % 2 === 0) ? '#f3e8ff' : K_MAIN;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.9, 4.5 - sp * 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡🔮 [신규] 전격 돌진 — 출발지 ↔ 도착지 사이를 잇는 전류 궤적
//    순간이동과 달리 '지나간 길'을 강조한다.
// ============================================================================
registerVisualFX('kashimo_amber_dash', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;

    let fromX = fx.x, fromY = fx.y;
    let toX = (fx.x2 !== undefined) ? fx.x2 : fx.x;
    let toY = (fx.y2 !== undefined) ? fx.y2 : fx.y;

    let dx = toX - fromX, dy = toY - fromY;
    let dist = Math.hypot(dx, dy);
    if (dist < 1) dist = 1;
    let ang = Math.atan2(dy, dx);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    // ── ① 두 점을 잇는 넓은 전류 통로 ────────────────────────────────
    ctx.save();
    ctx.translate(fromX, fromY);
    ctx.rotate(ang);

    const HALF = 42;
    let path = ctx.createLinearGradient(0, -HALF, 0, HALF);
    path.addColorStop(0, 'rgba(168, 85, 247, 0)');
    path.addColorStop(0.5, K_GLOW + (0.55 * alpha) + ')');
    path.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = path;
    ctx.fillRect(0, -HALF, dist, HALF * 2);

    // ⚡ 굵은 번개 4가닥 (돌진 궤적)
    for (let b = 0; b < 4; b++) {
        let amp = 26 - b * 5;
        drawBoltLine(
            ctx, dist, amp, b * 2.7 + Math.floor(now / 45), now,
            [24 - b * 5, 11 - b * 2, 3.6],
            [
                K_GLOW + (0.6 * alpha) + ')',
                `rgba(196, 132, 252, ${0.92 * alpha})`,
                `rgba(255, 255, 255, ${0.98 * alpha})`
            ]
        );
    }

    // ✨ 경로를 따라 흐르는 전하 입자
    for (let s = 0; s < 14; s++) {
        let sp = ((now / 150) + s * 0.0714) % 1;
        ctx.globalAlpha = alpha * (1 - Math.abs(sp - 0.5) * 1.5) * 0.95;
        ctx.fillStyle = (s % 2 === 0) ? '#ffffff' : K_MAIN;
        ctx.beginPath();
        ctx.arc(dist * sp, Math.sin(s * 2.1 + now / 70) * 17, 6.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.restore();

    // ── ② 출발지 잔상 (사라지는 쪽) ──────────────────────────────────
    let sR = 84 * (1 - prog * 0.35);
    let sg = ctx.createRadialGradient(fromX, fromY, 4, fromX, fromY, sR);
    sg.addColorStop(0, `rgba(255, 255, 255, ${0.7 * alpha})`);
    sg.addColorStop(0.35, `rgba(233, 213, 255, ${0.5 * alpha})`);
    sg.addColorStop(1, 'rgba(126, 34, 206, 0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(fromX, fromY, sR, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(fromX, fromY);
    drawSparkBurst(ctx, sR * 0.85, 8, alpha * 0.8, now, 1.1);
    ctx.restore();

    // ── ③ 도착지 충격 (돌진이 끝나는 쪽) ─────────────────────────────
    let eR = 108 * (0.7 + prog * 0.55);
    let eg = ctx.createRadialGradient(toX, toY, 5, toX, toY, eR);
    eg.addColorStop(0, 'rgba(255, 255, 255, 1)');
    eg.addColorStop(0.3, `rgba(240, 220, 255, ${0.88 * alpha})`);
    eg.addColorStop(0.65, K_GLOW + (0.52 * alpha) + ')');
    eg.addColorStop(1, 'rgba(88, 20, 160, 0)');
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(toX, toY, eR, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(toX, toY);
    drawSparkBurst(ctx, eR * 0.9, 12, alpha, now, 2.3);
    // 이중 도착 링
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.92})`;
    ctx.lineWidth = 8 * alpha + 2;
    ctx.beginPath(); ctx.arc(0, 0, eR * (0.48 + prog * 0.72), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = K_GLOW + (alpha * 0.8) + ')';
    ctx.lineWidth = 4 * alpha + 1;
    ctx.beginPath(); ctx.arc(0, 0, eR * (0.7 + prog * 0.7), 0, Math.PI * 2); ctx.stroke();

    // 방사형 섬광
    ctx.lineCap = 'round';
    for (let s = 0; s < 10; s++) {
        let a2 = (Math.PI * 2 / 10) * s + prog * 0.9 + ang;
        let r1 = eR * 0.2;
        let r2 = eR * (0.85 + prog * 0.45);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 7 * alpha + 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a2) * r1, Math.sin(a2) * r1);
        ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        ctx.stroke();
    }
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡🔮 전자파 — 연쇄 전기폭발 하나
// ============================================================================
registerVisualFX('kashimo_wave_blast', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const R = (fx.radius !== undefined) ? fx.radius : 135;
    const raijin = !!fx.raijin;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    let rr = R * (0.55 + prog * 0.75);
    let g = ctx.createRadialGradient(0, 0, 6, 0, 0, rr);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.25, 'rgba(240, 220, 255, 0.92)');
    g.addColorStop(0.58, K_GLOW + (0.6 * alpha) + ')');
    g.addColorStop(1, 'rgba(70, 10, 130, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();

    drawSparkBurst(ctx, rr * 0.95, raijin ? 14 : 10, alpha, now, (fx.val || 0) * 1.3);

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
    ctx.lineWidth = 9 * alpha + 2;
    ctx.beginPath(); ctx.arc(0, 0, rr * (0.5 + prog * 0.6), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = K_GLOW + (alpha * 0.8) + ')';
    ctx.lineWidth = 5 * alpha + 1;
    ctx.beginPath(); ctx.arc(0, 0, rr * (0.75 + prog * 0.7), 0, Math.PI * 2); ctx.stroke();

    // 🌩️ 뇌신 : 금빛 링을 하나 덧댄다
    if (raijin) {
        ctx.strokeStyle = `rgba(255, 236, 150, ${alpha * 0.75})`;
        ctx.lineWidth = 4 * alpha + 1;
        ctx.beginPath(); ctx.arc(0, 0, rr * (0.92 + prog * 0.6), 0, Math.PI * 2); ctx.stroke();
    }

    ctx.lineCap = 'round';
    for (let s = 0; s < 9; s++) {
        let a2 = (Math.PI * 2 / 9) * s + prog * 0.9 + (fx.val || 0);
        let r1 = rr * 0.2;
        let r2 = rr * (0.85 + prog * 0.5);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 7 * alpha + 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a2) * r1, Math.sin(a2) * r1);
        ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        ctx.stroke();
    }

    for (let s = 0; s < 10; s++) {
        let sa = s * 2.3 + prog * 3 + (fx.val || 0);
        let sr = rr * (0.35 + prog * 0.95);
        ctx.globalAlpha = alpha * (1 - prog * 0.65);
        ctx.fillStyle = (s % 2 === 0) ? '#ffffff' : K_MAIN;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.88, 6.5 - prog * 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡🌩️ 뇌신 재폭발 — 0.3초 뒤 전체 자리에서 동시에 터진다
//    일반 폭발보다 금빛이 강하고, 위로 솟구치는 기둥이 함께 나온다.
// ============================================================================
registerVisualFX('kashimo_wave_echo', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const R = (fx.radius !== undefined) ? fx.radius : 175;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    // ── ① 위로 솟구치는 금빛 전기 기둥 ──────────────────────────────
    let colH = R * 2.6 * Math.min(1, prog / 0.3);
    if (colH > 6) {
        let col = ctx.createLinearGradient(0, 0, 0, -colH);
        col.addColorStop(0, `rgba(255, 236, 150, ${0.7 * alpha})`);
        col.addColorStop(0.35, K_GLOW + (0.45 * alpha) + ')');
        col.addColorStop(1, 'rgba(126, 34, 206, 0)');
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(-R * 0.4, 0);
        ctx.lineTo(R * 0.4, 0);
        ctx.lineTo(R * 0.18, -colH);
        ctx.lineTo(-R * 0.18, -colH);
        ctx.closePath();
        ctx.fill();

        // ⚡ 까칠까칠한 번개로 기둥 심지를 그린다
        drawJaggedBolt(ctx, colH, R * 0.22,
            (fx.val || 0) * 2.1 + Math.floor(now / 40), now,
            [16, 7, 2.6],
            [K_GLOW + (0.5 * alpha) + ')',
             `rgba(255, 236, 150, ${0.85 * alpha})`,
             `rgba(255, 255, 255, ${0.98 * alpha})`],
            0.5);
    }

    // ── ② 폭발 코어 ─────────────────────────────────────────────────
    let rr = R * (0.6 + prog * 0.8);
    let g = ctx.createRadialGradient(0, 0, 6, 0, 0, rr);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.2, 'rgba(255, 245, 200, 0.95)');
    g.addColorStop(0.5, K_GLOW + (0.6 * alpha) + ')');
    g.addColorStop(1, 'rgba(70, 10, 130, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();

    drawSparkBurst(ctx, rr * 1.0, 15, alpha, now, (fx.val || 0) * 1.9);

    // ── ③ 삼중 충격 링 (금빛 강조) ──────────────────────────────────
    for (let r = 0; r < 3; r++) {
        let rt = (prog + r * 0.25) % 1;
        let ra = alpha * (1 - rt) * 0.95;
        ctx.strokeStyle = (r === 1)
            ? `rgba(255, 236, 150, ${ra})`
            : ((r % 2 === 0) ? `rgba(255, 255, 255, ${ra})` : K_GLOW + (ra * 0.9) + ')');
        ctx.lineWidth = (16 - r * 4) * (1 - rt) + 3;
        ctx.beginPath(); ctx.arc(0, 0, rr * (0.45 + rt * 0.95), 0, Math.PI * 2); ctx.stroke();
    }

    // ── ④ 방사형 섬광 ───────────────────────────────────────────────
    ctx.lineCap = 'round';
    for (let s = 0; s < 12; s++) {
        let a2 = (Math.PI * 2 / 12) * s + prog * 1.1 + (fx.val || 0);
        let r1 = rr * 0.18;
        let r2 = rr * (0.9 + prog * 0.55);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.lineWidth = 9 * alpha + 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a2) * r1, Math.sin(a2) * r1);
        ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 236, 150, ${alpha * 0.7})`;
        ctx.lineWidth = 4 * alpha + 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a2) * r1, Math.sin(a2) * r1);
        ctx.lineTo(Math.cos(a2) * r2 * 1.15, Math.sin(a2) * r2 * 1.15);
        ctx.stroke();
    }

    // ── ⑤ 튀어 오르는 파편 ──────────────────────────────────────────
    for (let s = 0; s < 14; s++) {
        let sp = ((now / 260) + s * 0.071) % 1;
        let sa = s * 2.4 + prog * 2;
        let sr = rr * (0.3 + sp * 1.0);
        ctx.globalAlpha = alpha * (1 - sp) * 0.95;
        ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : ((s % 3 === 1) ? '#ffec96' : K_MAIN);
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.85 - sp * 44, 8 - sp * 5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡🔮 음파 — 0.5초 응축
// ============================================================================
registerVisualFX('kashimo_sonic_charge', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const dir = (fx.dir === -1) ? -1 : 1;

    let cx = fx.x, cy = fx.y;
    if (fx.ownerId) {
        let o = (fx.ownerId === state.myId) ? state.myPlayer : state.players[fx.ownerId];
        if (o) { cx = o.x; cy = o.y; }
    }

    ctx.save();
    ctx.translate(cx + dir * 55, cy - 10);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    let R = 30 + prog * 70;
    let g = ctx.createRadialGradient(0, 0, 3, 0, 0, R);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.3, 'rgba(233, 213, 255, 0.9)');
    g.addColorStop(0.7, K_GLOW + (0.6 * alpha) + ')');
    g.addColorStop(1, 'rgba(90, 20, 160, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    for (let s = 0; s < 12; s++) {
        let sp = ((now / 260) + s * 0.083) % 1;
        let sa = s * 2.1 + now / 180;
        let sr = R * (2.2 - sp * 1.7);
        ctx.globalAlpha = alpha * sp * 0.95;
        ctx.fillStyle = (s % 2 === 0) ? '#ffffff' : K_MAIN;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.85, 5 * sp + 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = K_GLOW + (alpha * 0.9) + ')';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, R * (2.0 - prog * 1.2), 0, Math.PI * 2); ctx.stroke();

    drawSparkBurst(ctx, R * 0.85, 7, alpha, now, 2.4);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡🔮 음파 — 전방 넓은 부채꼴 (🌩️ 뇌신이면 금빛이 섞인다)
// ============================================================================
registerVisualFX('kashimo_sonic', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const dir = (fx.dir === -1) ? -1 : 1;
    const range = (fx.radius !== undefined) ? fx.radius : 900;
    const halfAng = ((fx.arc !== undefined) ? fx.arc : 1.9478) / 2;
    const raijin = !!fx.raijin;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.scale(dir, 1);
    ctx.globalCompositeOperation = 'screen';

    let reach = range * Math.min(1, prog / 0.45);

    ctx.globalAlpha = alpha * 0.85;
    let fanG = ctx.createRadialGradient(0, 0, 10, 0, 0, Math.max(12, reach));
    fanG.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    fanG.addColorStop(0.2, raijin ? 'rgba(255, 245, 200, 0.72)' : 'rgba(233, 213, 255, 0.7)');
    fanG.addColorStop(0.6, K_GLOW + '0.42)');
    fanG.addColorStop(1, 'rgba(126, 34, 206, 0)');
    ctx.fillStyle = fanG;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, Math.max(12, reach), -halfAng, halfAng);
    ctx.closePath();
    ctx.fill();

    ctx.lineCap = 'round';
    for (let r = 0; r < 4; r++) {
        let rt = (prog * 1.6 + r * 0.22) % 1.4;
        if (rt > 1) continue;
        let rr = range * rt;
        let ra = alpha * (1 - rt) * 0.95;
        ctx.strokeStyle = (raijin && r === 1)
            ? `rgba(255, 236, 150, ${ra})`
            : ((r % 2 === 0) ? `rgba(255, 255, 255, ${ra})` : K_GLOW + (ra * 0.9) + ')');
        ctx.lineWidth = (17 - r * 3) * (1 - rt) + 3;
        ctx.beginPath();
        ctx.arc(0, 0, rr, -halfAng, halfAng);
        ctx.stroke();
    }

    ctx.globalAlpha = alpha;
    const STRANDS = raijin ? 13 : 9;
    for (let s = 0; s < STRANDS; s++) {
        let a = -halfAng + (halfAng * 2) * (s / (STRANDS - 1));
        let len = reach * (0.72 + Math.abs(Math.sin(s * 1.7 + now / 120)) * 0.28);
        ctx.save();
        ctx.rotate(a);
        drawBoltLine(ctx, len, 24, s * 2.3, now,
            [17, 7.5, 2.8],
            [K_GLOW + (0.5 * alpha) + ')',
             raijin ? `rgba(255, 236, 150, ${0.85 * alpha})` : `rgba(196, 132, 252, ${0.85 * alpha})`,
             `rgba(255, 255, 255, ${0.95 * alpha})`]);
        ctx.restore();
    }

    ctx.strokeStyle = `rgba(233, 213, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(-halfAng) * reach, Math.sin(-halfAng) * reach);
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(halfAng) * reach, Math.sin(halfAng) * reach);
    ctx.stroke();

    let mg = ctx.createRadialGradient(0, 0, 4, 0, 0, 110);
    mg.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    mg.addColorStop(0.4, `rgba(233, 213, 255, ${0.7 * alpha})`);
    mg.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill();

    for (let s = 0; s < 20; s++) {
        let sp = ((now / 300) + s * 0.05) % 1;
        let a = -halfAng + (halfAng * 2) * ((s * 0.137) % 1);
        let sr = reach * sp;
        ctx.globalAlpha = alpha * (1 - sp) * 0.9;
        ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : ((s % 3 === 1) ? (raijin ? '#ffec96' : '#e9d5ff') : K_MAIN);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * sr, Math.sin(a) * sr, (9 - sp * 6) + 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡ (투사체) 번개
//    🏵️ 여의 장착 시 더 굵고 길게 보인다.
//    🌩️ [수정] 음파 번개(longBolt) 는 탄속이 느려진 대신 훨씬 길게 그려진다.
// ============================================================================
registerProjectile('kashimo_bolt', (ctx, proj, state) => {
    const now = state.mathNow;
    const ang = Math.atan2(proj.vy || 0, proj.vx || (proj.team === 1 ? 1 : -1));
    const yeoui = !!proj.yeoui;
    const longBolt = !!proj.longBolt;      // 🌩️ 음파에서 나온 번개

    RenderUtils.withRotation(ctx, proj.x, proj.y, ang, () => {
        ctx.globalCompositeOperation = 'screen';

        // 🌩️ 음파 번개 : 탄환 길이를 크게 늘린다
        // 🏵️ 여의 : 속도가 빨라졌으므로 잔광도 더 길게
        const TAIL = longBolt ? (yeoui ? 700 : 620) : (yeoui ? 420 : 260);
        const HALF = longBolt ? (yeoui ? 62 : 48) : (yeoui ? 56 : 34);

        let tail = ctx.createLinearGradient(0, -HALF, 0, HALF);
        tail.addColorStop(0, 'rgba(168, 85, 247, 0)');
        tail.addColorStop(0.5, K_GLOW + ((yeoui || longBolt) ? '0.7)' : '0.55)'));
        tail.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = tail;
        ctx.fillRect(-TAIL, -HALF, TAIL + 90, HALF * 2);

        ctx.save();
        ctx.translate(-TAIL, 0);
        drawBoltLine(ctx, TAIL + 90, longBolt ? 30 : (yeoui ? 28 : 17), 1.7, now,
            longBolt ? [32, 15, 5.5] : (yeoui ? [34, 16, 6] : [22, 10, 4]),
            [K_GLOW + '0.5)',
             longBolt ? 'rgba(255, 236, 150, 0.95)' : 'rgba(196, 132, 252, 0.95)',
             'rgba(255, 255, 255, 1)']);
        ctx.restore();

        // 🌩️ 음파 번개는 심지를 한 겹 더 그려 길게 뻗은 느낌을 강조한다
        if (longBolt) {
            ctx.save();
            ctx.translate(-TAIL * 0.55, 0);
            drawBoltLine(ctx, TAIL * 0.55 + 90, 18, 4.3, now,
                [14, 6, 2.4],
                [K_GLOW + '0.55)',
                 'rgba(255, 245, 200, 0.9)',
                 'rgba(255, 255, 255, 1)']);
            ctx.restore();
        }

        let headR = longBolt ? (yeoui ? 82 : 66) : (yeoui ? 78 : 52);
        let head = ctx.createRadialGradient(70, 0, 3, 70, 0, headR);
        head.addColorStop(0, 'rgba(255, 255, 255, 1)');
        head.addColorStop(0.35, (yeoui || longBolt) ? 'rgba(255, 245, 200, 0.92)' : 'rgba(233, 213, 255, 0.9)');
        head.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = head;
        ctx.beginPath(); ctx.arc(70, 0, headR, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.translate(70, 0);
        drawSparkBurst(ctx, (yeoui || longBolt) ? 62 : 40, (yeoui || longBolt) ? 9 : 6, 0.9, now, 2.1);
        ctx.restore();

        ctx.globalCompositeOperation = 'source-over';
    });
});