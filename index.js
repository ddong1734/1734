// 파일명: index.js
// ============================================================================
// 🎮 서버 진입점 — 소켓 이벤트 처리와 모듈 조립만 담당한다.
//      server/config.js  : 모든 수치 상수
//      server/state.js   : State · 델타 압축기 · 엔티티 팩토리 · 영역 판정
//      server/damage.js  : 광역 피해 (AoE / Box / IceAge / ShockBlast)
//      server/bosses.js  : 보스 3종 처치·부활·드롭·어그로
//      server/fruits.js  : 흔들흔들 / 어둠어둠 열매 + 캐스팅 워치독
//      charLogic/kashimo.js : ⚡ 카시모 반격 · 전하 · 주력 방출 · 환수호박 · 전격 돌진
//
// 🗣️ NPC '티치' 대화 · 퀘스트 시스템
//      · 각 팀 정글 상단 발판 중앙에 한 명씩 (상대팀 NPC 와는 상호작용 불가)
//      · 대화 중에는 이동 · 점프 · 평타 · 스킬이 전부 봉인된다
//      · 퀘스트 : 체리파이 1개 제출 → 랜덤 악마의 열매 2개 보상
// ============================================================================

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// ============================================================================
// 🛟 [최우선 안정화] 전역 예외 방어
// ============================================================================
process.on('uncaughtException', (err) => { console.error('[UNCAUGHT EXCEPTION]', err); });
process.on('unhandledRejection', (err) => { console.error('[UNHANDLED REJECTION]', err); });

const Characters = require('./characters.js');
const Skills = require('./skills.js');
const Items = require('./items.js');
const CharLogic = {
    'PARK': require('./charLogic/park.js'),
    'BORSALINO': require('./charLogic/borsalino.js'),
    'KUZAN': require('./charLogic/kuzan.js'),
    'SAKAZUKI': require('./charLogic/sakazuki.js'),
    'ENEL': require('./charLogic/enel.js'),
    'KASHIMO': require('./charLogic/kashimo.js')      // ⚡ 카시모 하지메
};

const ShopManager = require('./shopManager.js');
const GameLoop = require('./gameLoop.js');

const C = require('./server/config.js');
const S = require('./server/state.js');
const { State, compressors, makeHinbeom, makeBlackbeard, makeBurgess,
        makeMonster, makeBases, makeTurrets, makePlayer, makeNpcs,
        isInHinbeomArea, isInDarkArea, isInDarkZone, isInCrowsBeam, burgessAlive,
        getMinion, getNpc } = S;

// ⚡ 카시모 고유 특성 모듈
const Kashimo = CharLogic.KASHIMO;

// ============================================================================
// 🧱 세로벽(solid) 목록 — 환수호박 전격 돌진이 이걸 통과하지 못한다.
//    data.js 의 Platforms 중 solid:true 인 항목과 반드시 동일해야 한다.
//    (가로 발판은 여기 없으므로 돌진으로 자유롭게 넘을 수 있다)
// ============================================================================
const SOLID_WALLS = [
    // 🧱 중앙 정글 왼쪽 끝 벽
    { x: 11560, y: -900,  w: 40, h: 900 },
    // 🧱 중앙 정글 오른쪽 끝 벽
    { x: 20400, y: -900,  w: 40, h: 900 },
    // 🧱 최상단 바구니 좌우 벽
    { x: 13400, y: -2200, w: 40, h: 800 },
    { x: 18560, y: -2200, w: 40, h: 800 },
    // 🧱 레드팀 정글 끝 차단벽
    { x: 30700, y: -1000, w: 40, h: 3000 },
    // ⚫ 암흑 왕좌 좌우 벽
    { x: 36000, y: -1000, w: 40, h: 3000 },
    { x: 40960, y: -1000, w: 40, h: 3000 }
];

app.use(express.static(__dirname));
app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

// ============================================================================
// 🔧 기본 유틸
// ============================================================================

/** 🛟 유한한 숫자인가 */
function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }

function emitDamageText(x, y, damage) {
    if (!isNum(x) || !isNum(y) || !isNum(damage)) return;
    if (damage >= 1) io.emit('floatingText', { x: x, y: y - 40, val: Math.round(damage), type: 'damage' });
}

function getRequiredXp(level) {
    if (level >= 50) return 999999;
    let req = 100; for (let i = 1; i <= level; i++) req += i * 5;
    return req;
}

function gainXp(p, amount) {
    if (!p) return;
    if (p.level >= 50) return;
    if (!isNum(amount)) return;
    p.xp += amount;
    let leveledUp = false;
    while (p.level < 50 && p.xp >= p.maxXp) { p.xp -= p.maxXp; p.level++; p.maxXp = getRequiredXp(p.level); leveledUp = true; }
    if (leveledUp) { recalcStats(p); io.emit('levelUp', p.id); }
    io.emit('syncPlayerFull', p);
}

function recalcStats(p) {
    let charType = p.characterType || 'PARK';
    let char = Characters[charType] || Characters.PARK;
    let oldMax = p.maxHp || char.hp;

    p.maxHp = char.hp + ((p.level || 0) * 300);
    p.speedMult = char.speedMult || 1.0;
    p.attackSpeedMult = 1.0; p.bonusDamage = ((p.level || 0) * 3);
    p.defense = 0; p.hpRegen = 0; p.orbitSpheres = 0;
    p.hasJokbal = false; p.hasDaluFengwei = false; p.hasJadam = false;
    p.seolgonnyakCount = 0; p.hasPepsiArt = false;
    p.hasPika = false; p.hasHie = false; p.hasMagu = false; p.hasJusticeCoat = false;
    p.hasKizaru = false; p.hasAokiji = false; p.hasAkainu = false;
    p.hasGoro = false; p.hasArkMaxim = false; p.hasGodEnel = false;
    p.hasGura = false; p.hasYami = false;
    // 🏵️🌩️ 카시모 전용 아이템
    p.hasYeoui = false; p.hasRaijin = false;

    const FLAGS = ['hasJokbal','hasDaluFengwei','hasJadam','hasPepsiArt','hasPika','hasHie','hasMagu',
                   'hasJusticeCoat','hasKizaru','hasAokiji','hasAkainu','hasGoro','hasArkMaxim','hasGodEnel',
                   'hasGura','hasYami',
                   'hasYeoui','hasRaijin'];
    const NUMS = { maxHp: 1, speedMult: 1, bonusDamage: 1, defense: 1, hpRegen: 1, attackSpeedMult: 1, orbitSpheres: 1 };

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
// 🔥 화상(도트) 처리
// ============================================================================
function addBurn(key, entity, dps, dur, ownerId) {
    if (!entity) return;
    let now = Date.now();
    if (!State.burnMap.has(key)) State.burnMap.set(key, []);
    State.burnMap.get(key).push({ dps: dps, endTime: now + dur, ownerId: ownerId, nextTick: now + 1000 });
    entity.burningUntil = Math.max(entity.burningUntil || 0, now + dur);
    io.emit('setBurn', { id: key, until: entity.burningUntil });
}

function clearBurns(key, entity) { State.burnMap.delete(key); if (entity) entity.burningUntil = 0; }

/** 화상 키 → { entity, kind } */
function resolveBurnKey(key) {
    if (key === 'monster') return { e: State.monster, kind: 'monster' };
    if (key === 'hinbeom') return { e: State.hinbeom, kind: 'hinbeom' };
    if (key === 'blackbeard') return { e: State.blackbeard, kind: 'blackbeard' };
    if (key === 'burgess') return { e: State.burgess, kind: 'burgess' };
    if (typeof key === 'string' && key.startsWith('minion_')) return { e: getMinion(parseInt(key.slice(7))), kind: 'minion' };
    if (typeof key === 'string' && key.startsWith('okra_')) return { e: S.getOkra(parseInt(key.slice(5))), kind: 'okra' };
    return { e: State.players[key], kind: 'player' };
}

function processBurns(now) {
    for (let [key, stacks] of State.burnMap) {
        let { e: entity, kind } = resolveBurnKey(key);
        if (!entity || entity.hp <= 0 || (kind === 'player' && entity.isDead)) {
            State.burnMap.delete(key); if (entity) entity.burningUntil = 0; continue;
        }

        let dmg = 0, lastOwner = null;
        for (let i = stacks.length - 1; i >= 0; i--) {
            let b = stacks[i];
            let guard = 0;
            while (now >= b.nextTick && b.nextTick <= b.endTime && guard++ < 64) {
                dmg += b.dps; lastOwner = b.ownerId; b.nextTick += 1000;
            }
            if (guard >= 64) b.nextTick = now + 1000;
            if (now >= b.endTime) stacks.splice(i, 1);
        }
        if (stacks.length === 0) { State.burnMap.delete(key); entity.burningUntil = 0; }
        if (dmg <= 0) continue;

        if (kind === 'player') {
            let actual = dmg * (1 - (entity.defense || 0));
            entity.hp -= actual;
            emitDamageText(entity.x, entity.y, actual);
            io.to(key).emit('takeDamage', actual);
            if (entity.hp <= 0) checkPlayerDeath(entity, lastOwner);
            continue;
        }
        if (kind === 'hinbeom' && (State.hinbeom.state === 'dead' || State.hinbeomMinions.length > 0)) continue;
        if (kind === 'blackbeard' && State.blackbeard.state === 'dead') continue;

        entity.hp -= dmg;
        emitDamageText(entity.x, entity.y, dmg);
        if (kind === 'hinbeom') Bosses.recordHinbeomDamage(lastOwner, dmg);
        if (kind === 'blackbeard') Bosses.checkBurgessSummon();

        if (entity.hp <= 0) {
            if (kind === 'monster') Bosses.killMonster(lastOwner);
            else if (kind === 'hinbeom') Bosses.killHinbeom(lastOwner);
            else if (kind === 'blackbeard') Bosses.killBlackbeard(lastOwner);
            else if (kind === 'burgess') Bosses.killBurgess(lastOwner);
            else if (kind === 'minion') Bosses.killMinion(entity, lastOwner);
            else if (kind === 'okra') Bosses.killOkra(entity, lastOwner);
        }
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
    // 🗣️ NPC 대화 상태도 함께 정리한다
    npcTalking: null, npcMode: null, npcLine: 0, npcNoExit: false,
    _castStuckSince: 0
};

function checkPlayerDeath(targetPlayer, attackerId) {
    if (!targetPlayer) return;
    if (targetPlayer.hp > 0 || targetPlayer.isDead) return;

    if (isInDarkZone(targetPlayer)) targetPlayer.darkBanned = true;

    if (targetPlayer.surgeActive) io.emit('kashimoSurgeEnd', { id: targetPlayer.id });

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
// 🧩 모듈 조립 (순환 참조는 지연 바인딩으로 해결)
// ============================================================================
let Damage = null, Bosses = null, Fruits = null;

const deferred = {
    get io() { return io; },
    emitDamageText, checkPlayerDeath, gainXp, clearBurns, applyBaseDamage,
    killMonster:  (...a) => Bosses.killMonster(...a),
    killHinbeom:  (...a) => Bosses.killHinbeom(...a),
    killBlackbeard: (...a) => Bosses.killBlackbeard(...a),
    killBurgess:  (...a) => Bosses.killBurgess(...a),
    killMinion:   (...a) => Bosses.killMinion(...a),
    killOkra:     (...a) => Bosses.killOkra(...a),
    aggroHinbeom: (...a) => Bosses.aggroHinbeom(...a),
    aggroBlackbeard: (...a) => Bosses.aggroBlackbeard(...a),
    aggroBurgess: (...a) => Bosses.aggroBurgess(...a),
    recordHinbeomDamage: (...a) => Bosses.recordHinbeomDamage(...a),
    checkBurgessSummon: (...a) => Bosses.checkBurgessSummon(...a),
    applyShockBlast: (...a) => Damage.applyShockBlast(...a)
};

Bosses = require('./server/bosses.js')(deferred);
Damage = require('./server/damage.js')(deferred);
Fruits = require('./server/fruits.js')(deferred);

Bosses.initOkras();

// ============================================================================
// 🧾 서버 컨텍스트
// ============================================================================
const serverContext = Object.assign({
    get io() { return io; }, get Skills() { return Skills; },
    get Items() { return Items; }, get Characters() { return Characters; },
    State, compressors, CharLogic,
    // 🧱 환수호박 전격 돌진이 통과할 수 없는 세로벽 목록
    SOLID_WALLS,
    getPlayers: () => State.players, getMonster: () => State.monster, getOkras: () => State.okras,
    getHinbeom: () => State.hinbeom, getMinions: () => State.hinbeomMinions,
    getBlackbeard: () => State.blackbeard, getBurgess: () => State.burgess,
    // 🗣️ NPC
    getNpcs: () => State.npcs, getNpc,
    emitDamageText, checkPlayerDeath, gainXp, recalcStats, applyBaseDamage,
    addBurn, clearBurns, processBurns,
    addShockwave: (sw) => State.shockwaves.push(sw),
    addProjectile: (proj) => State.projectiles.push(proj),
    addMagma: (m) => State.magmas.push(m),
    addMantleBolt: (b) => State.mantleBolts.push(b),
    getNextProjId: () => State.projIdCounter++,
    isInHinbeomArea, isInDarkArea, isInDarkZone, isInCrowsBeam, burgessAlive, getMinion,
    // ⚡ 카시모 고유 특성
    Kashimo,
    kashimoAddCharge: (obj, kind, id) => Kashimo.addCharge(obj, kind, id, serverContext),
    kashimoDecayCharge: (obj, kind, id, now) => Kashimo.decayCharge(obj, kind, id, now, serverContext),
    kashimoApplyShockStun: (obj, kind, dur) => Kashimo.applyShockStun(obj, kind, dur, serverContext),
    kashimoCounterMob: (victim, mob, mobKind, mobId) => Kashimo.applyCounterShockToMob(victim, mob, mobKind, mobId, serverContext),
    kashimoProcessAmberTrails: (now) => Kashimo.processAmberTrails(now, serverContext),
    kashimoProcessWaveChains: (now) => Kashimo.processWaveChains(now, serverContext)
}, C, Damage, Bosses, Fruits);

// ============================================================================
// 🗣️ NPC 대화 헬퍼
// ============================================================================

/** 🗣️ 현재 대화 모드에 해당하는 대사 배열 */
function tichLines(mode) {
    return (mode === 'turnin') ? C.TICH_LINES_TURNIN : C.TICH_LINES_INTRO;
}

/** 🗣️ 대화를 끝내고 모든 잠금을 해제한다 */
function endNpcTalk(p) {
    if (!p) return;
    p.npcTalking = null; p.npcMode = null; p.npcLine = 0; p.npcNoExit = false;
    io.to(p.id).emit('npcDialogEnd');
    io.emit('syncPlayerFull', p);
}

/** 🗣️ 현재 줄을 클라이언트에 보낸다 */
function sendNpcLine(p, npc) {
    let lines = tichLines(p.npcMode);
    let text = lines[p.npcLine] || '';
    // 🚪 [나가기] 버튼 : turnin 모드에서 체리파이를 넘긴 뒤에는 사라진다
    let canExit = !p.npcNoExit;
    io.to(p.id).emit('npcDialog', {
        npcId: npc.id, name: npc.name,
        mode: p.npcMode, line: p.npcLine,
        total: lines.length,
        text: text, canExit: canExit
    });
}

/** 🎁 티치 퀘스트 보상 : 랜덤 악마의 열매 2개 */
function giveTichReward(p) {
    let pool = C.TICH_REWARD_FRUITS.slice();
    let got = [];
    for (let i = 0; i < C.TICH_REWARD_COUNT; i++) {
        if (pool.length === 0) break;
        let idx = Math.floor(Math.random() * pool.length);
        let id = pool.splice(idx, 1)[0];
        if (p.inventory.length >= 20) {
            io.to(p.id).emit('goldenDrop', { msg: '인벤토리가 가득 차 보상을 놓쳤습니다!', fail: true });
            break;
        }
        p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: id });
        got.push(id);
    }
    recalcStats(p);
    io.to(p.id).emit('buySuccess', p);
    if (got.length > 0) io.to(p.id).emit('npcReward', { items: got });
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
        // 🗣️ NPC 목록
        npcs: State.npcs
    });
    io.emit('playerLeft', oldId);
    io.emit('syncPlayerFull', p);
    return true;
}

// ============================================================================
// 🗡️ 평타 처리
//    ⚡🔮 환수호박 중인 카시모는 평타 대신 전격 돌진이 나간다.
// ============================================================================
function handleBasicAttack(socket, attacker, actionData) {
    let now = Date.now();
    let myDamage = attacker.baseDamage + attacker.bonusDamage;
    let charType = attacker.characterType;
    let kb = (['BORSALINO', 'KUZAN', 'SAKAZUKI', 'ENEL', 'KASHIMO'].includes(charType)) ? 0 : (actionData.dir * 15);
    let isBors = charType === 'BORSALINO';
    let isKuzan = charType === 'KUZAN';
    let isSaka = charType === 'SAKAZUKI';
    let isKashimo = charType === 'KASHIMO';

    if (!isNum(myDamage)) return;
    if (!isNum(kb)) kb = 0;

    let hitRadius = isBors ? 165 : 105;
    let pveHitRadius = isBors ? 120 : 60;

    let freezeChance = (isKuzan ? 0.06 : 0) + (attacker.hasJokbal ? 0.06 : 0);
    const rollFreeze = (o) => {
        if (freezeChance > 0 && Math.random() < freezeChance) {
            o.frozenUntil = Math.max(o.frozenUntil || 0, now + 1000);
            return true;
        }
        return false;
    };

    let counterFired = false;
    const tryCounter = (victim) => {
        if (counterFired) return;
        if (!victim || victim.characterType !== 'KASHIMO') return;
        if (Kashimo.applyCounterShock(victim, attacker, serverContext)) counterFired = true;
    };

    let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
    if (enemyBase && Math.hypot(actionData.x - enemyBase.x, actionData.y - enemyBase.y) < hitRadius + 45) {
        applyBaseDamage(attacker.team, myDamage);
    }

    for (let tid in State.players) {
        if (tid === socket.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === attacker.team) continue;
        if (Math.hypot(actionData.x - t.x, actionData.y - t.y) >= hitRadius) continue;

        let actual = myDamage * (1 - (t.defense || 0));
        t.hp -= actual;
        emitDamageText(t.x, t.y, actual);

        if (isKashimo) Kashimo.addCharge(t, 'player', tid, serverContext);

        if (t.hp <= 0) { checkPlayerDeath(t, socket.id); continue; }
        io.to(tid).emit('takeDamage', actual);
        if (isSaka) addBurn(tid, t, 20, 2000, attacker.id);
        if (rollFreeze(t)) io.emit('syncPlayerFull', t);

        tryCounter(t);
    }

    if (!counterFired) {
        for (let tid in State.players) {
            if (tid === socket.id) continue;
            let t = State.players[tid];
            if (!t || t.isDead || t.team === attacker.team) continue;
            if (t.characterType !== 'KASHIMO') continue;
            if (Math.hypot(actionData.x - t.x, actionData.y - t.y) >= hitRadius) continue;
            tryCounter(t);
            if (counterFired) break;
        }
    }

    const hitTest = (o, r) => Math.hypot(actionData.x - o.x, actionData.y - o.y) < pveHitRadius + r;
    Damage.forEachTarget(attacker, hitTest, (t) => {
        if (t.kind === 'player') return;
        Damage.hurt(t, attacker, myDamage, kb, {
            onMobExtra: (o, kind, id) => {
                rollFreeze(o);
                if (isKashimo) Kashimo.addCharge(o, kind, id, serverContext);
                if (isSaka) {
                    let key = (kind === 'minion') ? ('minion_' + id) : (kind === 'okra') ? ('okra_' + id) : kind;
                    addBurn(key, o, 20, 2000, attacker.id);
                }
            }
        });
    });
}

/** 🛟 클라이언트가 보낸 스킬/평타 데이터를 안전한 값으로 정규화한다. */
function sanitizeActionData(p, data) {
    if (!data || typeof data !== 'object') return null;
    if (data.dir !== 1 && data.dir !== -1) data.dir = (p.lastFacing === -1) ? -1 : 1;
    if (!isNum(data.x)) data.x = p.x;
    if (!isNum(data.y)) data.y = p.y;
    if (!isNum(data.dirX)) data.dirX = 0;
    if (!isNum(data.dirY)) data.dirY = 0;
    if (!isNum(data.lifeFrames)) data.lifeFrames = 12;
    return data;
}

// ============================================================================
// 🔌 소켓 이벤트
// ============================================================================
io.on('connection', (socket) => {
    ShopManager.registerEvents(socket, serverContext);

    socket.on('pingCheck', (ts) => { socket.emit('pongCheck', ts); });

    socket.on('attemptReconnect', (data) => {
        let sessionId = (data && data.sessionId) ? data.sessionId : null;
        if (!tryReconnect(socket, sessionId)) socket.emit('reconnectUnavailable');
    });

    socket.on('joinLobby', (data) => {
        let nick = typeof data === 'string' ? data : data.nickname;
        let charType = typeof data === 'string' ? 'PARK' : (data.character || 'PARK');
        let sessionId = (data && data.sessionId) ? data.sessionId : null;

        if (State.gameStarted) {
            if (tryReconnect(socket, sessionId)) return;
            socket.emit('joinFail', '이미 게임이 진행 중입니다.'); return;
        }
        if (Object.keys(State.players).length >= 6) { socket.emit('joinFail', '로비가 가득 찼습니다.'); return; }
        if (!State.masterId) State.masterId = socket.id;

        let bCount = 0, rCount = 0;
        for (let id in State.players) { if (State.players[id].team === 1) bCount++; else rCount++; }

        State.players[socket.id] = makePlayer({
            id: socket.id, nick: nick, charType: charType,
            team: (bCount <= rCount) ? 1 : 2,
            sessionId: sessionId, Characters: Characters
        });
        io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId });
    });

    socket.on('toggleTeam', (targetId) => {
        if (State.masterId !== socket.id) return;
        let t = State.players[targetId];
        if (!t) return;
        t.team = t.team === 1 ? 2 : 1;
        t.x = t.team === 1 ? 12800 : 19200;
        io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId });
    });

    socket.on('startGame', () => {
        if (State.masterId !== socket.id || Object.keys(State.players).length === 0) return;
        for (let k in compressors) compressors[k].snapshots.clear();
        State.gameStarted = true;
        io.emit('gameStartSign', State.players);
        io.emit('syncDetectors', State.detectors);
        io.emit('syncTeamStorage', State.teamStorages);
        io.emit('syncHinbeomPortal', State.hinbeomPortal);
        io.emit('syncDarkPortal', State.darkPortal);
        io.emit('syncBlackbeardPortal', State.blackbeardPortal);
        // 🗣️ NPC 목록 전송
        io.emit('syncNpcs', State.npcs);
    });

    socket.on('playerMove', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        if (!data || !isNum(data.x) || !isNum(data.y)) return;
        let now = Date.now();
        if (now - (p.lastRespawn || 0) < 500) return;
        if (now - (p.lastPortalUse || 0) < 500) return;
        if (now - (p.lastDarkPortalUse || 0) < 500) return;
        // 🗣️ NPC 대화 중에는 좌표를 갱신하지 않는다 (완전 고정)
        if (p.npcTalking) return;
        if (p.isCasting && (p.characterType === 'BORSALINO' || p.iceAgeActive || p.elThorActive)) return;
        // ⚡🔮 음파 경직 · ⚡🌋 주력 방출 중에는 좌표를 갱신하지 않는다 (완전 고정)
        if (now < (p.sonicChargeUntil || 0)) return;
        if (now < (p.surgeLockUntil || 0)) return;
        p.x = data.x; p.y = data.y;
        let pDelta = compressors.playerDelta.getDelta(socket.id, p);
        if (pDelta) socket.broadcast.emit('enemyUpdate', pDelta);
    });

    socket.on('skill3Aim', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead || !p.skill3Active || p.characterType !== 'BORSALINO') return;
        if (!data || !isNum(data.dirX) || !isNum(data.dirY)) return;
        if (data.dirX !== 0 || data.dirY !== 0) { p.skill3DirX = data.dirX; p.skill3DirY = data.dirY; }
    });

    socket.on('borsLightDash', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead || p.characterType !== 'BORSALINO') return;
        if (p.npcTalking) return;                    // 🗣️ 대화 중 봉인
        if (Fruits.isActionLocked(p)) return;
        let dir = (data && data.dir === -1) ? -1 : 1;
        io.emit('borsLightDash', { id: socket.id, dir: dir, duration: 220 });
        let minX = dir === 1 ? p.x : p.x - 450;
        let maxX = dir === 1 ? p.x + 450 : p.x;
        Damage.applyBoxDamage(p, minX, maxX, p.y - 70, p.y + 70, 70, 0);
    });

    socket.on('useSkill', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        if (p.npcTalking) return;                    // 🗣️ 대화 중 봉인
        if (Fruits.isActionLocked(p)) return;
        let now = Date.now();
        if (now < (p.sonicChargeUntil || 0)) return;
        if (now < (p.surgeLockUntil || 0)) return;
        let safeData = sanitizeActionData(p, data);
        if (!safeData) return;
        let logic = CharLogic[p.characterType];
        if (logic && logic.useSkill) logic.useSkill(p, safeData, serverContext);
    });

    socket.on('landSkill1', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        if (p.npcTalking) return;                    // 🗣️ 대화 중 봉인
        let safeData = sanitizeActionData(p, data);
        if (!safeData) return;
        let logic = CharLogic[p.characterType];
        if (logic && logic.landSkill1) logic.landSkill1(p, safeData, serverContext);
    });

    socket.on('action', (actionData) => {
        if (!State.gameStarted) return;
        let attacker = State.players[socket.id];
        if (!attacker || attacker.isDead || attacker.isCasting) return;
        if (attacker.npcTalking) return;             // 🗣️ 대화 중 봉인
        if (Fruits.isActionLocked(attacker)) return;
        let now = Date.now();
        if (now < (attacker.sonicChargeUntil || 0)) return;
        if (now < (attacker.surgeLockUntil || 0)) return;

        let safeData = sanitizeActionData(attacker, actionData);
        if (!safeData) return;

        // ⚡🔮 [수정] 환수호박 중인 카시모는 평타 대신 전격 돌진이 나간다.
        //    true 를 반환하면 일반 평타 처리를 전부 건너뛴다.
        if (attacker.characterType === 'KASHIMO' && attacker.amberActive) {
            Kashimo.tryAmberDash(attacker, safeData, serverContext);
            return;
        }

        io.emit('actionEffect', {
            id: socket.id, type: safeData.type, x: safeData.x, y: safeData.y,
            dir: safeData.dir, life: safeData.lifeFrames, maxLife: safeData.lifeFrames
        });

        if (safeData.type === 'thunder_bolt') {
            let dir = safeData.dir;
            State.projectiles.push({
                id: State.projIdCounter++, team: attacker.team, type: 'thunder_bolt', ownerId: socket.id,
                x: attacker.x + (dir * 60), y: attacker.y - 20,
                vx: dir * 40, vy: 0,
                life: 45, damage: attacker.baseDamage + attacker.bonusDamage,
                hitR: 45, edgeR: 20, canHitBase: true, piercing: false
            });
            Fruits.triggerFruitOnAttack(attacker, dir);
            return;
        }

        handleBasicAttack(socket, attacker, safeData);
        Fruits.triggerFruitOnAttack(attacker, safeData.dir);
    });

    // ========================================================================
    // 🗣️ NPC 대화 이벤트
    // ========================================================================

    /** 🗣️ 상호작용 시작 */
    socket.on('npcInteract', (npcId) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        if (p.npcTalking) return;
        if (!State.gameStarted) return;

        let npc = getNpc(npcId);
        if (!npc) return;
        // 🚫 상대팀 NPC 에게는 상호작용할 수 없다
        if (npc.team !== p.team) return socket.emit('buyFail', '상대팀 NPC 입니다.');
        // 📏 거리 검사
        if (Math.hypot(p.x - npc.x, p.y - npc.y) > C.NPC_INTERACT_RANGE) return;
        // ✅ 퀘스트가 이미 완료된 NPC 는 다시 상호작용할 수 없다
        if ((p.tichStage || 0) >= 2) return;

        let mode;
        if ((p.tichStage || 0) === 0) {
            mode = 'intro';
        } else {
            // 퀘스트 진행 중 : 체리파이를 갖고 있어야 대화가 열린다
            if (!p.inventory.some(i => i.id === C.TICH_QUEST_ITEM)) {
                return socket.emit('buyFail', "'체리파이'가 없습니다!");
            }
            mode = 'turnin';
        }

        p.npcTalking = npc.id;
        p.npcMode = mode;
        p.npcLine = 0;
        p.npcNoExit = false;

        sendNpcLine(p, npc);
        io.emit('syncPlayerFull', p);
    });

    /** 🟢 [동의합니다] — 다음 대사로 진행 */
    socket.on('npcAgree', () => {
        let p = State.players[socket.id];
        if (!p || !p.npcTalking) return;
        let npc = getNpc(p.npcTalking);
        if (!npc) { endNpcTalk(p); return; }

        let lines = tichLines(p.npcMode);

        // 🍒 turnin 모드 첫 대사에서 동의하면 체리파이 1개가 사라지고
        //    이후 대사부터 [나가기] 버튼이 사라진다
        if (p.npcMode === 'turnin' && p.npcLine === 0 && !p.npcNoExit) {
            let idx = p.inventory.findIndex(i => i.id === C.TICH_QUEST_ITEM);
            if (idx === -1) {
                socket.emit('buyFail', "'체리파이'가 없습니다!");
                endNpcTalk(p);
                return;
            }
            let uid = p.inventory[idx].uid;
            p.equippedUids = p.equippedUids.filter(u => u !== uid);
            p.inventory.splice(idx, 1);
            p.npcNoExit = true;
            recalcStats(p);
            socket.emit('buySuccess', p);
        }

        p.npcLine++;

        if (p.npcLine >= lines.length) {
            // ── 대화 종료 ────────────────────────────────────────────
            if (p.npcMode === 'intro') {
                p.tichStage = 1;
                io.to(p.id).emit('npcQuest', { text: C.TICH_QUEST_TEXT });
            } else {
                p.tichStage = 2;
                io.to(p.id).emit('npcQuest', { text: null });
                giveTichReward(p);
            }
            endNpcTalk(p);
            return;
        }

        sendNpcLine(p, npc);
    });

    /** 🔴 [나가기] — 대화 즉시 종료 */
    socket.on('npcExit', () => {
        let p = State.players[socket.id];
        if (!p || !p.npcTalking) return;
        if (p.npcNoExit) return;                     // 🚫 체리파이를 넘긴 뒤에는 나갈 수 없다
        endNpcTalk(p);
    });

    socket.on('disconnect', () => {
        let dp = State.players[socket.id];
        if (dp && dp.surgeActive) {
            dp.surgeActive = false; dp.surgeEnd = 0; dp.surgeNextTick = 0; dp.surgeLockUntil = 0;
            io.emit('kashimoSurgeEnd', { id: socket.id });
        }
        // 🗣️ 대화 중이었다면 상태를 정리한다
        if (dp && dp.npcTalking) {
            dp.npcTalking = null; dp.npcMode = null; dp.npcLine = 0; dp.npcNoExit = false;
        }
        for (let i = State.amberTrails.length - 1; i >= 0; i--) {
            if (State.amberTrails[i].ownerId === socket.id) State.amberTrails.splice(i, 1);
        }
        for (let i = State.waveChains.length - 1; i >= 0; i--) {
            if (State.waveChains[i].ownerId === socket.id) State.waveChains.splice(i, 1);
        }
        for (let i = State.waveEchoes.length - 1; i >= 0; i--) {
            if (State.waveEchoes[i].ownerId === socket.id) State.waveEchoes.splice(i, 1);
        }

        if (State.players[socket.id]) {
            if (State.gameStarted) {
                State.players[socket.id].disconnected = true;
                State.players[socket.id].disconnectTime = Date.now();
            } else {
                clearBurns(socket.id, State.players[socket.id]);
                delete State.players[socket.id];
                compressors.playerDelta.remove(socket.id);
                io.emit('playerLeft', socket.id);
            }
        }
        Fruits.clearYamiBindsFor(socket.id);
        Fruits.clearGuraChargesFor(socket.id);

        const bb = State.blackbeard;
        if (bb) {
            if (bb.crowsPendingTarget === socket.id) bb.crowsPendingTarget = null;
            if (bb.crowsActiveTarget === socket.id) { bb.crowsActiveTarget = null; bb.crowsHitAt = 0; io.emit('crowsEnd', { id: socket.id }); }
        }
        if (State.burgess && State.burgess.targetId === socket.id) State.burgess.targetId = null;

        let remaining = Object.keys(State.players).filter(pid => !State.players[pid].disconnected);
        if (remaining.length === 0) resetGame();
        else if (socket.id === State.masterId) {
            State.masterId = remaining[0];
            io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId });
        }
    });
});

// ============================================================================
// 🔁 메인 루프
// ============================================================================
let _loopRunning = false;
let _loopWarnAt = 0;

setInterval(() => {
    if (_loopRunning) return;
    _loopRunning = true;
    const t0 = Date.now();
    try {
        GameLoop.update(serverContext);
    } catch (e) {
        console.error('[GAME LOOP ERROR]', e);
    } finally {
        _loopRunning = false;
        const dt = Date.now() - t0;
        if (dt > 100) {
            const nowW = Date.now();
            if (nowW - _loopWarnAt > 5000) { _loopWarnAt = nowW; console.warn('[GAME LOOP SLOW] ' + dt + 'ms'); }
        }
    }
}, 1000 / 60);

http.listen(process.env.PORT || 3000, () => { console.log('서버 가동 완료'); });