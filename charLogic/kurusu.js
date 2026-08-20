// 파일명: charLogic/kurusu.js
// ============================================================================
// 🕊️ 쿠루스 하나 — 신성력을 다루는 성직자
//
//   ── 고유 패시브 [신성력] ────────────────────────────────────────────────
//     10초마다 1씩 차오르며 최대 50.
//     가득 차면 2·3번 스킬이 강화되고, 강화된 스킬을 하나라도 쓰면 0으로 돌아간다.
//
//   ── 1번 [집회] ─────────────────────────────────────────────────────────
//     넓은 반경(900) 안에 있는 대상의 '수' 만큼 신성력을 얻는다.
//
//   ── 2번 [축복] ─────────────────────────────────────────────────────────
//     보통 반경(520) 안의 아군과 자신에게 5초간 초당 200 회복.
//     ✨ 강화 시 : 맞은 모두에게 '여분의 목숨' 을 하나 준다.
//        여분의 목숨이 있으면 죽는 대신 그 자리에서 체력 15% 로 부활한다. (중첩 가능)
//
//   ── 3번 [야곱의 사다리] ────────────────────────────────────────────────
//     2초간 아래를 향한 마방진을 그린 뒤, 3초간 굵은 빛 기둥을 내리쬔다.
//     기둥에 닿은 적은 0.2초마다 70 피해 + 모든 스킬 쿨타임이 1초씩 늘어난다.
//     ✨ 강화 시 [최대 출력 야곱의 사다리] : 0.2초당 100 피해 · 굵기와 범위 확대.
//
//   ⚠️ 화면 흔들림은 시전자와 '맞은 대상' 에게만 보낸다.
// ============================================================================

const HOLY_MAX = 50;
const HOLY_INTERVAL = 10000;   // 10초마다 1
const REVIVE_HP_RATIO = 0.15;  // 여분의 목숨 부활 체력

/** 🕊️ 신성력이 가득 찼는가 (2·3번 강화 조건) */
function isCharged(p) { return (p.holyPower || 0) >= HOLY_MAX; }

/** 🕊️ 신성력을 소모(초기화)한다 */
function consumeHoly(p, ctx) {
    p.holyPower = 0;
    if (ctx && ctx.io) ctx.io.emit('syncPlayerFull', p);
}

/** 대상 하나에게 피해를 준다 */
function hitOne(p, t, dmg, ctx) {
    // 🛡️ [마르코] 불꽃 보호막에 막히면 피해가 통째로 사라진다
    if (typeof ctx.marcoBlocked === 'function' && ctx.marcoBlocked(t.obj, p.team)) return;
    const { io, emitDamageText, checkPlayerDeath } = ctx;
    const o = t.obj;
    if (!o || o.hp === undefined || o.hp <= 0 || o.state === 'dead') return;

    if (t.kind === 'player') {
        let actual = dmg * (1 - (o.defense || 0));
        o.hp -= actual;
        emitDamageText(o.x, o.y, actual);
        io.to(t.id).emit('takeDamage', actual);
        if (o.hp <= 0) { checkPlayerDeath(o, p.id); return; }
        io.emit('syncPlayerFull', o);
    } else {
        let d = (typeof ctx.toemaDmg === 'function') ? ctx.toemaDmg(p, dmg) : dmg;
        o.hp -= d;
        emitDamageText(o.x, o.y, d);
        if (t.kind === 'hinbeom' && typeof ctx.recordHinbeomDamage === 'function') {
            ctx.recordHinbeomDamage(p.id, d);
        }
        if (o.hp <= 0) killByKind(t, p.id, ctx);
    }
}

function killByKind(t, attackerId, ctx) {
    try {
        if (t.kind === 'monster' && ctx.killMonster) ctx.killMonster(attackerId);
        else if (t.kind === 'hinbeom' && ctx.killHinbeom) ctx.killHinbeom(attackerId);
        else if (t.kind === 'blackbeard' && ctx.killBlackbeard) ctx.killBlackbeard(attackerId);
        else if (t.kind === 'burgess' && ctx.killBurgess) ctx.killBurgess(attackerId);
        else if (t.kind === 'sukuna' && ctx.killSukuna) ctx.killSukuna(attackerId);
        else if (t.kind === 'minion' && ctx.killMinion) ctx.killMinion(t.obj, attackerId);
        else if (t.kind === 'okra' && ctx.killOkra) ctx.killOkra(t.obj, attackerId);
    } catch (e) { console.error('[KURUSU KILL]', e); }
}

// ============================================================================
// 🕊️ 1번 [집회] — 범위 안 대상 수만큼 신성력 흡수
// ============================================================================
function useGather(p, ctx) {
    const S1 = ctx.Skills.KURUSU_S1;
    const forEach = ctx.forEachTarget;
    const State = ctx.State;

    // 흡수한 대상들의 위치 (이펙트용)
    let points = [];
    let count = 0;

    if (typeof forEach === 'function') {
        const hitTest = (o, r) => Math.hypot(p.x - o.x, p.y - o.y) < S1.radius + (r || 0);
        forEach(p, hitTest, (t) => {
            const o = t.obj;
            if (!o || o.hp === undefined || o.hp <= 0 || o.state === 'dead') return;
            // 😈 타천 : 대상마다 50% 확률로 2를 얻는다
            const dbl = (p.hasTacheon && Math.random() < 0.50);
            count += dbl ? 2 : 1;
            // 2를 얻는 대상은 구체가 두 개 — 두 번째는 시간차를 두고 날아온다
            points.push({ x: o.x, y: o.y, delay: 0 });
            if (dbl) points.push({ x: o.x, y: o.y, delay: 0.28, dbl: true });
        });
    }

    const before = p.holyPower || 0;
    p.holyPower = Math.min(HOLY_MAX, before + count);
    const gained = p.holyPower - before;

    ctx.io.emit('kurusuGather', {
        id: p.id, x: p.x, y: p.y,
        radius: S1.radius, points: points, gained: gained
    });
    ctx.io.emit('syncPlayerFull', p);
}

// ============================================================================
// 🕊️ 2번 [축복] — 아군 회복 (+ 강화 시 여분의 목숨)
// ============================================================================
function useBless(p, ctx) {
    const S2 = ctx.Skills.KURUSU_S2;
    const State = ctx.State;
    const now = Date.now();
    const charged = isCharged(p);

    let blessed = [];
    for (let pid in State.players) {
        const a = State.players[pid];
        if (!a || a.isDead) continue;
        if (a.team !== p.team) continue;                  // 아군 + 자신
        if (Math.hypot(p.x - a.x, p.y - a.y) > S2.radius) continue;

        a.kurusuHealEnd = now + S2.duration;
        // 첫 회복은 즉시 들어간다.
        // (1초 뒤부터 시작하면 5초 동안 4번밖에 안 들어간다)
        a.kurusuHealNext = now;
        // 🪽 천사의 날개 : 초당 200 → 300
        a.kurusuHealAmt = p.hasAngelWing ? 300 : S2.healPerTick;
        if (charged) {
            // ✨ 여분의 목숨 (중첩 가능)
            a.extraLives = (a.extraLives || 0) + 1;
        }
        blessed.push({ id: pid, x: a.x, y: a.y });
        ctx.io.emit('syncPlayerFull', a);
    }

    ctx.io.emit('kurusuBless', {
        id: p.id, x: p.x, y: p.y,
        radius: S2.radius, charged: charged,
        targets: blessed
    });

    if (charged) consumeHoly(p, ctx);
    else ctx.io.emit('syncPlayerFull', p);
}

/** 🕊️ 매 프레임 : 축복 회복 틱 */
function processBless(now, ctx) {
    const State = ctx.State;
    for (let pid in State.players) {
        const a = State.players[pid];
        if (!a || !a.kurusuHealEnd) continue;
        if (a.isDead || now >= a.kurusuHealEnd) { a.kurusuHealEnd = 0; a.kurusuHealNext = 0; continue; }
        if (now < (a.kurusuHealNext || 0)) continue;
        a.kurusuHealNext = now + 1000;

        let amt = a.kurusuHealAmt || 200;
        // 🗡️ 석혼도 등으로 회복이 깎여 있으면 함께 적용된다
        if (a.healCutUntil && now < a.healCutUntil) amt *= (a.healCutMul || 0.3);

        const before = a.hp;
        a.hp = Math.min(a.maxHp, a.hp + amt);
        const gained = a.hp - before;
        if (gained > 0) {
            ctx.io.to(pid).emit('heal', Math.round(gained));
            ctx.io.emit('syncPlayerFull', a);
        }
    }
}

// ============================================================================
// 🕊️ 3번 [야곱의 사다리]
// ============================================================================
function useLadder(p, ctx) {
    const S3 = ctx.Skills.KURUSU_S3;
    const now = Date.now();
    const charged = isCharged(p);

    p.ladderCharged = charged;
    p.ladderCastEnd = now + S3.castTime;
    p.ladderBeamEnd = 0;
    p.ladderNextTick = 0;
    p.ladderX = p.x;                 // 마방진은 시전 위치에 고정된다
    p.ladderY = p.y;
    // 🧍 시전자는 마방진(2초) + 기둥(3~4초) 내내 그 자리에 굳는다.
    //    ⚠️ frozenUntil 을 쓰면 파란 동결 이펙트가 뜨므로 전용 플래그를 쓴다.
    //       공중에 뜬 채로도 그대로 멈춘다 (중력 없음).
    const beamMs = p.hasAngelWing ? 4000 : S3.beamTime;
    p.ladderLockUntil = now + S3.castTime + beamMs;

    ctx.io.emit('kurusuLadderCast', {
        id: p.id, x: p.ladderX, y: p.ladderY,
        castMs: S3.castTime, charged: charged,
        circleRadius: charged ? S3.maxCircleRadius : S3.circleRadius
    });

    if (charged) consumeHoly(p, ctx);
    else ctx.io.emit('syncPlayerFull', p);
}

/** 🕊️ 매 프레임 : 마방진 → 빛 기둥 진행 */
function processLadder(now, ctx) {
    const State = ctx.State;
    const S3 = ctx.Skills.KURUSU_S3;

    for (let pid in State.players) {
        const p = State.players[pid];
        if (!p) continue;

        // ── ① 마방진 그리는 중 ─────────────────────────────────
        if (p.ladderCastEnd) {
            if (p.isDead) { p.ladderCastEnd = 0; continue; }
            if (now < p.ladderCastEnd) continue;
            // 시전 완료 → 빛 기둥 시작
            p.ladderCastEnd = 0;
            // 🪽 천사의 날개 : 지속 3초 → 4초
            p.ladderBeamEnd = now + (p.hasAngelWing ? 4000 : S3.beamTime);
            p.ladderNextTick = now;
            ctx.io.emit('kurusuLadderBeam', {
                id: pid, x: p.ladderX, y: p.ladderY,
                beamMs: (p.hasAngelWing ? 4000 : S3.beamTime), charged: !!p.ladderCharged,
                halfWidth: p.ladderCharged ? S3.maxBeamHalfWidth : S3.beamHalfWidth
            });
        }

        // ── ② 빛 기둥 발사 중 ──────────────────────────────────
        if (!p.ladderBeamEnd) continue;
        if (p.isDead || now >= p.ladderBeamEnd) {
            p.ladderBeamEnd = 0; p.ladderNextTick = 0; p.ladderCharged = false;
            continue;
        }
        if (now < (p.ladderNextTick || 0)) continue;
        p.ladderNextTick = now + S3.tickInterval;

        const half = p.ladderCharged ? S3.maxBeamHalfWidth : S3.beamHalfWidth;
        const dmg = p.ladderCharged ? S3.maxTickDamage : S3.tickDamage;
        const forEach = ctx.forEachTarget;
        let shakeIds = [pid];       // 📳 흔들림은 시전자 + 맞은 대상만

        if (typeof forEach === 'function') {
            // 기둥은 마방진 중심에서 '아래로' 내려꽂힌다 (세로 무한, 가로 half)
            const hitTest = (o, r) => Math.abs(o.x - p.ladderX) <= half + (r || 0)
                                   && o.y >= p.ladderY - (r || 0);
            forEach(p, hitTest, (t) => {
                hitOne(p, t, dmg, ctx);
                // ⏳ 맞은 대상의 모든 스킬 쿨타임을 1초씩 늘린다
                addCdPenalty(t.obj, S3.cdPenalty);
                // 🧍 사다리가 끝날 때까지 경직된다 (매 틱 갱신되므로 계속 묶인다)
                if (t.obj) t.obj.ladderLockUntil = Math.max(t.obj.ladderLockUntil || 0, p.ladderBeamEnd);
                if (t.kind === 'player') {
                    shakeIds.push(t.id);
                    ctx.io.emit('syncPlayerFull', t.obj);
                }
            });
        }

        ctx.io.emit('kurusuLadderTick', {
            id: pid, x: p.ladderX, y: p.ladderY,
            halfWidth: half, charged: !!p.ladderCharged, shakeIds: shakeIds
        });
    }
}

/** ⏳ 맞은 대상의 모든 스킬 쿨타임을 늘린다 */
const CD_FIELDS = ['cd1', 'cd2', 'cd3', 'cd4', 'cdY',
                   'dLightCdEnd', 'dDarkCdEnd', 'dKickCdEnd',
                   'daidoS1CdEnd', 'daidoS2CdEnd', 'daidoS3CdEnd',
                   'kurusuS1CdEnd', 'kurusuS2CdEnd', 'kurusuS3CdEnd',
                   'guraCdEnd', 'yamiCdEnd', 'kashimoBoltCdEnd'];
function addCdPenalty(o, ms) {
    if (!o) return;
    const now = Date.now();
    for (const f of CD_FIELDS) {
        if (o[f] === undefined) continue;
        // 아직 안 돌아간 쿨타임만 늘린다 (이미 준비된 스킬은 건드리지 않는다)
        if (o[f] > now) o[f] += ms;
    }
}

// ============================================================================
// 🕊️ 여분의 목숨 — 죽는 대신 체력 15% 로 부활
//    checkPlayerDeath 보다 먼저 호출된다.
//    @return true 면 '살아남았다' 는 뜻 (사망 처리를 하지 않는다)
// ============================================================================
function tryExtraLife(o, ctx) {
    if (!o || !(o.extraLives > 0)) return false;
    o.extraLives--;
    o.hp = Math.max(1, Math.round(o.maxHp * REVIVE_HP_RATIO));
    o.frozenUntil = 0; o.knockbackForce = 0;
    if (ctx && ctx.io) {
        ctx.io.emit('kurusuRevive', { id: o.id, x: o.x, y: o.y, left: o.extraLives });
        ctx.io.emit('syncPlayerFull', o);
    }
    return true;
}

// ============================================================================
// 🕊️ 패시브 — 10초마다 신성력 1
// ============================================================================
function processHoly(now, ctx) {
    const State = ctx.State;
    for (let pid in State.players) {
        const p = State.players[pid];
        if (!p || p.characterType !== 'KURUSU') continue;
        if (!p.holyNextAt) { p.holyNextAt = now + HOLY_INTERVAL; continue; }
        if (now < p.holyNextAt) continue;
        p.holyNextAt = now + HOLY_INTERVAL;
        if ((p.holyPower || 0) < HOLY_MAX) {
            p.holyPower = Math.min(HOLY_MAX, (p.holyPower || 0) + 1);
            // ✨ 신성력을 얻는 순간 주변에 잠깐 황금 아우라가 퍼진다
            ctx.io.emit('kurusuHolyTick', { id: pid, x: p.x, y: p.y });
            ctx.io.emit('syncPlayerFull', p);
        }
    }
}

// ============================================================================
// 🎮 진입점
// ============================================================================
function useSkill(p, data, ctx) {
    const Skills = ctx.Skills;
    const now = Date.now();

    // 마방진을 그리는 중에는 다른 스킬을 쓸 수 없다
    if (p.ladderCastEnd && now < p.ladderCastEnd) return;

    if (data.type === 1) {
        const S1 = Skills.KURUSU_S1;
        if (!S1 || now < (p.kurusuS1CdEnd || 0)) return;
        p.kurusuS1CdEnd = now + S1.cd;
        useGather(p, ctx);
        return;
    }
    if (data.type === 2) {
        const S2 = Skills.KURUSU_S2;
        if (!S2 || now < (p.kurusuS2CdEnd || 0)) return;
        p.kurusuS2CdEnd = now + S2.cd;
        useBless(p, ctx);
        return;
    }
    if (data.type === 3) {
        const S3 = Skills.KURUSU_S3;
        if (!S3 || now < (p.kurusuS3CdEnd || 0)) return;
        p.kurusuS3CdEnd = now + S3.cd;
        useLadder(p, ctx);
        return;
    }
}

function updateLoop(p, now, ctx) {
    // 마방진 시전 중에는 제자리에 선다 (활공은 유지)
    if (p.ladderCastEnd && now < p.ladderCastEnd) {
        p.moveX = 0; p.moveY = 0;
    }
}

/** 🕊️ 서버 전체 주기 처리 (gameLoop 가 한 번만 부른다) */
function processAll(now, ctx) {
    processHoly(now, ctx);
    processBless(now, ctx);
    processLadder(now, ctx);
}

module.exports = {
    useSkill, updateLoop, processAll,
    tryExtraLife, isCharged,
    HOLY_MAX, HOLY_INTERVAL, REVIVE_HP_RATIO
};
