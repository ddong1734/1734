// 파일명: charLogic/kashimo.js
// ============================================================================
// ⚡ 카시모 하지메 스킬 · 고유 특성 전담
//
//   [고유 특성]
//   · 🔌 반격 전류 : 카시모를 '평타로 때린' 대상이 50 피해를 되받는다.
//                    에넬 · 카시모 본인은 면제. 오크라(황금 포함)의 근접 공격에도 발동.
//   · 🔋 전하 스택 : 카시모가 평타로 적중시킨 대상에게 1칸씩 (최대 4칸).
//                    ✅ [수정] 마지막 적중으로부터 5초마다 1칸씩 감소 (기존 8초).
//
//   [기본 스킬]
//   · 1번 [번개]              : 전방 관통 · 200 · 기절 2초 · 쿨 8초
//   · 1번 [대기를 가르는 번개] : 전하 4스택 대상에게 발사
//                               ✅ [수정] 기절 3초 · 대상을 '관통'해 뒤쪽 적까지 타격
//   · 2번 [주력 방출]         : 4초간 보랏빛 에너지 방출
//                               ✅ [수정] 좌우 범위 확대 + 시전 중 완전 고정
//   · 3번 [환수호박]          : ✅ [수정] 이동속도 1.5배 (기존 1.7배)
//
//   [환수호박 각성]
//   · 전용 1번 [전자파] / 전용 2번 [음파]
//
// 🟣 카시모의 전기는 모두 보라색 계열이며, 화면 흔들림은 발생시키지 않는다.
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
            obj.surgeActive = false; obj.surgeEnd = 0; obj.surgeNextTick = 0;
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

/**
 * ⚡ 공통 : 대상 하나에게 피해 + 감전 경직 + 어그로 + 처치 판정을 적용한다.
 *    (대기를 가르는 번개 · 전자파 · 음파가 공용으로 쓴다)
 */
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

/** ⚡ 공통 : 원형 범위의 모든 적에게 피해 + 감전 경직 (전자파의 각 폭발) */
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

/**
 * ⚡✨ 대기를 가르는 번개 — 시전자의 몸속에서 대상을 향해 뻗어 나간다.
 *    ✅ [수정] 대상을 '관통'한다. 시전자→대상 직선을 따라 두께 안의 모든 적을 타격하고,
 *             대상 너머로도 일정 거리 더 뻗어 나간다. 기절 3초.
 */
function fireSkyBolt(p, target, ctx) {
    const { io, State, Skills, burgessAlive } = ctx;
    const KS1 = Skills.KASHIMO_S1;
    const dmg  = (KS1 && KS1.skyDamage) ? KS1.skyDamage : C.K_SKY_DAMAGE;
    const stun = (KS1 && KS1.skyStun) ? KS1.skyStun : C.K_SKY_STUN;
    const half = ((KS1 && KS1.skyThickness) ? KS1.skyThickness : C.K_SKY_PIERCE_THICKNESS) / 2;
    const over = (KS1 && KS1.skyOvershoot) ? KS1.skyOvershoot : C.K_SKY_PIERCE_OVERSHOOT;

    let obj = target.obj, kind = target.kind, id = target.id;

    // 🔋 지목한 대상의 전하는 전부 소모된다
    obj.kashimoCharge = 0;
    obj.kashimoChargeUntil = 0;
    io.emit('kashimoCharge', { targetKind: kind, targetId: id, charge: 0, until: 0 });

    // ── 관통 직선 계산 (시전자 → 대상 → 그 너머) ────────────────────
    let dx = obj.x - p.x, dy = obj.y - p.y;
    let dist = Math.hypot(dx, dy);
    if (dist < 1) { dx = (p.lastFacing === -1) ? -1 : 1; dy = 0; dist = 1; }
    let ux = dx / dist, uy = dy / dist;
    let reach = dist + over;                       // 대상 너머까지 뻗는다
    let endX = p.x + ux * reach, endY = p.y + uy * reach;

    io.emit('kashimoSkyBolt', {
        ownerId: p.id,
        targetKind: kind, targetId: id,
        originX: p.x, originY: p.y,
        x: obj.x, y: obj.y,
        // ✅ 관통 : 실제 번개가 도달하는 끝점과 두께를 함께 보낸다
        endX: endX, endY: endY, thickness: half * 2,
        duration: C.K_SKY_FX_MS
    });

    // ── 직선(캡슐) 판정 : 두께 안에 들어온 모든 적을 관통 타격 ──────
    const onLine = (o, r) => {
        let rr = r || 0;
        let rx = o.x - p.x, ry = o.y - p.y;
        let s = rx * ux + ry * uy;                 // 진행 방향 투영 거리
        if (s < -rr || s > reach + rr) return false;
        let d = Math.abs(rx * (-uy) + ry * ux);    // 직선과의 수직 거리
        return d <= half + rr;
    };

    let hitSet = {};

    // 적 플레이어
    for (let tid in State.players) {
        if (tid === p.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === p.team) continue;
        if (!onLine(t, 45)) continue;
        if (hitSet['p_' + tid]) continue;
        hitSet['p_' + tid] = 1;
        damageOne(p, t, 'player', tid, dmg, stun, ctx);
    }

    // 몬스터 · 보스
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
    if (typeof burgessAlive === 'function' && burgessAlive()) hitMob(State.burgess, 'burgess', 'burgess');

    for (let i = State.hinbeomMinions.length - 1; i >= 0; i--) {
        let mn = State.hinbeomMinions[i];
        hitMob(mn, 'minion', mn.id);
    }
    for (let i = State.okras.length - 1; i >= 0; i--) {
        let ok = State.okras[i];
        hitMob(ok, 'okra', ok.id);
    }

    // 🛟 지목한 대상이 판정에서 빠졌다면(겹침·오차) 반드시 한 번은 맞힌다
    let mainKey = (kind === 'player') ? ('p_' + id) : (kind + '_' + id);
    if (!hitSet[mainKey]) {
        hitSet[mainKey] = 1;
        damageOne(p, obj, kind, id, dmg, stun, ctx);
    }

    // 🏰 넥서스
    let enemyBase = State.bases[p.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0 && onLine(enemyBase, 150)) {
        if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg);
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
//    ✅ [수정] 좌우 범위 확대 + 시전 중 완전 고정 (이동 · 스킬 · 평타 봉인)
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
    // ✅ 시전 중 완전 고정 — 이동 · 스킬 · 평타가 모두 봉인된다
    p.surgeLockUntil = p.surgeEnd;

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
    p.surgeLockUntil = 0;              // ✅ 고정 해제
    io.emit('kashimoSurgeEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

function surgeTick(p, ctx) {
    const { Skills, State, burgessAlive } = ctx;
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
// ⚡🔮 3번 스킬 : 환수호박 (이동속도 1.5배)
// ============================================================================

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

    p.waveCdEnd = 0;
    p.sonicCdEnd = 0;
    p.sonicChargeUntil = 0;
    p.sonicFireAt = 0;

    // ⚡ 이동속도 1.5배
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
    if (typeof recalcStats === 'function') recalcStats(p);
    io.emit('kashimoAmberEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

function amberTick(p, now, ctx) {
    const { io, Skills, State, emitDamageText, checkPlayerDeath } = ctx;
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
        if (State.amberTrails.length > C.K_AMBER_TRAIL_MAX) {
            State.amberTrails.splice(0, State.amberTrails.length - C.K_AMBER_TRAIL_MAX);
        }

        io.emit('kashimoAmberTrail', { ownerId: p.id, x: p.x, y: p.y, duration: dur });
    }
}

function processAmberTrails(now, ctx) {
    const State = ctx.State;
    if (!Array.isArray(State.amberTrails)) { State.amberTrails = []; return; }
    for (let i = State.amberTrails.length - 1; i >= 0; i--) {
        if (now >= State.amberTrails[i].endAt) State.amberTrails.splice(i, 1);
    }
}

// ============================================================================
// ⚡🔮 환수호박 전용 1번 : 전자파
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

function processWaveChains(now, ctx) {
    const { io, State } = ctx;
    if (!Array.isArray(State.waveChains)) { State.waveChains = []; return; }

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
                duration: C.K_WAVE_FX_MS
            });

            blastAt(owner, cx, cy, w.radius, w.damage, w.stun, ctx, null);

            w.fired++;
            w.nextAt += w.step;
        }
        if (guard >= 8) w.nextAt = now + w.step;

        if (w.fired >= w.count) State.waveChains.splice(i, 1);
    }
}

// ============================================================================
// ⚡🔮 환수호박 전용 2번 : 음파
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
        range: range, angle: halfAng * 2, duration: C.K_SONIC_FX_MS
    });

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
    // 🛟 방출이 끝났는데 고정만 남아 있으면 정리한다
    if (!p.surgeActive && p.surgeLockUntil && now >= p.surgeLockUntil) p.surgeLockUntil = 0;

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
    processWaveChains
};