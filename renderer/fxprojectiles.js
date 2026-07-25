// 파일명: fxprojectiles.js

import { registerProjectile } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

registerProjectile('magatama', (ctx, proj, state) => {
    RenderUtils.withContext(ctx, proj.x, proj.y, () => {
        ctx.globalCompositeOperation = "screen";
        let aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
        aura.addColorStop(0, "rgba(255,220,70,0.7)"); aura.addColorStop(0.6, "rgba(255,200,40,0.25)"); aura.addColorStop(1, "rgba(255,190,30,0)");
        ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
        
        let halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
        halo.addColorStop(0, "rgba(255,255,255,1)"); halo.addColorStop(0.4, "rgba(255,240,120,0.9)"); halo.addColorStop(1, "rgba(255,200,40,0)");
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = "rgba(255,255,255,1)"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    });
});

registerProjectile('meigou', (ctx, proj, state) => {
    let R = 50, ang = Math.atan2(proj.vy || 0, proj.vx || (proj.team === 1 ? 1 : -1));
    RenderUtils.withRotation(ctx, proj.x, proj.y, ang, () => {
        ctx.globalCompositeOperation = "screen";
        let aura = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 2.2);
        aura.addColorStop(0, "rgba(255, 210, 90, 0.95)"); aura.addColorStop(0.45, "rgba(255, 80, 10, 0.6)"); aura.addColorStop(1, "rgba(180, 20, 0, 0)");
        ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, R * 2.2, 0, Math.PI * 2); ctx.fill();
        
        let tailLen = R * 3.5, tail = ctx.createLinearGradient(0, 0, -tailLen, 0);
        tail.addColorStop(0, "rgba(255, 220, 110, 0.85)"); tail.addColorStop(0.4, "rgba(255, 90, 15, 0.5)"); tail.addColorStop(1, "rgba(200, 30, 0, 0)");
        ctx.fillStyle = tail; ctx.beginPath(); ctx.moveTo(0, -R * 0.8); ctx.lineTo(-tailLen, 0); ctx.lineTo(0, R * 0.8); ctx.closePath(); ctx.fill();
        
        ctx.globalCompositeOperation = "source-over";
        let core = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 1.2);
        core.addColorStop(0, "#fff1c0"); core.addColorStop(0.4, "#ff7a1a"); core.addColorStop(0.85, "#8a1a00"); core.addColorStop(1, "#2a0800");
        ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.8, R * 0.95, 0, 0, Math.PI * 2); ctx.fill();
        
        let fingers = [-0.9, -0.4, 0.1, 0.6, 1.1]; 
        for (let f = 0; f < 5; f++) {
            let fa = fingers[f], fLen = (f === 2) ? R * 1.3 : (f === 1 || f === 3) ? R * 1.1 : R * 0.8; 
            ctx.beginPath(); ctx.ellipse(Math.cos(fa) * fLen * 0.6, Math.sin(fa) * R * 0.7, R * 0.45, R * 0.25, fa, 0, Math.PI * 2); ctx.fill();
        }
        
        ctx.strokeStyle = "rgba(255, 230, 90, 0.9)"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
        for (let c = 0; c < 4; c++) {
            let wob = Math.sin(state.mathNow / 150 + c) * 10;
            ctx.beginPath(); ctx.moveTo(-R * 0.4, (c - 1.5) * R * 0.4); ctx.quadraticCurveTo(wob, (c - 1.5) * R * 0.3, R * 0.5, (c - 1.5) * R * 0.5 + wob); ctx.stroke();
        }
        
        ctx.globalCompositeOperation = "screen"; ctx.fillStyle = "rgba(255, 250, 210, 0.85)"; ctx.beginPath(); ctx.arc(R * 0.2, 0, R * 0.4, 0, Math.PI * 2); ctx.fill();
        for (let s = 0; s < 6; s++) {
            let sa = (Math.PI * 2 / 6) * s + state.mathNow / 200, sr = R * (1.2 + Math.abs(Math.sin(state.mathNow / 130 + s)) * 0.5);
            ctx.fillStyle = `rgba(255, ${150 + s * 10}, 30, 0.9)`;
            ctx.beginPath(); ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 4.5, 0, Math.PI * 2); ctx.fill();
        }
    });
});

registerProjectile('dai_funka', (ctx, proj, state) => {
    let R = 180, dir = (proj.vx || (proj.team === 1 ? 1 : -1)) >= 0 ? 1 : -1;
    RenderUtils.withContext(ctx, proj.x, proj.y, () => {
        ctx.scale(dir, 1); ctx.globalCompositeOperation = "screen";
        
        let aura = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 1.55);
        aura.addColorStop(0, "rgba(255, 220, 100, 0.9)"); aura.addColorStop(0.4, "rgba(255, 70, 10, 0.5)"); aura.addColorStop(1, "rgba(150, 10, 0, 0)");
        ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, 0, R * 1.55, 0, Math.PI * 2); ctx.fill();
        
        ctx.globalCompositeOperation = "source-over";
        let core = ctx.createRadialGradient(-R * 0.25, -R * 0.25, R * 0.2, 0, 0, R);
        core.addColorStop(0, "#ffeba8"); core.addColorStop(0.3, "#ff5500"); core.addColorStop(0.7, "#6b0f00"); core.addColorStop(1, "#1c0400");
        ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(-R * 0.12, 0, R * 0.72, R * 0.9, 0, 0, Math.PI * 2); ctx.fill();
        
        for (let k = 0; k < 4; k++) { let ky = (k - 1.5) * R * 0.44; ctx.beginPath(); ctx.ellipse(R * 0.5, ky, R * 0.3, R * 0.24, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.beginPath(); ctx.ellipse(-R * 0.05, -R * 0.62, R * 0.32, R * 0.42, -0.35, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = "rgba(255, 210, 50, 0.95)"; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (let k2 = 0; k2 < 3; k2++) { let ky2 = (k2 - 1) * R * 0.44; ctx.beginPath(); ctx.moveTo(R * 0.2, ky2); ctx.lineTo(R * 0.62, ky2); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(-R * 0.55, -R * 0.35); ctx.lineTo(-R * 0.05, 0); ctx.lineTo(-R * 0.45, R * 0.4); ctx.stroke();
        
        ctx.globalCompositeOperation = "screen"; ctx.fillStyle = "rgba(255, 255, 230, 0.8)";
        ctx.beginPath(); ctx.ellipse(R * 0.62, 0, R * 0.26, R * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        for (let s = 0; s < 9; s++) {
            let sa = (Math.PI * 2 / 9) * s, sr = R * (0.95 + Math.abs(Math.sin(state.mathNow / 150 + s)) * 0.28);
            ctx.fillStyle = `rgba(255, ${120 + s * 12}, 20, 0.9)`;
            ctx.beginPath(); ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 10 + (s % 3) * 4, 0, Math.PI * 2); ctx.fill();
        }
    });
});

registerProjectile('thunder_bolt', (ctx, proj, state) => {
    let tAng = Math.atan2(proj.vy || 0, proj.vx || (proj.team === 1 ? 1 : -1));
    RenderUtils.withRotation(ctx, proj.x, proj.y, tAng, () => {
        ctx.globalCompositeOperation = "screen";
        let tAura = ctx.createLinearGradient(0, -26, 0, 26);
        tAura.addColorStop(0, "rgba(0,150,255,0)"); tAura.addColorStop(0.5, "rgba(0,190,255,0.55)"); tAura.addColorStop(1, "rgba(0,150,255,0)");
        ctx.fillStyle = tAura; ctx.fillRect(-120, -26, 200, 52);
        
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(0,200,255,0.95)"; ctx.lineWidth = 12;
        ctx.beginPath();
        for (let ti = 0; ti <= 7; ti++) {
            let tx = -120 + (ti / 7) * 200, ty = (ti === 0 || ti === 7) ? 0 : Math.sin(ti * 2.3 + state.mathNow / 45) * 13;
            if (ti === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
        }
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,1)"; ctx.lineWidth = 4.5;
        ctx.beginPath();
        for (let tj = 0; tj <= 7; tj++) {
            let tx2 = -120 + (tj / 7) * 200, ty2 = (tj === 0 || tj === 7) ? 0 : Math.sin(tj * 2.3 + state.mathNow / 45) * 13;
            if (tj === 0) ctx.moveTo(tx2, ty2); else ctx.lineTo(tx2, ty2);
        }
        ctx.stroke();

        let tHead = ctx.createRadialGradient(75, 0, 3, 75, 0, 40);
        tHead.addColorStop(0, "rgba(255,255,255,1)"); tHead.addColorStop(0.35, "rgba(150,235,255,0.9)"); tHead.addColorStop(1, "rgba(0,180,255,0)");
        ctx.fillStyle = tHead; ctx.beginPath(); ctx.arc(75, 0, 40, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    });
});

registerProjectile('partisan', (ctx, proj, state) => drawPartisan(ctx, proj, false));
registerProjectile('giant_partisan', (ctx, proj, state) => drawPartisan(ctx, proj, true));

function drawPartisan(ctx, proj, isGiant) {
    let scale = isGiant ? 2.5 : 1.0, angle = Math.atan2(proj.vy, proj.vx);
    RenderUtils.withRotation(ctx, proj.x, proj.y, angle, () => {
        ctx.scale(scale, scale); ctx.globalCompositeOperation = "screen";
        let shaft = ctx.createLinearGradient(-70, 0, 60, 0);
        shaft.addColorStop(0, "rgba(100, 180, 255, 0)"); shaft.addColorStop(0.5, "rgba(135, 215, 255, 0.85)"); shaft.addColorStop(1, "rgba(200, 240, 255, 0.95)");
        ctx.fillStyle = shaft;
        ctx.beginPath(); ctx.moveTo(60, -6); ctx.lineTo(60, 6); ctx.lineTo(-70, 3); ctx.lineTo(-70, -3); ctx.closePath(); ctx.fill();
        
        ctx.fillStyle = "rgba(180, 235, 255, 0.95)"; 
        ctx.beginPath(); ctx.moveTo(120, 0); ctx.lineTo(55, 16); ctx.lineTo(70, 0); ctx.lineTo(55, -16); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 1)"; ctx.lineWidth = 2.5; ctx.stroke();
        
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(120, 0); ctx.lineTo(-70, 0); ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 1)"; ctx.beginPath(); ctx.arc(120, 0, 4, 0, Math.PI * 2); ctx.fill();
        
        let glow = ctx.createRadialGradient(-40, 0, 8, -40, 0, 65);
        glow.addColorStop(0, "rgba(180, 240, 255, 0.8)"); glow.addColorStop(0.4, "rgba(135, 215, 255, 0.6)"); glow.addColorStop(1, "rgba(50, 150, 255, 0)");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(-40, 0, 65, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    });
}

registerProjectile('default', (ctx, proj, state) => {
    ctx.beginPath(); ctx.arc(proj.x, proj.y, 12, 0, Math.PI * 2); 
    ctx.fillStyle = proj.team === 1 ? "#3498db" : "#e74c3c"; ctx.fill(); 
});
