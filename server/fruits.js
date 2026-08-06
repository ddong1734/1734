// 파일명: server/fruits.js
// ============================================================================
// 🍈 검은수염 드롭 열매 2종의 평타 연동 능력
//    · 💥 흔들흔들 : 평타 → 0.5초 경직(흰 아우라) → 파공아 (감전 경직)
//    · ⛓️ 어둠어둠 : 평타 → 즉시 전방 크로우즈 → 2초 어둠 흡수
//    · ✨ 시너지   : 둘 다 준비 + 크로우즈 적중 → 강화 파공아, 흡수 즉시 해제
//  🛟 캐스팅 잠금 워치독(clearStuckStates)도 여기서 담당한다.
// ============================================================================

const C = require('./config.js');
const S = require('./state.js');
const { State, burgessAlive, getMinion, getOkra } = S;

module.exports = (deps) => {
    const { io, emitDamageText, checkPlayerDeath, applyShockBlast,
            killMonster, killHinbeom, killBlackbeard, killBurgess, killMinion, killOkra,
            aggroHinbeom, aggroBlackbeard, aggroBurgess, recordHinbeomDamage } = deps;

    // ========================================================================
    // 💥 파공아
    // ========================================================================

    /** 실제 폭발 처리 — isSuper 면 범위 1.3배 · 300 피해 · 2초 감전 */
    function explodePlayerGura(attacker, cx, cy, isSuper) {
        if (!attacker) return;
        const RAD  = isSuper ? C.P_GURA_SUPER_RADIUS : C.P_GURA_RADIUS;
        const DMG  = isSuper ? C.P_GURA_SUPER_DAMAGE : C.P_GURA_DAMAGE;
        const STUN = isSuper ? C.P_GURA_SUPER_STUN   : C.P_GURA_STUN;

        // ⛓️✨ 시너지 일격이 터지는 순간 어둠 흡수를 즉시 풀어 준다
        if (isSuper) releaseYamiBindsByOwner(attacker.id);

        io.emit('playerGura', { x: cx, y: cy, radius: RAD, super: !!isSuper });
        applyShockBlast(attacker, cx, cy, RAD, DMG, STUN);
    }

    /** 평타 시 파공아 예약 (기본 0.5초 경직 후 발동 + 흰 아우라) */
    function scheduleGuraCharge(attacker, isSuper, delayMs) {
        let now = Date.now();
        if (!attacker || !attacker.hasGura) return false;
        if (now < (attacker.guraCdEnd || 0)) return false;

        attacker.guraCdEnd = now + C.P_GURA_COOLDOWN;
        io.to(attacker.id).emit('guraCd', { until: attacker.guraCdEnd });

        let delay = (delayMs !== undefined) ? delayMs : C.P_GURA_CHARGE_MS;

        // ✅ 단독 발동만 0.5초 경직 + 아우라 (시너지는 흡수 경직이 이미 걸려 있다)
        if (!isSuper) {
            attacker.guraChargeUntil = now + delay;
            io.emit('guraCharge', {
                id: attacker.id, until: attacker.guraChargeUntil,
                duration: delay, x: attacker.x, y: attacker.y
            });
            io.emit('syncPlayerFull', attacker);
        }

        State.guraCharges.push({ ownerId: attacker.id, fireAt: now + delay, isSuper: !!isSuper });
        return true;
    }

    /** 예약된 파공아 처리 (매 프레임) */
    function processGuraCharges(now) {
        for (let i = State.guraCharges.length - 1; i >= 0; i--) {
            let g = State.guraCharges[i];
            if (now < g.fireAt) continue;
            State.guraCharges.splice(i, 1);

            let owner = State.players[g.ownerId];
            if (!owner || owner.isDead) continue;
            if (owner.guraChargeUntil) {
                owner.guraChargeUntil = 0;
                io.emit('guraCharge', { id: g.ownerId, until: 0 });
            }
            explodePlayerGura(owner, owner.x, owner.y, g.isSuper);
        }
    }

    function clearGuraChargesFor(pid) {
        for (let i = State.guraCharges.length - 1; i >= 0; i--) {
            if (State.guraCharges[i].ownerId === pid) State.guraCharges.splice(i, 1);
        }
    }

    // ========================================================================
    // ⛓️ 크로우즈 (어둠어둠)
    // ========================================================================

    /** 흡수 대상 실체를 종류별로 찾아온다 */
    function resolveTarget(kind, id) {
        if (kind === 'player') return State.players[id];
        if (kind === 'monster') return (State.monster.hp > 0 && State.monster.state !== 'dead') ? State.monster : null;
        if (kind === 'hinbeom') return (State.hinbeom.hp > 0 && State.hinbeom.state !== 'dead') ? State.hinbeom : null;
        if (kind === 'blackbeard') return (State.blackbeard.hp > 0 && State.blackbeard.state !== 'dead') ? State.blackbeard : null;
        if (kind === 'burgess') return burgessAlive() ? State.burgess : null;
        if (kind === 'minion') return getMinion(id);
        if (kind === 'okra') return getOkra(id);
        return null;
    }

    /** 평타 즉시 전방 크로우즈 — 반환값 : 적중 여부 */
    function firePlayerYami(attacker, dir, noDamage) {
        let now = Date.now();
        if (!attacker || !attacker.hasYami) return false;
        if (now < (attacker.yamiCdEnd || 0)) return false;
        if (now < (attacker.yamiLockUntil || 0)) return false;

        let d = (dir === -1) ? -1 : 1;
        let half = C.P_YAMI_THICKNESS / 2;
        let minX = (d === 1) ? attacker.x : attacker.x - C.P_YAMI_RANGE;
        let maxX = (d === 1) ? attacker.x + C.P_YAMI_RANGE : attacker.x;
        let minY = attacker.y - half;
        let maxY = attacker.y + half;

        attacker.yamiCdEnd = now + C.P_YAMI_COOLDOWN;
        io.to(attacker.id).emit('yamiCd', { until: attacker.yamiCdEnd });

        // ── 범위 안에서 가장 가까운 대상 하나 ─────────────────────────
        let best = null, bestDist = Infinity;
        const consider = (obj, kind, id, r) => {
            if (!obj) return;
            let rr = r || 0;
            if (obj.x + rr < minX || obj.x - rr > maxX) return;
            if (obj.y + rr < minY || obj.y - rr > maxY) return;
            let dist = Math.hypot(obj.x - attacker.x, obj.y - attacker.y);
            if (dist < bestDist) { bestDist = dist; best = { obj, kind, id }; }
        };

        for (let tid in State.players) {
            if (tid === attacker.id) continue;
            let t = State.players[tid];
            if (!t || t.isDead || t.team === attacker.team) continue;
            consider(t, 'player', tid, 45);
        }
        if (State.monster.hp > 0 && State.monster.state !== 'dead') consider(State.monster, 'monster', 'monster', State.monster.radius);
        if (State.hinbeom.hp > 0 && State.hinbeom.state !== 'dead' && State.hinbeomMinions.length === 0) consider(State.hinbeom, 'hinbeom', 'hinbeom', State.hinbeom.radius);
        if (State.blackbeard.hp > 0 && State.blackbeard.state !== 'dead') consider(State.blackbeard, 'blackbeard', 'blackbeard', State.blackbeard.radius);
        if (burgessAlive()) consider(State.burgess, 'burgess', 'burgess', State.burgess.radius);
        State.hinbeomMinions.forEach(mn => { if (mn.hp > 0) consider(mn, 'minion', mn.id, mn.radius); });
        State.okras.forEach(ok => { if (ok.hp > 0 && ok.state !== 'dead') consider(ok, 'okra', ok.id, ok.radius); });

        // ── 빗나감 : 어둠 잔상만 남긴다 ──────────────────────────────
        if (!best) {
            io.emit('yamiSlash', {
                ownerId: attacker.id,
                x: attacker.x, y: attacker.y,
                x2: attacker.x + d * C.P_YAMI_RANGE, y2: attacker.y,
                half: half, duration: C.P_YAMI_FX_MS
            });
            return false;
        }

        // ── 적중 : 즉시 시전자 옆으로 끌어온다 ───────────────────────
        let destX = attacker.x + d * 100, destY = attacker.y;
        let tgt = best.obj;

        io.emit('yamiSlash', {
            ownerId: attacker.id,
            x: attacker.x, y: attacker.y, x2: tgt.x, y2: tgt.y,
            half: half, duration: C.P_YAMI_FX_MS
        });

        let bindEnd = now + C.P_YAMI_BIND_MS;
        attacker.yamiLockUntil = bindEnd;
        io.emit('yamiSelfLock', { id: attacker.id, until: bindEnd });

        if (best.kind === 'player') {
            tgt.x = destX; tgt.y = destY; tgt.vy = 0; tgt.knockbackForce = 0;
            tgt.isCasting = false; tgt.skill1Dashing = false;
            tgt.yataActive = false; tgt.yataPath = null; tgt.skill3Active = false;
            tgt.elThorActive = false; tgt.mantleActive = false;
            tgt.raigoActive = false; tgt.raigoDropped = false;
            tgt.yamiBindUntil = bindEnd;
            tgt.frozenUntil = Math.max(tgt.frozenUntil || 0, bindEnd);
            io.to(best.id).emit('teleport', { x: destX, y: destY });
            io.emit('yamiBind', { id: best.id, until: bindEnd });
            io.emit('syncPlayerFull', tgt);
        } else {
            tgt.x = destX;
            if (best.kind !== 'hinbeom' && best.kind !== 'minion') tgt.y = destY;
            tgt.knockbackForce = 0;
            tgt.frozenUntil = Math.max(tgt.frozenUntil || 0, bindEnd);
            tgt.electrocutedUntil = Math.max(tgt.electrocutedUntil || 0, bindEnd);
            if (best.kind === 'monster' || best.kind === 'minion' || best.kind === 'okra') { tgt.targetId = attacker.id; tgt.state = 'chase'; }
            else if (best.kind === 'hinbeom') aggroHinbeom(attacker.id);
            else if (best.kind === 'blackbeard') aggroBlackbeard(attacker.id);
            else if (best.kind === 'burgess') aggroBurgess(attacker.id);
        }

        // 🕳️ 2초간 어둠 흡수 이펙트
        io.emit('yamiAbsorb', {
            targetKind: best.kind, targetId: best.id,
            x: destX, y: destY,
            radius: (best.kind === 'player') ? 90 : Math.max(90, (tgt.radius || 60) * 1.2),
            duration: C.P_YAMI_BIND_MS
        });

        State.yamiBinds.push({
            ownerId: attacker.id, targetKind: best.kind, targetId: best.id,
            endAt: bindEnd, nextTick: now + C.P_YAMI_TICK_MS, noDamage: !!noDamage
        });

        io.emit('syncPlayerFull', attacker);
        return true;
    }

    /** 흡수 하나를 종료 처리한다 */
    function endBind(b, idx) {
        let tgt = resolveTarget(b.targetKind, b.targetId);
        if (b.targetKind === 'player' && tgt) { tgt.yamiBindUntil = 0; tgt.crowsPullUntil = 0; io.emit('syncPlayerFull', tgt); }
        let owner = State.players[b.ownerId];
        if (owner) { owner.yamiLockUntil = 0; io.emit('syncPlayerFull', owner); }
        io.emit('yamiBindEnd', { id: b.targetId });
        io.emit('crowsEnd', { id: b.targetId });
        if (idx !== undefined) State.yamiBinds.splice(idx, 1);
    }

    /** ⛓️ 흡수 진행 처리 (매 프레임) */
    function processYamiBinds(now) {
        for (let i = State.yamiBinds.length - 1; i >= 0; i--) {
            let b = State.yamiBinds[i];
            let owner = State.players[b.ownerId];
            let tgt = resolveTarget(b.targetKind, b.targetId);

            let dead = !tgt || (tgt.hp !== undefined && tgt.hp <= 0) || (b.targetKind === 'player' && tgt.isDead);
            if (dead || !owner || owner.isDead) { endBind(b, i); continue; }

            // ✅ 시너지 발동 흡수는 도트 피해가 없다
            if (!b.noDamage) {
                while (now >= b.nextTick && now < b.endAt) {
                    b.nextTick += C.P_YAMI_TICK_MS;
                    if (b.targetKind === 'player') {
                        let actual = C.P_YAMI_TICK_DMG * (1 - (tgt.defense || 0));
                        tgt.hp -= actual;
                        emitDamageText(tgt.x, tgt.y, actual);
                        if (tgt.hp <= 0) { checkPlayerDeath(tgt, b.ownerId); break; }
                        io.to(b.targetId).emit('takeDamage', actual);
                    } else {
                        tgt.hp -= C.P_YAMI_TICK_DMG;
                        emitDamageText(tgt.x, tgt.y, C.P_YAMI_TICK_DMG);
                        if (b.targetKind === 'hinbeom') recordHinbeomDamage(b.ownerId, C.P_YAMI_TICK_DMG);
                        if (tgt.hp <= 0) {
                            if (b.targetKind === 'monster') killMonster(b.ownerId);
                            else if (b.targetKind === 'hinbeom') killHinbeom(b.ownerId);
                            else if (b.targetKind === 'blackbeard') killBlackbeard(b.ownerId);
                            else if (b.targetKind === 'burgess') killBurgess(b.ownerId);
                            else if (b.targetKind === 'minion') killMinion(tgt, b.ownerId);
                            else if (b.targetKind === 'okra') killOkra(tgt, b.ownerId);
                            break;
                        }
                    }
                }
            }

            if (now >= b.endAt) endBind(b, i);
        }
    }

    /** 특정 플레이어와 얽힌 흡수를 전부 정리 */
    function clearYamiBindsFor(pid) {
        for (let i = State.yamiBinds.length - 1; i >= 0; i--) {
            let b = State.yamiBinds[i];
            if (b.ownerId !== pid && b.targetId !== pid) continue;
            endBind(b, i);
        }
    }

    /** ✨ 특정 시전자의 흡수를 '즉시' 끝낸다 (강화 파공아 순간) */
    function releaseYamiBindsByOwner(ownerId) {
        if (!ownerId) return;
        for (let i = State.yamiBinds.length - 1; i >= 0; i--) {
            if (State.yamiBinds[i].ownerId !== ownerId) continue;
            endBind(State.yamiBinds[i], i);
        }
    }

    // ========================================================================
    // 🍈 평타 시 열매 능력 통합 진입점
    // ========================================================================
    function triggerFruitOnAttack(attacker, dir) {
        let now = Date.now();
        if (!attacker) return;

        let guraReady = !!attacker.hasGura && now >= (attacker.guraCdEnd || 0);
        let yamiReady = !!attacker.hasYami && now >= (attacker.yamiCdEnd || 0) && now >= (attacker.yamiLockUntil || 0);

        if (yamiReady) {
            // 시너지 가능하면 흡수 도트를 끄고 발동
            let hit = firePlayerYami(attacker, dir, guraReady);
            if (hit && guraReady) { scheduleGuraCharge(attacker, true, C.P_YAMI_FX_MS); return; }
            if (guraReady) scheduleGuraCharge(attacker, false, C.P_GURA_CHARGE_MS);
            return;
        }
        if (guraReady) scheduleGuraCharge(attacker, false, C.P_GURA_CHARGE_MS);
    }

    /** 🚫 지금 이 플레이어가 행동(평타/스킬)할 수 없는 상태인가 */
    function isActionLocked(p, now) {
        now = now || Date.now();
        return now < (p.crowsPullUntil || 0)
            || now < (p.yamiLockUntil || 0)
            || now < (p.yamiBindUntil || 0)
            || now < (p.guraChargeUntil || 0);
    }

    // ========================================================================
    // 🛟 캐스팅 잠금 워치독
    //    setTimeout 기반 해제(볼사리노 광선 · 빙하기 · 엘 토르 등)가 사망 /
    //    재접속 / 강제 이동과 겹치며 유실되면 isCasting 이 영원히 true 로
    //    굳어 스킬·평타가 전부 먹통이 됐다. 근거 없는 캐스팅을 자동 해제한다.
    // ========================================================================
    function clearStuckStates(now) {
        for (let pid in State.players) {
            let p = State.players[pid];
            if (!p) continue;
            if (p.isDead) { p._castStuckSince = 0; continue; }

            let justified =
                   (p.yataActive === true)
                || (p.skill3Active === true && now < (p.skill3EndTime || 0))
                || (p.iceAgeActive === true && now < (p.iceAgeCastEnd || 0) + 500)
                || (p.elThorActive === true && now < (p.elThorEnd || 0) + 500)
                || (p.skill1Dashing === true)
                || (now < (p.crowsPullUntil || 0))
                || (now < (p.yamiLockUntil || 0))
                || (now < (p.yamiBindUntil || 0))
                || (now < (p.guraChargeUntil || 0))
                || (now < (p.raigoPullUntil || 0))
                || (now < (p.airFreezeUntil || 0));

            if (p.isCasting && !justified) {
                if (!p._castStuckSince) p._castStuckSince = now;
                else if (now - p._castStuckSince >= C.CAST_STUCK_GRACE_MS) {
                    p.isCasting = false;
                    p.skill3Active = false; p.iceAgeActive = false; p.elThorActive = false;
                    p.yataActive = false; p.yataPath = null;
                    p._castStuckSince = 0;
                    io.emit('syncPlayerFull', p);
                }
            } else p._castStuckSince = 0;

            // 만료된 잠금 타이머 잔재 정리
            if (p.yamiLockUntil && now >= p.yamiLockUntil) p.yamiLockUntil = 0;
            if (p.yamiBindUntil && now >= p.yamiBindUntil) p.yamiBindUntil = 0;
            if (p.guraChargeUntil && now >= p.guraChargeUntil) p.guraChargeUntil = 0;
            if (p.crowsPullUntil && now >= p.crowsPullUntil) p.crowsPullUntil = 0;

            // 시간 초과로 남은 스킬 플래그 정리
            if (p.skill3Active && p.skill3EndTime && now >= p.skill3EndTime + 500) { p.skill3Active = false; p.isCasting = false; }
            if (p.iceAgeActive && p.iceAgeCastEnd && now >= p.iceAgeCastEnd + 1000) { p.iceAgeActive = false; p.isCasting = false; }
            if (p.elThorActive && p.elThorEnd && now >= p.elThorEnd + 1000) { p.elThorActive = false; p.isCasting = false; }
        }
    }

    return {
        explodePlayerGura, scheduleGuraCharge, processGuraCharges, clearGuraChargesFor,
        firePlayerYami, processYamiBinds, clearYamiBindsFor, releaseYamiBindsByOwner,
        triggerFruitOnAttack, isActionLocked, clearStuckStates
    };
};