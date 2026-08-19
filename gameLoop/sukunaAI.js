// 파일명: gameLoop/sukunaAI.js
// ============================================================================
// 🔥 헤이안 스쿠나 — '저주의 왕' 맵의 보스
//
//   체력과 크기는 검은수염과 동일하다 (14400 / 반지름 94.5).
//
//   ── 공격 패턴 ──────────────────────────────────────────────────────────
//   ⚔️ 참격 (3초 주기)
//        가장 가까운 대상 자리에 1초 전부터 불투명한 빨간 박스로 범위를 예고하고,
//        1초 뒤 그 박스 안에 있는 대상에게 200 피해를 준다.
//
//   ⚔️⚔️ 연속 참격 (참격을 날릴 때마다 20% 확률)
//        2초 동안 0.4초마다, 가장 가까운 대상에게 참격 3개를 한꺼번에 퍼붓는다.
//        참격이 떨어질 자리마다 똑같이 빨간 박스로 예고한다.
//
//   🏹 화염 화살 (체력 70% · 40% 를 지날 때 각 1회)
//        가장 가까운 대상의 '그 순간 위치' 를 2초 동안 조준한다.
//        조준 중에는 목표 지점이 바뀌지 않는다.
//        도달하면 크게 폭발(700)하고, 그 자리에 4초간 불길이 남는다
//        (0.4초마다 70 피해).
//
//   ⚠️ 참격 판정은 '예고한 박스' 안에서만 일어난다.
//      예고를 보고 피하면 맞지 않는다는 규칙을 반드시 지킨다.
// ============================================================================

/** 넉백 감쇠 (bossAI 와 동일 규칙) */
function decayKnockback(e) {
    if (Math.abs(e.knockbackForce) <= 0) return;
    e.x += e.knockbackForce;
    e.knockbackForce *= 0.85;
    if (Math.abs(e.knockbackForce) < 1) e.knockbackForce = 0;
}

/** 저주의 왕 맵 안에 있는가 */
function inCurse(C, p) {
    return p.x >= C.CURSE_AREA.minX && p.x <= C.CURSE_AREA.maxX;
}

/** 맵 안에서 가장 가까운 살아있는 플레이어 */
function nearestInCurse(C, players, x) {
    let found = null, closest = Infinity;
    for (let pid in players) {
        let p = players[pid];
        if (!p || p.isDead || !inCurse(C, p)) continue;
        let d = Math.abs(p.x - x);
        if (d < closest) { closest = d; found = pid; }
    }
    return found;
}

/** ⚔️ 참격 예고를 하나 만든다 (1초 뒤 터진다) */
function addSlash(State, C, io, now, cx, cy) {
    const s = {
        x: cx, y: cy,
        w: C.SK_SLASH_W, h: C.SK_SLASH_H,
        fireAt: now + C.SK_SLASH_TELE_MS,
        done: false
    };
    State.sukunaSlashes.push(s);
    io.emit('sukunaSlashTele', { x: s.x, y: s.y, w: s.w, h: s.h, teleMs: C.SK_SLASH_TELE_MS });
}

module.exports = {
    update: (ctx, now) => {
        const State = ctx.State;
        const io = ctx.io;
        // 🔥 [버그 수정] serverContext 는 상수를 ctx.SK_RADIUS 처럼 '평평하게' 담는다.
        //    ctx.C 라는 키는 존재하지 않아서, 예전 코드는 매 프레임 곧바로 return 했고
        //    스쿠나가 움직이지도 · 공격하지도 않았다. (bossAI 도 ctx.HINBEOM_AREA 식으로 쓴다)
        const C = ctx.C || ctx;
        const sk = State && State.sukuna;
        if (!sk || !C || !C.CURSE_AREA) return;

        // 🔥 [버그 수정] 아래 로직은 조준 · 연속참격 등에서 여러 번 조기 반환한다.
        //    예전에는 함수 맨 끝에서만 델타를 보내서, 조기 반환하면 위치·체력이
        //    클라이언트에 전달되지 않아 스쿠나가 사라져 보였다.
        //    → 어떤 경로로 끝나든 반드시 방송하도록 감싼다.
        try {
            tick(ctx, now, sk);
        } finally {
            if (ctx.compressors && ctx.compressors.sukunaDelta) {
                let d = ctx.compressors.sukunaDelta.getDelta('sukuna', sk);
                if (d) io.emit('sukunaUpdate', d);
            }
        }
    }
};

function tick(ctx, now, sk) {
        const { State, io, emitDamageText, checkPlayerDeath } = ctx;
        // 🔥 상수는 serverContext 에 평평하게 담긴다 (ctx.C 는 없다)
        const C = ctx.C || ctx;
        const players = State.players;

        // ── ⚔️ 예고된 참격이 터질 때 ────────────────────────────────
        for (let i = State.sukunaSlashes.length - 1; i >= 0; i--) {
            const s = State.sukunaSlashes[i];
            if (now < s.fireAt) continue;

            if (!s.done) {
                s.done = true;
                io.emit('sukunaSlashFire', { x: s.x, y: s.y, w: s.w, h: s.h });

                // 예고한 박스 안에 있는 대상만 맞는다
                const hw = s.w / 2, hh = s.h / 2;
                for (let pid in players) {
                    let p = players[pid];
                    if (!p || p.isDead || !inCurse(C, p)) continue;
                    if (Math.abs(p.x - s.x) > hw || Math.abs(p.y - s.y) > hh) continue;
                    let actual = C.SK_SLASH_DMG * (1 - (p.defense || 0));
                    p.hp -= actual;
                    emitDamageText(p.x, p.y, actual);
                    io.to(pid).emit('takeDamage', actual);   // 🩸 피격 비네트
                    if (p.hp <= 0) { checkPlayerDeath(p, 'sukuna'); continue; }
                    io.emit('syncPlayerFull', p);
                }
            }
            // 터진 뒤 잠깐 남겼다가 지운다 (연출 시간)
            if (now >= s.fireAt + 300) State.sukunaSlashes.splice(i, 1);
        }

        // ── 🔥 불길 장판 지속 피해 ──────────────────────────────────
        for (let i = State.sukunaFires.length - 1; i >= 0; i--) {
            const f = State.sukunaFires[i];
            if (now >= f.endAt) { State.sukunaFires.splice(i, 1); io.emit('syncSukunaFires', State.sukunaFires); continue; }
            if (now < f.nextTick) continue;
            f.nextTick = now + C.SK_BOW_FIRE_TICK;

            for (let pid in players) {
                let p = players[pid];
                if (!p || p.isDead || !inCurse(C, p)) continue;
                if (Math.hypot(p.x - f.x, p.y - f.y) > f.r) continue;
                let actual = C.SK_BOW_FIRE_DMG * (1 - (p.defense || 0));
                p.hp -= actual;
                emitDamageText(p.x, p.y, actual);
                io.to(pid).emit('takeDamage', actual);   // 🩸 피격 비네트
                if (p.hp <= 0) { checkPlayerDeath(p, 'sukuna'); continue; }
                io.emit('syncPlayerFull', p);
            }
        }

        if (sk.hp <= 0 || sk.state === 'dead') return;

        decayKnockback(sk);
        if (now < (sk.frozenUntil || 0)) return;

        // ── 🏹 화염 화살 : 조준이 끝나면 쏜다 ───────────────────────
        if (sk.bowAimUntil && now >= sk.bowAimUntil) {
            const bx = sk.bowTargetX, by = sk.bowTargetY;
            sk.bowAimUntil = 0;

            io.emit('sukunaBowFire', { x: bx, y: by, blastR: C.SK_BOW_BLAST_R });

            // 💥 크게 폭발한다
            for (let pid in players) {
                let p = players[pid];
                if (!p || p.isDead || !inCurse(C, p)) continue;
                if (Math.hypot(p.x - bx, p.y - by) > C.SK_BOW_BLAST_R) continue;
                let actual = C.SK_BOW_DMG * (1 - (p.defense || 0));
                p.hp -= actual;
                emitDamageText(p.x, p.y, actual);
                io.to(pid).emit('takeDamage', actual);   // 🩸 피격 비네트
                if (p.hp <= 0) { checkPlayerDeath(p, 'sukuna'); continue; }
                io.emit('syncPlayerFull', p);
            }

            // 🔥 그 자리에 4초간 불길이 남는다
            State.sukunaFires.push({
                x: bx, y: by, r: C.SK_BOW_FIRE_R,
                endAt: now + C.SK_BOW_FIRE_MS,
                nextTick: now + C.SK_BOW_FIRE_TICK
            });
            io.emit('syncSukunaFires', State.sukunaFires);
        }

        // 조준 중에는 다른 행동을 하지 않는다 (목표 고정)
        if (sk.bowAimUntil) return;

        // ── 🏹 체력 관문 (70% · 40%) 통과 시 조준 시작 ──────────────
        const ratio = sk.hp / sk.maxHp;
        for (let g = 0; g < C.SK_BOW_HP_GATES.length; g++) {
            if (sk.bowGateUsed[g]) continue;
            if (ratio > C.SK_BOW_HP_GATES[g]) continue;
            sk.bowGateUsed[g] = true;

            const tid = nearestInCurse(C, players, sk.x);
            const t = tid ? players[tid] : null;
            // 대상이 없으면 관문만 소모하고 넘어간다
            if (!t) break;

            sk.bowTargetId = tid;
            sk.bowTargetX = t.x;          // 🔒 이 순간 위치로 고정
            sk.bowTargetY = t.y;
            sk.bowAimUntil = now + C.SK_BOW_AIM_MS;

            io.emit('sukunaBowAim', {
                sx: sk.x, sy: sk.y - sk.radius * 0.4,
                x: sk.bowTargetX, y: sk.bowTargetY,
                aimMs: C.SK_BOW_AIM_MS, blastR: C.SK_BOW_BLAST_R
            });
            return;   // 조준을 시작했으면 이번 프레임은 여기서 끝
        }

        // ── ⚔️⚔️ 연속 참격이 진행 중이면 그것만 처리한다 ───────────
        if (sk.barrageUntil && now < sk.barrageUntil) {
            if (now >= (sk.barrageNextAt || 0)) {
                sk.barrageNextAt = now + C.SK_BARRAGE_STEP_MS;
                const tid = nearestInCurse(C, players, sk.x);
                const t = tid ? players[tid] : null;
                if (t) {
                    // 참격 3개를 대상 주변에 겹쳐 떨어뜨린다
                    for (let k = 0; k < C.SK_BARRAGE_COUNT; k++) {
                        const off = (k - (C.SK_BARRAGE_COUNT - 1) / 2) * (C.SK_SLASH_W * 0.55);
                        addSlash(State, C, io, now, t.x + off, t.y);
                    }
                }
            }
            return;
        }
        if (sk.barrageUntil && now >= sk.barrageUntil) {
            sk.barrageUntil = 0; sk.barrageNextAt = 0;
            // 연속 참격이 끝나면 다음 일반 참격까지 한 주기 쉰다
            sk.nextSlashAt = now + C.SK_SLASH_INTERVAL;
        }

        // ── ⚔️ 3초 주기 참격 ────────────────────────────────────────
        if (!sk.nextSlashAt) sk.nextSlashAt = now + C.SK_SLASH_INTERVAL;
        if (now >= sk.nextSlashAt) {
            const tid = nearestInCurse(C, players, sk.x);
            const t = tid ? players[tid] : null;

            if (t) {
                sk.targetId = tid;
                sk.dir = (t.x >= sk.x) ? 1 : -1;
                addSlash(State, C, io, now, t.x, t.y);

                // 20% 확률로 연속 참격이 이어진다
                if (Math.random() < C.SK_BARRAGE_CHANCE) {
                    sk.barrageUntil = now + C.SK_BARRAGE_DUR_MS;
                    sk.barrageNextAt = now;   // 바로 첫 발
                    io.emit('sukunaBarrage', { durMs: C.SK_BARRAGE_DUR_MS });
                }
            }
            sk.nextSlashAt = now + C.SK_SLASH_INTERVAL;
        }

        // ── 🚶 천천히 대상 쪽으로 몸을 돌리며 다가간다 ──────────────
        const tid2 = nearestInCurse(C, players, sk.x);
        const t2 = tid2 ? players[tid2] : null;
        if (t2) {
            sk.targetId = tid2;
            sk.state = 'chase';
            if (sk.x < t2.x - 200) sk.x += C.SK_SPEED;
            else if (sk.x > t2.x + 200) sk.x -= C.SK_SPEED;
            sk.dir = (t2.x >= sk.x) ? 1 : -1;
        } else {
            sk.state = 'idle';
            sk.targetId = null;
            // 아무도 없으면 제자리로 돌아간다
            if (sk.x < sk.homeX - 20) sk.x += C.SK_SPEED;
            else if (sk.x > sk.homeX + 20) sk.x -= C.SK_SPEED;
        }

        // 맵 밖으로 나가지 않게 한다
        if (sk.x < C.CURSE_AREA.minX + sk.radius) sk.x = C.CURSE_AREA.minX + sk.radius;
        if (sk.x > C.CURSE_AREA.maxX - sk.radius) sk.x = C.CURSE_AREA.maxX - sk.radius;
        sk.y = C.CURSE_GROUND - sk.radius;
}
