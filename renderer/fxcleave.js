// 파일명: fxcleave.js
// ============================================================================
// 🗡️ [세계를 가르는 참격] 이펙트
//
//   · world_cleave_charge : 0.5초 경직 동안 발사 방향을 예고하는 가늘고 흰 선
//   · world_cleave        : 실제 참격 — 전방을 가르는 새하얀 칼자국
//
//   범위 · 사거리는 각성 엘 토르와 동일하다.
//     - 사거리 CLEAVE_RANGE     = 1680  (= ENEL_S1.range)
//     - 두께   CLEAVE_THICKNESS =  270  (= ENEL_S1.thickness * 3)
//   서버 상수와 반드시 일치해야 하므로 아래 값을 고정으로 둔다.
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

const CLEAVE_RANGE = 1680;
const CLEAVE_HALF  = 270 / 2;

/** 시전자의 현재 위치를 따라간다 (없으면 이펙트 생성 좌표 사용) */
function ownerPos(fx, state) {
    let o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    return o ? { x: o.x, y: o.y } : { x: fx.x, y: fx.y };
}

/** fx 에 담긴 방향 벡터를 각도로 변환한다 */
function fxAngle(fx) {
    let ux = (fx.dirX !== undefined) ? fx.dirX : 1;
    let uy = (fx.dirY !== undefined) ? fx.dirY : 0;
    let len = Math.hypot(ux, uy);
    if (len === 0) { ux = 1; uy = 0; len = 1; }
    return Math.atan2(uy / len, ux / len);
}

// ============================================================================
// ⏳ 0.5초 경직 — 발사 예고선
// ============================================================================
registerVisualFX('world_cleave_charge', (ctx, fx, alpha, state) => {
    const pos = ownerPos(fx, state);
    const ang = fxAngle(fx);

    // alpha 는 1 → 0 으로 줄어든다. 예고선은 시간이 갈수록 진해진다.
    const grow = 1 - alpha;

    RenderUtils.withRotation(ctx, pos.x, pos.y, ang, () => {
        ctx.globalCompositeOperation = "screen";

        // ── 가늘게 뻗어 나가는 예고선 ──────────────────────────────
        ctx.globalAlpha = 0.25 + grow * 0.55;
        let line = ctx.createLinearGradient(0, 0, CLEAVE_RANGE, 0);
        line.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        line.addColorStop(0.7, "rgba(220, 230, 255, 0.5)");
        line.addColorStop(1, "rgba(180, 200, 255, 0)");
        ctx.fillStyle = line;
        let h = 2 + grow * 6;
        ctx.fillRect(0, -h / 2, CLEAVE_RANGE, h);

        // ── 시전자 발밑에서 모여드는 빛 ────────────────────────────
        ctx.globalAlpha = 0.35 + grow * 0.6;
        let core = ctx.createRadialGradient(0, 0, 2, 0, 0, 60 + grow * 70);
        core.addColorStop(0, "rgba(255,255,255,1)");
        core.addColorStop(0.4, "rgba(200, 215, 255, 0.6)");
        core.addColorStop(1, "rgba(120, 150, 255, 0)");
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 0, 60 + grow * 70, 0, Math.PI * 2); ctx.fill();

        // ── 안쪽으로 빨려 들어오는 짧은 선 4개 ─────────────────────
        ctx.strokeStyle = `rgba(255,255,255,${0.3 + grow * 0.5})`;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (let k = 0; k < 4; k++) {
            let a = (k / 4) * Math.PI * 2 + state.mathNow / 300;
            let far = 150 * alpha + 40;
            let near = far - 45;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * far, Math.sin(a) * far);
            ctx.lineTo(Math.cos(a) * near, Math.sin(a) * near);
            ctx.stroke();
        }

        ctx.globalCompositeOperation = "source-over";
    });
});

// ============================================================================
// 🗡️ 참격 발사 — 세계가 갈라지는 한 줄
// ============================================================================
registerVisualFX('world_cleave', (ctx, fx, alpha, state) => {
    // 이 이펙트는 '발사 순간'에 고정된 좌표를 쓴다 (시전자를 따라가지 않는다)
    const ox = fx.x, oy = fx.y;
    const ang = fxAngle(fx);

    // 참격은 순식간에 그어졌다가 잔상만 남는다
    const t = 1 - alpha;                       // 0 → 1 로 진행
    const reach = Math.min(1, t / 0.18);       // 앞쪽 0.18 구간에 즉시 끝까지 뻗는다
    const LEN = CLEAVE_RANGE * reach;

    RenderUtils.withRotation(ctx, ox, oy, ang, () => {
        ctx.globalCompositeOperation = "screen";

        // ── ① 바깥 충격 여파 (넓고 옅게) ───────────────────────────
        ctx.globalAlpha = alpha * 0.5;
        let outer = ctx.createLinearGradient(0, -CLEAVE_HALF * 1.9, 0, CLEAVE_HALF * 1.9);
        outer.addColorStop(0, "rgba(120, 150, 255, 0)");
        outer.addColorStop(0.5, "rgba(210, 225, 255, 0.42)");
        outer.addColorStop(1, "rgba(120, 150, 255, 0)");
        ctx.fillStyle = outer;
        ctx.fillRect(0, -CLEAVE_HALF * 1.9, LEN, CLEAVE_HALF * 3.8);

        // ── ② 본체 (실제 판정 두께) ────────────────────────────────
        ctx.globalAlpha = alpha;
        let body = ctx.createLinearGradient(0, -CLEAVE_HALF, 0, CLEAVE_HALF);
        body.addColorStop(0, "rgba(150, 175, 255, 0.15)");
        body.addColorStop(0.34, "rgba(235, 242, 255, 0.85)");
        body.addColorStop(0.5, "rgba(255, 255, 255, 1)");
        body.addColorStop(0.66, "rgba(235, 242, 255, 0.85)");
        body.addColorStop(1, "rgba(150, 175, 255, 0.15)");
        ctx.fillStyle = body;
        ctx.fillRect(0, -CLEAVE_HALF, LEN, CLEAVE_HALF * 2);

        // ── ③ 한가운데 새하얀 칼자국 ───────────────────────────────
        ctx.globalAlpha = Math.min(1, alpha * 1.6);
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.fillRect(0, -CLEAVE_HALF * 0.08 - 1.5, LEN, CLEAVE_HALF * 0.16 + 3);

        // ── ④ 갈라진 틈을 강조하는 위/아래 경계선 ──────────────────
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -CLEAVE_HALF); ctx.lineTo(LEN, -CLEAVE_HALF);
        ctx.moveTo(0,  CLEAVE_HALF); ctx.lineTo(LEN,  CLEAVE_HALF);
        ctx.stroke();

        // ── ⑤ 시작점 섬광 ─────────────────────────────────────────
        ctx.globalAlpha = alpha;
        let flare = ctx.createRadialGradient(0, 0, 4, 0, 0, CLEAVE_HALF * 2.2);
        flare.addColorStop(0, "rgba(255,255,255,1)");
        flare.addColorStop(0.3, "rgba(225, 235, 255, 0.8)");
        flare.addColorStop(1, "rgba(150, 180, 255, 0)");
        ctx.fillStyle = flare;
        ctx.beginPath(); ctx.arc(0, 0, CLEAVE_HALF * 2.2, 0, Math.PI * 2); ctx.fill();

        // ── ⑥ 끝단 충돌 섬광 ──────────────────────────────────────
        if (reach >= 1) {
            ctx.globalAlpha = alpha * 0.9;
            let tip = ctx.createRadialGradient(LEN, 0, 6, LEN, 0, CLEAVE_HALF * 1.7);
            tip.addColorStop(0, "rgba(255,255,255,1)");
            tip.addColorStop(0.45, "rgba(210, 225, 255, 0.6)");
            tip.addColorStop(1, "rgba(140, 170, 255, 0)");
            ctx.fillStyle = tip;
            ctx.beginPath(); ctx.arc(LEN, 0, CLEAVE_HALF * 1.7, 0, Math.PI * 2); ctx.fill();
        }

        ctx.globalCompositeOperation = "source-over";
    });
});
