// 파일명: fxenel.js

import { registerVisualFX } from './effectRegistry.js';
import { RenderUtils } from './renderUtils.js';

registerVisualFX('mantle_explosion', (ctx, fx, alpha, state) => {
    let r = 1 - alpha; 
    let scale = fx.hasArkMaxim ? 1.5 : 1.0;

    RenderUtils.withContext(ctx, fx.x, fx.y, () => {
        ctx.scale(scale, scale); 
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = alpha;
        let R = 150 * r + 20; 
        
        let grad = ctx.createRadialGradient(0, -20, 10, 0, -20, R);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.3, "rgba(120, 230, 255, 0.85)");
        grad.addColorStop(0.7, "rgba(0, 160, 255, 0.4)");
        grad.addColorStop(1, "rgba(0, 80, 200, 0)");
        
        ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(0, -20, R, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = `rgba(180, 240, 255, ${alpha})`; ctx.lineWidth = 8 * alpha + 2; ctx.lineCap = "round";
        for (let s = 0; s < 6; s++) {
            let ang = (Math.PI * 2 / 6) * s + (r * 3);
            let R1 = 20 * r, R2 = R * 0.8;
            ctx.beginPath(); 
            ctx.moveTo(Math.cos(ang) * R1, Math.sin(ang) * R1 * 0.5 - 20); 
            ctx.lineTo(Math.cos(ang) * R2, Math.sin(ang) * R2 * 0.5 - 20); 
            ctx.stroke();
        }
        
        ctx.fillStyle = `rgba(220, 250, 255, ${alpha})`;
        for (let s2 = 0; s2 < 8; s2++) {
            let px = Math.cos(s2 * 4.2) * R * 0.7;
            let py = -20 - (r * (80 + s2 * 10));
            ctx.beginPath(); ctx.arc(px, py, (6 - r * 4) + 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
    });
});

registerVisualFX('el_thor', (ctx, fx, alpha, state) => {
    let etOwner = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    let ox = etOwner ? etOwner.x : fx.x;
    let oy = etOwner ? etOwner.y : fx.y;
    let ux = (fx.dirX !== undefined) ? fx.dirX : 1, uy = (fx.dirY !== undefined) ? fx.dirY : 0;
    let ulen = Math.hypot(ux, uy);
    if (ulen === 0) { ux = 1; uy = 0; ulen = 1; }
    let etAng = Math.atan2(uy / ulen, ux / ulen);

    let etHold = alpha > 0.12 ? 1 : (alpha / 0.12);
    let ES1 = (window.GameData && window.GameData.Skills) ? window.GameData.Skills.ENEL_S1 : null;

    RenderUtils.withRotation(ctx, ox, oy, etAng, () => {
        let RANGE = ES1 ? ES1.range : 1680;
        let HALF = ES1 ? (ES1.thickness / 2) : 45;
        if (fx.hasGoro) HALF *= 3;

        let etFlick = 0.85 + Math.random() * 0.15;
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = etHold * etFlick;

        let etOuter = ctx.createLinearGradient(0, -HALF * 2.2, 0, HALF * 2.2);
        etOuter.addColorStop(0, "rgba(0, 140, 255, 0)"); etOuter.addColorStop(0.5, "rgba(0, 190, 255, 0.45)"); etOuter.addColorStop(1, "rgba(0, 140, 255, 0)");
        ctx.fillStyle = etOuter; ctx.fillRect(0, -HALF * 2.2, RANGE, HALF * 4.4);

        let etBody = ctx.createLinearGradient(0, -HALF, 0, HALF);
        etBody.addColorStop(0, "rgba(0, 170, 255, 0.25)"); etBody.addColorStop(0.35, "rgba(30, 205, 255, 0.92)"); etBody.addColorStop(0.5, "rgba(150, 235, 255, 0.98)"); etBody.addColorStop(0.65, "rgba(30, 205, 255, 0.92)"); etBody.addColorStop(1, "rgba(0, 170, 255, 0.25)");
        ctx.fillStyle = etBody; ctx.fillRect(0, -HALF, RANGE, HALF * 2);

        let etCore = ctx.createLinearGradient(0, -HALF * 0.35, 0, HALF * 0.35);
        etCore.addColorStop(0, "rgba(255,255,255,0)"); etCore.addColorStop(0.5, `rgba(255,255,255,${etFlick})`); etCore.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = etCore; ctx.fillRect(0, -HALF * 0.35, RANGE, HALF * 0.7);

        ctx.strokeStyle = `rgba(255,255,255,${0.9 * etFlick})`; ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (let w = 0; w < 3; w++) {
            ctx.lineWidth = 5 - w * 1.2; ctx.beginPath();
            for (let q = 0; q <= 26; q++) {
                let t = q / 26, xx = t * RANGE;
                let phase = state.mathNow / (70 + w * 25) + w * 2.1;
                let amp = HALF * (0.62 - w * 0.16);
                let yy = Math.sin(t * 15 + phase) * amp + Math.sin(t * 31 + phase * 1.7) * amp * 0.35;
                if (q === 0) ctx.moveTo(xx, yy * 0.15); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
        }

        let boltCount = fx.hasGoro ? 10 : 5;
        for (let w = 0; w < boltCount; w++) {
            let isDeep = w % 2 === 0;
            ctx.strokeStyle = isDeep ? `rgba(0, 110, 255, ${0.9 * etFlick})` : `rgba(135, 240, 255, ${0.95 * etFlick})`;
            ctx.lineWidth = isDeep ? (fx.hasGoro ? 5 : 3) : (fx.hasGoro ? 3 : 1.5);
            ctx.beginPath();
            for (let q = 0; q <= 35; q++) {
                let t = q / 35, xx = t * RANGE;
                let phase = state.mathNow / (20 + w * 15) + w * 7.7; 
                let amp = HALF * (0.85 + (w * 0.15));
                let yy = Math.sin(t * 45 + phase) * amp * 0.6 
                       + Math.cos(t * 90 - phase * 1.3) * amp * 0.3 
                       + (Math.random() - 0.5) * (amp * 0.25);
                
                if (q === 0) ctx.moveTo(xx, yy * 0.2); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
        }

        let etFlare = ctx.createRadialGradient(0, 0, 4, 0, 0, HALF * 2.4);
        etFlare.addColorStop(0, "rgba(255,255,255,1)"); etFlare.addColorStop(0.35, "rgba(140,230,255,0.85)"); etFlare.addColorStop(1, "rgba(0,170,255,0)");
        ctx.fillStyle = etFlare; ctx.beginPath(); ctx.arc(0, 0, HALF * 2.4, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `rgba(230,250,255,${etHold * 0.9})`;
        for (let sp = 0; sp < 10; sp++) {
            let px = ((sp * 271 + fx.life * 55) % RANGE); let py = Math.sin(sp * 2 + fx.life * 0.4) * HALF * 0.8;
            ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
    });
});

registerVisualFX('raigo', (ctx, fx, alpha, state) => {
    // ✨ 갓 에넬 장착 시 뇌영 스케일 2.5배 확대
    let scale = fx.hasGodEnel ? 2.5 : 1.0;
    
    let rgGround = state.groundY; 
    let RR = 260 * scale; 
    let rgProg = 1 - alpha; 
    let dropT = Math.min(1, rgProg / 0.12);
    // ☁️ 정글 최상층(약 y=-2200)보다 높은 곳에서 낙하하도록 낙하 시작 고도 대폭 상향 (1400 -> 3600)
    let cy = rgGround - RR * 0.5 - (1 - dropT) * (3600 * scale); 
    let falling = dropT < 1; 
    let rgFlick = 0.85 + Math.random() * 0.15;

    let rgHold = alpha > 0.12 ? 1 : (alpha / 0.12);

    ctx.save();
    ctx.beginPath(); ctx.rect(fx.x - RR * 1.6, cy - RR * 1.8, RR * 3.2, rgGround - (cy - RR * 1.8)); ctx.clip();
    
    RenderUtils.withContext(ctx, fx.x, cy, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = rgHold;
        let rgAura = ctx.createRadialGradient(0, 0, RR * 0.3, 0, 0, RR * 1.5);
        if (falling) {
            rgAura.addColorStop(0, "rgba(40, 60, 200, 0.85)"); rgAura.addColorStop(0.5, "rgba(20, 40, 160, 0.45)"); rgAura.addColorStop(1, "rgba(10, 20, 100, 0)");
        } else {
            rgAura.addColorStop(0, "rgba(120, 235, 255, 0.8)"); rgAura.addColorStop(0.5, "rgba(0, 190, 255, 0.45)"); rgAura.addColorStop(1, "rgba(0, 120, 220, 0)");
        }
        ctx.fillStyle = rgAura; ctx.beginPath(); ctx.arc(0, 0, RR * 1.5, 0, Math.PI * 2); ctx.fill();

        let rgCore = ctx.createRadialGradient(-RR * 0.25, -RR * 0.25, RR * 0.15, 0, 0, RR);
        if (falling) {
            rgCore.addColorStop(0, "#9fb4ff"); rgCore.addColorStop(0.35, "#2740c8"); rgCore.addColorStop(0.75, "#101f7a"); rgCore.addColorStop(1, "#050a33");
        } else {
            rgCore.addColorStop(0, "#ffffff"); rgCore.addColorStop(0.3, "#8fe8ff"); rgCore.addColorStop(0.65, "#00b4ff"); rgCore.addColorStop(1, "#0060b0");
        }
        ctx.fillStyle = rgCore; ctx.beginPath(); ctx.arc(0, 0, RR, 0, Math.PI * 2); ctx.fill();

        if (!falling) {
            ctx.strokeStyle = `rgba(255,255,255,${0.9 * rgFlick})`; ctx.lineCap = "round"; ctx.lineJoin = "round";
            for (let w2 = 0; w2 < 5; w2++) {
                ctx.lineWidth = (5 - w2 * 0.6) * scale; let baseAng = state.mathNow / (260 + w2 * 70) + w2 * 1.25;
                ctx.beginPath();
                for (let q2 = 0; q2 <= 30; q2++) {
                    let t2 = q2 / 30; let a3 = baseAng + t2 * Math.PI * 2; let rr2 = RR * (0.72 + 0.2 * Math.sin(t2 * 9 + state.mathNow / 90 + w2));
                    let xx2 = Math.cos(a3) * rr2; let yy2 = Math.sin(a3) * rr2 * 0.9;
                    if (q2 === 0) ctx.moveTo(xx2, yy2); else ctx.lineTo(xx2, yy2);
                }
                ctx.stroke();
            }
            ctx.strokeStyle = `rgba(200,245,255,${rgHold * 0.9})`; ctx.lineWidth = 4 * scale;
            for (let sk = 0; sk < 12; sk++) {
                let a4 = (Math.PI * 2 / 12) * sk + state.mathNow / 400; let r1 = RR * 0.95; let r2 = RR * (1.1 + Math.abs(Math.sin(state.mathNow / 130 + sk)) * 0.22);
                ctx.beginPath(); ctx.moveTo(Math.cos(a4) * r1, Math.sin(a4) * r1); ctx.lineTo(Math.cos(a4) * r2, Math.sin(a4) * r2); ctx.stroke();
            }
            ctx.fillStyle = `rgba(255,255,255,${0.75 * rgFlick})`; ctx.beginPath(); ctx.arc(0, 0, RR * 0.3, 0, Math.PI * 2); ctx.fill();
        }

        // ✨ 뇌영 구체 주변의 밝고 진한 하늘색 번개 지지직 효과 (노각성, 각성 모두 적용)
        ctx.globalCompositeOperation = "screen";
        for (let ring = 0; ring < 3; ring++) {
            let isDeep = ring % 2 === 0;
            // 갓 에넬 각성 시 번개가 더욱 크고 진해짐
            ctx.strokeStyle = isDeep ? `rgba(0, 110, 255, ${rgHold * 0.9})` : `rgba(135, 240, 255, ${rgHold * 0.95})`;
            ctx.lineWidth = (isDeep ? (fx.hasGodEnel ? 8 : 5) : (fx.hasGodEnel ? 5 : 3)) * rgFlick;
            ctx.beginPath();
            for(let q = 0; q <= 36; q++) {
                let t = q / 36;
                let ang = t * Math.PI * 2 + state.mathNow / (150 + ring * 50);
                let noise = Math.sin(t * 60 + state.mathNow / 40) * (20 * scale) + (Math.random() - 0.5) * (15 * scale);
                let rr = RR * 1.02 + noise; 
                let lx = Math.cos(ang) * rr;
                let ly = Math.sin(ang) * rr;
                if (q === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.globalCompositeOperation = "source-over";
    });
    ctx.restore();

    if (!falling) {
        RenderUtils.withContext(ctx, 0, 0, () => {
            ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = rgHold * 0.9;
            let baseG = ctx.createLinearGradient(0, rgGround - (40 * scale), 0, rgGround + (10 * scale));
            baseG.addColorStop(0, "rgba(180, 245, 255, 0)"); baseG.addColorStop(0.6, "rgba(180, 245, 255, 0.75)"); baseG.addColorStop(1, "rgba(120, 220, 255, 0)");
            ctx.fillStyle = baseG; ctx.fillRect(fx.x - RR, rgGround - (40 * scale), RR * 2, 50 * scale);
            ctx.globalCompositeOperation = "source-over";
        });
    }
});

registerVisualFX('raigo_telegraph', (ctx, fx, alpha, state) => {
    let tgGround = state.groundY;
    let ES3 = (window.GameData && window.GameData.Skills) ? window.GameData.Skills.ENEL_S3 : null;
    let tgHalf = ES3 ? (ES3.width / 2) : 135;
    
    // ✨ 갓 에넬 장착 시 바닥 예고 이펙트 2.5배 확대
    if (fx.hasGodEnel) tgHalf *= 2.5;

    let tgHold = alpha > 0.2 ? 1 : (alpha / 0.2);

    RenderUtils.withContext(ctx, fx.x, tgGround, () => {
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = tgHold * (0.6 + Math.random() * 0.4);
        let tgZone = ctx.createLinearGradient(0, -260, 0, 0);
        tgZone.addColorStop(0, "rgba(0, 190, 255, 0)"); tgZone.addColorStop(1, "rgba(0, 200, 255, 0.55)");
        ctx.fillStyle = tgZone; ctx.fillRect(-tgHalf, -260, tgHalf * 2, 260);
        
        ctx.strokeStyle = "rgba(160, 240, 255, 0.95)"; ctx.lineWidth = 4; ctx.lineCap = "round";
        for (let b = 0; b < 7; b++) {
            let bx = -tgHalf + (tgHalf * 2) * ((b + 0.5) / 7);
            ctx.beginPath(); ctx.moveTo(bx, 0);
            for (let sg = 1; sg <= 4; sg++) { ctx.lineTo(bx + Math.sin(sg * 2.4 + state.mathNow / 50 + b) * 22, -(sg / 4) * 230); }
            ctx.stroke();
        }
        ctx.strokeStyle = `rgba(255,255,255,${tgHold})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(-tgHalf, 0); ctx.lineTo(tgHalf, 0); ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
    });
});