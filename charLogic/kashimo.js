// 파일명: charLogic/kashimo.js
// ============================================================================
// ⚡ 카시모 하지메 스킬 · 고유 특성 전담
//
//   [고유 특성]
//   · 🔌 반격 전류 : 카시모를 '평타로 때린' 대상이 50 피해를 되받는다.
//                    때린 쪽이 에넬 · 카시모 본인이면 면제 (둘 다 전기 속성).
//                    스킬 피해에는 반응하지 않는다 — 오직 평타에만.
//   · 🔋 전하 스택 : 카시모가 평타로 적중시킨 대상에게 1칸씩 쌓인다 (최대 4칸).
//                    마지막 적중으로부터 8초마다 1칸씩 감소한다.
//
//   [스킬]
//   · 1번 [번개]              : 바라보는 방향으로 매우 빠른 한 줄기(관통)
//                               피해 200 · 기절 2초 · 쿨타임 8초
//   · 1번 [대기를 가르는 번개] : 전하 4스택 대상이 화면 안에 있으면 그 대상에게
//                               필중 · 피해 500 · 감전 5초
//   · 2번 / 3번 스킬은 아직 구현하지 않았다.
//
// 🟣 카시모의 전기는 모두 보라색 계열로 표현된다.
// ============================================================================

const C = require('../server/config.js');

/**
 * 🔌 이 '공격자'는 카시모의 반격 전류에 면역인가.
 *    에넬과 카시모 본인은 전기 속성이라 감전되지 않는다.
 *    ※ 판정 대상은 '카시모를 때린 쪽'이다. (맞은 쪽이 아니다)
 */
function isCounterImmune(attacker) {
    if (!attacker || !attacker.characterType) return false;
    return attacker.characterType === 'ENEL' || attacker.characterType === 'KASHIMO';
}

/**
 * 🔌 카시모가 평타에 맞았을 때, 때린 상대에게 전류 반격을 돌려준다.
 *    index.js 의 handleBasicAttack 에서 '카시모가 피격당한 직후' 호출한다.
 *
 * @param victim   맞은 카시모 (플레이어)
 * @param attacker 때린 상대 (플레이어)
 * @param ctx      서버 컨텍스트
 * @returns 반격이 실제로 발동했는가
 */
function applyCounterShock(victim, attacker, ctx) {
    if (!victim || !attacker) return false;
    if (victim.characterType !== 'KASHIMO') return false;   // 카시모만 반격한다
    if (victim.isDead || attacker.isDead) return false;
    if (victim.id === attacker.id) return false;
    if (isCounterImmune(attacker)) return false;            // ⚡ 에넬 · 카시모는 면제

    const { io, emitDamageText, checkPlayerDeath } = ctx;

    let dmg = C.KASHIMO_COUNTER_DAMAGE * (1 - (attacker.defense || 0));
    if (!Number.isFinite(dmg) || dmg <= 0) return false;

    attacker.hp -= dmg;
    emitDamageText(attacker.x, attacker.y, dmg);

    // 🟣 때린 상대의 몸에 작은 보라색 전류가 흐른다
    io.emit('kashimoCounter', {
        ownerId: victim.id, targetId: attacker.id,
        x: attacker.x, y: attacker.y,
        duration: C.KASHIMO_COUNTER_FX_MS
    });

    if (attacker.hp <= 0) { checkPlayerDeath(attacker, victim.id); return true; }
    io.to(attacker.id).emit('takeDamage', dmg);
    return true;
}

/**
 * 🔋 카시모가 평타로 적중시킨 대상에게 전하 스택을 1칸 쌓는다.
 *    감쇠 타이머(8초)는 적중할 때마다 새로 시작된다.
 *
 * @param obj  맞은 대상 (플레이어 / 몬스터 / 보스 무관)
 * @param kind 'player' | 'monster' | 'hinbeom' | 'blackbeard' | 'burgess' | 'minion' | 'okra'
 * @param id   대상 식별자
 * @param ctx  서버 컨텍스트
 */
function addCharge(obj, kind, id, ctx) {
    if (!obj) return;
    let now = Date.now();
    let cur = obj.kashimoCharge || 0;
    if (cur < C.KASHIMO_CHARGE_MAX) cur++;
    obj.kashimoCharge = cur;
    // ⏳ 마지막 적중 기준으로 감쇠 타이머를 다시 세운다
    obj.kashimoChargeUntil = now + C.KASHIMO_CHARGE_DECAY_MS;

    if (ctx && ctx.io) {
        ctx.io.emit('kashimoCharge', {
            targetKind: kind, targetId: id,
            charge: obj.kashimoCharge, until: obj.kashimoChargeUntil
        });
    }
}

/**
 * ⏳ 전하 스택 감쇠 처리 (매 프레임 호출).
 *    마지막 적중 후 8초가 지날 때마다 1칸씩 줄어든다.
 *    gameLoop.js 에서 모든 대상을 순회하며 호출한다.
 */
function decayCharge(obj, kind, id, now, ctx) {
    if (!obj) return;
    let cur = obj.kashimoCharge || 0;
    if (cur <= 0) {
        if (obj.kashimoChargeUntil) obj.kashimoChargeUntil = 0;
        return;
    }
    let until = obj.kashimoChargeUntil || 0;
    if (until === 0) { obj.kashimoChargeUntil = now + C.KASHIMO_CHARGE_DECAY_MS; return; }
    if (now < until) return;

    // 🛟 오래 방치되어 여러 칸이 밀렸어도 한 번에 정리한다 (루프 폭주 방지)
    let overdue = Math.floor((now - until) / C.KASHIMO_CHARGE_DECAY_MS) + 1;
    if (overdue > C.KASHIMO_CHARGE_MAX) overdue = C.KASHIMO_CHARGE_MAX;
    cur -= overdue;
    if (cur < 0) cur = 0;

    obj.kashimoCharge = cur;
    obj.kashimoChargeUntil = (cur > 0) ? (now + C.KASHIMO_CHARGE_DECAY_MS) : 0;

    if (ctx && ctx.io) {
        ctx.io.emit('kashimoCharge', {
            targetKind: kind, targetId: id,
            charge: obj.kashimoCharge, until: obj.kashimoChargeUntil
        });
    }
}

/**
 * 🔋 전하 4스택이 채워진 '유효한 적' 중 가장 가까운 대상을 찾는다.
 *    화면 안(가로 K_SKY_RANGE_X · 세로 K_SKY_RANGE_Y)에 있어야 한다.
 *    반환 : { obj, kind, id } | null
 */
function findChargedTarget(p, ctx) {
    const State = ctx.State;
    const burgessAlive = ctx.burgessAlive;
    let best = null, bestDist = Infinity;

    const consider = (obj, kind, id) => {
        if (!obj) return;
        if ((obj.kashimoCharge || 0) < C.KASHIMO_CHARGE_MAX) return;
        if (Math.abs(obj.x - p.x) > C.K_SKY_RANGE_X) return;
        if (Math.abs(obj.y - p.y) > C.K_SKY_RANGE_Y) return;
        let d = Math.hypot(obj.x - p.x, obj.y - p.y);
        if (d < bestDist) { bestDist = d; best = { obj: obj, kind: kind, id: id }; }
    };

    for (let tid in State.players) {
        if (tid === p.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === p.team) continue;
        consider(t, 'player', tid);
    }
    if (State.monster.hp > 0 && State.monster.state !== 'dead') consider(State.monster, 'monster', 'monster');
    if (State.hinbeom.hp > 0 && State.hinbeom.state !== 'dead' && State.hinbeomMinions.length === 0) consider(State.hinbeom, 'hinbeom', 'hinbeom');
    if (State.blackbeard.hp > 0 && State.blackbeard.state !== 'dead') consider(State.blackbeard, 'blackbeard', 'blackbeard');
    if (typeof burgessAlive === 'function' && burgessAlive()) consider(State.burgess, 'burgess', 'burgess');
    State.hinbeomMinions.forEach(mn => { if (mn.hp > 0) consider(mn, 'minion', mn.id); });
    State.okras.forEach(ok => { if (ok.hp > 0 && ok.state !== 'dead') consider(ok, 'okra', ok.id); });

    return best;
}

/** ⚡ 대상에게 감전 경직을 건다 */
function applyShockStun(obj, kind, durMs, ctx) {
    let now = Date.now();
    let until = now + durMs;
    obj.electrocutedUntil = Math.max(obj.electrocutedUntil || 0, until);
    obj.airFreezeUntil = Math.max(obj.airFreezeUntil || 0, until);
    obj.frozenUntil = Math.max(obj.frozenUntil || 0, until);

    if (kind === 'player') {
        obj.isCasting = false; obj.skill1Dashing = false;
        obj.yataActive = false; obj.yataPath = null; obj.skill3Active = false;
        obj.elThorActive = false; obj.mantleActive = false;
        obj.raigoActive = false; obj.raigoDropped = false;
        if (ctx && ctx.io) {
            ctx.io.emit('statusUpdate', {
                id: obj.id,
                frozenUntil: obj.frozenUntil || 0,
                electrocutedUntil: obj.electrocutedUntil || 0,
                airFreezeUntil: obj.airFreezeUntil || 0,
                burningUntil: obj.burningUntil || 0,
                maguBombUntil: obj.maguBombUntil || 0,
                justiceBombUntil: obj.justiceBombUntil || 0,
                kashimoCharge: obj.kashimoCharge || 0,
                kashimoChargeUntil: obj.kashimoChargeUntil || 0
            });
        }
    }
}

/** ⚡✨ 대기를 가르는 번개 — 대상에게 필중 피해 + 5초 감전 */
function fireSkyBolt(p, target, ctx) {
    const { io, emitDamageText, checkPlayerDeath, Skills } = ctx;
    const KS1 = Skills.KASHIMO_S1;
    const dmg = (KS1 && KS1.skyDamage) ? KS1.skyDamage : C.K_SKY_DAMAGE;
    const stun = (KS1 && KS1.skyStun) ? KS1.skyStun : C.K_SKY_STUN;

    let obj = target.obj, kind = target.kind, id = target.id;

    // 🔋 전하는 전부 소모된다
    obj.kashimoCharge = 0;
    obj.kashimoChargeUntil = 0;
    io.emit('kashimoCharge', { targetKind: kind, targetId: id, charge: 0, until: 0 });

    io.emit('kashimoSkyBolt', {
        ownerId: p.id,
        targetKind: kind, targetId: id,
        x: obj.x, y: obj.y,
        duration: C.K_SKY_FX_MS
    });

    if (kind === 'player') {
        let actual = dmg * (1 - (obj.defense || 0));
        obj.hp -= actual;
        emitDamageText(obj.x, obj.y, actual);
        applyShockStun(obj, 'player', stun, ctx);
        if (obj.hp <= 0) { checkPlayerDeath(obj, p.id); return; }
        io.to(id).emit('takeDamage', actual);
        io.emit('syncPlayerFull', obj);
        return;
    }

    obj.hp -= dmg;
    emitDamageText(obj.x, obj.y, dmg);
    applyShockStun(obj, kind, stun, ctx);

    if (kind === 'hinbeom' && typeof ctx.recordHinbeomDamage === 'function') ctx.recordHinbeomDamage(p.id, dmg);

    if (kind === 'monster' || kind === 'minion' || kind === 'okra') { obj.targetId = p.id; obj.state = 'chase'; }
    else if (kind === 'hinbeom' && typeof ctx.aggroHinbeom === 'function') ctx.aggroHinbeom(p.id);
    else if (kind === 'blackbeard') {
        if (typeof ctx.aggroBlackbeard === 'function') ctx.aggroBlackbeard(p.id);
        if (typeof ctx.checkBurgessSummon === 'function') ctx.checkBurgessSummon();
    }
    else if (kind === 'burgess' && typeof ctx.aggroBurgess === 'function') ctx.aggroBurgess(p.id);

    if (obj.hp <= 0) {
        if (kind === 'monster' && typeof ctx.killMonster === 'function') ctx.killMonster(p.id);
        else if (kind === 'hinbeom' && typeof ctx.killHinbeom === 'function') ctx.killHinbeom(p.id);
        else if (kind === 'blackbeard' && typeof ctx.killBlackbeard === 'function') ctx.killBlackbeard(p.id);
        else if (kind === 'burgess' && typeof ctx.killBurgess === 'function') ctx.killBurgess(p.id);
        else if (kind === 'minion' && typeof ctx.killMinion === 'function') ctx.killMinion(obj, p.id);
        else if (kind === 'okra' && typeof ctx.killOkra === 'function') ctx.killOkra(obj, p.id);
    }
}

/** ⚡ 번개 — 전방으로 매우 빠른 한 줄기 (관통) */
function fireStraightBolt(p, dir, ctx) {
    const { io, Skills, addProjectile, getNextProjId } = ctx;
    const KS1 = Skills.KASHIMO_S1;

    let dmg = ((KS1 && KS1.damage) ? KS1.damage : C.K_BOLT_DAMAGE) + Math.round((p.bonusDamage || 0) * 0.5);

    addProjectile({
        id: getNextProjId(), team: p.team, type: 'kashimo_bolt', ownerId: p.id,
        x: p.x + (dir * 70), y: p.y - 10,
        vx: dir * ((KS1 && KS1.speed) ? KS1.speed : C.K_BOLT_SPEED), vy: 0,
        life: (KS1 && KS1.life) ? KS1.life : C.K_BOLT_LIFE,
        damage: dmg,
        hitR: (KS1 && KS1.hitR) ? KS1.hitR : C.K_BOLT_HITR,
        edgeR: (KS1 && KS1.edgeR) ? KS1.edgeR : C.K_BOLT_EDGER,
        canHitBase: true,
        piercing: true, hitIds: [],
        // ⚡ 카시모 전용 : 맞은 대상을 감전 경직시킨다
        kashimoStun: (KS1 && KS1.stun) ? KS1.stun : C.K_BOLT_STUN
    });

    io.emit('kashimoBoltCast', { id: p.id, x: p.x, y: p.y, dir: dir });
}

function useSkill(p, data, ctx) {
    const { Skills } = ctx;
    let now = Date.now();

    // 🚧 2번 / 3번 스킬은 아직 구현하지 않았다
    if (data.type !== 1) return;

    const KS1 = Skills.KASHIMO_S1;
    if (!KS1) return;

    // ⏳ 서버 쿨타임 검증 (클라이언트 쿨타임과 이중 확인)
    if (now < (p.kashimoBoltCdEnd || 0)) return;
    p.kashimoBoltCdEnd = now + (KS1.cd || C.K_BOLT_COOLDOWN);

    let dir = (data.dir === -1) ? -1 : 1;

    // ⚡✨ 전하 4스택 대상이 화면 안에 있으면 '대기를 가르는 번개'
    let charged = findChargedTarget(p, ctx);
    if (charged) { fireSkyBolt(p, charged, ctx); return; }

    // ⚡ 그렇지 않으면 전방으로 한 줄기 번개
    fireStraightBolt(p, dir, ctx);
}

function updateLoop(p, now, ctx) {
    // 카시모 하지메는 현재 지속 틱(Tick) 업데이트 스킬이 없다.
    // (2번 · 3번 스킬 구현 시 여기에 작성한다)
}

module.exports = {
    useSkill,
    updateLoop,
    isCounterImmune,
    applyCounterShock,
    addCharge,
    decayCharge,
    findChargedTarget,
    applyShockStun
};