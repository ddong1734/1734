// 파일명: charLogic/kashimo.js
// ============================================================================
// ⚡ 카시모 하지메 스킬 · 고유 특성 전담
//
//   [고유 특성]
//   · 🔌 반격 전류 : 카시모를 '평타(근접 타격)로 때린' 대상이 50 피해를 되받는다.
//                    때린 쪽이 에넬 · 카시모 본인이면 면제 (둘 다 전기 속성).
//                    ✅ [수정] 오크라(황금오크라 포함)의 근접 공격에도 반격이 발동한다.
//                       ※ 할배새끼 · 소환체 · 보스 3종의 공격에는 반격이 발동하지 않는다.
//                    스킬 피해에는 반응하지 않는다 — 오직 평타에만.
//   · 🔋 전하 스택 : 카시모가 평타로 적중시킨 대상에게 1칸씩 쌓인다 (최대 4칸).
//                    마지막 적중으로부터 8초마다 1칸씩 감소한다.
//
//   [스킬]
//   · 1번 [번개]              : 바라보는 방향으로 매우 빠른 한 줄기(관통)
//                               피해 200 · 기절 2초 · 쿨타임 8초
//   · 1번 [대기를 가르는 번개] : 전하 4스택 대상이 화면 안에 있으면 그 대상에게
//                               필중 · 피해 500 · 감전 5초
//                               ✅ [수정] 시전자의 '몸속'에서 번개가 뻗어 나간다.
//   · 2번 [주력 방출]         : ✅ [신규] 4초간 위로 솟구치는 보랏빛 에너지를 방출.
//                               범위 안 대상은 0.2초마다 20 피해 + 0.2초 경직.
//   · 3번 스킬은 아직 구현하지 않았다.
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
 * 🔌✅ [신규] 오크라(황금오크라 포함)가 카시모를 근접 공격했을 때의 반격.
 *    ⚠️ 반격은 '오크라 계열'에만 적용된다.
 *       할배새끼 · 소환체 · 보스 3종의 공격에는 반격이 발동하지 않는다.
 *    플레이어와 달리 defense · 소켓 전송이 없으므로 별도 처리한다.
 *
 * @param victim    맞은 카시모 (플레이어)
 * @param mob       때린 몬스터 객체
 * @param mobKind   반드시 'okra' 여야 반격이 발동한다
 * @param mobId     몬스터 식별자
 * @param ctx       서버 컨텍스트
 * @returns 반격이 실제로 발동했는가
 */
function applyCounterShockToMob(victim, mob, mobKind, mobId, ctx) {
    if (!victim || !mob) return false;
    if (victim.characterType !== 'KASHIMO') return false;
    if (victim.isDead) return false;
    // ⚠️ 오크라(황금오크라 포함)에게만 반격한다
    if (mobKind !== 'okra') return false;
    if (mob.hp === undefined || mob.hp <= 0) return false;
    if (mob.state === 'dead') return false;

    const { io, emitDamageText } = ctx;

    let dmg = C.KASHIMO_COUNTER_DAMAGE;
    if (!Number.isFinite(dmg) || dmg <= 0) return false;

    mob.hp -= dmg;
    emitDamageText(mob.x, mob.y, dmg);

    // 🟣 때린 오크라의 몸에 작은 보라색 전류가 흐른다
    io.emit('kashimoCounter', {
        ownerId: victim.id,
        targetKind: 'okra', targetId: mobId,
        x: mob.x, y: mob.y,
        duration: C.KASHIMO_COUNTER_FX_MS
    });

    // 처치 판정 (반격으로 죽을 수 있다)
    if (mob.hp <= 0) {
        if (typeof ctx.killOkra === 'function') ctx.killOkra(mob, victim.id);
    }
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

/**
 * ⚡✨ 대기를 가르는 번개 — 대상에게 필중 피해 + 5초 감전
 *    ✅ [수정] 하늘이 아니라 '시전자의 몸속'에서 번개가 뻗어 나간다.
 *             그래서 시전자 좌표(originX/Y)를 함께 전송한다.
 */
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
        // ✅ 번개가 뻗어 나가는 '시작점' = 시전자의 몸
        originX: p.x, originY: p.y,
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

// ============================================================================
// ⚡🌋 [신규] 2번 스킬 : 주력 방출
//    4초 동안 위로 솟구치는 보랏빛 에너지를 마구 방출한다.
//    범위 안의 대상은 0.2초마다 20 피해 + 0.2초 경직을 받는다.
//    시전 중에도 이동은 자유롭다 (에너지가 시전자를 따라다닌다).
// ============================================================================

/** 주력 방출 시작 */
function startSurge(p, ctx) {
    const { io, Skills } = ctx;
    const KS2 = Skills.KASHIMO_S2;
    let now = Date.now();

    const dur = (KS2 && KS2.duration) ? KS2.duration : C.K_SURGE_DURATION;

    p.surgeActive = true;
    p.surgeStart = now;
    p.surgeEnd = now + dur;
    p.surgeNextTick = now;                     // 즉시 첫 틱
    p.surgeCdEnd = now + ((KS2 && KS2.cd) ? KS2.cd : C.K_SURGE_COOLDOWN);

    io.emit('kashimoSurgeStart', {
        id: p.id, x: p.x, y: p.y,
        duration: dur,
        width: (KS2 && KS2.width) ? KS2.width : C.K_SURGE_WIDTH,
        height: (KS2 && KS2.height) ? KS2.height : C.K_SURGE_HEIGHT
    });
    io.emit('syncPlayerFull', p);
}

/** 주력 방출 종료 */
function endSurge(p, ctx) {
    if (!p || !p.surgeActive) return;
    const { io } = ctx;
    p.surgeActive = false;
    p.surgeEnd = 0;
    p.surgeNextTick = 0;
    io.emit('kashimoSurgeEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

/** 주력 방출 범위 안의 모든 적에게 피해 + 경직 */
function surgeTick(p, ctx) {
    const { io, Skills, State, emitDamageText, checkPlayerDeath, burgessAlive } = ctx;
    const KS2 = Skills.KASHIMO_S2;

    const dmg   = (KS2 && KS2.tickDamage) ? KS2.tickDamage : C.K_SURGE_TICK_DMG;
    const stun  = (KS2 && KS2.stun) ? KS2.stun : C.K_SURGE_STUN;
    const halfW = ((KS2 && KS2.width) ? KS2.width : C.K_SURGE_WIDTH) / 2;
    const upH   = (KS2 && KS2.height) ? KS2.height : C.K_SURGE_HEIGHT;
    const downH = (KS2 && KS2.down) ? KS2.down : C.K_SURGE_DOWN;

    const minX = p.x - halfW, maxX = p.x + halfW;
    const minY = p.y - upH,   maxY = p.y + downH;

    const inRange = (o, r) => {
        let rr = r || 0;
        return (o.x + rr >= minX && o.x - rr <= maxX && o.y + rr >= minY && o.y - rr <= maxY);
    };

    // ── 적 플레이어 ────────────────────────────────────────────────
    for (let tid in State.players) {
        if (tid === p.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === p.team) continue;
        if (!inRange(t, 45)) continue;

        let actual = dmg * (1 - (t.defense || 0));
        t.hp -= actual;
        emitDamageText(t.x, t.y, actual);
        applyShockStun(t, 'player', stun, ctx);
        if (t.hp <= 0) { checkPlayerDeath(t, p.id); continue; }
        io.to(tid).emit('takeDamage', actual);
    }

    // ── 몬스터 · 보스 공통 처리 ────────────────────────────────────
    const hitMob = (obj, kind, id) => {
        if (!obj || obj.hp === undefined || obj.hp <= 0) return;
        if (obj.state === 'dead') return;
        if (!inRange(obj, obj.radius || 0)) return;

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
    };

    hitMob(State.monster, 'monster', 'monster');
    // 박힌범은 소환체가 살아 있으면 무적
    if (State.hinbeomMinions.length === 0) hitMob(State.hinbeom, 'hinbeom', 'hinbeom');
    hitMob(State.blackbeard, 'blackbeard', 'blackbeard');
    if (typeof burgessAlive === 'function' && burgessAlive()) hitMob(State.burgess, 'burgess', 'burgess');

    for (let i = State.hinbeomMinions.length - 1; i >= 0; i--) {
        let mn = State.hinbeomMinions[i];
        hitMob(mn, 'minion', mn.id);
    }
    for (let i = State.okras.length - 1; i >= 0; i--) {
        let ok = State.okras[i];
        hitMob(ok, 'okra', ok.id);
    }

    // 🏰 넥서스도 범위에 들어오면 피해를 받는다
    let enemyBase = State.bases[p.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0
        && enemyBase.x >= minX - 150 && enemyBase.x <= maxX + 150
        && enemyBase.y >= minY - 150 && enemyBase.y <= maxY + 150) {
        if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg);
    }
}

function useSkill(p, data, ctx) {
    const { Skills } = ctx;
    let now = Date.now();

    // ⚡ 1번 : 번개 / 대기를 가르는 번개
    if (data.type === 1) {
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
        return;
    }

    // ⚡🌋 2번 : 주력 방출
    if (data.type === 2) {
        const KS2 = Skills.KASHIMO_S2;
        if (!KS2) return;
        if (p.surgeActive) return;                       // 이미 방출 중이면 무시
        if (now < (p.surgeCdEnd || 0)) return;           // ⏳ 서버 쿨타임 검증
        startSurge(p, ctx);
        return;
    }

    // 🚧 3번 스킬은 아직 구현하지 않았다
}

function updateLoop(p, now, ctx) {
    // ⚡🌋 주력 방출 지속 처리
    if (!p.surgeActive) return;

    if (p.isDead) { endSurge(p, ctx); return; }

    if (now >= (p.surgeEnd || 0)) { endSurge(p, ctx); return; }

    // 0.2초마다 피해 + 경직
    // 🛟 프레임이 밀려도 루프가 폭주하지 않도록 상한을 둔다
    const KS2 = ctx.Skills.KASHIMO_S2;
    const interval = (KS2 && KS2.tickInterval) ? KS2.tickInterval : C.K_SURGE_TICK_MS;
    let guard = 0;
    while (now >= (p.surgeNextTick || 0) && now < p.surgeEnd && guard++ < 8) {
        p.surgeNextTick = (p.surgeNextTick || now) + interval;
        surgeTick(p, ctx);
    }
    if (guard >= 8) p.surgeNextTick = now + interval;
}

module.exports = {
    useSkill,
    updateLoop,
    isCounterImmune,
    applyCounterShock,
    applyCounterShockToMob,
    addCharge,
    decayCharge,
    findChargedTarget,
    applyShockStun,
    startSurge,
    endSurge
};