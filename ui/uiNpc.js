// 파일명: ui/uiNpc.js
// ============================================================================
// 🗣️ NPC 대화창 · 📜 퀘스트 배너 · 🎁 보상 표시
//
//   · 대화창은 왼쪽 위에서부터 매우 빠르게 타자치듯 글자가 찍힌다.
//     대사가 다 끝나야 [동의합니다] · [나가기] 버튼이 빛나며 눌린다.
//   · 퀘스트 배너는 🗣️ 티치 · 🗡️ 마허라 를 동시에 표시할 수 있다 (key 별 관리).
// ============================================================================

// ============================================================================
// 🗣️ NPC 대화창 UI
//    · 반투명한 짙은 회색 창
//    · 왼쪽 위에서부터 매우 빠르게 타자치듯이 글자가 찍힌다
//    · 대사가 다 끝나야 [동의합니다] · [나가기] 버튼이 빛나며 눌린다
// ============================================================================
window._npcTypeTimer = null;
window._npcTypingDone = false;
window._npcRewardTimer = null;
window.npcDialogOpen = false;

/** 🗣️ 버튼 활성/비활성 표시 */
const _npcSetBtnReady = (btn, ready) => {
    if (!btn) return;
    if (ready) {
        btn.classList.add('npc-btn-ready');
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    } else {
        btn.classList.remove('npc-btn-ready');
        btn.style.opacity = '0.35';
        btn.style.pointerEvents = 'none';
    }
};

/** 🗣️ 한 줄을 타자치듯 출력한다 */
window.typeNpcLine = (text, canExit) => {
    const el = document.getElementById('npcDialogText');
    const btnA = document.getElementById('npcBtnAgree');
    const btnE = document.getElementById('npcBtnExit');
    if (!el) return;

    clearInterval(window._npcTypeTimer);
    window._npcTypingDone = false;
    el.innerText = '';

    _npcSetBtnReady(btnA, false);
    if (btnE) {
        btnE.style.display = canExit ? 'flex' : 'none';
        _npcSetBtnReady(btnE, false);
    }

    let full = String(text || '');
    let i = 0;
    // ⌨️ 매우 빠른 타자 속도 (한 글자 18ms)
    window._npcTypeTimer = setInterval(() => {
        i++;
        el.innerText = full.slice(0, i);
        if (i >= full.length) {
            clearInterval(window._npcTypeTimer);
            window._npcTypeTimer = null;
            window._npcTypingDone = true;
            _npcSetBtnReady(btnA, true);
            if (canExit && btnE) _npcSetBtnReady(btnE, true);
        }
    }, 18);
};

/** 🗣️ 대화창 열기 / 갱신 */
window.openNpcDialog = (data) => {
    const modal = document.getElementById('npcDialogModal');
    if (!modal || !data) return;
    modal.style.display = 'flex';
    window.npcDialogOpen = true;

    const nameEl = document.getElementById('npcDialogName');
    if (nameEl) nameEl.innerText = data.name || 'NPC';

    window.typeNpcLine(data.text, data.canExit !== false);
};

/** 🗣️ 대화창 닫기 */
window.closeNpcDialog = () => {
    const modal = document.getElementById('npcDialogModal');
    clearInterval(window._npcTypeTimer);
    window._npcTypeTimer = null;
    window._npcTypingDone = false;
    window.npcDialogOpen = false;
    if (modal) modal.style.display = 'none';
    const el = document.getElementById('npcDialogText');
    if (el) el.innerText = '';
    // 🚪 나가기 버튼 복구
    const btnE = document.getElementById('npcBtnExit');
    if (btnE) btnE.style.display = 'flex';
};

/** 🟢 [동의합니다] */
window.npcAgree = () => {
    if (!window._npcTypingDone) return;
    if (!window.socket) return;
    window._npcTypingDone = false;
    _npcSetBtnReady(document.getElementById('npcBtnAgree'), false);
    _npcSetBtnReady(document.getElementById('npcBtnExit'), false);
    window.socket.emit('npcAgree');
};

/** 🔴 [나가기] */
window.npcExit = () => {
    if (!window._npcTypingDone) return;
    if (!window.socket) return;
    window._npcTypingDone = false;
    _npcSetBtnReady(document.getElementById('npcBtnAgree'), false);
    _npcSetBtnReady(document.getElementById('npcBtnExit'), false);
    window.socket.emit('npcExit');
};

// ============================================================================
// 📜 퀘스트 배너 (전장 인원 바로 밑)
// ============================================================================
//   · 🗣️ 티치 · 🗡️ 마허라 퀘스트를 동시에 표시할 수 있다.
//     key 별로 문구를 보관하고, 살아 있는 항목을 모두 줄바꿈으로 이어 붙인다.
window._questMap = {};
// 📜 표시 순서 (등록되지 않은 key 는 뒤에 붙는다)
window._questOrder = ['tich', 'mahera'];

/**
 * 퀘스트 배너를 갱신한다.
 * @param text 표시할 문구 (null 이면 해당 퀘스트를 지운다)
 * @param key  퀘스트 구분자 ('tich' | 'mahera'). 생략하면 'tich' 로 본다.
 */
window.setQuestText = (text, key) => {
    const el = document.getElementById('questBanner');
    if (!el) return;

    let k = key || 'tich';
    if (!text) delete window._questMap[k];
    else window._questMap[k] = text;

    // 정해진 순서대로 먼저 담고, 나머지는 뒤에 붙인다
    let keys = window._questOrder.filter(q => window._questMap[q]);
    for (let q in window._questMap) if (keys.indexOf(q) === -1) keys.push(q);

    if (keys.length === 0) {
        el.style.display = 'none';
        el.innerHTML = '';
        window.currentQuestText = null;
        return;
    }

    // 🛟 문구는 서버 상수에서 오지만, 혹시 모를 태그 주입을 막기 위해 이스케이프한다
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    el.innerHTML = keys.map(q => '📜 ' + esc(window._questMap[q])).join('<br>');
    el.style.display = 'block';
    window.currentQuestText = keys.map(q => window._questMap[q]).join(' / ');
};

/** 📜 모든 퀘스트 배너를 지운다 (재접속 · 게임 재시작 시) */
window.clearAllQuests = () => {
    window._questMap = {};
    const el = document.getElementById('questBanner');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
    window.currentQuestText = null;
};

// ============================================================================
// 🎁 보상 획득 표시 (오른쪽 위)
// ============================================================================
window.showNpcReward = (ids) => {
    const box = document.getElementById('npcRewardBox');
    if (!box || !ids || ids.length === 0) return;

    let html = `<div style="font-size:15px; color:#f1c40f; font-weight:bold; margin-bottom:8px; text-align:center;">🎁 보상 획득!</div>`;
    ids.forEach(id => {
        let d = window.getItemDef(id);
        let bc = window.getBorderColor(d.rarity, d.color);
        html += `<div style="border:3px solid ${bc}; background:rgba(20,22,30,0.9); border-radius:8px; padding:6px 10px; margin-bottom:6px;">`
             +  `<div style="color:${bc}; font-weight:bold; font-size:14px;">${d.name}</div>`
             +  `<div style="color:#bdc3c7; font-size:11px;">${d.rarity}</div></div>`;
    });
    box.innerHTML = html;
    box.style.display = 'block';

    clearTimeout(window._npcRewardTimer);
    window._npcRewardTimer = setTimeout(() => { box.style.display = 'none'; }, 7000);
};