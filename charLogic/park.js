// park.js - 박인범 스킬 로직 전담

function useSkill(p, data, ctx) {
    const { io, Skills, applyAoEDamage, addShockwave, getNextProjId } = ctx;
    let now = Date.now();
    let totalDamage = p.baseDamage + p.bonusDamage;
    let PS1 = Skills.PARK_S1, PS2 = Skills.PARK_S2, PS3 = Skills.PARK_S3;

    if (data.type === 1) { 
        io.emit('actionEffect', { id: p.id, type: 'huge_wind_burst', x: data.x, y: data.y, dir: data.dir });
        applyAoEDamage(p, data.x, data.y, PS1.radius, totalDamage * PS1.damMult, data.dir * PS1.kb);
    } 
    else if (data.type === 2) { 
        p.skill2EndTime = now + PS2.duration; 
        io.emit('syncPlayerFull', p); 
    } 
    else if (data.type === 3) { 
        p.isCasting = true; 
        io.emit('syncPlayerFull', p);
        setTimeout(() => {
            if (!p.isDead) {
                addShockwave({
                    id: getNextProjId(), ownerId: p.id, team: p.team, 
                    x: p.x + (data.dir * 60), y: p.y - 70, 
                    dir: data.dir, speed: PS3.speed / 2, life: 60, hitIds: [], 
                    damage: totalDamage * PS3.damMult, kb: data.dir * PS3.kb, type: 'detroit'
                });
            }
            p.isCasting = false; 
            io.emit('syncPlayerFull', p);
        }, PS3.castTime);
    }
}

function landSkill1(p, data, ctx) {
    const { io, Skills, applyAoEDamage } = ctx;
    let totalDamage = p.baseDamage + p.bonusDamage;
    let PS1 = Skills.PARK_S1;
    io.emit('actionEffect', { id: p.id, type: 'huge_wind_burst', x: data.x, y: data.y, dir: data.dir });
    applyAoEDamage(p, data.x, data.y, PS1.radius, totalDamage * PS1.damMult, data.dir * PS1.kb);
}

function updateLoop(p, now, ctx) {
    // 박인범은 지속 틱(Tick) 업데이트 스킬이 없으므로 비워둡니다.
    // (이후 장판기나 지속 데미지 추가 시 여기에 작성)
}

module.exports = {
    useSkill,
    landSkill1,
    updateLoop
};
