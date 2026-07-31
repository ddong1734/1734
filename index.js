// 파일명: index.js

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

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

const GROUND_Y_SERVER = 2000;
app.use(express.static(__dirname));
app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

// ============================================================================
// 🥊 박힌범 (중앙 정글 최상단 '바구니' 전용 보스)
// ----------------------------------------------------------------------------
//  바구니 구조 (data.js Platforms 기준)
//    바닥 : { x: 13400, y: -1400, w: 5200 }  → x 13400 ~ 18600, 윗면 y = -1400
//    좌벽 : { x: 13400, y: -2200, h: 800, solid }
//    우벽 : { x: 18560, y: -2200, h: 800, solid }
//  → 내부 공간 = x 13440 ~ 18560, y -2200 ~ -1400
//
//  ⚙️ 조정 가능한 값들
// ============================================================================
const HINBEOM_AREA   = { minX: 13400, maxX: 18600, minY: -2400, maxY: -1340 };
const HINBEOM_GROUND = -1400;                 // 바구니 바닥 발판 윗면
const HINBEOM_RADIUS = 63 * 1.5;              // 할배새끼(63)의 1.5배 = 94.5
const HINBEOM_MAXHP  = 2000 * 5;              // 할배새끼(2000)의 5배 = 10000
const HINBEOM_SPEED  = 1.75;                  // 할배새끼와 동일
const HINBEOM_HOME_X = 16000;                 // 바구니 정중앙
const HINBEOM_HOME_Y = HINBEOM_GROUND - HINBEOM_RADIUS;   // -1494.5
const HINBEOM_REGEN  = 100;                   // ✅ 1초마다 회복량

const HAKI_CHANCE    = 0.07;                  // 추적 중 1초마다 7%
const HAKI_ROLL_MS   = 1000;                  // 판정 주기
const HAKI_DURATION  = 4000;                  // 기절 4초
const HAKI_TICK_MS   = 1000;                  // 1초마다
const HAKI_TICK_DMG  = 100;                   // 1초당 100 (총 400)
const HAKI_TICKS     = 4;                     // 4회

const HINBEOM_GOLD    = 5000;                 // 처치 보상 골드
const HINBEOM_XP      = 500;                  // 처치 보상 경험치
const HINBEOM_RESPAWN = 120000;               // 부활 시간(ms)

// ── 🐗 패기 3회마다 소환되는 할배새끼 ────────────────────────────────────────
const MINION_EVERY   = 3;                     // ✅ 패왕색 패기 3회마다 좌우 1마리씩
const MINION_HP      = 2000;                  // 할배새끼와 동일
const MINION_RADIUS  = 63;                    // 할배새끼와 동일
const MINION_SPEED   = 1.75;                  // 할배새끼와 동일
const MINION_MARGIN  = 200;                   // 바구니 양 끝에서 안쪽으로 떨어뜨릴 거리
const MINION_MAX     = 8;                     // 동시 최대 수 (0 이하면 무제한)
const MINION_GOLD    = 1000;                  // 소환체 처치 보상 골드
const MINION_XP      = 100;                   // 소환체 처치 보상 경험치

/** 바구니 공간 안에 있는가 (플레이어 · 보스 공통 판정) */
function isInHinbeomArea(e) {
    if (!e) return false;
    return e.x >= HINBEOM_AREA.minX && e.x <= HINBEOM_AREA.maxX
        && e.y >= HINBEOM_AREA.minY && e.y <= HINBEOM_AREA.maxY;
}

// 🚀 [최적화] 델타 전송 대상 필드 화이트리스트
const PLAYER_DELTA_FIELDS = [
    'x', 'y', 'hp', 'maxHp', 'level', 'xp', 'maxXp', 'isDead', 'isCasting', 'lastFacing',
    'knockbackForce', 'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'burningUntil', 'maguBombUntil', 'justiceBombUntil', 'skill2EndTime', 'characterType',
    'hasJusticeCoat', 'hasPika', 'hasHie', 'hasMagu', 'hasKizaru', 'hasAokiji', 'hasAkainu',
    'hasGoro', 'hasArkMaxim', 'hasGodEnel', 'elThorActive', 'yataActive'
];
const OKRA_DELTA_FIELDS = [
    'x', 'y', 'hp', 'maxHp', 'isGolden', 'state', 'knockbackForce',
    'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'burningUntil', 'maguBombUntil', 'justiceBombUntil'
];
const MONSTER_DELTA_FIELDS = [
    'x', 'y', 'hp', 'maxHp', 'state', 'knockbackForce',
    'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'burningUntil', 'maguBombUntil', 'justiceBombUntil'
];
// 🥊 박힌범 델타 필드
const HINBEOM_DELTA_FIELDS = [
    'x', 'y', 'hp', 'maxHp', 'radius', 'state', 'knockbackForce', 'hakiActiveUntil',
    'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'burningUntil', 'maguBombUntil', 'justiceBombUntil'
];

class DeltaCompressor {
    constructor(fields) { this.fields = fields; this.snapshots = new Map(); }
    getDelta(id, currentData) {
        let last = this.snapshots.get(id);
        if (!last) {
            last = {};
            for (let i = 0; i < this.fields.length; i++) { let k = this.fields[i]; last[k] = currentData[k]; }
            this.snapshots.set(id, last);
            return currentData;
        }
        let delta = null;
        for (let i = 0; i < this.fields.length; i++) {
            let k = this.fields[i];
            if (currentData[k] !== last[k]) {
                if (!delta) delta = {};
                delta[k] = currentData[k];
                last[k] = currentData[k];
            }
        }
        if (delta) delta.id = (currentData.id !== undefined) ? currentData.id : id;
        return delta;
    }
    remove(id) { this.snapshots.delete(id); }
}

const compressors = {
    monsterDelta: new DeltaCompressor(MONSTER_DELTA_FIELDS),
    okraDelta: new DeltaCompressor(OKRA_DELTA_FIELDS),
    playerDelta: new DeltaCompressor(PLAYER_DELTA_FIELDS),
    hinbeomDelta: new DeltaCompressor(HINBEOM_DELTA_FIELDS)   // 🥊 추가
};

/** 🥊 박힌범 초기 상태 객체 생성 */
function makeHinbeom() {
    return {
        x: HINBEOM_HOME_X, y: HINBEOM_HOME_Y, homeX: HINBEOM_HOME_X, homeY: HINBEOM_HOME_Y,
        radius: HINBEOM_RADIUS,
        hp: HINBEOM_MAXHP, maxHp: HINBEOM_MAXHP,
        speed: HINBEOM_SPEED,
        targetId: null, state: 'idle', lastAttack: 0,
        frozenUntil: 0, electrocutedUntil: 0, airFreezeUntil: 0, raigoPullUntil: 0,
        knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0,
        hakiNextRoll: 0,          
        hakiBursts: [],           
        hakiActiveUntil: 0,       
        hakiCount: 0,             
        lastRegenTick: 0          
    };
}

const State = {
    players: {},
    gameStarted: false,
    masterId: null,
    burnMap: new Map(),
    magmas: [], 
    maguBombs: [], 
    justiceBombs: [], 
    giantPartisanQueue: [],
    mantleBolts: [], 
    bases: { 1: { hp: 20000, maxHp: 20000, x: 12250, y: 1900 }, 2: { hp: 20000, maxHp: 20000, x: 19750, y: 1900 } },
    monster: { x: 16000, y: 837, homeX: 16000, radius: 63, hp: 2000, maxHp: 2000, speed: 1.75, targetId: null, state: 'idle', lastAttack: 0, frozenUntil: 0, electrocutedUntil: 0, knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0 },
    hinbeom: makeHinbeom(),                    // 🥊 추가
    hinbeomMinions: [],                        // 🐗 패기로 소환된 할배새끼들
    turrets: [
        { team: 1, x: 12500, y: 1850, range: 1200, damage: 30, lastShot: 0 },
        { team: 2, x: 19500, y: 1850, range: 1200, damage: 30, lastShot: 0 }
    ],
    okras: [],
    projectiles: [],
    shockwaves: [],
    detectors: [],
    teamStorages: { 1: [], 2: [] },
    projIdCounter: 0
};

let minionIdCounter = 0;
/** 🐗 소환된 할배새끼 조회 */
function getMinion(id) { return State.hinbeomMinions.find(m => m.id === id); }

/** 🐗 바구니 양옆에 할배새끼를 1마리씩 소환 */
function spawnHinbeomMinions() {
    const my = HINBEOM_GROUND - MINION_RADIUS;
    const spots = [HINBEOM_AREA.minX + MINION_MARGIN, HINBEOM_AREA.maxX - MINION_MARGIN];
    for (let i = 0; i < spots.length; i++) {
        if (MINION_MAX > 0 && State.hinbeomMinions.length >= MINION_MAX) break;
        State.hinbeomMinions.push({
            id: minionIdCounter++,
            x: spots[i], y: my, homeX: spots[i], radius: MINION_RADIUS,
            hp: MINION_HP, maxHp: MINION_HP, speed: MINION_SPEED,
            targetId: null, state: 'chase', lastAttack: 0,
            frozenUntil: 0, electrocutedUntil: 0, airFreezeUntil: 0, raigoPullUntil: 0,
            knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0,
            spawnedAt: Date.now()
        });
    }
    io.emit('minionSpawn', { xs: spots, y: my });
}

/** 🐗 소환된 할배새끼 전부 소멸 (바구니에 플레이어가 없을 때) */
function despawnHinbeomMinions() {
    if (State.hinbeomMinions.length === 0) return;
    State.hinbeomMinions.forEach(m => clearBurns('minion_' + m.id, m));
    State.hinbeomMinions.length = 0;
    io.emit('syncMinions', []);
}

/** 🐗 소환된 할배새끼 처치 */
function killMinion(m, attackerId) {
    if (!m || m.state === 'dead') return;
    m.state = 'dead';
    if (attackerId && State.players[attackerId]) {
        State.players[attackerId].gold += MINION_GOLD; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], MINION_XP);
    }
    clearBurns('minion_' + m.id, m);
    let idx = State.hinbeomMinions.indexOf(m);
    if (idx !== -1) State.hinbeomMinions.splice(idx, 1);
}

function rerollOkraGrade(ok) {
    if (ok.isEliteGolden) {
        ok.isGolden = true;
        ok.maxHp = 2000;
        ok.hp = ok.maxHp;
        return;
    }
    ok.isGolden = Math.random() < 0.05;
    ok.maxHp = ok.isGolden ? 2000 : 700;
    ok.hp = ok.maxHp;
}

let okraIdCounter = 0;
function spawnOkra(x, y, opts) {
    let ok = {
        id: okraIdCounter++, x: x, y: y, homeX: x, homeY: y, radius: 25,
        isGolden: false,
        hp: 700, maxHp: 700, atk: 30, speed: 1, state: 'idle', targetId: null, 
        lastAttack: 0, frozenUntil: 0, electrocutedUntil: 0, knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0,
        isEliteGolden: !!(opts && opts.eliteGolden),
        respawnMs: (opts && opts.respawnMs) ? opts.respawnMs : 30000
    };
    rerollOkraGrade(ok);
    State.okras.push(ok);
}
for(let i=0; i<8; i++) spawnOkra(1500 + i*600, 1955);
for(let i=0; i<8; i++) spawnOkra(25500 + i*600, 1955);

const ELITE_GOLDEN_OPTS = { eliteGolden: true, respawnMs: 420000 };
[12000, 12500, 13000].forEach(ex => spawnOkra(ex, -45, ELITE_GOLDEN_OPTS));
[19000, 19500, 20000].forEach(ex => spawnOkra(ex, -45, ELITE_GOLDEN_OPTS));

function getRequiredXp(level) {
    if (level >= 50) return 999999; 
    let req = 100; for(let i=1; i<=level; i++) { req += i * 5; } return req;
}

function addBurn(key, entity, dps, dur, ownerId) {
    if (!entity) return; let now = Date.now();
    if (!State.burnMap.has(key)) State.burnMap.set(key, []);
    State.burnMap.get(key).push({ dps: dps, endTime: now + dur, ownerId: ownerId, nextTick: now + 1000 });
    entity.burningUntil = Math.max(entity.burningUntil || 0, now + dur);
    io.emit('setBurn', { id: key, until: entity.burningUntil });
}

function clearBurns(key, entity) { State.burnMap.delete(key); if (entity) entity.burningUntil = 0; }

function processBurns(now) {
    for (let [key, stacks] of State.burnMap) {
        let entity = null, kind = null;
        if (key === 'monster') { entity = State.monster; kind = 'monster'; }
        else if (key === 'hinbeom') { entity = State.hinbeom; kind = 'hinbeom'; }        // 🥊 추가
        else if (typeof key === 'string' && key.startsWith('minion_')) { entity = getMinion(parseInt(key.slice(7))); kind = 'minion'; }  // 🐗 추가
        else if (typeof key === 'string' && key.startsWith('okra_')) { entity = State.okras.find(o => o.id === parseInt(key.slice(5))); kind = 'okra'; }
        else { entity = State.players[key]; kind = 'player'; }

        if (!entity || entity.hp <= 0 || (kind === 'player' && entity.isDead)) { State.burnMap.delete(key); if (entity) entity.burningUntil = 0; continue; }

        let dmg = 0, lastOwner = null;
        for (let i = stacks.length - 1; i >= 0; i--) {
            let b = stacks[i];
            while (now >= b.nextTick && b.nextTick <= b.endTime) { dmg += b.dps; lastOwner = b.ownerId; b.nextTick += 1000; }
            if (now >= b.endTime) stacks.splice(i, 1);
        }
        if (stacks.length === 0) { State.burnMap.delete(key); entity.burningUntil = 0; }
        if (dmg <= 0) continue;

        if (kind === 'player') {
            let actual = dmg * (1 - (entity.defense || 0));
            entity.hp -= actual; emitDamageText(entity.x, entity.y, actual);
            io.to(key).emit('takeDamage', actual);
            if (entity.hp <= 0) checkPlayerDeath(entity, lastOwner);
        } else if (kind === 'monster') {
            State.monster.hp -= dmg; emitDamageText(State.monster.x, State.monster.y, dmg);
            if (State.monster.hp <= 0) killMonster(lastOwner);
        } else if (kind === 'hinbeom') {                                                  // 🥊 추가
            // 🛡️ 무적 상태(할배새끼 존재)일 때는 화상 데미지 무시
            if (State.hinbeomMinions.length > 0) {
                // do nothing
            } else {
                State.hinbeom.hp -= dmg; emitDamageText(State.hinbeom.x, State.hinbeom.y, dmg);
                if (State.hinbeom.hp <= 0) killHinbeom(lastOwner);
            }
        } else if (kind === 'minion') {                                                   // 🐗 추가
            entity.hp -= dmg; emitDamageText(entity.x, entity.y, dmg);
            if (entity.hp <= 0) killMinion(entity, lastOwner);
        } else if (kind === 'okra') {
            entity.hp -= dmg; emitDamageText(entity.x, entity.y, dmg);
            if (entity.hp <= 0) killOkra(entity, lastOwner);
        }
    }
}

function resetGame() {
    State.gameStarted = false; State.masterId = null; State.players = {}; 
    State.projectiles = []; State.shockwaves = []; State.detectors = []; State.magmas = []; State.maguBombs = []; 
    State.justiceBombs = []; State.giantPartisanQueue = []; State.mantleBolts = []; State.burnMap.clear();
    State.bases = { 1: { hp: 20000, maxHp: 20000, x: 12250, y: 1900 }, 2: { hp: 20000, maxHp: 20000, x: 19750, y: 1900 } };
    State.monster = { x: 16000, y: 837, homeX: 16000, radius: 63, hp: 2000, maxHp: 2000, speed: 1.75, targetId: null, state: 'idle', lastAttack: 0, frozenUntil: 0, electrocutedUntil: 0, knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0 };
    State.hinbeom = makeHinbeom();                                                        // 🥊 추가
    State.hinbeomMinions = [];                                                            // 🐗 추가
    State.turrets = [ { team: 1, x: 12500, y: 1850, range: 1200, damage: 30, lastShot: 0 }, { team: 2, x: 19500, y: 1850, range: 1200, damage: 30, lastShot: 0 } ];
    State.teamStorages = { 1: [], 2: [] };
    State.okras.forEach(ok => { rerollOkraGrade(ok); ok.x = ok.homeX; ok.y = ok.homeY; ok.state = 'idle'; ok.targetId = null; ok.knockbackForce = 0; ok.burningUntil = 0; ok.maguBombUntil = 0; ok.justiceBombUntil = 0; ok.skillFreezeUntil = 0; ok.electrocutedUntil = 0; });
    compressors.monsterDelta.snapshots.clear(); compressors.okraDelta.snapshots.clear(); compressors.playerDelta.snapshots.clear();
    compressors.hinbeomDelta.snapshots.clear();                                           // 🥊 추가
}

function recalcStats(p) {
    let charType = p.characterType || 'PARK'; let char = Characters[charType] || Characters.PARK;
    let oldMax = p.maxHp || char.hp; 
    p.maxHp = char.hp + ((p.level || 0) * 300); p.speedMult = char.speedMult || 1.0; 
    p.attackSpeedMult = 1.0; p.bonusDamage = ((p.level || 0) * 3); p.defense = 0; p.hpRegen = 0; 
    p.orbitSpheres = 0; p.hasJokbal = false; p.hasDaluFengwei = false; 
    p.hasJadam = false; p.seolgonnyakCount = 0; p.hasPepsiArt = false;
    p.hasPika = false; p.hasHie = false; p.hasMagu = false; p.hasJusticeCoat = false;
    p.hasKizaru = false; p.hasAokiji = false; p.hasAkainu = false; 
    p.hasGoro = false; p.hasArkMaxim = false; p.hasGodEnel = false;

    p.equippedUids.forEach(uid => {
        let item = p.inventory.find(i => i.uid === uid);
        if (!item || !Items[item.id] || !Items[item.id].stats) return;
        let stats = Items[item.id].stats;
        
        if (stats.maxHp) p.maxHp += stats.maxHp; if (stats.speedMult) p.speedMult += stats.speedMult;
        if (stats.bonusDamage) p.bonusDamage += stats.bonusDamage; if (stats.defense) p.defense += stats.defense;
        if (stats.hpRegen) p.hpRegen += stats.hpRegen; if (stats.attackSpeedMult) p.attackSpeedMult += stats.attackSpeedMult;
        if (stats.orbitSpheres) p.orbitSpheres += stats.orbitSpheres;
        if (stats.hasJokbal) p.hasJokbal = true; if (stats.hasDaluFengwei) p.hasDaluFengwei = true;
        if (stats.hasJadam) p.hasJadam = true; if (stats.hasPepsiArt) p.hasPepsiArt = true;
        if (stats.hasPika) p.hasPika = true; if (stats.hasHie) p.hasHie = true; if (stats.hasMagu) p.hasMagu = true;
        if (stats.hasJusticeCoat) p.hasJusticeCoat = true;
        if (stats.hasKizaru) p.hasKizaru = true; if (stats.hasAokiji) p.hasAokiji = true; if (stats.hasAkainu) p.hasAkainu = true;
        if (stats.hasGoro) p.hasGoro = true; if (stats.hasArkMaxim) p.hasArkMaxim = true; if (stats.hasGodEnel) p.hasGodEnel = true;
        if (item.id === 'seolgonnyak') p.seolgonnyakCount = 1;
    });

    if (p.maxHp > oldMax) p.hp += (p.maxHp - oldMax); p.hp = Math.min(p.hp, p.maxHp);
    p.orbitSpeedMult = p.hasDaluFengwei ? 1.8 : 1.0;
}

function gainXp(p, amount) {
    if (p.level >= 50) return; p.xp += amount; let leveledUp = false;
    while (p.level < 50 && p.xp >= p.maxXp) { p.xp -= p.maxXp; p.level++; p.maxXp = getRequiredXp(p.level); leveledUp = true; }
    if (leveledUp) { recalcStats(p); io.emit('levelUp', p.id); }
    io.emit('syncPlayerFull', p); 
}

function emitDamageText(x, y, damage) { if (damage >= 1) { io.emit('floatingText', { x: x, y: y - 40, val: Math.round(damage), type: 'damage' }); } }

function applyBaseDamage(attackerTeam, damage) {
    let enemyBase = State.bases[attackerTeam === 1 ? 2 : 1];
    if (!enemyBase || enemyBase.hp <= 0) return;
    enemyBase.hp -= damage; emitDamageText(enemyBase.x, enemyBase.y, damage);
    if (enemyBase.hp <= 0 && State.gameStarted) { State.gameStarted = false; io.emit('gameOver', attackerTeam); setTimeout(resetGame, 2000); }
}

function checkPlayerDeath(targetPlayer, attackerId) {
    if (targetPlayer.hp <= 0 && !targetPlayer.isDead) {
        targetPlayer.hp = 0; targetPlayer.isDead = true; 
        targetPlayer.isCasting = false; targetPlayer.skill3Active = false; targetPlayer.yataActive = false; targetPlayer.yataPath = null; 
        targetPlayer.iceAgeActive = false; targetPlayer.partisanQueue = 0; targetPlayer.partisanFired = 0;
        targetPlayer.volcanoActive = false; targetPlayer.maguBombUntil = 0; targetPlayer.justiceBombUntil = 0;
        targetPlayer.skillFreezeUntil = 0; 
        targetPlayer.skill1Dashing = false; 
        targetPlayer.elThorActive = false; targetPlayer.mantleActive = false; targetPlayer.raigoActive = false; targetPlayer.raigoDropped = false;
        clearBurns(targetPlayer.id, targetPlayer); 
        io.emit('player_died', targetPlayer.id);
        io.emit('syncPlayerFull', targetPlayer); 

        if (attackerId && State.players[attackerId] && attackerId !== targetPlayer.id) {
            State.players[attackerId].gold += 800; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
            gainXp(State.players[attackerId], Math.max(1, targetPlayer.level) * 10);
        }

        setTimeout(() => {
            if(State.players[targetPlayer.id]) {
                targetPlayer.isDead = false; targetPlayer.lastRespawn = Date.now(); 
                targetPlayer.hp = targetPlayer.maxHp; targetPlayer.x = State.bases[targetPlayer.team].x; targetPlayer.y = 1955; 
                targetPlayer.burningUntil = 0; targetPlayer.maguBombUntil = 0; targetPlayer.justiceBombUntil = 0; targetPlayer.skillFreezeUntil = 0;
                targetPlayer.electrocutedUntil = 0;
                io.emit('player_respawned', targetPlayer);
            }
        }, 15000); 
    }
}

function killMonster(attackerId) {
    if (State.monster.state === 'dead') return;
    if (attackerId && State.players[attackerId]) {
        State.players[attackerId].gold += 2500; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], 200);
    }
    State.monster.targetId = null; State.monster.state = 'dead'; clearBurns('monster', State.monster);
    setTimeout(() => { State.monster.hp = State.monster.maxHp; State.monster.x = State.monster.homeX; State.monster.y = 837; State.monster.state = 'idle'; }, 30000);
}

// 🥊 박힌범 처치
function killHinbeom(attackerId) {
    if (State.hinbeom.state === 'dead') return;
    if (attackerId && State.players[attackerId]) {
        State.players[attackerId].gold += HINBEOM_GOLD; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], HINBEOM_XP);
    }
    State.hinbeom.targetId = null;
    State.hinbeom.state = 'dead';
    State.hinbeom.hakiBursts = [];
    State.hinbeom.hakiActiveUntil = 0;
    State.hinbeom.hakiCount = 0;
    clearBurns('hinbeom', State.hinbeom);
    despawnHinbeomMinions();          // 🐗 보스가 죽으면 소환체도 사라진다
    io.emit('hakiEnd');               // 남아있는 이펙트 즉시 정리
    setTimeout(() => {
        State.hinbeom.hp = State.hinbeom.maxHp;
        State.hinbeom.x = State.hinbeom.homeX; State.hinbeom.y = State.hinbeom.homeY;
        State.hinbeom.state = 'idle';
        State.hinbeom.knockbackForce = 0;
        State.hinbeom.frozenUntil = 0; State.hinbeom.electrocutedUntil = 0;
        State.hinbeom.burningUntil = 0; State.hinbeom.maguBombUntil = 0; State.hinbeom.justiceBombUntil = 0;
        State.hinbeom.lastRegenTick = 0;
    }, HINBEOM_RESPAWN);
}

function tryGoldenDrop(ok, attackerId) {
    if (!ok || !ok.isGolden || !attackerId) return;
    let p = State.players[attackerId];
    if (!p) return;
    if (Math.random() >= 0.25) return;

    if (p.inventory.length >= 20) {
        io.to(attackerId).emit('goldenDrop', { msg: '인벤토리가 가득 차 황금을 놓쳤습니다!', fail: true });
        return;
    }
    p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: 'gold' });
    io.to(attackerId).emit('goldenDrop', { msg: '✨ 황금 획득! (판매 시 3,000 G)', inventory: p.inventory });
}

function killOkra(ok, attackerId) {
    if (ok.state === 'dead') return;
    if (attackerId && State.players[attackerId]) {
        State.players[attackerId].gold += 500; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], 50);
    }
    tryGoldenDrop(ok, attackerId);
    ok.state = 'dead'; ok.targetId = null; clearBurns('okra_' + ok.id, ok);
    setTimeout(() => { rerollOkraGrade(ok); ok.x = ok.homeX; ok.y = ok.homeY; ok.state = 'idle'; }, ok.respawnMs || 30000);
}

function applyAoEDamage(attacker, cx, cy, radius, damage, kb) {
    let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0 && Math.hypot(cx - enemyBase.x, cy - enemyBase.y) < radius + 150) { applyBaseDamage(attacker.team, damage); }
    for (let tid in State.players) {
        if (tid !== attacker.id && State.players[tid].team !== attacker.team) {
            let t = State.players[tid];
            if (!t.isDead && Math.hypot(cx - t.x, cy - t.y) < radius) {
                let actualDamage = damage * (1 - (t.defense || 0)); t.hp -= actualDamage; emitDamageText(t.x, t.y, actualDamage);
                if (t.hp <= 0) checkPlayerDeath(t, attacker.id); else io.to(tid).emit('bossHit', { damage: actualDamage, dir: Math.sign(kb), kb: kb });
            }
        }
    }
    if (State.monster.hp > 0 && Math.hypot(cx - State.monster.x, cy - State.monster.y) < radius + State.monster.radius) {
        State.monster.hp -= damage; State.monster.knockbackForce += kb * 0.3; State.monster.targetId = attacker.id; State.monster.state = 'chase'; emitDamageText(State.monster.x, State.monster.y, damage);
        if (State.monster.hp <= 0) killMonster(attacker.id);
    }
    // 🥊 박힌범
    if (State.hinbeom.hp > 0 && Math.hypot(cx - State.hinbeom.x, cy - State.hinbeom.y) < radius + State.hinbeom.radius) {
        // 🛡️ 무적 상태 처리
        if (State.hinbeomMinions.length > 0) {
            // 무적 상태이므로 무시
        } else {
            State.hinbeom.hp -= damage; State.hinbeom.knockbackForce += kb * 0.2; emitDamageText(State.hinbeom.x, State.hinbeom.y, damage);
            aggroHinbeom(attacker.id);
            if (State.hinbeom.hp <= 0) killHinbeom(attacker.id);
        }
    }
    // 🐗 소환된 할배새끼
    for (let i = State.hinbeomMinions.length - 1; i >= 0; i--) {
        let mn = State.hinbeomMinions[i];
        if (mn.hp > 0 && Math.hypot(cx - mn.x, cy - mn.y) < radius + mn.radius) {
            mn.hp -= damage; mn.knockbackForce += kb * 0.3; mn.targetId = attacker.id; mn.state = 'chase'; emitDamageText(mn.x, mn.y, damage);
            if (mn.hp <= 0) killMinion(mn, attacker.id);
        }
    }
    State.okras.forEach(ok => {
        if (ok.hp > 0 && Math.hypot(cx - ok.x, cy - ok.y) < radius + ok.radius) {
            ok.hp -= damage; ok.knockbackForce += kb; ok.targetId = attacker.id; ok.state = 'chase'; emitDamageText(ok.x, ok.y, damage);
            if (ok.hp <= 0) killOkra(ok, attacker.id);
        }
    });
}

function applyBoxDamage(attacker, minX, maxX, minY, maxY, damage, kb) {
    let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0 && enemyBase.x >= minX - 150 && enemyBase.x <= maxX + 150 && enemyBase.y >= minY - 150 && enemyBase.y <= maxY + 150) { applyBaseDamage(attacker.team, damage); }
    for (let tid in State.players) { 
        let t = State.players[tid]; 
        if (!t.isDead && tid !== attacker.id && t.team !== attacker.team && t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY) { 
            let actualDamage = damage * (1 - (t.defense || 0)); t.hp -= actualDamage; emitDamageText(t.x, t.y, actualDamage); 
            if (t.hp <= 0) checkPlayerDeath(t, attacker.id); else io.to(tid).emit('bossHit', { damage: actualDamage, dir: Math.sign(kb), kb: kb }); 
        } 
    }
    if (State.monster.hp > 0 && State.monster.x >= minX - State.monster.radius && State.monster.x <= maxX + State.monster.radius && State.monster.y >= minY - State.monster.radius && State.monster.y <= maxY + State.monster.radius) { 
        State.monster.hp -= damage; State.monster.knockbackForce += kb * 0.3; State.monster.targetId = attacker.id; State.monster.state = 'chase'; emitDamageText(State.monster.x, State.monster.y, damage); 
        if (State.monster.hp <= 0) killMonster(attacker.id);
    }
    // 🥊 박힌범
    if (State.hinbeom.hp > 0 && State.hinbeom.x >= minX - State.hinbeom.radius && State.hinbeom.x <= maxX + State.hinbeom.radius && State.hinbeom.y >= minY - State.hinbeom.radius && State.hinbeom.y <= maxY + State.hinbeom.radius) {
        // 🛡️ 무적 상태 처리
        if (State.hinbeomMinions.length > 0) {
            // 무적 상태
        } else {
            State.hinbeom.hp -= damage; State.hinbeom.knockbackForce += kb * 0.2; emitDamageText(State.hinbeom.x, State.hinbeom.y, damage);
            aggroHinbeom(attacker.id);
            if (State.hinbeom.hp <= 0) killHinbeom(attacker.id);
        }
    }
    // 🐗 소환된 할배새끼
    for (let i = State.hinbeomMinions.length - 1; i >= 0; i--) {
        let mn = State.hinbeomMinions[i];
        if (mn.hp > 0 && mn.x >= minX - mn.radius && mn.x <= maxX + mn.radius && mn.y >= minY - mn.radius && mn.y <= maxY + mn.radius) {
            mn.hp -= damage; mn.knockbackForce += kb * 0.3; mn.targetId = attacker.id; mn.state = 'chase'; emitDamageText(mn.x, mn.y, damage);
            if (mn.hp <= 0) killMinion(mn, attacker.id);
        }
    }
    State.okras.forEach(ok => { 
        if (ok.hp > 0 && ok.x >= minX - ok.radius && ok.x <= maxX + ok.radius && ok.y >= minY - ok.radius && ok.y <= maxY + ok.radius) { 
            ok.hp -= damage; ok.knockbackForce += kb; ok.targetId = attacker.id; ok.state = 'chase'; emitDamageText(ok.x, ok.y, damage); 
            if (ok.hp <= 0) killOkra(ok, attacker.id);
        } 
    });
}

function applyIceAge(attacker, cx, cy, radius, damage, freezeDuration) {
    let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
    let hasAokiji = attacker.hasAokiji; 

    if (enemyBase && enemyBase.hp > 0 && Math.hypot(cx - enemyBase.x, cy - enemyBase.y) < radius + 150) { applyBaseDamage(attacker.team, damage); }
    for (let tid in State.players) {
        if (tid !== attacker.id && State.players[tid].team !== attacker.team) {
            let t = State.players[tid];
            if (!t.isDead && Math.hypot(cx - t.x, cy - t.y) < radius) {
                let actualDamage = damage * (1 - (t.defense || 0)); t.hp -= actualDamage; emitDamageText(t.x, t.y, actualDamage);
                t.frozenUntil = Math.max(t.frozenUntil || 0, Date.now() + freezeDuration);
                if (hasAokiji) { 
                    t.skillFreezeUntil = Math.max(t.skillFreezeUntil || 0, Date.now() + 5000); 
                    io.emit('actionEffect', { type: 'awaken_icicles', x: t.x, y: t.y, life: 60, maxLife: 60 }); 
                }
                if (t.hp <= 0) checkPlayerDeath(t, attacker.id); else { io.to(tid).emit('takeDamage', actualDamage); io.emit('syncPlayerFull', t); }
            }
        }
    }
    if (State.monster.hp > 0 && Math.hypot(cx - State.monster.x, cy - State.monster.y) < radius + State.monster.radius) {
        State.monster.hp -= damage; State.monster.targetId = attacker.id; State.monster.state = 'chase'; emitDamageText(State.monster.x, State.monster.y, damage);
        State.monster.frozenUntil = Math.max(State.monster.frozenUntil || 0, Date.now() + freezeDuration);
        if (hasAokiji) { 
            State.monster.skillFreezeUntil = Math.max(State.monster.skillFreezeUntil || 0, Date.now() + 5000); 
            io.emit('actionEffect', { type: 'awaken_icicles', x: State.monster.x, y: State.monster.y, life: 60, maxLife: 60 }); 
        }
        if (State.monster.hp <= 0) killMonster(attacker.id);
    }
    // 🥊 박힌범
    if (State.hinbeom.hp > 0 && Math.hypot(cx - State.hinbeom.x, cy - State.hinbeom.y) < radius + State.hinbeom.radius) {
        // 🛡️ 무적 상태 처리
        if (State.hinbeomMinions.length > 0) {
            // 무적
        } else {
            State.hinbeom.hp -= damage; emitDamageText(State.hinbeom.x, State.hinbeom.y, damage);
            State.hinbeom.frozenUntil = Math.max(State.hinbeom.frozenUntil || 0, Date.now() + freezeDuration);
            aggroHinbeom(attacker.id);
            if (hasAokiji) {
                State.hinbeom.skillFreezeUntil = Math.max(State.hinbeom.skillFreezeUntil || 0, Date.now() + 5000);
                io.emit('actionEffect', { type: 'awaken_icicles', x: State.hinbeom.x, y: State.hinbeom.y, life: 60, maxLife: 60 });
            }
            if (State.hinbeom.hp <= 0) killHinbeom(attacker.id);
        }
    }
    // 🐗 소환된 할배새끼
    for (let i = State.hinbeomMinions.length - 1; i >= 0; i--) {
        let mn = State.hinbeomMinions[i];
        if (mn.hp > 0 && Math.hypot(cx - mn.x, cy - mn.y) < radius + mn.radius) {
            mn.hp -= damage; mn.targetId = attacker.id; mn.state = 'chase'; emitDamageText(mn.x, mn.y, damage);
            mn.frozenUntil = Math.max(mn.frozenUntil || 0, Date.now() + freezeDuration);
            if (hasAokiji) {
                mn.skillFreezeUntil = Math.max(mn.skillFreezeUntil || 0, Date.now() + 5000);
                io.emit('actionEffect', { type: 'awaken_icicles', x: mn.x, y: mn.y, life: 60, maxLife: 60 });
            }
            if (mn.hp <= 0) killMinion(mn, attacker.id);
        }
    }
    State.okras.forEach(ok => {
        if (ok.hp > 0 && Math.hypot(cx - ok.x, cy - ok.y) < radius + ok.radius) {
            ok.hp -= damage; ok.targetId = attacker.id; ok.state = 'chase'; emitDamageText(ok.x, ok.y, damage);
            ok.frozenUntil = Math.max(ok.frozenUntil || 0, Date.now() + freezeDuration);
            if (hasAokiji) { 
                ok.skillFreezeUntil = Math.max(ok.skillFreezeUntil || 0, Date.now() + 5000); 
                io.emit('actionEffect', { type: 'awaken_icicles', x: ok.x, y: ok.y, life: 60, maxLife: 60 }); 
            }
            if (ok.hp <= 0) killOkra(ok, attacker.id);
        }
    });
}

/** 🥊 박힌범 어그로 — 공격자가 바구니 안에 있을 때만 추적한다 */
function aggroHinbeom(attackerId) {
    const h = State.hinbeom;
    if (!h || h.hp <= 0 || h.state === 'dead') return;
    const p = State.players[attackerId];
    if (!p || p.isDead) return;
    if (!isInHinbeomArea(p)) return;
    h.targetId = attackerId;
    h.state = 'chase';
}

const serverContext = {
    get io() { return io; }, get Skills() { return Skills; }, get Items() { return Items; }, get Characters() { return Characters; },
    State, compressors, CharLogic,
    getPlayers: () => State.players, getMonster: () => State.monster, getOkras: () => State.okras,
    getHinbeom: () => State.hinbeom,                                   // 🥊 추가
    getMinions: () => State.hinbeomMinions,                            // 🐗 추가
    applyAoEDamage, applyBoxDamage, applyIceAge, emitDamageText, checkPlayerDeath, gainXp,
    addShockwave: (sw) => State.shockwaves.push(sw), addProjectile: (proj) => State.projectiles.push(proj),
    addMagma: (m) => State.magmas.push(m), addMantleBolt: (b) => State.mantleBolts.push(b), addBurn, clearBurns, processBurns,
    getNextProjId: () => State.projIdCounter++, recalcStats, killMonster, killOkra, applyBaseDamage, tryGoldenDrop, rerollOkraGrade,
    // 🥊🐗 추가
    killHinbeom, aggroHinbeom, isInHinbeomArea,
    getMinion, killMinion, spawnHinbeomMinions, despawnHinbeomMinions,
    HINBEOM_AREA, HINBEOM_GROUND, HINBEOM_REGEN,
    HAKI_CHANCE, HAKI_ROLL_MS, HAKI_DURATION, HAKI_TICK_MS, HAKI_TICK_DMG, HAKI_TICKS,
    MINION_EVERY
};

function tryReconnect(socket, sessionId) {
    if (!State.gameStarted || !sessionId) return false;

    let existingOldId = null;
    for (let pid in State.players) {
        if (State.players[pid].sessionId === sessionId && State.players[pid].disconnected) { existingOldId = pid; break; }
    }
    if (!existingOldId) return false;

    let p = State.players[existingOldId]; delete State.players[existingOldId];
    p.id = socket.id; p.disconnected = false; State.players[socket.id] = p;
    compressors.playerDelta.remove(existingOldId);
    if (State.monster.targetId === existingOldId) State.monster.targetId = null;
    if (State.hinbeom.targetId === existingOldId) State.hinbeom.targetId = null;           // 🥊 추가
    State.hinbeomMinions.forEach(mn => { if (mn.targetId === existingOldId) mn.targetId = null; });  // 🐗 추가
    State.okras.forEach(ok => { if (ok.targetId === existingOldId) ok.targetId = null; });
    State.detectors.forEach(d => { if (d.ownerId === existingOldId) { d.ownerId = socket.id; d.id = 'd_' + socket.id; } });
    State.maguBombs.forEach(b => { if (b.ownerId === existingOldId) b.ownerId = socket.id; if (b.targetId === existingOldId) b.targetId = socket.id; });
    State.justiceBombs.forEach(b => { if (b.ownerId === existingOldId) b.ownerId = socket.id; if (b.targetId === existingOldId) b.targetId = socket.id; });
    State.giantPartisanQueue.forEach(q => { if (q.ownerId === existingOldId) q.ownerId = socket.id; if (q.targetId === existingOldId) q.targetId = socket.id; });
    State.mantleBolts.forEach(b => { if (b.ownerId === existingOldId) b.ownerId = socket.id; });
    
    let oldBurns = State.burnMap.get(existingOldId); if (oldBurns) { State.burnMap.set(socket.id, oldBurns); State.burnMap.delete(existingOldId); }
    for (let [key, stacks] of State.burnMap) { stacks.forEach(st => { if (st.ownerId === existingOldId) st.ownerId = socket.id; }); }

    socket.emit('reconnectSuccess', {
        players: State.players, bases: State.bases, detectors: State.detectors,
        teamStorages: State.teamStorages, myPlayer: p,
        monster: State.monster, okras: State.okras,
        hinbeom: State.hinbeom,                                                             // 🥊 추가
        minions: State.hinbeomMinions                                                       // 🐗 추가
    });
    io.emit('playerLeft', existingOldId); io.emit('syncPlayerFull', p);
    return true;
}

io.on('connection', (socket) => {
    ShopManager.registerEvents(socket, serverContext);

    socket.on('attemptReconnect', (data) => {
        let sessionId = (data && data.sessionId) ? data.sessionId : null;
        if (!tryReconnect(socket, sessionId)) socket.emit('reconnectUnavailable');
    });

    socket.on('joinLobby', (data) => {
        let nick = typeof data === 'string' ? data : data.nickname; 
        let charType = typeof data === 'string' ? 'PARK' : (data.character || 'PARK');
        let sessionId = data.sessionId || null;

        if (State.gameStarted) { 
            if (tryReconnect(socket, sessionId)) return;
            socket.emit('joinFail', '이미 게임이 진행 중입니다.'); return;
        }

        if (Object.keys(State.players).length >= 6) { socket.emit('joinFail', '로비가 가득 찼습니다.'); return; }
        if (!State.masterId) State.masterId = socket.id;

        let bCount = 0; let rCount = 0; for(let id in State.players) { if(State.players[id].team === 1) bCount++; else rCount++; }
        let assignedTeam = (bCount <= rCount) ? 1 : 2;

        State.players[socket.id] = {
            id: socket.id, nickname: nick, characterType: charType, team: assignedTeam, sessionId: sessionId, disconnected: false,
            x: assignedTeam === 1 ? 12800 : 19200, y: 1955, hp: Characters[charType] ? Characters[charType].hp : 3000, maxHp: Characters[charType] ? Characters[charType].hp : 3000, gold: 100000,
            level: 0, xp: 0, maxXp: 100, baseDamage: Characters[charType] ? Characters[charType].baseDamage : 50, speedMult: Characters[charType] ? Characters[charType].speedMult : 1.0, 
            attackSpeedMult: 1.0, bonusDamage: 0, defense: 0, hpRegen: 0, hasJokbal: false, hasDaluFengwei: false, hasJadam: false, hasPepsiArt: false, hasPika: false, hasHie: false, hasMagu: false, hasJusticeCoat: false,
            hasKizaru: false, hasAokiji: false, hasAkainu: false, hasGoro: false, hasArkMaxim: false, hasGodEnel: false, skillFreezeUntil: 0,
            inventory: [], equippedUids: [], seolgonnyakCount: 0, orbitSpheres: 0, orbitSpeedMult: 1.0, frozenUntil: 0, electrocutedUntil: 0, lastRegenTick: 0, isDead: false, isCasting: false, skill2EndTime: 0,
            skill3Active: false, skill3EndTime: 0, skill3DirX: 1, skill3DirY: 0, skill3LastFire: 0, yataActive: false, yataPath: null, yataStartTime: 0, yataHitIds: [], yataLastHitScan: 0,
            iceAgeActive: false, iceAgeCastEnd: 0, partisanQueue: 0, partisanFired: 0, partisanDir: 1, partisanNextFire: 0, volcanoActive: false, volcanoX: 0, volcanoStart: 0, volcanoEnd: 0, volcanoNextSpawn: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0,
            elThorActive: false, elThorStart: 0, elThorEnd: 0, elThorDirX: 1, elThorDirY: 0, elThorNextTick: 0,
            mantleActive: false, mantleDir: 1, mantleCenterX: 0, mantleStart: 0, mantleEnd: 0, mantleNextSpawn: 0, mantleFired: 0,
            raigoActive: false, raigoDir: 1, raigoCenterX: 0, raigoTelegraphEnd: 0, raigoDropped: false, raigoCastEnd: 0, raigoNextTick: 0
        };
        io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId });
    });

    socket.on('toggleTeam', (targetId) => { 
        if (State.masterId !== socket.id) return; 
        if (State.players[targetId]) { State.players[targetId].team = State.players[targetId].team === 1 ? 2 : 1; State.players[targetId].x = State.players[targetId].team === 1 ? 12800 : 19200; io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId }); } 
    });

    socket.on('startGame', () => { 
        if (State.masterId !== socket.id || Object.keys(State.players).length === 0) return; 
        compressors.monsterDelta.snapshots.clear(); compressors.okraDelta.snapshots.clear(); compressors.playerDelta.snapshots.clear();
        compressors.hinbeomDelta.snapshots.clear();                                         // 🥊 추가
        State.gameStarted = true; io.emit('gameStartSign', State.players); io.emit('syncDetectors', State.detectors); io.emit('syncTeamStorage', State.teamStorages); 
    });

    socket.on('playerMove', (data) => {
        let p = State.players[socket.id];
        if (p && !p.isDead) { 
            if (Date.now() - (p.lastRespawn || 0) < 500) return;
            if (p.isCasting && (p.characterType === 'BORSALINO' || p.iceAgeActive || p.elThorActive)) return;
            p.x = data.x; p.y = data.y;
            let pDelta = compressors.playerDelta.getDelta(socket.id, p); if (pDelta) socket.broadcast.emit('enemyUpdate', pDelta);
        }
    });

    socket.on('skill3Aim', (data) => { let p = State.players[socket.id]; if (p && !p.isDead && p.skill3Active && p.characterType === 'BORSALINO') { if (data.dirX !== 0 || data.dirY !== 0) { p.skill3DirX = data.dirX; p.skill3DirY = data.dirY; } } });

    socket.on('borsLightDash', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead || p.characterType !== 'BORSALINO') return;
        let dir = (data && data.dir) || 1;
        io.emit('borsLightDash', { id: socket.id, dir: dir, duration: 220 });

        let minX = dir === 1 ? p.x : p.x - 450;
        let maxX = dir === 1 ? p.x + 450 : p.x;
        applyBoxDamage(p, minX, maxX, p.y - 70, p.y + 70, 70, 0);
    });

    socket.on('useSkill', (data) => { let p = State.players[socket.id]; if (!p || p.isDead) return; let logic = CharLogic[p.characterType]; if (logic && logic.useSkill) logic.useSkill(p, data, serverContext); });

    socket.on('landSkill1', (data) => { let p = State.players[socket.id]; if (!p || p.isDead) return; let logic = CharLogic[p.characterType]; if (logic && logic.landSkill1) logic.landSkill1(p, data, serverContext); });

    socket.on('action', (actionData) => {
        if (!State.gameStarted) return;
        let attacker = State.players[socket.id]; if (!attacker || attacker.isDead || attacker.isCasting) return;

        if (actionData.type === 'thunder_bolt') {
            io.emit('actionEffect', { id: socket.id, type: actionData.type, x: actionData.x, y: actionData.y, dir: actionData.dir, life: actionData.lifeFrames, maxLife: actionData.lifeFrames });
            let boltDamage = attacker.baseDamage + attacker.bonusDamage; 
            let dir = actionData.dir || 1;
            State.projectiles.push({
                id: State.projIdCounter++, team: attacker.team, type: 'thunder_bolt', ownerId: socket.id,
                x: attacker.x + (dir * 60), y: attacker.y - 20,
                vx: dir * 40, vy: 0,
                life: 45, damage: boltDamage, hitR: 45, edgeR: 20, canHitBase: true, piercing: false
            });
            return;
        }
        
        io.emit('actionEffect', { id: socket.id, type: actionData.type, x: actionData.x, y: actionData.y, dir: actionData.dir, life: actionData.lifeFrames, maxLife: actionData.lifeFrames });
        
        let myDamage = attacker.baseDamage + attacker.bonusDamage; 
        let kb = (['BORSALINO', 'KUZAN', 'SAKAZUKI', 'ENEL'].includes(attacker.characterType)) ? 0 : (actionData.dir * 15);
        let isKuzan = attacker.characterType === 'KUZAN';
        let isBorsalino = attacker.characterType === 'BORSALINO';

        let hitRadius = isBorsalino ? 165 : 105;
        let pveHitRadius = isBorsalino ? 120 : 60;

        let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
        if (enemyBase && Math.hypot(actionData.x - enemyBase.x, actionData.y - enemyBase.y) < hitRadius + 45) { applyBaseDamage(attacker.team, myDamage); }

        for (let tid in State.players) {
            if (tid !== socket.id && State.players[tid].team !== attacker.team) {
                let t = State.players[tid];
                if (!t.isDead && Math.hypot(actionData.x - t.x, actionData.y - t.y) < hitRadius) {
                    let actualDamage = myDamage * (1 - (t.defense || 0)); t.hp -= actualDamage; emitDamageText(t.x, t.y, actualDamage);
                    if (t.hp <= 0) checkPlayerDeath(t, socket.id); else io.to(tid).emit('takeDamage', actualDamage); 
                    if (attacker.characterType === 'SAKAZUKI') addBurn(tid, t, 20, 2000, attacker.id);
                    if (t.hp > 0) {
                        let freezeChance = 0;
                        if (isKuzan) freezeChance += 0.06;
                        if (attacker.hasJokbal) freezeChance += 0.06;
                        if (freezeChance > 0 && Math.random() < freezeChance) {
                            t.frozenUntil = Math.max(t.frozenUntil || 0, Date.now() + 1000);
                            io.emit('syncPlayerFull', t);
                        }
                    }
                }
            }
        }
        if (State.monster.hp > 0 && Math.hypot(actionData.x - State.monster.x, actionData.y - State.monster.y) < pveHitRadius + State.monster.radius) {
            State.monster.hp -= myDamage; State.monster.targetId = socket.id; State.monster.state = 'chase'; State.monster.knockbackForce += kb * 0.3; emitDamageText(State.monster.x, State.monster.y, myDamage);
            
            let freezeChance = 0;
            if (isKuzan) freezeChance += 0.06;
            if (attacker.hasJokbal) freezeChance += 0.06;
            if (freezeChance > 0 && Math.random() < freezeChance) {
                State.monster.frozenUntil = Math.max(State.monster.frozenUntil || 0, Date.now() + 1000);
            }

            if (attacker.characterType === 'SAKAZUKI') addBurn('monster', State.monster, 20, 2000, attacker.id);
            if (State.monster.hp <= 0) killMonster(socket.id);
        }
        // 🥊 박힌범 평타 판정
        if (State.hinbeom.hp > 0 && Math.hypot(actionData.x - State.hinbeom.x, actionData.y - State.hinbeom.y) < pveHitRadius + State.hinbeom.radius) {
            // 🛡️ 무적 상태 처리
            if (State.hinbeomMinions.length > 0) {
                // 무적 상태
            } else {
                State.hinbeom.hp -= myDamage; State.hinbeom.knockbackForce += kb * 0.2; emitDamageText(State.hinbeom.x, State.hinbeom.y, myDamage);
                aggroHinbeom(socket.id);

                let freezeChance = 0;
                if (isKuzan) freezeChance += 0.06;
                if (attacker.hasJokbal) freezeChance += 0.06;
                if (freezeChance > 0 && Math.random() < freezeChance) {
                    State.hinbeom.frozenUntil = Math.max(State.hinbeom.frozenUntil || 0, Date.now() + 1000);
                }

                if (attacker.characterType === 'SAKAZUKI') addBurn('hinbeom', State.hinbeom, 20, 2000, attacker.id);
                if (State.hinbeom.hp <= 0) killHinbeom(socket.id);
            }
        }
        // 🐗 소환된 할배새끼 평타 판정
        for (let i = State.hinbeomMinions.length - 1; i >= 0; i--) {
            let mn = State.hinbeomMinions[i];
            if (mn.hp > 0 && Math.hypot(actionData.x - mn.x, actionData.y - mn.y) < pveHitRadius + mn.radius) {
                mn.hp -= myDamage; mn.targetId = socket.id; mn.state = 'chase'; mn.knockbackForce += kb * 0.3; emitDamageText(mn.x, mn.y, myDamage);

                let freezeChance = 0;
                if (isKuzan) freezeChance += 0.06;
                if (attacker.hasJokbal) freezeChance += 0.06;
                if (freezeChance > 0 && Math.random() < freezeChance) {
                    mn.frozenUntil = Math.max(mn.frozenUntil || 0, Date.now() + 1000);
                }

                if (attacker.characterType === 'SAKAZUKI') addBurn('minion_' + mn.id, mn, 20, 2000, attacker.id);
                if (mn.hp <= 0) killMinion(mn, socket.id);
            }
        }
        State.okras.forEach(ok => {
            if (ok.hp > 0 && Math.hypot(actionData.x - ok.x, actionData.y - ok.y) < pveHitRadius + ok.radius) {
                ok.hp -= myDamage; ok.targetId = socket.id; ok.state = 'chase'; ok.knockbackForce += kb; emitDamageText(ok.x, ok.y, myDamage);
                
                let freezeChance = 0;
                if (isKuzan) freezeChance += 0.06;
                if (attacker.hasJokbal) freezeChance += 0.06;
                if (freezeChance > 0 && Math.random() < freezeChance) {
                    ok.frozenUntil = Math.max(ok.frozenUntil || 0, Date.now() + 1000);
                }

                if (attacker.characterType === 'SAKAZUKI') addBurn('okra_'+ok.id, ok, 20, 2000, attacker.id);
                if (ok.hp <= 0) killOkra(ok, socket.id);
            }
        });
    });

    socket.on('disconnect', () => { 
        if (State.players[socket.id]) { 
            if (State.gameStarted) { State.players[socket.id].disconnected = true; State.players[socket.id].disconnectTime = Date.now(); } 
            else { clearBurns(socket.id, State.players[socket.id]); delete State.players[socket.id]; compressors.playerDelta.remove(socket.id); io.emit('playerLeft', socket.id); }
        }
        let remainingPlayers = Object.keys(State.players).filter(pid => !State.players[pid].disconnected);
        if (remainingPlayers.length === 0) { resetGame(); } else if (socket.id === State.masterId) { State.masterId = remainingPlayers[0]; io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId }); }
    });
});

setInterval(() => GameLoop.update(serverContext), 1000 / 60);

http.listen(process.env.PORT || 3000, () => { console.log('서버 가동 완료'); });
