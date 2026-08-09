// 파일명: core/netLobby.js
// ============================================================================
// 🏠 로비 · 게임 시작 · 재접속 · 게임 종료
//
//   · lobbyUpdated       : 대기실 카드 갱신
//   · gameStartSign      : 전투 시작 신호
//   · reconnectSuccess   : 재접속 성공 시 전체 상태 복원
//   · joinFail           : 입장 실패
//   · gameOver           : 승패 오버레이
// ============================================================================

window.registerNetModule('lobby', function (socket, U) {

    /** 캐릭터 타입 → 한글 이름 */
    const charName = (type) => {
        if (type === 'BORSALINO') return '볼사리노';
        if (type === 'KUZAN') return '쿠잔';
        if (type === 'SAKAZUKI') return '사카즈키';
        if (type === 'ENEL') return '에넬';
        if (type === 'KASHIMO') return '카시모 하지메';
        if (type === 'DABURA') return '다부라 카라바';
        return '박인범';
    };

    // ── 🏠 대기실 갱신 ───────────────────────────────────────────────
    socket.on('lobbyUpdated', (data) => {
        const grid = document.getElementById('playerGrid');
        if (!grid) return;
        grid.innerHTML = "";

        let arr = Object.values(data.players).filter(p => !p.disconnected);
        document.getElementById('pCountText').innerText = arr.length;

        let isMaster = (socket.id === data.masterId);
        document.getElementById('btn-start-battle').style.display = isMaster ? 'block' : 'none';
        const waitMsg = document.getElementById('waitMessage');
        if (waitMsg) waitMsg.style.display = isMaster ? 'none' : 'block';

        for (let i = 0; i < 6; i++) {
            let card = document.createElement('div');
            if (i < arr.length) {
                let p = arr[i];
                card.className = `player-card ${p.team === 1 ? 'team-blue' : 'team-red'}`;
                card.innerHTML =
                    `${p.id === data.masterId ? '👑' : ''}` +
                    `<div class="avatar">${p.team === 1 ? '🔵' : '🔴'}</div>` +
                    `<p class="card-name">${p.nickname}<br>` +
                    `<span style="font-size:10px;color:#f1c40f;">${charName(p.characterType)}</span></p>` +
                    (isMaster
                        ? `<button class="btn-switch" onclick="window.socket.emit('toggleTeam', '${p.id}')">🔄 변경</button>`
                        : '');
            } else {
                card.className = 'player-card empty';
                card.innerText = '대기 중...';
            }
            grid.appendChild(card);
        }
    });

    // ── ⚔️ 전투 시작 신호 ───────────────────────────────────────────
    socket.on('gameStartSign', (svPlayers) => {
        document.getElementById('lobbyScreen').style.display = 'none';
        document.getElementById('forceStartOverlay').style.display = 'flex';
        window.pendingServerPlayers = svPlayers;
    });

    // ── 🔌 재접속 성공 — 전체 상태 복원 ─────────────────────────────
    socket.on('reconnectSuccess', (data) => {
        window.reconnectResolved = true;

        let rc = document.getElementById('reconnectCheckScreen');
        if (rc) rc.style.display = 'none';
        document.getElementById('nicknameScreen').style.display = 'none';
        document.getElementById('lobbyScreen').style.display = 'none';
        document.getElementById('forceStartOverlay').style.display = 'flex';

        window.pendingServerPlayers = data.players;
        window.serverBases = data.bases;
        window.serverDetectors = data.detectors;
        window.currentTeamStorage = data.teamStorages[data.myPlayer.team] || [];

        window.serverMonster = data.monster || null;
        window.serverHinbeom = data.hinbeom || null;
        window.serverMinions = (data.minions || []).map(m => ({ ...m }));
        window.serverHinbeomPortal = data.hinbeomPortal || null;
        window.serverDarkPortal = data.darkPortal || null;
        window.serverBlackbeard = data.blackbeard || null;
        window.serverBurgess = data.burgess || null;
        window.serverBlackbeardPortal = data.blackbeardPortal || null;
        window.serverOkras = (data.okras || []).map(o => ({ ...o }));
        // 🗣️ NPC 목록 복원
        window.serverNpcs = (data.npcs || []).map(n => ({ ...n }));

        window.myNickname = data.myPlayer.nickname || window.myNickname;
        if (data.myPlayer.characterType) window.myPlayer.characterType = data.myPlayer.characterType;
        if (data.myPlayer.darkBanned !== undefined) window.myPlayer.darkBanned = data.myPlayer.darkBanned;

        // 🍈 열매 보유 상태 복원
        if (data.myPlayer.hasGura !== undefined) window.myPlayer.hasGura = data.myPlayer.hasGura;
        if (data.myPlayer.hasYami !== undefined) window.myPlayer.hasYami = data.myPlayer.hasYami;
        // ⬛ ■ 보유 상태 복원
        if (data.myPlayer.hasSquare !== undefined) window.myPlayer.hasSquare = data.myPlayer.hasSquare;

        // 🗣️ 퀘스트 진행도 복원 (대화 중이었다면 강제 종료)
        window.myPlayer.tichStage = data.myPlayer.tichStage || 0;
        window.myPlayer.npcTalking = null;
        if (typeof window.closeNpcDialog === 'function') window.closeNpcDialog();
        if (typeof window.setQuestText === 'function') {
            window.setQuestText(window.myPlayer.tichStage === 1 ? "['티치'에게 체리파이 한 개 주기]" : null);
        }

        // ⚡ 카시모 전하 상태 복원
        if (data.myPlayer.kashimoCharge !== undefined) window.myPlayer.kashimoCharge = data.myPlayer.kashimoCharge;
        if (data.myPlayer.kashimoChargeUntil !== undefined) window.myPlayer.kashimoChargeUntil = data.myPlayer.kashimoChargeUntil;

        // ⚡🌋 주력 방출은 재접속 시 초기화 (고정도 함께 푼다)
        window.myPlayer.surgeActive = false;
        window.myPlayer.surgeEnd = 0;
        window.myPlayer.surgeLockUntil = 0;
        U.clearSurgeFX(window.myId);

        // ⬛ 다부라 : 재접속 시 스킬 상태를 모두 초기화한다
        window.myPlayer.dLightActive = false;
        window.myPlayer.dLightEnd = 0;
        window.myPlayer.dLightRiseUntil = 0;
        window.myPlayer.dDarkActive = false;
        window.myPlayer.dDarkEnd = 0;
        window.myPlayer.dKickCharging = false;
        window.myPlayer.dKickChargeEnd = 0;
        window.myPlayer.dKickFlying = false;
        window.myPlayer.dKickFlyEnd = 0;
        window.myPlayer.darkPullUntil = 0;
        U.clearDaburaFX(window.myId);

        // ⚡🔮 환수호박은 죽기 전까지 유지되므로 서버 값을 그대로 복원한다
        window.myPlayer.amberActive = !!data.myPlayer.amberActive;
        U.clearAmberFX(window.myId);
        if (window.myPlayer.amberActive) U.startAmberFX(window.myId);

        // ✅ 재접속 시 잠금 상태를 남김없이 초기화
        U.releaseAllLocks(null);
        if (typeof window.applySkillNames === 'function') window.applySkillNames();
    });

    // ── 🚫 입장 실패 ────────────────────────────────────────────────
    socket.on('joinFail', (msg) => { alert(msg); location.reload(); });

    // ── 🏁 게임 종료 ────────────────────────────────────────────────
    socket.on('gameOver', (winningTeam) => {
        window.gameLoopStarted = false;

        let overlay = document.getElementById('gameOverOverlay');
        let textEl = document.getElementById('gameOverText');
        if (overlay && textEl) {
            overlay.style.display = 'flex';
            let teamName = winningTeam === 1 ? "블루팀" : "레드팀";
            let color = winningTeam === 1 ? "#3498db" : "#e74c3c";
            textEl.innerHTML = `<span style="color:${color}">${teamName}</span> 승리!`;
        }

        const uiElements = ['mobileControls', 'topUI', 'goldUI', 'unifiedActionBtn',
                            'shopModal', 'smithModal', 'storageModal', 'chestModal', 'goldenToast',
                            'npcDialogModal', 'questBanner', 'npcRewardBox'];
        uiElements.forEach(id => { let el = document.getElementById(id); if (el) el.style.display = 'none'; });
    });
});