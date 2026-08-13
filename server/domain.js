// 파일명: server/domain.js
// ============================================================================
// 🌑 [유명이경 역월] 영역 전개
//
//   ⬛ 다부라 카라바가 '유명이경 역월' 을 장착했을 때 열리는 4번 스킬이다.
//
//   진행 단계
//     ① cast    : 시전자 1초 경직 (socketEvents 의 useYumyeong 이 처리)
//     ② expand  : 4초. 반경 안의 모든 대상이 4초간 경직된다.
//                 · 클라이언트는 1초 어두워졌다가 3초에 걸쳐 밝아지며
//                   흑백 각진 상자 더미가 증식하는 영역 배경으로 바뀐다.
//     ③ active  : 15초. 영역이 유지된다. (효과는 추후 추가 — applyDomainEffect)
//     ④ collapse: 배경이 무너지며 원래 장소로 돌아온다.
//
//   · 영역은 시전자 위치에 고정된다 (시전자가 움직여도 따라오지 않는다).
//   · 영역 안에 '있는지' 는 매 틱 다시 판정하므로,
//     걸어 들어오거나 나가면 즉시 반영된다.
//   · 외부에서 보면 커다란 검은 원으로 보인다 (렌더러가 처리).
//
// 🔗 순환 참조는 index.js 가 wire() 로 나중에 주입해 해결한다.
// ============================================================================

let io, C, S, State;

/** 🔗 index.js 가 모든 모듈을 만든 뒤 호출한다 */
function wire(d) {
    io = d.io; C = d.C; S = d.S; State = d.State;
}

/** 📡 클라이언트에 보낼 최소 정보만 추린다 */
function pack(dm) {
    return {
        ownerId: dm.ownerId, team: dm.team,
        x: dm.x, y: dm.y, radius: dm.radius,
        phase: dm.phase,
        startAt: dm.startAt, expandEnd: dm.expandEnd,
        endAt: dm.endAt, collapseEnd: dm.collapseEnd
    };
}

/** 📡 영역 목록을 전체에게 알린다 */
function broadcast() {
    io.emit('syncDomains', State.domains.map(pack));
}

/**
 * 🌑 영역을 전개한다.
 * @param p 시전자 (이미 1초 경직이 끝난 상태)
 */
function openDomain(p) {
    if (!p || p.isDead) return;

    // 같은 사람이 이미 펼쳐 둔 영역은 먼저 걷는다 (중복 방지)
    State.domains = State.domains.filter(d => d.ownerId !== p.id);

    let now = Date.now();
    let dm = {
        ownerId: p.id,
        team: p.team,
        x: p.x, y: p.y,
        radius: C.YUM_RADIUS,
        phase: 'expand',
        startAt: now,
        expandEnd: now + C.YUM_EXPAND_MS,                       // ② 전개 끝
        endAt: now + C.YUM_EXPAND_MS + C.YUM_DURATION_MS,       // ③ 지속 끝
        collapseEnd: now + C.YUM_EXPAND_MS + C.YUM_DURATION_MS + C.YUM_COLLAPSE_MS
    };
    State.domains.push(dm);

    // 🎬 전개 시작을 알린다 (클라이언트 연출이 여기서부터 시작된다)
    io.emit('domainOpen', pack(dm));
    broadcast();

    // ⚡ 전개되는 4초 동안 범위 안의 모든 대상을 경직시킨다.
    //    시전자 본인도 함께 묶인다 (감전 표시).
    freezeInside(dm, now + C.YUM_EXPAND_MS);
}

/** 📐 대상이 영역 안에 있는가 */
function inside(dm, obj, r) {
    if (!obj) return false;
    let dx = obj.x - dm.x, dy = obj.y - dm.y;
    return Math.hypot(dx, dy) <= dm.radius + (r || 0);
}

/**
 * ⚡ 영역 안의 모든 대상을 지정 시각까지 경직시킨다.
 *    아군 · 적군 · 몬스터를 가리지 않으며, 시전자 본인도 함께 묶인다.
 *
 *    ⚠️ 실제로 몸을 못 움직이게 하는 것은 frozenUntil 이고,
 *       electrocutedUntil 은 '감전 시각 효과' 전용이다.
 *       요청대로 '동결이 아니라 감전' 으로 보이게 하려면 둘 다 걸어야 한다.
 *       (frozenUntil 만 걸면 파랗게 어는 표시가, 둘 다 걸면 감전 표시가 나온다)
 */
function freezeInside(dm, until) {
    // ── 플레이어 ────────────────────────────────────────────────────
    for (let pid in State.players) {
        let t = State.players[pid];
        if (!t || t.isDead) continue;
        // 🌑 [수정] 시전자도 전개되는 4초 동안 함께 묶인다
        const isOwner = (pid === dm.ownerId);
        if (!isOwner && !inside(dm, t)) continue;
        t.frozenUntil = Math.max(t.frozenUntil || 0, until);
        t.electrocutedUntil = Math.max(t.electrocutedUntil || 0, until);
        io.emit('syncPlayerFull', t);
    }

    // ── 보스 · 몬스터 계열 ──────────────────────────────────────────
    const mobs = [
        State.monster, State.hinbeom, State.blackbeard, State.burgess
    ].concat(State.hinbeomMinions || [], State.okras || []);

    for (let m of mobs) {
        if (!m || m.hp === undefined || m.hp <= 0) continue;
        if (m.state === 'dead') continue;
        if (!inside(dm, m, m.radius || 0)) continue;
        m.frozenUntil = Math.max(m.frozenUntil || 0, until);
        m.electrocutedUntil = Math.max(m.electrocutedUntil || 0, until);
    }
}

/**
 * 🎯 영역이 유지되는 동안 매 틱 적용할 효과.
 *
 *    ⚠️ 영역의 '효과' 는 아직 정해지지 않았다.
 *       정해지면 이 함수 안에만 채우면 되도록 비워 둔다.
 *       dm.nextEffectTick 으로 원하는 주기를 잡아 쓰면 된다.
 */
function applyDomainEffect(dm, now) {
    // (효과 미정 — 추후 구현)
}

/**
 * 🕐 매 프레임 호출. 단계 전환과 지속 효과를 처리한다.
 */
function processDomains(now) {
    if (!State.domains.length) return;

    let changed = false;

    for (let i = State.domains.length - 1; i >= 0; i--) {
        let dm = State.domains[i];

        // 🚪 주인이 죽거나 나가면 영역도 즉시 걷힌다
        let owner = State.players[dm.ownerId];
        if (!owner || owner.isDead) {
            io.emit('domainClose', { ownerId: dm.ownerId, forced: true });
            State.domains.splice(i, 1);
            changed = true;
            continue;
        }

        if (dm.phase === 'expand') {
            // ② 전개 중 — 새로 들어온 대상도 전개가 끝날 때까지 묶어 둔다
            freezeInside(dm, dm.expandEnd);
            if (now >= dm.expandEnd) {
                dm.phase = 'active';
                changed = true;
            }
        } else if (dm.phase === 'active') {
            // ③ 지속 중
            applyDomainEffect(dm, now);
            if (now >= dm.endAt) {
                dm.phase = 'collapse';
                io.emit('domainCollapse', pack(dm));
                changed = true;
            }
        } else if (dm.phase === 'collapse') {
            // ④ 붕괴 연출이 끝나면 목록에서 제거한다
            if (now >= dm.collapseEnd) {
                io.emit('domainClose', { ownerId: dm.ownerId, forced: false });
                State.domains.splice(i, 1);
                changed = true;
            }
        }
    }

    // 🏷️ 플레이어마다 '지금 어느 영역 안에 있는지' 를 갱신한다
    //     (클라이언트가 화면을 영역 배경으로 바꿀지 판단하는 근거)
    for (let pid in State.players) {
        let t = State.players[pid];
        if (!t) continue;
        let found = null;
        for (let dm of State.domains) {
            if (dm.phase === 'collapse') continue;
            if (inside(dm, t)) { found = dm.ownerId; break; }
        }
        if (t.domainId !== found) {
            t.domainId = found;
            io.emit('syncPlayerFull', t);
        }
    }

    if (changed) broadcast();
}

/**
 * 🚧 영역 경계 통과 차단.
 *
 *    · 영역 '안' 에 있던 사람은 절대 밖으로 나갈 수 없다.
 *    · 영역 '밖' 에 있던 사람은 절대 안으로 들어올 수 없다.
 *
 *    이동한 뒤의 좌표를 받아, 경계를 넘었으면 경계선 위로 되돌린다.
 *    (붕괴 중인 영역은 이미 벽이 풀린 것으로 본다)
 *
 *  @param p     플레이어
 *  @param nx,ny 이동하려는 좌표
 *  @return {x, y, blocked}
 */
const WALL_MARGIN = 6;   // 경계선에서 살짝 안쪽/바깥쪽으로 밀어 둔다

function clampToDomainWall(p, nx, ny) {
    if (!p || !State.domains || !State.domains.length) return { x: nx, y: ny, blocked: false };

    let blocked = false;

    for (let dm of State.domains) {
        if (!dm || dm.phase === 'collapse') continue;

        const R = dm.radius;
        // '지금 안에 있는가' 는 이동 전 좌표(p.x, p.y)로 판단한다
        const wasInside = Math.hypot(p.x - dm.x, p.y - dm.y) <= R;

        let dx = nx - dm.x, dy = ny - dm.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.0001) { dx = 1; dy = 0; dist = 1; }

        if (wasInside && dist > R - WALL_MARGIN) {
            // 🔒 안에 있던 사람이 밖으로 나가려 한다 → 안쪽 벽에 붙인다
            let k = (R - WALL_MARGIN) / dist;
            nx = dm.x + dx * k;
            ny = dm.y + dy * k;
            blocked = true;
        } else if (!wasInside && dist < R + WALL_MARGIN) {
            // 🔒 밖에 있던 사람이 안으로 들어오려 한다 → 바깥 벽에 붙인다
            let k = (R + WALL_MARGIN) / dist;
            nx = dm.x + dx * k;
            ny = dm.y + dy * k;
            blocked = true;
        }
    }

    return { x: nx, y: ny, blocked: blocked };
}

/** 🧹 게임 리셋 시 모든 영역을 지운다 */
function clearDomains() {
    if (!State.domains.length) return;
    State.domains.length = 0;
    io.emit('syncDomains', []);
}

module.exports = {
    wire,
    openDomain, processDomains, clearDomains,
    inside, applyDomainEffect,
    clampToDomainWall, WALL_MARGIN
};
