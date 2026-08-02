// 파일명: gameLoop.js

const GROUND_Y_SERVER = 2000;

// 🚀 [최적화②] 매 프레임 무조건 나가던 브로드캐스트를 억제하기 위한 상태 추적값
let _lastBaseSync = 0;
let _lastBaseHp1 = -1;
let _lastBaseHp2 = -1;
let _lastDetectorSync = 0;
let _swWasActive = false;
let _minionWasActive = false;

// 🚀 [최적화⑧] 상태이상 전용 경량 브로드캐스트
function emitStatus(io, t) {
    io.emit('statusUpdate', {
        id: t.id,
        frozenUntil: t.frozenUntil || 0,
        electrocutedUntil: t.electrocutedUntil || 0,
        airFreezeUntil: t.airFreezeUntil || 0,
        burningUntil: t.burningUntil || 0,
        maguBombUntil: t.maguBombUntil || 0,
        justiceBombUntil: t.justiceBombUntil || 0
    });
}

class SpatialGrid {
    constructor(cellSize) { this.cellSize = cellSize; this.cells = new Map(); }
    insert(entity) {
        if (entity.x === undefined || entity.y === undefined) return;
        const cx = Math.floor(entity.x / this.cellSize);
        const cy = Math.floor(entity.y / this.cellSize);
        const key = `${cx},${cy}`;
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key).push(entity);
    }
    clear() { this.cells.clear(); }
    getNearby(x, y, radius) {
        const minX = Math.floor((x - radius) / this.cellSize);
        const maxX = Math.floor((x + radius) / this.cellSize);
        const minY = Math.floor((y - radius) / this.cellSize);
        const maxY = Math.floor((y + radius) / this.cellSize);
        const results = [];
        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const key = `${cx},${cy}`;
                if (this.cells.has(key)) results.push(...this.cells.get(key));
            }
        }
        return results;
    }
}

function sweptFallHit(objX, prevY, curY, targetX, targetY, hitR) {
    if (Math.abs(objX - targetX) > hitR) return false;
    let loY = Math.min(prevY, curY) - hitR;
    let hiY = Math.max(prevY, curY) + hitR;
    return targetY >= loY && targetY <= hiY;
}

module.exports = {
    update: (ctx) => {
        const { State, io, compressors, CharLogic, processBurns, getNextProjId, applyAoEDamage, applyBaseDamage, emitDamageText, checkPlayerDeath, addBurn, killMonster, killOkra } = ctx;
        const { players, monster, okras, projectiles, shockwaves, magmas, maguBombs, justiceBombs, giantPartisanQueue, mantleBolts, detectors, turrets, bases, gameStarted } = State;
        const hinbeom = State.hinbeom;
        const minions = State.hinbeomMinions;
        const bb = State.blackbeard;
        const bg = State.burgess;
        const { killHinbeom, aggroHinbeom, isInHinbeomArea, getMinion, killMinion, spawnHinbeomMinions, despawnHinbeomMinions,
                recordHinbeomDamage, PORTAL_COOLDOWN, PORTAL_DWELL_MS, PORTAL_RADIUS,
                HINBEOM_AREA, HINBEOM_GROUND, HINBEOM_REGEN,
                HAKI_CHANCE, HAKI_ROLL_MS, HAKI_DURATION, HAKI_TICK_MS, HAKI_TICK_DMG, HAKI_TICKS, MINION_EVERY,
                killBlackbeard, aggroBlackbeard, isInDarkArea, isInDarkZone, clearBlackbeardSkills, isInCrowsBeam,
                DARK_AREA, DARK_GROUND, DARK_ENTRY_X, DARK_ENTRY_Y, BB_RADIUS,
                DARKFLOOR_CHANCE, DARKFLOOR_ROLL_MS, DARKFLOOR_DURATION, DARKFLOOR_TICK_MS, DARKFLOOR_TICK_DMG,
                CROWS_INTERVAL, CROWS_TELEGRAPH, CROWS_RANGE, CROWS_THICKNESS, CROWS_PULL_MS,
                GURA_DAMAGE, GURA_RADIUS_MULT,
                DESCENT_CHANCE, DESCENT_ROLL_MS, DESCENT_DURATION, DESCENT_TICK_MS, DESCENT_TICK_DMG,
                DESCENT_RISE, DESCENT_ASCEND_MS,
                killBurgess, aggroBurgess, burgessAlive, burgessShockwave, checkBurgessSummon,
                BG_RADIUS, BG_SPEED, BG_FALL_SPEED, BG_LAND_DAMAGE, BG_LAND_MULT,
                BG_JUMP_INTERVAL, BG_JUMP_TELEGRAPH, BG_JUMP_TRAVEL, BG_JUMP_DAMAGE, BG_JUMP_MULT, BG_JUMP_ARC } = ctx;

        if (!gameStarted) return;
        let now = Date.now();

        if (bases[1].hp !== _lastBaseHp1 || bases[2].hp !== _lastBaseHp2 || now - _lastBaseSync >= 1000) {
            _lastBaseHp1 = bases[1].hp; _lastBaseHp2 = bases[2].hp; _lastBaseSync = now;
            io.emit('syncBases', bases);
        }

        let detUp = false; let projUpdated = false;

        for (let pid in players) {
            let p = players[pid];
            let logic = CharLogic[p.characterType];
            if (logic && logic.updateLoop) logic.updateLoop(p, now, ctx);
        }

        processBurns(now); 

        for (let pid in players) {
            let p = players[pid];
            if (!p.mantleActive) continue;
            if (p.isDead || now >= p.mantleEnd) { p.mantleActive = false; continue; }
            let ES2 = ctx.Skills.ENEL_S2;
            
            let maxCount = p.hasArkMaxim ? ((ES2.boltCount || 20) * 2) + 10 : (ES2.boltCount || 20);
            let interval = p.hasArkMaxim ? Math.floor((ES2.duration || 3000) / maxCount) : (ES2.spawnInterval || 150);

            while (now >= p.mantleNextSpawn && p.mantleFired < maxCount) {
                let actualWidth = p.hasArkMaxim ? ES2.width * 3 : ES2.width;
                let halfW = actualWidth / 2;
                let mx = p.mantleCenterX + (Math.random() * 2 - 1) * halfW;
                let actualRadius = p.hasArkMaxim ? 34 * 1.5 : 34;

                mantleBolts.push({
                    id: getNextProjId(), ownerId: p.id, team: p.team,
                    x: mx, y: (ES2.spawnY !== undefined ? ES2.spawnY : 250) + (Math.random() * 120 - 60),
                    vy: ES2.fallSpeed || 85, radius: actualRadius,
                    damage: ES2.boltDamage || 60, hitIds: [],
                    hasArkMaxim: p.hasArkMaxim
                });
                p.mantleFired++;
                p.mantleNextSpawn = now + interval;
            }
        }

        for (let i = maguBombs.length - 1; i >= 0; i--) {
            let b = maguBombs[i];
            if (now >= b.explodeAt) {
                maguBombs.splice(i, 1);
                let target, tx, ty;
                if (b.targetType === 'player' && players[b.targetId] && !players[b.targetId].isDead) {
                    target = players[b.targetId]; tx = target.x; ty = target.y; target.maguBombUntil = 0; emitStatus(io, target);
                } else if (b.targetType === 'monster' && monster.hp > 0) {
                    target = monster; tx = monster.x; ty = monster.y; monster.maguBombUntil = 0;
                } else if (b.targetType === 'hinbeom' && hinbeom.hp > 0) {
                    target = hinbeom; tx = hinbeom.x; ty = hinbeom.y; hinbeom.maguBombUntil = 0;
                } else if (b.targetType === 'blackbeard' && bb.hp > 0) {
                    target = bb; tx = bb.x; ty = bb.y; bb.maguBombUntil = 0;
                } else if (b.targetType === 'burgess' && bg.hp > 0) {
                    target = bg; tx = bg.x; ty = bg.y; bg.maguBombUntil = 0;
                } else if (b.targetType === 'minion') {
                    target = getMinion(b.targetId);
                    if (target && target.hp > 0) { tx = target.x; ty = target.y; target.maguBombUntil = 0; }
                } else if (b.targetType === 'okra') {
                    target = okras.find(o => o.id === b.targetId);
                    if (target && target.hp > 0) { tx = target.x; ty = target.y; target.maguBombUntil = 0; }
                }
                
                if (tx !== undefined) {
                    io.emit('magmaImpact', { x: tx, y: ty }); 
                    let owner = players[b.ownerId] || { id: b.ownerId, team: b.team, gold: 0, level: 1 };
                    applyAoEDamage(owner, tx, ty, 280, 200, 0); 
                }
            }
        }

        for (let i = justiceBombs.length - 1; i >= 0; i--) {
            let b = justiceBombs[i];
            if (now >= b.explodeAt) {
                justiceBombs.splice(i, 1);
                let target, tx, ty;
                if (b.targetType === 'player' && players[b.targetId] && !players[b.targetId].isDead) {
                    target = players[b.targetId]; tx = target.x; ty = target.y; target.justiceBombUntil = 0; emitStatus(io, target);
                } else if (b.targetType === 'monster' && monster.hp > 0) {
                    target = monster; tx = monster.x; ty = monster.y; monster.justiceBombUntil = 0;
                } else if (b.targetType === 'hinbeom' && hinbeom.hp > 0) {
                    target = hinbeom; tx = hinbeom.x; ty = hinbeom.y; hinbeom.justiceBombUntil = 0;
                } else if (b.targetType === 'blackbeard' && bb.hp > 0) {
                    target = bb; tx = bb.x; ty = bb.y; bb.justiceBombUntil = 0;
                } else if (b.targetType === 'burgess' && bg.hp > 0) {
                    target = bg; tx = bg.x; ty = bg.y; bg.justiceBombUntil = 0;
                } else if (b.targetType === 'minion') {
                    target = getMinion(b.targetId);
                    if (target && target.hp > 0) { tx = target.x; ty = target.y; target.justiceBombUntil = 0; }
                } else if (b.targetType === 'okra') {
                    target = okras.find(o => o.id === b.targetId);
                    if (target && target.hp > 0) { tx = target.x; ty = target.y; target.justiceBombUntil = 0; }
                }
                
                if (tx !== undefined) {
                    io.emit('magmaImpact', { x: tx, y: ty }); 
                    let owner = players[b.ownerId] || { id: b.ownerId, team: b.team, gold: 0, level: 1 };
                    applyAoEDamage(owner, tx, ty, 280, 100, 0); 
                }
            }
        }

        for (let i = giantPartisanQueue.length - 1; i >= 0; i--) {
            let q = giantPartisanQueue[i];
            if (now >= q.spawnTime) {
                giantPartisanQueue.splice(i, 1);
                let tx, ty;
                if (q.targetType === 'player' && players[q.targetId] && !players[q.targetId].isDead) {
                    tx = players[q.targetId].x; ty = players[q.targetId].y;
                } else if (q.targetType === 'monster' && monster.hp > 0) {
                    tx = monster.x; ty = monster.y;
                } else if (q.targetType === 'hinbeom' && hinbeom.hp > 0) {
                    tx = hinbeom.x; ty = hinbeom.y;
                } else if (q.targetType === 'blackbeard' && bb.hp > 0) {
                    tx = bb.x; ty = bb.y;
                } else if (q.targetType === 'burgess' && bg.hp > 0) {
                    tx = bg.x; ty = bg.y;
                } else if (q.targetType === 'minion') {
                    let target = getMinion(q.targetId);
                    if (target && target.hp > 0) { tx = target.x; ty = target.y; }
                } else if (q.targetType === 'okra') {
                    let target = okras.find(o => o.id === q.targetId);
                    if (target && target.hp > 0) { tx = target.x; ty = target.y; }
                }
                if (tx !== undefined) {
                    projectiles.push({
                        id: getNextProjId(), team: q.team, type: 'giant_partisan', ownerId: q.ownerId,
                        x: tx, y: ty - 800, vx: 0, vy: 50, 
                        life: 40, damage: 200, freeze: 2000, hitR: 70, edgeR: 40, piercing: false
                    });
                }
            }
        }

        detectors.forEach(d => { 
            if (now >= d.nextMineTime) { 
                let rd = Math.random() * 100; 
                let aid = (rd < 60) ? (Math.random() < 0.5 ? 'jadam' : 'pepsi_art') : (rd < 90) ? 'rare_box' : (rd < 98) ? ['seolgonnyak', 'pika_fruit', 'hie_fruit', 'magu_fruit', 'goro_fruit', 'justice_coat'][Math.floor(Math.random() * 6)] : 'justice_coat';
                d.chest.push({ uid: Math.random().toString(36).substr(2, 9), id: aid }); 
                d.nextMineTime = now + 3000; detUp = true; 
            } 
        });
        if (detUp || now - _lastDetectorSync >= 1000) { _lastDetectorSync = now; io.emit('syncDetectors', detectors); }

        turrets.forEach(turret => {
            if (now - turret.lastShot >= 333) { 
                let target = null; let minDist = turret.range;
                for (let pid in players) { let p = players[pid]; if (!p.isDead && p.team !== turret.team) { let d = Math.hypot(p.x - turret.x, p.y - turret.y); if (d < minDist) { minDist = d; target = p; } } }
                if (!target && monster.hp > 0 && Math.hypot(monster.x - turret.x, monster.y - turret.y) < minDist) { minDist = Math.hypot(monster.x - turret.x, monster.y - turret.y); target = monster; }
                if (!target) { okras.forEach(ok => { if (ok.hp > 0 && Math.hypot(ok.x - turret.x, ok.y - turret.y) < minDist) { minDist = Math.hypot(ok.x - turret.x, ok.y - turret.y); target = ok; } }); }

                if (target) {
                    turret.lastShot = now; let dirX = target.x - turret.x; let dirY = (target.y - 45) - (turret.y - 60); let dist = Math.hypot(dirX, dirY); if(dist === 0) dist = 1;
                    projectiles.push({ id: getNextProjId(), team: turret.team, x: turret.x, y: turret.y - 60, vx: (dirX / dist) * 15, vy: (dirY / dist) * 15, life: 80, damage: turret.damage });
                }
            }
        });

        for (let i = projectiles.length - 1; i >= 0; i--) {
            let p = projectiles[i];
            if (p.homing) {
                let target = null; let minDist = 800;
                for (let pid in players) { let ep = players[pid]; if (!ep.isDead && ep.team !== p.team) { let d = Math.hypot(ep.x - p.x, ep.y - p.y); if (d < minDist) { minDist = d; target = ep; } } }
                if (!target && monster.hp > 0) { let d = Math.hypot(monster.x - p.x, monster.y - p.y); if (d < minDist) { minDist = d; target = monster; } }
                if (!target && hinbeom.hp > 0) { let d = Math.hypot(hinbeom.x - p.x, hinbeom.y - p.y); if (d < minDist) { minDist = d; target = hinbeom; } }
                if (!target && bb.hp > 0 && bb.state !== 'dead') { let d = Math.hypot(bb.x - p.x, bb.y - p.y); if (d < minDist) { minDist = d; target = bb; } }
                if (!target && burgessAlive()) { let d = Math.hypot(bg.x - p.x, bg.y - p.y); if (d < minDist) { minDist = d; target = bg; } }
                if (!target) { minions.forEach(mn => { if (mn.hp > 0) { let d = Math.hypot(mn.x - p.x, mn.y - p.y); if (d < minDist) { minDist = d; target = mn; } } }); }
                if (!target) { okras.forEach(ok => { if (ok.hp > 0) { let d = Math.hypot(ok.x - p.x, ok.y - p.y); if (d < minDist) { minDist = d; target = ok; } } }); }
                if (target) {
                    let tx = target.x - p.x; let ty = target.y - p.y; let dist = Math.hypot(tx, ty); let speed = Math.hypot(p.vx, p.vy);
                    if (dist > 0 && speed > 0) {
                        let desiredVx = (tx / dist) * speed; let desiredVy = (ty / dist) * speed;
                        p.vx += (desiredVx - p.vx) * 0.15; p.vy += (desiredVy - p.vy) * 0.15;
                        let newSpeed = Math.hypot(p.vx, p.vy); p.vx = (p.vx / newSpeed) * speed; p.vy = (p.vy / newSpeed) * speed;
                    }
                }
            }

            p.x += p.vx; p.y += p.vy; p.life--; let hit = false;
            let owner = p.ownerId ? players[p.ownerId] : null; 
            let pR = p.hitR || 45; let eR = p.edgeR || 10;

            if (p.canHitBase && (!hit || p.piercing)) {
                let eBase = bases[p.team === 1 ? 2 : 1];
                if (eBase && eBase.hp > 0 && Math.hypot(p.x - eBase.x, p.y - eBase.y) < pR + 150) { 
                    if (!(p.piercing && p.hitIds && p.hitIds.includes('base'))) {
                        applyBaseDamage(p.team, p.damage); 
                        if (!p.piercing) hit = true; else { if(!p.hitIds) p.hitIds = []; p.hitIds.push('base'); }
                    }
                }
            }

            if (!hit || p.piercing) {
                for (let pid in players) {
                    let target = players[pid];
                    if (!target.isDead && target.team !== p.team && Math.hypot(p.x - target.x, p.y - target.y) < pR) {
                        if (p.piercing && p.hitIds && p.hitIds.includes(pid)) continue; 
                        
                        target.hp -= p.damage; emitDamageText(target.x, target.y, p.damage);
                        if (p.freeze) { 
                            target.frozenUntil = Math.max(target.frozenUntil || 0, Date.now() + p.freeze); 
                            emitStatus(io, target); 
                            if (p.hasJusticeCoat && p.type === 'partisan') {
                                let hitKey = 'partisanHits_' + p.ownerId;
                                target[hitKey] = (target[hitKey] || 0) + 1;
                                if (target[hitKey] >= 3) {
                                    target[hitKey] = 0;
                                    giantPartisanQueue.push({ targetId: pid, targetType: 'player', spawnTime: Date.now() + 500, ownerId: p.ownerId, team: p.team });
                                }
                            }
                        }
                        if (p.fire) addBurn(pid, target, p.fire.dps, p.fire.dur, p.ownerId); 
                        
                        if (p.hasMagu && p.type === 'meigou') {
                            target.maguBombUntil = Math.max(target.maguBombUntil || 0, Date.now() + 3000);
                            maguBombs.push({ targetId: pid, targetType: 'player', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                            emitStatus(io, target);
                        }
                        if (p.hasJusticeCoat && p.type === 'dai_funka') {
                            target.justiceBombUntil = Math.max(target.justiceBombUntil || 0, Date.now() + 3000);
                            justiceBombs.push({ targetId: pid, targetType: 'player', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                            emitStatus(io, target);
                        }

                        if (target.hp <= 0) checkPlayerDeath(target, p.ownerId); else io.to(target.id).emit('takeDamage', p.damage);
                        
                        if (!p.piercing) { hit = true; break; }
                        else { if(!p.hitIds) p.hitIds = []; p.hitIds.push(pid); } 
                    }
                }
            }
            if ((!hit || p.piercing) && monster.hp > 0 && Math.hypot(p.x - monster.x, p.y - monster.y) < monster.radius + eR) {
                if (!(p.piercing && p.hitIds && p.hitIds.includes('monster'))) {
                    monster.hp -= p.damage; emitDamageText(monster.x, monster.y, p.damage); 
                    if (p.freeze) { 
                        monster.frozenUntil = Math.max(monster.frozenUntil || 0, Date.now() + p.freeze); 
                        if (p.hasJusticeCoat && p.type === 'partisan') {
                            let hitKey = 'partisanHits_' + p.ownerId;
                            monster[hitKey] = (monster[hitKey] || 0) + 1;
                            if (monster[hitKey] >= 3) {
                                monster[hitKey] = 0;
                                giantPartisanQueue.push({ targetId: 'monster', targetType: 'monster', spawnTime: Date.now() + 500, ownerId: p.ownerId, team: p.team });
                            }
                        }
                    } 
                    if (p.fire) addBurn('monster', monster, p.fire.dps, p.fire.dur, p.ownerId); 
                    
                    if (p.hasMagu && p.type === 'meigou') {
                        monster.maguBombUntil = Math.max(monster.maguBombUntil || 0, Date.now() + 3000);
                        maguBombs.push({ targetId: 'monster', targetType: 'monster', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                    }
                    if (p.hasJusticeCoat && p.type === 'dai_funka') {
                        monster.justiceBombUntil = Math.max(monster.justiceBombUntil || 0, Date.now() + 3000);
                        justiceBombs.push({ targetId: 'monster', targetType: 'monster', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                    }

                    if (owner) { monster.targetId = p.ownerId; monster.state = 'chase'; } 
                    if (monster.hp <= 0) killMonster(p.ownerId);
                    
                    if (!p.piercing) hit = true; else { if(!p.hitIds) p.hitIds = []; p.hitIds.push('monster'); }
                }
            }
            if ((!hit || p.piercing) && hinbeom.hp > 0 && Math.hypot(p.x - hinbeom.x, p.y - hinbeom.y) < hinbeom.radius + eR) {
                if (!(p.piercing && p.hitIds && p.hitIds.includes('hinbeom'))) {
                    let isInvincible = minions.length > 0;
                    if (!isInvincible) {
                        hinbeom.hp -= p.damage; emitDamageText(hinbeom.x, hinbeom.y, p.damage);
                        if (typeof recordHinbeomDamage === 'function') recordHinbeomDamage(p.ownerId, p.damage);
                        if (p.freeze) {
                            hinbeom.frozenUntil = Math.max(hinbeom.frozenUntil || 0, Date.now() + p.freeze);
                            if (p.hasJusticeCoat && p.type === 'partisan') {
                                let hitKey = 'partisanHits_' + p.ownerId;
                                hinbeom[hitKey] = (hinbeom[hitKey] || 0) + 1;
                                if (hinbeom[hitKey] >= 3) {
                                    hinbeom[hitKey] = 0;
                                    giantPartisanQueue.push({ targetId: 'hinbeom', targetType: 'hinbeom', spawnTime: Date.now() + 500, ownerId: p.ownerId, team: p.team });
                                }
                            }
                        }
                        if (p.fire) addBurn('hinbeom', hinbeom, p.fire.dps, p.fire.dur, p.ownerId);

                        if (p.hasMagu && p.type === 'meigou') {
                            hinbeom.maguBombUntil = Math.max(hinbeom.maguBombUntil || 0, Date.now() + 3000);
                            maguBombs.push({ targetId: 'hinbeom', targetType: 'hinbeom', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                        }
                        if (p.hasJusticeCoat && p.type === 'dai_funka') {
                            hinbeom.justiceBombUntil = Math.max(hinbeom.justiceBombUntil || 0, Date.now() + 3000);
                            justiceBombs.push({ targetId: 'hinbeom', targetType: 'hinbeom', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                        }

                        if (owner) aggroHinbeom(p.ownerId);
                        if (hinbeom.hp <= 0) killHinbeom(p.ownerId);
                    }
                    if (!p.piercing) hit = true; else { if(!p.hitIds) p.hitIds = []; p.hitIds.push('hinbeom'); }
                }
            }
            // ⚫ 검은수염 투사체 판정
            if ((!hit || p.piercing) && bb.hp > 0 && bb.state !== 'dead' && Math.hypot(p.x - bb.x, p.y - bb.y) < bb.radius + eR) {
                if (!(p.piercing && p.hitIds && p.hitIds.includes('blackbeard'))) {
                    bb.hp -= p.damage; emitDamageText(bb.x, bb.y, p.damage);
                    if (p.freeze) {
                        bb.frozenUntil = Math.max(bb.frozenUntil || 0, Date.now() + p.freeze);
                        if (p.hasJusticeCoat && p.type === 'partisan') {
                            let hitKey = 'partisanHits_' + p.ownerId;
                            bb[hitKey] = (bb[hitKey] || 0) + 1;
                            if (bb[hitKey] >= 3) {
                                bb[hitKey] = 0;
                                giantPartisanQueue.push({ targetId: 'blackbeard', targetType: 'blackbeard', spawnTime: Date.now() + 500, ownerId: p.ownerId, team: p.team });
                            }
                        }
                    }
                    if (p.fire) addBurn('blackbeard', bb, p.fire.dps, p.fire.dur, p.ownerId);

                    if (p.hasMagu && p.type === 'meigou') {
                        bb.maguBombUntil = Math.max(bb.maguBombUntil || 0, Date.now() + 3000);
                        maguBombs.push({ targetId: 'blackbeard', targetType: 'blackbeard', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                    }
                    if (p.hasJusticeCoat && p.type === 'dai_funka') {
                        bb.justiceBombUntil = Math.max(bb.justiceBombUntil || 0, Date.now() + 3000);
                        justiceBombs.push({ targetId: 'blackbeard', targetType: 'blackbeard', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                    }

                    if (owner) aggroBlackbeard(p.ownerId);
                    checkBurgessSummon();
                    if (bb.hp <= 0) killBlackbeard(p.ownerId);

                    if (!p.piercing) hit = true; else { if(!p.hitIds) p.hitIds = []; p.hitIds.push('blackbeard'); }
                }
            }
            // 🟪 지저스 바제스 투사체 판정
            if ((!hit || p.piercing) && burgessAlive() && Math.hypot(p.x - bg.x, p.y - bg.y) < bg.radius + eR) {
                if (!(p.piercing && p.hitIds && p.hitIds.includes('burgess'))) {
                    bg.hp -= p.damage; emitDamageText(bg.x, bg.y, p.damage);
                    if (p.freeze) {
                        bg.frozenUntil = Math.max(bg.frozenUntil || 0, Date.now() + p.freeze);
                        if (p.hasJusticeCoat && p.type === 'partisan') {
                            let hitKey = 'partisanHits_' + p.ownerId;
                            bg[hitKey] = (bg[hitKey] || 0) + 1;
                            if (bg[hitKey] >= 3) {
                                bg[hitKey] = 0;
                                giantPartisanQueue.push({ targetId: 'burgess', targetType: 'burgess', spawnTime: Date.now() + 500, ownerId: p.ownerId, team: p.team });
                            }
                        }
                    }
                    if (p.fire) addBurn('burgess', bg, p.fire.dps, p.fire.dur, p.ownerId);

                    if (p.hasMagu && p.type === 'meigou') {
                        bg.maguBombUntil = Math.max(bg.maguBombUntil || 0, Date.now() + 3000);
                        maguBombs.push({ targetId: 'burgess', targetType: 'burgess', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                    }
                    if (p.hasJusticeCoat && p.type === 'dai_funka') {
                        bg.justiceBombUntil = Math.max(bg.justiceBombUntil || 0, Date.now() + 3000);
                        justiceBombs.push({ targetId: 'burgess', targetType: 'burgess', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                    }

                    if (owner) aggroBurgess(p.ownerId);
                    if (bg.hp <= 0) killBurgess(p.ownerId);

                    if (!p.piercing) hit = true; else { if(!p.hitIds) p.hitIds = []; p.hitIds.push('burgess'); }
                }
            }
            if (!hit || p.piercing) {
                for (let mi = minions.length - 1; mi >= 0; mi--) {
                    let mn = minions[mi];
                    if (mn.hp <= 0 || Math.hypot(p.x - mn.x, p.y - mn.y) >= mn.radius + eR) continue;
                    if (p.piercing && p.hitIds && p.hitIds.includes('minion_' + mn.id)) continue;

                    mn.hp -= p.damage; emitDamageText(mn.x, mn.y, p.damage);
                    if (p.freeze) {
                        mn.frozenUntil = Math.max(mn.frozenUntil || 0, Date.now() + p.freeze);
                        if (p.hasJusticeCoat && p.type === 'partisan') {
                            let hitKey = 'partisanHits_' + p.ownerId;
                            mn[hitKey] = (mn[hitKey] || 0) + 1;
                            if (mn[hitKey] >= 3) {
                                mn[hitKey] = 0;
                                giantPartisanQueue.push({ targetId: mn.id, targetType: 'minion', spawnTime: Date.now() + 500, ownerId: p.ownerId, team: p.team });
                            }
                        }
                    }
                    if (p.fire) addBurn('minion_' + mn.id, mn, p.fire.dps, p.fire.dur, p.ownerId);

                    if (p.hasMagu && p.type === 'meigou') {
                        mn.maguBombUntil = Math.max(mn.maguBombUntil || 0, Date.now() + 3000);
                        maguBombs.push({ targetId: mn.id, targetType: 'minion', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                    }
                    if (p.hasJusticeCoat && p.type === 'dai_funka') {
                        mn.justiceBombUntil = Math.max(mn.justiceBombUntil || 0, Date.now() + 3000);
                        justiceBombs.push({ targetId: mn.id, targetType: 'minion', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                    }

                    if (owner) { mn.targetId = p.ownerId; mn.state = 'chase'; }
                    if (mn.hp <= 0) killMinion(mn, p.ownerId);

                    if (!p.piercing) { hit = true; break; }
                    else { if(!p.hitIds) p.hitIds = []; p.hitIds.push('minion_' + mn.id); }
                }
            }
            if (!hit || p.piercing) {
                okras.forEach(ok => {
                    if (ok.hp > 0 && Math.hypot(p.x - ok.x, p.y - ok.y) < ok.radius + eR) {
                        if (p.piercing && p.hitIds && p.hitIds.includes('okra_'+ok.id)) return;
                        ok.hp -= p.damage; emitDamageText(ok.x, ok.y, p.damage); 
                        if (p.freeze) { 
                            ok.frozenUntil = Math.max(ok.frozenUntil || 0, Date.now() + p.freeze); 
                            if (p.hasJusticeCoat && p.type === 'partisan') {
                                let hitKey = 'partisanHits_' + p.ownerId;
                                ok[hitKey] = (ok[hitKey] || 0) + 1;
                                if (ok[hitKey] >= 3) {
                                    ok[hitKey] = 0;
                                    giantPartisanQueue.push({ targetId: ok.id, targetType: 'okra', spawnTime: Date.now() + 500, ownerId: p.ownerId, team: p.team });
                                }
                            }
                        } 
                        if (p.fire) addBurn('okra_'+ok.id, ok, p.fire.dps, p.fire.dur, p.ownerId); 
                        
                        if (p.hasMagu && p.type === 'meigou') {
                            ok.maguBombUntil = Math.max(ok.maguBombUntil || 0, Date.now() + 3000);
                            maguBombs.push({ targetId: ok.id, targetType: 'okra', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                        }
                        if (p.hasJusticeCoat && p.type === 'dai_funka') {
                            ok.justiceBombUntil = Math.max(ok.justiceBombUntil || 0, Date.now() + 3000);
                            justiceBombs.push({ targetId: ok.id, targetType: 'okra', explodeAt: Date.now() + 3000, ownerId: p.ownerId, team: p.team });
                        }

                        if (owner) { ok.targetId = p.ownerId; ok.state = 'chase'; } 
                        if (ok.hp <= 0) killOkra(ok, p.ownerId);
                        
                        if (!p.piercing) hit = true; else { if(!p.hitIds) p.hitIds = []; p.hitIds.push('okra_'+ok.id); }
                    }
                });
            }
            if (hit || p.life <= 0) {
                if (p.type === 'magatama' && p.hasKizaru) {
                    io.emit('actionEffect', { type: 'magatama_explosion', x: p.x, y: p.y });
                    if (owner) applyAoEDamage(owner, p.x, p.y, 80, p.damage * 0.5, 0); 
                }
                projectiles.splice(i, 1); 
            }
            projUpdated = true;
        }
        if (projUpdated) io.emit('syncProjectiles', projectiles.map(pr => ({x: pr.x, y: pr.y, vx: pr.vx, vy: pr.vy, team: pr.team, type: pr.type})));

        let mantleUpdated = false;
        for (let i = mantleBolts.length - 1; i >= 0; i--) {
            let mb = mantleBolts[i]; let mbPrevY = mb.y; mb.y += mb.vy; let mbOwner = players[mb.ownerId] || null;

            let eBase = bases[mb.team === 1 ? 2 : 1];
            if (eBase && eBase.hp > 0 && !mb.hitIds.includes('base') && Math.abs(mb.x - eBase.x) < mb.radius + 120 && mb.y > eBase.y - 120) {
                mb.hitIds.push('base'); applyBaseDamage(mb.team, mb.damage);
            }

            for (let pid in players) {
                let t = players[pid]; if (t.isDead || t.team === mb.team || mb.hitIds.includes(pid)) continue;
                if (sweptFallHit(mb.x, mbPrevY, mb.y, t.x, t.y, mb.radius + 45)) {
                    mb.hitIds.push(pid); let actual = mb.damage * (1 - (t.defense || 0));
                    t.hp -= actual; emitDamageText(t.x, t.y, actual);
                    t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, now + 100); 
                    t.frozenUntil = Math.max(t.frozenUntil || 0, now + 100);
                    t.airFreezeUntil = Math.max(t.airFreezeUntil || 0, now + 100);
                    if (t.hp <= 0) checkPlayerDeath(t, mb.ownerId); else io.to(pid).emit('takeDamage', actual);
                }
            }
            if (monster.hp > 0 && !mb.hitIds.includes('monster') && sweptFallHit(mb.x, mbPrevY, mb.y, monster.x, monster.y, mb.radius + monster.radius)) {
                mb.hitIds.push('monster'); monster.hp -= mb.damage; emitDamageText(monster.x, monster.y, mb.damage);
                monster.electrocutedUntil = Math.max(monster.electrocutedUntil || 0, now + 100);
                monster.frozenUntil = Math.max(monster.frozenUntil || 0, now + 100);
                monster.airFreezeUntil = Math.max(monster.airFreezeUntil || 0, now + 100);
                if (mbOwner) { monster.targetId = mb.ownerId; monster.state = 'chase'; }
                if (monster.hp <= 0) killMonster(mb.ownerId);
            }
            if (hinbeom.hp > 0 && !mb.hitIds.includes('hinbeom') && sweptFallHit(mb.x, mbPrevY, mb.y, hinbeom.x, hinbeom.y, mb.radius + hinbeom.radius)) {
                mb.hitIds.push('hinbeom');
                let isInvincible = minions.length > 0;
                if (!isInvincible) {
                    hinbeom.hp -= mb.damage; emitDamageText(hinbeom.x, hinbeom.y, mb.damage);
                    if (typeof recordHinbeomDamage === 'function') recordHinbeomDamage(mb.ownerId, mb.damage);
                    hinbeom.electrocutedUntil = Math.max(hinbeom.electrocutedUntil || 0, now + 100);
                    hinbeom.frozenUntil = Math.max(hinbeom.frozenUntil || 0, now + 100);
                    hinbeom.airFreezeUntil = Math.max(hinbeom.airFreezeUntil || 0, now + 100);
                    if (mbOwner) aggroHinbeom(mb.ownerId);
                    if (hinbeom.hp <= 0) killHinbeom(mb.ownerId);
                }
            }
            if (bb.hp > 0 && bb.state !== 'dead' && !mb.hitIds.includes('blackbeard') && sweptFallHit(mb.x, mbPrevY, mb.y, bb.x, bb.y, mb.radius + bb.radius)) {
                mb.hitIds.push('blackbeard'); bb.hp -= mb.damage; emitDamageText(bb.x, bb.y, mb.damage);
                bb.electrocutedUntil = Math.max(bb.electrocutedUntil || 0, now + 100);
                bb.frozenUntil = Math.max(bb.frozenUntil || 0, now + 100);
                bb.airFreezeUntil = Math.max(bb.airFreezeUntil || 0, now + 100);
                if (mbOwner) aggroBlackbeard(mb.ownerId);
                checkBurgessSummon();
                if (bb.hp <= 0) killBlackbeard(mb.ownerId);
            }
            // 🟪 바제스 낙뢰 판정
            if (burgessAlive() && !mb.hitIds.includes('burgess') && sweptFallHit(mb.x, mbPrevY, mb.y, bg.x, bg.y, mb.radius + bg.radius)) {
                mb.hitIds.push('burgess'); bg.hp -= mb.damage; emitDamageText(bg.x, bg.y, mb.damage);
                bg.electrocutedUntil = Math.max(bg.electrocutedUntil || 0, now + 100);
                bg.frozenUntil = Math.max(bg.frozenUntil || 0, now + 100);
                if (mbOwner) aggroBurgess(mb.ownerId);
                if (bg.hp <= 0) killBurgess(mb.ownerId);
            }
            for (let mi = minions.length - 1; mi >= 0; mi--) {
                let mn = minions[mi];
                if (mn.hp > 0 && !mb.hitIds.includes('minion_' + mn.id) && sweptFallHit(mb.x, mbPrevY, mb.y, mn.x, mn.y, mb.radius + mn.radius)) {
                    mb.hitIds.push('minion_' + mn.id); mn.hp -= mb.damage; emitDamageText(mn.x, mn.y, mb.damage);
                    mn.electrocutedUntil = Math.max(mn.electrocutedUntil || 0, now + 100);
                    mn.frozenUntil = Math.max(mn.frozenUntil || 0, now + 100);
                    mn.airFreezeUntil = Math.max(mn.airFreezeUntil || 0, now + 100);
                    if (mbOwner) { mn.targetId = mb.ownerId; mn.state = 'chase'; }
                    if (mn.hp <= 0) killMinion(mn, mb.ownerId);
                }
            }
            okras.forEach(ok => {
                if (ok.hp > 0 && !mb.hitIds.includes('okra_'+ok.id) && sweptFallHit(mb.x, mbPrevY, mb.y, ok.x, ok.y, mb.radius + ok.radius)) {
                    mb.hitIds.push('okra_'+ok.id); ok.hp -= mb.damage; emitDamageText(ok.x, ok.y, mb.damage);
                    ok.electrocutedUntil = Math.max(ok.electrocutedUntil || 0, now + 100);
                    ok.frozenUntil = Math.max(ok.frozenUntil || 0, now + 100);
                    ok.airFreezeUntil = Math.max(ok.airFreezeUntil || 0, now + 100);
                    if (mbOwner) { ok.targetId = mb.ownerId; ok.state = 'chase'; }
                    if (ok.hp <= 0) killOkra(ok, mb.ownerId);
                }
            });

            if (mb.y >= GROUND_Y_SERVER) {
                mantleBolts.splice(i, 1); 
                io.emit('mantleExplosion', { x: mb.x, y: GROUND_Y_SERVER, hasArkMaxim: mb.hasArkMaxim });

                let expR = mb.hasArkMaxim ? 120 * 1.5 : 120; 
                for (let pid in players) {
                    let t = players[pid]; if (t.isDead || t.team === mb.team) continue;
                    if (Math.hypot(mb.x - t.x, GROUND_Y_SERVER - t.y) < expR + 45) {
                        t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, now + 100);
                        t.frozenUntil = Math.max(t.frozenUntil || 0, now + 100);
                        t.airFreezeUntil = Math.max(t.airFreezeUntil || 0, now + 100);
                        emitStatus(io, t);
                    }
                }
                if (monster.hp > 0 && Math.hypot(mb.x - monster.x, GROUND_Y_SERVER - monster.y) < expR + monster.radius) {
                    monster.electrocutedUntil = Math.max(monster.electrocutedUntil || 0, now + 100);
                    monster.frozenUntil = Math.max(monster.frozenUntil || 0, now + 100);
                    monster.airFreezeUntil = Math.max(monster.airFreezeUntil || 0, now + 100);
                }
                okras.forEach(ok => {
                    if (ok.hp > 0 && Math.hypot(mb.x - ok.x, GROUND_Y_SERVER - ok.y) < expR + ok.radius) {
                        ok.electrocutedUntil = Math.max(ok.electrocutedUntil || 0, now + 100);
                        ok.frozenUntil = Math.max(ok.frozenUntil || 0, now + 100);
                        ok.airFreezeUntil = Math.max(ok.airFreezeUntil || 0, now + 100);
                    }
                });
            }
            mantleUpdated = true;
        }
        if (mantleUpdated || mantleBolts.length > 0) io.emit('syncMantleBolts', mantleBolts.map(mb => ({ id: mb.id, x: mb.x, y: mb.y, radius: mb.radius, team: mb.team, hasArkMaxim: mb.hasArkMaxim })));

        let magmaUpdated = false;
        for (let i = magmas.length - 1; i >= 0; i--) {
            let m = magmas[i]; let mPrevY = m.y; m.y += m.vy; let owner = players[m.ownerId] || null;

            let eBase = bases[m.team === 1 ? 2 : 1];
            if (eBase && eBase.hp > 0 && !m.hitIds.includes('base') && Math.abs(m.x - eBase.x) < m.radius + 120 && m.y > eBase.y - 120) {
                m.hitIds.push('base'); applyBaseDamage(m.team, m.damage);
            }

            for (let pid in players) {
                let t = players[pid]; if (t.isDead || t.team === m.team || m.hitIds.includes(pid)) continue;
                if (sweptFallHit(m.x, mPrevY, m.y, t.x, t.y, m.radius + 45)) {
                    m.hitIds.push(pid); let actual = m.damage * (1 - (t.defense || 0));
                    t.hp -= actual; emitDamageText(t.x, t.y, actual); addBurn(pid, t, m.fire.dps, m.fire.dur, m.ownerId);
                    if (t.hp <= 0) checkPlayerDeath(t, m.ownerId); else io.to(pid).emit('takeDamage', actual);
                }
            }
            if (monster.hp > 0 && !m.hitIds.includes('monster') && sweptFallHit(m.x, mPrevY, m.y, monster.x, monster.y, m.radius + monster.radius)) {
                m.hitIds.push('monster'); monster.hp -= m.damage; emitDamageText(monster.x, monster.y, m.damage);
                addBurn('monster', monster, m.fire.dps, m.fire.dur, m.ownerId);
                if (owner) { monster.targetId = m.ownerId; monster.state = 'chase'; }
                if (monster.hp <= 0) killMonster(m.ownerId);
            }
            if (hinbeom.hp > 0 && !m.hitIds.includes('hinbeom') && sweptFallHit(m.x, mPrevY, m.y, hinbeom.x, hinbeom.y, m.radius + hinbeom.radius)) {
                m.hitIds.push('hinbeom'); 
                let isInvincible = minions.length > 0;
                if (!isInvincible) {
                    hinbeom.hp -= m.damage; emitDamageText(hinbeom.x, hinbeom.y, m.damage);
                    if (typeof recordHinbeomDamage === 'function') recordHinbeomDamage(m.ownerId, m.damage);
                    addBurn('hinbeom', hinbeom, m.fire.dps, m.fire.dur, m.ownerId);
                    if (owner) aggroHinbeom(m.ownerId);
                    if (hinbeom.hp <= 0) killHinbeom(m.ownerId);
                }
            }
            if (bb.hp > 0 && bb.state !== 'dead' && !m.hitIds.includes('blackbeard') && sweptFallHit(m.x, mPrevY, m.y, bb.x, bb.y, m.radius + bb.radius)) {
                m.hitIds.push('blackbeard'); bb.hp -= m.damage; emitDamageText(bb.x, bb.y, m.damage);
                addBurn('blackbeard', bb, m.fire.dps, m.fire.dur, m.ownerId);
                if (owner) aggroBlackbeard(m.ownerId);
                checkBurgessSummon();
                if (bb.hp <= 0) killBlackbeard(m.ownerId);
            }
            // 🟪 바제스 마그마 판정
            if (burgessAlive() && !m.hitIds.includes('burgess') && sweptFallHit(m.x, mPrevY, m.y, bg.x, bg.y, m.radius + bg.radius)) {
                m.hitIds.push('burgess'); bg.hp -= m.damage; emitDamageText(bg.x, bg.y, m.damage);
                addBurn('burgess', bg, m.fire.dps, m.fire.dur, m.ownerId);
                if (owner) aggroBurgess(m.ownerId);
                if (bg.hp <= 0) killBurgess(m.ownerId);
            }
            for (let mi = minions.length - 1; mi >= 0; mi--) {
                let mn = minions[mi];
                if (mn.hp > 0 && !m.hitIds.includes('minion_' + mn.id) && sweptFallHit(m.x, mPrevY, m.y, mn.x, mn.y, m.radius + mn.radius)) {
                    m.hitIds.push('minion_' + mn.id); mn.hp -= m.damage; emitDamageText(mn.x, mn.y, m.damage);
                    addBurn('minion_' + mn.id, mn, m.fire.dps, m.fire.dur, m.ownerId);
                    if (owner) { mn.targetId = m.ownerId; mn.state = 'chase'; }
                    if (mn.hp <= 0) killMinion(mn, m.ownerId);
                }
            }
            okras.forEach(ok => {
                if (ok.hp > 0 && !m.hitIds.includes('okra_'+ok.id) && sweptFallHit(m.x, mPrevY, m.y, ok.x, ok.y, m.radius + ok.radius)) {
                    m.hitIds.push('okra_'+ok.id); ok.hp -= m.damage; emitDamageText(ok.x, ok.y, m.damage);
                    addBurn('okra_'+ok.id, ok, m.fire.dps, m.fire.dur, m.ownerId);
                    if (owner) { ok.targetId = m.ownerId; ok.state = 'chase'; }
                    if (ok.hp <= 0) killOkra(ok, m.ownerId);
                }
            });

            if (m.y >= GROUND_Y_SERVER) { magmas.splice(i, 1); io.emit('magmaImpact', { x: m.x, y: GROUND_Y_SERVER }); }
            magmaUpdated = true;
        }
        if (magmaUpdated || magmas.length > 0) io.emit('syncMagmas', magmas.map(m => ({ id: m.id, x: m.x, y: m.y, radius: m.radius, team: m.team })));

        for (let pid in players) {
            let p = players[pid]; let regenAmt = (p.hasJadam ? 5 : 0) + (p.hpRegen || 0);
            if (!p.isDead && p.hp < p.maxHp && regenAmt > 0 && now - (p.lastRegenTick || 0) >= 1000) { 
                p.hp = Math.min(p.maxHp, p.hp + regenAmt); p.lastRegenTick = now; io.to(pid).emit('heal', regenAmt); 
            }
        }

        if (Math.abs(monster.knockbackForce) > 0) { monster.x += monster.knockbackForce; monster.knockbackForce *= 0.85; if (Math.abs(monster.knockbackForce) < 1) monster.knockbackForce = 0; }
        
        if (monster.hp > 0 && now >= monster.frozenUntil) {
            let mSpeed = monster.speed;
            if (monster.state === 'chase' && monster.targetId && players[monster.targetId] && !players[monster.targetId].isDead) {
                let target = players[monster.targetId];
                if (!(target.x >= 14900 && target.x <= 17100 && target.y <= 950)) { monster.targetId = null; monster.state = 'return'; } 
                else {
                    if (monster.x < target.x - 40) monster.x += mSpeed; else if (monster.x > target.x + 40) monster.x -= mSpeed;
                    if (Math.abs(monster.x - target.x) < 300 && now - monster.lastAttack > 1000) { 
                        monster.lastAttack = now; let dir = target.x > monster.x ? 1 : -1; 
                        shockwaves.push({ id: getNextProjId(), ownerId: 'monster', x: monster.x + (dir * 50), y: monster.y + 45, dir: dir, speed: 9, life: 80, hitIds: [], damage: 30, kb: dir * 25, type: 'boss' }); 
                    }
                }
            } else if (monster.state === 'return' || (monster.state === 'chase' && (!players[monster.targetId] || players[monster.targetId].isDead))) {
                if (Math.abs(monster.x - monster.homeX) < 10) { monster.x = monster.homeX; monster.state = 'idle'; if (monster.hp < monster.maxHp) monster.hp += 5; }
                else { monster.x += (monster.homeX > monster.x ? mSpeed : -mSpeed); }
            }
        }
        
        let mDelta = compressors.monsterDelta.getDelta('monster', monster);
        if (mDelta) io.emit('monsterUpdate', mDelta);

        // ====================================================================
        // 🥊 박힌범 AI
        // ====================================================================
        let anyPlayerInBasket = false;
        for (let pid in players) {
            let p = players[pid];
            if (!p.isDead && isInHinbeomArea(p)) { anyPlayerInBasket = true; break; }
        }

        if (hinbeom.hp > 0 && hinbeom.state !== 'dead') {
            if (now - (hinbeom.lastRegenTick || 0) >= 1000) {
                hinbeom.lastRegenTick = now;
                if (hinbeom.hp < hinbeom.maxHp) hinbeom.hp = Math.min(hinbeom.maxHp, hinbeom.hp + HINBEOM_REGEN);
            }

            if (Math.abs(hinbeom.knockbackForce) > 0) {
                hinbeom.x += hinbeom.knockbackForce;
                hinbeom.knockbackForce *= 0.85;
                if (Math.abs(hinbeom.knockbackForce) < 1) hinbeom.knockbackForce = 0;
            }

            if (now >= hinbeom.frozenUntil) {
                let hSpeed = hinbeom.speed;

                if (hinbeom.state === 'chase') {
                    let t = players[hinbeom.targetId];
                    if (!t || t.isDead || !isInHinbeomArea(t)) { hinbeom.targetId = null; hinbeom.state = 'return'; }
                }

                if (hinbeom.state !== 'chase') {
                    let found = null, closest = Infinity;
                    for (let pid in players) {
                        let p = players[pid];
                        if (p.isDead || !isInHinbeomArea(p)) continue;
                        let d = Math.abs(p.x - hinbeom.x);
                        if (d < closest) { closest = d; found = pid; }
                    }
                    if (found) { hinbeom.targetId = found; hinbeom.state = 'chase'; }
                }

                if (hinbeom.state === 'chase' && players[hinbeom.targetId]) {
                    let t = players[hinbeom.targetId];
                    if (hinbeom.x < t.x - 60) hinbeom.x += hSpeed;
                    else if (hinbeom.x > t.x + 60) hinbeom.x -= hSpeed;
                } else if (hinbeom.state === 'return') {
                    if (Math.abs(hinbeom.x - hinbeom.homeX) < 10) {
                        hinbeom.x = hinbeom.homeX; hinbeom.state = 'idle';
                    } else {
                        hinbeom.x += (hinbeom.homeX > hinbeom.x ? hSpeed : -hSpeed);
                    }
                }
            }

            let hMinX = HINBEOM_AREA.minX + hinbeom.radius;
            let hMaxX = HINBEOM_AREA.maxX - hinbeom.radius;
            if (hinbeom.x < hMinX) { hinbeom.x = hMinX; hinbeom.knockbackForce = 0; }
            if (hinbeom.x > hMaxX) { hinbeom.x = hMaxX; hinbeom.knockbackForce = 0; }
            hinbeom.y = hinbeom.homeY;

            if (hinbeom.state === 'chase') {
                if (now >= hinbeom.hakiNextRoll) {
                    hinbeom.hakiNextRoll = now + HAKI_ROLL_MS;
                    if (Math.random() < HAKI_CHANCE) {
                        hinbeom.hakiBursts.push({
                            endAt: now + HAKI_DURATION,
                            nextTick: now + HAKI_TICK_MS,
                            ticksLeft: HAKI_TICKS
                        });
                        io.emit('hakiBurst', {
                            x: hinbeom.x, y: hinbeom.y,
                            duration: HAKI_DURATION,
                            area: HINBEOM_AREA
                        });
                        for (let pid in players) {
                            let t = players[pid];
                            if (t.isDead || !isInHinbeomArea(t)) continue;
                            t.frozenUntil = Math.max(t.frozenUntil || 0, now + HAKI_DURATION);
                            t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, now + HAKI_DURATION);
                            emitStatus(io, t);
                        }

                        hinbeom.hakiCount = (hinbeom.hakiCount || 0) + 1;
                        if (hinbeom.hakiCount % MINION_EVERY === 0) spawnHinbeomMinions();
                    }
                }
            } else {
                hinbeom.hakiNextRoll = now + HAKI_ROLL_MS;
            }

            let latestEnd = 0;
            for (let hi = hinbeom.hakiBursts.length - 1; hi >= 0; hi--) {
                let burst = hinbeom.hakiBursts[hi];
                if (burst.endAt > latestEnd) latestEnd = burst.endAt;

                while (now >= burst.nextTick && burst.ticksLeft > 0) {
                    burst.nextTick += HAKI_TICK_MS;
                    burst.ticksLeft--;
                    for (let pid in players) {
                        let t = players[pid];
                        if (t.isDead || !isInHinbeomArea(t)) continue;
                        let actual = HAKI_TICK_DMG;
                        t.hp -= actual;
                        emitDamageText(t.x, t.y, actual);
                        t.frozenUntil = Math.max(t.frozenUntil || 0, burst.endAt);
                        t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, burst.endAt);
                        emitStatus(io, t);
                        if (t.hp <= 0) checkPlayerDeath(t, null); else io.to(pid).emit('takeDamage', actual);
                    }
                }
                if (now >= burst.endAt && burst.ticksLeft <= 0) hinbeom.hakiBursts.splice(hi, 1);
            }
            hinbeom.hakiActiveUntil = latestEnd;
        }

        let hDelta = compressors.hinbeomDelta.getDelta('hinbeom', hinbeom);
        if (hDelta) io.emit('hinbeomUpdate', hDelta);

        // ====================================================================
        // 🌀 포탈 대기 처리 공용 함수
        // ====================================================================
        const DWELL_MS = PORTAL_DWELL_MS || 3000;
        const COOLDOWN = PORTAL_COOLDOWN || 300;

        function clearDwell(p, pid, dwellKey, startKey, eventName) {
            if (p[dwellKey]) {
                p[dwellKey] = 0; p[startKey] = 0;
                io.emit(eventName, { id: pid, until: 0 });
            }
        }

        function processPortal(pt, dwellKey, startKey, useKey, eventName, onComplete, banCheck) {
            for (let pid in players) {
                let p = players[pid];
                if (!p) continue;

                if (p.isDead) { clearDwell(p, pid, dwellKey, startKey, eventName); continue; }
                // ✅ [추가] 암흑 왕좌 입장 금지 상태면 대기 자체가 시작되지 않는다
                if (banCheck && p.darkBanned) { clearDwell(p, pid, dwellKey, startKey, eventName); continue; }

                let inPortal = Math.hypot(p.x - pt.x, p.y - pt.y) <= (pt.radius + 60);

                if (!inPortal) { clearDwell(p, pid, dwellKey, startKey, eventName); continue; }

                if (!p[dwellKey]) {
                    if (now - (p[useKey] || 0) < COOLDOWN) continue;
                    p[startKey] = now;
                    p[dwellKey] = now + DWELL_MS;
                    io.emit(eventName, { id: pid, until: p[dwellKey] });
                    continue;
                }

                if (now >= p[dwellKey]) {
                    p[dwellKey] = 0; p[startKey] = 0;
                    p[useKey] = now;
                    io.emit(eventName, { id: pid, until: 0 });
                    onComplete(p, pid);
                }
            }
        }

        function goHome(p, pid) {
            let myBase = bases[p.team];
            p.x = myBase ? myBase.x : (p.team === 1 ? 12250 : 19750);
            p.y = 1955;
            p.vy = 0;
            p.knockbackForce = 0;
            io.to(pid).emit('teleport', { x: p.x, y: p.y });
            io.emit('syncPlayerFull', p);
        }

        function goDark(p, pid) {
            p.x = DARK_ENTRY_X + (Math.random() * 400 - 200);
            p.y = DARK_ENTRY_Y;
            p.vy = 0;
            p.knockbackForce = 0;
            io.to(pid).emit('teleport', { x: p.x, y: p.y });
            io.emit('syncPlayerFull', p);
        }

        if (State.hinbeomPortal) {
            let pt = State.hinbeomPortal;
            if (now >= pt.expireAt) {
                State.hinbeomPortal = null;
                io.emit('syncHinbeomPortal', null);
                for (let pid in players) clearDwell(players[pid], pid, 'portalDwellUntil', 'portalDwellStart', 'portalDwell');
            } else {
                processPortal(pt, 'portalDwellUntil', 'portalDwellStart', 'lastPortalUse', 'portalDwell', goHome, false);
            }
        }

        if (State.blackbeardPortal) {
            let pt = State.blackbeardPortal;
            if (now >= pt.expireAt) {
                State.blackbeardPortal = null;
                io.emit('syncBlackbeardPortal', null);
                for (let pid in players) clearDwell(players[pid], pid, 'portalDwellUntil', 'portalDwellStart', 'portalDwell');
            } else {
                processPortal(pt, 'portalDwellUntil', 'portalDwellStart', 'lastPortalUse', 'portalDwell', goHome, false);
            }
        }

        if (State.darkPortal) {
            let dp = State.darkPortal;
            if (now >= dp.expireAt) {
                State.darkPortal = null;
                io.emit('syncDarkPortal', null);
                for (let pid in players) clearDwell(players[pid], pid, 'darkDwellUntil', 'darkDwellStart', 'darkDwell');
            } else {
                // ✅ banCheck = true : 암흑 왕좌에서 죽은 플레이어는 탑승 불가
                processPortal(dp, 'darkDwellUntil', 'darkDwellStart', 'lastDarkPortalUse', 'darkDwell', goDark, true);
            }
        }

        // ====================================================================
        // ⚫ 검은수염 AI
        // ====================================================================
        let anyPlayerInDark = false;
        for (let pid in players) {
            let p = players[pid];
            if (!p.isDead && isInDarkArea(p)) { anyPlayerInDark = true; break; }
        }

        if (bb.hp > 0 && bb.state !== 'dead') {
            // ✅ [수정] 초당 체력 회복 제거

            if (Math.abs(bb.knockbackForce) > 0) {
                if (bb.descentActive || now < (bb.risingUntil || 0)) { bb.knockbackForce = 0; }
                else {
                    bb.x += bb.knockbackForce;
                    bb.knockbackForce *= 0.85;
                    if (Math.abs(bb.knockbackForce) < 1) bb.knockbackForce = 0;
                }
            }

            let bbBusy = (now < (bb.castingUntil || 0));

            if (!bbBusy && now >= bb.frozenUntil) {
                let sp = bb.speed;

                if (bb.state === 'chase') {
                    let t = players[bb.targetId];
                    if (!t || t.isDead || !isInDarkArea(t)) { bb.targetId = null; bb.state = 'return'; }
                }

                if (bb.state !== 'chase') {
                    let found = null, closest = Infinity;
                    for (let pid in players) {
                        let p = players[pid];
                        if (p.isDead || !isInDarkArea(p)) continue;
                        let d = Math.abs(p.x - bb.x);
                        if (d < closest) { closest = d; found = pid; }
                    }
                    if (found) { bb.targetId = found; bb.state = 'chase'; }
                }

                if (bb.state === 'chase' && players[bb.targetId]) {
                    let t = players[bb.targetId];
                    if (bb.x < t.x - 60) bb.x += sp;
                    else if (bb.x > t.x + 60) bb.x -= sp;
                } else if (bb.state === 'return') {
                    if (Math.abs(bb.x - bb.homeX) < 10) { bb.x = bb.homeX; bb.state = 'idle'; }
                    else { bb.x += (bb.homeX > bb.x ? sp : -sp); }
                }
            }

            let bMinX = DARK_AREA.minX + bb.radius;
            let bMaxX = DARK_AREA.maxX - bb.radius;
            if (bb.x < bMinX) { bb.x = bMinX; bb.knockbackForce = 0; }
            if (bb.x > bMaxX) { bb.x = bMaxX; bb.knockbackForce = 0; }

            if (now < (bb.risingUntil || 0)) {
                const ASC = DESCENT_ASCEND_MS || 2000;
                let t = 1 - ((bb.risingUntil - now) / ASC);
                if (t < 0) t = 0; if (t > 1) t = 1;
                let ease = t * t * (3 - 2 * t);
                bb.y = bb.riseFromY + (bb.riseToY - bb.riseFromY) * ease;
            }
            else if (bb.descentActive && now < (bb.descentUntil || 0)) {
                bb.y = bb.riseToY;
            }
            else {
                bb.y = DARK_GROUND - bb.radius;
            }

            if (bb.risingUntil && now >= bb.risingUntil && !bb.descentActive) {
                bb.risingUntil = 0;
                bb.descentActive = true;
                bb.descentUntil = now + DESCENT_DURATION;
                bb.descentNextTick = now;
                bb.y = bb.riseToY;

                io.emit('descentStart', {
                    x: bb.x, y: bb.y,
                    duration: DESCENT_DURATION,
                    area: DARK_AREA
                });
            }

            if (bb.descentActive) {
                while (now >= bb.descentNextTick && now < bb.descentUntil) {
                    bb.descentNextTick += DESCENT_TICK_MS;
                    for (let pid in players) {
                        let t = players[pid];
                        if (t.isDead || !isInDarkArea(t)) continue;
                        let actual = DESCENT_TICK_DMG;
                        t.hp -= actual;
                        emitDamageText(t.x, t.y, actual);
                        t.frozenUntil = Math.max(t.frozenUntil || 0, bb.descentUntil);
                        t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, bb.descentUntil);
                        emitStatus(io, t);
                        if (t.hp <= 0) checkPlayerDeath(t, null); else io.to(pid).emit('takeDamage', actual);
                    }
                }
                if (now >= bb.descentUntil) {
                    bb.descentActive = false;
                    bb.descentUntil = 0;
                    bb.y = DARK_GROUND - bb.radius;
                    io.emit('descentEnd');
                }
            }

            if (bb.darkFloorUntil && now < bb.darkFloorUntil) {
                while (now >= bb.darkFloorNextTick && now < bb.darkFloorUntil) {
                    bb.darkFloorNextTick += DARKFLOOR_TICK_MS;
                    for (let pid in players) {
                        let t = players[pid];
                        if (t.isDead || !isInDarkArea(t)) continue;
                        let actual = DARKFLOOR_TICK_DMG * (1 - (t.defense || 0));
                        t.hp -= actual;
                        emitDamageText(t.x, t.y, actual);
                        if (t.hp <= 0) checkPlayerDeath(t, null); else io.to(pid).emit('takeDamage', actual);
                    }
                }
            } else if (bb.darkFloorUntil && now >= bb.darkFloorUntil) {
                bb.darkFloorUntil = 0;
                io.emit('darkFloorEnd');
            }

            if (bb.telegraphUntil && now >= bb.telegraphUntil) {
                bb.telegraphUntil = 0;

                let tgt = null, tgtId = null;
                let pending = bb.crowsPendingTarget ? players[bb.crowsPendingTarget] : null;
                if (pending && !pending.isDead && isInDarkArea(pending) && isInCrowsBeam(bb, pending)) {
                    tgt = pending; tgtId = bb.crowsPendingTarget;
                } else {
                    let closest = Infinity;
                    for (let pid in players) {
                        let p = players[pid];
                        if (p.isDead || !isInDarkArea(p)) continue;
                        if (!isInCrowsBeam(bb, p)) continue;
                        let d = Math.hypot(p.x - bb.x, p.y - bb.y);
                        if (d < closest) { closest = d; tgt = p; tgtId = pid; }
                    }
                }

                if (tgt) {
                    let destDir = (tgt.x >= bb.x) ? 1 : -1;
                    let destX = bb.x + destDir * (bb.radius + 60);
                    let destY = bb.y;

                    tgt.crowsPullUntil = now + CROWS_PULL_MS;
                    tgt.crowsTargetX = destX;
                    tgt.crowsTargetY = destY;
                    tgt.isCasting = false;
                    tgt.skill1Dashing = false;
                    tgt.yataActive = false; tgt.yataPath = null;
                    tgt.skill3Active = false;
                    tgt.elThorActive = false; tgt.mantleActive = false; tgt.raigoActive = false; tgt.raigoDropped = false;

                    bb.crowsActiveTarget = tgtId;
                    bb.crowsHitAt = now + CROWS_PULL_MS;

                    io.emit('crowsStart', {
                        id: tgtId,
                        x: bb.x, y: bb.y,
                        x2: tgt.x, y2: tgt.y,
                        destX: destX, destY: destY,
                        duration: CROWS_PULL_MS
                    });
                    io.emit('syncPlayerFull', tgt);
                } else {
                    bb.crowsPendingTarget = null;
                    bb.crowsActiveTarget = null;
                    bb.crowsHitAt = 0;
                    bb.castingUntil = 0;
                }
            }

            if (bb.crowsHitAt && now >= bb.crowsHitAt) {
                let guraR = bb.radius * GURA_RADIUS_MULT;
                let tgt = bb.crowsActiveTarget ? players[bb.crowsActiveTarget] : null;
                let gx = tgt ? tgt.x : bb.x;
                let gy = tgt ? tgt.y : bb.y;

                io.emit('guraImpact', { x: gx, y: gy, radius: guraR });

                for (let pid in players) {
                    let t = players[pid];
                    if (t.isDead || !isInDarkArea(t)) continue;
                    if (Math.hypot(t.x - gx, t.y - gy) > guraR) continue;
                    let actual = GURA_DAMAGE * (1 - (t.defense || 0));
                    t.hp -= actual;
                    emitDamageText(t.x, t.y, actual);
                    if (t.hp <= 0) checkPlayerDeath(t, null);
                    else io.to(pid).emit('bossHit', { damage: actual, dir: (t.x >= gx ? 1 : -1), kb: (t.x >= gx ? 60 : -60) });
                }

                if (tgt) { tgt.crowsPullUntil = 0; io.emit('crowsEnd', { id: bb.crowsActiveTarget }); io.emit('syncPlayerFull', tgt); }
                bb.crowsActiveTarget = null;
                bb.crowsPendingTarget = null;
                bb.crowsHitAt = 0;
            }

            let busyNow = (now < (bb.castingUntil || 0));
            if (!busyNow && anyPlayerInDark && now >= bb.frozenUntil) {

                if (!bb.crowsNextCast) bb.crowsNextCast = now + CROWS_INTERVAL;
                if (now >= bb.crowsNextCast) {
                    let cands = [];
                    for (let pid in players) {
                        let p = players[pid];
                        if (p.isDead || !isInDarkArea(p)) continue;
                        if (Math.hypot(p.x - bb.x, p.y - bb.y) > CROWS_RANGE) continue;
                        cands.push(pid);
                    }
                    if (cands.length > 0) {
                        let pick = cands[Math.floor(Math.random() * cands.length)];
                        let tgt = players[pick];

                        let aimDX = tgt.x - bb.x, aimDY = tgt.y - bb.y;
                        let aimLen = Math.hypot(aimDX, aimDY);
                        if (aimLen === 0) { aimDX = 1; aimDY = 0; aimLen = 1; }
                        bb.crowsAimUX = aimDX / aimLen;
                        bb.crowsAimUY = aimDY / aimLen;
                        bb.crowsAimX = tgt.x; bb.crowsAimY = tgt.y;

                        bb.crowsNextCast = now + CROWS_INTERVAL;
                        bb.crowsPendingTarget = pick;
                        bb.telegraphUntil = now + CROWS_TELEGRAPH;
                        bb.castingUntil = now + CROWS_TELEGRAPH + CROWS_PULL_MS + 300;

                        io.emit('crowsTelegraph', {
                            x: bb.x, y: bb.y,
                            x2: bb.x + bb.crowsAimUX * CROWS_RANGE,
                            y2: bb.y + bb.crowsAimUY * CROWS_RANGE,
                            thickness: CROWS_THICKNESS,
                            duration: CROWS_TELEGRAPH
                        });
                        busyNow = true;
                    } else {
                        bb.crowsNextCast = now + 1000;
                    }
                }

                if (!busyNow) {
                    if (!bb.darkFloorNextRoll) bb.darkFloorNextRoll = now + DARKFLOOR_ROLL_MS;
                    if (now >= bb.darkFloorNextRoll) {
                        bb.darkFloorNextRoll = now + DARKFLOOR_ROLL_MS;
                        if (Math.random() < DARKFLOOR_CHANCE) {
                            bb.darkFloorUntil = now + DARKFLOOR_DURATION;
                            bb.darkFloorNextTick = now + DARKFLOOR_TICK_MS;
                            bb.castingUntil = now + DARKFLOOR_DURATION;
                            io.emit('darkFloorStart', {
                                x: bb.x, y: DARK_GROUND,
                                duration: DARKFLOOR_DURATION,
                                area: DARK_AREA
                            });
                            busyNow = true;
                        }
                    }
                }

                if (!busyNow) {
                    if (!bb.descentNextRoll) bb.descentNextRoll = now + DESCENT_ROLL_MS;
                    if (now >= bb.descentNextRoll) {
                        bb.descentNextRoll = now + DESCENT_ROLL_MS;
                        if (Math.random() < DESCENT_CHANCE) {
                            const ASC = DESCENT_ASCEND_MS || 2000;
                            bb.riseFromY = bb.y;
                            bb.riseToY = DARK_GROUND - bb.radius - DESCENT_RISE;
                            bb.risingUntil = now + ASC;
                            bb.descentActive = false;
                            bb.castingUntil = now + ASC + DESCENT_DURATION;

                            io.emit('darkRise', {
                                x: bb.x,
                                fromY: bb.riseFromY,
                                toY: bb.riseToY,
                                duration: ASC
                            });
                            busyNow = true;
                        }
                    }
                }
            }
        }

        let bbDelta = compressors.blackbeardDelta.getDelta('blackbeard', bb);
        if (bbDelta) io.emit('blackbeardUpdate', bbDelta);

        // ====================================================================
        // 🟪 지저스 바제스 AI
        // ====================================================================
        if (burgessAlive()) {
            const BG_GROUND_Y = DARK_GROUND - bg.radius;

            // 넉백 (낙하 / 점프 중에는 밀리지 않는다)
            if (Math.abs(bg.knockbackForce) > 0) {
                if (bg.state === 'falling' || now < (bg.jumpingUntil || 0)) { bg.knockbackForce = 0; }
                else {
                    bg.x += bg.knockbackForce;
                    bg.knockbackForce *= 0.85;
                    if (Math.abs(bg.knockbackForce) < 1) bg.knockbackForce = 0;
                }
            }

            // ── 🌪️ 등장 낙하 ────────────────────────────────────────────────
            if (bg.state === 'falling') {
                bg.y += BG_FALL_SPEED;
                if (bg.y >= BG_GROUND_Y || now >= bg.fallingUntil) {
                    bg.y = BG_GROUND_Y;
                    bg.state = 'idle';
                    bg.fallingUntil = 0;
                    bg.jumpNextCast = now + BG_JUMP_INTERVAL;
                    // 착지 풍압 (바제스 크기의 2배 범위 · 500 피해)
                    burgessShockwave(bg.x, bg.y, bg.radius * BG_LAND_MULT, BG_LAND_DAMAGE);
                }
            }
            // ── 🦘 도약 중 (포물선 이동) ────────────────────────────────────
            else if (now < (bg.jumpingUntil || 0)) {
                let total = BG_JUMP_TRAVEL || 320;
                let t = 1 - ((bg.jumpingUntil - now) / total);
                if (t < 0) t = 0; if (t > 1) t = 1;
                bg.x = bg.jumpStartX + (bg.jumpTargetX - bg.jumpStartX) * t;
                // 포물선 : 중간에서 가장 높다
                bg.y = BG_GROUND_Y - Math.sin(t * Math.PI) * BG_JUMP_ARC;
            }
            // ── 도약 종료 → 착지 풍압 ──────────────────────────────────────
            else if (bg.jumpingUntil && now >= bg.jumpingUntil) {
                bg.jumpingUntil = 0;
                bg.x = bg.jumpTargetX;
                bg.y = BG_GROUND_Y;
                bg.state = 'idle';
                // 점프 착지 풍압 (바제스 크기의 1.5배 범위 · 300 피해)
                burgessShockwave(bg.x, bg.y, bg.radius * BG_JUMP_MULT, BG_JUMP_DAMAGE);
                bg.jumpNextCast = now + BG_JUMP_INTERVAL;
            }
            // ── 🔴 점프 예고 중 (0.7초 경직) ───────────────────────────────
            else if (bg.jumpTelegraphUntil && now < bg.jumpTelegraphUntil) {
                bg.y = BG_GROUND_Y;
                // 예고 중에는 움직이지 않는다
            }
            // ── 예고 종료 → 실제 도약 시작 ────────────────────────────────
            else if (bg.jumpTelegraphUntil && now >= bg.jumpTelegraphUntil) {
                bg.jumpTelegraphUntil = 0;
                bg.jumpStartX = bg.x;
                bg.jumpStartY = bg.y;
                bg.jumpingUntil = now + BG_JUMP_TRAVEL;
                bg.state = 'jumping';
                io.emit('burgessJump', {
                    fromX: bg.jumpStartX, toX: bg.jumpTargetX,
                    y: BG_GROUND_Y, duration: BG_JUMP_TRAVEL, radius: bg.radius
                });
            }
            // ── 평소 : 지면에 붙어 대기 / 3초마다 점프 준비 ────────────────
            else {
                bg.y = BG_GROUND_Y;
                bg.state = 'idle';

                if (now >= bg.frozenUntil) {
                    if (!bg.jumpNextCast) bg.jumpNextCast = now + BG_JUMP_INTERVAL;
                    if (now >= bg.jumpNextCast) {
                        // 가장 가까운 플레이어를 찾는다
                        let found = null, closest = Infinity;
                        for (let pid in players) {
                            let p = players[pid];
                            if (p.isDead || !isInDarkArea(p)) continue;
                            let d = Math.abs(p.x - bg.x);
                            if (d < closest) { closest = d; found = p; bg.targetId = pid; }
                        }
                        if (found) {
                            let tx = found.x;
                            // 암흑 왕좌 밖으로는 착지하지 않는다
                            tx = Math.max(DARK_AREA.minX + bg.radius, Math.min(DARK_AREA.maxX - bg.radius, tx));
                            bg.jumpTargetX = tx;
                            bg.jumpTelegraphUntil = now + BG_JUMP_TELEGRAPH;
                            bg.state = 'telegraph';
                            bg.jumpNextCast = now + BG_JUMP_INTERVAL + BG_JUMP_TELEGRAPH + BG_JUMP_TRAVEL;

                            // 🔴 착지 예정 지점을 빨간색으로 미리 표시
                            io.emit('burgessTelegraph', {
                                x: tx, y: DARK_GROUND,
                                radius: bg.radius * BG_JUMP_MULT,
                                duration: BG_JUMP_TELEGRAPH
                            });
                        } else {
                            bg.jumpNextCast = now + 1000;
                        }
                    }
                }
            }

            // 암흑 왕좌 밖으로는 나갈 수 없다
            let gMinX = DARK_AREA.minX + bg.radius;
            let gMaxX = DARK_AREA.maxX - bg.radius;
            if (bg.x < gMinX) { bg.x = gMinX; bg.knockbackForce = 0; }
            if (bg.x > gMaxX) { bg.x = gMaxX; bg.knockbackForce = 0; }
        }

        let bgDelta = compressors.burgessDelta.getDelta('burgess', bg);
        if (bgDelta) io.emit('burgessUpdate', bgDelta);

        // ====================================================================
        // 🐗 소환된 할배새끼 AI
        // ====================================================================
        if (!anyPlayerInBasket) {
            despawnHinbeomMinions();
        } else {
            for (let mi = minions.length - 1; mi >= 0; mi--) {
                let mn = minions[mi];
                if (mn.hp <= 0) continue;

                if (Math.abs(mn.knockbackForce) > 0) {
                    mn.x += mn.knockbackForce;
                    mn.knockbackForce *= 0.85;
                    if (Math.abs(mn.knockbackForce) < 1) mn.knockbackForce = 0;
                }

                if (now >= mn.frozenUntil) {
                    let t = players[mn.targetId];
                    if (!t || t.isDead || !isInHinbeomArea(t)) { mn.targetId = null; }

                    if (!mn.targetId) {
                        let found = null, closest = Infinity;
                        for (let pid in players) {
                            let p = players[pid];
                            if (p.isDead || !isInHinbeomArea(p)) continue;
                            let d = Math.abs(p.x - mn.x);
                            if (d < closest) { closest = d; found = pid; }
                        }
                        mn.targetId = found;
                    }

                    let tgt = players[mn.targetId];
                    if (tgt) {
                        mn.state = 'chase';
                        if (mn.x < tgt.x - 40) mn.x += mn.speed;
                        else if (mn.x > tgt.x + 40) mn.x -= mn.speed;
                        if (Math.abs(mn.x - tgt.x) < 300 && now - mn.lastAttack > 1000) {
                            mn.lastAttack = now;
                            let dir = tgt.x > mn.x ? 1 : -1;
                            shockwaves.push({ id: getNextProjId(), ownerId: 'monster', x: mn.x + (dir * 50), y: mn.y + 45, dir: dir, speed: 9, life: 80, hitIds: [], damage: 30, kb: dir * 25, type: 'boss' });
                        }
                    } else {
                        mn.state = 'idle';
                    }
                }

                let nMinX = HINBEOM_AREA.minX + mn.radius;
                let nMaxX = HINBEOM_AREA.maxX - mn.radius;
                if (mn.x < nMinX) { mn.x = nMinX; mn.knockbackForce = 0; }
                if (mn.x > nMaxX) { mn.x = nMaxX; mn.knockbackForce = 0; }
                mn.y = HINBEOM_GROUND - mn.radius;
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

        okras.forEach(ok => {
            if (Math.abs(ok.knockbackForce) > 0) { ok.x += ok.knockbackForce; ok.knockbackForce *= 0.85; if (Math.abs(ok.knockbackForce) < 1) ok.knockbackForce = 0; }
            if (ok.hp <= 0 || now < ok.frozenUntil) return;
            let okSpeed = ok.speed;
            if (ok.state === 'idle') { 
                let closestDist = 200; let target = null; 
                // ✅ [수정] 암흑 왕좌 안의 플레이어는 오크라가 추적하지 않는다
                for(let id in players) { let p = players[id]; if(p.isDead || isInDarkZone(p)) continue; let d = Math.hypot(p.x - ok.x, p.y - ok.y); if(d <= closestDist) { closestDist = d; target = id; } } 
                if(target) { ok.targetId = target; ok.state = 'chase'; } 
            } else if (ok.state === 'chase') { 
                let p = players[ok.targetId]; 
                if (!p || p.isDead || isInDarkZone(p) || Math.hypot(p.x - ok.x, p.y - ok.y) > 1500) { ok.state = 'return'; ok.targetId = null; } 
                else { 
                    let d = Math.hypot(p.x - ok.x, p.y - ok.y); 
                    if (d <= 40 + ok.radius) { 
                        if (now - ok.lastAttack >= 1000) { 
                            ok.lastAttack = now; let actualDmg = ok.atk * (1 - (p.defense || 0)); p.hp -= actualDmg; emitDamageText(p.x, p.y, actualDmg); 
                            if (p.hp <= 0) checkPlayerDeath(p); else io.to(p.id).emit('takeDamage', actualDmg); 
                        } 
                    } else { ok.x += (p.x > ok.x ? okSpeed : -okSpeed); } 
                } 
            } else if (ok.state === 'return') { 
                if (Math.abs(ok.x - ok.homeX) < okSpeed) { ok.x = ok.homeX; ok.state = 'idle'; ok.hp = ok.maxHp; } 
                else { ok.x += (ok.homeX > ok.x ? okSpeed : -okSpeed); } 
            }
        });

        let okrasDelta = okras.map(ok => compressors.okraDelta.getDelta(ok.id, ok)).filter(d => d !== null);
        if (okrasDelta.length > 0) io.emit('syncOkras', okrasDelta); 

        let grid = null;
        if (shockwaves.length > 0) {
            grid = new SpatialGrid(300);
            for (let pid in players) { let pp = players[pid]; if (!pp.isDead) grid.insert({ x: pp.x, y: pp.y, entityType: 'player', refId: pid }); }
            if (monster.hp > 0) grid.insert({ x: monster.x, y: monster.y, entityType: 'monster', refId: 'monster' });
            if (hinbeom.hp > 0) grid.insert({ x: hinbeom.x, y: hinbeom.y, entityType: 'hinbeom', refId: 'hinbeom' });
            if (bb.hp > 0 && bb.state !== 'dead') grid.insert({ x: bb.x, y: bb.y, entityType: 'blackbeard', refId: 'blackbeard' });
            if (burgessAlive()) grid.insert({ x: bg.x, y: bg.y, entityType: 'burgess', refId: 'burgess' });
            minions.forEach(mn => { if (mn.hp > 0) grid.insert({ x: mn.x, y: mn.y, entityType: 'minion', refId: mn.id }); });
            okras.forEach(ok => { if (ok.hp > 0) grid.insert({ x: ok.x, y: ok.y, entityType: 'okra', refId: ok.id }); });
        }

        for (let i = shockwaves.length - 1; i >= 0; i--) {
            let sw = shockwaves[i]; 
            sw.x += sw.dir * sw.speed; sw.life--;
            
            let hitRadiusX = sw.type === 'detroit' ? 160 : (sw.type === 'pheasant_peck' ? 140 : 70); 
            let hitRadiusY = sw.type === 'detroit' ? 200 : (sw.type === 'pheasant_peck' ? 120 : 70); 
            let maxRadius = Math.max(hitRadiusX, hitRadiusY);
            let nearEntities = grid.getNearby(sw.x, sw.y, maxRadius);
            
            if ((sw.type === 'detroit' || sw.type === 'pheasant_peck') && sw.team) {
                let enemyBase = bases[sw.team === 1 ? 2 : 1];
                if (enemyBase && enemyBase.hp > 0 && !sw.hitIds.includes('base')) {
                    if (Math.abs(enemyBase.x - sw.x) < hitRadiusX + 150 && Math.abs(enemyBase.y - sw.y) < hitRadiusY + 150) {
                        sw.hitIds.push('base'); applyBaseDamage(sw.team, sw.damage);
                    }
                }
            }

            for (let entity of nearEntities) {
                if (entity.entityType === 'player') {
                    let p = players[entity.refId];
                    if (Math.abs(p.x - sw.x) < hitRadiusX && Math.abs(p.y - sw.y) < hitRadiusY) { 
                        let canHit = (sw.type === 'detroit' || sw.type === 'pheasant_peck') ? (players[sw.ownerId] && players[sw.ownerId].team !== p.team) : true; 
                        if (canHit && !sw.hitIds.includes(entity.refId)) { 
                            sw.hitIds.push(entity.refId); 
                            let actualDmg = (sw.damage || 30) * (1 - (p.defense || 0)); 
                            p.hp -= actualDmg; emitDamageText(p.x, p.y, actualDmg);
                            if (sw.freeze) { p.frozenUntil = Math.max(p.frozenUntil || 0, Date.now() + sw.freeze); emitStatus(io, p); }
                            if(p.hp <= 0) checkPlayerDeath(p, sw.ownerId); else io.to(entity.refId).emit('bossHit', { damage: actualDmg, dir: sw.dir, kb: sw.kb }); 
                        }
                    }
                } else if ((sw.type === 'detroit' || sw.type === 'pheasant_peck') && entity.entityType === 'monster') {
                    if (Math.abs(monster.x - sw.x) < hitRadiusX && Math.abs(monster.y - sw.y) < hitRadiusY) {
                        if (!sw.hitIds.includes('monster')) {
                            sw.hitIds.push('monster'); monster.hp -= sw.damage; monster.targetId = sw.ownerId; monster.state = 'chase'; monster.knockbackForce += sw.kb * 0.3; 
                            if (sw.freeze) monster.frozenUntil = Math.max(monster.frozenUntil || 0, Date.now() + sw.freeze);
                            emitDamageText(monster.x, monster.y, sw.damage);
                            if (monster.hp <= 0) killMonster(sw.ownerId);
                        }
                    }
                } else if ((sw.type === 'detroit' || sw.type === 'pheasant_peck') && entity.entityType === 'hinbeom') {
                    if (Math.abs(hinbeom.x - sw.x) < hitRadiusX && Math.abs(hinbeom.y - sw.y) < hitRadiusY) {
                        if (!sw.hitIds.includes('hinbeom')) {
                            sw.hitIds.push('hinbeom'); 
                            let isInvincible = minions.length > 0;
                            if (!isInvincible) {
                                hinbeom.hp -= sw.damage; hinbeom.knockbackForce += sw.kb * 0.2;
                                if (typeof recordHinbeomDamage === 'function') recordHinbeomDamage(sw.ownerId, sw.damage);
                                if (sw.freeze) hinbeom.frozenUntil = Math.max(hinbeom.frozenUntil || 0, Date.now() + sw.freeze);
                                emitDamageText(hinbeom.x, hinbeom.y, sw.damage);
                                aggroHinbeom(sw.ownerId);
                                if (hinbeom.hp <= 0) killHinbeom(sw.ownerId);
                            }
                        }
                    }
                } else if ((sw.type === 'detroit' || sw.type === 'pheasant_peck') && entity.entityType === 'blackbeard') {
                    if (Math.abs(bb.x - sw.x) < hitRadiusX && Math.abs(bb.y - sw.y) < hitRadiusY) {
                        if (!sw.hitIds.includes('blackbeard')) {
                            sw.hitIds.push('blackbeard');
                            bb.hp -= sw.damage; bb.knockbackForce += sw.kb * 0.2;
                            if (sw.freeze) bb.frozenUntil = Math.max(bb.frozenUntil || 0, Date.now() + sw.freeze);
                            emitDamageText(bb.x, bb.y, sw.damage);
                            aggroBlackbeard(sw.ownerId);
                            checkBurgessSummon();
                            if (bb.hp <= 0) killBlackbeard(sw.ownerId);
                        }
                    }
                } else if ((sw.type === 'detroit' || sw.type === 'pheasant_peck') && entity.entityType === 'burgess') {
                    // 🟪 바제스 충격파 판정
                    if (Math.abs(bg.x - sw.x) < hitRadiusX && Math.abs(bg.y - sw.y) < hitRadiusY) {
                        if (!sw.hitIds.includes('burgess')) {
                            sw.hitIds.push('burgess');
                            bg.hp -= sw.damage; bg.knockbackForce += sw.kb * 0.25;
                            if (sw.freeze) bg.frozenUntil = Math.max(bg.frozenUntil || 0, Date.now() + sw.freeze);
                            emitDamageText(bg.x, bg.y, sw.damage);
                            aggroBurgess(sw.ownerId);
                            if (bg.hp <= 0) killBurgess(sw.ownerId);
                        }
                    }
                } else if ((sw.type === 'detroit' || sw.type === 'pheasant_peck') && entity.entityType === 'minion') {
                    let mn = getMinion(entity.refId);
                    if (mn && Math.abs(mn.x - sw.x) < hitRadiusX && Math.abs(mn.y - sw.y) < hitRadiusY) {
                        if (!sw.hitIds.includes('minion_' + mn.id)) {
                            sw.hitIds.push('minion_' + mn.id); mn.hp -= sw.damage; mn.targetId = sw.ownerId; mn.state = 'chase'; mn.knockbackForce += sw.kb * 0.3;
                            if (sw.freeze) mn.frozenUntil = Math.max(mn.frozenUntil || 0, Date.now() + sw.freeze);
                            emitDamageText(mn.x, mn.y, sw.damage);
                            if (mn.hp <= 0) killMinion(mn, sw.ownerId);
                        }
                    }
                } else if ((sw.type === 'detroit' || sw.type === 'pheasant_peck') && entity.entityType === 'okra') {
                    let ok = okras.find(o => o.id === entity.refId);
                    if (ok && Math.abs(ok.x - sw.x) < hitRadiusX && Math.abs(ok.y - sw.y) < hitRadiusY) {
                        if (!sw.hitIds.includes('okra_'+ok.id)) {
                            sw.hitIds.push('okra_'+ok.id); ok.hp -= sw.damage; ok.targetId = sw.ownerId; ok.state = 'chase'; ok.knockbackForce += sw.kb; 
                            if (sw.freeze) ok.frozenUntil = Math.max(ok.frozenUntil || 0, Date.now() + sw.freeze); 
                            emitDamageText(ok.x, ok.y, sw.damage);
                            if (ok.hp <= 0) killOkra(ok, sw.ownerId);
                        }
                    }
                }
            }
            if (sw.life <= 0) shockwaves.splice(i, 1);
        }
        if (shockwaves.length > 0 || _swWasActive) {
            _swWasActive = shockwaves.length > 0;
            io.emit('syncShockwaves', shockwaves.map(s => ({id: s.id, x: s.x, y: s.y, dir: s.dir, type: s.type, hasHie: s.hasHie})));
        }
    }
};