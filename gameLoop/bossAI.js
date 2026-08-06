// 파일명: gameLoop/bossAI.js
// ============================================================================
// 👹 보스 AI — 박힌범 · 검은수염 · 지저스 바제스 · 할배새끼 소환체 · 오크라
// ============================================================================

const { emitStatus } = require('./shared.js');

let _minionWasActive = false;

/** 넉백 감쇠 공통 */
function decayKnockback(e) {
    if (Math.abs(e.knockbackForce) <= 0) return;
    e.x += e.knockbackForce;
    e.knockbackForce *= 0.85;
    if (Math.abs(e.knockbackForce) < 1) e.knockbackForce = 0;
}

/** 영역 안에서 가장 가까운 살아있는 플레이어 id */
function findNearestIn(players, x, areaTest) {
    let found = null, closest = Infinity;
    for (let pid in players) {
        let p = players[pid];
        if (p.isDead || !areaTest(p)) continue;
        let d = Math.abs(p.x - x);
        if (d < closest) { closest = d; found = pid; }
    }
    return found;
}

/** 좌우 이동 + 영역 클램프 공통 */
function chaseAndClamp(e, targetX, area, speed) {
    if (targetX !== null) {
        if (e.x < targetX - 60) e.x += speed;
        else if (e.x > targetX + 60) e.x -= speed;
    }
    let minX = area.minX + e.radius, maxX = area.maxX - e.radius;
    if (e.x < minX) { e.x = minX; e.knockbackForce = 0; }
    if (e.x > maxX) { e.x = maxX; e.knockbackForce = 0; }
}

module.exports = {
    update: (ctx, now) => {
        const { State, io, compressors, emitDamageText, checkPlayerDeath,
                isInHinbeomArea, isInDarkArea, isInDarkZone, isInCrowsBeam, burgessAlive,
                spawnHinbeomMinions, despawnHinbeomMinions, burgessShockwave,
                getNextProjId } = ctx;
        const { players, monster, hinbeom, blackbeard: bb, burgess: bg,
                hinbeomMinions: minions, okras, shockwaves } = State;

        // ════════════════════════════════════════════════════════════════
        // 🐗 할배새끼 보스 (중앙 정글)
        // ════════════════════════════════════════════════════════════════
        decayKnockback(monster);
        if (monster.hp > 0 && now >= monster.frozenUntil) {
            let sp = monster.speed;
            let t = players[monster.targetId];
            if (monster.state === 'chase' && t && !t.isDead) {
                if (!(t.x >= 14900 && t.x <= 17100 && t.y <= 950)) { monster.targetId = null; monster.state = 'return'; }
                else {
                    if (monster.x < t.x - 40) monster.x += sp; else if (monster.x > t.x + 40) monster.x -= sp;
                    if (Math.abs(monster.x - t.x) < 300 && now - monster.lastAttack > 1000) {
                        monster.lastAttack = now;
                        let dir = t.x > monster.x ? 1 : -1;
                        shockwaves.push({
                            id: getNextProjId(), ownerId: 'monster',
                            x: monster.x + (dir * 50), y: monster.y + 45,
                            dir: dir, speed: 9, life: 80, hitIds: [],
                            damage: 30, kb: dir * 25, type: 'boss'
                        });
                    }
                }
            } else if (monster.state === 'return' || (monster.state === 'chase' && (!t || t.isDead))) {
                if (Math.abs(monster.x - monster.homeX) < 10) {
                    monster.x = monster.homeX; monster.state = 'idle';
                    if (monster.hp < monster.maxHp) monster.hp += 5;
                } else monster.x += (monster.homeX > monster.x ? sp : -sp);
            }
        }
        let mDelta = compressors.monsterDelta.getDelta('monster', monster);
        if (mDelta) io.emit('monsterUpdate', mDelta);

        // ════════════════════════════════════════════════════════════════
        // 🥊 박힌범
        // ════════════════════════════════════════════════════════════════
        let anyInBasket = false;
        for (let pid in players) { if (!players[pid].isDead && isInHinbeomArea(players[pid])) { anyInBasket = true; break; } }

        if (hinbeom.hp > 0 && hinbeom.state !== 'dead') {
            if (now - (hinbeom.lastRegenTick || 0) >= 1000) {
                hinbeom.lastRegenTick = now;
                if (hinbeom.hp < hinbeom.maxHp) hinbeom.hp = Math.min(hinbeom.maxHp, hinbeom.hp + ctx.HINBEOM_REGEN);
            }
            decayKnockback(hinbeom);

            if (now >= hinbeom.frozenUntil) {
                if (hinbeom.state === 'chase') {
                    let t = players[hinbeom.targetId];
                    if (!t || t.isDead || !isInHinbeomArea(t)) { hinbeom.targetId = null; hinbeom.state = 'return'; }
                }
                if (hinbeom.state !== 'chase') {
                    let found = findNearestIn(players, hinbeom.x, isInHinbeomArea);
                    if (found) { hinbeom.targetId = found; hinbeom.state = 'chase'; }
                }
                if (hinbeom.state === 'chase' && players[hinbeom.targetId]) {
                    chaseAndClamp(hinbeom, players[hinbeom.targetId].x, ctx.HINBEOM_AREA, hinbeom.speed);
                } else if (hinbeom.state === 'return') {
                    if (Math.abs(hinbeom.x - hinbeom.homeX) < 10) { hinbeom.x = hinbeom.homeX; hinbeom.state = 'idle'; }
                    else hinbeom.x += (hinbeom.homeX > hinbeom.x ? hinbeom.speed : -hinbeom.speed);
                    chaseAndClamp(hinbeom, null, ctx.HINBEOM_AREA, hinbeom.speed);
                } else chaseAndClamp(hinbeom, null, ctx.HINBEOM_AREA, hinbeom.speed);
            } else chaseAndClamp(hinbeom, null, ctx.HINBEOM_AREA, hinbeom.speed);
            hinbeom.y = hinbeom.homeY;

            // 🥊 패왕색 패기 발동
            if (hinbeom.state === 'chase') {
                if (now >= hinbeom.hakiNextRoll) {
                    hinbeom.hakiNextRoll = now + ctx.HAKI_ROLL_MS;
                    if (Math.random() < ctx.HAKI_CHANCE) {
                        hinbeom.hakiBursts.push({ endAt: now + ctx.HAKI_DURATION, nextTick: now + ctx.HAKI_TICK_MS, ticksLeft: ctx.HAKI_TICKS });
                        io.emit('hakiBurst', { x: hinbeom.x, y: hinbeom.y, duration: ctx.HAKI_DURATION, area: ctx.HINBEOM_AREA });
                        for (let pid in players) {
                            let t = players[pid];
                            if (t.isDead || !isInHinbeomArea(t)) continue;
                            t.frozenUntil = Math.max(t.frozenUntil || 0, now + ctx.HAKI_DURATION);
                            t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, now + ctx.HAKI_DURATION);
                            emitStatus(io, t);
                        }
                        hinbeom.hakiCount = (hinbeom.hakiCount || 0) + 1;
                        if (hinbeom.hakiCount % ctx.MINION_EVERY === 0) spawnHinbeomMinions();
                    }
                }
            } else hinbeom.hakiNextRoll = now + ctx.HAKI_ROLL_MS;

            // 패기 지속 피해
            let latestEnd = 0;
            for (let hi = hinbeom.hakiBursts.length - 1; hi >= 0; hi--) {
                let burst = hinbeom.hakiBursts[hi];
                if (burst.endAt > latestEnd) latestEnd = burst.endAt;
                while (now >= burst.nextTick && burst.ticksLeft > 0) {
                    burst.nextTick += ctx.HAKI_TICK_MS;
                    burst.ticksLeft--;
                    for (let pid in players) {
                        let t = players[pid];
                        if (t.isDead || !isInHinbeomArea(t)) continue;
                        t.hp -= ctx.HAKI_TICK_DMG;
                        emitDamageText(t.x, t.y, ctx.HAKI_TICK_DMG);
                        t.frozenUntil = Math.max(t.frozenUntil || 0, burst.endAt);
                        t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, burst.endAt);
                        emitStatus(io, t);
                        if (t.hp <= 0) checkPlayerDeath(t, null); else io.to(pid).emit('takeDamage', ctx.HAKI_TICK_DMG);
                    }
                }
                if (now >= burst.endAt && burst.ticksLeft <= 0) hinbeom.hakiBursts.splice(hi, 1);
            }
            hinbeom.hakiActiveUntil = latestEnd;
        }
        let hDelta = compressors.hinbeomDelta.getDelta('hinbeom', hinbeom);
        if (hDelta) io.emit('hinbeomUpdate', hDelta);

        // ════════════════════════════════════════════════════════════════
        // ⚫ 검은수염
        // ════════════════════════════════════════════════════════════════
        let anyInDark = false;
        for (let pid in players) { if (!players[pid].isDead && isInDarkArea(players[pid])) { anyInDark = true; break; } }

        if (bb.hp > 0 && bb.state !== 'dead') {
            if (bb.descentActive || now < (bb.risingUntil || 0)) bb.knockbackForce = 0;
            else decayKnockback(bb);

            let busy = (now < (bb.castingUntil || 0));

            if (!busy && now >= bb.frozenUntil) {
                if (bb.state === 'chase') {
                    let t = players[bb.targetId];
                    if (!t || t.isDead || !isInDarkArea(t)) { bb.targetId = null; bb.state = 'return'; }
                }
                if (bb.state !== 'chase') {
                    let found = findNearestIn(players, bb.x, isInDarkArea);
                    if (found) { bb.targetId = found; bb.state = 'chase'; }
                }
                if (bb.state === 'chase' && players[bb.targetId]) chaseAndClamp(bb, players[bb.targetId].x, ctx.DARK_AREA, bb.speed);
                else if (bb.state === 'return') {
                    if (Math.abs(bb.x - bb.homeX) < 10) { bb.x = bb.homeX; bb.state = 'idle'; }
                    else bb.x += (bb.homeX > bb.x ? bb.speed : -bb.speed);
                    chaseAndClamp(bb, null, ctx.DARK_AREA, bb.speed);
                } else chaseAndClamp(bb, null, ctx.DARK_AREA, bb.speed);
            } else chaseAndClamp(bb, null, ctx.DARK_AREA, bb.speed);

            // 높이 (상승 / 강림 / 지면)
            const ASC = ctx.DESCENT_ASCEND_MS || 2000;
            if (now < (bb.risingUntil || 0)) {
                let t = 1 - ((bb.risingUntil - now) / ASC);
                t = Math.max(0, Math.min(1, t));
                let ease = t * t * (3 - 2 * t);
                bb.y = bb.riseFromY + (bb.riseToY - bb.riseFromY) * ease;
            } else if (bb.descentActive && now < (bb.descentUntil || 0)) bb.y = bb.riseToY;
            else bb.y = ctx.DARK_GROUND - bb.radius;

            // 상승 완료 → 공중 강림 시작
            if (bb.risingUntil && now >= bb.risingUntil && !bb.descentActive) {
                bb.risingUntil = 0;
                bb.descentActive = true;
                bb.descentUntil = now + ctx.DESCENT_DURATION;
                bb.descentNextTick = now;
                bb.y = bb.riseToY;
                io.emit('descentStart', { x: bb.x, y: bb.y, duration: ctx.DESCENT_DURATION, area: ctx.DARK_AREA });
            }

            // 공중 강림 지속 피해
            if (bb.descentActive) {
                while (now >= bb.descentNextTick && now < bb.descentUntil) {
                    bb.descentNextTick += ctx.DESCENT_TICK_MS;
                    for (let pid in players) {
                        let t = players[pid];
                        if (t.isDead || !isInDarkArea(t)) continue;
                        t.hp -= ctx.DESCENT_TICK_DMG;
                        emitDamageText(t.x, t.y, ctx.DESCENT_TICK_DMG);
                        t.frozenUntil = Math.max(t.frozenUntil || 0, bb.descentUntil);
                        t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, bb.descentUntil);
                        emitStatus(io, t);
                        if (t.hp <= 0) checkPlayerDeath(t, null); else io.to(pid).emit('takeDamage', ctx.DESCENT_TICK_DMG);
                    }
                }
                if (now >= bb.descentUntil) {
                    bb.descentActive = false; bb.descentUntil = 0;
                    bb.y = ctx.DARK_GROUND - bb.radius;
                    io.emit('descentEnd');
                }
            }

            // 🌊 암흑물질 장판 지속 피해
            if (bb.darkFloorUntil && now < bb.darkFloorUntil) {
                while (now >= bb.darkFloorNextTick && now < bb.darkFloorUntil) {
                    bb.darkFloorNextTick += ctx.DARKFLOOR_TICK_MS;
                    for (let pid in players) {
                        let t = players[pid];
                        if (t.isDead || !isInDarkArea(t)) continue;
                        let actual = ctx.DARKFLOOR_TICK_DMG * (1 - (t.defense || 0));
                        t.hp -= actual;
                        emitDamageText(t.x, t.y, actual);
                        if (t.hp <= 0) checkPlayerDeath(t, null); else io.to(pid).emit('takeDamage', actual);
                    }
                }
            } else if (bb.darkFloorUntil && now >= bb.darkFloorUntil) {
                bb.darkFloorUntil = 0;
                io.emit('darkFloorEnd');
            }

            // ⛓️ 크로우즈 발동 (예고 종료 시점)
            if (bb.telegraphUntil && now >= bb.telegraphUntil) {
                bb.telegraphUntil = 0;
                let tgt = null, tgtId = null;
                let pending = bb.crowsPendingTarget ? players[bb.crowsPendingTarget] : null;
                if (pending && !pending.isDead && isInDarkArea(pending) && isInCrowsBeam(bb, pending)) { tgt = pending; tgtId = bb.crowsPendingTarget; }
                else {
                    let closest = Infinity;
                    for (let pid in players) {
                        let p = players[pid];
                        if (p.isDead || !isInDarkArea(p) || !isInCrowsBeam(bb, p)) continue;
                        let d = Math.hypot(p.x - bb.x, p.y - bb.y);
                        if (d < closest) { closest = d; tgt = p; tgtId = pid; }
                    }
                }

                if (tgt) {
                    let destDir = (tgt.x >= bb.x) ? 1 : -1;
                    let destX = bb.x + destDir * (bb.radius + 60), destY = bb.y;
                    tgt.crowsPullUntil = now + ctx.CROWS_PULL_MS;
                    tgt.crowsTargetX = destX; tgt.crowsTargetY = destY;
                    tgt.isCasting = false; tgt.skill1Dashing = false;
                    tgt.yataActive = false; tgt.yataPath = null; tgt.skill3Active = false;
                    tgt.elThorActive = false; tgt.mantleActive = false;
                    tgt.raigoActive = false; tgt.raigoDropped = false;
                    bb.crowsActiveTarget = tgtId;
                    bb.crowsHitAt = now + ctx.CROWS_PULL_MS;
                    io.emit('crowsStart', { id: tgtId, x: bb.x, y: bb.y, x2: tgt.x, y2: tgt.y, destX: destX, destY: destY, duration: ctx.CROWS_PULL_MS });
                    io.emit('syncPlayerFull', tgt);
                } else {
                    bb.crowsPendingTarget = null; bb.crowsActiveTarget = null;
                    bb.crowsHitAt = 0; bb.castingUntil = 0;
                }
            }

            // 💥 파공아 (크로우즈 흡인 완료 시점)
            if (bb.crowsHitAt && now >= bb.crowsHitAt) {
                let guraR = bb.radius * ctx.GURA_RADIUS_MULT;
                let gTgt = bb.crowsActiveTarget ? players[bb.crowsActiveTarget] : null;
                let gx = gTgt ? gTgt.x : bb.x, gy = gTgt ? gTgt.y : bb.y;
                io.emit('guraImpact', { x: gx, y: gy, radius: guraR });

                for (let pid in players) {
                    let t = players[pid];
                    if (t.isDead || !isInDarkArea(t)) continue;
                    if (Math.hypot(t.x - gx, t.y - gy) > guraR) continue;
                    let actual = ctx.GURA_DAMAGE * (1 - (t.defense || 0));
                    t.hp -= actual;
                    emitDamageText(t.x, t.y, actual);
                    if (t.hp <= 0) checkPlayerDeath(t, null);
                    else io.to(pid).emit('bossHit', { damage: actual, dir: (t.x >= gx ? 1 : -1), kb: (t.x >= gx ? 60 : -60) });
                }
                if (gTgt) { gTgt.crowsPullUntil = 0; io.emit('crowsEnd', { id: bb.crowsActiveTarget }); io.emit('syncPlayerFull', gTgt); }
                bb.crowsActiveTarget = null; bb.crowsPendingTarget = null; bb.crowsHitAt = 0;
            }

            // 스킬 선택
            let busyNow = (now < (bb.castingUntil || 0));
            if (!busyNow && anyInDark && now >= bb.frozenUntil) {
                // ⛓️ 크로우즈 (5초마다)
                if (!bb.crowsNextCast) bb.crowsNextCast = now + ctx.CROWS_INTERVAL;
                if (now >= bb.crowsNextCast) {
                    let cands = [];
                    for (let pid in players) {
                        let p = players[pid];
                        if (p.isDead || !isInDarkArea(p)) continue;
                        if (Math.hypot(p.x - bb.x, p.y - bb.y) > ctx.CROWS_RANGE) continue;
                        cands.push(pid);
                    }
                    if (cands.length > 0) {
                        let pick = cands[Math.floor(Math.random() * cands.length)];
                        let tgt = players[pick];
                        let aimDX = tgt.x - bb.x, aimDY = tgt.y - bb.y;
                        let aimLen = Math.hypot(aimDX, aimDY) || 1;
                        if (aimLen === 1 && aimDX === 0 && aimDY === 0) aimDX = 1;
                        bb.crowsAimUX = aimDX / aimLen; bb.crowsAimUY = aimDY / aimLen;
                        bb.crowsAimX = tgt.x; bb.crowsAimY = tgt.y;
                        bb.crowsNextCast = now + ctx.CROWS_INTERVAL;
                        bb.crowsPendingTarget = pick;
                        bb.telegraphUntil = now + ctx.CROWS_TELEGRAPH;
                        bb.castingUntil = now + ctx.CROWS_TELEGRAPH + ctx.CROWS_PULL_MS + 300;
                        io.emit('crowsTelegraph', {
                            x: bb.x, y: bb.y,
                            x2: bb.x + bb.crowsAimUX * ctx.CROWS_RANGE,
                            y2: bb.y + bb.crowsAimUY * ctx.CROWS_RANGE,
                            thickness: ctx.CROWS_THICKNESS, duration: ctx.CROWS_TELEGRAPH
                        });
                        busyNow = true;
                    } else bb.crowsNextCast = now + 1000;
                }

                // 🌊 암흑물질 장판
                if (!busyNow) {
                    if (!bb.darkFloorNextRoll) bb.darkFloorNextRoll = now + ctx.DARKFLOOR_ROLL_MS;
                    if (now >= bb.darkFloorNextRoll) {
                        bb.darkFloorNextRoll = now + ctx.DARKFLOOR_ROLL_MS;
                        if (Math.random() < ctx.DARKFLOOR_CHANCE) {
                            bb.darkFloorUntil = now + ctx.DARKFLOOR_DURATION;
                            bb.darkFloorNextTick = now + ctx.DARKFLOOR_TICK_MS;
                            bb.castingUntil = now + ctx.DARKFLOOR_DURATION;
                            io.emit('darkFloorStart', { x: bb.x, y: ctx.DARK_GROUND, duration: ctx.DARKFLOOR_DURATION, area: ctx.DARK_AREA });
                            busyNow = true;
                        }
                    }
                }

                // 🌑 공중 강림
                if (!busyNow) {
                    if (!bb.descentNextRoll) bb.descentNextRoll = now + ctx.DESCENT_ROLL_MS;
                    if (now >= bb.descentNextRoll) {
                        bb.descentNextRoll = now + ctx.DESCENT_ROLL_MS;
                        if (Math.random() < ctx.DESCENT_CHANCE) {
                            bb.riseFromY = bb.y;
                            bb.riseToY = ctx.DARK_GROUND - bb.radius - ctx.DESCENT_RISE;
                            bb.risingUntil = now + ASC;
                            bb.descentActive = false;
                            bb.castingUntil = now + ASC + ctx.DESCENT_DURATION;
                            io.emit('darkRise', { x: bb.x, fromY: bb.riseFromY, toY: bb.riseToY, duration: ASC });
                        }
                    }
                }
            }
        }
        let bbDelta = compressors.blackbeardDelta.getDelta('blackbeard', bb);
        if (bbDelta) io.emit('blackbeardUpdate', bbDelta);

        // ════════════════════════════════════════════════════════════════
        // 🟪 지저스 바제스
        // ════════════════════════════════════════════════════════════════
        if (burgessAlive()) {
            const GY = ctx.DARK_GROUND - bg.radius;

            if (bg.state === 'falling' || now < (bg.jumpingUntil || 0) || bg.airborne) bg.knockbackForce = 0;
            else decayKnockback(bg);

            if (bg.state === 'falling') {
                bg.y += ctx.BG_FALL_SPEED;
                if (bg.y >= GY || now >= bg.fallingUntil) {
                    bg.y = GY; bg.state = 'idle'; bg.fallingUntil = 0;
                    bg.airborne = false; bg.vy = 0;
                    bg.jumpNextCast = now + ctx.BG_JUMP_INTERVAL;
                    burgessShockwave(bg.x, bg.y, bg.radius * ctx.BG_LAND_MULT, ctx.BG_LAND_DAMAGE);
                }
            }
            else if (now < (bg.jumpingUntil || 0)) {
                let total = ctx.BG_JUMP_TRAVEL || 320;
                let t = 1 - ((bg.jumpingUntil - now) / total);
                t = Math.max(0, Math.min(1, t));
                bg.x = bg.jumpStartX + (bg.jumpTargetX - bg.jumpStartX) * t;
                let baseY = bg.jumpStartY + (bg.jumpTargetY - bg.jumpStartY) * t;
                bg.y = baseY - Math.sin(t * Math.PI) * ctx.BG_JUMP_ARC;
            }
            else if (bg.jumpingUntil && now >= bg.jumpingUntil) {
                bg.jumpingUntil = 0;
                bg.x = bg.jumpTargetX; bg.y = bg.jumpTargetY;
                burgessShockwave(bg.x, bg.y, bg.radius * ctx.BG_JUMP_MULT, ctx.BG_JUMP_DAMAGE);
                if (bg.y < GY - 4) { bg.airborne = true; bg.vy = 0; bg.state = 'airborne'; }
                else { bg.y = GY; bg.airborne = false; bg.vy = 0; bg.state = 'idle'; }
                bg.jumpNextCast = now + ctx.BG_JUMP_INTERVAL;
            }
            else if (bg.airborne) {
                bg.vy = (bg.vy || 0) + ctx.BG_GRAVITY;
                bg.y += bg.vy;
                if (bg.y >= GY) { bg.y = GY; bg.vy = 0; bg.airborne = false; bg.state = 'idle'; }
            }
            else if (bg.jumpTelegraphUntil && now < bg.jumpTelegraphUntil) bg.y = GY;
            else if (bg.jumpTelegraphUntil && now >= bg.jumpTelegraphUntil) {
                bg.jumpTelegraphUntil = 0;
                bg.jumpStartX = bg.x; bg.jumpStartY = bg.y;
                bg.jumpingUntil = now + ctx.BG_JUMP_TRAVEL;
                bg.state = 'jumping';
                io.emit('burgessJump', {
                    fromX: bg.jumpStartX, fromY: bg.jumpStartY,
                    toX: bg.jumpTargetX, toY: bg.jumpTargetY,
                    duration: ctx.BG_JUMP_TRAVEL, radius: bg.radius, arc: ctx.BG_JUMP_ARC
                });
            }
            else {
                bg.y = GY; bg.state = 'idle';
                if (now >= bg.frozenUntil) {
                    if (!bg.jumpNextCast) bg.jumpNextCast = now + ctx.BG_JUMP_INTERVAL;
                    if (now >= bg.jumpNextCast) {
                        let found = null, closest = Infinity;
                        for (let pid in players) {
                            let p = players[pid];
                            if (p.isDead || !isInDarkArea(p)) continue;
                            let d = Math.hypot(p.x - bg.x, p.y - bg.y);
                            if (d < closest) { closest = d; found = p; bg.targetId = pid; }
                        }
                        if (found) {
                            let tx = Math.max(ctx.DARK_AREA.minX + bg.radius, Math.min(ctx.DARK_AREA.maxX - bg.radius, found.x));
                            let ty = Math.max(ctx.DARK_AREA.minY + bg.radius, Math.min(GY, found.y));
                            bg.jumpTargetX = tx; bg.jumpTargetY = ty;
                            bg.jumpTelegraphUntil = now + ctx.BG_JUMP_TELEGRAPH;
                            bg.state = 'telegraph';
                            bg.jumpNextCast = now + ctx.BG_JUMP_INTERVAL + ctx.BG_JUMP_TELEGRAPH + ctx.BG_JUMP_TRAVEL;
                            io.emit('burgessTelegraph', {
                                x: tx, y: ty, groundY: GY,
                                radius: bg.radius * ctx.BG_JUMP_MULT, duration: ctx.BG_JUMP_TELEGRAPH
                            });
                        } else bg.jumpNextCast = now + 1000;
                    }
                }
            }

            let gMinX = ctx.DARK_AREA.minX + bg.radius, gMaxX = ctx.DARK_AREA.maxX - bg.radius;
            if (bg.x < gMinX) { bg.x = gMinX; bg.knockbackForce = 0; }
            if (bg.x > gMaxX) { bg.x = gMaxX; bg.knockbackForce = 0; }
        }
        let bgDelta = compressors.burgessDelta.getDelta('burgess', bg);
        if (bgDelta) io.emit('burgessUpdate', bgDelta);

        // ════════════════════════════════════════════════════════════════
        // 🐗 소환된 할배새끼
        // ════════════════════════════════════════════════════════════════
        if (!anyInBasket) despawnHinbeomMinions();
        else {
            for (let mi = minions.length - 1; mi >= 0; mi--) {
                let mn = minions[mi];
                if (mn.hp <= 0) continue;
                decayKnockback(mn);

                if (now >= mn.frozenUntil) {
                    let t = players[mn.targetId];
                    if (!t || t.isDead || !isInHinbeomArea(t)) mn.targetId = null;
                    if (!mn.targetId) mn.targetId = findNearestIn(players, mn.x, isInHinbeomArea);

                    let tgt = players[mn.targetId];
                    if (tgt) {
                        mn.state = 'chase';
                        if (mn.x < tgt.x - 40) mn.x += mn.speed;
                        else if (mn.x > tgt.x + 40) mn.x -= mn.speed;
                        if (Math.abs(mn.x - tgt.x) < 300 && now - mn.lastAttack > 1000) {
                            mn.lastAttack = now;
                            let dir = tgt.x > mn.x ? 1 : -1;
                            shockwaves.push({
                                id: getNextProjId(), ownerId: 'monster',
                                x: mn.x + (dir * 50), y: mn.y + 45,
                                dir: dir, speed: 9, life: 80, hitIds: [],
                                damage: 30, kb: dir * 25, type: 'boss'
                            });
                        }
                    } else mn.state = 'idle';
                }
                let nMinX = ctx.HINBEOM_AREA.minX + mn.radius, nMaxX = ctx.HINBEOM_AREA.maxX - mn.radius;
                if (mn.x < nMinX) { mn.x = nMinX; mn.knockbackForce = 0; }
                if (mn.x > nMaxX) { mn.x = nMaxX; mn.knockbackForce = 0; }
                mn.y = ctx.HINBEOM_GROUND - mn.radius;
            }
        }
        if (minions.length > 0 || _minionWasActive) {
            _minionWasActive = minions.length > 0;
            io.emit('syncMinions', minions.map(mn => ({
                id: mn.id, x: mn.x, y: mn.y, radius: mn.radius, hp: mn.hp, maxHp: mn.maxHp, state: mn.state,
                frozenUntil: mn.frozenUntil, electrocutedUntil: mn.electrocutedUntil, airFreezeUntil: mn.airFreezeUntil,
                raigoPullUntil: mn.raigoPullUntil, burningUntil: mn.burningUntil,
                maguBombUntil: mn.maguBombUntil, justiceBombUntil: mn.justiceBombUntil
            })));
        }

        // ════════════════════════════════════════════════════════════════
        // 🥬 오크라
        // ════════════════════════════════════════════════════════════════
        okras.forEach(ok => {
            decayKnockback(ok);
            if (ok.hp <= 0 || now < ok.frozenUntil) return;
            let sp = ok.speed;

            if (ok.state === 'idle') {
                let closestDist = 200, target = null;
                for (let id in players) {
                    let p = players[id];
                    if (p.isDead || isInDarkZone(p)) continue;
                    let d = Math.hypot(p.x - ok.x, p.y - ok.y);
                    if (d <= closestDist) { closestDist = d; target = id; }
                }
                if (target) { ok.targetId = target; ok.state = 'chase'; }
            } else if (ok.state === 'chase') {
                let p = players[ok.targetId];
                if (!p || p.isDead || isInDarkZone(p) || Math.hypot(p.x - ok.x, p.y - ok.y) > 1500) { ok.state = 'return'; ok.targetId = null; }
                else {
                    let d = Math.hypot(p.x - ok.x, p.y - ok.y);
                    if (d <= 40 + ok.radius) {
                        if (now - ok.lastAttack >= 1000) {
                            ok.lastAttack = now;
                            let actual = ok.atk * (1 - (p.defense || 0));
                            p.hp -= actual;
                            emitDamageText(p.x, p.y, actual);
                            if (p.hp <= 0) checkPlayerDeath(p); else io.to(p.id).emit('takeDamage', actual);
                        }
                    } else ok.x += (p.x > ok.x ? sp : -sp);
                }
            } else if (ok.state === 'return') {
                if (Math.abs(ok.x - ok.homeX) < sp) { ok.x = ok.homeX; ok.state = 'idle'; ok.hp = ok.maxHp; }
                else ok.x += (ok.homeX > ok.x ? sp : -sp);
            }
        });

        let okrasDelta = okras.map(ok => compressors.okraDelta.getDelta(ok.id, ok)).filter(d => d !== null);
        if (okrasDelta.length > 0) io.emit('syncOkras', okrasDelta);
    }
};