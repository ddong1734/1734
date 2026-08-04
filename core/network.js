// 파일명: core/network.js

window.initNetwork = (socket) => {
    const setNetTarget = (p, x, y) => {
        if (!p) return;
        if (x !== undefined) p.netX = x;
        if (y !== undefined) p.netY = y;
    };
    const snapTo = (p, x, y) => {
        if (!p) return;
        if (x !== undefined) { p.x = x; p.netX = x; }
        if (y !== undefined) { p.y = y; p.netY = y; }
    };
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

    socket.on('syncMantleBolts', (mbs) => { window.serverMantleBolts = mbs; });
    socket.on('mantraImpact', (data) => { window.visualFX.push({ type: 'mantra_impact', x: data.x, y: data.y, life: 18, maxLife: 18 }); });
    socket.on('mantleExplosion', (data) => { window.visualFX.push({ type: 'mantle_explosion', x: data.x, y: data.y, life: 18, maxLife: 18, hasArkMaxim: data.hasArkMaxim }); });

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
        if (delta.knockbackForce !== undefined) h.knockbackForce = delta.knockbackForce;
        if (delta.x !== undefined) h.x = delta.x;
        if (delta.y !== undefined) h.y = delta.y;
    });

    socket.on('syncHinbeomPortal', (pt) => { window.serverHinbeomPortal = pt || null; });
    socket.on('syncDarkPortal', (pt) => { window.serverDarkPortal = pt || null; });
    socket.on('syncBlackbeardPortal', (pt) => { window.serverBlackbeardPortal = pt || null; });

    socket.on('portalDwell', (d) => {
        if (!d) return;
        let until = d.until || 0;
        if (d.id === window.myId) window.myPlayer.portalDwellUntil = until;
        if (window.players[d.id]) window.players[d.id].portalDwellUntil = until;
    });

    socket.on('darkDwell', (d) => {
        if (!d) return;
        let until = d.until || 0;
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
        if (delta.knockbackForce !== undefined) b.knockbackForce = delta.knockbackForce;
        if (delta.x !== undefined) b.x = delta.x;
        if (delta.y !== undefined) b.y = delta.y;
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
        if (delta.knockbackForce !== undefined) g.knockbackForce = delta.knockbackForce;
        if (delta.x !== undefined) g.x = delta.x;
        if (delta.y !== undefined) g.y = delta.y;
    });

    // 🟪 등장 — 하늘에서 낙하 시작
    socket.on('burgessSpawn', (data) => {
        if (!data) return;
        window.visualFX.push({
            type: 'burgess_spawn',
            x: data.x, y: data.y,
            radius: data.radius || 76,
            life: 50, maxLife: 50
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(700, 12, true);
    });

    socket.on('burgessDespawn', () => {
        window.serverBurgess = null;
        for (let i = 0; i < window.visualFX.length; i++) {
            let t = window.visualFX[i];
            if (t.active && (t.type === 'burgess_telegraph' || t.type === 'burgess_blast' || t.type === 'burgess_spawn' || t.type === 'burgess_jump')) t.active = false;
        }
    });

    // 🔴 점프 예고 — 착지 예정 지점을 빨간색으로 표시 (0.7초)
    //    ✅ 표시 범위 2배 확대 (기본값 340)
    socket.on('burgessTelegraph', (data) => {
        if (!data) return;
        let dur = data.duration || 700;
        window.visualFX.push({
            type: 'burgess_telegraph',
            x: data.x, y: data.y,
            groundY: data.groundY,
            radius: data.radius || 340,
            durationMs: dur,
            life: Math.round(dur / (1000 / 60)),
            maxLife: Math.round(dur / (1000 / 60))
        });
    });

    // 🦘 도약 시작 (공중 목표 Y 포함)
    socket.on('burgessJump', (data) => {
        if (!data) return;
        window.visualFX.push({
            type: 'burgess_jump',
            x: data.fromX, y: data.fromY,
            x2: data.toX, y2: data.toY,
            radius: data.radius || 76,
            arc: data.arc || 520,
            durationMs: data.duration || 320,
            life: Math.round((data.duration || 320) / (1000 / 60)),
            maxLife: Math.round((data.duration || 320) / (1000 / 60))
        });
    });

    // 🌪️ 착지 풍압
    //    ✅ 이펙트 범위 2배 확대 (기본값 450)
    socket.on('burgessBlast', (data) => {
        if (!data) return;
        window.visualFX.push({
            type: 'burgess_blast',
            x: data.x, y: data.y,
            radius: data.radius || 450,
            life: 34, maxLife: 34
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(420, 20, true);
    });

    // 🌊 블랙홀(암흑물질 장판) — 4초간 이동속도 0.3배
    socket.on('darkFloorStart', (data) => {
        if (!data) return;
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'dark_floor') window.visualFX[i].active = false;
        }
        let dur = data.duration || 4000;
        window.visualFX.push({
            type: 'dark_floor',
            x: data.x || 0, y: data.y || 0,
            area: data.area || window.DARK_AREA,
            durationMs: dur,
            life: Math.round(dur / (1000 / 60)),
            maxLife: Math.round(dur / (1000 / 60))
        });
    });

    socket.on('darkFloorEnd', () => {
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'dark_floor') window.visualFX[i].active = false;
        }
    });

    // 🔴 크로우즈 예고
    socket.on('crowsTelegraph', (data) => {
        if (!data) return;
        let dur = data.duration || 1000;
        window.visualFX.push({
            type: 'crows_telegraph',
            x: data.x, y: data.y, x2: data.x2, y2: data.y2,
            radius: data.thickness ? data.thickness / 2 : 202.5,
            durationMs: dur,
            life: Math.round(dur / (1000 / 60)),
            maxLife: Math.round(dur / (1000 / 60))
        });
    });

    // ⛓️ 크로우즈 발동
    socket.on('crowsStart', (data) => {
        if (!data) return;
        let dur = data.duration || 420;

        if (data.id === window.myId) {
            window.myPlayer.crowsPullUntil = Date.now() + dur;
            window.myPlayer.crowsTargetX = data.destX;
            window.myPlayer.crowsTargetY = data.destY;
            window.myPlayer.isCasting = false;
            window.myPlayer.skill1Dashing = false;
            window.myPlayer.yataActive = false;
            window.myPlayer.yataPath = null;
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
            targetId: data.id,
            ownerId: data.ownerId || null,
            durationMs: dur,
            life: Math.round(dur / (1000 / 60)),
            maxLife: Math.round(dur / (1000 / 60))
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

    // 💥 파공아
    socket.on('guraImpact', (data) => {
        if (!data) return;
        window.visualFX.push({
            type: 'gura_impact',
            x: data.x, y: data.y,
            radius: data.radius || 283,
            life: 34, maxLife: 34
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(520, 24, true);
    });

    // ============================================================
    // 💥 [신규] 흔들흔들열매 — 플레이어 평타 파공아
    //    data.super 가 true 면 시너지(강화) 파공아로 그린다.
    // ============================================================
    socket.on('playerGura', (data) => {
        if (!data) return;
        if (data.super) {
            window.visualFX.push({
                type: 'gura_impact_super',
                x: data.x, y: data.y,
                radius: data.radius || 368,
                life: 46, maxLife: 46
            });
            if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(760, 34, false);
        } else {
            window.visualFX.push({
                type: 'gura_impact',
                x: data.x, y: data.y,
                radius: data.radius || 283,
                life: 34, maxLife: 34
            });
            if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(520, 24, false);
        }
    });

    // 💥 흔들흔들 쿨타임 시작 (본인에게만 전송)
    socket.on('guraCd', (d) => {
        if (!d) return;
        window.myPlayer.guraCdEnd = d.until || 0;
    });

    // 💥 흔들흔들 시전 경직 (0.5초) — 발동 전 준비 시간
    socket.on('guraCharge', (d) => {
        if (!d) return;
        let until = d.until || 0;
        if (d.id === window.myId) {
            window.myPlayer.guraChargeUntil = until;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
        }
        if (window.players[d.id]) window.players[d.id].guraChargeUntil = until;
    });

    // ============================================================
    // ⛓️ [신규] 어둠어둠열매 — 빗나갔을 때 남는 어둠 잔상
    // ============================================================
    socket.on('yamiSlash', (data) => {
        if (!data) return;
        let dur = data.duration || 420;
        window.visualFX.push({
            type: 'yami_slash',
            x: data.x, y: data.y, x2: data.x2, y2: data.y2,
            ownerId: data.ownerId || null,
            radius: data.half || 95,
            durationMs: dur,
            life: Math.round(dur / (1000 / 60)),
            maxLife: Math.round(dur / (1000 / 60))
        });
    });

    // ⛓️ 어둠어둠 쿨타임 시작 (본인에게만 전송)
    socket.on('yamiCd', (d) => {
        if (!d) return;
        window.myPlayer.yamiCdEnd = d.until || 0;
    });

    // ⛓️ 어둠어둠 — 시전자 경직 (2초 동안 움직일 수 없다)
    socket.on('yamiSelfLock', (d) => {
        if (!d) return;
        let until = d.until || 0;
        if (d.id === window.myId) {
            window.myPlayer.yamiLockUntil = until;
            window.myPlayer.isCasting = false;
            window.myPlayer.skill1Dashing = false;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
        }
        if (window.players[d.id]) window.players[d.id].yamiLockUntil = until;
    });

    // ⛓️ 어둠어둠 — 대상 속박 (끌려온 뒤 2초간 묶인다)
    socket.on('yamiBind', (d) => {
        if (!d) return;
        let until = d.until || 0;
        if (d.id === window.myId) {
            window.myPlayer.yamiBindUntil = until;
            window.myPlayer.isCasting = false;
            window.myPlayer.skill1Dashing = false;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
        }
        if (window.players[d.id]) window.players[d.id].yamiBindUntil = until;
    });

    socket.on('yamiBindEnd', (d) => {
        if (!d) return;
        if (d.id === window.myId) window.myPlayer.yamiBindUntil = 0;
        if (window.players[d.id]) window.players[d.id].yamiBindUntil = 0;
    });

    // 🌀 어둠 소용돌이 상승
    socket.on('darkRise', (data) => {
        if (!data) return;
        let dur = data.duration || 2000;
        window.visualFX.push({
            type: 'dark_rise',
            x: data.x,
            y: data.fromY,
            y2: data.fromY,
            radius: data.toY,
            durationMs: dur,
            life: Math.round(dur / (1000 / 60)),
            maxLife: Math.round(dur / (1000 / 60))
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(dur, 8, true);
    });

    // 🌑 공중 강림
    socket.on('descentStart', (data) => {
        if (!data) return;
        for (let i = 0; i < window.visualFX.length; i++) {
            if (window.visualFX[i].active && window.visualFX[i].type === 'dark_descent') window.visualFX[i].active = false;
        }
        let dur = data.duration || 5000;
        window.visualFX.push({
            type: 'dark_descent',
            x: data.x, y: data.y,
            area: data.area || window.DARK_AREA,
            durationMs: dur,
            life: Math.round(dur / (1000 / 60)),
            maxLife: Math.round(dur / (1000 / 60))
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
            type: 'haki_burst',
            x: data.x, y: data.y,
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
        else if (d.id === 'blackbeard') { if (window.serverBlackbeard) window.serverBlackbeard.burningUntil = Math.max(window.serverBlackbeard.burningUntil || 0, d.until); }
        else if (d.id === 'burgess') { if (window.serverBurgess) window.serverBurgess.burningUntil = Math.max(window.serverBurgess.burningUntil || 0, d.until); }
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
            window.myPlayer.portalDwellUntil = 0;
            window.myPlayer.darkDwellUntil = 0;
            window.myPlayer.crowsPullUntil = 0;
            window.myPlayer.yamiLockUntil = 0; window.myPlayer.yamiBindUntil = 0; window.myPlayer.guraChargeUntil = 0;
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
            window.players[deadId].portalDwellUntil = 0;
            window.players[deadId].darkDwellUntil = 0;
            window.players[deadId].crowsPullUntil = 0;
            window.players[deadId].yamiLockUntil = 0; window.players[deadId].yamiBindUntil = 0; window.players[deadId].guraChargeUntil = 0;
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
            window.myPlayer.portalDwellUntil = 0;
            window.myPlayer.darkDwellUntil = 0;
            window.myPlayer.crowsPullUntil = 0;
            window.myPlayer.yamiLockUntil = 0; window.myPlayer.yamiBindUntil = 0; window.myPlayer.guraChargeUntil = 0;
            window.myPlayer.skill1Dashing = false; window.myPlayer.yataActive = false; window.myPlayer.skill3Active = false; window.myPlayer.isCasting = false; 
            window.myPlayer.elThorLockUntil = 0; window.myPlayer.raigoPullUntil = 0; 
            document.getElementById('death-screen').style.display = 'none'; clearInterval(window.respawnInterval); 
        }
        if (window.players[pData.id]) { 
            window.players[pData.id].isDead = false; window.players[pData.id].hp = pData.hp; 
            window.players[pData.id].maxHp = pData.maxHp;
            snapTo(window.players[pData.id], pData.x, pData.y);
            window.players[pData.id].burningUntil = 0; window.players[pData.id].maguBombUntil = 0; window.players[pData.id].justiceBombUntil = 0;
            window.players[pData.id].electrocutedUntil = 0; 
            window.players[pData.id].lightDashUntil = 0; 
            window.players[pData.id].portalDwellUntil = 0;
            window.players[pData.id].darkDwellUntil = 0;
            window.players[pData.id].crowsPullUntil = 0;
            window.players[pData.id].yamiLockUntil = 0; window.players[pData.id].yamiBindUntil = 0; window.players[pData.id].guraChargeUntil = 0;
            window.players[pData.id].skill1Dashing = false; window.players[pData.id].yataActive = false; window.players[pData.id].skill3Active = false; window.players[pData.id].isCasting = false;
            window.players[pData.id].elThorLockUntil = 0; window.players[pData.id].raigoPullUntil = 0; 
        }
    });

    socket.on('teleport', (pos) => {
        if (!pos) return;
        window.myPlayer.x = pos.x; window.myPlayer.y = pos.y;
        window.myPlayer.vy = 0; window.myPlayer.knockbackForce = 0;
        window.myPlayer.portalDwellUntil = 0;
        window.myPlayer.darkDwellUntil = 0;
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
                elThorLockUntil: window.myPlayer.elThorLockUntil, raigoPullUntil: window.myPlayer.raigoPullUntil,
                crowsPullUntil: window.myPlayer.crowsPullUntil,
                crowsTargetX: window.myPlayer.crowsTargetX, crowsTargetY: window.myPlayer.crowsTargetY,
                guraCdEnd: window.myPlayer.guraCdEnd, yamiCdEnd: window.myPlayer.yamiCdEnd,
                guraChargeUntil: window.myPlayer.guraChargeUntil
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
                window.players[data.id].hasGodEnel = data.hasGodEnel;
                window.players[data.id].hasGura = data.hasGura;
                window.players[data.id].hasYami = data.hasYami;

                if (data.elThorActive !== undefined) window.players[data.id].elThorActive = data.elThorActive;
                if (data.crowsPullUntil !== undefined) window.players[data.id].crowsPullUntil = data.crowsPullUntil;
                if (data.yamiLockUntil !== undefined) window.players[data.id].yamiLockUntil = data.yamiLockUntil;
                if (data.yamiBindUntil !== undefined) window.players[data.id].yamiBindUntil = data.yamiBindUntil;
                if (data.guraChargeUntil !== undefined) window.players[data.id].guraChargeUntil = data.guraChargeUntil;
                if (data.darkBanned !== undefined) window.players[data.id].darkBanned = data.darkBanned;

                window.players[data.id].lastFacing = data.lastFacing;
                let lastHit = window.players[data.id].lastLocalHit || 0;
                if (Date.now() - lastHit > 800) {
                    window.players[data.id].knockbackForce = data.knockbackForce || 0;
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
            if (delta.crowsPullUntil !== undefined) window.players[delta.id].crowsPullUntil = delta.crowsPullUntil; 
            if (delta.yamiLockUntil !== undefined) window.players[delta.id].yamiLockUntil = delta.yamiLockUntil; 
            if (delta.yamiBindUntil !== undefined) window.players[delta.id].yamiBindUntil = delta.yamiBindUntil; 
            if (delta.guraChargeUntil !== undefined) window.players[delta.id].guraChargeUntil = delta.guraChargeUntil; 
            if (delta.darkBanned !== undefined) window.players[delta.id].darkBanned = delta.darkBanned; 
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
            if (delta.hasGodEnel !== undefined) window.players[delta.id].hasGodEnel = delta.hasGodEnel;
            if (delta.hasGura !== undefined) window.players[delta.id].hasGura = delta.hasGura;
            if (delta.hasYami !== undefined) window.players[delta.id].hasYami = delta.hasYami;

            if (delta.elThorActive !== undefined) window.players[delta.id].elThorActive = delta.elThorActive;
            if (delta.yataActive !== undefined) window.players[delta.id].yataActive = delta.yataActive;
            
            let lastHit = window.players[delta.id].lastLocalHit || 0;
            if (Date.now() - lastHit > 800) {
                if (delta.knockbackForce !== undefined) window.players[delta.id].knockbackForce = delta.knockbackForce;
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
        if (Date.now() < (window.myPlayer.elThorLockUntil || 0) || Date.now() < (window.myPlayer.raigoPullUntil || 0) || Date.now() < (window.myPlayer.crowsPullUntil || 0) || Date.now() < (window.myPlayer.yamiBindUntil || 0) || Date.now() < (window.myPlayer.yamiLockUntil || 0)) {
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