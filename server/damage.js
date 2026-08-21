// 파일명: server/damage.js
// ============================================================================
// ⚔️ 광역 피해 처리 통합 모듈
//    기존에 applyAoEDamage / applyBoxDamage / applyIceAge 가 각각
//    "플레이어 → 할배새끼 → 박힌범 → 검은수염 → 바제스 → 소환체 → 오크라"를
//    똑같이 복붙하고 있었다. 이를 forEachTarget() 하나로 통합해 코드량을
//    1/3 수준으로 줄였다.
// ============================================================================

const C = require('./config.js');
const S = require('./state.js');
const { State } = S;

/**
 * 범위 안의 모든 유효 대상을 순회한다.
 * @param attacker 공격자 플레이어
 * @param hitTest  (obj, radius) => boolean  — 이 대상이 범위 안인가
 * @param cb       ({obj, kind, id}) => void — 실제 피해 처리
 */
function forEachTarget(attacker, hitTest, cb, deps) {
    const { burgessAlive } = S;

    // 적 플레이어
    for (let tid in State.players) {
        if (tid === attacker.id) continue;
        let t = State.players[tid];
        if (!t || t.isDead || t.team === attacker.team) continue;
        // 🗿 [키드] 고철 골렘은 보이는 크기만큼 히트박스도 커진다
        const tR = (t.kidGolemEnd && Date.now() < t.kidGolemEnd) ? 105 : 0;
        if (!hitTest(t, tR)) continue;
        cb({ obj: t, kind: 'player', id: tid });
    }

    // 🏛️ [수정] 적 넥서스도 피해 대상이다.
    //    예전에는 여기 없어서, forEachTarget 을 쓰는 스킬(다이도 · 쿠루스 ·
    //    마르코 등)이 넥서스를 아예 때리지 못했다.
    const eb = State.bases[attacker.team === 1 ? 2 : 1];
    if (eb && eb.hp > 0 && hitTest(eb, eb.radius || 120)) {
        cb({ obj: eb, kind: 'base', id: 'base' });
    }
    // 할배새끼 보스
    if (State.monster.hp > 0 && hitTest(State.monster, State.monster.radius)) {
        cb({ obj: State.monster, kind: 'monster', id: 'monster' });
    }
    // 박힌범 (소환체 생존 시 무적)
    if (State.hinbeom.hp > 0 && State.hinbeom.state !== 'dead'
        && State.hinbeomMinions.length === 0
        && hitTest(State.hinbeom, State.hinbeom.radius)) {
        cb({ obj: State.hinbeom, kind: 'hinbeom', id: 'hinbeom' });
    }
    // 검은수염
    if (State.blackbeard.hp > 0 && State.blackbeard.state !== 'dead'
        && hitTest(State.blackbeard, State.blackbeard.radius)) {
        cb({ obj: State.blackbeard, kind: 'blackbeard', id: 'blackbeard' });
    }
    // 바제스
    if (burgessAlive() && hitTest(State.burgess, State.burgess.radius)) {
        cb({ obj: State.burgess, kind: 'burgess', id: 'burgess' });
    }
    // 🔥 헤이안 스쿠나 (저주의 왕)
    if (State.sukuna && State.sukuna.hp > 0 && State.sukuna.state !== 'dead'
        && hitTest(State.sukuna, State.sukuna.radius)) {
        cb({ obj: State.sukuna, kind: 'sukuna', id: 'sukuna' });
    }
    // 소환된 할배새끼
    for (let i = State.hinbeomMinions.length - 1; i >= 0; i--) {
        let mn = State.hinbeomMinions[i];
        if (mn.hp > 0 && hitTest(mn, mn.radius)) cb({ obj: mn, kind: 'minion', id: mn.id });
    }
    // 오크라
    for (let i = State.okras.length - 1; i >= 0; i--) {
        let ok = State.okras[i];
        if (ok.hp > 0 && hitTest(ok, ok.radius)) cb({ obj: ok, kind: 'okra', id: ok.id });
    }
}

module.exports = (deps) => {
    const { io, emitDamageText, checkPlayerDeath,
            killMonster, killHinbeom, killBlackbeard, killBurgess, killMinion, killOkra,
            killSukuna, aggroSukuna,
            aggroHinbeom, aggroBlackbeard, aggroBurgess,
            recordHinbeomDamage, applyBaseDamage, checkBurgessSummon } = deps;

    /** 대상 하나에 피해 + 넉백 + 어그로를 공통 처리한다 */
    function hurt(t, attacker, damage, kb, opts) {
        opts = opts || {};
        const { obj, kind, id } = t;

        // 🛡️ [마르코 · 불사 엉겅퀴] 시전자는 보호막을 쓰는 동안 완전 무적이다
        if (obj && obj.marcoInvUntil && Date.now() < obj.marcoInvUntil) return;

        // 🏛️ 넥서스는 전용 함수로 처리한다 (승패 판정이 걸려 있다)
        if (kind === 'base') {
            if (attacker) applyBaseDamage(attacker.team, damage);
            return;
        }

        // 🛡️ [마르코 · 불사 엉겅퀴] 불꽃 보호막에 닿은 공격은 그 자리에서 막힌다.
        //    hurt 는 거의 모든 공격이 거치는 공통 진입점이라 여기 한 곳이면 된다.
        //    · 대상이 보호막 안에 있으면 피해가 통째로 사라진다
        //    · 같은 편 공격과 보호막 주인 본인의 폭발은 막지 않는다
        if (obj && attacker && !opts.ignoreShield) {
            const now = Date.now();
            for (let sid in State.players) {
                const sp = State.players[sid];
                if (!sp || !sp.marcoShieldEnd || now >= sp.marcoShieldEnd) continue;
                if (sp.team === attacker.team) continue;          // 아군 공격은 통과
                const R = 210;                                     // MARCO_S3.shieldRadius
                if (Math.hypot(obj.x - sp.marcoShieldX, obj.y - sp.marcoShieldY) <= R) {
                    io.emit('marcoShieldHit', { x: obj.x, y: obj.y, sx: sp.marcoShieldX, sy: sp.marcoShieldY });
                    return;                                        // 🛡️ 완전히 막혔다
                }
            }
        }

        if (kind === 'player') {
            // 🗡️ [세계를 가르는 참격] 등 방어 무시 공격은 defense 를 적용하지 않는다
            let actual = opts.ignoreDefense ? damage : damage * (1 - (obj.defense || 0));
            obj.hp -= actual;
            emitDamageText(obj.x, obj.y, actual);
            if (opts.onPlayerExtra) opts.onPlayerExtra(obj, id, actual);
            if (obj.hp <= 0) checkPlayerDeath(obj, attacker.id);
            else if (opts.notify === 'takeDamage') { io.to(id).emit('takeDamage', actual); io.emit('syncPlayerFull', obj); }
            else io.to(id).emit('bossHit', { damage: actual, dir: Math.sign(kb) || 1, kb: kb });
            return;
        }

        // ⚔️ 퇴마의 검 : 여기부터는 전부 몬스터 계열이므로 30% 추가 피해를 적용한다.
        //    (applyAoEDamage / applyBoxDamage / applyIceAge / applyShockBlast 가
        //     모두 이 hurt() 를 거치므로 광역 계열은 이 한 줄로 전부 커버된다)
        damage = S.toemaDmg(attacker, damage);

        obj.hp -= damage;
        emitDamageText(obj.x, obj.y, damage);
        if (opts.onMobExtra) opts.onMobExtra(obj, kind, id);

        if (kind === 'monster') {
            obj.knockbackForce += kb * 0.3; obj.targetId = attacker.id; obj.state = 'chase';
            if (obj.hp <= 0) killMonster(attacker.id);
        } else if (kind === 'hinbeom') {
            obj.knockbackForce += kb * 0.2;
            recordHinbeomDamage(attacker.id, damage);
            aggroHinbeom(attacker.id);
            if (obj.hp <= 0) killHinbeom(attacker.id);
        } else if (kind === 'blackbeard') {
            obj.knockbackForce += kb * 0.2;
            aggroBlackbeard(attacker.id);
            checkBurgessSummon();
            if (obj.hp <= 0) killBlackbeard(attacker.id);
        } else if (kind === 'burgess') {
            obj.knockbackForce += kb * 0.25;
            aggroBurgess(attacker.id);
            if (obj.hp <= 0) killBurgess(attacker.id);
        } else if (kind === 'sukuna') {
            // 🔥 헤이안 스쿠나 — 검은수염과 같은 규칙
            obj.knockbackForce += kb * 0.2;
            if (typeof aggroSukuna === 'function') aggroSukuna(attacker.id);
            if (obj.hp <= 0 && typeof killSukuna === 'function') killSukuna(attacker.id);
        } else if (kind === 'minion') {
            obj.knockbackForce += kb * 0.3; obj.targetId = attacker.id; obj.state = 'chase';
            if (obj.hp <= 0) killMinion(obj, attacker.id);
        } else if (kind === 'okra') {
            obj.knockbackForce += kb; obj.targetId = attacker.id; obj.state = 'chase';
            if (obj.hp <= 0) killOkra(obj, attacker.id);
        }
    }

    /** 💥 원형 광역 피해 */
    function applyAoEDamage(attacker, cx, cy, radius, damage, kb) {
        let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
        if (enemyBase && enemyBase.hp > 0 && Math.hypot(cx - enemyBase.x, cy - enemyBase.y) < radius + 150) {
            applyBaseDamage(attacker.team, damage);
        }
        const hitTest = (o, r) => Math.hypot(cx - o.x, cy - o.y) < radius + r;
        forEachTarget(attacker, hitTest, (t) => hurt(t, attacker, damage, kb));
    }

    /** 📦 사각 범위 피해 */
    function applyBoxDamage(attacker, minX, maxX, minY, maxY, damage, kb) {
        let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
        if (enemyBase && enemyBase.hp > 0
            && enemyBase.x >= minX - 150 && enemyBase.x <= maxX + 150
            && enemyBase.y >= minY - 150 && enemyBase.y <= maxY + 150) {
            applyBaseDamage(attacker.team, damage);
        }
        const hitTest = (o, r) => (o.x >= minX - r && o.x <= maxX + r && o.y >= minY - r && o.y <= maxY + r);
        forEachTarget(attacker, hitTest, (t) => hurt(t, attacker, damage, kb));
    }

    /** ❄️ 아이스 에이지 — 피해 + 동결 (+ 아오키지면 스킬 봉인) */
    function applyIceAge(attacker, cx, cy, radius, damage, freezeDuration) {
        let now = Date.now();
        let hasAokiji = attacker.hasAokiji;

        let enemyBase = State.bases[attacker.team === 1 ? 2 : 1];
        if (enemyBase && enemyBase.hp > 0 && Math.hypot(cx - enemyBase.x, cy - enemyBase.y) < radius + 150) {
            applyBaseDamage(attacker.team, damage);
        }

        const freeze = (o) => {
            o.frozenUntil = Math.max(o.frozenUntil || 0, now + freezeDuration);
            if (hasAokiji) {
                o.skillFreezeUntil = Math.max(o.skillFreezeUntil || 0, now + 5000);
                io.emit('actionEffect', { type: 'awaken_icicles', x: o.x, y: o.y, life: 60, maxLife: 60 });
            }
        };

        const hitTest = (o, r) => Math.hypot(cx - o.x, cy - o.y) < radius + r;
        forEachTarget(attacker, hitTest, (t) => {
            hurt(t, attacker, damage, 0, {
                notify: 'takeDamage',
                onPlayerExtra: (o) => freeze(o),
                onMobExtra: (o) => freeze(o)
            });
        });
    }

    /**
     * ⚡ 감전 광역 피해 (흔들흔들 파공아 전용)
     *    맞은 대상은 동결이 아니라 감전 상태로 경직된다.
     */
    function applyShockBlast(attacker, cx, cy, radius, damage, stunMs) {
        let now = Date.now();
        const shock = (o, isPlayer) => {
            o.electrocutedUntil = Math.max(o.electrocutedUntil || 0, now + stunMs);
            o.airFreezeUntil = Math.max(o.airFreezeUntil || 0, now + stunMs);
            if (isPlayer) {
                o.isCasting = false; o.skill1Dashing = false;
                o.yataActive = false; o.yataPath = null; o.skill3Active = false;
            } else {
                o.frozenUntil = Math.max(o.frozenUntil || 0, now + stunMs);   // 몬스터 AI 정지용
            }
        };
        const hitTest = (o, r) => Math.hypot(cx - o.x, cy - o.y) < radius + r;
        forEachTarget(attacker, hitTest, (t) => {
            hurt(t, attacker, damage, 0, {
                notify: 'takeDamage',
                onPlayerExtra: (o) => shock(o, true),
                onMobExtra: (o) => shock(o, false)
            });
        });
    }

    return { applyAoEDamage, applyBoxDamage, applyIceAge, applyShockBlast, forEachTarget, hurt };
};