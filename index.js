// 파일명: index.js
// ============================================================================
// 🎮 서버 진입점 — 소켓 이벤트 처리와 모듈 조립만 담당한다.
//      server/config.js  : 모든 수치 상수
//      server/state.js   : State · 델타 압축기 · 엔티티 팩토리 · 영역 판정
//      server/damage.js  : 광역 피해 (AoE / Box / IceAge / ShockBlast)
//      server/bosses.js  : 보스 3종 처치·부활·드롭·어그로
//      server/fruits.js  : 흔들흔들 / 어둠어둠 열매 + 캐스팅 워치독
//      charLogic/kashimo.js : ⚡ 카시모 반격 · 전하 · 주력 방출 · 환수호박 · 전격 돌진
//      charLogic/dabura.js  : ⬛ 다부라 빛 · 어둠 · 아광속 발차기
//
// 🗣️ NPC '티치' 대화 · 퀘스트 시스템
//
// ✅ [수정] ■ 아이템은 더 이상 어둠어둠열매(hasYami) 효과를 주지 않는다.
// ✅ [수정] ⬛🌑 [어둠] 시전 중에는 시전자가 3초간 완전히 고정된다.
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
    'KASHIMO': require('./charLogic/kashimo.js'),     // ⚡ 카시모 하지메
    'DABURA': require('./charLogic/dabura.js')        // ⬛ 다부라 카라바
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
// ⬛ 다부라 고유 특성 모듈
const Dabura = CharLogic.DABURA;

// ============================================================================
// 🧱 세로벽(solid) 목록
//    · 환수호박 전격 돌진이 이걸 통과하지 못한다.
//    · ⬛ 다부라 아광속 발차기(비행)도 이 벽을 통과하지 못한다.
//    data.js 의 Platforms 중 solid:true 인 항목과 반드시 동일해야 한다.
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


// ============================================================================
// 🧩 모듈 조립 (순환 참조는 지연 바인딩으로 해결)
// ============================================================================// ============================================================================
// 🧩 분리된 서버 모듈 (index.js 가 비대해져 4개로 나눴다)
//     · server/playerCore.js   : 스탯 재계산 · 🔯 법진 · 사망/부활 · 리셋 · 재접속
//     · server/combat.js       : 🔥 화상 도트 · 🗡️ 평타 · ⚔️ 세계를 가르는 참격
//     · server/socketEvents.js : 🗣️ NPC 대화 · 모든 socket.on 핸들러
//
//   세 모듈은 서로와 index.js 를 양방향으로 참조하므로,
//   먼저 require 만 해 두고 아래에서 wire() 로 의존성을 한 번에 주입한다.
// ============================================================================
const PlayerCore   = require('./server/playerCore.js');
const Combat       = require('./server/combat.js');
const SocketEvents = require('./server/socketEvents.js');
const Domain       = require('./server/domain.js');   // 🌑 유명이경 역월 영역 전개

// 분리 전과 동일한 이름으로 쓸 수 있도록 꺼내 둔다
const { addBeopjinKill, recalcStats, applyBaseDamage, checkPlayerDeath, resetGame, tryReconnect } = PlayerCore;
const { addBurn, clearBurns, processBurns, processWorldCleave } = Combat;

let Damage = null, Bosses = null, Fruits = null;

const deferred = {
    get io() { return io; },
    emitDamageText, checkPlayerDeath, gainXp, clearBurns, applyBaseDamage,
    // 🔯 법진 : 몬스터 처치 시 스택을 올리기 위해 bosses.js 로 전달한다
    addBeopjinKill,
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
    // 🧱 전격 돌진 · 아광속 발차기가 통과할 수 없는 세로벽 목록
    SOLID_WALLS,
    getPlayers: () => State.players, getMonster: () => State.monster, getOkras: () => State.okras,
    getHinbeom: () => State.hinbeom, getMinions: () => State.hinbeomMinions,
    getBlackbeard: () => State.blackbeard, getBurgess: () => State.burgess,
    // 🗣️ NPC
    getNpcs: () => State.npcs, getNpc,
    emitDamageText, checkPlayerDeath, gainXp, recalcStats, applyBaseDamage,
    // 🔯 법진 : 처치 스택 증가 · ⚔️ 퇴마의 검 : 몬스터 피해 30% 보정
    //    charLogic/*.js 와 gameLoop/*.js 가 ctx 를 통해 그대로 사용한다.
    addBeopjinKill,
    toemaDmg: S.toemaDmg,
    toemaDmgById: S.toemaDmgById,
    // 🗡️ 세계를 가르는 참격 — 경직 종료 시 발사 (gameLoop 에서 매 프레임 호출)
    processWorldCleave,
    // 🌑 유명이경 역월 — 시전 종료 시 영역 전개 · 영역 단계 처리
    get processYumyeong() { return Combat.processYumyeong; },
    get processDomains() { return Domain.processDomains; },
    get clearDomains() { return Domain.clearDomains; },
    // 🌑☀️ 영역 전용 [빛] — charLogic/dabura.js 가 ctx 로 호출한다
    get tryDomainLightSkill() { return Combat.tryDomainLightSkill; },
    get processDomainLight() { return Combat.processDomainLight; },
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
    kashimoProcessWaveChains: (now) => Kashimo.processWaveChains(now, serverContext),
    // ⬛ 다부라 고유 특성
    Dabura
}, C, Damage, Bosses, Fruits);

// ============================================================================
// 🔁 메인 루프
// ============================================================================
// ============================================================================
// 🔗 분리 모듈 의존성 주입
//    Damage · Bosses · Fruits · serverContext 가 모두 준비된 지금 시점에
//    세 모듈에 필요한 것을 한 번에 넘긴다. (순환 참조 해소)
// ============================================================================
const wireBag = {
    get io() { return io; },
    C, S, State, compressors,
    get Characters() { return Characters; },
    get Skills() { return Skills; },
    get Items() { return Items; },
    CharLogic, Kashimo, Dabura, ShopManager,
    Damage, Bosses, Fruits, Domain,
    serverContext,
    isNum, emitDamageText, gainXp,
    getNpc, getMinion, isInDarkZone,
    makeMonster, makeBases, makeTurrets, makePlayer, makeNpcs,
    makeHinbeom, makeBlackbeard, makeBurgess,
    // 모듈 간 상호 참조
    addBeopjinKill, recalcStats, applyBaseDamage, checkPlayerDeath, resetGame, tryReconnect,
    addBurn, clearBurns, processBurns, processWorldCleave,
    handleBasicAttack: Combat.handleBasicAttack,
    sanitizeActionData: Combat.sanitizeActionData,
    isDaburaLocked: Combat.isDaburaLocked
};

PlayerCore.wire(wireBag);
Combat.wire(wireBag);
Domain.wire(wireBag);
SocketEvents.wire(wireBag);

// 🔌 모든 준비가 끝난 뒤에 소켓 이벤트를 붙인다
SocketEvents.register();

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