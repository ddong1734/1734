// 파일명: core/netNpc.js
// ============================================================================
// 🗣️ NPC 대화 · 퀘스트 네트워크 이벤트
//
//   · syncNpcs      : NPC 목록 동기화 (각 팀 정글 상단 발판 중앙)
//   · npcDialog     : 대화 한 줄 (타자 효과로 출력)
//   · npcDialogEnd  : 대화 종료 (모든 잠금 해제)
//   · npcQuest      : 퀘스트 배너 표시 / 제거
//   · npcReward     : 보상 획득 표시 (오른쪽 위)
// ============================================================================

window.registerNetModule('npc', function (socket, U) {

    // ── 🗣️ NPC 목록 ─────────────────────────────────────────────────
    socket.on('syncNpcs', (list) => {
        window.serverNpcs = Array.isArray(list) ? list : [];
    });

    // ── 🗣️ 대화 한 줄 ───────────────────────────────────────────────
    socket.on('npcDialog', (d) => {
        if (!d) return;

        // 🔒 대화 중에는 모든 조작이 봉인된다
        window.myPlayer.npcTalking = d.npcId || true;
        window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
        window.joyX = 0; window.joyY = 0;
        clearInterval(window.autoAttackInterval);

        // 🎮 조이스틱 노브를 원위치로
        let knob = document.getElementById('knob');
        if (knob) knob.style.transform = 'translate(0px, 0px)';

        if (typeof window.openNpcDialog === 'function') window.openNpcDialog(d);
    });

    // ── 🗣️ 대화 종료 ────────────────────────────────────────────────
    socket.on('npcDialogEnd', () => {
        window.myPlayer.npcTalking = null;
        if (typeof window.closeNpcDialog === 'function') window.closeNpcDialog();
    });

    // ── 📜 퀘스트 배너 ──────────────────────────────────────────────
    //    🗣️ 티치 · 🗡️ 마허라 퀘스트가 동시에 뜰 수 있으므로 key 로 구분한다.
    socket.on('npcQuest', (d) => {
        if (!d) return;
        if (typeof window.setQuestText === 'function') window.setQuestText(d.text || null, d.key || 'tich');
    });

    // ── 🎁 보상 획득 ────────────────────────────────────────────────
    socket.on('npcReward', (d) => {
        if (!d || !d.items) return;
        if (typeof window.showNpcReward === 'function') window.showNpcReward(d.items);
    });
});