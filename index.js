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
// 🌲 정글 미러링 기준 폭
const MIRROR_WIDTH = 32000;
app.use(express.static(__dirname));
app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

// ============================================================================
// 🥊 박힌범 (중앙 정글 최상단 '바구니' 전용 보스)
// ============================================================================
const HINBEOM_AREA   = { minX: 13400, maxX: 18600, minY: -2400, maxY: -1340 };
const HINBEOM_GROUND = -1400;
const HINBEOM_RADIUS = 63 * 1.5;              // 94.5
const HINBEOM_MAXHP  = 2000 * 5;              // 10000
const HINBEOM_SPEED  = 1.75;
const HINBEOM_HOME_X = 16000;
const HINBEOM_HOME_Y = HINBEOM_GROUND - HINBEOM_RADIUS;
const HINBEOM_REGEN  = 100;

const HAKI_CHANCE    = 0.07;
const HAKI_ROLL_MS   = 1000;
const HAKI_DURATION  = 4000;
const HAKI_TICK_MS   = 1000;
const HAKI_TICK_DMG  = 100;
const HAKI_TICKS     = 4;

const HINBEOM_GOLD    = 5000;
const HINBEOM_XP      = 500 * 2;
const HINBEOM_RESPAWN = 120000;

// 🏆 박힌범 오크라 드롭 조건
const HINBEOM_DROP_ITEM   = 'hinbeom_okra';
const HINBEOM_DROP_DAMAGE = 2500;
const HINBEOM_DROP_CHANCE = 0.15;

// 🐗 할배새끼 오크라 드롭 조건
const MINION_DROP_ITEM   = 'halbae_okra';
const MINION_DROP_CHANCE = 0.05;

// 🌀 포탈 공통 설정
const PORTAL_RADIUS   = 110;
const PORTAL_DURATION = HINBEOM_RESPAWN;      // 기지 귀환 포탈 지속시간
// ✅ [수정] 암흑 왕좌 포탈은 15초만 유지된다
const DARK_PORTAL_DURATION = 15000;
const PORTAL_COOLDOWN = 300;
const PORTAL_DWELL_MS = 3000;

// ── 🐗 패기 3회마다 소환되는 할배새끼 ────────────────────────────────────────
const MINION_EVERY   = 3;
const MINION_HP      = 2000;
const MINION_RADIUS  = 63;
const MINION_SPEED   = 1.75;
const MINION_MARGIN  = 200;
const MINION_MAX     = 8;
const MINION_GOLD    = 1000;
const MINION_XP      = 100;

// ============================================================================
// ⚫ 검은수염 (암흑 왕좌 전용 보스)
// ============================================================================
const DARK_AREA   = { minX: 36000, maxX: 41000, minY: 600, maxY: 2060 };
const DARK_GROUND = 2000;
const DARK_ENTRY_X = 38500;
const DARK_ENTRY_Y = DARK_GROUND - 45;
const DARK_ZONE_MIN = 35400;
const DARK_ZONE_MAX = 41600;

const BB_RADIUS = HINBEOM_RADIUS;                                // 94.5
const BB_MAXHP  = Math.round(HINBEOM_MAXHP * 1.2 * 1.2);         // 14400 (회복 없음)
const BB_SPEED  = 1.75;
const BB_HOME_X = 38500;
const BB_HOME_Y = DARK_GROUND - BB_RADIUS;
const BB_GOLD   = 8000;
const BB_XP     = 1500;
const BB_RESPAWN = 120000;

// 🌊 블랙홀 — 암흑물질 장판 (1초마다 7%)
const DARKFLOOR_CHANCE   = 0.07;
const DARKFLOOR_ROLL_MS  = 1000;
const DARKFLOOR_DURATION = 4000;
const DARKFLOOR_TICK_MS  = 500;
const DARKFLOOR_TICK_DMG = 40;
const DARKFLOOR_SLOW     = 0.3;

// ⛓️ 크로우즈 + 파공아
const CROWS_INTERVAL   = 5000;
const CROWS_TELEGRAPH  = 1000;
const CROWS_RANGE      = Math.round(1680 * 3 * 1.5);   // 7560
const CROWS_THICKNESS  = Math.round(90 * 3 * 1.5);     // 405
const CROWS_PULL_MS    = 420;
const GURA_DAMAGE      = 500;
const GURA_RADIUS_MULT = 3.0;

// 🌑 공중 강림 (1초마다 3% · 5초 지속)
const DESCENT_CHANCE    = 0.03;
const DESCENT_ROLL_MS   = 1000;
const DESCENT_DURATION  = 5000;
const DESCENT_TICK_MS   = 1000;
const DESCENT_TICK_DMG  = 150;
const DESCENT_RISE      = 420;
const DESCENT_ASCEND_MS = 2000;

// ============================================================================
// 🟪 지저스 바제스
// ============================================================================
const BG_RADIUS      = BB_RADIUS * 0.8;                 // 75.6
const BG_MAXHP       = Math.round(BB_MAXHP * 0.5);       // 7200
const BG_SPEED       = 2.2;
const BG_GOLD        = 4000;
const BG_XP          = 800;

const BG_FALL_FROM   = -2600;
const BG_FALL_SPEED  = 120;
const BG_LAND_DAMAGE = 500;
const BG_LAND_MULT   = 6.0;

// ✅ [수정] 점프 간격 3초 → 2초 (1초 단축)
const BG_JUMP_INTERVAL  = 2000;
const BG_JUMP_TELEGRAPH = 700;
const BG_JUMP_TRAVEL    = 320;
const BG_JUMP_DAMAGE    = 300;
const BG_JUMP_MULT      = 4.5;
const BG_JUMP_ARC       = 520;
const BG_GRAVITY        = 2.4;

/** 바구니 공간 안에 있는가 */
function isInHinbeomArea(e) {
    if (!e) return false;
    return e.x >= HINBEOM_AREA.minX && e.x <= HINBEOM_AREA.maxX
        && e.y >= HINBEOM_AREA.minY && e.y <= HINBEOM_AREA.maxY;
}

/** ⚫ 암흑 왕좌 안에 있는가 */
function isInDarkArea(e) {
    if (!e) return false;
    return e.x >= DARK_AREA.minX && e.x <= DARK_AREA.maxX
        && e.y >= DARK_AREA.minY && e.y <= DARK_AREA.maxY;
}

/** ⚫ 암흑 왕좌 '구역'(렌더 격리 범위) 안에 있는가 — X만 본다 */
function isInDarkZone(e) {
    if (!e) return false;
    return e.x >= DARK_ZONE_MIN && e.x <= DARK_ZONE_MAX;
}

/** ⛓️ 크로우즈 조준선 안에 대상이 들어와 있는가 (표시와 동일한 판정) */
function isInCrowsBeam(bb, t) {
    if (!bb || !t) return false;
    let ux = bb.crowsAimUX, uy = bb.crowsAimUY;
    if (ux === undefined || uy === undefined) return false;
    let len = Math.hypot(ux, uy);
    if (len === 0) return false;
    ux /= len; uy /= len;

    const half = CROWS_THICKNESS / 2;
    const tipR = half * 0.9;

    let rx = t.x - bb.x, ry = t.y - bb.y;
    let s = rx * ux + ry * uy;
    let d = Math.abs(rx * (-uy) + ry * ux);

    if (s >= -half && s <= CROWS_RANGE && d <= half) return true;

    let tipX = bb.x + ux * CROWS_RANGE;
    let tipY = bb.y + uy * CROWS_RANGE;
    if (Math.hypot(t.x - tipX, t.y - tipY) <= tipR) return true;

    return false;
}

// 🚀 [최적화] 델타 전송 대상 필드 화이트리스트
const PLAYER_DELTA_FIELDS = [
    'x', 'y', 'hp', 'maxHp', 'level', 'xp', 'maxXp', 'isDead', 'isCasting', 'lastFacing',
    'knockbackForce', 'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'burningUntil', 'maguBombUntil', 'justiceBombUntil', 'skill2EndTime', 'characterType',
    'hasJusticeCoat', 'hasPika', 'hasHie', 'hasMagu', 'hasKizaru', 'hasAokiji', 'hasAkainu',
    'hasGoro', 'hasArkMaxim', 'hasGodEnel', 'elThorActive', 'yataActive', 'crowsPullUntil', 'darkBanned'
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
const HINBEOM_DELTA_FIELDS = [
    'x', 'y', 'hp', 'maxHp', 'radius', 'state', 'knockbackForce', 'hakiActiveUntil',
    'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'burningUntil', 'maguBombUntil', 'justiceBombUntil'
];
const BB_DELTA_FIELDS = [
    'x', 'y', 'hp', 'maxHp', 'radius', 'state', 'knockbackForce',
    'castingUntil', 'telegraphUntil', 'darkFloorUntil', 'risingUntil', 'descentUntil',
    'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'burningUntil', 'maguBombUntil', 'justiceBombUntil'
];
const BG_DELTA_FIELDS = [
    'x', 'y', 'hp', 'maxHp', 'radius', 'state', 'knockbackForce',
    'fallingUntil', 'jumpTelegraphUntil', 'jumpingUntil', 'jumpTargetX', 'jumpTargetY', 'airborne',
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
    hinbeomDelta: new DeltaCompressor(HINBEOM_DELTA_FIELDS),
    blackbeardDelta: new DeltaCompressor(BB_DELTA_FIELDS),
    burgessDelta: new DeltaCompressor(BG_DELTA_FIELDS)
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
        lastRegenTick: 0,
        damageBy: {},
        // ✅ [추가] 부활 예약 타이머 핸들 · 죽은 세대 번호
        respawnTimer: null,
        deathGen: 0
    };
}

/** ⚫ 검은수염 초기 상태 객체 생성 */
function makeBlackbeard() {
    return {
        x: BB_HOME_X, y: BB_HOME_Y, homeX: BB_HOME_X, homeY: BB_HOME_Y,
        radius: BB_RADIUS,
        hp: BB_MAXHP, maxHp: BB_MAXHP,
        speed: BB_SPEED,
        targetId: null, state: 'idle', lastAttack: 0,
        frozenUntil: 0, electrocutedUntil: 0, airFreezeUntil: 0, raigoPullUntil: 0,
        knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0,

        castingUntil: 0,

        darkFloorNextRoll: 0,
        darkFloorUntil: 0,
        darkFloorNextTick: 0,

        crowsNextCast: 0,
        telegraphUntil: 0,
        crowsPendingTarget: null,
        crowsAimX: 0, crowsAimY: 0,
        crowsAimUX: 1, crowsAimUY: 0,
        crowsActiveTarget: null,
        crowsHitAt: 0,

        descentNextRoll: 0,
        risingUntil: 0,
        riseFromY: 0, riseToY: 0,
        descentUntil: 0,
        descentNextTick: 0,
        descentActive: false,

        burgessSummoned: false,
        // ✅ [추가] 부활 예약 타이머 핸들 · 죽은 세대 번호
        respawnTimer: null,
        deathGen: 0
    };
}

/** 🟪 지저스 바제스 초기 상태 객체 생성 */
function makeBurgess() {
    return {
        x: BB_HOME_X, y: DARK_GROUND - BG_RADIUS,
        radius: BG_RADIUS,
        hp: 0, maxHp: BG_MAXHP,
        speed: BG_SPEED,
        targetId: null, state: 'none',
        frozenUntil: 0, electrocutedUntil: 0, airFreezeUntil: 0, raigoPullUntil: 0,
        knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0,

        fallingUntil: 0,

        jumpNextCast: 0,
        jumpTelegraphUntil: 0,
        jumpingUntil: 0,
        jumpStartX: 0, jumpStartY: 0,
        jumpTargetX: 0, jumpTargetY: 0,
        airborne: false,
        vy: 0
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
    hinbeom: makeHinbeom(),
    hinbeomMinions: [],
    hinbeomPortal: null,
    darkPortal: null,
    blackbeard: makeBlackbeard(),
    burgess: makeBurgess(),
    blackbeardPortal: null,
    blackbeardKilledBy: null,
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
function getMinion(id) { return State.hinbeomMinions.find(m => m.id === id); }

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

function despawnHinbeomMinions() {
    if (State.hinbeomMinions.length === 0) return;
    State.hinbeomMinions.forEach(m => clearBurns('minion_' + m.id, m));
    State.hinbeomMinions.length = 0;
    io.emit('syncMinions', []);
}

function tryMinionOkraDrop(attackerId) {
    if (!attackerId) return;
    let p = State.players[attackerId];
    if (!p) return;
    if (Math.random() >= MINION_DROP_CHANCE) return;

    if (p.inventory.length >= 20) {
        io.to(attackerId).emit('goldenDrop', { msg: '인벤토리가 가득 차 할배새끼 오크라를 놓쳤습니다!', fail: true });
        return;
    }
    p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: MINION_DROP_ITEM });
    io.to(attackerId).emit('goldenDrop', { msg: '🐗 할배새끼 오크라 획득! (최대체력 +500)', inventory: p.inventory });
}

function killMinion(m, attackerId) {
    if (!m || m.state === 'dead') return;
    m.state = 'dead';
    if (attackerId && State.players[attackerId]) {
        State.players[attackerId].gold += MINION_GOLD; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], MINION_XP);
    }
    tryMinionOkraDrop(attackerId);
    clearBurns('minion_' + m.id, m);
    let idx = State.hinbeomMinions.indexOf(m);
    if (idx !== -1) State.hinbeomMinions.splice(idx, 1);
}

function recordHinbeomDamage(attackerId, amount) {
    if (!attackerId || !amount || amount <= 0) return;
    if (!State.players[attackerId]) return;
    const h = State.hinbeom;
    if (!h) return;
    if (!h.damageBy) h.damageBy = {};
    h.damageBy[attackerId] = (h.damageBy[attackerId] || 0) + amount;
}

function tryHinbeomOkraDrop() {
    const h = State.hinbeom;
    if (!h || !h.damageBy) return;
    for (let pid in h.damageBy) {
        if (h.damageBy[pid] < HINBEOM_DROP_DAMAGE) continue;
        let p = State.players[pid];
        if (!p) continue;
        if (Math.random() >= HINBEOM_DROP_CHANCE) continue;

        if (p.inventory.length >= 20) {
            io.to(pid).emit('goldenDrop', { msg: '인벤토리가 가득 차 박힌범 오크라를 놓쳤습니다!', fail: true });
            continue;
        }
        p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: HINBEOM_DROP_ITEM });
        io.to(pid).emit('goldenDrop', { msg: '🥊 박힌범 오크라 획득! (초당 체력 30 회복)', inventory: p.inventory });
    }
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

// 블루팀 / 레드팀 오크라를 완전히 대칭으로 배치
for(let i = 0; i < 8; i++) {
    let bx = 1500 + i * 600;
    spawnOkra(bx, 1955);
    spawnOkra(MIRROR_WIDTH - bx, 1955);
}

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
        else if (key === 'hinbeom') { entity = State.hinbeom; kind = 'hinbeom'; }
        else if (key === 'blackbeard') { entity = State.blackbeard; kind = 'blackbeard'; }
        else if (key === 'burgess') { entity = State.burgess; kind = 'burgess'; }
        else if (typeof key === 'string' && key.startsWith('minion_')) { entity = getMinion(parseInt(key.slice(7))); kind = 'minion'; }
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
        } else if (kind === 'hinbeom') {
            if (State.hinbeom.state === 'dead') { /* 이미 죽음 */ }
            else if (State.hinbeomMinions.length > 0) {
                // 무적 상태
            } else {
                State.hinbeom.hp -= dmg; emitDamageText(State.hinbeom.x, State.hinbeom.y, dmg);
                recordHinbeomDamage(lastOwner, dmg);
                if (State.hinbeom.hp <= 0) killHinbeom(lastOwner);
            }
        } else if (kind === 'blackbeard') {
            if (State.blackbeard.state !== 'dead') {
                State.blackbeard.hp -= dmg; emitDamageText(State.blackbeard.x, State.blackbeard.y, dmg);
                checkBurgessSummon();
                if (State.blackbeard.hp <= 0) killBlackbeard(lastOwner);
            }
        } else if (kind === 'burgess') {
            State.burgess.hp -= dmg; emitDamageText(State.burgess.x, State.burgess.y, dmg);
            if (State.burgess.hp <= 0) killBurgess(lastOwner);
        } else if (kind === 'minion') {
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

    // ✅ [수정] 진행 중이던 부활 타이머를 반드시 취소한다
    if (State.hinbeom && State.hinbeom.respawnTimer) { clearTimeout(State.hinbeom.respawnTimer); State.hinbeom.respawnTimer = null; }
    if (State.blackbeard && State.blackbeard.respawnTimer) { clearTimeout(State.blackbeard.respawnTimer); State.blackbeard.respawnTimer = null; }

    State.hinbeom = makeHinbeom();
    State.hinbeomMinions = [];
    State.hinbeomPortal = null;
    State.darkPortal = null;
    State.blackbeard = makeBlackbeard();
    State.burgess = makeBurgess();
    State.blackbeardPortal = null;
    State.blackbeardKilledBy = null;
    io.emit('syncHinbeomPortal', null);
    io.emit('syncDarkPortal', null);
    io.emit('syncBlackbeardPortal', null);
    io.emit('burgessDespawn');
    State.turrets = [ { team: 1, x: 12500, y: 1850, range: 1200, damage: 30, lastShot: 0 }, { team: 2, x: 19500, y: 1850, range: 1200, damage: 30, lastShot: 0 } ];
    State.teamStorages = { 1: [], 2: [] };
    State.okras.forEach(ok => { rerollOkraGrade(ok); ok.x = ok.homeX; ok.y = ok.homeY; ok.state = 'idle'; ok.targetId = null; ok.knockbackForce = 0; ok.burningUntil = 0; ok.maguBombUntil = 0; ok.justiceBombUntil = 0; ok.skillFreezeUntil = 0; ok.electrocutedUntil = 0; });
    compressors.monsterDelta.snapshots.clear(); compressors.okraDelta.snapshots.clear(); compressors.playerDelta.snapshots.clear();
    compressors.hinbeomDelta.snapshots.clear();
    compressors.blackbeardDelta.snapshots.clear();
    compressors.burgessDelta.snapshots.clear();
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
        if (isInDarkZone(targetPlayer)) targetPlayer.darkBanned = true;

        targetPlayer.hp = 0; targetPlayer.isDead = true; 
        targetPlayer.isCasting = false; targetPlayer.skill3Active = false; targetPlayer.yataActive = false; targetPlayer.yataPath = null; 
        targetPlayer.iceAgeActive = false; targetPlayer.partisanQueue = 0; targetPlayer.partisanFired = 0;
        targetPlayer.volcanoActive = false; targetPlayer.maguBombUntil = 0; targetPlayer.justiceBombUntil = 0;
        targetPlayer.skillFreezeUntil = 0; 
        targetPlayer.skill1Dashing = false; 
        targetPlayer.portalDwellUntil = 0; targetPlayer.portalDwellStart = 0;
        targetPlayer.darkDwellUntil = 0; targetPlayer.darkDwellStart = 0;
        targetPlayer.crowsPullUntil = 0;
        targetPlayer.elThorActive = false; targetPlayer.mantleActive = false; targetPlayer.raigoActive = false; targetPlayer.raigoDropped = false;
        clearBurns(targetPlayer.id, targetPlayer); 
        io.emit('player_died', targetPlayer.id);
        io.emit('syncPlayerFull', targetPlayer); 

        if (State.blackbeard && State.blackbeard.crowsActiveTarget === targetPlayer.id) {
            State.blackbeard.crowsActiveTarget = null;
            State.blackbeard.crowsHitAt = 0;
            io.emit('crowsEnd', { id: targetPlayer.id });
        }
        if (State.blackbeard && State.blackbeard.crowsPendingTarget === targetPlayer.id) {
            State.blackbeard.crowsPendingTarget = null;
        }

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
//    ✅ [수정] 이전 부활 타이머를 반드시 취소하고, 세대 번호로 이중 검증한다.
//       (예전에는 죽음이 겹치면 옛 타이머가 살아나 전투 중 체력이 풀로 복구됐다)
function killHinbeom(attackerId) {
    const h = State.hinbeom;
    if (h.state === 'dead') return;

    if (attackerId && State.players[attackerId]) {
        State.players[attackerId].gold += HINBEOM_GOLD; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], HINBEOM_XP);
    }

    tryHinbeomOkraDrop();
    h.damageBy = {};

    State.hinbeomPortal = {
        x: h.x,
        y: h.y,
        radius: PORTAL_RADIUS,
        createdAt: Date.now(),
        expireAt: Date.now() + PORTAL_DURATION
    };
    io.emit('syncHinbeomPortal', State.hinbeomPortal);

    // 🟣 25% 확률로 암흑 왕좌 포탈 생성 (15초 후 소멸)
    if (Math.random() < 0.25) {
        let px = h.x + 320;
        if (px > HINBEOM_AREA.maxX - 160) px = h.x - 320;
        if (px < HINBEOM_AREA.minX + 160) px = HINBEOM_AREA.minX + 160;
        State.darkPortal = {
            x: px,
            y: h.y,
            radius: PORTAL_RADIUS,
            createdAt: Date.now(),
            expireAt: Date.now() + DARK_PORTAL_DURATION   // ✅ 15초
        };
        io.emit('syncDarkPortal', State.darkPortal);

        for (let pid in State.players) {
            if (State.players[pid].darkBanned) {
                State.players[pid].darkBanned = false;
                io.emit('syncPlayerFull', State.players[pid]);
            }
        }
    }

    h.targetId = null;
    h.state = 'dead';
    h.hakiBursts = [];
    h.hakiActiveUntil = 0;
    h.hakiCount = 0;
    clearBurns('hinbeom', h);
    despawnHinbeomMinions();
    io.emit('hakiEnd');

    // ✅ 이전 부활 예약이 남아 있으면 취소한다
    if (h.respawnTimer) { clearTimeout(h.respawnTimer); h.respawnTimer = null; }
    h.deathGen = (h.deathGen || 0) + 1;
    const gen = h.deathGen;

    h.respawnTimer = setTimeout(() => {
        const hh = State.hinbeom;
        // ✅ 이중 검증 : 이 타이머가 최신 세대이고, 아직 죽은 상태일 때만 부활시킨다
        if (!hh || hh.deathGen !== gen || hh.state !== 'dead') return;

        hh.respawnTimer = null;
        hh.hp = hh.maxHp;
        hh.x = hh.homeX; hh.y = hh.homeY;
        hh.state = 'idle';
        hh.knockbackForce = 0;
        hh.frozenUntil = 0; hh.electrocutedUntil = 0;
        hh.airFreezeUntil = 0; hh.raigoPullUntil = 0;
        hh.burningUntil = 0; hh.maguBombUntil = 0; hh.justiceBombUntil = 0;
        hh.lastRegenTick = 0;
        hh.hakiNextRoll = 0;
        hh.damageBy = {};
        State.hinbeomPortal = null;
        State.darkPortal = null;
        io.emit('syncHinbeomPortal', null);
        io.emit('syncDarkPortal', null);
        for (let pid in State.players) {
            let pp = State.players[pid];
            if (pp.portalDwellUntil) { pp.portalDwellUntil = 0; pp.portalDwellStart = 0; io.emit('portalDwell', { id: pid, until: 0 }); }
            if (pp.darkDwellUntil) { pp.darkDwellUntil = 0; pp.darkDwellStart = 0; io.emit('darkDwell', { id: pid, until: 0 }); }
        }
    }, HINBEOM_RESPAWN);
}

/** ⚫ 검은수염의 진행 중인 모든 스킬을 정리한다 */
function clearBlackbeardSkills() {
    const bb = State.blackbeard;
    if (!bb) return;
    bb.castingUntil = 0;
    bb.telegraphUntil = 0;
    bb.crowsPendingTarget = null;
    bb.crowsActiveTarget = null;
    bb.crowsHitAt = 0;
    bb.darkFloorUntil = 0;
    bb.darkFloorNextTick = 0;
    bb.risingUntil = 0;
    bb.descentUntil = 0;
    bb.descentActive = false;
    bb.descentNextTick = 0;

    for (let pid in State.players) {
        let p = State.players[pid];
        if (p.crowsPullUntil) { p.crowsPullUntil = 0; io.emit('crowsEnd', { id: pid }); }
    }
    io.emit('darkFloorEnd');
    io.emit('descentEnd');
}

/** 🟪 검은수염 체력이 절반 이하로 떨어지면 지저스 바제스를 소환한다 */
function checkBurgessSummon() {
    const bb = State.blackbeard;
    const bg = State.burgess;
    if (!bb || !bg) return;
    if (bb.state === 'dead' || bb.hp <= 0) return;
    if (bb.burgessSummoned) return;
    if (bb.hp > bb.maxHp * 0.5) return;

    bb.burgessSummoned = true;

    let margin = BG_RADIUS + 200;
    let spawnX = DARK_AREA.minX + margin + Math.random() * ((DARK_AREA.maxX - margin) - (DARK_AREA.minX + margin));

    bg.hp = BG_MAXHP;
    bg.maxHp = BG_MAXHP;
    bg.radius = BG_RADIUS;
    bg.x = spawnX;
    bg.y = BG_FALL_FROM;
    bg.state = 'falling';
    bg.targetId = null;
    bg.knockbackForce = 0;
    bg.frozenUntil = 0; bg.electrocutedUntil = 0; bg.airFreezeUntil = 0; bg.raigoPullUntil = 0;
    bg.burningUntil = 0; bg.maguBombUntil = 0; bg.justiceBombUntil = 0;
    bg.fallingUntil = Date.now() + 8000;
    bg.jumpNextCast = 0;
    bg.jumpTelegraphUntil = 0;
    bg.jumpingUntil = 0;
    bg.jumpTargetX = spawnX;
    bg.jumpTargetY = DARK_GROUND - BG_RADIUS;
    bg.airborne = false;
    bg.vy = 0;

    io.emit('burgessSpawn', { x: spawnX, y: BG_FALL_FROM, radius: BG_RADIUS });
}

/** 🟪 바제스 착지 / 점프 착지 시 큰 풍압 */
function burgessShockwave(cx, cy, radius, damage) {
    io.emit('burgessBlast', { x: cx, y: cy, radius: radius });
    for (let pid in State.players) {
        let t = State.players[pid];
        if (t.isDead || !isInDarkArea(t)) continue;
        if (Math.hypot(t.x - cx, t.y - cy) > radius) continue;
        let actual = damage * (1 - (t.defense || 0));
        t.hp -= actual;
        emitDamageText(t.x, t.y, actual);
        if (t.hp <= 0) checkPlayerDeath(t, null);
        else io.to(pid).emit('bossHit', { damage: actual, dir: (t.x >= cx ? 1 : -1), kb: (t.x >= cx ? 55 : -55) });
    }
}

/** 🟪 지저스 바제스 처치 */
function killBurgess(attackerId) {
    const bg = State.burgess;
    if (!bg || bg.state === 'none' || bg.state === 'dead') return;
    if (attackerId && State.players[attackerId]) {
        State.players[attackerId].gold += BG_GOLD; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], BG_XP);
    }
    bg.hp = 0;
    bg.state = 'dead';
    bg.targetId = null;
    bg.jumpTelegraphUntil = 0;
    bg.jumpingUntil = 0;
    bg.fallingUntil = 0;
    bg.airborne = false;
    bg.vy = 0;
    clearBurns('burgess', bg);
    io.emit('burgessDespawn');

    if (State.blackbeard.state === 'dead' && !State.blackbeardPortal) {
        spawnBlackbeardPortal();
    }
}

/** 🌀 검은수염 처치 포탈 생성 */
function spawnBlackbeardPortal() {
    State.blackbeardPortal = {
        x: State.blackbeard.x,
        y: DARK_GROUND - PORTAL_RADIUS,
        radius: PORTAL_RADIUS,
        createdAt: Date.now(),
        expireAt: Date.now() + BB_RESPAWN
    };
    io.emit('syncBlackbeardPortal', State.blackbeardPortal);
}

// ⚫ 검은수염 처치
//    ✅ [수정] 부활 타이머 중복 방지 (박힌범과 동일한 방식)
function killBlackbeard(attackerId) {
    const bb = State.blackbeard;
    if (bb.state === 'dead') return;

    if (attackerId && State.players[attackerId]) {
        State.players[attackerId].gold += BB_GOLD; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], BB_XP);
    }

    State.blackbeardKilledBy = attackerId || null;
    bb.targetId = null;
    bb.state = 'dead';
    clearBlackbeardSkills();
    clearBurns('blackbeard', bb);

    const bgAlive = (State.burgess && State.burgess.hp > 0 && State.burgess.state !== 'dead' && State.burgess.state !== 'none');
    if (!bgAlive) spawnBlackbeardPortal();

    if (bb.respawnTimer) { clearTimeout(bb.respawnTimer); bb.respawnTimer = null; }
    bb.deathGen = (bb.deathGen || 0) + 1;
    const gen = bb.deathGen;

    bb.respawnTimer = setTimeout(() => {
        const b2 = State.blackbeard;
        if (!b2 || b2.deathGen !== gen || b2.state !== 'dead') return;

        b2.respawnTimer = null;
        b2.hp = b2.maxHp;
        b2.x = b2.homeX; b2.y = b2.homeY;
        b2.state = 'idle';
        b2.knockbackForce = 0;
        b2.frozenUntil = 0; b2.electrocutedUntil = 0;
        b2.airFreezeUntil = 0; b2.raigoPullUntil = 0;
        b2.burningUntil = 0; b2.maguBombUntil = 0; b2.justiceBombUntil = 0;
        b2.darkFloorNextRoll = 0;
        b2.descentNextRoll = 0;
        b2.crowsNextCast = 0;
        b2.burgessSummoned = false;
        State.burgess = makeBurgess();
        io.emit('burgessDespawn');
        State.blackbeardPortal = null;
        State.blackbeardKilledBy = null;
        io.emit('syncBlackbeardPortal', null);
        for (let pid in State.players) {
            let pp = State.players[pid];
            if (pp.portalDwellUntil) { pp.portalDwellUntil = 0; pp.portalDwellStart = 0; io.emit('portalDwell', { id: pid, until: 0 }); }
        }
    }, BB_RESPAWN);
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

/** 🟪 바제스가 현재 피격 가능한 상태인가 */
function burgessAlive() {
    const bg = State.burgess;
    return !!(bg && bg.hp > 0 && bg.state !== 'dead' && bg.state !== 'none');
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
    if (State.hinbeom.hp > 0 && State.hinbeom.state !== 'dead' && Math.hypot(cx - State.hinbeom.x, cy - State.hinbeom.y) < radius + State.hinbeom.radius) {
        if (State.hinbeomMinions.length > 0) {
            // 무적 상태
        } else {
            State.hinbeom.hp -= damage; State.hinbeom.knockbackForce += kb * 0.2; emitDamageText(State.hinbeom.x, State.hinbeom.y, damage);
            recordHinbeomDamage(attacker.id, damage);
            aggroHinbeom(attacker.id);
            if (State.hinbeom.hp <= 0) killHinbeom(attacker.id);
        }
    }
    if (State.blackbeard.hp > 0 && State.blackbeard.state !== 'dead' && Math.hypot(cx - State.blackbeard.x, cy - State.blackbeard.y) < radius + State.blackbeard.radius) {
        State.blackbeard.hp -= damage; State.blackbeard.knockbackForce += kb * 0.2; emitDamageText(State.blackbeard.x, State.blackbeard.y, damage);
        aggroBlackbeard(attacker.id);
        checkBurgessSummon();
        if (State.blackbeard.hp <= 0) killBlackbeard(attacker.id);
    }
    if (burgessAlive() && Math.hypot(cx - State.burgess.x, cy - State.burgess.y) < radius + State.burgess.radius) {
        State.burgess.hp -= damage; State.burgess.knockbackForce += kb * 0.25; emitDamageText(State.burgess.x, State.burgess.y, damage);
        aggroBurgess(attacker.id);
        if (State.burgess.hp <= 0) killBurgess(attacker.id);
    }
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
    if (State.hinbeom.hp > 0 && State.hinbeom.state !== 'dead' && State.hinbeom.x >= minX - State.hinbeom.radius && State.hinbeom.x <= maxX + State.hinbeom.radius && State.hinbeom.y >= minY - State.hinbeom.radius && State.hinbeom.y <= maxY + State.hinbeom.radius) {
        if (State.hinbeomMinions.length > 0) {
            // 무적 상태
        } else {
            State.hinbeom.hp -= damage; State.hinbeom.knockbackForce += kb * 0.2; emitDamageText(State.hinbeom.x, State.hinbeom.y, damage);
            recordHinbeomDamage(attacker.id, damage);
            aggroHinbeom(attacker.id);
            if (State.hinbeom.hp <= 0) killHinbeom(attacker.id);
        }
    }
    if (State.blackbeard.hp > 0 && State.blackbeard.state !== 'dead' && State.blackbeard.x >= minX - State.blackbeard.radius && State.blackbeard.x <= maxX + State.blackbeard.radius && State.blackbeard.y >= minY - State.blackbeard.radius && State.blackbeard.y <= maxY + State.blackbeard.radius) {
        State.blackbeard.hp -= damage; State.blackbeard.knockbackForce += kb * 0.2; emitDamageText(State.blackbeard.x, State.blackbeard.y, damage);
        aggroBlackbeard(attacker.id);
        checkBurgessSummon();
        if (State.blackbeard.hp <= 0) killBlackbeard(attacker.id);
    }
    if (burgessAlive() && State.burgess.x >= minX - State.burgess.radius && State.burgess.x <= maxX + State.burgess.radius && State.burgess.y >= minY - State.burgess.radius && State.burgess.y <= maxY + State.burgess.radius) {
        State.burgess.hp -= damage; State.burgess.knockbackForce += kb * 0.25; emitDamageText(State.burgess.x, State.burgess.y, damage);
        aggroBurgess(attacker.id);
        if (State.burgess.hp <= 0) killBurgess(attacker.id);
    }
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
    if (State.hinbeom.hp > 0 && State.hinbeom.state !== 'dead' && Math.hypot(cx - State.hinbeom.x, cy - State.hinbeom.y) < radius + State.hinbeom.radius) {
        if (State.hinbeomMinions.length > 0) {
            // 무적
        } else {
            State.hinbeom.hp -= damage; emitDamageText(State.hinbeom.x, State.hinbeom.y, damage);
            recordHinbeomDamage(attacker.id, damage);
            State.hinbeom.frozenUntil = Math.max(State.hinbeom.frozenUntil || 0, Date.now() + freezeDuration);
            aggroHinbeom(attacker.id);
            if (hasAokiji) {
                State.hinbeom.skillFreezeUntil = Math.max(State.hinbeom.skillFreezeUntil || 0, Date.now() + 5000);
                io.emit('actionEffect', { type: 'awaken_icicles', x: State.hinbeom.x, y: State.hinbeom.y, life: 60, maxLife: 60 });
            }
            if (State.hinbeom.hp <= 0) killHinbeom(attacker.id);
        }
    }
    if (State.blackbeard.hp > 0 && State.blackbeard.state !== 'dead' && Math.hypot(cx - State.blackbeard.x, cy - State.blackbeard.y) < radius + State.blackbeard.radius) {
        State.blackbeard.hp -= damage; emitDamageText(State.blackbeard.x, State.blackbeard.y, damage);
        State.blackbeard.frozenUntil = Math.max(State.blackbeard.frozenUntil || 0, Date.now() + freezeDuration);
        aggroBlackbeard(attacker.id);
        checkBurgessSummon();
        if (hasAokiji) {
            State.blackbeard.skillFreezeUntil = Math.max(State.blackbeard.skillFreezeUntil || 0, Date.now() + 5000);
            io.emit('actionEffect', { type: 'awaken_icicles', x: State.blackbeard.x, y: State.blackbeard.y, life: 60, maxLife: 60 });
        }
        if (State.blackbeard.hp <= 0) killBlackbeard(attacker.id);
    }
    if (burgessAlive() && Math.hypot(cx - State.burgess.x, cy - State.burgess.y) < radius + State.burgess.radius) {
        State.burgess.hp -= damage; emitDamageText(State.burgess.x, State.burgess.y, damage);
        State.burgess.frozenUntil = Math.max(State.burgess.frozenUntil || 0, Date.now() + freezeDuration);
        aggroBurgess(attacker.id);
        if (hasAokiji) {
            State.burgess.skillFreezeUntil = Math.max(State.burgess.skillFreezeUntil || 0, Date.now() + 5000);
            io.emit('actionEffect', { type: 'awaken_icicles', x: State.burgess.x, y: State.burgess.y, life: 60, maxLife: 60 });
        }
        if (State.burgess.hp <= 0) killBurgess(attacker.id);
    }
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

/** 🥊 박힌범 어그로 */
function aggroHinbeom(attackerId) {
    const h = State.hinbeom;
    if (!h || h.hp <= 0 || h.state === 'dead') return;
    const p = State.players[attackerId];
    if (!p || p.isDead) return;
    if (!isInHinbeomArea(p)) return;
    h.targetId = attackerId;
    h.state = 'chase';
}

/** ⚫ 검은수염 어그로 */
function aggroBlackbeard(attackerId) {
    const b = State.blackbeard;
    if (!b || b.hp <= 0 || b.state === 'dead') return;
    const p = State.players[attackerId];
    if (!p || p.isDead) return;
    if (!isInDarkArea(p)) return;
    b.targetId = attackerId;
    b.state = 'chase';
}

/** 🟪 바제스 어그로 */
function aggroBurgess(attackerId) {
    const bg = State.burgess;
    if (!burgessAlive()) return;
    const p = State.players[attackerId];
    if (!p || p.isDead) return;
    if (!isInDarkArea(p)) return;
    bg.targetId = attackerId;
}

const serverContext = {
    get io() { return io; }, get Skills() { return Skills; }, get Items() { return Items; }, get Characters() { return Characters; },
    State, compressors, CharLogic,
    getPlayers: () => State.players, getMonster: () => State.monster, getOkras: () => State.okras,
    getHinbeom: () => State.hinbeom,
    getMinions: () => State.hinbeomMinions,
    getBlackbeard: () => State.blackbeard,
    getBurgess: () => State.burgess,
    applyAoEDamage, applyBoxDamage, applyIceAge, emitDamageText, checkPlayerDeath, gainXp,
    addShockwave: (sw) => State.shockwaves.push(sw), addProjectile: (proj) => State.projectiles.push(proj),
    addMagma: (m) => State.magmas.push(m), addMantleBolt: (b) => State.mantleBolts.push(b), addBurn, clearBurns, processBurns,
    getNextProjId: () => State.projIdCounter++, recalcStats, killMonster, killOkra, applyBaseDamage, tryGoldenDrop, rerollOkraGrade,
    killHinbeom, aggroHinbeom, isInHinbeomArea,
    getMinion, killMinion, spawnHinbeomMinions, despawnHinbeomMinions,
    recordHinbeomDamage,
    PORTAL_COOLDOWN, PORTAL_DWELL_MS, PORTAL_RADIUS, DARK_PORTAL_DURATION,
    HINBEOM_AREA, HINBEOM_GROUND, HINBEOM_REGEN,
    HAKI_CHANCE, HAKI_ROLL_MS, HAKI_DURATION, HAKI_TICK_MS, HAKI_TICK_DMG, HAKI_TICKS,
    MINION_EVERY,
    // ⚫ 검은수염
    killBlackbeard, aggroBlackbeard, isInDarkArea, isInDarkZone, clearBlackbeardSkills, isInCrowsBeam,
    DARK_AREA, DARK_GROUND, DARK_ENTRY_X, DARK_ENTRY_Y,
    BB_RADIUS,
    DARKFLOOR_CHANCE, DARKFLOOR_ROLL_MS, DARKFLOOR_DURATION, DARKFLOOR_TICK_MS, DARKFLOOR_TICK_DMG, DARKFLOOR_SLOW,
    CROWS_INTERVAL, CROWS_TELEGRAPH, CROWS_RANGE, CROWS_THICKNESS, CROWS_PULL_MS,
    GURA_DAMAGE, GURA_RADIUS_MULT,
    DESCENT_CHANCE, DESCENT_ROLL_MS, DESCENT_DURATION, DESCENT_TICK_MS, DESCENT_TICK_DMG,
    DESCENT_RISE, DESCENT_ASCEND_MS,
    // 🟪 지저스 바제스
    killBurgess, aggroBurgess, burgessAlive, burgessShockwave, checkBurgessSummon, spawnBlackbeardPortal,
    BG_RADIUS, BG_MAXHP, BG_SPEED, BG_FALL_FROM, BG_FALL_SPEED,
    BG_LAND_DAMAGE, BG_LAND_MULT,
    BG_JUMP_INTERVAL, BG_JUMP_TELEGRAPH, BG_JUMP_TRAVEL, BG_JUMP_DAMAGE, BG_JUMP_MULT, BG_JUMP_ARC, BG_GRAVITY
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
    p.portalDwellUntil = 0; p.portalDwellStart = 0;
    p.darkDwellUntil = 0; p.darkDwellStart = 0;
    p.crowsPullUntil = 0;
    compressors.playerDelta.remove(existingOldId);
    if (State.monster.targetId === existingOldId) State.monster.targetId = null;
    if (State.hinbeom.targetId === existingOldId) State.hinbeom.targetId = null;
    if (State.blackbeard.targetId === existingOldId) State.blackbeard.targetId = null;
    if (State.burgess.targetId === existingOldId) State.burgess.targetId = null;
    if (State.blackbeard.crowsPendingTarget === existingOldId) State.blackbeard.crowsPendingTarget = null;
    if (State.blackbeard.crowsActiveTarget === existingOldId) { State.blackbeard.crowsActiveTarget = null; State.blackbeard.crowsHitAt = 0; }
    if (State.hinbeom.damageBy && State.hinbeom.damageBy[existingOldId] !== undefined) {
        State.hinbeom.damageBy[socket.id] = (State.hinbeom.damageBy[socket.id] || 0) + State.hinbeom.damageBy[existingOldId];
        delete State.hinbeom.damageBy[existingOldId];
    }
    State.hinbeomMinions.forEach(mn => { if (mn.targetId === existingOldId) mn.targetId = null; });
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
        hinbeom: State.hinbeom,
        minions: State.hinbeomMinions,
        hinbeomPortal: State.hinbeomPortal,
        darkPortal: State.darkPortal,
        blackbeard: State.blackbeard,
        burgess: State.burgess,
        blackbeardPortal: State.blackbeardPortal
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
            lastPortalUse: 0, portalDwellStart: 0, portalDwellUntil: 0,
            lastDarkPortalUse: 0, darkDwellStart: 0, darkDwellUntil: 0, darkBanned: false,
            crowsPullUntil: 0, crowsTargetX: 0, crowsTargetY: 0,
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
        compressors.hinbeomDelta.snapshots.clear();
        compressors.blackbeardDelta.snapshots.clear();
        compressors.burgessDelta.snapshots.clear();
        State.gameStarted = true; io.emit('gameStartSign', State.players); io.emit('syncDetectors', State.detectors); io.emit('syncTeamStorage', State.teamStorages); 
        io.emit('syncHinbeomPortal', State.hinbeomPortal);
        io.emit('syncDarkPortal', State.darkPortal);
        io.emit('syncBlackbeardPortal', State.blackbeardPortal);
    });

    socket.on('playerMove', (data) => {
        let p = State.players[socket.id];
        if (p && !p.isDead) { 
            if (Date.now() - (p.lastRespawn || 0) < 500) return;
            if (Date.now() - (p.lastPortalUse || 0) < 500) return;
            if (Date.now() - (p.lastDarkPortalUse || 0) < 500) return;
            if (p.isCasting && (p.characterType === 'BORSALINO' || p.iceAgeActive || p.elThorActive)) return;
            p.x = data.x; p.y = data.y;
            let pDelta = compressors.playerDelta.getDelta(socket.id, p); if (pDelta) socket.broadcast.emit('enemyUpdate', pDelta);
        }
    });

    socket.on('skill3Aim', (data) => { let p = State.players[socket.id]; if (p && !p.isDead && p.skill3Active && p.characterType === 'BORSALINO') { if (data.dirX !== 0 || data.dirY !== 0) { p.skill3DirX = data.dirX; p.skill3DirY = data.dirY; } } });

    socket.on('borsLightDash', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead || p.characterType !== 'BORSALINO') return;
        if (Date.now() < (p.crowsPullUntil || 0)) return;
        let dir = (data && data.dir) || 1;
        io.emit('borsLightDash', { id: socket.id, dir: dir, duration: 220 });

        let minX = dir === 1 ? p.x : p.x - 450;
        let maxX = dir === 1 ? p.x + 450 : p.x;
        applyBoxDamage(p, minX, maxX, p.y - 70, p.y + 70, 70, 0);
    });

    socket.on('useSkill', (data) => { 
        let p = State.players[socket.id]; if (!p || p.isDead) return; 
        if (Date.now() < (p.crowsPullUntil || 0)) return;
        let logic = CharLogic[p.characterType]; if (logic && logic.useSkill) logic.useSkill(p, data, serverContext); 
    });

    socket.on('landSkill1', (data) => { let p = State.players[socket.id]; if (!p || p.isDead) return; let logic = CharLogic[p.characterType]; if (logic && logic.landSkill1) logic.landSkill1(p, data, serverContext); });

    socket.on('action', (actionData) => {
        if (!State.gameStarted) return;
        let attacker = State.players[socket.id]; if (!attacker || attacker.isDead || attacker.isCasting) return;
        if (Date.now() < (attacker.crowsPullUntil || 0)) return;

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
        if (State.hinbeom.hp > 0 && State.hinbeom.state !== 'dead' && Math.hypot(actionData.x - State.hinbeom.x, actionData.y - State.hinbeom.y) < pveHitRadius + State.hinbeom.radius) {
            if (State.hinbeomMinions.length > 0) {
                // 무적 상태
            } else {
                State.hinbeom.hp -= myDamage; State.hinbeom.knockbackForce += kb * 0.2; emitDamageText(State.hinbeom.x, State.hinbeom.y, myDamage);
                recordHinbeomDamage(socket.id, myDamage);
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
        if (State.blackbeard.hp > 0 && State.blackbeard.state !== 'dead' && Math.hypot(actionData.x - State.blackbeard.x, actionData.y - State.blackbeard.y) < pveHitRadius + State.blackbeard.radius) {
            State.blackbeard.hp -= myDamage; State.blackbeard.knockbackForce += kb * 0.2; emitDamageText(State.blackbeard.x, State.blackbeard.y, myDamage);
            aggroBlackbeard(socket.id);
            checkBurgessSummon();

            let freezeChance = 0;
            if (isKuzan) freezeChance += 0.06;
            if (attacker.hasJokbal) freezeChance += 0.06;
            if (freezeChance > 0 && Math.random() < freezeChance) {
                State.blackbeard.frozenUntil = Math.max(State.blackbeard.frozenUntil || 0, Date.now() + 1000);
            }

            if (attacker.characterType === 'SAKAZUKI') addBurn('blackbeard', State.blackbeard, 20, 2000, attacker.id);
            if (State.blackbeard.hp <= 0) killBlackbeard(socket.id);
        }
        if (burgessAlive() && Math.hypot(actionData.x - State.burgess.x, actionData.y - State.burgess.y) < pveHitRadius + State.burgess.radius) {
            State.burgess.hp -= myDamage; State.burgess.knockbackForce += kb * 0.25; emitDamageText(State.burgess.x, State.burgess.y, myDamage);
            aggroBurgess(socket.id);

            let freezeChance = 0;
            if (isKuzan) freezeChance += 0.06;
            if (attacker.hasJokbal) freezeChance += 0.06;
            if (freezeChance > 0 && Math.random() < freezeChance) {
                State.burgess.frozenUntil = Math.max(State.burgess.frozenUntil || 0, Date.now() + 1000);
            }

            if (attacker.characterType === 'SAKAZUKI') addBurn('burgess', State.burgess, 20, 2000, attacker.id);
            if (State.burgess.hp <= 0) killBurgess(socket.id);
        }
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
        if (State.blackbeard) {
            if (State.blackbeard.crowsPendingTarget === socket.id) State.blackbeard.crowsPendingTarget = null;
            if (State.blackbeard.crowsActiveTarget === socket.id) { State.blackbeard.crowsActiveTarget = null; State.blackbeard.crowsHitAt = 0; io.emit('crowsEnd', { id: socket.id }); }
        }
        if (State.burgess && State.burgess.targetId === socket.id) State.burgess.targetId = null;
        let remainingPlayers = Object.keys(State.players).filter(pid => !State.players[pid].disconnected);
        if (remainingPlayers.length === 0) { resetGame(); } else if (socket.id === State.masterId) { State.masterId = remainingPlayers[0]; io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId }); }
    });
});

setInterval(() => GameLoop.update(serverContext), 1000 / 60);

http.listen(process.env.PORT || 3000, () => { console.log('서버 가동 완료'); });