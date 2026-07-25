// sakazuki.js - 사카즈키 스킬 로직 전담 (마그마 / 불 도트)

function useSkill(p, data, ctx) {
    const { Skills, addProjectile, getNextProjId } = ctx;
    let now = Date.now();
    let SS1 = Skills.SAKAZUKI_S1, SS2 = Skills.SAKAZUKI_S2, SS3 = Skills.SAKAZUKI_S3;
    let dir = data.dir || p.lastFacing || 1;
    let enhancedMagu = p.hasMagu || p.hasAkainu;

    if (data.type === 1) {
        addProjectile({
            id: getNextProjId(), team: p.team, type: 'meigou', ownerId: p.id,
            x: p.x + (dir * 60), y: p.y - 20,
            vx: dir * SS1.speed, vy: 0,
            life: SS1.life, damage: SS1.damage + p.bonusDamage,
            hitR: 65, edgeR: 35, canHitBase: true,
            fire: { dps: SS1.dotDps, dur: SS1.dotDur },
            hasMagu: enhancedMagu,
            piercing: true, hitIds: [] 
        });
    }
    else if (data.type === 2) {
        addProjectile({
            id: getNextProjId(), team: p.team, type: 'dai_funka', ownerId: p.id,
            x: p.x + (dir * 180), y: p.y - 45, 
            vx: dir * SS2.speed, vy: 0,
            life: SS2.life, damage: SS2.damage + p.bonusDamage,
            hitR: 180, edgeR: 100, canHitBase: true, 
            fire: { dps: SS2.dotDps, dur: SS2.dotDur },
            hasJusticeCoat: p.hasJusticeCoat,
            piercing: true, hitIds: [] 
        });
    }
    else if (data.type === 3) {
        p.volcanoActive = true;
        p.volcanoX = p.x;
        p.volcanoStart = now + SS3.delay;
        p.volcanoEnd = now + SS3.delay + SS3.duration;
        p.volcanoNextSpawn = now + SS3.delay;
    }
}

function updateLoop(p, now, ctx) {
    const { Skills, addMagma, getNextProjId } = ctx;
    let SS3 = Skills.SAKAZUKI_S3;

    if (p.volcanoActive) {
        if (now >= p.volcanoEnd) { p.volcanoActive = false; return; }
        
        let spawnInt = p.hasAkainu ? SS3.spawnInterval * 0.5 : SS3.spawnInterval;
        let fallSpd = p.hasAkainu ? SS3.fallSpeed * 1.6 : SS3.fallSpeed;

        if (now >= p.volcanoStart && now >= p.volcanoNextSpawn) {
            let mx = p.volcanoX + (Math.random() * 2 - 1) * SS3.spread;
            addMagma({
                id: getNextProjId(), ownerId: p.id, team: p.team,
                x: mx, y: SS3.spawnY + (Math.random() * 120 - 60),
                vy: fallSpd, radius: 42,
                damage: SS3.meteorDamage, hitIds: [],
                fire: { dps: SS3.dotDps, dur: SS3.dotDur }
            });
            p.volcanoNextSpawn = now + spawnInt;
        }
    }
}

module.exports = { useSkill, updateLoop };
