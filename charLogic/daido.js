// 파일명: charLogic/daido.js
// ============================================================================
// ⚔️ 다이도 하가네 — 검 하나로 모든 걸 베는 검사
//
//   · 1번 [무자비]  1.5초간 그 자리에 굳은 채 전방위로 검을 휘두른다.
//                   0.1초마다 반경 안의 모든 적에게 20.
//
//   · 2번 [질풍참]  2초간 전방으로 빠르게 돌진하며 주위를 벤다.
//                   돌진 중에는 이동키와 스킬을 쓸 수 없고, 공중에 떠 있을 수 있다.
//                   0.2초마다 20을 주며, 맞은 대상은 시전자 근처로 빨려 들어온다.
//                   돌진이 끝나면 360도로 크게 베어 50 + 1초 기절.
//
//   · 3번 [일섬]    0.5초 굳었다가 전방으로 크고 빠르게 벤다.
//                   300 + 출혈(0.4초마다 20, 2초).
//
//   · 평타 3연타    세 번째 평타마다 0.5초짜리 짧은 전방위 베기.
//                   0.1초마다 30, 경직 없음. (볼사리노와 같은 연타 판정)
//
//   ⚠️ 피해는 전부 서버가 판정한다. 클라이언트는 이펙트만 그린다.
// ============================================================================

// ============================================================================
// ⚔️ 검 계열 아이템 효과
//
//   잡검   : 스킬 피해 +10%
//   도좌마 : 잡검 효과 + 타격 횟수 증가 (1번 15→20 · 2번 5→7 · 3번 1→2)
//   용골   : 위 효과 + 흡혈 30%
//   석혼도 : 위 효과 + 방어 무시 + 2.5초 동안 대상 회복량 30% 로 저하
//
//   상위 검이 하위 검의 플래그를 전부 켜므로 아래 판정만으로 누적된다.
// ============================================================================

const HEAL_CUT_MS = 2500;    // 석혼도 : 회복 저하 지속시간
const HEAL_CUT_MUL = 0.3;    // 회복량을 30% 로 낮춘다
const LIFESTEAL = 0.30;      // 용골 : 흡혈 30%

/** 🗡️ 스킬 피해 배율 (잡검 계열 +10%) */
function skillMul(p) { return p.hasJapgeom ? 1.1 : 1.0; }

/** 🔢 도좌마 이상이면 타격 횟수가 늘어난다 */
function tickCount(p, base, boosted) { return p.hasDojwama ? boosted : base; }

/** 🩸 용골 흡혈 — 넣은 피해의 30% 를 회복한다 */
function applyLifesteal(p, dealt, ctx) {
    if (!p.hasYonggol || dealt <= 0) return;
    const heal = dealt * LIFESTEAL;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + heal);
    const gained = p.hp - before;
    if (gained > 0) {
        // 초당회복처럼 초록 숫자로 보여준다
        if (ctx.io) ctx.io.emit('floatingText', { x: p.x, y: p.y - 40, val: Math.round(gained), type: 'heal' });
        p._daidoHealAcc = (p._daidoHealAcc || 0) + gained;
    }
}

/** 대상 하나에게 피해를 준다 (플레이어 / 몬스터 공용) */
function hitOne(p, t, dmg, ctx, opts) {
    const { io, emitDamageText, checkPlayerDeath } = ctx;
    const o = t.obj;
    if (!o || o.hp === undefined || o.hp <= 0 || o.state === 'dead') return;

    // ⚔️ 잡검 계열 : 스킬 피해 +10%
    dmg = dmg * skillMul(p);

    if (t.kind === 'player') {
        // 🗡️ 석혼도 : 방어 무시
        let actual = p.hasSeokhondo ? dmg : dmg * (1 - (o.defense || 0));
        o.hp -= actual;
        emitDamageText(o.x, o.y, actual);
        applyLifesteal(p, actual, ctx);
        // 🩸 석혼도 : 2.5초 동안 회복량을 30% 로 낮춘다
        if (p.hasSeokhondo) {
            o.healCutUntil = Math.max(o.healCutUntil || 0, Date.now() + HEAL_CUT_MS);
            o.healCutMul = HEAL_CUT_MUL;
        }
        if (opts && opts.stunMs) {
            o.frozenUntil = Math.max(o.frozenUntil || 0, Date.now() + opts.stunMs);
        }
        if (o.hp <= 0) { checkPlayerDeath(o, p.id); return; }
        io.emit('syncPlayerFull', o);
    } else {
        // ⚔️ 퇴마의 검 보정은 몬스터에게만
        let d = (typeof ctx.toemaDmg === 'function') ? ctx.toemaDmg(p, dmg) : dmg;
        o.hp -= d;
        emitDamageText(o.x, o.y, d);
        applyLifesteal(p, d, ctx);
        if (p.hasSeokhondo) {
            o.healCutUntil = Math.max(o.healCutUntil || 0, Date.now() + HEAL_CUT_MS);
            o.healCutMul = HEAL_CUT_MUL;
        }
        if (opts && opts.stunMs) {
            o.frozenUntil = Math.max(o.frozenUntil || 0, Date.now() + opts.stunMs);
        }
        if (t.kind === 'hinbeom' && typeof ctx.recordHinbeomDamage === 'function') {
            ctx.recordHinbeomDamage(p.id, d);
        }
        if (o.hp <= 0) killByKind(t, p.id, ctx);
    }
}

/** 몬스터 종류에 맞는 처치 함수로 넘긴다 */
function killByKind(t, attackerId, ctx) {
    try {
        if (t.kind === 'monster' && ctx.killMonster) ctx.killMonster(attackerId);
        else if (t.kind === 'hinbeom' && ctx.killHinbeom) ctx.killHinbeom(attackerId);
        else if (t.kind === 'blackbeard' && ctx.killBlackbeard) ctx.killBlackbeard(attackerId);
        else if (t.kind === 'burgess' && ctx.killBurgess) ctx.killBurgess(attackerId);
        else if (t.kind === 'sukuna' && ctx.killSukuna) ctx.killSukuna(attackerId);
        else if (t.kind === 'minion' && ctx.killMinion) ctx.killMinion(t.obj, attackerId);
        else if (t.kind === 'okra' && ctx.killOkra) ctx.killOkra(t.obj, attackerId);
    } catch (e) { console.error('[DAIDO KILL]', e); }
}

/** 원형 범위 안의 모든 적에게 피해 */
function sweepCircle(p, cx, cy, radius, dmg, ctx, opts) {
    const forEach = ctx.forEachTarget;   // serverContext 는 Damage 를 평평하게 펼쳐 담는다
    if (typeof forEach !== "function") return;
    const hitTest = (o, r) => Math.hypot(cx - o.x, cy - o.y) < radius + (r || 0);
    forEach(p, hitTest, (t) => hitOne(p, t, dmg, ctx, opts));
}

// ============================================================================
// ⚔️ 1번 [무자비]
// ============================================================================
function startFury(p, ctx) {
    const S1 = ctx.Skills.DAIDO_S1;
    const now = Date.now();

    // 🔢 도좌마 이상 : 1.5초 동안 15회 → 20회
    //    지속시간은 그대로 두고 간격만 줄여서 횟수를 늘린다.
    const hits = tickCount(p, 15, 20);
    p.daidoFuryStep = S1.duration / hits;

    p.daidoFury = true;
    p.daidoFuryEnd = now + S1.duration;
    p.daidoFuryNext = now;
    p.isCasting = true;
    p.moveX = 0; p.moveY = 0;

    ctx.io.emit('daidoFury', {
        id: p.id, x: p.x, y: p.y, durationMs: S1.duration,
        radius: S1.radius, hits: hits
    });
    ctx.io.emit('syncPlayerFull', p);
}

// ============================================================================
// 💨 2번 [질풍참]
// ============================================================================
function startRush(p, ctx) {
    const S2 = ctx.Skills.DAIDO_S2;
    const now = Date.now();

    // 🔢 도좌마 이상 : 2초 동안 5회 → 7회
    const hits = tickCount(p, 5, 7);
    p.daidoRushStep = S2.duration / hits;

    p.daidoRush = true;
    p.daidoRushEnd = now + S2.duration;
    p.daidoRushNext = now;
    p.daidoRushDir = (p.lastFacing === -1) ? -1 : 1;
    p.moveX = 0; p.moveY = 0;

    ctx.io.emit('daidoRush', {
        id: p.id, x: p.x, y: p.y, dir: p.daidoRushDir,
        durationMs: S2.duration, hitRadius: S2.hitRadius, hits: hits
    });
    ctx.io.emit('syncPlayerFull', p);
}

/** 💨 돌진이 끝나면 360도로 크게 벤다 */
function finishRush(p, ctx) {
    const S2 = ctx.Skills.DAIDO_S2;
    p.daidoRush = false; p.daidoRushEnd = 0; p.daidoRushNext = 0;

    ctx.io.emit('daidoRushFinish', { id: p.id, x: p.x, y: p.y, radius: S2.finishRadius });
    sweepCircle(p, p.x, p.y, S2.finishRadius, S2.finishDamage, ctx, { stunMs: S2.finishStun });
    ctx.io.emit('syncPlayerFull', p);
}

// ============================================================================
// ⚡ 3번 [일섬]
// ============================================================================
function startIai(p, ctx) {
    const S3 = ctx.Skills.DAIDO_S3;
    const now = Date.now();

    p.daidoIaiAt = now + S3.castTime;
    p.daidoIaiDir = (p.lastFacing === -1) ? -1 : 1;
    p.isCasting = true;
    p.moveX = 0; p.moveY = 0;

    ctx.io.emit('daidoIaiCharge', {
        id: p.id, x: p.x, y: p.y, dir: p.daidoIaiDir,
        castMs: S3.castTime, range: S3.range, thickness: S3.thickness
    });
    ctx.io.emit('syncPlayerFull', p);
}

/** ⚡ 일섬 발동 — 전방 직사각형 범위를 벤다 */
function fireIai(p, ctx) {
    const S3 = ctx.Skills.DAIDO_S3;
    const dir = (p.daidoIaiDir === -1) ? -1 : 1;

    p.daidoIaiAt = 0;
    p.isCasting = false;

    // 🔢 도좌마 이상 : 1회 → 2회 (두 번째도 동일하게 300 + 출혈)
    const hits = tickCount(p, 1, 2);

    for (let k = 0; k < hits; k++) {
        // 두 번째 참격은 아주 살짝 늦게 나가 겹쳐 보이지 않게 한다
        if (k === 0) doIaiSwing(p, ctx, dir, S3, k);
        else setTimeout(() => {
            try { if (!p.isDead) doIaiSwing(p, ctx, dir, S3, k); }
            catch (e) { console.error('[DAIDO IAI]', e); }
        }, 140);
    }
    ctx.io.emit('syncPlayerFull', p);
}

/** ⚡ 일섬 한 번을 실제로 그어 판정한다 */
function doIaiSwing(p, ctx, dir, S3, idx) {
    const forEach = ctx.forEachTarget;

    ctx.io.emit('daidoIai', {
        id: p.id, x: p.x, y: p.y, dir: dir,
        range: S3.range, thickness: S3.thickness, idx: idx
    });

    if (typeof forEach !== "function") return;
    const half = S3.thickness / 2;
    const hitTest = (o, r) => {
        const rel = (o.x - p.x) * dir;
        return rel >= -(r || 0) && rel <= S3.range + (r || 0)
            && Math.abs(o.y - p.y) <= half + (r || 0);
    };
    forEach(p, hitTest, (t) => {
        hitOne(p, t, S3.damage, ctx);
        // 🩸 출혈 — 기존 화상 시스템을 그대로 쓴다 (0.4초마다 20, 2초)
        if (typeof ctx.addBurn === 'function') {
            const key = (t.kind === 'player') ? ('player_' + t.id)
                      : (t.kind === 'minion') ? ('minion_' + t.id)
                      : (t.kind === 'okra') ? ('okra_' + t.id) : t.kind;
            ctx.addBurn(key, t.obj, S3.bleedDamage, S3.bleedDuration, p.id);
        }
    });
}

// ============================================================================
// 🌀 평타 3연타 마무리 — 짧은 전방위 베기
// ============================================================================
function startComboSpin(p, ctx) {
    const SC = ctx.Skills.DAIDO_COMBO;
    const now = Date.now();

    p.daidoSpinEnd = now + SC.duration;
    p.daidoSpinNext = now;

    ctx.io.emit('daidoSpin', { id: p.id, x: p.x, y: p.y, durationMs: SC.duration, radius: SC.radius });
}

// ============================================================================
// 🎮 스킬 시전 진입점
// ============================================================================
function useSkill(p, data, ctx) {
    const { Skills } = ctx;
    const now = Date.now();

    // 돌진 · 무자비 · 일섬 시전 중에는 다른 스킬을 쓸 수 없다
    if (p.daidoRush || p.daidoFury || p.daidoIaiAt) return;

    if (data.type === 1) {
        const S1 = Skills.DAIDO_S1;
        if (!S1 || now < (p.daidoS1CdEnd || 0)) return;
        p.daidoS1CdEnd = now + S1.cd;
        startFury(p, ctx);
        return;
    }

    if (data.type === 2) {
        const S2 = Skills.DAIDO_S2;
        if (!S2 || now < (p.daidoS2CdEnd || 0)) return;
        p.daidoS2CdEnd = now + S2.cd;
        startRush(p, ctx);
        return;
    }

    if (data.type === 3) {
        const S3 = Skills.DAIDO_S3;
        if (!S3 || now < (p.daidoS3CdEnd || 0)) return;
        p.daidoS3CdEnd = now + S3.cd;
        startIai(p, ctx);
        return;
    }
}

// ============================================================================
// 🔁 매 프레임 처리
// ============================================================================
function updateLoop(p, now, ctx) {
    const Skills = ctx.Skills;

    // ── ⚔️ 1번 [무자비] ────────────────────────────────────────────
    if (p.daidoFury) {
        const S1 = Skills.DAIDO_S1;
        if (p.isDead || now >= p.daidoFuryEnd) {
            p.daidoFury = false; p.daidoFuryEnd = 0; p.isCasting = false;
            ctx.io.emit('syncPlayerFull', p);
        } else {
            p.moveX = 0; p.moveY = 0;
            if (now >= (p.daidoFuryNext || 0)) {
                p.daidoFuryNext = now + (p.daidoFuryStep || S1.tickInterval);   // 🔢 도좌마: 간격 축소
                sweepCircle(p, p.x, p.y, S1.radius, S1.tickDamage, ctx);
            }
        }
    }

    // ── 💨 2번 [질풍참] ────────────────────────────────────────────
    if (p.daidoRush) {
        const S2 = Skills.DAIDO_S2;
        if (p.isDead) {
            p.daidoRush = false; p.daidoRushEnd = 0;
        } else if (now >= p.daidoRushEnd) {
            finishRush(p, ctx);
        } else {
            if (now >= (p.daidoRushNext || 0)) {
                p.daidoRushNext = now + (p.daidoRushStep || S2.tickInterval);   // 🔢 도좌마: 간격 축소
                // 베면서 끌어당긴다
                const forEach = ctx.forEachTarget;   // serverContext 는 Damage 를 평평하게 펼쳐 담는다
                if (typeof forEach === "function") {
                    const hitTest = (o, r) => Math.hypot(p.x - o.x, p.y - o.y) < S2.hitRadius + (r || 0);
                    forEach(p, hitTest, (t) => {
                        hitOne(p, t, S2.tickDamage, ctx);
                        // 🌀 시전자 근처로 빨아들인다
                        const o = t.obj;
                        if (!o || o.hp === undefined || o.hp <= 0) return;
                        const dx = p.x - o.x, dy = p.y - o.y;
                        const d = Math.hypot(dx, dy);
                        if (d > S2.pullRadius) {
                            const k = (d - S2.pullRadius) / d;
                            o.x += dx * k; o.y += dy * k;
                            if (t.kind === 'player') ctx.io.emit('syncPlayerFull', o);
                        }
                    });
                }
                ctx.io.emit('daidoRushTick', { id: p.id, x: p.x, y: p.y, radius: S2.hitRadius });
            }
        }
    }

    // ── ⚡ 3번 [일섬] ──────────────────────────────────────────────
    if (p.daidoIaiAt) {
        if (p.isDead) { p.daidoIaiAt = 0; p.isCasting = false; }
        else if (now >= p.daidoIaiAt) fireIai(p, ctx);
        else { p.moveX = 0; p.moveY = 0; }
    }

    // ── 🌀 평타 3연타 마무리 ───────────────────────────────────────
    if (p.daidoSpinEnd) {
        const SC = Skills.DAIDO_COMBO;
        if (p.isDead || now >= p.daidoSpinEnd) {
            p.daidoSpinEnd = 0; p.daidoSpinNext = 0;
        } else if (now >= (p.daidoSpinNext || 0)) {
            p.daidoSpinNext = now + SC.tickInterval;
            sweepCircle(p, p.x, p.y, SC.radius, SC.tickDamage, ctx);
        }
    }
}

module.exports = { useSkill, updateLoop, startComboSpin };
