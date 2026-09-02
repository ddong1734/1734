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

    // ⏱️ [세계정부] 파시피스타 출격 · 칠무해 부활 카운트다운
    socket.on('pacifCountdown', (d) => {
        if (!d) return;
        window.pacifCountdown = d.spawn || {};
        window.warlordCountdown = d.warlord || {};
    });

    // ⚔️ 칠무해 · 세라핌
    socket.on('syncWarlords', (m) => { window.warlords = m || {}; });
    socket.on('warlordStrike', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'warlord_strike', x: d.x, y: d.y, dir: d.dir, kind: d.kind,
            durationMs: 320, life: 19, maxLife: 19
        });
    });
    socket.on('warlordDown', (d) => {
        if (!d) return;
        window.visualFX.push({ type: 'warlord_down', x: d.x, y: d.y, durationMs: 700, life: 42, maxLife: 42 });
    });

    // 🚢 버스터 콜 군함
    socket.on('syncWarships', (list) => { window.warships = list || []; });
    socket.on('busterCall', (d) => {
        if (d && window.myPlayer && d.team === window.myPlayer.team && typeof window.showAlert === 'function') {
            window.showAlert('🚢 버스터 콜 발동!');
        }
    });
    socket.on('warshipFire', (d) => {
        if (!d) return;
        const ms = (d.kind === 'cannon') ? 900 : 620;
        const lf = Math.max(1, Math.round(ms / (1000 / 60)));
        window.visualFX.push({
            type: 'warship_shot', kind: d.kind,
            x: d.x, y: d.y, tx: d.tx, ty: d.ty,
            durationMs: ms, life: lf, maxLife: lf
        });
    });
    socket.on('warshipDown', (d) => {
        if (!d) return;
        window.visualFX.push({ type: 'warship_down', x: d.x, y: d.y, durationMs: 800, life: 48, maxLife: 48 });
    });

    // 🤖 [파시피스타] 목록 · 레이저 · 파괴
    socket.on('syncPacifistas', (list) => { window.pacifistas = list || []; });
    socket.on('pacifistaLaser', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'pacifista_laser', x: d.x, y: d.y, tx: d.tx, ty: d.ty,
            isMk3: !!d.isMk3, durationMs: 700, life: 42, maxLife: 42
        });
    });
    socket.on('pacifistaDown', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'pacifista_down', x: d.x, y: d.y, isMk3: !!d.isMk3,
            durationMs: 800, life: 48, maxLife: 48
        });
    });
    // 💣 대포 폭발
    socket.on('cannonBlast', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'cannon_blast', x: d.x, y: d.y, radius: d.radius || 220,
            durationMs: 520, life: 31, maxLife: 31
        });
    });

    // ⛓️ [임펠 다운] 수감 문구
    socket.on('impelDown', (d) => {
        const el = document.getElementById('impelBanner');
        if (!el) return;
        el.style.display = 'block';
        clearTimeout(window._impelT);
        window._impelT = setTimeout(function () { el.style.display = 'none'; }, (d && d.ms) || 30000);
    });

    // 🧾 [세계정부] 빼앗긴 쪽 — 부활할 때까지 화면에 남는다
    socket.on('govRobbed', (d) => {
        if (!d) return;
        const box = document.getElementById('robbedBanner');
        if (!box) return;

        const isGold = (d.kind === 'gold');
        const line = document.createElement('div');
        line.dataset.kind = d.kind;
        line.style.cssText =
            'background:rgba(18,14,10,0.94); border:3px solid ' + (isGold ? '#f1c40f' : '#5dade2')
          + '; border-radius:11px; color:' + (isGold ? '#ffe27a' : '#a9dcff')
          + '; font-weight:bold; font-size:18px; padding:11px 22px;'
          + ' box-shadow:0 6px 20px rgba(0,0,0,0.65); white-space:nowrap;';
        line.textContent = isGold
            ? ('💰 사법의 탑의 능력으로 10%의 돈이 빼앗겼습니다 (-'
               + (d.amount || 0).toLocaleString() + ' G)')
            : ('📚 에니에스 로비의 능력으로 10%의 경험치가 빼앗겼습니다 (-'
               + (d.amount || 0) + ')');

        // 같은 종류가 이미 떠 있으면 갈아 끼운다
        const dup = box.querySelector('[data-kind="' + d.kind + '"]');
        if (dup) box.removeChild(dup);
        box.appendChild(line);
        box.style.display = 'flex';

        // 부활하면 사라진다
        clearTimeout(line._t);
        line._t = setTimeout(function () {
            if (line.parentNode) line.parentNode.removeChild(line);
            if (box.children.length === 0) box.style.display = 'none';
        }, (d.ms || 15000));
    });

    // 💰📚 [세계정부] 강탈 알림
    socket.on('govSteal', (d) => {
        if (!d || typeof window.showAlert !== 'function') return;
        window.showAlert(d.kind === 'gold'
            ? ('💰 ' + d.amount.toLocaleString() + ' G 강탈!')
            : ('📚 경험치 ' + d.amount + ' 강탈!'));
    });

    // ⛩️ [정의의 문] 채널링
    socket.on('gateCastStart', (d) => {
        if (!d) return;
        window.gateCasts = window.gateCasts || {};
        window.gateCasts[d.id] = { endAt: Date.now() + (d.durationMs || 5000), x: d.x, y: d.y };
        window.visualFX.push({
            id: d.id, type: 'gate_channel', x: d.x, y: d.y,
            durationMs: d.durationMs || 5000, life: 300, maxLife: 300
        });
    });
    socket.on('gateCastEnd', (d) => {
        if (!d) return;
        if (window.gateCasts) delete window.gateCasts[d.id];
        U.clearFXByType('gate_channel', d.id);

        // 💥 깨졌을 때의 연출.
        //    · 남의 것 : 여기서 그린다
        //    · 내 것   : 보통 클라가 먼저 그리지만(반응 속도),
        //               서버가 먼저 끊은 경우엔 여기서 그려야 빠지지 않는다
        const justDrew = (d.id === window.myId)
                      && (Date.now() - (window._gateBreakAt || 0) < 600);
        if (!d.done && !justDrew && Number.isFinite(d.x)) {
            window.visualFX.push({
                type: 'gate_break', x: d.x, y: d.y,
                durationMs: 480, life: 29, maxLife: 29
            });
        }
        if (d.id === window.myId) {
            // 성공이든 실패든 쿨타임 200초가 돈다
            if (d.done || d.cd) window.myPlayer.gateCdEnd = Date.now() + 200000;
        }
        if (d.done) {
            // ⚠️ 내 좌표는 클라가 들고 있다. 서버가 옮겨도 여기서 직접 반영해야 한다.
            //    (예전엔 서버만 옮겨서 화면에서는 제자리였다)
            if (d.id === window.myId && window.myPlayer) {
                window.myPlayer.x = d.x;
                window.myPlayer.y = d.y;
                window.myPlayer.vy = 0;
                window.myPlayer.knockbackForce = 0;
                window.myPlayer.moveX = 0;
                window.myPlayer.moveY = 0;
            }
            window.visualFX.push({ type: 'gate_warp', x: d.x, y: d.y, durationMs: 700, life: 42, maxLife: 42 });
        }
    });

    // 🏛️ [세계정부] 진영 · 스킬 웹 상태
    socket.on('govSync', (d) => {
        if (!d) return;
        window.govState = { gov: d.gov || {}, tree: d.tree || {} };
        // 넥서스 렌더링이 govType 을 보므로 함께 갱신한다
        if (window.serverBases) {
            if (window.serverBases[1]) window.serverBases[1].govType = (d.gov && d.gov[1]) || 'none';
            if (window.serverBases[2]) window.serverBases[2].govType = (d.gov && d.gov[2]) || 'none';
        }
        const m = document.getElementById('govModal');
        if (m && m.style.display === 'flex' && typeof window.renderGovTree === 'function') {
            window.renderGovTree();
        }
    });

    // 🕶️ [암매상] 위치 · 할인율 · 다음 갱신 시각
    socket.on('blackMarketSync', (d) => {
        if (!d) return;
        window.blackMarket = {
            x: d.x, y: d.y,
            discounts: d.discounts || {},
            nextRollAt: d.nextRollAt || 0
        };
        if (typeof window.renderBlackMarketUI === 'function') window.renderBlackMarketUI();
    });


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
        // 🗡️ [수정] 4번 스킬 아이템의 장착 여부가 바뀌면 스킬 버튼을 다시 그려야 한다.
        //    기존에는 Object.assign 만 하고 applySkillNames() 를 부르지 않아서,
        //    '세계를 가르는 참격'을 장착해도 4번 버튼이 나타나지 않았다.
        let prevCleave = !!window.myPlayer.hasWorldCleave;
        let prevYumyeong = !!window.myPlayer.hasYumyeong;

        Object.assign(window.myPlayer, data);

        if (prevCleave !== !!window.myPlayer.hasWorldCleave
            || prevYumyeong !== !!window.myPlayer.hasYumyeong) {
            if (typeof window.applySkillNames === 'function') window.applySkillNames();
        }

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
        const COPY = ['hp','maxHp','isGolden','isHaeru','state','frozenUntil','electrocutedUntil','airFreezeUntil',
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

    // 🔥 저주의 왕 포탈 대기 카운트다운
    //    암흑 포탈과 동시에 열릴 수 있어 대기 필드를 따로 쓴다.
    socket.on('curseDwell', (d) => {
        if (!d) return;
        let until = U.capUntil(d.until);
        if (d.id === window.myId) window.myPlayer.curseDwellUntil = until;
        if (window.players[d.id]) window.players[d.id].curseDwellUntil = until;
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