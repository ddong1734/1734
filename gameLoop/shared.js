// 파일명: gameLoop/shared.js
// ============================================================================
// 🧰 게임 루프 공용 유틸
// ============================================================================

/** 🚀 상태이상 전용 경량 브로드캐스트 */
function emitStatus(io, t) {
    io.emit('statusUpdate', {
        id: t.id,
        frozenUntil: t.frozenUntil || 0,
        electrocutedUntil: t.electrocutedUntil || 0,
        airFreezeUntil: t.airFreezeUntil || 0,
        burningUntil: t.burningUntil || 0,
        maguBombUntil: t.maguBombUntil || 0,
        justiceBombUntil: t.justiceBombUntil || 0
    });
}

/** 🪨 고속 낙하물이 발판/대상을 뚫고 지나가지 않도록 경로(스윕) 판정 */
function sweptFallHit(objX, prevY, curY, targetX, targetY, hitR) {
    if (Math.abs(objX - targetX) > hitR) return false;
    let loY = Math.min(prevY, curY) - hitR;
    let hiY = Math.max(prevY, curY) + hitR;
    return targetY >= loY && targetY <= hiY;
}

class SpatialGrid {
    constructor(cellSize) { this.cellSize = cellSize; this.cells = new Map(); }
    insert(entity) {
        if (entity.x === undefined || entity.y === undefined) return;
        const key = Math.floor(entity.x / this.cellSize) + ',' + Math.floor(entity.y / this.cellSize);
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key).push(entity);
    }
    clear() { this.cells.clear(); }
    getNearby(x, y, radius) {
        const minX = Math.floor((x - radius) / this.cellSize);
        const maxX = Math.floor((x + radius) / this.cellSize);
        const minY = Math.floor((y - radius) / this.cellSize);
        const maxY = Math.floor((y + radius) / this.cellSize);
        const results = [];
        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                let arr = this.cells.get(cx + ',' + cy);
                if (arr) results.push(...arr);
            }
        }
        return results;
    }
}

/**
 * 낙하물(마그마 · 낙뢰) 공통 판정 루프.
 * 대상 목록을 한 번에 순회하며 스윕 히트를 검사한다.
 * @param onHit ({obj, kind, id, key}) => void
 */
function forEachFallTarget(ctx, obj, prevY, extraR, onHit) {
    const { State, burgessAlive } = ctx;
    const { players, monster, hinbeom, blackbeard, burgess, hinbeomMinions, okras } = {
        players: State.players, monster: State.monster, hinbeom: State.hinbeom,
        blackbeard: State.blackbeard, burgess: State.burgess,
        hinbeomMinions: State.hinbeomMinions, okras: State.okras
    };

    for (let pid in players) {
        let t = players[pid];
        if (t.isDead || t.team === obj.team || obj.hitIds.includes(pid)) continue;
        if (sweptFallHit(obj.x, prevY, obj.y, t.x, t.y, obj.radius + 45)) onHit({ obj: t, kind: 'player', id: pid, key: pid });
    }
    if (monster.hp > 0 && !obj.hitIds.includes('monster') && sweptFallHit(obj.x, prevY, obj.y, monster.x, monster.y, obj.radius + monster.radius))
        onHit({ obj: monster, kind: 'monster', id: 'monster', key: 'monster' });

    if (hinbeom.hp > 0 && !obj.hitIds.includes('hinbeom') && sweptFallHit(obj.x, prevY, obj.y, hinbeom.x, hinbeom.y, obj.radius + hinbeom.radius))
        onHit({ obj: hinbeom, kind: 'hinbeom', id: 'hinbeom', key: 'hinbeom', invincible: hinbeomMinions.length > 0 });

    if (blackbeard.hp > 0 && blackbeard.state !== 'dead' && !obj.hitIds.includes('blackbeard') && sweptFallHit(obj.x, prevY, obj.y, blackbeard.x, blackbeard.y, obj.radius + blackbeard.radius))
        onHit({ obj: blackbeard, kind: 'blackbeard', id: 'blackbeard', key: 'blackbeard' });
    // 🔥 헤이안 스쿠나 — 낙하형 스킬(팔척경곡옥 · 유성화산 등)도 맞아야 한다
    const sukuna = State.sukuna;
    if (sukuna && sukuna.hp > 0 && sukuna.state !== 'dead' && !obj.hitIds.includes('sukuna') && sweptFallHit(obj.x, prevY, obj.y, sukuna.x, sukuna.y, obj.radius + sukuna.radius))
        onHit({ obj: sukuna, kind: 'sukuna', id: 'sukuna', key: 'sukuna' });

    if (burgessAlive() && !obj.hitIds.includes('burgess') && sweptFallHit(obj.x, prevY, obj.y, burgess.x, burgess.y, obj.radius + burgess.radius))
        onHit({ obj: burgess, kind: 'burgess', id: 'burgess', key: 'burgess' });

    for (let i = hinbeomMinions.length - 1; i >= 0; i--) {
        let mn = hinbeomMinions[i];
        if (mn.hp > 0 && !obj.hitIds.includes('minion_' + mn.id) && sweptFallHit(obj.x, prevY, obj.y, mn.x, mn.y, obj.radius + mn.radius))
            onHit({ obj: mn, kind: 'minion', id: mn.id, key: 'minion_' + mn.id });
    }
    for (let i = okras.length - 1; i >= 0; i--) {
        let ok = okras[i];
        if (ok.hp > 0 && !obj.hitIds.includes('okra_' + ok.id) && sweptFallHit(obj.x, prevY, obj.y, ok.x, ok.y, obj.radius + ok.radius))
            onHit({ obj: ok, kind: 'okra', id: ok.id, key: 'okra_' + ok.id });
    }
}

/** 낙하물이 대상을 처치했을 때 공통 호출 */
function killByKind(ctx, t, ownerId) {
    if (t.kind === 'monster') ctx.killMonster(ownerId);
    else if (t.kind === 'hinbeom') ctx.killHinbeom(ownerId);
    else if (t.kind === 'blackbeard') ctx.killBlackbeard(ownerId);
    else if (t.kind === 'burgess') ctx.killBurgess(ownerId);
    else if (t.kind === 'minion') ctx.killMinion(t.obj, ownerId);
    else if (t.kind === 'okra') ctx.killOkra(t.obj, ownerId);
    else if (t.kind === 'sukuna' && ctx.killSukuna) ctx.killSukuna(ownerId);   // 🔥 헤이안 스쿠나
}

/** 어그로 / 추격 상태 공통 설정 */
function aggroByKind(ctx, t, ownerId) {
    if (t.kind === 'monster' || t.kind === 'minion' || t.kind === 'okra') { t.obj.targetId = ownerId; t.obj.state = 'chase'; }
    else if (t.kind === 'hinbeom') ctx.aggroHinbeom(ownerId);
    else if (t.kind === 'blackbeard') { ctx.aggroBlackbeard(ownerId); ctx.checkBurgessSummon(); }
    else if (t.kind === 'sukuna' && ctx.aggroSukuna) ctx.aggroSukuna(ownerId);   // 🔥 헤이안 스쿠나
    else if (t.kind === 'burgess') ctx.aggroBurgess(ownerId);
}

module.exports = { emitStatus, sweptFallHit, SpatialGrid, forEachFallTarget, killByKind, aggroByKind };