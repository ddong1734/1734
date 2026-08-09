// 파일명: renderer/fxdabura.js
// ============================================================================
// ⬛ 다부라 카라바 전용 이펙트 — 빛(흰빛·금빛) 과 어둠(검보라)
//
//  · dabura_strike        : 평타 (빛+어둠이 섞인 손날)
//  · dabura_light_rise    : ☀️ [빛] 위로 솟구치는 순간의 잔광
//  · dabura_light_beams   : ☀️ [빛] 시전 중 아래로 뻗는 '두 줄기 빛' (지속)
//  · dabura_light_blast   : ☀️ [빛] 0.4초마다 터지는 큰 빛 폭발
//  · dabura_dark_vortex   : 🌑 [어둠] 어둠 구체 + 칼바람 소용돌이 (지속)
//  · dabura_dark_blast    : 🌑 [어둠] 3초 뒤 구체 폭발
//  · dabura_kick_charge   : 💫 [아광속 발차기] 2초 응축
//  · dabura_kick_aura     : 💫 빛으로 변한 몸 (지속)
//  · dabura_kick_trail    : 💫 활공 잔상
//  · dabura_kick_blast    : 💫 적중 대폭발
//
//  ⬛ ■ 아이템(square) 장착 시 전부 더 크고 화려해진다.
//
//  ✅ [수정] dabura_light_beams 의 '타원 점선 예고선'을 제거했다.
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

// 🎨 공통 색상
const D_LIGHT = 'rgba(255, 250, 220, ';   // 빛
const D_GOLD  = 'rgba(255, 226, 130, ';   // 금빛
const D_DARK  = 'rgba(40, 10, 70, ';      // 어둠
const D_VIO   = 'rgba(126, 34, 206, ';    // 보라

/** 🎯 이펙트 소유자의 현재 좌표를 추적한다 */
function ownerPos(state, ownerId, fx) {
    let cx = fx.x, cy = fx.y;
    if (!ownerId) return { x: cx, y: cy, obj: null };
    let o = (ownerId === state.myId) ? state.myPlayer : state.players[ownerId];
    if (o) { cx = o.x; cy = o.y; }
    return { x: cx, y: cy, obj: o || null };
}

/** ✨ 중심에서 사방으로 뻗는 빛살 */
function drawRays(ctx, radius, count, alpha, mathNow, seed, color) {
    ctx.lineCap = 'round';
    for (let s = 0; s < count; s++) {
        let ang = (Math.PI * 2 / count) * s + mathNow / 900 + seed;
        let len = radius * (0.55 + Math.abs(Math.sin(s * 1.9 + mathNow / 260)) * 0.5);
        ctx.strokeStyle = color + (0.75 * alpha) + ')';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.stroke();
    }
}

/** 🌀 소용돌이 칼바람 한 가닥 (중심을 향해 감기는 곡선) */
function drawWindBlade(ctx, r0, r1, ang0, sweep, width, color, alpha) {
    ctx.strokeStyle = color + alpha + ')';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const SEG = 14;
    for (let i = 0; i <= SEG; i++) {
        let t = i / SEG;
        let rr = r0 + (r1 - r0) * t;
        let aa = ang0 + sweep * t;
        let xx = Math.cos(aa) * rr;
        let yy = Math.sin(aa) * rr;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
}

// ============================================================================
// ⬛ 평타 — 빛과 어둠이 섞인 손날
// ============================================================================
registerVisualFX('dabura_strike', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const dir = fx.isLeft ? -1 : 1;
    const prog = 1 - alpha;

    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.scale(dir, 1);
        ctx.translate(prog * 40, 0);

        // ── 어둠 쪽 (뒤쪽 그림자) ─────────────────────────────────────
        ctx.globalAlpha = alpha * 0.9;
        let dg = ctx.createRadialGradient(-10, 6, 4, 0, 0, 78);
        dg.addColorStop(0, D_DARK + (0.9 * alpha) + ')');
        dg.addColorStop(0.55, D_VIO + (0.45 * alpha) + ')');
        dg.addColorStop(1, 'rgba(20, 0, 40, 0)');
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(0, 0, 78, 0, Math.PI * 2); ctx.fill();

        // ── 빛 쪽 ─────────────────────────────────────────────────────
        ctx.globalCompositeOperation = 'screen';
        let lg = ctx.createRadialGradient(14, -4, 4, 10, 0, 88);
        lg.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        lg.addColorStop(0.35, D_LIGHT + (0.8 * alpha) + ')');
        lg.addColorStop(1, 'rgba(255, 226, 130, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(10, 0, 88, 0, Math.PI * 2); ctx.fill();

        // ── 손날 궤적 (초승달) ────────────────────────────────────────
        let sweep = ctx.createLinearGradient(0, 0, 110, 0);
        sweep.addColorStop(0, D_VIO + (0.85 * alpha) + ')');
        sweep.addColorStop(0.5, D_LIGHT + (0.85 * alpha) + ')');
        sweep.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sweep;
        ctx.beginPath();
        ctx.moveTo(4, -34);
        ctx.quadraticCurveTo(72, -14, 112, 0);
        ctx.quadraticCurveTo(72, 14, 4, 34);
        ctx.closePath();
        ctx.fill();

        drawRays(ctx, 70, 6, alpha, now, prog * 2, D_GOLD);

        // ── 튀는 입자 (빛 3 / 어둠 2 비율) ────────────────────────────
        for (let s = 0; s < 10; s++) {
            let a2 = (s / 10) * Math.PI * 2 + prog * 3.4;
            let rr = 26 + prog * 64;
            ctx.globalAlpha = alpha * (1 - prog * 0.6);
            ctx.fillStyle = (s % 5 < 3) ? '#fffbe0' : '#b07bff';
            ctx.beginPath();
            ctx.arc(12 + Math.cos(a2) * rr, Math.sin(a2) * rr, (6 - prog * 3.6) + 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    });
});

// ============================================================================
// ☀️ [빛] 위로 솟구치는 순간의 잔광
// ============================================================================
registerVisualFX('dabura_light_rise', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const sq = !!fx.square;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    let R = (sq ? 92 : 74) * (0.7 + (1 - alpha) * 0.5);
    let g = ctx.createRadialGradient(0, 0, 4, 0, 0, R);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.35, D_LIGHT + (0.85 * alpha) + ')');
    g.addColorStop(1, 'rgba(255, 226, 130, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.75, R * 1.5, 0, 0, Math.PI * 2); ctx.fill();

    // 아래로 늘어지는 꼬리
    let tail = ctx.createLinearGradient(0, 0, 0, R * 2.4);
    tail.addColorStop(0, D_LIGHT + (0.7 * alpha) + ')');
    tail.addColorStop(1, 'rgba(255, 226, 130, 0)');
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(-R * 0.34, 0);
    ctx.lineTo(R * 0.34, 0);
    ctx.lineTo(R * 0.1, R * 2.4);
    ctx.lineTo(-R * 0.1, R * 2.4);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ☀️ [빛] 시전 중 아래로 뻗는 '두 줄기 빛' (지속)
//    시전자 아래쪽으로 두 갈래의 굵은 빛기둥이 뻗어 나간다.
//    ✅ [수정] 아래쪽 타원 점선 예고선은 제거했다.
// ============================================================================
registerVisualFX('dabura_light_beams', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const sq = !!fx.square;

    let pos = ownerPos(state, fx.ownerId, fx);
    let owner = pos.obj;
    if (fx.ownerId && (!owner || owner.isDead || !owner.dLightActive)) { fx.active = false; return; }

    // 소유자를 계속 따라간다
    fx.x = pos.x; fx.y = pos.y;

    const R = (fx.radius !== undefined) ? fx.radius : 430;
    const DOWN = (fx.down !== undefined) ? fx.down : 200;
    const hold = (alpha > 0.9) ? ((1 - alpha) / 0.1) : (alpha < 0.12 ? (alpha / 0.12) : 1);
    const pulse = 0.78 + Math.abs(Math.sin(now / 110)) * 0.32;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = hold;

    // ── ① 시전자 몸을 감싸는 백광 ────────────────────────────────────
    let body = ctx.createRadialGradient(0, 0, 5, 0, 0, (sq ? 150 : 120) * pulse);
    body.addColorStop(0, 'rgba(255, 255, 255, 1)');
    body.addColorStop(0.35, D_LIGHT + (0.85 * hold) + ')');
    body.addColorStop(1, 'rgba(255, 226, 130, 0)');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(0, 0, (sq ? 150 : 120) * pulse, 0, Math.PI * 2); ctx.fill();

    drawRays(ctx, (sq ? 190 : 155) * pulse, sq ? 12 : 9, hold, now, 0.6, D_GOLD);

    // ── ② 아래로 뻗는 '두 줄기' 빛기둥 ──────────────────────────────
    const BEAM_LEN = (DOWN + R) * 1.25;
    const OFFS = [-1, 1];
    for (let s = 0; s < OFFS.length; s++) {
        let side = OFFS[s];
        // 살짝 벌어지며 아래로 뻗는다
        let topX = side * (sq ? 34 : 26);
        let botX = side * (sq ? 210 : 165);
        let topW = (sq ? 40 : 30);
        let botW = (sq ? 132 : 100);
        let flick = 0.72 + Math.abs(Math.sin(now / (90 + s * 37) + s)) * 0.38;

        ctx.globalAlpha = hold * flick;

        let bg = ctx.createLinearGradient(0, 0, botX, BEAM_LEN);
        bg.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        bg.addColorStop(0.25, D_LIGHT + '0.72)');
        bg.addColorStop(0.65, D_GOLD + '0.4)');
        bg.addColorStop(1, 'rgba(255, 200, 60, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(topX - topW * 0.5, 10);
        ctx.lineTo(topX + topW * 0.5, 10);
        ctx.lineTo(botX + botW * 0.5, BEAM_LEN);
        ctx.lineTo(botX - botW * 0.5, BEAM_LEN);
        ctx.closePath();
        ctx.fill();

        // 심지 (흰 코어)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * hold * flick})`;
        ctx.lineWidth = (sq ? 12 : 9);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(topX, 12);
        ctx.lineTo(botX, BEAM_LEN);
        ctx.stroke();
    }
    ctx.globalAlpha = hold;

    // ── ③ 기둥을 따라 흘러내리는 빛 입자 ────────────────────────────
    for (let s = 0; s < (sq ? 26 : 20); s++) {
        let sp = ((now / 420) + s * (1 / (sq ? 26 : 20))) % 1;
        let side = (s % 2 === 0) ? -1 : 1;
        let px = side * ((sq ? 34 : 26) + sp * ((sq ? 176 : 139)));
        let py = 12 + sp * BEAM_LEN;
        ctx.globalAlpha = hold * (1 - sp * 0.75) * 0.95;
        ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : '#fff3c4';
        ctx.beginPath();
        ctx.arc(px, py, (9 - sp * 5) + 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = hold;

    // ✅ [삭제] 폭발 예정 지점의 타원 점선 예고선을 제거했다.

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ☀️ [빛] 0.4초마다 터지는 큰 빛 폭발
// ============================================================================
registerVisualFX('dabura_light_blast', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const R = (fx.radius !== undefined) ? fx.radius : 430;
    const sq = !!fx.square;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    let rr = R * (0.5 + prog * 0.72);

    // ── ① 폭발 코어 ─────────────────────────────────────────────────
    let g = ctx.createRadialGradient(0, 0, 8, 0, 0, rr);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.2, 'rgba(255, 253, 235, 0.95)');
    g.addColorStop(0.5, D_LIGHT + (0.68 * alpha) + ')');
    g.addColorStop(0.8, D_GOLD + (0.34 * alpha) + ')');
    g.addColorStop(1, 'rgba(255, 190, 40, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();

    // ── ② 방사형 빛살 ───────────────────────────────────────────────
    drawRays(ctx, rr * 1.05, sq ? 18 : 14, alpha, now, prog * 1.6, D_GOLD);

    // ── ③ 삼중 충격 링 ──────────────────────────────────────────────
    for (let r = 0; r < 3; r++) {
        let rt = (prog + r * 0.26) % 1;
        let ra = alpha * (1 - rt) * 0.95;
        ctx.strokeStyle = (r % 2 === 0)
            ? `rgba(255, 255, 255, ${ra})`
            : D_GOLD + (ra * 0.9) + ')';
        ctx.lineWidth = (18 - r * 4) * (1 - rt) + 3;
        ctx.beginPath(); ctx.arc(0, 0, rr * (0.4 + rt * 0.95), 0, Math.PI * 2); ctx.stroke();
    }

    // ── ④ 지면을 따라 퍼지는 납작한 링 ──────────────────────────────
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 12 * alpha + 3;
    ctx.beginPath();
    ctx.ellipse(0, rr * 0.28, rr * (0.6 + prog * 0.75), rr * (0.2 + prog * 0.3), 0, 0, Math.PI * 2);
    ctx.stroke();

    // ── ⑤ 튀어 오르는 빛 파편 ───────────────────────────────────────
    for (let s = 0; s < (sq ? 22 : 16); s++) {
        let sa = s * 2.31 + prog * 2.1;
        let sr = rr * (0.28 + prog * 1.02);
        ctx.globalAlpha = alpha * (1 - prog * 0.72);
        ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : ((s % 3 === 1) ? '#fff3c4' : '#ffe27f');
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.82 - prog * 46, 11 - prog * 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── ⑥ 중심 백광 ─────────────────────────────────────────────────
    ctx.globalAlpha = alpha;
    let cc = ctx.createRadialGradient(0, 0, 2, 0, 0, rr * 0.3);
    cc.addColorStop(0, `rgba(255, 255, 255, ${0.98 * alpha})`);
    cc.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = cc;
    ctx.beginPath(); ctx.arc(0, 0, rr * 0.3, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// 🌑 [어둠] 어둠 구체 + 칼바람 소용돌이 (지속)
//    몸 중심에 새까만 구체가 있고,
//    그 구체를 중심으로 사방에서 칼바람이 휘몰아친다.
// ============================================================================
registerVisualFX('dabura_dark_vortex', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const sq = !!fx.square;

    let pos = ownerPos(state, fx.ownerId, fx);
    let owner = pos.obj;
    if (fx.ownerId && (!owner || owner.isDead || !owner.dDarkActive)) { fx.active = false; return; }

    fx.x = pos.x; fx.y = pos.y;

    const R = (fx.radius !== undefined) ? fx.radius : 900;
    const CORE = (fx.coreR !== undefined) ? fx.coreR : 78;
    const hold = (alpha > 0.9) ? ((1 - alpha) / 0.1) : (alpha < 0.14 ? (alpha / 0.14) : 1);
    const spin = now / 260;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.globalAlpha = hold;

    // ── ① 소용돌이 전체를 덮는 어두운 장막 ──────────────────────────
    let veil = ctx.createRadialGradient(0, 0, CORE * 0.4, 0, 0, R);
    veil.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
    veil.addColorStop(0.28, 'rgba(12, 4, 26, 0.55)');
    veil.addColorStop(0.62, 'rgba(30, 10, 60, 0.3)');
    veil.addColorStop(1, 'rgba(20, 0, 45, 0)');
    ctx.fillStyle = veil;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    // ── ② 칼바람 (중심을 향해 감기는 날카로운 곡선 다발) ────────────
    const BLADES = sq ? 26 : 20;
    for (let b = 0; b < BLADES; b++) {
        let t = b / BLADES;
        let ang0 = t * Math.PI * 2 + spin * (1 + (b % 3) * 0.14);
        let r0 = R * (0.32 + (b % 5) * 0.13);
        let r1 = CORE * 1.1;
        let sweep = -1.5 - (b % 4) * 0.3;
        let flick = 0.4 + Math.abs(Math.sin(b * 1.7 + now / 150)) * 0.6;

        // 두꺼운 검은 심지
        drawWindBlade(ctx, r0, r1, ang0, sweep, (sq ? 15 : 12), 'rgba(3, 0, 8, ', hold * flick * 0.95);
        // 보랏빛 하이라이트
        drawWindBlade(ctx, r0, r1, ang0 + 0.05, sweep, (sq ? 6 : 4.5), 'rgba(176, 122, 255, ', hold * flick * 0.9);
        // 흰 예리한 선 (칼바람 느낌)
        drawWindBlade(ctx, r0 * 0.94, r1, ang0 - 0.03, sweep, 1.8, 'rgba(255, 255, 255, ', hold * flick * 0.75);
    }

    // ── ③ 구 형태를 드러내는 동심 링 ────────────────────────────────
    ctx.globalCompositeOperation = 'screen';
    for (let r = 0; r < 4; r++) {
        let rt = ((now / 900) + r * 0.25) % 1;
        let rr = R * (0.28 + rt * 0.78);
        ctx.strokeStyle = `rgba(150, 90, 245, ${hold * (1 - rt) * 0.55})`;
        ctx.lineWidth = (12 - r * 2) * (1 - rt) + 2;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    }
    // 바깥 경계선 (구의 윤곽)
    ctx.strokeStyle = `rgba(190, 130, 255, ${hold * (0.45 + Math.abs(Math.sin(now / 260)) * 0.4)})`;
    ctx.lineWidth = 7;
    ctx.setLineDash([26, 18]);
    ctx.lineDashOffset = -now / 18;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.98, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'source-over';

    // ── ④ 빨려 들어가는 파편 ────────────────────────────────────────
    for (let s = 0; s < (sq ? 34 : 26); s++) {
        let sp = ((now / 620) + s * (1 / (sq ? 34 : 26))) % 1;
        // sp=0 → 바깥, sp=1 → 중심
        let sr = R * (1 - sp) * 0.95 + CORE * 0.6;
        let sa = s * 2.13 + spin * 2.2 + sp * 2.4;
        ctx.globalAlpha = hold * (0.25 + sp * 0.75);
        ctx.fillStyle = (s % 4 === 0) ? '#d8b4fe' : ((s % 4 === 1) ? '#7e22ce' : '#1a0430');
        let sz = 3 + (1 - sp) * 7;
        ctx.beginPath();
        ctx.ellipse(Math.cos(sa) * sr, Math.sin(sa) * sr, sz * 1.6, sz * 0.5, sa, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = hold;

    // ── ⑤ 중심 어둠 구체 (일렁인다) ─────────────────────────────────
    const LOBES = 15;
    ctx.beginPath();
    for (let i = 0; i <= LOBES; i++) {
        let a = (Math.PI * 2 / LOBES) * i;
        let wob = 1
            + Math.sin(a * 3 + now / 120) * 0.14
            + Math.sin(a * 5 - now / 190) * 0.1
            + Math.sin(a * 8 + now / 80) * 0.05;
        let rr = CORE * wob;
        let xx = Math.cos(a) * rr, yy = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.closePath();
    let core = ctx.createRadialGradient(-CORE * 0.18, -CORE * 0.18, CORE * 0.06, 0, 0, CORE * 1.1);
    core.addColorStop(0, '#2a0a4a');
    core.addColorStop(0.35, '#0d0018');
    core.addColorStop(1, '#000000');
    ctx.fillStyle = core;
    ctx.fill();

    // 구체를 감싸는 보랏빛 윤곽
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(168, 85, 247, ${hold * (0.6 + Math.abs(Math.sin(now / 130)) * 0.4)})`;
    ctx.lineWidth = 5;
    ctx.stroke();

    // 구체에서 뻗어 나오는 짧은 검은 촉수
    for (let s = 0; s < 8; s++) {
        let sa = (Math.PI * 2 / 8) * s + spin * 1.6;
        let sl = CORE * (1.2 + Math.abs(Math.sin(s * 2.1 + now / 170)) * 0.9);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(4, 0, 10, ${hold * 0.9})`;
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * CORE * 0.6, Math.sin(sa) * CORE * 0.6);
        ctx.quadraticCurveTo(
            Math.cos(sa + 0.4) * sl * 0.8, Math.sin(sa + 0.4) * sl * 0.8,
            Math.cos(sa + 0.15) * sl, Math.sin(sa + 0.15) * sl
        );
        ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.globalAlpha = 1;
    ctx.restore();
});

// ============================================================================
// 🌑 [어둠] 3초 뒤 구체 폭발
// ============================================================================
registerVisualFX('dabura_dark_blast', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const R = (fx.radius !== undefined) ? fx.radius : 520;
    const sq = !!fx.square;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalAlpha = alpha;

    let rr = R * (0.42 + prog * 0.82);

    // ── ① 어둠이 폭발적으로 퍼진다 ──────────────────────────────────
    let g = ctx.createRadialGradient(0, 0, 6, 0, 0, rr);
    g.addColorStop(0, 'rgba(255, 255, 255, ' + (0.9 * alpha) + ')');
    g.addColorStop(0.14, 'rgba(200, 150, 255, ' + (0.85 * alpha) + ')');
    g.addColorStop(0.4, 'rgba(60, 15, 120, ' + (0.8 * alpha) + ')');
    g.addColorStop(0.75, 'rgba(10, 0, 25, ' + (0.6 * alpha) + ')');
    g.addColorStop(1, 'rgba(10, 0, 25, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();

    // ── ② 검은 파편이 사방으로 튄다 ────────────────────────────────
    for (let s = 0; s < (sq ? 26 : 20); s++) {
        let sa = s * 2.19 + prog * 1.4;
        let sr = rr * (0.35 + prog * 0.95);
        ctx.globalAlpha = alpha * (1 - prog * 0.6);
        ctx.fillStyle = (s % 4 === 0) ? '#d8b4fe' : ((s % 4 === 1) ? '#7e22ce' : '#0a0016');
        let sz = 13 - prog * 7;
        ctx.beginPath();
        ctx.ellipse(Math.cos(sa) * sr, Math.sin(sa) * sr, sz * 1.7, sz * 0.65, sa, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = alpha;

    // ── ③ 충격 링 ───────────────────────────────────────────────────
    ctx.globalCompositeOperation = 'screen';
    for (let r = 0; r < 3; r++) {
        let rt = (prog + r * 0.24) % 1;
        let ra = alpha * (1 - rt) * 0.95;
        ctx.strokeStyle = (r === 1)
            ? `rgba(255, 255, 255, ${ra})`
            : `rgba(168, 85, 247, ${ra})`;
        ctx.lineWidth = (20 - r * 5) * (1 - rt) + 3;
        ctx.beginPath(); ctx.arc(0, 0, rr * (0.42 + rt * 0.95), 0, Math.PI * 2); ctx.stroke();
    }

    // ── ④ 방사형 어둠 창 ────────────────────────────────────────────
    ctx.lineCap = 'round';
    for (let s = 0; s < (sq ? 16 : 12); s++) {
        let a2 = (Math.PI * 2 / (sq ? 16 : 12)) * s + prog * 0.8;
        let r1 = rr * 0.16;
        let r2 = rr * (0.9 + prog * 0.5);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(3, 0, 8, ${alpha * 0.9})`;
        ctx.lineWidth = 16 * alpha + 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a2) * r1, Math.sin(a2) * r1);
        ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        ctx.stroke();
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = `rgba(200, 150, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 5 * alpha + 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a2) * r1, Math.sin(a2) * r1);
        ctx.lineTo(Math.cos(a2) * r2 * 1.12, Math.sin(a2) * r2 * 1.12);
        ctx.stroke();
    }

    // ── ⑤ 중심 백광 (구체가 터지는 순간) ────────────────────────────
    let cc = ctx.createRadialGradient(0, 0, 2, 0, 0, rr * 0.28);
    cc.addColorStop(0, `rgba(255, 255, 255, ${0.95 * alpha})`);
    cc.addColorStop(0.5, `rgba(216, 180, 254, ${0.6 * alpha})`);
    cc.addColorStop(1, 'rgba(126, 34, 206, 0)');
    ctx.fillStyle = cc;
    ctx.beginPath(); ctx.arc(0, 0, rr * 0.28, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// 💫 [아광속 발차기] 2초 응축
// ============================================================================
registerVisualFX('dabura_kick_charge', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const sq = !!fx.square;

    let pos = ownerPos(state, fx.ownerId, fx);
    let owner = pos.obj;
    if (fx.ownerId && (!owner || owner.isDead)) { fx.active = false; return; }
    fx.x = pos.x; fx.y = pos.y;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    // ── ① 점점 강해지는 백광 ────────────────────────────────────────
    let R = (sq ? 70 : 55) + prog * (sq ? 110 : 85);
    let g = ctx.createRadialGradient(0, 0, 4, 0, 0, R);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.3, D_LIGHT + (0.9 * alpha) + ')');
    g.addColorStop(0.72, D_GOLD + (0.5 * alpha) + ')');
    g.addColorStop(1, 'rgba(255, 190, 40, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    // ── ② 밖에서 안으로 빨려드는 빛 입자 ───────────────────────────
    for (let s = 0; s < (sq ? 24 : 18); s++) {
        let sp = ((now / 300) + s * (1 / (sq ? 24 : 18))) % 1;
        let sa = s * 2.11 + now / 210;
        let sr = R * (2.6 - sp * 2.1);
        ctx.globalAlpha = alpha * sp * 0.95;
        ctx.fillStyle = (s % 2 === 0) ? '#ffffff' : '#ffe27f';
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.9, 6 * sp + 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = alpha;

    // ── ③ 수축하는 예고 링 ──────────────────────────────────────────
    for (let r = 0; r < 3; r++) {
        let rt = ((now / 520) + r * 0.333) % 1;
        let rr = R * (2.6 - rt * 2.0);
        ctx.strokeStyle = (r % 2 === 0)
            ? `rgba(255, 255, 255, ${alpha * rt * 0.9})`
            : D_GOLD + (alpha * rt * 0.8) + ')';
        ctx.lineWidth = 8 * rt + 2;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    }

    // ── ④ 발밑에서 솟아오르는 빛기둥 (응축이 끝날수록 강해진다) ────
    let colH = (sq ? 260 : 200) * (0.3 + prog * 0.9);
    let col = ctx.createLinearGradient(0, 40, 0, -colH);
    col.addColorStop(0, D_LIGHT + (0.85 * alpha) + ')');
    col.addColorStop(0.5, D_GOLD + (0.45 * alpha) + ')');
    col.addColorStop(1, 'rgba(255, 200, 60, 0)');
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-30, 40);
    ctx.lineTo(30, 40);
    ctx.lineTo(14, -colH);
    ctx.lineTo(-14, -colH);
    ctx.closePath();
    ctx.fill();

    drawRays(ctx, R * 1.1, sq ? 12 : 9, alpha * (0.4 + prog * 0.6), now, 1.7, D_GOLD);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// 💫 [아광속 발차기] 빛으로 변한 몸 (지속 오라)
// ============================================================================
registerVisualFX('dabura_kick_aura', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const sq = !!fx.square;

    let pos = ownerPos(state, fx.ownerId, fx);
    let owner = pos.obj;
    if (fx.ownerId && (!owner || owner.isDead || !owner.dKickFlying)) { fx.active = false; return; }

    // 지속 유지 (매 프레임 수명 갱신)
    fx.life = fx.maxLife;
    if (fx.endAt) fx.endAt = now + (fx.durationMs || 1000);
    fx.x = pos.x; fx.y = pos.y;

    const facing = owner ? ((owner.lastFacing === -1) ? -1 : 1) : 1;
    const R = sq ? 78 : 62;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.globalCompositeOperation = 'screen';

    // ── ① 강렬한 백광 후광 ──────────────────────────────────────────
    let pulse = 1 + Math.sin(now / 70) * 0.16;
    let aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 2.4 * pulse);
    aura.addColorStop(0, 'rgba(255, 255, 255, 1)');
    aura.addColorStop(0.28, D_LIGHT + '0.9)');
    aura.addColorStop(0.62, D_GOLD + '0.55)');
    aura.addColorStop(1, 'rgba(255, 190, 40, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, R * 2.4 * pulse, 0, Math.PI * 2); ctx.fill();

    // ── ② 진행 방향으로 늘어난 유선형 몸체 ─────────────────────────
    ctx.save();
    ctx.scale(facing, 1);
    let body = ctx.createLinearGradient(-R * 2.2, 0, R * 1.1, 0);
    body.addColorStop(0, 'rgba(255, 200, 60, 0)');
    body.addColorStop(0.4, D_GOLD + '0.65)');
    body.addColorStop(0.8, D_LIGHT + '0.95)');
    body.addColorStop(1, 'rgba(255, 255, 255, 1)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(R * 1.05, 0);
    ctx.quadraticCurveTo(R * 0.2, -R * 0.95, -R * 2.2, -R * 0.28);
    ctx.quadraticCurveTo(-R * 2.6, 0, -R * 2.2, R * 0.28);
    ctx.quadraticCurveTo(R * 0.2, R * 0.95, R * 1.05, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ── ③ 방사형 빛살 ───────────────────────────────────────────────
    drawRays(ctx, R * 2.0, sq ? 14 : 10, 1.0, now, 0.4, D_GOLD);

    // ── ④ 회전하는 링 ───────────────────────────────────────────────
    for (let r = 0; r < 3; r++) {
        let rt = ((now / 620) + r * 0.333) % 1;
        let rr = R * (0.8 + rt * 1.5);
        ctx.strokeStyle = (r % 2 === 0)
            ? `rgba(255, 255, 255, ${(1 - rt) * 0.85})`
            : D_GOLD + ((1 - rt) * 0.8) + ')';
        ctx.lineWidth = (10 - r * 2) * (1 - rt) + 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, rr, rr * 0.6, Math.sin(now / 380 + r) * 0.6, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── ⑤ 흩날리는 빛 파편 ──────────────────────────────────────────
    for (let s = 0; s < (sq ? 18 : 13); s++) {
        let sp = ((now / 430) + s * (1 / (sq ? 18 : 13))) % 1;
        let sa = s * 2.27 + now / 240;
        let sr = R * (0.7 + sp * 1.6);
        ctx.globalAlpha = (1 - sp) * 0.95;
        ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : ((s % 3 === 1) ? '#fff3c4' : '#ffe27f');
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr - facing * sp * 60, Math.sin(sa) * sr * 0.85, (8 - sp * 5) + 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── ⑥ 중심 백광 코어 ────────────────────────────────────────────
    let corePulse = 1 + Math.sin(now / 48) * 0.22;
    let cc = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.55 * corePulse);
    cc.addColorStop(0, 'rgba(255, 255, 255, 1)');
    cc.addColorStop(0.6, D_LIGHT + '0.7)');
    cc.addColorStop(1, 'rgba(255, 226, 130, 0)');
    ctx.fillStyle = cc;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.55 * corePulse, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// 💫 [아광속 발차기] 활공 잔상
// ============================================================================
registerVisualFX('dabura_kick_trail', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const sq = !!fx.square;
    const R = (sq ? 58 : 46) * (1 + prog * 0.35);

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha * 0.92;

    let g = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 1.7);
    g.addColorStop(0, `rgba(255, 255, 255, ${0.85 * alpha})`);
    g.addColorStop(0.3, D_LIGHT + (0.6 * alpha) + ')');
    g.addColorStop(0.68, D_GOLD + (0.32 * alpha) + ')');
    g.addColorStop(1, 'rgba(255, 190, 40, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.7, 0, Math.PI * 2); ctx.fill();

    // 짧은 빛살
    ctx.lineCap = 'round';
    for (let s = 0; s < 6; s++) {
        let a = (Math.PI * 2 / 6) * s + now / 320 + (fx.x % 7);
        let len = R * (0.7 + Math.abs(Math.sin(s * 1.8 + now / 140)) * 0.6);
        ctx.strokeStyle = D_GOLD + (0.6 * alpha) + ')';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * alpha})`;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// 💫 [아광속 발차기] 적중 대폭발
// ============================================================================
registerVisualFX('dabura_kick_blast', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;
    const R = (fx.radius !== undefined) ? fx.radius : 380;
    const sq = !!fx.square;

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    let rr = R * (0.4 + prog * 0.92);

    // ── ① 눈부신 폭발 코어 ──────────────────────────────────────────
    let g = ctx.createRadialGradient(0, 0, 8, 0, 0, rr);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.16, 'rgba(255, 255, 245, 0.98)');
    g.addColorStop(0.45, D_LIGHT + (0.75 * alpha) + ')');
    g.addColorStop(0.78, D_GOLD + (0.4 * alpha) + ')');
    g.addColorStop(1, 'rgba(255, 180, 30, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();

    // ── ② 강렬한 방사형 빛살 (십자 강조) ────────────────────────────
    drawRays(ctx, rr * 1.15, sq ? 22 : 16, alpha, now, prog * 2.4, D_GOLD);

    ctx.lineCap = 'round';
    for (let s = 0; s < 4; s++) {
        let a2 = (Math.PI / 2) * s + prog * 0.4;
        let r2 = rr * (1.5 + prog * 0.8);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
        ctx.lineWidth = 22 * alpha + 4;
        ctx.beginPath();
        ctx.moveTo(-Math.cos(a2) * r2, -Math.sin(a2) * r2);
        ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        ctx.stroke();
    }

    // ── ③ 사중 충격 링 ──────────────────────────────────────────────
    for (let r = 0; r < 4; r++) {
        let rt = (prog + r * 0.22) % 1;
        let ra = alpha * (1 - rt) * 0.95;
        ctx.strokeStyle = (r % 2 === 0)
            ? `rgba(255, 255, 255, ${ra})`
            : D_GOLD + (ra * 0.9) + ')';
        ctx.lineWidth = (22 - r * 4) * (1 - rt) + 3;
        ctx.beginPath(); ctx.arc(0, 0, rr * (0.35 + rt * 1.0), 0, Math.PI * 2); ctx.stroke();
    }

    // ── ④ 튀어 오르는 빛 파편 ───────────────────────────────────────
    for (let s = 0; s < (sq ? 28 : 20); s++) {
        let sa = s * 2.27 + prog * 2.6;
        let sr = rr * (0.25 + prog * 1.08);
        ctx.globalAlpha = alpha * (1 - prog * 0.7);
        ctx.fillStyle = (s % 3 === 0) ? '#ffffff' : ((s % 3 === 1) ? '#fff3c4' : '#ffe27f');
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr * 0.85 - prog * 56, 13 - prog * 8, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = alpha;

    // ── ⑤ 중심 백광 ─────────────────────────────────────────────────
    let cc = ctx.createRadialGradient(0, 0, 2, 0, 0, rr * 0.34);
    cc.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    cc.addColorStop(0.55, `rgba(255, 250, 220, ${0.7 * alpha})`);
    cc.addColorStop(1, 'rgba(255, 226, 130, 0)');
    ctx.fillStyle = cc;
    ctx.beginPath(); ctx.arc(0, 0, rr * 0.34, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});