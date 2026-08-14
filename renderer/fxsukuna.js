// 파일명: fxsukuna.js
// ============================================================================
// 🔥 헤이안 스쿠나 (저주의 왕) 이펙트
//
//   · sukuna_slash_tele : 참격이 떨어질 자리를 1초 전에 알리는 불투명 빨간 박스
//   · sukuna_slash_fire : 실제로 그어지는 참격
//   · sukuna_bow_aim    : 2초 조준 — 불타는 활과 조준선, 착탄 예정 원
//   · sukuna_bow_fire   : 화염 화살 착탄 대폭발
//
//   불길 장판(sukunaFires)은 '지속 상태' 라서 renderEngine 이 매 프레임
//   drawSukunaFires() 를 직접 호출한다.
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';

// ────────────────────────────────────────────────────────────────────────────
// ⚠️ 참격 예고 — 불투명한 빨간 박스
//    "여기에 떨어진다" 를 확실히 알려야 하므로 진하게 그린다.
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('sukuna_slash_tele', (ctx, fx, alpha, state) => {
    const w = fx.w || 560, h = fx.h || 300;
    const t = 1 - alpha;                     // 0 → 1 (예고 진행도)
    const x = fx.x - w / 2, y = fx.y - h / 2;

    ctx.save();

    // 바탕 — 시간이 갈수록 진해진다
    ctx.globalAlpha = 0.30 + t * 0.42;
    ctx.fillStyle = "#c8102a";
    ctx.fillRect(x, y, w, h);

    // 안쪽 무늬 (사선)
    ctx.globalAlpha = 0.22 + t * 0.3;
    ctx.strokeStyle = "#ff5a5a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let sx = -h; sx < w; sx += 46) {
        ctx.moveTo(x + sx, y + h);
        ctx.lineTo(x + sx + h, y);
    }
    ctx.stroke();

    // 테두리 — 점점 두꺼워지며 번쩍인다
    ctx.globalAlpha = 0.75 + t * 0.25;
    ctx.strokeStyle = (t > 0.82 && Math.floor(state.mathNow / 60) % 2 === 0)
        ? "#ffffff" : "#ff2233";
    ctx.lineWidth = 5 + t * 7;
    ctx.strokeRect(x, y, w, h);

    // 네 모서리 강조
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#ffd0d0";
    ctx.lineWidth = 4;
    const c = 34;
    const corner = (cx, cy, dx, dy) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx * c, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * c);
        ctx.stroke();
    };
    corner(x, y, 1, 1); corner(x + w, y, -1, 1);
    corner(x, y + h, 1, -1); corner(x + w, y + h, -1, -1);

    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// ⚔️ 참격 발사 — 박스 안을 가르는 붉은 칼자국
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('sukuna_slash_fire', (ctx, fx, alpha, state) => {
    const w = fx.w || 560, h = fx.h || 300;
    const t = 1 - alpha;
    const reach = Math.min(1, t / 0.25);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(fx.x, fx.y);

    // 세 줄기 칼자국이 사선으로 그어진다
    for (let k = -1; k <= 1; k++) {
        const off = k * h * 0.26;
        const len = w * reach;
        ctx.globalAlpha = alpha * (k === 0 ? 1 : 0.7);

        let g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        g.addColorStop(0, "rgba(255, 40, 60, 0)");
        g.addColorStop(0.5, "rgba(255, 90, 90, 0.95)");
        g.addColorStop(1, "rgba(255, 255, 255, 1)");
        ctx.strokeStyle = g;
        ctx.lineWidth = (k === 0 ? 16 : 9);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-w / 2, off + h * 0.22);
        ctx.lineTo(-w / 2 + len, off - h * 0.22);
        ctx.stroke();
    }

    // 착탄 섬광
    ctx.globalAlpha = alpha * 0.8;
    let fg = ctx.createRadialGradient(0, 0, 4, 0, 0, w * 0.45);
    fg.addColorStop(0, "rgba(255,255,255,1)");
    fg.addColorStop(0.4, "rgba(255, 80, 70, 0.7)");
    fg.addColorStop(1, "rgba(180, 20, 20, 0)");
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(0, 0, w * 0.45, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🏹 화염 화살 조준 — 2초 동안 목표가 고정된다
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('sukuna_bow_aim', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;                     // 0 → 1 (조준 진행도)
    const R = fx.blastR || 420;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // ── 조준선 ──────────────────────────────────────────────────
    ctx.globalAlpha = 0.35 + t * 0.5;
    let lg = ctx.createLinearGradient(fx.sx, fx.sy, fx.x, fx.y);
    lg.addColorStop(0, "rgba(255, 240, 160, 0.95)");
    lg.addColorStop(1, "rgba(255, 90, 30, 0.6)");
    ctx.strokeStyle = lg;
    ctx.lineWidth = 3 + t * 4;
    ctx.setLineDash([26, 18]);
    ctx.lineDashOffset = -state.mathNow / 18;
    ctx.beginPath(); ctx.moveTo(fx.sx, fx.sy); ctx.lineTo(fx.x, fx.y); ctx.stroke();
    ctx.setLineDash([]);

    // ── 불타는 활 (시전자 쪽) ───────────────────────────────────
    const ang = Math.atan2(fx.y - fx.sy, fx.x - fx.sx);
    ctx.save();
    ctx.translate(fx.sx, fx.sy);
    ctx.rotate(ang);
    ctx.globalAlpha = 0.6 + t * 0.4;
    ctx.strokeStyle = "rgba(255, 170, 40, 0.95)";
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(0, 0, 95, -Math.PI * 0.42, Math.PI * 0.42); ctx.stroke();
    ctx.strokeStyle = "rgba(255, 245, 190, 0.9)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 95, -Math.PI * 0.42, Math.PI * 0.42); ctx.stroke();
    // 시위에 걸린 화살 (뒤로 당겨졌다가 놓인다)
    let pull = 70 * (1 - t);
    ctx.strokeStyle = "rgba(255, 220, 120, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -88); ctx.lineTo(-pull, 0); ctx.lineTo(0, 88);
    ctx.stroke();
    let ag = ctx.createLinearGradient(-pull, 0, 150, 0);
    ag.addColorStop(0, "rgba(255, 120, 20, 0.9)");
    ag.addColorStop(1, "rgba(255, 250, 200, 1)");
    ctx.strokeStyle = ag; ctx.lineWidth = 11; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-pull, 0); ctx.lineTo(150, 0); ctx.stroke();
    ctx.restore();

    // ── 착탄 예정 원 (점점 조여든다) ────────────────────────────
    ctx.globalAlpha = 0.30 + t * 0.45;
    ctx.fillStyle = "rgba(200, 40, 20, 0.30)";
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = 0.7 + t * 0.3;
    ctx.strokeStyle = (t > 0.85 && Math.floor(state.mathNow / 60) % 2 === 0) ? "#ffffff" : "#ff3b2a";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.stroke();

    // 조여드는 안쪽 링
    ctx.strokeStyle = "rgba(255, 220, 140, 0.9)";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R * (1 - t * 0.82) + 12, 0, Math.PI * 2); ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 💥 화염 화살 착탄 — 대폭발
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('sukuna_bow_fire', (ctx, fx, alpha, state) => {
    const R = fx.blastR || 420;
    const t = 1 - alpha;
    const rr = R * (1 - Math.pow(1 - Math.min(1, t / 0.35), 2.4));

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;

    let g = ctx.createRadialGradient(fx.x, fx.y, 4, fx.x, fx.y, rr);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255, 240, 150, 0.95)");
    g.addColorStop(0.6, "rgba(255, 120, 30, 0.75)");
    g.addColorStop(1, "rgba(150, 20, 10, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = "rgba(255, 235, 170, 0.95)";
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr * 0.92, 0, Math.PI * 2); ctx.stroke();

    // 치솟는 불기둥
    ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255, 180, 60, 0.85)";
    for (let k = 0; k < 12; k++) {
        let a = (k / 12) * Math.PI * 2 + t;
        ctx.beginPath();
        ctx.moveTo(fx.x + Math.cos(a) * rr * 0.55, fx.y + Math.sin(a) * rr * 0.55);
        ctx.lineTo(fx.x + Math.cos(a) * rr * 1.3, fx.y + Math.sin(a) * rr * 1.3);
        ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

/**
 * 🔥 불길 장판 — 지속 상태라 renderEngine 이 매 프레임 직접 호출한다.
 *    (visualFX 는 수명이 정해진 일회성 연출이라 4초 장판에는 맞지 않는다)
 */
export function drawSukunaFires(ctx, fires, now, mathNow) {
    if (!fires || !fires.length) return;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < fires.length; i++) {
        const f = fires[i];
        if (!f) continue;
        const left = (f.endAt || 0) - now;
        if (left <= 0) continue;
        // 꺼지기 직전 1초 동안 옅어진다
        const fade = Math.min(1, left / 1000);
        const R = f.r || 460;

        // 바닥에 깔린 불
        ctx.globalAlpha = 0.55 * fade;
        let g = ctx.createRadialGradient(f.x, f.y, R * 0.15, f.x, f.y, R);
        g.addColorStop(0, "rgba(255, 240, 160, 0.9)");
        g.addColorStop(0.45, "rgba(255, 130, 40, 0.65)");
        g.addColorStop(1, "rgba(140, 25, 10, 0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, Math.PI * 2); ctx.fill();

        // 일렁이는 불꽃 혓바닥
        ctx.globalAlpha = 0.7 * fade;
        for (let k = 0; k < 14; k++) {
            const a = (k / 14) * Math.PI * 2;
            const wob = Math.sin(mathNow / 130 + k * 1.7) * 0.5 + 0.5;
            const rr = R * (0.55 + wob * 0.42);
            const fx2 = f.x + Math.cos(a) * rr * 0.8;
            const fy2 = f.y + Math.sin(a) * rr * 0.45;
            const hgt = 40 + wob * 70;

            let fg = ctx.createLinearGradient(fx2, fy2, fx2, fy2 - hgt);
            fg.addColorStop(0, "rgba(255, 200, 70, 0.85)");
            fg.addColorStop(0.6, "rgba(255, 110, 30, 0.5)");
            fg.addColorStop(1, "rgba(200, 40, 10, 0)");
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.moveTo(fx2 - 16, fy2);
            ctx.quadraticCurveTo(fx2 - 6, fy2 - hgt * 0.6, fx2, fy2 - hgt);
            ctx.quadraticCurveTo(fx2 + 6, fy2 - hgt * 0.6, fx2 + 16, fy2);
            ctx.closePath();
            ctx.fill();
        }

        // 경계 링
        ctx.globalAlpha = 0.5 * fade;
        ctx.strokeStyle = "rgba(255, 170, 60, 0.8)";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
}
