// 파일명: charLogic/marco.js
// ============================================================================
// 🔥 마르코 — 불사조의 푸른 불꽃
//
//   ── 고유 패시브 [재생] ─────────────────────────────────────────────────
//     받은 피해가 그대로 게이지에 쌓인다. 2500이 쌓이면 가득 찬다.
//     가득 차는 즉시 3초 동안 몸이 푸른 불꽃에 뒤덮이며
//     0.5초마다 100씩 회복한다. (게이지는 0으로 돌아간다)
//
//   ── 1번 [봉황인] ───────────────────────────────────────────────────────
//     큰 불꽃 덩어리를 전방으로 날린다. 1.5초 동안 날아간다.
//     · 덩어리 근처(300)의 대상은 강하게 끌려와 함께 이동한다
//     · 접촉한 대상에게 250, 1.5초 뒤 터지며 반경 330에 150
//
//   ── 2번 [봉리력] ───────────────────────────────────────────────────────
//     1초간 응축(공중에서도 완전 고정)한 뒤 반경 620에 3초짜리 불길.
//     · 적 : 0.3초마다 30 피해   · 아군 : 0.3초마다 30 회복
//
//   ── 3번 [불사 엉겅퀴] ──────────────────────────────────────────────────
//     조이스틱 방향에 2초간 불꽃 보호막. 그동안 시전자 위치 고정.
//     · 닿은 모든 투사체와 공격을 그 자리에서 막는다
//     · 2초 뒤 회전하며 반경 460에 300 피해로 폭발
//
//   ✨ 모든 스킬 시전 시 몸에 푸른 양날개가 펼쳐진다.
// ============================================================================

const GAUGE_MAX = 2500;      // 이만큼 맞으면 게이지가 찬다
const REGEN_MS = 3000;       // 불꽃 지속
const REGEN_TICK = 500;      // 0.5초마다
const REGEN_AMOUNT = 100;    // 100씩 회복
const WING_MS = 900;         // 날개 펼침 연출 길이

/** ✨ 스킬을 쓸 때마다 푸른 양날개를 펼친다 */
function spreadWings(p, ctx) {
    ctx.io.emit('marcoWings', { id: p.id, x: p.x, y: p.y, durationMs: WING_MS });
}

/** 대상 하나에게 피해를 준다 */
function hitOne(p, t, dmg, ctx) {
    // 🏛️ 넥서스는 전용 함수로 처리한다
    if (t.kind === 'base') { if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg); return; }
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
    } catch (e) { console.error('[MARCO KILL]', e); }
}

/** 🔥 화상 — 1초마다 30, 5초 (황금 벨트 · 새새 열매) */
function applyBurn(p, t, ctx) {
    if (typeof ctx.addBurn !== 'function') return;
    const key = (t.kind === 'player') ? ('player_' + t.id)
              : (t.kind === 'minion') ? ('minion_' + t.id)
              : (t.kind === 'okra') ? ('okra_' + t.id) : t.kind;
    ctx.addBurn(key, t.obj, 30, 5000, p.id);
}

/** 원형 범위 안의 모든 적에게 피해 */
function sweep(p, cx, cy, radius, dmg, ctx) {
    const forEach = ctx.forEachTarget;
    if (typeof forEach !== 'function') return;
    const hitTest = (o, r) => Math.hypot(cx - o.x, cy - o.y) < radius + (r || 0);
    forEach(p, hitTest, (t) => hitOne(p, t, dmg, ctx));
}

// ============================================================================
// 🔥 패시브 [재생] — 받은 피해로 게이지가 찬다
//    checkPlayerDeath 보다 앞, 피해가 들어간 직후에 불린다.
// ============================================================================
function addGauge(p, amount, ctx) {
    if (!p || p.characterType !== 'MARCO') return;
    if (!(amount > 0)) return;
    if (p.marcoRegenUntil && Date.now() < p.marcoRegenUntil) return;  // 불꽃 중에는 안 쌓인다

    p.marcoGauge = (p.marcoGauge || 0) + amount;
    if (p.marcoGauge >= GAUGE_MAX) {
        // 🔥 가득 찼다 — 즉시 3초간 불꽃에 뒤덮인다
        p.marcoGauge = 0;
        const now = Date.now();
        p.marcoRegenUntil = now + REGEN_MS;
        p.marcoRegenNext = now;
        if (ctx && ctx.io) {
            ctx.io.emit('marcoRegen', { id: p.id, x: p.x, y: p.y, durationMs: REGEN_MS });
        }
    }
    if (ctx && ctx.io) ctx.io.emit('syncPlayerFull', p);
}

/** 🔥 매 프레임 : 불꽃 회복 */
function processRegen(now, ctx) {
    const State = ctx.State;
    for (let pid in State.players) {
        const p = State.players[pid];
        if (!p) continue;
        // 🔥 게이지가 가득 차 불꽃이 켜진 순간을 한 번만 알린다
        if (p._marcoRegenAnnounce) {
            p._marcoRegenAnnounce = false;
            ctx.io.emit('marcoRegen', { id: pid, x: p.x, y: p.y, durationMs: REGEN_MS });
        }
        if (!p.marcoRegenUntil) continue;
        if (p.isDead || now >= p.marcoRegenUntil) { p.marcoRegenUntil = 0; p.marcoRegenNext = 0; continue; }
        if (now < (p.marcoRegenNext || 0)) continue;
        p.marcoRegenNext = now + REGEN_TICK;

        let amt = REGEN_AMOUNT;
        if (p.healCutUntil && now < p.healCutUntil) amt *= (p.healCutMul || 0.3);
        const before = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + amt);
        const gained = p.hp - before;
        if (gained > 0) {
            ctx.io.to(pid).emit('heal', Math.round(gained));
            ctx.io.emit('syncPlayerFull', p);
        }
    }
}

// ============================================================================
// 🔥 1번 [봉황인] — 불꽃 덩어리
// ============================================================================
function useBall(p, data, ctx) {
    const S1 = ctx.Skills.MARCO_S1;
    const now = Date.now();

    // 🧭 [수정] 조이스틱이 아니라 '바라보는 방향' 으로만 나간다 (좌 / 우)
    const dx = (data && data.dir === -1) ? -1 : 1;
    const dy = 0;
    const len = 1;

    ctx.State.marcoBalls.push({
        ownerId: p.id, team: p.team,
        x: p.x, y: p.y,
        vx: (dx / len) * S1.speed, vy: (dy / len) * S1.speed,
        endAt: now + S1.duration,
        hitIds: [], grabbed: []
    });

    spreadWings(p, ctx);
    ctx.io.emit('marcoBall', {
        id: p.id, x: p.x, y: p.y,
        dirX: dx / len, dirY: dy / len,
        durationMs: S1.duration, radius: S1.radius
    });
}

/** 🔥 매 프레임 : 불꽃 덩어리 이동 · 끌어당김 · 폭발 */
function processBalls(now, ctx) {
    const State = ctx.State;
    const S1 = ctx.Skills.MARCO_S1;
    if (!State.marcoBalls || !State.marcoBalls.length) return;

    for (let i = State.marcoBalls.length - 1; i >= 0; i--) {
        const b = State.marcoBalls[i];
        const owner = State.players[b.ownerId];

        // 시전자가 사라졌으면 조용히 없앤다
        if (!owner) { State.marcoBalls.splice(i, 1); continue; }

        if (now >= b.endAt) {
            // 💥 1.5초가 지나면 터진다
            ctx.io.emit('marcoBallBlast', { x: b.x, y: b.y, radius: S1.blastRadius });
            sweep(owner, b.x, b.y, S1.blastRadius, S1.blastDamage, ctx);
            State.marcoBalls.splice(i, 1);
            continue;
        }

        b.x += b.vx; b.y += b.vy;

        // 🌀 근처 대상을 강하게 끌어당겨 함께 데려간다
        const forEach = ctx.forEachTarget;
        if (typeof forEach === 'function') {
            const near = (o, r) => Math.hypot(b.x - o.x, b.y - o.y) < S1.pullRadius + (r || 0);
            forEach(owner, near, (t) => {
                const o = t.obj;
                if (!o || o.hp === undefined || o.hp <= 0 || o.state === 'dead') return;

                // 덩어리 중심으로 강하게 빨아들인다
                const gdx = b.x - o.x, gdy = b.y - o.y;
                const gd = Math.hypot(gdx, gdy) || 1;
                if (gd > 30) {
                    const k = Math.min(1, 0.55 + (1 - gd / S1.pullRadius) * 0.4);
                    o.x += gdx * k; o.y += gdy * k;
                    o.vy = 0; o.knockbackForce = 0;
                    if (t.kind === 'player') ctx.io.emit('syncPlayerFull', o);
                }

                // 접촉 피해는 대상마다 한 번만
                if (gd < S1.radius && b.hitIds.indexOf(t.id) === -1) {
                    b.hitIds.push(t.id);
                    hitOne(owner, t, S1.contactDamage, ctx);
                    // 🟡 황금 벨트 : 닿은 대상에게 화상
                    if (owner.hasGoldenBelt) applyBurn(owner, t, ctx);
                }
            });
        }
    }
}

// ============================================================================
// 🔥 2번 [봉리력] — 응축 후 광역 불길
// ============================================================================
function useField(p, data, ctx) {
    const S2 = ctx.Skills.MARCO_S2;
    const now = Date.now();

    p.marcoCastEnd = now + S2.castTime;
    p.marcoFieldX = p.x; p.marcoFieldY = p.y;

    spreadWings(p, ctx);
    ctx.io.emit('marcoFieldCast', {
        id: p.id, x: p.x, y: p.y,
        castMs: S2.castTime, radius: S2.radius
    });
    ctx.io.emit('syncPlayerFull', p);
}

/** 🔥 매 프레임 : 응축 → 불길 */
function processField(now, ctx) {
    const State = ctx.State;
    const S2 = ctx.Skills.MARCO_S2;

    for (let pid in State.players) {
        const p = State.players[pid];
        if (!p) continue;

        // ① 응축 중 (공중에서도 완전 고정)
        if (p.marcoCastEnd) {
            if (p.isDead) { p.marcoCastEnd = 0; continue; }
            if (now < p.marcoCastEnd) continue;
            p.marcoCastEnd = 0;
            // 응축 완료 → 불길 전개 (시전 위치에 고정)
            // 🪽 새새 열매 : 지속 +2초 · 범위 확대
            const fDur = p.hasPhoenixFruit ? (S2.duration + 2000) : S2.duration;
            const fRad = p.hasPhoenixFruit ? Math.round(S2.radius * 1.35) : S2.radius;
            State.marcoFields.push({
                ownerId: pid, team: p.team,
                x: p.marcoFieldX, y: p.marcoFieldY,
                endAt: now + fDur, nextTick: now, radius: fRad
            });
            ctx.io.emit('marcoField', {
                id: pid, x: p.marcoFieldX, y: p.marcoFieldY,
                durationMs: fDur, radius: fRad
            });
            ctx.io.emit('syncPlayerFull', p);
        }
    }

    // ② 불길 지속 처리
    if (!State.marcoFields || !State.marcoFields.length) return;
    for (let i = State.marcoFields.length - 1; i >= 0; i--) {
        const f = State.marcoFields[i];
        if (now >= f.endAt) { State.marcoFields.splice(i, 1); continue; }
        if (now < f.nextTick) continue;
        f.nextTick = now + S2.tickInterval;

        const owner = State.players[f.ownerId];
        if (!owner) { State.marcoFields.splice(i, 1); continue; }

        // 🩸 적에게 피해
        const FR = f.radius || S2.radius;
        sweep(owner, f.x, f.y, FR, S2.tickDamage, ctx);

        // 💚 아군과 자신에게 회복
        for (let pid in State.players) {
            const a = State.players[pid];
            if (!a || a.isDead || a.team !== f.team) continue;
            if (Math.hypot(f.x - a.x, f.y - a.y) > FR) continue;
            let amt = S2.tickHeal;
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
}

// ============================================================================
// 🔥 3번 [불사 엉겅퀴] — 불꽃 보호막
// ============================================================================
function useShield(p, data, ctx) {
    const S3 = ctx.Skills.MARCO_S3;
    const now = Date.now();

    let dx = Number(data && data.dirX), dy = Number(data && data.dirY);
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) {
        dx = (data && data.dir === -1) ? -1 : 1; dy = 0;
    }
    const len = Math.hypot(dx, dy) || 1;

    p.marcoShieldEnd = now + S3.duration;
    p.marcoShieldDX = dx / len;
    p.marcoShieldDY = dy / len;
    // 🪽 [새새 열매] 장착 시 세로 길이가 늘어난다
    p.marcoShieldRY = (p.hasPhoenixFruit ? S3.shieldRadiusY * 1.45 : S3.shieldRadiusY);
    p.marcoShieldX = p.x + p.marcoShieldDX * S3.offset;
    p.marcoShieldY = p.y + p.marcoShieldDY * S3.offset;

    // 🛡️ [신규] 보호막을 쓰는 동안 시전자는 CC 와 피해에 완전히 면역이다
    p.marcoInvUntil = p.marcoShieldEnd;
    p.frozenUntil = 0; p.stunUntil = 0; p.knockbackForce = 0;

    // 🌀 [신규] 보호막과 겹쳐 있는 대상은 즉시 밖으로 튕겨낸다
    if (ctx.State && ctx.State.players) {
        for (const oid in ctx.State.players) {
            const o = ctx.State.players[oid];
            if (!o || o.isDead || o.team === p.team) continue;
            if (ctx.pushOutOfShield && ctx.pushOutOfShield(o, p.team)) {
                ctx.io.emit('marcoShieldHit', { x: o.x, y: o.y });
                ctx.io.emit('syncPlayerFull', o);
            }
        }
        // 몬스터도 밀어낸다
        const mobs = [];
        const St = ctx.State;
        if (St.monster) mobs.push(St.monster);
        if (St.hinbeom) mobs.push(St.hinbeom);
        if (St.blackbeard) mobs.push(St.blackbeard);
        if (St.burgess) mobs.push(St.burgess);
        if (St.sukuna) mobs.push(St.sukuna);
        (St.hinbeomMinions || []).forEach(m => mobs.push(m));
        (St.okras || []).forEach(m => mobs.push(m));
        mobs.forEach(m => {
            if (m && m.hp > 0 && ctx.pushOutOfShield) ctx.pushOutOfShield(m, p.team);
        });
    }

    spreadWings(p, ctx);
    ctx.io.emit('marcoShield', {
        id: p.id, x: p.x, y: p.y,
        dirX: p.marcoShieldDX, dirY: p.marcoShieldDY,
        durationMs: S3.duration, offset: S3.offset,
        radiusX: S3.shieldRadiusX, radiusY: p.marcoShieldRY
    });
    ctx.io.emit('syncPlayerFull', p);
}

/** 🔥 매 프레임 : 보호막 유지 → 회전 폭발 */
function processShield(now, ctx) {
    const State = ctx.State;
    const S3 = ctx.Skills.MARCO_S3;

    for (let pid in State.players) {
        const p = State.players[pid];
        if (!p || !p.marcoShieldEnd) continue;

        if (p.isDead) { p.marcoShieldEnd = 0; continue; }

        // 보호막은 시전자를 따라가지 않는다 (위치 고정)
        if (now < p.marcoShieldEnd) continue;

        // 💥 2초가 지나면 회전하며 폭발한다
        p.marcoShieldEnd = 0;
        p.marcoInvUntil = 0;
        ctx.io.emit('marcoShieldBlast', {
            id: pid, x: p.marcoShieldX, y: p.marcoShieldY,
            radius: S3.blastRadius
        });
        // 🪽 새새 열매 : 폭발에 화상이 붙는다
        if (p.hasPhoenixFruit && typeof ctx.forEachTarget === 'function') {
            const inR = (o, r) => Math.hypot(p.marcoShieldX - o.x, p.marcoShieldY - o.y) < S3.blastRadius + (r || 0);
            ctx.forEachTarget(p, inR, (t) => {
                hitOne(p, t, S3.blastDamage, ctx);
                applyBurn(p, t, ctx);
            });
        } else {
            sweep(p, p.marcoShieldX, p.marcoShieldY, S3.blastRadius, S3.blastDamage, ctx);
        }
        ctx.io.emit('syncPlayerFull', p);
    }
}

/**
 * 🛡️ 보호막이 이 좌표의 공격을 막는가.
 *    투사체 · 광선 · 돌진 등 모든 공격 판정이 이 함수를 거친다.
 *    @return 막혔으면 true
 */
function blockedByShield(State, x, y, attackerTeam) {
    const S3 = (State._marcoS3 || null);
    const R = S3 ? S3.shieldRadius : 210;
    for (let pid in State.players) {
        const p = State.players[pid];
        if (!p || !p.marcoShieldEnd) continue;
        if (Date.now() >= p.marcoShieldEnd) continue;
        // 같은 편 공격은 막지 않는다
        if (attackerTeam !== undefined && p.team === attackerTeam) continue;
        if (Math.hypot(x - p.marcoShieldX, y - p.marcoShieldY) <= R) return true;
    }
    return false;
}

// ============================================================================
// 🎮 진입점
// ============================================================================
function useSkill(p, data, ctx) {
    const Skills = ctx.Skills;
    const now = Date.now();

    // 응축 · 보호막 유지 중에는 다른 스킬을 쓸 수 없다
    if (p.marcoCastEnd && now < p.marcoCastEnd) return;
    if (p.marcoShieldEnd && now < p.marcoShieldEnd) return;

    if (data.type === 1) {
        const S1 = Skills.MARCO_S1;
        if (!S1 || now < (p.marcoS1CdEnd || 0)) return;
        p.marcoS1CdEnd = now + S1.cd;
        useBall(p, data, ctx);
        return;
    }
    if (data.type === 2) {
        const S2 = Skills.MARCO_S2;
        if (!S2 || now < (p.marcoS2CdEnd || 0)) return;
        p.marcoS2CdEnd = now + S2.cd;
        useField(p, data, ctx);
        return;
    }
    if (data.type === 3) {
        const S3 = Skills.MARCO_S3;
        if (!S3 || now < (p.marcoS3CdEnd || 0)) return;
        p.marcoS3CdEnd = now + S3.cd;
        useShield(p, data, ctx);
        return;
    }
}

function updateLoop(p, now, ctx) {
    // 응축 · 보호막 중에는 제자리에 굳는다
    if ((p.marcoCastEnd && now < p.marcoCastEnd) ||
        (p.marcoShieldEnd && now < p.marcoShieldEnd)) {
        p.moveX = 0; p.moveY = 0;
    }
}

/** 🔥 서버 전체 주기 처리 (gameLoop 가 한 번만 부른다) */
function processAll(now, ctx) {
    processRegen(now, ctx);
    processBalls(now, ctx);
    processField(now, ctx);
    processShield(now, ctx);
}

/**
 * 🔥 게이지만 조용히 쌓는다 (io 방송 없이).
 *    index.js 의 syncPlayerFull 훅이 부르므로, 여기서 다시 방송하면
 *    무한 재귀가 된다. 그래서 방송은 하지 않는다.
 *    발동(불꽃) 상태만 세팅하고, 화면 갱신은 다음 syncPlayerFull 이 처리한다.
 */
function addGaugeQuiet(p, amount) {
    if (!p || p.characterType !== 'MARCO') return;
    if (!(amount > 0)) return;
    const now = Date.now();
    if (p.marcoRegenUntil && now < p.marcoRegenUntil) return;   // 불꽃 중에는 안 쌓인다

    p.marcoGauge = (p.marcoGauge || 0) + amount;
    if (p.marcoGauge >= GAUGE_MAX) {
        p.marcoGauge = 0;
        p.marcoRegenUntil = now + REGEN_MS;
        p.marcoRegenNext = now;
        p._marcoRegenAnnounce = true;    // 다음 프레임에 이펙트를 알린다
    }
}

module.exports = {
    useSkill, updateLoop, processAll,
    addGauge, addGaugeQuiet, blockedByShield,
    GAUGE_MAX, REGEN_MS, REGEN_TICK, REGEN_AMOUNT
};
