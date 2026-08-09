// 파일명: core/netUtils.js
// ============================================================================
// 🧰 네트워크 모듈 공용 유틸 + 모듈 등록기
//
//  network.js 를 역할별로 쪼개면서, 여러 모듈이 함께 쓰는 도구를 여기 모았다.
//  · capUntil        : 서버가 준 '만료 시각'을 상한선으로 잘라 낸다
//  · releaseAllLocks : 내 캐릭터의 모든 잠금을 즉시 해제한다
//  · clearFXByType   : 특정 소유자의 이펙트를 끈다
//  · applyCharge     : ⚡ 전하 스택을 대상 종류에 맞게 반영한다
//  · setNetTarget / snapTo / initNet : 원격 플레이어 위치 보간용
//  · frames          : ms → 프레임 수 변환 (visualFX life 계산)
//
//  ⚠️ 이 파일은 다른 net*.js 보다 먼저 로드되어야 한다.
// ============================================================================

(function () {
    'use strict';

    // 🛟 어떤 잠금도 이보다 길게 미래를 가리킬 수 없다
    const LOCK_CAP = 15000;

    /** 🛟 서버가 준 만료 시각을 안전한 범위로 자른다 */
    function capUntil(v) {
        let n = Number(v);
        if (!Number.isFinite(n) || n <= 0) return 0;
        let max = Date.now() + LOCK_CAP;
        return (n > max) ? max : n;
    }

    /** ⏱️ ms → 60fps 기준 프레임 수 */
    function frames(ms) {
        let n = Number(ms);
        if (!Number.isFinite(n) || n <= 0) return 30;
        return Math.max(1, Math.round(n / (1000 / 60)));
    }

    /**
     * 🛟 내 캐릭터의 모든 잠금을 즉시 해제한다.
     *    (연결 끊김 · 재연결 · 사망 · 부활 · 재접속 시 호출)
     */
    function releaseAllLocks(reason) {
        const p = window.myPlayer;
        if (!p) return;
        p.isCasting = false; p.castLockUntil = 0;
        p.skill1Dashing = false; p.dashLockUntil = 0;
        p.skill3Active = false;
        p.iceAgeActive = false;
        p.yataActive = false; p.yataPath = null; p.yataCanceling = false;
        p.crowsPullUntil = 0;
        p.yamiLockUntil = 0; p.yamiBindUntil = 0; p.guraChargeUntil = 0;
        p.elThorLockUntil = 0; p.raigoPullUntil = 0;
        p.airFreezeUntil = 0; p.frozenUntil = 0; p.electrocutedUntil = 0;
        p.lightDashUntil = 0;
        p.sonicChargeUntil = 0;          // ⚡🔮 음파 응축
        p.surgeLockUntil = 0;            // ⚡🌋 주력 방출 고정
        p.amberDashUntil = 0;            // ⚡🔮 전격 돌진
        // ⬛ 다부라 : 빛 · 어둠 · 아광속 발차기 · 어둠 흡인
        p.dLightActive = false; p.dLightEnd = 0; p.dLightRiseUntil = 0;
        p.dDarkActive = false; p.dDarkEnd = 0;
        p.dKickCharging = false; p.dKickChargeEnd = 0;
        p.dKickFlying = false; p.dKickFlyEnd = 0;
        p.darkPullUntil = 0;
        // 🗣️ NPC 대화 잠금도 함께 해제하고 대화창을 닫는다
        p.npcTalking = null;
        if (typeof window.closeNpcDialog === 'function') window.closeNpcDialog();
        p._cliStuckSince = 0;
        if (reason) console.warn('[NET] 잠금 전체 해제 — ' + reason);
    }

    /** 🎇 특정 타입 · 특정 소유자의 이펙트를 끈다 (ownerId 생략 시 전부) */
    function clearFXByType(type, ownerId) {
        const fxs = window.visualFX;
        if (!fxs) return;
        for (let i = 0; i < fxs.length; i++) {
            let t = fxs[i];
            if (!t.active || t.type !== type) continue;
            if (ownerId !== undefined && ownerId !== null && t.ownerId !== ownerId) continue;
            t.active = false;
        }
    }

    /** 🎇 특정 타입 · 특정 '대상'의 이펙트를 끈다 (targetId 기준) */
    function clearFXByTarget(type, targetId) {
        const fxs = window.visualFX;
        if (!fxs) return;
        for (let i = 0; i < fxs.length; i++) {
            let t = fxs[i];
            if (t.active && t.type === type && t.targetId === targetId) t.active = false;
        }
    }

    /** ⚡🌋 주력 방출 이펙트를 끈다 */
    function clearSurgeFX(ownerId) { clearFXByType('kashimo_surge', ownerId); }

    /** ⚡🔮 환수호박 오라 이펙트를 끈다 */
    function clearAmberFX(ownerId) { clearFXByType('kashimo_amber_aura', ownerId); }

    /** ⚡🔮 환수호박 오라를 켠다 (중복 방지) */
    function startAmberFX(ownerId) {
        clearAmberFX(ownerId);
        window.visualFX.push({
            type: 'kashimo_amber_aura',
            ownerId: ownerId,
            x: 0, y: 0,
            durationMs: 1000,          // 매 프레임 갱신되어 사실상 무한 유지
            life: 60, maxLife: 60
        });
    }

    /** ⚡🔮 환수호박 잔상(돌진 전용) 이펙트를 끈다 */
    function clearAmberTrailFX(ownerId) {
        clearFXByType('kashimo_amber_trail', ownerId);
        clearFXByType('kashimo_amber_dash', ownerId);
    }

    /** ⬛ 다부라의 모든 지속 이펙트를 끈다 */
    function clearDaburaFX(ownerId) {
        clearFXByType('dabura_light_beams', ownerId);
        clearFXByType('dabura_light_rise', ownerId);
        clearFXByType('dabura_dark_vortex', ownerId);
        clearFXByType('dabura_kick_charge', ownerId);
        clearFXByType('dabura_kick_aura', ownerId);
        clearFXByType('dabura_kick_trail', ownerId);
    }

    /**
     * ⚡ 전하 스택을 대상 종류에 맞게 반영한다.
     *    서버는 targetKind / targetId 로 대상을 지정한다.
     */
    function applyCharge(kind, id, charge, until) {
        let obj = null;
        if (kind === 'player') {
            if (id === window.myId) {
                window.myPlayer.kashimoCharge = charge;
                window.myPlayer.kashimoChargeUntil = until;
            }
            obj = window.players[id];
        }
        else if (kind === 'monster')    obj = window.serverMonster;
        else if (kind === 'hinbeom')    obj = window.serverHinbeom;
        else if (kind === 'blackbeard') obj = window.serverBlackbeard;
        else if (kind === 'burgess')    obj = window.serverBurgess;
        else if (kind === 'minion')     obj = (window.serverMinions || []).find(m => m.id === id);
        else if (kind === 'okra')       obj = (window.serverOkras || []).find(o => o.id === id);

        if (obj) { obj.kashimoCharge = charge; obj.kashimoChargeUntil = until; }
    }

    // ── 🎞️ 원격 플레이어 위치 보간 ───────────────────────────────────
    function setNetTarget(p, x, y) {
        if (!p) return;
        if (x !== undefined && Number.isFinite(x)) p.netX = x;
        if (y !== undefined && Number.isFinite(y)) p.netY = y;
    }
    function snapTo(p, x, y) {
        if (!p) return;
        if (x !== undefined && Number.isFinite(x)) { p.x = x; p.netX = x; }
        if (y !== undefined && Number.isFinite(y)) { p.y = y; p.netY = y; }
    }
    function initNet(p) { if (p) { p.netX = p.x; p.netY = p.y; } return p; }

    /** 🎯 대상(플레이어/몬스터/보스)을 종류로 찾아 반환 */
    function resolveEntity(kind, id) {
        if (!kind || kind === 'player') {
            return (id === window.myId) ? window.myPlayer : window.players[id];
        }
        if (kind === 'monster')    return window.serverMonster;
        if (kind === 'hinbeom')    return window.serverHinbeom;
        if (kind === 'blackbeard') return window.serverBlackbeard;
        if (kind === 'burgess')    return window.serverBurgess;
        if (kind === 'minion')     return (window.serverMinions || []).find(m => m.id === id);
        if (kind === 'okra')       return (window.serverOkras || []).find(o => o.id === id);
        return null;
    }

    // ========================================================================
    // 🧩 네트워크 모듈 등록기
    //    각 net*.js 가 registerNetModule('이름', fn) 으로 자신을 등록하고,
    //    network.js 가 initNetwork(socket) 시점에 전부 실행한다.
    // ========================================================================
    window.NET_MODULES = window.NET_MODULES || [];
    window.registerNetModule = function (name, fn) {
        if (typeof fn !== 'function') return;
        // 같은 이름이 두 번 등록되면 나중 것으로 교체한다 (핫리로드 안전)
        for (let i = 0; i < window.NET_MODULES.length; i++) {
            if (window.NET_MODULES[i].name === name) { window.NET_MODULES[i].fn = fn; return; }
        }
        window.NET_MODULES.push({ name: name, fn: fn });
    };

    window.NetUtils = {
        LOCK_CAP,
        capUntil, frames,
        releaseAllLocks,
        clearFXByType, clearFXByTarget,
        clearSurgeFX, clearAmberFX, startAmberFX, clearAmberTrailFX,
        clearDaburaFX,
        applyCharge,
        setNetTarget, snapTo, initNet,
        resolveEntity
    };

    // 🛟 다른 모듈(및 기존 코드)이 곧바로 쓸 수 있도록 전역에도 노출한다
    window.releaseAllLocks = releaseAllLocks;
})();