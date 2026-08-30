// 파일명: gameLoop.js
// ============================================================================
// 🔁 서버 메인 루프 오케스트레이터
//      gameLoop/shared.js     : 공용 유틸 (SpatialGrid · emitStatus · sweptFallHit)
//      gameLoop/projectiles.js: 투사체 · 낙뢰 · 마그마 · 충격파 · 포탑 · 폭탄
//      gameLoop/bossAI.js     : 박힌범 · 검은수염 · 바제스 · 소환체 · 오크라 AI
//      gameLoop/portals.js    : 포탈 대기 · 순간이동
//
// 🛟 [안정화] 한 서브시스템에서 예외가 나도 나머지 서브시스템은 계속 돈다.
//
// ⚡ 카시모 전하 스택 감쇠 — 5초마다 1칸
// ⚡🔮 환수호박 — 전기 잔상 만료 정리
// ⚡🌩️ 전자파 연쇄 폭발 + 뇌신 재폭발(에코) 처리
//    · 환수호박 발동 중에는 '모든 회복 기능이 무효'가 된다.
// ============================================================================

const Shared = require('./gameLoop/shared.js');
const Projectiles = require('./gameLoop/projectiles.js');
const BossAI = require('./gameLoop/bossAI.js');
const Portals = require('./gameLoop/portals.js');
const SukunaAI = require('./gameLoop/sukunaAI.js');   // 🔥 저주의 왕 (헤이안 스쿠나)

// 🚀 [최적화] 매 프레임 무조건 나가던 브로드캐스트를 억제하기 위한 상태 추적값
let _lastBaseSync = 0;
let _lastBaseHp1 = -1;
let _lastBaseHp2 = -1;
let _lastDetectorSync = 0;

// ⚡ 전하 감쇠는 매 프레임 돌 필요가 없다 (200ms 간격이면 충분)
let _lastChargeDecay = 0;
const CHARGE_DECAY_INTERVAL = 200;

// 🛟 [안정화] 탐지기 상자 최대 보관 개수
const DETECTOR_CHEST_MAX = 30;

// 🛟 [안정화] 투사체 / 이펙트 배열 상한
const MAX_PROJECTILES = 400;
const MAX_SHOCKWAVES  = 200;
const MAX_MAGMAS      = 300;
const MAX_MANTLEBOLTS = 300;
// ⚡🔮 환수호박 잔상 · 연쇄 폭발 · 재폭발 상한
const MAX_AMBER_TRAILS = 80;
const MAX_WAVE_CHAINS  = 40;
const MAX_WAVE_ECHOES  = 20;

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

        // 🛟 배열 폭주 방어
        safe('capArrays', () => {
            capArray(State.projectiles, MAX_PROJECTILES);
            capArray(State.shockwaves, MAX_SHOCKWAVES);
            capArray(State.magmas, MAX_MAGMAS);
            capArray(State.mantleBolts, MAX_MANTLEBOLTS);
            capArray(State.amberTrails, MAX_AMBER_TRAILS);
            capArray(State.waveChains, MAX_WAVE_CHAINS);
            capArray(State.waveEchoes, MAX_WAVE_ECHOES);
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
        safe('worldCleave', () => { if (typeof ctx.processWorldCleave === 'function') ctx.processWorldCleave(now); }); // 🗡️ 세계를 가르는 참격
        safe('yumyeong', () => { if (typeof ctx.processYumyeong === 'function') ctx.processYumyeong(now); });          // 🌑 유명이경 역월 시전
        safe('domains', () => { if (typeof ctx.processDomains === 'function') ctx.processDomains(now); });             // 🌑 영역 단계 처리
        safe('domainLight', () => { if (typeof ctx.processDomainLight === 'function') ctx.processDomainLight(now); }); // 🌑☀️ 영역 [빛] 소폭발
        safe('domainDark', () => { if (typeof ctx.processDomainDark === 'function') ctx.processDomainDark(now); });    // 🌑🌑 영역 [어둠] 폭격
        safe('domainKick', () => { if (typeof ctx.processDomainKick === 'function') ctx.processDomainKick(now); });    // 💫 영역 별 궤도

        // ── ⚡🔮 환수호박 : 전기 잔상 만료 · 전자파 연쇄폭발 + 🌩️ 재폭발 ─
        safe('amberTrails', () => { if (typeof ctx.kashimoProcessAmberTrails === 'function') ctx.kashimoProcessAmberTrails(now); });
        safe('waveChains', () => { if (typeof ctx.kashimoProcessWaveChains === 'function') ctx.kashimoProcessWaveChains(now); });

        // ── ⚡ 카시모 전하 스택 감쇠 (5초마다 1칸) ─────────────────────
        safe('kashimoCharge', () => {
            if (typeof ctx.kashimoDecayCharge !== 'function') return;
            if (now - _lastChargeDecay < CHARGE_DECAY_INTERVAL) return;
            _lastChargeDecay = now;

            const decay = ctx.kashimoDecayCharge;

            for (let pid in players) {
                let p = players[pid];
                if (!p || p.isDead) continue;
                if ((p.kashimoCharge || 0) <= 0) continue;
                decay(p, 'player', pid, now);
            }
            if (State.monster && State.monster.hp > 0 && (State.monster.kashimoCharge || 0) > 0) {
                decay(State.monster, 'monster', 'monster', now);
            }
            if (State.hinbeom && State.hinbeom.hp > 0 && (State.hinbeom.kashimoCharge || 0) > 0) {
                decay(State.hinbeom, 'hinbeom', 'hinbeom', now);
            }
            if (State.blackbeard && State.blackbeard.hp > 0 && (State.blackbeard.kashimoCharge || 0) > 0) {
                decay(State.blackbeard, 'blackbeard', 'blackbeard', now);
            }
            if (State.burgess && State.burgess.hp > 0 && (State.burgess.kashimoCharge || 0) > 0) {
                decay(State.burgess, 'burgess', 'burgess', now);
            }
            for (let i = 0; i < State.hinbeomMinions.length; i++) {
                let mn = State.hinbeomMinions[i];
                if (!mn || mn.hp <= 0) continue;
                if ((mn.kashimoCharge || 0) <= 0) continue;
                decay(mn, 'minion', mn.id, now);
            }
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
                if (d.chest.length >= DETECTOR_CHEST_MAX) { d.nextMineTime = now + 30000; return; }

                let rd = Math.random() * 100;
                // 🎁 유물 등급 분포
                //    ~60%  일반 (자담 · 펩시)
                //    ~75%  희귀 상자
                //     8%   🟡 황금        (전설)
                //     8%   🎖️ 해군 코트   (전설)
                //     2%   💎 해루석      (신화)
                //     9%   🍎 열매 6종 — 모두 같은 확률 (각 1.5%)
                //          번쩍번쩍 · 쿠릉쿠릉 · 빙빙 · 마그마그
                //          새새 열매 · 자기자기열매
                //          └ 뒤의 둘은 여기가 유일한 획득처다.
                const FRUITS = ['pika_fruit', 'goro_fruit', 'hie_fruit', 'magu_fruit',
                                'phoenix_fruit', 'magnet_fruit'];
                let aid;
                if (rd < 60)      aid = (Math.random() < 0.5 ? 'jadam' : 'pepsi_art');
                else if (rd < 73) aid = 'rare_box';
                else if (rd < 81) aid = 'gold';        // 🟡 8%
                else if (rd < 89) aid = 'navy_coat';   // 🎖️ 8%
                else if (rd < 91) aid = 'haeru';       // 💎 2%
                else aid = FRUITS[Math.floor(Math.random() * FRUITS.length)];
                d.chest.push({ uid: Math.random().toString(36).substr(2, 9), id: aid });
                d.nextMineTime = now + 30000;   // ⛏️ 탐지 30초
                detUp = true;
            });
            if (detUp || now - _lastDetectorSync >= 1000) { _lastDetectorSync = now; io.emit('syncDetectors', detectors); }
        });

        // ── 플레이어 체력 재생 ─────────────────────────────────────────
        //    ⚡🔮 환수호박 발동 중에는 '모든 회복 기능이 무효'가 된다.
        safe('regen', () => {
            for (let pid in players) {
                let p = players[pid];
                if (p.amberActive) { p.lastRegenTick = now; continue; }

                let regenAmt = (p.hasJadam ? 5 : 0) + (p.hpRegen || 0);
                // 🗡️ 석혼도에 맞으면 2.5초 동안 회복량이 30% 로 줄어든다
                if (p.healCutUntil && now < p.healCutUntil) {
                    regenAmt = regenAmt * (p.healCutMul || 0.3);
                }
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
        safe('sukunaAI', () => SukunaAI.update(ctx, now));   // 🔥 헤이안 스쿠나 AI
        safe('kurusu', () => { if (typeof ctx.kurusuProcessAll === 'function') ctx.kurusuProcessAll(now); });   // 🕊️ 쿠루스
        safe('marco', () => { if (typeof ctx.marcoProcessAll === 'function') ctx.marcoProcessAll(now); });      // 🔥 마르코
        safe('kid', () => { if (typeof ctx.kidProcessAll === 'function') ctx.kidProcessAll(now); });            // 🧲 키드
        safe('kuzanp', () => { if (typeof ctx.kuzanpProcessAll === 'function') ctx.kuzanpProcessAll(now); });     // ❄️ 쿠잔(해적)
        safe('blackMarket', () => { require('./server/blackMarket.js').process(now, io); });                       // 🕶️ 암매상
        safe('gov', () => { require('./server/govEffects.js').process(now, ctx); });                              // 🏛️ 세계정부
        safe('portals', () => Portals.update(ctx, now));

        // ── 충격파 (그리드 판정) ──────────────────────────────────────
        safe('shockwaves', () => Projectiles.updateShockwaves(ctx, now));
    }
};