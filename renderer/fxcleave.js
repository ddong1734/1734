// 파일명: fxcleave.js
// ============================================================================
// 🗡️ [세계를 가르는 참격] 이펙트
//
//   · world_cleave_charge : 0.5초 경직 동안 정면을 예고하는 흰 선
//   · world_cleave        : 커다란 반달(초승달) 참격이 정면으로 매우 빠르게 날아가며
//                           뒤로 회색 잔상을 길게 남긴다.
//
//   ⚠️ 아래 두 값은 server/config.js 의 CLEAVE_RANGE · CLEAVE_THICKNESS 와
//      반드시 같아야 한다. (판정과 그림이 어긋나면 안 된다)
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

const CLEAVE_RANGE = 3400;
const CLEAVE_HALF  = 760 / 2;

/** fx 에 담긴 방향 벡터를 각도로 변환한다 (정면 발사라 사실상 0 또는 π) */
function fxAngle(fx) {
    let ux = (fx.dirX !== undefined) ? fx.dirX : 1;
    let uy = (fx.dirY !== undefined) ? fx.dirY : 0;
    let len = Math.hypot(ux, uy);
    if (len === 0) { ux = 1; uy = 0; len = 1; }
    return Math.atan2(uy / len, ux / len);
}

/**
 * 🌙 반달(초승달) 모양 경로를 만든다.
 *    바깥으로 볼록한 호 → 안쪽으로 덜 볼록한 호로 되돌아와 초승달이 된다.
 *
 *  @param R      반달이 세로로 벌어진 반지름
 *  @param thick  날의 두께
 */
function crescentPath(ctx, R, thick) {
    ctx.beginPath();
    // 바깥 호 : 위 → 아래 (진행 방향으로 볼록)
    ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
    // 안쪽 호 : 아래 → 위 (뒤로 물러난 중심에서 그린다)
    ctx.arc(-thick * 1.35, 0, R - thick * 0.15, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
}

// ============================================================================
// ⏳ 0.5초 경직 — 정면 예고선
// ============================================================================
registerVisualFX('world_cleave_charge', (ctx, fx, alpha, state) => {
    let o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    let cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    let face = (fx.dirX !== undefined && fx.dirX < 0) ? -1 : 1;
    let ang = (face === -1) ? Math.PI : 0;

    const grow = 1 - alpha;

    RenderUtils.withRotation(ctx, cx, cy, ang, () => {
        ctx.globalCompositeOperation = "screen";

        // 정면으로 가늘게 뻗는 예고선
        ctx.globalAlpha = 0.22 + grow * 0.5;
        let line = ctx.createLinearGradient(0, 0, CLEAVE_RANGE, 0);
        line.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        line.addColorStop(0.7, "rgba(215, 220, 230, 0.42)");
        line.addColorStop(1, "rgba(180, 185, 195, 0)");
        ctx.fillStyle = line;
        let h = 3 + grow * 10;
        ctx.fillRect(0, -h / 2, CLEAVE_RANGE, h);

        // 발밑에서 모여드는 빛
        ctx.globalAlpha = 0.3 + grow * 0.6;
        let core = ctx.createRadialGradient(0, 0, 2, 0, 0, 70 + grow * 90);
        core.addColorStop(0, "rgba(255,255,255,1)");
        core.addColorStop(0.4, "rgba(205, 210, 220, 0.55)");
        core.addColorStop(1, "rgba(140, 145, 155, 0)");
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 0, 70 + grow * 90, 0, Math.PI * 2); ctx.fill();

        // 벌어지기 시작하는 반달의 윤곽
        ctx.globalAlpha = grow * 0.55;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 3;
        ctx.save();
        let sc = 0.35 + grow * 0.3;
        ctx.scale(sc, sc);
        crescentPath(ctx, CLEAVE_HALF, CLEAVE_HALF * 0.42);
        ctx.stroke();
        ctx.restore();

        ctx.globalCompositeOperation = "source-over";
    });
});

// ============================================================================
// 🌙 참격 발사 — 반달이 매우 빠르게 날아가며 회색 잔상을 남긴다
// ============================================================================
registerVisualFX('world_cleave', (ctx, fx, alpha, state) => {
    const ox = fx.x, oy = fx.y;
    const ang = fxAngle(fx);

    const t = 1 - alpha;                        // 0 → 1 로 진행

    // 🚀 매우 빠르게 : 앞 22% 구간에 사거리 끝까지 도달한다
    const flyT = Math.min(1, t / 0.22);
    const ease = 1 - Math.pow(1 - flyT, 2.2);   // 처음이 가장 빠르다
    const head = CLEAVE_RANGE * ease;           // 반달의 현재 위치

    const R = CLEAVE_HALF;
    const thick = R * 0.40;

    // 도달한 뒤에는 잔상만 서서히 사라진다
    const tailFade = (flyT < 1) ? 1 : Math.max(0, 1 - (t - 0.22) / 0.78);

    RenderUtils.withRotation(ctx, ox, oy, ang, () => {

        // ── ① 회색 잔상 띠 ─────────────────────────────────────────
        ctx.globalAlpha = 0.42 * tailFade;
        let trail = ctx.createLinearGradient(0, 0, Math.max(1, head), 0);
        trail.addColorStop(0, "rgba(120,122,128,0)");
        trail.addColorStop(0.35, "rgba(150,152,158,0.35)");
        trail.addColorStop(1, "rgba(205,208,214,0.75)");
        ctx.fillStyle = trail;
        ctx.fillRect(0, -R * 0.82, head, R * 1.64);

        // ── ② 잔상 반달 여러 장 ────────────────────────────────────
        const GHOSTS = 7;
        for (let k = GHOSTS; k >= 1; k--) {
            let back = head - (k / GHOSTS) * R * 3.1;
            if (back < 0) continue;
            let ga = (1 - k / (GHOSTS + 1)) * 0.42 * tailFade;
            let gs = 0.72 + (1 - k / GHOSTS) * 0.28;
            let g = Math.round(140 + (1 - k / GHOSTS) * 80);

            ctx.save();
            ctx.globalAlpha = ga;
            ctx.translate(back, 0);
            ctx.scale(gs, gs);
            ctx.fillStyle = `rgb(${g},${g},${g + 4})`;
            crescentPath(ctx, R, thick);
            ctx.fill();
            ctx.restore();
        }

        // ── ③ 반달 본체 ────────────────────────────────────────────
        ctx.save();
        ctx.translate(head, 0);

        // 바깥 번짐
        ctx.globalAlpha = 0.55 * tailFade;
        ctx.save();
        ctx.scale(1.14, 1.10);
        ctx.fillStyle = "rgba(225,228,235,0.55)";
        crescentPath(ctx, R, thick);
        ctx.fill();
        ctx.restore();

        // 본체 (안쪽이 하얗게 빛나는 회백색 날)
        ctx.globalAlpha = tailFade;
        let body = ctx.createLinearGradient(-thick * 1.4, 0, 0, 0);
        body.addColorStop(0, "rgba(150,153,160,0.85)");
        body.addColorStop(0.45, "rgba(232,235,242,1)");
        body.addColorStop(1, "rgba(255,255,255,1)");
        ctx.fillStyle = body;
        crescentPath(ctx, R, thick);
        ctx.fill();

        // 날의 바깥 테두리
        ctx.globalAlpha = tailFade * 0.95;
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
        ctx.stroke();

        // 위/아래 끝의 뾰족한 섬광
        ctx.globalAlpha = tailFade * 0.8;
        for (let s = -1; s <= 1; s += 2) {
            let fg = ctx.createRadialGradient(0, s * R, 2, 0, s * R, R * 0.28);
            fg.addColorStop(0, "rgba(255,255,255,1)");
            fg.addColorStop(1, "rgba(210,214,222,0)");
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(0, s * R, R * 0.28, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // ── ④ 시작점 섬광 ──────────────────────────────────────────
        if (flyT < 1) {
            ctx.globalAlpha = (1 - flyT) * 0.9;
            let flare = ctx.createRadialGradient(0, 0, 4, 0, 0, R * 1.1);
            flare.addColorStop(0, "rgba(255,255,255,1)");
            flare.addColorStop(0.35, "rgba(215,219,227,0.7)");
            flare.addColorStop(1, "rgba(150,154,162,0)");
            ctx.fillStyle = flare;
            ctx.beginPath(); ctx.arc(0, 0, R * 1.1, 0, Math.PI * 2); ctx.fill();
        }
    });
});
