// 파일명: renderPortal.js
// ============================================================================
// 🌀 포탈 렌더링
//
//   · drawPortalLifetime      : 포탈 소멸까지 남은 시간
//   · drawPortal              : 포탈 본체 (기지 귀환 · 암흑 왕좌 공용)
//   · drawPortalCountdown     : 포탈 대기 중인 플레이어 머리 위 카운트다운
//   · drawDarkPortalCountdown : 암흑 포탈 대기 카운트다운 (보라색)
// ============================================================================

import { RenderUtils } from './renderUtils.js';

// ⏳ 포탈 소멸까지 남은 시간 표시
// ============================================================================
function drawPortalLifetime(ctx, pt, mathNow, isDark) {
    if (!pt || !pt.expireAt) return;
    let remain = pt.expireAt - mathNow;
    if (remain <= 0) return;

    const R = pt.radius || 110;
    let sec = Math.max(1, Math.ceil(remain / 1000));
    let urgent = (remain <= 5000);
    let blink = urgent ? (0.55 + Math.abs(Math.sin(mathNow / 110)) * 0.45) : 1;
    let beat = 1 + (1 - ((remain % 1000) / 1000)) * (urgent ? 0.3 : 0.14);

    ctx.save();
    ctx.translate(pt.x, pt.y - R * 2.15);
    ctx.scale(beat, beat);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = blink;
    let g = ctx.createRadialGradient(0, 0, 5, 0, 0, 70);
    if (urgent) {
        g.addColorStop(0, "rgba(255, 190, 190, 0.95)");
        g.addColorStop(0.5, "rgba(255, 60, 60, 0.55)");
        g.addColorStop(1, "rgba(160, 0, 0, 0)");
    } else if (isDark) {
        g.addColorStop(0, "rgba(230, 200, 255, 0.9)");
        g.addColorStop(0.5, "rgba(150, 55, 245, 0.5)");
        g.addColorStop(1, "rgba(60, 0, 120, 0)");
    } else {
        g.addColorStop(0, "rgba(255, 250, 200, 0.9)");
        g.addColorStop(0.5, "rgba(255, 200, 40, 0.5)");
        g.addColorStop(1, "rgba(255, 170, 0, 0)");
    }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.strokeStyle = urgent ? "rgba(60, 0, 0, 0.95)" : (isDark ? "rgba(15, 0, 30, 0.95)" : "rgba(70, 45, 0, 0.95)");
    ctx.lineWidth = 9;
    ctx.strokeText(sec, 0, 0);
    ctx.fillStyle = urgent ? `rgba(255, 120, 120, ${blink})` : (isDark ? "#e0c2ff" : "#fff3b0");
    ctx.fillText(sec, 0, 0);

    ctx.font = "bold 20px sans-serif";
    ctx.strokeStyle = urgent ? "rgba(60, 0, 0, 0.95)" : (isDark ? "rgba(15, 0, 30, 0.95)" : "rgba(70, 45, 0, 0.95)");
    ctx.lineWidth = 5;
    ctx.strokeText("소멸까지", 0, -42);
    ctx.fillStyle = urgent ? "#ffb0b0" : (isDark ? "#c9a0ff" : "#ffe680");
    ctx.fillText("소멸까지", 0, -42);

    ctx.textBaseline = "alphabetic";
    ctx.restore();
}

// ============================================================================
// 🌀 포탈 그리기 공용 함수
// ============================================================================
function drawPortal(ctx, camX, camY, viewW, viewH, mathNow, pt, kind, label, showLifetime) {
    if (!pt) return;
    const R = pt.radius || 110;
    if (!RenderUtils.isVisible(camX, camY, viewW, viewH, pt.x, pt.y, R * 2, R * 2)) return;

    const spin = mathNow / 500;
    const pulse = 1 + Math.sin(mathNow / 220) * 0.12;
    const isDark = (kind === 'dark');

    ctx.save();
    ctx.translate(pt.x, pt.y);

    ctx.globalCompositeOperation = "screen";
    let aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 2.1 * pulse);
    if (isDark) {
        aura.addColorStop(0, "rgba(205, 150, 255, 0.85)");
        aura.addColorStop(0.45, "rgba(126, 30, 220, 0.5)");
        aura.addColorStop(1, "rgba(40, 0, 80, 0)");
    } else {
        aura.addColorStop(0, "rgba(255, 250, 190, 0.85)");
        aura.addColorStop(0.45, "rgba(255, 205, 40, 0.45)");
        aura.addColorStop(1, "rgba(255, 170, 0, 0)");
    }
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 2.1 * pulse, R * 1.6 * pulse, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    if (isDark) {
        ctx.fillStyle = "rgba(3, 0, 8, 0.98)";
        ctx.beginPath(); ctx.ellipse(0, 0, R * pulse, R * 1.25 * pulse, 0, 0, Math.PI * 2); ctx.fill();

        ctx.globalCompositeOperation = "screen";
        let core = ctx.createRadialGradient(0, 0, R * 0.06, 0, 0, R * pulse);
        core.addColorStop(0, "rgba(240, 215, 255, 0.95)");
        core.addColorStop(0.3, "rgba(150, 55, 245, 0.6)");
        core.addColorStop(0.72, "rgba(70, 0, 140, 0.35)");
        core.addColorStop(1, "rgba(10, 0, 25, 0)");
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.ellipse(0, 0, R * pulse, R * 1.25 * pulse, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    } else {
        ctx.globalCompositeOperation = "screen";
        let core = ctx.createRadialGradient(0, 0, R * 0.08, 0, 0, R * pulse);
        core.addColorStop(0, "rgba(255, 255, 255, 1)");
        core.addColorStop(0.35, "rgba(255, 236, 120, 0.95)");
        core.addColorStop(0.75, "rgba(240, 176, 20, 0.7)");
        core.addColorStop(1, "rgba(180, 110, 0, 0)");
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.ellipse(0, 0, R * pulse, R * 1.25 * pulse, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    }

    ctx.lineCap = "round";
    for (let a = 0; a < 4; a++) {
        let base = spin + a * (Math.PI / 2);
        if (isDark) {
            ctx.strokeStyle = "rgba(4, 0, 10, 0.95)";
            ctx.lineWidth = 13;
            ctx.beginPath();
            for (let t = 0; t <= 1.0001; t += 0.08) {
                let ang = base + t * Math.PI * 1.5;
                let rr = t * R * 1.05 * pulse;
                let xx = Math.cos(ang) * rr, yy = Math.sin(ang) * rr * 1.25;
                if (t === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
        }
        ctx.strokeStyle = isDark ? "rgba(190, 110, 255, 0.95)" : "rgba(255, 245, 190, 0.9)";
        ctx.lineWidth = isDark ? 5 : 7;
        ctx.beginPath();
        for (let t = 0; t <= 1.0001; t += 0.08) {
            let ang = base + t * Math.PI * 1.5;
            let rr = t * R * 1.05 * pulse;
            let xx = Math.cos(ang) * rr, yy = Math.sin(ang) * rr * 1.25;
            if (t === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
    }

    ctx.strokeStyle = isDark
        ? `rgba(160, 70, 255, ${0.8 + Math.sin(mathNow / 130) * 0.2})`
        : `rgba(255, 215, 60, ${0.8 + Math.sin(mathNow / 130) * 0.2})`;
    ctx.lineWidth = 6;
    ctx.setLineDash([18, 12]);
    ctx.lineDashOffset = -mathNow / 25;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.12 * pulse, R * 1.4 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    if (showLifetime && pt.expireAt && pt.createdAt) {
        let total = pt.expireAt - pt.createdAt;
        let left = Math.max(0, pt.expireAt - mathNow);
        let ratio = total > 0 ? (left / total) : 0;
        ctx.strokeStyle = (left <= 5000)
            ? `rgba(255, 70, 70, ${0.7 + Math.abs(Math.sin(mathNow / 110)) * 0.3})`
            : "rgba(220, 170, 255, 0.9)";
        ctx.lineWidth = 9;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
        ctx.stroke();
        ctx.lineCap = "butt";
    }

    ctx.globalCompositeOperation = "screen";
    for (let s = 0; s < 10; s++) {
        let t = ((mathNow / 900) + s * 0.1) % 1;
        let ang = s * 2.3 + spin * 2;
        let rr = (1 - t) * R * 1.9;
        ctx.globalAlpha = t;
        ctx.fillStyle = isDark ? "rgba(205, 150, 255, 0.95)" : "rgba(255, 250, 200, 0.95)";
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * rr, Math.sin(ang) * rr * 1.2, 5 * t + 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
    ctx.strokeStyle = isDark ? "rgba(15, 0, 30, 0.95)" : "rgba(70, 45, 0, 0.95)"; ctx.lineWidth = 6;
    ctx.strokeText(label, 0, -R * 1.55);
    ctx.fillStyle = isDark ? "#d9b3ff" : "#ffe680";
    ctx.fillText(label, 0, -R * 1.55);

    ctx.restore();

    if (showLifetime) drawPortalLifetime(ctx, pt, mathNow, isDark);
}

// 🌀 포탈 대기 중인 플레이어 머리 위 카운트다운
function drawPortalCountdown(ctx, px, py, until, mathNow) {
    if (!until || mathNow >= until) return;
    let remain = until - mathNow;
    let sec = Math.max(1, Math.ceil(remain / 1000));
    let beat = 1 + (1 - ((remain % 1000) / 1000)) * 0.25;

    ctx.save();
    ctx.translate(px, py - 125);
    ctx.scale(beat, beat);

    ctx.globalCompositeOperation = "screen";
    let g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    g.addColorStop(0, "rgba(255, 250, 200, 0.9)");
    g.addColorStop(0.5, "rgba(255, 200, 40, 0.5)");
    g.addColorStop(1, "rgba(255, 170, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.font = "bold 46px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(70, 45, 0, 0.95)"; ctx.lineWidth = 8;
    ctx.strokeText(sec, 0, 0);
    ctx.fillStyle = "#fff3b0";
    ctx.fillText(sec, 0, 0);

    ctx.textBaseline = "alphabetic";
    ctx.restore();
}

// 🟣 암흑 포탈 대기 카운트다운 (보라색)
function drawDarkPortalCountdown(ctx, px, py, until, mathNow) {
    if (!until || mathNow >= until) return;
    let remain = until - mathNow;
    let sec = Math.max(1, Math.ceil(remain / 1000));
    let beat = 1 + (1 - ((remain % 1000) / 1000)) * 0.25;

    ctx.save();
    ctx.translate(px, py - 125);
    ctx.scale(beat, beat);

    ctx.globalCompositeOperation = "screen";
    let g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    g.addColorStop(0, "rgba(230, 200, 255, 0.9)");
    g.addColorStop(0.5, "rgba(150, 55, 245, 0.55)");
    g.addColorStop(1, "rgba(60, 0, 120, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.font = "bold 46px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(15, 0, 30, 0.95)"; ctx.lineWidth = 8;
    ctx.strokeText(sec, 0, 0);
    ctx.fillStyle = "#e0c2ff";
    ctx.fillText(sec, 0, 0);

    ctx.textBaseline = "alphabetic";
    ctx.restore();
}
export { drawPortalLifetime, drawPortal, drawPortalCountdown, drawDarkPortalCountdown };
