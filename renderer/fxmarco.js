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

const F_CORE = "rgba(236, 255, 252, ";   // 심 (거의 흰 청록)
const F_MAIN = "rgba(95, 232, 224, ";    // 본체 (청록)
const F_WARM = "rgba(255, 225, 74, ";    // 노란 기운
const F_DEEP = "rgba(20, 140, 160, ";    // 뿌리
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

    const g = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r);
    g.addColorStop(0, F_CORE + alpha + ")");
    g.addColorStop(0.22, F_WARM + (0.9 * alpha) + ")");   // 중심의 노란 기운
    g.addColorStop(0.55, F_MAIN + (0.92 * alpha) + ")");
    g.addColorStop(0.85, F_DEEP + (0.5 * alpha) + ")");
    g.addColorStop(1, F_FADE);
    ctx.fillStyle = g;
    ctx.fill();

    // 위로 피어오르는 불꽃 혓바닥
    ctx.globalAlpha = alpha * 0.8;
    for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + t * 1.4;
        const wob = 0.5 + Math.abs(Math.sin(t * 5 + k * 1.9)) * 0.55;
        const bx = cx + Math.cos(a) * r * 0.75;
        const by = cy + Math.sin(a) * r * 0.75;
        const h = r * (0.30 + wob * 0.42);
        const fg = ctx.createLinearGradient(bx, by, bx, by - h);
        fg.addColorStop(0, (warm ? F_WARM : F_MAIN) + (0.85 * alpha) + ")");
        fg.addColorStop(0.55, F_MAIN + (0.4 * alpha) + ")");
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

/** ✨ 푸른 양날개 — 시전자 몸에서 좌우로 펼쳐진다 */
function drawWings(ctx, cx, cy, spread, alpha, t) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.translate(cx, cy - 10);
        ctx.scale(side, 1);
        ctx.globalAlpha = alpha;

        const W = 210 * spread, H = 150 * spread;

        // 날개 본체 (부드러운 곡선)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(W * 0.35, -H * 0.95, W, -H * 0.45);
        ctx.quadraticCurveTo(W * 0.72, H * 0.10, W * 0.30, H * 0.22);
        ctx.quadraticCurveTo(W * 0.12, H * 0.10, 0, 0);
        ctx.closePath();
        const wg = ctx.createLinearGradient(0, 0, W, -H * 0.4);
        wg.addColorStop(0, F_CORE + (0.95 * alpha) + ")");
        wg.addColorStop(0.35, F_MAIN + (0.85 * alpha) + ")");
        wg.addColorStop(0.75, F_MAIN + (0.45 * alpha) + ")");
        wg.addColorStop(1, F_FADE);
        ctx.fillStyle = wg;
        ctx.fill();

        // 깃털 결 — 흔들리며 타오른다
        ctx.strokeStyle = F_CORE + (0.75 * alpha) + ")";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        for (let k = 0; k < 6; k++) {
            const f = k / 5;
            const wob = Math.sin(t * 7 + k) * 12 * spread;
            ctx.beginPath();
            ctx.moveTo(W * 0.10, -H * 0.05 + f * H * 0.16);
            ctx.quadraticCurveTo(W * 0.55, -H * (0.62 - f * 0.42) + wob,
                                 W * (0.92 - f * 0.10), -H * (0.42 - f * 0.44) + wob);
            ctx.stroke();
        }

        // 날개 끝의 노란 기운
        ctx.globalAlpha = alpha * 0.7;
        const tg = ctx.createRadialGradient(W * 0.9, -H * 0.42, 2, W * 0.9, -H * 0.42, 60 * spread);
        tg.addColorStop(0, F_WARM + "0.9)");
        tg.addColorStop(1, F_FADE);
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(W * 0.9, -H * 0.42, 60 * spread, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
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
    const R = fx.radius || 210;
    const off = fx.offset || 130;
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const bx = (o ? o.x : fx.x) + (fx.dirX || 1) * off;
    const by = (o ? o.y : fx.y) + (fx.dirY || 0) * off;
    const t = 1 - alpha;
    const tt = state.mathNow / 1000;
    // 자연스럽게 피어나고 사라진다
    const grow = Math.min(1, t / 0.15);
    const fade = (t > 0.88) ? (1 - (t - 0.88) / 0.12) : 1;
    const rr = R * grow;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * fade;

    // 방벽 본체 — 너울거리는 불꽃 원
    flameBlob(ctx, bx, by, rr, tt * 0.7, alpha * 0.75 * fade, false);

    // 안쪽 심 (밝은 청록)
    ctx.globalAlpha = alpha * 0.55 * fade;
    const g = ctx.createRadialGradient(bx, by, rr * 0.1, bx, by, rr);
    g.addColorStop(0, F_CORE + "0.7)");
    g.addColorStop(0.5, F_MAIN + "0.45)");
    g.addColorStop(1, F_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx, by, rr, 0, Math.PI * 2); ctx.fill();

    // 회전하는 이중 테두리
    ctx.globalAlpha = alpha * 0.95 * fade;
    ctx.strokeStyle = F_CORE + "1)";
    ctx.lineWidth = 6;
    ctx.setLineDash([26, 14]);
    ctx.lineDashOffset = -state.mathNow / 14;
    ctx.beginPath(); ctx.arc(bx, by, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = F_WARM + "0.9)";
    ctx.lineWidth = 3;
    ctx.lineDashOffset = state.mathNow / 18;
    ctx.beginPath(); ctx.arc(bx, by, rr * 0.88, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

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
