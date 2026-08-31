// 파일명: renderPlayer.js
// ============================================================================
// 🧍 플레이어 렌더링
//
//   renderEntity.js 에서 갈라져 나온 조각이다.
//     · 몸통 · 이름 · 체력바 · 상태이상 표시
//     · 🕊️ 신성력 게이지 · 🔥 마르코 재생 게이지 · 🔩 키드 고철
// ============================================================================

import { RenderUtils } from './renderUtils.js';
import { drawKidStack, drawGolemBody } from './fxkid.js';
import { drawHpTicks, drawKashimoCharge, drawAmberBody, drawDaburaLightBody, drawIceBody } from './renderEntityParts.js';
import { drawNpc } from './renderNpc.js';
import { drawPortal, drawPortalCountdown, drawDarkPortalCountdown } from './renderPortal.js';

/** 🔩 [키드] 어사인의 고철 — 플레이어뿐 아니라 몬스터·보스에게도 그린다 */
export function kidStackOn(ctx, o, size, mathNow) {
    if (!o) return;
    const held = !!(o.kidHoldUntil && mathNow < o.kidHoldUntil);
    const st = Math.max(o.kidStack || 0, held ? 1 : 0);
    if (st > 0) drawKidStack(ctx, o.x, o.y, size, st, held, mathNow);
}

/** 🧍 플레이어를 그리고 살아있는 인원수를 돌려준다. */
export function drawPlayers(ctx, state, z) {
    const { camX, camY, viewW, viewH, players, myId, myPlayer, mathNow } = state;
    const inDarkZone = z.inDarkZone, inCurseZone = z.inCurseZone;


        // ====================================================================
        // 플레이어
        // ====================================================================
        let aliveCount = 0;
        for (let id in players) {
            let p = players[id]; 
            if (p.isDead || !RenderUtils.isVisible(camX, camY, viewW, viewH, p.x, p.y, 50, 100)) continue;
            aliveCount++;

            let portalUntil = (id === myId) ? (myPlayer.portalDwellUntil || 0) : (p.portalDwellUntil || 0);
            // 🟣🔥 별세계 포탈 대기 — 암흑 왕좌와 저주의 왕은 대기 필드가 다르지만
            //     카운트다운 표시는 똑같으므로 하나로 합쳐서 그린다.
            //     (둘은 동시에 진행될 수 없다 — 서로 다른 포탈에 동시에 서 있을 수 없다)
            let darkUntil = (id === myId)
                ? Math.max(myPlayer.darkDwellUntil || 0, myPlayer.curseDwellUntil || 0)
                : Math.max(p.darkDwellUntil || 0, p.curseDwellUntil || 0);
            let chargeSrc = (id === myId) ? myPlayer : p;
            // ⚡🔮 환수호박 여부 (내 캐릭터는 로컬 상태를 우선한다)
            let amberOn = (id === myId) ? !!myPlayer.amberActive : !!p.amberActive;
            // 🗣️ NPC 대화 여부 (내 캐릭터는 로컬 상태를 우선한다)
            let talkingOn = (id === myId) ? !!myPlayer.npcTalking : !!p.npcTalking;
            // ⬛ 다부라 상태 (내 캐릭터는 로컬 상태를 우선한다)
            let src = (id === myId) ? myPlayer : p;
            let dKickFly = !!src.dKickFlying && mathNow < (src.dKickFlyEnd || 0);
            let dKickCharge = !!src.dKickCharging && mathNow < (src.dKickChargeEnd || 0);
            let dLightOn = !!src.dLightActive && mathNow < (src.dLightEnd || 0);
            let dDarkOn = !!src.dDarkActive && mathNow < (src.dDarkEnd || 0);
            let hasSq = !!src.hasSquare;

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
                drawHpTicks(ctx, p.x - 39, p.y - 79, 78, 5, cmax);
                drawKashimoCharge(ctx, chargeSrc, p.x - 39, 78, p.y - 79, 5, mathNow, 1.0);
                ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText(p.nickname, p.x, p.y - 88);
                drawPortalCountdown(ctx, p.x, p.y, portalUntil, mathNow);
                drawDarkPortalCountdown(ctx, p.x, p.y, darkUntil, mathNow);
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
                drawPortalCountdown(ctx, p.x, p.y, portalUntil, mathNow);
                drawDarkPortalCountdown(ctx, p.x, p.y, darkUntil, mathNow);
                continue;
            }

            if (p.isCasting) {
                let isBors = p.characterType === 'BORSALINO';
                let isKuz = p.characterType === 'KUZAN';
                let isEnel = p.characterType === 'ENEL';
                let isKashimo = p.characterType === 'KASHIMO';
                let isDabura = p.characterType === 'DABURA';
                let castTxt = isBors ? "✨ 빛의 힘" : (isKuz ? "❄️ 냉기 방출 중" : (isEnel ? "⚡ 뇌전 응축 중" : (isKashimo ? "⚡ 전하 응축 중" : (isDabura ? "☀️🌑 빛과 어둠 응축 중" : "🌀 기절 (공기 모으는 중)"))));
                let castCol = isBors ? "rgba(241, 196, 15, 0.3)" : (isKuz ? "rgba(52, 152, 219, 0.3)" : (isEnel ? "rgba(0, 191, 255, 0.3)" : (isKashimo ? "rgba(168, 85, 247, 0.3)" : (isDabura ? "rgba(240, 240, 245, 0.32)" : "rgba(255, 255, 255, 0.3)"))));
                ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; 
                ctx.fillText(castTxt, p.x, p.y - 100);
                ctx.beginPath(); ctx.arc(p.x, p.y, 80, 0, Math.PI * 2); ctx.fillStyle = castCol; ctx.fill();
            }

            // ⚡🔮 환수호박 / ⬛💫 아광속 발차기 상태면 몸을 특수하게 그린다
            if (amberOn) {
                drawAmberBody(ctx, p.x, p.y, mathNow, p.team);
            } else if (p.kzDashEnd && mathNow < p.kzDashEnd) {
                // 🧊 [쿠잔(해적) · 아이스 타임] 돌진 중에는 전신이 얼음이다
                drawIceBody(ctx, p.x, p.y, mathNow, p.team, p.kzDashDX, p.kzDashDY);
            } else if (dKickFly) {
                drawDaburaLightBody(ctx, p.x, p.y, mathNow, p.team, p.lastFacing, hasSq);
            } else {
                ctx.beginPath(); ctx.arc(p.x, p.y, 45, 0, Math.PI * 2);
                ctx.fillStyle = p.team === 1 ? "#3498db" : "#e74c3c"; ctx.fill();
                ctx.strokeStyle = p.characterType === 'BORSALINO' ? "#f1c40f" : (p.characterType === 'KUZAN' ? "#3498db" : (p.characterType === 'SAKAZUKI' ? "#e74c3c" : (p.characterType === 'ENEL' ? "#00bfff" : (p.characterType === 'KASHIMO' ? "#a855f7" : (p.characterType === 'DABURA' ? "#cbd5e1" : "#000"))))); 
                ctx.lineWidth = 3; ctx.stroke();
            }

            let ctype = p.characterType || 'BORSALINO';
            let currentMaxHp = p.maxHp || (window.Characters && window.Characters[ctype] ? window.Characters[ctype].hp : 3000);
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(p.x - 39, p.y - 69, 78 * (Math.max(0, p.hp) / currentMaxHp), 6); 
            drawHpTicks(ctx, p.x - 39, p.y - 69, 78, 6, currentMaxHp);
            ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(p.x - 39, p.y - 69, 78, 6);
            drawKashimoCharge(ctx, chargeSrc, p.x - 39, 78, p.y - 69, 6, mathNow, 1.0);
            ctx.fillStyle = "#f1c40f"; ctx.fillRect(p.x - 39, p.y - 62, 78 * (Math.max(0, p.xp || 0) / (p.maxXp || 100)), 4); 
            ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(p.x - 39, p.y - 62, 78, 4);
            // 🕊️ [쿠루스 하나] 신성력 게이지 — 체력바 바로 위.
            //    검은 테두리 + 밝은 노란빛. 가득 차면 반짝인다.
            if (ctype === 'KURUSU') {
                const HOLY_MAX = 50;
                const holy = Math.max(0, Math.min(HOLY_MAX, p.holyPower || 0));
                const full = holy >= HOLY_MAX;
                const gx = p.x - 39, gy = p.y - 78, gw = 78, gh = 6;

                ctx.fillStyle = "#20180a";
                ctx.fillRect(gx, gy, gw, gh);
                let hg = ctx.createLinearGradient(gx, gy, gx, gy + gh);
                hg.addColorStop(0, full ? "#fffbe0" : "#ffe98a");
                hg.addColorStop(1, full ? "#ffd23c" : "#e0a81c");
                ctx.fillStyle = hg;
                ctx.fillRect(gx, gy, gw * (holy / HOLY_MAX), gh);

                if (full) {
                    // 가득 차면 은은하게 빛난다
                    ctx.save();
                    ctx.globalCompositeOperation = "screen";
                    ctx.globalAlpha = 0.35 + Math.sin(mathNow / 190) * 0.25;
                    ctx.fillStyle = "#fff6c0";
                    ctx.fillRect(gx - 2, gy - 2, gw + 4, gh + 4);
                    ctx.restore();
                }
                ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
                ctx.strokeRect(gx, gy, gw, gh);
            }

            // 🔩 [키드] 어사인의 고철이 몸에 쌓인다
            if (p.kidStack > 0 || (p.kidHoldUntil && mathNow < p.kidHoldUntil)) {
                drawKidStack(ctx, p.x, p.y, 130,
                             Math.max(p.kidStack || 0, (p.kidHoldUntil && mathNow < p.kidHoldUntil) ? 1 : 0),
                             !!(p.kidHoldUntil && mathNow < p.kidHoldUntil), mathNow);
            }

            // 🔥 [마르코] 재생 게이지 — 체력바 바로 위. 푸른색.
            //    받은 피해가 쌓여 2500 이 되면 가득 찬다.
            if (ctype === 'MARCO') {
                const G_MAX = 2500;
                const g = Math.max(0, Math.min(G_MAX, p.marcoGauge || 0));
                const burning = p.marcoRegenUntil && mathNow < p.marcoRegenUntil;
                const gx = p.x - 39, gy = p.y - 78, gw = 78, gh = 6;

                ctx.fillStyle = "#07202a";
                ctx.fillRect(gx, gy, gw, gh);
                let mg = ctx.createLinearGradient(gx, gy, gx, gy + gh);
                mg.addColorStop(0, "#b9fff8");
                mg.addColorStop(1, "#2fbcd0");
                ctx.fillStyle = mg;
                ctx.fillRect(gx, gy, gw * (g / G_MAX), gh);

                if (burning) {
                    // 불꽃이 켜져 있는 동안 게이지가 일렁인다
                    ctx.save();
                    ctx.globalCompositeOperation = "screen";
                    ctx.globalAlpha = 0.4 + Math.sin(mathNow / 150) * 0.3;
                    ctx.fillStyle = "#c8fff6";
                    ctx.fillRect(gx - 2, gy - 2, gw + 4, gh + 4);
                    ctx.restore();
                }
                ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
                ctx.strokeRect(gx, gy, gw, gh);
            }

            // ✨ 여분의 목숨 — 체력바 왼쪽에 작게 표시
            if (p.extraLives > 0) {
                ctx.save();
                ctx.textAlign = "right";
                ctx.font = "bold 17px sans-serif";
                ctx.lineWidth = 4; ctx.lineJoin = "round";
                ctx.strokeStyle = "rgba(20,14,0,0.95)";
                ctx.strokeText('✚' + p.extraLives, p.x - 44, p.y - 63);
                ctx.fillStyle = "#ffd23c";
                ctx.fillText('✚' + p.extraLives, p.x - 44, p.y - 63);
                ctx.restore();
            }

            ctx.fillStyle = "#000"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; 
            ctx.fillText(`Lv.${p.level || 0} ${p.nickname}`, p.x, p.y - 82);

            // ── 머리 위 상태 표식 (겹치지 않도록 층을 쌓는다) ────────────
            let labelY = p.y - 102;

            // ⚡🔮 환수호박 표식
            if (amberOn) {
                ctx.save();
                ctx.font = "bold 19px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
                ctx.strokeStyle = "rgba(30, 0, 60, 0.95)"; ctx.lineWidth = 4;
                ctx.strokeText("🔮 환수호박", p.x, labelY);
                let ag = ctx.createLinearGradient(p.x - 60, 0, p.x + 60, 0);
                ag.addColorStop(0, "#c084fc"); ag.addColorStop(0.5, "#ffffff"); ag.addColorStop(1, "#c084fc");
                ctx.fillStyle = ag;
                ctx.fillText("🔮 환수호박", p.x, labelY);
                ctx.restore();
                labelY -= 22;
            }

            // ⬛☀️ [빛] 시전 중
            if (dLightOn) {
                ctx.save();
                ctx.font = "bold 19px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
                ctx.strokeStyle = "rgba(70, 55, 0, 0.95)"; ctx.lineWidth = 4;
                ctx.strokeText("☀️ 빛", p.x, labelY);
                ctx.fillStyle = "#fff8d0";
                ctx.fillText("☀️ 빛", p.x, labelY);
                ctx.restore();
                labelY -= 22;
            }

            // ⬛🌑 [어둠] 지속 중
            if (dDarkOn) {
                ctx.save();
                ctx.font = "bold 19px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
                ctx.strokeStyle = "rgba(10, 0, 22, 0.95)"; ctx.lineWidth = 4;
                ctx.strokeText("🌑 어둠", p.x, labelY);
                ctx.fillStyle = "#d8b4fe";
                ctx.fillText("🌑 어둠", p.x, labelY);
                ctx.restore();
                labelY -= 22;
            }

            // ⬛💫 [아광속 발차기] 응축 / 활공
            if (dKickCharge || dKickFly) {
                ctx.save();
                ctx.font = "bold 19px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
                let txt = dKickCharge ? "💫 응축 중" : "💫 아광속";
                ctx.strokeStyle = "rgba(70, 55, 0, 0.95)"; ctx.lineWidth = 4;
                ctx.strokeText(txt, p.x, labelY);
                let kg = ctx.createLinearGradient(p.x - 60, 0, p.x + 60, 0);
                kg.addColorStop(0, "#ffe27f"); kg.addColorStop(0.5, "#ffffff"); kg.addColorStop(1, "#ffe27f");
                ctx.fillStyle = kg;
                ctx.fillText(txt, p.x, labelY);
                ctx.restore();
                labelY -= 22;
            }

            // 🗣️ NPC 대화 중 표식
            if (talkingOn) {
                ctx.save();
                ctx.font = "bold 19px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
                ctx.strokeStyle = "rgba(20, 20, 25, 0.95)"; ctx.lineWidth = 4;
                ctx.strokeText("💬 대화 중", p.x, labelY);
                ctx.fillStyle = "#ffe680";
                ctx.fillText("💬 대화 중", p.x, labelY);
                ctx.restore();
                labelY -= 22;
            }

            drawPortalCountdown(ctx, p.x, p.y, portalUntil, mathNow);
            drawDarkPortalCountdown(ctx, p.x, p.y, darkUntil, mathNow);

            // 🚫 암흑 왕좌 입장 금지 표시 (본인에게만)
            if (id === myId && myPlayer.darkBanned && state.darkPortal) {
                ctx.save();
                ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
                ctx.strokeStyle = "rgba(40, 0, 0, 0.9)"; ctx.lineWidth = 4;
                ctx.strokeText("🚫 암흑 왕좌 입장 불가", p.x, p.y + 118);
                ctx.fillStyle = "#ff8a8a";
                ctx.fillText("🚫 암흑 왕좌 입장 불가", p.x, p.y + 118);
                ctx.restore();
            }

            // ⚫ 크로우즈에 끌려가는 중 표시
            let crowsUntil = (id === myId) ? (myPlayer.crowsPullUntil || 0) : (p.crowsPullUntil || 0);
            if (crowsUntil && mathNow < crowsUntil) {
                ctx.save();
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = `rgba(10, 0, 20, ${0.75 + Math.sin(mathNow / 80) * 0.25})`;
                ctx.lineWidth = 9;
                ctx.beginPath(); ctx.arc(p.x, p.y, 58, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = "rgba(176, 82, 255, 0.9)";
                ctx.lineWidth = 3.5;
                ctx.beginPath(); ctx.arc(p.x, p.y, 58, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = "rgba(220, 180, 255, 0.95)"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
                ctx.strokeStyle = "rgba(15,0,30,0.85)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
                ctx.strokeText("⛓️ 스킬 봉인", p.x, p.y + 90); ctx.fillText("⛓️ 스킬 봉인", p.x, p.y + 90);
                ctx.restore();
            }

            // ⬛🌑 어둠 소용돌이에 끌려가는 중 표시
            let dpUntil = (id === myId) ? (myPlayer.darkPullUntil || 0) : 0;
            if (dpUntil && mathNow < dpUntil) {
                ctx.save();
                ctx.strokeStyle = `rgba(6, 0, 14, ${0.7 + Math.sin(mathNow / 90) * 0.3})`;
                ctx.lineWidth = 8;
                ctx.beginPath(); ctx.arc(p.x, p.y, 62, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = "rgba(168, 85, 247, 0.9)";
                ctx.lineWidth = 3;
                ctx.setLineDash([12, 9]);
                ctx.lineDashOffset = -mathNow / 22;
                ctx.beginPath(); ctx.arc(p.x, p.y, 62, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = "rgba(216, 180, 254, 0.95)"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
                ctx.strokeStyle = "rgba(10,0,22,0.9)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
                ctx.strokeText("🌑 흡인", p.x, p.y + 90); ctx.fillText("🌑 흡인", p.x, p.y + 90);
                ctx.restore();
            }

            // ⚡ 플레이어 상태 이상
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
                // 🩸💫 [버그 수정] 내 캐릭터는 myPlayer 에서 상태를 읽어야 한다.
                //    p 를 넘기면 stunUntil/bleedUntil 이 비어 있어 동결·화상으로 보였다.
                const stObj = (id === myId) ? myPlayer : p;
                let myFrozen = (id === myId) ? myPlayer.frozenUntil : p.frozenUntil;
                if (myFrozen && mathNow < myFrozen && !p.isCasting) {
                    RenderUtils.drawFrozenEffect(ctx, p.x, p.y, 130, mathNow, stObj);
                    ctx.fillStyle = "rgba(180, 235, 255, 0.95)"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
                    ctx.strokeStyle = "rgba(0,60,120,0.8)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
                    ctx.strokeText("❄️ 동결", p.x, p.y + 90); ctx.fillText("❄️ 동결", p.x, p.y + 90);
                }
            }

            let myBurn = (id === myId) ? myPlayer.burningUntil : p.burningUntil;
            const stObj2 = (id === myId) ? myPlayer : p;
            // 🩸 출혈이 걸려 있으면 화상 대신 핏방울로 그린다
            if ((myBurn && mathNow < myBurn) || (stObj2.bleedUntil && mathNow < stObj2.bleedUntil))
                RenderUtils.drawBurningEffect(ctx, p.x, p.y, 130, mathNow, stObj2);
            
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
    return aliveCount;
}
