// 파일명: server/govEffects.js
// ============================================================================
// 🏛️ 세계정부 스킬 웹 — 매 프레임 효과
//
//   · 💣 [해군본부]  세계정부 바깥쪽에 대포를 세운다
//   · 🏛️ [전군총수]  넥서스 최대 체력 3배 · 초당 100 회복
//   · 🤖 [파시피스타] 3분마다 공성 유닛을 내보낸다
//   · 🤖 [마크 Ⅲ]    더 크고 버블 보호막을 두른 유닛
//
//   ⚠️ 파시피스타는 '공성 유닛' 이다.
//      적이나 몬스터가 사거리에 들어와도 절대 공격하지 않고,
//      오직 상대 넥서스만 노린다.
// ============================================================================

const S = require('./state.js');
const State = S.State;

let GT = null;
try { GT = require('../govTree.js'); } catch (e) { }

const TURRET_RANGE = 1200;              // 기본 포탑 사거리
const PACIF_RANGE = TURRET_RANGE / 2;   // 파시피스타는 그 절반
const SPAWN_MS = 150000;                // 2분 30초
const HINBEOM_R = 90;                   // 박힌범 반지름 기준

/** 이 팀의 세계정부 보너스 (세계정부가 아니면 null) */
function bonusOf(team) {
    if (!GT || !State.govTree) return null;
    const b = State.bases[team];
    if (!b || b.govType !== 'wg') return null;
    return GT.bonusOf(State.govTree[team]);
}

/** 💣 대포 — 세계정부 '바깥쪽' 에 선다 (블루는 왼쪽, 레드는 오른쪽) */
function syncCannon(team, gb, io) {
    const has = State.turrets.some(t => t.isCannon && t.team === team);
    if (!gb || !gb.cannon) {
        if (has) {
            State.turrets = State.turrets.filter(t => !(t.isCannon && t.team === team));
            io.emit('syncTurrets', State.turrets);
        }
        return;
    }
    if (has) return;

    const base = State.bases[team];
    // 블루(1팀)는 넥서스 왼쪽, 레드(2팀)는 오른쪽 — 각자 진영 바깥쪽이다
    const side = (team === 1) ? -1 : 1;
    State.turrets.push({
        // 🛒 상점(11800/20200) 과 🏛️ 넥서스(12250/19750) 사이 한가운데에 둔다
        team: team, x: base.x + side * 225, y: 1850,
        range: TURRET_RANGE,
        damage: 90,              // 기본 포탑(30) 의 3배
        lastShot: 0,
        isCannon: true
    });
    io.emit('syncTurrets', State.turrets);
}

/** 🏛️ 넥서스 — 최대 체력 배수와 초당 회복 */
function syncNexus(team, gb, now, io) {
    const b = State.bases[team];
    if (!b) return;
    const baseMax = 20000;
    const want = Math.round(baseMax * ((gb && gb.nexusHpMult) ? gb.nexusHpMult : 1));

    if (b.maxHp !== want) {
        const add = want - b.maxHp;
        b.maxHp = want;
        if (add > 0) b.hp = Math.min(b.maxHp, b.hp + add);   // 늘어난 만큼 채워 준다
        else b.hp = Math.min(b.hp, b.maxHp);
        io.emit('syncBases', State.bases);
    }

    // 초당 회복
    const rg = (gb && gb.nexusRegen) ? gb.nexusRegen : 0;
    if (rg > 0 && b.hp > 0 && b.hp < b.maxHp) {
        if (!b._regenAt) b._regenAt = now;
        if (now - b._regenAt >= 1000) {
            b._regenAt = now;
            b.hp = Math.min(b.maxHp, b.hp + rg);
            io.emit('syncBases', State.bases);
        }
    }
}

/**
 * 💚 [구/뉴 마린 포드] 세계정부를 감싸는 회복 돔.
 *    돔 안의 아군은 1초마다 회복한다.
 */
const HEAL_ZONE_R = 480;   // 세계정부를 덮는 크기

let _healAt = 0;
function processHealZone(now, ctx) {
    if (now - _healAt < 1000) return;
    _healAt = now;
    const io = ctx.io;
    [1, 2].forEach(function (team) {
        const gb = bonusOf(team);
        if (!gb || !gb.healZone) return;
        const base = State.bases[team];
        if (!base) return;
        for (const pid in State.players) {
            const p = State.players[pid];
            if (!p || p.isDead || p.team !== team) continue;
            if (Math.hypot(p.x - base.x, p.y - base.y) > HEAL_ZONE_R) continue;
            if (p.hp >= p.maxHp) continue;
            p.hp = Math.min(p.maxHp, p.hp + gb.healZone);
            io.to(pid).emit('heal', gb.healZone);
            io.emit('syncPlayerFull', p);
        }
    });
}

/** 🤖 파시피스타 출격 */
function spawnPacifistas(team, gb, now, io) {
    if (!gb) return;
    // 🤖 마크 Ⅲ 를 열면 상위 기종만 나온다 (기존 파시피스타는 더 이상 출격하지 않는다)
    const n3 = gb.pacifista3 || 0;
    const n1 = n3 > 0 ? 0 : (gb.pacifista || 0);
    if (!n1 && !n3) return;

    // 🛟 [안전장치] 타이머가 없거나, 이미 지났거나, 3분보다 먼 미래면 다시 맞춘다.
    //    (판이 바뀌었는데 옛 값이 남아 곧바로 소환되던 문제를 막는다)
    const due = State.pacifSpawn[team] || 0;
    if (!due || due - now > SPAWN_MS) { State.pacifSpawn[team] = now + SPAWN_MS; return; }
    if (now < due) return;
    State.pacifSpawn[team] = now + SPAWN_MS;

    const base = State.bases[team];
    const mk = (isMk3) => {
        const hp = 4000;                         // 해루석 오크라와 같다
        const u = {
            id: 'pf' + Math.random().toString(36).slice(2, 9),
            team: team, isMk3: !!isMk3,
            x: base.x + (team === 1 ? 220 : -220),
            // 🦶 발이 땅에 닿도록 반지름만큼 띄운다 (예전엔 땅에 묻혀 보였다)
            y: 2000 - Math.round(HINBEOM_R * (isMk3 ? 0.95 : 0.8)) - 30,
            hp: hp, maxHp: hp,
            // 🫧 마크 Ⅲ 는 자기 체력의 절반짜리 버블 보호막을 두른다
            shield: isMk3 ? Math.round(hp / 2) : 0,
            maxShield: isMk3 ? Math.round(hp / 2) : 0,
            radius: Math.round(HINBEOM_R * (isMk3 ? 0.95 : 0.8)),
            damage: isMk3 ? 500 : 300,
            range: PACIF_RANGE,
            speed: 1.1,                          // 느릿하게 나아간다
            lastShot: 0
        };
        State.pacifistas.push(u);
    };
    for (let i = 0; i < n1; i++) mk(false);
    for (let i = 0; i < n3; i++) mk(true);
    io.emit('syncPacifistas', State.pacifistas);
}

/** 🤖 파시피스타 이동·사격 — 오직 적 넥서스만 노린다 */
function processPacifistas(now, ctx) {
    const io = ctx.io;
    if (!State.pacifistas.length) return;
    let changed = false;

    for (let i = State.pacifistas.length - 1; i >= 0; i--) {
        const u = State.pacifistas[i];

        if (u.hp <= 0) {
            io.emit('pacifistaDown', { id: u.id, x: u.x, y: u.y, isMk3: u.isMk3 });
            State.pacifistas.splice(i, 1);
            changed = true;
            continue;
        }

        const foe = State.bases[u.team === 1 ? 2 : 1];
        if (!foe || foe.hp <= 0) continue;

        const d = Math.hypot(foe.x - u.x, foe.y - u.y);
        if (d > u.range) {
            // 아직 멀다 — 적 넥서스 쪽으로 천천히 나아간다
            u.x += (foe.x > u.x ? u.speed : -u.speed);
            changed = true;
            continue;
        }

        // 사거리 안 — 3초에 한 번 빛 레이저를 쏜다
        if (now - u.lastShot < 3000) continue;
        u.lastShot = now;
        // 👄 레이저는 입(얼굴)에서 나간다
        io.emit('pacifistaLaser', {
            id: u.id, x: u.x, y: u.y - Math.round(u.radius * 0.72), tx: foe.x, ty: foe.y - 60,
            isMk3: u.isMk3, damage: u.damage
        });
        if (typeof ctx.applyBaseDamage === 'function') {
            ctx.applyBaseDamage(u.team, u.damage);
        }
        changed = true;
    }
    if (changed) io.emit('syncPacifistas', State.pacifistas);
}

let _cdAt = 0;

function process(now, ctx) {
    const io = ctx.io;
    [1, 2].forEach(function (team) {
        const gb = bonusOf(team);
        syncCannon(team, gb, io);
        syncNexus(team, gb, now, io);
        spawnPacifistas(team, gb, now, io);
    });
    processPacifistas(now, ctx);
    // 💚 회복 돔
    processHealZone(now, ctx);
    // ⛩️ 정의의 문
    processGateCasts(now, ctx);
    // 💰🎯 천상금 · 인간 사냥
    processTax(now, ctx);
    // ✴️ 어비스(오망성)
    processAbyssCasts(now, ctx);
    // ⚔️ 칠무해 · 세라핌
    [1, 2].forEach(function (team) { syncWarlord(team, bonusOf(team), now, io); });
    processWarlords(now, ctx);
    // 🚢 버스터 콜
    processBusterQueue(now, io);
    processWarships(now, ctx);

    // ⏱️ 출격까지 남은 시간을 1초에 한 번 알려 준다 (세계정부 위에 표시된다)
    if (now - _cdAt >= 1000) {
        _cdAt = now;
        const cd = {};
        [1, 2].forEach(function (team) {
            const gb = bonusOf(team);
            const on = gb && ((gb.pacifista3 || 0) > 0 || (gb.pacifista || 0) > 0);
            cd[team] = on ? Math.max(0, (State.pacifSpawn[team] || 0) - now) : 0;
        });
        // ⚔️ 칠무해 부활까지 남은 시간
        const wl = {};
        [1, 2].forEach(function (team) {
            wl[team] = Math.max(0, (State.warlordRespawn[team] || 0) - now);
        });
        // 🚢✴️ 버스터 콜 · 어비스 남은 쿨타임도 함께 보낸다 (둘 다 팀 공용)
        const bc = {}, ab = {};
        [1, 2].forEach(function (team) {
            bc[team] = Math.max(0, (State.busterCd[team] || 0) - now);
            ab[team] = Math.max(0, (State.abyssCd[team] || 0) - now);
        });
        io.emit('pacifCountdown', { spawn: cd, warlord: wl, buster: bc, abyss: ab });
    }
}

module.exports = { process, PACIF_RANGE, SPAWN_MS, HEAL_ZONE_R };

// ============================================================================
// ⚔️ 칠무해 / 👼 세라핌 · 🚢 버스터 콜
// ============================================================================

const WARLORD_RANGE = TURRET_RANGE;     // 포탑 사거리와 같다
const WARLORD_RESPAWN = 240000;         // 4분
const BUSTER_CD = 540000;               // 9분
const SHIP_GAP = 3000;                  // 3초 간격
const SHIP_COUNT = 10;

/** ⚔️ 칠무해 · 세라핌 — 팀마다 1기 */
function syncWarlord(team, gb, now, io) {
    const want = (gb && gb.seraph > 0) ? 'seraph' : ((gb && gb.warlord > 0) ? 'warlord' : null);
    const cur = State.warlords[team];

    if (!want) {
        if (cur) { delete State.warlords[team]; io.emit('syncWarlords', State.warlords); }
        return;
    }
    // 👼 세라핌을 열면 칠무해는 사라지고 세라핌으로 바뀐다
    if (cur && cur.kind !== want) { delete State.warlords[team]; }

    if (!State.warlords[team]) {
        if (State.warlordRespawn[team] && now < State.warlordRespawn[team]) return;
        const base = State.bases[team];
        State.warlords[team] = {
            id: 'wl' + team, team: team, kind: want,
            x: base.x + (team === 1 ? 190 : -190), y: 1955,
            homeX: base.x + (team === 1 ? 190 : -190),
            hp: 2500, maxHp: 2500,
            infinite: (want === 'seraph'),      // 👼 세라핌은 체력이 닳지 않는다
            regen: (want === 'seraph') ? 0 : 150,
            damage: 150, speedMult: 1.5, atkCool: 500,
            radius: 58, range: WARLORD_RANGE,
            lastShot: 0, lastRegen: now, targetId: null
        };
        State.warlordRespawn[team] = 0;
        io.emit('syncWarlords', State.warlords);
    }
}

/** ⚔️ 칠무해 이동·공격 — 범위 안 적을 쫓고, 벗어나면 제자리로 */
function processWarlords(now, ctx) {
    const io = ctx.io;
    let changed = false;

    for (const team in State.warlords) {
        const w = State.warlords[team];
        if (!w) continue;

        // 👼 세라핌은 체력이 무한이라 죽지 않는다
        if (w.infinite) w.hp = w.maxHp;
        else if (w.regen > 0 && now - w.lastRegen >= 1000) {
            w.lastRegen = now;
            w.hp = Math.min(w.maxHp, w.hp + w.regen);
            changed = true;
        }

        if (!w.infinite && w.hp <= 0) {
            io.emit('warlordDown', { team: w.team, x: w.x, y: w.y, kind: w.kind });
            delete State.warlords[team];
            State.warlordRespawn[team] = now + WARLORD_RESPAWN;
            io.emit('syncWarlords', State.warlords);
            continue;
        }

        // 가장 가까운 적을 찾는다 (범위 안에서만)
        let tgt = null, best = w.range;
        for (const pid in State.players) {
            const p = State.players[pid];
            if (!p || p.isDead || p.team === w.team) continue;
            const d = Math.hypot(p.x - w.x, p.y - w.y);
            if (d < best) { best = d; tgt = p; }
        }

        if (!tgt) {
            // 범위에서 벗어났다 — 추적을 포기하고 제자리로 돌아간다
            const dh = w.homeX - w.x;
            if (Math.abs(dh) > 8) { w.x += Math.sign(dh) * 4.5 * w.speedMult; changed = true; }
            w.targetId = null;
            continue;
        }

        w.targetId = tgt.id;
        const dx = tgt.x - w.x;
        if (Math.abs(dx) > 70) { w.x += Math.sign(dx) * 4.5 * w.speedMult; changed = true; }
        else if (now - w.lastShot >= w.atkCool) {
            w.lastShot = now;
            io.emit('warlordStrike', { team: w.team, x: w.x, y: w.y, dir: Math.sign(dx) || 1, kind: w.kind });
            let act = w.damage * (1 - (tgt.defense || 0));
            act = S.absorbShield(tgt, act);
            tgt.hp -= act;
            if (typeof ctx.emitDamageText === 'function') ctx.emitDamageText(tgt.x, tgt.y, act);
            io.to(tgt.id).emit('takeDamage', act);
            if (tgt.hp <= 0 && typeof ctx.checkPlayerDeath === 'function') ctx.checkPlayerDeath(tgt, null);
            else io.emit('syncPlayerFull', tgt);
            changed = true;
        }
    }
    if (changed) io.emit('syncWarlords', State.warlords);
}

/** 🚢 버스터 콜 발동 — 군함 10척을 3초 간격으로 내보낸다 */
function startBusterCall(team, now, io) {
    if (State.busterCd[team] && now < State.busterCd[team]) return false;
    State.busterCd[team] = now + BUSTER_CD;
    for (let i = 0; i < SHIP_COUNT; i++) {
        State.busterQueue.push({ team: team, at: now + i * SHIP_GAP });
    }
    io.emit('busterCall', { team: team });
    return true;
}

/** 🚢 대기 중인 군함을 차례로 띄운다 */
function processBusterQueue(now, io) {
    if (!State.busterQueue.length) return;
    let spawned = false;
    for (let i = State.busterQueue.length - 1; i >= 0; i--) {
        const q = State.busterQueue[i];
        if (now < q.at) continue;
        State.busterQueue.splice(i, 1);
        const base = State.bases[q.team];
        State.warships.push({
            id: 'ws' + Math.random().toString(36).slice(2, 9),
            team: q.team,
            x: base.x + (q.team === 1 ? 150 : -150),
            // 🚢 배가 물(지면)에 잠기도록 내려 앉힌다 (예전엔 공중에 떠 보였다)
            y: 1975,
            hp: 2000, maxHp: 2000,
            radius: 138,
            range: Math.round(PACIF_RANGE * 1.35),   // 파시피스타보다 조금 넓다
            speed: 1.65,                              // 파시피스타(1.1) 의 1.5배
            lastCannon: 0, lastGun: 0
        });
        spawned = true;
    }
    if (spawned) io.emit('syncWarships', State.warships);
}

/** 🚢 군함 이동·포격 */
function processWarships(now, ctx) {
    const io = ctx.io;
    if (!State.warships.length) return;
    let changed = false;

    for (let i = State.warships.length - 1; i >= 0; i--) {
        const w = State.warships[i];
        if (w.hp <= 0) {
            io.emit('warshipDown', { id: w.id, x: w.x, y: w.y });
            State.warships.splice(i, 1);
            changed = true;
            continue;
        }

        const foe = State.bases[w.team === 1 ? 2 : 1];
        const baseIn = foe && foe.hp > 0 && Math.hypot(foe.x - w.x, foe.y - w.y) <= w.range;

        // 사거리 안 적 — 플레이어 · 파시피스타 · 군함 모두 노린다
        let tgt = null, best = w.range;
        for (const pid in State.players) {
            const p = State.players[pid];
            if (!p || p.isDead || p.team === w.team) continue;
            const d = Math.hypot(p.x - w.x, p.y - w.y);
            if (d < best) { best = d; tgt = p; }
        }
        (State.pacifistas || []).forEach(function (u) {
            if (u.hp <= 0 || u.team === w.team) return;
            const d = Math.hypot(u.x - w.x, u.y - w.y);
            if (d < best) { best = d; tgt = u; }
        });
        (State.warships || []).forEach(function (o) {
            if (o === w || o.hp <= 0 || o.team === w.team) return;
            const d = Math.hypot(o.x - w.x, o.y - w.y);
            if (d < best) { best = d; tgt = o; }
        });

        if (!baseIn && !tgt) {
            // 아무것도 없으면 적 넥서스 쪽으로 나아간다
            w.x += (foe.x > w.x ? w.speed : -w.speed);
            changed = true;
            continue;
        }

        // 🎯 넥서스가 사거리에 있으면 넥서스를 우선한다
        const aimX = baseIn ? foe.x : tgt.x;
        const aimY = baseIn ? (foe.y - 60) : tgt.y;

        // 💥 대포 — 5초마다 (배 가운데에서)
        if (now - w.lastCannon >= 5000) {
            w.lastCannon = now;
            io.emit('warshipFire', {
                id: w.id, kind: 'cannon', team: w.team,
                x: w.x, y: w.y - 30, tx: aimX, ty: aimY,
                blast: 150      // 💥 닿으면 이 반경으로 터진다
            });
            // 💥 대포알은 터지므로 착탄 지점 주변을 함께 친다
            if (baseIn && typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(w.team, 40);
            else if (tgt) {
                hitPlayer(tgt, 40, ctx);
                const BR = 150;
                for (const pid in State.players) {
                    const o = State.players[pid];
                    if (!o || o.isDead || o.team === w.team || o === tgt) continue;
                    if (Math.hypot(o.x - tgt.x, o.y - tgt.y) > BR) continue;
                    hitPlayer(o, 40, ctx);
                }
            }
            changed = true;
        }
        // 🔫 총알 — 1초마다 앞·뒤 두 곳에서
        if (now - w.lastGun >= 1000) {
            w.lastGun = now;
            const dir = (foe.x > w.x) ? 1 : -1;
            [-1, 1].forEach(function (sd) {
                io.emit('warshipFire', {
                    id: w.id, kind: 'gun', team: w.team,
                    x: w.x + sd * w.radius * 0.78, y: w.y - 8, tx: aimX, ty: aimY
                });
            });
            const dmg = 15 * 2;   // 두 곳에서 쏜다
            if (baseIn && typeof ctx.applyBaseDamage === 'function') ctx.applyBaseDamage(w.team, dmg);
            else if (tgt) hitPlayer(tgt, dmg, ctx);
            changed = true;
        }
    }
    if (changed) io.emit('syncWarships', State.warships);
}

function hitPlayer(t, dmg, ctx) {
    let act = dmg * (1 - (t.defense || 0));
    act = S.absorbShield(t, act);
    t.hp -= act;
    if (typeof ctx.emitDamageText === 'function') ctx.emitDamageText(t.x, t.y, act);
    // 🤖🚢 파시피스타·군함은 플레이어가 아니라 개별 통지가 없다
    const isPlayer = !!(t.id && State.players[t.id] === t);
    if (!isPlayer) { if (t.hp < 0) t.hp = 0; return; }
    ctx.io.to(t.id).emit('takeDamage', act);
    if (t.hp <= 0 && typeof ctx.checkPlayerDeath === 'function') ctx.checkPlayerDeath(t, null);
    else ctx.io.emit('syncPlayerFull', t);
}

module.exports.syncWarlord = syncWarlord;
module.exports.processWarlords = processWarlords;
module.exports.startBusterCall = startBusterCall;
module.exports.processBusterQueue = processBusterQueue;
module.exports.processWarships = processWarships;
module.exports.WARLORD_RESPAWN = WARLORD_RESPAWN;
module.exports.BUSTER_CD = BUSTER_CD;

// ============================================================================
// ⛩️ 정의의 문 — 5초를 버티면 아군 세계정부로 순간이동한다
// ============================================================================
const GATE_CD = 200000;   // 쿨타임 200초

function processGateCasts(now, ctx) {
    const io = ctx.io;
    for (const id in State.gateCasts) {
        const g = State.gateCasts[id];
        const p = State.players[id];

        /** ⏱️ 깨지면 쿨타임 200초가 돈다 */
        const breakCast = () => {
            delete State.gateCasts[id];
            if (p) { p.gateCdEnd = now + GATE_CD; io.emit('syncPlayerFull', p); }
            // 📡 좌표를 함께 보내야 '남의 화면' 에서도 깨지는 연출을 그릴 수 있다
            io.emit('gateCastEnd', {
                id: id, done: false, cd: true,
                x: p ? p.x : g.x, y: p ? p.y : g.y
            });
        };

        // 시전자가 사라졌거나 죽으면 취소된다
        if (!p || p.isDead) { breakCast(); continue; }
        // 🚶 조금이라도 움직였으면 취소 (점프도 좌표가 바뀐다)
        if (Math.hypot(p.x - g.x, p.y - g.y) > 24) { breakCast(); continue; }
        // 🩸 체력이 줄었으면 피해를 입은 것이다
        if (g.hp !== undefined && p.hp < g.hp) { breakCast(); continue; }
        g.hp = p.hp;
        if (now < g.endAt) continue;

        // ✨ 5초를 버텼다 — 아군 세계정부로 보낸다
        const base = State.bases[p.team];
        delete State.gateCasts[id];
        p.gateCdEnd = now + GATE_CD;
        p.x = base.x;
        p.y = 1955;
        p.knockbackForce = 0;
        p.vy = 0;
        io.emit('gateCastEnd', { id: id, done: true, x: p.x, y: p.y });
        io.emit('syncPlayerFull', p);
    }
}

module.exports.processGateCasts = processGateCasts;
module.exports.GATE_CD = GATE_CD;

// ============================================================================
// 💰🎯 천상금 · 인간 사냥 — 30초마다 아군 전원에게 지급
//
//   ⚠️ 여기서 주는 몫은 '천룡인 5% 증가' 를 받지 않는다.
//      골드는 직접 더하고, 경험치는 gainXp(..., raw=true) 로 준다.
// ============================================================================
const TAX_INTERVAL = 30000;
let _taxAt = { 1: 0, 2: 0 };

function processTax(now, ctx) {
    const io = ctx.io;
    [1, 2].forEach(function (team) {
        const gb = bonusOf(team);
        if (!gb || (!gb.taxGold && !gb.huntXp)) { _taxAt[team] = 0; return; }
        if (!_taxAt[team]) { _taxAt[team] = now + TAX_INTERVAL; return; }
        if (now < _taxAt[team]) return;
        _taxAt[team] = now + TAX_INTERVAL;

        for (const pid in State.players) {
            const p = State.players[pid];
            if (!p || p.team !== team) continue;
            if (gb.taxGold > 0) {
                p.gold = (p.gold || 0) + gb.taxGold;      // 증가율 미적용
                io.to(pid).emit('updateGold', p.gold);
            }
            if (gb.huntXp > 0 && typeof ctx.gainXp === 'function') {
                ctx.gainXp(p, gb.huntXp, true);           // raw = 증가율 미적용
            }
        }
        if (gb.taxGold > 0 || gb.huntXp > 0) {
            io.emit('govTax', { team: team, gold: gb.taxGold || 0, xp: gb.huntXp || 0 });
        }
    });
}

module.exports.processTax = processTax;
module.exports.TAX_INTERVAL = TAX_INTERVAL;

// ============================================================================
// ✴️ 어비스(오망성) — 3초 경직 후 고른 좌표로 순간이동
//
//   · 경직 중에는 이동 · 점프 · 스킬 · 평타가 모두 막힌다
//   · 도중에 죽으면 취소된다
// ============================================================================
function processAbyssCasts(now, ctx) {
    const io = ctx.io;
    for (const id in State.abyssCasts) {
        const a = State.abyssCasts[id];
        const p = State.players[id];

        // 죽으면 취소
        if (!p || p.isDead) {
            delete State.abyssCasts[id];
            io.emit('abyssCastEnd', { id: id, done: false });
            continue;
        }
        if (now < a.endAt) continue;

        // ✨ 3초를 버텼다 — 고른 자리로 보낸다
        delete State.abyssCasts[id];
        p.x = a.tx;
        p.y = a.ty;
        p.vy = 0;
        p.knockbackForce = 0;
        io.emit('abyssCastEnd', { id: id, done: true, x: a.tx, y: a.ty });
        io.emit('syncPlayerFull', p);
    }
}

/** 🔒 경직 중인가 (이동·점프·스킬·평타 봉인) */
function isAbyssLocked(pid) {
    const a = State.abyssCasts[pid];
    return !!(a && Date.now() < a.endAt);
}

module.exports.processAbyssCasts = processAbyssCasts;
module.exports.isAbyssLocked = isAbyssLocked;
