// 파일명: core/netWorld.js
// ============================================================================
// 🌍 월드 · 상점 · 투사체 · 몬스터 · 포탈
//
//   · syncBases        : 넥서스 체력
//   · syncDetectors    : 탐지기 (채굴 상자)
//   · syncTeamStorage  : 팀 보관함
//   · goldenDrop / updateGold / buySuccess / buyFail : 상점 · 골드
//   · syncProjectiles / syncShockwaves : 투사체 · 충격파
//   · syncMagmas / magmaImpact         : 🌋 마그마
//   · syncMantleBolts / mantraImpact / mantleExplosion : ⚡ 만뢰
//   · monsterUpdate / syncOkras        : 할배새끼 · 오크라
//   · setBurn / userFroze / monsterFroze : 상태이상
//   · 포탈 3종 (기지 귀환 · 암흑 왕좌 · 검은수염) + 대기 카운트다운
//   · teleport         : 순간이동
// ============================================================================

window.registerNetModule('world', function (socket, U) {

    // ── 🏰 넥서스 ────────────────────────────────────────────────────
    socket.on('syncBases', (b) => { window.serverBases = b; });

    // ── ⛏️ 탐지기 (채굴 상자) ───────────────────────────────────────
    socket.on('syncDetectors', (ds) => {
        window.serverDetectors = ds;
        if (document.getElementById('chestModal').style.display === 'flex'
            && typeof window.renderChestUI === 'function') window.renderChestUI();
        if (document.getElementById('smithModal').style.display === 'flex'
            && typeof window.renderSmithUI === 'function') window.renderSmithUI();
    });

    // ── 📦 팀 보관함 ────────────────────────────────────────────────
    socket.on('syncTeamStorage', (storages) => {
        window.currentTeamStorage = storages[window.myPlayer.team] || [];
        if (document.getElementById('storageModal').style.display === 'flex'
            && typeof window.renderStorageUI === 'function') window.renderStorageUI();
    });

    // ── 💰 황금 획득 알림 ───────────────────────────────────────────
    socket.on('goldenDrop', (data) => {
        if (!data) return;
        if (data.inventory) {
            window.myPlayer.inventory = data.inventory;
            if (window.myId && window.players[window.myId]) window.players[window.myId].inventory = data.inventory;
            if (document.getElementById('storageModal').style.display === 'flex'
                && typeof window.renderStorageUI === 'function') window.renderStorageUI();
            if (document.getElementById('smithModal').style.display === 'flex'
                && typeof window.renderSmithUI === 'function') window.renderSmithUI();
        }
        if (typeof window.showGoldenMsg === 'function') window.showGoldenMsg(data.msg, !!data.fail);
    });

    // ── 💰 골드 · 구매 ──────────────────────────────────────────────
    socket.on('updateGold', (g) => {
        document.getElementById('myGold').innerText = g;
        document.getElementById('shopGoldDisplay').innerText = g;
    });

    socket.on('buyFail', (msg) => {
        if (typeof window.showAlertMsg === 'function') window.showAlertMsg(msg);
    });

    socket.on('buySuccess', (data) => {
        Object.assign(window.myPlayer, data);
        document.getElementById('myGold').innerText = data.gold;
        document.getElementById('shopGoldDisplay').innerText = data.gold;
        if (document.getElementById('storageModal').style.display === 'flex'
            && typeof window.renderStorageUI === 'function') window.renderStorageUI();
        if (document.getElementById('chestModal').style.display === 'flex'
            && typeof window.renderChestUI === 'function') window.renderChestUI();
        if (document.getElementById('smithModal').style.display === 'flex'
            && typeof window.renderSmithUI === 'function') window.renderSmithUI();
    });

    // ── 🎯 투사체 ───────────────────────────────────────────────────
    socket.on('syncProjectiles', (projs) => { window.serverProjectiles = projs; });

    // ── 💨 충격파 (로컬 디트로이트는 보존한다) ──────────────────────
    socket.on('syncShockwaves', (waves) => {
        let locals = window.serverShockwaves.filter(w => w.id === 'local_detroit');
        waves.forEach(w => {
            let prev = window.serverShockwaves.find(p => p.id === w.id);
            if (prev) {
                // 서버 값이 뒤로 되돌아가면 클라 예측 위치를 유지한다
                if ((w.dir === 1 && prev.x > w.x) || (w.dir === -1 && prev.x < w.x)) w.x = prev.x;
            }
            if (w.type === 'detroit') locals = locals.filter(l => !(l.dir === w.dir && Math.abs(l.y - w.y) < 50));
        });
        window.serverShockwaves = waves.concat(locals);
    });

    // ── 🌋 마그마 ───────────────────────────────────────────────────
    socket.on('syncMagmas', (ms2) => { window.serverMagmas = ms2; });
    socket.on('magmaImpact', (data) => {
        window.visualFX.push({ type: 'magma_impact', x: data.x, y: data.y, life: 22, maxLife: 22 });
    });

    // ── ⚡ 만뢰 낙뢰 ────────────────────────────────────────────────
    socket.on('syncMantleBolts', (mbs) => { window.serverMantleBolts = mbs; });
    socket.on('mantraImpact', (data) => {
        window.visualFX.push({ type: 'mantra_impact', x: data.x, y: data.y, life: 18, maxLife: 18 });
    });
    socket.on('mantleExplosion', (data) => {
        window.visualFX.push({
            type: 'mantle_explosion', x: data.x, y: data.y,
            life: 18, maxLife: 18, hasArkMaxim: data.hasArkMaxim
        });
    });

    // ── 🐗 할배새끼 보스 ────────────────────────────────────────────
    socket.on('monsterUpdate', (delta) => {
        if (!window.serverMonster) { window.serverMonster = delta; return; }
        const m = window.serverMonster;
        const COPY = ['hp','state','frozenUntil','electrocutedUntil','airFreezeUntil','raigoPullUntil',
                      'burningUntil','maguBombUntil','justiceBombUntil',
                      'kashimoCharge','kashimoChargeUntil'];
        for (let i = 0; i < COPY.length; i++) { let k = COPY[i]; if (delta[k] !== undefined) m[k] = delta[k]; }

        // 로컬 타격 직후 800ms 는 서버 좌표를 무시해 튐을 막는다
        let lastHit = m.lastLocalHit || 0;
        if (Date.now() - lastHit > 800) {
            if (delta.knockbackForce !== undefined) m.knockbackForce = delta.knockbackForce;
            if (delta.x !== undefined && Number.isFinite(delta.x)) m.x = delta.x;
            if (delta.y !== undefined && Number.isFinite(delta.y)) m.y = delta.y;
        }
    });

    // ── 🥬 오크라 ───────────────────────────────────────────────────
    socket.on('syncOkras', (deltaOkras) => {
        if (window.serverOkras.length === 0) {
            window.serverOkras = deltaOkras.map(o => ({ ...o }));
            return;
        }
        const COPY = ['hp','maxHp','isGolden','state','frozenUntil','electrocutedUntil','airFreezeUntil',
                      'raigoPullUntil','burningUntil','maguBombUntil','justiceBombUntil',
                      'kashimoCharge','kashimoChargeUntil'];
        deltaOkras.forEach(delta => {
            let ex = window.serverOkras.find(o => o.id === delta.id);
            if (!ex) { window.serverOkras.push({ ...delta }); return; }
            for (let i = 0; i < COPY.length; i++) { let k = COPY[i]; if (delta[k] !== undefined) ex[k] = delta[k]; }
            let lastHit = ex.lastLocalHit || 0;
            if (Date.now() - lastHit > 800) {
                if (delta.knockbackForce !== undefined) ex.knockbackForce = delta.knockbackForce;
                if (delta.x !== undefined && Number.isFinite(delta.x)) ex.x = delta.x;
                if (delta.y !== undefined && Number.isFinite(delta.y)) ex.y = delta.y;
            }
        });
    });

    // ── 🔥 화상 · ❄️ 빙결 ──────────────────────────────────────────
    socket.on('setBurn', (d) => {
        if (!d) return;
        if (d.id === window.myId) {
            window.myPlayer.burningUntil = Math.max(window.myPlayer.burningUntil || 0, d.until);
            return;
        }
        if (window.players[d.id]) {
            window.players[d.id].burningUntil = Math.max(window.players[d.id].burningUntil || 0, d.until);
            return;
        }
        if (d.id === 'monster') {
            if (window.serverMonster) window.serverMonster.burningUntil = Math.max(window.serverMonster.burningUntil || 0, d.until);
        } else if (d.id === 'hinbeom') {
            if (window.serverHinbeom) window.serverHinbeom.burningUntil = Math.max(window.serverHinbeom.burningUntil || 0, d.until);
        } else if (d.id === 'blackbeard') {
            if (window.serverBlackbeard) window.serverBlackbeard.burningUntil = Math.max(window.serverBlackbeard.burningUntil || 0, d.until);
        } else if (d.id === 'burgess') {
            if (window.serverBurgess) window.serverBurgess.burningUntil = Math.max(window.serverBurgess.burningUntil || 0, d.until);
        } else if (typeof d.id === 'string' && d.id.indexOf('minion_') === 0) {
            let mn = window.serverMinions.find(m => m.id === parseInt(d.id.slice(7)));
            if (mn) mn.burningUntil = Math.max(mn.burningUntil || 0, d.until);
        } else if (typeof d.id === 'string' && d.id.indexOf('okra_') === 0) {
            let ok = window.serverOkras.find(o => o.id === parseInt(d.id.slice(5)));
            if (ok) ok.burningUntil = Math.max(ok.burningUntil || 0, d.until);
        }
    });

    socket.on('userFroze', (tid) => {
        if (tid === window.myId && !window.myPlayer.isDead) {
            window.myPlayer.frozenUntil = Math.max(window.myPlayer.frozenUntil || 0, Date.now() + 2000);
        }
    });

    socket.on('monsterFroze', () => {
        if (window.serverMonster) {
            window.serverMonster.frozenUntil = Math.max(window.serverMonster.frozenUntil || 0, Date.now() + 2000);
        }
    });

    // ── 🌀 포탈 3종 ─────────────────────────────────────────────────
    socket.on('syncHinbeomPortal', (pt) => { window.serverHinbeomPortal = pt || null; });
    socket.on('syncDarkPortal', (pt) => { window.serverDarkPortal = pt || null; });
    socket.on('syncBlackbeardPortal', (pt) => { window.serverBlackbeardPortal = pt || null; });

    // 🌀 기지 귀환 포탈 대기 카운트다운
    socket.on('portalDwell', (d) => {
        if (!d) return;
        let until = U.capUntil(d.until);
        if (d.id === window.myId) window.myPlayer.portalDwellUntil = until;
        if (window.players[d.id]) window.players[d.id].portalDwellUntil = until;
    });

    // 🟣 암흑 왕좌 포탈 대기 카운트다운
    socket.on('darkDwell', (d) => {
        if (!d) return;
        let until = U.capUntil(d.until);
        if (d.id === window.myId) window.myPlayer.darkDwellUntil = until;
        if (window.players[d.id]) window.players[d.id].darkDwellUntil = until;
    });

    // ── 🌀 순간이동 ─────────────────────────────────────────────────
    socket.on('teleport', (pos) => {
        if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
        window.myPlayer.x = pos.x; window.myPlayer.y = pos.y;
        window.myPlayer.vy = 0; window.myPlayer.knockbackForce = 0;
        window.myPlayer.portalDwellUntil = 0; window.myPlayer.darkDwellUntil = 0;
        if (window.myId && window.players[window.myId]) {
            U.snapTo(window.players[window.myId], pos.x, pos.y);
            window.players[window.myId].portalDwellUntil = 0;
            window.players[window.myId].darkDwellUntil = 0;
        }
        window._lastSentPos = { x: pos.x, y: pos.y };
    });
});