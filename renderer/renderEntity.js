// 파일명: renderEntity.js

import { RenderUtils } from './renderUtils.js';

// ============================================================================
// 🩸 체력 눈금 — 최대 체력 400당 눈금 1개
//    모든 플레이어 / 몬스터의 체력바에 동일하게 적용해 최대체력을 한눈에 비교할 수 있게 한다.
//    (예: 3000 → 눈금 7개, 10000 → 눈금 24개, 700 → 눈금 1개)
// ============================================================================
const HP_TICK_UNIT = 400;
function drawHpTicks(ctx, x, y, w, h, maxHp) {
    if (!maxHp || maxHp <= HP_TICK_UNIT || w <= 0) return;
    const count = Math.floor(maxHp / HP_TICK_UNIT);
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.lineWidth = (w > 150) ? 1.5 : 1;
    ctx.beginPath();
    for (let i = 1; i <= count; i++) {
        const v = i * HP_TICK_UNIT;
        if (v >= maxHp) break;
        const tx = x + w * (v / maxHp);
        ctx.moveTo(tx, y);
        ctx.lineTo(tx, y + h);
    }
    ctx.stroke();
    ctx.restore();
}

// ============================================================================
// 🌀 박힌범 처치 포탈 (노란 포탈) — 닿으면 각자 팀 기지로 순간이동된다
//    window.serverHinbeomPortal 을 직접 읽으므로 renderEngine / main.js 수정이 필요 없다.
// ============================================================================
function drawHinbeomPortal(ctx, camX, camY, viewW, viewH, mathNow) {
    const pt = (typeof window !== 'undefined') ? window.serverHinbeomPortal : null;
    if (!pt) return;
    const R = pt.radius || 110;
    if (!RenderUtils.isVisible(camX, camY, viewW, viewH, pt.x, pt.y, R * 2, R * 2)) return;

    const spin = mathNow / 500;
    const pulse = 1 + Math.sin(mathNow / 220) * 0.12;

    ctx.save();
    ctx.translate(pt.x, pt.y);

    // 바깥 후광
    ctx.globalCompositeOperation = "screen";
    let aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 2.1 * pulse);
    aura.addColorStop(0, "rgba(255, 250, 190, 0.85)");
    aura.addColorStop(0.45, "rgba(255, 205, 40, 0.45)");
    aura.addColorStop(1, "rgba(255, 170, 0, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 2.1 * pulse, R * 1.6 * pulse, 0, 0, Math.PI * 2); ctx.fill();

    // 소용돌이 본체
    let core = ctx.createRadialGradient(0, 0, R * 0.08, 0, 0, R * pulse);
    core.addColorStop(0, "rgba(255, 255, 255, 1)");
    core.addColorStop(0.35, "rgba(255, 236, 120, 0.95)");
    core.addColorStop(0.75, "rgba(240, 176, 20, 0.7)");
    core.addColorStop(1, "rgba(180, 110, 0, 0)");
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.ellipse(0, 0, R * pulse, R * 1.25 * pulse, 0, 0, Math.PI * 2); ctx.fill();

    // 회전하는 나선 팔
    ctx.strokeStyle = "rgba(255, 245, 190, 0.9)";
    ctx.lineCap = "round";
    for (let a = 0; a < 4; a++) {
        let base = spin + a * (Math.PI / 2);
        ctx.lineWidth = 7;
        ctx.beginPath();
        for (let t = 0; t <= 1.0001; t += 0.08) {
            let ang = base + t * Math.PI * 1.5;
            let rr = t * R * 1.05 * pulse;
            let xx = Math.cos(ang) * rr;
            let yy = Math.sin(ang) * rr * 1.25;
            if (t === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
    }

    // 테두리 링
    ctx.strokeStyle = `rgba(255, 215, 60, ${0.8 + Math.sin(mathNow / 130) * 0.2})`;
    ctx.lineWidth = 6;
    ctx.setLineDash([18, 12]);
    ctx.lineDashOffset = -mathNow / 25;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.12 * pulse, R * 1.4 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // 빨려 들어가는 입자
    for (let s = 0; s < 10; s++) {
        let t = ((mathNow / 900) + s * 0.1) % 1;
        let ang = s * 2.3 + spin * 2;
        let rr = (1 - t) * R * 1.9;
        ctx.globalAlpha = t;
        ctx.fillStyle = "rgba(255, 250, 200, 0.95)";
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * rr, Math.sin(ang) * rr * 1.2, 5 * t + 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // 안내 문구
    ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(70, 45, 0, 0.95)"; ctx.lineWidth = 6;
    ctx.strokeText("기지 귀환 포탈", 0, -R * 1.55);
    ctx.fillStyle = "#ffe680";
    ctx.fillText("기지 귀환 포탈", 0, -R * 1.55);

    ctx.restore();
}

export class RenderEntity {
    constructor() {
        // 🚀 [최적화⑦] DOM 참조 캐싱 + 값이 바뀔 때만 쓰기
        //    기존에는 매 프레임 getElementById + innerText 를 실행해 강제 리플로우(레이아웃 재계산)를 유발했다.
        this._pCountEl = null;
        this._lastAliveCount = -1;
    }

    render(ctx, state) {
        const { camX, camY, viewW, viewH, monster, hinbeom, minions, okras, players, myId, myPlayer, mathNow } = state;

        // 🌀 박힌범 처치 포탈 (엔티티보다 뒤에 깔리도록 가장 먼저 그린다)
        drawHinbeomPortal(ctx, camX, camY, viewW, viewH, mathNow);

        // 보스 몬스터
        if (monster && monster.hp > 0 && RenderUtils.isVisible(camX, camY, viewW, viewH, monster.x, monster.y, monster.radius, monster.radius)) {
            ctx.beginPath(); ctx.arc(monster.x, monster.y, monster.radius, 0, Math.PI * 2); ctx.fillStyle = "#8e44ad"; ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 35px sans-serif"; ctx.textAlign = "center"; ctx.fillText("할배새끼", monster.x, monster.y - 100);
            ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(monster.x - 80, monster.y - 85, 160, 16); 
            ctx.fillStyle = "#e74c3c"; ctx.fillRect(monster.x - 78, monster.y - 83, 156 * (monster.hp / monster.maxHp), 12); 
            drawHpTicks(ctx, monster.x - 78, monster.y - 83, 156, 12, monster.maxHp);   // 🩸 눈금
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

        // 🐗 패왕색 패기로 소환된 할배새끼들
        if (minions) {
            for (let mi = 0; mi < minions.length; mi++) {
                let mn = minions[mi];
                if (!mn || mn.hp <= 0) continue;
                if (!RenderUtils.isVisible(camX, camY, viewW, viewH, mn.x, mn.y, mn.radius, mn.radius)) continue;

                const MR = mn.radius || 63;
                ctx.beginPath(); ctx.arc(mn.x, mn.y, MR, 0, Math.PI * 2); ctx.fillStyle = "#8e44ad"; ctx.fill();
                ctx.strokeStyle = "rgba(255, 60, 60, 0.9)"; ctx.lineWidth = 4; ctx.stroke();

                ctx.fillStyle = "#fff"; ctx.font = "bold 35px sans-serif"; ctx.textAlign = "center";
                ctx.fillText("할배새끼", mn.x, mn.y - 100);
                ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(mn.x - 80, mn.y - 85, 160, 16);
                ctx.fillStyle = "#e74c3c"; ctx.fillRect(mn.x - 78, mn.y - 83, 156 * (Math.max(0, mn.hp) / mn.maxHp), 12);
                drawHpTicks(ctx, mn.x - 78, mn.y - 83, 156, 12, mn.maxHp);              // 🩸 눈금
                ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.strokeRect(mn.x - 80, mn.y - 85, 160, 16);

                let nShock = Math.max(mn.airFreezeUntil || 0, mn.raigoPullUntil || 0, mn.electrocutedUntil || 0);
                if (nShock && mathNow < nShock) {
                    RenderUtils.drawShockEffect(ctx, mn.x, mn.y, MR * 1.5, mathNow);
                } else if (mn.frozenUntil && mathNow < mn.frozenUntil) {
                    RenderUtils.drawFrozenEffect(ctx, mn.x, mn.y, MR * 2.4, mathNow);
                }
                if (mn.burningUntil && mathNow < mn.burningUntil) RenderUtils.drawBurningEffect(ctx, mn.x, mn.y, MR * 2.4, mathNow);
                if (mn.maguBombUntil && mathNow < mn.maguBombUntil) RenderUtils.drawMaguBomb(ctx, mn.x, mn.y, MR * 1.5, mathNow, mn.maguBombUntil);
                if (mn.justiceBombUntil && mathNow < mn.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, mn.x, mn.y, MR * 1.5, mathNow, mn.justiceBombUntil);
            }
        }

        // 🥊 박힌범 (중앙 정글 최상단 바구니 보스)
        if (hinbeom && hinbeom.hp > 0 && hinbeom.state !== 'dead'
            && RenderUtils.isVisible(camX, camY, viewW, viewH, hinbeom.x, hinbeom.y, hinbeom.radius, hinbeom.radius)) {

            const HR = hinbeom.radius || 94.5;
            const hakiOn = hinbeom.hakiActiveUntil && mathNow < hinbeom.hakiActiveUntil;
            const hasShield = minions && minions.length > 0; // 🛡️ 소환체 존재 시 무적 보호막

            // 패기 방출 중이면 몸 주위에 붉은 오라
            if (hakiOn) {
                ctx.save(); ctx.globalCompositeOperation = "screen";
                let hPulse = 1 + Math.sin(mathNow / 80) * 0.22;
                let hAura = ctx.createRadialGradient(hinbeom.x, hinbeom.y, HR * 0.5, hinbeom.x, hinbeom.y, HR * 2.6 * hPulse);
                hAura.addColorStop(0, "rgba(255, 80, 80, 0.78)");
                hAura.addColorStop(0.45, "rgba(200, 10, 10, 0.45)");
                hAura.addColorStop(1, "rgba(70, 0, 0, 0)");
                ctx.fillStyle = hAura;
                ctx.beginPath(); ctx.arc(hinbeom.x, hinbeom.y, HR * 2.6 * hPulse, 0, Math.PI * 2); ctx.fill();
                ctx.globalCompositeOperation = "source-over"; ctx.restore();
            }

            // 본체
            ctx.beginPath(); ctx.arc(hinbeom.x, hinbeom.y, HR, 0, Math.PI * 2);
            ctx.fillStyle = "#5c0f22"; ctx.fill();
            ctx.strokeStyle = hakiOn ? "#ff3b3b" : "#c0392b";
            ctx.lineWidth = hakiOn ? 8 : 5; ctx.stroke();

            // 🛡️ 무적 노란색 보호막 이펙트 (할배새끼가 살아있을 때)
            if (hasShield) {
                ctx.save();
                ctx.globalCompositeOperation = "screen";
                let sPulse = 1 + Math.sin(mathNow / 120) * 0.15;
                let sGrad = ctx.createRadialGradient(hinbeom.x, hinbeom.y, HR * 0.8, hinbeom.x, hinbeom.y, HR * 1.5 * sPulse);
                sGrad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
                sGrad.addColorStop(0.4, "rgba(255, 215, 0, 0.6)");
                sGrad.addColorStop(1, "rgba(255, 180, 0, 0)");
                ctx.fillStyle = sGrad;
                ctx.beginPath(); ctx.arc(hinbeom.x, hinbeom.y, HR * 1.5 * sPulse, 0, Math.PI * 2); ctx.fill();

                ctx.strokeStyle = `rgba(255, 220, 50, ${0.8 + Math.sin(mathNow / 60) * 0.2})`;
                ctx.lineWidth = 6;
                ctx.setLineDash([15, 10]); // 약간의 패턴 추가
                ctx.lineDashOffset = -mathNow / 20;
                ctx.beginPath(); ctx.arc(hinbeom.x, hinbeom.y, HR * 1.25 * sPulse, 0, Math.PI * 2); ctx.stroke();
                
                ctx.globalCompositeOperation = "source-over";
                ctx.restore();
            }

            // 이름
            ctx.font = "bold 44px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(40, 0, 0, 0.95)"; ctx.lineWidth = 6;
            ctx.strokeText("박힌범", hinbeom.x, hinbeom.y - HR - 78);
            ctx.fillStyle = hakiOn ? "#ff7070" : "#fff";
            ctx.fillText("박힌범", hinbeom.x, hinbeom.y - HR - 78);

            // 체력바 (할배새끼보다 넓게)
            ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(hinbeom.x - 130, hinbeom.y - HR - 62, 260, 22);
            ctx.fillStyle = "#e74c3c"; ctx.fillRect(hinbeom.x - 127, hinbeom.y - HR - 59, 254 * (Math.max(0, hinbeom.hp) / hinbeom.maxHp), 16);
            drawHpTicks(ctx, hinbeom.x - 127, hinbeom.y - HR - 59, 254, 16, hinbeom.maxHp);   // 🩸 눈금
            ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(hinbeom.x - 130, hinbeom.y - HR - 62, 260, 22);

            // 상태이상
            let hShock = Math.max(hinbeom.airFreezeUntil || 0, hinbeom.raigoPullUntil || 0, hinbeom.electrocutedUntil || 0);
            if (hShock && mathNow < hShock) {
                RenderUtils.drawShockEffect(ctx, hinbeom.x, hinbeom.y, HR * 1.5, mathNow);
            } else if (hinbeom.frozenUntil && mathNow < hinbeom.frozenUntil) {
                RenderUtils.drawFrozenEffect(ctx, hinbeom.x, hinbeom.y, HR * 2.4, mathNow);
            }
            if (hinbeom.burningUntil && mathNow < hinbeom.burningUntil) RenderUtils.drawBurningEffect(ctx, hinbeom.x, hinbeom.y, HR * 2.4, mathNow);
            if (hinbeom.maguBombUntil && mathNow < hinbeom.maguBombUntil) RenderUtils.drawMaguBomb(ctx, hinbeom.x, hinbeom.y, HR * 1.5, mathNow, hinbeom.maguBombUntil);
            if (hinbeom.justiceBombUntil && mathNow < hinbeom.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, hinbeom.x, hinbeom.y, HR * 1.5, mathNow, hinbeom.justiceBombUntil);
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
                drawHpTicks(ctx, ok.x - 29, ok.y - 34, 58, 8, ok.maxHp);                // 🩸 눈금
                ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(ok.x - 29, ok.y - 34, 58, 8);
            } else {
                ctx.beginPath(); ctx.arc(ok.x, ok.y, ok.radius, 0, Math.PI * 2); ctx.fillStyle = "#27ae60"; ctx.fill();
                ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.fillText("오크라", ok.x, ok.y - 45);
                ctx.fillStyle = "#e74c3c"; ctx.fillRect(ok.x - 29, ok.y - 34, 58 * (ok.hp / ok.maxHp), 8); 
                drawHpTicks(ctx, ok.x - 29, ok.y - 34, 58, 8, ok.maxHp);                // 🩸 눈금
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
                drawHpTicks(ctx, p.x - 39, p.y - 79, 78, 5, cmax);                      // 🩸 눈금
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
            drawHpTicks(ctx, p.x - 39, p.y - 69, 78, 6, currentMaxHp);                  // 🩸 눈금
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

        // 🚀 [최적화⑦] 인원수 표시는 값이 실제로 바뀐 프레임에만 갱신 (매 프레임 innerText 쓰기 → 강제 리플로우 제거)
        if (aliveCount !== this._lastAliveCount) {
            if (!this._pCountEl) this._pCountEl = document.getElementById('playerCount');
            if (this._pCountEl) {
                this._pCountEl.innerText = `전장 인원: ${aliveCount}명`;
                this._lastAliveCount = aliveCount;
            }
        }
    }
}