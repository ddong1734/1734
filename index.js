// 파일명: index.js

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const Characters = require('./characters.js');
const Skills = require('./skills.js');
const Items = require('./items.js'); 
const CharLogic = {
    'PARK': require('./charLogic/park.js'),
    'BORSALINO': require('./charLogic/borsalino.js'),
    'KUZAN': require('./charLogic/kuzan.js'),
    'SAKAZUKI': require('./charLogic/sakazuki.js'),
    'ENEL': require('./charLogic/enel.js')
};

const ShopManager = require('./shopManager.js');
const GameLoop = require('./gameLoop.js');

const GROUND_Y_SERVER = 2000;
app.use(express.static(__dirname));
app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

class DeltaCompressor {
    constructor() { this.snapshots = new Map(); }
    safeClone(data) { return typeof structuredClone === 'function' ? structuredClone(data) : { ...data }; }
    getDelta(id, currentData) {
        const lastData = this.snapshots.get(id);
        if (!lastData) { this.snapshots.set(id, this.safeClone(currentData)); return currentData; }
        let delta = {}; let hasChanges = false;
        for (let key in currentData) {
            if (key === 'burns') continue;
            if (currentData[key] !== lastData[key]) { delta[key] = currentData[key]; hasChanges = true; }
        }
        if (hasChanges) {
            delta.id = currentData.id || id;
            this.snapshots.set(id, this.safeClone(currentData));
            return delta;
        }
        return null;
    }
    remove(id) { this.snapshots.delete(id); }
}

const compressors = {
    monsterDelta: new DeltaCompressor(),
    okraDelta: new DeltaCompressor(),
    playerDelta: new DeltaCompressor()
};

const State = {
    players: {},
    gameStarted: false,
    masterId: null,
    burnMap: new Map(),
    magmas: [], 
    maguBombs: [], 
    justiceBombs: [], 
    giantPartisanQueue: [],
    mantleBolts: [], 
    bases: { 1: { hp: 20000, maxHp: 20000, x: 12250, y: 1900 }, 2: { hp: 20000, maxHp: 20000, x: 19750, y: 1900 } },
    monster: { x: 16000, y: 837, homeX: 16000, radius: 63, hp: 2000, maxHp: 2000, speed: 1.75, targetId: null, state: 'idle', lastAttack: 0, frozenUntil: 0, electrocutedUntil: 0, knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0 },
    turrets: [
        { team: 1, x: 12500, y: 1850, range: 1200, damage: 30, lastShot: 0 },
        { team: 2, x: 19500, y: 1850, range: 1200, damage: 30, lastShot: 0 }
    ],
    okras: [],
    projectiles: [],
    shockwaves: [],
    detectors: [],
    teamStorages: { 1: [], 2: [] },
    projIdCounter: 0
};

function rerollOkraGrade(ok) {
    // 🏆 정글 상층 고정 황금오크라는 등급 재추첨 없이 항상 황금으로 부활한다.
    if (ok.isEliteGolden) {
        ok.isGolden = true;
        ok.maxHp = 2000;
        ok.hp = ok.maxHp;
        return;
    }
    ok.isGolden = Math.random() < 0.05;
    ok.maxHp = ok.isGolden ? 2000 : 700;
    ok.hp = ok.maxHp;
}

let okraIdCounter = 0;
function spawnOkra(x, y, opts) {
    let ok = {
        id: okraIdCounter++, x: x, y: y, homeX: x, homeY: y, radius: 25,
        isGolden: false,
        hp: 700, maxHp: 700, atk: 30, speed: 1, state: 'idle', targetId: null, 
        lastAttack: 0, frozenUntil: 0, electrocutedUntil: 0, knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0,
        // 🏆 고정 황금오크라 여부 및 개별 리스폰 시간(ms)
        isEliteGolden: !!(opts && opts.eliteGolden),
        respawnMs: (opts && opts.respawnMs) ? opts.respawnMs : 30000
    };
    rerollOkraGrade(ok);
    State.okras.push(ok);
}
for(let i=0; i<8; i++) spawnOkra(1500 + i*600, 1955);
for(let i=0; i<8; i++) spawnOkra(25500 + i*600, 1955);

// 🏆 중앙 정글 상층(보스 발판 기준 3칸 위, y=0 장발판) 고정 황금오크라 배치
//    좌측 발판(11600~13400) / 우측 발판(18600~20400) 각 3마리 · 리스폰 7분(420,000ms)
const ELITE_GOLDEN_OPTS = { eliteGolden: true, respawnMs: 420000 };
[12000, 12500, 13000].forEach(ex => spawnOkra(ex, -45, ELITE_GOLDEN_OPTS));
[19000, 19500, 20000].forEach(ex => spawnOkra(ex, -45, ELITE_GOLDEN_OPTS));

function getRequiredXp(level) {
    if (level >= 50) return 999999; 
    let req = 100; for(let i=1; i<=level; i++) { req += i * 5; } return req;
}

function addBurn(key, entity, dps, dur, ownerId) {
    if (!entity) return; let now = Date.now();
    if (!State.burnMap.has(key)) State.burnMap.set(key, []);
    State.burnMap.get(key).push({ dps: dps, endTime: now + dur, ownerId: ownerId, nextTick: now + 1000 });
    entity.burningUntil = Math.max(entity.burningUntil || 0, now + dur);
    io.emit('setBurn', { id: key, until: entity.burningUntil });
}

function clearBurns(key, entity) { State.burnMap.delete(key); if (entity) entity.burningUntil = 0; }

function processBurns(now) {
    for (let [key, stacks] of State.burnMap) {
        let entity = null, kind = null;
        if (key === 'monster') { entity = State.monster; kind = 'monster'; }
        else if (typeof key === 'string' && key.startsWith('okra_')) { entity = State.okras.find(o => o.id === parseInt(key.slice(5))); kind = 'okra'; }
        else { entity = State.players[key]; kind = 'player'; }

        if (!entity || entity.hp <= 0 || (kind === 'player' && entity.isDead)) { State.burnMap.delete(key); if (entity) entity.burningUntil = 0; continue; }

        let dmg = 0, lastOwner = null;
        for (let i = stacks.length - 1; i >= 0; i--) {
            let b = stacks[i];
            while (now >= b.nextTick && b.nextTick <= b.endTime) { dmg += b.dps; lastOwner = b.ownerId; b.nextTick += 1000; }
            if (now >= b.endTime) stacks.splice(i, 1);
        }
        if (stacks.length === 0) { State.burnMap.delete(key); entity.burningUntil = 0; }
        if (dmg <= 0) continue;

        if (kind === 'player') {
            let actual = dmg * (1 - (entity.defense || 0));
            entity.hp -= actual; emitDamageText(entity.x, entity.y, actual);
            io.to(key).emit('takeDamage', actual);
            if (entity.hp <= 0) checkPlayerDeath(entity, lastOwner);
        } else if (kind === 'monster') {
            State.monster.hp -= dmg; emitDamageText(State.monster.x, State.monster.y, dmg);
            if (State.monster.hp <= 0) killMonster(lastOwner);
        } else if (kind === 'okra') {
            entity.hp -= dmg; emitDamageText(entity.x, entity.y, dmg);
            if (entity.hp <= 0) killOkra(entity, lastOwner);
        }
    }
}

function resetGame() {
    State.gameStarted = false; State.masterId = null; State.players = {}; 
    State.projectiles = []; State.shockwaves = []; State.detectors = []; State.magmas = []; State.maguBombs = []; 
    State.justiceBombs = []; State.giantPartisanQueue = []; State.mantleBolts = []; State.burnMap.clear();
    State.bases = { 1: { hp: 20000, maxHp: 20000, x: 12250, y: 1900 }, 2: { hp: 20000, maxHp: 20000, x: 19750, y: 1900 } };
    State.monster = { x: 16000, y: 837, homeX: 16000, radius: 63, hp: 2000, maxHp: 2000, speed: 1.75, targetId: null, state: 'idle', lastAttack: 0, frozenUntil: 0, electrocutedUntil: 0, knockbackForce: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0, skillFreezeUntil: 0 };
    State.turrets = [ { team: 1, x: 12500, y: 1850, range: 1200, damage: 30, lastShot: 0 }, { team: 2, x: 19500, y: 1850, range: 1200, damage: 30, lastShot: 0 } ];
    State.teamStorages = { 1: [], 2: [] };
    State.okras.forEach(ok => { rerollOkraGrade(ok); ok.x = ok.homeX; ok.y = ok.homeY; ok.state = 'idle'; ok.targetId = null; ok.knockbackForce = 0; ok.burningUntil = 0; ok.maguBombUntil = 0; ok.justiceBombUntil = 0; ok.skillFreezeUntil = 0; ok.electrocutedUntil = 0; });
    compressors.monsterDelta.snapshots.clear(); compressors.okraDelta.snapshots.clear(); compressors.playerDelta.snapshots.clear();
}

function recalcStats(p) {
    let charType = p.characterType || 'PARK'; let char = Characters[charType] || Characters.PARK;
    let oldMax = p.maxHp || char.hp; 
    p.maxHp = char.hp + ((p.level || 0) * 300); p.speedMult = char.speedMult || 1.0; 
    p.attackSpeedMult = 1.0; p.bonusDamage = ((p.level || 0) * 3); p.defense = 0; p.hpRegen = 0; 
    p.orbitSpheres = 0; p.hasJokbal = false; p.hasDaluFengwei = false; 
    p.hasJadam = false; p.seolgonnyakCount = 0; p.hasPepsiArt = false;
    p.hasPika = false; p.hasHie = false; p.hasMagu = false; p.hasJusticeCoat = false;
    p.hasKizaru = false; p.hasAokiji = false; p.hasAkainu = false; 
    p.hasGoro = false; p.hasArkMaxim = false; p.hasGodEnel = false;

    p.equippedUids.forEach(uid => {
        let item = p.inventory.find(i => i.uid === uid);
        if (!item || !Items[item.id] || !Items[item.id].stats) return;
        let stats = Items[item.id].stats;
        
        if (stats.maxHp) p.maxHp += stats.maxHp; if (stats.speedMult) p.speedMult += stats.speedMult;
        if (stats.bonusDamage) p.bonusDamage += stats.bonusDamage; if (stats.defense) p.defense += stats.defense;
        if (stats.hpRegen) p.hpRegen += stats.hpRegen; if (stats.attackSpeedMult) p.attackSpeedMult += stats.attackSpeedMult;
        if (stats.orbitSpheres) p.orbitSpheres += stats.orbitSpheres;
        if (stats.hasJokbal) p.hasJokbal = true; if (stats.hasDaluFengwei) p.hasDaluFengwei = true;
        if (stats.hasJadam) p.hasJadam = true; if (stats.hasPepsiArt) p.hasPepsiArt = true;
        if (stats.hasPika) p.hasPika = true; if (stats.hasHie) p.hasHie = true; if (stats.hasMagu) p.hasMagu = true;
        if (stats.hasJusticeCoat) p.hasJusticeCoat = true;
        if (stats.hasKizaru) p.hasKizaru = true; if (stats.hasAokiji) p.hasAokiji = true; if (stats.hasAkainu) p.hasAkainu = true;
        if (stats.hasGoro) p.hasGoro = true; if (stats.hasArkMaxim) p.hasArkMaxim = true; if (stats.hasGodEnel) p.hasGodEnel = true;
        if (item.id === 'seolgonnyak') p.seolgonnyakCount = 1;
    });

    if (p.maxHp > oldMax) p.hp += (p.maxHp - oldMax); p.hp = Math.min(p.hp, p.maxHp);
    p.orbitSpeedMult = p.hasDaluFengwei ? 1.8 : 1.0;
}

function gainXp(p, amount) {
    if (p.level >= 50) return; p.xp += amount; let leveledUp = false;
    while (p.level < 50 && p.xp >= p.maxXp) { p.xp -= p.maxXp; p.level++; p.maxXp = getRequiredXp(p.level); leveledUp = true; }
    if (leveledUp) { recalcStats(p); io.emit('levelUp', p.id); }
    io.emit('syncPlayerFull', p); 
}

function emitDamageText(x, y, damage) { if (damage >= 1) { io.emit('floatingText', { x: x, y: y - 40, val: Math.round(damage), type: 'damage' }); } }

function applyBaseDamage(attackerTeam, damage) {
    let enemyBase = State.bases[attackerTeam === 1 ? 2 : 1];
    if (!enemyBase || enemyBase.hp <= 0) return;
    enemyBase.hp -= damage; emitDamageText(enemyBase.x, enemyBase.y, damage);
    if (enemyBase.hp <= 0 && State.gameStarted) { State.gameStarted = false; io.emit('gameOver', attackerTeam); setTimeout(resetGame, 2000); }
}

function checkPlayerDeath(targetPlayer, attackerId) {
    if (targetPlayer.hp <= 0 && !targetPlayer.isDead) {
        targetPlayer.hp = 0; targetPlayer.isDead = true; 
        targetPlayer.isCasting = false; targetPlayer.skill3Active = false; targetPlayer.yataActive = false; targetPlayer.yataPath = null; 
        targetPlayer.iceAgeActive = false; targetPlayer.partisanQueue = 0; targetPlayer.partisanFired = 0;
        targetPlayer.volcanoActive = false; targetPlayer.maguBombUntil = 0; targetPlayer.justiceBombUntil = 0;
        targetPlayer.skillFreezeUntil = 0; 
        targetPlayer.skill1Dashing = false; 
        targetPlayer.elThorActive = false; targetPlayer.mantleActive = false; targetPlayer.raigoActive = false; targetPlayer.raigoDropped = false;
        clearBurns(targetPlayer.id, targetPlayer); 
        io.emit('player_died', targetPlayer.id);
        io.emit('syncPlayerFull', targetPlayer); 

        if (attackerId && State.players[attackerId] && attackerId !== targetPlayer.id) {
            State.players[attackerId].gold += 800; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
            gainXp(State.players[attackerId], Math.max(1, targetPlayer.level) * 10);
        }

        setTimeout(() => {
            if(State.players[targetPlayer.id]) {
                targetPlayer.isDead = false; targetPlayer.lastRespawn = Date.now(); 
                targetPlayer.hp = targetPlayer.maxHp; targetPlayer.x = State.bases[targetPlayer.team].x; targetPlayer.y = 1955; 
                targetPlayer.burningUntil = 0; targetPlayer.maguBombUntil = 0; targetPlayer.justiceBombUntil = 0; targetPlayer.skillFreezeUntil = 0;
                targetPlayer.electrocutedUntil = 0;
                io.emit('player_respawned', targetPlayer);
            }
        }, 15000); 
    }
}

function killMonster(attackerId) {
    if (State.monster.state === 'dead') return;
    if (attackerId && State.players[attackerId]) {
        State.players[attackerId].gold += 2500; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], 200);
    }
    State.monster.targetId = null; State.monster.state = 'dead'; clearBurns('monster', State.monster);
    setTimeout(() => { State.monster.hp = State.monster.maxHp; State.monster.x = State.monster.homeX; State.monster.y = 837; State.monster.state = 'idle'; }, 30000);
}

function tryGoldenDrop(ok, attackerId) {
    if (!ok || !ok.isGolden || !attackerId) return;
    let p = State.players[attackerId];
    if (!p) return;
    if (Math.random() >= 0.25) return;

    if (p.inventory.length >= 20) {
        io.to(attackerId).emit('goldenDrop', { msg: '인벤토리가 가득 차 황금을 놓쳤습니다!', fail: true });
        return;
    }
    p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: 'gold' });
    io.to(attackerId).emit('goldenDrop', { msg: '✨ 황금 획득! (판매 시 3,000 G)', inventory: p.inventory });
}

function killOkra(ok, attackerId) {
    if (ok.state === 'dead') return;
    if (attackerId && State.players[attackerId]) {
        State.players[attackerId].gold += 500; io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], 50);
    }
    tryGoldenDrop(ok, attackerId);
    ok.state = 'dead'; ok.targetId = null; clearBurns('okra_' + ok.id, ok);
    // 🏆 고정 황금오크라는 개별 리스폰 시간(7분) 적용, 그 외는 기존 30초 유지
    setTimeout(() => { rerollOkraGrade(ok); ok.x = ok.homeX; ok.y = ok.homeY; ok.state = 'idle'; }, ok.respawnMs || 30000);
}

function applyAoEDamage(attacker, cx, cy, radius, damage, kb) {
    let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0 && Math.hypot(cx - enemyBase.x, cy - enemyBase.y) < radius + 150) { applyBaseDamage(attacker.team, damage); }
    for (let tid in State.players) {
        if (tid !== attacker.id && State.players[tid].team !== attacker.team) {
            let t = State.players[tid];
            if (!t.isDead && Math.hypot(cx - t.x, cy - t.y) < radius) {
                let actualDamage = damage * (1 - (t.defense || 0)); t.hp -= actualDamage; emitDamageText(t.x, t.y, actualDamage);
                if (t.hp <= 0) checkPlayerDeath(t, attacker.id); else io.to(tid).emit('bossHit', { damage: actualDamage, dir: Math.sign(kb), kb: kb });
            }
        }
    }
    if (State.monster.hp > 0 && Math.hypot(cx - State.monster.x, cy - State.monster.y) < radius + State.monster.radius) {
        State.monster.hp -= damage; State.monster.knockbackForce += kb * 0.3; State.monster.targetId = attacker.id; State.monster.state = 'chase'; emitDamageText(State.monster.x, State.monster.y, damage);
        if (State.monster.hp <= 0) killMonster(attacker.id);
    }
    State.okras.forEach(ok => {
        if (ok.hp > 0 && Math.hypot(cx - ok.x, cy - ok.y) < radius + ok.radius) {
            ok.hp -= damage; ok.knockbackForce += kb; ok.targetId = attacker.id; ok.state = 'chase'; emitDamageText(ok.x, ok.y, damage);
            if (ok.hp <= 0) killOkra(ok, attacker.id);
        }
    });
}

function applyBoxDamage(attacker, minX, maxX, minY, maxY, damage, kb) {
    let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
    if (enemyBase && enemyBase.hp > 0 && enemyBase.x >= minX - 150 && enemyBase.x <= maxX + 150 && enemyBase.y >= minY - 150 && enemyBase.y <= maxY + 150) { applyBaseDamage(attacker.team, damage); }
    for (let tid in State.players) { 
        let t = State.players[tid]; 
        if (!t.isDead && tid !== attacker.id && t.team !== attacker.team && t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY) { 
            let actualDamage = damage * (1 - (t.defense || 0)); t.hp -= actualDamage; emitDamageText(t.x, t.y, actualDamage); 
            if (t.hp <= 0) checkPlayerDeath(t, attacker.id); else io.to(tid).emit('bossHit', { damage: actualDamage, dir: Math.sign(kb), kb: kb }); 
        } 
    }
    if (State.monster.hp > 0 && State.monster.x >= minX - State.monster.radius && State.monster.x <= maxX + State.monster.radius && State.monster.y >= minY - State.monster.radius && State.monster.y <= maxY + State.monster.radius) { 
        State.monster.hp -= damage; State.monster.knockbackForce += kb * 0.3; State.monster.targetId = attacker.id; State.monster.state = 'chase'; emitDamageText(State.monster.x, State.monster.y, damage); 
        if (State.monster.hp <= 0) killMonster(attacker.id);
    }
    State.okras.forEach(ok => { 
        if (ok.hp > 0 && ok.x >= minX - ok.radius && ok.x <= maxX + ok.radius && ok.y >= minY - ok.radius && ok.y <= maxY + ok.radius) { 
            ok.hp -= damage; ok.knockbackForce += kb; ok.targetId = attacker.id; ok.state = 'chase'; emitDamageText(ok.x, ok.y, damage); 
            if (ok.hp <= 0) killOkra(ok, attacker.id);
        } 
    });
}

function applyIceAge(attacker, cx, cy, radius, damage, freezeDuration) {
    let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
    let hasAokiji = attacker.hasAokiji; 

    if (enemyBase && enemyBase.hp > 0 && Math.hypot(cx - enemyBase.x, cy - enemyBase.y) < radius + 150) { applyBaseDamage(attacker.team, damage); }
    for (let tid in State.players) {
        if (tid !== attacker.id && State.players[tid].team !== attacker.team) {
            let t = State.players[tid];
            if (!t.isDead && Math.hypot(cx - t.x, cy - t.y) < radius) {
                let actualDamage = damage * (1 - (t.defense || 0)); t.hp -= actualDamage; emitDamageText(t.x, t.y, actualDamage);
                t.frozenUntil = Math.max(t.frozenUntil || 0, Date.now() + freezeDuration);
                if (hasAokiji) { 
                    t.skillFreezeUntil = Math.max(t.skillFreezeUntil || 0, Date.now() + 5000); 
                    io.emit('actionEffect', { type: 'awaken_icicles', x: t.x, y: t.y, life: 60, maxLife: 60 }); 
                }
                if (t.hp <= 0) checkPlayerDeath(t, attacker.id); else { io.to(tid).emit('takeDamage', actualDamage); io.emit('syncPlayerFull', t); }
            }
        }
    }
    if (State.monster.hp > 0 && Math.hypot(cx - State.monster.x, cy - State.monster.y) < radius + State.monster.radius) {
        State.monster.hp -= damage; State.monster.targetId = attacker.id; State.monster.state = 'chase'; emitDamageText(State.monster.x, State.monster.y, damage);
        State.monster.frozenUntil = Math.max(State.monster.frozenUntil || 0, Date.now() + freezeDuration);
        if (hasAokiji) { 
            State.monster.skillFreezeUntil = Math.max(State.monster.skillFreezeUntil || 0, Date.now() + 5000); 
            io.emit('actionEffect', { type: 'awaken_icicles', x: State.monster.x, y: State.monster.y, life: 60, maxLife: 60 }); 
        }
        if (State.monster.hp <= 0) killMonster(attacker.id);
    }
    State.okras.forEach(ok => {
        if (ok.hp > 0 && Math.hypot(cx - ok.x, cy - ok.y) < radius + ok.radius) {
            ok.hp -= damage; ok.targetId = attacker.id; ok.state = 'chase'; emitDamageText(ok.x, ok.y, damage);
            ok.frozenUntil = Math.max(ok.frozenUntil || 0, Date.now() + freezeDuration);
            if (hasAokiji) { 
                ok.skillFreezeUntil = Math.max(ok.skillFreezeUntil || 0, Date.now() + 5000); 
                io.emit('actionEffect', { type: 'awaken_icicles', x: ok.x, y: ok.y, life: 60, maxLife: 60 }); 
            }
            if (ok.hp <= 0) killOkra(ok, attacker.id);
        }
    });
}

const serverContext = {
    get io() { return io; }, get Skills() { return Skills; }, get Items() { return Items; }, get Characters() { return Characters; },
    State, compressors, CharLogic,
    getPlayers: () => State.players, getMonster: () => State.monster, getOkras: () => State.okras,
    applyAoEDamage, applyBoxDamage, applyIceAge, emitDamageText, checkPlayerDeath, gainXp,
    addShockwave: (sw) => State.shockwaves.push(sw), addProjectile: (proj) => State.projectiles.push(proj),
    addMagma: (m) => State.magmas.push(m), addMantleBolt: (b) => State.mantleBolts.push(b), addBurn, clearBurns, processBurns,
    getNextProjId: () => State.projIdCounter++, recalcStats, killMonster, killOkra, applyBaseDamage, tryGoldenDrop, rerollOkraGrade
};

function tryReconnect(socket, sessionId) {
    if (!State.gameStarted || !sessionId) return false;

    let existingOldId = null;
    for (let pid in State.players) {
        if (State.players[pid].sessionId === sessionId && State.players[pid].disconnected) { existingOldId = pid; break; }
    }
    if (!existingOldId) return false;

    let p = State.players[existingOldId]; delete State.players[existingOldId];
    p.id = socket.id; p.disconnected = false; State.players[socket.id] = p;
    if (State.monster.targetId === existingOldId) State.monster.targetId = null;
    State.okras.forEach(ok => { if (ok.targetId === existingOldId) ok.targetId = null; });
    State.detectors.forEach(d => { if (d.ownerId === existingOldId) { d.ownerId = socket.id; d.id = 'd_' + socket.id; } });
    State.maguBombs.forEach(b => { if (b.ownerId === existingOldId) b.ownerId = socket.id; if (b.targetId === existingOldId) b.targetId = socket.id; });
    State.justiceBombs.forEach(b => { if (b.ownerId === existingOldId) b.ownerId = socket.id; if (b.targetId === existingOldId) b.targetId = socket.id; });
    State.giantPartisanQueue.forEach(q => { if (q.ownerId === existingOldId) q.ownerId = socket.id; if (q.targetId === existingOldId) q.targetId = socket.id; });
    State.mantleBolts.forEach(b => { if (b.ownerId === existingOldId) b.ownerId = socket.id; });
    
    let oldBurns = State.burnMap.get(existingOldId); if (oldBurns) { State.burnMap.set(socket.id, oldBurns); State.burnMap.delete(existingOldId); }
    for (let [key, stacks] of State.burnMap) { stacks.forEach(st => { if (st.ownerId === existingOldId) st.ownerId = socket.id; }); }

    socket.emit('reconnectSuccess', {
        players: State.players, bases: State.bases, detectors: State.detectors,
        teamStorages: State.teamStorages, myPlayer: p,
        monster: State.monster, okras: State.okras
    });
    io.emit('playerLeft', existingOldId); io.emit('syncPlayerFull', p);
    return true;
}

io.on('connection', (socket) => {
    ShopManager.registerEvents(socket, serverContext);

    socket.on('attemptReconnect', (data) => {
        let sessionId = (data && data.sessionId) ? data.sessionId : null;
        if (!tryReconnect(socket, sessionId)) socket.emit('reconnectUnavailable');
    });

    socket.on('joinLobby', (data) => {
        let nick = typeof data === 'string' ? data : data.nickname; 
        let charType = typeof data === 'string' ? 'PARK' : (data.character || 'PARK');
        let sessionId = data.sessionId || null;

        if (State.gameStarted) { 
            if (tryReconnect(socket, sessionId)) return;
            socket.emit('joinFail', '이미 게임이 진행 중입니다.'); return;
        }

        if (Object.keys(State.players).length >= 6) { socket.emit('joinFail', '로비가 가득 찼습니다.'); return; }
        if (!State.masterId) State.masterId = socket.id;

        let bCount = 0; let rCount = 0; for(let id in State.players) { if(State.players[id].team === 1) bCount++; else rCount++; }
        let assignedTeam = (bCount <= rCount) ? 1 : 2;

        State.players[socket.id] = {
            id: socket.id, nickname: nick, characterType: charType, team: assignedTeam, sessionId: sessionId, disconnected: false,
            x: assignedTeam === 1 ? 12800 : 19200, y: 1955, hp: Characters[charType] ? Characters[charType].hp : 3000, maxHp: Characters[charType] ? Characters[charType].hp : 3000, gold: 100000,
            level: 0, xp: 0, maxXp: 100, baseDamage: Characters[charType] ? Characters[charType].baseDamage : 50, speedMult: Characters[charType] ? Characters[charType].speedMult : 1.0, 
            attackSpeedMult: 1.0, bonusDamage: 0, defense: 0, hpRegen: 0, hasJokbal: false, hasDaluFengwei: false, hasJadam: false, hasPepsiArt: false, hasPika: false, hasHie: false, hasMagu: false, hasJusticeCoat: false,
            hasKizaru: false, hasAokiji: false, hasAkainu: false, hasGoro: false, hasArkMaxim: false, hasGodEnel: false, skillFreezeUntil: 0,
            inventory: [], equippedUids: [], seolgonnyakCount: 0, orbitSpheres: 0, orbitSpeedMult: 1.0, frozenUntil: 0, electrocutedUntil: 0, lastRegenTick: 0, isDead: false, isCasting: false, skill2EndTime: 0,
            skill3Active: false, skill3EndTime: 0, skill3DirX: 1, skill3DirY: 0, skill3LastFire: 0, yataActive: false, yataPath: null, yataStartTime: 0, yataHitIds: [], yataLastHitScan: 0,
            iceAgeActive: false, iceAgeCastEnd: 0, partisanQueue: 0, partisanFired: 0, partisanDir: 1, partisanNextFire: 0, volcanoActive: false, volcanoX: 0, volcanoStart: 0, volcanoEnd: 0, volcanoNextSpawn: 0, burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0,
            elThorActive: false, elThorStart: 0, elThorEnd: 0, elThorDirX: 1, elThorDirY: 0, elThorNextTick: 0,
            mantleActive: false, mantleDir: 1, mantleCenterX: 0, mantleStart: 0, mantleEnd: 0, mantleNextSpawn: 0, mantleFired: 0,
            raigoActive: false, raigoDir: 1, raigoCenterX: 0, raigoTelegraphEnd: 0, raigoDropped: false, raigoCastEnd: 0, raigoNextTick: 0
        };
        io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId });
    });

    socket.on('toggleTeam', (targetId) => { 
        if (State.masterId !== socket.id) return; 
        if (State.players[targetId]) { State.players[targetId].team = State.players[targetId].team === 1 ? 2 : 1; State.players[targetId].x = State.players[targetId].team === 1 ? 12800 : 19200; io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId }); } 
    });

    socket.on('startGame', () => { 
        if (State.masterId !== socket.id || Object.keys(State.players).length === 0) return; 
        compressors.monsterDelta.snapshots.clear(); compressors.okraDelta.snapshots.clear(); compressors.playerDelta.snapshots.clear();
        State.gameStarted = true; io.emit('gameStartSign', State.players); io.emit('syncDetectors', State.detectors); io.emit('syncTeamStorage', State.teamStorages); 
    });

    socket.on('playerMove', (data) => {
        let p = State.players[socket.id];
        if (p && !p.isDead) { 
            if (Date.now() - (p.lastRespawn || 0) < 500) return;
            if (p.isCasting && (p.characterType === 'BORSALINO' || p.iceAgeActive || p.elThorActive)) return;
            p.x = data.x; p.y = data.y;
            let pDelta = compressors.playerDelta.getDelta(socket.id, p); if (pDelta) socket.broadcast.emit('enemyUpdate', pDelta);
        }
    });

    socket.on('skill3Aim', (data) => { let p = State.players[socket.id]; if (p && !p.isDead && p.skill3Active && p.characterType === 'BORSALINO') { if (data.dirX !== 0 || data.dirY !== 0) { p.skill3DirX = data.dirX; p.skill3DirY = data.dirY; } } });

    socket.on('borsLightDash', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead || p.characterType !== 'BORSALINO') return;
        let dir = (data && data.dir) || 1;
        io.emit('borsLightDash', { id: socket.id, dir: dir, duration: 220 });

        let minX = dir === 1 ? p.x : p.x - 450;
        let maxX = dir === 1 ? p.x + 450 : p.x;
        applyBoxDamage(p, minX, maxX, p.y - 70, p.y + 70, 70, 0);
    });

    socket.on('useSkill', (data) => { let p = State.players[socket.id]; if (!p || p.isDead) return; let logic = CharLogic[p.characterType]; if (logic && logic.useSkill) logic.useSkill(p, data, serverContext); });

    socket.on('landSkill1', (data) => { let p = State.players[socket.id]; if (!p || p.isDead) return; let logic = CharLogic[p.characterType]; if (logic && logic.landSkill1) logic.landSkill1(p, data, serverContext); });

    socket.on('action', (actionData) => {
        if (!State.gameStarted) return;
        let attacker = State.players[socket.id]; if (!attacker || attacker.isDead || attacker.isCasting) return;

        if (actionData.type === 'thunder_bolt') {
            io.emit('actionEffect', { id: socket.id, type: actionData.type, x: actionData.x, y: actionData.y, dir: actionData.dir, life: actionData.lifeFrames, maxLife: actionData.lifeFrames });
            let boltDamage = attacker.baseDamage + attacker.bonusDamage; 
            let dir = actionData.dir || 1;
            State.projectiles.push({
                id: State.projIdCounter++, team: attacker.team, type: 'thunder_bolt', ownerId: socket.id,
                x: attacker.x + (dir * 60), y: attacker.y - 20,
                vx: dir * 40, vy: 0,
                life: 45, damage: boltDamage, hitR: 45, edgeR: 20, canHitBase: true, piercing: false
            });
            return;
        }
        
        io.emit('actionEffect', { id: socket.id, type: actionData.type, x: actionData.x, y: actionData.y, dir: actionData.dir, life: actionData.lifeFrames, maxLife: actionData.lifeFrames });
        
        let myDamage = attacker.baseDamage + attacker.bonusDamage; 
        let kb = (['BORSALINO', 'KUZAN', 'SAKAZUKI', 'ENEL'].includes(attacker.characterType)) ? 0 : (actionData.dir * 15);
        let isKuzan = attacker.characterType === 'KUZAN';
        let isBorsalino = attacker.characterType === 'BORSALINO';

        let hitRadius = isBorsalino ? 165 : 105;
        let pveHitRadius = isBorsalino ? 120 : 60;

        let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
        if (enemyBase && Math.hypot(actionData.x - enemyBase.x, actionData.y - enemyBase.y) < hitRadius + 45) { applyBaseDamage(attacker.team, myDamage); }

        for (let tid in State.players) {
            if (tid !== socket.id && State.players[tid].team !== attacker.team) {
                let t = State.players[tid];
                if (!t.isDead && Math.hypot(actionData.x - t.x, actionData.y - t.y) < hitRadius) {
                    let actualDamage = myDamage * (1 - (t.defense || 0)); t.hp -= actualDamage; emitDamageText(t.x, t.y, actualDamage);
                    if (t.hp <= 0) checkPlayerDeath(t, socket.id); else io.to(tid).emit('takeDamage', actualDamage); 
                    if (attacker.characterType === 'SAKAZUKI') addBurn(tid, t, 20, 2000, attacker.id);
                    if (t.hp > 0) {
                        let freezeChance = 0;
                        if (isKuzan) freezeChance += 0.06;
                        if (attacker.hasJokbal) freezeChance += 0.06;
                        if (freezeChance > 0 && Math.random() < freezeChance) {
                            t.frozenUntil = Math.max(t.frozenUntil || 0, Date.now() + 1000);
                            io.emit('syncPlayerFull', t);
                        }
                    }
                }
            }
        }
        if (State.monster.hp > 0 && Math.hypot(actionData.x - State.monster.x, actionData.y - State.monster.y) < pveHitRadius + State.monster.radius) {
            State.monster.hp -= myDamage; State.monster.targetId = socket.id; State.monster.state = 'chase'; State.monster.knockbackForce += kb * 0.3; emitDamageText(State.monster.x, State.monster.y, myDamage);
            
            let freezeChance = 0;
            if (isKuzan) freezeChance += 0.06;
            if (attacker.hasJokbal) freezeChance += 0.06;
            if (freezeChance > 0 && Math.random() < freezeChance) {
                State.monster.frozenUntil = Math.max(State.monster.frozenUntil || 0, Date.now() + 1000);
            }

            if (attacker.characterType === 'SAKAZUKI') addBurn('monster', State.monster, 20, 2000, attacker.id);
            if (State.monster.hp <= 0) killMonster(socket.id);
        }
        State.okras.forEach(ok => {
            if (ok.hp > 0 && Math.hypot(actionData.x - ok.x, actionData.y - ok.y) < pveHitRadius + ok.radius) {
                ok.hp -= myDamage; ok.targetId = socket.id; ok.state = 'chase'; ok.knockbackForce += kb; emitDamageText(ok.x, ok.y, myDamage);
                
                let freezeChance = 0;
                if (isKuzan) freezeChance += 0.06;
                if (attacker.hasJokbal) freezeChance += 0.06;
                if (freezeChance > 0 && Math.random() < freezeChance) {
                    ok.frozenUntil = Math.max(ok.frozenUntil || 0, Date.now() + 1000);
                }

                if (attacker.characterType === 'SAKAZUKI') addBurn('okra_'+ok.id, ok, 20, 2000, attacker.id);
                if (ok.hp <= 0) killOkra(ok, socket.id);
            }
        });
    });

    socket.on('disconnect', () => { 
        if (State.players[socket.id]) { 
            if (State.gameStarted) { State.players[socket.id].disconnected = true; State.players[socket.id].disconnectTime = Date.now(); } 
            else { clearBurns(socket.id, State.players[socket.id]); delete State.players[socket.id]; compressors.playerDelta.remove(socket.id); io.emit('playerLeft', socket.id); }
        }
        let remainingPlayers = Object.keys(State.players).filter(pid => !State.players[pid].disconnected);
        if (remainingPlayers.length === 0) { resetGame(); } else if (socket.id === State.masterId) { State.masterId = remainingPlayers[0]; io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId }); }
    });
});

setInterval(() => GameLoop.update(serverContext), 1000 / 60);

http.listen(process.env.PORT || 3000, () => { console.log('서버 가동 완료'); });