// 파일명: fxmarco.js
// ============================================================================
// 🔥 마르코 — 불사조의 푸른 불꽃 이펙트
//
//   🎨 배색 : 청록색(#5fe8e0)이 주가 되고 노란색(#ffe14a)이 중심과 가장자리에 섞인다.
//            (영상의 봉황 불꽃과 같은 느낌)
//
//   · marco_strike     : 평타
//   · marco_wings      : 스킬 시전 시 펼쳐지는 푸른 양날개
//   · marco_regen      : 게이지가 가득 차 몸이 불꽃에 뒤덮인다 (3초)
//   · marco_ball       : 1번 [봉황인] 불꽃 덩어리
//   · marco_ball_blast : 덩어리 폭발
//   · marco_cast       : 2번 [봉리력] 응축
//   · marco_field      : 2번 불길 장판 (3초)
//   · marco_shield     : 3번 [불사 엉겅퀴] 보호막 (2초)
//   · marco_shield_hit : 보호막이 공격을 막는 순간
//   · marco_shield_blast : 보호막 회전 폭발
//
//   ⚠️ 불꽃은 '자연스럽게 피어올랐다 사라지도록' 가장자리를 사인파로 흔든다.
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';

const F_CORE = "rgba(255, 255, 255, ";   // 심 (완전한 흰빛 — 가장 밝다)
const F_MAIN = "rgba(64, 245, 232, ";    // 본체 (더 선명한 청록)
const F_WARM = "rgba(255, 216, 40, ";    // 노란 기운 (더 진하게)
const F_DEEP = "rgba(0, 132, 168, ";     // 뿌리 (더 짙게 — 대비를 키운다)
const F_FADE = "rgba(10, 70, 90, 0)";

/**
 * 🔥 불꽃 덩어리 하나를 그린다.
 *    가장자리를 사인파로 흔들어 너울거리게 만든다.
 */
function flameBlob(ctx, cx, cy, r, t, alpha, warm) {
    const N = 26;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        // 세 겹의 사인파를 겹쳐 불규칙하게 너울거린다
        const wob = 1
            + Math.sin(a * 3 + t * 6.1) * 0.13
            + Math.sin(a * 5 - t * 4.3) * 0.08
            + Math.sin(a * 8 + t * 9.7) * 0.045;
        const rr = r * wob;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const g = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
    g.addColorStop(0, F_CORE + alpha + ")");                    // 흰 심
    g.addColorStop(0.14, F_WARM + alpha + ")");                 // 노란 속불
    g.addColorStop(0.32, F_WARM + (0.85 * alpha) + ")");
    g.addColorStop(0.52, F_MAIN + alpha + ")");                 // 청록 본체
    g.addColorStop(0.78, F_MAIN + (0.78 * alpha) + ")");
    g.addColorStop(0.92, F_DEEP + (0.55 * alpha) + ")");
    g.addColorStop(1, F_FADE);
    ctx.fillStyle = g;
    ctx.fill();

    // 🔆 또렷한 외곽선 — 불꽃 모양이 뭉개지지 않게 한 겹 더 긋는다
    ctx.strokeStyle = F_CORE + (0.55 * alpha) + ")";
    ctx.lineWidth = Math.max(1.5, r * 0.035);
    ctx.stroke();

    // 위로 피어오르는 불꽃 혓바닥
    // ✨ 사방으로 튀는 불티
    ctx.globalAlpha = alpha * 0.9;
    for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + t * 3.1;
        const d = r * (1.05 + ((k * 37) % 10) / 22);
        const sr = r * 0.06 * (0.5 + ((k * 53) % 10) / 12);
        const sg2 = ctx.createRadialGradient(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0,
                                             cx + Math.cos(a) * d, cy + Math.sin(a) * d, sr * 2.6);
        sg2.addColorStop(0, F_CORE + "1)");
        sg2.addColorStop(0.4, F_WARM + "0.85)");
        sg2.addColorStop(1, F_FADE);
        ctx.fillStyle = sg2;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, sr * 2.6, 0, Math.PI * 2); ctx.fill();
    }

    ctx.globalAlpha = alpha * 0.8;
    for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2 + t * 1.4;
        const wob = 0.5 + Math.abs(Math.sin(t * 5 + k * 1.9)) * 0.55;
        const bx = cx + Math.cos(a) * r * 0.75;
        const by = cy + Math.sin(a) * r * 0.75;
        const h = r * (0.38 + wob * 0.58);
        const fg = ctx.createLinearGradient(bx, by, bx, by - h);
        fg.addColorStop(0, F_CORE + (0.9 * alpha) + ")");
        fg.addColorStop(0.25, (warm ? F_WARM : F_MAIN) + alpha + ")");
        fg.addColorStop(0.62, F_MAIN + (0.6 * alpha) + ")");
        fg.addColorStop(1, F_FADE);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(bx - r * 0.14, by);
        ctx.quadraticCurveTo(bx - r * 0.05, by - h * 0.6, bx, by - h);
        ctx.quadraticCurveTo(bx + r * 0.05, by - h * 0.6, bx + r * 0.14, by);
        ctx.closePath();
        ctx.fill();
    }
}

/**
 * 🔥 불사조의 양날개 — 곤충 날개가 아니라 '깃털이 층층이 쌓인 큰 새의 날개'.
 *    · 긴 칼깃(primary) 이 부채처럼 아래로 늘어지고
 *    · 그 위에 짧은 덮깃(covert) 이 겹겹이 쌓인다
 *    · 깃털 하나하나가 불꽃처럼 흔들리며 끝이 노랗게 타오른다
 */
function drawWings(ctx, cx, cy, spread, alpha, t) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.translate(cx, cy - 16);
        ctx.scale(side, 1);

        const S = spread;
        // ── ① 긴 칼깃 9장 (부채꼴로 펼쳐진다) ────────────────────
        const PRIM = 9;
        for (let k = 0; k < PRIM; k++) {
            const f = k / (PRIM - 1);                 // 0(위) → 1(아래)
            // 위쪽 깃털이 먼저 펴지고 아래쪽이 뒤따른다
            const open = Math.max(0, Math.min(1, (S - f * 0.22) / 0.78));
            if (open <= 0) continue;

            const ang = (-1.15 + f * 1.55);           // 위 → 아래로 부채꼴
            const len = (255 - f * 55) * open;
            const wob = Math.sin(t * 4.2 + k * 0.8) * 0.10 * open;
            const a = ang + wob;

            const tipX = Math.cos(a) * len;
            const tipY = Math.sin(a) * len;
            const w = (26 - f * 9) * open;            // 깃털 폭

            ctx.globalAlpha = alpha * (0.95 - f * 0.18);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(tipX * 0.42 - Math.sin(a) * w,
                                 tipY * 0.42 + Math.cos(a) * w,
                                 tipX, tipY);
            ctx.quadraticCurveTo(tipX * 0.42 + Math.sin(a) * w * 0.5,
                                 tipY * 0.42 - Math.cos(a) * w * 0.5,
                                 0, 0);
            ctx.closePath();

            const fg = ctx.createLinearGradient(0, 0, tipX, tipY);
            fg.addColorStop(0, F_CORE + (0.95 * alpha) + ")");
            fg.addColorStop(0.38, F_MAIN + (0.9 * alpha) + ")");
            fg.addColorStop(0.78, F_MAIN + (0.55 * alpha) + ")");
            fg.addColorStop(0.93, F_WARM + (0.8 * alpha) + ")");   // 끝이 노랗게 탄다
            fg.addColorStop(1, F_FADE);
            ctx.fillStyle = fg;
            ctx.fill();

            // 깃대(rachis)
            ctx.globalAlpha = alpha * 0.75;
            ctx.strokeStyle = F_CORE + "0.9)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(tipX * 0.5, tipY * 0.5, tipX, tipY);
            ctx.stroke();

            // 깃털 끝에서 흩어지는 불티
            if (k % 2 === 0) {
                ctx.globalAlpha = alpha * 0.7;
                const sx = tipX + Math.cos(a) * 14, sy = tipY + Math.sin(a) * 14 - Math.sin(t * 6 + k) * 10;
                const sg = ctx.createRadialGradient(sx, sy, 1, sx, sy, 20 * open);
                sg.addColorStop(0, F_WARM + "0.95)");
                sg.addColorStop(1, F_FADE);
                ctx.fillStyle = sg;
                ctx.beginPath(); ctx.arc(sx, sy, 20 * open, 0, Math.PI * 2); ctx.fill();
            }
        }

        // ── ② 짧은 덮깃 2겹 (어깨를 덮는다) ──────────────────────
        for (let layer = 0; layer < 2; layer++) {
            const COV = 6;
            for (let k = 0; k < COV; k++) {
                const f = k / (COV - 1);
                const open = Math.max(0, Math.min(1, (S - 0.05) / 0.95));
                if (open <= 0) continue;
                const ang = (-1.0 + f * 1.35) + Math.sin(t * 3.4 + k) * 0.05;
                const len = (128 - layer * 38 - f * 26) * open;
                const w = (19 - layer * 5) * open;

                ctx.globalAlpha = alpha * (0.85 - layer * 0.2);
                const tx = Math.cos(ang) * len, ty = Math.sin(ang) * len;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(tx * 0.45 - Math.sin(ang) * w, ty * 0.45 + Math.cos(ang) * w, tx, ty);
                ctx.quadraticCurveTo(tx * 0.45 + Math.sin(ang) * w * 0.5, ty * 0.45 - Math.cos(ang) * w * 0.5, 0, 0);
                ctx.closePath();
                const cg = ctx.createLinearGradient(0, 0, tx, ty);
                cg.addColorStop(0, F_CORE + (0.9 * alpha) + ")");
                cg.addColorStop(0.55, F_MAIN + (0.75 * alpha) + ")");
                cg.addColorStop(1, F_WARM + (0.35 * alpha) + ")");
                ctx.fillStyle = cg;
                ctx.fill();
            }
        }

        // ── ③ 어깨에서 타오르는 불꽃 뭉치 ───────────────────────
        ctx.globalAlpha = alpha * 0.85;
        flameBlob(ctx, 18 * S, 4, 46 * S, t, alpha * 0.7, true);

        ctx.restore();
    }

    // ── ④ 등 뒤로 흩날리는 깃털 불티 ────────────────────────────
    ctx.globalAlpha = alpha * 0.65;
    for (let k = 0; k < 10; k++) {
        const ft = ((t * 0.5) + k / 10) % 1;
        const px = cx + Math.sin(k * 2.1 + t) * 150 * spread;
        const py = cy - 20 - ft * 190 * spread;
        const rr = 9 * (1 - ft) * spread;
        const g = ctx.createRadialGradient(px, py, 1, px, py, rr * 2.4);
        g.addColorStop(0, F_CORE + "0.95)");
        g.addColorStop(0.45, F_WARM + "0.6)");
        g.addColorStop(1, F_FADE);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, rr * 2.4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// ⚔️ 평타
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('marco_strike', (ctx, fx, alpha, state) => {
    const dir = (fx.isLeft || fx.dir === -1) ? -1 : 1;
    const t = 1 - alpha;
    const R = 110;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(fx.x, fx.y);
    ctx.scale(dir, 1);

    const a0 = -Math.PI * 0.5;
    const a1 = a0 + Math.PI * 0.85 * Math.min(1, t / 0.5);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(0, 0, R, a0, a1);
    ctx.arc(0, 0, R * 0.5, a1, a0, true);
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R);
    g.addColorStop(0, F_FADE);
    g.addColorStop(0.5, F_MAIN + (0.9 * alpha) + ")");
    g.addColorStop(0.85, F_WARM + (0.7 * alpha) + ")");
    g.addColorStop(1, F_CORE + alpha + ")");
    ctx.fillStyle = g;
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// ✨ 스킬 시전 — 푸른 양날개
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('marco_wings', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const t = 1 - alpha;
    // 앞 35% 에 활짝 펼쳐지고, 나머지 구간에 서서히 접힌다
    const spread = (t < 0.35)
        ? (1 - Math.pow(1 - t / 0.35, 3))
        : 1;
    drawWings(ctx, cx, cy, spread, alpha, state.mathNow / 160);
});

// ────────────────────────────────────────────────────────────────────────────
// 🔥 재생 — 몸이 불꽃에 뒤덮인다 (3초)
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('marco_regen', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const tt = state.mathNow / 1000;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.9;
    flameBlob(ctx, cx, cy, 96, tt, alpha * 0.85, false);

    // 위로 솟는 불기둥 잔불
    ctx.globalAlpha = alpha * 0.6;
    for (let k = 0; k < 7; k++) {
        const f = ((state.mathNow / 620) + k / 7) % 1;
        const px = cx + Math.sin(k * 2.3 + state.mathNow / 300) * 55;
        const py = cy + 40 - f * 190;
        const rr = 16 * (1 - f);
        const g = ctx.createRadialGradient(px, py, 1, px, py, rr * 2.2);
        g.addColorStop(0, F_CORE + "0.95)");
        g.addColorStop(0.4, F_WARM + "0.6)");
        g.addColorStop(1, F_FADE);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, rr * 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🔥 1번 [봉황인] — 불꽃 덩어리
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('marco_ball', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const R = fx.radius || 150;
    // 서버와 같은 속도로 날아간다
    const sp = 13;
    const frames = (fx.durationMs || 1500) / (1000 / 60);
    const travel = sp * frames * t;
    const cx = fx.x + (fx.dirX || 1) * travel;
    const cy = fx.y + (fx.dirY || 0) * travel;
    const tt = state.mathNow / 1000;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 뒤로 끌리는 불꼬리
    ctx.globalAlpha = alpha * 0.55;
    for (let k = 1; k <= 5; k++) {
        const bx = cx - (fx.dirX || 1) * k * R * 0.42;
        const by = cy - (fx.dirY || 0) * k * R * 0.42;
        flameBlob(ctx, bx, by, R * (0.62 - k * 0.09), tt + k, alpha * (0.5 - k * 0.08), false);
    }

    // 본체
    ctx.globalAlpha = alpha;
    flameBlob(ctx, cx, cy, R, tt, alpha, true);

    // 끌어당김을 보여주는 소용돌이 고리
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = F_MAIN + "0.9)";
    ctx.lineWidth = 4;
    for (let k = 0; k < 2; k++) {
        const rr = 300 * (1 - ((state.mathNow / 500 + k * 0.5) % 1));
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

registerVisualFX('marco_ball_blast', (ctx, fx, alpha, state) => {
    const R = fx.radius || 330;
    const t = 1 - alpha;
    const rr = R * (1 - Math.pow(1 - Math.min(1, t / 0.4), 2.4));
    const tt = state.mathNow / 1000;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    flameBlob(ctx, fx.x, fx.y, rr, tt, alpha, true);

    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = F_CORE + "0.95)";
    ctx.lineWidth = 7 * (1 - t) + 2;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr * 0.95, 0, Math.PI * 2); ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🔥 2번 [봉리력] — 응축 → 불길
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('marco_cast', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const t = 1 - alpha;
    const R = fx.radius || 620;
    const tt = state.mathNow / 1000;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 바깥에서 빨려드는 불꽃
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = F_MAIN + "0.9)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + state.mathNow / 400;
        const far = R * 0.55 * (1 - t) + 60;
        const near = far - 90;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * far, cy + Math.sin(a) * far);
        ctx.lineTo(cx + Math.cos(a) * Math.max(20, near), cy + Math.sin(a) * Math.max(20, near));
        ctx.stroke();
    }

    // 중심에 뭉치는 불꽃
    ctx.globalAlpha = alpha;
    flameBlob(ctx, cx, cy, 40 + t * 90, tt, alpha, true);

    // 곧 터질 범위 예고
    ctx.globalAlpha = alpha * (0.12 + t * 0.28);
    ctx.strokeStyle = F_WARM + "0.85)";
    ctx.lineWidth = 3 + t * 4;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

registerVisualFX('marco_field', (ctx, fx, alpha, state) => {
    const R = fx.radius || 620;
    const t = 1 - alpha;
    const tt = state.mathNow / 1000;
    // 피어날 때와 사라질 때 부드럽게
    const fade = Math.min(1, t / 0.12) * Math.min(1, (1 - t) / 0.18 + 0.2);

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 바닥에 깔린 불길
    ctx.globalAlpha = alpha * 0.5 * fade;
    const g = ctx.createRadialGradient(fx.x, fx.y, R * 0.12, fx.x, fx.y, R);
    g.addColorStop(0, F_CORE + "0.85)");
    g.addColorStop(0.3, F_WARM + "0.5)");
    g.addColorStop(0.65, F_MAIN + "0.45)");
    g.addColorStop(1, F_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.fill();

    // 사방에서 너울거리는 불꽃
    ctx.globalAlpha = alpha * 0.85 * fade;
    for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const wob = 0.55 + Math.abs(Math.sin(tt * 4 + k * 1.6)) * 0.42;
        const bx = fx.x + Math.cos(a) * R * 0.72;
        const by = fx.y + Math.sin(a) * R * 0.42;
        flameBlob(ctx, bx, by, 62 * wob, tt + k, alpha * 0.7 * fade, k % 3 === 0);
    }

    // 경계 고리
    ctx.globalAlpha = alpha * 0.5 * fade;
    ctx.strokeStyle = F_MAIN + "0.9)";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(fx.x, fx.y, R, R * 0.6, 0, 0, Math.PI * 2); ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🛡️ 3번 [불사 엉겅퀴] — 보호막
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('marco_shield', (ctx, fx, alpha, state) => {
    const RX = fx.radiusX || 120;
    const RY = fx.radiusY || 260;
    const off = fx.offset || 150;
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const bx = (o ? o.x : fx.x) + (fx.dirX || 1) * off;
    const by = (o ? o.y : fx.y) + (fx.dirY || 0) * off;
    const t = 1 - alpha;
    const tt = state.mathNow / 1000;
    const grow = 1 - Math.pow(1 - Math.min(1, t / 0.16), 2.2);
    const fade = (t > 0.9) ? (1 - (t - 0.9) / 0.1) : 1;
    const rx = RX * grow, ry = RY * grow;
    const A = alpha * fade;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // ── ① 안쪽을 채우는 푸른 불꽃막 ─────────────────────────────
    ctx.globalAlpha = A * 0.55;
    const g = ctx.createRadialGradient(bx, by, rx * 0.1, bx, by, ry);
    g.addColorStop(0, F_CORE + "0.55)");
    g.addColorStop(0.35, F_MAIN + "0.5)");
    g.addColorStop(0.75, F_MAIN + "0.3)");
    g.addColorStop(1, F_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2); ctx.fill();

    // ── ② 타원 가장자리를 너울거리는 불꽃 테두리 ───────────────
    //    타원을 따라 돌면서 사인파로 흔들려 살아있는 불처럼 보인다
    // 🔥 [강화] 불꽃답게 거칠고 크게 일렁인다.
    //    사인파 4겹 + 바깥으로 솟구치는 불혀를 함께 그린다.
    ctx.globalAlpha = A * 0.95;
    const N = 96;
    const edge = [];
    for (let i = 0; i <= N; i++) {
        const a2 = (i / N) * Math.PI * 2;
        const wob = 1
            + Math.sin(a2 * 3 + tt * 7.2) * 0.155
            + Math.sin(a2 * 7 - tt * 5.4) * 0.095
            + Math.sin(a2 * 13 + tt * 9.1) * 0.055
            + Math.sin(a2 * 21 - tt * 12.3) * 0.028;
        edge.push([bx + Math.cos(a2) * rx * wob, by + Math.sin(a2) * ry * wob, a2, wob]);
    }
    ctx.beginPath();
    edge.forEach((e, i) => { if (i === 0) ctx.moveTo(e[0], e[1]); else ctx.lineTo(e[0], e[1]); });
    ctx.closePath();
    const eg = ctx.createLinearGradient(bx, by - ry, bx, by + ry);
    eg.addColorStop(0, F_WARM + "0.85)");
    eg.addColorStop(0.3, F_CORE + "0.95)");
    eg.addColorStop(0.7, F_MAIN + "0.9)");
    eg.addColorStop(1, F_WARM + "0.8)");
    ctx.strokeStyle = eg;
    ctx.lineWidth = 9;
    ctx.stroke();

    // 🔥 가장자리에서 바깥으로 솟구치는 불혀 (매 프레임 길이가 바뀐다)
    ctx.globalAlpha = A * 0.9;
    for (let i = 0; i < N; i += 3) {
        const e = edge[i];
        const flick = Math.abs(Math.sin(tt * 8 + i * 0.9)) * 0.55 + 0.25;
        const h = (rx * 0.34) * flick;
        const ox = Math.cos(e[2]), oy = Math.sin(e[2]);
        const tipX = e[0] + ox * h, tipY = e[1] + oy * h;
        const w = rx * 0.075 * flick;
        const fg2 = ctx.createLinearGradient(e[0], e[1], tipX, tipY);
        fg2.addColorStop(0, F_CORE + "0.95)");
        fg2.addColorStop(0.3, (i % 6 === 0 ? F_WARM : F_MAIN) + "0.95)");
        fg2.addColorStop(1, F_FADE);
        ctx.fillStyle = fg2;
        ctx.beginPath();
        ctx.moveTo(e[0] - oy * w, e[1] + ox * w);
        ctx.quadraticCurveTo((e[0] + tipX) / 2 - oy * w * 0.4, (e[1] + tipY) / 2 + ox * w * 0.4, tipX, tipY);
        ctx.quadraticCurveTo((e[0] + tipX) / 2 + oy * w * 0.4, (e[1] + tipY) / 2 - ox * w * 0.4, e[0] + oy * w, e[1] - ox * w);
        ctx.closePath();
        ctx.fill();
    }

    // ── ③ 보호막 주위를 '회전하는' 불꽃 소용돌이 ───────────────
    //    (원 자체가 아니라 주변 불꽃이 돈다)
    const SW = 12;
    for (let k = 0; k < SW; k++) {
        const spin = tt * 1.9 + (k / SW) * Math.PI * 2;
        // 타원 궤도를 따라 돈다
        const px = bx + Math.cos(spin) * rx * 1.12;
        const py = by + Math.sin(spin) * ry * 1.06;
        const sz = (30 + Math.sin(tt * 6 + k) * 12) * grow;
        ctx.globalAlpha = A * 0.9;
        flameBlob(ctx, px, py, sz, tt + k * 0.7, A * 0.8, k % 2 === 0);
    }

    // ── ④ 감아 도는 노란 불꽃 띠 2줄 ───────────────────────────
    ctx.globalAlpha = A * 0.8;
    ctx.lineCap = "round";
    for (let band = 0; band < 2; band++) {
        const base = tt * 2.3 + band * Math.PI;
        ctx.strokeStyle = (band === 0 ? F_WARM : F_CORE) + "0.9)";
        ctx.lineWidth = 6 - band * 2;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
            const f = i / 40;
            const a2 = base + f * Math.PI * 1.6;
            const rr = 1.0 + Math.sin(f * Math.PI) * 0.22;   // 가운데가 부풀어 감긴다
            const x = bx + Math.cos(a2) * rx * rr;
            const y = by + Math.sin(a2) * ry * rr;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // ── ⑤ 위아래 끝에서 솟는 불기둥 ────────────────────────────
    ctx.globalAlpha = A * 0.7;
    for (const s2 of [-1, 1]) {
        const px = bx, py = by + s2 * ry * 0.94;
        const h = 70 * grow * (0.7 + Math.abs(Math.sin(tt * 5 + s2)) * 0.5);
        const fg = ctx.createLinearGradient(px, py, px, py + s2 * h);
        fg.addColorStop(0, F_CORE + "0.9)");
        fg.addColorStop(0.5, F_WARM + "0.6)");
        fg.addColorStop(1, F_FADE);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(px - 26 * grow, py);
        ctx.quadraticCurveTo(px, py + s2 * h * 0.7, px, py + s2 * h);
        ctx.quadraticCurveTo(px, py + s2 * h * 0.7, px + 26 * grow, py);
        ctx.closePath(); ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// 🛡️ 시전자를 감싸는 불꽃 방어막 (무적 표시)
registerVisualFX('marco_shield_self', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    if (!o) return;
    const cx = o.x, cy = o.y;
    const tt = state.mathNow / 1000;
    const R = 108;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 몸을 감싸는 불꽃 껍질
    ctx.globalAlpha = alpha * 0.85;
    flameBlob(ctx, cx, cy, R, tt * 0.9, alpha * 0.7, false);

    // 회전하는 이중 고리
    ctx.globalAlpha = alpha * 0.95;
    for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = (k === 0 ? F_CORE : F_WARM) + "0.95)";
        ctx.lineWidth = 5 - k * 2;
        ctx.setLineDash([22, 12]);
        ctx.lineDashOffset = (k === 0 ? -1 : 1) * state.mathNow / (12 + k * 6);
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * (1.08 - k * 0.16), R * (1.28 - k * 0.16), 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // 주위를 도는 작은 불꽃 5개
    for (let k = 0; k < 5; k++) {
        const a = tt * 2.4 + (k / 5) * Math.PI * 2;
        ctx.globalAlpha = alpha * 0.9;
        flameBlob(ctx, cx + Math.cos(a) * R * 1.05, cy + Math.sin(a) * R * 1.2,
                  20 + Math.sin(tt * 6 + k) * 7, tt + k, alpha * 0.8, k % 2 === 0);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// 🛡️ 보호막이 공격을 막는 순간
registerVisualFX('marco_shield_hit', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const rr = 30 + t * 70;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, rr);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, F_CORE + "0.85)");
    g.addColorStop(1, F_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = F_CORE + "0.95)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr * 0.9, 0, Math.PI * 2); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// 🛡️ 보호막 회전 폭발
registerVisualFX('marco_shield_blast', (ctx, fx, alpha, state) => {
    const R = fx.radius || 460;
    const t = 1 - alpha;
    const rr = R * (1 - Math.pow(1 - Math.min(1, t / 0.38), 2.3));
    const tt = state.mathNow / 1000;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 회전하며 퍼지는 불꽃
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.rotate(t * Math.PI * 3);          // 회전하면서 터진다
    flameBlob(ctx, 0, 0, rr, tt, alpha, true);
    ctx.restore();

    // 휘몰아치는 나선 팔
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = F_CORE + "0.95)";
    ctx.lineWidth = 6; ctx.lineCap = "round";
    for (let k = 0; k < 6; k++) {
        const a0 = (k / 6) * Math.PI * 2 + t * Math.PI * 3;
        ctx.beginPath();
        for (let s = 0; s <= 12; s++) {
            const f = s / 12;
            const a = a0 + f * 1.5;
            const r2 = rr * (0.25 + f * 0.85);
            const x = fx.x + Math.cos(a) * r2, y = fx.y + Math.sin(a) * r2;
            if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = F_WARM + "0.9)";
    ctx.lineWidth = 8 * (1 - t) + 2;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr, 0, Math.PI * 2); ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});
