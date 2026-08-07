// 파일명: gameLoop.js
// ============================================================================
// 🔁 서버 메인 루프 오케스트레이터
//    실제 처리는 gameLoop/ 하위 모듈이 담당한다.
//      gameLoop/shared.js     : 공용 유틸 (SpatialGrid · emitStatus · sweptFallHit)
//      gameLoop/projectiles.js: 투사체 · 낙뢰 · 마그마 · 충격파 · 포탑 · 폭탄
//      gameLoop/bossAI.js     : 박힌범 · 검은수염 · 바제스 · 소환체 · 오크라 AI
//      gameLoop/portals.js    : 포탈 대기 · 순간이동
//
// 🛟 [안정화] 한 서브시스템에서 예외가 나도 나머지 서브시스템은 계속 돈다.
//    (예전에는 예외 하나로 프로세스가 종료되어 게임이 통째로 멈췄다)
//
// ⚡ [신규] 카시모 전하(電荷) 스택 감쇠
//    마지막 적중으로부터 8초가 지날 때마다 1칸씩 줄어든다.
//    모든 피격 가능 대상(플레이어 · 몬스터 · 보스 3종 · 소환체 · 오크라)을 순회한다.
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

// ⚡ 전하 감쇠는 매 프레임 돌 필요가 없다 (초 단위 판정이므로 200ms 간격이면 충분)
let _lastChargeDecay = 0;
const CHARGE_DECAY_INTERVAL = 200;

// 🛟 [안정화] 탐지기 상자 최대 보관 개수
//    예전에는 상한이 없어 3초마다 무한히 쌓였고, 그 전체를 매초 모든 클라이언트에게
//    브로드캐스트했다. 30분만 지나도 수천 개가 되어 서버 직렬화 + 클라 DOM 생성이
//    폭발하며 게임이 점점 느려지다 멈췄다.
const DETECTOR_CHEST_MAX = 30;

// 🛟 [안정화] 투사체 / 이펙트 배열 상한
//    어떤 이유로든 정리 로직이 한 번 어긋나면 배열이 무한히 커지고,
//    매 프레임 전체 순회 + 브로드캐스트가 서버를 완전히 멈춰 세운다.
const MAX_PROJECTILES = 400;
const MAX_SHOCKWAVES  = 200;
const MAX_MAGMAS      = 300;
const MAX_MANTLEBOLTS = 300;

/** 배열이 상한을 넘으면 오래된 것부터 잘라낸다 */
function capArray(arr, max) {
    if (!Array.isArray(arr)) return;
    if (arr.length > max) arr.splice(0, arr.length - max);
}

// 🛟 서브시스템별 예외 로그 (5초에 한 번만 출력)
const _errAt = {};
function safe(name, fn) {
    try { fn(); }
    catch (e) {
        const now = Date.now();
        if (!_errAt[name] || now - _errAt[name] > 5000) { _errAt[name] = now; console.error('[LOOP:' + name + ']', e); }
    }
}

module.exports = {
    update: (ctx) => {
        const { State, io, compressors, CharLogic, processBurns } = ctx;
        const { players, bases, detectors, gameStarted } = State;

        if (!gameStarted) return;
        const now = Date.now();

        // 🛟 배열 폭주 방어 (어떤 경로로든 정리가 어긋났을 때의 마지막 안전망)
        safe('capArrays', () => {
            capArray(State.projectiles, MAX_PROJECTILES);
            capArray(State.shockwaves, MAX_SHOCKWAVES);
            capArray(State.magmas, MAX_MAGMAS);
            capArray(State.mantleBolts, MAX_MANTLEBOLTS);
        });

        // ── 넥서스 체력 동기화 (변화가 있거나 1초마다) ──────────────────
        safe('bases', () => {
            if (bases[1].hp !== _lastBaseHp1 || bases[2].hp !== _lastBaseHp2 || now - _lastBaseSync >= 1000) {
                _lastBaseHp1 = bases[1].hp; _lastBaseHp2 = bases[2].hp; _lastBaseSync = now;
                io.emit('syncBases', bases);
            }
        });

        // ── 캐릭터별 지속 스킬 갱신 ────────────────────────────────────
        for (let pid in players) {
            let logic = CharLogic[players[pid].characterType];
            if (logic && logic.updateLoop) safe('charLogic', () => logic.updateLoop(players[pid], now, ctx));
        }

        // ── 도트 피해 / 열매 상태 / 워치독 ─────────────────────────────
        safe('burns', () => processBurns(now));
        safe('yamiBinds', () => { if (typeof ctx.processYamiBinds === 'function') ctx.processYamiBinds(now); });      // ⛓️ 어둠 흡수
        safe('guraCharges', () => { if (typeof ctx.processGuraCharges === 'function') ctx.processGuraCharges(now); }); // 💥 파공아 예약
        safe('stuckStates', () => { if (typeof ctx.clearStuckStates === 'function') ctx.clearStuckStates(now); });     // 🛟 캐스팅 잠금 해제

        // ── ⚡ 카시모 전하 스택 감쇠 (8초마다 1칸) ─────────────────────
        safe('kashimoCharge', () => {
            if (typeof ctx.kashimoDecayCharge !== 'function') return;
            if (now - _lastChargeDecay < CHARGE_DECAY_INTERVAL) return;
            _lastChargeDecay = now;

            const decay = ctx.kashimoDecayCharge;

            // 플레이어
            for (let pid in players) {
                let p = players[pid];
                if (!p || p.isDead) continue;
                if ((p.kashimoCharge || 0) <= 0) continue;
                decay(p, 'player', pid, now);
            }
            // 할배새끼 보스
            if (State.monster && State.monster.hp > 0 && (State.monster.kashimoCharge || 0) > 0) {
                decay(State.monster, 'monster', 'monster', now);
            }
            // 박힌범
            if (State.hinbeom && State.hinbeom.hp > 0 && (State.hinbeom.kashimoCharge || 0) > 0) {
                decay(State.hinbeom, 'hinbeom', 'hinbeom', now);
            }
            // 검은수염
            if (State.blackbeard && State.blackbeard.hp > 0 && (State.blackbeard.kashimoCharge || 0) > 0) {
                decay(State.blackbeard, 'blackbeard', 'blackbeard', now);
            }
            // 지저스 바제스
            if (State.burgess && State.burgess.hp > 0 && (State.burgess.kashimoCharge || 0) > 0) {
                decay(State.burgess, 'burgess', 'burgess', now);
            }
            // 소환된 할배새끼
            for (let i = 0; i < State.hinbeomMinions.length; i++) {
                let mn = State.hinbeomMinions[i];
                if (!mn || mn.hp <= 0) continue;
                if ((mn.kashimoCharge || 0) <= 0) continue;
                decay(mn, 'minion', mn.id, now);
            }
            // 오크라
            for (let i = 0; i < State.okras.length; i++) {
                let ok = State.okras[i];
                if (!ok || ok.hp <= 0) continue;
                if ((ok.kashimoCharge || 0) <= 0) continue;
                decay(ok, 'okra', ok.id, now);
            }
        });

        // ── 발사체 · 폭탄 · 낙하물 · 충격파 ────────────────────────────
        safe('projectiles', () => Projectiles.update(ctx, now));

        // ── 탐지기 채굴 ────────────────────────────────────────────────
        safe('detectors', () => {
            let detUp = false;
            detectors.forEach(d => {
                if (now < d.nextMineTime) return;
                if (!Array.isArray(d.chest)) d.chest = [];
                // 🛟 상자가 가득 차면 더 캐지 않는다 (무한 증식 차단)
                if (d.chest.length >= DETECTOR_CHEST_MAX) { d.nextMineTime = now + 3000; return; }

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
        });

        // ── 플레이어 체력 재생 ─────────────────────────────────────────
        safe('regen', () => {
            for (let pid in players) {
                let p = players[pid];
                let regenAmt = (p.hasJadam ? 5 : 0) + (p.hpRegen || 0);
                if (!p.isDead && p.hp < p.maxHp && regenAmt > 0 && now - (p.lastRegenTick || 0) >= 1000) {
                    p.hp = Math.min(p.maxHp, p.hp + regenAmt);
                    p.lastRegenTick = now;
                    io.to(pid).emit('heal', regenAmt);
                }
            }
        });

        // ── 보스 · 몬스터 AI ──────────────────────────────────────────
        safe('bossAI', () => BossAI.update(ctx, now));

        // ── 포탈 처리 ─────────────────────────────────────────────────
        safe('portals', () => Portals.update(ctx, now));

        // ── 충격파 (그리드 판정) ──────────────────────────────────────
        safe('shockwaves', () => Projectiles.updateShockwaves(ctx, now));
    }
};