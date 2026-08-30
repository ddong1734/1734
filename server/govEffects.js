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
const SPAWN_MS = 180000;                // 3분
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
        team: team, x: base.x + side * 330, y: 1850,
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

/** 🤖 파시피스타 출격 */
function spawnPacifistas(team, gb, now, io) {
    if (!gb) return;
    const n1 = gb.pacifista || 0, n3 = gb.pacifista3 || 0;
    if (!n1 && !n3) return;

    if (!State.pacifSpawn[team]) State.pacifSpawn[team] = now + SPAWN_MS;
    if (now < State.pacifSpawn[team]) return;
    State.pacifSpawn[team] = now + SPAWN_MS;

    const base = State.bases[team];
    const mk = (isMk3) => {
        const hp = 4000;                         // 해루석 오크라와 같다
        const u = {
            id: 'pf' + Math.random().toString(36).slice(2, 9),
            team: team, isMk3: !!isMk3,
            x: base.x + (team === 1 ? 220 : -220), y: 1955,
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
        io.emit('pacifistaLaser', {
            id: u.id, x: u.x, y: u.y, tx: foe.x, ty: foe.y - 60,
            isMk3: u.isMk3, damage: u.damage
        });
        if (typeof ctx.applyBaseDamage === 'function') {
            ctx.applyBaseDamage(u.team, u.damage);
        }
        changed = true;
    }
    if (changed) io.emit('syncPacifistas', State.pacifistas);
}

function process(now, ctx) {
    const io = ctx.io;
    [1, 2].forEach(function (team) {
        const gb = bonusOf(team);
        syncCannon(team, gb, io);
        syncNexus(team, gb, now, io);
        spawnPacifistas(team, gb, now, io);
    });
    processPacifistas(now, ctx);
}

module.exports = { process, PACIF_RANGE, SPAWN_MS };
