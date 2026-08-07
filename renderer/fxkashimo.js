// 파일명: renderer/fxkashimo.js
// ============================================================================
// ⚡ 카시모 하지메 전용 이펙트 모음 — 전부 보라색(#a855f7) 계열로 통일한다.
//
//  · kashimo_strike     : 평타 타격 — 보랏빛 전격이 터지는 근접 일격
//  · kashimo_counter    : 반격 전류 — 카시모를 때린 대상의 몸에 작은 전류가 흐른다
//                          (플레이어 · 오크라 모두 추적한다)
//  · kashimo_bolt_cast  : 1번 스킬 시전 순간 총구 섬광
//  · kashimo_bolt_hit   : 번개가 대상에 적중한 자리의 전격
//  · kashimo_sky_bolt   : 대기를 가르는 번개
//                          ✅ [수정] 하늘이 아니라 '시전자의 몸속'에서 번개가 뻗어 나간다
//  · kashimo_surge      : ✅ [신규] 주력 방출 — 위로 솟구치는 보랏빛 에너지 기둥 (4초)
//  · (투사체) kashimo_bolt : 매우 빠른 한 줄기 보라 번개
// ============================================================================

import { registerVisualFX, registerProjectile } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

// 🟣 공통 색상
const K_CORE   = 'rgba(255, 255, 255, 1)';
const K_MAIN   = 'rgba(196, 132, 252, 1)';   // 밝은 보라
const K_DEEP   = 'rgba(126, 34, 206, 1)';    // 진한 보라
const K_GLOW   = 'rgba(168, 85, 247, ';      // 알파를 이어 붙여 쓴다

/**
 * ⚡ 지그재그 번개 한 가닥을 그린다.
 *    (0,0) 에서 length 만큼 +x 방향으로 뻗는다. 호출 전에 회전을 걸어 둘 것.
 */
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

/** 🎯 종류별 대상 좌표를 추적한다 (플레이어 · 몬스터 · 보스 · 오크라 공통) */
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
// ⚡ 평타 타격 — 보랏빛 전격이 터지는 근접 일격
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

        // 🟣 중심 후광
        let aura = ctx.createRadialGradient(0, 0, 6, 0, 0, 86);
        aura.addColorStop(0, 'rgba(245, 230, 255, 0.95)');
        aura.addColorStop(0.35, K_GLOW + '0.65)');
        aura.addColorStop(1, 'rgba(88, 20, 160, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(0, 0, 86, 0, Math.PI * 2); ctx.fill();

        // ⚡ 전방으로 뻗는 전격 부채꼴
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

        // ⚡ 튀는 전격 가지
        drawSparkBurst(ctx, 74, 7, alpha, now, prog * 2);

        // 🤍 코어
        ctx.globalCompositeOperation = 'source-over';
        let core = ctx.createRadialGradient(10, -4, 4, 14, 0, 26);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.4, '#e9d5ff');
        core.addColorStop(0.8, '#7e22ce');
        core.addColorStop(1, '#2e0850');
        ctx.globalAlpha = alpha;
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(14, 0, 24, 0, Math.PI * 2); ctx.fill();

        // ✨ 흩날리는 전하 입자
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
// 🔌 반격 전류 — 카시모를 때린 대상의 몸에 작은 전류가 흐른다
//    ✅ [수정] 플레이어뿐 아니라 오크라 등 몬스터도 추적한다.
// ============================================================================
registerVisualFX('kashimo_counter', (ctx, fx, alpha, state) => {
    const now = state.mathNow;

    // 대상 좌표 추적 (targetKind 가 없으면 플레이어로 간주)
    let pos = traceTarget(state, fx.targetKind, fx.targetId, fx.x, fx.y);
    let cx = pos.x, cy = pos.y;

    const R = 56;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha;

    // 🟣 몸을 감싸는 옅은 보랏빛 감전 후광
    let g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.5);
    g.addColorStop(0, K_GLOW + (0.45 * alpha) + ')');
    g.addColorStop(0.6, K_GLOW + (0.22 * alpha) + ')');
    g.addColorStop(1, 'rgba(80, 10, 150, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, Math.PI * 2); ctx.fill();

    // ⚡ 몸을 타고 흐르는 작은 전류 (짧은 지그재그 4가닥)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let b = 0; b < 4; b++) {
        let baseAng = (Math.PI * 2 / 4) * b + now / 150;
        let len = R * (0.7 + Math.abs(Math.sin(b * 1.9 + now / 90)) * 0.5);

        ctx.save();
        ctx.rotate(baseAng);
        drawBoltLine(
            ctx, len, 9, b * 2.3, now,
            [6, 2],
            [K_GLOW + (0.85 * alpha) + ')', `rgba(255, 255, 255, ${0.95 * alpha})`]
        );
        ctx.restore();
    }

    // ✨ 튀는 작은 스파크
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
// ⚡ 1번 스킬 시전 순간 — 시전자 앞에서 터지는 보랏빛 섬광
// ============================================================================
registerVisualFX('kashimo_bolt_cast', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const dir = (fx.dir === -1) ? -1 : 1;
    const prog = 1 - alpha;

    // 시전자를 따라간다
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

    // 확산하는 링
    ctx.strokeStyle = K_GLOW + (alpha * 0.85) + ')';
    ctx.lineWidth = 9 * alpha + 2;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.4 + prog * 0.7), 0, Math.PI * 2); ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
});

// ============================================================================
// ⚡ 번개 적중 — 맞은 자리에서 터지는 보라 전격
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

    // 이중 충격 링
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 10 * alpha + 2;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.35 + prog * 0.7), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = K_GLOW + (alpha * 0.8) + ')';
    ctx.lineWidth = 5 * alpha + 1;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.55 + prog * 0.85), 0, Math.PI * 2); ctx.stroke();

    // 튀는 파편
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
// ⚡✨ 대기를 가르는 번개
//    ✅ [수정] 하늘이 아니라 '시전자의 몸속'에서 번개가 터져 나와
//             대상까지 대기를 가르며 뻗어 나간다.
//    fx.ownerId 로 시전자를, targetKind/targetId 로 대상을 매 프레임 추적한다.
// ============================================================================
registerVisualFX('kashimo_sky_bolt', (ctx, fx, alpha, state) => {
    const now = state.mathNow;
    const prog = 1 - alpha;

    // ── 시전자(발사 지점) 추적 ────────────────────────────────────────
    let ox = (fx.x2 !== undefined) ? fx.x2 : fx.x;
    let oy = (fx.y2 !== undefined) ? fx.y2 : fx.y;
    if (fx.ownerId) {
        let o = (fx.ownerId === state.myId) ? state.myPlayer : state.players[fx.ownerId];
        if (o) { ox = o.x; oy = o.y; }
    }

    // ── 대상 좌표 추적 ────────────────────────────────────────────────
    let pos = traceTarget(state, fx.targetKind || 'player', fx.targetId, fx.x, fx.y);
    let tx = pos.x, ty = pos.y;

    let dx = tx - ox, dy = ty - oy;
    let dist = Math.hypot(dx, dy);
    let ang = Math.atan2(dy, dx);

    // 앞 25% 구간에서 번개가 시전자 몸에서 터져 나와 대상까지 도달한다
    const strikeT = Math.min(1, prog / 0.25);

    ctx.save();

    // ── ① 시전자의 몸속에서 터져 나오는 발광 코어 ────────────────────
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

    // 몸 주변에서 사방으로 터지는 전격
    ctx.save();
    ctx.translate(ox, oy);
    drawSparkBurst(ctx, bodyR * 0.85, 12, alpha, now, 1.9);
    ctx.restore();

    // ── ② 몸에서 대상까지 뻗어 나가는 굵은 번개 다발 ─────────────────
    if (dist > 4) {
        let reach = dist * strikeT;

        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(ang);

        // 진행 경로를 감싸는 보랏빛 통로
        let path = ctx.createLinearGradient(0, -90, 0, 90);
        path.addColorStop(0, 'rgba(168, 85, 247, 0)');
        path.addColorStop(0.5, K_GLOW + (0.35 * alpha) + ')');
        path.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = path;
        ctx.fillRect(0, -90, reach, 180);

        // ⚡ 굵은 번개 3가닥 (서로 다른 진폭)
        for (let b = 0; b < 3; b++) {
            let amp = 44 - b * 12;
            drawBoltLine(
                ctx, reach, amp, b * 3.1, now,
                [26 - b * 6, 11 - b * 3, 4],
                [
                    K_GLOW + (0.55 * alpha) + ')',
                    `rgba(196, 132, 252, ${0.9 * alpha})`,
                    `rgba(255, 255, 255, ${0.98 * alpha})`
                ]
            );
        }

        // 번개 선단의 섬광
        let tipG = ctx.createRadialGradient(reach, 0, 4, reach, 0, 70);
        tipG.addColorStop(0, 'rgba(255, 255, 255, 1)');
        tipG.addColorStop(0.4, 'rgba(233, 213, 255, 0.85)');
        tipG.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = tipG;
        ctx.beginPath(); ctx.arc(reach, 0, 70, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    // ── ③ 대상 지점의 폭발 (번개가 도달한 뒤) ────────────────────────
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

        // 다중 충격 링 (3겹)
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

        // 방사형 섬광 창
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

        // 튀어 오르는 전하 파편
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

        // 중심 백광 코어
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
// ⚡🌋 [신규] 주력 방출 — 위로 솟구치는 보랏빛 에너지 기둥 (4초)
//    · 시전자를 매 프레임 따라간다
//    · 굵은 에너지 기둥 + 그 주위를 감아 도는 여러 보라 번개 줄기
//    · 발밑에서 퍼지는 충격 링과 위로 치솟는 입자
// ============================================================================
registerVisualFX('kashimo_surge', (ctx, fx, alpha, state) => {
    const now = state.mathNow;

    // ── 시전자 추적 ───────────────────────────────────────────────────
    let cx = fx.x, cy = fx.y;
    let owner = null;
    if (fx.ownerId) {
        owner = (fx.ownerId === state.myId) ? state.myPlayer : state.players[fx.ownerId];
        if (owner) { cx = owner.x; cy = owner.y; }
    }
    // 시전자가 사라졌거나 죽으면 즉시 종료
    if (fx.ownerId && (!owner || owner.isDead)) { fx.active = false; return; }

    const HALF_W = (fx.radius !== undefined) ? (fx.radius / 2) : 180;   // 좌우 반폭
    const H      = (fx.arc !== undefined) ? fx.arc : 900;               // 위로 뻗는 높이
    // 시작 0.25초 · 종료 0.25초에 부드럽게 나타나고 사라진다
    const hold = (alpha > 0.94) ? ((1 - alpha) / 0.06) : (alpha < 0.08 ? (alpha / 0.08) : 1);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'screen';

    // ── ① 바닥에서 위로 솟는 거대한 에너지 기둥 ──────────────────────
    ctx.globalAlpha = hold;
    let col = ctx.createLinearGradient(0, 40, 0, -H);
    col.addColorStop(0, K_GLOW + (0.85 * hold) + ')');
    col.addColorStop(0.15, 'rgba(233, 213, 255, ' + (0.7 * hold) + ')');
    col.addColorStop(0.45, K_GLOW + (0.45 * hold) + ')');
    col.addColorStop(0.8, 'rgba(126, 34, 206, ' + (0.22 * hold) + ')');
    col.addColorStop(1, 'rgba(126, 34, 206, 0)');
    ctx.fillStyle = col;
    // 위로 갈수록 살짝 벌어지는 사다리꼴
    ctx.beginPath();
    ctx.moveTo(-HALF_W * 0.62, 40);
    ctx.lineTo(HALF_W * 0.62, 40);
    ctx.lineTo(HALF_W, -H);
    ctx.lineTo(-HALF_W, -H);
    ctx.closePath();
    ctx.fill();

    // ── ② 기둥 중심의 하얀 심지 (맥동) ───────────────────────────────
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

    // ── ③ 기둥을 감아 도는 여러 보라 번개 줄기 ───────────────────────
    const STRANDS = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let s = 0; s < STRANDS; s++) {
        // 각 줄기는 서로 다른 위상 · 속도로 나선을 그리며 위로 올라간다
        let phase = now / (95 + s * 22) + s * 1.37;
        let side  = (s % 2 === 0) ? 1 : -1;
        let amp   = HALF_W * (0.35 + (s % 3) * 0.18);
        let topY  = -H * (0.55 + ((s * 37) % 45) / 100);

        const SEG = 12;
        const pts = [];
        for (let q = 0; q <= SEG; q++) {
            let t = q / SEG;
            let yy = 40 + (topY - 40) * t;
            // 나선 + 지그재그 흔들림
            let xx = Math.sin(t * 5.5 + phase) * amp * side * (0.35 + t * 0.8)
                   + (Math.random() - 0.5) * 16 * t;
            pts.push({ x: xx, y: yy });
        }

        // 바깥 보라 글로우
        ctx.globalAlpha = hold * (0.55 + Math.abs(Math.sin(phase)) * 0.45);
        ctx.strokeStyle = K_GLOW + '0.85)';
        ctx.lineWidth = 15;
        ctx.beginPath();
        for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
        ctx.stroke();

        // 중간 밝은 보라
        ctx.strokeStyle = 'rgba(196, 132, 252, 0.95)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
        ctx.stroke();

        // 하얀 심지
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let q = 0; q <= SEG; q++) { if (q === 0) ctx.moveTo(pts[q].x, pts[q].y); else ctx.lineTo(pts[q].x, pts[q].y); }
        ctx.stroke();
    }
    ctx.globalAlpha = hold;

    // ── ④ 시전자 몸을 감싸는 전격 오라 ───────────────────────────────
    let auraPulse = 1 + Math.sin(now / 80) * 0.16;
    let auraR = 105 * auraPulse;
    let aura = ctx.createRadialGradient(0, 0, 10, 0, 0, auraR);
    aura.addColorStop(0, `rgba(255, 255, 255, ${0.85 * hold})`);
    aura.addColorStop(0.35, K_GLOW + (0.6 * hold) + ')');
    aura.addColorStop(1, 'rgba(88, 20, 160, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();

    drawSparkBurst(ctx, auraR * 0.9, 9, hold, now, 0.7);

    // ── ⑤ 발밑에서 퍼지는 충격 링 (3겹) ──────────────────────────────
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

    // ── ⑥ 위로 치솟는 전하 입자 ──────────────────────────────────────
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

    // ── ⑦ 기둥 꼭대기에서 흩어지는 섬광 ──────────────────────────────
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
// ⚡ (투사체) 번개 — 매우 빠른 한 줄기 보라 번개
// ============================================================================
registerProjectile('kashimo_bolt', (ctx, proj, state) => {
    const now = state.mathNow;
    const ang = Math.atan2(proj.vy || 0, proj.vx || (proj.team === 1 ? 1 : -1));

    RenderUtils.withRotation(ctx, proj.x, proj.y, ang, () => {
        ctx.globalCompositeOperation = 'screen';

        // 🟣 진행 방향 뒤로 길게 끌리는 잔광
        const TAIL = 260;
        let tail = ctx.createLinearGradient(0, -34, 0, 34);
        tail.addColorStop(0, 'rgba(168, 85, 247, 0)');
        tail.addColorStop(0.5, K_GLOW + '0.55)');
        tail.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = tail;
        ctx.fillRect(-TAIL, -34, TAIL + 90, 68);

        // ⚡ 지그재그 본체 (3겹 : 후광 → 보라 → 흰 심지)
        ctx.save();
        ctx.translate(-TAIL, 0);
        drawBoltLine(
            ctx, TAIL + 90, 17, 1.7, now,
            [22, 10, 4],
            [
                K_GLOW + '0.5)',
                'rgba(196, 132, 252, 0.95)',
                'rgba(255, 255, 255, 1)'
            ]
        );
        ctx.restore();

        // ✨ 선두 섬광
        let head = ctx.createRadialGradient(70, 0, 3, 70, 0, 52);
        head.addColorStop(0, 'rgba(255, 255, 255, 1)');
        head.addColorStop(0.35, 'rgba(233, 213, 255, 0.9)');
        head.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = head;
        ctx.beginPath(); ctx.arc(70, 0, 52, 0, Math.PI * 2); ctx.fill();

        // ⚡ 선두에서 튀는 짧은 가지
        ctx.save();
        ctx.translate(70, 0);
        drawSparkBurst(ctx, 40, 6, 0.9, now, 2.1);
        ctx.restore();

        ctx.globalCompositeOperation = 'source-over';
    });
});