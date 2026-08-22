// 파일명: server/playerCore.js
// ============================================================================
// 👤 플레이어 스탯 · 생애주기
//
//   비대해진 index.js 를 4개로 분리한 것 중 하나다. (동작은 분리 전과 동일)
//     · index.js              : 진입점 — 전역 · 모듈 조립 · 서버 컨텍스트 · 메인 루프
//     · server/playerCore.js  : 스탯 재계산 · 🔯 법진 · 사망/부활 · 리셋 · 재접속
//     · server/combat.js      : 🔥 화상 도트 · 🗡️ 평타 · ⚔️ 세계를 가르는 참격
//     · server/socketEvents.js: 🗣️ NPC 대화 · 모든 socket.on 핸들러
//
// 🔗 순환 참조는 index.js 가 wire() 로 나중에 주입해 해결한다.
//    (아래 let 변수들은 wire() 호출 전까지 null 이다)
// ============================================================================

let io, C, S, State, compressors, Characters, Skills, Items;
let emitDamageText, gainXp, isNum, isInDarkZone;
let makeMonster, makeBases, makeTurrets, makeNpcs, makeHinbeom, makeBlackbeard, makeBurgess;
let makeSukuna;
let Bosses, Fruits, clearBurns;

/** 🔗 index.js 가 모든 모듈을 만든 뒤 호출한다 */
function wire(d) {
    io = d.io; C = d.C; S = d.S; State = d.State; compressors = d.compressors;
    Characters = d.Characters; Skills = d.Skills; Items = d.Items;
    emitDamageText = d.emitDamageText; gainXp = d.gainXp; isNum = d.isNum;
    isInDarkZone = d.isInDarkZone;
    makeMonster = d.makeMonster; makeBases = d.makeBases; makeTurrets = d.makeTurrets;
    makeSukuna = d.makeSukuna;
    makeNpcs = d.makeNpcs; makeHinbeom = d.makeHinbeom;
    makeBlackbeard = d.makeBlackbeard; makeBurgess = d.makeBurgess;
    Bosses = d.Bosses; Fruits = d.Fruits; clearBurns = d.clearBurns;
}

// ============================================================================
// 🔯 법진(法陣) — 처치 누적 강화 수치
//    적(플레이어 포함)을 1회 처치할 때마다 아래 수치만큼 영구히 강해진다.
//    스택은 사망해도 유지된다.
// ============================================================================
const BEOPJIN_MAX_STACK    = 50;     // 최대 누적 처치 수
const BEOPJIN_HP_PER_KILL  = 20;     // 최대체력 +20
const BEOPJIN_REGEN_PER_KILL = 2;    // 초당회복 +2
const BEOPJIN_DEF_PER_KILL = 0.002;  // 방어력 +0.2% (0.002 = 0.2%)

/**
 * 🔯 법진 처치 스택을 1 올린다.
 *    · 법진을 장착하지 않았어도 스택 자체는 쌓아 둔다.
 *      (나중에 장착하면 그동안 쌓인 만큼 즉시 적용된다)
 *    · 장착 중이라면 즉시 recalcStats 로 스탯에 반영하고 클라이언트에 동기화한다.
 */
function addBeopjinKill(attackerId) {
    if (!attackerId) return;
    let killer = State.players[attackerId];
    if (!killer) return;
    if ((killer.beopjinKills || 0) >= BEOPJIN_MAX_STACK) return;
    killer.beopjinKills = (killer.beopjinKills || 0) + 1;
    if (killer.hasBeopjin) {
        recalcStats(killer);
        io.emit('syncPlayerFull', killer);
    }
}

/**
 * ⚫🔥 별세계(암흑 왕좌 · 저주의 왕) 경계 제한.
 *
 *    서버가 좌표를 직접 밀어 넣는 곳(야타의 거울 경로 등)에서 쓴다.
 *    '이동 전 좌표(p.x)' 로 어느 별세계에 있었는지 판단하므로,
 *    바깥에 있던 사람을 억지로 가두지는 않는다.
 *
 *    @return {x, y} 보정된 좌표
 */
function clampSpecialArea(p, nx, ny) {
    const HALF_W = 45;
    const cx = (p && isNum(p.x)) ? p.x : nx;

    // ⚫ 암흑 왕좌
    if (cx >= C.DARK_ZONE_MIN && cx <= C.DARK_ZONE_MAX) {
        const A = C.DARK_AREA;
        return {
            x: Math.max(A.minX + HALF_W + 5, Math.min(A.maxX - HALF_W - 5, nx)),
            y: Math.max(A.minY + 45, Math.min(C.DARK_GROUND - 45, ny))
        };
    }
    // 🔥 저주의 왕
    if (cx >= C.CURSE_ZONE_MIN && cx <= C.CURSE_ZONE_MAX) {
        const A = C.CURSE_AREA;
        return {
            x: Math.max(A.minX + HALF_W + 5, Math.min(A.maxX - HALF_W - 5, nx)),
            y: Math.max(A.minY + 45, Math.min(C.CURSE_GROUND - 45, ny))
        };
    }
    return { x: nx, y: ny };
}

function recalcStats(p) {
    let charType = p.characterType || 'PARK';
    let char = Characters[charType] || Characters.PARK;
    let oldMax = p.maxHp || char.hp;

    p.maxHp = char.hp + ((p.level || 0) * 300);
    p.speedMult = char.speedMult || 1.0;
    p.attackSpeedMult = 1.0; p.bonusDamage = 0;
    // 💥 [변경] 아이템·레벨의 공격력 증가는 '고정 수치' 가 아니라 '% 증가' 다.
    //    · 아이템 : 적힌 값 +1 당 0.5% 증가 (예: +40 → 20%)
    //    · 레벨   : 1레벨당 2% 증가
    //    dmgPct 를 모두 더한 뒤, 마지막에 기본 공격력에 곱해 bonusDamage 로 환산한다.
    //    이렇게 하면 기존의 모든 피해 공식(baseDamage + bonusDamage)을 건드리지 않아도 된다.
    p.dmgPct = (p.level || 0) * 0.02;
    p.defense = 0; p.hpRegen = 0; p.orbitSpheres = 0;
    p.hasJokbal = false; p.hasDaluFengwei = false; p.hasJadam = false;
    p.seolgonnyakCount = 0; p.hasPepsiArt = false;
    p.hasPika = false; p.hasHie = false; p.hasMagu = false; p.hasJusticeCoat = false;
    p.hasKizaru = false; p.hasAokiji = false; p.hasAkainu = false;
    p.hasGoro = false; p.hasArkMaxim = false; p.hasGodEnel = false;
    p.hasGura = false; p.hasYami = false;
    // 🏵️🌩️ 카시모 전용 아이템
    p.hasYeoui = false; p.hasRaijin = false;
    // ⬛ 다부라 전용 아이템
    p.hasSquare = false;
    // 🔯⚔️ 신규 아이템 : 법진 · 퇴마의 검
    p.hasBeopjin = false; p.hasToemaSword = false;
    // 🗡️ 세계를 가르는 참격 (4번 스킬 개방)
    p.hasWorldCleave = false;
    // 🌑 유명이경 역월 (4번 스킬 · 영역 전개 / 다부라 전용)
    p.hasYumyeong = false;
    // ⚔️ 다이도 검 계열 (잡검 → 도좌마 → 용골 → 석혼도)
    p.hasJapgeom = false; p.hasDojwama = false; p.hasYonggol = false; p.hasSeokhondo = false;
    // 🕊️ 쿠루스 전용 : 타천 · 천사의 날개 · 천사
    p.hasTacheon = false; p.hasAngelWing = false; p.hasAngel = false;
    // 🔥 마르코 전용 : 새새 열매 · 황금 벨트 · 불사조 마르코
    p.hasPhoenixFruit = false; p.hasGoldenBelt = false; p.hasPhoenixMarco = false;
    // 🧲 키드 전용 : 자기자기열매 · 기계 의수 · 각성
    p.hasMagnetFruit = false; p.hasMechArm = false; p.hasMagnetAwake = false;

    const FLAGS = ['hasJokbal','hasDaluFengwei','hasJadam','hasPepsiArt','hasPika','hasHie','hasMagu',
                   'hasJusticeCoat','hasKizaru','hasAokiji','hasAkainu','hasGoro','hasArkMaxim','hasGodEnel',
                   'hasGura','hasYami',
                   'hasYeoui','hasRaijin',
                   'hasSquare',
                   'hasBeopjin','hasToemaSword',
                   'hasWorldCleave', 'hasYumyeong',
                   'hasJapgeom', 'hasDojwama', 'hasYonggol', 'hasSeokhondo',
                   'hasTacheon', 'hasAngelWing', 'hasAngel',
                   'hasPhoenixFruit', 'hasGoldenBelt', 'hasPhoenixMarco',
                   'hasMagnetFruit', 'hasMechArm', 'hasMagnetAwake'];
    const NUMS = { maxHp: 1, speedMult: 1, bonusDamage: 1, defense: 1, hpRegen: 1, attackSpeedMult: 1, orbitSpheres: 1, dmgPct: 1 };

    p.equippedUids.forEach(uid => {
        let item = p.inventory.find(i => i.uid === uid);
        if (!item || !Items[item.id] || !Items[item.id].stats) return;
        let stats = Items[item.id].stats;
        for (let k in NUMS) if (stats[k]) p[k] += stats[k];
        for (let i = 0; i < FLAGS.length; i++) if (stats[FLAGS[i]]) p[FLAGS[i]] = true;
        if (item.id === 'seolgonnyak') p.seolgonnyakCount = 1;
    });

    // 🌩️ 뇌신은 여의의 효과를 모두 포함한다 (합성 재료를 소모했으므로)
    if (p.hasRaijin) p.hasYeoui = true;
    // ⬛ ✅ [수정] ■ 는 '번쩍번쩍'의 효과만 포함한다.
    //    (어둠어둠열매 효과 hasYami 는 더 이상 부여하지 않는다)
    if (p.hasSquare) { p.hasPika = true; }

    // 🔯 법진(法陣) — 적을 처치할수록 영구히 강해진다 (최대 BEOPJIN_MAX_STACK 회)
    //    · 1회당 : 최대체력 +20 · 초당회복 +2 · 방어력 +0.2%
    //    · 스택(p.beopjinKills)은 사망해도 초기화되지 않는다.
    //    · 장착을 풀면 효과만 사라지고, 다시 끼면 쌓아둔 스택이 그대로 적용된다.
    if (p.hasBeopjin) {
        let stack = Math.min(BEOPJIN_MAX_STACK, Math.max(0, p.beopjinKills || 0));
        p.maxHp   += BEOPJIN_HP_PER_KILL     * stack;
        p.hpRegen += BEOPJIN_REGEN_PER_KILL  * stack;
        p.defense += BEOPJIN_DEF_PER_KILL    * stack;
    }

    // 💥 아이템 % 증가를 실제 공격력으로 환산한다.
    //    ⚠️ 반드시 모든 스탯 합산이 끝난 뒤에 한 번만 적용해야 한다.
    //    (기존 피해 공식 baseDamage + bonusDamage 를 그대로 쓰기 위한 환산)
    if (p.dmgPct > 0) {
        p.bonusDamage += (p.baseDamage || 0) * p.dmgPct;
    }

    // ✅ 방어력 한도(상한) 제거 — 장착한 만큼 그대로 합산된다
    if (p.maxHp > oldMax) p.hp += (p.maxHp - oldMax);
    p.hp = Math.min(p.hp, p.maxHp);
    p.orbitSpeedMult = p.hasDaluFengwei ? 1.8 : 1.0;

    // ⚡🔮 환수호박 발동 중이라면 이동속도 1.3배를 다시 곱해 준다.
    if (p.amberActive) {
        const KS3 = Skills.KASHIMO_S3;
        p.speedMult = (p.speedMult || 1.0) * ((KS3 && KS3.speedMult) ? KS3.speedMult : C.K_AMBER_SPEED_MULT);
    }
}

function applyBaseDamage(attackerTeam, damage) {
    let enemyBase = State.bases[attackerTeam === 1 ? 2 : 1];
    if (!enemyBase || enemyBase.hp <= 0) return;
    if (!isNum(damage)) return;
    enemyBase.hp -= damage;
    emitDamageText(enemyBase.x, enemyBase.y, damage);
    if (enemyBase.hp <= 0 && State.gameStarted) {
        State.gameStarted = false;
        io.emit('gameOver', attackerTeam);
        setTimeout(resetGame, 2000);
    }
}


// ============================================================================
// ☠️ 플레이어 사망 / 부활
// ============================================================================
const LOCK_FIELDS_RESET = {
    isCasting: false, skill3Active: false, skill3EndTime: 0,
    yataActive: false, yataPath: null,
    iceAgeActive: false, iceAgeCastEnd: 0,
    elThorActive: false, elThorEnd: 0,
    skill1Dashing: false, mantleActive: false,
    raigoActive: false, raigoDropped: false,
    crowsPullUntil: 0, yamiLockUntil: 0, yamiBindUntil: 0, guraChargeUntil: 0,
    // ⚡🌋 주력 방출(고정 포함) · ⚡🔮 음파 경직 · 전격 돌진도 함께 정리한다
    surgeActive: false, surgeEnd: 0, surgeNextTick: 0, surgeLockUntil: 0,
    sonicChargeUntil: 0, sonicFireAt: 0,
    dashCdEnd: 0, amberDashUntil: 0,
    // ⬛ 다부라 : 빛 · 어둠 · 아광속 발차기 상태도 정리한다
    dLightActive: false, dLightEnd: 0, dLightNextTick: 0, dLightRiseUntil: 0,
    dDarkActive: false, dDarkEnd: 0,
    dKickCharging: false, dKickChargeEnd: 0, dKickFlying: false, dKickFlyEnd: 0,
    darkPullUntil: 0,
    // 🗡️ 세계를 가르는 참격 : 경직 상태만 푼다 (쿨타임 cd4 는 그대로 유지)
    cleaveCasting: false, cleaveCastEnd: 0,
    // 🌑 유명이경 역월 : 시전 경직만 푼다 (쿨타임 cdY 는 그대로 유지)
    yumCasting: false, yumCastEnd: 0,
    // ⚔️ 다이도 : 시전 상태만 푼다 (쿨타임은 유지)
    daidoFury: false, daidoFuryEnd: 0, daidoRush: false, daidoRushEnd: 0,
    daidoIaiAt: 0, daidoIaiLeft: 0, daidoIaiNextAt: 0, daidoSpinEnd: 0,
    // 🕊️ 쿠루스 : 진행 중인 연출만 끈다 (신성력·여분의 목숨은 유지)
    ladderCastEnd: 0, ladderBeamEnd: 0, ladderNextTick: 0, ladderCharged: false,
    kurusuHealEnd: 0, kurusuHealNext: 0, kurusuGliding: false,
    // 🧲 키드 : 진행 중인 연출을 끈다 (고철 표시도 지운다)
    kidLaserCastEnd: 0, kidLaserFireEnd: 0, kidGolemCastEnd: 0, kidGolemEnd: 0,
    kidStack: 0, kidSlow: 1, kidHoldUntil: 0,
    // 🗣️ NPC 대화 상태도 함께 정리한다
    npcTalking: null, npcMode: null, npcLine: 0, npcNoExit: false,
    _castStuckSince: 0
};

function checkPlayerDeath(targetPlayer, attackerId) {
    if (!targetPlayer) return;
    if (targetPlayer.hp > 0 || targetPlayer.isDead) return;

    // ✨ [쿠루스 하나] 여분의 목숨 — 죽는 대신 그 자리에서 체력 15% 로 부활한다.
    //    모든 사망 경로가 이 함수를 거치므로 여기 한 곳에서 가로채면 된다.
    //    (중첩 가능 — 하나씩 소모된다)
    if (targetPlayer.extraLives > 0) {
        targetPlayer.extraLives--;
        targetPlayer.hp = Math.max(1, Math.round(targetPlayer.maxHp * 0.50));
        targetPlayer.frozenUntil = 0;
        targetPlayer.knockbackForce = 0;
        io.emit('kurusuRevive', {
            id: targetPlayer.id, x: targetPlayer.x, y: targetPlayer.y,
            left: targetPlayer.extraLives
        });
        io.emit('syncPlayerFull', targetPlayer);
        return;
    }

    if (isInDarkZone(targetPlayer)) targetPlayer.darkBanned = true;

    if (targetPlayer.surgeActive) io.emit('kashimoSurgeEnd', { id: targetPlayer.id });

    // ⬛ 다부라 : 진행 중이던 스킬 이펙트를 끈다
    if (targetPlayer.dLightActive) io.emit('daburaLightEnd', { id: targetPlayer.id });
    if (targetPlayer.dDarkActive) io.emit('daburaDarkEnd', { id: targetPlayer.id });
    if (targetPlayer.dKickCharging || targetPlayer.dKickFlying) io.emit('daburaKickEnd', { id: targetPlayer.id });

    // 🗣️ 대화 중이었다면 대화창을 닫는다
    if (targetPlayer.npcTalking) io.to(targetPlayer.id).emit('npcDialogEnd');

    // ⚡🔮 환수호박은 '죽어야만' 해제된다
    if (targetPlayer.amberActive) {
        targetPlayer.amberActive = false;
        targetPlayer.amberNextDrain = 0;
        targetPlayer.amberCdEnd = 0;
        targetPlayer.waveCdEnd = 0;
        targetPlayer.sonicCdEnd = 0;
        io.emit('kashimoAmberEnd', { id: targetPlayer.id });
    }
    for (let i = State.amberTrails.length - 1; i >= 0; i--) {
        if (State.amberTrails[i].ownerId === targetPlayer.id) State.amberTrails.splice(i, 1);
    }
    for (let i = State.waveChains.length - 1; i >= 0; i--) {
        if (State.waveChains[i].ownerId === targetPlayer.id) State.waveChains.splice(i, 1);
    }
    // 🌩️ 뇌신 재폭발 예약도 정리한다
    for (let i = State.waveEchoes.length - 1; i >= 0; i--) {
        if (State.waveEchoes[i].ownerId === targetPlayer.id) State.waveEchoes.splice(i, 1);
    }

    targetPlayer.hp = 0; targetPlayer.isDead = true;
    Object.assign(targetPlayer, LOCK_FIELDS_RESET);
    targetPlayer.partisanQueue = 0; targetPlayer.partisanFired = 0;
    targetPlayer.volcanoActive = false;
    targetPlayer.maguBombUntil = 0; targetPlayer.justiceBombUntil = 0; targetPlayer.skillFreezeUntil = 0;
    targetPlayer.portalDwellUntil = 0; targetPlayer.portalDwellStart = 0;
    targetPlayer.darkDwellUntil = 0; targetPlayer.darkDwellStart = 0;
    targetPlayer.kashimoCharge = 0; targetPlayer.kashimoChargeUntil = 0;
    io.emit('kashimoCharge', { targetKind: 'player', targetId: targetPlayer.id, charge: 0, until: 0 });

    recalcStats(targetPlayer);

    clearBurns(targetPlayer.id, targetPlayer);
    Fruits.clearYamiBindsFor(targetPlayer.id);
    Fruits.clearGuraChargesFor(targetPlayer.id);
    io.emit('player_died', targetPlayer.id);
    io.emit('syncPlayerFull', targetPlayer);

    const bb = State.blackbeard;
    if (bb && bb.crowsActiveTarget === targetPlayer.id) { bb.crowsActiveTarget = null; bb.crowsHitAt = 0; io.emit('crowsEnd', { id: targetPlayer.id }); }
    if (bb && bb.crowsPendingTarget === targetPlayer.id) bb.crowsPendingTarget = null;

    if (attackerId && State.players[attackerId] && attackerId !== targetPlayer.id) {
        State.players[attackerId].gold += 800;
        io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], Math.max(1, targetPlayer.level) * 10);
        // 🔯 법진 : 적 플레이어 처치도 스택에 포함된다 (자살 · 아군 오폭은 제외)
        addBeopjinKill(attackerId);
    }

    setTimeout(() => {
        try {
            if (!State.players[targetPlayer.id]) return;
            targetPlayer.isDead = false;
            targetPlayer.lastRespawn = Date.now();
            targetPlayer.hp = targetPlayer.maxHp;
            targetPlayer.x = State.bases[targetPlayer.team].x;
            targetPlayer.y = 1955;
            Object.assign(targetPlayer, LOCK_FIELDS_RESET);
            targetPlayer.burningUntil = 0; targetPlayer.maguBombUntil = 0; targetPlayer.justiceBombUntil = 0;
            targetPlayer.skillFreezeUntil = 0; targetPlayer.electrocutedUntil = 0;
            targetPlayer.frozenUntil = 0; targetPlayer.airFreezeUntil = 0; targetPlayer.raigoPullUntil = 0;
            targetPlayer.knockbackForce = 0;
            targetPlayer.kashimoCharge = 0; targetPlayer.kashimoChargeUntil = 0;
            targetPlayer.amberActive = false; targetPlayer.amberCdEnd = 0;
            recalcStats(targetPlayer);
            io.emit('player_respawned', targetPlayer);
        } catch (e) { console.error('[RESPAWN]', e); }
    }, 15000);
}

// ============================================================================
// 🔁 게임 리셋
// ============================================================================
function resetGame() {
    State.gameStarted = false; State.masterId = null; State.players = {};
    State.projectiles = []; State.shockwaves = []; State.detectors = [];
    State.magmas = []; State.maguBombs = []; State.justiceBombs = [];
    State.giantPartisanQueue = []; State.mantleBolts = []; State.burnMap.clear();
    State.yamiBinds = []; State.guraCharges = [];
    State.amberTrails = []; State.waveChains = []; State.waveEchoes = [];
    State.bases = makeBases();
    State.monster = makeMonster();

    if (State.hinbeom && State.hinbeom.respawnTimer) { clearTimeout(State.hinbeom.respawnTimer); State.hinbeom.respawnTimer = null; }
    if (State.blackbeard && State.blackbeard.respawnTimer) { clearTimeout(State.blackbeard.respawnTimer); State.blackbeard.respawnTimer = null; }

    State.hinbeom = makeHinbeom();
    State.hinbeomMinions = [];
    State.hinbeomPortal = null; State.darkPortal = null;
    State.blackbeard = makeBlackbeard();
    State.burgess = makeBurgess();
    State.blackbeardPortal = null; State.blackbeardKilledBy = null;

    // 🔥 저주의 왕 (헤이안 스쿠나) 초기화
    State.sukuna = makeSukuna();
    State.cursePortal = null;
    State.sukunaPortal = null; State.sukunaKilledBy = null;
    State.sukunaSlashes = []; State.sukunaFires = [];
    io.emit('syncCursePortal', null);
    io.emit('syncSukunaPortal', null);
    io.emit('syncSukuna', State.sukuna);
    io.emit('syncSukunaFires', []);

    // 🗣️ NPC 초기화
    State.npcs = makeNpcs();
    io.emit('syncNpcs', State.npcs);

    io.emit('syncHinbeomPortal', null);
    io.emit('syncDarkPortal', null);
    io.emit('syncBlackbeardPortal', null);
    io.emit('burgessDespawn');

    State.turrets = makeTurrets();
    State.teamStorages = { 1: [], 2: [] };
    State.okras.forEach(ok => {
        Bosses.rerollOkraGrade(ok);
        ok.x = ok.homeX; ok.y = ok.homeY; ok.state = 'idle'; ok.targetId = null;
        Object.assign(ok, S.baseStatus());
    });

    for (let k in compressors) compressors[k].snapshots.clear();
}


// ============================================================================
// 🔌 재접속
// ============================================================================
function tryReconnect(socket, sessionId) {
    if (!State.gameStarted || !sessionId) return false;

    let oldId = null;
    for (let pid in State.players) {
        if (State.players[pid].sessionId === sessionId && State.players[pid].disconnected) { oldId = pid; break; }
    }
    if (!oldId) return false;

    let p = State.players[oldId];
    delete State.players[oldId];
    p.id = socket.id; p.disconnected = false;
    State.players[socket.id] = p;

    p.portalDwellUntil = 0; p.portalDwellStart = 0;
    p.darkDwellUntil = 0; p.darkDwellStart = 0;
    Object.assign(p, LOCK_FIELDS_RESET);
    if (!isNum(p.x)) p.x = State.bases[p.team] ? State.bases[p.team].x : 12800;
    if (!isNum(p.y)) p.y = 1955;
    if (!isNum(p.knockbackForce)) p.knockbackForce = 0;

    State.amberTrails.forEach(tr => { if (tr.ownerId === oldId) tr.ownerId = socket.id; });
    State.waveChains.forEach(w => { if (w.ownerId === oldId) w.ownerId = socket.id; });
    State.waveEchoes.forEach(e => { if (e.ownerId === oldId) e.ownerId = socket.id; });

    compressors.playerDelta.remove(oldId);

    [State.monster, State.hinbeom, State.blackbeard, State.burgess].forEach(m => { if (m && m.targetId === oldId) m.targetId = null; });
    const bb = State.blackbeard;
    if (bb.crowsPendingTarget === oldId) bb.crowsPendingTarget = null;
    if (bb.crowsActiveTarget === oldId) { bb.crowsActiveTarget = null; bb.crowsHitAt = 0; }
    State.hinbeomMinions.forEach(mn => { if (mn.targetId === oldId) mn.targetId = null; });
    State.okras.forEach(ok => { if (ok.targetId === oldId) ok.targetId = null; });

    for (let i = State.yamiBinds.length - 1; i >= 0; i--) {
        let b = State.yamiBinds[i];
        if (b.ownerId === oldId || b.targetId === oldId) State.yamiBinds.splice(i, 1);
    }
    for (let i = State.guraCharges.length - 1; i >= 0; i--) {
        if (State.guraCharges[i].ownerId === oldId) State.guraCharges.splice(i, 1);
    }

    if (State.hinbeom.damageBy && State.hinbeom.damageBy[oldId] !== undefined) {
        State.hinbeom.damageBy[socket.id] = (State.hinbeom.damageBy[socket.id] || 0) + State.hinbeom.damageBy[oldId];
        delete State.hinbeom.damageBy[oldId];
    }

    State.detectors.forEach(d => { if (d.ownerId === oldId) { d.ownerId = socket.id; d.id = 'd_' + socket.id; } });
    [State.maguBombs, State.justiceBombs, State.giantPartisanQueue].forEach(arr => {
        arr.forEach(b => { if (b.ownerId === oldId) b.ownerId = socket.id; if (b.targetId === oldId) b.targetId = socket.id; });
    });
    State.mantleBolts.forEach(b => { if (b.ownerId === oldId) b.ownerId = socket.id; });

    let oldBurns = State.burnMap.get(oldId);
    if (oldBurns) { State.burnMap.set(socket.id, oldBurns); State.burnMap.delete(oldId); }
    for (let [, stacks] of State.burnMap) stacks.forEach(st => { if (st.ownerId === oldId) st.ownerId = socket.id; });

    socket.emit('reconnectSuccess', {
        players: State.players, bases: State.bases, detectors: State.detectors,
        teamStorages: State.teamStorages, myPlayer: p,
        monster: State.monster, okras: State.okras,
        hinbeom: State.hinbeom, minions: State.hinbeomMinions,
        hinbeomPortal: State.hinbeomPortal, darkPortal: State.darkPortal,
        blackbeard: State.blackbeard, burgess: State.burgess,
        blackbeardPortal: State.blackbeardPortal,
        // 🔥 저주의 왕
        cursePortal: State.cursePortal,
        sukuna: State.sukuna, sukunaPortal: State.sukunaPortal,
        sukunaFires: State.sukunaFires,
        // 🗣️ NPC 목록
        npcs: State.npcs
    });
    io.emit('playerLeft', oldId);
    io.emit('syncPlayerFull', p);
    return true;
}

module.exports = {
    wire,
    // 🔯 법진 수치
    BEOPJIN_MAX_STACK, BEOPJIN_HP_PER_KILL, BEOPJIN_REGEN_PER_KILL, BEOPJIN_DEF_PER_KILL,
    LOCK_FIELDS_RESET,
    addBeopjinKill, recalcStats, applyBaseDamage, clampSpecialArea,
    checkPlayerDeath, resetGame, tryReconnect
};
