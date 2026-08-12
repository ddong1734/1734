// 파일명: server/combat.js
// ============================================================================
// ⚔️ 전투 처리
//
//   · 🔥 화상(도트) : addBurn / clearBurns / processBurns
//   · ⚔️ 세계를 가르는 참격 : 0.5초 경직 후 방어 무시 관통 참격
//   · 🗡️ 평타 : handleBasicAttack (환수호박 중인 카시모는 전격 돌진)
//
// 🔗 순환 참조는 index.js 가 wire() 로 나중에 주입해 해결한다.
// ============================================================================

let io, C, S, State, Damage, Bosses, Kashimo;
let emitDamageText, isNum, getMinion, serverContext;
let applyBaseDamage, checkPlayerDeath;

/** 🔗 index.js 가 모든 모듈을 만든 뒤 호출한다 */
function wire(d) {
    io = d.io; C = d.C; S = d.S; State = d.State;
    Damage = d.Damage; Bosses = d.Bosses; Kashimo = d.Kashimo;
    emitDamageText = d.emitDamageText; isNum = d.isNum; getMinion = d.getMinion;
    serverContext = d.serverContext;
    applyBaseDamage = d.applyBaseDamage; checkPlayerDeath = d.checkPlayerDeath;
}

// ============================================================================
// 🔥 화상(도트) 처리
// ============================================================================
function addBurn(key, entity, dps, dur, ownerId) {
    if (!entity) return;
    let now = Date.now();
    if (!State.burnMap.has(key)) State.burnMap.set(key, []);
    State.burnMap.get(key).push({ dps: dps, endTime: now + dur, ownerId: ownerId, nextTick: now + 1000 });
    entity.burningUntil = Math.max(entity.burningUntil || 0, now + dur);
    io.emit('setBurn', { id: key, until: entity.burningUntil });
}

function clearBurns(key, entity) { State.burnMap.delete(key); if (entity) entity.burningUntil = 0; }

/** 화상 키 → { entity, kind } */
function resolveBurnKey(key) {
    if (key === 'monster') return { e: State.monster, kind: 'monster' };
    if (key === 'hinbeom') return { e: State.hinbeom, kind: 'hinbeom' };
    if (key === 'blackbeard') return { e: State.blackbeard, kind: 'blackbeard' };
    if (key === 'burgess') return { e: State.burgess, kind: 'burgess' };
    if (typeof key === 'string' && key.startsWith('minion_')) return { e: getMinion(parseInt(key.slice(7))), kind: 'minion' };
    if (typeof key === 'string' && key.startsWith('okra_')) return { e: S.getOkra(parseInt(key.slice(5))), kind: 'okra' };
    return { e: State.players[key], kind: 'player' };
}

function processBurns(now) {
    for (let [key, stacks] of State.burnMap) {
        let { e: entity, kind } = resolveBurnKey(key);
        if (!entity || entity.hp <= 0 || (kind === 'player' && entity.isDead)) {
            State.burnMap.delete(key); if (entity) entity.burningUntil = 0; continue;
        }

        let dmg = 0, lastOwner = null;
        for (let i = stacks.length - 1; i >= 0; i--) {
            let b = stacks[i];
            let guard = 0;
            while (now >= b.nextTick && b.nextTick <= b.endTime && guard++ < 64) {
                dmg += b.dps; lastOwner = b.ownerId; b.nextTick += 1000;
            }
            if (guard >= 64) b.nextTick = now + 1000;
            if (now >= b.endTime) stacks.splice(i, 1);
        }
        if (stacks.length === 0) { State.burnMap.delete(key); entity.burningUntil = 0; }
        if (dmg <= 0) continue;

        if (kind === 'player') {
            let actual = dmg * (1 - (entity.defense || 0));
            entity.hp -= actual;
            emitDamageText(entity.x, entity.y, actual);
            io.to(key).emit('takeDamage', actual);
            if (entity.hp <= 0) checkPlayerDeath(entity, lastOwner);
            continue;
        }
        if (kind === 'hinbeom' && (State.hinbeom.state === 'dead' || State.hinbeomMinions.length > 0)) continue;
        if (kind === 'blackbeard' && State.blackbeard.state === 'dead') continue;

        // ⚔️ 퇴마의 검 : 화상 지속피해도 몬스터에게는 30% 추가 적용된다.
        //    (lastOwner = 마지막으로 화상을 건 플레이어)
        let burnMobDmg = S.toemaDmgById(lastOwner, dmg);

        entity.hp -= burnMobDmg;
        emitDamageText(entity.x, entity.y, burnMobDmg);
        if (kind === 'hinbeom') Bosses.recordHinbeomDamage(lastOwner, burnMobDmg);
        if (kind === 'blackbeard') Bosses.checkBurgessSummon();

        if (entity.hp <= 0) {
            if (kind === 'monster') Bosses.killMonster(lastOwner);
            else if (kind === 'hinbeom') Bosses.killHinbeom(lastOwner);
            else if (kind === 'blackbeard') Bosses.killBlackbeard(lastOwner);
            else if (kind === 'burgess') Bosses.killBurgess(lastOwner);
            else if (kind === 'minion') Bosses.killMinion(entity, lastOwner);
            else if (kind === 'okra') Bosses.killOkra(entity, lastOwner);
        }
    }
}


// ============================================================================
// 🗡️ [세계를 가르는 참격] — 4번 스킬
//    · 시전하면 0.5초간 완전히 고정된다 (cleaveCasting).
//    · 0.5초가 지나면 전방으로 참격이 발사되고, 직선 범위 안의 모든 적이
//      방어력을 무시한 700 피해를 받는다.
//    · 몬스터에게는 퇴마의 검(+30%)이 그대로 적용된다.
// ============================================================================

/** 🗡️ 참격을 실제로 발사한다 (경직이 끝난 시점에 호출) */
function fireWorldCleave(p) {
    if (!p || p.isDead) return;

    let ux = isNum(p.cleaveDirX) ? p.cleaveDirX : 1;
    let uy = isNum(p.cleaveDirY) ? p.cleaveDirY : 0;
    let len = Math.hypot(ux, uy);
    if (!isNum(len) || len < 0.001) { ux = (p.lastFacing === -1) ? -1 : 1; uy = 0; len = 1; }
    ux /= len; uy /= len;

    const RANGE = C.CLEAVE_RANGE;
    const HALF  = C.CLEAVE_THICKNESS / 2;
    const DMG   = C.CLEAVE_DAMAGE;

    // 📐 시전자 기준 전방 직선 범위 판정 (엘 토르와 동일한 방식)
    const inBeam = (ex, ey, r) => {
        let rx = ex - p.x, ry = ey - p.y;
        let s = rx * ux + ry * uy;
        let d = Math.abs(rx * (-uy) + ry * ux);
        return s >= -(r || 0) && s <= RANGE + (r || 0) && d <= HALF + (r || 0);
    };

    // 🎇 이펙트 방송
    io.emit('actionEffect', {
        id: p.id, type: 'world_cleave',
        x: p.x, y: p.y, dirX: ux, dirY: uy,
        durationMs: C.CLEAVE_FX_MS,
        lifeFrames: Math.round(C.CLEAVE_FX_MS / (1000 / 60))
    });

    // 🏰 적 넥서스도 범위 안이면 피해를 준다
    let enemyBase = State.bases[p.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0 && inBeam(enemyBase.x, enemyBase.y, 150)) {
        applyBaseDamage(p.team, DMG);
    }

    // 🎯 Damage.forEachTarget 이 플레이어 · 보스 · 소환체 · 오크라를 모두 순회한다
    Damage.forEachTarget(p, (o, r) => inBeam(o.x, o.y, r), (t) => {
        // 🛡️ 방어 무시 — 플레이어에게도 defense 를 적용하지 않는다
        Damage.hurt(t, p, DMG, 0, { notify: 'takeDamage', ignoreDefense: true });
    });
}

/** 🗡️ 매 프레임 : 경직이 끝난 참격을 발사한다 */
function processWorldCleave(now) {
    for (let pid in State.players) {
        let p = State.players[pid];
        if (!p || !p.cleaveCasting) continue;
        if (p.isDead) { p.cleaveCasting = false; p.cleaveCastEnd = 0; continue; }
        if (now < (p.cleaveCastEnd || 0)) continue;
        p.cleaveCasting = false;
        p.cleaveCastEnd = 0;
        try { fireWorldCleave(p); } catch (e) { console.error('[CLEAVE]', e); }
        io.emit('syncPlayerFull', p);
    }
}

// ============================================================================
// 🗡️ 평타 처리
//    ⚡🔮 환수호박 중인 카시모는 평타 대신 전격 돌진이 나간다.
// ============================================================================
function handleBasicAttack(socket, attacker, actionData) {
    let now = Date.now();
    let myDamage = attacker.baseDamage + attacker.bonusDamage;
    let charType = attacker.characterType;
    let kb = (['BORSALINO', 'KUZAN', 'SAKAZUKI', 'ENEL', 'KASHIMO', 'DABURA'].includes(charType)) ? 0 : (actionData.dir * 15);
    let isBors = charType === 'BORSALINO';
    let isKuzan = charType === 'KUZAN';
    let isSaka = charType === 'SAKAZUKI';
    let isKashimo = charType === 'KASHIMO';

    if (!isNum(myDamage)) return;
    if (!isNum(kb)) kb = 0;

    let hitRadius = isBors ? 165 : 105;
    let pveHitRadius = isBors ? 120 : 60;

    let freezeChance = (isKuzan ? 0.06 : 0) + (attacker.hasJokbal ? 0.06 : 0);
    const rollFreeze = (o) => {
        if (freezeChance > 0 && Math.random() < freezeChance) {
            o.frozenUntil = Math.max(o.frozenUntil || 0, now + 1000);
            return true;
        }
        return false;
    };

    let counterFired = false;
    const tryCounter = (victim) => {
        if (counterFired) return;
        if (!victim || victim.characterType !== 'KASHIMO') return;
        if (Kashimo.applyCounterShock(victim, attacker, serverContext)) counterFired = true;
    };

    let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
    if (enemyBase && Math.hypot(actionData.x - enemyBase.x, actionData.y - enemyBase.y) < hitRadius + 45) {
        applyBaseDamage(attacker.team, myDamage);
    }

    for (let tid in State.players) {
        if (tid === socket.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === attacker.team) continue;
        if (Math.hypot(actionData.x - t.x, actionData.y - t.y) >= hitRadius) continue;

        let actual = myDamage * (1 - (t.defense || 0));
        t.hp -= actual;
        emitDamageText(t.x, t.y, actual);

        if (isKashimo) Kashimo.addCharge(t, 'player', tid, serverContext);

        if (t.hp <= 0) { checkPlayerDeath(t, socket.id); continue; }
        io.to(tid).emit('takeDamage', actual);
        if (isSaka) addBurn(tid, t, 20, 2000, attacker.id);
        if (rollFreeze(t)) io.emit('syncPlayerFull', t);

        tryCounter(t);
    }

    if (!counterFired) {
        for (let tid in State.players) {
            if (tid === socket.id) continue;
            let t = State.players[tid];
            if (!t || t.isDead || t.team === attacker.team) continue;
            if (t.characterType !== 'KASHIMO') continue;
            if (Math.hypot(actionData.x - t.x, actionData.y - t.y) >= hitRadius) continue;
            tryCounter(t);
            if (counterFired) break;
        }
    }

    const hitTest = (o, r) => Math.hypot(actionData.x - o.x, actionData.y - o.y) < pveHitRadius + r;
    Damage.forEachTarget(attacker, hitTest, (t) => {
        if (t.kind === 'player') return;
        Damage.hurt(t, attacker, myDamage, kb, {
            onMobExtra: (o, kind, id) => {
                rollFreeze(o);
                if (isKashimo) Kashimo.addCharge(o, kind, id, serverContext);
                if (isSaka) {
                    let key = (kind === 'minion') ? ('minion_' + id) : (kind === 'okra') ? ('okra_' + id) : kind;
                    addBurn(key, o, 20, 2000, attacker.id);
                }
            }
        });
    });
}

/** 🛟 클라이언트가 보낸 스킬/평타 데이터를 안전한 값으로 정규화한다. */
function sanitizeActionData(p, data) {
    if (!data || typeof data !== 'object') return null;
    if (data.dir !== 1 && data.dir !== -1) data.dir = (p.lastFacing === -1) ? -1 : 1;
    if (!isNum(data.x)) data.x = p.x;
    if (!isNum(data.y)) data.y = p.y;
    if (!isNum(data.dirX)) data.dirX = 0;
    if (!isNum(data.dirY)) data.dirY = 0;
    if (!isNum(data.lifeFrames)) data.lifeFrames = 12;
    return data;
}

/**
 * ⬛ 다부라가 지금 '조작 봉인' 상태인가
 *    (빛 시전 / 어둠 시전 / 발차기 응축)
 *    ✅ [수정] 어둠 시전 중(3초)에도 조작이 봉인된다.
 */
function isDaburaLocked(p, now) {
    if (!p) return false;
    if (p.dLightActive) return true;
    if (p.dDarkActive && now < (p.dDarkEnd || 0)) return true;
    if (p.dKickCharging) return true;
    return false;
}

module.exports = {
    wire,
    addBurn, clearBurns, resolveBurnKey, processBurns,
    fireWorldCleave, processWorldCleave,
    handleBasicAttack, sanitizeActionData, isDaburaLocked
};
