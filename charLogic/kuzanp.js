// 파일명: charLogic/kuzanp.js
// ============================================================================
// ❄️ 쿠잔(해적) — 얼음과 냉기
//
//   ── 1번 [아이스 볼] ────────────────────────────────────────────────────
//     전방으로 얼음 구슬을 빠르게 던진다. 관통하지 않는다.
//     처음 맞은 대상 자리에서 냉기가 터지며, 반경 안의 모든 적이 2초간 언다.
//       · 피해 200 · 쿨타임 25초
//
//   ── 2번 [아이스 글러브] ────────────────────────────────────────────────
//     6초 동안 주먹에 얼음 장갑을 두른다.
//       · 이동속도 +35%
//       · 평타가 맞을 때마다 냉기가 터져 50 피해 + 0.3초 동결 (평타 피해와 별개)
//       · 지나간 자리에 1초간 서리 자국이 남는다
//       · 쿨타임 35초
//
//   ── 3번 [아이스 타임] ──────────────────────────────────────────────────
//     0.5초간 몸이 얼음으로 뒤덮인 뒤, 조이스틱 방향으로 곧게 돌진한다.
//       · 방향 전환 없음 · 관통 불가 (처음 맞은 대상에서 멈춘다)
//       · 가로벽(발판)은 통과하고 세로벽은 막힌다
//       · 맞은 대상과 그 주변이 5초간 언다
//       · 피해 400 · 쿨타임 45초
// ============================================================================

/** 대상 하나에게 피해를 준다 */
function hitOne(p, t, dmg, ctx) {
    // 🛡️ [마르코] 보호막을 쓰는 본인은 완전 무적이다
    {
        const _o = t && t.obj;
        if (_o && _o.marcoInvUntil && Date.now() < _o.marcoInvUntil) return;
    }
    // 🛡️ [마르코] 불꽃 보호막에 막히면 피해가 통째로 사라진다
    if (typeof ctx.marcoBlocked === 'function' && ctx.marcoBlocked(t.obj, p.team)) return;
    // 🏛️ 넥서스는 전용 함수로 처리한다
    if (t.kind === 'base') {
        if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg);
        return;
    }

    const { io, emitDamageText, checkPlayerDeath } = ctx;
    const o = t.obj;
    if (!o || o.hp === undefined || o.hp <= 0 || o.state === 'dead') return;

    if (t.kind === 'player') {
        const actual = dmg * (1 - (o.defense || 0));
        o.hp -= actual;
        emitDamageText(o.x, o.y, actual);
        io.to(t.id).emit('takeDamage', actual);
        if (o.hp <= 0) { checkPlayerDeath(o, p.id); return; }
        io.emit('syncPlayerFull', o);
    } else {
        const d = (typeof ctx.toemaDmg === 'function') ? ctx.toemaDmg(p, dmg) : dmg;
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
    } catch (e) { console.error('[KUZANP KILL]', e); }
}

/** ❄️ 동결 시간 보정 — ⚖️ 한껏 해이해진 정의는 +1초 */
function freezeMs(p, base) {
    return base + ((p && p.hasLazyJustice) ? 1000 : 0);
}

/** ❄️ 대상을 얼린다 */
function freeze(o, ms) {
    if (!o) return;
    o.frozenUntil = Math.max(o.frozenUntil || 0, Date.now() + ms);
}

/** 🔒 [얼음 의족] 5초간 모든 스킬을 봉인한다 */
function sealSkills(o) {
    if (!o) return;
    o.skillFreezeUntil = Math.max(o.skillFreezeUntil || 0, Date.now() + 5000);
}

/** ❄️ 원형 범위를 얼리고 피해를 준다 */
function iceBurst(p, cx, cy, radius, dmg, freezeMs, ctx) {
    const forEach = ctx.forEachTarget;
    if (typeof forEach !== 'function') return;
    const inR = (o, r) => Math.hypot(cx - o.x, cy - o.y) < radius + (r || 0);
    forEach(p, inR, (t) => {
        if (dmg > 0) hitOne(p, t, dmg, ctx);
        if (freezeMs > 0 && t.kind !== 'base') freeze(t.obj, freezeMs);
        if (t.kind === 'player') ctx.io.emit('syncPlayerFull', t.obj);
    });
}

// ============================================================================
// ❄️ 1번 [아이스 볼]
// ============================================================================
function useBall(p, data, ctx) {
    const S1 = ctx.Skills.KUZANP_S1;
    const dir = (data && data.dir === -1) ? -1 : 1;

    // 🧭 [수정] 이동키가 아니라 '바라보는 방향' 으로만 던진다 (좌 / 우)
    const dx = dir, dy = 0;
    const len = 1;

    // 🛟 상한 — 비정상 상황에서 무한히 쌓이지 않게 한다
    if (ctx.State.kuzanpBalls.length >= 24) ctx.State.kuzanpBalls.shift();
    ctx.State.kuzanpBalls.push({
        ownerId: p.id, team: p.team,
        x: p.x, y: p.y,
        vx: (dx / len) * S1.speed, vy: (dy / len) * S1.speed,
        traveled: 0
    });

    // 🧊 빙빙열매 : 구슬이 커지고 판정도 함께 커진다
    const R1 = p.hasHie ? Math.round(S1.radius * 1.6) : S1.radius;
    ctx.io.emit('kuzanpBall', {
        id: p.id, x: p.x, y: p.y,
        dirX: dx / len, dirY: dy / len,
        speed: S1.speed, range: S1.range, radius: R1
    });
}

/** ❄️ 매 프레임 : 구슬 이동 → 첫 명중에서 터진다 (관통 없음) */
function processBalls(now, ctx) {
    const State = ctx.State;
    const S1 = ctx.Skills.KUZANP_S1;
    if (!State.kuzanpBalls || !State.kuzanpBalls.length) return;

    for (let i = State.kuzanpBalls.length - 1; i >= 0; i--) {
        const b = State.kuzanpBalls[i];
        const owner = State.players[b.ownerId];
        if (!owner) { State.kuzanpBalls.splice(i, 1); continue; }

        b.x += b.vx; b.y += b.vy;
        b.traveled += Math.hypot(b.vx, b.vy);

        // 🛡️ [마르코] 보호벽에 닿으면 그 자리에서 막힌다
        if (ctx.shieldAt && ctx.shieldAt(b.x, b.y, b.team)) {
            ctx.io.emit('marcoShieldHit', { x: b.x, y: b.y });
            State.kuzanpBalls.splice(i, 1);
            continue;
        }

        // 사거리를 다 쓰면 그냥 사라진다
        if (b.traveled >= S1.range) { State.kuzanpBalls.splice(i, 1); continue; }

        // 첫 대상에게 맞으면 그 자리에서 터진다 (관통 불가)
        let hit = null;
        const forEach = ctx.forEachTarget;
        if (typeof forEach === 'function') {
            // 🧊 빙빙열매 : 판정 반경도 커진다
            const BR = owner.hasHie ? S1.radius * 1.6 : S1.radius;
            const near = (o, r) => Math.hypot(b.x - o.x, b.y - o.y) < BR + (r || 0);
            forEach(owner, near, (t) => { if (!hit && t.kind !== 'base') hit = t; });
        }
        if (!hit) continue;

        // 🧊 빙빙열매 : 폭발 범위가 커지고 동결이 2초 → 3초
        const BLR = owner.hasHie ? Math.round(S1.blastRadius * 1.45) : S1.blastRadius;
        const FZ = freezeMs(owner, owner.hasHie ? 3000 : S1.freezeTime);
        ctx.io.emit('kuzanpBallBlast', { x: b.x, y: b.y, radius: BLR, freezeMs: FZ });
        const dmg = S1.damage + Math.round((owner.bonusDamage || 0) * 1.0);
        iceBurst(owner, b.x, b.y, BLR, dmg, FZ, ctx);
        State.kuzanpBalls.splice(i, 1);
    }
}

// ============================================================================
// ❄️ 2번 [아이스 글러브]
// ============================================================================
function useGlove(p, ctx) {
    const S2 = ctx.Skills.KUZANP_S2;
    const now = Date.now();
    p.kzGloveEnd = now + S2.duration;
    p.kzTrailAt = 0;
    ctx.io.emit('kuzanpGlove', { id: p.id, x: p.x, y: p.y, durationMs: S2.duration });
    ctx.io.emit('syncPlayerFull', p);
}

/**
 * ❄️ 평타가 맞았을 때 냉기를 터뜨린다.
 *    combat.js 가 평타 처리 뒤에 불러 준다.
 */
function onBasicHit(p, tx, ty, ctx) {
    if (!p || !p.kzGloveEnd || Date.now() >= p.kzGloveEnd) return;
    const S2 = ctx.Skills.KUZANP_S2;
    // 🦿 얼음 의족 : 범위 1.5배 · 피해 2배
    const R2 = p.hasIceLeg ? Math.round(S2.blastRadius * 1.5) : S2.blastRadius;
    const D2 = p.hasIceLeg ? S2.blastDamage * 2 : S2.blastDamage;
    const F2 = freezeMs(p, S2.freezeTime);
    ctx.io.emit('kuzanpFrostBurst', { x: tx, y: ty, radius: R2 });
    // 평타 피해와 별개
    iceBurst(p, tx, ty, R2, D2, F2, ctx);
}

/** ❄️ 매 프레임 : 글러브 유지 · 서리 자국 */
function processGlove(now, ctx) {
    const State = ctx.State;
    const S2 = ctx.Skills.KUZANP_S2;
    for (let pid in State.players) {
        const p = State.players[pid];
        if (!p || !p.kzGloveEnd) continue;
        if (p.isDead || now >= p.kzGloveEnd) {
            p.kzGloveEnd = 0;
            ctx.io.emit('kuzanpGloveEnd', { id: pid });
            ctx.io.emit('syncPlayerFull', p);
            continue;
        }
        // 지나간 자리에 서리 자국을 남긴다 (1초)
        if (now - (p.kzTrailAt || 0) >= 90) {
            p.kzTrailAt = now;
            ctx.io.emit('kuzanpFrostTrail', { x: p.x, y: p.y, durationMs: S2.trailMs });
        }
    }
}

// ============================================================================
// ❄️ 3번 [아이스 타임]
// ============================================================================
function useDash(p, data, ctx) {
    const S3 = ctx.Skills.KUZANP_S3;
    const now = Date.now();
    const dir = (data && data.dir === -1) ? -1 : 1;

    let dx = Number(data && data.dirX), dy = Number(data && data.dirY);
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) {
        dx = dir; dy = 0;
    }
    const len = Math.hypot(dx, dy) || 1;

    p.kzDashCastEnd = now + S3.castTime;
    p.kzDashEnd = 0;
    p.kzDashDX = dx / len;
    p.kzDashDY = dy / len;
    p.kzDashHit = false;

    ctx.io.emit('kuzanpDashCast', {
        id: p.id, x: p.x, y: p.y,
        castMs: S3.castTime, dirX: p.kzDashDX, dirY: p.kzDashDY
    });
    ctx.io.emit('syncPlayerFull', p);
}

/** ❄️ 매 프레임 : 결빙 → 돌진 */
function processDash(now, ctx) {
    const State = ctx.State;
    const S3 = ctx.Skills.KUZANP_S3;

    for (let pid in State.players) {
        const p = State.players[pid];
        if (!p) continue;

        // ── ① 0.5초 결빙 ──────────────────────────────────────
        if (p.kzDashCastEnd) {
            if (p.isDead) { p.kzDashCastEnd = 0; continue; }
            if (now < p.kzDashCastEnd) continue;
            p.kzDashCastEnd = 0;
            p.kzDashEnd = now + S3.dashTime;
            ctx.io.emit('kuzanpDash', {
                id: pid, x: p.x, y: p.y,
                dirX: p.kzDashDX, dirY: p.kzDashDY,
                durationMs: S3.dashTime, speed: S3.dashSpeed
            });
            ctx.io.emit('syncPlayerFull', p);
        }

        // ── ② 돌진 ────────────────────────────────────────────
        if (!p.kzDashEnd) continue;
        if (p.isDead || now >= p.kzDashEnd || p.kzDashHit) {
            p.kzDashEnd = 0; p.kzDashHit = false;
            ctx.io.emit('kuzanpDashEnd', { id: pid, x: p.x, y: p.y });
            ctx.io.emit('syncPlayerFull', p);
            continue;
        }

        // 곧게 나아간다 (방향 전환 없음)
        const nx = p.x + p.kzDashDX * S3.dashSpeed;
        const ny = p.y + p.kzDashDY * S3.dashSpeed;

        // 🧱 세로벽은 막히고 가로벽(발판)은 통과한다
        let blocked = false;
        const walls = ctx.SOLID_WALLS || [];
        for (const w of walls) {
            if (nx > w.x - w.w / 2 && nx < w.x + w.w / 2 &&
                ny > w.y - w.h / 2 && ny < w.y + w.h / 2) { blocked = true; break; }
        }
        if (blocked) {
            p.kzDashEnd = 0;
            ctx.io.emit('kuzanpDashEnd', { id: pid, x: p.x, y: p.y });
            ctx.io.emit('syncPlayerFull', p);
            continue;
        }

        p.x = nx; p.y = ny;
        if (typeof ctx.clampSpecialArea === 'function') {
            const c = ctx.clampSpecialArea(p, p.x, p.y);
            if (c) { p.x = c.x; p.y = c.y; }
        }
        p.vy = 0; p.knockbackForce = 0;

        // 처음 맞은 대상에서 멈춘다 (관통 불가)
        let hit = null;
        const forEach = ctx.forEachTarget;
        if (typeof forEach === 'function') {
            const near = (o, r) => Math.hypot(p.x - o.x, p.y - o.y) < S3.hitRadius + (r || 0);
            forEach(p, near, (t) => { if (!hit && t.kind !== 'base') hit = t; });
        }
        if (hit) {
            p.kzDashHit = true;
            const F3 = freezeMs(p, S3.freezeTime);
            ctx.io.emit('kuzanpDashBlast', {
                x: p.x, y: p.y, radius: S3.freezeRadius, freezeMs: F3,
                seal: !!p.hasIceLeg
            });
            const dmg = S3.damage + Math.round((p.bonusDamage || 0) * 1.0);
            iceBurst(p, p.x, p.y, S3.freezeRadius, dmg, F3, ctx);
            // 🦿 얼음 의족 : 맞은 대상의 모든 스킬을 5초간 봉인한다
            if (p.hasIceLeg && typeof ctx.forEachTarget === 'function') {
                const inR = (o, r) => Math.hypot(p.x - o.x, p.y - o.y) < S3.freezeRadius + (r || 0);
                ctx.forEachTarget(p, inR, (t) => {
                    if (t.kind !== 'player') return;
                    sealSkills(t.obj);
                    ctx.io.emit('syncPlayerFull', t.obj);
                });
            }
        }
        ctx.io.emit('syncPlayerFull', p);
    }
}

// ============================================================================
// 🎮 진입점
// ============================================================================
function useSkill(p, data, ctx) {
    const Skills = ctx.Skills;
    const now = Date.now();

    // 결빙·돌진 중에는 다른 스킬을 쓸 수 없다
    if (p.kzDashCastEnd && now < p.kzDashCastEnd) return;
    if (p.kzDashEnd && now < p.kzDashEnd) return;

    if (data.type === 1) {
        const S1 = Skills.KUZANP_S1;
        if (!S1 || now < (p.kzS1CdEnd || 0)) return;
        p.kzS1CdEnd = now + S1.cd;
        useBall(p, data, ctx);
        return;
    }
    if (data.type === 2) {
        const S2 = Skills.KUZANP_S2;
        if (!S2 || now < (p.kzS2CdEnd || 0)) return;
        p.kzS2CdEnd = now + S2.cd;
        useGlove(p, ctx);
        return;
    }
    if (data.type === 3) {
        const S3 = Skills.KUZANP_S3;
        if (!S3 || now < (p.kzS3CdEnd || 0)) return;
        p.kzS3CdEnd = now + S3.cd;
        useDash(p, data, ctx);
        return;
    }
}

function updateLoop(p, now, ctx) {
    // 결빙·돌진 중에는 조작 입력이 반영되지 않는다
    if ((p.kzDashCastEnd && now < p.kzDashCastEnd) ||
        (p.kzDashEnd && now < p.kzDashEnd)) {
        p.moveX = 0; p.moveY = 0;
    }
}

function processAll(now, ctx) {
    processBalls(now, ctx);
    processGlove(now, ctx);
    processDash(now, ctx);
}

module.exports = { useSkill, updateLoop, processAll, onBasicHit };
