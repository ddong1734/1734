// 파일명: core/network.js

window.initNetwork = (socket) => {
    // 🎞️ [보간] 원격 플레이어의 '목표 좌표'를 세팅하는 헬퍼.
    //    30Hz 로 띄엄띄엄 도착하는 서버 좌표를 netX/netY 에 넣어두면,
    //    main.js 의 interpolateRemotePlayers() 가 매 렌더 프레임 p.x/p.y 를 그쪽으로 부드럽게 당겨준다.
    const setNetTarget = (p, x, y) => {
        if (!p) return;
        if (x !== undefined) p.netX = x;
        if (y !== undefined) p.netY = y;
    };
    // 🎞️ [보간] 리스폰/순간이동/야타 종료처럼 '즉시 반영'이 필요한 경우엔 보간 없이 스냅시킨다.
    const snapTo = (p, x, y) => {
        if (!p) return;
        if (x !== undefined) { p.x = x; p.netX = x; }
        if (y !== undefined) { p.y = y; p.netY = y; }
    };
    // 🎞️ [보간] 서버가 통째로 내려준 플레이어 객체를 처음 등록할 때 목표 좌표를 초기화한다.
    const initNet = (p) => { if (p) { p.netX = p.x; p.netY = p.y; } return p; };

    socket.on('lobbyUpdated', (data) => {
        const grid = document.getElementById('playerGrid'); if(!grid) return; grid.innerHTML = "";
        let arr = Object.values(data.players).filter(p => !p.disconnected); 
        document.getElementById('pCountText').innerText = arr.length;
        let isMaster = (socket.id === data.masterId); document.getElementById('btn-start-battle').style.display = isMaster ? 'block' : 'none';
        const waitMsg = document.getElementById('waitMessage'); if (waitMsg) waitMsg.style.display = isMaster ? 'none' : 'block';
        
        for (let i=0; i<6; i++) {
            let card = document.createElement('div');
            if (i < arr.length) {
                let p = arr[i]; card.className = `player-card ${p.team === 1 ? 'team-blue' : 'team-red'}`;
                let charName = p.characterType === 'BORSALINO' ? '볼사리노' : (p.characterType === 'KUZAN' ? '쿠잔' : (p.characterType === 'SAKAZUKI' ? '사카즈키' : (p.characterType === 'ENEL' ? '에넬' : '박인범')));
                card.innerHTML = `${p.id === data.masterId ? '👑':''}<div class="avatar">${p.team===1?'🔵':'🔴'}</div><p class="card-name">${p.nickname}<br><span style="font-size:10px;color:#f1c40f;">${charName}</span></p>` + (isMaster ? `<button class="btn-switch" onclick="window.socket.emit('toggleTeam', '${p.id}')">🔄 변경</button>` : '');
            } else { 
                card.className = 'player-card empty'; card.innerText = '대기 중...'; 
            }
            grid.appendChild(card);
        }
    });

    socket.on('gameStartSign', (svPlayers) => { 
        document.getElementById('lobbyScreen').style.display = 'none'; 
        document.getElementById('forceStartOverlay').style.display = 'flex'; 
        window.pendingServerPlayers = svPlayers; 
    });

    socket.on('reconnectSuccess', (data) => {
        window.reconnectResolved = true; 
        let rc = document.getElementById('reconnectCheckScreen'); if (rc) rc.style.display = 'none';
        document.getElementById('nicknameScreen').style.display = 'none';
        document.getElementById('lobbyScreen').style.display = 'none';
        document.getElementById('forceStartOverlay').style.display = 'flex'; 
        
        window.pendingServerPlayers = data.players; 
        window.serverBases = data.bases;
        window.serverDetectors = data.detectors;
        window.currentTeamStorage = data.teamStorages[data.myPlayer.team] || [];

        window.serverMonster = data.monster || null;
        window.serverHinbeom = data.hinbeom || null;          // 🥊 박힌범
        window.serverMinions = (data.minions || []).map(m => ({ ...m }));   // 🐗 소환체
        window.serverHinbeomPortal = data.hinbeomPortal || null;            // 🌀 귀환 포탈
        window.serverOkras = (data.okras || []).map(o => ({ ...o }));

        window.myNickname = data.myPlayer.nickname || window.myNickname;
        if (data.myPlayer.characterType) window.myPlayer.characterType = data.myPlayer.characterType;
    });

    socket.on('syncBases', (b) => window.serverBases = b);
    
    socket.on('syncDetectors', (ds) => { 
        window.serverDetectors = ds; 
        if (document.getElementById('chestModal').style.display === 'flex' && typeof window.renderChestUI === 'function') window.renderChestUI(); 
        if (document.getElementById('smithModal').style.display === 'flex' && typeof window.renderSmithUI === 'function') window.renderSmithUI(); 
    });

    socket.on('syncTeamStorage', (storages) => { 
        window.currentTeamStorage = storages[window.myPlayer.team] || []; 
        if (document.getElementById('storageModal').style.display === 'flex' && typeof window.renderStorageUI === 'function') window.renderStorageUI(); 
    });

    // ✨ 황금 획득 알림 수신
    socket.on('goldenDrop', (data) => {
        if (!data) return;
        if (data.inventory) {
            window.myPlayer.inventory = data.inventory;
            if (window.myId && window.players[window.myId]) window.players[window.myId].inventory = data.inventory;
            if (document.getElementById('storageModal').style.display === 'flex' && typeof window.renderStorageUI === 'function') window.renderStorageUI();
            if (document.getElementById('smithModal').style.display === 'flex' && typeof window.renderSmithUI === 'function') window.renderSmithUI();
        }
        if (typeof window.showGoldenMsg === 'function') window.showGoldenMsg(data.msg, !!data.fail);
    });

    // 🚀 [최적화⑧] 상태이상 전용 경량 이벤트 수신
    socket.on('statusUpdate', (d) => {
        if (!d) return;
        let t = (d.id === window.myId) ? window.myPlayer : window.players[d.id];
        if (!t) return;
        if (d.frozenUntil !== undefined) t.frozenUntil = d.frozenUntil;
        if (d.electrocutedUntil !== undefined) t.electrocutedUntil = d.electrocutedUntil;
        if (d.airFreezeUntil !== undefined) t.airFreezeUntil = d.airFreezeUntil;
        if (d.burningUntil !== undefined) t.burningUntil = d.burningUntil;
        if (d.maguBombUntil !== undefined) t.maguBombUntil = d.maguBombUntil;
        if (d.justiceBombUntil !== undefined) t.justiceBombUntil = d.justiceBombUntil;
    });

    socket.on('syncProjectiles', (projs) => { window.serverProjectiles = projs; });
    socket.on('syncMagmas', (ms2) => { window.serverMagmas = ms2; }); 
    socket.on('magmaImpact', (data) => { window.visualFX.push({ type: 'magma_impact', x: data.x, y: data.y, life: 22, maxLife: 22 }); });

    // ⚡ 만뢰 낙뢰 동기화 및 착탄 이펙트
    socket.on('syncMantleBolts', (mbs) => { window.serverMantleBolts = mbs; });
    socket.on('mantraImpact', (data) => { window.visualFX.push({ type: 'mantra_impact', x: data.x, y: data.y, life: 18, maxLife: 18 }); });
    socket.on('mantleExplosion', (data) => { window.visualFX.push({ type: 'mantle_explosion', x: data.x, y: data.y, life: 18, maxLife: 18, hasArkMaxim: data.hasArkMaxim }); });

    // ====================================================================
    // 🥊 박힌범 (중앙 정글 최상단 바구니 보스)
    // ====================================================================
    socket.on('hinbeomUpdate', (delta) => {
        if (!delta) return;
        if (!window.serverHinbeom) { window.serverHinbeom = delta; return; }
        const h = window.serverHinbeom;
        if (delta.hp !== undefined) h.hp = delta.hp;
        if (delta.maxHp !== undefined) h.maxHp = delta.maxHp;
        if (delta.radius !== undefined) h.radius = delta.radius;
        if (delta.state !== undefined) h.state = delta.state;
        if (delta.hakiActiveUntil !== undefined) h.hakiActiveUntil = delta.hakiActiveUntil;
        if (delta.frozenUntil !== undefined) h.frozenUntil = delta.frozenUntil;
        if (delta.electrocutedUntil !== undefined) h.electrocutedUntil = delta.electrocutedUntil;
        if (delta.airFreezeUntil !== undefined) h.airFreezeUntil = delta.airFreezeUntil;
        if (delta.raigoPullUntil !== undefined) h.raigoPullUntil = delta.raigoPullUntil;
        if (delta.burningUntil !== undefined) h.burningUntil = delta.burningUntil;
        if (delta.maguBombUntil !== undefined) h.maguBombUntil = delta.maguBombUntil;
        if (delta.justiceBombUntil !== undefined) h.justiceBombUntil = delta.justiceBombUntil;
        if (delta.knockbackForce !== undefined) h.knockbackForce = delta.knockbackForce;
        if (delta.x !== undefined) h.x = delta.x;
        if (delta.y !== undefined) h.y = delta.y;
    });

    // 🌀 박힌범 처치 포탈 동기화 (생성 시 객체, 소멸 시 null)
    socket.on('syncHinbeomPortal', (pt) => { window.serverHinbeomPortal = pt || null; });

    // 🐗 소환된 할배새끼 동기화 (수가 적어 전체 전송)
    socket.on('syncMinions', (list) => { window.serverMinions = list || []; });

    // 🐗 소환 순간 바닥에서 솟구치는 붉은 기운
    socket.on('minionSpawn', (data) => {
        if (!data || !data.xs) return;
        for (let i = 0; i < data.xs.length; i++) {
            window.visualFX.push({ type: 'minion_spawn', x: data.xs[i], y: data.y, life: 26, maxLife: 26 });
        }
    });

    // 패왕색 패기 방출 — 이미 표시 중인 이펙트는 새 것으로 교체한다.
    // (서버에서는 중복 방출이 그대로 누적되지만, 화면상 겹쳐 그리면 무거워지기만 하고
    //  결과가 똑같으므로 '가장 늦게 끝나는' 하나만 그린다)
    socket.on('hakiBurst', (data) => {
        if (!data) return;
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'haki_burst') window.visualFX[i].active = false;
        }
        window.visualFX.push({
            type: 'haki_burst',
            x: data.x, y: data.y,
            area: data.area || window.HINBEOM_AREA,
            durationMs: data.duration || 4000,
            life: Math.round((data.duration || 4000) / (1000 / 60)),
            maxLife: Math.round((data.duration || 4000) / (1000 / 60))
        });
    });

    // 박힌범 사망 시 남아있는 패기 이펙트 즉시 정리
    socket.on('hakiEnd', () => {
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'haki_burst') window.visualFX[i].active = false;
        }
    });

    socket.on('raigoPull', (data) => {
        if (!data) return;
        if (data.id === window.myId) {
            window.myPlayer.raigoPullUntil = data.until;
            window.myPlayer.isCasting = false;
            window.myPlayer.skill1Dashing = false;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
        } else if (window.players[data.id]) {
            window.players[data.id].raigoPullUntil = data.until;
        }
    });

    socket.on('setBurn', (d) => {
        if (d.id === window.myId) { window.myPlayer.burningUntil = Math.max(window.myPlayer.burningUntil || 0, d.until); }
        else if (window.players[d.id]) { window.players[d.id].burningUntil = Math.max(window.players[d.id].burningUntil || 0, d.until); }
        else if (d.id === 'monster') { if (window.serverMonster) window.serverMonster.burningUntil = Math.max(window.serverMonster.burningUntil || 0, d.until); }
        else if (d.id === 'hinbeom') { if (window.serverHinbeom) window.serverHinbeom.burningUntil = Math.max(window.serverHinbeom.burningUntil || 0, d.until); }
        else if (typeof d.id === 'string' && d.id.indexOf('minion_') === 0) {
            let mid = parseInt(d.id.slice(7));
            let mn = window.serverMinions.find(m => m.id === mid);
            if (mn) mn.burningUntil = Math.max(mn.burningUntil || 0, d.until);
        }
        else if (typeof d.id === 'string' && d.id.indexOf('okra_') === 0) {
            let oid = parseInt(d.id.slice(5));
            let ok = window.serverOkras.find(o => o.id === oid);
            if (ok) ok.burningUntil = Math.max(ok.burningUntil || 0, d.until);
        }
    });

    socket.on('borsLightDash', (data) => {
        if (!data || data.id === window.myId) return; 
        let dur = data.duration || 220;
        if (window.players[data.id]) {
            window.players[data.id].lightDashUntil = Date.now() + dur;
            window.players[data.id].lightDashDir = data.dir || 1;
        }
    });

    socket.on('player_died', (deadId) => {
        if (deadId === window.myId) {
            window.myPlayer.isDead = true; 
            window.myPlayer.isCasting = false; window.myPlayer.skill3Active = false; window.myPlayer.iceAgeActive = false; window.myPlayer.yataCanceling = false; 
            window.myPlayer.burningUntil = 0; window.myPlayer.maguBombUntil = 0; window.myPlayer.justiceBombUntil = 0;
            window.myPlayer.electrocutedUntil = 0; 
            window.myPlayer.lightDashUntil = 0; 
            window.myPlayer.skill1Dashing = false; 
            window.myPlayer.yataActive = false; 
            window.myPlayer.yataPath = null;
            window.myPlayer.elThorLockUntil = 0; window.myPlayer.raigoPullUntil = 0; 
            document.getElementById('death-screen').style.display = 'flex';
            let timeLeft = 15; document.getElementById('respawn-timer').innerText = timeLeft; clearInterval(window.respawnInterval);
            window.respawnInterval = setInterval(() => { 
                timeLeft--; document.getElementById('respawn-timer').innerText = timeLeft; 
                if (timeLeft <= 0) clearInterval(window.respawnInterval); 
            }, 1000);
        } else if (window.players[deadId]) { 
            window.players[deadId].isDead = true; 
            window.players[deadId].burningUntil = 0; window.players[deadId].maguBombUntil = 0; window.players[deadId].justiceBombUntil = 0;
            window.players[deadId].electrocutedUntil = 0; 
            window.players[deadId].lightDashUntil = 0; 
            window.players[deadId].isCasting = false;
            window.players[deadId].skill3Active = false; 
            window.players[deadId].skill1Dashing = false; 
            window.players[deadId].yataActive = false; 
            window.players[deadId].yataPath = null;
            window.players[deadId].elThorLockUntil = 0; window.players[deadId].raigoPullUntil = 0; 
        }
    });

    socket.on('player_respawned', (pData) => {
        if (pData.id === window.myId) { 
            window.myPlayer.isDead = false; window.myPlayer.hp = pData.hp; 
            window.myPlayer.maxHp = pData.maxHp;
            window.myPlayer.x = pData.x; window.myPlayer.y = pData.y; 
            window.myPlayer.burningUntil = 0; window.myPlayer.maguBombUntil = 0; window.myPlayer.justiceBombUntil = 0;
            window.myPlayer.electrocutedUntil = 0; 
            window.myPlayer.lightDashUntil = 0; 
            window.myPlayer.skill1Dashing = false; window.myPlayer.yataActive = false; window.myPlayer.skill3Active = false; window.myPlayer.isCasting = false; 
            window.myPlayer.elThorLockUntil = 0; window.myPlayer.raigoPullUntil = 0; 
            document.getElementById('death-screen').style.display = 'none'; clearInterval(window.respawnInterval); 
        }
        if (window.players[pData.id]) { 
            window.players[pData.id].isDead = false; window.players[pData.id].hp = pData.hp; 
            window.players[pData.id].maxHp = pData.maxHp;
            // 🎞️ [보간] 부활은 기지로 순간이동하므로 보간 없이 즉시 반영
            snapTo(window.players[pData.id], pData.x, pData.y);
            window.players[pData.id].burningUntil = 0; window.players[pData.id].maguBombUntil = 0; window.players[pData.id].justiceBombUntil = 0;
            window.players[pData.id].electrocutedUntil = 0; 
            window.players[pData.id].lightDashUntil = 0; 
            window.players[pData.id].skill1Dashing = false; window.players[pData.id].yataActive = false; window.players[pData.id].skill3Active = false; window.players[pData.id].isCasting = false;
            window.players[pData.id].elThorLockUntil = 0; window.players[pData.id].raigoPullUntil = 0; 
        }
    });

    // 🌀 포탈 순간이동 포함 — 서버가 지정한 좌표로 즉시 이동 (보간 목표값도 함께 갱신)
    socket.on('teleport', (pos) => {
        if (!pos) return;
        window.myPlayer.x = pos.x; window.myPlayer.y = pos.y;
        window.myPlayer.vy = 0; window.myPlayer.knockbackForce = 0;
        if (window.myId && window.players[window.myId]) snapTo(window.players[window.myId], pos.x, pos.y);
        window._lastSentPos = { x: pos.x, y: pos.y };
    });

    socket.on('yataStart', (data) => {
        let path = data.path;
        if (data.id === window.myId) {
            window.myPlayer.yataActive = true;
            window.myPlayer.yataCanceling = false; 
            window.myPlayer.yataPath = path;
            window.myPlayer.yataStartTime = data.startTime;
            window.myPlayer.yataProgress = 0;
            window.myPlayer.isCasting = true;
        } else if (window.players[data.id]) {
            window.players[data.id].yataActive = true;
            window.players[data.id].yataPath = path;
            window.players[data.id].yataStartTime = data.startTime;
        }
        window.visualFX.push({ type: 'yata_mirror_path', path: path, ownerId: data.id, life: Math.round(data.duration / (1000/60)), maxLife: Math.round(data.duration / (1000/60)) });
    });

    socket.on('yataEnd', (data) => {
        if (data.id === window.myId) {
            window.myPlayer.yataActive = false;
            window.myPlayer.yataCanceling = false; 
            window.myPlayer.yataPath = null;
            window.myPlayer.isCasting = false;
            window.myPlayer.x = data.x; window.myPlayer.y = data.y;
            window.myPlayer.vy = 0; window.myPlayer.knockbackForce = 0;
        } else if (window.players[data.id]) {
            window.players[data.id].yataActive = false;
            window.players[data.id].yataPath = null;
            // 🎞️ [보간] 야타 종료 위치는 폭발 지점과 일치해야 하므로 즉시 반영
            snapTo(window.players[data.id], data.x, data.y);
        }
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'yata_mirror_path' && window.visualFX[i].ownerId === data.id) window.visualFX[i].active = false;
        }
    });

    socket.on('syncPlayerFull', (data) => {
        if (data.id === window.myId) {
            let localState = {
                x: window.myPlayer.x, y: window.myPlayer.y, vy: window.myPlayer.vy,
                moveX: window.myPlayer.moveX, moveY: window.myPlayer.moveY,
                jumpCount: window.myPlayer.jumpCount, lastFacing: window.myPlayer.lastFacing,
                skill1Dashing: window.myPlayer.skill1Dashing, dashDir: window.myPlayer.dashDir,
                knockbackForce: window.myPlayer.knockbackForce,
                lightDashUntil: window.myPlayer.lightDashUntil, lightDashDir: window.myPlayer.lightDashDir, 
                yataCanceling: window.myPlayer.yataCanceling,
                elThorLockUntil: window.myPlayer.elThorLockUntil, raigoPullUntil: window.myPlayer.raigoPullUntil 
            };
            Object.assign(window.myPlayer, data);
            Object.assign(window.myPlayer, localState);
            
            if (window.players[window.myId]) Object.assign(window.players[window.myId], window.myPlayer);
            let gEl = document.getElementById('myGold'); if(gEl && gEl.innerText != data.gold) gEl.innerText = data.gold;
            let sgEl = document.getElementById('shopGoldDisplay'); if(sgEl && sgEl.innerText != data.gold) sgEl.innerText = data.gold;
        } else {
            if (window.players[data.id]) {
                window.players[data.id].hp = data.hp;
                window.players[data.id].maxHp = data.maxHp;
                window.players[data.id].skill2EndTime = data.skill2EndTime;
                window.players[data.id].isDead = data.isDead;
                window.players[data.id].isCasting = data.isCasting;
                window.players[data.id].yataActive = data.yataActive;
                window.players[data.id].frozenUntil = data.frozenUntil;
                window.players[data.id].electrocutedUntil = data.electrocutedUntil; 
                window.players[data.id].burningUntil = data.burningUntil;  
                window.players[data.id].maguBombUntil = data.maguBombUntil; 
                window.players[data.id].justiceBombUntil = data.justiceBombUntil; 
                window.players[data.id].characterType = data.characterType || window.players[data.id].characterType;
                
                window.players[data.id].hasJusticeCoat = data.hasJusticeCoat;
                window.players[data.id].hasPika = data.hasPika;
                window.players[data.id].hasHie = data.hasHie;
                window.players[data.id].hasMagu = data.hasMagu;
                window.players[data.id].hasKizaru = data.hasKizaru;
                window.players[data.id].hasAokiji = data.hasAokiji;
                window.players[data.id].hasAkainu = data.hasAkainu;
                window.players[data.id].hasGoro = data.hasGoro;
                window.players[data.id].hasArkMaxim = data.hasArkMaxim;
                window.players[data.id].hasGodEnel = data.hasGodEnel; // ✨ 갓 에넬 상태 동기화

                if (data.elThorActive !== undefined) window.players[data.id].elThorActive = data.elThorActive;

                window.players[data.id].lastFacing = data.lastFacing;
                let lastHit = window.players[data.id].lastLocalHit || 0;
                if (Date.now() - lastHit > 800) {
                    window.players[data.id].knockbackForce = data.knockbackForce || 0;
                    // 🎞️ [보간] 좌표를 직접 덮어쓰지 않고 목표값만 갱신한다.
                    setNetTarget(window.players[data.id], data.x, data.y);
                }
            } else {
                window.players[data.id] = initNet(data);
            }
        }
    });

    socket.on('levelUp', (targetId) => { window.visualFX.push({ type: 'levelup', targetId: targetId, life: 60, maxLife: 60, x: window.players[targetId]?.x, y: window.players[targetId]?.y }); });

    socket.on('enemyUpdate', (delta) => { 
        if (window.players[delta.id]) { 
            if (delta.hp !== undefined) window.players[delta.id].hp = delta.hp;
            if (delta.maxHp !== undefined) window.players[delta.id].maxHp = delta.maxHp;
            if (delta.skill2EndTime !== undefined) window.players[delta.id].skill2EndTime = delta.skill2EndTime;
            if (delta.isCasting !== undefined) window.players[delta.id].isCasting = delta.isCasting;
            if (delta.isDead !== undefined) window.players[delta.id].isDead = delta.isDead;
            if (delta.level !== undefined) window.players[delta.id].level = delta.level;
            if (delta.xp !== undefined) window.players[delta.id].xp = delta.xp;
            if (delta.maxXp !== undefined) window.players[delta.id].maxXp = delta.maxXp;
            if (delta.frozenUntil !== undefined) window.players[delta.id].frozenUntil = delta.frozenUntil;
            if (delta.electrocutedUntil !== undefined) window.players[delta.id].electrocutedUntil = delta.electrocutedUntil; 
            if (delta.airFreezeUntil !== undefined) window.players[delta.id].airFreezeUntil = delta.airFreezeUntil; 
            if (delta.raigoPullUntil !== undefined) window.players[delta.id].raigoPullUntil = delta.raigoPullUntil; 
            if (delta.burningUntil !== undefined) window.players[delta.id].burningUntil = delta.burningUntil; 
            if (delta.maguBombUntil !== undefined) window.players[delta.id].maguBombUntil = delta.maguBombUntil; 
            if (delta.justiceBombUntil !== undefined) window.players[delta.id].justiceBombUntil = delta.justiceBombUntil; 
            if (delta.characterType !== undefined) window.players[delta.id].characterType = delta.characterType;
            
            if (delta.hasJusticeCoat !== undefined) window.players[delta.id].hasJusticeCoat = delta.hasJusticeCoat;
            if (delta.hasPika !== undefined) window.players[delta.id].hasPika = delta.hasPika;
            if (delta.hasHie !== undefined) window.players[delta.id].hasHie = delta.hasHie;
            if (delta.hasMagu !== undefined) window.players[delta.id].hasMagu = delta.hasMagu;
            if (delta.hasKizaru !== undefined) window.players[delta.id].hasKizaru = delta.hasKizaru;
            if (delta.hasAokiji !== undefined) window.players[delta.id].hasAokiji = delta.hasAokiji;
            if (delta.hasAkainu !== undefined) window.players[delta.id].hasAkainu = delta.hasAkainu;
            if (delta.hasGoro !== undefined) window.players[delta.id].hasGoro = delta.hasGoro;
            if (delta.hasArkMaxim !== undefined) window.players[delta.id].hasArkMaxim = delta.hasArkMaxim;
            if (delta.hasGodEnel !== undefined) window.players[delta.id].hasGodEnel = delta.hasGodEnel; // ✨ 갓 에넬 상태 델타 반영

            if (delta.elThorActive !== undefined) window.players[delta.id].elThorActive = delta.elThorActive;
            if (delta.yataActive !== undefined) window.players[delta.id].yataActive = delta.yataActive;
            
            let lastHit = window.players[delta.id].lastLocalHit || 0;
            if (Date.now() - lastHit > 800) {
                if (delta.knockbackForce !== undefined) window.players[delta.id].knockbackForce = delta.knockbackForce;
                // 🎞️ [보간] 30Hz 로 도착하는 좌표를 목표값으로만 저장 → 렌더 프레임마다 부드럽게 수렴시킨다.
                setNetTarget(window.players[delta.id], delta.x, delta.y);
                if (delta.lastFacing !== undefined) window.players[delta.id].lastFacing = delta.lastFacing;
            }
        } else { 
            window.players[delta.id] = initNet(delta); 
        } 
    });

    socket.on('playerLeft', (id) => delete window.players[id]);

    socket.on('gameOver', (winningTeam) => {
        window.gameLoopStarted = false;
        let overlay = document.getElementById('gameOverOverlay');
        let textEl = document.getElementById('gameOverText');
        if(overlay && textEl) {
            overlay.style.display = 'flex';
            let teamName = winningTeam === 1 ? "블루팀" : "레드팀";
            let color = winningTeam === 1 ? "#3498db" : "#e74c3c";
            textEl.innerHTML = `<span style="color:${color}">${teamName}</span> 승리!`;
        }
        let uiElements = ['mobileControls', 'topUI', 'goldUI', 'unifiedActionBtn', 'shopModal', 'smithModal', 'storageModal', 'chestModal', 'goldenToast'];
        uiElements.forEach(id => { let el = document.getElementById(id); if(el) el.style.display = 'none'; });
    });

    socket.on('syncShockwaves', (waves) => {
        let locals = window.serverShockwaves.filter(w => w.id === 'local_detroit');
        waves.forEach(w => {
            let prev = window.serverShockwaves.find(p => p.id === w.id);
            if (prev) {
                if ((w.dir === 1 && prev.x > w.x) || (w.dir === -1 && prev.x < w.x)) w.x = prev.x;
            }
            if (w.type === 'detroit') locals = locals.filter(l => !(l.dir === w.dir && Math.abs(l.y - w.y) < 50));
        });
        window.serverShockwaves = waves.concat(locals);
    });

    socket.on('monsterUpdate', (delta) => {
        if (window.serverMonster) {
            if (delta.hp !== undefined) window.serverMonster.hp = delta.hp;
            if (delta.state !== undefined) window.serverMonster.state = delta.state;
            if (delta.frozenUntil !== undefined) window.serverMonster.frozenUntil = delta.frozenUntil;
            if (delta.electrocutedUntil !== undefined) window.serverMonster.electrocutedUntil = delta.electrocutedUntil; 
            if (delta.airFreezeUntil !== undefined) window.serverMonster.airFreezeUntil = delta.airFreezeUntil; 
            if (delta.raigoPullUntil !== undefined) window.serverMonster.raigoPullUntil = delta.raigoPullUntil; 
            if (delta.burningUntil !== undefined) window.serverMonster.burningUntil = delta.burningUntil; 
            if (delta.maguBombUntil !== undefined) window.serverMonster.maguBombUntil = delta.maguBombUntil; 
            if (delta.justiceBombUntil !== undefined) window.serverMonster.justiceBombUntil = delta.justiceBombUntil; 
            let lastHit = window.serverMonster.lastLocalHit || 0;
            if (Date.now() - lastHit > 800) {
                if (delta.knockbackForce !== undefined) window.serverMonster.knockbackForce = delta.knockbackForce;
                if (delta.x !== undefined) window.serverMonster.x = delta.x;
                if (delta.y !== undefined) window.serverMonster.y = delta.y;
            }
        } else {
            window.serverMonster = delta;
        }
    });

    socket.on('syncOkras', (deltaOkras) => {
        if (window.serverOkras.length === 0) { window.serverOkras = deltaOkras.map(o => ({...o})); return; }
        deltaOkras.forEach(delta => {
            let existing = window.serverOkras.find(o => o.id === delta.id);
            if (existing) {
                if (delta.hp !== undefined) existing.hp = delta.hp;
                if (delta.maxHp !== undefined) existing.maxHp = delta.maxHp;
                if (delta.isGolden !== undefined) existing.isGolden = delta.isGolden; 
                if (delta.state !== undefined) existing.state = delta.state;
                if (delta.frozenUntil !== undefined) existing.frozenUntil = delta.frozenUntil;
                if (delta.electrocutedUntil !== undefined) existing.electrocutedUntil = delta.electrocutedUntil; 
                if (delta.airFreezeUntil !== undefined) existing.airFreezeUntil = delta.airFreezeUntil; 
                if (delta.raigoPullUntil !== undefined) existing.raigoPullUntil = delta.raigoPullUntil; 
                if (delta.burningUntil !== undefined) existing.burningUntil = delta.burningUntil; 
                if (delta.maguBombUntil !== undefined) existing.maguBombUntil = delta.maguBombUntil; 
                if (delta.justiceBombUntil !== undefined) existing.justiceBombUntil = delta.justiceBombUntil; 
                let lastHit = existing.lastLocalHit || 0;
                if (Date.now() - lastHit > 800) {
                    if (delta.knockbackForce !== undefined) existing.knockbackForce = delta.knockbackForce;
                    if (delta.x !== undefined) existing.x = delta.x;
                    if (delta.y !== undefined) existing.y = delta.y;
                }
            } else {
                window.serverOkras.push({...delta});
            }
        });
    });

    socket.on('updateGold', (g) => { document.getElementById('myGold').innerText = g; document.getElementById('shopGoldDisplay').innerText = g; });
    socket.on('buyFail', (msg) => { if (typeof window.showAlertMsg === 'function') window.showAlertMsg(msg); }); 
    socket.on('joinFail', (msg) => { alert(msg); location.reload(); });

    socket.on('sphereHit', (dmg) => { if(window.myPlayer.isDead) return; window.myPlayer.hp -= dmg; window.myPlayer.slowNerfUntil = Date.now() + 500; window.myPlayer.jumpNerfUntil = Date.now() + 500; if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette(); });
    socket.on('takeDamage', (dmg) => { if(window.myPlayer.isDead) return; window.myPlayer.hp -= dmg; if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette(); });
    socket.on('bossHit', (data) => { 
        if(window.myPlayer.isDead) return; 
        window.myPlayer.hp -= data.damage; 
        if (window.myPlayer.isCasting && window.myPlayer.characterType === 'BORSALINO') {
            if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
            return;
        }
        if (window.myPlayer.isCasting && window.myPlayer.iceAgeActive) {
            if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
            return;
        }
        if (Date.now() < (window.myPlayer.elThorLockUntil || 0) || Date.now() < (window.myPlayer.raigoPullUntil || 0)) {
            if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
            return;
        }
        window.myPlayer.vy = Math.abs(data.kb) > 100 ? (-25 * window.ms) : (Math.abs(data.kb) > 30 ? (-18 * window.ms) : (-12 * window.ms)); 
        window.myPlayer.knockbackForce = data.kb * window.ms; 
        if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette(); 
    });

    socket.on('heal', (amt) => { if(window.myPlayer.isDead) return; window.myPlayer.hp = Math.min(window.myPlayer.maxHp, window.myPlayer.hp + amt); window.visualFX.push({ x: window.myPlayer.x, y: window.myPlayer.y - 50, life: 30, maxLife: 30, type: 'heal', val: Math.round(amt) }); });

    socket.on('floatingText', (data) => { 
        let type = data.type;
        if (type === 'damage' && Math.abs(data.x - window.myPlayer.x) < 5) { type = 'my_damage'; }
        window.visualFX.push({ x: data.x, y: data.y, life: 30, maxLife: 30, type: type, val: data.val }); 
    });

    socket.on('userFroze', (tid) => { if(tid===window.myId && !window.myPlayer.isDead) window.myPlayer.frozenUntil = Math.max(window.myPlayer.frozenUntil || 0, Date.now() + 2000); });
    socket.on('monsterFroze', () => { if(window.serverMonster) window.serverMonster.frozenUntil = Math.max(window.serverMonster.frozenUntil || 0, Date.now() + 2000); });

    socket.on('actionEffect', (data) => {
        if(data.type === 'ama_no_murakumo') { data.life = data.life || 15; data.maxLife = data.maxLife || 15; }
        else if(data.type === 'borsalino_beam') { data.life = 20; data.maxLife = 20; }
        else if(data.type === 'yata_mirror_path') { data.life = 22; data.maxLife = 22; }
        else if(data.type === 'yata_explosion') { data.life = 30; data.maxLife = 30; }
        else if(data.type === 'ice_age') { data.life = 60; data.maxLife = 60; }
        else if(data.type === 'ice_glove') { data.life = data.life || 12; data.maxLife = data.maxLife || 12; }
        else if(data.type === 'magma_punch') { data.life = data.life || 14; data.maxLife = data.maxLife || 14; } 
        else if(data.type === 'punch') { data.life = data.life || 12; data.maxLife = data.maxLife || 12; }
        else if(data.type === 'kizaru_gates') { data.life = 9999; data.maxLife = 9999; }
        else if(data.type === 'thunder_bolt') { data.life = data.life || 10; data.maxLife = data.maxLife || 10; }
        else if(data.type === 'el_thor') { data.life = data.lifeFrames || 120; data.maxLife = data.lifeFrames || 120; }
        else if(data.type === 'raigo_telegraph') { data.life = data.lifeFrames || 30; data.maxLife = data.lifeFrames || 30; }
        else if(data.type === 'raigo') { data.life = data.lifeFrames || 240; data.maxLife = data.lifeFrames || 240; }

        if (data.durationMs) data.endAt = Date.now() + data.durationMs;

        if (data.id !== window.myId || ['borsalino_beam', 'yata_mirror_path', 'yata_explosion', 'ice_age', 'kizaru_gates', 'el_thor', 'raigo_telegraph', 'raigo'].includes(data.type)) {
            window.visualFX.push(data);
        }
    });

    socket.on('buySuccess', (data) => {
        Object.assign(window.myPlayer, data);
        document.getElementById('myGold').innerText = data.gold; document.getElementById('shopGoldDisplay').innerText = data.gold;
        if (document.getElementById('storageModal').style.display === 'flex' && typeof window.renderStorageUI === 'function') window.renderStorageUI();
        if (document.getElementById('chestModal').style.display === 'flex' && typeof window.renderChestUI === 'function') window.renderChestUI();
        if (document.getElementById('smithModal').style.display === 'flex' && typeof window.renderSmithUI === 'function') window.renderSmithUI();
    });
};