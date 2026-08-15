// 파일명: server/bosses.js
// ============================================================================
// 👹 보스 3종(박힌범 · 검은수염 · 지저스 바제스) + 할배새끼 소환체
//    처치 / 부활 / 드롭 / 어그로 / 소환 로직을 한곳에 모았다.
//
// 🛟 [핵심 수정] 검은수염이 부활할 때 '살아 있는 바제스'를 무조건 지워버리던 버그
//    · 바제스가 살아 있으면 검은수염 귀환 포탈이 생기지 않는 설계인데,
//      부활 시점에 바제스를 강제로 삭제하면 killBurgess 가 영영 호출되지 않아
//      귀환 포탈이 절대 생성되지 않았다 → 암흑 왕좌에 영구히 갇힘(소프트락).
//    · 검은수염을 두 번 잡는 흐름에서 반드시 발생하던 문제다.
// 🛟 [안정화] 모든 setTimeout 콜백을 try-catch 로 감쌌다.
//    타이머 안에서 예외가 나면 Node 프로세스가 그대로 종료되어 게임이 통째로 멈춘다.
// 🍒 [추가] 검은수염 처치 시 50% 확률로 '체리파이'(최대체력 +500) 드롭
// ============================================================================

const C = require('./config.js');
const S = require('./state.js');
const { State, makeHinbeom, makeBlackbeard, makeBurgess, isInHinbeomArea, isInDarkArea, burgessAlive, getMinion } = S;

module.exports = (deps) => {
    const { io, emitDamageText, checkPlayerDeath, gainXp, clearBurns } = deps;
    // 🔯 법진 : 처치 스택 증가 (index.js 에서 주입)
    const addBeopjinKill = (typeof deps.addBeopjinKill === 'function') ? deps.addBeopjinKill : function () {};

    let minionIdCounter = 0;

    // ── 🎁 공통 : 아이템 드롭 ───────────────────────────────────────────────
    function giveItem(pid, itemId, msg, failMsg) {
        let p = State.players[pid];
        if (!p) return;
        if (p.inventory.length >= 20) {
            io.to(pid).emit('goldenDrop', { msg: failMsg, fail: true });
            return;
        }
        p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: itemId });
        io.to(pid).emit('goldenDrop', { msg: msg, inventory: p.inventory });
    }

    /** 처치 보상(골드 + 경험치) 공통 지급
     *  🔯 법진 : 여기를 killMinion / killHinbeom / killBlackbeard / killBurgess /
     *     killMonster / killOkra 6개 처치 함수가 모두 통과하므로,
     *     몬스터 계열 처치 스택은 이 한 곳에서 처리한다.
     *     (황금오크라도 killOkra 를 거치므로 함께 집계된다) */
    function reward(attackerId, gold, xp) {
        if (!attackerId || !State.players[attackerId]) return;
        State.players[attackerId].gold += gold;
        io.to(attackerId).emit('updateGold', State.players[attackerId].gold);
        gainXp(State.players[attackerId], xp);
        addBeopjinKill(attackerId);
    }

    // ── 🐗 할배새끼 소환체 ─────────────────────────────────────────────────
    function spawnHinbeomMinions() {
        const my = C.HINBEOM_GROUND - C.MINION_RADIUS;
        const spots = [C.HINBEOM_AREA.minX + C.MINION_MARGIN, C.HINBEOM_AREA.maxX - C.MINION_MARGIN];
        for (let i = 0; i < spots.length; i++) {
            if (C.MINION_MAX > 0 && State.hinbeomMinions.length >= C.MINION_MAX) break;
            State.hinbeomMinions.push(Object.assign({
                id: minionIdCounter++,
                x: spots[i], y: my, homeX: spots[i], radius: C.MINION_RADIUS,
                hp: C.MINION_HP, maxHp: C.MINION_HP, speed: C.MINION_SPEED,
                targetId: null, state: 'chase', lastAttack: 0, spawnedAt: Date.now()
            }, S.baseStatus()));
        }
        io.emit('minionSpawn', { xs: spots, y: my });
    }

    function despawnHinbeomMinions() {
        if (State.hinbeomMinions.length === 0) return;
        State.hinbeomMinions.forEach(m => clearBurns('minion_' + m.id, m));
        State.hinbeomMinions.length = 0;
        io.emit('syncMinions', []);
    }

    function killMinion(m, attackerId) {
        if (!m || m.state === 'dead') return;
        m.state = 'dead';
        reward(attackerId, C.MINION_GOLD, C.MINION_XP);
        if (attackerId && State.players[attackerId] && Math.random() < C.MINION_DROP_CHANCE) {
            giveItem(attackerId, C.MINION_DROP_ITEM,
                '🐗 할배새끼 오크라 획득! (최대체력 +500)',
                '인벤토리가 가득 차 할배새끼 오크라를 놓쳤습니다!');
        }
        clearBurns('minion_' + m.id, m);
        let idx = State.hinbeomMinions.indexOf(m);
        if (idx !== -1) State.hinbeomMinions.splice(idx, 1);
    }

    // ── 🥊 박힌범 ──────────────────────────────────────────────────────────
    function recordHinbeomDamage(attackerId, amount) {
        if (!attackerId || !amount || amount <= 0) return;
        if (!Number.isFinite(amount)) return;          // 🛟 NaN 누적 차단
        if (!State.players[attackerId]) return;
        const h = State.hinbeom;
        if (!h) return;
        if (!h.damageBy) h.damageBy = {};
        h.damageBy[attackerId] = (h.damageBy[attackerId] || 0) + amount;
    }

    function tryHinbeomOkraDrop() {
        const h = State.hinbeom;
        if (!h || !h.damageBy) return;
        for (let pid in h.damageBy) {
            if (h.damageBy[pid] < C.HINBEOM_DROP_DAMAGE) continue;
            if (!State.players[pid]) continue;
            if (Math.random() >= C.HINBEOM_DROP_CHANCE) continue;
            giveItem(pid, C.HINBEOM_DROP_ITEM,
                '🥊 박힌범 오크라 획득! (초당 체력 30 회복)',
                '인벤토리가 가득 차 박힌범 오크라를 놓쳤습니다!');
        }
    }

    function killHinbeom(attackerId) {
        const h = State.hinbeom;
        if (h.state === 'dead') return;

        reward(attackerId, C.HINBEOM_GOLD, C.HINBEOM_XP);
        tryHinbeomOkraDrop();
        h.damageBy = {};

        State.hinbeomPortal = {
            x: h.x, y: h.y, radius: C.PORTAL_RADIUS,
            createdAt: Date.now(), expireAt: Date.now() + C.PORTAL_DURATION
        };
        io.emit('syncHinbeomPortal', State.hinbeomPortal);

        // 🟣 25% 확률로 암흑 왕좌 포탈 생성 (15초 후 소멸)
        if (Math.random() < 0.25) {
            let px = h.x + 320;
            if (px > C.HINBEOM_AREA.maxX - 160) px = h.x - 320;
            if (px < C.HINBEOM_AREA.minX + 160) px = C.HINBEOM_AREA.minX + 160;
            State.darkPortal = {
                x: px, y: h.y, radius: C.PORTAL_RADIUS,
                createdAt: Date.now(), expireAt: Date.now() + C.DARK_PORTAL_DURATION
            };
            io.emit('syncDarkPortal', State.darkPortal);
            for (let pid in State.players) {
                if (State.players[pid].darkBanned) {
                    State.players[pid].darkBanned = false;
                    io.emit('syncPlayerFull', State.players[pid]);
                }
            }
        }

        // 🔥 25% 확률로 '저주의 왕' 포탈 생성 (15초 후 소멸)
        //    ⚠️ 암흑 왕좌 포탈과 동시에 열릴 수 있으므로 겹치지 않게 자리를 잡는다.
        //       암흑 포탈이 오른쪽(+320)에 생기면 저주 포탈은 왼쪽(-320)으로 보낸다.
        if (Math.random() < 0.25) {
            const GAP = 320;
            let cx;
            if (State.darkPortal) {
                // 암흑 포탈 반대쪽에 놓고, 그래도 가까우면 더 밀어낸다
                cx = (State.darkPortal.x >= h.x) ? (h.x - GAP) : (h.x + GAP);
                if (Math.abs(cx - State.darkPortal.x) < C.PORTAL_RADIUS * 2 + 80) {
                    cx = (State.darkPortal.x >= h.x) ? (h.x - GAP * 2) : (h.x + GAP * 2);
                }
            } else {
                cx = h.x - GAP;
            }
            if (cx > C.HINBEOM_AREA.maxX - 160) cx = C.HINBEOM_AREA.maxX - 160;
            if (cx < C.HINBEOM_AREA.minX + 160) cx = C.HINBEOM_AREA.minX + 160;

            State.cursePortal = {
                x: cx, y: h.y, radius: C.PORTAL_RADIUS,
                createdAt: Date.now(), expireAt: Date.now() + C.DARK_PORTAL_DURATION
            };
            io.emit('syncCursePortal', State.cursePortal);
        }

        h.targetId = null; h.state = 'dead';
        h.hakiBursts = []; h.hakiActiveUntil = 0; h.hakiCount = 0;
        clearBurns('hinbeom', h);
        despawnHinbeomMinions();
        io.emit('hakiEnd');

        // ✅ 이전 부활 예약 취소 + 세대 검증 (부활 중복 방지)
        if (h.respawnTimer) { clearTimeout(h.respawnTimer); h.respawnTimer = null; }
        h.deathGen = (h.deathGen || 0) + 1;
        const gen = h.deathGen;

        h.respawnTimer = setTimeout(() => {
            try {
                const hh = State.hinbeom;
                if (!hh || hh.deathGen !== gen || hh.state !== 'dead') return;
                hh.respawnTimer = null;
                Object.assign(hh, S.baseStatus());
                hh.hp = hh.maxHp;
                hh.x = hh.homeX; hh.y = hh.homeY;
                hh.state = 'idle';
                hh.lastRegenTick = 0; hh.hakiNextRoll = 0; hh.damageBy = {};
                hh.hakiBursts = []; hh.hakiActiveUntil = 0; hh.hakiCount = 0;
                State.hinbeomPortal = null; State.darkPortal = null;
                io.emit('syncHinbeomPortal', null);
                io.emit('syncDarkPortal', null);
                for (let pid in State.players) {
                    let pp = State.players[pid];
                    if (pp.portalDwellUntil) { pp.portalDwellUntil = 0; pp.portalDwellStart = 0; io.emit('portalDwell', { id: pid, until: 0 }); }
                    if (pp.darkDwellUntil) { pp.darkDwellUntil = 0; pp.darkDwellStart = 0; io.emit('darkDwell', { id: pid, until: 0 }); }
                }
            } catch (e) { console.error('[HINBEOM RESPAWN]', e); }   // 🛟 타이머 예외로 서버가 죽지 않게
        }, C.HINBEOM_RESPAWN);
    }

    // ── ⚫ 검은수염 ────────────────────────────────────────────────────────
    function clearBlackbeardSkills() {
        const bb = State.blackbeard;
        if (!bb) return;
        bb.castingUntil = 0; bb.telegraphUntil = 0;
        bb.crowsPendingTarget = null; bb.crowsActiveTarget = null; bb.crowsHitAt = 0;
        bb.darkFloorUntil = 0; bb.darkFloorNextTick = 0;
        bb.risingUntil = 0; bb.descentUntil = 0; bb.descentActive = false; bb.descentNextTick = 0;

        for (let pid in State.players) {
            let p = State.players[pid];
            if (p.crowsPullUntil) { p.crowsPullUntil = 0; io.emit('crowsEnd', { id: pid }); }
        }
        io.emit('darkFloorEnd');
        io.emit('descentEnd');
    }

    function spawnBlackbeardPortal() {
        State.blackbeardPortal = {
            x: State.blackbeard.x, y: C.DARK_GROUND - C.PORTAL_RADIUS, radius: C.PORTAL_RADIUS,
            createdAt: Date.now(), expireAt: Date.now() + C.BB_RESPAWN
        };
        io.emit('syncBlackbeardPortal', State.blackbeardPortal);
    }

    function killBlackbeard(attackerId) {
        const bb = State.blackbeard;
        if (bb.state === 'dead') return;

        reward(attackerId, C.BB_GOLD, C.BB_XP);

        // 🍈 흔들흔들 20% · 어둠어둠 20% · 🍒 체리파이 50% (각각 독립 판정)
        if (attackerId && State.players[attackerId]) {
            if (Math.random() < C.BB_GURA_DROP_CHANCE) {
                giveItem(attackerId, C.BB_GURA_DROP_ITEM,
                    '💥 흔들흔들열매 획득! (평타에 파공아 발동)',
                    '인벤토리가 가득 차 흔들흔들열매를 놓쳤습니다!');
            }
            if (Math.random() < C.BB_YAMI_DROP_CHANCE) {
                giveItem(attackerId, C.BB_YAMI_DROP_ITEM,
                    '⛓️ 어둠어둠열매 획득! (평타에 크로우즈 발동)',
                    '인벤토리가 가득 차 어둠어둠열매를 놓쳤습니다!');
            }
            // 🍒 [신규] 체리파이 (50%)
            if (Math.random() < C.BB_PIE_DROP_CHANCE) {
                giveItem(attackerId, C.BB_PIE_DROP_ITEM,
                    '🍒 체리파이 획득! (최대체력 +500)',
                    '인벤토리가 가득 차 체리파이를 놓쳤습니다!');
            }
        }

        State.blackbeardKilledBy = attackerId || null;
        bb.targetId = null; bb.state = 'dead';
        clearBlackbeardSkills();
        clearBurns('blackbeard', bb);

        if (!burgessAlive()) spawnBlackbeardPortal();

        if (bb.respawnTimer) { clearTimeout(bb.respawnTimer); bb.respawnTimer = null; }
        bb.deathGen = (bb.deathGen || 0) + 1;
        const gen = bb.deathGen;

        bb.respawnTimer = setTimeout(() => {
            try {
                const b2 = State.blackbeard;
                if (!b2 || b2.deathGen !== gen || b2.state !== 'dead') return;
                b2.respawnTimer = null;
                Object.assign(b2, S.baseStatus());
                b2.hp = b2.maxHp;
                b2.x = b2.homeX; b2.y = b2.homeY;
                b2.state = 'idle';
                b2.darkFloorNextRoll = 0; b2.descentNextRoll = 0; b2.crowsNextCast = 0;
                b2.darkFloorUntil = 0; b2.darkFloorNextTick = 0;
                b2.descentActive = false; b2.descentUntil = 0; b2.descentNextTick = 0; b2.risingUntil = 0;
                b2.crowsPendingTarget = null; b2.crowsActiveTarget = null; b2.crowsHitAt = 0;
                b2.telegraphUntil = 0; b2.castingUntil = 0;

                // ✅ [핵심 수정] 살아 있는 바제스는 절대 지우지 않는다.
                //    지워버리면 killBurgess 가 영영 호출되지 않아 '검은수염 귀환 포탈'이
                //    생성되지 않고, 암흑 왕좌 안의 플레이어가 빠져나올 수 없게 된다.
                if (burgessAlive()) {
                    b2.burgessSummoned = true;          // 이미 나와 있으므로 재소환하지 않는다
                } else {
                    b2.burgessSummoned = false;
                    State.burgess = makeBurgess();
                    io.emit('burgessDespawn');
                }

                State.blackbeardPortal = null; State.blackbeardKilledBy = null;
                io.emit('syncBlackbeardPortal', null);
                for (let pid in State.players) {
                    let pp = State.players[pid];
                    if (pp.portalDwellUntil) { pp.portalDwellUntil = 0; pp.portalDwellStart = 0; io.emit('portalDwell', { id: pid, until: 0 }); }
                }
            } catch (e) { console.error('[BLACKBEARD RESPAWN]', e); }   // 🛟 타이머 예외 방어
        }, C.BB_RESPAWN);
    }

    // ── 🟪 지저스 바제스 ───────────────────────────────────────────────────
    function checkBurgessSummon() {
        const bb = State.blackbeard, bg = State.burgess;
        if (!bb || !bg) return;
        if (bb.state === 'dead' || bb.hp <= 0) return;
        if (bb.burgessSummoned) return;
        // 🛟 이미 살아 있는 바제스를 덮어써서 초기화하지 않는다
        if (burgessAlive()) { bb.burgessSummoned = true; return; }
        if (bb.hp > bb.maxHp * 0.5) return;

        bb.burgessSummoned = true;
        let margin = C.BG_RADIUS + 200;
        let spawnX = C.DARK_AREA.minX + margin + Math.random() * ((C.DARK_AREA.maxX - margin) - (C.DARK_AREA.minX + margin));

        Object.assign(bg, S.baseStatus());
        bg.hp = C.BG_MAXHP; bg.maxHp = C.BG_MAXHP; bg.radius = C.BG_RADIUS;
        bg.x = spawnX; bg.y = C.BG_FALL_FROM;
        bg.state = 'falling'; bg.targetId = null;
        bg.fallingUntil = Date.now() + 8000;
        bg.jumpNextCast = 0; bg.jumpTelegraphUntil = 0; bg.jumpingUntil = 0;
        bg.jumpTargetX = spawnX; bg.jumpTargetY = C.DARK_GROUND - C.BG_RADIUS;
        bg.airborne = false; bg.vy = 0;

        io.emit('burgessSpawn', { x: spawnX, y: C.BG_FALL_FROM, radius: C.BG_RADIUS });
    }

    /** 🟪 착지 / 점프 착지 시 큰 풍압 */
    function burgessShockwave(cx, cy, radius, damage) {
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;   // 🛟 NaN 좌표 방어
        io.emit('burgessBlast', { x: cx, y: cy, radius: radius });
        for (let pid in State.players) {
            let t = State.players[pid];
            if (t.isDead || !isInDarkArea(t)) continue;
            if (Math.hypot(t.x - cx, t.y - cy) > radius) continue;
            let actual = damage * (1 - (t.defense || 0));
            t.hp -= actual;
            emitDamageText(t.x, t.y, actual);
            if (t.hp <= 0) checkPlayerDeath(t, null);
            else io.to(pid).emit('bossHit', { damage: actual, dir: (t.x >= cx ? 1 : -1), kb: (t.x >= cx ? 55 : -55) });
        }
    }

    function killBurgess(attackerId) {
        const bg = State.burgess;
        if (!bg || bg.state === 'none' || bg.state === 'dead') return;

        reward(attackerId, C.BG_GOLD, C.BG_XP);

        // 🏆 챔피언 벨트 30%
        if (attackerId && State.players[attackerId] && Math.random() < C.BG_BELT_DROP_CHANCE) {
            giveItem(attackerId, C.BG_BELT_DROP_ITEM,
                '🏆 챔피언 벨트 획득! (방어력 +20%)',
                '인벤토리가 가득 차 챔피언 벨트를 놓쳤습니다!');
        }

        bg.hp = 0; bg.state = 'dead'; bg.targetId = null;
        bg.jumpTelegraphUntil = 0; bg.jumpingUntil = 0; bg.fallingUntil = 0;
        bg.airborne = false; bg.vy = 0;
        clearBurns('burgess', bg);
        io.emit('burgessDespawn');

        if (State.blackbeard.state === 'dead' && !State.blackbeardPortal) spawnBlackbeardPortal();
    }

    // ── 🎯 어그로 (해당 영역 안의 공격자만 인식) ────────────────────────────
    function aggroHinbeom(attackerId) {
        const h = State.hinbeom;
        if (!h || h.hp <= 0 || h.state === 'dead') return;
        const p = State.players[attackerId];
        if (!p || p.isDead || !isInHinbeomArea(p)) return;
        h.targetId = attackerId; h.state = 'chase';
    }
    function aggroBlackbeard(attackerId) {
        const b = State.blackbeard;
        if (!b || b.hp <= 0 || b.state === 'dead') return;
        const p = State.players[attackerId];
        if (!p || p.isDead || !isInDarkArea(p)) return;
        b.targetId = attackerId; b.state = 'chase';
    }
    function aggroBurgess(attackerId) {
        if (!burgessAlive()) return;
        const p = State.players[attackerId];
        if (!p || p.isDead || !isInDarkArea(p)) return;
        State.burgess.targetId = attackerId;
    }

    // ── 🌿 일반 몬스터 / 오크라 ────────────────────────────────────────────
    function killMonster(attackerId) {
        if (State.monster.state === 'dead') return;
        reward(attackerId, 2500, 200);
        State.monster.targetId = null; State.monster.state = 'dead';
        clearBurns('monster', State.monster);
        setTimeout(() => {
            try {
                State.monster.hp = State.monster.maxHp;
                State.monster.x = State.monster.homeX; State.monster.y = 837;
                State.monster.knockbackForce = 0;
                State.monster.state = 'idle';
            } catch (e) { console.error('[MONSTER RESPAWN]', e); }
        }, 30000);
    }

    function rerollOkraGrade(ok) {
        if (ok.isEliteGolden) { ok.isGolden = true; ok.maxHp = 2000; ok.hp = ok.maxHp; return; }
        ok.isGolden = Math.random() < 0.05;
        ok.maxHp = ok.isGolden ? 2000 : 700;
        ok.hp = ok.maxHp;
    }

    function tryGoldenDrop(ok, attackerId) {
        if (!ok || !ok.isGolden || !attackerId) return;
        if (!State.players[attackerId]) return;
        if (Math.random() >= 0.25) return;
        giveItem(attackerId, 'gold',
            '✨ 황금 획득! (판매 시 3,000 G)',
            '인벤토리가 가득 차 황금을 놓쳤습니다!');
    }

    function killOkra(ok, attackerId) {
        if (ok.state === 'dead') return;
        reward(attackerId, 500, 50);
        tryGoldenDrop(ok, attackerId);
        ok.state = 'dead'; ok.targetId = null;
        clearBurns('okra_' + ok.id, ok);
        setTimeout(() => {
            try {
                rerollOkraGrade(ok);
                ok.x = ok.homeX; ok.y = ok.homeY; ok.state = 'idle';
                ok.knockbackForce = 0;
            } catch (e) { console.error('[OKRA RESPAWN]', e); }
        }, ok.respawnMs || 30000);
    }

    let okraIdCounter = 0;
    function spawnOkra(x, y, opts) {
        let ok = Object.assign({
            id: okraIdCounter++, x: x, y: y, homeX: x, homeY: y, radius: 25,
            isGolden: false, hp: 700, maxHp: 700, atk: 30, speed: 1,
            state: 'idle', targetId: null, lastAttack: 0,
            isEliteGolden: !!(opts && opts.eliteGolden),
            respawnMs: (opts && opts.respawnMs) ? opts.respawnMs : 30000
        }, S.baseStatus());
        rerollOkraGrade(ok);
        State.okras.push(ok);
    }

    /** 게임 시작 시 오크라 초기 배치 */
    // ══════════════════════════════════════════════════════════════════
    // 🔥 헤이안 스쿠나 (저주의 왕)
    // ══════════════════════════════════════════════════════════════════

    /** 🔥 스쿠나를 처치한다 — 검은수염과 마찬가지로 그 자리에 귀환 포탈이 생긴다 */
    function killSukuna(attackerId) {
        const sk = State.sukuna;
        if (!sk || sk.state === 'dead') return;

        reward(attackerId, C.SK_GOLD, C.SK_XP);

        // 🔥 35% 확률로 '스쿠나의 손가락' 을 준다
        if (attackerId && State.players[attackerId] && Math.random() < 0.35) {
            giveItem(attackerId, 'sukuna_finger',
                '🔥 스쿠나의 손가락 획득!',
                '인벤토리가 가득 차 스쿠나의 손가락을 놓쳤습니다!');
        }

        State.sukunaKilledBy = attackerId || null;
        sk.targetId = null; sk.state = 'dead';
        sk.barrageUntil = 0; sk.barrageNextAt = 0;
        sk.bowAimUntil = 0;
        clearBurns('sukuna', sk);

        // 예고 중이던 참격과 남은 불길을 즉시 정리한다
        State.sukunaSlashes.length = 0;
        State.sukunaFires.length = 0;
        io.emit('syncSukunaFires', State.sukunaFires);

        // 🌀 처치된 자리에 기지 귀환 포탈을 만든다 (검은수염과 동일한 규칙)
        State.sukunaPortal = {
            x: sk.x, y: C.CURSE_GROUND - C.PORTAL_RADIUS, radius: C.PORTAL_RADIUS,
            createdAt: Date.now(), expireAt: Date.now() + C.SK_RESPAWN
        };
        io.emit('syncSukunaPortal', State.sukunaPortal);
        io.emit('syncSukuna', sk);

        // ♻️ 일정 시간 뒤 부활한다
        setTimeout(() => {
            try {
                sk.hp = sk.maxHp;
                sk.x = sk.homeX; sk.y = sk.homeY;
                sk.state = 'idle'; sk.targetId = null;
                sk.knockbackForce = 0; sk.frozenUntil = 0;
                sk.nextSlashAt = 0;
                sk.bowGateUsed = [false, false];
                sk.damageBy = {};
                State.sukunaKilledBy = null;
                io.emit('syncSukuna', sk);
            } catch (e) { console.error('[SUKUNA RESPAWN]', e); }
        }, C.SK_RESPAWN);
    }

    /** 🔥 스쿠나에게 어그로를 준다 (피격 시 호출) */
    function aggroSukuna(attackerId) {
        const sk = State.sukuna;
        if (!sk || sk.state === 'dead') return;
        sk.targetId = attackerId;
        sk.state = 'chase';
    }

    function initOkras() {
        for (let i = 0; i < 8; i++) {
            let bx = 1500 + i * 600;
            spawnOkra(bx, 1955);
            spawnOkra(C.MIRROR_WIDTH - bx, 1955);
        }
        // 🟡 [수정] 황금오크라 부활 대기 : 420초(7분) → 120초(2분)
        const ELITE = { eliteGolden: true, respawnMs: 120000 };
        [12000, 12500, 13000].forEach(ex => spawnOkra(ex, -45, ELITE));
        [19000, 19500, 20000].forEach(ex => spawnOkra(ex, -45, ELITE));
    }

    return {
        spawnHinbeomMinions, despawnHinbeomMinions, killMinion, getMinion,
        recordHinbeomDamage, killHinbeom, aggroHinbeom,
        clearBlackbeardSkills, spawnBlackbeardPortal, killBlackbeard, aggroBlackbeard,
        checkBurgessSummon, burgessShockwave, killBurgess, aggroBurgess, burgessAlive,
        killMonster, killOkra, rerollOkraGrade, tryGoldenDrop, spawnOkra, initOkras,
        killSukuna, aggroSukuna,
        giveItem
    };
};