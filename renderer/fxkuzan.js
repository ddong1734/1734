// 파일명: fxkuzan.js

import { registerVisualFX, registerShockwave } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

registerVisualFX('awaken_icicles', (ctx, fx, alpha) => {
    let prog = 1 - alpha;
    RenderUtils.withContext(ctx, fx.x, fx.y + 45, () => {
        for(let k = 0; k < 14; k++) {
            let seed = k * 1.842;
            let angle = (Math.PI * 2 / 14) * k + Math.sin(seed);
            let dist = 30 + Math.cos(seed * 2) * 60;
            let height = 60 + Math.sin(seed * 3) * 70;
            let width = 14 + Math.cos(seed * 4) * 10;
            let currentHeight = height * Math.min(1, prog * 5); 
            if (currentHeight > 0) {
                RenderUtils.withContext(ctx, Math.cos(angle)*dist, Math.sin(angle)*dist * 0.35, () => {
                    let icicleGrad = ctx.createLinearGradient(0, 0, 0, -currentHeight);
                    icicleGrad.addColorStop(0, `rgba(180, 235, 255, ${alpha * 0.9})`);
                    icicleGrad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);
                    ctx.fillStyle = icicleGrad; ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(-width/2, 0); ctx.lineTo(0, -currentHeight); ctx.lineTo(width/2, 0); ctx.closePath();
                    ctx.fill(); ctx.stroke();
                });
            }
        }
    });
});

registerVisualFX('ice_age', (ctx, fx, alpha) => {
    let prog = 1 - alpha;
    RenderUtils.withContext(ctx, fx.x, fx.y + 45, () => {
        ctx.globalCompositeOperation = "screen";
        let rad = prog * 600 + 50; 
        let auraGrad = ctx.createRadialGradient(0, 0, rad * 0.2, 0, 0, rad * 1.1);
        auraGrad.addColorStop(0, `rgba(135, 215, 255, ${alpha * 0.5})`); auraGrad.addColorStop(1, "rgba(135, 215, 255, 0)");
        ctx.fillStyle = auraGrad; ctx.beginPath(); ctx.ellipse(0, 0, rad * 1.1, rad * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        
        let grad = ctx.createRadialGradient(0, 0, rad * 0.4, 0, 0, rad);
        grad.addColorStop(0, `rgba(220, 245, 255, ${alpha * 0.9})`); grad.addColorStop(0.4, `rgba(135, 215, 255, ${alpha * 0.75})`); 
        grad.addColorStop(0.7, `rgba(100, 200, 255, ${alpha * 0.6})`); grad.addColorStop(1, "rgba(50, 150, 255, 0)");
        ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(0, 0, rad, rad * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`; ctx.lineWidth = 4 + alpha * 4;
        for (let s = 0; s < 16; s++) {
            let ang = (Math.PI * 2 / 16) * s, len = rad * (0.5 + (s % 2 === 0 ? 0.4 : 0.2));
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len * 0.4); ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
    });
});

registerVisualFX('ice_glove', (ctx, fx, alpha) => {
    let dir = fx.isLeft ? -1 : 1, prog = 1 - alpha;
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.scale(dir, 1); let stretch = prog * 60; ctx.translate(stretch, 0);
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = `rgba(160, 225, 255, ${alpha * 0.95})`; ctx.strokeStyle = `rgba(220, 245, 255, ${alpha})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(10, -20); ctx.lineTo(-20, -15); ctx.lineTo(-30, 0); ctx.lineTo(-20, 15); ctx.lineTo(10, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
        
        let aura = ctx.createRadialGradient(0, 0, 15, 0, 0, 65);
        aura.addColorStop(0, `rgba(255, 255, 255, ${alpha})`); aura.addColorStop(0.3, `rgba(135, 215, 255, ${alpha * 0.7})`); 
        aura.addColorStop(0.7, `rgba(100, 200, 255, ${alpha * 0.5})`); aura.addColorStop(1, "rgba(50, 150, 255, 0)");
        ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, 65, 0, Math.PI * 2); ctx.fill();
        
        if (prog > 0.4) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            for (let p3 = 0; p3 < 4; p3++) {
                let px = 20 + Math.cos(p3 * 1.5 + prog * 5) * (prog * 30), py = Math.sin(p3 * 1.5 + prog * 5) * (prog * 30);
                ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.globalCompositeOperation = "source-over";
    });
});

registerVisualFX('trail_ice', (ctx, fx, alpha) => {
    let prog = 1 - alpha, bx = fx.x - (fx.dir * 15);
    RenderUtils.withContext(ctx, bx, fx.y, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = "rgba(135, 215, 255, 0.9)"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath();
        let rot = prog * Math.PI * 1.2;
        for (let a2 = 0; a2 < Math.PI * 2.2; a2 += 0.3) {
            let rr = 14 + a2 * 10 * (0.6 + alpha * 0.4);
            let xx = Math.cos(a2 + rot) * rr, yy = Math.sin(a2 + rot) * rr;
            if (a2 === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
    });
});

registerShockwave('pheasant_peck', (ctx, sw, state) => {
    let alpha = Math.max(0, sw.life / 60), pulse = 1 + Math.sin(state.mathNow / 50) * 0.15;
    RenderUtils.withContext(ctx, sw.x, sw.y, () => {
        ctx.globalAlpha = alpha; ctx.globalCompositeOperation = "screen"; ctx.scale(sw.dir * pulse, pulse);
        
        let outerAura = ctx.createRadialGradient(0, 0, 100, 0, 0, 220);
        outerAura.addColorStop(0, "rgba(135, 215, 255, 0.4)"); outerAura.addColorStop(1, "rgba(135, 215, 255, 0)");
        ctx.fillStyle = outerAura; ctx.beginPath(); ctx.ellipse(0, 0, 220, 160, 0, 0, Math.PI * 2); ctx.fill();
        
        let core = ctx.createRadialGradient(0, 0, 20, 0, 0, 190);
        core.addColorStop(0, "rgba(255, 255, 255, 1)"); core.addColorStop(0.2, "rgba(180, 240, 255, 0.9)"); 
        core.addColorStop(0.5, "rgba(135, 215, 255, 0.7)"); core.addColorStop(1, "rgba(0, 150, 255, 0)");
        ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(0, 0, 170, 130, 0, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = "rgba(200, 240, 255, 0.95)";
        ctx.beginPath(); ctx.moveTo(80, 0); ctx.lineTo(-40, -140); ctx.lineTo(-100, -60); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(80, 0); ctx.lineTo(-40, 140); ctx.lineTo(-100, 60); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(140, 0); ctx.lineTo(60, -30); ctx.lineTo(60, 30); ctx.closePath(); ctx.fill();
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`; ctx.lineWidth = 4; ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
    });
});
