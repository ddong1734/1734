// 파일명: server/state.js
// ============================================================================
// 🗃️ 게임 상태 · 델타 압축기 · 엔티티 팩토리 · 영역 판정 헬퍼
// ============================================================================

const C = require('./config.js');

// ── 🚀 델타 전송 대상 필드 화이트리스트 ─────────────────────────────────────
const PLAYER_DELTA_FIELDS = [
    'x', 'y', 'hp', 'maxHp', 'level', 'xp', 'maxXp', 'isDead', 'isCasting', 'lastFacing',
    'knockbackForce', 'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'burningUntil', 'maguBombUntil', 'justiceBombUntil', 'skill2EndTime', 'characterType',
    'hasJusticeCoat', 'hasPika', 'hasHie', 'hasMagu', 'hasKizaru', 'hasAokiji', 'hasAkainu',
    'hasGoro', 'hasArkMaxim', 'hasGodEnel', 'hasGura', 'hasYami',
    'elThorActive', 'yataActive', 'crowsPullUntil', 'yamiLockUntil', 'yamiBindUntil', 'guraChargeUntil', 'darkBanned',
    // ⚡ 카시모 전하 스택 · 주력 방출
    'kashimoCharge', 'kashimoChargeUntil', 'surgeActive', 'surgeEnd'
];
const STATUS_FIELDS = [
    'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'burningUntil', 'maguBombUntil', 'justiceBombUntil',
    // ⚡ 카시모 전하 스택 (모든 몬스터 델타에 함께 실린다)
    'kashimoCharge', 'kashimoChargeUntil'
];
const OKRA_DELTA_FIELDS    = ['x','y','hp','maxHp','isGolden','state','knockbackForce'].concat(STATUS_FIELDS);
const MONSTER_DELTA_FIELDS = ['x','y','hp','maxHp','state','knockbackForce'].concat(STATUS_FIELDS);
const HINBEOM_DELTA_FIELDS = ['x','y','hp','maxHp','radius','state','knockbackForce','hakiActiveUntil'].concat(STATUS_FIELDS);
const BB_DELTA_FIELDS      = ['x','y','hp','maxHp','radius','state','knockbackForce',
                              'castingUntil','telegraphUntil','darkFloorUntil','risingUntil','descentUntil'].concat(STATUS_FIELDS);
const BG_DELTA_FIELDS      = ['x','y','hp','maxHp','radius','state','knockbackForce',
                              'fallingUntil','jumpTelegraphUntil','jumpingUntil','jumpTargetX','jumpTargetY','airborne'].concat(STATUS_FIELDS);

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
    monsterDelta:    new DeltaCompressor(MONSTER_DELTA_FIELDS),
    okraDelta:       new DeltaCompressor(OKRA_DELTA_FIELDS),
    playerDelta:     new DeltaCompressor(PLAYER_DELTA_FIELDS),
    hinbeomDelta:    new DeltaCompressor(HINBEOM_DELTA_FIELDS),
    blackbeardDelta: new DeltaCompressor(BB_DELTA_FIELDS),
    burgessDelta:    new DeltaCompressor(BG_DELTA_FIELDS)
};

/** 상태이상 필드를 0으로 초기화한 객체 조각 */
function baseStatus() {
    return {
        frozenUntil: 0, electrocutedUntil: 0, airFreezeUntil: 0, raigoPullUntil: 0,
        knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0,
        // ⚡ 카시모 전하 스택 (0~4) 과 감쇠 만료 시각
        kashimoCharge: 0, kashimoChargeUntil: 0
    };
}

function makeMonster() {
    return Object.assign({
        x: 16000, y: 837, homeX: 16000, radius: 63,
        hp: 2000, maxHp: 2000, speed: 1.75,
        targetId: null, state: 'idle', lastAttack: 0
    }, baseStatus());
}

function makeHinbeom() {
    return Object.assign({
        x: C.HINBEOM_HOME_X, y: C.HINBEOM_HOME_Y, homeX: C.HINBEOM_HOME_X, homeY: C.HINBEOM_HOME_Y,
        radius: C.HINBEOM_RADIUS, hp: C.HINBEOM_MAXHP, maxHp: C.HINBEOM_MAXHP, speed: C.HINBEOM_SPEED,
        targetId: null, state: 'idle', lastAttack: 0,
        hakiNextRoll: 0, hakiBursts: [], hakiActiveUntil: 0, hakiCount: 0,
        lastRegenTick: 0, damageBy: {},
        respawnTimer: null, deathGen: 0
    }, baseStatus());
}

function makeBlackbeard() {
    return Object.assign({
        x: C.BB_HOME_X, y: C.BB_HOME_Y, homeX: C.BB_HOME_X, homeY: C.BB_HOME_Y,
        radius: C.BB_RADIUS, hp: C.BB_MAXHP, maxHp: C.BB_MAXHP, speed: C.BB_SPEED,
        targetId: null, state: 'idle', lastAttack: 0,
        castingUntil: 0,
        darkFloorNextRoll: 0, darkFloorUntil: 0, darkFloorNextTick: 0,
        crowsNextCast: 0, telegraphUntil: 0, crowsPendingTarget: null,
        crowsAimX: 0, crowsAimY: 0, crowsAimUX: 1, crowsAimUY: 0,
        crowsActiveTarget: null, crowsHitAt: 0,
        descentNextRoll: 0, risingUntil: 0, riseFromY: 0, riseToY: 0,
        descentUntil: 0, descentNextTick: 0, descentActive: false,
        burgessSummoned: false, respawnTimer: null, deathGen: 0
    }, baseStatus());
}

function makeBurgess() {
    return Object.assign({
        x: C.BB_HOME_X, y: C.DARK_GROUND - C.BG_RADIUS,
        radius: C.BG_RADIUS, hp: 0, maxHp: C.BG_MAXHP, speed: C.BG_SPEED,
        targetId: null, state: 'none',
        fallingUntil: 0,
        jumpNextCast: 0, jumpTelegraphUntil: 0, jumpingUntil: 0,
        jumpStartX: 0, jumpStartY: 0, jumpTargetX: 0, jumpTargetY: 0,
        airborne: false, vy: 0
    }, baseStatus());
}

function makeBases() {
    return {
        1: { hp: 20000, maxHp: 20000, x: 12250, y: 1900 },
        2: { hp: 20000, maxHp: 20000, x: 19750, y: 1900 }
    };
}

function makeTurrets() {
    return [
        { team: 1, x: 12500, y: 1850, range: 1200, damage: 30, lastShot: 0 },
        { team: 2, x: 19500, y: 1850, range: 1200, damage: 30, lastShot: 0 }
    ];
}

/** 새 플레이어 객체 */
function makePlayer(opts) {
    const Characters = opts.Characters;
    const ch = Characters[opts.charType] || Characters.PARK;
    return Object.assign({
        id: opts.id, nickname: opts.nick, characterType: opts.charType, team: opts.team,
        sessionId: opts.sessionId, disconnected: false,
        x: opts.team === 1 ? 12800 : 19200, y: 1955,
        hp: ch.hp, maxHp: ch.hp, gold: 100000,
        level: 0, xp: 0, maxXp: 100,
        baseDamage: ch.baseDamage, speedMult: ch.speedMult || 1.0,
        attackSpeedMult: 1.0, bonusDamage: 0, defense: 0, hpRegen: 0,
        hasJokbal: false, hasDaluFengwei: false, hasJadam: false, hasPepsiArt: false,
        hasPika: false, hasHie: false, hasMagu: false, hasJusticeCoat: false,
        hasKizaru: false, hasAokiji: false, hasAkainu: false,
        hasGoro: false, hasArkMaxim: false, hasGodEnel: false,
        hasGura: false, hasYami: false,
        guraCdEnd: 0, yamiCdEnd: 0, yamiLockUntil: 0, yamiBindUntil: 0, guraChargeUntil: 0, _castStuckSince: 0,
        inventory: [], equippedUids: [], seolgonnyakCount: 0,
        orbitSpheres: 0, orbitSpeedMult: 1.0,
        lastRegenTick: 0, isDead: false, isCasting: false, skill2EndTime: 0,
        lastPortalUse: 0, portalDwellStart: 0, portalDwellUntil: 0,
        lastDarkPortalUse: 0, darkDwellStart: 0, darkDwellUntil: 0, darkBanned: false,
        crowsPullUntil: 0, crowsTargetX: 0, crowsTargetY: 0,
        skill3Active: false, skill3EndTime: 0, skill3DirX: 1, skill3DirY: 0, skill3LastFire: 0,
        yataActive: false, yataPath: null, yataStartTime: 0, yataHitIds: [], yataLastHitScan: 0,
        iceAgeActive: false, iceAgeCastEnd: 0,
        partisanQueue: 0, partisanFired: 0, partisanDir: 1, partisanNextFire: 0,
        volcanoActive: false, volcanoX: 0, volcanoStart: 0, volcanoEnd: 0, volcanoNextSpawn: 0,
        elThorActive: false, elThorStart: 0, elThorEnd: 0, elThorDirX: 1, elThorDirY: 0, elThorNextTick: 0,
        mantleActive: false, mantleDir: 1, mantleCenterX: 0, mantleStart: 0, mantleEnd: 0, mantleNextSpawn: 0, mantleFired: 0,
        raigoActive: false, raigoDir: 1, raigoCenterX: 0, raigoTelegraphEnd: 0, raigoDropped: false, raigoCastEnd: 0, raigoNextTick: 0,
        // ⚡ 카시모 하지메 전용 상태
        kashimoBoltCdEnd: 0,
        // ⚡🌋 주력 방출 (2번 스킬)
        surgeActive: false, surgeStart: 0, surgeEnd: 0, surgeNextTick: 0, surgeCdEnd: 0
    }, baseStatus());
}

const State = {
    players: {}, gameStarted: false, masterId: null,
    burnMap: new Map(),
    magmas: [], maguBombs: [], justiceBombs: [], giantPartisanQueue: [], mantleBolts: [],
    yamiBinds: [], guraCharges: [],
    bases: makeBases(),
    monster: makeMonster(),
    hinbeom: makeHinbeom(),
    hinbeomMinions: [],
    hinbeomPortal: null, darkPortal: null,
    blackbeard: makeBlackbeard(),
    burgess: makeBurgess(),
    blackbeardPortal: null, blackbeardKilledBy: null,
    turrets: makeTurrets(),
    okras: [], projectiles: [], shockwaves: [], detectors: [],
    teamStorages: { 1: [], 2: [] },
    projIdCounter: 0
};

// ── 영역 판정 ───────────────────────────────────────────────────────────────
function isInHinbeomArea(e) {
    if (!e) return false;
    return e.x >= C.HINBEOM_AREA.minX && e.x <= C.HINBEOM_AREA.maxX
        && e.y >= C.HINBEOM_AREA.minY && e.y <= C.HINBEOM_AREA.maxY;
}
function isInDarkArea(e) {
    if (!e) return false;
    return e.x >= C.DARK_AREA.minX && e.x <= C.DARK_AREA.maxX
        && e.y >= C.DARK_AREA.minY && e.y <= C.DARK_AREA.maxY;
}
function isInDarkZone(e) {
    if (!e) return false;
    return e.x >= C.DARK_ZONE_MIN && e.x <= C.DARK_ZONE_MAX;
}

/** ⛓️ 검은수염 크로우즈 조준선 판정 */
function isInCrowsBeam(bb, t) {
    if (!bb || !t) return false;
    let ux = bb.crowsAimUX, uy = bb.crowsAimUY;
    if (ux === undefined || uy === undefined) return false;
    let len = Math.hypot(ux, uy);
    if (len === 0) return false;
    ux /= len; uy /= len;

    const half = C.CROWS_THICKNESS / 2;
    const tipR = half * 0.9;
    let rx = t.x - bb.x, ry = t.y - bb.y;
    let s = rx * ux + ry * uy;
    let d = Math.abs(rx * (-uy) + ry * ux);
    if (s >= -half && s <= C.CROWS_RANGE && d <= half) return true;

    let tipX = bb.x + ux * C.CROWS_RANGE;
    let tipY = bb.y + uy * C.CROWS_RANGE;
    return Math.hypot(t.x - tipX, t.y - tipY) <= tipR;
}

/** 🟪 바제스가 피격 가능한 상태인가 */
function burgessAlive() {
    const bg = State.burgess;
    return !!(bg && bg.hp > 0 && bg.state !== 'dead' && bg.state !== 'none');
}

function getMinion(id) { return State.hinbeomMinions.find(m => m.id === id); }
function getOkra(id) { return State.okras.find(o => o.id === id); }

module.exports = {
    State, compressors, DeltaCompressor,
    makeMonster, makeHinbeom, makeBlackbeard, makeBurgess, makeBases, makeTurrets, makePlayer, baseStatus,
    isInHinbeomArea, isInDarkArea, isInDarkZone, isInCrowsBeam, burgessAlive,
    getMinion, getOkra
};