// 파일명: renderer/fxkashimo.js
// ============================================================================
// ⚡ 카시모 하지메 전용 이펙트 모음 — 전부 보라색(#a855f7) 계열로 통일한다.
//
//  · kashimo_strike      : 평타 타격
//  · kashimo_counter     : 반격 전류 (플레이어 · 오크라 모두 추적)
//  · kashimo_bolt_cast   : 1번 스킬 시전 섬광
//  · kashimo_bolt_hit    : 번개 적중 전격
//  · kashimo_sky_bolt    : 대기를 가르는 번개 (시전자 몸속 → 대상)
//  · kashimo_surge       : 주력 방출 (위로 솟구치는 에너지 기둥)
//  · kashimo_amber_aura  : ✅ [신규] 환수호박 — 시전자를 감싸는 전기 덩어리 오라
//  · kashimo_amber_trail : ✅ [신규] 환수호박 — 지나간 자리의 전기 잔상 (2초)
//  · kashimo_wave_blast  : ✅ [신규] 전자파 — 연쇄 전기폭발 하나
//  · kashimo_sonic_charge: ✅ [신규] 음파 — 0.5초 응축
//  · kashimo_sonic       : ✅ [신규] 음파 — 전방 넓은 부채꼴 전기 음파
//  · (투사체) kashimo_bolt : 매우 빠른 한 줄기 보라 번개
// ============================================================================

import { registerVisualFX, registerProjectile } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

// 🟣 공통 색상
const K_CORE   = 'rgba(255, 255, 255, 1)';
const K_MAIN   = 'rgba(196, 132, 252, 1)';   // 밝은 보라
const K_DEEP   = 'rgba(126, 34, 206, 1)';    // 진한 보라
const K_GLOW   = 'rgba(168, 85, 247, ';      // 알파를 이어 붙여 쓴다

/** ⚡ 지그재그 번개 한 가닥을 그린다. (0,0) → +x 방향 */
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
            ctx.fillStyle = (s % 2 === 0)
                ? `rgba(233, 213, 255, ${alpha})`
                : K_GLOW + alpha + ')';
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
    let cx = pos.x, cy = pos.y;

    const R = 56;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    let g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.5);
    g.addColorStop(0, K_GLOW + (0.45 * alpha) + ')');
    g.addColorStop(0.6, K_GLOW + (0.22 * alpha) + ')');
    g.addColorStop(1, 'rgba(80, 10, 150, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, Math.PI * 2); ctx.fill();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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
// ⚡ 1번 스킬 시전 섬광
// ============================================================================
registerVisualFX('kashimo_bolt_cast', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const dir = (fx.dir === -1) ? -1 : 1;
    const prog = 1 - alpha;

    let cx = fx.x, cy = fx.y;
    if (fx.ownerId) {
        let o = (fx.ownerId === state.myId) ? state.myPlayer : state.players[fx.ownerId];
        if (o) { cx = o.x; cy = o.y; }
    }

    ctx.save();
    ctx.translate(cx + dir * 60, cy - 10);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    let R = 70 + prog * 50;
    let g = ctx.createRadialGradient(0, 0, 4, 0, 0, R);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.3, 'rgba(233, 213, 255, 0.9)');
    g.addColorStop(0.65, K_GLOW + '0.5)');
    g.addColorStop(1, 'rgba(90, 20, 160, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    drawSparkBurst(ctx, R * 0.9, 9, alpha, now, 1.3);

    ctx.strokeStyle = K_GLOW + (alpha * 0.85) + ')';
    ctx.lineWidth = 9 * alpha + 2;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.4 + prog * 0.7), 0, Math.PI * 2); ctx.stroke();

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
// ⚡✨ 대기를 가르는 번개 (시전자 몸속 → 대상)
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

    let dx = tx - ox, dy = ty - oy;
    let dist = Math.hypot(dx, dy);
    let ang = Math.atan2(dy, dx);

    const strikeT = Math.min(1, prog / 0.25);

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

    if (dist > 4) {
        let reach = dist * strikeT;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);

        let path = ctx.createLinearGradient(0, -90, 0, 90);
        path.addColorStop(0, 'rgba(168, 85, 247, 0)');
        path.addColorStop(0.5, K_GLOW + (0.35 * alpha) + ')');
        path.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = path;
        ctx.fillRect(0, -90, reach, 180);

        for (let b = 0; b < 3; b++) {
            let amp = 44 - b * 12;
            drawBoltLine(ctx, reach, amp, b * 3.1, now,
                [26 - b * 6, 11 - b * 3, 4],
                [K_GLOW + (0.55 * alpha) + ')',
                 `rgba(196, 132, 252, ${0.9 * alpha})`,
                 `rgba(255, 255, 255, ${0.98 * alpha})`]);
        }

        let tipG = ctx.createRadialGradient(reach, 0, 4, reach, 0, 70);
        tipG.addColorStop(0, 'rgba(255, 255, 255, 1)');
        tipG.addColorStop(0.4, 'rgba(233, 213, 255, 0.85)');
        tipG.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = tipG;
        ctx.beginPath(); ctx.arc(reach, 0, 70, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    if (strikeT >= 1) {
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

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡🌋 주력 방출
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

    const HALF_W = (fx.radius !== undefined) ? (fx.radius / 2) : 180;
    const H      = (fx.arc !== undefined) ? fx.arc : 900;
    const hold = (alpha > 0.94) ? ((1 - alpha) / 0.06) : (alpha < 0.08 ? (alpha / 0.08) : 1);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'screen';

    ctx.globalAlpha = hold;
    let col = ctx.createLinearGradient(0, 40, 0, -H);
    col.addColorStop(0, K_GLOW + (0.85 * hold) + ')');
    col.addColorStop(0.15, 'rgba(233, 213, 255, ' + (0.7 * hold) + ')');
    col.addColorStop(0.45, K_GLOW + (0.45 * hold) + ')');
    col.addColorStop(0.8, 'rgba(126, 34, 206, ' + (0.22 * hold) + ')');
    col.addColorStop(1, 'rgba(126, 34, 206, 0)');
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-HALF_W * 0.62, 40);
    ctx.lineTo(HALF_W * 0.62, 40);
    ctx.lineTo(HALF_W, -H);
    ctx.lineTo(-HALF_W, -H);
    ctx.closePath();
    ctx.fill();

    let corePulse = 1 + Math.sin(now / 55) * 0.22;
    let coreW = 34 * corePulse;
    let coreG = ctx.createLinearGradient(0, 40, 0, -H * 0.95);
    coreG.addColorStop(0, `rgba(255, 255, 255, ${0.95 * hold})`);
    coreG.addColorStop(0.5, `rgba(240, 220, 255, ${0.6 * hold})`);
    coreG.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = coreG;
    ctx.beginPath();
    ctx.moveTo(-coreW * 0.5, 40);
    ctx.lineTo(coreW * 0.5, 40);
    ctx.lineTo(coreW * 0.9, -H * 0.95);
    ctx.lineTo(-coreW * 0.9, -H * 0.95);
    ctx.closePath();
    ctx.fill();

    const STRANDS = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let s = 0; s < STRANDS; s++) {
        let phase = now / (95 + s * 22) + s * 1.37;
        let side  = (s % 2 === 0) ? 1 : -1;
        let amp   = HALF_W * (0.35 + (s % 3) * 0.18);
        let topY  = -H * (0.55 + ((s * 37) % 45) / 100);

        const SEG = 12;
        const pts = [];
        for (let q = 0; q <= SEG; q++) {
            let t = q / SEG;
            let yy = 40 + (topY - 40) * t;
            let xx = Math.sin(t * 5.5 + phase) * amp * side * (0.35 + t * 0.8)
                   + (Math.random() - 0.5) * 16 * t;
            pts.push({ x: xx, y: yy });
        }

        ctx.globalAlpha = hold * (0.55 + Math.abs(Math.sin(phase)) * 0.45);
        ctx.strokeStyle = K_GLOW + '0.85)';
        ctx.lineWidth = 15;
        ctx.beginPath();
        for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(196, 132, 252, 0.95)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
        ctx.stroke();
    }
    ctx.globalAlpha = hold;

    let auraPulse = 1 + Math.sin(now / 80) * 0.16;
    let auraR = 105 * auraPulse;
    let aura = ctx.createRadialGradient(0, 0, 10, 0, 0, auraR);
    aura.addColorStop(0, `rgba(255, 255, 255, ${0.85 * hold})`);
    aura.addColorStop(0.35, K_GLOW + (0.6 * hold) + ')');
    aura.addColorStop(1, 'rgba(88, 20, 160, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();

    drawSparkBurst(ctx, auraR * 0.9, 9, hold, now, 0.7);

    for (let r = 0; r < 3; r++) {
        let rt = ((now / 620) + r * 0.333) % 1;
        let rr = HALF_W * (0.4 + rt * 1.35);
        ctx.strokeStyle = (r % 2 === 0)
            ? `rgba(233, 213, 255, ${hold * (1 - rt) * 0.9})`
            : K_GLOW + (hold * (1 - rt) * 0.8) + ')';
        ctx.lineWidth = (14 - r * 3) * (1 - rt) + 2;
        ctx.beginPath();
        ctx.ellipse(0, 40, rr, rr * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    for (let s = 0; s < 26; s++) {
        let sp = ((now / 520) + s * 0.0385) % 1;
        let sx = (Math.sin(s * 2.7 + now / 300) * HALF_W * 0.85) * (0.3 + sp * 0.8);
        let sy = 40 - sp * H * 0.95;
        ctx.globalAlpha = hold * (1 - sp) * 0.95;
        ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : ((s % 3 === 1) ? '#e9d5ff' : K_MAIN);
        ctx.beginPath();
        ctx.arc(sx, sy, (9 - sp * 6) + 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = hold;

    let topGlow = ctx.createRadialGradient(0, -H * 0.92, 8, 0, -H * 0.92, HALF_W * 1.3);
    topGlow.addColorStop(0, `rgba(255, 255, 255, ${0.5 * hold})`);
    topGlow.addColorStop(0.5, K_GLOW + (0.25 * hold) + ')');
    topGlow.addColorStop(1, 'rgba(126, 34, 206, 0)');
    ctx.fillStyle = topGlow;
    ctx.beginPath(); ctx.arc(0, -H * 0.92, HALF_W * 1.3, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡🔮 [신규] 환수호박 — 시전자를 감싸는 전기 덩어리 오라
//    시전자가 살아 있는 동안 계속 유지된다 (fx.life 를 매 프레임 되돌린다).
// ============================================================================
registerVisualFX('kashimo_amber_aura', (ctx, fx, alpha, state) => {
    const now = state.mathNow;

    // 시전자 추적
    let owner = null;
    if (fx.ownerId) owner = (fx.ownerId === state.myId) ? state.myPlayer : state.players[fx.ownerId];
    if (!owner || owner.isDead || !owner.amberActive) { fx.active = false; return; }

    // ♾️ 환수호박은 죽을 때까지 유지되므로 수명을 계속 되돌린다
    fx.life = fx.maxLife;
    if (fx.endAt) fx.endAt = now + (fx.durationMs || 1000);

    const cx = owner.x, cy = owner.y;
    const R = 62;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'screen';

    // ── ① 몸을 감싸는 거대한 전기 덩어리 후광 ────────────────────────
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

    // ── ② 몸 표면을 흐르는 전기 덩어리 (불규칙 다각형) ───────────────
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

    // 덩어리 윤곽 전격
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 + Math.abs(Math.sin(now / 90)) * 0.25})`;
    ctx.lineWidth = 4;
    ctx.stroke();

    // ── ③ 사방으로 끊임없이 튀는 전격 가지 ───────────────────────────
    drawSparkBurst(ctx, R * 1.9, 12, 1.0, now, 0.5);

    // ── ④ 몸을 감아 도는 전기 고리 ───────────────────────────────────
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

    // ── ⑤ 위로 흩어지는 전하 입자 ────────────────────────────────────
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

    // ── ⑥ 중심 백광 코어 (심장부) ────────────────────────────────────
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
// ⚡🔮 [신규] 환수호박 — 지나간 자리의 전기 잔상 (2초)
// ============================================================================
registerVisualFX('kashimo_amber_trail', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const R = 48;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha * 0.9;

    // 🟣 잔상 후광 — 시간이 지날수록 옅어지며 조금 퍼진다
    let rr = R * (1 + prog * 0.45);
    let g = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, rr * 1.7);
    g.addColorStop(0, `rgba(255, 255, 255, ${0.65 * alpha})`);
    g.addColorStop(0.3, `rgba(216, 180, 254, ${0.5 * alpha})`);
    g.addColorStop(0.65, K_GLOW + (0.32 * alpha) + ')');
    g.addColorStop(1, 'rgba(70, 10, 130, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rr * 1.7, 0, Math.PI * 2); ctx.fill();

    // ⚡ 잔상 안에서 지직거리는 짧은 전격 3가닥
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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

    // 잔상 윤곽 (불규칙 다각형)
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
    ctx.strokeStyle = `rgba(233, 213, 255, ${0.55 * alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // ✨ 흩어지는 작은 스파크
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
// ⚡🔮 [신규] 전자파 — 연쇄 전기폭발 하나
// ============================================================================
registerVisualFX('kashimo_wave_blast', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const R = (fx.radius !== undefined) ? fx.radius : 135;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    // 💥 폭발 코어 — 터지면서 커진다
    let rr = R * (0.55 + prog * 0.75);
    let g = ctx.createRadialGradient(0, 0, 6, 0, 0, rr);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.25, 'rgba(240, 220, 255, 0.92)');
    g.addColorStop(0.58, K_GLOW + (0.6 * alpha) + ')');
    g.addColorStop(1, 'rgba(70, 10, 130, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();

    // ⚡ 사방으로 터지는 전격
    drawSparkBurst(ctx, rr * 0.95, 10, alpha, now, (fx.val || 0) * 1.3);

    // 이중 충격 링
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
    ctx.lineWidth = 9 * alpha + 2;
    ctx.beginPath(); ctx.arc(0, 0, rr * (0.5 + prog * 0.6), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = K_GLOW + (alpha * 0.8) + ')';
    ctx.lineWidth = 5 * alpha + 1;
    ctx.beginPath(); ctx.arc(0, 0, rr * (0.75 + prog * 0.7), 0, Math.PI * 2); ctx.stroke();

    // 방사형 섬광
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

    // 튀는 파편
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
// ⚡🔮 [신규] 음파 — 0.5초 응축 (시전자 앞에 모이는 전기)
// ============================================================================
registerVisualFX('kashimo_sonic_charge', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;                       // 0 → 1 로 진행
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

    // 🔊 응축될수록 코어가 커지고 밝아진다
    let R = 30 + prog * 70;
    let g = ctx.createRadialGradient(0, 0, 3, 0, 0, R);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.3, 'rgba(233, 213, 255, 0.9)');
    g.addColorStop(0.7, K_GLOW + (0.6 * alpha) + ')');
    g.addColorStop(1, 'rgba(90, 20, 160, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    // 안쪽으로 빨려 들어오는 전기 입자
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

    // 수축하는 링
    ctx.strokeStyle = K_GLOW + (alpha * 0.9) + ')';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, R * (2.0 - prog * 1.2), 0, Math.PI * 2); ctx.stroke();

    drawSparkBurst(ctx, R * 0.85, 7, alpha, now, 2.4);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡🔮 [신규] 음파 — 전방 넓은 부채꼴 전기 음파
// ============================================================================
registerVisualFX('kashimo_sonic', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const dir = (fx.dir === -1) ? -1 : 1;
    const range = (fx.radius !== undefined) ? fx.radius : 900;
    const halfAng = ((fx.arc !== undefined) ? fx.arc : 1.9478) / 2;

    let cx = fx.x, cy = fx.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(dir, 1);                    // 오른쪽 기준으로 그린 뒤 방향에 맞춰 반전
    ctx.globalCompositeOperation = 'screen';

    // 🔊 부채꼴이 빠르게 퍼져 나간다
    let reach = range * Math.min(1, prog / 0.45);

    // ── ① 부채꼴 본체 ────────────────────────────────────────────────
    ctx.globalAlpha = alpha * 0.85;
    let fanG = ctx.createRadialGradient(0, 0, 10, 0, 0, Math.max(12, reach));
    fanG.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    fanG.addColorStop(0.2, 'rgba(233, 213, 255, 0.7)');
    fanG.addColorStop(0.6, K_GLOW + '0.42)');
    fanG.addColorStop(1, 'rgba(126, 34, 206, 0)');
    ctx.fillStyle = fanG;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, Math.max(12, reach), -halfAng, halfAng);
    ctx.closePath();
    ctx.fill();

    // ── ② 퍼져 나가는 음파 링 (4겹) ──────────────────────────────────
    ctx.lineCap = 'round';
    for (let r = 0; r < 4; r++) {
        let rt = (prog * 1.6 + r * 0.22) % 1.4;
        if (rt > 1) continue;
        let rr = range * rt;
        let ra = alpha * (1 - rt) * 0.95;
        ctx.strokeStyle = (r % 2 === 0)
            ? `rgba(255, 255, 255, ${ra})`
            : K_GLOW + (ra * 0.9) + ')';
        ctx.lineWidth = (17 - r * 3) * (1 - rt) + 3;
        ctx.beginPath();
        ctx.arc(0, 0, rr, -halfAng, halfAng);
        ctx.stroke();
    }

    // ── ③ 부채꼴을 가로지르는 전기 줄기 ──────────────────────────────
    ctx.globalAlpha = alpha;
    const STRANDS = 9;
    for (let s = 0; s < STRANDS; s++) {
        let a = -halfAng + (halfAng * 2) * (s / (STRANDS - 1));
        let len = reach * (0.72 + Math.abs(Math.sin(s * 1.7 + now / 120)) * 0.28);
        ctx.save();
        ctx.rotate(a);
        drawBoltLine(ctx, len, 24, s * 2.3, now,
            [17, 7.5, 2.8],
            [K_GLOW + (0.5 * alpha) + ')',
             `rgba(196, 132, 252, ${0.85 * alpha})`,
             `rgba(255, 255, 255, ${0.95 * alpha})`]);
        ctx.restore();
    }

    // ── ④ 가장자리 윤곽선 ────────────────────────────────────────────
    ctx.strokeStyle = `rgba(233, 213, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(-halfAng) * reach, Math.sin(-halfAng) * reach);
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(halfAng) * reach, Math.sin(halfAng) * reach);
    ctx.stroke();

    // ── ⑤ 발사 지점의 섬광 ───────────────────────────────────────────
    let mg = ctx.createRadialGradient(0, 0, 4, 0, 0, 110);
    mg.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    mg.addColorStop(0.4, `rgba(233, 213, 255, ${0.7 * alpha})`);
    mg.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill();

    // ── ⑥ 날아가는 전하 입자 ─────────────────────────────────────────
    for (let s = 0; s < 20; s++) {
        let sp = ((now / 300) + s * 0.05) % 1;
        let a = -halfAng + (halfAng * 2) * ((s * 0.137) % 1);
        let sr = reach * sp;
        ctx.globalAlpha = alpha * (1 - sp) * 0.9;
        ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : ((s % 3 === 1) ? '#e9d5ff' : K_MAIN);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * sr, Math.sin(a) * sr, (9 - sp * 6) + 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡ (투사체) 번개 — 매우 빠른 한 줄기 보라 번개
// ============================================================================
registerProjectile('kashimo_bolt', (ctx, proj, state) => {
    const now = state.mathNow;
    const ang = Math.atan2(proj.vy || 0, proj.vx || (proj.team === 1 ? 1 : -1));

    RenderUtils.withRotation(ctx, proj.x, proj.y, ang, () => {
        ctx.globalCompositeOperation = 'screen';

        const TAIL = 260;
        let tail = ctx.createLinearGradient(0, -34, 0, 34);
        tail.addColorStop(0, 'rgba(168, 85, 247, 0)');
        tail.addColorStop(0.5, K_GLOW + '0.55)');
        tail.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = tail;
        ctx.fillRect(-TAIL, -34, TAIL + 90, 68);

        ctx.save();
        ctx.translate(-TAIL, 0);
        drawBoltLine(ctx, TAIL + 90, 17, 1.7, now,
            [22, 10, 4],
            [K_GLOW + '0.5)', 'rgba(196, 132, 252, 0.95)', 'rgba(255, 255, 255, 1)']);
        ctx.restore();

        let head = ctx.createRadialGradient(70, 0, 3, 70, 0, 52);
        head.addColorStop(0, 'rgba(255, 255, 255, 1)');
        head.addColorStop(0.35, 'rgba(233, 213, 255, 0.9)');
        head.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = head;
        ctx.beginPath(); ctx.arc(70, 0, 52, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.translate(70, 0);
        drawSparkBurst(ctx, 40, 6, 0.9, now, 2.1);
        ctx.restore();

        ctx.globalCompositeOperation = 'source-over';
    });
});