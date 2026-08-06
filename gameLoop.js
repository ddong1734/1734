// 파일명: gameLoop.js
// ============================================================================
// 🔁 서버 메인 루프 오케스트레이터
//    실제 처리는 gameLoop/ 하위 모듈이 담당한다.
//      gameLoop/shared.js     : 공용 유틸 (SpatialGrid · emitStatus · sweptFallHit)
//      gameLoop/projectiles.js: 투사체 · 낙뢰 · 마그마 · 충격파 · 포탑 · 폭탄
//      gameLoop/bossAI.js     : 박힌범 · 검은수염 · 바제스 · 소환체 · 오크라 AI
//      gameLoop/portals.js    : 포탈 대기 · 순간이동
// ============================================================================

const Shared = require('./gameLoop/shared.js');
const Projectiles = require('./gameLoop/projectiles.js');
const BossAI = require('./gameLoop/bossAI.js');
const Portals = require('./gameLoop/portals.js');

// 🚀 [최적화] 매 프레임 무조건 나가던 브로드캐스트를 억제하기 위한 상태 추적값
let _lastBaseSync = 0;
let _lastBaseHp1 = -1;
let _lastBaseHp2 = -1;
let _lastDetectorSync = 0;

module.exports = {
    update: (ctx) => {
        const { State, io, compressors, CharLogic, processBurns } = ctx;
        const { players, bases, detectors, gameStarted } = State;

        if (!gameStarted) return;
        const now = Date.now();

        // ── 넥서스 체력 동기화 (변화가 있거나 1초마다) ──────────────────
        if (bases[1].hp !== _lastBaseHp1 || bases[2].hp !== _lastBaseHp2 || now - _lastBaseSync >= 1000) {
            _lastBaseHp1 = bases[1].hp; _lastBaseHp2 = bases[2].hp; _lastBaseSync = now;
            io.emit('syncBases', bases);
        }

        // ── 캐릭터별 지속 스킬 갱신 ────────────────────────────────────
        for (let pid in players) {
            let logic = CharLogic[players[pid].characterType];
            if (logic && logic.updateLoop) logic.updateLoop(players[pid], now, ctx);
        }

        // ── 도트 피해 / 열매 상태 / 워치독 ─────────────────────────────
        processBurns(now);
        if (typeof ctx.processYamiBinds === 'function') ctx.processYamiBinds(now);      // ⛓️ 어둠 흡수
        if (typeof ctx.processGuraCharges === 'function') ctx.processGuraCharges(now);  // 💥 파공아 예약
        if (typeof ctx.clearStuckStates === 'function') ctx.clearStuckStates(now);      // 🛟 캐스팅 잠금 해제

        // ── 발사체 · 폭탄 · 낙하물 · 충격파 ────────────────────────────
        Projectiles.update(ctx, now);

        // ── 탐지기 채굴 ────────────────────────────────────────────────
        let detUp = false;
        detectors.forEach(d => {
            if (now < d.nextMineTime) return;
            let rd = Math.random() * 100;
            let aid = (rd < 60) ? (Math.random() < 0.5 ? 'jadam' : 'pepsi_art')
                    : (rd < 90) ? 'rare_box'
                    : (rd < 98) ? ['seolgonnyak','pika_fruit','hie_fruit','magu_fruit','goro_fruit','justice_coat'][Math.floor(Math.random() * 6)]
                    : 'justice_coat';
            d.chest.push({ uid: Math.random().toString(36).substr(2, 9), id: aid });
            d.nextMineTime = now + 3000;
            detUp = true;
        });
        if (detUp || now - _lastDetectorSync >= 1000) { _lastDetectorSync = now; io.emit('syncDetectors', detectors); }

        // ── 플레이어 체력 재생 ─────────────────────────────────────────
        for (let pid in players) {
            let p = players[pid];
            let regenAmt = (p.hasJadam ? 5 : 0) + (p.hpRegen || 0);
            if (!p.isDead && p.hp < p.maxHp && regenAmt > 0 && now - (p.lastRegenTick || 0) >= 1000) {
                p.hp = Math.min(p.maxHp, p.hp + regenAmt);
                p.lastRegenTick = now;
                io.to(pid).emit('heal', regenAmt);
            }
        }

        // ── 보스 · 몬스터 AI ──────────────────────────────────────────
        BossAI.update(ctx, now);

        // ── 포탈 처리 ─────────────────────────────────────────────────
        Portals.update(ctx, now);

        // ── 충격파 (그리드 판정) ──────────────────────────────────────
        Projectiles.updateShockwaves(ctx, now);
    }
};