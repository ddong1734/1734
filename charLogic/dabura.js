// 파일명: charLogic/dabura.js
// ============================================================================
// ⬛ 다부라 카라바 — 빛과 어둠을 함께 다루는 이형(異形)
//
//   [스킬]
//   · ☀️ 1번 [빛]
//        시전자가 박힌범의 지름(189)만큼 매우 빠르게 위로 솟구친 뒤,
//        아래쪽으로 2초간 지속되는 큰 빛 연속폭발을 일으킨다.
//        0.4초마다 50 피해 · 폭발에 휘말린 대상은 폭발이 끝날 때까지 경직.
//        시전 중에는 시전자 아래로 두 줄기 빛이 빛난다.
//        ⬛ 아이템 : 폭발 범위 증가
//
//   · 🌑 2번 [어둠]
//        몸 중심에 일렁이는 어둠 구체가 생기고,
//        그 구체를 중심으로 칼바람처럼 휘몰아치는 큰 반경의 구 형태 소용돌이가 생긴다.
//        소용돌이 안의 모든 적은 3초 동안 중심으로 끌려간다.
//        (끌림 세기는 기본 이동속도로 겨우 빠져나갈 수 있는 정도 · 벽은 통과 못함)
//        3초 뒤 구체가 터지며 넓은 범위에 300 피해.
//        ⬛ 아이템 : 소용돌이 · 폭발 범위 증가
//
//   · 💫 3번 [아광속 발차기]
//        2초간 경직(응축)된 뒤 빛으로 변해,
//        기본 이동속도의 1.5배로 5초 동안 조이스틱을 따라 날아간다.
//        가로벽은 통과하고 세로벽은 통과하지 못하며, 점프 없이 조이스틱만으로 활공한다.
//        비행 중 대상을 맞히면 변신이 풀리며 그 자리에 빛 대폭발(500 피해)이 일어난다.
//        ⬛ 아이템 : 이동속도 배율 1.5배 → 2배
// ============================================================================

const C = require('../server/config.js');

// ── 🔧 공통 유틸 ────────────────────────────────────────────────────────────

/** ⬛ 다부라 전용 아이템(■)을 장착했는가 */
function hasSquare(p) { return !!p.hasSquare; }

/** ☀️ 빛 폭발 반경 (⬛ 아이템이면 확대) */
function getLightRadius(p, ctx) {
    const S1 = ctx.Skills.DABURA_S1;
    if (hasSquare(p)) return (S1 && S1.sqRadius) ? S1.sqRadius : C.D_LIGHT_SQ_RADIUS;
    return (S1 && S1.radius) ? S1.radius : C.D_LIGHT_RADIUS;
}

/** 🌑 어둠 소용돌이 반경 (⬛ 아이템이면 확대) */
function getDarkRadius(p, ctx) {
    const S2 = ctx.Skills.DABURA_S2;
    if (hasSquare(p)) return (S2 && S2.sqRadius) ? S2.sqRadius : C.D_DARK_SQ_RADIUS;
    return (S2 && S2.radius) ? S2.radius : C.D_DARK_RADIUS;
}

/** 🌑 어둠 구체 폭발 반경 (⬛ 아이템이면 확대) */
function getDarkBlastRadius(p, ctx) {
    const S2 = ctx.Skills.DABURA_S2;
    if (hasSquare(p)) return (S2 && S2.sqBlastRadius) ? S2.sqBlastRadius : C.D_DARK_BLAST_SQ_RADIUS;
    return (S2 && S2.blastRadius) ? S2.blastRadius : C.D_DARK_BLAST_RADIUS;
}

/** 💫 아광속 발차기 이동속도 배율 (⬛ 아이템이면 2배) */
function getKickSpeedMult(p, ctx) {
    const S3 = ctx.Skills.DABURA_S3;
    if (hasSquare(p)) return (S3 && S3.sqSpeedMult) ? S3.sqSpeedMult : C.D_KICK_SQ_SPEED_MULT;
    return (S3 && S3.speedMult) ? S3.speedMult : C.D_KICK_SPEED_MULT;
}

/**
 * ⛓️ 대상에게 '경직'을 건다.
 *    빛 폭발에 휘말린 대상은 폭발이 끝날 때까지 움직이지 못한다.
 */
function applyLightBind(obj, kind, untilMs, ctx) {
    if (!obj) return;
    obj.frozenUntil = Math.max(obj.frozenUntil || 0, untilMs);
    obj.airFreezeUntil = Math.max(obj.airFreezeUntil || 0, untilMs);

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

/** 💥 공통 : 대상 하나에게 피해 + (선택) 경직 + 어그로 + 처치 판정 */
function damageOne(p, obj, kind, id, dmg, bindUntil, ctx) {
    const { io, emitDamageText, checkPlayerDeath } = ctx;
    if (!obj) return;

    // 🛡️ [마르코] 불꽃 보호막에 막히면 피해가 통째로 사라진다
    if (typeof ctx.marcoBlocked === 'function' && ctx.marcoBlocked(obj, p && p.team)) return;

    if (kind === 'player') {
        if (obj.isDead) return;
        let actual = dmg * (1 - (obj.defense || 0));
        obj.hp -= actual;
        emitDamageText(obj.x, obj.y, actual);
        if (bindUntil) applyLightBind(obj, 'player', bindUntil, ctx);
        if (obj.hp <= 0) { checkPlayerDeath(obj, p.id); return; }
        io.to(id).emit('takeDamage', actual);
        io.emit('syncPlayerFull', obj);
        return;
    }

    if (obj.hp === undefined || obj.hp <= 0) return;
    if (obj.state === 'dead') return;

    // ⚔️ 퇴마의 검 : 여기부터는 전부 몬스터 계열이므로 30% 추가 피해를 적용한다.
    //    (다부라의 평타 · [빛] · [어둠] · [아광속 발차기] 가 모두 이 함수를 거친다)
    if (typeof ctx.toemaDmg === 'function') dmg = ctx.toemaDmg(p, dmg);

    obj.hp -= dmg;
    emitDamageText(obj.x, obj.y, dmg);
    if (bindUntil) applyLightBind(obj, kind, bindUntil, ctx);

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
        else if (kind === 'sukuna' && typeof ctx.killSukuna === 'function') ctx.killSukuna(p.id);   // 🔥
        else if (kind === 'burgess' && typeof ctx.killBurgess === 'function') ctx.killBurgess(p.id);
        else if (kind === 'minion' && typeof ctx.killMinion === 'function') ctx.killMinion(obj, p.id);
        else if (kind === 'okra' && typeof ctx.killOkra === 'function') ctx.killOkra(obj, p.id);
    }
}

/**
 * 🎯 원형 범위 안의 모든 적을 순회한다.
 *    cb({ obj, kind, id }) 형태로 넘긴다.
 *    (박힌범은 소환체가 살아 있으면 무적이므로 제외한다)
 */
function forEachInCircle(p, cx, cy, radius, ctx, cb) {
    const { State, burgessAlive } = ctx;
    const inRange = (o, r) => Math.hypot(cx - o.x, cy - o.y) < radius + (r || 0);

    for (let tid in State.players) {
        if (tid === p.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === p.team) continue;
        if (!inRange(t, 45)) continue;
        cb({ obj: t, kind: 'player', id: tid });
    }

    const hitMob = (obj, kind, id) => {
        if (!obj || obj.hp === undefined || obj.hp <= 0) return;
        if (obj.state === 'dead') return;
        if (!inRange(obj, obj.radius || 0)) return;
        cb({ obj: obj, kind: kind, id: id });
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
}

/** 💥 원형 범위 광역 피해 (넥서스 포함) */
function blastAt(p, cx, cy, radius, dmg, bindUntil, ctx) {
    forEachInCircle(p, cx, cy, radius, ctx, (t) => {
        damageOne(p, t.obj, t.kind, t.id, dmg, bindUntil, ctx);
    });

    const State = ctx.State;
    let enemyBase = State.bases[p.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0 && Math.hypot(cx - enemyBase.x, cy - enemyBase.y) < radius + 150) {
        if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg);
    }
}

// ============================================================================
// ☀️ 1번 스킬 : 빛
// ============================================================================

function startLight(p, ctx) {
    const { io, Skills } = ctx;
    const S1 = Skills.DABURA_S1;
    let now = Date.now();

    const riseDist = (S1 && S1.riseDist) ? S1.riseDist : C.D_LIGHT_RISE_DIST;
    const riseTime = (S1 && S1.riseTime) ? S1.riseTime : C.D_LIGHT_RISE_MS;
    const dur      = (S1 && S1.duration) ? S1.duration : C.D_LIGHT_DURATION;

    p.dLightActive = true;
    p.dLightStart = now;
    // 🚀 위로 솟구치는 구간이 끝난 뒤부터 폭발이 시작된다
    p.dLightRiseUntil = now + riseTime;
    p.dLightEnd = p.dLightRiseUntil + dur;
    p.dLightNextTick = p.dLightRiseUntil;
    p.dLightCdEnd = now + ((S1 && S1.cd) ? S1.cd : C.D_LIGHT_COOLDOWN);
    // 폭발 중심은 매 틱 시전자를 따라간다
    p.dLightX = p.x;
    p.dLightY = p.y;

    io.emit('daburaLightStart', {
        id: p.id, x: p.x, y: p.y,
        riseDist: riseDist, riseTime: riseTime,
        duration: dur,
        radius: getLightRadius(p, ctx),
        down: (S1 && S1.down) ? S1.down : C.D_LIGHT_DOWN,
        square: hasSquare(p)
    });
    io.emit('syncPlayerFull', p);
}

function endLight(p, ctx) {
    if (!p || !p.dLightActive) return;
    const { io } = ctx;
    p.dLightActive = false;
    p.dLightEnd = 0;
    p.dLightNextTick = 0;
    p.dLightRiseUntil = 0;
    io.emit('daburaLightEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

/** ☀️ 빛 폭발 한 번 (0.4초마다) */
function lightTick(p, now, ctx) {
    const { io, Skills } = ctx;
    const S1 = Skills.DABURA_S1;

    const dmg = ((S1 && S1.tickDamage) ? S1.tickDamage : C.D_LIGHT_TICK_DMG)
              + Math.round((p.bonusDamage || 0) * 0.2);
    const radius = getLightRadius(p, ctx);
    const down = (S1 && S1.down) ? S1.down : C.D_LIGHT_DOWN;

    // 폭발 중심 : 시전자 '아래쪽'
    let cx = p.x;
    let cy = p.y + down;
    p.dLightX = cx;
    p.dLightY = cy;

    io.emit('daburaLightBlast', {
        ownerId: p.id, x: cx, y: cy,
        radius: radius,
        duration: C.D_LIGHT_BLAST_FX_MS,
        square: hasSquare(p)
    });

    // ⛓️ 폭발이 끝날 때까지 경직
    let bindUntil = p.dLightEnd || (now + 400);
    blastAt(p, cx, cy, radius, dmg, bindUntil, ctx);
}

// ============================================================================
// 🌑 2번 스킬 : 어둠
// ============================================================================

function startDark(p, ctx) {
    const { io, Skills } = ctx;
    const S2 = Skills.DABURA_S2;
    let now = Date.now();

    const dur = (S2 && S2.duration) ? S2.duration : C.D_DARK_DURATION;

    p.dDarkActive = true;
    p.dDarkStart = now;
    p.dDarkEnd = now + dur;
    p.dDarkCdEnd = now + ((S2 && S2.cd) ? S2.cd : C.D_DARK_COOLDOWN);

    io.emit('daburaDarkStart', {
        id: p.id, x: p.x, y: p.y,
        duration: dur,
        radius: getDarkRadius(p, ctx),
        coreR: C.D_DARK_CORE_R,
        square: hasSquare(p)
    });
    io.emit('syncPlayerFull', p);
}

/** 🌑 매 프레임 : 소용돌이 안의 적을 중심으로 끌어당긴다 */
function darkPullTick(p, now, ctx) {
    const { io, Skills } = ctx;
    const S2 = Skills.DABURA_S2;

    const radius = getDarkRadius(p, ctx);
    const pull = (S2 && S2.pull) ? S2.pull : C.D_DARK_PULL;

    forEachInCircle(p, p.x, p.y, radius, ctx, (t) => {
        let o = t.obj;
        if (t.kind === 'player') {
            // 🎮 플레이어는 로컬 물리로 움직이므로,
            //    '끌림 목표 좌표 + 세기'를 넘겨 클라이언트가 직접 반영하게 한다.
            o.darkPullUntil = Math.max(o.darkPullUntil || 0, now + 120);
            o.darkPullX = p.x;
            o.darkPullY = p.y;
            io.to(t.id).emit('daburaDarkPull', {
                x: p.x, y: p.y, pull: pull, until: o.darkPullUntil
            });
        } else {
            // 🐗 몬스터 · 보스는 서버가 직접 끌어당긴다 (X축만 · 벽 클램프는 각 AI가 처리)
            let dx = p.x - o.x;
            let dist = Math.abs(dx);
            if (dist < 4) return;
            let step = Math.min(dist, pull);
            o.x += (dx > 0 ? step : -step);
        }
    });
}

function endDark(p, ctx) {
    if (!p || !p.dDarkActive) return;
    const { io, Skills } = ctx;
    const S2 = Skills.DABURA_S2;

    p.dDarkActive = false;
    p.dDarkEnd = 0;

    // 💥 어둠 구체가 터진다
    let blastR = getDarkBlastRadius(p, ctx);
    let dmg = ((S2 && S2.blastDamage) ? S2.blastDamage : C.D_DARK_BLAST_DAMAGE)
            + Math.round((p.bonusDamage || 0) * 0.5);

    io.emit('daburaDarkBlast', {
        ownerId: p.id, x: p.x, y: p.y,
        radius: blastR,
        duration: C.D_DARK_BLAST_FX_MS,
        square: hasSquare(p)
    });

    if (!p.isDead) blastAt(p, p.x, p.y, blastR, dmg, 0, ctx);

    io.emit('daburaDarkEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

/** 🌑 사망 등으로 중단될 때 : 폭발 없이 조용히 끈다 */
function cancelDark(p, ctx) {
    if (!p || !p.dDarkActive) return;
    const { io } = ctx;
    p.dDarkActive = false;
    p.dDarkEnd = 0;
    io.emit('daburaDarkEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

// ============================================================================
// 💫 3번 스킬 : 아광속 발차기
// ============================================================================

function startKick(p, ctx) {
    const { io, Skills } = ctx;
    const S3 = Skills.DABURA_S3;
    let now = Date.now();

    const castTime = (S3 && S3.castTime) ? S3.castTime : C.D_KICK_CHARGE_MS;

    p.dKickCharging = true;
    p.dKickChargeEnd = now + castTime;
    p.dKickFlying = false;
    p.dKickFlyEnd = 0;
    p.dKickHitIds = [];
    p.dKickCdEnd = now + ((S3 && S3.cd) ? S3.cd : C.D_KICK_COOLDOWN);

    io.emit('daburaKickCharge', {
        id: p.id, x: p.x, y: p.y,
        duration: castTime,
        square: hasSquare(p)
    });
    io.emit('syncPlayerFull', p);
}

/** 💫 응축이 끝나면 빛으로 변해 날아오른다 */
function launchKick(p, ctx) {
    const { io, Skills } = ctx;
    const S3 = Skills.DABURA_S3;
    let now = Date.now();

    const flyTime = (S3 && S3.flyTime) ? S3.flyTime : C.D_KICK_FLY_MS;

    p.dKickCharging = false;
    p.dKickChargeEnd = 0;
    p.dKickFlying = true;
    p.dKickFlyEnd = now + flyTime;
    p.dKickHitIds = [];

    io.emit('daburaKickLaunch', {
        id: p.id, x: p.x, y: p.y,
        duration: flyTime,
        speedMult: getKickSpeedMult(p, ctx),
        square: hasSquare(p)
    });
    io.emit('syncPlayerFull', p);
}

/**
 * 💫 비행 중 적중 판정 (매 프레임)
 *    한 명이라도 맞히면 변신이 풀리고 빛 대폭발이 일어난다.
 */
function kickHitTick(p, now, ctx) {
    const { io, Skills } = ctx;
    const S3 = Skills.DABURA_S3;

    const hitR = (S3 && S3.hitRadius) ? S3.hitRadius : C.D_KICK_HIT_RADIUS;

    let hit = null;
    forEachInCircle(p, p.x, p.y, hitR, ctx, (t) => {
        if (hit) return;
        hit = t;
    });

    // 🏰 넥서스에 부딪혀도 폭발한다
    const State = ctx.State;
    let enemyBase = State.bases[p.team === 1 ? 2 : 1];
    let baseHit = (enemyBase && enemyBase.hp > 0
        && Math.hypot(p.x - enemyBase.x, p.y - enemyBase.y) < hitR + 150);

    if (!hit && !baseHit) return false;

    explodeKick(p, ctx);
    return true;
}

/** 💥 아광속 발차기 대폭발 */
function explodeKick(p, ctx) {
    const { io, Skills } = ctx;
    const S3 = Skills.DABURA_S3;

    const blastR = (S3 && S3.blastRadius) ? S3.blastRadius : C.D_KICK_BLAST_RADIUS;
    const dmg = ((S3 && S3.blastDamage) ? S3.blastDamage : C.D_KICK_BLAST_DAMAGE)
              + Math.round((p.bonusDamage || 0) * 0.5);

    p.dKickFlying = false;
    p.dKickFlyEnd = 0;
    p.dKickHitIds = [];

    io.emit('daburaKickBlast', {
        ownerId: p.id, x: p.x, y: p.y,
        radius: blastR,
        duration: C.D_KICK_BLAST_FX_MS,
        square: hasSquare(p)
    });

    if (!p.isDead) blastAt(p, p.x, p.y, blastR, dmg, 0, ctx);

    io.emit('daburaKickEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

/** 💫 시간이 다 되어 그냥 끝나는 경우 (폭발 없음) */
function endKick(p, ctx) {
    if (!p) return;
    const { io } = ctx;
    p.dKickCharging = false;
    p.dKickChargeEnd = 0;
    p.dKickFlying = false;
    p.dKickFlyEnd = 0;
    p.dKickHitIds = [];
    io.emit('daburaKickEnd', { id: p.id });
    io.emit('syncPlayerFull', p);
}

// ============================================================================
// 🎮 스킬 진입점
// ============================================================================
function useSkill(p, data, ctx) {
    const { Skills } = ctx;
    let now = Date.now();

    // 💫 아광속 발차기 시전 중(응축·비행)에는 다른 스킬을 쓸 수 없다
    if (p.dKickCharging || p.dKickFlying) return;
    // ☀️ 빛 시전 중에도 다른 스킬을 쓸 수 없다
    if (p.dLightActive) return;

    // ☀️ 1번 : 빛
    if (data.type === 1) {
        const S1 = Skills.DABURA_S1;
        if (!S1) return;
        if (now < (p.dLightCdEnd || 0)) return;

        // 🌑 [영역 전용] 자기 영역 안이라면 완전히 다른 효과로 바뀐다.
        //    · 1초 동안 대상들 주변 빛 에너지가 각자의 중심으로 모여들고
        //    · 이후 3초 동안 0.3초마다 30 피해의 작은 빛 폭발이 반복된다
        if (typeof ctx.tryDomainLightSkill === 'function' && ctx.tryDomainLightSkill(p)) {
            p.dLightCdEnd = now + (S1.cd || 0);
            if (ctx.io) ctx.io.emit('syncPlayerFull', p);
            return;
        }

        startLight(p, ctx);
        return;
    }

    // 🌑 2번 : 어둠
    if (data.type === 2) {
        const S2 = Skills.DABURA_S2;
        if (!S2) return;
        if (p.dDarkActive) return;
        if (now < (p.dDarkCdEnd || 0)) return;

        // 🌑 [영역 전용] 자기 영역 안이라면 어둠 에너지 폭격으로 바뀐다.
        //    2초 동안 판자가 어둠 에너지로 변한 뒤 각 대상에게 꽂힌다 (개당 300).
        if (typeof ctx.tryDomainDarkSkill === 'function' && ctx.tryDomainDarkSkill(p)) {
            p.dDarkCdEnd = now + (S2.cd || 0);
            if (ctx.io) ctx.io.emit('syncPlayerFull', p);
            return;
        }

        startDark(p, ctx);
        return;
    }

    // 💫 3번 : 아광속 발차기
    if (data.type === 3) {
        const S3 = Skills.DABURA_S3;
        if (!S3) return;
        if (now < (p.dKickCdEnd || 0)) return;
        // 💫 [롤백] 영역 안에서도 기존 [아광속 발차기] 를 그대로 쓴다
        startKick(p, ctx);
        return;
    }
}

function updateLoop(p, now, ctx) {
    // ── ☀️ 빛 ──────────────────────────────────────────────────────
    if (p.dLightActive) {
        if (p.isDead) { endLight(p, ctx); }
        else if (now >= (p.dLightEnd || 0)) { endLight(p, ctx); }
        else if (now >= (p.dLightRiseUntil || 0)) {
            const S1 = ctx.Skills.DABURA_S1;
            const interval = (S1 && S1.tickInterval) ? S1.tickInterval : C.D_LIGHT_TICK_MS;
            let guard = 0;
            while (now >= (p.dLightNextTick || 0) && now < p.dLightEnd && guard++ < 8) {
                p.dLightNextTick = (p.dLightNextTick || now) + interval;
                lightTick(p, now, ctx);
            }
            if (guard >= 8) p.dLightNextTick = now + interval;
        }
    }

    // ── 🌑 어둠 ─────────────────────────────────────────────────────
    if (p.dDarkActive) {
        if (p.isDead) { cancelDark(p, ctx); }
        else if (now >= (p.dDarkEnd || 0)) { endDark(p, ctx); }
        else { darkPullTick(p, now, ctx); }
    }

    // ── 💫 아광속 발차기 ────────────────────────────────────────────
    if (p.dKickCharging) {
        if (p.isDead) { endKick(p, ctx); }
        else if (now >= (p.dKickChargeEnd || 0)) { launchKick(p, ctx); }
    }
    else if (p.dKickFlying) {
        if (p.isDead) { endKick(p, ctx); }
        else if (now >= (p.dKickFlyEnd || 0)) { endKick(p, ctx); }
        else { kickHitTick(p, now, ctx); }
    }
}

module.exports = {
    useSkill,
    updateLoop,
    hasSquare,
    getLightRadius,
    getDarkRadius,
    getDarkBlastRadius,
    getKickSpeedMult,
    startLight, endLight,
    startDark, endDark, cancelDark,
    startKick, launchKick, explodeKick, endKick
};