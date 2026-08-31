// kuzan.js - 쿠잔 스킬 로직 전담

function useSkill(p, data, ctx) {
    const { io, Skills, addShockwave, getNextProjId, addProjectile } = ctx;
    let now = Date.now();
    let totalDamage = p.baseDamage + p.bonusDamage;
    let KS1 = Skills.KUZAN_S1, KS2 = Skills.KUZAN_S2, KS3 = Skills.KUZAN_S3;
    let enhancedHie = p.hasHie || p.hasAokiji;

    if (data.type === 1) { 
        addShockwave({
            id: getNextProjId(), ownerId: p.id, team: p.team, 
            x: p.x + (data.dir * 60), y: p.y - 45, 
            // ⚡ 즉발감을 위해 빠르게 나간다 (속도 26 · 사거리는 예전과 비슷)
            dir: data.dir, speed: enhancedHie ? KS1.speed * 2 : KS1.speed, life: 38, hitIds: [], 
            damage: KS1.damage + (totalDamage * 1.5), kb: data.dir * KS1.kb, 
            type: 'pheasant_peck', freeze: enhancedHie ? 3000 : KS1.freeze, hasHie: enhancedHie
        });
    } 
    else if (data.type === 2) { 
        p.partisanQueue = KS2.count;
        p.partisanFired = 0;
        p.partisanDir = data.dir;
        p.partisanNextFire = now; 
    } 
    else if (data.type === 3) { 
        p.isCasting = true;
        p.iceAgeActive = true;
        p.iceAgeCastEnd = now + KS3.castTime;
        io.emit('syncPlayerFull', p);
    }
}

function updateLoop(p, now, ctx) {
    const { io, Skills, addProjectile, getNextProjId, applyIceAge } = ctx;
    let KS2 = Skills.KUZAN_S2, KS3 = Skills.KUZAN_S3;

    if (p.partisanQueue && p.partisanFired < p.partisanQueue) {
        if (!p.isDead && now >= p.partisanNextFire) {
            let totalDamage = p.baseDamage + p.bonusDamage;
            let i = p.partisanFired;
            addProjectile({
                id: getNextProjId(), team: p.team, type: 'partisan', ownerId: p.id,
                x: p.x, y: p.y - 80 + (i * 25),
                vx: p.partisanDir * 15, vy: (i - 1) * 4,
                life: 80, damage: KS2.damage + (totalDamage * 0.5),
                freeze: KS2.freeze, homing: true,
                hasJusticeCoat: p.hasJusticeCoat,
                hasHie: p.hasHie,
                hasAokiji: p.hasAokiji 
            });
            p.partisanFired++;
            p.partisanNextFire = now + (KS2.spawnInterval || 150);
        }
        if (p.isDead) { p.partisanQueue = 0; p.partisanFired = 0; }
    }

    if (p.iceAgeActive) {
        if (p.isDead) {
            p.iceAgeActive = false;
            p.isCasting = false;
            io.emit('syncPlayerFull', p);
            return;
        }
        if (now >= p.iceAgeCastEnd) {
            p.iceAgeActive = false;
            p.isCasting = false;
            io.emit('actionEffect', { id: p.id, type: 'ice_age', x: p.x, y: p.y });
            applyIceAge(p, p.x, p.y, KS3.radius, KS3.damage, KS3.freeze);
            io.emit('syncPlayerFull', p);
        }
    }
}

module.exports = {
    useSkill,
    updateLoop
};
