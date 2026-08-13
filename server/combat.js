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
let Domain;

/** 🔗 index.js 가 모든 모듈을 만든 뒤 호출한다 */
function wire(d) {
    io = d.io; C = d.C; S = d.S; State = d.State;
    Damage = d.Damage; Bosses = d.Bosses; Kashimo = d.Kashimo;
    emitDamageText = d.emitDamageText; isNum = d.isNum; getMinion = d.getMinion;
    serverContext = d.serverContext;
    applyBaseDamage = d.applyBaseDamage; checkPlayerDeath = d.checkPlayerDeath;
    Domain = d.Domain;
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

    // 🧭 [수정] 조이스틱 방향이 아니라 '바라보는 정면' 으로만 발사한다.
    //    (위/아래로 비스듬히 나가던 문제를 없앤다)
    let ux = (p.lastFacing === -1) ? -1 : 1;
    let uy = 0;

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
// ============================================================================
// 🌑💥 [영역 전용] 다부라 평타 — 빛 폭발 + 빛 연결고리
//
//   영역 주인(다부라)이 자기 영역 '안' 에서 평타를 쓰면 아래처럼 바뀐다.
//
//     · 폭발 지점 = 시전자 1곳 + 영역 안의 모든 대상 각각
//     · 각 폭발은 '독립' 판정이다.
//       → 대상이 시전자 근처에 있으면 (시전자 폭발 + 자기 폭발) 로 2배,
//         대상끼리 붙어 있어도 서로의 폭발에 맞아 겹쳐서 들어간다.
//     · 시전자에게는 피해가 들어가지 않는다 (연출만).
//     · 시전자 ↔ 각 대상 사이에 보랏빛 연결고리가 생긴다 (대상 수만큼).
//     · 피해량은 기존 평타와 동일하다.
// ============================================================================

const DOMAIN_ATK_BLAST_R = 260;   // 빛 폭발 하나의 반경

/** 🌑 영역 안에서 잡은 몬스터를 종류에 맞는 처치 함수로 넘긴다 */
function killDomainMob(t, attackerId) {
    if (!Bosses || !t) return;
    try {
        if (t.kind === 'monster' && Bosses.killMonster) Bosses.killMonster(attackerId);
        else if (t.kind === 'hinbeom' && Bosses.killHinbeom) Bosses.killHinbeom(attackerId);
        else if (t.kind === 'blackbeard' && Bosses.killBlackbeard) Bosses.killBlackbeard(attackerId);
        else if (t.kind === 'burgess' && Bosses.killBurgess) Bosses.killBurgess(attackerId);
        else if (t.kind === 'minion' && Bosses.killMinion) Bosses.killMinion(t.obj, attackerId);
        else if (t.kind === 'okra' && Bosses.killOkra) Bosses.killOkra(t.obj, attackerId);
    } catch (e) { console.error('[DOMAIN KILL]', e); }
}

/**
 * @return true 면 영역 전용 평타를 처리했다는 뜻 (일반 평타를 건너뛴다)
 */
function tryDomainBasicAttack(socket, attacker) {
    if (!Domain || !State.domains || !State.domains.length) return false;
    if (attacker.characterType !== 'DABURA') return false;

    // 내가 편 영역이면서, 지금 내가 그 안에 있어야 한다
    let dm = State.domains.find(d => d.ownerId === attacker.id && d.phase !== 'collapse');
    if (!dm) return false;
    if (!Domain.inside(dm, attacker)) return false;

    let now = Date.now();
    let myDamage = attacker.baseDamage + attacker.bonusDamage;
    if (!isNum(myDamage)) return false;

    // ── ① 영역 안의 '대상' 을 모은다 (적 플레이어 + 모든 몬스터) ──
    let targets = [];

    for (let tid in State.players) {
        if (tid === attacker.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === attacker.team) continue;
        if (!Domain.inside(dm, t)) continue;
        targets.push({ kind: 'player', id: tid, obj: t });
    }

    const mobList = [
        { kind: 'monster', id: 'monster', obj: State.monster },
        { kind: 'hinbeom', id: 'hinbeom', obj: State.hinbeom },
        { kind: 'blackbeard', id: 'blackbeard', obj: State.blackbeard },
        { kind: 'burgess', id: 'burgess', obj: State.burgess }
    ];
    (State.hinbeomMinions || []).forEach(m => mobList.push({ kind: 'minion', id: m.id, obj: m }));
    (State.okras || []).forEach(o => mobList.push({ kind: 'okra', id: o.id, obj: o }));

    for (let m of mobList) {
        let o = m.obj;
        if (!o || o.hp === undefined || o.hp <= 0 || o.state === 'dead') continue;
        if (!Domain.inside(dm, o, o.radius || 0)) continue;
        targets.push(m);
    }

    // ── ② 폭발 지점 = 시전자 + 각 대상 ────────────────────────────
    let blasts = [{ x: attacker.x, y: attacker.y, self: true }];
    targets.forEach(t => blasts.push({ x: t.obj.x, y: t.obj.y, self: false }));

    // ── ③ 폭발마다 독립으로 판정한다 (겹치면 중첩 피해) ───────────
    for (let b of blasts) {
        for (let t of targets) {
            let o = t.obj;
            if (!o || o.hp === undefined || o.hp <= 0 || o.state === 'dead') continue;
            let r = (t.kind === 'player') ? 0 : (o.radius || 0);
            if (Math.hypot(b.x - o.x, b.y - o.y) > DOMAIN_ATK_BLAST_R + r) continue;

            if (t.kind === 'player') {
                let actual = myDamage * (1 - (o.defense || 0));
                o.hp -= actual;
                emitDamageText(o.x, o.y, actual);
                if (o.hp <= 0) { checkPlayerDeath(o, attacker.id); continue; }
                io.emit('syncPlayerFull', o);
            } else {
                // ⚔️ 퇴마의 검 보정은 몬스터에게만 적용된다
                let dmg = (typeof S.toemaDmg === 'function') ? S.toemaDmg(attacker, myDamage) : myDamage;
                o.hp -= dmg;
                emitDamageText(o.x, o.y, dmg);
                if (t.kind === 'hinbeom' && Bosses && typeof Bosses.recordHinbeomDamage === 'function') {
                    Bosses.recordHinbeomDamage(attacker.id, dmg);
                }
                if (o.hp <= 0) killDomainMob(t, attacker.id);
            }
        }
    }

    // 🏰 시전자 폭발이 적 넥서스에 닿으면 넥서스도 피해를 입는다
    let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0) {
        for (let b of blasts) {
            if (Math.hypot(b.x - enemyBase.x, b.y - enemyBase.y) < DOMAIN_ATK_BLAST_R + 45) {
                applyBaseDamage(attacker.team, myDamage);
                break;
            }
        }
    }

    // ── ④ 이펙트 방송 ─────────────────────────────────────────────
    io.emit('domainLightBurst', {
        ownerId: attacker.id,
        x: attacker.x, y: attacker.y,
        radius: DOMAIN_ATK_BLAST_R,
        // 연결고리는 대상 수만큼 생긴다
        links: targets.map(t => ({ x: t.obj.x, y: t.obj.y })),
        blasts: blasts.map(b => ({ x: b.x, y: b.y, self: !!b.self }))
    });

    return true;
}

function handleBasicAttack(socket, attacker, actionData) {
    // 🌑 영역 안에서는 다부라의 평타가 완전히 달라진다
    if (tryDomainBasicAttack(socket, attacker)) return;

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

// ============================================================================
// 🌑☀️ [영역 전용] 다부라 [빛] — 빛 에너지 수렴 후 연속 소폭발
//
//   영역 주인이 자기 영역 '안' 에서 [빛] 을 쓰면 아래처럼 바뀐다.
//     ① 1초 동안 대상들 주변 대기의 빛 에너지가 각자의 중심으로 모여든다
//     ② 그 뒤 3초 동안, 0.3초마다 30 의 피해를 주는 작은 빛 폭발이 반복된다
//     · 시전자는 대상에서 제외된다.
// ============================================================================

const DLIGHT_GATHER_MS = 1000;   // ① 수렴 1초
const DLIGHT_DUR_MS    = 3000;   // ② 지속 3초
const DLIGHT_TICK_MS   = 300;    // 0.3초마다
const DLIGHT_TICK_DMG  = 30;     // 30 피해

/** 🌑 영역 안의 '대상' 목록 (적 플레이어 + 모든 몬스터) */
function collectDomainTargets(dm, owner) {
    let targets = [];
    for (let tid in State.players) {
        if (tid === owner.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === owner.team) continue;
        if (!Domain.inside(dm, t)) continue;
        targets.push({ kind: 'player', id: tid, obj: t });
    }
    const mobList = [
        { kind: 'monster', id: 'monster', obj: State.monster },
        { kind: 'hinbeom', id: 'hinbeom', obj: State.hinbeom },
        { kind: 'blackbeard', id: 'blackbeard', obj: State.blackbeard },
        { kind: 'burgess', id: 'burgess', obj: State.burgess }
    ];
    (State.hinbeomMinions || []).forEach(m => mobList.push({ kind: 'minion', id: m.id, obj: m }));
    (State.okras || []).forEach(o => mobList.push({ kind: 'okra', id: o.id, obj: o }));
    for (let m of mobList) {
        let o = m.obj;
        if (!o || o.hp === undefined || o.hp <= 0 || o.state === 'dead') continue;
        if (!Domain.inside(dm, o, o.radius || 0)) continue;
        targets.push(m);
    }
    return targets;
}

/**
 * 🌑☀️ 영역 안에서 [빛] 을 시전한다.
 * @return true 면 영역 전용 [빛] 을 시작했다는 뜻 (원래 [빛] 을 건너뛴다)
 */
function tryDomainLightSkill(p) {
    if (!Domain || !State.domains || !State.domains.length) return false;
    if (p.characterType !== 'DABURA') return false;

    let dm = State.domains.find(d => d.ownerId === p.id && d.phase !== 'collapse');
    if (!dm) return false;
    if (!Domain.inside(dm, p)) return false;

    let now = Date.now();
    p.domLightGatherEnd = now + DLIGHT_GATHER_MS;
    p.domLightEnd = now + DLIGHT_GATHER_MS + DLIGHT_DUR_MS;
    p.domLightNextTick = p.domLightGatherEnd;

    // ① 수렴 연출 — 대상 각자의 중심으로 빛이 모여든다
    let targets = collectDomainTargets(dm, p);
    io.emit('domainLightGather', {
        ownerId: p.id,
        gatherMs: DLIGHT_GATHER_MS,
        durationMs: DLIGHT_DUR_MS,
        points: targets.map(t => ({ x: t.obj.x, y: t.obj.y }))
    });
    return true;
}

/** 🌑☀️ 매 프레임 : 영역 [빛] 의 0.3초 주기 소폭발을 처리한다 */
function processDomainLight(now) {
    for (let pid in State.players) {
        let p = State.players[pid];
        if (!p || !p.domLightEnd) continue;

        if (p.isDead || now >= p.domLightEnd) {
            p.domLightEnd = 0; p.domLightGatherEnd = 0; p.domLightNextTick = 0;
            continue;
        }
        if (now < (p.domLightGatherEnd || 0)) continue;      // 아직 수렴 중
        if (now < (p.domLightNextTick || 0)) continue;
        p.domLightNextTick = now + DLIGHT_TICK_MS;

        let dm = State.domains.find(d => d.ownerId === pid && d.phase !== 'collapse');
        if (!dm) { p.domLightEnd = 0; continue; }

        let targets = collectDomainTargets(dm, p);
        let pts = [];

        for (let t of targets) {
            let o = t.obj;
            if (!o || o.hp === undefined || o.hp <= 0 || o.state === 'dead') continue;
            pts.push({ x: o.x, y: o.y });

            if (t.kind === 'player') {
                let actual = DLIGHT_TICK_DMG * (1 - (o.defense || 0));
                o.hp -= actual;
                emitDamageText(o.x, o.y, actual);
                if (o.hp <= 0) { checkPlayerDeath(o, pid); continue; }
                io.emit('syncPlayerFull', o);
            } else {
                let dmg = (typeof S.toemaDmg === 'function') ? S.toemaDmg(p, DLIGHT_TICK_DMG) : DLIGHT_TICK_DMG;
                o.hp -= dmg;
                emitDamageText(o.x, o.y, dmg);
                if (t.kind === 'hinbeom' && Bosses && typeof Bosses.recordHinbeomDamage === 'function') {
                    Bosses.recordHinbeomDamage(pid, dmg);
                }
                if (o.hp <= 0) killDomainMob(t, pid);
            }
        }

        if (pts.length) io.emit('domainLightTick', { ownerId: pid, points: pts });
    }
}

/** 🌑 매 프레임 : 유명이경 역월의 1초 시전이 끝나면 영역을 전개한다 */
function processYumyeong(now) {
    for (let pid in State.players) {
        let p = State.players[pid];
        if (!p || !p.yumCasting) continue;
        if (p.isDead) { p.yumCasting = false; p.yumCastEnd = 0; continue; }
        if (now < (p.yumCastEnd || 0)) continue;
        p.yumCasting = false;
        p.yumCastEnd = 0;
        try {
            if (Domain && typeof Domain.openDomain === 'function') Domain.openDomain(p);
        } catch (e) { console.error('[YUMYEONG]', e); }
        io.emit('syncPlayerFull', p);
    }
}

module.exports = {
    wire,
    addBurn, clearBurns, resolveBurnKey, processBurns,
    fireWorldCleave, processWorldCleave,
    processYumyeong,
    // 🌑 영역 전용 전투
    tryDomainBasicAttack, tryDomainLightSkill, processDomainLight, collectDomainTargets,
    handleBasicAttack, sanitizeActionData, isDaburaLocked
};
