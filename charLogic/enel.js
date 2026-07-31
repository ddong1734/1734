// 파일명: enel.js (charLogic/enel.js)
//
// 🥊 [수정] 엘 토르 / 뇌영 데미지가 박힌범(바구니 보스)과 소환된 할배새끼에게 들어가도록 추가
//    · 소환체(할배새끼)가 살아있는 동안에는 기존 설계대로 박힌범 무적 유지
// 🏆 [추가] 박힌범에게 준 피해량을 기록해 '박힌범 오크라' 드롭 판정(2500 이상)에 반영

function useSkill(p, data, ctx) {
    const { io, Skills } = ctx;
    let now = Date.now();
    let ES1 = Skills.ENEL_S1, ES2 = Skills.ENEL_S2, ES3 = Skills.ENEL_S3;
    let dir = data.dir || p.lastFacing || 1;

    if (data.type === 1) {
        let dirX = (data.dirX === 0 && data.dirY === 0) ? dir : data.dirX;
        let dirY = data.dirY || 0;
        let len = Math.hypot(dirX, dirY);
        if (len === 0) { dirX = dir; dirY = 0; len = 1; }

        p.isCasting = true;
        p.elThorActive = true;
        p.elThorStart = now;
        p.elThorEnd = now + ES1.castTime;
        p.elThorDirX = dirX / len;
        p.elThorDirY = dirY / len;
        p.elThorNextTick = now;
        p.elThorHitEntities = [];
        io.emit('actionEffect', { id: p.id, type: 'el_thor', x: p.x, y: p.y, dirX: p.elThorDirX, dirY: p.elThorDirY, lifeFrames: Math.round(ES1.castTime / (1000 / 60)), durationMs: ES1.castTime, hasGoro: p.hasGoro });
        io.emit('syncPlayerFull', p);
    }
    else if (data.type === 2) {
        let actualWidth = p.hasArkMaxim ? ES2.width * 3 : ES2.width;
        p.mantleActive = true;
        p.mantleDir = dir;
        p.mantleCenterX = p.x + (dir * (actualWidth * 0.5 + 60));
        p.mantleStart = now;
        p.mantleEnd = now + ES2.duration;
        p.mantleNextSpawn = now;
        p.mantleFired = 0;
    }
    else if (data.type === 3) {
        // ✨ 갓 에넬 시 뇌영 스폰 범위 조정 (2.5배 확대)
        let actualOffset = p.hasGodEnel ? ES3.offset * 2.5 : ES3.offset;

        p.raigoActive = true;
        p.raigoDir = dir;
        p.raigoCenterX = p.x + (dir * actualOffset);
        p.raigoTelegraphEnd = now + ES3.telegraph;
        p.raigoDropped = false;
        io.emit('actionEffect', { id: p.id, type: 'raigo_telegraph', x: p.raigoCenterX, y: 0, dir: dir, lifeFrames: Math.round(ES3.telegraph / (1000 / 60)), durationMs: ES3.telegraph, hasGodEnel: p.hasGodEnel });
    }
}

function updateLoop(p, now, ctx) {
    const { io, Skills, getPlayers, getMonster, getOkras } = ctx;
    let ES1 = Skills.ENEL_S1, ES3 = Skills.ENEL_S3;

    if (p.elThorActive) {
        if (p.isDead) {
            p.elThorActive = false;
            p.isCasting = false;
            io.emit('syncPlayerFull', p);
        } else {
            if (now >= p.elThorNextTick && now < p.elThorEnd) {
                p.elThorNextTick += ES1.tickInterval;
                elThorTick(p, now, ctx);
            }
            if (now >= p.elThorEnd) {
                p.elThorActive = false;
                p.isCasting = false;
                io.emit('syncPlayerFull', p);
            }
        }
    }

    if (p.raigoActive) {
        if (!p.raigoDropped && now >= p.raigoTelegraphEnd) {
            p.raigoDropped = true;
            p.raigoCastEnd = now + ES3.castTime;
            p.raigoNextTick = now;
            io.emit('actionEffect', { id: p.id, type: 'raigo', x: p.raigoCenterX, y: 0, dir: p.raigoDir, lifeFrames: Math.round(ES3.castTime / (1000 / 60)), durationMs: ES3.castTime, hasGodEnel: p.hasGodEnel });

            // ✨ 갓 에넬 시 공중 강제 하강(Raigo Pull) 판정 너비도 2.5배 증가
            let actualWidth = p.hasGodEnel ? ES3.width * 2.5 : ES3.width;
            let halfW = actualWidth / 2;
            let minX = p.raigoCenterX - halfW, maxX = p.raigoCenterX + halfW;
            
            let playersObj = getPlayers();
            for (let tid in playersObj) {
                let t = playersObj[tid];
                if (t.isDead || t.team === p.team || tid === p.id) continue;
                if (t.x >= minX && t.x <= maxX) {
                    t.frozenUntil = Math.max(t.frozenUntil || 0, now + ES3.castTime);
                    t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, now + ES3.castTime); 
                    t.raigoPullUntil = now + ES3.castTime;
                    io.emit('raigoPull', { id: tid, until: t.raigoPullUntil });
                    io.emit('syncPlayerFull', t);
                }
            }
            let monster = getMonster();
            if (monster.hp > 0 && monster.x >= minX && monster.x <= maxX) {
                monster.frozenUntil = Math.max(monster.frozenUntil || 0, now + ES3.castTime);
                monster.electrocutedUntil = Math.max(monster.electrocutedUntil || 0, now + ES3.castTime);
                monster.raigoPullUntil = Math.max(monster.raigoPullUntil || 0, now + ES3.castTime);
            }
            let okras = getOkras();
            okras.forEach(ok => {
                if (ok.hp > 0 && ok.x >= minX && ok.x <= maxX) {
                    ok.frozenUntil = Math.max(ok.frozenUntil || 0, now + ES3.castTime);
                    ok.electrocutedUntil = Math.max(ok.electrocutedUntil || 0, now + ES3.castTime);
                    ok.raigoPullUntil = Math.max(ok.raigoPullUntil || 0, now + ES3.castTime);
                }
            });
        }

        if (p.raigoDropped) {
            if (now >= p.raigoNextTick && now < p.raigoCastEnd) {
                p.raigoNextTick += ES3.tickInterval;
                raigoTick(p, now, ctx);
            }
            if (now >= p.raigoCastEnd) {
                p.raigoActive = false;
                p.raigoDropped = false;
            }
        }
    }
}

function elThorTick(p, now, ctx) {
    const { Skills, getPlayers, getMonster, getOkras, emitDamageText, checkPlayerDeath, io } = ctx;
    let ES1 = Skills.ENEL_S1;
    let dmg = ES1.tickDamage + Math.round(p.bonusDamage * 0.3);
    let ux = p.elThorDirX, uy = p.elThorDirY;
    let range = ES1.range;
    let halfThick = (p.hasGoro ? ES1.thickness * 3 : ES1.thickness) / 2;

    const inBeam = (ex, ey) => {
        let rx = ex - p.x, ry = ey - p.y;
        let s = rx * ux + ry * uy;
        let d = Math.abs(rx * (-uy) + ry * ux);
        return s >= 0 && s <= range && d <= halfThick;
    };

    let playersObj = getPlayers();
    for (let tid in playersObj) {
        let t = playersObj[tid];
        if (t.isDead || t.team === p.team || tid === p.id) continue;
        if (inBeam(t.x, t.y)) {
            let actual = dmg * (1 - (t.defense || 0));
            t.hp -= actual; emitDamageText(t.x, t.y, actual);
            t.frozenUntil = Math.max(t.frozenUntil || 0, p.elThorEnd);
            t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, p.elThorEnd); 
            t.airFreezeUntil = Math.max(t.airFreezeUntil || 0, p.elThorEnd);
            if (t.hp <= 0) checkPlayerDeath(t, p.id);
            else { io.to(tid).emit('takeDamage', actual); io.emit('syncPlayerFull', t); }
        }
    }

    let monster = getMonster();
    if (monster.hp > 0 && inBeam(monster.x, monster.y)) {
        monster.hp -= dmg; monster.targetId = p.id; monster.state = 'chase';
        monster.frozenUntil = Math.max(monster.frozenUntil || 0, p.elThorEnd);
        monster.electrocutedUntil = Math.max(monster.electrocutedUntil || 0, p.elThorEnd); 
        monster.airFreezeUntil = Math.max(monster.airFreezeUntil || 0, p.elThorEnd);
        emitDamageText(monster.x, monster.y, dmg);
        if (monster.hp <= 0) ctx.killMonster(p.id);
    }

    // 🥊 [추가] 박힌범 (바구니 보스)
    let hinbeom = (typeof ctx.getHinbeom === 'function') ? ctx.getHinbeom() : null;
    let minions = (typeof ctx.getMinions === 'function') ? (ctx.getMinions() || []) : [];
    let hinbeomInvincible = minions.length > 0;   // 🛡️ 할배새끼 생존 시 무적

    if (hinbeom && hinbeom.hp > 0 && hinbeom.state !== 'dead' && inBeam(hinbeom.x, hinbeom.y)) {
        if (!hinbeomInvincible) {
            hinbeom.hp -= dmg;
            if (typeof ctx.recordHinbeomDamage === 'function') ctx.recordHinbeomDamage(p.id, dmg);   // 🏆 피해량 기록
            hinbeom.frozenUntil = Math.max(hinbeom.frozenUntil || 0, p.elThorEnd);
            hinbeom.electrocutedUntil = Math.max(hinbeom.electrocutedUntil || 0, p.elThorEnd);
            hinbeom.airFreezeUntil = Math.max(hinbeom.airFreezeUntil || 0, p.elThorEnd);
            emitDamageText(hinbeom.x, hinbeom.y, dmg);
            if (typeof ctx.aggroHinbeom === 'function') ctx.aggroHinbeom(p.id);
            if (hinbeom.hp <= 0 && typeof ctx.killHinbeom === 'function') ctx.killHinbeom(p.id);
        }
    }

    // 🐗 [추가] 소환된 할배새끼
    for (let mi = minions.length - 1; mi >= 0; mi--) {
        let mn = minions[mi];
        if (!mn || mn.hp <= 0) continue;
        if (inBeam(mn.x, mn.y)) {
            mn.hp -= dmg; mn.targetId = p.id; mn.state = 'chase';
            mn.frozenUntil = Math.max(mn.frozenUntil || 0, p.elThorEnd);
            mn.electrocutedUntil = Math.max(mn.electrocutedUntil || 0, p.elThorEnd);
            mn.airFreezeUntil = Math.max(mn.airFreezeUntil || 0, p.elThorEnd);
            emitDamageText(mn.x, mn.y, dmg);
            if (mn.hp <= 0 && typeof ctx.killMinion === 'function') ctx.killMinion(mn, p.id);
        }
    }

    let okras = getOkras();
    okras.forEach(ok => {
        if (ok.hp > 0 && inBeam(ok.x, ok.y)) {
            ok.hp -= dmg; ok.targetId = p.id; ok.state = 'chase';
            ok.frozenUntil = Math.max(ok.frozenUntil || 0, p.elThorEnd);
            ok.electrocutedUntil = Math.max(ok.electrocutedUntil || 0, p.elThorEnd); 
            ok.airFreezeUntil = Math.max(ok.airFreezeUntil || 0, p.elThorEnd);
            emitDamageText(ok.x, ok.y, dmg);
            if (ok.hp <= 0) ctx.killOkra(ok, p.id);
        }
    });
}

function raigoTick(p, now, ctx) {
    const { Skills, getPlayers, getMonster, getOkras, emitDamageText, checkPlayerDeath, io } = ctx;
    let ES3 = Skills.ENEL_S3;
    let dmg = ES3.tickDamage + Math.round(p.bonusDamage * 0.3);
    
    // ✨ 갓 에넬 시 지속 틱 데미지 타격 범위도 2.5배 확대 적용
    let actualWidth = p.hasGodEnel ? ES3.width * 2.5 : ES3.width;
    let halfW = actualWidth / 2;
    let minX = p.raigoCenterX - halfW, maxX = p.raigoCenterX + halfW;

    let playersObj = getPlayers();
    for (let tid in playersObj) {
        let t = playersObj[tid];
        if (t.isDead || t.team === p.team || tid === p.id) continue;
        if (t.x >= minX && t.x <= maxX) {
            let actual = dmg * (1 - (t.defense || 0));
            t.hp -= actual; emitDamageText(t.x, t.y, actual);
            t.frozenUntil = Math.max(t.frozenUntil || 0, p.raigoCastEnd);
            t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, p.raigoCastEnd);
            if (t.hp <= 0) checkPlayerDeath(t, p.id);
            else { io.to(tid).emit('takeDamage', actual); io.emit('syncPlayerFull', t); }
        }
    }

    let monster = getMonster();
    if (monster.hp > 0 && monster.x >= minX && monster.x <= maxX) {
        monster.hp -= dmg; monster.targetId = p.id; monster.state = 'chase';
        monster.frozenUntil = Math.max(monster.frozenUntil || 0, p.raigoCastEnd);
        monster.electrocutedUntil = Math.max(monster.electrocutedUntil || 0, p.raigoCastEnd);
        emitDamageText(monster.x, monster.y, dmg);
        if (monster.hp <= 0) ctx.killMonster(p.id);
    }

    // 🥊 [추가] 박힌범 (바구니 보스) — 할배새끼가 살아있으면 무적
    let hinbeom = (typeof ctx.getHinbeom === 'function') ? ctx.getHinbeom() : null;
    let minions = (typeof ctx.getMinions === 'function') ? (ctx.getMinions() || []) : [];
    let hinbeomInvincible = minions.length > 0;

    if (hinbeom && hinbeom.hp > 0 && hinbeom.state !== 'dead' && hinbeom.x >= minX && hinbeom.x <= maxX) {
        if (!hinbeomInvincible) {
            hinbeom.hp -= dmg;
            if (typeof ctx.recordHinbeomDamage === 'function') ctx.recordHinbeomDamage(p.id, dmg);   // 🏆 피해량 기록
            hinbeom.frozenUntil = Math.max(hinbeom.frozenUntil || 0, p.raigoCastEnd);
            hinbeom.electrocutedUntil = Math.max(hinbeom.electrocutedUntil || 0, p.raigoCastEnd);
            emitDamageText(hinbeom.x, hinbeom.y, dmg);
            if (typeof ctx.aggroHinbeom === 'function') ctx.aggroHinbeom(p.id);
            if (hinbeom.hp <= 0 && typeof ctx.killHinbeom === 'function') ctx.killHinbeom(p.id);
        }
    }

    // 🐗 [추가] 소환된 할배새끼
    for (let mi = minions.length - 1; mi >= 0; mi--) {
        let mn = minions[mi];
        if (!mn || mn.hp <= 0) continue;
        if (mn.x >= minX && mn.x <= maxX) {
            mn.hp -= dmg; mn.targetId = p.id; mn.state = 'chase';
            mn.frozenUntil = Math.max(mn.frozenUntil || 0, p.raigoCastEnd);
            mn.electrocutedUntil = Math.max(mn.electrocutedUntil || 0, p.raigoCastEnd);
            emitDamageText(mn.x, mn.y, dmg);
            if (mn.hp <= 0 && typeof ctx.killMinion === 'function') ctx.killMinion(mn, p.id);
        }
    }

    let okras = getOkras();
    okras.forEach(ok => {
        if (ok.hp > 0 && ok.x >= minX && ok.x <= maxX) {
            ok.hp -= dmg; ok.targetId = p.id; ok.state = 'chase';
            ok.frozenUntil = Math.max(ok.frozenUntil || 0, p.raigoCastEnd);
            ok.electrocutedUntil = Math.max(ok.electrocutedUntil || 0, p.raigoCastEnd);
            emitDamageText(ok.x, ok.y, dmg);
            if (ok.hp <= 0) ctx.killOkra(ok, p.id);
        }
    });
}

module.exports = {
    useSkill,
    updateLoop
};