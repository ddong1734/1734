// 파일명: renderUtils.js

export class RenderUtils {
    static isVisible(camX, camY, viewW, viewH, objX, objY, objW = 0, objH = 0, padding = 300) {
        return (objX + objW > camX - padding) &&
               (objX - objW < camX + viewW + padding) &&
               (objY + objH > camY - padding) &&
               (objY - objH < camY + viewH + padding);
    }

    static withContext(ctx, x, y, renderFn) {
        ctx.save();
        ctx.translate(x, y);
        renderFn();
        ctx.restore();
    }

    static withRotation(ctx, x, y, angle, renderFn) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        renderFn();
        ctx.restore();
    }

    // ⚡ 새롭게 추가된 감전 스파크 이펙트
    static drawShockEffect(ctx, cx, cy, radius, mathNow) {
        ctx.save(); 
        ctx.translate(cx, cy); 
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = "rgba(160, 240, 255, 0.9)"; 
        ctx.lineWidth = Math.max(3, radius * 0.08); 
        ctx.lineCap = "round";
        for (let s = 0; s < 5; s++) {
            let a2 = (Math.PI * 2 / 5) * s + mathNow / 90;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a2) * radius * 0.3, Math.sin(a2) * radius * 0.3);
            ctx.lineTo(Math.cos(a2 + 0.4) * radius * 0.65, Math.sin(a2 + 0.4) * radius * 0.65);
            ctx.lineTo(Math.cos(a2) * radius * 1.0, Math.sin(a2) * radius * 1.0);
            ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over"; 
        ctx.restore();
    }

    /**
     * 🧊 동결 표시.
     *    ⚠️ 다이도 [질풍참] 기절처럼 stunUntil 이 함께 걸린 대상은
     *       얼음이 아니라 노란 별(기절)로 그린다.
     *       (호출 지점이 16곳이라 여기서 한 번에 갈아끼운다)
     */
    static drawFrozenEffect(ctx, cx, cy, size, mathNow, obj) {
        if (obj && obj.stunUntil && mathNow < obj.stunUntil) {
            RenderUtils.drawStunEffect(ctx, cx, cy, size, mathNow);
            return;
        }
        RenderUtils._drawFrozenReal(ctx, cx, cy, size, mathNow);
    }

    static _drawFrozenReal(ctx, cx, cy, size, mathNow) {
        let half = size / 2;
        ctx.save();
        ctx.translate(cx, cy);
        let pulse = 0.35 + Math.sin(mathNow / 200) * 0.12;
        ctx.fillStyle = `rgba(120, 210, 255, ${pulse})`;
        ctx.fillRect(-half, -half, size, size);
        ctx.strokeStyle = "rgba(200, 240, 255, 0.9)";
        ctx.lineWidth = Math.max(3, size * 0.05);
        ctx.strokeRect(-half, -half, size, size);
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = Math.max(1.5, size * 0.025);
        for (let i = 0; i < 6; i++) {
            let ang = (Math.PI * 2 / 6) * i + (i % 2 === 0 ? 0.3 : -0.3);
            let len = half * (0.55 + (i % 3) * 0.15);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang) * len * 0.5, Math.sin(ang) * len * 0.5);
            ctx.lineTo(Math.cos(ang + 0.25) * len, Math.sin(ang + 0.25) * len);
            ctx.stroke();
        }
        ctx.fillStyle = "rgba(220, 245, 255, 0.9)";
        let corners = [[-half, -half], [half, -half], [half, half], [-half, half]];
        corners.forEach(([qx, qy]) => {
            let dirX = qx < 0 ? 1 : -1, dirY = qy < 0 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(qx, qy);
            ctx.lineTo(qx + dirX * size * 0.22, qy + dirY * size * 0.05);
            ctx.lineTo(qx + dirX * size * 0.05, qy + dirY * size * 0.22);
            ctx.closePath();
            ctx.fill();
        });
        for (let s = 0; s < 5; s++) {
            let t = (mathNow / 500 + s * 0.7) % 1;
            let sx = -half + ((s * 97 + mathNow * 0.03) % size);
            let sy = half - t * size;
            let a = (1 - t) * 0.9;
            ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
            ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, size * 0.03), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
    }

    /**
     * 💫 기절 표시 — 머리 위를 도는 노란 별.
     *    다이도 [질풍참] 마무리처럼 '얼리는 게 아니라 정신을 잃게' 하는 기절에 쓴다.
     */
    static drawStunEffect(ctx, cx, cy, size, mathNow) {
        const R = size * 0.42;
        const top = cy - size * 0.62;
        ctx.save();
        ctx.globalCompositeOperation = "screen";

        for (let k = 0; k < 3; k++) {
            const a = mathNow / 260 + (k / 3) * Math.PI * 2;
            const sx = cx + Math.cos(a) * R;
            const sy = top + Math.sin(a) * R * 0.32;
            const sc = 0.7 + Math.sin(a) * 0.25;

            ctx.save();
            ctx.translate(sx, sy);
            ctx.scale(sc, sc);
            ctx.rotate(mathNow / 180 + k);
            ctx.fillStyle = "rgba(255, 226, 92, 0.95)";
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const rr = (i % 2 === 0) ? 13 : 5.5;
                const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 220, 0.9)";
            ctx.lineWidth = 1.5; ctx.stroke();
            ctx.restore();
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
    }

    /**
     * 🩸 출혈 표시 — 아래로 흘러내리는 붉은 핏방울.
     *    화상(주황 불꽃)과 확실히 구분되도록 색과 방향을 다르게 한다.
     */
    static drawBleedEffect(ctx, cx, cy, size, mathNow) {
        ctx.save();
        const R = size * 0.42;

        // 몸을 감싸는 옅은 붉은 기운
        let g = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.15);
        g.addColorStop(0, "rgba(170, 10, 20, 0)");
        g.addColorStop(0.7, "rgba(190, 15, 25, 0.25)");
        g.addColorStop(1, "rgba(120, 0, 10, 0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2); ctx.fill();

        // 흘러내리는 핏방울 6개
        for (let k = 0; k < 6; k++) {
            const seed = k * 1.7;
            const t = ((mathNow / 620) + k / 6) % 1;
            const dx = Math.cos(seed) * R * 0.7;
            const dy = -R * 0.35 + t * R * 1.5;
            const a = (1 - t) * 0.9;
            const rr = 4 + (1 - t) * 3.5;

            ctx.globalAlpha = a;
            ctx.fillStyle = "rgba(190, 20, 30, 0.95)";
            ctx.beginPath();
            ctx.moveTo(cx + dx, cy + dy - rr * 1.5);
            ctx.quadraticCurveTo(cx + dx + rr, cy + dy, cx + dx, cy + dy + rr);
            ctx.quadraticCurveTo(cx + dx - rr, cy + dy, cx + dx, cy + dy - rr * 1.5);
            ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /**
     * 🔥 화상 표시.
     *    ⚠️ 다이도 [일섬] 출혈처럼 bleedUntil 이 걸린 대상은
     *       불꽃이 아니라 붉은 핏방울로 그린다.
     */
    static drawBurningEffect(ctx, cx, cy, size, mathNow, obj) {
        if (obj && obj.bleedUntil && mathNow < obj.bleedUntil) {
            RenderUtils.drawBleedEffect(ctx, cx, cy, size, mathNow);
            return;
        }
        RenderUtils._drawBurningReal(ctx, cx, cy, size, mathNow);
    }

    static _drawBurningReal(ctx, cx, cy, size, mathNow) {
        let half = size / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalCompositeOperation = "screen";
        let base = ctx.createRadialGradient(0, half * 0.5, size * 0.1, 0, half * 0.5, half * 1.15);
        base.addColorStop(0, "rgba(255, 120, 20, 0.55)");
        base.addColorStop(0.5, "rgba(200, 40, 0, 0.3)");
        base.addColorStop(1, "rgba(120, 10, 0, 0)");
        ctx.fillStyle = base;
        ctx.beginPath(); ctx.ellipse(0, half * 0.5, half * 1.15, half * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        
        let flames = 8;
        for (let i = 0; i < flames; i++) {
            let fx = (i / (flames - 1) - 0.5) * size * 0.95;
            let seed = i * 1.7 + mathNow / 110;
            let flick = 0.6 + Math.abs(Math.sin(seed)) * 0.7;
            let fh = half * (1.0 + Math.sin(seed * 1.3) * 0.35) * flick;
            let baseY = half * 0.55;
            
            let g = ctx.createLinearGradient(0, baseY, 0, baseY - fh);
            g.addColorStop(0, "rgba(255, 60, 0, 0.6)");
            g.addColorStop(0.45, "rgba(255, 110, 10, 0.5)");
            g.addColorStop(1, "rgba(255, 30, 0, 0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(fx - size * 0.12, baseY);
            ctx.quadraticCurveTo(fx - size * 0.05, baseY - fh * 0.5, fx, baseY - fh);
            ctx.quadraticCurveTo(fx + size * 0.05, baseY - fh * 0.5, fx + size * 0.12, baseY);
            ctx.closePath();
            ctx.fill();
            
            let g2 = ctx.createLinearGradient(0, baseY, 0, baseY - fh * 0.6);
            g2.addColorStop(0, "rgba(255, 240, 150, 0.95)");
            g2.addColorStop(1, "rgba(255, 170, 30, 0)");
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.moveTo(fx - size * 0.05, baseY);
            ctx.quadraticCurveTo(fx, baseY - fh * 0.35, fx, baseY - fh * 0.6);
            ctx.quadraticCurveTo(fx, baseY - fh * 0.35, fx + size * 0.05, baseY);
            ctx.closePath();
            ctx.fill();
        }
        
        for (let s = 0; s < 7; s++) {
            let t = (mathNow / 420 + s * 0.55) % 1;
            let ex = (Math.sin(s * 3 + mathNow / 180) * half * 0.7);
            let ey = half * 0.5 - t * size * 1.0;
            let r = Math.max(1.5, size * 0.03) * (1 - t * 0.5);
            ctx.fillStyle = `rgba(255, ${Math.round(200 - t * 130)}, ${Math.round(60 - t * 60)}, ${(1 - t) * 0.95})`;
            ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
    }

    static drawMaguBomb(ctx, cx, cy, size, mathNow, until) {
        let left = until - mathNow;
        if (left <= 0) return;
        let pulse = 1 + Math.abs(Math.sin(mathNow / 90)) * 0.25;
        let urgent = left < 1000;
        let displaySize = size * 1.5;
        
        ctx.save(); ctx.translate(cx, cy);
        ctx.globalCompositeOperation = "screen";
        let core = ctx.createRadialGradient(0, 0, displaySize * 0.15, 0, 0, displaySize * pulse);
        core.addColorStop(0, urgent ? "rgba(255, 240, 160, 0.9)" : "rgba(255, 180, 60, 0.7)");
        core.addColorStop(0.5, "rgba(255, 80, 10, 0.5)");
        core.addColorStop(1, "rgba(160, 20, 0, 0)");
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, displaySize * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        
        ctx.strokeStyle = urgent ? "rgba(255, 60, 0, 0.95)" : "rgba(255, 150, 0, 0.8)";
        ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, displaySize * pulse, 0, Math.PI * 2); ctx.stroke();
        
        ctx.strokeStyle = "rgba(255, 220, 90, 0.9)"; ctx.lineWidth = 3; ctx.lineCap = "round";
        for (let c = 0; c < 6; c++) {
            let ang = (Math.PI * 2 / 6) * c + mathNow / 500;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * displaySize * 0.3, Math.sin(ang) * displaySize * 0.3);
            ctx.lineTo(Math.cos(ang) * displaySize * pulse * 0.95, Math.sin(ang) * displaySize * pulse * 0.95);
            ctx.stroke();
        }
        
        ctx.fillStyle = "#fff"; ctx.font = "bold 24px sans-serif"; ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(120, 20, 0, 0.9)"; ctx.lineWidth = 4; ctx.lineJoin = "round";
        let txt = Math.ceil(left / 1000).toString();
        ctx.strokeText(txt, 0, -displaySize - 15); ctx.fillText(txt, 0, -displaySize - 15);
        ctx.restore();
    }
}
