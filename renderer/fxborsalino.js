// 파일명: fxborsalino.js

import { registerVisualFX } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

registerVisualFX('kizaru_gates', (ctx, fx, alpha, state) => {
    let owner = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    if (!owner || !owner.isCasting) { fx.active = false; return; } 
    RenderUtils.withContext(ctx, owner.x, owner.y - 20, () => {
        ctx.globalCompositeOperation = "screen";
        let fadeAlpha = alpha > 0.05 ? 1.0 : alpha * 20; ctx.globalAlpha = fadeAlpha;
        for (let k = 0; k < 5; k++) {
            let angle = (Math.PI / 4) * (k - 2) - Math.PI / 2, dist = 120 + Math.sin(state.mathNow / 150 + k * 2) * 20; 
            let gx = Math.cos(angle) * dist, gy = Math.sin(angle) * dist, pulse = 1 + Math.random() * 0.4; 
            
            RenderUtils.withContext(ctx, gx, gy, () => {
                ctx.scale(pulse, pulse);
                let aura = ctx.createRadialGradient(0, 0, 5, 0, 0, 55);
                aura.addColorStop(0, "rgba(255,255,255,0.95)"); aura.addColorStop(0.3, "rgba(255,240,100,0.85)"); aura.addColorStop(1, "rgba(255,180,0,0)");
                ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2); ctx.fill();
                let core = ctx.createRadialGradient(0, 0, 2, 0, 0, 25);
                core.addColorStop(0, "rgba(255,255,255,1)"); core.addColorStop(0.5, "rgba(255,255,180,0.95)"); core.addColorStop(1, "rgba(255,200,0,0)");
                ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
            });
        }
        ctx.globalCompositeOperation = "source-over";
    });
});

registerVisualFX('borsalino_beam', (ctx, fx, alpha, state) => {
    let dir = fx.dir === 1 ? 1 : -1, len = 1500, flick = 0.85 + Math.random() * 0.15;
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha * flick;
        let x0 = dir === 1 ? 0 : -len;

        if (fx.hasPika || fx.hasKizaru) {
            let mainG = ctx.createLinearGradient(0, -75, 0, 75);
            mainG.addColorStop(0, "rgba(255,200,40,0)"); mainG.addColorStop(0.5, `rgba(255,240,120,${0.85 * flick})`); mainG.addColorStop(1, "rgba(255,200,40,0)");
            ctx.fillStyle = mainG; ctx.fillRect(x0, -75, len, 150);
            
            let cg = ctx.createLinearGradient(0, -20, 0, 20);
            cg.addColorStop(0, "rgba(255,255,255,0)"); cg.addColorStop(0.5, `rgba(255,255,255,${flick})`); cg.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = cg; ctx.fillRect(x0, -20, len, 40);
            
            let topG = ctx.createLinearGradient(0, -140, 0, -90);
            topG.addColorStop(0, "rgba(255,200,40,0)"); topG.addColorStop(0.5, `rgba(255,240,120,${0.6 * flick})`); topG.addColorStop(1, "rgba(255,200,40,0)");
            ctx.fillStyle = topG; ctx.fillRect(x0, -140, len, 50); ctx.fillStyle = `rgba(255,255,255,${0.8 * flick})`; ctx.fillRect(x0, -118, len, 6);

            let botG = ctx.createLinearGradient(0, 90, 0, 140);
            botG.addColorStop(0, "rgba(255,200,40,0)"); botG.addColorStop(0.5, `rgba(255,240,120,${0.6 * flick})`); botG.addColorStop(1, "rgba(255,200,40,0)");
            ctx.fillStyle = botG; ctx.fillRect(x0, 90, len, 50); ctx.fillStyle = `rgba(255,255,255,${0.8 * flick})`; ctx.fillRect(x0, 112, len, 6);
            
            let flare = ctx.createRadialGradient(0, 0, 5, 0, 0, 90);
            flare.addColorStop(0, "rgba(255,255,255,1)"); flare.addColorStop(0.4, "rgba(255,240,120,0.8)"); flare.addColorStop(1, "rgba(255,200,40,0)");
            ctx.fillStyle = flare; ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.fill();
        } else {
            let auraG = ctx.createLinearGradient(0, -75, 0, 75);
            auraG.addColorStop(0, "rgba(255,200,40,0)"); auraG.addColorStop(0.5, `rgba(255,215,70,${0.35 * flick})`); auraG.addColorStop(1, "rgba(255,200,40,0)");
            ctx.fillStyle = auraG; ctx.fillRect(x0, -75, len, 150);
            
            let bg = ctx.createLinearGradient(0, -40, 0, 40);
            bg.addColorStop(0, "rgba(255,200,40,0)"); bg.addColorStop(0.5, "rgba(255,240,120,0.85)"); bg.addColorStop(1, "rgba(255,200,40,0)");
            ctx.fillStyle = bg; ctx.fillRect(x0, -40, len, 80);
            
            let flare2 = ctx.createRadialGradient(0, 0, 2, 0, 0, 60);
            flare2.addColorStop(0, "rgba(255,255,255,1)"); flare2.addColorStop(0.4, "rgba(255,240,120,0.8)"); flare2.addColorStop(1, "rgba(255,200,40,0)");
            ctx.fillStyle = flare2; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill();
        }

        ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(70, 0); ctx.moveTo(0, -50); ctx.lineTo(0, 50); ctx.stroke();
        
        let particleCount = (fx.hasPika || fx.hasKizaru) ? 12 : 6; let spreadY = (fx.hasPika || fx.hasKizaru) ? 120 : 22;
        for (let s = 0; s < particleCount; s++) {
            let px = x0 + ((s * 271 + fx.life * 40) % len); let py = Math.sin(s * 2 + fx.life * 0.3) * spreadY;
            ctx.fillStyle = `rgba(255,255,220,${alpha * 0.9})`; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
    });
});

registerVisualFX('yata_mirror_path', (ctx, fx, alpha) => {
    let path = fx.path;
    if (path && path.length >= 2) {
        let a = fx.life < fx.maxLife * 0.3 ? (fx.life / (fx.maxLife * 0.3)) : 1; let flick = 0.8 + Math.random() * 0.2;
        RenderUtils.withContext(ctx, 0, 0, () => {
            ctx.globalAlpha = a * flick; ctx.globalCompositeOperation = "screen";
            const stroke = (w, style) => {
                ctx.strokeStyle = style; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.lineCap = "round";
                ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
                for (let k = 1; k < path.length; k++) ctx.lineTo(path[k].x, path[k].y);
                ctx.stroke();
            };
            stroke(40, "rgba(255, 255, 150, 0.5)"); stroke(18, "rgba(255, 230, 40, 0.95)"); stroke(7, "rgba(255, 255, 255, 1)");
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            for (let k2 = 1; k2 < path.length; k2++) { ctx.beginPath(); ctx.arc(path[k2].x, path[k2].y, 15, 0, Math.PI*2); ctx.fill(); }
            ctx.globalCompositeOperation = "source-over";
        });
    }
});

registerVisualFX('yata_explosion', (ctx, fx, alpha) => {
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha;
        let r = (1 - alpha); let scaleMult = fx.hasJusticeCoat ? 1.5 : 1.0; 
        let grad = ctx.createRadialGradient(0, 0, 10, 0, 0, (400 * r + 40) * scaleMult);
        grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.35, "rgba(255,240,120,0.85)"); grad.addColorStop(1, "rgba(255,180,30,0)");
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, (400 * r + 40) * scaleMult, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,200,${alpha})`; ctx.lineWidth = 8; ctx.lineCap = "round";
        for (let s = 0; s < 12; s++) { let ang = (Math.PI*2/12)*s; let R1 = 60 * scaleMult, R2 = (320*r+80) * scaleMult; ctx.beginPath(); ctx.moveTo(Math.cos(ang)*R1, Math.sin(ang)*R1); ctx.lineTo(Math.cos(ang)*R2, Math.sin(ang)*R2); ctx.stroke(); }
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, 0, (300 * r + 30) * scaleMult, 0, Math.PI*2); ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
    });
});

registerVisualFX('yata_trail', (ctx, fx, alpha) => {
    RenderUtils.withContext(ctx, 0, 0, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = "rgba(255,240,150,0.8)"; ctx.beginPath(); ctx.arc(fx.x, fx.y, 30, 0, Math.PI*2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    });
});

registerVisualFX('ama_no_murakumo', (ctx, fx, alpha, state) => {
    let owner = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    if (owner && owner.lightDashUntil && state.mathNow < owner.lightDashUntil) return;

    let dir = fx.dir || 1, prog = 1 - alpha;
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.scale(dir, 1); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha;
        let aura = ctx.createRadialGradient(0, 0, 5, 0, 0, 110);
        aura.addColorStop(0, `rgba(255,250,150,${alpha * 0.75})`); aura.addColorStop(0.4, `rgba(255,220,70,${alpha * 0.4})`); aura.addColorStop(1, "rgba(255,190,30,0)");
        ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill();
        
        let sweep = -Math.PI * 0.5 + prog * Math.PI;
        let gradArc = ctx.createRadialGradient(0, 0, 20, 0, 0, 160);
        gradArc.addColorStop(0, "rgba(255,240,150,0)"); gradArc.addColorStop(0.7, `rgba(255,240,150,${alpha * 0.45})`); gradArc.addColorStop(1, "rgba(255,220,80,0)");
        ctx.fillStyle = gradArc; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 155, sweep - 0.6, sweep + 0.15); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = `rgba(255,240,150,${alpha * 0.6})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 145, sweep - 0.6, sweep + 0.15); ctx.stroke();
        
        ctx.rotate(sweep);
        let blade = ctx.createLinearGradient(0, 0, 160, 0);
        blade.addColorStop(0, "rgba(255,255,255,1)"); blade.addColorStop(0.5, "rgba(255,240,100,0.95)"); blade.addColorStop(1, "rgba(255,180,20,0)");
        ctx.strokeStyle = blade; ctx.lineWidth = 14; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(160, 0); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(150, 0); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.beginPath(); ctx.arc(155, 0, 12, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = `rgba(255, 255, 200, ${alpha})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(130, 0); ctx.lineTo(180, 0); ctx.moveTo(155, -25); ctx.lineTo(155, 25); ctx.stroke();
    });
});

registerVisualFX('light_dash', (ctx, fx, alpha) => {
    let prog = 1 - alpha, dir = fx.dir || 1;
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha;
        let R = 90 * prog + 40;
        let core = ctx.createRadialGradient(0, 0, 4, 0, 0, R);
        core.addColorStop(0, "rgba(255,255,255,1)"); core.addColorStop(0.4, "rgba(255,240,120,0.85)"); core.addColorStop(1, "rgba(255,200,40,0)");
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
        
        let streak = ctx.createLinearGradient(0, 0, dir * (170 + prog * 120), 0);
        streak.addColorStop(0, `rgba(255,255,255,${alpha})`); streak.addColorStop(0.5, `rgba(255,240,120,${alpha * 0.7})`); streak.addColorStop(1, "rgba(255,200,40,0)");
        ctx.fillStyle = streak;
        ctx.beginPath(); ctx.moveTo(0, -30 * alpha); ctx.lineTo(dir * (170 + prog * 120), 0); ctx.lineTo(0, 30 * alpha); ctx.closePath(); ctx.fill();
        
        ctx.strokeStyle = `rgba(255,255,220,${alpha})`; ctx.lineWidth = 4; ctx.lineCap = "round";
        for (let s = 0; s < 8; s++) {
            let ang = (Math.PI * 2 / 8) * s, r1 = 20, r2 = R * 0.9;
            ctx.beginPath(); ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1); ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2); ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
    });
});

registerVisualFX('light_trail', (ctx, fx, alpha) => {
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha;
        let r = 16 * alpha + 3;
        let g4 = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
        g4.addColorStop(0, "rgba(255, 255, 255, 1)"); g4.addColorStop(0.4, "rgba(255, 240, 120, 0.85)"); g4.addColorStop(1, "rgba(255, 200, 40, 0)");
        ctx.fillStyle = g4; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    });
});

registerVisualFX('magatama_explosion', (ctx, fx, alpha) => {
    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha;
        let r = (1 - alpha); let grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 60 * r + 10);
        grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.4, "rgba(255,240,120,0.9)"); grad.addColorStop(1, "rgba(255,200,40,0)");
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, 60 * r + 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,200,${alpha})`; ctx.lineWidth = 3;
        for (let s = 0; s < 6; s++) { let ang = (Math.PI*2/6)*s; ctx.beginPath(); ctx.moveTo(Math.cos(ang)*10, Math.sin(ang)*10); ctx.lineTo(Math.cos(ang)*(50*r+10), Math.sin(ang)*(50*r+10)); ctx.stroke(); }
        ctx.globalCompositeOperation = "source-over";
    });
});
