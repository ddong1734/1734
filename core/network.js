// 파일명: core/network.js
//
// 🛟 [핵심 수정 — 게임 멈춤 현상]
//   잠금 해제 이벤트가 네트워크 순단이나 서버 재시작으로 유실되면 클라이언트의
//   잠금이 영원히 풀리지 않는다. 그래서
//     ① 잠금을 세팅하는 모든 핸들러가 '만료 시각'을 상한선과 함께 기록
//     ② 연결이 끊기거나 재연결되면 모든 잠금을 즉시 초기화
//     ③ 서버가 준 값이 비정상적으로 크면 잘라낸다
//
// ⚡ 카시모 하지메 이벤트
//   · kashimoCharge     : 전하 스택 갱신 (모든 피격 대상에 반영)
//   · kashimoCounter    : 반격 전류 (플레이어 · 오크라 모두)
//   · kashimoBoltCast   : 1번 스킬 시전 섬광
//   · kashimoBoltHit    : 번개 적중 전격
//   · kashimoSkyBolt    : 대기를 가르는 번개 (시전자 몸속 → 대상)
//   · kashimoSurgeStart : ✅ [신규] 주력 방출 시작
//   · kashimoSurgeEnd   : ✅ [신규] 주력 방출 종료

window.initNetwork = (socket) => {
    // 🛟 어떤 잠금도 이보다 길게 미래를 가리킬 수 없다 (main.js 와 동일 기준)
    const LOCK_CAP = 15000;
    const capUntil = (v) => {
        let n = Number(v);
        if (!Number.isFinite(n) || n <= 0) return 0;
        let max = Date.now() + LOCK_CAP;
        return (n > max) ? max : n;
    };

    /** 🛟 내 캐릭터의 모든 잠금을 즉시 해제한다 */
    const releaseAllLocks = (reason) => {
        const p = window.myPlayer;
        if (!p) return;
        p.isCasting = false; p.castLockUntil = 0;
        p.skill1Dashing = false; p.dashLockUntil = 0;
        p.skill3Active = false;
        p.iceAgeActive = false;
        p.yataActive = false; p.yataPath = null; p.yataCanceling = false;
        p.crowsPullUntil = 0;
        p.yamiLockUntil = 0; p.yamiBindUntil = 0; p.guraChargeUntil = 0;
        p.elThorLockUntil = 0; p.raigoPullUntil = 0;
        p.airFreezeUntil = 0; p.frozenUntil = 0; p.electrocutedUntil = 0;
        p.lightDashUntil = 0;
        p._cliStuckSince = 0;
        if (reason) console.warn('[NET] 잠금 전체 해제 — ' + reason);
    };
    window.releaseAllLocks = releaseAllLocks;

    /** ⚡🌋 주력 방출 이펙트를 끈다 */
    const clearSurgeFX = (ownerId) => {
        for (let i = 0; i < window.visualFX.length; i++) {
            let t = window.visualFX[i];
            if (t.active && t.type === 'kashimo_surge' && t.ownerId === ownerId) t.active = false;
        }
    };

    /**
     * ⚡ 전하 스택을 대상 종류에 맞게 반영한다.
     *    서버는 targetKind / targetId 로 대상을 지정한다.
     */
    const applyCharge = (kind, id, charge, until) => {
        let obj = null;
        if (kind === 'player') {
            if (id === window.myId) {
                window.myPlayer.kashimoCharge = charge;
                window.myPlayer.kashimoChargeUntil = until;
            }
            obj = window.players[id];
        }
        else if (kind === 'monster')    obj = window.serverMonster;
        else if (kind === 'hinbeom')    obj = window.serverHinbeom;
        else if (kind === 'blackbeard') obj = window.serverBlackbeard;
        else if (kind === 'burgess')    obj = window.serverBurgess;
        else if (kind === 'minion')     obj = (window.serverMinions || []).find(m => m.id === id);
        else if (kind === 'okra')       obj = (window.serverOkras || []).find(o => o.id === id);

        if (obj) { obj.kashimoCharge = charge; obj.kashimoChargeUntil = until; }
    };

    const setNetTarget = (p, x, y) => {
        if (!p) return;
        if (x !== undefined && Number.isFinite(x)) p.netX = x;
        if (y !== undefined && Number.isFinite(y)) p.netY = y;
    };
    const snapTo = (p, x, y) => {
        if (!p) return;
        if (x !== undefined && Number.isFinite(x)) { p.x = x; p.netX = x; }
        if (y !== undefined && Number.isFinite(y)) { p.y = y; p.netY = y; }
    };
    const initNet = (p) => { if (p) { p.netX = p.x; p.netY = p.y; } return p; };

    // ── 🛟 연결 상태에 따른 잠금 복구 ─────────────────────────────────
    socket.on('disconnect', () => { releaseAllLocks('서버 연결 끊김'); });
    socket.on('connect', () => { if (window.gameLoopStarted) releaseAllLocks('서버 재연결'); });
    socket.io.on('reconnect', () => { if (window.gameLoopStarted) releaseAllLocks('소켓 재연결'); });

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
                let charName = p.characterType === 'BORSALINO' ? '볼사리노'
                             : (p.characterType === 'KUZAN' ? '쿠잔'
                             : (p.characterType === 'SAKAZUKI' ? '사카즈키'
                             : (p.characterType === 'ENEL' ? '에넬'
                             : (p.characterType === 'KASHIMO' ? '카시모 하지메' : '박인범'))));
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
        window.serverHinbeom = data.hinbeom || null;
        window.serverMinions = (data.minions || []).map(m => ({ ...m }));
        window.serverHinbeomPortal = data.hinbeomPortal || null;
        window.serverDarkPortal = data.darkPortal || null;
        window.serverBlackbeard = data.blackbeard || null;
        window.serverBurgess = data.burgess || null;                        // 🟪 바제스
        window.serverBlackbeardPortal = data.blackbeardPortal || null;
        window.serverOkras = (data.okras || []).map(o => ({ ...o }));

        window.myNickname = data.myPlayer.nickname || window.myNickname;
        if (data.myPlayer.characterType) window.myPlayer.characterType = data.myPlayer.characterType;
        if (data.myPlayer.darkBanned !== undefined) window.myPlayer.darkBanned = data.myPlayer.darkBanned;
        // 🍈 열매 보유 상태 복원
        if (data.myPlayer.hasGura !== undefined) window.myPlayer.hasGura = data.myPlayer.hasGura;
        if (data.myPlayer.hasYami !== undefined) window.myPlayer.hasYami = data.myPlayer.hasYami;
        // ⚡ 카시모 전하 상태 복원
        if (data.myPlayer.kashimoCharge !== undefined) window.myPlayer.kashimoCharge = data.myPlayer.kashimoCharge;
        if (data.myPlayer.kashimoChargeUntil !== undefined) window.myPlayer.kashimoChargeUntil = data.myPlayer.kashimoChargeUntil;
        // ⚡🌋 주력 방출은 재접속 시 초기화한다
        window.myPlayer.surgeActive = false; window.myPlayer.surgeEnd = 0;
        clearSurgeFX(window.myId);
        // ✅ 재접속 시 잠금 상태를 남김없이 초기화 (스킬/평타 먹통 방지)
        releaseAllLocks(null);
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

    socket.on('statusUpdate', (d) => {
        if (!d) return;
        let t = (d.id === window.myId) ? window.myPlayer : window.players[d.id];
        if (!t) return;
        if (d.frozenUntil !== undefined) t.frozenUntil = capUntil(d.frozenUntil);
        if (d.electrocutedUntil !== undefined) t.electrocutedUntil = capUntil(d.electrocutedUntil);
        if (d.airFreezeUntil !== undefined) t.airFreezeUntil = capUntil(d.airFreezeUntil);
        if (d.burningUntil !== undefined) t.burningUntil = capUntil(d.burningUntil);
        if (d.maguBombUntil !== undefined) t.maguBombUntil = capUntil(d.maguBombUntil);
        if (d.justiceBombUntil !== undefined) t.justiceBombUntil = capUntil(d.justiceBombUntil);
        // ⚡ 전하 스택도 함께 실려 온다
        if (d.kashimoCharge !== undefined) t.kashimoCharge = d.kashimoCharge;
        if (d.kashimoChargeUntil !== undefined) t.kashimoChargeUntil = d.kashimoChargeUntil;
    });

    socket.on('syncProjectiles', (projs) => { window.serverProjectiles = projs; });
    socket.on('syncMagmas', (ms2) => { window.serverMagmas = ms2; }); 
    socket.on('magmaImpact', (data) => { window.visualFX.push({ type: 'magma_impact', x: data.x, y: data.y, life: 22, maxLife: 22 }); });

    socket.on('syncMantleBolts', (mbs) => { window.serverMantleBolts = mbs; });
    socket.on('mantraImpact', (data) => { window.visualFX.push({ type: 'mantra_impact', x: data.x, y: data.y, life: 18, maxLife: 18 }); });
    socket.on('mantleExplosion', (data) => { window.visualFX.push({ type: 'mantle_explosion', x: data.x, y: data.y, life: 18, maxLife: 18, hasArkMaxim: data.hasArkMaxim }); });

    // ====================================================================
    // ⚡ 카시모 하지메
    // ====================================================================

    // 🔋 전하 스택 갱신
    socket.on('kashimoCharge', (d) => {
        if (!d) return;
        applyCharge(d.targetKind || 'player', d.targetId, d.charge || 0, d.until || 0);
    });

    // 🔌 반격 전류 — 카시모를 때린 대상(플레이어 · 오크라)의 몸에 보라 전류
    socket.on('kashimoCounter', (d) => {
        if (!d) return;
        let dur = d.duration || 320;
        window.visualFX.push({
            type: 'kashimo_counter',
            x: d.x, y: d.y,
            ownerId: d.ownerId || null,
            targetKind: d.targetKind || 'player',
            targetId: d.targetId,
            durationMs: dur,
            life: Math.round(dur / (1000 / 60)), maxLife: Math.round(dur / (1000 / 60))
        });
    });

    // ⚡ 1번 스킬 시전 섬광
    socket.on('kashimoBoltCast', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'kashimo_bolt_cast',
            x: d.x, y: d.y, dir: d.dir || 1, ownerId: d.id,
            durationMs: 260,
            life: 16, maxLife: 16
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(200, 8, false);
    });

    // ⚡ 번개 적중 전격
    socket.on('kashimoBoltHit', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'kashimo_bolt_hit',
            x: d.x, y: d.y, ownerId: d.ownerId || null,
            durationMs: 300,
            life: 18, maxLife: 18
        });
    });

    // ⚡✨ 대기를 가르는 번개 — 시전자의 몸속에서 대상까지 뻗어 나간다
    socket.on('kashimoSkyBolt', (d) => {
        if (!d) return;
        let dur = d.duration || 700;
        window.visualFX.push({
            type: 'kashimo_sky_bolt',
            x: d.x, y: d.y,                                  // 대상 좌표(초기값)
            x2: (d.originX !== undefined) ? d.originX : d.x,  // ✅ 시전자(발사 지점)
            y2: (d.originY !== undefined) ? d.originY : d.y,
            ownerId: d.ownerId || null,
            targetKind: d.targetKind || 'player', targetId: d.targetId,
            durationMs: dur,
            life: Math.round(dur / (1000 / 60)), maxLife: Math.round(dur / (1000 / 60))
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(600, 26, false);
    });

    // ⚡🌋 [신규] 주력 방출 시작
    socket.on('kashimoSurgeStart', (d) => {
        if (!d) return;
        let dur = d.duration || 4000;

        // 같은 시전자의 기존 방출 이펙트는 먼저 끈다
        clearSurgeFX(d.id);

        if (d.id === window.myId) {
            window.myPlayer.surgeActive = true;
            window.myPlayer.surgeEnd = Date.now() + dur;
        }
        if (window.players[d.id]) {
            window.players[d.id].surgeActive = true;
            window.players[d.id].surgeEnd = Date.now() + dur;
        }

        window.visualFX.push({
            type: 'kashimo_surge',
            x: d.x, y: d.y,
            ownerId: d.id,
            radius: d.width || 360,        // 좌우 판정 폭
            arc: d.height || 900,          // 위로 뻗는 높이
            durationMs: dur,
            life: Math.round(dur / (1000 / 60)), maxLife: Math.round(dur / (1000 / 60))
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(dur, 9, false);
    });

    // ⚡🌋 [신규] 주력 방출 종료
    socket.on('kashimoSurgeEnd', (d) => {
        if (!d) return;
        if (d.id === window.myId) { window.myPlayer.surgeActive = false; window.myPlayer.surgeEnd = 0; }
        if (window.players[d.id]) { window.players[d.id].surgeActive = false; window.players[d.id].surgeEnd = 0; }
        clearSurgeFX(d.id);
    });

    // ====================================================================
    // 🥊 박힌범
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
        if (delta.kashimoCharge !== undefined) h.kashimoCharge = delta.kashimoCharge;
        if (delta.kashimoChargeUntil !== undefined) h.kashimoChargeUntil = delta.kashimoChargeUntil;
        if (delta.knockbackForce !== undefined) h.knockbackForce = delta.knockbackForce;
        if (delta.x !== undefined && Number.isFinite(delta.x)) h.x = delta.x;
        if (delta.y !== undefined && Number.isFinite(delta.y)) h.y = delta.y;
    });

    socket.on('syncHinbeomPortal', (pt) => { window.serverHinbeomPortal = pt || null; });
    socket.on('syncDarkPortal', (pt) => { window.serverDarkPortal = pt || null; });
    socket.on('syncBlackbeardPortal', (pt) => { window.serverBlackbeardPortal = pt || null; });

    socket.on('portalDwell', (d) => {
        if (!d) return;
        let until = capUntil(d.until);
        if (d.id === window.myId) window.myPlayer.portalDwellUntil = until;
        if (window.players[d.id]) window.players[d.id].portalDwellUntil = until;
    });

    socket.on('darkDwell', (d) => {
        if (!d) return;
        let until = capUntil(d.until);
        if (d.id === window.myId) window.myPlayer.darkDwellUntil = until;
        if (window.players[d.id]) window.players[d.id].darkDwellUntil = until;
    });

    // ====================================================================
    // ⚫ 검은수염
    // ====================================================================
    socket.on('blackbeardUpdate', (delta) => {
        if (!delta) return;
        if (!window.serverBlackbeard) { window.serverBlackbeard = delta; return; }
        const b = window.serverBlackbeard;
        if (delta.hp !== undefined) b.hp = delta.hp;
        if (delta.maxHp !== undefined) b.maxHp = delta.maxHp;
        if (delta.radius !== undefined) b.radius = delta.radius;
        if (delta.state !== undefined) b.state = delta.state;
        if (delta.castingUntil !== undefined) b.castingUntil = delta.castingUntil;
        if (delta.telegraphUntil !== undefined) b.telegraphUntil = delta.telegraphUntil;
        if (delta.darkFloorUntil !== undefined) b.darkFloorUntil = delta.darkFloorUntil;
        if (delta.risingUntil !== undefined) b.risingUntil = delta.risingUntil;
        if (delta.descentUntil !== undefined) b.descentUntil = delta.descentUntil;
        if (delta.frozenUntil !== undefined) b.frozenUntil = delta.frozenUntil;
        if (delta.electrocutedUntil !== undefined) b.electrocutedUntil = delta.electrocutedUntil;
        if (delta.airFreezeUntil !== undefined) b.airFreezeUntil = delta.airFreezeUntil;
        if (delta.raigoPullUntil !== undefined) b.raigoPullUntil = delta.raigoPullUntil;
        if (delta.burningUntil !== undefined) b.burningUntil = delta.burningUntil;
        if (delta.maguBombUntil !== undefined) b.maguBombUntil = delta.maguBombUntil;
        if (delta.justiceBombUntil !== undefined) b.justiceBombUntil = delta.justiceBombUntil;
        if (delta.kashimoCharge !== undefined) b.kashimoCharge = delta.kashimoCharge;
        if (delta.kashimoChargeUntil !== undefined) b.kashimoChargeUntil = delta.kashimoChargeUntil;
        if (delta.knockbackForce !== undefined) b.knockbackForce = delta.knockbackForce;
        if (delta.x !== undefined && Number.isFinite(delta.x)) b.x = delta.x;
        if (delta.y !== undefined && Number.isFinite(delta.y)) b.y = delta.y;
    });

    // ====================================================================
    // 🟪 지저스 바제스
    // ====================================================================
    socket.on('burgessUpdate', (delta) => {
        if (!delta) return;
        if (!window.serverBurgess) { window.serverBurgess = delta; return; }
        const g = window.serverBurgess;
        if (delta.hp !== undefined) g.hp = delta.hp;
        if (delta.maxHp !== undefined) g.maxHp = delta.maxHp;
        if (delta.radius !== undefined) g.radius = delta.radius;
        if (delta.state !== undefined) g.state = delta.state;
        if (delta.fallingUntil !== undefined) g.fallingUntil = delta.fallingUntil;
        if (delta.jumpTelegraphUntil !== undefined) g.jumpTelegraphUntil = delta.jumpTelegraphUntil;
        if (delta.jumpingUntil !== undefined) g.jumpingUntil = delta.jumpingUntil;
        if (delta.jumpTargetX !== undefined) g.jumpTargetX = delta.jumpTargetX;
        if (delta.jumpTargetY !== undefined) g.jumpTargetY = delta.jumpTargetY;
        if (delta.airborne !== undefined) g.airborne = delta.airborne;
        if (delta.frozenUntil !== undefined) g.frozenUntil = delta.frozenUntil;
        if (delta.electrocutedUntil !== undefined) g.electrocutedUntil = delta.electrocutedUntil;
        if (delta.airFreezeUntil !== undefined) g.airFreezeUntil = delta.airFreezeUntil;
        if (delta.raigoPullUntil !== undefined) g.raigoPullUntil = delta.raigoPullUntil;
        if (delta.burningUntil !== undefined) g.burningUntil = delta.burningUntil;
        if (delta.maguBombUntil !== undefined) g.maguBombUntil = delta.maguBombUntil;
        if (delta.justiceBombUntil !== undefined) g.justiceBombUntil = delta.justiceBombUntil;
        if (delta.kashimoCharge !== undefined) g.kashimoCharge = delta.kashimoCharge;
        if (delta.kashimoChargeUntil !== undefined) g.kashimoChargeUntil = delta.kashimoChargeUntil;
        if (delta.knockbackForce !== undefined) g.knockbackForce = delta.knockbackForce;
        if (delta.x !== undefined && Number.isFinite(delta.x)) g.x = delta.x;
        if (delta.y !== undefined && Number.isFinite(delta.y)) g.y = delta.y;
    });

    socket.on('burgessSpawn', (data) => {
        if (!data) return;
        window.visualFX.push({ type: 'burgess_spawn', x: data.x, y: data.y, radius: data.radius || 76, life: 50, maxLife: 50 });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(700, 12, true);
    });

    socket.on('burgessDespawn', () => {
        window.serverBurgess = null;
        for (let i = 0; i < window.visualFX.length; i++) {
            let t = window.visualFX[i];
            if (t.active && (t.type === 'burgess_telegraph' || t.type === 'burgess_blast' || t.type === 'burgess_spawn' || t.type === 'burgess_jump')) t.active = false;
        }
    });

    socket.on('burgessTelegraph', (data) => {
        if (!data) return;
        let dur = data.duration || 700;
        window.visualFX.push({
            type: 'burgess_telegraph',
            x: data.x, y: data.y, groundY: data.groundY,
            radius: data.radius || 340, durationMs: dur,
            life: Math.round(dur / (1000 / 60)), maxLife: Math.round(dur / (1000 / 60))
        });
    });

    socket.on('burgessJump', (data) => {
        if (!data) return;
        window.visualFX.push({
            type: 'burgess_jump',
            x: data.fromX, y: data.fromY, x2: data.toX, y2: data.toY,
            radius: data.radius || 76, arc: data.arc || 520,
            durationMs: data.duration || 320,
            life: Math.round((data.duration || 320) / (1000 / 60)),
            maxLife: Math.round((data.duration || 320) / (1000 / 60))
        });
    });

    socket.on('burgessBlast', (data) => {
        if (!data) return;
        window.visualFX.push({ type: 'burgess_blast', x: data.x, y: data.y, radius: data.radius || 450, life: 34, maxLife: 34 });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(420, 20, true);
    });

    // 🌊 블랙홀(암흑물질 장판)
    socket.on('darkFloorStart', (data) => {
        if (!data) return;
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'dark_floor') window.visualFX[i].active = false;
        }
        let dur = data.duration || 4000;
        window.visualFX.push({
            type: 'dark_floor', x: data.x || 0, y: data.y || 0,
            area: data.area || window.DARK_AREA, durationMs: dur,
            life: Math.round(dur / (1000 / 60)), maxLife: Math.round(dur / (1000 / 60))
        });
    });

    socket.on('darkFloorEnd', () => {
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'dark_floor') window.visualFX[i].active = false;
        }
    });

    socket.on('crowsTelegraph', (data) => {
        if (!data) return;
        let dur = data.duration || 1000;
        window.visualFX.push({
            type: 'crows_telegraph',
            x: data.x, y: data.y, x2: data.x2, y2: data.y2,
            radius: data.thickness ? data.thickness / 2 : 202.5,
            durationMs: dur, life: Math.round(dur / (1000 / 60)), maxLife: Math.round(dur / (1000 / 60))
        });
    });

    socket.on('crowsStart', (data) => {
        if (!data) return;
        let dur = data.duration || 420;
        // 🛟 흡인 시간은 아무리 길어도 3초를 넘지 않는다 (영구 잠금 차단)
        if (!Number.isFinite(dur) || dur <= 0 || dur > 3000) dur = 420;

        if (data.id === window.myId) {
            window.myPlayer.crowsPullUntil = Date.now() + dur;
            window.myPlayer.crowsTargetX = Number.isFinite(data.destX) ? data.destX : window.myPlayer.x;
            window.myPlayer.crowsTargetY = Number.isFinite(data.destY) ? data.destY : window.myPlayer.y;
            window.myPlayer.isCasting = false; window.myPlayer.castLockUntil = 0;
            window.myPlayer.skill1Dashing = false; window.myPlayer.dashLockUntil = 0;
            window.myPlayer.yataActive = false; window.myPlayer.yataPath = null;
            window.myPlayer.skill3Active = false;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
        }
        if (window.players[data.id]) {
            window.players[data.id].crowsPullUntil = Date.now() + dur;
            window.players[data.id].crowsTargetX = data.destX;
            window.players[data.id].crowsTargetY = data.destY;
        }

        window.visualFX.push({
            type: 'crows_beam',
            x: data.x, y: data.y, x2: data.x2, y2: data.y2,
            targetId: data.id, ownerId: data.ownerId || null,
            durationMs: dur, life: Math.round(dur / (1000 / 60)), maxLife: Math.round(dur / (1000 / 60))
        });
    });

    socket.on('crowsEnd', (data) => {
        if (!data) return;
        if (data.id === window.myId) window.myPlayer.crowsPullUntil = 0;
        if (window.players[data.id]) window.players[data.id].crowsPullUntil = 0;
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'crows_beam' && window.visualFX[i].targetId === data.id) window.visualFX[i].active = false;
        }
    });

    // 💥 검은수염 파공아
    socket.on('guraImpact', (data) => {
        if (!data) return;
        window.visualFX.push({ type: 'gura_impact', x: data.x, y: data.y, radius: data.radius || 283, life: 34, maxLife: 34 });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(520, 24, true);
    });

    // ============================================================
    // 💥 흔들흔들열매 — 플레이어 평타 파공아
    // ============================================================
    socket.on('playerGura', (data) => {
        if (!data) return;
        if (data.super) {
            window.visualFX.push({ type: 'gura_impact_super', x: data.x, y: data.y, radius: data.radius || 368, life: 46, maxLife: 46 });
            if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(760, 34, false);
        } else {
            window.visualFX.push({ type: 'gura_impact', x: data.x, y: data.y, radius: data.radius || 283, life: 34, maxLife: 34 });
            if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(520, 24, false);
        }
    });

    socket.on('guraCd', (d) => {
        if (!d) return;
        window.myPlayer.guraCdEnd = d.until || 0;
    });

    // 💥 파공아 시전 경직 (0.5초) + ⚪ 흰색 아우라
    socket.on('guraCharge', (d) => {
        if (!d) return;
        let until = capUntil(d.until);

        if (d.id === window.myId) {
            window.myPlayer.guraChargeUntil = until;
            if (until > 0) {
                window.myPlayer.isCasting = false; window.myPlayer.castLockUntil = 0;
                window.myPlayer.skill1Dashing = false; window.myPlayer.dashLockUntil = 0;
                window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
                window.joyX = 0; window.joyY = 0;
            }
        }
        if (window.players[d.id]) window.players[d.id].guraChargeUntil = until;

        if (until > 0) {
            let dur = d.duration || 500;
            window.visualFX.push({
                type: 'gura_charge_aura',
                ownerId: d.id,
                x: (d.x !== undefined) ? d.x : 0,
                y: (d.y !== undefined) ? d.y : 0,
                radius: 110,
                durationMs: dur,
                life: Math.round(dur / (1000 / 60)),
                maxLife: Math.round(dur / (1000 / 60))
            });
        } else {
            for (let i = 0; i < window.visualFX.length; i++) {
                let t = window.visualFX[i];
                if (t.active && t.type === 'gura_charge_aura' && t.ownerId === d.id) t.active = false;
            }
        }
    });

    // ============================================================
    // ⛓️ 어둠어둠열매
    // ============================================================
    socket.on('yamiSlash', (data) => {
        if (!data) return;
        let dur = data.duration || 420;
        window.visualFX.push({
            type: 'yami_slash',
            x: data.x, y: data.y, x2: data.x2, y2: data.y2,
            ownerId: data.ownerId || null, radius: data.half || 95,
            durationMs: dur, life: Math.round(dur / (1000 / 60)), maxLife: Math.round(dur / (1000 / 60))
        });
    });

    socket.on('yamiAbsorb', (data) => {
        if (!data) return;
        let dur = data.duration || 2000;
        window.visualFX.push({
            type: 'yami_absorb',
            x: data.x, y: data.y,
            targetKind: data.targetKind || 'player', targetId: data.targetId,
            radius: data.radius || 90,
            durationMs: dur, life: Math.round(dur / (1000 / 60)), maxLife: Math.round(dur / (1000 / 60))
        });
    });

    socket.on('yamiCd', (d) => {
        if (!d) return;
        window.myPlayer.yamiCdEnd = d.until || 0;
    });

    socket.on('yamiSelfLock', (d) => {
        if (!d) return;
        let until = capUntil(d.until);
        if (d.id === window.myId) {
            window.myPlayer.yamiLockUntil = until;
            if (until > 0) {
                window.myPlayer.isCasting = false; window.myPlayer.castLockUntil = 0;
                window.myPlayer.skill1Dashing = false; window.myPlayer.dashLockUntil = 0;
                window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
                window.joyX = 0; window.joyY = 0;
            }
        }
        if (window.players[d.id]) window.players[d.id].yamiLockUntil = until;
    });

    socket.on('yamiBind', (d) => {
        if (!d) return;
        let until = capUntil(d.until);
        if (d.id === window.myId) {
            window.myPlayer.yamiBindUntil = until;
            if (until > 0) {
                window.myPlayer.isCasting = false; window.myPlayer.castLockUntil = 0;
                window.myPlayer.skill1Dashing = false; window.myPlayer.dashLockUntil = 0;
                window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
                window.joyX = 0; window.joyY = 0;
            }
        }
        if (window.players[d.id]) window.players[d.id].yamiBindUntil = until;
    });

    socket.on('yamiBindEnd', (d) => {
        if (!d) return;
        if (d.id === window.myId) { window.myPlayer.yamiBindUntil = 0; window.myPlayer.yamiLockUntil = 0; }
        if (window.players[d.id]) window.players[d.id].yamiBindUntil = 0;
        for (let i = 0; i < window.visualFX.length; i++) {
            let t = window.visualFX[i];
            if (t.active && t.type === 'yami_absorb' && t.targetId === d.id) t.active = false;
        }
    });

    socket.on('darkRise', (data) => {
        if (!data) return;
        let dur = data.duration || 2000;
        window.visualFX.push({
            type: 'dark_rise', x: data.x, y: data.fromY, y2: data.fromY, radius: data.toY,
            durationMs: dur, life: Math.round(dur / (1000 / 60)), maxLife: Math.round(dur / (1000 / 60))
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(dur, 8, true);
    });

    socket.on('descentStart', (data) => {
        if (!data) return;
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'dark_descent') window.visualFX[i].active = false;
        }
        let dur = data.duration || 5000;
        window.visualFX.push({
            type: 'dark_descent', x: data.x, y: data.y,
            area: data.area || window.DARK_AREA,
            durationMs: dur, life: Math.round(dur / (1000 / 60)), maxLife: Math.round(dur / (1000 / 60))
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(dur, 11, true);
    });

    socket.on('descentEnd', () => {
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'dark_descent') window.visualFX[i].active = false;
        }
    });

    socket.on('syncMinions', (list) => { window.serverMinions = list || []; });

    socket.on('minionSpawn', (data) => {
        if (!data || !data.xs) return;
        for (let i = 0; i < data.xs.length; i++) {
            window.visualFX.push({ type: 'minion_spawn', x: data.xs[i], y: data.y, life: 26, maxLife: 26 });
        }
    });

    socket.on('hakiBurst', (data) => {
        if (!data) return;
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'haki_burst') window.visualFX[i].active = false;
        }
        window.visualFX.push({
            type: 'haki_burst', x: data.x, y: data.y,
            area: data.area || window.HINBEOM_AREA,
            durationMs: data.duration || 4000,
            life: Math.round((data.duration || 4000) / (1000 / 60)),
            maxLife: Math.round((data.duration || 4000) / (1000 / 60))
        });
    });

    socket.on('hakiEnd', () => {
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'haki_burst') window.visualFX[i].active = false;
        }
    });

    socket.on('raigoPull', (data) => {
        if (!data) return;
        let until = capUntil(data.until);
        if (data.id === window.myId) {
            window.myPlayer.raigoPullUntil = until;
            if (until > 0) {
                window.myPlayer.isCasting = false; window.myPlayer.castLockUntil = 0;
                window.myPlayer.skill1Dashing = false; window.myPlayer.dashLockUntil = 0;
                window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            }
        } else if (window.players[data.id]) {
            window.players[data.id].raigoPullUntil = until;
        }
    });

    socket.on('setBurn', (d) => {
        if (d.id === window.myId) { window.myPlayer.burningUntil = Math.max(window.myPlayer.burningUntil || 0, d.until); }
        else if (window.players[d.id]) { window.players[d.id].burningUntil = Math.max(window.players[d.id].burningUntil || 0, d.until); }
        else if (d.id === 'monster') { if (window.serverMonster) window.serverMonster.burningUntil = Math.max(window.serverMonster.burningUntil || 0, d.until); }
        else if (d.id === 'hinbeom') { if (window.serverHinbeom) window.serverHinbeom.burningUntil = Math.max(window.serverHinbeom.burningUntil || 0, d.until); }
        else if (d.id === 'blackbeard') { if (window.serverBlackbeard) window.serverBlackbeard.burningUntil = Math.max(window.serverBlackbeard.burningUntil || 0, d.until); }
        else if (d.id === 'burgess') { if (window.serverBurgess) window.serverBurgess.burningUntil = Math.max(window.serverBurgess.burningUntil || 0, d.until); }
        else if (typeof d.id === 'string' && d.id.indexOf('minion_') === 0) {
            let mn = window.serverMinions.find(m => m.id === parseInt(d.id.slice(7)));
            if (mn) mn.burningUntil = Math.max(mn.burningUntil || 0, d.until);
        }
        else if (typeof d.id === 'string' && d.id.indexOf('okra_') === 0) {
            let ok = window.serverOkras.find(o => o.id === parseInt(d.id.slice(5)));
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
        // ⚡🌋 방출 중이었다면 이펙트를 끈다
        clearSurgeFX(deadId);

        if (deadId === window.myId) {
            window.myPlayer.isDead = true; 
            releaseAllLocks(null);                       // 🛟 사망 시 모든 잠금 제거
            window.myPlayer.yataCanceling = false; 
            window.myPlayer.burningUntil = 0; window.myPlayer.maguBombUntil = 0; window.myPlayer.justiceBombUntil = 0;
            window.myPlayer.portalDwellUntil = 0; window.myPlayer.darkDwellUntil = 0;
            window.myPlayer.kashimoCharge = 0; window.myPlayer.kashimoChargeUntil = 0;   // ⚡ 전하 초기화
            window.myPlayer.surgeActive = false; window.myPlayer.surgeEnd = 0;           // ⚡🌋 방출 초기화
            document.getElementById('death-screen').style.display = 'flex';
            let timeLeft = 15; document.getElementById('respawn-timer').innerText = timeLeft; clearInterval(window.respawnInterval);
            window.respawnInterval = setInterval(() => { 
                timeLeft--; document.getElementById('respawn-timer').innerText = timeLeft; 
                if (timeLeft <= 0) clearInterval(window.respawnInterval); 
            }, 1000);
        } else if (window.players[deadId]) { 
            let t = window.players[deadId];
            t.isDead = true; 
            t.burningUntil = 0; t.maguBombUntil = 0; t.justiceBombUntil = 0;
            t.electrocutedUntil = 0; t.lightDashUntil = 0; 
            t.isCasting = false; t.skill3Active = false; t.skill1Dashing = false; 
            t.yataActive = false; t.yataPath = null;
            t.portalDwellUntil = 0; t.darkDwellUntil = 0;
            t.crowsPullUntil = 0;
            t.yamiLockUntil = 0; t.yamiBindUntil = 0; t.guraChargeUntil = 0;
            t.elThorLockUntil = 0; t.raigoPullUntil = 0; 
            t.kashimoCharge = 0; t.kashimoChargeUntil = 0;
            t.surgeActive = false; t.surgeEnd = 0;
        }
    });

    socket.on('player_respawned', (pData) => {
        clearSurgeFX(pData.id);

        if (pData.id === window.myId) { 
            window.myPlayer.isDead = false; window.myPlayer.hp = pData.hp; 
            window.myPlayer.maxHp = pData.maxHp;
            if (Number.isFinite(pData.x)) window.myPlayer.x = pData.x;
            if (Number.isFinite(pData.y)) window.myPlayer.y = pData.y;
            window.myPlayer.vy = 0; window.myPlayer.knockbackForce = 0;
            releaseAllLocks(null);                       // 🛟 부활 시 모든 잠금 제거
            window.myPlayer.burningUntil = 0; window.myPlayer.maguBombUntil = 0; window.myPlayer.justiceBombUntil = 0;
            window.myPlayer.portalDwellUntil = 0; window.myPlayer.darkDwellUntil = 0;
            window.myPlayer.kashimoCharge = 0; window.myPlayer.kashimoChargeUntil = 0;
            window.myPlayer.surgeActive = false; window.myPlayer.surgeEnd = 0;
            window._lastSentPos = { x: window.myPlayer.x, y: window.myPlayer.y };
            document.getElementById('death-screen').style.display = 'none'; clearInterval(window.respawnInterval); 
        }
        if (window.players[pData.id]) { 
            let t = window.players[pData.id];
            t.isDead = false; t.hp = pData.hp; t.maxHp = pData.maxHp;
            snapTo(t, pData.x, pData.y);
            t.burningUntil = 0; t.maguBombUntil = 0; t.justiceBombUntil = 0;
            t.electrocutedUntil = 0; t.lightDashUntil = 0; 
            t.portalDwellUntil = 0; t.darkDwellUntil = 0;
            t.crowsPullUntil = 0;
            t.yamiLockUntil = 0; t.yamiBindUntil = 0; t.guraChargeUntil = 0;
            t.skill1Dashing = false; t.yataActive = false; t.skill3Active = false; t.isCasting = false;
            t.elThorLockUntil = 0; t.raigoPullUntil = 0; 
            t.kashimoCharge = 0; t.kashimoChargeUntil = 0;
            t.surgeActive = false; t.surgeEnd = 0;
        }
    });

    socket.on('teleport', (pos) => {
        if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
        window.myPlayer.x = pos.x; window.myPlayer.y = pos.y;
        window.myPlayer.vy = 0; window.myPlayer.knockbackForce = 0;
        window.myPlayer.portalDwellUntil = 0; window.myPlayer.darkDwellUntil = 0;
        if (window.myId && window.players[window.myId]) {
            snapTo(window.players[window.myId], pos.x, pos.y);
            window.players[window.myId].portalDwellUntil = 0;
            window.players[window.myId].darkDwellUntil = 0;
        }
        window._lastSentPos = { x: pos.x, y: pos.y };
    });

    socket.on('yataStart', (data) => {
        let path = data.path;
        if (data.id === window.myId) {
            if (!path || path.length < 2) {
                window.myPlayer.yataActive = false; window.myPlayer.yataPath = null;
                window.myPlayer.isCasting = false; window.myPlayer.castLockUntil = 0;
                return;
            }
            window.myPlayer.yataActive = true;
            window.myPlayer.yataCanceling = false; 
            window.myPlayer.yataPath = path;
            window.myPlayer.yataStartTime = Number.isFinite(data.startTime) ? data.startTime : Date.now();
            window.myPlayer.yataProgress = 0;
            window.myPlayer.isCasting = true;
            window.myPlayer.castLockUntil = Date.now() + (data.duration || 3000) + 2000;
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
            window.myPlayer.castLockUntil = 0;
            if (Number.isFinite(data.x)) window.myPlayer.x = data.x;
            if (Number.isFinite(data.y)) window.myPlayer.y = data.y;
            window.myPlayer.vy = 0; window.myPlayer.knockbackForce = 0;
        } else if (window.players[data.id]) {
            window.players[data.id].yataActive = false;
            window.players[data.id].yataPath = null;
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
                dashLockUntil: window.myPlayer.dashLockUntil,
                castLockUntil: window.myPlayer.castLockUntil,
                knockbackForce: window.myPlayer.knockbackForce,
                lightDashUntil: window.myPlayer.lightDashUntil, lightDashDir: window.myPlayer.lightDashDir, 
                yataCanceling: window.myPlayer.yataCanceling,
                elThorLockUntil: window.myPlayer.elThorLockUntil, raigoPullUntil: window.myPlayer.raigoPullUntil,
                crowsPullUntil: window.myPlayer.crowsPullUntil,
                crowsTargetX: window.myPlayer.crowsTargetX, crowsTargetY: window.myPlayer.crowsTargetY,
                guraCdEnd: window.myPlayer.guraCdEnd, yamiCdEnd: window.myPlayer.yamiCdEnd,
                guraChargeUntil: window.myPlayer.guraChargeUntil,
                yamiLockUntil: window.myPlayer.yamiLockUntil, yamiBindUntil: window.myPlayer.yamiBindUntil,
                kashimoBoltCdEnd: window.myPlayer.kashimoBoltCdEnd,        // ⚡ 로컬 쿨타임 유지
                surgeCdEnd: window.myPlayer.surgeCdEnd,                    // ⚡🌋 로컬 쿨타임 유지
                _cliStuckSince: window.myPlayer._cliStuckSince,
                _offlineSince: window.myPlayer._offlineSince
            };

            let srvCasting = !!data.isCasting;
            Object.assign(window.myPlayer, data);
            Object.assign(window.myPlayer, localState);

            let nowSync = Date.now();
            let hasReason = (window.myPlayer.yataActive && window.myPlayer.yataPath)
                         || nowSync < (window.myPlayer.castLockUntil || 0)
                         || window.myPlayer.skill1Dashing;
            window.myPlayer.isCasting = (srvCasting && hasReason);
            
            if (window.players[window.myId]) Object.assign(window.players[window.myId], window.myPlayer);
            let gEl = document.getElementById('myGold'); if(gEl && gEl.innerText != data.gold) gEl.innerText = data.gold;
            let sgEl = document.getElementById('shopGoldDisplay'); if(sgEl && sgEl.innerText != data.gold) sgEl.innerText = data.gold;
        } else {
            let t = window.players[data.id];
            if (t) {
                t.hp = data.hp; t.maxHp = data.maxHp;
                t.skill2EndTime = data.skill2EndTime;
                t.isDead = data.isDead; t.isCasting = data.isCasting;
                t.yataActive = data.yataActive;
                t.frozenUntil = data.frozenUntil;
                t.electrocutedUntil = data.electrocutedUntil; 
                t.burningUntil = data.burningUntil;  
                t.maguBombUntil = data.maguBombUntil; 
                t.justiceBombUntil = data.justiceBombUntil; 
                t.characterType = data.characterType || t.characterType;
                
                t.hasJusticeCoat = data.hasJusticeCoat;
                t.hasPika = data.hasPika; t.hasHie = data.hasHie; t.hasMagu = data.hasMagu;
                t.hasKizaru = data.hasKizaru; t.hasAokiji = data.hasAokiji; t.hasAkainu = data.hasAkainu;
                t.hasGoro = data.hasGoro; t.hasArkMaxim = data.hasArkMaxim; t.hasGodEnel = data.hasGodEnel;
                t.hasGura = data.hasGura; t.hasYami = data.hasYami;

                if (data.elThorActive !== undefined) t.elThorActive = data.elThorActive;
                if (data.crowsPullUntil !== undefined) t.crowsPullUntil = data.crowsPullUntil;
                if (data.yamiLockUntil !== undefined) t.yamiLockUntil = data.yamiLockUntil;
                if (data.yamiBindUntil !== undefined) t.yamiBindUntil = data.yamiBindUntil;
                if (data.guraChargeUntil !== undefined) t.guraChargeUntil = data.guraChargeUntil;
                if (data.darkBanned !== undefined) t.darkBanned = data.darkBanned;
                // ⚡ 전하 스택 · 주력 방출
                if (data.kashimoCharge !== undefined) t.kashimoCharge = data.kashimoCharge;
                if (data.kashimoChargeUntil !== undefined) t.kashimoChargeUntil = data.kashimoChargeUntil;
                if (data.surgeActive !== undefined) t.surgeActive = data.surgeActive;
                if (data.surgeEnd !== undefined) t.surgeEnd = data.surgeEnd;

                t.lastFacing = data.lastFacing;
                let lastHit = t.lastLocalHit || 0;
                if (Date.now() - lastHit > 800) {
                    t.knockbackForce = data.knockbackForce || 0;
                    setNetTarget(t, data.x, data.y);
                }
            } else {
                window.players[data.id] = initNet(data);
            }
        }
    });

    socket.on('levelUp', (targetId) => { window.visualFX.push({ type: 'levelup', targetId: targetId, life: 60, maxLife: 60, x: window.players[targetId]?.x, y: window.players[targetId]?.y }); });

    socket.on('enemyUpdate', (delta) => { 
        let t = window.players[delta.id];
        if (!t) { window.players[delta.id] = initNet(delta); return; }

        const COPY = ['hp','maxHp','skill2EndTime','isCasting','isDead','level','xp','maxXp',
                      'frozenUntil','electrocutedUntil','airFreezeUntil','raigoPullUntil',
                      'crowsPullUntil','yamiLockUntil','yamiBindUntil','guraChargeUntil','darkBanned',
                      'burningUntil','maguBombUntil','justiceBombUntil','characterType',
                      'hasJusticeCoat','hasPika','hasHie','hasMagu','hasKizaru','hasAokiji','hasAkainu',
                      'hasGoro','hasArkMaxim','hasGodEnel','hasGura','hasYami',
                      'elThorActive','yataActive',
                      'kashimoCharge','kashimoChargeUntil','surgeActive','surgeEnd'];   // ⚡
        for (let i = 0; i < COPY.length; i++) {
            let k = COPY[i];
            if (delta[k] !== undefined) t[k] = delta[k];
        }

        let lastHit = t.lastLocalHit || 0;
        if (Date.now() - lastHit > 800) {
            if (delta.knockbackForce !== undefined) t.knockbackForce = delta.knockbackForce;
            setNetTarget(t, delta.x, delta.y);
            if (delta.lastFacing !== undefined) t.lastFacing = delta.lastFacing;
        }
    });

    socket.on('playerLeft', (id) => { clearSurgeFX(id); delete window.players[id]; });

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
        if (!window.serverMonster) { window.serverMonster = delta; return; }
        const m = window.serverMonster;
        const COPY = ['hp','state','frozenUntil','electrocutedUntil','airFreezeUntil','raigoPullUntil',
                      'burningUntil','maguBombUntil','justiceBombUntil',
                      'kashimoCharge','kashimoChargeUntil'];
        for (let i = 0; i < COPY.length; i++) { let k = COPY[i]; if (delta[k] !== undefined) m[k] = delta[k]; }
        let lastHit = m.lastLocalHit || 0;
        if (Date.now() - lastHit > 800) {
            if (delta.knockbackForce !== undefined) m.knockbackForce = delta.knockbackForce;
            if (delta.x !== undefined && Number.isFinite(delta.x)) m.x = delta.x;
            if (delta.y !== undefined && Number.isFinite(delta.y)) m.y = delta.y;
        }
    });

    socket.on('syncOkras', (deltaOkras) => {
        if (window.serverOkras.length === 0) { window.serverOkras = deltaOkras.map(o => ({...o})); return; }
        const COPY = ['hp','maxHp','isGolden','state','frozenUntil','electrocutedUntil','airFreezeUntil',
                      'raigoPullUntil','burningUntil','maguBombUntil','justiceBombUntil',
                      'kashimoCharge','kashimoChargeUntil'];
        deltaOkras.forEach(delta => {
            let ex = window.serverOkras.find(o => o.id === delta.id);
            if (!ex) { window.serverOkras.push({...delta}); return; }
            for (let i = 0; i < COPY.length; i++) { let k = COPY[i]; if (delta[k] !== undefined) ex[k] = delta[k]; }
            let lastHit = ex.lastLocalHit || 0;
            if (Date.now() - lastHit > 800) {
                if (delta.knockbackForce !== undefined) ex.knockbackForce = delta.knockbackForce;
                if (delta.x !== undefined && Number.isFinite(delta.x)) ex.x = delta.x;
                if (delta.y !== undefined && Number.isFinite(delta.y)) ex.y = delta.y;
            }
        });
    });

    socket.on('updateGold', (g) => { document.getElementById('myGold').innerText = g; document.getElementById('shopGoldDisplay').innerText = g; });
    socket.on('buyFail', (msg) => { if (typeof window.showAlertMsg === 'function') window.showAlertMsg(msg); }); 
    socket.on('joinFail', (msg) => { alert(msg); location.reload(); });

    socket.on('sphereHit', (dmg) => { if(window.myPlayer.isDead) return; window.myPlayer.hp -= dmg; window.myPlayer.slowNerfUntil = Date.now() + 500; window.myPlayer.jumpNerfUntil = Date.now() + 500; if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette(); });
    socket.on('takeDamage', (dmg) => { if(window.myPlayer.isDead) return; if (!Number.isFinite(dmg)) return; window.myPlayer.hp -= dmg; if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette(); });

    socket.on('bossHit', (data) => { 
        if(window.myPlayer.isDead) return; 
        if (!data || !Number.isFinite(data.damage)) return;
        window.myPlayer.hp -= data.damage; 
        const now = Date.now();
        if (window.myPlayer.isCasting && (window.myPlayer.characterType === 'BORSALINO' || window.myPlayer.iceAgeActive)) {
            if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
            return;
        }
        if (now < (window.myPlayer.elThorLockUntil || 0) || now < (window.myPlayer.raigoPullUntil || 0)
            || now < (window.myPlayer.crowsPullUntil || 0) || now < (window.myPlayer.yamiBindUntil || 0)
            || now < (window.myPlayer.yamiLockUntil || 0) || now < (window.myPlayer.guraChargeUntil || 0)) {
            if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
            return;
        }
        let kb = Number.isFinite(data.kb) ? data.kb : 0;
        window.myPlayer.vy = Math.abs(kb) > 100 ? (-25 * window.ms) : (Math.abs(kb) > 30 ? (-18 * window.ms) : (-12 * window.ms)); 
        window.myPlayer.knockbackForce = kb * window.ms; 
        if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette(); 
    });

    socket.on('heal', (amt) => { if(window.myPlayer.isDead) return; window.myPlayer.hp = Math.min(window.myPlayer.maxHp, window.myPlayer.hp + amt); window.visualFX.push({ x: window.myPlayer.x, y: window.myPlayer.y - 50, life: 30, maxLife: 30, type: 'heal', val: Math.round(amt) }); });

    socket.on('floatingText', (data) => { 
        let type = data.type;
        if (type === 'damage' && Math.abs(data.x - window.myPlayer.x) < 5) type = 'my_damage';
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
        else if(data.type === 'kashimo_strike') { data.life = data.life || 13; data.maxLife = data.maxLife || 13; }   // ⚡ 카시모 평타
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

    // ====================================================================
    // 📶 핑(지연시간) 측정
    // ====================================================================
    window.myPing = 0;

    const sendPingCheck = () => { if (socket.connected) socket.emit('pingCheck', Date.now()); };

    socket.on('pongCheck', (ts) => {
        if (typeof ts !== 'number') return;
        let rtt = Math.max(0, Date.now() - ts);
        window.myPing = (window.myPing > 0) ? Math.round(window.myPing * 0.6 + rtt * 0.4) : rtt;
        if (typeof window.updatePingUI === 'function') window.updatePingUI(window.myPing);
    });

    socket.on('connect', sendPingCheck);
    if (socket.connected) sendPingCheck();

    if (window._pingInterval) clearInterval(window._pingInterval);
    window._pingInterval = setInterval(sendPingCheck, 1000);
};