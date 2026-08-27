// 파일명: renderBoss.js
// ============================================================================
// 👹 포탈 · 보스 렌더링
//
//   renderEntity.js 가 923줄까지 불어나 세 갈래로 쪼갠 것 중 하나다.
//   그리는 내용과 순서는 분리 전과 완전히 같다.
//
//     · 🌀 포탈 (기지 귀환 · 암흑 왕좌 · 저주의 왕)
//     · 👾 엄마 몬스터 · 🥊 박힌범 · 🐗 할배새끼
//     · 🔥 헤이안 스쿠나 · ⚫ 검은수염 · 🟪 지저스 바제스
// ============================================================================

import { RenderUtils } from './renderUtils.js';
import { drawKidStack, drawGolemBody } from './fxkid.js';
import { drawHpTicks, drawKashimoCharge, drawAmberBody, drawDaburaLightBody } from './renderEntityParts.js';
import { drawNpc } from './renderNpc.js';
import { drawPortal, drawPortalCountdown, drawDarkPortalCountdown } from './renderPortal.js';

/** 🔩 [키드] 어사인의 고철 — 플레이어뿐 아니라 몬스터·보스에게도 그린다 */
export function kidStackOn(ctx, o, size, mathNow) {
    if (!o) return;
    const held = !!(o.kidHoldUntil && mathNow < o.kidHoldUntil);
    const st = Math.max(o.kidStack || 0, held ? 1 : 0);
    if (st > 0) drawKidStack(ctx, o.x, o.y, size, st, held, mathNow);
}

/** 👹 포탈과 보스를 그린다. @param z { inDarkZone, inCurseZone } */
export function drawBosses(ctx, state, z) {
    const { camX, camY, viewW, viewH, monster, hinbeom, minions, okras,
            players, myId, myPlayer, mathNow } = state;
    const inDarkZone = z.inDarkZone, inCurseZone = z.inCurseZone;

        // 🌀 포탈들
        if (!inDarkZone && !inCurseZone) {
            drawPortal(ctx, camX, camY, viewW, viewH, mathNow, state.hinbeomPortal, 'base', '기지 귀환 포탈 (3초 대기)', false);
            drawPortal(ctx, camX, camY, viewW, viewH, mathNow, state.darkPortal, 'dark', '암흑 왕좌 (3초 대기)', true);
            // 🔥 저주의 왕 포탈 — 암흑 왕좌 포탈과 동시에 열릴 수 있다
            drawPortal(ctx, camX, camY, viewW, viewH, mathNow, state.cursePortal, 'curse', '저주의 왕 (3초 대기)', true);
        }
        drawPortal(ctx, camX, camY, viewW, viewH, mathNow, state.blackbeardPortal, 'base', '기지 귀환 포탈 (3초 대기)', false);
        // 🔥 스쿠나 처치 자리의 기지 귀환 포탈
        drawPortal(ctx, camX, camY, viewW, viewH, mathNow, state.sukunaPortal, 'base', '기지 귀환 포탈 (3초 대기)', false);

        // ====================================================================
        // 기존 맵 몬스터들 — 암흑 왕좌 안에서는 그리지 않는다
        // ====================================================================
        if (!inDarkZone && !inCurseZone) {
            if (monster && monster.hp > 0 && RenderUtils.isVisible(camX, camY, viewW, viewH, monster.x, monster.y, monster.radius, monster.radius)) {
                ctx.beginPath(); ctx.arc(monster.x, monster.y, monster.radius, 0, Math.PI * 2); ctx.fillStyle = "#8e44ad"; ctx.fill();
                ctx.fillStyle = "#fff"; ctx.font = "bold 35px sans-serif"; ctx.textAlign = "center"; ctx.fillText("할배새끼", monster.x, monster.y - 100);
                ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(monster.x - 80, monster.y - 85, 160, 16); 
                ctx.fillStyle = "#e74c3c"; ctx.fillRect(monster.x - 78, monster.y - 83, 156 * (monster.hp / monster.maxHp), 12); 
                drawHpTicks(ctx, monster.x - 78, monster.y - 83, 156, 12, monster.maxHp);
                ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.strokeRect(monster.x - 80, monster.y - 85, 160, 16);
                drawKashimoCharge(ctx, monster, monster.x - 80, 160, monster.y - 85, 16, mathNow, 1.15);
                
                let mShock = Math.max(monster.airFreezeUntil || 0, monster.raigoPullUntil || 0, monster.electrocutedUntil || 0);
                if (mShock && mathNow < mShock) {
                    RenderUtils.drawShockEffect(ctx, monster.x, monster.y, monster.radius * 1.5, mathNow);
                } else if (monster.frozenUntil && mathNow < monster.frozenUntil) {
                    RenderUtils.drawFrozenEffect(ctx, monster.x, monster.y, monster.radius * 2.4, mathNow, monster);
                }

                if (monster.burningUntil && mathNow < monster.burningUntil) RenderUtils.drawBurningEffect(ctx, monster.x, monster.y, monster.radius * 2.4, mathNow, monster);
                kidStackOn(ctx, monster, monster.radius * 2.4, mathNow);
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
                    drawHpTicks(ctx, mn.x - 78, mn.y - 83, 156, 12, mn.maxHp);
                    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.strokeRect(mn.x - 80, mn.y - 85, 160, 16);
                    drawKashimoCharge(ctx, mn, mn.x - 80, 160, mn.y - 85, 16, mathNow, 1.15);

                    let nShock = Math.max(mn.airFreezeUntil || 0, mn.raigoPullUntil || 0, mn.electrocutedUntil || 0);
                    if (nShock && mathNow < nShock) {
                        RenderUtils.drawShockEffect(ctx, mn.x, mn.y, MR * 1.5, mathNow);
                    } else if (mn.frozenUntil && mathNow < mn.frozenUntil) {
                        RenderUtils.drawFrozenEffect(ctx, mn.x, mn.y, MR * 2.4, mathNow, mn);
                    }
                    if (mn.burningUntil && mathNow < mn.burningUntil) RenderUtils.drawBurningEffect(ctx, mn.x, mn.y, MR * 2.4, mathNow, mn);
                kidStackOn(ctx, mn, MR * 2.4, mathNow);
                    if (mn.maguBombUntil && mathNow < mn.maguBombUntil) RenderUtils.drawMaguBomb(ctx, mn.x, mn.y, MR * 1.5, mathNow, mn.maguBombUntil);
                    if (mn.justiceBombUntil && mathNow < mn.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, mn.x, mn.y, MR * 1.5, mathNow, mn.justiceBombUntil);
                }
            }

            // 🥊 박힌범
            if (hinbeom && hinbeom.hp > 0 && hinbeom.state !== 'dead'
                && RenderUtils.isVisible(camX, camY, viewW, viewH, hinbeom.x, hinbeom.y, hinbeom.radius, hinbeom.radius)) {

                const HR = hinbeom.radius || 94.5;
                const hakiOn = hinbeom.hakiActiveUntil && mathNow < hinbeom.hakiActiveUntil;
                const hasShield = minions && minions.length > 0;

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

                ctx.beginPath(); ctx.arc(hinbeom.x, hinbeom.y, HR, 0, Math.PI * 2);
                ctx.fillStyle = "#5c0f22"; ctx.fill();
                ctx.strokeStyle = hakiOn ? "#ff3b3b" : "#c0392b";
                ctx.lineWidth = hakiOn ? 8 : 5; ctx.stroke();

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
                    ctx.setLineDash([15, 10]);
                    ctx.lineDashOffset = -mathNow / 20;
                    ctx.beginPath(); ctx.arc(hinbeom.x, hinbeom.y, HR * 1.25 * sPulse, 0, Math.PI * 2); ctx.stroke();
                    
                    ctx.globalCompositeOperation = "source-over";
                    ctx.restore();
                }

                ctx.font = "bold 44px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
                ctx.strokeStyle = "rgba(40, 0, 0, 0.95)"; ctx.lineWidth = 6;
                ctx.strokeText("박힌범", hinbeom.x, hinbeom.y - HR - 78);
                ctx.fillStyle = hakiOn ? "#ff7070" : "#fff";
                ctx.fillText("박힌범", hinbeom.x, hinbeom.y - HR - 78);

                ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(hinbeom.x - 130, hinbeom.y - HR - 62, 260, 22);
                ctx.fillStyle = "#e74c3c"; ctx.fillRect(hinbeom.x - 127, hinbeom.y - HR - 59, 254 * (Math.max(0, hinbeom.hp) / hinbeom.maxHp), 16);
                drawHpTicks(ctx, hinbeom.x - 127, hinbeom.y - HR - 59, 254, 16, hinbeom.maxHp);
                ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(hinbeom.x - 130, hinbeom.y - HR - 62, 260, 22);
                drawKashimoCharge(ctx, hinbeom, hinbeom.x - 130, 260, hinbeom.y - HR - 62, 22, mathNow, 1.5);

                let hShock = Math.max(hinbeom.airFreezeUntil || 0, hinbeom.raigoPullUntil || 0, hinbeom.electrocutedUntil || 0);
                if (hShock && mathNow < hShock) {
                    RenderUtils.drawShockEffect(ctx, hinbeom.x, hinbeom.y, HR * 1.5, mathNow);
                } else if (hinbeom.frozenUntil && mathNow < hinbeom.frozenUntil) {
                    RenderUtils.drawFrozenEffect(ctx, hinbeom.x, hinbeom.y, HR * 2.4, mathNow, hinbeom);
                }
                if (hinbeom.burningUntil && mathNow < hinbeom.burningUntil) RenderUtils.drawBurningEffect(ctx, hinbeom.x, hinbeom.y, HR * 2.4, mathNow, hinbeom);
                kidStackOn(ctx, hinbeom, HR * 2.4, mathNow);
                if (hinbeom.maguBombUntil && mathNow < hinbeom.maguBombUntil) RenderUtils.drawMaguBomb(ctx, hinbeom.x, hinbeom.y, HR * 1.5, mathNow, hinbeom.maguBombUntil);
                if (hinbeom.justiceBombUntil && mathNow < hinbeom.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, hinbeom.x, hinbeom.y, HR * 1.5, mathNow, hinbeom.justiceBombUntil);
            }
        }

        // ====================================================================
        // 🔥 헤이안 스쿠나 (저주의 왕) — 저주의 왕 맵 안에서만 그린다
        // ====================================================================
        const sk = state.sukuna;
        if (inCurseZone && sk && sk.hp > 0 && sk.state !== 'dead'
            && RenderUtils.isVisible(camX, camY, viewW, viewH, sk.x, sk.y, sk.radius, sk.radius)) {

            const SR = sk.radius || 94.5;
            const aiming = (sk.bowAimUntil && mathNow < sk.bowAimUntil);

            ctx.save();

            // ── 붉은 저주의 기운 ────────────────────────────────────
            let pulse = 1 + Math.sin(mathNow / 160) * 0.15;
            let aR = SR * 2.4 * pulse;
            ctx.globalCompositeOperation = "screen";
            let aura = ctx.createRadialGradient(sk.x, sk.y, SR * 0.4, sk.x, sk.y, aR);
            aura.addColorStop(0, "rgba(255, 90, 60, 0.55)");
            aura.addColorStop(0.45, "rgba(190, 20, 18, 0.35)");
            aura.addColorStop(1, "rgba(80, 0, 0, 0)");
            ctx.fillStyle = aura;
            ctx.beginPath(); ctx.arc(sk.x, sk.y, aR, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = "source-over";

            // ── 몸통 ────────────────────────────────────────────────
            let body = ctx.createRadialGradient(sk.x - SR * 0.3, sk.y - SR * 0.3, SR * 0.15, sk.x, sk.y, SR);
            body.addColorStop(0, "#c8404a");
            body.addColorStop(0.5, "#7a1018");
            body.addColorStop(1, "#2a0206");
            ctx.fillStyle = body;
            ctx.beginPath(); ctx.arc(sk.x, sk.y, SR, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = aiming ? "#ffd27a" : "#ff5a4a";
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(sk.x, sk.y, SR, 0, Math.PI * 2); ctx.stroke();

            // ── 얼굴의 문신 같은 가로줄 4개 ─────────────────────────
            ctx.strokeStyle = "rgba(20, 0, 4, 0.85)";
            ctx.lineWidth = 5;
            ctx.lineCap = "round";
            for (let k = 0; k < 4; k++) {
                let ly = sk.y - SR * 0.45 + k * SR * 0.3;
                ctx.beginPath();
                ctx.moveTo(sk.x - SR * 0.62, ly);
                ctx.lineTo(sk.x + SR * 0.62, ly + SR * 0.08);
                ctx.stroke();
            }

            // ── 연속 참격 중에는 몸에서 붉은 칼날이 솟는다 ──────────
            if (sk.barrageUntil && mathNow < sk.barrageUntil) {
                ctx.globalCompositeOperation = "screen";
                ctx.strokeStyle = "rgba(255, 80, 70, 0.85)";
                ctx.lineWidth = 7;
                for (let k = 0; k < 8; k++) {
                    let a = (k / 8) * Math.PI * 2 + mathNow / 300;
                    let l = SR * (1.3 + Math.abs(Math.sin(k + mathNow / 200)) * 0.6);
                    ctx.beginPath();
                    ctx.moveTo(sk.x + Math.cos(a) * SR * 0.8, sk.y + Math.sin(a) * SR * 0.8);
                    ctx.lineTo(sk.x + Math.cos(a) * l, sk.y + Math.sin(a) * l);
                    ctx.stroke();
                }
                ctx.globalCompositeOperation = "source-over";
            }

            ctx.restore();

            // ── 이름 · 체력바 ───────────────────────────────────────
            ctx.save();
            ctx.textAlign = "center";
            ctx.font = "bold 30px sans-serif";
            ctx.lineWidth = 6;
            ctx.strokeStyle = "rgba(20, 0, 0, 0.95)";
            ctx.strokeText("헤이안 스쿠나", sk.x, sk.y - SR - 46);
            ctx.fillStyle = "#ff8a7a";
            ctx.fillText("헤이안 스쿠나", sk.x, sk.y - SR - 46);
            ctx.restore();

            const hpW = SR * 2.6, hpH = 16;
            const hpX = sk.x - hpW / 2, hpY = sk.y - SR - 34;
            ctx.fillStyle = "rgba(0,0,0,0.65)";
            ctx.fillRect(hpX - 3, hpY - 3, hpW + 6, hpH + 6);
            ctx.fillStyle = "#3a0a0a";
            ctx.fillRect(hpX, hpY, hpW, hpH);
            ctx.fillStyle = "#e63b2e";
            ctx.fillRect(hpX, hpY, hpW * Math.max(0, sk.hp / sk.maxHp), hpH);
            drawHpTicks(ctx, hpX, hpY, hpW, hpH, sk.maxHp);

            if (sk.frozenUntil && mathNow < sk.frozenUntil) {
                RenderUtils.drawFrozenEffect(ctx, sk.x, sk.y, SR * 2.4, mathNow, sk);
            }
            if (sk.burningUntil && mathNow < sk.burningUntil) {
                RenderUtils.drawBurningEffect(ctx, sk.x, sk.y, SR * 2.4, mathNow, sk);
                kidStackOn(ctx, sk, SR * 2.4, mathNow);
            }
        }

        // ====================================================================
        // ⚫ 검은수염
        // ====================================================================
        const bb = state.blackbeard;
        const bbRising = (bb && bb.risingUntil && mathNow < bb.risingUntil);
        if (bb && bb.hp > 0 && bb.state !== 'dead' && !bbRising
            && RenderUtils.isVisible(camX, camY, viewW, viewH, bb.x, bb.y, bb.radius, bb.radius)) {

            const BR = bb.radius || 94.5;
            const casting = (bb.castingUntil && mathNow < bb.castingUntil);
            const stunned = (bb.telegraphUntil && mathNow < bb.telegraphUntil);
            const inSky = (bb.descentUntil && mathNow < bb.descentUntil);

            ctx.save();

            let aPulse = 1 + Math.sin(mathNow / 150) * 0.16;
            let aR = BR * 2.5 * aPulse;
            let aura = ctx.createRadialGradient(bb.x, bb.y, BR * 0.5, bb.x, bb.y, aR);
            aura.addColorStop(0, "rgba(0, 0, 0, 0.92)");
            aura.addColorStop(0.4, "rgba(18, 0, 34, 0.72)");
            aura.addColorStop(0.72, "rgba(58, 6, 96, 0.38)");
            aura.addColorStop(1, "rgba(20, 0, 40, 0)");
            ctx.fillStyle = aura;
            ctx.beginPath(); ctx.arc(bb.x, bb.y, aR, 0, Math.PI * 2); ctx.fill();

            ctx.lineCap = "round";
            for (let s = 0; s < 12; s++) {
                let sa = (Math.PI * 2 / 12) * s + mathNow / 1400;
                let sl = BR * (1.15 + Math.abs(Math.sin(s * 1.7 + mathNow / 400)) * 0.8);
                ctx.strokeStyle = `rgba(3, 0, 8, ${0.55 + Math.sin(s + mathNow / 300) * 0.25})`;
                ctx.lineWidth = 13;
                ctx.beginPath();
                ctx.moveTo(bb.x + Math.cos(sa) * BR * 0.7, bb.y + Math.sin(sa) * BR * 0.7);
                ctx.quadraticCurveTo(
                    bb.x + Math.cos(sa + 0.5) * sl * 0.8, bb.y + Math.sin(sa + 0.5) * sl * 0.8,
                    bb.x + Math.cos(sa + 0.2) * sl, bb.y + Math.sin(sa + 0.2) * sl
                );
                ctx.stroke();
            }

            ctx.beginPath(); ctx.arc(bb.x, bb.y, BR, 0, Math.PI * 2);
            let body = ctx.createRadialGradient(bb.x - BR * 0.3, bb.y - BR * 0.3, BR * 0.15, bb.x, bb.y, BR);
            body.addColorStop(0, "#3b0f5c");
            body.addColorStop(0.55, "#170426");
            body.addColorStop(1, "#040008");
            ctx.fillStyle = body; ctx.fill();
            ctx.strokeStyle = stunned ? "#ff3b3b" : (casting ? "#c07bff" : "#4b1178");
            ctx.lineWidth = stunned ? 9 : (casting ? 8 : 5);
            ctx.stroke();

            if (inSky) {
                ctx.globalCompositeOperation = "source-over";
                for (let d = 0; d < 7; d++) {
                    let dt = ((mathNow / 520) + d * 0.143) % 1;
                    let dx = bb.x + Math.sin(d * 2.1 + mathNow / 380) * BR * 0.8;
                    let dy = bb.y + BR * 0.5 + dt * 190;
                    ctx.globalAlpha = (1 - dt) * 0.8;
                    ctx.fillStyle = "rgba(8, 0, 18, 0.9)";
                    ctx.beginPath(); ctx.ellipse(dx, dy, 15 * (1 - dt) + 5, 26 * (1 - dt) + 8, 0, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            if (casting) {
                ctx.globalCompositeOperation = "screen";
                let cPulse = 1 + Math.sin(mathNow / 90) * 0.2;
                ctx.strokeStyle = `rgba(200, 120, 255, ${0.7 + Math.sin(mathNow / 70) * 0.3})`;
                ctx.lineWidth = 7;
                ctx.setLineDash([22, 16]);
                ctx.lineDashOffset = -mathNow / 16;
                ctx.beginPath(); ctx.arc(bb.x, bb.y, BR * 1.35 * cPulse, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalCompositeOperation = "source-over";
            }

            ctx.restore();

            ctx.font = "bold 46px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(8, 0, 16, 0.98)"; ctx.lineWidth = 7;
            ctx.strokeText("검은수염", bb.x, bb.y - BR - 78);
            let ng = ctx.createLinearGradient(bb.x - 120, 0, bb.x + 120, 0);
            ng.addColorStop(0, "#8e44ff"); ng.addColorStop(0.5, "#ffffff"); ng.addColorStop(1, "#8e44ff");
            ctx.fillStyle = ng;
            ctx.fillText("검은수염", bb.x, bb.y - BR - 78);

            ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(bb.x - 130, bb.y - BR - 62, 260, 22);
            let hg = ctx.createLinearGradient(bb.x - 127, 0, bb.x + 127, 0);
            hg.addColorStop(0, "#4b1178"); hg.addColorStop(1, "#b83bff");
            ctx.fillStyle = hg;
            ctx.fillRect(bb.x - 127, bb.y - BR - 59, 254 * (Math.max(0, bb.hp) / bb.maxHp), 16);
            drawHpTicks(ctx, bb.x - 127, bb.y - BR - 59, 254, 16, bb.maxHp);
            ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(bb.x - 130, bb.y - BR - 62, 260, 22);
            drawKashimoCharge(ctx, bb, bb.x - 130, 260, bb.y - BR - 62, 22, mathNow, 1.5);

            let bShock = Math.max(bb.airFreezeUntil || 0, bb.raigoPullUntil || 0, bb.electrocutedUntil || 0);
            if (bShock && mathNow < bShock) {
                RenderUtils.drawShockEffect(ctx, bb.x, bb.y, BR * 1.5, mathNow);
            } else if (bb.frozenUntil && mathNow < bb.frozenUntil) {
                RenderUtils.drawFrozenEffect(ctx, bb.x, bb.y, BR * 2.4, mathNow, bb);
            }
            if (bb.burningUntil && mathNow < bb.burningUntil) RenderUtils.drawBurningEffect(ctx, bb.x, bb.y, BR * 2.4, mathNow, bb);
                kidStackOn(ctx, bb, BR * 2.4, mathNow);
            if (bb.maguBombUntil && mathNow < bb.maguBombUntil) RenderUtils.drawMaguBomb(ctx, bb.x, bb.y, BR * 1.5, mathNow, bb.maguBombUntil);
            if (bb.justiceBombUntil && mathNow < bb.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, bb.x, bb.y, BR * 1.5, mathNow, bb.justiceBombUntil);
        }

        // ====================================================================
        // 🟪 지저스 바제스
        // ====================================================================
        const bg = state.burgess;
        if (bg && bg.hp > 0 && bg.state !== 'dead' && bg.state !== 'none'
            && RenderUtils.isVisible(camX, camY, viewW, viewH, bg.x, bg.y, bg.radius * 2, bg.radius * 2)) {

            const GR = bg.radius || 75.6;
            const isFalling = (bg.state === 'falling');
            const isTele = (bg.jumpTelegraphUntil && mathNow < bg.jumpTelegraphUntil);
            const isJumping = (bg.jumpingUntil && mathNow < bg.jumpingUntil);

            ctx.save();

            if (isFalling || isJumping) {
                ctx.globalCompositeOperation = "screen";
                let tg = ctx.createLinearGradient(bg.x, bg.y - GR * 3.2, bg.x, bg.y);
                tg.addColorStop(0, "rgba(180, 90, 255, 0)");
                tg.addColorStop(0.6, "rgba(160, 60, 250, 0.35)");
                tg.addColorStop(1, "rgba(220, 160, 255, 0.6)");
                ctx.fillStyle = tg;
                ctx.beginPath();
                ctx.moveTo(bg.x - GR * 0.55, bg.y);
                ctx.lineTo(bg.x + GR * 0.55, bg.y);
                ctx.lineTo(bg.x + GR * 0.15, bg.y - GR * 3.2);
                ctx.lineTo(bg.x - GR * 0.15, bg.y - GR * 3.2);
                ctx.closePath();
                ctx.fill();
                ctx.globalCompositeOperation = "source-over";
            }

            ctx.globalCompositeOperation = "screen";
            let gPulse = 1 + Math.sin(mathNow / 170) * 0.14;
            let gAura = ctx.createRadialGradient(bg.x, bg.y, GR * 0.4, bg.x, bg.y, GR * 2.1 * gPulse);
            gAura.addColorStop(0, "rgba(190, 110, 255, 0.62)");
            gAura.addColorStop(0.45, "rgba(126, 40, 220, 0.34)");
            gAura.addColorStop(1, "rgba(60, 0, 120, 0)");
            ctx.fillStyle = gAura;
            ctx.beginPath(); ctx.arc(bg.x, bg.y, GR * 2.1 * gPulse, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = "source-over";

            ctx.beginPath(); ctx.arc(bg.x, bg.y, GR, 0, Math.PI * 2);
            let gBody = ctx.createRadialGradient(bg.x - GR * 0.3, bg.y - GR * 0.3, GR * 0.15, bg.x, bg.y, GR);
            gBody.addColorStop(0, "#a855f7");
            gBody.addColorStop(0.55, "#6b21a8");
            gBody.addColorStop(1, "#2e0850");
            ctx.fillStyle = gBody; ctx.fill();
            ctx.strokeStyle = isTele ? "#ff3b3b" : "#c084fc";
            ctx.lineWidth = isTele ? 8 : 5;
            ctx.stroke();

            ctx.strokeStyle = "rgba(216, 180, 254, 0.55)";
            ctx.lineWidth = 4;
            for (let k = 0; k < 3; k++) {
                let ky = bg.y - GR * 0.4 + k * GR * 0.4;
                ctx.beginPath();
                ctx.moveTo(bg.x - GR * 0.55, ky);
                ctx.quadraticCurveTo(bg.x, ky + GR * 0.18, bg.x + GR * 0.55, ky);
                ctx.stroke();
            }

            ctx.restore();

            ctx.font = "bold 40px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(25, 0, 45, 0.98)"; ctx.lineWidth = 6;
            ctx.strokeText("지저스 바제스", bg.x, bg.y - GR - 72);
            let bng = ctx.createLinearGradient(bg.x - 140, 0, bg.x + 140, 0);
            bng.addColorStop(0, "#c084fc"); bng.addColorStop(0.5, "#ffffff"); bng.addColorStop(1, "#c084fc");
            ctx.fillStyle = bng;
            ctx.fillText("지저스 바제스", bg.x, bg.y - GR - 72);

            ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(bg.x - 110, bg.y - GR - 58, 220, 20);
            let bhg = ctx.createLinearGradient(bg.x - 107, 0, bg.x + 107, 0);
            bhg.addColorStop(0, "#6b21a8"); bhg.addColorStop(1, "#d8b4fe");
            ctx.fillStyle = bhg;
            ctx.fillRect(bg.x - 107, bg.y - GR - 55, 214 * (Math.max(0, bg.hp) / bg.maxHp), 14);
            drawHpTicks(ctx, bg.x - 107, bg.y - GR - 55, 214, 14, bg.maxHp);
            ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(bg.x - 110, bg.y - GR - 58, 220, 20);
            drawKashimoCharge(ctx, bg, bg.x - 110, 220, bg.y - GR - 58, 20, mathNow, 1.4);

            let gShock = Math.max(bg.airFreezeUntil || 0, bg.raigoPullUntil || 0, bg.electrocutedUntil || 0);
            if (gShock && mathNow < gShock) {
                RenderUtils.drawShockEffect(ctx, bg.x, bg.y, GR * 1.5, mathNow);
            } else if (bg.frozenUntil && mathNow < bg.frozenUntil) {
                RenderUtils.drawFrozenEffect(ctx, bg.x, bg.y, GR * 2.4, mathNow, bg);
            }
            if (bg.burningUntil && mathNow < bg.burningUntil) RenderUtils.drawBurningEffect(ctx, bg.x, bg.y, GR * 2.4, mathNow, bg);
                kidStackOn(ctx, bg, GR * 2.4, mathNow);
            if (bg.maguBombUntil && mathNow < bg.maguBombUntil) RenderUtils.drawMaguBomb(ctx, bg.x, bg.y, GR * 1.5, mathNow, bg.maguBombUntil);
            if (bg.justiceBombUntil && mathNow < bg.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, bg.x, bg.y, GR * 1.5, mathNow, bg.justiceBombUntil);
        }
}
