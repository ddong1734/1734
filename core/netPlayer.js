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
//   ⚡🔮 전격 돌진(amberDashUntil) 중에는 넉백이 무시된다.
//   ⬛ 다부라 : 빛 시전 / 발차기 응축·활공 중에는 넉백이 무시된다.
//   🗣️ NPC 대화 중에는 이동 · 점프 · 평타 · 스킬이 전부 봉인된다.
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
    const ENEMY_COPY = [
        'hp','maxHp','skill2EndTime','isCasting','isDead','level','xp','maxXp',
        'frozenUntil','electrocutedUntil','airFreezeUntil','raigoPullUntil',
        'crowsPullUntil','yamiLockUntil','yamiBindUntil','guraChargeUntil','darkBanned',
        'burningUntil','maguBombUntil','justiceBombUntil','characterType',
        'hasJusticeCoat','hasPika','hasHie','hasMagu','hasKizaru','hasAokiji','hasAkainu',
        'hasGoro','hasArkMaxim','hasGodEnel','hasGura','hasYami',
        'hasSquare',
        'elThorActive','yataActive',
        // ⚡ 카시모
        'kashimoCharge','kashimoChargeUntil',
        'surgeActive','surgeEnd','surgeLockUntil',
        'amberActive','sonicChargeUntil',
        // ⬛ 다부라
        'dLightActive','dLightEnd','dLightRiseUntil',
        'dDarkActive','dDarkEnd',
        'dKickCharging','dKickChargeEnd','dKickFlying','dKickFlyEnd',
        // 🗣️ NPC 대화 / 퀘스트 (원격 표시용)
        'npcTalking','tichStage',
        // ⚠️ [중요] 여기 빠진 필드는 '남의 화면에서만' 안 보인다.
        //    새 캐릭터를 추가할 때마다 반드시 이 목록에도 넣어야 한다.
        // ⚔️ 다이도
        'stunUntil','bleedUntil',
        'daidoFury','daidoFuryEnd','daidoRush','daidoRushEnd','daidoIaiAt',
        // 🕊️ 쿠루스
        'holyPower','extraLives','kurusuGliding','ladderLockUntil',
        'ladderCastEnd','ladderBeamEnd','ladderCharged',
        // 🔥 마르코
        'marcoGauge','marcoRegenUntil','marcoCastEnd','marcoInvUntil',
        'marcoShieldEnd','marcoShieldX','marcoShieldY',
        'marcoShieldDX','marcoShieldDY','marcoShieldRY',
        // 🧲 키드
        'kidStack','kidSlow','kidJumpCut','kidHoldUntil','kidFieldUntil',
        'kidLaserCastEnd','kidLaserFireEnd','kidLaserAngle','kidLaserX','kidLaserY',
        'kidGolemCastEnd','kidGolemEnd','kidSwingAt',
        // 🌀 포탈 대기 카운트다운 · ⚡ 빛 돌진
        'portalDwellUntil','darkDwellUntil','curseDwellUntil','lightDashUntil','lightDashDir',
        // ❄️ 쿠잔(해적)
        'kzGloveEnd','kzDashCastEnd','kzDashEnd','kzDashDX','kzDashDY'
    ];

    socket.on('syncPlayerFull', (data) => {
        if (!data) return;

        // ── 내 캐릭터 ────────────────────────────────────────────────
        if (data.id === window.myId) {
            const my = window.myPlayer;
            let prevAmber = !!my.amberActive;

            // ⚔️ [버그 수정] 다이도 스킬 중에는 서버가 좌표를 몬다.
            //    이때만큼은 로컬 좌표를 보존하지 않고 서버 값을 그대로 받아야
            //    시전자 화면에서도 돌진·고정이 제대로 보인다.
            const nowMs = Date.now();
            //    ❄️ 쿠잔(해적) 아이스 타임도 마찬가지다. 서버가 돌진 좌표를 몰기 때문에
            //       이때 로컬 좌표를 지키면 '얼기만 하고 안 나가는' 것처럼 보인다.
            const daidoDriven =
                (data.daidoFury && nowMs < (data.daidoFuryEnd || 0)) ||
                (data.daidoRush && nowMs < (data.daidoRushEnd || 0)) ||
                (data.daidoIaiAt && nowMs < data.daidoIaiAt) ||
                (data.kzDashEnd && nowMs < data.kzDashEnd);

            // 🛟 로컬이 관리해야 하는 값은 서버 값으로 덮이지 않게 보존한다
            let localState = {
                x: daidoDriven ? data.x : my.x,
                y: daidoDriven ? data.y : my.y,
                vy: daidoDriven ? 0 : my.vy,
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
                // ⚡🔮 전격 돌진은 로컬 물리가 직접 관리한다
                dashCdEnd: my.dashCdEnd,
                amberDashUntil: my.amberDashUntil,
                amberDashDirX: my.amberDashDirX,
                amberDashDirY: my.amberDashDirY,
                // ⬛ 다부라 : 로컬 물리 / 쿨타임이 직접 관리하는 값
                dLightCdEnd: my.dLightCdEnd,
                dDarkCdEnd: my.dDarkCdEnd,
                dKickCdEnd: my.dKickCdEnd,
                darkPullUntil: my.darkPullUntil,
                darkPullX: my.darkPullX, darkPullY: my.darkPullY,
                darkPullPower: my.darkPullPower,
                cd1: my.cd1, cd2: my.cd2, cd3: my.cd3,
                // 🗣️ NPC 대화 잠금은 대화창 이벤트가 직접 관리한다
                npcTalking: my.npcTalking,
                _cliStuckSince: my._cliStuckSince,
                _offlineSince: my._offlineSince
            };

            let srvCasting = !!data.isCasting;
            // 🗣️ 퀘스트 진행도는 서버가 권위 — 반영 여부를 미리 확인해 둔다
            let prevStage = my.tichStage || 0;
            let prevSquare = !!my.hasSquare;
            // 🗡️ 4번 스킬 아이템(세계를 가르는 참격 · 유명이경 역월) 장착 변화 감지
            let prevCleave4 = !!my.hasWorldCleave;
            let prevYumyeong4 = !!my.hasYumyeong;

            Object.assign(my, data);
            Object.assign(my, localState);

            // 🛟 서버가 isCasting=true 를 보내도 '근거'가 없으면 거부한다
            let nowSync = Date.now();
            let hasReason = (my.yataActive && my.yataPath)
                         || nowSync < (my.castLockUntil || 0)
                         || my.skill1Dashing;
            my.isCasting = (srvCasting && hasReason);

            // 🗣️ 퀘스트 진행도가 바뀌었다면 퀘스트 배너를 갱신한다
            if (data.tichStage !== undefined && data.tichStage !== prevStage) {
                if (typeof window.setQuestText === 'function') {
                    window.setQuestText(data.tichStage === 1 ? "['티치'에게 체리파이 한 개 주기]" : null);
                }
            }

            // ⬛ ■ 장착 상태가 바뀌었다면 스킬 버튼 색을 다시 칠한다
            if (prevSquare !== !!my.hasSquare) {
                if (typeof window.refreshDaburaSkillLabel === 'function') window.refreshDaburaSkillLabel(true);
            }

            // 🗡️ 4번 스킬 아이템 장착이 바뀌었다면 4번 버튼 표시를 갱신한다
            if (prevCleave4 !== !!my.hasWorldCleave || prevYumyeong4 !== !!my.hasYumyeong) {
                if (typeof window.applySkillNames === 'function') window.applySkillNames();
            }

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

        // ⚠️ [중요] 여기 빠진 필드는 남의 화면에서만 안 보인다.
        //    ENEMY_COPY 와 함께 두 곳 모두에 넣어야 한다.
        //    (어사인 고철 · 신성력 · 마르코 게이지 등이 실제로 이 문제를 겪었다)
        for (const k of ENEMY_COPY) {
            if (data[k] !== undefined) t[k] = data[k];
        }

        t.hasJusticeCoat = data.hasJusticeCoat;
        t.hasPika = data.hasPika; t.hasHie = data.hasHie; t.hasMagu = data.hasMagu;
        t.hasKizaru = data.hasKizaru; t.hasAokiji = data.hasAokiji; t.hasAkainu = data.hasAkainu;
        t.hasGoro = data.hasGoro; t.hasArkMaxim = data.hasArkMaxim; t.hasGodEnel = data.hasGodEnel;
        t.hasGura = data.hasGura; t.hasYami = data.hasYami;
        if (data.hasSquare !== undefined) t.hasSquare = data.hasSquare;   // ⬛

        if (data.elThorActive !== undefined) t.elThorActive = data.elThorActive;
        if (data.crowsPullUntil !== undefined) t.crowsPullUntil = data.crowsPullUntil;
        if (data.yamiLockUntil !== undefined) t.yamiLockUntil = data.yamiLockUntil;
        if (data.yamiBindUntil !== undefined) t.yamiBindUntil = data.yamiBindUntil;
        if (data.guraChargeUntil !== undefined) t.guraChargeUntil = data.guraChargeUntil;
        if (data.darkBanned !== undefined) t.darkBanned = data.darkBanned;
        // 🗣️ 원격 플레이어의 대화 상태 (표시용)
        if (data.npcTalking !== undefined) t.npcTalking = data.npcTalking;
        if (data.tichStage !== undefined) t.tichStage = data.tichStage;
        // ⚡ 카시모
        if (data.kashimoCharge !== undefined) t.kashimoCharge = data.kashimoCharge;
        if (data.kashimoChargeUntil !== undefined) t.kashimoChargeUntil = data.kashimoChargeUntil;
        if (data.surgeActive !== undefined) t.surgeActive = data.surgeActive;
        if (data.surgeEnd !== undefined) t.surgeEnd = data.surgeEnd;
        if (data.surgeLockUntil !== undefined) t.surgeLockUntil = data.surgeLockUntil;
        if (data.amberActive !== undefined) t.amberActive = data.amberActive;
        if (data.sonicChargeUntil !== undefined) t.sonicChargeUntil = data.sonicChargeUntil;
        // ⬛ 다부라
        if (data.dLightActive !== undefined) t.dLightActive = data.dLightActive;
        if (data.dLightEnd !== undefined) t.dLightEnd = data.dLightEnd;
        if (data.dLightRiseUntil !== undefined) t.dLightRiseUntil = data.dLightRiseUntil;
        if (data.dDarkActive !== undefined) t.dDarkActive = data.dDarkActive;
        if (data.dDarkEnd !== undefined) t.dDarkEnd = data.dDarkEnd;
        if (data.dKickCharging !== undefined) t.dKickCharging = data.dKickCharging;
        if (data.dKickChargeEnd !== undefined) t.dKickChargeEnd = data.dKickChargeEnd;
        if (data.dKickFlying !== undefined) t.dKickFlying = data.dKickFlying;
        if (data.dKickFlyEnd !== undefined) t.dKickFlyEnd = data.dKickFlyEnd;

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
        // 🎇 카시모 · 다부라 지속 이펙트 정리
        U.clearSurgeFX(deadId);
        U.clearAmberFX(deadId);
        U.clearAmberTrailFX(deadId);
        U.clearDaburaFX(deadId);

        if (deadId === window.myId) {
            const p = window.myPlayer;
            p.isDead = true;
            U.releaseAllLocks(null);
            p.yataCanceling = false;
            p.burningUntil = 0; p.maguBombUntil = 0; p.justiceBombUntil = 0;
            p.portalDwellUntil = 0; p.darkDwellUntil = 0; p.curseDwellUntil = 0;
            p.kashimoCharge = 0; p.kashimoChargeUntil = 0;
            // 🗣️ 대화 중이었다면 대화창을 닫는다 (releaseAllLocks 안에서도 처리되지만 이중 방어)
            p.npcTalking = null;
            if (typeof window.closeNpcDialog === 'function') window.closeNpcDialog();
            // ⚡🌋 주력 방출 (고정 포함) 초기화
            p.surgeActive = false; p.surgeEnd = 0; p.surgeLockUntil = 0;
            // ⚡🔮 죽으면 환수호박이 풀리고 3번 스킬이 다시 생겨난다
            p.amberActive = false;
            p.amberCdEnd = 0;
            p.amberDashUntil = 0; p.dashCdEnd = 0;
            // ⬛ 다부라 상태 초기화
            p.dLightActive = false; p.dLightEnd = 0; p.dLightRiseUntil = 0;
            p.dDarkActive = false; p.dDarkEnd = 0;
            p.dKickCharging = false; p.dKickChargeEnd = 0;
            p.dKickFlying = false; p.dKickFlyEnd = 0;
            p.darkPullUntil = 0;
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
        t.portalDwellUntil = 0; t.darkDwellUntil = 0; t.curseDwellUntil = 0;
        t.crowsPullUntil = 0;
        t.yamiLockUntil = 0; t.yamiBindUntil = 0; t.guraChargeUntil = 0;
        t.elThorLockUntil = 0; t.raigoPullUntil = 0;
        t.kashimoCharge = 0; t.kashimoChargeUntil = 0;
        t.surgeActive = false; t.surgeEnd = 0; t.surgeLockUntil = 0;
        t.amberActive = false; t.sonicChargeUntil = 0;
        t.amberDashUntil = 0;
        // ⬛ 다부라
        t.dLightActive = false; t.dLightEnd = 0; t.dLightRiseUntil = 0;
        t.dDarkActive = false; t.dDarkEnd = 0;
        t.dKickCharging = false; t.dKickChargeEnd = 0;
        t.dKickFlying = false; t.dKickFlyEnd = 0;
        t.npcTalking = null;                       // 🗣️
    });

    // ── 💫 부활 ─────────────────────────────────────────────────────
    socket.on('player_respawned', (pData) => {
        if (!pData) return;
        U.clearSurgeFX(pData.id);
        U.clearAmberFX(pData.id);
        U.clearDaburaFX(pData.id);

        if (pData.id === window.myId) {
            const p = window.myPlayer;
            p.isDead = false;
            p.hp = pData.hp; p.maxHp = pData.maxHp;
            if (Number.isFinite(pData.x)) p.x = pData.x;
            if (Number.isFinite(pData.y)) p.y = pData.y;
            p.vy = 0; p.knockbackForce = 0;
            U.releaseAllLocks(null);
            p.burningUntil = 0; p.maguBombUntil = 0; p.justiceBombUntil = 0;
            p.portalDwellUntil = 0; p.darkDwellUntil = 0; p.curseDwellUntil = 0;
            p.kashimoCharge = 0; p.kashimoChargeUntil = 0;
            p.surgeActive = false; p.surgeEnd = 0; p.surgeLockUntil = 0;
            // 🗣️ 부활 시 대화 상태 완전 해제 (퀘스트 진행도는 유지된다)
            p.npcTalking = null;
            if (typeof window.closeNpcDialog === 'function') window.closeNpcDialog();
            if (pData.tichStage !== undefined) {
                p.tichStage = pData.tichStage;
                if (typeof window.setQuestText === 'function') {
                    window.setQuestText(pData.tichStage === 1 ? "['티치'에게 체리파이 한 개 주기]" : null);
                }
            }
            // ⚡🔮 부활 시 환수호박 완전 해제 (3번 스킬 사용 가능)
            p.amberActive = false; p.amberCdEnd = 0;
            p.amberDashUntil = 0; p.dashCdEnd = 0;
            // ⬛ 다부라 상태 초기화
            p.dLightActive = false; p.dLightEnd = 0; p.dLightRiseUntil = 0;
            p.dDarkActive = false; p.dDarkEnd = 0;
            p.dKickCharging = false; p.dKickChargeEnd = 0;
            p.dKickFlying = false; p.dKickFlyEnd = 0;
            p.darkPullUntil = 0;
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
        t.portalDwellUntil = 0; t.darkDwellUntil = 0; t.curseDwellUntil = 0;
        t.crowsPullUntil = 0;
        t.yamiLockUntil = 0; t.yamiBindUntil = 0; t.guraChargeUntil = 0;
        t.skill1Dashing = false; t.yataActive = false; t.skill3Active = false; t.isCasting = false;
        t.elThorLockUntil = 0; t.raigoPullUntil = 0;
        t.kashimoCharge = 0; t.kashimoChargeUntil = 0;
        t.surgeActive = false; t.surgeEnd = 0; t.surgeLockUntil = 0;
        t.amberActive = false; t.sonicChargeUntil = 0;
        t.amberDashUntil = 0;
        // ⬛ 다부라
        t.dLightActive = false; t.dLightEnd = 0; t.dLightRiseUntil = 0;
        t.dDarkActive = false; t.dDarkEnd = 0;
        t.dKickCharging = false; t.dKickChargeEnd = 0;
        t.dKickFlying = false; t.dKickFlyEnd = 0;
        t.npcTalking = null;                       // 🗣️
    });

    // ── 🚪 퇴장 ─────────────────────────────────────────────────────
    socket.on('playerLeft', (id) => {
        U.clearSurgeFX(id);
        U.clearAmberFX(id);
        U.clearAmberTrailFX(id);
        U.clearDaburaFX(id);
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
        // 🗣️ NPC 대화 중에도 넉백을 적용하지 않는다 (완전 고정)
        if (p.npcTalking) {
            if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
            return;
        }
        // ⬛ 다부라 : 빛 시전 / 발차기 응축·활공 중에는 넉백 무시
        if (p.dLightActive || p.dKickCharging || p.dKickFlying) {
            if (typeof window.flashDamageVignette === 'function') window.flashDamageVignette();
            return;
        }
        if (now < (p.elThorLockUntil || 0) || now < (p.raigoPullUntil || 0)
            || now < (p.crowsPullUntil || 0) || now < (p.yamiBindUntil || 0)
            || now < (p.yamiLockUntil || 0) || now < (p.guraChargeUntil || 0)
            || now < (p.sonicChargeUntil || 0)          // ⚡🔮 음파 응축
            || now < (p.amberDashUntil || 0)            // ⚡🔮 전격 돌진
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
        'kashimo_strike': 13,     // ⚡ 카시모 평타
        'dabura_strike': 14       // ⬛ 다부라 평타
    };
    // 내가 쓴 것이어도 반드시 그려야 하는 (서버 권위) 이펙트
    const ALWAYS_SHOW = ['borsalino_beam', 'yata_mirror_path', 'yata_explosion',
                         'ice_age', 'kizaru_gates', 'el_thor', 'raigo_telegraph', 'raigo',
                         'world_cleave'];   // 🗡️ 세계를 가르는 참격

    socket.on('actionEffect', (data) => {
        if (!data) return;

        // 🗿 [키드] 골렘 평타 — 남의 화면에서도 팔을 휘두르게 한다
        if (data.type === 'kid_golem_strike' && data.id && window.players[data.id]) {
            window.players[data.id].kidSwingAt = Date.now();
        }

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
        // 🗡️ 세계를 가르는 참격
        else if (data.type === 'world_cleave') { data.life = data.lifeFrames || 26; data.maxLife = data.lifeFrames || 26; }

        if (data.durationMs) data.endAt = Date.now() + data.durationMs;

        // 내가 쓴 평타는 이미 로컬에서 그렸으므로 중복 생성하지 않는다
        if (data.id !== window.myId || ALWAYS_SHOW.includes(data.type)) {
            window.visualFX.push(data);
        }
    });

    // ── 🗡️ 세계를 가르는 참격 : 0.5초 경직 시작 ─────────────────────
    //    시전자 본인은 입력 시점에 이미 경직이 걸려 있고,
    //    다른 플레이어에게는 여기서 경직 상태를 반영한다.
    socket.on('worldCleaveCast', (d) => {
        if (!d || !d.id) return;
        let castMs = d.castMs || 500;
        let endAt = Date.now() + castMs;

        if (d.id === window.myId) {
            window.myPlayer.cleaveCasting = true;
            window.myPlayer.cleaveCastEnd = endAt;
        } else if (window.players[d.id]) {
            window.players[d.id].cleaveCasting = true;
            window.players[d.id].cleaveCastEnd = endAt;
        }

        // 🎇 시전 예고 이펙트 (참격이 나갈 방향을 미리 보여 준다)
        window.visualFX.push({
            id: d.id, type: 'world_cleave_charge',
            x: d.x, y: d.y, dirX: d.dirX, dirY: d.dirY,
            durationMs: castMs,
            life: Math.round(castMs / (1000 / 60)),
            maxLife: Math.round(castMs / (1000 / 60))
        });
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