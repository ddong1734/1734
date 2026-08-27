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
/** 🗡️ 다이도 스킬 피해 배율 — 석혼도 : 모든 피해 +25% (흡혈량도 비례 증가) */
function skillMul(p) { return p.hasSeokhondo ? 1.25 : 1.0; }

/** 🔢 도좌마 이상이면 타격 횟수가 늘어난다 */
function tickCount(p, base, boosted) { return base; }   // 🔢 [삭제] 도좌마의 횟수 증가 능력 제거

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

/** 🩸 다이도 전용 출혈 표시 — 화상(주황 불꽃)이 아니라 붉은 핏방울로 보이게 한다 */
function markBleed(o, ms, ctx) {
    if (!o) return;
    o.bleedUntil = Math.max(o.bleedUntil || 0, Date.now() + ms);
    if (ctx && ctx.io) ctx.io.emit('setBleed', { id: o.id || 'obj', until: o.bleedUntil, x: o.x, y: o.y });
}

/** 💫 다이도 전용 기절 표시 — 동결(파란 얼음)이 아니라 노란 별로 보이게 한다 */
function markStun(o, ms) {
    if (!o) return;
    const until = Date.now() + ms;
    o.frozenUntil = Math.max(o.frozenUntil || 0, until);   // 실제 행동 봉인
    o.stunUntil = Math.max(o.stunUntil || 0, until);       // 표시는 기절로
}

/** 대상 하나에게 피해를 준다 (플레이어 / 몬스터 공용) */
function hitOne(p, t, dmg, ctx, opts) {
    // 🏛️ 넥서스는 전용 함수로 처리한다
    if (t.kind === 'base') { if (typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(p.team, dmg); return; }
    // 🛡️ [마르코] 불꽃 보호막에 막히면 피해가 통째로 사라진다
    // 🛡️ [마르코] 보호막을 쓰는 본인은 완전 무적이다
    { const _o = (typeof obj !== 'undefined') ? obj : (t && t.obj);
      if (_o && _o.marcoInvUntil && Date.now() < _o.marcoInvUntil) return; }
    if (typeof ctx.marcoBlocked === 'function' && ctx.marcoBlocked(t.obj, p.team)) return;
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
        if (!(opts && opts.noLifesteal)) applyLifesteal(p, actual, ctx);   // 🩸 평타는 흡혈 제외
        // 🩸 석혼도 : 2.5초 동안 회복량을 30% 로 낮춘다
        if (p.hasSeokhondo) {
            o.healCutUntil = Math.max(o.healCutUntil || 0, Date.now() + HEAL_CUT_MS);
            o.healCutMul = HEAL_CUT_MUL;
        }
        if (opts && opts.stunMs) {
            markStun(o, opts.stunMs);   // 💫 동결이 아닌 기절 표시
        }
        if (o.hp <= 0) { checkPlayerDeath(o, p.id); return; }
        io.emit('syncPlayerFull', o);
    } else {
        // ⚔️ 퇴마의 검 보정은 몬스터에게만
        let d = (typeof ctx.toemaDmg === 'function') ? ctx.toemaDmg(p, dmg) : dmg;
        o.hp -= d;
        emitDamageText(o.x, o.y, d);
        if (!(opts && opts.noLifesteal)) applyLifesteal(p, d, ctx);   // 🩸 평타는 흡혈 제외
        if (p.hasSeokhondo) {
            o.healCutUntil = Math.max(o.healCutUntil || 0, Date.now() + HEAL_CUT_MS);
            o.healCutMul = HEAL_CUT_MUL;
        }
        if (opts && opts.stunMs) {
            markStun(o, opts.stunMs);   // 💫 동결이 아닌 기절 표시
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

    // 타격 횟수 = 지속시간 / 틱 간격 (이펙트 통지용)
    const hits = Math.round(S1.duration / S1.tickInterval);

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
function startRush(p, ctx, data) {
    const S2 = ctx.Skills.DAIDO_S2;
    const now = Date.now();

    // 타격 횟수 = 지속시간 / 틱 간격 (이펙트 통지용)
    const hits = Math.round(S2.duration / S2.tickInterval);

    p.daidoRush = true;
    p.daidoRushEnd = now + S2.duration;
    p.daidoRushNext = now;
    // 🧭 [수정] 서버의 p.lastFacing 은 평소 갱신되지 않아 항상 1(오른쪽)이었다.
    //    클라이언트가 보낸 방향을 쓴다. 조이스틱을 기울였으면 그 방향으로 나간다.
    let rdx = Number(data && data.dirX), rdy = Number(data && data.dirY);
    if (!Number.isFinite(rdx) || !Number.isFinite(rdy) || (rdx === 0 && rdy === 0)) {
        rdx = (data && data.dir === -1) ? -1 : 1; rdy = 0;
    }
    const rlen = Math.hypot(rdx, rdy) || 1;
    p.daidoRushVX = rdx / rlen;
    p.daidoRushVY = rdy / rlen;
    p.daidoRushDir = (p.daidoRushVX < 0) ? -1 : 1;
    p.lastFacing = p.daidoRushDir;
    p.daidoRushGrab = [];   // 🪢 돌진 중 붙잡은 대상 목록
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
    p.daidoRush = false; p.daidoRushEnd = 0; p.daidoRushNext = 0; p.daidoRushGrab = [];

    ctx.io.emit('daidoRushFinish', { id: p.id, x: p.x, y: p.y, radius: S2.finishRadius });
    // 💥 공격력 반영 — 다른 캐릭터와 같은 규칙 (마무리 일격은 계수 0.5)
    sweepCircle(p, p.x, p.y, S2.finishRadius, S2.finishDamage + Math.round((p.bonusDamage || 0) * 0.5), ctx, { stunMs: S2.finishStun });
    ctx.io.emit('syncPlayerFull', p);
}

// ============================================================================
// ⚡ 3번 [일섬]
// ============================================================================
function startIai(p, ctx, data) {
    const S3 = ctx.Skills.DAIDO_S3;
    const now = Date.now();

    p.daidoIaiAt = now + S3.castTime;
    // 🧭 [수정] 클라이언트가 보낸 방향을 쓴다 (항상 오른쪽으로 나가던 문제)
    p.daidoIaiDir = (data && data.dir === -1) ? -1 : 1;
    p.lastFacing = p.daidoIaiDir;
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
    //    ⚠️ setTimeout 은 사망·재접속과 겹치면 유실되므로 쓰지 않는다.
    //       남은 횟수를 상태로 들고 updateLoop 가 처리한다.
    const hits = tickCount(p, 1, 2);

    doIaiSwing(p, ctx, dir, S3, 0);

    if (hits > 1) {
        p.daidoIaiLeft = hits - 1;
        p.daidoIaiNextAt = Date.now() + 160;   // 살짝 시차를 둬 겹쳐 보이지 않게
    } else {
        p.daidoIaiLeft = 0; p.daidoIaiNextAt = 0;
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
        // 💥 공격력 반영 (단발 대형기라 계수 1.0)
        hitOne(p, t, S3.damage + Math.round((p.bonusDamage || 0) * 1.0), ctx);
        // 🩸 출혈 — 기존 화상 시스템을 그대로 쓴다 (0.4초마다 20, 2초)
        if (typeof ctx.addBurn === 'function') {
            const key = (t.kind === 'player') ? ('player_' + t.id)
                      : (t.kind === 'minion') ? ('minion_' + t.id)
                      : (t.kind === 'okra') ? ('okra_' + t.id) : t.kind;
            ctx.addBurn(key, t.obj, S3.bleedDamage, S3.bleedDuration, p.id);
            markBleed(t.obj, S3.bleedDuration, ctx);   // 🩸 화상이 아닌 출혈 표시
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
        startRush(p, ctx, data);
        return;
    }

    if (data.type === 3) {
        const S3 = Skills.DAIDO_S3;
        if (!S3 || now < (p.daidoS3CdEnd || 0)) return;
        p.daidoS3CdEnd = now + S3.cd;
        startIai(p, ctx, data);
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
            // 🪂 [수정] 공중에서도 그 자리에 완전히 멈춘다 (중력 무시)
            p.moveX = 0; p.moveY = 0;
            p.vy = 0; p.knockbackForce = 0;
            if (now >= (p.daidoFuryNext || 0)) {
                p.daidoFuryNext = now + S1.tickInterval;
                // 💥 공격력 반영 (연타형이라 계수 0.2)
                sweepCircle(p, p.x, p.y, S1.tickDamage !== undefined ? S1.radius : S1.radius, S1.tickDamage + Math.round((p.bonusDamage || 0) * 0.2), ctx);
                // ⚔️ 타격 한 번마다 무작위 방향으로 검기 한 줄기
                ctx.io.emit('daidoSwing', {
                    id: p.id, x: p.x, y: p.y,
                    angle: Math.random() * Math.PI * 2,
                    radius: S1.radius
                });
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
            // ── 💨 [수정] 전방으로 실제로 돌진한다 ─────────────────
            //    · 서버가 좌표를 직접 밀어 이동시킨다 (예전엔 이 코드가 아예 없었다)
            //    · 공중에서는 중력을 없애 그대로 체공하며 나아간다
            const base = (ctx.MOVEMENT_SPEED || 1.5) * 10;
            const step = base * (S2.speedMult || 2.6);
            const vx = (p.daidoRushVX === undefined) ? 1 : p.daidoRushVX;
            const vy = (p.daidoRushVY === undefined) ? 0 : p.daidoRushVY;
            const prevX = p.x;
            p.x += vx * step;
            p.y += vy * step;
            p.vy = 0;                       // 🪂 공중 체공
            p.knockbackForce = 0;
            p.lastFacing = (vx < 0) ? -1 : 1;

            // 🧱 [수정] 세로벽은 통과할 수 없다 (아광속 발차기와 같은 규칙)
            const walls = ctx.SOLID_WALLS || [];
            for (const w of walls) {
                if (p.y < w.top || p.y > w.bottom) continue;
                if (prevX <= w.x && p.x > w.x) { p.x = w.x - 5; break; }
                if (prevX >= w.x && p.x < w.x) { p.x = w.x + 5; break; }
            }
            // 바닥 아래로는 내려가지 않는다
            const gY = (ctx.GROUND_Y || 2000) - 45;
            if (p.y > gY) p.y = gY;

            // 맵 밖 / 별세계 밖으로 나가지 않게 한다
            if (typeof ctx.clampSpecialArea === 'function') {
                const c = ctx.clampSpecialArea(p, p.x, p.y);
                p.x = c.x; p.y = c.y;
            }
            const wW = ctx.WORLD_WIDTH || 50000;
            if (p.x < 50) p.x = 50;
            if (p.x > wW - 50) p.x = wW - 50;
            ctx.io.emit('syncPlayerFull', p);

            // 🌀 [수정] 한 번 걸린 대상은 돌진이 끝날 때까지 계속 붙잡아 끌고 간다.
            //    예전에는 0.2초 타격 순간에만 당겨서, 시전자가 곧장 앞으로
            //    달려나가면 대상이 뒤에 그대로 남았다.
            if (p.daidoRushGrab && p.daidoRushGrab.length) {
                for (const g of p.daidoRushGrab) {
                    const o = g && g.obj;
                    if (!o || o.isDead || o.hp === undefined || o.hp <= 0) continue;
                    if (o.state === 'dead') continue;
                    const gdx = p.x - o.x, gdy = p.y - o.y;
                    const gd = Math.hypot(gdx, gdy);
                    if (gd > S2.pullRadius) {
                        // 완전히 붙여 끌고 간다 (예전엔 반만 당겨 뒤처졌다)
                        const gk = (gd - S2.pullRadius) / gd;
                        o.x += gdx * gk; o.y += gdy * gk;
                        o.vy = 0; o.knockbackForce = 0;
                        if (g.kind === 'player') ctx.io.emit('syncPlayerFull', o);
                    }
                }
            }

            if (now >= (p.daidoRushNext || 0)) {
                p.daidoRushNext = now + S2.tickInterval;
                // 베면서 끌어당긴다
                const forEach = ctx.forEachTarget;   // serverContext 는 Damage 를 평평하게 펼쳐 담는다
                if (typeof forEach === "function") {
                    const hitTest = (o, r) => Math.hypot(p.x - o.x, p.y - o.y) < S2.hitRadius + (r || 0);
                    forEach(p, hitTest, (t) => {
                        // 💥 공격력 반영 (연타형이라 계수 0.2)
                        hitOne(p, t, S2.tickDamage + Math.round((p.bonusDamage || 0) * 0.2), ctx);
                        // 🌀 시전자 근처로 빨아들인다
                        const o = t.obj;
                        if (!o || o.hp === undefined || o.hp <= 0) return;
                        const dx = p.x - o.x, dy = p.y - o.y;
                        const d = Math.hypot(dx, dy);
                        if (d > S2.pullRadius) {
                            const k = (d - S2.pullRadius) / d;
                            o.x += dx * k; o.y += dy * k;
                            o.knockbackForce = 0;
                            if (t.kind === 'player') ctx.io.emit('syncPlayerFull', o);
                        }
                        // 🪢 [수정] 플레이어뿐 아니라 몬스터도 계속 끌고 간다.
                        //    (예전엔 플레이어만 목록에 넣어 몬스터는 안 끌려왔다)
                        if (p.daidoRushGrab && !p.daidoRushGrab.some(g => g.id === t.id)) {
                            p.daidoRushGrab.push({ id: t.id, kind: t.kind, obj: o });
                        }
                    });
                }
                ctx.io.emit('daidoRushTick', { id: p.id, x: p.x, y: p.y, radius: S2.hitRadius });
                // ⚔️ 타격 한 번마다 무작위 방향으로 검기 한 줄기
                ctx.io.emit('daidoSwing', {
                    id: p.id, x: p.x, y: p.y,
                    angle: Math.random() * Math.PI * 2,
                    radius: S2.hitRadius
                });
            }
        }
    }

    // ── ⚡ 3번 [일섬] ──────────────────────────────────────────────
    if (p.daidoIaiAt) {
        if (p.isDead) { p.daidoIaiAt = 0; p.isCasting = false; }
        else if (now >= p.daidoIaiAt) fireIai(p, ctx);
        else { p.moveX = 0; p.moveY = 0; }
    }
    // ⚡ 도좌마 이상 : 남은 추가 참격을 이어서 낸다
    if (p.daidoIaiLeft && p.daidoIaiLeft > 0) {
        if (p.isDead) { p.daidoIaiLeft = 0; p.daidoIaiNextAt = 0; }
        else if (now >= (p.daidoIaiNextAt || 0)) {
            const S3b = Skills.DAIDO_S3;
            const dirB = (p.daidoIaiDir === -1) ? -1 : 1;
            doIaiSwing(p, ctx, dirB, S3b, 1);
            p.daidoIaiLeft--;
            p.daidoIaiNextAt = now + 160;
        }
    }

    // ── 🌀 평타 3연타 마무리 ───────────────────────────────────────
    if (p.daidoSpinEnd) {
        const SC = Skills.DAIDO_COMBO;
        if (p.isDead || now >= p.daidoSpinEnd) {
            p.daidoSpinEnd = 0; p.daidoSpinNext = 0;
        } else if (now >= (p.daidoSpinNext || 0)) {
            p.daidoSpinNext = now + SC.tickInterval;
            // 🩸 강화 평타(3연타 마무리)는 스킬이 아니므로 흡혈이 붙지 않는다
            // 💥 공격력 반영 (강화 평타, 계수 0.2) · 흡혈 제외
            sweepCircle(p, p.x, p.y, SC.radius, SC.tickDamage + Math.round((p.bonusDamage || 0) * 0.2), ctx, { noLifesteal: true });
        }
    }
}

module.exports = { useSkill, updateLoop, startComboSpin };
