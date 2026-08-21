// 파일명: charLogic/kid.js
// ============================================================================
// 🧲 유스타스 키드 — 자기력으로 고철을 부리는 파괴자
//
//   ── 1번 [어사인] ───────────────────────────────────────────────────────
//     좁은 반경(430) 안의 모든 적에게 자기력을 부여해 고철을 붙인다.
//       · 3초간 고철이 쌓이며 0.5초마다 20 피해
//       · 쌓일수록 이동속도가 점점 느려진다 (100% → 25%)
//       · 3초가 지나면 1초간 완전히 고정된다 (이동 · 점프 · 스킬 전부 불가)
//       · 1초 뒤 고철이 통째로 터져 200 피해
//
//   ── 2번 [댐드 펑크] ────────────────────────────────────────────────────
//     3초간 제자리에 굳어 고철 레이저포를 차징하고, 4초간 발사한다.
//       · 0.1초마다 30 피해
//       · 발사 중 이동키로 조준 방향을 천천히 돌릴 수 있다
//
//   ── 3번 [펑크 로튼] ────────────────────────────────────────────────────
//     5초간 고철을 쌓아 골렘이 되고, 20초간 활동한다.
//       · 평타 피해 1.5배 · 평타 범위 대폭 증가
//       · 점프 높이 1.5배 · 이동속도 1.5배
//       · 스킬 성능은 그대로, 이펙트만 골렘답게 바뀐다
// ============================================================================

/** 대상 하나에게 피해를 준다 */
function hitOne(p, t, dmg, ctx) {
    // 🛡️ [마르코] 불꽃 보호막에 막히면 피해가 통째로 사라진다
    if (typeof ctx.marcoBlocked === 'function' && ctx.marcoBlocked(t.obj, p.team)) return;
    // 🏛️ 넥서스는 전용 함수로 처리한다
    if (t.kind === 'base') { if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg); return; }

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
    } catch (e) { console.error('[KID KILL]', e); }
}

/** 원형 범위 안의 모든 적에게 피해 */
function sweep(p, cx, cy, radius, dmg, ctx) {
    const forEach = ctx.forEachTarget;
    if (typeof forEach !== 'function') return;
    const hitTest = (o, r) => Math.hypot(cx - o.x, cy - o.y) < radius + (r || 0);
    forEach(p, hitTest, (t) => hitOne(p, t, dmg, ctx));
}

// ============================================================================
// 🧲 1번 [어사인]
// ============================================================================
function useAssign(p, ctx) {
    const S1 = ctx.Skills.KID_S1;
    const forEach = ctx.forEachTarget;
    const now = Date.now();
    let marked = [];

    if (typeof forEach === 'function') {
        const inR = (o, r) => Math.hypot(p.x - o.x, p.y - o.y) < S1.radius + (r || 0);
        forEach(p, inR, (t) => {
            const o = t.obj;
            if (!o || o.hp === undefined || o.hp <= 0 || o.state === 'dead') return;
            if (t.kind === 'base') return;              // 넥서스에는 붙지 않는다

            ctx.State.kidMarks.push({
                ownerId: p.id, team: p.team,
                targetId: t.id, kind: t.kind, obj: o,
                startAt: now,
                stackEnd: now + S1.stackTime,
                holdEnd: now + S1.stackTime + S1.holdTime,
                nextTick: now + S1.tickInterval
            });
            marked.push({ id: t.id, x: o.x, y: o.y });
        });
    }

    ctx.io.emit('kidAssign', {
        id: p.id, x: p.x, y: p.y, radius: S1.radius,
        stackMs: S1.stackTime, holdMs: S1.holdTime,
        targets: marked, golem: !!(p.kidGolemEnd && now < p.kidGolemEnd)
    });
}

/** 🧲 매 프레임 : 고철 축적 → 고정 → 폭발 */
function processMarks(now, ctx) {
    const State = ctx.State;
    const S1 = ctx.Skills.KID_S1;
    if (!State.kidMarks || !State.kidMarks.length) return;

    for (let i = State.kidMarks.length - 1; i >= 0; i--) {
        const m = State.kidMarks[i];
        const o = m.obj;
        const owner = State.players[m.ownerId];

        // 대상이나 시전자가 사라지면 정리한다
        if (!o || !owner || o.hp === undefined || o.hp <= 0 || o.isDead || o.state === 'dead') {
            clearMark(o);
            State.kidMarks.splice(i, 1);
            continue;
        }

        // ── ① 폭발 시점 ────────────────────────────────────────
        if (now >= m.holdEnd) {
            ctx.io.emit('kidAssignBlast', {
                x: o.x, y: o.y, radius: S1.blastRadius,
                golem: !!(owner.kidGolemEnd && now < owner.kidGolemEnd)
            });
            hitOne(owner, { obj: o, kind: m.kind, id: m.targetId }, S1.blastDamage, ctx);
            clearMark(o);
            State.kidMarks.splice(i, 1);
            continue;
        }

        // ── ② 완전 고정 구간 (쌓임이 끝난 뒤 1초) ──────────────
        if (now >= m.stackEnd) {
            o.kidHoldUntil = m.holdEnd;
            o.kidSlow = 0;                       // 아예 못 움직인다
            if (m.kind === 'player') ctx.io.emit('syncPlayerFull', o);
            continue;
        }

        // ── ③ 고철이 쌓이는 구간 (3초) ─────────────────────────
        const f = (now - m.startAt) / S1.stackTime;          // 0 → 1
        o.kidStack = Math.max(0, Math.min(1, f));
        // 쌓일수록 느려진다 (100% → 25%)
        o.kidSlow = 1 - (1 - S1.slowMin) * o.kidStack;

        if (now >= m.nextTick) {
            m.nextTick = now + S1.tickInterval;
            hitOne(owner, { obj: o, kind: m.kind, id: m.targetId }, S1.tickDamage, ctx);
        }
        if (m.kind === 'player') ctx.io.emit('syncPlayerFull', o);
    }
}

function clearMark(o) {
    if (!o) return;
    o.kidStack = 0;
    o.kidSlow = 1;
    o.kidHoldUntil = 0;
}

// ============================================================================
// 🧲 2번 [댐드 펑크]
// ============================================================================
function useLaser(p, data, ctx) {
    const S2 = ctx.Skills.KID_S2;
    const now = Date.now();
    const dir = (data && data.dir === -1) ? -1 : 1;

    p.kidLaserCastEnd = now + S2.castTime;
    p.kidLaserFireEnd = 0;
    p.kidLaserNextTick = 0;
    p.kidLaserAngle = (dir === -1) ? Math.PI : 0;   // 바라보는 쪽에서 시작
    p.kidLaserX = p.x; p.kidLaserY = p.y;

    ctx.io.emit('kidLaserCast', {
        id: p.id, x: p.x, y: p.y,
        castMs: S2.castTime, angle: p.kidLaserAngle,
        golem: !!(p.kidGolemEnd && now < p.kidGolemEnd)
    });
    ctx.io.emit('syncPlayerFull', p);
}

/** 🧲 매 프레임 : 차징 → 발사 */
function processLaser(now, ctx) {
    const State = ctx.State;
    const S2 = ctx.Skills.KID_S2;

    for (let pid in State.players) {
        const p = State.players[pid];
        if (!p) continue;

        // ── ① 차징 중 ──────────────────────────────────────────
        if (p.kidLaserCastEnd) {
            if (p.isDead) { p.kidLaserCastEnd = 0; continue; }
            if (now < p.kidLaserCastEnd) continue;
            p.kidLaserCastEnd = 0;
            p.kidLaserFireEnd = now + S2.fireTime;
            p.kidLaserNextTick = now;
            ctx.io.emit('kidLaserFire', {
                id: pid, x: p.kidLaserX, y: p.kidLaserY,
                fireMs: S2.fireTime, angle: p.kidLaserAngle,
                range: S2.range, halfWidth: S2.halfWidth,
                golem: !!(p.kidGolemEnd && now < p.kidGolemEnd)
            });
            ctx.io.emit('syncPlayerFull', p);
        }

        // ── ② 발사 중 ──────────────────────────────────────────
        if (!p.kidLaserFireEnd) continue;
        if (p.isDead || now >= p.kidLaserFireEnd) {
            p.kidLaserFireEnd = 0; p.kidLaserNextTick = 0;
            ctx.io.emit('kidLaserEnd', { id: pid });
            ctx.io.emit('syncPlayerFull', p);
            continue;
        }
        if (now < (p.kidLaserNextTick || 0)) continue;
        p.kidLaserNextTick = now + S2.tickInterval;

        // 레이저는 시전 위치에서 각도 방향으로 뻗는다
        const ax = Math.cos(p.kidLaserAngle), ay = Math.sin(p.kidLaserAngle);
        const forEach = ctx.forEachTarget;
        if (typeof forEach === 'function') {
            const hitTest = (o, r) => {
                const rx = o.x - p.kidLaserX, ry = o.y - p.kidLaserY;
                const along = rx * ax + ry * ay;                 // 진행 방향 거리
                if (along < -(r || 0) || along > S2.range) return false;
                const perp = Math.abs(rx * (-ay) + ry * ax);     // 축에서 벗어난 거리
                return perp <= S2.halfWidth + (r || 0);
            };
            forEach(p, hitTest, (t) => hitOne(p, t, S2.tickDamage, ctx));
        }
        ctx.io.emit('kidLaserTick', { id: pid, angle: p.kidLaserAngle });
    }
}

/** 🎯 발사 중 조준 방향을 천천히 돌린다 */
function aimLaser(p, targetAngle, dtSec, ctx) {
    const S2 = ctx.Skills.KID_S2;
    if (!p.kidLaserFireEnd || Date.now() >= p.kidLaserFireEnd) return;
    let diff = targetAngle - p.kidLaserAngle;
    // -π ~ π 로 정규화
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const step = S2.turnSpeed * dtSec;
    if (Math.abs(diff) <= step) p.kidLaserAngle = targetAngle;
    else p.kidLaserAngle += Math.sign(diff) * step;
}

// ============================================================================
// 🧲 3번 [펑크 로튼]
// ============================================================================
function useGolem(p, ctx) {
    const S3 = ctx.Skills.KID_S3;
    const now = Date.now();

    p.kidGolemCastEnd = now + S3.castTime;
    p.kidGolemEnd = 0;

    ctx.io.emit('kidGolemCast', {
        id: p.id, x: p.x, y: p.y, castMs: S3.castTime
    });
    ctx.io.emit('syncPlayerFull', p);
}

/** 🧲 매 프레임 : 변신 → 골렘 유지 */
function processGolem(now, ctx) {
    const State = ctx.State;
    const S3 = ctx.Skills.KID_S3;

    for (let pid in State.players) {
        const p = State.players[pid];
        if (!p) continue;

        // ── ① 변신 중 (5초) ────────────────────────────────────
        if (p.kidGolemCastEnd) {
            if (p.isDead) { p.kidGolemCastEnd = 0; continue; }
            if (now < p.kidGolemCastEnd) continue;
            p.kidGolemCastEnd = 0;
            p.kidGolemEnd = now + S3.duration;
            ctx.io.emit('kidGolemStart', {
                id: pid, x: p.x, y: p.y, durationMs: S3.duration
            });
            ctx.io.emit('syncPlayerFull', p);
        }

        // ── ② 골렘 유지 ────────────────────────────────────────
        if (!p.kidGolemEnd) continue;
        if (p.isDead || now >= p.kidGolemEnd) {
            p.kidGolemEnd = 0;
            ctx.io.emit('kidGolemEnd', { id: pid, x: p.x, y: p.y });
            ctx.io.emit('syncPlayerFull', p);
        }
    }
}

/** 🗿 지금 골렘 상태인가 */
function isGolem(p) {
    return !!(p && p.kidGolemEnd && Date.now() < p.kidGolemEnd);
}

// ============================================================================
// 🎮 진입점
// ============================================================================
function useSkill(p, data, ctx) {
    const Skills = ctx.Skills;
    const now = Date.now();

    // 차징 · 변신 · 발사 중에는 다른 스킬을 쓸 수 없다
    if (p.kidLaserCastEnd && now < p.kidLaserCastEnd) return;
    if (p.kidLaserFireEnd && now < p.kidLaserFireEnd) return;
    if (p.kidGolemCastEnd && now < p.kidGolemCastEnd) return;
    // 어사인에 걸려 고정된 상태에서도 못 쓴다
    if (p.kidHoldUntil && now < p.kidHoldUntil) return;

    if (data.type === 1) {
        const S1 = Skills.KID_S1;
        if (!S1 || now < (p.kidS1CdEnd || 0)) return;
        p.kidS1CdEnd = now + S1.cd;
        useAssign(p, ctx);
        return;
    }
    if (data.type === 2) {
        const S2 = Skills.KID_S2;
        if (!S2 || now < (p.kidS2CdEnd || 0)) return;
        p.kidS2CdEnd = now + S2.cd;
        useLaser(p, data, ctx);
        return;
    }
    if (data.type === 3) {
        const S3 = Skills.KID_S3;
        if (!S3 || now < (p.kidS3CdEnd || 0)) return;
        p.kidS3CdEnd = now + S3.cd;
        useGolem(p, ctx);
        return;
    }
}

function updateLoop(p, now, ctx) {
    // 차징 · 발사 · 변신 중에는 제자리에 굳는다
    if ((p.kidLaserCastEnd && now < p.kidLaserCastEnd) ||
        (p.kidLaserFireEnd && now < p.kidLaserFireEnd) ||
        (p.kidGolemCastEnd && now < p.kidGolemCastEnd) ||
        (p.kidHoldUntil && now < p.kidHoldUntil)) {
        p.moveX = 0; p.moveY = 0;
    }
}

/** 🧲 서버 전체 주기 처리 (gameLoop 가 한 번만 부른다) */
function processAll(now, ctx) {
    processMarks(now, ctx);
    processLaser(now, ctx);
    processGolem(now, ctx);
}

module.exports = {
    useSkill, updateLoop, processAll,
    aimLaser, isGolem, clearMark
};
