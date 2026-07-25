// 파일명: fxcommon.js

import { registerVisualFX, registerShockwave } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

registerVisualFX('huge_wind_burst', (ctx, fx, alpha) => {
    let prog = 1 - alpha, dir = fx.dir || 1, spin = prog * Math.PI * 1.4 * dir, scale = 0.6 + prog * 1.4;
    RenderUtils.withContext(ctx, fx.x, fx.y + 45, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha;
        let core = ctx.createRadialGradient(0, 0, 5, 0, 0, 90 * scale);
        core.addColorStop(0, "rgba(255,255,255,0.9)"); core.addColorStop(0.4, "rgba(200,225,255,0.5)"); core.addColorStop(1, "rgba(180,210,255,0)");
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, 90 * scale, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = "rgba(235,245,255,0.85)"; ctx.lineCap = "round";
        for (let arm = 0; arm < 4; arm++) {
            let base = spin + arm * (Math.PI / 2);
            ctx.lineWidth = 8 * alpha + 2; ctx.beginPath();
            for (let t = 0; t < 1; t += 0.08) {
                let ang = base + t * Math.PI * 1.6, rr = t * 130 * scale, xx = Math.cos(ang) * rr, yy = Math.sin(ang) * rr * 0.75;
                if (t === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
        }
        
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.8})`; ctx.lineWidth = 3;
        for (let s = 0; s < 8; s++) {
            let ang = (Math.PI * 2 / 8) * s + spin * 0.5, r1 = 100 * scale, r2 = (130 + prog * 90) * scale;
            let ox2 = Math.cos(ang), oy2 = Math.sin(ang) * 0.8;
            ctx.beginPath(); ctx.moveTo(ox2 * r1, oy2 * r1);
            ctx.quadraticCurveTo(ox2 * r2 - oy2 * 30 * dir, oy2 * r2 + ox2 * 30 * dir, ox2 * r2, oy2 * r2);
            ctx.stroke();
        }
        
        ctx.fillStyle = `rgba(235,245,255,${alpha * 0.85})`;
        for (let d = 0; d < 6; d++) {
            let ang = spin + d * (Math.PI * 2 / 6), rr = (70 + ((d * 53 + prog * 160) % 130)) * scale;
            let dx = Math.cos(ang) * rr, dy = Math.sin(ang) * rr * 0.8;
            ctx.beginPath(); ctx.arc(dx, dy, 3.5, 0, Math.PI * 2); ctx.fill();
        }
    });
});

registerVisualFX('punch', (ctx, fx, alpha) => {
    let dir = fx.isLeft ? -1 : 1, prog = 1 - alpha;
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.scale(dir, 1);
        RenderUtils.withContext(ctx, 0, 0, () => {
            ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha;
            let core = ctx.createRadialGradient(5, 0, 3, 5, 0, 55);
            core.addColorStop(0, "rgba(255,255,255,0.95)"); core.addColorStop(0.5, "rgba(160,210,255,0.5)"); core.addColorStop(1, "rgba(120,180,255,0)");
            ctx.fillStyle = core; ctx.beginPath(); ctx.arc(5, 0, 55, 0, Math.PI * 2); ctx.fill();
        });
        
        ctx.globalAlpha = alpha;
        for (let g = 0; g < 3; g++) {
            let spread = 26 + prog * 70 + g * 18, op = (0.85 - g * 0.22) * alpha;
            ctx.strokeStyle = `rgba(41, 128, 185, ${op})`; ctx.lineWidth = 11 - g * 2.5; ctx.lineCap = "round";
            ctx.beginPath(); ctx.arc(-8, 0, spread, -Math.PI * 0.6, Math.PI * 0.6); ctx.stroke();
            ctx.strokeStyle = `rgba(255,255,255,${op})`; ctx.lineWidth = 4 - g * 1; 
            ctx.beginPath(); ctx.arc(-8, 0, spread, -Math.PI * 0.6, Math.PI * 0.6); ctx.stroke();
        }
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 3.5; ctx.lineCap = "round";
        for (let s = 0; s < 5; s++) {
            let sy = (s - 2) * 22, sx = 20 + prog * 70;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 35, sy * 0.6, sx + 68 + prog * 24, sy * 0.3); ctx.stroke();
        }
    });
});

registerVisualFX('trail_white', (ctx, fx, alpha) => {
    let prog = 1 - alpha, bx = fx.x - (fx.dir * 15);
    RenderUtils.withContext(ctx, bx, fx.y, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = "rgba(220,235,255,0.9)"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath();
        let rot = prog * Math.PI * 1.2;
        for (let a2 = 0; a2 < Math.PI * 2.2; a2 += 0.3) {
            let rr = 12 + a2 * 9 * (0.6 + alpha * 0.4);
            let xx = Math.cos(a2 + rot) * rr, yy = Math.sin(a2 + rot) * rr;
            if (a2 === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
    });
});

registerShockwave('detroit', (ctx, sw, state) => {
    let alpha = Math.max(0, sw.life / 60), pulse = 1 + Math.sin(state.mathNow / 50) * 0.15; 
    RenderUtils.withContext(ctx, sw.x, sw.y, () => {
        ctx.globalAlpha = alpha; ctx.globalCompositeOperation = "screen"; ctx.scale(sw.dir * pulse, pulse); 
        
        let grad = ctx.createRadialGradient(0, 0, 20, 0, 0, 300);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)"); grad.addColorStop(0.3, "rgba(52, 152, 219, 0.8)"); grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(0, 0, 250, 350, 0, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; ctx.lineWidth = 12; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-150, -150); ctx.lineTo(150, 150); ctx.moveTo(-150, 150); ctx.lineTo(150, -150); ctx.moveTo(-300, 0); ctx.lineTo(300, 0); ctx.stroke();
        
        ctx.strokeStyle = `rgba(52, 152, 219, ${alpha})`; ctx.lineWidth = 20 * pulse; 
        ctx.beginPath(); ctx.ellipse(0, 0, 150 + (1 - alpha) * 200, 250 + (1 - alpha) * 300, 0, 0, Math.PI * 2); ctx.stroke();
        
        let swirl = (1 - alpha) * Math.PI * 1.2;
        ctx.strokeStyle = `rgba(200,225,255,${alpha * 0.7})`; ctx.lineWidth = 5;
        for (let arm = 0; arm < 3; arm++) {
            let base = swirl + arm * (Math.PI * 2 / 3);
            ctx.beginPath();
            for (let t = 0; t < 1; t += 0.12) {
                let ang = base + t * Math.PI * 1.3, rr = t * 230;
                let xx = Math.cos(ang) * rr, yy = Math.sin(ang) * rr * 1.15;
                if (t === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over"; 
    });
});

registerShockwave('default', (ctx, sw, state) => {
    RenderUtils.withContext(ctx, sw.x, sw.y, () => {
        ctx.beginPath(); ctx.moveTo(sw.dir * -20, 35); ctx.quadraticCurveTo(sw.dir * 60, 0, sw.dir * -20, -65); 
        ctx.strokeStyle = "rgba(142, 68, 173, 0.9)"; ctx.lineWidth = 18; ctx.stroke();
    });
});

registerVisualFX('levelup', (ctx, fx, alpha) => {
    ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center"; 
    ctx.fillText("LEVEL UP!", fx.x, fx.y - 100 - (60 - fx.life)); 
});

registerVisualFX('heal', (ctx, fx, alpha) => drawFloatingText(ctx, fx, alpha, "+", "#2ecc71"));
registerVisualFX('damage', (ctx, fx, alpha) => drawFloatingText(ctx, fx, alpha, "", "yellow"));
registerVisualFX('my_damage', (ctx, fx, alpha) => drawFloatingText(ctx, fx, alpha, "", "#ff8800"));

function drawFloatingText(ctx, fx, alpha, prefix, color) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.font = "bold 34px sans-serif"; ctx.textAlign = "center";
    let floatingY = fx.y - (30 - fx.life), text = prefix + fx.val;
    ctx.strokeStyle = "black"; ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.strokeText(text, fx.x, floatingY);
    ctx.fillStyle = color; ctx.fillText(text, fx.x, floatingY); 
    ctx.restore();
}
