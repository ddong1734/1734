// 파일명: gameLoop.js

const GROUND_Y_SERVER = 2000;

// 🚀 [최적화②] 매 프레임 무조건 나가던 브로드캐스트를 억제하기 위한 상태 추적값
let _lastBaseSync = 0;
let _lastBaseHp1 = -1;
let _lastBaseHp2 = -1;
let _lastDetectorSync = 0;
let _swWasActive = false;

// 🚀 [최적화⑧] 상태이상 전용 경량 브로드캐스트
//    기존 io.emit('syncPlayerFull', t) 는 인벤토리/장착목록까지 포함한 플레이어 객체 전체를 보냈다.
//    만뢰 착지 판정에서는 '낙뢰 50개 × 인원수' 만큼 호출되어 수신측 메인 스레드를 막는 주범이었다.
//    상태이상만 갱신하면 되므로 필요한 필드만 담아 보낸다.
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

// 🎯 고속 낙하체(마그마 / 만뢰 낙뢰)가 프레임 사이를 건너뛰며 대상을 통과해 버리는 것을 막는 스윕(경로) 판정.
//    낙하 속도를 크게 올렸기 때문에 단일 지점 원형 판정으로는 대상을 그냥 지나칠 수 있다.
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
        // 🥊 박힌범 관련
        const hinbeom = State.hinbeom;
        const { killHinbeom, aggroHinbeom, isInHinbeomArea, HINBEOM_AREA, HAKI_CHANCE, HAKI_ROLL_MS, HAKI_DURATION, HAKI_TICK_MS, HAKI_TICK_DMG, HAKI_TICKS } = ctx;

        if (!gameStarted) return;
        let now = Date.now();

        // 🚀 [최적화②] 넥서스 체력은 실제로 변했을 때 즉시 전송하고, 그 외에는 1초 주기 유지 전송만 한다.
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
            
            // ✨ 방주 맥심 보유 시 낙뢰 개수 2배 + 10개 (총 50개) 적용
            let maxCount = p.hasArkMaxim ? ((ES2.boltCount || 20) * 2) + 10 : (ES2.boltCount || 20);
            // ✨ 스킬 지속시간 안에 추가된 낙뢰가 전부 떨어지도록 interval 동적 자동 계산
            let interval = p.hasArkMaxim ? Math.floor((ES2.duration || 3000) / maxCount) : (ES2.spawnInterval || 150);

            while (now >= p.mantleNextSpawn && p.mantleFired < maxCount) {
                // ✨ 방주 맥심 보유 시 폭(가로 낙하 범위) 3배 확장
                let actualWidth = p.hasArkMaxim ? ES2.width * 3 : ES2.width;
                let halfW = actualWidth / 2;
                let mx = p.mantleCenterX + (Math.random() * 2 - 1) * halfW;
                
                // ✨ 방주 맥심 보유 시 두께(radius) 및 길이 1.5배 증가
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
        // 🚀 [최적화②] now % 1000 < 20 조건은 한 번의 주기마다 여러 프레임 중복 전송을 유발했다 → 정확한 1초 타이머로 교체
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
            // 🥊 박힌범 투사체 판정
            if ((!hit || p.piercing) && hinbeom.hp > 0 && Math.hypot(p.x - hinbeom.x, p.y - hinbeom.y) < hinbeom.radius + eR) {
                if (!(p.piercing && p.hitIds && p.hitIds.includes('hinbeom'))) {
                    hinbeom.hp -= p.damage; emitDamageText(hinbeom.x, hinbeom.y, p.damage);
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

                    if (!p.piercing) hit = true; else { if(!p.hitIds) p.hitIds = []; p.hitIds.push('hinbeom'); }
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
            // 🎯 스윕 판정을 위해 이동 전 Y좌표를 보관 (고속 낙하 시 대상 통과 방지)
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
            // 🥊 박힌범 낙뢰 판정
            if (hinbeom.hp > 0 && !mb.hitIds.includes('hinbeom') && sweptFallHit(mb.x, mbPrevY, mb.y, hinbeom.x, hinbeom.y, mb.radius + hinbeom.radius)) {
                mb.hitIds.push('hinbeom'); hinbeom.hp -= mb.damage; emitDamageText(hinbeom.x, hinbeom.y, mb.damage);
                hinbeom.electrocutedUntil = Math.max(hinbeom.electrocutedUntil || 0, now + 100);
                hinbeom.frozenUntil = Math.max(hinbeom.frozenUntil || 0, now + 100);
                hinbeom.airFreezeUntil = Math.max(hinbeom.airFreezeUntil || 0, now + 100);
                if (mbOwner) aggroHinbeom(mb.ownerId);
                if (hinbeom.hp <= 0) killHinbeom(mb.ownerId);
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
                        // 🚀 [최적화⑧] 낙뢰 50개 × 인원수만큼 나가던 대형 패킷을 상태이상 전용 경량 패킷으로 교체
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
            // 🎯 스윕 판정을 위해 이동 전 Y좌표를 보관 (고속 낙하 시 대상 통과 방지)
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
            // 🥊 박힌범 마그마 판정
            if (hinbeom.hp > 0 && !m.hitIds.includes('hinbeom') && sweptFallHit(m.x, mPrevY, m.y, hinbeom.x, hinbeom.y, m.radius + hinbeom.radius)) {
                m.hitIds.push('hinbeom'); hinbeom.hp -= m.damage; emitDamageText(hinbeom.x, hinbeom.y, m.damage);
                addBurn('hinbeom', hinbeom, m.fire.dps, m.fire.dur, m.ownerId);
                if (owner) aggroHinbeom(m.ownerId);
                if (hinbeom.hp <= 0) killHinbeom(m.ownerId);
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
        // 🥊 박힌범 AI + 패왕색 패기
        // ====================================================================
        if (hinbeom.hp > 0 && hinbeom.state !== 'dead') {
            // 넉백
            if (Math.abs(hinbeom.knockbackForce) > 0) {
                hinbeom.x += hinbeom.knockbackForce;
                hinbeom.knockbackForce *= 0.85;
                if (Math.abs(hinbeom.knockbackForce) < 1) hinbeom.knockbackForce = 0;
            }

            if (now >= hinbeom.frozenUntil) {
                let hSpeed = hinbeom.speed;

                // 추적 대상 유효성 검사 — 바구니 밖으로 나가면 즉시 어그로 해제
                if (hinbeom.state === 'chase') {
                    let t = players[hinbeom.targetId];
                    if (!t || t.isDead || !isInHinbeomArea(t)) { hinbeom.targetId = null; hinbeom.state = 'return'; }
                }

                // 바구니 안에 들어온 플레이어를 자동으로 적대
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
                        if (hinbeom.hp < hinbeom.maxHp) hinbeom.hp += 10;
                    } else {
                        hinbeom.x += (hinbeom.homeX > hinbeom.x ? hSpeed : -hSpeed);
                    }
                }
            }

            // 바구니 밖으로는 절대 나갈 수 없다 (좌우 벽 안쪽으로 고정)
            let hMinX = HINBEOM_AREA.minX + hinbeom.radius;
            let hMaxX = HINBEOM_AREA.maxX - hinbeom.radius;
            if (hinbeom.x < hMinX) { hinbeom.x = hMinX; hinbeom.knockbackForce = 0; }
            if (hinbeom.x > hMaxX) { hinbeom.x = hMaxX; hinbeom.knockbackForce = 0; }
            hinbeom.y = hinbeom.homeY;

            // ── 패왕색 패기 발동 판정 : 추적 중일 때 1초마다 7% ──────────────
            if (hinbeom.state === 'chase') {
                if (now >= hinbeom.hakiNextRoll) {
                    hinbeom.hakiNextRoll = now + HAKI_ROLL_MS;
                    if (Math.random() < HAKI_CHANCE) {
                        // 중복 방출 허용 — 이미 진행 중이어도 새 패기가 추가된다
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
                        // 발동 즉시 범위 내 전원 기절
                        for (let pid in players) {
                            let t = players[pid];
                            if (t.isDead || !isInHinbeomArea(t)) continue;
                            t.frozenUntil = Math.max(t.frozenUntil || 0, now + HAKI_DURATION);
                            t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, now + HAKI_DURATION);
                            emitStatus(io, t);
                        }
                    }
                }
            } else {
                hinbeom.hakiNextRoll = now + HAKI_ROLL_MS;
            }

            // ── 활성 패기 틱 처리 (1초당 100 피해 · 4회 = 총 400) ────────────
            let latestEnd = 0;
            for (let hi = hinbeom.hakiBursts.length - 1; hi >= 0; hi--) {
                let burst = hinbeom.hakiBursts[hi];
                if (burst.endAt > latestEnd) latestEnd = burst.endAt;

                while (now >= burst.nextTick && burst.ticksLeft > 0) {
                    burst.nextTick += HAKI_TICK_MS;
                    burst.ticksLeft--;
                    for (let pid in players) {
                        let t = players[pid];
                        // ✅ 바구니 밖 플레이어에게는 절대 영향을 주지 않는다
                        if (t.isDead || !isInHinbeomArea(t)) continue;
                        let actual = HAKI_TICK_DMG;   // 패왕색 패기는 방어력을 무시한다
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

        okras.forEach(ok => {
            if (Math.abs(ok.knockbackForce) > 0) { ok.x += ok.knockbackForce; ok.knockbackForce *= 0.85; if (Math.abs(ok.knockbackForce) < 1) ok.knockbackForce = 0; }
            if (ok.hp <= 0 || now < ok.frozenUntil) return;
            let okSpeed = ok.speed;
            if (ok.state === 'idle') { 
                let closestDist = 200; let target = null; 
                for(let id in players) { let p = players[id]; if(p.isDead) continue; let d = Math.hypot(p.x - ok.x, p.y - ok.y); if(d <= closestDist) { closestDist = d; target = id; } } 
                if(target) { ok.targetId = target; ok.state = 'chase'; } 
            } else if (ok.state === 'chase') { 
                let p = players[ok.targetId]; 
                if (!p || p.isDead || Math.hypot(p.x - ok.x, p.y - ok.y) > 1500) { ok.state = 'return'; ok.targetId = null; } 
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

        // 🚀 [최적화④] SpatialGrid는 충격파 판정에만 쓰이므로, 충격파가 있을 때만 생성한다.
        //    또한 엔티티를 통째로 복사({...obj})하던 것을 좌표/식별자만 담은 경량 객체로 교체해 GC 부담을 줄인다.
        let grid = null;
        if (shockwaves.length > 0) {
            grid = new SpatialGrid(300);
            for (let pid in players) { let pp = players[pid]; if (!pp.isDead) grid.insert({ x: pp.x, y: pp.y, entityType: 'player', refId: pid }); }
            if (monster.hp > 0) grid.insert({ x: monster.x, y: monster.y, entityType: 'monster', refId: 'monster' });
            if (hinbeom.hp > 0) grid.insert({ x: hinbeom.x, y: hinbeom.y, entityType: 'hinbeom', refId: 'hinbeom' });
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
                    // 🥊 박힌범 충격파 판정
                    if (Math.abs(hinbeom.x - sw.x) < hitRadiusX && Math.abs(hinbeom.y - sw.y) < hitRadiusY) {
                        if (!sw.hitIds.includes('hinbeom')) {
                            sw.hitIds.push('hinbeom'); hinbeom.hp -= sw.damage; hinbeom.knockbackForce += sw.kb * 0.2;
                            if (sw.freeze) hinbeom.frozenUntil = Math.max(hinbeom.frozenUntil || 0, Date.now() + sw.freeze);
                            emitDamageText(hinbeom.x, hinbeom.y, sw.damage);
                            aggroHinbeom(sw.ownerId);
                            if (hinbeom.hp <= 0) killHinbeom(sw.ownerId);
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
        // 🚀 [최적화②] 충격파가 하나도 없는데도 매 프레임 빈 배열을 보내던 문제 제거.
        //    (마지막 충격파가 사라진 프레임에는 1회 전송해 클라이언트를 정리해 준다)
        if (shockwaves.length > 0 || _swWasActive) {
            _swWasActive = shockwaves.length > 0;
            io.emit('syncShockwaves', shockwaves.map(s => ({id: s.id, x: s.x, y: s.y, dir: s.dir, type: s.type, hasHie: s.hasHie})));
        }
    }
};
