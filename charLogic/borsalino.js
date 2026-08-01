// borsalino.js - 볼사리노 스킬 로직 전담
//
// 🥊 [수정] 야타의 거울 '빔 대시' 통과 데미지가 박힌범(바구니 보스)과
//    소환된 할배새끼에게도 들어가도록 추가 (폭발 데미지는 applyAoEDamage 가 이미 처리)
// 🏆 [추가] 박힌범 피해량 기록 → '박힌범 오크라' 드롭 판정(2500 이상)에 반영
// ⚫ [추가] 야타의 거울 통과 데미지가 검은수염(암흑 왕좌 보스)에게도 들어가도록 추가

function buildYataPath(sx, sy, dirX, dirY, range) {
    let len = Math.hypot(dirX, dirY);
    if (len === 0) { dirX = 1; dirY = 0; len = 1; }
    let ux = dirX / len, uy = dirY / len;      
    let px = -uy, py = ux;                       
    const SEGMENTS = 6;                          
    const AMP = 260;                             
    let pts = [{ x: sx, y: sy }];
    for (let i = 1; i <= SEGMENTS; i++) {
        let t = i / SEGMENTS;
        let baseX = sx + ux * range * t;
        let baseY = sy + uy * range * t;
        let side = (i % 2 === 1) ? 1 : -1;      
        let off = (i === SEGMENTS) ? 0 : AMP * side; 
        pts.push({ x: baseX + px * off, y: baseY + py * off });
    }
    pts.forEach(pt => {
        pt.x = Math.max(50, Math.min(32000 - 50, pt.x));
        // 🌌 중앙 정글 상층부(음수 Y 좌표)에서 시전해도 지상으로 강제 하강하지 않도록 상한 확장
        // ⚫ 암흑 왕좌(y ≈ -4000)에서도 정상 동작하도록 상한을 -5400 까지 확장
        pt.y = Math.max(-5400, Math.min(2000 - 45, pt.y));
    });
    return pts;
}

function sampleYataPathServer(pts, frac) {
    if (!pts || pts.length < 2) return null;
    let segLens = [], total = 0;
    for (let i = 1; i < pts.length; i++) { let L = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y); segLens.push(L); total += L; }
    let target = Math.max(0, Math.min(1, frac)) * total, acc = 0;
    for (let i = 1; i < pts.length; i++) {
        if (acc + segLens[i-1] >= target) {
            let f = segLens[i-1] > 0 ? (target - acc) / segLens[i-1] : 1;
            return { x: pts[i-1].x + (pts[i].x - pts[i-1].x) * f, y: pts[i-1].y + (pts[i].y - pts[i-1].y) * f };
        }
        acc += segLens[i-1];
    }
    return { x: pts[pts.length-1].x, y: pts[pts.length-1].y };
}

function startYata(p, data, ctx) {
    const { io, Skills } = ctx;
    let S2 = Skills.BORSALINO_S2;
    let dirX = (data.dirX === 0 && data.dirY === 0) ? data.dir : data.dirX;
    let dirY = data.dirY || 0;
    let path = buildYataPath(p.x, p.y, dirX, dirY, S2.moveRange);

    p.yataActive = true;
    p.yataPath = path;
    p.yataStartTime = Date.now();
    p.yataHitIds = [];
    p.yataLastHitScan = 0;
    p.isCasting = true; 

    let castTime = p.hasJusticeCoat ? S2.castTime * 0.7 : S2.castTime;
    io.emit('yataStart', { id: p.id, path: path, startTime: p.yataStartTime, duration: castTime });
    io.emit('syncPlayerFull', p);
}

function endYata(p, reason, ctx) {
    const { io, Skills, applyAoEDamage } = ctx;
    if (!p.yataActive) return;
    let S2 = Skills.BORSALINO_S2;
    p.yataActive = false;
    p.yataPath = null;
    p.isCasting = false;
    p.vy = 0; p.knockbackForce = 0;

    let ex = p.x, ey = p.y;
    io.emit('yataEnd', { id: p.id, x: ex, y: ey });
    io.emit('actionEffect', { id: p.id, type: 'yata_explosion', x: ex, y: ey, hasJusticeCoat: p.hasJusticeCoat });
    if (!p.isDead) {
        let expDmg = S2.explosionDamage + p.bonusDamage + (p.hasJusticeCoat ? 100 : 0);
        let expRadius = S2.explosionRadius * (p.hasJusticeCoat ? 1.5 : 1.0);
        applyAoEDamage(p, ex, ey, expRadius, expDmg, 0);
    }
    io.emit('syncPlayerFull', p);
}

function useSkill(p, data, ctx) {
    const { io, Skills, applyBoxDamage } = ctx;
    let now = Date.now();

    if (data.type === 1) {
        let S1 = Skills.BORSALINO_S1;
        let beamDamage = S1.damage + p.bonusDamage;
        let beamRange = S1.range;
        let enhancedPika = p.hasPika || p.hasKizaru;
        
        io.emit('actionEffect', { id: p.id, type: 'borsalino_beam', x: p.x, y: p.y, dir: data.dir, hasPika: enhancedPika, hasKizaru: p.hasKizaru });
        let minX = data.dir === 1 ? p.x : p.x - beamRange;
        let maxX = data.dir === 1 ? p.x + beamRange : p.x;

        if (enhancedPika) {
            // 메인 광선 두께 증가 (기존 60 -> 75)
            applyBoxDamage(p, minX, maxX, p.y - 75, p.y + 75, beamDamage, 0); 
            // 위쪽 작은 광선 (데미지 절반)
            applyBoxDamage(p, minX, maxX, p.y - 140, p.y - 90, beamDamage * 0.5, 0); 
            // 아래쪽 작은 광선 (데미지 절반)
            applyBoxDamage(p, minX, maxX, p.y + 90, p.y + 140, beamDamage * 0.5, 0); 
        } else {
            applyBoxDamage(p, minX, maxX, p.y - 60, p.y + 60, beamDamage, 0); 
        }

        p.isCasting = true;
        io.emit('syncPlayerFull', p);
        setTimeout(() => {
            if (p) {
                p.isCasting = false;
                io.emit('syncPlayerFull', p);
            }
        }, 333);
    }
    else if (data.type === 2) {
        if (p.yataActive) { endYata(p, 'reInput', ctx); return; }
        
        if (p.lastYataStart && now - p.lastYataStart < 300) return;
        p.lastYataStart = now;

        startYata(p, data, ctx);
    }
    else if (data.type === 3) {
        let S3 = Skills.BORSALINO_S3;
        p.isCasting = true;
        p.skill3Active = true; 
        p.skill3EndTime = now + S3.castTime;
        p.skill3DirX = (data.dirX === 0 && data.dirY === 0) ? data.dir : data.dirX; 
        p.skill3DirY = data.dirY || 0;
        p.skill3LastFire = 0; 
        
        if (p.hasKizaru) {
            let frames = Math.round(S3.castTime / (1000 / 60));
            io.emit('actionEffect', { id: p.id, type: 'kizaru_gates', x: p.x, y: p.y, lifeFrames: frames });
        }

        io.emit('syncPlayerFull', p);
    }
}

function updateLoop(p, now, ctx) {
    const { io, Skills, getPlayers, getMonster, getOkras, emitDamageText, checkPlayerDeath, gainXp, addProjectile, getNextProjId } = ctx;

    if (p.skill3Active) {
        let S3 = Skills.BORSALINO_S3;
        if (now < p.skill3EndTime && !p.isDead) {
            if (now - p.skill3LastFire >= S3.fireRate) { 
                p.skill3LastFire = now;
                let baseAngle = Math.atan2(p.skill3DirY, p.skill3DirX); 
                let spread = (Math.random() - 0.5) * (Math.PI / 3.5); 
                let finalAngle = baseAngle + spread;
                let magaDamage = S3.damage + (p.bonusDamage * 0.2);
                
                addProjectile({
                    id: getNextProjId(), team: p.team, type: 'magatama', ownerId: p.id,
                    x: p.x, y: p.y, vx: Math.cos(finalAngle) * S3.speed, vy: Math.sin(finalAngle) * S3.speed, 
                    life: 40, damage: magaDamage, hasKizaru: p.hasKizaru 
                });

                if (p.hasKizaru) {
                    for (let i = 0; i < 2; i++) {
                        let extraAngle = baseAngle + (Math.random() - 0.5) * (Math.PI / 1.5);
                        let offsetX = (Math.random() - 0.5) * 160;
                        let offsetY = (Math.random() - 0.5) * 160 - 50;
                        addProjectile({
                            id: getNextProjId(), team: p.team, type: 'magatama', ownerId: p.id,
                            x: p.x + offsetX, y: p.y + offsetY,
                            vx: Math.cos(extraAngle) * S3.speed, vy: Math.sin(extraAngle) * S3.speed, 
                            life: 40, damage: magaDamage, hasKizaru: true
                        });
                    }
                }
            }
        } else {
            p.skill3Active = false; p.isCasting = false; io.emit('syncPlayerFull', p);
        }
    }

    if (p.yataActive) {
        let S2 = Skills.BORSALINO_S2;
        if (p.isDead) { endYata(p, 'dead', ctx); return; }

        let elapsed = now - p.yataStartTime;
        let castTime = p.hasJusticeCoat ? S2.castTime * 0.7 : S2.castTime;
        let frac = Math.min(1, elapsed / castTime);
        let pos = sampleYataPathServer(p.yataPath, frac);
        if (pos) { p.x = pos.x; p.y = pos.y; }

        if (now - (p.yataLastHitScan || 0) >= 60) {
            p.yataLastHitScan = now;
            let beamDmg = S2.beamDamage + Math.round(p.bonusDamage * 0.3);
            let playersObj = getPlayers();
            for (let tid in playersObj) {
                let t = playersObj[tid];
                if (t.isDead || t.team === p.team || tid === p.id) continue;
                if (Math.hypot(t.x - p.x, t.y - p.y) < 90 && !p.yataHitIds.includes(tid)) {
                    p.yataHitIds.push(tid);
                    let dmg = beamDmg * (1 - (t.defense || 0));
                    t.hp -= dmg; emitDamageText(t.x, t.y, dmg);
                    if (t.hp <= 0) { p.gold += 800; io.to(p.id).emit('updateGold', p.gold); checkPlayerDeath(t, p.id); }
                    else io.to(tid).emit('takeDamage', dmg);
                }
            }
            
            let monster = getMonster();
            if (monster.hp > 0 && Math.hypot(monster.x - p.x, monster.y - p.y) < monster.radius + 60 && !p.yataHitIds.includes('monster')) {
                p.yataHitIds.push('monster'); monster.hp -= beamDmg; monster.targetId = p.id; monster.state = 'chase';
                emitDamageText(monster.x, monster.y, beamDmg);
                if (monster.hp <= 0) { p.gold += 2500; io.to(p.id).emit('updateGold', p.gold); gainXp(p, 200); monster.targetId=null; monster.state='dead'; setTimeout(()=>{ monster.hp=monster.maxHp; monster.x=monster.homeX; monster.y=837; monster.state='idle'; },30000); }
            }

            // 🥊 [추가] 박힌범 (바구니 보스) — 할배새끼가 살아있는 동안은 무적이므로 판정만 건너뛴다
            //    (무적 중에는 hitIds 에 기록하지 않아, 소환체가 죽은 뒤 같은 대시에서도 다시 적중 가능)
            let hinbeom = (typeof ctx.getHinbeom === 'function') ? ctx.getHinbeom() : null;
            let minions = (typeof ctx.getMinions === 'function') ? (ctx.getMinions() || []) : [];
            let hinbeomInvincible = minions.length > 0;

            if (hinbeom && hinbeom.hp > 0 && hinbeom.state !== 'dead' && !hinbeomInvincible
                && Math.hypot(hinbeom.x - p.x, hinbeom.y - p.y) < hinbeom.radius + 60
                && !p.yataHitIds.includes('hinbeom')) {
                p.yataHitIds.push('hinbeom');
                hinbeom.hp -= beamDmg;
                if (typeof ctx.recordHinbeomDamage === 'function') ctx.recordHinbeomDamage(p.id, beamDmg);   // 🏆 피해량 기록
                emitDamageText(hinbeom.x, hinbeom.y, beamDmg);
                if (typeof ctx.aggroHinbeom === 'function') ctx.aggroHinbeom(p.id);
                if (hinbeom.hp <= 0 && typeof ctx.killHinbeom === 'function') ctx.killHinbeom(p.id);
            }

            // ⚫ [추가] 검은수염 (암흑 왕좌 보스)
            let bb = (typeof ctx.getBlackbeard === 'function') ? ctx.getBlackbeard() : null;
            if (bb && bb.hp > 0 && bb.state !== 'dead'
                && Math.hypot(bb.x - p.x, bb.y - p.y) < bb.radius + 60
                && !p.yataHitIds.includes('blackbeard')) {
                p.yataHitIds.push('blackbeard');
                bb.hp -= beamDmg;
                emitDamageText(bb.x, bb.y, beamDmg);
                if (typeof ctx.aggroBlackbeard === 'function') ctx.aggroBlackbeard(p.id);
                if (bb.hp <= 0 && typeof ctx.killBlackbeard === 'function') ctx.killBlackbeard(p.id);
            }

            // 🐗 [추가] 소환된 할배새끼
            for (let mi = minions.length - 1; mi >= 0; mi--) {
                let mn = minions[mi];
                if (!mn || mn.hp <= 0) continue;
                if (Math.hypot(mn.x - p.x, mn.y - p.y) < mn.radius + 60 && !p.yataHitIds.includes('minion_' + mn.id)) {
                    p.yataHitIds.push('minion_' + mn.id);
                    mn.hp -= beamDmg; mn.targetId = p.id; mn.state = 'chase';
                    emitDamageText(mn.x, mn.y, beamDmg);
                    if (mn.hp <= 0 && typeof ctx.killMinion === 'function') ctx.killMinion(mn, p.id);
                }
            }
            
            let okras = getOkras();
            okras.forEach(ok => {
                if (ok.hp > 0 && Math.hypot(ok.x - p.x, ok.y - p.y) < ok.radius + 60 && !p.yataHitIds.includes('okra_'+ok.id)) {
                    p.yataHitIds.push('okra_'+ok.id); ok.hp -= beamDmg; ok.targetId = p.id; ok.state='chase';
                    emitDamageText(ok.x, ok.y, beamDmg);
                    // ✨ 황금오크라 드롭 판정 + 부활 시 등급 재추첨 (야타의 거울 처치 경로도 동일 적용)
                    if (ok.hp <= 0) { 
                        p.gold += 500; io.to(p.id).emit('updateGold', p.gold); gainXp(p, 50); 
                        if (typeof ctx.tryGoldenDrop === 'function') ctx.tryGoldenDrop(ok, p.id); 
                        ok.state='dead'; ok.targetId=null; 
                        // 🏆 고정 황금오크라는 개별 리스폰 시간(7분) 적용, 그 외는 기존 30초 유지
                        setTimeout(()=>{ 
                            if (typeof ctx.rerollOkraGrade === 'function') ctx.rerollOkraGrade(ok); else ok.hp = ok.maxHp; 
                            ok.x=ok.homeX; ok.y=ok.homeY; ok.state='idle'; 
                        }, ok.respawnMs || 30000); 
                    }
                }
            });
        }
        if (frac >= 1) { endYata(p, 'timeout', ctx); }
    }
}

module.exports = {
    useSkill,
    updateLoop
};