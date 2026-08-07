// 파일명: index.js
// ============================================================================
// 🎮 서버 진입점 — 소켓 이벤트 처리와 모듈 조립만 담당한다.
//    실제 로직은 아래 모듈로 분리되어 있다.
//      server/config.js  : 모든 수치 상수
//      server/state.js   : State · 델타 압축기 · 엔티티 팩토리 · 영역 판정
//      server/damage.js  : 광역 피해 (AoE / Box / IceAge / ShockBlast)
//      server/bosses.js  : 보스 3종 처치·부활·드롭·어그로
//      server/fruits.js  : 흔들흔들 / 어둠어둠 열매 + 캐스팅 워치독
// ============================================================================

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// ============================================================================
// 🛟 [최우선 안정화] 전역 예외 방어
//    예외가 하나라도 밖으로 새어 나가면 Node 프로세스가 그대로 종료되고,
//    모든 클라이언트는 소켓이 끊긴 채 화면이 굳어 '게임이 멈춘' 것처럼 보인다.
//    여기서 붙잡아 로그만 남기고 서버는 계속 살려 둔다.
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
    'ENEL': require('./charLogic/enel.js')
};

const ShopManager = require('./shopManager.js');
const GameLoop = require('./gameLoop.js');

const C = require('./server/config.js');
const S = require('./server/state.js');
const { State, compressors, makeHinbeom, makeBlackbeard, makeBurgess,
        makeMonster, makeBases, makeTurrets, makePlayer,
        isInHinbeomArea, isInDarkArea, isInDarkZone, isInCrowsBeam, burgessAlive,
        getMinion } = S;

app.use(express.static(__dirname));
app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

// ============================================================================
// 🔧 기본 유틸 (모듈들이 공유한다)
// ============================================================================

/** 🛟 유한한 숫자인가 (NaN / Infinity / 문자열 차단) */
function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }

function emitDamageText(x, y, damage) {
    if (!isNum(x) || !isNum(y) || !isNum(damage)) return;   // 🛟 NaN 좌표/피해 차단
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

    const FLAGS = ['hasJokbal','hasDaluFengwei','hasJadam','hasPepsiArt','hasPika','hasHie','hasMagu',
                   'hasJusticeCoat','hasKizaru','hasAokiji','hasAkainu','hasGoro','hasArkMaxim','hasGodEnel',
                   'hasGura','hasYami'];
    const NUMS = { maxHp: 1, speedMult: 1, bonusDamage: 1, defense: 1, hpRegen: 1, attackSpeedMult: 1, orbitSpheres: 1 };

    p.equippedUids.forEach(uid => {
        let item = p.inventory.find(i => i.uid === uid);
        if (!item || !Items[item.id] || !Items[item.id].stats) return;
        let stats = Items[item.id].stats;
        for (let k in NUMS) if (stats[k]) p[k] += stats[k];
        for (let i = 0; i < FLAGS.length; i++) if (stats[FLAGS[i]]) p[FLAGS[i]] = true;
        if (item.id === 'seolgonnyak') p.seolgonnyakCount = 1;
    });

    // ✅ [수정] 방어력 한도(상한) 제거 — 장착한 만큼 그대로 합산된다
    if (p.maxHp > oldMax) p.hp += (p.maxHp - oldMax);
    p.hp = Math.min(p.hp, p.maxHp);
    p.orbitSpeedMult = p.hasDaluFengwei ? 1.8 : 1.0;
}

function applyBaseDamage(attackerTeam, damage) {
    let enemyBase = State.bases[attackerTeam === 1 ? 2 : 1];
    if (!enemyBase || enemyBase.hp <= 0) return;
    if (!isNum(damage)) return;                       // 🛟 NaN 피해 차단
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
            // 🛟 [안정화] 틱 타임스탬프가 어긋나도 루프가 폭주하지 않도록 상한을 둔다
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
    _castStuckSince: 0
};

function checkPlayerDeath(targetPlayer, attackerId) {
    if (!targetPlayer) return;
    if (targetPlayer.hp > 0 || targetPlayer.isDead) return;

    if (isInDarkZone(targetPlayer)) targetPlayer.darkBanned = true;

    targetPlayer.hp = 0; targetPlayer.isDead = true;
    Object.assign(targetPlayer, LOCK_FIELDS_RESET);
    targetPlayer.partisanQueue = 0; targetPlayer.partisanFired = 0;
    targetPlayer.volcanoActive = false;
    targetPlayer.maguBombUntil = 0; targetPlayer.justiceBombUntil = 0; targetPlayer.skillFreezeUntil = 0;
    targetPlayer.portalDwellUntil = 0; targetPlayer.portalDwellStart = 0;
    targetPlayer.darkDwellUntil = 0; targetPlayer.darkDwellStart = 0;

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
            // ✅ 부활 시 잠금 상태를 남김없이 초기화 (스킬/평타 먹통 방지)
            Object.assign(targetPlayer, LOCK_FIELDS_RESET);
            targetPlayer.burningUntil = 0; targetPlayer.maguBombUntil = 0; targetPlayer.justiceBombUntil = 0;
            targetPlayer.skillFreezeUntil = 0; targetPlayer.electrocutedUntil = 0;
            targetPlayer.frozenUntil = 0; targetPlayer.airFreezeUntil = 0; targetPlayer.raigoPullUntil = 0;
            targetPlayer.knockbackForce = 0;
            io.emit('player_respawned', targetPlayer);
        } catch (e) { console.error('[RESPAWN]', e); }   // 🛟 타이머 예외로 서버가 죽지 않게
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
    // 아래는 Bosses / Damage 가 만들어진 뒤 채워진다
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
// 🧾 서버 컨텍스트 (게임 루프 · 캐릭터 로직에 전달)
// ============================================================================
const serverContext = Object.assign({
    get io() { return io; }, get Skills() { return Skills; },
    get Items() { return Items; }, get Characters() { return Characters; },
    State, compressors, CharLogic,
    getPlayers: () => State.players, getMonster: () => State.monster, getOkras: () => State.okras,
    getHinbeom: () => State.hinbeom, getMinions: () => State.hinbeomMinions,
    getBlackbeard: () => State.blackbeard, getBurgess: () => State.burgess,
    emitDamageText, checkPlayerDeath, gainXp, recalcStats, applyBaseDamage,
    addBurn, clearBurns, processBurns,
    addShockwave: (sw) => State.shockwaves.push(sw),
    addProjectile: (proj) => State.projectiles.push(proj),
    addMagma: (m) => State.magmas.push(m),
    addMantleBolt: (b) => State.mantleBolts.push(b),
    getNextProjId: () => State.projIdCounter++,
    isInHinbeomArea, isInDarkArea, isInDarkZone, isInCrowsBeam, burgessAlive, getMinion
}, C, Damage, Bosses, Fruits);

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
    // ✅ 재접속 시 캐스팅 잠금을 남김없이 초기화 (스킬/평타 먹통 방지)
    Object.assign(p, LOCK_FIELDS_RESET);
    if (!isNum(p.x)) p.x = State.bases[p.team] ? State.bases[p.team].x : 12800;   // 🛟 NaN 좌표 복구
    if (!isNum(p.y)) p.y = 1955;
    if (!isNum(p.knockbackForce)) p.knockbackForce = 0;

    compressors.playerDelta.remove(oldId);

    // 타깃 참조 정리
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
        blackbeardPortal: State.blackbeardPortal
    });
    io.emit('playerLeft', oldId);
    io.emit('syncPlayerFull', p);
    return true;
}

// ============================================================================
// 🗡️ 평타 처리 (근접 / 원거리 공통)
// ============================================================================
function handleBasicAttack(socket, attacker, actionData) {
    let now = Date.now();
    let myDamage = attacker.baseDamage + attacker.bonusDamage;
    let charType = attacker.characterType;
    let kb = (['BORSALINO', 'KUZAN', 'SAKAZUKI', 'ENEL'].includes(charType)) ? 0 : (actionData.dir * 15);
    let isBors = charType === 'BORSALINO';
    let isKuzan = charType === 'KUZAN';
    let isSaka = charType === 'SAKAZUKI';

    if (!isNum(myDamage)) return;   // 🛟 NaN 피해 차단
    if (!isNum(kb)) kb = 0;

    let hitRadius = isBors ? 165 : 105;
    let pveHitRadius = isBors ? 120 : 60;

    // 빙결 확률 (쿠잔 / 냉족발)
    let freezeChance = (isKuzan ? 0.06 : 0) + (attacker.hasJokbal ? 0.06 : 0);
    const rollFreeze = (o) => {
        if (freezeChance > 0 && Math.random() < freezeChance) {
            o.frozenUntil = Math.max(o.frozenUntil || 0, now + 1000);
            return true;
        }
        return false;
    };

    // 넥서스
    let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
    if (enemyBase && Math.hypot(actionData.x - enemyBase.x, actionData.y - enemyBase.y) < hitRadius + 45) {
        applyBaseDamage(attacker.team, myDamage);
    }

    // 적 플레이어 (판정 반경이 다르므로 별도 처리)
    for (let tid in State.players) {
        if (tid === socket.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === attacker.team) continue;
        if (Math.hypot(actionData.x - t.x, actionData.y - t.y) >= hitRadius) continue;

        let actual = myDamage * (1 - (t.defense || 0));
        t.hp -= actual;
        emitDamageText(t.x, t.y, actual);
        if (t.hp <= 0) { checkPlayerDeath(t, socket.id); continue; }
        io.to(tid).emit('takeDamage', actual);
        if (isSaka) addBurn(tid, t, 20, 2000, attacker.id);
        if (rollFreeze(t)) io.emit('syncPlayerFull', t);
    }

    // 몬스터 계열 — 공통 순회 헬퍼 사용
    const hitTest = (o, r) => Math.hypot(actionData.x - o.x, actionData.y - o.y) < pveHitRadius + r;
    Damage.forEachTarget(attacker, hitTest, (t) => {
        if (t.kind === 'player') return;   // 위에서 이미 처리
        Damage.hurt(t, attacker, myDamage, kb, {
            onMobExtra: (o, kind, id) => {
                rollFreeze(o);
                if (isSaka) {
                    let key = (kind === 'minion') ? ('minion_' + id) : (kind === 'okra') ? ('okra_' + id) : kind;
                    addBurn(key, o, 20, 2000, attacker.id);
                }
            }
        });
    });
}

/**
 * 🛟 클라이언트가 보낸 스킬/평타 데이터를 안전한 값으로 정규화한다.
 *    NaN / undefined / 문자열이 그대로 들어오면 좌표·넉백이 NaN 으로 오염되어
 *    보스가 화면에서 사라지거나 판정이 전부 무효가 된다.
 */
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

    // 📶 핑(지연시간) 측정 — 클라이언트가 보낸 타임스탬프를 그대로 돌려보낸다
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
    });

    socket.on('playerMove', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        // 🛟 NaN / 비정상 좌표는 통째로 무시한다 (한 번 들어오면 모든 판정이 무효가 된다)
        if (!data || !isNum(data.x) || !isNum(data.y)) return;
        let now = Date.now();
        if (now - (p.lastRespawn || 0) < 500) return;
        if (now - (p.lastPortalUse || 0) < 500) return;
        if (now - (p.lastDarkPortalUse || 0) < 500) return;
        if (p.isCasting && (p.characterType === 'BORSALINO' || p.iceAgeActive || p.elThorActive)) return;
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
        // ⛓️ 어둠 흡수(시전자·대상) · 💥 파공아 시전 경직 중에는 스킬 사용 불가
        if (Fruits.isActionLocked(p)) return;
        let safeData = sanitizeActionData(p, data);
        if (!safeData) return;
        let logic = CharLogic[p.characterType];
        if (logic && logic.useSkill) logic.useSkill(p, safeData, serverContext);
    });

    socket.on('landSkill1', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        let safeData = sanitizeActionData(p, data);
        if (!safeData) return;
        let logic = CharLogic[p.characterType];
        if (logic && logic.landSkill1) logic.landSkill1(p, safeData, serverContext);
    });

    socket.on('action', (actionData) => {
        if (!State.gameStarted) return;
        let attacker = State.players[socket.id];
        if (!attacker || attacker.isDead || attacker.isCasting) return;
        // ⛓️💥 흡수 / 파공아 경직 중에는 평타 사용 불가
        if (Fruits.isActionLocked(attacker)) return;

        let safeData = sanitizeActionData(attacker, actionData);
        if (!safeData) return;

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
        // 🍈 열매 평타 능력 — 준비된 열매가 있으면 자동 발동
        Fruits.triggerFruitOnAttack(attacker, safeData.dir);
    });

    socket.on('disconnect', () => {
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
//    🛟 [안정화] ① 예외가 나도 프로세스를 죽이지 않는다
//               ② 이전 프레임이 아직 안 끝났으면 이번 프레임을 건너뛴다
//                  (프레임이 밀리면 setInterval 큐가 쌓여 CPU 100% → 전체 정지)
//               ③ 프레임이 오래 걸리면 5초에 한 번만 경고를 남긴다
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