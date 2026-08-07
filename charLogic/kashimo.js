// 파일명: charLogic/kashimo.js
// ============================================================================
// ⚡ 카시모 하지메 스킬 · 고유 특성 전담
//
//   [고유 특성]
//   · 🔌 반격 전류 : 카시모를 '평타로 때린' 대상이 50 피해를 되받는다.
//                    에넬 · 카시모 본인은 면제. 오크라(황금 포함)의 근접 공격에도 발동.
//   · 🔋 전하 스택 : 카시모가 평타로 적중시킨 대상에게 1칸씩 (최대 4칸).
//                    마지막 적중으로부터 8초마다 1칸씩 감소.
//
//   [기본 스킬]
//   · 1번 [번개]              : 전방 관통 · 200 · 기절 2초 · 쿨 8초
//   · 1번 [대기를 가르는 번개] : 전하 4스택 대상에게 필중 · 500 · 감전 5초
//   · 2번 [주력 방출]         : 4초간 보랏빛 에너지 방출 · 0.2초마다 20 + 0.2초 경직
//   · 3번 [환수호박]          : ✅ [신규] 몸이 전기 덩어리로 변한다
//
//   [환수호박(幻獸琥珀)]
//   · 이동속도 1.7배
//   · 죽을 때까지 해제 불가 · 모든 회복 무효 · 초당 최대 체력 4% 소모
//   · 지나간 자리에 2초 지속 전기 잔상
//   · 발동 중 3번 스킬이 사라지고 1·2번이 전용 스킬로 바뀐다
//       - 전용 1번 [전자파] : 앞으로 날아가는 연쇄 전기폭발 · 폭발당 200 · 기절 1초
//       - 전용 2번 [음파]   : 0.5초 경직 후 전방 넓은 부채꼴 · 350 · 기절 2초
//
// 🟣 카시모의 전기는 모두 보라색 계열로 표현된다.
// ============================================================================

const C = require('../server/config.js');

/**
 * 🔌 이 '공격자'는 카시모의 반격 전류에 면역인가.
 *    에넬과 카시모 본인은 전기 속성이라 감전되지 않는다.
 */
function isCounterImmune(attacker) {
    if (!attacker || !attacker.characterType) return false;
    return attacker.characterType === 'ENEL' || attacker.characterType === 'KASHIMO';
}

/**
 * 🔌 카시모가 평타에 맞았을 때, 때린 상대(플레이어)에게 전류 반격을 돌려준다.
 */
function applyCounterShock(victim, attacker, ctx) {
    if (!victim || !attacker) return false;
    if (victim.characterType !== 'KASHIMO') return false;
    if (victim.isDead || attacker.isDead) return false;
    if (victim.id === attacker.id) return false;
    if (isCounterImmune(attacker)) return false;

    const { io, emitDamageText, checkPlayerDeath } = ctx;

    let dmg = C.KASHIMO_COUNTER_DAMAGE * (1 - (attacker.defense || 0));
    if (!Number.isFinite(dmg) || dmg <= 0) return false;

    attacker.hp -= dmg;
    emitDamageText(attacker.x, attacker.y, dmg);

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
 * 🔌 오크라(황금오크라 포함)가 카시모를 근접 공격했을 때의 반격.
 *    ⚠️ 오크라 계열에만 적용된다.
 */
function applyCounterShockToMob(victim, mob, mobKind, mobId, ctx) {
    if (!victim || !mob) return false;
    if (victim.characterType !== 'KASHIMO') return false;
    if (victim.isDead) return false;
    if (mobKind !== 'okra') return false;
    if (mob.hp === undefined || mob.hp <= 0) return false;
    if (mob.state === 'dead') return false;

    const { io, emitDamageText } = ctx;

    let dmg = C.KASHIMO_COUNTER_DAMAGE;
    if (!Number.isFinite(dmg) || dmg <= 0) return false;

    mob.hp -= dmg;
    emitDamageText(mob.x, mob.y, dmg);

    io.emit('kashimoCounter', {
        ownerId: victim.id,
        targetKind: 'okra', targetId: mobId,
        x: mob.x, y: mob.y,
        duration: C.KASHIMO_COUNTER_FX_MS
    });

    if (mob.hp <= 0) {
        if (typeof ctx.killOkra === 'function') ctx.killOkra(mob, victim.id);
    }
    return true;
}

/** 🔋 전하 스택을 1칸 쌓는다 */
function addCharge(obj, kind, id, ctx) {
    if (!obj) return;
    let now = Date.now();
    let cur = obj.kashimoCharge || 0;
    if (cur < C.KASHIMO_CHARGE_MAX) cur++;
    obj.kashimoCharge = cur;
    obj.kashimoChargeUntil = now + C.KASHIMO_CHARGE_DECAY_MS;

    if (ctx && ctx.io) {
        ctx.io.emit('kashimoCharge', {
            targetKind: kind, targetId: id,
            charge: obj.kashimoCharge, until: obj.kashimoChargeUntil
        });
    }
}

/** ⏳ 전하 스택 감쇠 처리 (매 프레임 호출) */
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

/** 🔋 전하 4스택 대상 중 화면 안에서 가장 가까운 대상 */
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
 * ⚡ 공통 : 한 지점을 중심으로 원형 범위의 모든 적에게 피해 + 감전 경직.
 *    전자파의 각 폭발이 이 함수를 쓴다.
 */
function blastAt(p, cx, cy, radius, dmg, stun, ctx, hitSet) {
    const { io, State, emitDamageText, checkPlayerDeath, burgessAlive } = ctx;

    const inRange = (o, r) => Math.hypot(cx - o.x, cy - o.y) < radius + (r || 0);

    // 적 플레이어
    for (let tid in State.players) {
        if (tid === p.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === p.team) continue;
        if (!inRange(t, 45)) continue;
        if (hitSet) { let k = 'p_' + tid; if (hitSet[k]) continue; hitSet[k] = 1; }

        let actual = dmg * (1 - (t.defense || 0));
        t.hp -= actual;
        emitDamageText(t.x, t.y, actual);
        applyShockStun(t, 'player', stun, ctx);
        if (t.hp <= 0) { checkPlayerDeath(t, p.id); continue; }
        io.to(tid).emit('takeDamage', actual);
    }

    // 몬스터 · 보스 공통
    const hitMob = (obj, kind, id) => {
        if (!obj || obj.hp === undefined || obj.hp <= 0) return;
        if (obj.state === 'dead') return;
        if (!inRange(obj, obj.radius || 0)) return;
        if (hitSet) { let k = kind + '_' + id; if (hitSet[k]) return; hitSet[k] = 1; }

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

    // 🏰 넥서스
    let enemyBase = State.bases[p.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0 && Math.hypot(cx - enemyBase.x, cy - enemyBase.y) < radius + 150) {
        if (!hitSet || !hitSet['base']) {
            if (hitSet) hitSet['base'] = 1;
            if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg);
        }
    }
}

/** ⚡✨ 대기를 가르는 번개 — 시전자의 몸속에서 대상까지 뻗어 나간다 */
function fireSkyBolt(p, target, ctx) {
    const { io, emitDamageText, checkPlayerDeath, Skills } = ctx;
    const KS1 = Skills.KASHIMO_S1;
    const dmg = (KS1 && KS1.skyDamage) ? KS1.skyDamage : C.K_SKY_DAMAGE;
    const stun = (KS1 && KS1.skyStun) ? KS1.skyStun : C.K_SKY_STUN;

    let obj = target.obj, kind = target.kind, id = target.id;

    obj.kashimoCharge = 0;
    obj.kashimoChargeUntil = 0;
    io.emit('kashimoCharge', { targetKind: kind, targetId: id, charge: 0, until: 0 });

    io.emit('kashimoSkyBolt', {
        ownerId: p.id,
        targetKind: kind, targetId: id,
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
        kashimoStun: (KS1 && KS1.stun) ? KS1.stun : C.K_BOLT_STUN
    });

    io.emit('kashimoBoltCast', { id: p.id, x: p.x, y: p.y, dir: dir });
}

// ============================================================================
// ⚡🌋 2번 스킬 : 주력 방출
// ============================================================================

function startSurge(p, ctx) {
    const { io, Skills } = ctx;
    const KS2 = Skills.KASHIMO_S2;
    let now = Date.now();

    const dur = (KS2 && KS2.duration) ? KS2.duration : C.K_SURGE_DURATION;

    p.surgeActive = true;
    p.surgeStart = now;
    p.surgeEnd = now + dur;
    p.surgeNextTick = now;
    p.surgeCdEnd = now + ((KS2 && KS2.cd) ? KS2.cd : C.K_SURGE_COOLDOWN);

    io.emit('kashimoSurgeStart', {
        id: p.id, x: p.x, y: p.y,
        duration: dur,
        width: (KS2 && KS2.width) ? KS2.width : C.K_SURGE_WIDTH,
        height: (KS2 && KS2.height) ? KS2.height : C.K_SURGE_HEIGHT
    });
    io.emit('syncPlayerFull', p);
}

function endSurge(p, ctx) {
    if (!p || !p.surgeActive) return;
    const { io } = ctx;
    p.surgeActive = false;
    p.surgeEnd = 0;
    p.surgeNextTick = 0;
    io.emit('kashimoSurgeEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

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

    let enemyBase = State.bases[p.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0
        && enemyBase.x >= minX - 150 && enemyBase.x <= maxX + 150
        && enemyBase.y >= minY - 150 && enemyBase.y <= maxY + 150) {
        if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg);
    }
}

// ============================================================================
// ⚡🔮 [신규] 3번 스킬 : 환수호박
//    몸이 전기 덩어리로 변한다. 죽을 때까지 해제 불가.
// ============================================================================

/** 환수호박 발동 */
function startAmber(p, ctx) {
    const { io, Skills, recalcStats } = ctx;
    const KS3 = Skills.KASHIMO_S3;
    let now = Date.now();

    p.amberActive = true;
    p.amberStart = now;
    p.amberNextDrain = now + ((KS3 && KS3.drainInterval) ? KS3.drainInterval : C.K_AMBER_DRAIN_MS);
    p.amberCdEnd = now + ((KS3 && KS3.cd) ? KS3.cd : C.K_AMBER_COOLDOWN);
    p.amberLastTrailX = p.x;
    p.amberLastTrailY = p.y;

    // 🔮 전용 스킬 쿨타임 초기화 (즉시 쓸 수 있다)
    p.waveCdEnd = 0;
    p.sonicCdEnd = 0;
    p.sonicChargeUntil = 0;
    p.sonicFireAt = 0;

    // ⚡ 이동속도 1.7배 — recalcStats 가 speedMult 를 재계산하므로 그 뒤에 곱한다
    if (typeof recalcStats === 'function') recalcStats(p);
    p.speedMult = (p.speedMult || 1.0) * ((KS3 && KS3.speedMult) ? KS3.speedMult : C.K_AMBER_SPEED_MULT);

    io.emit('kashimoAmberStart', { id: p.id, x: p.x, y: p.y });
    io.emit('syncPlayerFull', p);
}

/**
 * 환수호박 강제 종료 — 사망 시에만 호출된다.
 * (스킬로는 해제할 수 없다)
 */
function endAmber(p, ctx) {
    if (!p || !p.amberActive) return;
    const { io, recalcStats } = ctx;
    p.amberActive = false;
    p.amberNextDrain = 0;
    p.sonicChargeUntil = 0;
    p.sonicFireAt = 0;
    // 🔮 죽으면 3번 스킬이 다시 생겨나므로 쿨타임도 초기화한다
    p.amberCdEnd = 0;
    if (typeof recalcStats === 'function') recalcStats(p);   // 이동속도 원복
    io.emit('kashimoAmberEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

/** ⚡ 환수호박 지속 처리 — 체력 소모 + 전기 잔상 */
function amberTick(p, now, ctx) {
    const { io, Skills, State, emitDamageText, checkPlayerDeath } = ctx;
    const KS3 = Skills.KASHIMO_S3;

    // ── ① 초당 최대 체력 4% 소모 ─────────────────────────────────────
    const interval = (KS3 && KS3.drainInterval) ? KS3.drainInterval : C.K_AMBER_DRAIN_MS;
    const pct = (KS3 && KS3.drainPct) ? KS3.drainPct : C.K_AMBER_DRAIN_PCT;

    let guard = 0;
    while (now >= (p.amberNextDrain || 0) && guard++ < 8) {
        p.amberNextDrain = (p.amberNextDrain || now) + interval;
        let loss = (p.maxHp || 0) * pct;
        if (Number.isFinite(loss) && loss > 0) {
            p.hp -= loss;
            emitDamageText(p.x, p.y, loss);
            if (p.hp <= 0) {
                // 🔮 환수호박으로 스스로 소진되어 사망 (기여자 없음)
                checkPlayerDeath(p, null);
                return;
            }
            io.to(p.id).emit('takeDamage', loss);
        }
    }
    if (guard >= 8) p.amberNextDrain = now + interval;

    // ── ② 지나간 자리에 전기 잔상 ────────────────────────────────────
    const gap = (KS3 && KS3.trailGap) ? KS3.trailGap : C.K_AMBER_TRAIL_GAP;
    let dx = p.x - (p.amberLastTrailX || p.x);
    let dy = p.y - (p.amberLastTrailY || p.y);
    if (Math.hypot(dx, dy) >= gap) {
        p.amberLastTrailX = p.x;
        p.amberLastTrailY = p.y;

        let dur = (KS3 && KS3.trailDuration) ? KS3.trailDuration : C.K_AMBER_TRAIL_MS;
        State.amberTrails.push({
            ownerId: p.id, team: p.team,
            x: p.x, y: p.y,
            endAt: now + dur
        });
        // 🛟 배열 폭주 방지
        if (State.amberTrails.length > C.K_AMBER_TRAIL_MAX) {
            State.amberTrails.splice(0, State.amberTrails.length - C.K_AMBER_TRAIL_MAX);
        }

        io.emit('kashimoAmberTrail', {
            ownerId: p.id, x: p.x, y: p.y, duration: dur
        });
    }
}

/** ⏳ 만료된 전기 잔상 정리 (gameLoop 에서 호출) */
function processAmberTrails(now, ctx) {
    const State = ctx.State;
    if (!Array.isArray(State.amberTrails)) { State.amberTrails = []; return; }
    for (let i = State.amberTrails.length - 1; i >= 0; i--) {
        if (now >= State.amberTrails[i].endAt) State.amberTrails.splice(i, 1);
    }
}

// ============================================================================
// ⚡🔮 환수호박 전용 1번 : 전자파 (앞으로 날아가는 연쇄 전기폭발)
// ============================================================================

function fireWave(p, dir, ctx) {
    const { io, Skills, State } = ctx;
    const KA1 = Skills.KASHIMO_A1;
    let now = Date.now();

    const range = (KA1 && KA1.range) ? KA1.range : C.K_WAVE_RANGE;
    const count = (KA1 && KA1.count) ? KA1.count : C.K_WAVE_COUNT;
    const step  = (KA1 && KA1.stepInterval) ? KA1.stepInterval : C.K_WAVE_STEP_MS;
    const radius = (KA1 && KA1.radius) ? KA1.radius : C.K_WAVE_RADIUS;
    const dmg = ((KA1 && KA1.damage) ? KA1.damage : C.K_WAVE_DAMAGE) + Math.round((p.bonusDamage || 0) * 0.5);
    const stun = (KA1 && KA1.stun) ? KA1.stun : C.K_WAVE_STUN;

    // 시전자 앞에서 시작해 사거리 끝까지 균등 간격으로 폭발한다
    const startX = p.x + dir * 90;
    const gap = range / count;

    State.waveChains.push({
        ownerId: p.id, team: p.team,
        dir: dir,
        baseX: startX, baseY: p.y - 10,
        gap: gap, radius: radius, damage: dmg, stun: stun,
        count: count, fired: 0,
        nextAt: now,
        step: step
    });

    io.emit('kashimoWaveCast', {
        id: p.id, x: p.x, y: p.y, dir: dir,
        range: range, radius: radius, count: count, step: step
    });
}

/** ⚡ 예약된 연쇄 폭발 처리 (매 프레임) */
function processWaveChains(now, ctx) {
    const { io, State } = ctx;
    if (!Array.isArray(State.waveChains)) { State.waveChains = []; return; }

    for (let i = State.waveChains.length - 1; i >= 0; i--) {
        let w = State.waveChains[i];
        let owner = State.players[w.ownerId];

        // 시전자가 사라졌으면 폭발도 중단
        if (!owner) { State.waveChains.splice(i, 1); continue; }

        let guard = 0;
        while (now >= w.nextAt && w.fired < w.count && guard++ < 8) {
            let cx = w.baseX + w.dir * (w.gap * w.fired);
            let cy = w.baseY;

            // 🟣 폭발 이펙트
            io.emit('kashimoWaveBlast', {
                ownerId: w.ownerId, x: cx, y: cy,
                radius: w.radius, index: w.fired,
                duration: C.K_WAVE_FX_MS
            });

            // 폭발마다 별도 판정 (같은 대상이 여러 폭발에 맞을 수 있다)
            blastAt(owner, cx, cy, w.radius, w.damage, w.stun, ctx, null);

            w.fired++;
            w.nextAt += w.step;
        }
        if (guard >= 8) w.nextAt = now + w.step;

        if (w.fired >= w.count) State.waveChains.splice(i, 1);
    }
}

// ============================================================================
// ⚡🔮 환수호박 전용 2번 : 음파 (0.5초 경직 후 전방 넓은 부채꼴)
// ============================================================================

function startSonic(p, dir, ctx) {
    const { io, Skills } = ctx;
    const KA2 = Skills.KASHIMO_A2;
    let now = Date.now();

    const castTime = (KA2 && KA2.castTime) ? KA2.castTime : C.K_SONIC_CHARGE_MS;

    p.sonicChargeUntil = now + castTime;
    p.sonicFireAt = now + castTime;
    p.sonicDir = dir;
    p.sonicCdEnd = now + ((KA2 && KA2.cd) ? KA2.cd : C.K_SONIC_COOLDOWN);

    io.emit('kashimoSonicCharge', {
        id: p.id, x: p.x, y: p.y, dir: dir, duration: castTime
    });
    io.emit('syncPlayerFull', p);
}

/** ⚡ 음파 발사 (경직 종료 시점) */
function fireSonic(p, ctx) {
    const { io, Skills, State, emitDamageText, checkPlayerDeath, burgessAlive } = ctx;
    const KA2 = Skills.KASHIMO_A2;

    const dir = (p.sonicDir === -1) ? -1 : 1;
    const range = (KA2 && KA2.range) ? KA2.range : C.K_SONIC_RANGE;
    const halfAng = ((KA2 && KA2.angle) ? KA2.angle : C.K_SONIC_ANGLE) / 2;
    const dmg = ((KA2 && KA2.damage) ? KA2.damage : C.K_SONIC_DAMAGE) + Math.round((p.bonusDamage || 0) * 0.5);
    const stun = (KA2 && KA2.stun) ? KA2.stun : C.K_SONIC_STUN;

    io.emit('kashimoSonicFire', {
        ownerId: p.id, x: p.x, y: p.y, dir: dir,
        range: range, angle: halfAng * 2, duration: C.K_SONIC_FX_MS
    });

    // 부채꼴 판정 : 전방 dir 방향 기준 ±halfAng 이내, 거리 range 이내
    const inCone = (o, r) => {
        let rr = r || 0;
        let dx = o.x - p.x, dy = o.y - p.y;
        let dist = Math.hypot(dx, dy);
        if (dist > range + rr) return false;
        if (dist < 1) return true;                       // 겹쳐 있으면 무조건 적중
        // 전방 벡터는 (dir, 0)
        let cosT = (dx * dir) / dist;
        // 반경만큼의 여유를 각도로 환산해 더해 준다
        let allow = Math.cos(Math.min(Math.PI, halfAng + Math.atan2(rr, Math.max(1, dist))));
        return cosT >= allow;
    };

    // 적 플레이어
    for (let tid in State.players) {
        if (tid === p.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === p.team) continue;
        if (!inCone(t, 45)) continue;

        let actual = dmg * (1 - (t.defense || 0));
        t.hp -= actual;
        emitDamageText(t.x, t.y, actual);
        applyShockStun(t, 'player', stun, ctx);
        if (t.hp <= 0) { checkPlayerDeath(t, p.id); continue; }
        io.to(tid).emit('takeDamage', actual);
    }

    // 몬스터 · 보스
    const hitMob = (obj, kind, id) => {
        if (!obj || obj.hp === undefined || obj.hp <= 0) return;
        if (obj.state === 'dead') return;
        if (!inCone(obj, obj.radius || 0)) return;

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

    // 🏰 넥서스
    let enemyBase = State.bases[p.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0 && inCone(enemyBase, 150)) {
        if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg);
    }
}

// ============================================================================
// 🎮 스킬 진입점
// ============================================================================
function useSkill(p, data, ctx) {
    const { Skills } = ctx;
    let now = Date.now();

    // ⚡🔮 환수호박 상태에서는 1·2번이 전용 스킬로 바뀐다
    if (p.amberActive) {
        // 🔊 음파 경직 중에는 아무 스킬도 쓸 수 없다
        if (now < (p.sonicChargeUntil || 0)) return;

        if (data.type === 1) {
            const KA1 = Skills.KASHIMO_A1;
            if (!KA1) return;
            if (now < (p.waveCdEnd || 0)) return;
            p.waveCdEnd = now + (KA1.cd || C.K_WAVE_COOLDOWN);
            let dir = (data.dir === -1) ? -1 : 1;
            fireWave(p, dir, ctx);
            return;
        }
        if (data.type === 2) {
            const KA2 = Skills.KASHIMO_A2;
            if (!KA2) return;
            if (now < (p.sonicCdEnd || 0)) return;
            let dir = (data.dir === -1) ? -1 : 1;
            startSonic(p, dir, ctx);
            return;
        }
        // 🔮 환수호박 중에는 3번 스킬이 존재하지 않는다
        return;
    }

    // ⚡ 1번 : 번개 / 대기를 가르는 번개
    if (data.type === 1) {
        const KS1 = Skills.KASHIMO_S1;
        if (!KS1) return;

        if (now < (p.kashimoBoltCdEnd || 0)) return;
        p.kashimoBoltCdEnd = now + (KS1.cd || C.K_BOLT_COOLDOWN);

        let dir = (data.dir === -1) ? -1 : 1;

        let charged = findChargedTarget(p, ctx);
        if (charged) { fireSkyBolt(p, charged, ctx); return; }

        fireStraightBolt(p, dir, ctx);
        return;
    }

    // ⚡🌋 2번 : 주력 방출
    if (data.type === 2) {
        const KS2 = Skills.KASHIMO_S2;
        if (!KS2) return;
        if (p.surgeActive) return;
        if (now < (p.surgeCdEnd || 0)) return;
        startSurge(p, ctx);
        return;
    }

    // ⚡🔮 3번 : 환수호박 (죽을 때까지 해제 불가)
    if (data.type === 3) {
        const KS3 = Skills.KASHIMO_S3;
        if (!KS3) return;
        if (p.amberActive) return;                       // 이미 발동 중
        if (now < (p.amberCdEnd || 0)) return;
        startAmber(p, ctx);
        return;
    }
}

function updateLoop(p, now, ctx) {
    // ⚡🌋 주력 방출 지속 처리
    if (p.surgeActive) {
        if (p.isDead) { endSurge(p, ctx); }
        else if (now >= (p.surgeEnd || 0)) { endSurge(p, ctx); }
        else {
            const KS2 = ctx.Skills.KASHIMO_S2;
            const interval = (KS2 && KS2.tickInterval) ? KS2.tickInterval : C.K_SURGE_TICK_MS;
            let guard = 0;
            while (now >= (p.surgeNextTick || 0) && now < p.surgeEnd && guard++ < 8) {
                p.surgeNextTick = (p.surgeNextTick || now) + interval;
                surgeTick(p, ctx);
            }
            if (guard >= 8) p.surgeNextTick = now + interval;
        }
    }

    // ⚡🔮 환수호박 지속 처리
    if (p.amberActive) {
        if (p.isDead) { endAmber(p, ctx); }
        else {
            amberTick(p, now, ctx);

            // 🔊 음파 발사 시점 도달
            if (p.sonicFireAt && now >= p.sonicFireAt) {
                p.sonicFireAt = 0;
                p.sonicChargeUntil = 0;
                if (!p.isDead) fireSonic(p, ctx);
                ctx.io.emit('syncPlayerFull', p);
            }
            // 🛟 경직 잔재 정리
            if (p.sonicChargeUntil && now >= p.sonicChargeUntil && !p.sonicFireAt) {
                p.sonicChargeUntil = 0;
            }
        }
    }
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
    endSurge,
    // ⚡🔮 환수호박
    startAmber,
    endAmber,
    processAmberTrails,
    processWaveChains
};