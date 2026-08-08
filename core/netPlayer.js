// 파일명: core/netPlayer.js
// ============================================================================
// 🧍 플레이어 동기화 · 사망/부활 · 피해/회복 · 이펙트
//
//   · syncPlayerFull  : 내 캐릭터 / 원격 캐릭터 전체 동기화
//   · enemyUpdate     : 원격 캐릭터 델타 동기화
//   · statusUpdate    : 상태이상 갱신
//   · player_died / player_respawned / playerLeft / levelUp
//   · takeDamage / bossHit / sphereHit / heal / floatingText
//   · actionEffect    : 평타 · 스킬 이펙트
//   · yataStart / yataEnd / borsLightDash : 볼사리노 이동기
//
//   ⚡🌋 주력 방출 중에는 이동 · 스킬 · 평타가 봉인된다 (surgeLockUntil).
//   ⚡🔮 환수호박 중에는 모든 회복이 무효다.
// ============================================================================

window.registerNetModule('player', function (socket, U) {

    // ── 🩺 상태이상 갱신 ────────────────────────────────────────────
    socket.on('statusUpdate', (d) => {
        if (!d) return;
        let t = (d.id === window.myId) ? window.myPlayer : window.players[d.id];
        if (!t) return;
        if (d.frozenUntil !== undefined) t.frozenUntil = U.capUntil(d.frozenUntil);
        if (d.electrocutedUntil !== undefined) t.electrocutedUntil = U.capUntil(d.electrocutedUntil);
        if (d.airFreezeUntil !== undefined) t.airFreezeUntil = U.capUntil(d.airFreezeUntil);
        if (d.burningUntil !== undefined) t.burningUntil = U.capUntil(d.burningUntil);
        if (d.maguBombUntil !== undefined) t.maguBombUntil = U.capUntil(d.maguBombUntil);
        if (d.justiceBombUntil !== undefined) t.justiceBombUntil = U.capUntil(d.justiceBombUntil);
        // ⚡ 전하 스택도 함께 실려 온다
        if (d.kashimoCharge !== undefined) t.kashimoCharge = d.kashimoCharge;
        if (d.kashimoChargeUntil !== undefined) t.kashimoChargeUntil = d.kashimoChargeUntil;
    });

    // ── 🔄 전체 동기화 ──────────────────────────────────────────────
    socket.on('syncPlayerFull', (data) => {
        if (!data) return;

        // ── 내 캐릭터 ────────────────────────────────────────────────
        if (data.id === window.myId) {
            const my = window.myPlayer;
            let prevAmber = !!my.amberActive;

            // 🛟 로컬이 관리해야 하는 값은 서버 값으로 덮이지 않게 보존한다
            let localState = {
                x: my.x, y: my.y, vy: my.vy,
                moveX: my.moveX, moveY: my.moveY,
                jumpCount: my.jumpCount, lastFacing: my.lastFacing,
                skill1Dashing: my.skill1Dashing, dashDir: my.dashDir,
                dashLockUntil: my.dashLockUntil,
                castLockUntil: my.castLockUntil,
                knockbackForce: my.knockbackForce,
                lightDashUntil: my.lightDashUntil, lightDashDir: my.lightDashDir,
                yataCanceling: my.yataCanceling,
                elThorLockUntil: my.elThorLockUntil, raigoPullUntil: my.raigoPullUntil,
                crowsPullUntil: my.crowsPullUntil,
                crowsTargetX: my.crowsTargetX, crowsTargetY: my.crowsTargetY,
                guraCdEnd: my.guraCdEnd, yamiCdEnd: my.yamiCdEnd,
                guraChargeUntil: my.guraChargeUntil,
                yamiLockUntil: my.yamiLockUntil, yamiBindUntil: my.yamiBindUntil,
                // ⚡ 카시모 로컬 쿨타임
                kashimoBoltCdEnd: my.kashimoBoltCdEnd,
                surgeCdEnd: my.surgeCdEnd,
                waveCdEnd: my.waveCdEnd,
                sonicCdEnd: my.sonicCdEnd,
                amberCdEnd: my.amberCdEnd,
                cd1: my.cd1, cd2: my.cd2, cd3: my.cd3,
                _cliStuckSince: my._cliStuckSince,
                _offlineSince: my._offlineSince
            };

            let srvCasting = !!data.isCasting;
            Object.assign(my, data);
            Object.assign(my, localState);

            // 🛟 서버가 isCasting=true 를 보내도 '근거'가 없으면 거부한다
            let nowSync = Date.now();
            let hasReason = (my.yataActive && my.yataPath)
                         || nowSync < (my.castLockUntil || 0)
                         || my.skill1Dashing;
            my.isCasting = (srvCasting && hasReason);

            // ⚡🔮 환수호박 상태가 바뀌었다면 오라와 스킬 버튼을 갱신한다
            if (prevAmber !== !!my.amberActive) {
                if (my.amberActive) U.startAmberFX(window.myId); else U.clearAmberFX(window.myId);
                if (typeof window.applySkillNames === 'function') window.applySkillNames();
            }

            if (window.players[window.myId]) Object.assign(window.players[window.myId], my);

            let gEl = document.getElementById('myGold');
            if (gEl && gEl.innerText != data.gold) gEl.innerText = data.gold;
            let sgEl = document.getElementById('shopGoldDisplay');
            if (sgEl && sgEl.innerText != data.gold) sgEl.innerText = data.gold;
            return;
        }

        // ── 원격 캐릭터 ──────────────────────────────────────────────
        let t = window.players[data.id];
        if (!t) {
            window.players[data.id] = U.initNet(data);
            if (data.amberActive) U.startAmberFX(data.id);
            return;
        }

        let prevAmber = !!t.amberActive;

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
        // ⚡ 카시모
        if (data.kashimoCharge !== undefined) t.kashimoCharge = data.kashimoCharge;
        if (data.kashimoChargeUntil !== undefined) t.kashimoChargeUntil = data.kashimoChargeUntil;
        if (data.surgeActive !== undefined) t.surgeActive = data.surgeActive;
        if (data.surgeEnd !== undefined) t.surgeEnd = data.surgeEnd;
        if (data.surgeLockUntil !== undefined) t.surgeLockUntil = data.surgeLockUntil;
        if (data.amberActive !== undefined) t.amberActive = data.amberActive;
        if (data.sonicChargeUntil !== undefined) t.sonicChargeUntil = data.sonicChargeUntil;

        // ⚡🔮 다른 플레이어의 환수호박 오라 동기화
        if (prevAmber !== !!t.amberActive) {
            if (t.amberActive) U.startAmberFX(data.id); else U.clearAmberFX(data.id);
        }

        t.lastFacing = data.lastFacing;
        let lastHit = t.lastLocalHit || 0;
        if (Date.now() - lastHit > 800) {
            t.knockbackForce = data.knockbackForce || 0;
            U.setNetTarget(t, data.x, data.y);
        }
    });

    // ── 🔄 원격 캐릭터 델타 동기화 ──────────────────────────────────
    const ENEMY_COPY = [
        'hp','maxHp','skill2EndTime','isCasting','isDead','level','xp','maxXp',
        'frozenUntil','electrocutedUntil','airFreezeUntil','raigoPullUntil',
        'crowsPullUntil','yamiLockUntil','yamiBindUntil','guraChargeUntil','darkBanned',
        'burningUntil','maguBombUntil','justiceBombUntil','characterType',
        'hasJusticeCoat','hasPika','hasHie','hasMagu','hasKizaru','hasAokiji','hasAkainu',
        'hasGoro','hasArkMaxim','hasGodEnel','hasGura','hasYami',
        'elThorActive','yataActive',
        // ⚡ 카시모
        'kashimoCharge','kashimoChargeUntil',
        'surgeActive','surgeEnd','surgeLockUntil',
        'amberActive','sonicChargeUntil'
    ];

    socket.on('enemyUpdate', (delta) => {
        if (!delta) return;
        let t = window.players[delta.id];
        if (!t) {
            window.players[delta.id] = U.initNet(delta);
            if (delta.amberActive) U.startAmberFX(delta.id);
            return;
        }

        let prevAmber = !!t.amberActive;

        for (let i = 0; i < ENEMY_COPY.length; i++) {
            let k = ENEMY_COPY[i];
            if (delta[k] !== undefined) t[k] = delta[k];
        }

        // ⚡🔮 환수호박 오라 동기화
        if (prevAmber !== !!t.amberActive) {
            if (t.amberActive) U.startAmberFX(delta.id); else U.clearAmberFX(delta.id);
        }

        let lastHit = t.lastLocalHit || 0;
        if (Date.now() - lastHit > 800) {
            if (delta.knockbackForce !== undefined) t.knockbackForce = delta.knockbackForce;
            U.setNetTarget(t, delta.x, delta.y);
            if (delta.lastFacing !== undefined) t.lastFacing = delta.lastFacing;
        }
    });

    // ── ☠️ 사망 ─────────────────────────────────────────────────────
    socket.on('player_died', (deadId) => {
        // 🎇 카시모 지속 이펙트 정리
        U.clearSurgeFX(deadId);
        U.clearAmberFX(deadId);
        U.clearAmberTrailFX(deadId);

        if (deadId === window.myId) {
            const p = window.myPlayer;
            p.isDead = true;
            U.releaseAllLocks(null);
            p.yataCanceling = false;
            p.burningUntil = 0; p.maguBombUntil = 0; p.justiceBombUntil = 0;
            p.portalDwellUntil = 0; p.darkDwellUntil = 0;
            p.kashimoCharge = 0; p.kashimoChargeUntil = 0;
            // ⚡🌋 주력 방출 (고정 포함) 초기화
            p.surgeActive = false; p.surgeEnd = 0; p.surgeLockUntil = 0;
            // ⚡🔮 죽으면 환수호박이 풀리고 3번 스킬이 다시 생겨난다
            p.amberActive = false;
            p.amberCdEnd = 0;
            p.cd1 = 0; p.cd2 = 0; p.cd3 = 0;
            if (typeof window.applySkillNames === 'function') window.applySkillNames();

            document.getElementById('death-screen').style.display = 'flex';
            let timeLeft = 15;
            document.getElementById('respawn-timer').innerText = timeLeft;
            clearInterval(window.respawnInterval);
            window.respawnInterval = setInterval(() => {
                timeLeft--;
                document.getElementById('respawn-timer').innerText = timeLeft;
                if (timeLeft <= 0) clearInterval(window.respawnInterval);
            }, 1000);
            return;
        }

        let t = window.players[deadId];
        if (!t) return;
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
        t.surgeActive = false; t.surgeEnd = 0; t.surgeLockUntil = 0;
        t.amberActive = false; t.sonicChargeUntil = 0;
    });

    // ── 💫 부활 ─────────────────────────────────────────────────────
    socket.on('player_respawned', (pData) => {
        if (!pData) return;
        U.clearSurgeFX(pData.id);
        U.clearAmberFX(pData.id);

        if (pData.id === window.myId) {
            const p = window.myPlayer;
            p.isDead = false;
            p.hp = pData.hp; p.maxHp = pData.maxHp;
            if (Number.isFinite(pData.x)) p.x = pData.x;
            if (Number.isFinite(pData.y)) p.y = pData.y;
            p.vy = 0; p.knockbackForce = 0;
            U.releaseAllLocks(null);
            p.burningUntil = 0; p.maguBombUntil = 0; p.justiceBombUntil = 0;
            p.portalDwellUntil = 0; p.darkDwellUntil = 0;
            p.kashimoCharge = 0; p.kashimoChargeUntil = 0;
            p.surgeActive = false; p.surgeEnd = 0; p.surgeLockUntil = 0;
            // ⚡🔮 부활 시 환수호박 완전 해제 (3번 스킬 사용 가능)
            p.amberActive = false; p.amberCdEnd = 0;
            p.cd3 = 0;
            if (typeof window.applySkillNames === 'function') window.applySkillNames();

            window._lastSentPos = { x: p.x, y: p.y };
            document.getElementById('death-screen').style.display = 'none';
            clearInterval(window.respawnInterval);
        }

        let t = window.players[pData.id];
        if (!t) return;
        t.isDead = false; t.hp = pData.hp; t.maxHp = pData.maxHp;
        U.snapTo(t, pData.x, pData.y);
        t.burningUntil = 0; t.maguBombUntil = 0; t.justiceBombUntil = 0;
        t.electrocutedUntil = 0; t.lightDashUntil = 0;
        t.portalDwellUntil = 0; t.darkDwellUntil = 0;
        t.crowsPullUntil = 0;
        t.yamiLockUntil = 0; t.yamiBindUntil = 0; t.guraChargeUntil = 0;
        t.skill1Dashing = false; t.yataActive = false; t.skill3Active = false; t.isCasting = false;
        t.elThorLockUntil = 0; t.raigoPullUntil = 0;
        t.kashimoCharge = 0; t.kashimoChargeUntil = 0;
        t.surgeActive = false; t.surgeEnd = 0; t.surgeLockUntil = 0;
        t.amberActive = false; t.sonicChargeUntil = 0;
    });

    // ── 🚪 퇴장 ─────────────────────────────────────────────────────
    socket.on('playerLeft', (id) => {
        U.clearSurgeFX(id);
        U.clearAmberFX(id);
        U.clearAmberTrailFX(id);
        delete window.players[id];
    });

    // ── ⭐ 레벨업 ───────────────────────────────────────────────────
    socket.on('levelUp', (targetId) => {
        let t = window.players[targetId];
        window.visualFX.push({
            type: 'levelup', targetId: targetId,
            life: 60, maxLife: 60,
            x: t ? t.x : 0, y: t ? t.y : 0
        });
    });

    // ── 💢 피해 ─────────────────────────────────────────────────────
    socket.on('takeDamage', (dmg) => {
        if (window.myPlayer.isDead) return;
        if (!Number.isFinite(dmg)) return;
        window.myPlayer.hp -= dmg;
        if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
    });

    socket.on('sphereHit', (dmg) => {
        if (window.myPlayer.isDead) return;
        window.myPlayer.hp -= dmg;
        window.myPlayer.slowNerfUntil = Date.now() + 500;
        window.myPlayer.jumpNerfUntil = Date.now() + 500;
        if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
    });

    // 💢 넉백을 동반한 피해 — 경직 중에는 넉백을 무시한다
    socket.on('bossHit', (data) => {
        const p = window.myPlayer;
        if (p.isDead) return;
        if (!data || !Number.isFinite(data.damage)) return;

        p.hp -= data.damage;
        const now = Date.now();

        // 시전 고정 중에는 넉백을 적용하지 않는다
        if (p.isCasting && (p.characterType === 'BORSALINO' || p.iceAgeActive)) {
            if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
            return;
        }
        if (now < (p.elThorLockUntil || 0) || now < (p.raigoPullUntil || 0)
            || now < (p.crowsPullUntil || 0) || now < (p.yamiBindUntil || 0)
            || now < (p.yamiLockUntil || 0) || now < (p.guraChargeUntil || 0)
            || now < (p.sonicChargeUntil || 0)          // ⚡🔮 음파 응축
            || now < (p.surgeLockUntil || 0)) {         // ⚡🌋 주력 방출 고정
            if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
            return;
        }

        let kb = Number.isFinite(data.kb) ? data.kb : 0;
        p.vy = Math.abs(kb) > 100 ? (-25 * window.ms)
             : (Math.abs(kb) > 30 ? (-18 * window.ms) : (-12 * window.ms));
        p.knockbackForce = kb * window.ms;
        if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
    });

    // ── 💚 회복 ─────────────────────────────────────────────────────
    socket.on('heal', (amt) => {
        const p = window.myPlayer;
        if (p.isDead) return;
        // ⚡🔮 환수호박 중에는 모든 회복이 무효다 (서버에서도 차단하지만 이중 방어)
        if (p.amberActive) return;
        p.hp = Math.min(p.maxHp, p.hp + amt);
        window.visualFX.push({
            x: p.x, y: p.y - 50, life: 30, maxLife: 30,
            type: 'heal', val: Math.round(amt)
        });
    });

    // ── 💬 떠오르는 숫자 ────────────────────────────────────────────
    socket.on('floatingText', (data) => {
        if (!data) return;
        let type = data.type;
        // 내 위치에서 뜬 피해는 색을 달리해 구분한다
        if (type === 'damage' && Math.abs(data.x - window.myPlayer.x) < 5) type = 'my_damage';
        window.visualFX.push({
            x: data.x, y: data.y, life: 30, maxLife: 30,
            type: type, val: data.val
        });
    });

    // ── ✨ 평타 · 스킬 이펙트 ───────────────────────────────────────
    const EFFECT_LIFE = {
        'ama_no_murakumo': 15,
        'ice_glove': 12,
        'magma_punch': 14,
        'punch': 12,
        'thunder_bolt': 10,
        'kashimo_strike': 13      // ⚡ 카시모 평타
    };
    // 내가 쓴 것이어도 반드시 그려야 하는 (서버 권위) 이펙트
    const ALWAYS_SHOW = ['borsalino_beam', 'yata_mirror_path', 'yata_explosion',
                         'ice_age', 'kizaru_gates', 'el_thor', 'raigo_telegraph', 'raigo'];

    socket.on('actionEffect', (data) => {
        if (!data) return;

        if (EFFECT_LIFE[data.type] !== undefined) {
            data.life = data.life || EFFECT_LIFE[data.type];
            data.maxLife = data.maxLife || EFFECT_LIFE[data.type];
        }
        else if (data.type === 'borsalino_beam') { data.life = 20; data.maxLife = 20; }
        else if (data.type === 'yata_mirror_path') { data.life = 22; data.maxLife = 22; }
        else if (data.type === 'yata_explosion') { data.life = 30; data.maxLife = 30; }
        else if (data.type === 'ice_age') { data.life = 60; data.maxLife = 60; }
        else if (data.type === 'kizaru_gates') { data.life = 9999; data.maxLife = 9999; }
        else if (data.type === 'el_thor') { data.life = data.lifeFrames || 120; data.maxLife = data.lifeFrames || 120; }
        else if (data.type === 'raigo_telegraph') { data.life = data.lifeFrames || 30; data.maxLife = data.lifeFrames || 30; }
        else if (data.type === 'raigo') { data.life = data.lifeFrames || 240; data.maxLife = data.lifeFrames || 240; }

        if (data.durationMs) data.endAt = Date.now() + data.durationMs;

        // 내가 쓴 평타는 이미 로컬에서 그렸으므로 중복 생성하지 않는다
        if (data.id !== window.myId || ALWAYS_SHOW.includes(data.type)) {
            window.visualFX.push(data);
        }
    });

    // ── ✨ 볼사리노 야타의 거울 ─────────────────────────────────────
    socket.on('yataStart', (data) => {
        if (!data) return;
        let path = data.path;

        if (data.id === window.myId) {
            const p = window.myPlayer;
            // 🛟 경로가 없으면 잠금을 걸지 않는다 (영구 잠금 차단)
            if (!path || path.length < 2) {
                p.yataActive = false; p.yataPath = null;
                p.isCasting = false; p.castLockUntil = 0;
                return;
            }
            p.yataActive = true;
            p.yataCanceling = false;
            p.yataPath = path;
            p.yataStartTime = Number.isFinite(data.startTime) ? data.startTime : Date.now();
            p.yataProgress = 0;
            p.isCasting = true;
            p.castLockUntil = Date.now() + (data.duration || 3000) + 2000;
        } else if (window.players[data.id]) {
            window.players[data.id].yataActive = true;
            window.players[data.id].yataPath = path;
            window.players[data.id].yataStartTime = data.startTime;
        }

        window.visualFX.push({
            type: 'yata_mirror_path', path: path, ownerId: data.id,
            life: U.frames(data.duration), maxLife: U.frames(data.duration)
        });
    });

    socket.on('yataEnd', (data) => {
        if (!data) return;
        if (data.id === window.myId) {
            const p = window.myPlayer;
            p.yataActive = false;
            p.yataCanceling = false;
            p.yataPath = null;
            p.isCasting = false;
            p.castLockUntil = 0;
            if (Number.isFinite(data.x)) p.x = data.x;
            if (Number.isFinite(data.y)) p.y = data.y;
            p.vy = 0; p.knockbackForce = 0;
        } else if (window.players[data.id]) {
            window.players[data.id].yataActive = false;
            window.players[data.id].yataPath = null;
            U.snapTo(window.players[data.id], data.x, data.y);
        }
        U.clearFXByType('yata_mirror_path', data.id);
    });

    // ── ✨ 볼사리노 빛 돌진 (원격 표시용) ───────────────────────────
    socket.on('borsLightDash', (data) => {
        if (!data || data.id === window.myId) return;
        let dur = data.duration || 220;
        if (window.players[data.id]) {
            window.players[data.id].lightDashUntil = Date.now() + dur;
            window.players[data.id].lightDashDir = data.dir || 1;
        }
    });
});