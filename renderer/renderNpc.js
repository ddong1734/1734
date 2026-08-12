// 파일명: renderNpc.js
// ============================================================================
// 🗣️ NPC 렌더링
//
//   각 팀 정글 최상단 발판 중앙에 서 있는 두 NPC 를 그린다.
//     · 🗣️ 티치   (kind: 'tich')   — 검은수염풍 짙은 보라 + 가로 띠 3줄
//     · 🗡️ 마허라 (kind: 'mahera') — 차가운 강철빛 + 사선 칼자국 3줄
//
//   questDone 은 호출부(renderEntity.js)에서 NPC 종류에 맞는 진행도
//   (tichStage / maheraStage)를 판정해 넘겨준다.
//
//   이 모듈은 외부 의존이 없다 (window.NPC_INTERACT_RANGE 만 참조).
// ============================================================================

// ============================================================================
// 🗣️ NPC 렌더링 — 각 팀 정글 상단 발판 중앙의 '티치'
// ============================================================================
function drawNpc(ctx, npc, mathNow, myPlayer, questDone) {
    const R = npc.radius || 45;
    const sameTeam = (npc.team === myPlayer.team);
    const active = sameTeam && !questDone;
    const range = (typeof window !== 'undefined' && window.NPC_INTERACT_RANGE) ? window.NPC_INTERACT_RANGE : 200;
    const near = active && Math.hypot(myPlayer.x - npc.x, myPlayer.y - npc.y) <= range;
    // 🗡️ 마허라는 티치와 달리 차가운 강철빛으로 그린다
    const isMahera = (npc.kind === 'mahera');

    ctx.save();
    ctx.translate(npc.x, npc.y);

    // ── ① 발밑 오라 (활성이면 금빛/강철빛, 아니면 회색) ──────────────
    ctx.globalCompositeOperation = "screen";
    let pulse = 1 + Math.sin(mathNow / 260) * 0.14;
    let aura = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 2.1 * pulse);
    if (active && isMahera) {
        aura.addColorStop(0, "rgba(215, 232, 255, 0.62)");
        aura.addColorStop(0.5, "rgba(140, 175, 255, 0.3)");
        aura.addColorStop(1, "rgba(90, 120, 220, 0)");
    } else if (active) {
        aura.addColorStop(0, "rgba(255, 244, 170, 0.7)");
        aura.addColorStop(0.5, "rgba(255, 200, 40, 0.32)");
        aura.addColorStop(1, "rgba(255, 170, 0, 0)");
    } else {
        aura.addColorStop(0, "rgba(180, 180, 190, 0.35)");
        aura.addColorStop(0.5, "rgba(120, 120, 130, 0.18)");
        aura.addColorStop(1, "rgba(80, 80, 90, 0)");
    }
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, R * 2.1 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // ── ② 몸통 ───────────────────────────────────────────────────────
    //    티치 : 검은수염을 연상시키는 짙은 보라/검정
    //    마허라 : 차갑게 벼려진 강철빛
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
    let body = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.15, 0, 0, R);
    if (active && isMahera) {
        body.addColorStop(0, "#8fa6c8");
        body.addColorStop(0.55, "#3d4a60");
        body.addColorStop(1, "#10141c");
    } else if (active) {
        body.addColorStop(0, "#5b1f7a");
        body.addColorStop(0.55, "#2a0842");
        body.addColorStop(1, "#0d0016");
    } else {
        body.addColorStop(0, "#4a4a52");
        body.addColorStop(0.55, "#2b2b31");
        body.addColorStop(1, "#141418");
    }
    ctx.fillStyle = body; ctx.fill();
    ctx.strokeStyle = active ? (isMahera ? "#dce6ff" : "#ffd95e") : "#6b6b74";
    ctx.lineWidth = 5; ctx.stroke();

    // ── ③ 무늬 ───────────────────────────────────────────────────────
    //    티치 : 수염 느낌의 가로 띠 3줄
    //    마허라 : 몸을 가로지르는 칼자국 3줄
    if (isMahera) {
        ctx.strokeStyle = active ? "rgba(235, 243, 255, 0.85)" : "rgba(150, 150, 160, 0.4)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        for (let k = 0; k < 3; k++) {
            let off = -R * 0.45 + k * R * 0.45;
            ctx.beginPath();
            ctx.moveTo(-R * 0.72, off + R * 0.34);
            ctx.lineTo( R * 0.72, off - R * 0.34);
            ctx.stroke();
        }
    } else {
        ctx.strokeStyle = active ? "rgba(255, 217, 94, 0.55)" : "rgba(150, 150, 160, 0.4)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        for (let k = 0; k < 3; k++) {
            let ky = -R * 0.25 + k * R * 0.32;
            ctx.beginPath();
            ctx.moveTo(-R * 0.6, ky);
            ctx.quadraticCurveTo(0, ky + R * 0.16, R * 0.6, ky);
            ctx.stroke();
        }
    }

    // ── ④ 활성 상태면 테두리를 은은하게 맥동시킨다 ───────────────────
    if (active) {
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = isMahera
            ? `rgba(215, 232, 255, ${0.35 + Math.abs(Math.sin(mathNow / 320)) * 0.45})`
            : `rgba(255, 230, 130, ${0.35 + Math.abs(Math.sin(mathNow / 320)) * 0.45})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 10]);
        ctx.lineDashOffset = -mathNow / 40;
        ctx.beginPath(); ctx.arc(0, 0, R * 1.28, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalCompositeOperation = "source-over";
    }

    ctx.restore();

    // ── ⑤ 이름표 ─────────────────────────────────────────────────────
    ctx.save();
    ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(15, 0, 25, 0.95)"; ctx.lineWidth = 6;
    ctx.strokeText(npc.name || 'NPC', npc.x, npc.y - R - 26);
    if (active) {
        let ng = ctx.createLinearGradient(npc.x - 70, 0, npc.x + 70, 0);
        ng.addColorStop(0, "#c084fc"); ng.addColorStop(0.5, "#ffffff"); ng.addColorStop(1, "#c084fc");
        ctx.fillStyle = ng;
    } else {
        ctx.fillStyle = "#9a9aa4";
    }
    ctx.fillText(npc.name || 'NPC', npc.x, npc.y - R - 26);

    // ── ⑥ 상태 라벨 ──────────────────────────────────────────────────
    if (!sameTeam) {
        ctx.font = "bold 16px sans-serif";
        ctx.strokeStyle = "rgba(40, 0, 0, 0.9)"; ctx.lineWidth = 4;
        ctx.strokeText("🚫 상대팀", npc.x, npc.y - R - 52);
        ctx.fillStyle = "#ff8a8a";
        ctx.fillText("🚫 상대팀", npc.x, npc.y - R - 52);
    } else if (questDone) {
        ctx.font = "bold 16px sans-serif";
        ctx.strokeStyle = "rgba(0, 40, 20, 0.9)"; ctx.lineWidth = 4;
        ctx.strokeText("✔ 완료", npc.x, npc.y - R - 52);
        ctx.fillStyle = "#7ee7a5";
        ctx.fillText("✔ 완료", npc.x, npc.y - R - 52);
    }
    ctx.restore();

    // ── ⑦ 근처면 [!] 말풍선 ─────────────────────────────────────────
    if (near) {
        let bob = Math.sin(mathNow / 220) * 8;
        ctx.save();
        ctx.translate(npc.x, npc.y - R - 84 + bob);
        ctx.globalCompositeOperation = "screen";
        let g = ctx.createRadialGradient(0, 0, 3, 0, 0, 40);
        g.addColorStop(0, "rgba(255, 250, 200, 0.95)");
        g.addColorStop(0.5, "rgba(255, 200, 40, 0.5)");
        g.addColorStop(1, "rgba(255, 170, 0, 0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.font = "bold 46px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(70, 45, 0, 0.95)"; ctx.lineWidth = 8;
        ctx.strokeText("!", 0, 0);
        ctx.fillStyle = "#fff3b0";
        ctx.fillText("!", 0, 0);
        ctx.textBaseline = "alphabetic";
        ctx.restore();
    }
}

// ============================================================================
export { drawNpc };
