// 파일명: gameLoop/projectiles.js
// ============================================================================
// 🎯 투사체 · 폭탄 · 낙하물(마그마 / 낙뢰) · 포탑 · 충격파 처리
//
// ⚡ [신규] 카시모 하지메 번개(kashimo_bolt)
//    · 관통 투사체이며, 맞은 대상을 2초간 감전 경직시킨다.
//    · 감전은 동결 · 공중 경직을 함께 걸어 완전히 굳게 만든다.
// ============================================================================

const { emitStatus, SpatialGrid, forEachFallTarget, killByKind, aggroByKind } = require('./shared.js');
const SB = require('../server/state.js');   // 🛡️ 보호막 판정

const GROUND_Y_SERVER = 2000;
let _swWasActive = false;

/** 폭탄(마그마 / 정의) 목표 좌표를 찾아 반환 */
function resolveBombTarget(ctx, b, field) {
    const { State, getMinion } = ctx;
    const { players, monster, hinbeom, blackbeard, burgess, okras } = State;
    let target = null;

    if (b.targetType === 'player' && players[b.targetId] && !players[b.targetId].isDead) target = players[b.targetId];
    else if (b.targetType === 'monster' && monster.hp > 0) target = monster;
    else if (b.targetType === 'hinbeom' && hinbeom.hp > 0) target = hinbeom;
    else if (b.targetType === 'blackbeard' && blackbeard.hp > 0) target = blackbeard;
    else if (b.targetType === 'burgess' && burgess.hp > 0) target = burgess;
    else if (b.targetType === 'minion') { let m = getMinion(b.targetId); if (m && m.hp > 0) target = m; }
    else if (b.targetType === 'okra') { let o = okras.find(x => x.id === b.targetId); if (o && o.hp > 0) target = o; }

    if (!target) return null;
    target[field] = 0;
    if (b.targetType === 'player') emitStatus(ctx.io, target);
    return { x: target.x, y: target.y };
}

/** 폭탄 목록 공통 처리 */
function processBombs(ctx, now, list, field, radius, damage) {
    const { State, io, applyAoEDamage } = ctx;
    for (let i = list.length - 1; i >= 0; i--) {
        let b = list[i];
        if (now < b.explodeAt) continue;
        list.splice(i, 1);
        let pos = resolveBombTarget(ctx, b, field);
        if (!pos) continue;
        io.emit('magmaImpact', { x: pos.x, y: pos.y });
        let owner = State.players[b.ownerId] || { id: b.ownerId, team: b.team, gold: 0, level: 1 };
        applyAoEDamage(owner, pos.x, pos.y, radius, damage, 0);
    }
}

/**
 * ⚡ [신규] 카시모 번개에 맞은 대상을 감전 경직시킨다.
 *    투사체에 kashimoStun 이 실려 있을 때만 호출된다.
 */
function applyKashimoBoltStun(ctx, p, t) {
    if (!p || !p.kashimoStun) return;
    const { io } = ctx;
    const now = Date.now();
    const until = now + p.kashimoStun;
    const obj = t.obj;
    if (!obj) return;

    obj.electrocutedUntil = Math.max(obj.electrocutedUntil || 0, until);
    obj.airFreezeUntil = Math.max(obj.airFreezeUntil || 0, until);
    obj.frozenUntil = Math.max(obj.frozenUntil || 0, until);

    if (t.kind === 'player') {
        obj.isCasting = false; obj.skill1Dashing = false;
        obj.yataActive = false; obj.yataPath = null; obj.skill3Active = false;
        obj.elThorActive = false; obj.mantleActive = false;
        obj.raigoActive = false; obj.raigoDropped = false;
        emitStatus(io, obj);
        io.emit('syncPlayerFull', obj);
    }

    // 🟣 맞은 자리에 보라색 전류가 터진다
    io.emit('kashimoBoltHit', { x: obj.x, y: obj.y, ownerId: p.ownerId });
}

/** 투사체가 대상 하나에 맞았을 때의 부가 효과 (빙결 · 화상 · 폭탄 부착) */
function applyProjectileEffects(ctx, p, t) {
    const { State, io, addBurn } = ctx;
    const now = Date.now();
    const isPlayer = (t.kind === 'player');

    if (p.freeze) {
        // 🧊 아오키지 : 쿠잔(해군)의 모든 스킬 동결 시간 +1초
        //    ⚠️ 이 함수에는 players 지역 변수가 없다. State.players 를 써야 한다.
        const _ow = State.players[p.ownerId];
        const _fz = p.freeze + ((_ow && _ow.hasAokiji) ? 1000 : 0);
        t.obj.frozenUntil = Math.max(t.obj.frozenUntil || 0, now + _fz);
        if (isPlayer) emitStatus(io, t.obj);
        if (p.hasJusticeCoat && p.type === 'partisan') {
            let hitKey = 'partisanHits_' + p.ownerId;
            t.obj[hitKey] = (t.obj[hitKey] || 0) + 1;
            if (t.obj[hitKey] >= 3) {
                t.obj[hitKey] = 0;
                State.giantPartisanQueue.push({
                    targetId: t.id, targetType: t.kind, spawnTime: now + 500,
                    ownerId: p.ownerId, team: p.team
                });
            }
        }
    }
    // 🔥 아카이누 : 화상 지속 +2초
    //    ⚠️ 이 함수에는 players 지역 변수가 없다. State.players 를 써야 한다.
    //       (예전에 players 를 쓰다가 오류가 나서 화상이 통째로 안 걸렸다)
    if (p.fire) {
        const _ow = State.players[p.ownerId];
        const _d = p.fire.dur + ((_ow && _ow.hasAkainu) ? 2000 : 0);
        addBurn(t.key, t.obj, p.fire.dps, _d, p.ownerId);
    }

    if (p.hasMagu && p.type === 'meigou') {
        t.obj.maguBombUntil = Math.max(t.obj.maguBombUntil || 0, now + 3000);
        State.maguBombs.push({ targetId: t.id, targetType: t.kind, explodeAt: now + 3000, ownerId: p.ownerId, team: p.team });
        if (isPlayer) emitStatus(io, t.obj);
    }
    if (p.hasJusticeCoat && p.type === 'dai_funka') {
        t.obj.justiceBombUntil = Math.max(t.obj.justiceBombUntil || 0, now + 3000);
        State.justiceBombs.push({ targetId: t.id, targetType: t.kind, explodeAt: now + 3000, ownerId: p.ownerId, team: p.team });
        if (isPlayer) emitStatus(io, t.obj);
    }

    // ⚡ 카시모 번개 : 맞은 대상을 감전 경직시킨다
    if (p.kashimoStun) applyKashimoBoltStun(ctx, p, t);
}

/** 투사체 대상 후보 목록 (충돌 순서 유지) */
function projectileTargets(ctx, p, eR) {
    const { State, burgessAlive } = ctx;
    const list = [];
    const pR = p.hitR || 45;

    for (let pid in State.players) {
        let t = State.players[pid];
        if (!t.isDead && t.team !== p.team && Math.hypot(p.x - t.x, p.y - t.y) < pR)
            list.push({ obj: t, kind: 'player', id: pid, key: pid });
    }
    const near = (o, r) => Math.hypot(p.x - o.x, p.y - o.y) < r + eR;
    if (State.monster.hp > 0 && near(State.monster, State.monster.radius)) list.push({ obj: State.monster, kind: 'monster', id: 'monster', key: 'monster' });
    if (State.hinbeom.hp > 0 && near(State.hinbeom, State.hinbeom.radius)) list.push({ obj: State.hinbeom, kind: 'hinbeom', id: 'hinbeom', key: 'hinbeom', invincible: State.hinbeomMinions.length > 0 });
    if (State.blackbeard.hp > 0 && State.blackbeard.state !== 'dead' && near(State.blackbeard, State.blackbeard.radius)) list.push({ obj: State.blackbeard, kind: 'blackbeard', id: 'blackbeard', key: 'blackbeard' });
    if (burgessAlive() && near(State.burgess, State.burgess.radius)) list.push({ obj: State.burgess, kind: 'burgess', id: 'burgess', key: 'burgess' });
    State.hinbeomMinions.forEach(mn => { if (mn.hp > 0 && near(mn, mn.radius)) list.push({ obj: mn, kind: 'minion', id: mn.id, key: 'minion_' + mn.id }); });
    State.okras.forEach(ok => { if (ok.hp > 0 && near(ok, ok.radius)) list.push({ obj: ok, kind: 'okra', id: ok.id, key: 'okra_' + ok.id }); });
    // 🔥 헤이안 스쿠나
    if (State.sukuna && State.sukuna.hp > 0 && State.sukuna.state !== 'dead' && near(State.sukuna, State.sukuna.radius)) list.push({ obj: State.sukuna, kind: 'sukuna', id: 'sukuna', key: 'sukuna' });

    // 🛡️ [마르코 · 불사 엉겅퀴] 보호막 안에 있는 대상은 투사체에 맞지 않는다.
    //    (포탑 탄환 · 유도탄 · 낙하물 등 이 함수를 거치는 모든 투사체가 막힌다)
    if (SB.shieldAt) {
        const io = ctx.io;
        for (let i = list.length - 1; i >= 0; i--) {
            const o = list[i].obj;
            if (o && SB.shieldAt(o.x, o.y, p.team)) {
                if (io) io.emit('marcoShieldHit', { x: o.x, y: o.y });
                list.splice(i, 1);
            }
        }
    }
    return list;
}

/** 유도 투사체의 목표 추적 */
function steerHoming(ctx, p) {
    const { State, burgessAlive } = ctx;
    let target = null, minDist = 800;
    const test = (o) => { let d = Math.hypot(o.x - p.x, o.y - p.y); if (d < minDist) { minDist = d; target = o; } };

    for (let pid in State.players) { let ep = State.players[pid]; if (!ep.isDead && ep.team !== p.team) test(ep); }
    if (!target && State.monster.hp > 0) test(State.monster);
    if (!target && State.hinbeom.hp > 0) test(State.hinbeom);
    if (!target && State.blackbeard.hp > 0 && State.blackbeard.state !== 'dead') test(State.blackbeard);
    if (!target && burgessAlive()) test(State.burgess);
    if (!target) State.hinbeomMinions.forEach(mn => { if (mn.hp > 0) test(mn); });
    if (!target) State.okras.forEach(ok => { if (ok.hp > 0) test(ok); });
    if (!target && State.sukuna && State.sukuna.hp > 0 && State.sukuna.state !== 'dead') test(State.sukuna);   // 🔥
    if (!target) return;

    let tx = target.x - p.x, ty = target.y - p.y;
    let dist = Math.hypot(tx, ty), speed = Math.hypot(p.vx, p.vy);
    if (dist <= 0 || speed <= 0) return;
    p.vx += ((tx / dist) * speed - p.vx) * 0.15;
    p.vy += ((ty / dist) * speed - p.vy) * 0.15;
    let ns = Math.hypot(p.vx, p.vy);
    p.vx = (p.vx / ns) * speed; p.vy = (p.vy / ns) * speed;
}

/** 낙하물(마그마 / 낙뢰) 공통 갱신 */
function updateFallers(ctx, now, list, opts) {
    const { State, io, emitDamageText, checkPlayerDeath, applyBaseDamage, addBurn } = ctx;
    let updated = false;

    for (let i = list.length - 1; i >= 0; i--) {
        let f = list[i];
        let prevY = f.y;
        f.y += f.vy;
        let owner = State.players[f.ownerId] || null;

        // 넥서스
        let eBase = State.bases[f.team === 1 ? 2 : 1];
        if (eBase && eBase.hp > 0 && !f.hitIds.includes('base')
            && Math.abs(f.x - eBase.x) < f.radius + 120 && f.y > eBase.y - 120) {
            f.hitIds.push('base');
            applyBaseDamage(f.team, f.damage);
        }

        forEachFallTarget(ctx, f, prevY, 0, (t) => {
            f.hitIds.push(t.key);
            if (t.invincible) return;

            if (t.kind === 'player') {
                let actual = f.damage * (1 - (t.obj.defense || 0));
                t.obj.hp -= actual;
                emitDamageText(t.obj.x, t.obj.y, actual);
                if (opts.shock) {
                    t.obj.electrocutedUntil = Math.max(t.obj.electrocutedUntil || 0, now + 100);
                    t.obj.frozenUntil = Math.max(t.obj.frozenUntil || 0, now + 100);
                    t.obj.airFreezeUntil = Math.max(t.obj.airFreezeUntil || 0, now + 100);
                }
                if (opts.burn && f.fire) {
                    const _ow2 = State.players[f.ownerId];
                    addBurn(t.key, t.obj, f.fire.dps, f.fire.dur + ((_ow2 && _ow2.hasAkainu) ? 2000 : 0), f.ownerId);
                }
                if (t.obj.hp <= 0) checkPlayerDeath(t.obj, f.ownerId);
                else io.to(t.id).emit('takeDamage', actual);
                return;
            }

            // ⚔️ 퇴마의 검 : 몬스터 전용 30% 추가 피해
            let fMobDmg = (typeof ctx.toemaDmgById === 'function') ? ctx.toemaDmgById(f.ownerId, f.damage) : f.damage;
            t.obj.hp -= fMobDmg;
            emitDamageText(t.obj.x, t.obj.y, fMobDmg);
            if (t.kind === 'hinbeom' && typeof ctx.recordHinbeomDamage === 'function') ctx.recordHinbeomDamage(f.ownerId, fMobDmg);
            if (opts.shock) {
                t.obj.electrocutedUntil = Math.max(t.obj.electrocutedUntil || 0, now + 100);
                t.obj.frozenUntil = Math.max(t.obj.frozenUntil || 0, now + 100);
                t.obj.airFreezeUntil = Math.max(t.obj.airFreezeUntil || 0, now + 100);
            }
            if (opts.burn && f.fire) {
                const _ow3 = State.players[f.ownerId];
                addBurn(t.key, t.obj, f.fire.dps, f.fire.dur + ((_ow3 && _ow3.hasAkainu) ? 2000 : 0), f.ownerId);
            }
            if (owner) aggroByKind(ctx, t, f.ownerId);
            if (t.obj.hp <= 0) killByKind(ctx, t, f.ownerId);
        });

        // 지면 도달
        if (f.y >= GROUND_Y_SERVER) {
            list.splice(i, 1);
            if (opts.onGround) opts.onGround(f, now);
        }
        updated = true;
    }
    return updated;
}

module.exports = {
    update: (ctx, now) => {
        const { State, io, emitDamageText, checkPlayerDeath, applyBaseDamage,
                applyAoEDamage, getNextProjId, getMinion } = ctx;
        const { players, monster, projectiles, magmas, mantleBolts,
                maguBombs, justiceBombs, giantPartisanQueue, turrets, okras, bases } = State;

        // ── ⚡ 만뢰 낙뢰 생성 ─────────────────────────────────────────
        for (let pid in players) {
            let p = players[pid];
            if (!p.mantleActive) continue;
            if (p.isDead || now >= p.mantleEnd) { p.mantleActive = false; continue; }
            let ES2 = ctx.Skills.ENEL_S2;
            let maxCount = p.hasArkMaxim ? ((ES2.boltCount || 20) * 2) + 10 : (ES2.boltCount || 20);
            let interval = p.hasArkMaxim ? Math.floor((ES2.duration || 3000) / maxCount) : (ES2.spawnInterval || 150);

            while (now >= p.mantleNextSpawn && p.mantleFired < maxCount) {
                let halfW = (p.hasArkMaxim ? ES2.width * 3 : ES2.width) / 2;
                mantleBolts.push({
                    id: getNextProjId(), ownerId: p.id, team: p.team,
                    x: p.mantleCenterX + (Math.random() * 2 - 1) * halfW,
                    y: (ES2.spawnY !== undefined ? ES2.spawnY : 250) + (Math.random() * 120 - 60),
                    vy: ES2.fallSpeed || 85,
                    radius: p.hasArkMaxim ? 51 : 34,
                    damage: ES2.boltDamage || 60, hitIds: [],
                    hasArkMaxim: p.hasArkMaxim
                });
                p.mantleFired++;
                p.mantleNextSpawn = now + interval;
            }
        }

        // ── 💣 폭탄 처리 ──────────────────────────────────────────────
        processBombs(ctx, now, maguBombs, 'maguBombUntil', 280, 200);
        processBombs(ctx, now, justiceBombs, 'justiceBombUntil', 280, 100);

        // ── 🔱 거대 파르티잔 예약 ─────────────────────────────────────
        for (let i = giantPartisanQueue.length - 1; i >= 0; i--) {
            let q = giantPartisanQueue[i];
            if (now < q.spawnTime) continue;
            giantPartisanQueue.splice(i, 1);
            let pos = resolveBombTarget(ctx, q, '_none');
            if (!pos) continue;
            projectiles.push({
                id: getNextProjId(), team: q.team, type: 'giant_partisan', ownerId: q.ownerId,
                x: pos.x, y: pos.y - 800, vx: 0, vy: 50,
                life: 40, damage: 200, freeze: 2000, hitR: 70, edgeR: 40, piercing: false
            });
        }

        // ── 🏹 포탑 ──────────────────────────────────────────────────
        //    🎖️ [해군지부] 아군 포탑의 피해·연사 25% 증가 (대포는 제외)
        //    💣 [해군본부] 대포는 느리지만 크고 강한 폭발탄을 쏜다
        const GTree = (function () { try { return require('../govTree.js'); } catch (e) { return null; } })();
        const govBonus = (tm) => {
            if (!GTree || !State.govTree) return null;
            if (!State.bases[tm] || State.bases[tm].govType !== 'wg') return null;
            return GTree.bonusOf(State.govTree[tm]);
        };

        turrets.forEach(turret => {
            const gb = govBonus(turret.team);
            const isCannon = !!turret.isCannon;
            // 대포는 2배 느리고, 일반 포탑만 해군지부 보정을 받는다
            let cool = isCannon ? 666 : 333;
            if (!isCannon && gb && gb.turretBoost > 0) cool = Math.round(cool / (1 + gb.turretBoost));
            if (now - turret.lastShot < cool) return;
            let target = null, minDist = turret.range;
            for (let pid in players) {
                let p = players[pid];
                if (p.isDead || p.team === turret.team) continue;
                let d = Math.hypot(p.x - turret.x, p.y - turret.y);
                if (d < minDist) { minDist = d; target = p; }
            }
            if (!target && monster.hp > 0) {
                let d = Math.hypot(monster.x - turret.x, monster.y - turret.y);
                if (d < minDist) { minDist = d; target = monster; }
            }
            if (!target) okras.forEach(ok => {
                if (ok.hp <= 0) return;
                let d = Math.hypot(ok.x - turret.x, ok.y - turret.y);
                if (d < minDist) { minDist = d; target = ok; }
            });
            // 🛡️ [마르코] 보호막 안에 숨은 대상은 맞힐 수 없다.
            //    ⚠️ 예전에는 target 을 비워 포탑이 아예 멈춰 버렸다.
            //       이제는 그 대상만 건너뛰고 '다음으로 가까운 적' 을 다시 찾아 계속 쏜다.
            if (target && SB.shieldAt && SB.shieldAt(target.x, target.y, turret.team)) {
                const blocked = target;
                target = null; minDist = turret.range;   // 사거리 안에서 다시 찾는다
                for (let tid in players) {
                    const t2 = players[tid];
                    if (!t2 || t2.isDead || t2.team === turret.team || t2 === blocked) continue;
                    if (SB.shieldAt && SB.shieldAt(t2.x, t2.y, turret.team)) continue;
                    const d2 = Math.hypot(t2.x - turret.x, t2.y - turret.y);
                    if (d2 < minDist) { minDist = d2; target = t2; }
                }
                okras.forEach(ok => {
                    if (ok.hp <= 0) return;
                    if (SB.shieldAt && SB.shieldAt(ok.x, ok.y, turret.team)) return;
                    const d2 = Math.hypot(ok.x - turret.x, ok.y - turret.y);
                    if (d2 < minDist) { minDist = d2; target = ok; }
                });
            }
            if (!target) return;

            turret.lastShot = now;
            let dirX = target.x - turret.x;
            let dirY = (target.y - 45) - (turret.y - 60);
            let dist = Math.hypot(dirX, dirY) || 1;

            let dmg = turret.damage;
            if (!isCannon && gb && gb.turretBoost > 0) dmg = Math.round(dmg * (1 + gb.turretBoost));

            const spd = isCannon ? 19 : 15;          // 대포가 조금 더 빠르다
            projectiles.push({
                id: getNextProjId(), team: turret.team,
                x: turret.x, y: turret.y - 60,
                vx: (dirX / dist) * spd, vy: (dirY / dist) * spd,
                life: isCannon ? 70 : 80, damage: dmg,
                // 💣 대포 : 크고 폭발한다
                isCannon: isCannon,
                hitR: isCannon ? 90 : undefined,
                blast: isCannon ? 220 : 0
            });
        });

        // ── 🎯 투사체 ─────────────────────────────────────────────────
        let projUpdated = false;
        for (let i = projectiles.length - 1; i >= 0; i--) {
            let p = projectiles[i];
            if (p.homing) steerHoming(ctx, p);

            p.x += p.vx; p.y += p.vy; p.life--;
            let hit = false;
            let owner = p.ownerId ? players[p.ownerId] : null;
            let pR = p.hitR || 45, eR = p.edgeR || 10;

            // 🛡️ [마르코 · 불사 엉겅퀴] 보호벽에 닿은 투사체는 그 자리에서 막힌다.
            //    · 대상만 제외하면 투사체가 벽을 뚫고 지나가는 것처럼 보였다
            //    · 이제 벽에 부딪히는 순간 사라지고 차단 이펙트가 뜬다
            const _sp = SB.shieldAt && SB.shieldAt(p.x, p.y, p.team);
            if (_sp) {
                io.emit('marcoShieldHit', { x: p.x, y: p.y });
                if (SB.shieldAbsorb) SB.shieldAbsorb(_sp, p.damage || 0, io);   // 💚 막은 만큼 회복
                projectiles.splice(i, 1);
                projUpdated = true;
                continue;
            }

            // 넥서스
            if (p.canHitBase) {
                let eBase = bases[p.team === 1 ? 2 : 1];
                if (eBase && eBase.hp > 0 && Math.hypot(p.x - eBase.x, p.y - eBase.y) < pR + 150
                    && !(p.piercing && p.hitIds && p.hitIds.includes('base'))) {
                    applyBaseDamage(p.team, p.damage);
                    if (!p.piercing) hit = true;
                    else { if (!p.hitIds) p.hitIds = []; p.hitIds.push('base'); }
                }
            }

            if (!hit || p.piercing) {
                let targets = projectileTargets(ctx, p, eR);
                for (let t of targets) {
                    if (p.piercing && p.hitIds && p.hitIds.includes(t.key)) continue;
                    if (t.invincible) {
                        if (!p.piercing) { hit = true; break; }
                        else { if (!p.hitIds) p.hitIds = []; p.hitIds.push(t.key); }
                        continue;
                    }

                    if (t.kind === 'player') {
                        t.obj.hp -= p.damage;
                        emitDamageText(t.obj.x, t.obj.y, p.damage);
                        applyProjectileEffects(ctx, p, t);
                        if (t.obj.hp <= 0) checkPlayerDeath(t.obj, p.ownerId);
                        else io.to(t.id).emit('takeDamage', p.damage);
                    } else {
                        // ⚔️ 퇴마의 검 : 몬스터 전용 30% 추가 피해
                        let pMobDmg = (typeof ctx.toemaDmgById === 'function') ? ctx.toemaDmgById(p.ownerId, p.damage) : p.damage;
                        t.obj.hp -= pMobDmg;
                        emitDamageText(t.obj.x, t.obj.y, pMobDmg);
                        if (t.kind === 'hinbeom' && typeof ctx.recordHinbeomDamage === 'function') ctx.recordHinbeomDamage(p.ownerId, pMobDmg);
                        applyProjectileEffects(ctx, p, t);
                        if (owner) aggroByKind(ctx, t, p.ownerId);
                        if (t.obj.hp <= 0) killByKind(ctx, t, p.ownerId);
                    }

                    if (!p.piercing) { hit = true; break; }
                    if (!p.hitIds) p.hitIds = [];
                    p.hitIds.push(t.key);
                }
            }

            if (hit || p.life <= 0) {
                // 💣 [대포] 맞으면 그 자리에서 터져 주변을 함께 친다
                if (p.blast > 0 && hit) {
                    io.emit('cannonBlast', { x: p.x, y: p.y, radius: p.blast });
                    // 포탑 발사체라 주인이 없다 → 팀만 보고 적을 친다
                    const bl = p.blast, bdmg = Math.round(p.damage * 0.6);
                    for (const tid in players) {
                        const t2 = players[tid];
                        if (!t2 || t2.isDead || t2.team === p.team) continue;
                        if (Math.hypot(p.x - t2.x, p.y - t2.y) > bl) continue;
                        const act = bdmg * (1 - (t2.defense || 0));
                        t2.hp -= act;
                        emitDamageText(t2.x, t2.y, act);
                        io.to(tid).emit('takeDamage', act);
                        if (t2.hp <= 0) checkPlayerDeath(t2, null);
                        else io.emit('syncPlayerFull', t2);
                    }
                }
                if (p.type === 'magatama' && p.hasKizaru) {
                    io.emit('actionEffect', { type: 'magatama_explosion', x: p.x, y: p.y });
                    if (owner) applyAoEDamage(owner, p.x, p.y, 80, p.damage * 0.5, 0);
                }
                projectiles.splice(i, 1);
            }
            projUpdated = true;
        }
        if (projUpdated) io.emit('syncProjectiles', projectiles.map(pr => ({ x: pr.x, y: pr.y, vx: pr.vx, vy: pr.vy, team: pr.team, type: pr.type })));

        // ── ⚡ 만뢰 낙뢰 갱신 ─────────────────────────────────────────
        let mantleUpdated = updateFallers(ctx, now, mantleBolts, {
            shock: true, burn: false,
            onGround: (mb) => {
                io.emit('mantleExplosion', { x: mb.x, y: GROUND_Y_SERVER, hasArkMaxim: mb.hasArkMaxim });
                let expR = mb.hasArkMaxim ? 180 : 120;
                const stun = (o, r) => {
                    if (Math.hypot(mb.x - o.x, GROUND_Y_SERVER - o.y) >= expR + r) return false;
                    o.electrocutedUntil = Math.max(o.electrocutedUntil || 0, now + 100);
                    o.frozenUntil = Math.max(o.frozenUntil || 0, now + 100);
                    o.airFreezeUntil = Math.max(o.airFreezeUntil || 0, now + 100);
                    return true;
                };
                for (let pid in players) {
                    let t = players[pid];
                    if (t.isDead || t.team === mb.team) continue;
                    if (stun(t, 45)) emitStatus(io, t);
                }
                if (monster.hp > 0) stun(monster, monster.radius);
                okras.forEach(ok => { if (ok.hp > 0) stun(ok, ok.radius); });
            }
        });
        if (mantleUpdated || mantleBolts.length > 0) {
            io.emit('syncMantleBolts', mantleBolts.map(mb => ({ id: mb.id, x: mb.x, y: mb.y, radius: mb.radius, team: mb.team, hasArkMaxim: mb.hasArkMaxim })));
        }

        // ── 🌋 마그마 갱신 ────────────────────────────────────────────
        let magmaUpdated = updateFallers(ctx, now, magmas, {
            shock: false, burn: true,
            onGround: (m) => io.emit('magmaImpact', { x: m.x, y: GROUND_Y_SERVER })
        });
        if (magmaUpdated || magmas.length > 0) {
            io.emit('syncMagmas', magmas.map(m => ({ id: m.id, x: m.x, y: m.y, radius: m.radius, team: m.team })));
        }
    },

    // ── 💨 충격파 (그리드 판정) ───────────────────────────────────────
    updateShockwaves: (ctx, now) => {
        const { State, io, emitDamageText, checkPlayerDeath, applyBaseDamage, burgessAlive, getMinion } = ctx;
        const { players, monster, hinbeom, blackbeard, burgess, hinbeomMinions, okras, shockwaves, bases } = State;

        if (shockwaves.length === 0) {
            if (_swWasActive) { _swWasActive = false; io.emit('syncShockwaves', []); }
            return;
        }

        const grid = new SpatialGrid(300);
        for (let pid in players) { let pp = players[pid]; if (!pp.isDead) grid.insert({ x: pp.x, y: pp.y, entityType: 'player', refId: pid }); }
        if (monster.hp > 0) grid.insert({ x: monster.x, y: monster.y, entityType: 'monster', refId: 'monster' });
        if (hinbeom.hp > 0) grid.insert({ x: hinbeom.x, y: hinbeom.y, entityType: 'hinbeom', refId: 'hinbeom' });
        if (blackbeard.hp > 0 && blackbeard.state !== 'dead') grid.insert({ x: blackbeard.x, y: blackbeard.y, entityType: 'blackbeard', refId: 'blackbeard' });
        if (burgessAlive()) grid.insert({ x: burgess.x, y: burgess.y, entityType: 'burgess', refId: 'burgess' });
        hinbeomMinions.forEach(mn => { if (mn.hp > 0) grid.insert({ x: mn.x, y: mn.y, entityType: 'minion', refId: mn.id }); });
        okras.forEach(ok => { if (ok.hp > 0) grid.insert({ x: ok.x, y: ok.y, entityType: 'okra', refId: ok.id }); });

        for (let i = shockwaves.length - 1; i >= 0; i--) {
            let sw = shockwaves[i];
            sw.x += sw.dir * sw.speed; sw.life--;

            let isSkillWave = (sw.type === 'detroit' || sw.type === 'pheasant_peck');
            let hrX = sw.type === 'detroit' ? 160 : (sw.type === 'pheasant_peck' ? 140 : 70);
            let hrY = sw.type === 'detroit' ? 200 : (sw.type === 'pheasant_peck' ? 120 : 70);
            let nearEntities = grid.getNearby(sw.x, sw.y, Math.max(hrX, hrY));

            if (isSkillWave && sw.team) {
                let eBase = bases[sw.team === 1 ? 2 : 1];
                if (eBase && eBase.hp > 0 && !sw.hitIds.includes('base')
                    && Math.abs(eBase.x - sw.x) < hrX + 150 && Math.abs(eBase.y - sw.y) < hrY + 150) {
                    sw.hitIds.push('base');
                    applyBaseDamage(sw.team, sw.damage);
                }
            }

            for (let entity of nearEntities) {
                const et = entity.entityType;
                if (et !== 'player' && !isSkillWave) continue;

                let obj = null, key = null, kind = et;
                if (et === 'player') { obj = players[entity.refId]; key = entity.refId; }
                else if (et === 'monster') { obj = monster; key = 'monster'; }
                else if (et === 'hinbeom') { obj = hinbeom; key = 'hinbeom'; }
                else if (et === 'blackbeard') { obj = blackbeard; key = 'blackbeard'; }
                else if (et === 'burgess') { obj = burgess; key = 'burgess'; }
                else if (et === 'minion') { obj = getMinion(entity.refId); key = 'minion_' + entity.refId; }
                else if (et === 'okra') { obj = okras.find(o => o.id === entity.refId); key = 'okra_' + entity.refId; }
                if (!obj) continue;

                if (Math.abs(obj.x - sw.x) >= hrX || Math.abs(obj.y - sw.y) >= hrY) continue;
                if (sw.hitIds.includes(key)) continue;

                // 🛡️ [마르코] 불꽃 보호막 안이면 충격파가 막힌다 (할배새끼 충격파 포함)
                const _sp2 = SB.shieldAt && SB.shieldAt(obj.x, obj.y);
                if (_sp2) {
                    io.emit('marcoShieldHit', { x: obj.x, y: obj.y });
                    if (SB.shieldAbsorb) SB.shieldAbsorb(_sp2, sw.damage || 0, io);
                    continue;
                }

                if (et === 'player') {
                    let canHit = isSkillWave ? (players[sw.ownerId] && players[sw.ownerId].team !== obj.team) : true;
                    if (!canHit) continue;
                    sw.hitIds.push(key);
                    let actual = (sw.damage || 30) * (1 - (obj.defense || 0));
                    obj.hp -= actual;
                    emitDamageText(obj.x, obj.y, actual);
                    if (sw.freeze) {
                        // 🧊 아오키지 : 동결 시간 +1초
                        const _swo = players[sw.ownerId];
                        const _swf = sw.freeze + ((_swo && _swo.hasAokiji) ? 1000 : 0);
                        obj.frozenUntil = Math.max(obj.frozenUntil || 0, now + _swf);
                        emitStatus(io, obj);
                    }
                    if (obj.hp <= 0) checkPlayerDeath(obj, sw.ownerId);
                    else io.to(key).emit('bossHit', { damage: actual, dir: sw.dir, kb: sw.kb });
                    continue;
                }

                sw.hitIds.push(key);
                if (kind === 'hinbeom' && hinbeomMinions.length > 0) continue;   // 무적

                // ⚔️ 퇴마의 검 : 몬스터 전용 30% 추가 피해
                //    (보스가 쓰는 충격파는 ownerId 가 플레이어가 아니므로 그대로 통과된다)
                let swMobDmg = (typeof ctx.toemaDmgById === 'function') ? ctx.toemaDmgById(sw.ownerId, sw.damage) : sw.damage;
                obj.hp -= swMobDmg;
                emitDamageText(obj.x, obj.y, swMobDmg);
                if (sw.freeze) {
                    const _swo2 = players[sw.ownerId];
                    obj.frozenUntil = Math.max(obj.frozenUntil || 0,
                        now + sw.freeze + ((_swo2 && _swo2.hasAokiji) ? 1000 : 0));
                }
                obj.knockbackForce += sw.kb * (kind === 'okra' ? 1 : (kind === 'burgess' ? 0.25 : (kind === 'hinbeom' || kind === 'blackbeard' ? 0.2 : 0.3)));
                if (kind === 'hinbeom' && typeof ctx.recordHinbeomDamage === 'function') ctx.recordHinbeomDamage(sw.ownerId, swMobDmg);
                aggroByKind(ctx, { obj: obj, kind: kind, id: entity.refId }, sw.ownerId);
                if (obj.hp <= 0) killByKind(ctx, { obj: obj, kind: kind, id: entity.refId }, sw.ownerId);
            }

            if (sw.life <= 0) shockwaves.splice(i, 1);
        }

        _swWasActive = shockwaves.length > 0;
        io.emit('syncShockwaves', shockwaves.map(s => ({ id: s.id, x: s.x, y: s.y, dir: s.dir, type: s.type, hasHie: s.hasHie })));
    }
};