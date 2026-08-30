// 파일명: renderMob.js
// ============================================================================
// 🎃 쫄몹 · NPC 렌더링
//
//   renderEntity.js 에서 갈라져 나온 조각이다.
//     · 🎃 오크라 (일반 · 황금 · 💎 해루석)
//     · 🗣️ NPC (티치 · 마허라)
// ============================================================================

import { RenderUtils } from './renderUtils.js';
import { drawKidStack, drawGolemBody } from './fxkid.js';
import { drawPacifista } from './fxpacifista.js';
import { drawWarlord, drawWarship } from './fxwarship.js';
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

/** 🎃 쫄몹과 NPC 를 그린다. */
export function drawMobs(ctx, state, z) {
    // 🤖 파시피스타 — 세계정부 공성 유닛
    {
        const pfs = (typeof window !== 'undefined' && window.pacifistas) ? window.pacifistas : [];
        for (let i = 0; i < pfs.length; i++) {
            const u = pfs[i];
            if (!u || u.hp <= 0) continue;
            if (!RenderUtils.isVisible(state.camX, state.camY, state.viewW, state.viewH, u.x, u.y, 140, 200)) continue;
            drawPacifista(ctx, u, state.mathNow);
        }
        // 🚢 버스터 콜 군함
        const wss = (typeof window !== 'undefined' && window.warships) ? window.warships : [];
        for (let i = 0; i < wss.length; i++) {
            const w = wss[i];
            if (!w || w.hp <= 0) continue;
            if (!RenderUtils.isVisible(state.camX, state.camY, state.viewW, state.viewH, w.x, w.y, 180, 260)) continue;
            drawWarship(ctx, w, state.mathNow);
        }
        // ⚔️ 칠무해 · 세라핌
        const wls = (typeof window !== 'undefined' && window.warlords) ? window.warlords : {};
        for (const k in wls) {
            const w = wls[k];
            if (!w || (!w.infinite && w.hp <= 0)) continue;
            if (!RenderUtils.isVisible(state.camX, state.camY, state.viewW, state.viewH, w.x, w.y, 110, 170)) continue;
            drawWarlord(ctx, w, state.mathNow);
        }
    }

    const { camX, camY, viewW, viewH, okras, players, myId, myPlayer, mathNow } = state;
    const inDarkZone = z.inDarkZone, inCurseZone = z.inCurseZone;


        // ====================================================================
        // 쫄몹(오크라)
        // ====================================================================
        if (!inDarkZone && !inCurseZone) {
            for (let ok of okras) {
                if (ok.hp <= 0 || !RenderUtils.isVisible(camX, camY, viewW, viewH, ok.x, ok.y, ok.radius, ok.radius)) continue;

                // 💎 해루석 오크라 — 청록색 (황금보다 강하다)
                if (ok.isHaeru) {
                    const hg = ctx.createRadialGradient(ok.x - ok.radius * 0.3, ok.y - ok.radius * 0.3, ok.radius * 0.2, ok.x, ok.y, ok.radius * 1.1);
                    hg.addColorStop(0, "#9ffff4");
                    hg.addColorStop(0.45, "#2fd8c8");
                    hg.addColorStop(1, "#0d7d78");
                    ctx.fillStyle = hg;
                    ctx.beginPath(); ctx.arc(ok.x, ok.y, ok.radius, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = "#064a48"; ctx.lineWidth = 4; ctx.stroke();
                    // 결정처럼 반짝인다
                    ctx.save();
                    ctx.globalCompositeOperation = "screen";
                    ctx.globalAlpha = 0.45 + Math.sin(mathNow / 220) * 0.3;
                    const sg3 = ctx.createRadialGradient(ok.x, ok.y, 2, ok.x, ok.y, ok.radius * 2.1);
                    sg3.addColorStop(0, "rgba(180,255,250,0.9)");
                    sg3.addColorStop(1, "rgba(20,180,170,0)");
                    ctx.fillStyle = sg3;
                    ctx.beginPath(); ctx.arc(ok.x, ok.y, ok.radius * 2.1, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();

                    // 🏷️ 이름 — 예전에는 몸통만 그리고 이름·체력바를 빠뜨렸다
                    ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
                    ctx.strokeStyle = "rgba(0, 60, 60, 0.9)"; ctx.lineWidth = 4; ctx.lineJoin = "round";
                    ctx.strokeText("해루석오크라", ok.x, ok.y - 45);
                    ctx.fillStyle = "#9ffff4"; ctx.fillText("해루석오크라", ok.x, ok.y - 45);

                    // ❤️ 체력바 (황금보다 체력이 2배라 조금 길게)
                    ctx.fillStyle = "#1a4a4a"; ctx.fillRect(ok.x - 34, ok.y - 34, 68, 8);
                    ctx.fillStyle = "#2fd8c8";
                    ctx.fillRect(ok.x - 34, ok.y - 34, 68 * Math.max(0, ok.hp / ok.maxHp), 8);
                    drawHpTicks(ctx, ok.x - 34, ok.y - 34, 68, 8, ok.maxHp);
                    ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(ok.x - 34, ok.y - 34, 68, 8);
                }
                else if (ok.isGolden) {
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
                    drawHpTicks(ctx, ok.x - 29, ok.y - 34, 58, 8, ok.maxHp);
                    ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(ok.x - 29, ok.y - 34, 58, 8);
                } else {
                    ctx.beginPath(); ctx.arc(ok.x, ok.y, ok.radius, 0, Math.PI * 2); ctx.fillStyle = "#27ae60"; ctx.fill();
                    ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.fillText("오크라", ok.x, ok.y - 45);
                    ctx.fillStyle = "#e74c3c"; ctx.fillRect(ok.x - 29, ok.y - 34, 58 * (ok.hp / ok.maxHp), 8); 
                    drawHpTicks(ctx, ok.x - 29, ok.y - 34, 58, 8, ok.maxHp);
                    ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(ok.x - 29, ok.y - 34, 58, 8);
                }
                drawKashimoCharge(ctx, ok, ok.x - 29, 58, ok.y - 34, 8, mathNow, 0.8);
                
                let oShock = Math.max(ok.airFreezeUntil || 0, ok.raigoPullUntil || 0, ok.electrocutedUntil || 0);
                if (oShock && mathNow < oShock) {
                    RenderUtils.drawShockEffect(ctx, ok.x, ok.y, ok.radius * 1.8, mathNow);
                } else if (ok.frozenUntil && mathNow < ok.frozenUntil) {
                    RenderUtils.drawFrozenEffect(ctx, ok.x, ok.y, ok.radius * 2.8, mathNow, ok);
                }

                if (ok.burningUntil && mathNow < ok.burningUntil) RenderUtils.drawBurningEffect(ctx, ok.x, ok.y, ok.radius * 2.8, mathNow, ok);
                kidStackOn(ctx, ok, ok.radius * 2.8, mathNow);
                if (ok.maguBombUntil && mathNow < ok.maguBombUntil) RenderUtils.drawMaguBomb(ctx, ok.x, ok.y, ok.radius * 1.5, mathNow, ok.maguBombUntil);
                if (ok.justiceBombUntil && mathNow < ok.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, ok.x, ok.y, ok.radius * 1.5, mathNow, ok.justiceBombUntil);
            }
        }

        // ====================================================================
        // 🗣️ NPC '티치' — 각 팀 정글 상단
        // ====================================================================
        if (!inDarkZone && !inCurseZone) {
            const npcs = (typeof window !== 'undefined' && window.serverNpcs) ? window.serverNpcs : [];
            // 🗣️ 티치 · 🗡️ 마허라 는 각자의 진행도로 완료 여부를 판정한다
            const tichDone   = (myPlayer.tichStage || 0) >= 2;
            // 🌑 마허라는 ⬛ 다부라 전용 2차 퀘스트까지 끝나야 '완료' 로 본다.
            //    (다부라가 아닌 캐릭터는 1차만 끝내면 더 할 게 없으므로 완료 취급)
            const maheraDone = (myPlayer.maheraStage || 0) >= 2
                && (myPlayer.characterType !== 'DABURA' || (myPlayer.maheraStage2 || 0) >= 2);
            for (let ni = 0; ni < npcs.length; ni++) {
                let n = npcs[ni];
                if (!n) continue;
                const NR = n.radius || 45;
                if (!RenderUtils.isVisible(camX, camY, viewW, viewH, n.x, n.y, NR * 2, NR * 3)) continue;
                drawNpc(ctx, n, mathNow, myPlayer, (n.kind === 'mahera') ? maheraDone : tichDone);
            }
        }
}
