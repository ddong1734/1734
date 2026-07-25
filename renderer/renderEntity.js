// 파일명: renderEntity.js

import { RenderUtils } from './renderUtils.js';

export class RenderEntity {
    render(ctx, state) {
        const { camX, camY, viewW, viewH, monster, okras, players, myId, myPlayer, mathNow } = state;

        // 보스 몬스터
        if (monster && monster.hp > 0 && RenderUtils.isVisible(camX, camY, viewW, viewH, monster.x, monster.y, monster.radius, monster.radius)) {
            ctx.beginPath(); ctx.arc(monster.x, monster.y, monster.radius, 0, Math.PI * 2); ctx.fillStyle = "#8e44ad"; ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 35px sans-serif"; ctx.textAlign = "center"; ctx.fillText("할배새끼", monster.x, monster.y - 100);
            ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(monster.x - 80, monster.y - 85, 160, 16); 
            ctx.fillStyle = "#e74c3c"; ctx.fillRect(monster.x - 78, monster.y - 83, 156 * (monster.hp / monster.maxHp), 12); 
            ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.strokeRect(monster.x - 80, monster.y - 85, 160, 16);
            
            // ⚡ 보스몹 감전/동결 처리 로직
            let mShock = Math.max(monster.airFreezeUntil || 0, monster.raigoPullUntil || 0, monster.electrocutedUntil || 0);
            if (mShock && mathNow < mShock) {
                RenderUtils.drawShockEffect(ctx, monster.x, monster.y, monster.radius * 1.5, mathNow);
            } else if (monster.frozenUntil && mathNow < monster.frozenUntil) {
                RenderUtils.drawFrozenEffect(ctx, monster.x, monster.y, monster.radius * 2.4, mathNow);
            }

            if (monster.burningUntil && mathNow < monster.burningUntil) RenderUtils.drawBurningEffect(ctx, monster.x, monster.y, monster.radius * 2.4, mathNow);
            if (monster.maguBombUntil && mathNow < monster.maguBombUntil) RenderUtils.drawMaguBomb(ctx, monster.x, monster.y, monster.radius * 1.5, mathNow, monster.maguBombUntil);
            if (monster.justiceBombUntil && mathNow < monster.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, monster.x, monster.y, monster.radius * 1.5, mathNow, monster.justiceBombUntil);
        }

        // 쫄몹(오크라 / ✨황금오크라)
        for (let ok of okras) {
            if (ok.hp <= 0 || !RenderUtils.isVisible(camX, camY, viewW, viewH, ok.x, ok.y, ok.radius, ok.radius)) continue;

            if (ok.isGolden) {
                ctx.save(); ctx.globalCompositeOperation = "screen";
                let gPulse = 1 + Math.sin(mathNow / 220) * 0.18;
                let gAura = ctx.createRadialGradient(ok.x, ok.y, ok.radius * 0.4, ok.x, ok.y, ok.radius * 2.4 * gPulse);
                gAura.addColorStop(0, "rgba(255, 240, 150, 0.75)");
                gAura.addColorStop(0.5, "rgba(255, 200, 40, 0.35)");
                gAura.addColorStop(1, "rgba(255, 180, 0, 0)");
                ctx.fillStyle = gAura; ctx.beginPath(); ctx.arc(ok.x, ok.y, ok.radius * 2.4 * gPulse, 0, Math.PI * 2); ctx.fill();
                ctx.globalCompositeOperation = "source-over"; ctx.restore();

                ctx.beginPath(); ctx.arc(ok.x, ok.y, ok.radius, 0, Math.PI * 2); ctx.fillStyle = "#f1c40f"; ctx.fill();
                ctx.strokeStyle = "#fff8d0"; ctx.lineWidth = 3; ctx.stroke();

                ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
                ctx.strokeStyle = "rgba(90, 60, 0, 0.9)"; ctx.lineWidth = 4; ctx.lineJoin = "round";
                ctx.strokeText("황금오크라", ok.x, ok.y - 45);
                ctx.fillStyle = "#ffe680"; ctx.fillText("황금오크라", ok.x, ok.y - 45);

                ctx.fillStyle = "#f39c12"; ctx.fillRect(ok.x - 29, ok.y - 34, 58 * (ok.hp / ok.maxHp), 8);
                ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(ok.x - 29, ok.y - 34, 58, 8);
            } else {
                ctx.beginPath(); ctx.arc(ok.x, ok.y, ok.radius, 0, Math.PI * 2); ctx.fillStyle = "#27ae60"; ctx.fill();
                ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.fillText("오크라", ok.x, ok.y - 45);
                ctx.fillStyle = "#e74c3c"; ctx.fillRect(ok.x - 29, ok.y - 34, 58 * (ok.hp / ok.maxHp), 8); 
                ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(ok.x - 29, ok.y - 34, 58, 8);
            }
            
            // ⚡ 오크라 감전/동결 처리 로직
            let oShock = Math.max(ok.airFreezeUntil || 0, ok.raigoPullUntil || 0, ok.electrocutedUntil || 0);
            if (oShock && mathNow < oShock) {
                RenderUtils.drawShockEffect(ctx, ok.x, ok.y, ok.radius * 1.8, mathNow);
            } else if (ok.frozenUntil && mathNow < ok.frozenUntil) {
                RenderUtils.drawFrozenEffect(ctx, ok.x, ok.y, ok.radius * 2.8, mathNow);
            }

            if (ok.burningUntil && mathNow < ok.burningUntil) RenderUtils.drawBurningEffect(ctx, ok.x, ok.y, ok.radius * 2.8, mathNow);
            if (ok.maguBombUntil && mathNow < ok.maguBombUntil) RenderUtils.drawMaguBomb(ctx, ok.x, ok.y, ok.radius * 1.5, mathNow, ok.maguBombUntil);
            if (ok.justiceBombUntil && mathNow < ok.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, ok.x, ok.y, ok.radius * 1.5, mathNow, ok.justiceBombUntil);
        }

        // 플레이어
        let aliveCount = 0;
        for (let id in players) {
            let p = players[id]; 
            if (p.isDead || !RenderUtils.isVisible(camX, camY, viewW, viewH, p.x, p.y, 50, 100)) continue;
            aliveCount++;

            if (p.yataActive) {
                ctx.save(); ctx.translate(p.x, p.y); ctx.globalCompositeOperation = "screen";
                let pulse = 1 + Math.sin(mathNow / 40) * 0.2;
                let grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 70 * pulse);
                grad.addColorStop(0, "rgba(255,255,255,1)");
                grad.addColorStop(0.4, "rgba(255,240,120,0.9)");
                grad.addColorStop(1, "rgba(255,200,40,0)");
                ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, 70 * pulse, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = "rgba(255,255,180,0.5)";
                ctx.beginPath(); ctx.ellipse(-(p.lastFacing||1)*40, 0, 80, 22, 0, 0, Math.PI*2); ctx.fill();
                ctx.globalCompositeOperation = "source-over"; ctx.restore();
                
                let cmax = p.maxHp || 2500;
                ctx.fillStyle = "#2ecc71"; ctx.fillRect(p.x - 39, p.y - 79, 78 * (Math.max(0,p.hp)/cmax), 5);
                ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText(p.nickname, p.x, p.y - 88);
                continue;
            }

            let ldUntil = (id === myId) ? myPlayer.lightDashUntil : p.lightDashUntil;
            if (ldUntil && mathNow < ldUntil) {
                let ldDir = ((id === myId) ? myPlayer.lightDashDir : p.lightDashDir) || 1;
                ctx.save(); ctx.translate(p.x, p.y); ctx.globalCompositeOperation = "screen";
                let pulse = 1 + Math.sin(mathNow / 35) * 0.25;
                let grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 66 * pulse);
                grad.addColorStop(0, "rgba(255,255,255,1)");
                grad.addColorStop(0.4, "rgba(255,240,120,0.9)");
                grad.addColorStop(1, "rgba(255,200,40,0)");
                ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, 66 * pulse, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = "rgba(255,255,180,0.55)";
                ctx.beginPath(); ctx.ellipse(-ldDir * 46, 0, 96, 24, 0, 0, Math.PI*2); ctx.fill();
                ctx.globalCompositeOperation = "source-over"; ctx.restore();
                continue;
            }

            if (p.isCasting) {
                let isBors = p.characterType === 'BORSALINO';
                let isKuz = p.characterType === 'KUZAN';
                let isEnel = p.characterType === 'ENEL';
                let castTxt = isBors ? "✨ 빛의 힘" : (isKuz ? "❄️ 냉기 방출 중" : (isEnel ? "⚡ 뇌전 응축 중" : "🌀 기절 (공기 모으는 중)"));
                let castCol = isBors ? "rgba(241, 196, 15, 0.3)" : (isKuz ? "rgba(52, 152, 219, 0.3)" : (isEnel ? "rgba(0, 191, 255, 0.3)" : "rgba(255, 255, 255, 0.3)"));
                ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; 
                ctx.fillText(castTxt, p.x, p.y - 100);
                ctx.beginPath(); ctx.arc(p.x, p.y, 80, 0, Math.PI * 2); ctx.fillStyle = castCol; ctx.fill();
            }

            ctx.beginPath(); ctx.arc(p.x, p.y, 45, 0, Math.PI * 2);
            ctx.fillStyle = p.team === 1 ? "#3498db" : "#e74c3c"; ctx.fill();
            ctx.strokeStyle = p.characterType === 'BORSALINO' ? "#f1c40f" : (p.characterType === 'KUZAN' ? "#3498db" : (p.characterType === 'SAKAZUKI' ? "#e74c3c" : (p.characterType === 'ENEL' ? "#00bfff" : "#000"))); 
            ctx.lineWidth = 3; ctx.stroke();

            let ctype = p.characterType || 'PARK';
            let currentMaxHp = p.maxHp || (window.Characters && window.Characters[ctype] ? window.Characters[ctype].hp : 3000);
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(p.x - 39, p.y - 69, 78 * (Math.max(0, p.hp) / currentMaxHp), 6); 
            ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(p.x - 39, p.y - 69, 78, 6);
            ctx.fillStyle = "#f1c40f"; ctx.fillRect(p.x - 39, p.y - 62, 78 * (Math.max(0, p.xp || 0) / (p.maxXp || 100)), 4); 
            ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(p.x - 39, p.y - 62, 78, 4);
            ctx.fillStyle = "#000"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; 
            ctx.fillText(`Lv.${p.level || 0} ${p.nickname}`, p.x, p.y - 82);

            // ⚡ 플레이어 상태 이상 (동결 vs 감전 분리)
            let myElectro = (id === myId) ? myPlayer.electrocutedUntil : p.electrocutedUntil;
            let myShock = Math.max(
                (id === myId) ? (myPlayer.airFreezeUntil || 0) : (p.airFreezeUntil || 0),
                (id === myId) ? (myPlayer.raigoPullUntil || 0) : (p.raigoPullUntil || 0),
                myElectro || 0
            );

            if (myShock && mathNow < myShock) {
                RenderUtils.drawShockEffect(ctx, p.x, p.y, 66, mathNow);
                if (!p.isCasting) {
                    ctx.fillStyle = "rgba(190, 245, 255, 0.95)"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
                    ctx.strokeStyle = "rgba(0,60,120,0.8)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
                    ctx.strokeText("⚡ 감전", p.x, p.y + 90); ctx.fillText("⚡ 감전", p.x, p.y + 90);
                }
            } else {
                let myFrozen = (id === myId) ? myPlayer.frozenUntil : p.frozenUntil;
                if (myFrozen && mathNow < myFrozen && !p.isCasting) {
                    RenderUtils.drawFrozenEffect(ctx, p.x, p.y, 130, mathNow);
                    ctx.fillStyle = "rgba(180, 235, 255, 0.95)"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
                    ctx.strokeStyle = "rgba(0,60,120,0.8)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
                    ctx.strokeText("❄️ 동결", p.x, p.y + 90); ctx.fillText("❄️ 동결", p.x, p.y + 90);
                }
            }

            let myBurn = (id === myId) ? myPlayer.burningUntil : p.burningUntil;
            if (myBurn && mathNow < myBurn) RenderUtils.drawBurningEffect(ctx, p.x, p.y, 130, mathNow);
            
            let myMaguBomb = (id === myId) ? myPlayer.maguBombUntil : p.maguBombUntil;
            if (myMaguBomb && mathNow < myMaguBomb) RenderUtils.drawMaguBomb(ctx, p.x, p.y, 65, mathNow, myMaguBomb);
            let myJusticeBomb = (id === myId) ? myPlayer.justiceBombUntil : p.justiceBombUntil;
            if (myJusticeBomb && mathNow < myJusticeBomb) RenderUtils.drawMaguBomb(ctx, p.x, p.y, 75, mathNow, myJusticeBomb);

            let spheresCount = p.orbitSpheres || 0; let speedMult = p.orbitSpeedMult || 1.0;
            if (id === myId) { spheresCount = myPlayer.orbitSpheres || 0; speedMult = myPlayer.orbitSpeedMult || 1.0; }
            if (spheresCount > 0) {
                for (let i = 0; i < spheresCount; i++) {
                    let angle = (mathNow / (300 / speedMult)) + (i * Math.PI * 2 / spheresCount);
                    let sx = p.x + Math.cos(angle) * 110; let sy = p.y + Math.sin(angle) * 110;
                    ctx.beginPath(); ctx.arc(sx, sy, 15, 0, Math.PI * 2); ctx.fillStyle = "#e67e22"; ctx.fill();
                }
            }
        }

        let pCountEl = document.getElementById('playerCount'); 
        if(pCountEl) pCountEl.innerText = `전장 인원: ${aliveCount}명`;
    }
}
