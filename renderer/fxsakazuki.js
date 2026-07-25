// 파일명: fxsakazuki.js

import { registerVisualFX } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

registerVisualFX('magma_impact', (ctx, fx, alpha) => {
    let r = (1 - alpha);
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha;
        let R = 300 * r + 50;
        let grad = ctx.createRadialGradient(0, 0, 12, 0, 0, R);
        grad.addColorStop(0, "rgba(255, 250, 220, 1)"); grad.addColorStop(0.3, "rgba(255, 140, 30, 0.85)");
        grad.addColorStop(0.7, "rgba(220, 50, 0, 0.4)"); grad.addColorStop(1, "rgba(150, 20, 0, 0)");
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = `rgba(255, 200, 80, ${alpha})`; ctx.lineWidth = 10 * alpha + 2;
        ctx.beginPath(); ctx.arc(0, 0, (260 * r + 30), 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(255, 150, 30, ${alpha})`;
        for (let s = 0; s < 14; s++) {
            let ang = -Math.PI + (Math.PI / 13) * s, rr = (200 * r + 30);
            let bx = Math.cos(ang) * rr, by = Math.sin(ang) * rr * 0.9 - r * 40;
            ctx.beginPath(); ctx.arc(bx, by, (10 - r * 6) + 3, 0, Math.PI * 2); ctx.fill();
        }
        for (let s2 = 0; s2 < 8; s2++) {
            let px = (Math.sin(s2 * 2.3) * 90 * r), py = -r * (160 + s2 * 12);
            ctx.fillStyle = `rgba(255, ${Math.round(220 - r * 120)}, 40, ${alpha * 0.9})`;
            ctx.beginPath(); ctx.arc(px, py, (8 - r * 5) + 2, 0, Math.PI * 2); ctx.fill();
        }
        
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = alpha * 0.35; ctx.fillStyle = "rgba(40, 20, 15, 1)";
        for (let s3 = 0; s3 < 4; s3++) {
            let sx = (s3 - 1.5) * 60 * r, sy = -r * (120 + s3 * 20);
            ctx.beginPath(); ctx.arc(sx, sy, 30 * r + 10, 0, Math.PI * 2); ctx.fill();
        }
    });
});

registerVisualFX('magma_punch', (ctx, fx, alpha) => {
    let dir = fx.isLeft ? -1 : 1, prog = 1 - alpha;
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.scale(dir, 1); ctx.translate(prog * 55, 0); ctx.globalCompositeOperation = "screen";
        
        let aura = ctx.createRadialGradient(0, 0, 8, 0, 0, 72);
        aura.addColorStop(0, `rgba(255, 220, 90, ${alpha})`); aura.addColorStop(0.4, `rgba(255, 80, 10, ${alpha * 0.7})`); aura.addColorStop(1, "rgba(170, 25, 0, 0)");
        ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, 72, 0, Math.PI * 2); ctx.fill();
        
        let spray = ctx.createLinearGradient(0, 0, 95, 0);
        spray.addColorStop(0, `rgba(255, 200, 70, ${alpha})`); spray.addColorStop(0.6, `rgba(255, 90, 15, ${alpha * 0.6})`); spray.addColorStop(1, "rgba(200, 30, 0, 0)");
        ctx.fillStyle = spray;
        ctx.beginPath(); ctx.moveTo(10, -26); ctx.quadraticCurveTo(70, -10, 95, 0); ctx.quadraticCurveTo(70, 10, 10, 26); ctx.closePath(); ctx.fill();
        
        ctx.globalCompositeOperation = "source-over";
        let core = ctx.createRadialGradient(8, -6, 6, 15, 0, 30);
        core.addColorStop(0, "#fff0c0"); core.addColorStop(0.4, "#ff7a1a"); core.addColorStop(0.85, "#8a1a00"); core.addColorStop(1, "#2a0800");
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(15, 0, 28, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = `rgba(255, 210, 70, ${alpha})`; ctx.lineWidth = 3; ctx.lineCap = "round";
        for (let c = 0; c < 4; c++) {
            let a2 = (Math.PI / 2) * c + Math.PI / 4;
            ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(15 + Math.cos(a2) * 24, Math.sin(a2) * 24); ctx.stroke();
        }
        
        ctx.globalCompositeOperation = "screen";
        for (let p2 = 0; p2 < 6; p2++) {
            let a3 = (p2 / 6) * Math.PI * 2 + prog * 4, rr = 20 + prog * 55;
            ctx.fillStyle = `rgba(255, ${140 + p2 * 15}, 30, ${alpha})`;
            ctx.beginPath(); ctx.arc(15 + Math.cos(a3) * rr, Math.sin(a3) * rr, (6 - prog * 3) + 1.5, 0, Math.PI * 2); ctx.fill();
        }
    });
});

registerVisualFX('magma_trail', (ctx, fx, alpha) => {
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha;
        let r = 35 * alpha + 10;
        let g3 = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
        g3.addColorStop(0, "rgba(255, 240, 170, 0.9)"); g3.addColorStop(0.3, "rgba(255, 120, 30, 0.7)"); g3.addColorStop(1, "rgba(180, 20, 0, 0)");
        ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = `rgba(255, ${Math.round(150 + alpha * 80)}, 30, ${alpha})`;
        ctx.beginPath(); ctx.arc(0, -10 * (1 - alpha), 5 * alpha + 2, 0, Math.PI * 2); ctx.fill();
        
        let tailLen = 50 * alpha + 25;
        let tailG = ctx.createLinearGradient(0, 0, 0, -tailLen);
        tailG.addColorStop(0, `rgba(255, 100, 20, ${alpha * 0.85})`); tailG.addColorStop(1, "rgba(180, 10, 0, 0)");
        ctx.fillStyle = tailG; ctx.beginPath(); ctx.moveTo(-r * 0.4, 0); ctx.lineTo(r * 0.4, 0); ctx.lineTo(0, -tailLen); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    });
});
