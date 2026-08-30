// 파일명: server/state.js
// ============================================================================
// 🗃️ 게임 상태 · 델타 압축기 · 엔티티 팩토리 · 영역 판정 헬퍼
// ============================================================================

const C = require('./config.js');

// ── 🚀 델타 전송 대상 필드 화이트리스트 ─────────────────────────────────────
const PLAYER_DELTA_FIELDS = [
    'x', 'y', 'hp', 'maxHp', 'level', 'xp', 'maxXp', 'isDead', 'isCasting', 'lastFacing',
    'knockbackForce', 'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'burningUntil', 'maguBombUntil', 'justiceBombUntil',
    'stunUntil', 'bleedUntil',   // 💫🩸 다이도 전용 표시
    // 🕊️ 쿠루스 — 게이지·여분의 목숨·활공은 다른 사람 화면에도 보여야 한다
    'holyPower', 'extraLives', 'kurusuGliding', 'ladderLockUntil',
    // 🔥 마르코 — 게이지·불꽃·보호막은 다른 사람 화면에도 보여야 한다
    'marcoGauge', 'marcoRegenUntil', 'marcoCastEnd',
    'marcoShieldEnd', 'marcoShieldX', 'marcoShieldY', 'marcoShieldDX', 'marcoShieldDY', 'marcoShieldRY', 'marcoInvUntil',
    // 🧲 키드 — 고철 축적·고정·레이저·골렘은 다른 사람 화면에도 보여야 한다
    'kidStack', 'kidSlow', 'kidJumpCut', 'kidHoldUntil', 'kidFieldUntil',
    'kidLaserCastEnd', 'kidLaserFireEnd', 'kidLaserAngle', 'kidLaserX', 'kidLaserY',
    'kidGolemCastEnd', 'kidGolemEnd',
    // ❄️ 쿠잔(해적) — 남의 화면에도 보여야 한다
    'kzGloveEnd', 'kzDashCastEnd', 'kzDashEnd', 'kzDashDX', 'kzDashDY',
    // 🌀 포탈 대기 카운트다운 — 남의 화면에도 보여야 한다
    'portalDwellUntil', 'darkDwellUntil', 'curseDwellUntil', 'lightDashUntil', 'lightDashDir',
    'ladderCastEnd', 'ladderBeamEnd', 'ladderCharged',
    'skill2EndTime', 'characterType',
    'hasJusticeCoat', 'hasPika', 'hasHie', 'hasMagu', 'hasKizaru', 'hasAokiji', 'hasAkainu',
    'hasGoro', 'hasArkMaxim', 'hasGodEnel', 'hasGura', 'hasYami',
    // 🏵️🌩️ 카시모 전용 아이템
    'hasYeoui', 'hasRaijin',
    // ⬛ 다부라 전용 아이템
    'hasSquare',
    'elThorActive', 'yataActive', 'crowsPullUntil', 'yamiLockUntil', 'yamiBindUntil', 'guraChargeUntil', 'darkBanned',
    // ⚡ 카시모 전하 스택 · 주력 방출 · 환수호박
    'kashimoCharge', 'kashimoChargeUntil', 'surgeActive', 'surgeEnd',
    'surgeLockUntil',
    'amberActive', 'sonicChargeUntil',
    // ⬛ 다부라 카라바 — 빛 · 어둠 · 아광속 발차기
    'dLightActive', 'dLightEnd', 'dLightRiseUntil',
    'dDarkActive', 'dDarkEnd',
    'dKickCharging', 'dKickChargeEnd', 'dKickFlying', 'dKickFlyEnd',
    // 🗣️ NPC 대화 / 퀘스트
    'npcTalking', 'tichStage'
];
const STATUS_FIELDS = [
    'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'burningUntil', 'maguBombUntil', 'justiceBombUntil',
    'stunUntil', 'bleedUntil',   // 💫🩸 다이도 전용 표시
    // ⚡ 카시모 전하 스택 (모든 몬스터 델타에 함께 실린다)
    'kashimoCharge', 'kashimoChargeUntil'
];
const OKRA_DELTA_FIELDS    = ['x','y','hp','maxHp','isGolden','isHaeru','state','knockbackForce'].concat(STATUS_FIELDS);
const MONSTER_DELTA_FIELDS = ['x','y','hp','maxHp','state','knockbackForce'].concat(STATUS_FIELDS);
const HINBEOM_DELTA_FIELDS = ['x','y','hp','maxHp','radius','state','knockbackForce','hakiActiveUntil'].concat(STATUS_FIELDS);
const BB_DELTA_FIELDS      = ['x','y','hp','maxHp','radius','state','knockbackForce',
                              'castingUntil','telegraphUntil','darkFloorUntil','risingUntil','descentUntil'].concat(STATUS_FIELDS);
const BG_DELTA_FIELDS      = ['x','y','hp','maxHp','radius','state','knockbackForce',
                              'fallingUntil','jumpTelegraphUntil','jumpingUntil','jumpTargetX','jumpTargetY','airborne'].concat(STATUS_FIELDS);
// 🔥 헤이안 스쿠나 (저주의 왕)
const SK_DELTA_FIELDS      = ['x','y','hp','maxHp','radius','state','dir','knockbackForce',
                              'bowAimUntil','bowTargetX','bowTargetY','barrageUntil'].concat(STATUS_FIELDS);

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
    burgessDelta:    new DeltaCompressor(BG_DELTA_FIELDS),
    sukunaDelta:     new DeltaCompressor(SK_DELTA_FIELDS)
};

/** 상태이상 필드를 0으로 초기화한 객체 조각 */
function baseStatus() {
    return {
        frozenUntil: 0, electrocutedUntil: 0, airFreezeUntil: 0, raigoPullUntil: 0,
        knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0,
        // ⚡ 카시모 전하 스택 (0~4) 과 감쇠 만료 시각
        kashimoCharge: 0, kashimoChargeUntil: 0,
        // ⬛ 다부라 어둠 소용돌이에 끌려가는 상태
        darkPullUntil: 0, darkPullX: 0, darkPullY: 0
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

/** 🗣️ NPC 목록 생성 (각 팀 정글 상단 발판 중앙에 티치 한 명씩) */
/**
 * 🔥 헤이안 스쿠나 — '저주의 왕' 맵의 보스.
 *    체력과 크기는 검은수염과 동일하다.
 */
function makeSukuna() {
    return Object.assign({
        x: C.SK_HOME_X, y: C.SK_HOME_Y,
        homeX: C.SK_HOME_X, homeY: C.SK_HOME_Y,
        radius: C.SK_RADIUS,
        hp: C.SK_MAXHP, maxHp: C.SK_MAXHP,
        state: 'idle', targetId: null, dir: 1,
        // ⚔️ 3초 주기 참격
        nextSlashAt: 0,
        slashTele: null,          // { x, y, w, h, fireAt } — 1초 전 예고
        // ⚔️⚔️ 연속 참격 (20% 확률)
        barrageUntil: 0, barrageNextAt: 0,
        // 🏹 화염 화살 (체력 70% · 40%)
        bowGateUsed: [false, false],
        bowAimUntil: 0, bowTargetX: 0, bowTargetY: 0, bowTargetId: null,
        damageBy: {}
    }, baseStatus());
}

function makeNpcs() {
    // 🗣️ 티치 + 🗡️ 마허라 를 한 배열에 담는다 (kind 로 구분)
    let list = C.NPC_TICH.map(n => ({
        id: n.id, kind: 'tich', team: n.team, name: n.name,
        x: n.x, y: n.y, radius: C.NPC_RADIUS
    }));
    C.NPC_MAHERA.forEach(n => list.push({
        id: n.id, kind: 'mahera', team: n.team, name: n.name,
        x: n.x, y: n.y, radius: C.NPC_RADIUS
    }));
    return list;
}

/**
 * 🛡️ [마르코 · 불사 엉겅퀴] 이 좌표가 적 보호막 안인가.
 *    보호막은 '벽' 이므로 공격도 막고 이동도 막는다.
 *    · 세로로 긴 타원 판정
 *    · 같은 편은 통과한다 (team 을 주면 그 편은 막지 않는다)
 *    @return 막는 보호막 주인 객체 (없으면 null)
 */
function shieldAt(x, y, team) {
    const now = Date.now();
    // 🛡️ 보호막을 쓰는 본인은 완전 무적이다.
    //    좌표가 시전자 위치와 겹치면 그 자리도 '막히는 곳' 으로 본다.
    for (const sid in State.players) {
        const sp = State.players[sid];
        if (!sp || !sp.marcoInvUntil || now >= sp.marcoInvUntil) continue;
        if (team !== undefined && team !== null && sp.team === team) continue;
        if (Math.hypot(x - sp.x, y - sp.y) <= 60) return sp;
    }
    for (const sid in State.players) {
        const sp = State.players[sid];
        if (!sp || !sp.marcoShieldEnd || now >= sp.marcoShieldEnd) continue;
        if (team !== undefined && team !== null && sp.team === team) continue;
        const RX = 120, RY = (sp.marcoShieldRY || 260);
        // 🧭 벽은 바라보는 방향으로 돌아가 있다. 판정도 같은 각도로 회전한다.
        const wa = Math.atan2(
        (sp.marcoShieldDY === undefined ? 0 : sp.marcoShieldDY),
        (sp.marcoShieldDX === undefined ? 1 : sp.marcoShieldDX));
        const rdx = x - sp.marcoShieldX, rdy = y - sp.marcoShieldY;
        const ca = Math.cos(-wa), sa = Math.sin(-wa);
        const dx = rdx * ca - rdy * sa;
        const dy = rdx * sa + rdy * ca;
        if ((dx * dx) / (RX * RX) + (dy * dy) / (RY * RY) <= 1) return sp;
    }
    return null;
}

/**
 * 💚 [불사 엉겅퀴] 막아낸 피해만큼 마르코의 체력을 돌려준다.
 *    보호벽이 흡수한 공격이 곧 시전자의 회복이 된다.
 */
function shieldAbsorb(sp, dmg, io) {
    if (!sp || !(dmg > 0)) return;
    const before = sp.hp;
    sp.hp = Math.min(sp.maxHp, sp.hp + dmg);
    const gained = sp.hp - before;
    if (gained > 0 && io) {
        io.to(sp.id).emit('heal', Math.round(gained));
        io.emit('syncPlayerFull', sp);
    }
}

/** 🛡️ 보호막 밖으로 밀어낸다 (겹쳐 있으면 표면으로 튕겨낸다) */
function pushOutOfShield(o, team) {
    const sp = shieldAt(o.x, o.y, team);
    if (!sp) return false;
    const RX = 120, RY = (sp.marcoShieldRY || 260);
    const wa = Math.atan2(
        (sp.marcoShieldDY === undefined ? 0 : sp.marcoShieldDY),
        (sp.marcoShieldDX === undefined ? 1 : sp.marcoShieldDX));
    const ca = Math.cos(-wa), sa = Math.sin(-wa);
    let rdx = o.x - sp.marcoShieldX, rdy = o.y - sp.marcoShieldY;
    if (rdx === 0 && rdy === 0) { rdx = 1; rdy = 0; }
    // 회전 좌표계로 옮겨 밀어낸 뒤 다시 원래 좌표계로 돌린다
    let dx = rdx * ca - rdy * sa;
    let dy = rdx * sa + rdy * ca;
    const n = (dx * dx) / (RX * RX) + (dy * dy) / (RY * RY);
    const k = 1 / Math.sqrt(Math.max(n, 0.0001));
    dx *= k * 1.06; dy *= k * 1.06;
    const cb = Math.cos(wa), sb = Math.sin(wa);
    o.x = sp.marcoShieldX + (dx * cb - dy * sb);
    o.y = sp.marcoShieldY + (dx * sb + dy * cb);
    o.knockbackForce = 0;
    return true;
}

function makeBases() {
    return {
        // 🏛️ radius 는 피해 판정용. 예전에는 없어서 forEachTarget 이
        //    넥서스를 제대로 못 맞혔다.
        // 🏛️ govType : 'none' | 'wg' (세계정부) — 팀 구성으로 정해진다
        1: { hp: 20000, maxHp: 20000, x: 12250, y: 1900, radius: 150, govType: 'none' },
        2: { hp: 20000, maxHp: 20000, x: 19750, y: 1900, radius: 150, govType: 'none' }
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
    // 🛟 [안전장치] 캐릭터가 없거나 알 수 없는 값이면 기본 캐릭터로 되돌린다.
    //    (박인범을 지운 뒤 폴백이 사라져 크래시가 났다)
    const charType = (opts.charType && Characters[opts.charType]) ? opts.charType : 'BORSALINO';
    const ch = Characters[charType];
    return Object.assign({
        id: opts.id, nickname: opts.nick, characterType: charType, team: opts.team,
        joinOrder: opts.joinOrder || 0,   // 🏛️ 진영 동점 시 '먼저 들어온 사람' 판정용
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
        // 🏵️🌩️ 카시모 전용 아이템
        hasYeoui: false, hasRaijin: false,
        // ⬛ 다부라 전용 아이템
        hasSquare: false,
        // 🔯⚔️ 신규 아이템 : 법진 · 퇴마의 검
        //    beopjinKills 는 '법진 처치 누적 스택'이며 사망해도 초기화되지 않는다.
        hasBeopjin: false, hasToemaSword: false, beopjinKills: 0,
        // ⚔️ [신규] 다이도 하가네
        //    fury  : 1번 [무자비] 1.5초 제자리 난무
        //    rush  : 2번 [질풍참] 2초 돌진 (이동키·스킬 봉인, 공중 가능)
        //    iai   : 3번 [일섬]   0.5초 후 전방 대참격
        //    spin  : 평타 3연타 마무리 (경직 없음)
        daidoFury: false, daidoFuryEnd: 0, daidoFuryNext: 0,
        daidoRush: false, daidoRushEnd: 0, daidoRushNext: 0, daidoRushDir: 1, daidoRushGrab: [],
        daidoIaiAt: 0, daidoIaiDir: 1, daidoIaiLeft: 0, daidoIaiNextAt: 0,
        daidoSpinEnd: 0, daidoSpinNext: 0,
        daidoS1CdEnd: 0, daidoS2CdEnd: 0, daidoS3CdEnd: 0,
        daidoFuryStep: 0, daidoRushStep: 0,
        // ⚔️ 검 계열 아이템 플래그 · 🗡️ 석혼도 회복 저하
        hasJapgeom: false, hasDojwama: false, hasYonggol: false, hasSeokhondo: false,
        healCutUntil: 0, healCutMul: 1,
        // 💫🩸 다이도 전용 표시 (동결·화상과 구분)
        stunUntil: 0, bleedUntil: 0,
        // 🕊️ 쿠루스 하나 — 신성력 · 축복 · 야곱의 사다리 · 여분의 목숨
        holyPower: 0, holyNextAt: 0,
        kurusuS1CdEnd: 0, kurusuS2CdEnd: 0, kurusuS3CdEnd: 0,
        kurusuHealEnd: 0, kurusuHealNext: 0, kurusuHealAmt: 0,
        ladderCastEnd: 0, ladderBeamEnd: 0, ladderNextTick: 0,
        ladderX: 0, ladderY: 0, ladderCharged: false,
        extraLives: 0, kurusuGliding: false, ladderLockUntil: 0,
        // 🔥 마르코 — 재생 게이지 · 불꽃 · 봉황인 · 봉리력 · 불사 엉겅퀴
        marcoGauge: 0, marcoRegenUntil: 0, marcoRegenNext: 0,
        marcoS1CdEnd: 0, marcoS2CdEnd: 0, marcoS3CdEnd: 0,
        marcoCastEnd: 0, marcoFieldX: 0, marcoFieldY: 0,
        marcoShieldEnd: 0, marcoShieldX: 0, marcoShieldY: 0,
        marcoShieldDX: 1, marcoShieldDY: 0, marcoShieldRY: 260, marcoInvUntil: 0,
        // 🧲 유스타스 키드 — 어사인 · 댐드 펑크 · 펑크 로튼
        kidS1CdEnd: 0, kidS2CdEnd: 0, kidS3CdEnd: 0,
        kidStack: 0, kidSlow: 1, kidJumpCut: 1, kidHoldUntil: 0, kidFieldUntil: 0,
        kidLaserCastEnd: 0, kidLaserFireEnd: 0, kidLaserNextTick: 0,
        kidLaserAngle: 0, kidLaserX: 0, kidLaserY: 0,
        kidGolemCastEnd: 0, kidGolemEnd: 0,
        // ❄️ 쿠잔(해적) — 아이스 볼 · 글러브 · 아이스 타임
        kzS1CdEnd: 0, kzS2CdEnd: 0, kzS3CdEnd: 0,
        kzGloveEnd: 0, kzTrailAt: 0,
        kzDashCastEnd: 0, kzDashEnd: 0, kzDashDX: 1, kzDashDY: 0, kzDashHit: false,
        guraCdEnd: 0, yamiCdEnd: 0, yamiLockUntil: 0, yamiBindUntil: 0, guraChargeUntil: 0, _castStuckSince: 0,
        inventory: [], equippedUids: [], seolgonnyakCount: 0,
        orbitSpheres: 0, orbitSpeedMult: 1.0,
        lastRegenTick: 0, isDead: false, isCasting: false, skill2EndTime: 0,
        lastPortalUse: 0, portalDwellStart: 0, portalDwellUntil: 0,
        lastDarkPortalUse: 0, darkDwellStart: 0, darkDwellUntil: 0, darkBanned: false,
        // 🔥 저주의 왕 포탈 (암흑 포탈과 동시에 열릴 수 있어 대기 필드를 따로 둔다)
        lastCursePortalUse: 0, curseDwellStart: 0, curseDwellUntil: 0,
        crowsPullUntil: 0, crowsTargetX: 0, crowsTargetY: 0,
        skill3Active: false, skill3EndTime: 0, skill3DirX: 1, skill3DirY: 0, skill3LastFire: 0,
        yataActive: false, yataPath: null, yataStartTime: 0, yataHitIds: [], yataLastHitScan: 0,
        iceAgeActive: false, iceAgeCastEnd: 0,
        partisanQueue: 0, partisanFired: 0, partisanDir: 1, partisanNextFire: 0,
        volcanoActive: false, volcanoX: 0, volcanoStart: 0, volcanoEnd: 0, volcanoNextSpawn: 0,
        elThorActive: false, elThorStart: 0, elThorEnd: 0, elThorDirX: 1, elThorDirY: 0, elThorNextTick: 0,
        mantleActive: false, mantleDir: 1, mantleCenterX: 0, mantleStart: 0, mantleEnd: 0, mantleNextSpawn: 0, mantleFired: 0,
        raigoActive: false, raigoDir: 1, raigoCenterX: 0, raigoTelegraphEnd: 0, raigoDropped: false, raigoCastEnd: 0, raigoNextTick: 0,
        // 🗣️ NPC 대화 / 퀘스트 진행도
        //    tichStage : 0 = 미대화 · 1 = 퀘스트 진행중 · 2 = 완료(상호작용 불가)
        npcTalking: null, npcMode: null, npcLine: 0, tichStage: 0,
        // 🗡️ 마허라 퀘스트 진행도 (티치와 동일한 규칙)
        //    maheraStage2 : ⬛ 다부라 전용 2차 퀘스트 (0 미대화 · 1 진행중 · 2 완료)
        maheraStage: 0, maheraStage2: 0,
        // 🌑 [유명이경 역월] — 4번 스킬 (영역 전개) 상태
        hasYumyeong: false,
        cdY: 0,                       // 쿨타임
        yumCasting: false, yumCastEnd: 0,   // ① 1초 시전 경직
        domainId: null,               // 지금 들어가 있는 영역의 주인 id (없으면 null)
        // 🌑☀️ [영역 전용] 빛 — 1초 수렴 후 3초간 0.3초마다 소폭발
        domLightGatherEnd: 0, domLightEnd: 0, domLightNextTick: 0,
        // 🌑🌑 [영역 전용] 어둠 — 2초 변환 후 한 번에 꽂힌다
        domDarkStrikeAt: 0,
        // 💫 [영역 전용] 아광속 발차기 — 2초 경직 후 5초 별 궤도 비행
        domKickChargeEnd: 0, domKickStart: 0, domKickEnd: 0,
        domKickPath: null, domKickNextIdx: 0,
        // 🗡️ [세계를 가르는 참격] — 4번 스킬 상태
        //    cleaveCastEnd 가 지나면 참격이 발사된다.
        hasWorldCleave: false,
        cd4: 0, cleaveCasting: false, cleaveCastEnd: 0,
        cleaveDirX: 1, cleaveDirY: 0,
        // ⚡ 카시모 하지메 전용 상태
        kashimoBoltCdEnd: 0,
        surgeActive: false, surgeStart: 0, surgeEnd: 0, surgeNextTick: 0, surgeCdEnd: 0,
        surgeLockUntil: 0,
        amberActive: false, amberStart: 0, amberNextDrain: 0, amberCdEnd: 0,
        dashCdEnd: 0, amberDashUntil: 0, amberDashDirX: 1, amberDashDirY: 0,
        waveCdEnd: 0,
        sonicCdEnd: 0, sonicChargeUntil: 0, sonicFireAt: 0, sonicDir: 1,

        // ====================================================================
        // ⬛ [신규] 다부라 카라바 전용 상태
        // ====================================================================
        // ☀️ 1번 [빛]
        dLightActive: false, dLightStart: 0, dLightEnd: 0,
        dLightNextTick: 0, dLightRiseUntil: 0, dLightCdEnd: 0,
        dLightX: 0, dLightY: 0,
        // 🌑 2번 [어둠]
        dDarkActive: false, dDarkStart: 0, dDarkEnd: 0, dDarkCdEnd: 0,
        // 💫 3번 [아광속 발차기]
        dKickCharging: false, dKickChargeEnd: 0,
        dKickFlying: false, dKickFlyEnd: 0, dKickCdEnd: 0,
        dKickHitIds: []
    }, baseStatus());
}

const State = {
    players: {}, gameStarted: false, masterId: null,
    burnMap: new Map(),
    magmas: [], maguBombs: [], justiceBombs: [], giantPartisanQueue: [], mantleBolts: [],
    yamiBinds: [], guraCharges: [],
    // ⚡🔮 환수호박 전기 잔상(돌진 전용) · 전자파 연쇄 폭발 예약
    amberTrails: [], waveChains: [],
    // ⚡🌩️ 뇌신 전자파 재폭발(에코) 예약
    waveEchoes: [],
    bases: makeBases(),
    monster: makeMonster(),
    hinbeom: makeHinbeom(),
    hinbeomMinions: [],
    hinbeomPortal: null, darkPortal: null,
    // 🔥 저주의 왕 — 입장 포탈 · 보스 · 처치 후 귀환 포탈 · 불길 장판
    cursePortal: null,
    sukuna: null, sukunaPortal: null, sukunaKilledBy: null,
    // 🔥 마르코 — 날아다니는 불꽃 덩어리 · 바닥에 깔린 불길
    marcoBalls: [], marcoFields: [],
    // 🧲 키드 — 고철이 붙은 대상 목록
    kidMarks: [],
    // ❄️ 쿠잔(해적) — 날아가는 얼음 구슬
    kuzanpBalls: [],
    // 🕸️ 팀별 세계정부 스킬 웹 (열린 노드 목록)
    govTree: { 1: {}, 2: {} },
    // 🕶️ 암매상 — 아이템별 할인율(%) 과 다음 갱신 시각
    blackMarket: { discounts: {}, nextRollAt: 0 },
    sukunaSlashes: [],   // 예고 중인 참격 { x, y, w, h, fireAt, done }
    sukunaFires: [],     // 불길 장판 { x, y, r, endAt, nextTick, ownerId }
    blackbeard: makeBlackbeard(),
    burgess: makeBurgess(),
    blackbeardPortal: null, blackbeardKilledBy: null,
    turrets: makeTurrets(),
    // 🗣️ NPC 목록 (각 팀 정글 상단)
    npcs: makeNpcs(),
    okras: [], projectiles: [], shockwaves: [], detectors: [],
    // 🌑 [유명이경 역월] 현재 전개되어 있는 영역 목록
    //    { ownerId, team, x, y, radius, phase, expandEnd, endAt, collapseEnd }
    //    phase : 'expand' → 'active' → 'collapse'
    domains: [],
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
/** 🗣️ NPC 를 id 로 찾는다 */
function getNpc(id) { return State.npcs.find(n => n.id === id); }

// ============================================================================
// ⚔️ 퇴마의 검(退魔劍) — 몬스터 전용 추가 피해
//    · 장착자가 몬스터에게 주는 모든 피해를 30% 증가시킨다.
//    · 평타 · 모든 스킬 · 지속피해(화상 등) 전부에 적용된다.
//    · 대상 : 검은수염 · 박힌범 · 바제스 · 할배새끼(보스/소환체) · 오크라 · 황금오크라
//    · 적 플레이어에게는 적용되지 않는다.
// ============================================================================
const TOEMA_MULT = 1.3;   // +30%

/**
 * 몬스터에게 줄 피해량에 퇴마의 검 보정을 적용한다.
 * @param attacker 공격자 플레이어 객체 (없거나 미장착이면 그대로 반환)
 * @param damage   원래 피해량
 */
function toemaDmg(attacker, damage) {
    if (!attacker || !attacker.hasToemaSword) return damage;
    return damage * TOEMA_MULT;
}

/**
 * 공격자 id 로 퇴마의 검 보정을 적용한다.
 * (지속피해처럼 공격자 객체 대신 id 만 들고 있는 곳에서 쓴다)
 */
function toemaDmgById(attackerId, damage) {
    if (!attackerId) return damage;
    return toemaDmg(State.players[attackerId], damage);
}

module.exports = {
    shieldAt, pushOutOfShield, shieldAbsorb,
    State, compressors, DeltaCompressor,
    makeMonster, makeHinbeom, makeBlackbeard, makeBurgess, makeBases, makeTurrets, makePlayer, makeNpcs, baseStatus,
    makeSukuna,
    isInHinbeomArea, isInDarkArea, isInDarkZone, isInCrowsBeam, burgessAlive,
    getMinion, getOkra, getNpc,
    TOEMA_MULT, toemaDmg, toemaDmgById
};