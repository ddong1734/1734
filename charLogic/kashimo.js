// 파일명: charLogic/kashimo.js
// ============================================================================
// ⚡ 카시모 하지메 스킬 · 고유 특성 전담
//
//   [고유 특성]
//   · 🔌 반격 전류 : 카시모를 '평타로 때린' 대상이 50 피해를 되받는다.
//   · 🔋 전하 스택 : 평타 적중 시 1칸씩 (최대 4칸) · 5초마다 1칸 감소.
//
//   [기본 스킬]
//   · 1번 [번개]              : 전방 관통 · 200 · 기절 2초 · 쿨 8초
//                               🏵️ 여의 : 두께 증가 + 속도 비약적 상승
//   · 1번 [대기를 가르는 번개] : 전하 4스택 대상에게 관통 · 500 · 기절 3초
//   · 2번 [주력 방출]         : ✅ 3초간 방출 · 시전 중 완전 고정
//                               🏵️ 여의 : 좌우 범위 증가
//   · 3번 [환수호박]          : 이동속도 1.3배 · 죽을 때까지 해제 불가
//                               ✅ [수정] 평상시 전류 잔상 없음
//
//   [환수호박 각성]
//   · 평타 : ✅ [수정] 조이스틱 방향으로 '전격 돌진' (기존 순간이동 대체)
//            가로벽은 통과, 세로벽(solid)은 통과 불가.
//            돌진하는 동안에만 전류 잔상이 남는다.
//            경로에 닿은 대상은 150 피해 + 0.5초 기절
//   · 1번 [전자파] : 연쇄 전기폭발
//                    🌩️ 뇌신 : 범위·거리 증가 + 0.3초 뒤 전체 자리 동시 재폭발
//   · 2번 [음파]   : 0.5초 경직 후 부채꼴
//                    🌩️ 뇌신 : 번개 7발 동시 발사 (각 100 · 탄속↓ · 길이↑)
// ============================================================================

const C = require('../server/config.js');

/** 🔌 이 '공격자'는 카시모의 반격 전류에 면역인가 (에넬 · 카시모 본인) */
function isCounterImmune(attacker) {
    if (!attacker || !attacker.characterType) return false;
    return attacker.characterType === 'ENEL' || attacker.characterType === 'KASHIMO';
}

/** 🔌 카시모가 평타에 맞았을 때, 때린 상대(플레이어)에게 전류 반격 */
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

/** 🔌 오크라(황금오크라 포함)가 카시모를 근접 공격했을 때의 반격 */
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

    // ⚔️ 퇴마의 검 : 반격 피해도 몬스터(오크라) 대상이므로 30% 추가 피해
    if (typeof ctx.toemaDmg === 'function') dmg = ctx.toemaDmg(victim, dmg);

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

/** 🔋 전하 스택을 1칸 쌓는다 (감쇠 타이머 5초 재시작) */
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

/** ⏳ 전하 스택 감쇠 처리 (5초마다 1칸) */
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
    if (State.sukuna && State.sukuna.hp > 0 && State.sukuna.state !== 'dead') consider(State.sukuna, 'sukuna', 'sukuna');   // 🔥

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
        // ⚡🌋 주력 방출 중이었다면 강제로 끊는다
        if (obj.surgeActive) {
            obj.surgeActive = false; obj.surgeEnd = 0; obj.surgeNextTick = 0; obj.surgeLockUntil = 0;
            if (ctx && ctx.io) ctx.io.emit('kashimoSurgeEnd', { id: obj.id });
        }
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

/** ⚡ 공통 : 대상 하나에게 피해 + 감전 경직 + 어그로 + 처치 판정 */
function damageOne(p, obj, kind, id, dmg, stun, ctx) {
    const { io, emitDamageText, checkPlayerDeath } = ctx;
    if (!obj) return;

    if (kind === 'player') {
        if (obj.isDead) return;
        let actual = dmg * (1 - (obj.defense || 0));
        obj.hp -= actual;
        emitDamageText(obj.x, obj.y, actual);
        applyShockStun(obj, 'player', stun, ctx);
        if (obj.hp <= 0) { checkPlayerDeath(obj, p.id); return; }
        io.to(id).emit('takeDamage', actual);
        io.emit('syncPlayerFull', obj);
        return;
    }

    if (obj.hp === undefined || obj.hp <= 0) return;
    if (obj.state === 'dead') return;

    // ⚔️ 퇴마의 검 : 여기부터는 전부 몬스터 계열이므로 30% 추가 피해를 적용한다.
    //    (카시모의 평타 · 번개 · 주력 방출 · 전자파 · 음파가 모두 이 함수를 거친다)
    if (typeof ctx.toemaDmg === 'function') dmg = ctx.toemaDmg(p, dmg);

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
    else if (kind === 'sukuna' && typeof ctx.aggroSukuna === 'function') ctx.aggroSukuna(p.id);   // 🔥

    if (obj.hp <= 0) {
        if (kind === 'monster' && typeof ctx.killMonster === 'function') ctx.killMonster(p.id);
        else if (kind === 'hinbeom' && typeof ctx.killHinbeom === 'function') ctx.killHinbeom(p.id);
        else if (kind === 'blackbeard' && typeof ctx.killBlackbeard === 'function') ctx.killBlackbeard(p.id);
        else if (kind === 'burgess' && typeof ctx.killBurgess === 'function') ctx.killBurgess(p.id);
        else if (kind === 'minion' && typeof ctx.killMinion === 'function') ctx.killMinion(obj, p.id);
        else if (kind === 'okra' && typeof ctx.killOkra === 'function') ctx.killOkra(obj, p.id);
        else if (kind === 'sukuna' && typeof ctx.killSukuna === 'function') ctx.killSukuna(p.id);   // 🔥
    }
}

/** ⚡ 공통 : 원형 범위의 모든 적에게 피해 + 감전 경직 */
function blastAt(p, cx, cy, radius, dmg, stun, ctx, hitSet) {
    const { State, burgessAlive } = ctx;
    const inRange = (o, r) => Math.hypot(cx - o.x, cy - o.y) < radius + (r || 0);

    for (let tid in State.players) {
        if (tid === p.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === p.team) continue;
        if (!inRange(t, 45)) continue;
        if (hitSet) { let k = 'p_' + tid; if (hitSet[k]) continue; hitSet[k] = 1; }
        damageOne(p, t, 'player', tid, dmg, stun, ctx);
    }

    const hitMob = (obj, kind, id) => {
        if (!obj || obj.hp === undefined || obj.hp <= 0) return;
        if (obj.state === 'dead') return;
        if (!inRange(obj, obj.radius || 0)) return;
        if (hitSet) { let k = kind + '_' + id; if (hitSet[k]) return; hitSet[k] = 1; }
        damageOne(p, obj, kind, id, dmg, stun, ctx);
    };

    hitMob(State.monster, 'monster', 'monster');
    if (State.hinbeomMinions.length === 0) hitMob(State.hinbeom, 'hinbeom', 'hinbeom');
    hitMob(State.blackbeard, 'blackbeard', 'blackbeard');
    if (State.sukuna) hitMob(State.sukuna, 'sukuna', 'sukuna');   // 🔥 헤이안 스쿠나
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
    if (enemyBase && enemyBase.hp > 0 && Math.hypot(cx - enemyBase.x, cy - enemyBase.y) < radius + 150) {
        if (!hitSet || !hitSet['base']) {
            if (hitSet) hitSet['base'] = 1;
            if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg);
        }
    }
}

/** ⚡✨ 대기를 가르는 번개 — 관통 · 기절 3초 */
function fireSkyBolt(p, target, ctx) {
    const { io, State, Skills, burgessAlive } = ctx;
    const KS1 = Skills.KASHIMO_S1;
    const dmg  = (KS1 && KS1.skyDamage) ? KS1.skyDamage : C.K_SKY_DAMAGE;
    const stun = (KS1 && KS1.skyStun) ? KS1.skyStun : C.K_SKY_STUN;
    const half = ((KS1 && KS1.skyThickness) ? KS1.skyThickness : C.K_SKY_PIERCE_THICKNESS) / 2;
    const over = (KS1 && KS1.skyOvershoot) ? KS1.skyOvershoot : C.K_SKY_PIERCE_OVERSHOOT;

    let obj = target.obj, kind = target.kind, id = target.id;

    obj.kashimoCharge = 0;
    obj.kashimoChargeUntil = 0;
    io.emit('kashimoCharge', { targetKind: kind, targetId: id, charge: 0, until: 0 });

    let dx = obj.x - p.x, dy = obj.y - p.y;
    let dist = Math.hypot(dx, dy);
    if (dist < 1) { dx = (p.lastFacing === -1) ? -1 : 1; dy = 0; dist = 1; }
    let ux = dx / dist, uy = dy / dist;
    let reach = dist + over;
    let endX = p.x + ux * reach, endY = p.y + uy * reach;

    io.emit('kashimoSkyBolt', {
        ownerId: p.id,
        targetKind: kind, targetId: id,
        originX: p.x, originY: p.y,
        x: obj.x, y: obj.y,
        endX: endX, endY: endY, thickness: half * 2,
        duration: C.K_SKY_FX_MS
    });

    const onLine = (o, r) => {
        let rr = r || 0;
        let rx = o.x - p.x, ry = o.y - p.y;
        let s = rx * ux + ry * uy;
        if (s < -rr || s > reach + rr) return false;
        let d = Math.abs(rx * (-uy) + ry * ux);
        return d <= half + rr;
    };

    let hitSet = {};

    for (let tid in State.players) {
        if (tid === p.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === p.team) continue;
        if (!onLine(t, 45)) continue;
        if (hitSet['p_' + tid]) continue;
        hitSet['p_' + tid] = 1;
        damageOne(p, t, 'player', tid, dmg, stun, ctx);
    }

    const hitMob = (o, k, i2) => {
        if (!o || o.hp === undefined || o.hp <= 0) return;
        if (o.state === 'dead') return;
        if (!onLine(o, o.radius || 0)) return;
        let key = k + '_' + i2;
        if (hitSet[key]) return;
        hitSet[key] = 1;
        damageOne(p, o, k, i2, dmg, stun, ctx);
    };

    hitMob(State.monster, 'monster', 'monster');
    if (State.hinbeomMinions.length === 0) hitMob(State.hinbeom, 'hinbeom', 'hinbeom');
    hitMob(State.blackbeard, 'blackbeard', 'blackbeard');
    if (State.sukuna) hitMob(State.sukuna, 'sukuna', 'sukuna');   // 🔥 헤이안 스쿠나
    if (typeof burgessAlive === 'function' && burgessAlive()) hitMob(State.burgess, 'burgess', 'burgess');

    for (let i = State.hinbeomMinions.length - 1; i >= 0; i--) {
        let mn = State.hinbeomMinions[i];
        hitMob(mn, 'minion', mn.id);
    }
    for (let i = State.okras.length - 1; i >= 0; i--) {
        let ok = State.okras[i];
        hitMob(ok, 'okra', ok.id);
    }

    // 🛟 지목한 대상이 판정에서 빠졌다면 반드시 한 번은 맞힌다
    let mainKey = (kind === 'player') ? ('p_' + id) : (kind + '_' + id);
    if (!hitSet[mainKey]) {
        hitSet[mainKey] = 1;
        damageOne(p, obj, kind, id, dmg, stun, ctx);
    }

    let enemyBase = State.bases[p.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0 && onLine(enemyBase, 150)) {
        if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg);
    }
}

/**
 * ⚡ 번개 투사체 하나를 발사한다.
 *    🏵️ 여의 장착 시 두께 · 속도가 강화된다.
 *    dirX / dirY 를 주면 그 방향으로, 없으면 dir(좌우)로 날아간다.
 *    opts 로 damage / speed / life / long 을 덮어쓸 수 있다 (🌩️ 음파 번개 전용).
 */
function spawnBolt(p, dirX, dirY, ctx, opts) {
    const { Skills, addProjectile, getNextProjId } = ctx;
    const KS1 = Skills.KASHIMO_S1;
    const yeoui = !!p.hasYeoui;
    opts = opts || {};

    // 🏵️ 여의 : 두께 · 속도 강화 (사거리 유지를 위해 life 를 줄인다)
    let speed = yeoui
        ? ((KS1 && KS1.yeouiSpeed) ? KS1.yeouiSpeed : C.K_BOLT_YEOUI_SPEED)
        : ((KS1 && KS1.speed) ? KS1.speed : C.K_BOLT_SPEED);
    let life = yeoui
        ? ((KS1 && KS1.yeouiLife) ? KS1.yeouiLife : C.K_BOLT_YEOUI_LIFE)
        : ((KS1 && KS1.life) ? KS1.life : C.K_BOLT_LIFE);
    const hitR = yeoui
        ? ((KS1 && KS1.yeouiHitR) ? KS1.yeouiHitR : C.K_BOLT_YEOUI_HITR)
        : ((KS1 && KS1.hitR) ? KS1.hitR : C.K_BOLT_HITR);
    const edgeR = yeoui
        ? ((KS1 && KS1.yeouiEdgeR) ? KS1.yeouiEdgeR : C.K_BOLT_YEOUI_EDGER)
        : ((KS1 && KS1.edgeR) ? KS1.edgeR : C.K_BOLT_EDGER);

    let dmg = ((KS1 && KS1.damage) ? KS1.damage : C.K_BOLT_DAMAGE) + Math.round((p.bonusDamage || 0) * 0.5);

    // 🌩️ 음파 번개 전용 : 피해 · 탄속 · 수명 덮어쓰기
    if (Number.isFinite(opts.damage)) dmg = opts.damage;
    if (Number.isFinite(opts.speed)) speed = opts.speed;
    if (Number.isFinite(opts.life)) life = opts.life;

    // 방향 정규화
    let ux = dirX, uy = dirY;
    let len = Math.hypot(ux, uy);
    if (!Number.isFinite(len) || len < 0.001) { ux = 1; uy = 0; len = 1; }
    ux /= len; uy /= len;

    addProjectile({
        id: getNextProjId(), team: p.team, type: 'kashimo_bolt', ownerId: p.id,
        x: p.x + ux * 70, y: p.y - 10 + uy * 70,
        vx: ux * speed, vy: uy * speed,
        life: life,
        damage: dmg,
        hitR: hitR, edgeR: edgeR,
        canHitBase: true,
        piercing: true, hitIds: [],
        kashimoStun: (KS1 && KS1.stun) ? KS1.stun : C.K_BOLT_STUN,
        // 🏵️ 렌더러가 굵기를 키울 수 있도록 표시
        yeoui: yeoui,
        // 🌩️ 음파 번개 : 탄환 길이를 더 길게 그린다
        longBolt: !!opts.long
    });
}

/** ⚡ 번개 — 전방으로 한 줄기 (관통) */
function fireStraightBolt(p, dir, ctx) {
    const { io } = ctx;
    spawnBolt(p, dir, 0, ctx);
    io.emit('kashimoBoltCast', { id: p.id, x: p.x, y: p.y, dir: dir, yeoui: !!p.hasYeoui });
}

// ============================================================================
// ⚡🌋 2번 스킬 : 주력 방출 (✅ 지속시간 3초)
//    🏵️ 여의 장착 시 좌우 범위가 늘어난다.
// ============================================================================

/** 🏵️ 현재 주력 방출의 좌우 폭을 구한다 */
function getSurgeWidth(p, ctx) {
    const KS2 = ctx.Skills.KASHIMO_S2;
    if (p.hasYeoui) {
        return (KS2 && KS2.yeouiWidth) ? KS2.yeouiWidth : C.K_SURGE_YEOUI_WIDTH;
    }
    return (KS2 && KS2.width) ? KS2.width : C.K_SURGE_WIDTH;
}

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
    p.surgeLockUntil = p.surgeEnd;      // ✅ 시전 중 완전 고정

    io.emit('kashimoSurgeStart', {
        id: p.id, x: p.x, y: p.y,
        duration: dur,
        width: getSurgeWidth(p, ctx),                                   // 🏵️ 여의 반영
        height: (KS2 && KS2.height) ? KS2.height : C.K_SURGE_HEIGHT,
        yeoui: !!p.hasYeoui
    });
    io.emit('syncPlayerFull', p);
}

function endSurge(p, ctx) {
    if (!p || !p.surgeActive) return;
    const { io } = ctx;
    p.surgeActive = false;
    p.surgeEnd = 0;
    p.surgeNextTick = 0;
    p.surgeLockUntil = 0;
    io.emit('kashimoSurgeEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

function surgeTick(p, ctx) {
    const { Skills, State, burgessAlive } = ctx;
    const KS2 = Skills.KASHIMO_S2;

    const dmg   = (KS2 && KS2.tickDamage) ? KS2.tickDamage : C.K_SURGE_TICK_DMG;
    const stun  = (KS2 && KS2.stun) ? KS2.stun : C.K_SURGE_STUN;
    const halfW = getSurgeWidth(p, ctx) / 2;                            // 🏵️ 여의 반영
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
        damageOne(p, t, 'player', tid, dmg, stun, ctx);
    }

    const hitMob = (obj, kind, id) => {
        if (!obj || obj.hp === undefined || obj.hp <= 0) return;
        if (obj.state === 'dead') return;
        if (!inRange(obj, obj.radius || 0)) return;
        damageOne(p, obj, kind, id, dmg, stun, ctx);
    };

    hitMob(State.monster, 'monster', 'monster');
    if (State.hinbeomMinions.length === 0) hitMob(State.hinbeom, 'hinbeom', 'hinbeom');
    hitMob(State.blackbeard, 'blackbeard', 'blackbeard');
    if (State.sukuna) hitMob(State.sukuna, 'sukuna', 'sukuna');   // 🔥 헤이안 스쿠나
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
// ⚡🔮 3번 스킬 : 환수호박 (이동속도 1.3배)
//    ✅ [수정] 평상시 전류 잔상을 만들지 않는다. (돌진 중에만 남는다)
// ============================================================================

function startAmber(p, ctx) {
    const { io, Skills, recalcStats } = ctx;
    const KS3 = Skills.KASHIMO_S3;
    let now = Date.now();

    p.amberActive = true;
    p.amberStart = now;
    p.amberNextDrain = now + ((KS3 && KS3.drainInterval) ? KS3.drainInterval : C.K_AMBER_DRAIN_MS);
    p.amberCdEnd = now + ((KS3 && KS3.cd) ? KS3.cd : C.K_AMBER_COOLDOWN);

    p.waveCdEnd = 0;
    p.sonicCdEnd = 0;
    p.sonicChargeUntil = 0;
    p.sonicFireAt = 0;
    p.dashCdEnd = 0;                      // ⚡🔮 전격 돌진 준비
    p.amberDashUntil = 0;

    // ⚡ 이동속도 1.3배
    if (typeof recalcStats === 'function') recalcStats(p);
    p.speedMult = (p.speedMult || 1.0) * ((KS3 && KS3.speedMult) ? KS3.speedMult : C.K_AMBER_SPEED_MULT);

    io.emit('kashimoAmberStart', { id: p.id, x: p.x, y: p.y });
    io.emit('syncPlayerFull', p);
}

function endAmber(p, ctx) {
    if (!p || !p.amberActive) return;
    const { io, recalcStats } = ctx;
    p.amberActive = false;
    p.amberNextDrain = 0;
    p.sonicChargeUntil = 0;
    p.sonicFireAt = 0;
    p.amberCdEnd = 0;
    p.dashCdEnd = 0;
    p.amberDashUntil = 0;
    if (typeof recalcStats === 'function') recalcStats(p);
    io.emit('kashimoAmberEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

/**
 * ⚡🔮 환수호박 지속 처리 (체력 소모만 담당)
 *    ✅ [수정] 평상시 전류 잔상 생성 로직을 제거했다.
 */
function amberTick(p, now, ctx) {
    const { io, Skills, emitDamageText, checkPlayerDeath } = ctx;
    const KS3 = Skills.KASHIMO_S3;

    const interval = (KS3 && KS3.drainInterval) ? KS3.drainInterval : C.K_AMBER_DRAIN_MS;
    const pct = (KS3 && KS3.drainPct) ? KS3.drainPct : C.K_AMBER_DRAIN_PCT;

    let guard = 0;
    while (now >= (p.amberNextDrain || 0) && guard++ < 8) {
        p.amberNextDrain = (p.amberNextDrain || now) + interval;
        let loss = (p.maxHp || 0) * pct;
        if (Number.isFinite(loss) && loss > 0) {
            p.hp -= loss;
            emitDamageText(p.x, p.y, loss);
            if (p.hp <= 0) { checkPlayerDeath(p, null); return; }
            io.to(p.id).emit('takeDamage', loss);
        }
    }
    if (guard >= 8) p.amberNextDrain = now + interval;
}

function processAmberTrails(now, ctx) {
    const State = ctx.State;
    if (!Array.isArray(State.amberTrails)) { State.amberTrails = []; return; }
    for (let i = State.amberTrails.length - 1; i >= 0; i--) {
        if (now >= State.amberTrails[i].endAt) State.amberTrails.splice(i, 1);
    }
}

// ============================================================================
// ⚡🔮 [수정] 환수호박 평타 = 전격 돌진 (대시)
//    · 조이스틱 방향으로 아주 빠르게, 기존 순간이동보다 더 멀리 돌진한다.
//    · 가로벽(발판)은 통과할 수 있지만, 세로벽(solid)은 통과할 수 없다.
//    · 돌진하는 동안 전류 잔상이 계속 남는다.
//    · 경로에 닿은 대상은 150 피해 + 0.5초 기절 (한 대상당 1회)
// ============================================================================

const GROUND_Y = 2000;
const PLAYER_HALF_W = 45;
const PLAYER_HALF_H = 45;

/**
 * 🧱 세로벽(solid) 통과 여부 판정.
 *    출발 → 도착 경로를 잘게 나눠 진행하다가, solid 발판에 부딪히면
 *    그 직전 지점에서 멈춘다. (가로 발판은 solid 가 아니므로 그대로 통과한다)
 */
function resolveDashPath(fromX, fromY, ux, uy, dist, ctx) {
    // 서버는 맵 발판 데이터를 GameData 로 갖고 있지 않으므로,
    // config 에 명시된 '세로벽' 좌표를 직접 사용한다.
    // (data.js 의 Platforms 중 solid:true 인 것들과 동일해야 한다)
    const WALLS = ctx.SOLID_WALLS || [];

    const STEP = 8;
    let steps = Math.max(1, Math.ceil(dist / STEP));
    let lastX = fromX, lastY = fromY;

    for (let i = 1; i <= steps; i++) {
        let t = (dist * i) / steps;
        let nx = fromX + ux * t;
        let ny = fromY + uy * t;

        // 🧱 세로벽에 겹치는가
        let blocked = false;
        for (let w = 0; w < WALLS.length; w++) {
            let wall = WALLS[w];
            if (nx + PLAYER_HALF_W <= wall.x) continue;
            if (nx - PLAYER_HALF_W >= wall.x + wall.w) continue;
            if (ny + PLAYER_HALF_H <= wall.y) continue;
            if (ny - PLAYER_HALF_H >= wall.y + wall.h) continue;
            blocked = true;
            break;
        }
        if (blocked) break;

        lastX = nx; lastY = ny;
    }

    return { x: lastX, y: lastY };
}

/**
 * ⚡🔮 돌진 경로(선분) 위의 모든 적에게 피해 + 기절
 *    한 대상은 한 번만 맞는다.
 */
function dashLineHit(p, fromX, fromY, toX, toY, radius, dmg, stun, ctx) {
    const { State, burgessAlive } = ctx;

    let dx = toX - fromX, dy = toY - fromY;
    let len = Math.hypot(dx, dy);
    if (len < 1) { dx = 1; dy = 0; len = 1; }
    let ux = dx / len, uy = dy / len;

    const onLine = (o, r) => {
        let rr = r || 0;
        let rx = o.x - fromX, ry = o.y - fromY;
        let s = rx * ux + ry * uy;
        if (s < -rr || s > len + rr) return false;
        let d = Math.abs(rx * (-uy) + ry * ux);
        return d <= radius + rr;
    };

    let hitSet = {};

    for (let tid in State.players) {
        if (tid === p.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === p.team) continue;
        if (!onLine(t, 45)) continue;
        if (hitSet['p_' + tid]) continue;
        hitSet['p_' + tid] = 1;
        damageOne(p, t, 'player', tid, dmg, stun, ctx);
    }

    const hitMob = (o, k, i2) => {
        if (!o || o.hp === undefined || o.hp <= 0) return;
        if (o.state === 'dead') return;
        if (!onLine(o, o.radius || 0)) return;
        let key = k + '_' + i2;
        if (hitSet[key]) return;
        hitSet[key] = 1;
        damageOne(p, o, k, i2, dmg, stun, ctx);
    };

    hitMob(State.monster, 'monster', 'monster');
    if (State.hinbeomMinions.length === 0) hitMob(State.hinbeom, 'hinbeom', 'hinbeom');
    hitMob(State.blackbeard, 'blackbeard', 'blackbeard');
    if (State.sukuna) hitMob(State.sukuna, 'sukuna', 'sukuna');   // 🔥 헤이안 스쿠나
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
    if (enemyBase && enemyBase.hp > 0 && onLine(enemyBase, 150)) {
        if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg);
    }
}

/** ⚡🔮 환수호박 평타 → 전격 돌진 */
function doAmberDash(p, data, ctx) {
    const { io, Skills, State } = ctx;
    const KS3 = Skills.KASHIMO_S3;
    let now = Date.now();

    if (now < (p.dashCdEnd || 0)) return;
    p.dashCdEnd = now + ((KS3 && KS3.dashCooldown) ? KS3.dashCooldown : C.K_ADASH_COOLDOWN);

    // 🕹️ 조이스틱 방향 (없으면 바라보는 방향)
    let ux = Number.isFinite(data.dirX) ? data.dirX : 0;
    let uy = Number.isFinite(data.dirY) ? data.dirY : 0;
    let len = Math.hypot(ux, uy);
    if (!Number.isFinite(len) || len < 0.05) {
        ux = (p.lastFacing === -1) ? -1 : 1; uy = 0; len = 1;
    }
    ux /= len; uy /= len;

    const dist = (KS3 && KS3.dashDist) ? KS3.dashDist : C.K_ADASH_DIST;
    const dur  = (KS3 && KS3.dashDuration) ? KS3.dashDuration : C.K_ADASH_DURATION;

    let fromX = p.x, fromY = p.y;
    // 🧱 세로벽은 통과 불가 — 경로를 따라가며 막히면 멈춘다
    let dest = resolveDashPath(fromX, fromY, ux, uy, dist, ctx);

    // 🌍 월드 경계 클램프
    let wWidth = (typeof window !== "undefined" && window.WORLD_WIDTH) ? window.WORLD_WIDTH : 50000;
    dest.x = Math.max(50, Math.min(wWidth - 50, dest.x));
    // 지면 아래로는 내려갈 수 없다
    if (dest.y > GROUND_Y - PLAYER_HALF_H) dest.y = GROUND_Y - PLAYER_HALF_H;

    // ⚡ 서버 상태 : 돌진 중임을 기록한다 (클라 물리가 직접 이동시킨다)
    p.amberDashUntil = now + dur;
    p.amberDashDirX = ux;
    p.amberDashDirY = uy;
    p.knockbackForce = 0;

    // ⚡ 돌진 궤적 (출발 → 도착) — 전류 잔상 이펙트
    io.emit('kashimoAmberDash', {
        ownerId: p.id,
        fromX: fromX, fromY: fromY,
        toX: dest.x, toY: dest.y,
        dirX: ux, dirY: uy,
        duration: dur,
        fxDuration: C.K_ADASH_FX_MS
    });

    // 💥 경로 위의 적에게 피해 (150 · 기절 0.5초)
    const dDmg = (KS3 && KS3.dashDamage) ? KS3.dashDamage : C.K_ADASH_DAMAGE;
    const dStun = (KS3 && KS3.dashStun) ? KS3.dashStun : C.K_ADASH_STUN;
    const dR = (KS3 && KS3.dashRadius) ? KS3.dashRadius : C.K_ADASH_RADIUS;

    dashLineHit(p, fromX, fromY, dest.x, dest.y, dR, dDmg, dStun, ctx);

    io.emit('syncPlayerFull', p);
}

// ============================================================================
// ⚡🔮 환수호박 전용 1번 : 전자파
//    🌩️ 뇌신 : 범위·거리 증가 + 마지막 폭발 0.3초 뒤 전체 자리 동시 재폭발
// ============================================================================

function fireWave(p, dir, ctx) {
    const { io, Skills, State } = ctx;
    const KA1 = Skills.KASHIMO_A1;
    let now = Date.now();
    const raijin = !!p.hasRaijin;

    // 🌩️ 뇌신 : 범위 · 거리 증가
    const range = raijin
        ? ((KA1 && KA1.raijinRange) ? KA1.raijinRange : C.K_WAVE_RAIJIN_RANGE)
        : ((KA1 && KA1.range) ? KA1.range : C.K_WAVE_RANGE);
    const radius = raijin
        ? ((KA1 && KA1.raijinRadius) ? KA1.raijinRadius : C.K_WAVE_RAIJIN_RADIUS)
        : ((KA1 && KA1.radius) ? KA1.radius : C.K_WAVE_RADIUS);

    const count = (KA1 && KA1.count) ? KA1.count : C.K_WAVE_COUNT;
    const step  = (KA1 && KA1.stepInterval) ? KA1.stepInterval : C.K_WAVE_STEP_MS;
    const dmg = ((KA1 && KA1.damage) ? KA1.damage : C.K_WAVE_DAMAGE) + Math.round((p.bonusDamage || 0) * 0.5);
    const stun = (KA1 && KA1.stun) ? KA1.stun : C.K_WAVE_STUN;

    const startX = p.x + dir * 90;
    const gap = range / count;

    State.waveChains.push({
        ownerId: p.id, team: p.team,
        dir: dir,
        baseX: startX, baseY: p.y - 10,
        gap: gap, radius: radius, damage: dmg, stun: stun,
        count: count, fired: 0,
        nextAt: now,
        step: step,
        // 🌩️ 뇌신 : 폭발 좌표를 모았다가 0.3초 뒤 한꺼번에 재폭발시킨다
        raijin: raijin,
        spots: []
    });

    io.emit('kashimoWaveCast', {
        id: p.id, x: p.x, y: p.y, dir: dir,
        range: range, radius: radius, count: count, step: step,
        raijin: raijin
    });
}

function processWaveChains(now, ctx) {
    const { io, State } = ctx;
    const KA1 = ctx.Skills.KASHIMO_A1;

    if (!Array.isArray(State.waveChains)) State.waveChains = [];
    if (!Array.isArray(State.waveEchoes)) State.waveEchoes = [];

    // ── 연쇄 폭발 진행 ───────────────────────────────────────────────
    for (let i = State.waveChains.length - 1; i >= 0; i--) {
        let w = State.waveChains[i];
        let owner = State.players[w.ownerId];

        if (!owner) { State.waveChains.splice(i, 1); continue; }

        let guard = 0;
        while (now >= w.nextAt && w.fired < w.count && guard++ < 8) {
            let cx = w.baseX + w.dir * (w.gap * w.fired);
            let cy = w.baseY;

            io.emit('kashimoWaveBlast', {
                ownerId: w.ownerId, x: cx, y: cy,
                radius: w.radius, index: w.fired,
                duration: C.K_WAVE_FX_MS,
                raijin: !!w.raijin
            });

            blastAt(owner, cx, cy, w.radius, w.damage, w.stun, ctx, null);

            // 🌩️ 뇌신 : 폭발 자리를 기록해 둔다
            if (w.raijin) w.spots.push({ x: cx, y: cy });

            w.fired++;
            w.nextAt += w.step;
        }
        if (guard >= 8) w.nextAt = now + w.step;

        if (w.fired >= w.count) {
            // 🌩️ 뇌신 : 마지막 폭발이 끝나고 0.3초 뒤 전체 자리에서 동시 재폭발
            if (w.raijin && w.spots.length > 0) {
                const delay = (KA1 && KA1.raijinEchoDelay) ? KA1.raijinEchoDelay : C.K_WAVE_RAIJIN_ECHO_DELAY;
                State.waveEchoes.push({
                    ownerId: w.ownerId, team: w.team,
                    spots: w.spots,
                    radius: w.radius, damage: w.damage, stun: w.stun,
                    fireAt: now + delay
                });
            }
            State.waveChains.splice(i, 1);
        }
    }

    // ── 🌩️ 뇌신 재폭발(에코) 처리 ───────────────────────────────────
    for (let i = State.waveEchoes.length - 1; i >= 0; i--) {
        let e = State.waveEchoes[i];
        if (now < e.fireAt) continue;

        let owner = State.players[e.ownerId];
        State.waveEchoes.splice(i, 1);
        if (!owner) continue;

        // 같은 대상이 여러 폭발에 중복으로 맞지 않도록 한 번만 판정한다
        let hitSet = {};
        for (let s = 0; s < e.spots.length; s++) {
            let sp = e.spots[s];
            io.emit('kashimoWaveEcho', {
                ownerId: e.ownerId, x: sp.x, y: sp.y,
                radius: e.radius, index: s,
                duration: C.K_WAVE_FX_MS
            });
            blastAt(owner, sp.x, sp.y, e.radius, e.damage, e.stun, ctx, hitSet);
        }
    }
}

// ============================================================================
// ⚡🔮 환수호박 전용 2번 : 음파 (경직 0.5초)
//    🌩️ 뇌신 : 번개 7발 동시 발사
//       ✅ [수정] 각 100 피해 · 탄속 감소 · 탄환 길이 증가
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

function fireSonic(p, ctx) {
    const { io, Skills, State, burgessAlive } = ctx;
    const KA2 = Skills.KASHIMO_A2;

    const dir = (p.sonicDir === -1) ? -1 : 1;
    const range = (KA2 && KA2.range) ? KA2.range : C.K_SONIC_RANGE;
    const halfAng = ((KA2 && KA2.angle) ? KA2.angle : C.K_SONIC_ANGLE) / 2;
    const dmg = ((KA2 && KA2.damage) ? KA2.damage : C.K_SONIC_DAMAGE) + Math.round((p.bonusDamage || 0) * 0.5);
    const stun = (KA2 && KA2.stun) ? KA2.stun : C.K_SONIC_STUN;

    io.emit('kashimoSonicFire', {
        ownerId: p.id, x: p.x, y: p.y, dir: dir,
        range: range, angle: halfAng * 2, duration: C.K_SONIC_FX_MS,
        raijin: !!p.hasRaijin
    });

    // 🌩️ 뇌신 : 음파 범위로 번개 7발을 부채꼴로 동시 발사한다
    //    ✅ [수정] 각 100 피해 · 탄속 감소 · 탄환 길이 증가
    if (p.hasRaijin) {
        const n = (KA2 && KA2.raijinBolts) ? KA2.raijinBolts : C.K_SONIC_RAIJIN_BOLTS;
        const bDmg = (KA2 && KA2.raijinBoltDamage) ? KA2.raijinBoltDamage : C.K_SONIC_RAIJIN_BOLT_DAMAGE;
        const bSpd = (KA2 && KA2.raijinBoltSpeed) ? KA2.raijinBoltSpeed : C.K_SONIC_RAIJIN_BOLT_SPEED;
        const bLife = (KA2 && KA2.raijinBoltLife) ? KA2.raijinBoltLife : C.K_SONIC_RAIJIN_BOLT_LIFE;
        for (let i = 0; i < n; i++) {
            // -halfAng ~ +halfAng 사이를 균등 분할
            let t = (n === 1) ? 0.5 : (i / (n - 1));
            let a = -halfAng + (halfAng * 2) * t;
            // 전방 벡터는 (dir, 0) — 이를 a 만큼 회전시킨다
            let bx = Math.cos(a) * dir;
            let by = Math.sin(a);
            spawnBolt(p, bx, by, ctx, { damage: bDmg, speed: bSpd, life: bLife, long: true });
        }
    }

    const inCone = (o, r) => {
        let rr = r || 0;
        let dx = o.x - p.x, dy = o.y - p.y;
        let dist = Math.hypot(dx, dy);
        if (dist > range + rr) return false;
        if (dist < 1) return true;
        let cosT = (dx * dir) / dist;
        let allow = Math.cos(Math.min(Math.PI, halfAng + Math.atan2(rr, Math.max(1, dist))));
        return cosT >= allow;
    };

    for (let tid in State.players) {
        if (tid === p.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === p.team) continue;
        if (!inCone(t, 45)) continue;
        damageOne(p, t, 'player', tid, dmg, stun, ctx);
    }

    const hitMob = (obj, kind, id) => {
        if (!obj || obj.hp === undefined || obj.hp <= 0) return;
        if (obj.state === 'dead') return;
        if (!inCone(obj, obj.radius || 0)) return;
        damageOne(p, obj, kind, id, dmg, stun, ctx);
    };

    hitMob(State.monster, 'monster', 'monster');
    if (State.hinbeomMinions.length === 0) hitMob(State.hinbeom, 'hinbeom', 'hinbeom');
    hitMob(State.blackbeard, 'blackbeard', 'blackbeard');
    if (State.sukuna) hitMob(State.sukuna, 'sukuna', 'sukuna');   // 🔥 헤이안 스쿠나
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

    // ⚡🌋 주력 방출 중에는 어떤 스킬도 쓸 수 없다 (완전 고정)
    if (now < (p.surgeLockUntil || 0)) return;

    // ⚡🔮 환수호박 상태에서는 1·2번이 전용 스킬로 바뀐다
    if (p.amberActive) {
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

    // ⚡🔮 3번 : 환수호박
    if (data.type === 3) {
        const KS3 = Skills.KASHIMO_S3;
        if (!KS3) return;
        if (p.amberActive) return;
        if (now < (p.amberCdEnd || 0)) return;
        startAmber(p, ctx);
        return;
    }
}

/**
 * 🗡️ 평타 진입점 (index.js 의 handleBasicAttack 이 카시모일 때 먼저 호출한다)
 *    ⚡🔮 환수호박 중이라면 평타 대신 전격 돌진이 나간다.
 *    @returns true 를 반환하면 일반 평타 처리를 건너뛴다
 */
function tryAmberDash(p, data, ctx) {
    if (!p || p.characterType !== 'KASHIMO') return false;
    if (!p.amberActive) return false;
    if (p.isDead) return false;
    let now = Date.now();
    if (now < (p.surgeLockUntil || 0)) return true;      // 방출 중엔 아무것도 안 나간다
    if (now < (p.sonicChargeUntil || 0)) return true;    // 음파 경직 중에도 마찬가지

    doAmberDash(p, data || {}, ctx);
    return true;
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
    if (!p.surgeActive && p.surgeLockUntil && now >= p.surgeLockUntil) p.surgeLockUntil = 0;

    // ⚡🔮 돌진 만료 정리
    if (p.amberDashUntil && now >= p.amberDashUntil) p.amberDashUntil = 0;

    // ⚡🔮 환수호박 지속 처리
    if (p.amberActive) {
        if (p.isDead) { endAmber(p, ctx); }
        else {
            amberTick(p, now, ctx);

            if (p.sonicFireAt && now >= p.sonicFireAt) {
                p.sonicFireAt = 0;
                p.sonicChargeUntil = 0;
                if (!p.isDead) fireSonic(p, ctx);
                ctx.io.emit('syncPlayerFull', p);
            }
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
    startAmber,
    endAmber,
    processAmberTrails,
    processWaveChains,
    // ⚡🔮 환수호박 평타 = 전격 돌진
    tryAmberDash,
    doAmberDash
};