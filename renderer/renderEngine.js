// 파일명: renderEngine.js
// ============================================================================
// 🎨 렌더 오케스트레이터
//    · 카메라 · 화면 흔들림 · 암흑 왕좌 격리 렌더링을 관리한다.
//    · 실제 그리기는 RenderMap / RenderEntity / RenderEffect 가 담당한다.
//    · fx*.js 모듈들을 import 하여 effectRegistry 에 자기 자신을 등록시킨다.
//
// 🛟 [수정] state 에 groundY · worldWidth · constants · platforms 를 반드시 넣는다.
//    RenderMap 이 이 네 값을 destructuring 으로 꺼내 쓰는데 빠져 있어서
//    createLinearGradient(0,-3000,0,undefined) 에서 예외가 났고,
//    renderLoop 의 try/catch 가 이를 삼켜 화면이 통째로 검게 나왔다.
// ============================================================================

import { RenderMap } from './renderMap.js';
import { RenderEntity } from './renderEntity.js';
import { RenderEffect } from './renderEffect.js';
import { RenderUtils } from './renderUtils.js';

// 🎇 이펙트 모듈 등록 (import 만으로 registerVisualFX 가 실행된다)
import './fxcommon.js';
import './fxprojectiles.js';
import './fxenvironment.js';
import './fxhaki.js';
import './fxenel.js';
import './fxborsalino.js';
import './fxkuzan.js';
import './fxsakazuki.js';
import './fxblackbeard.js';
import './fxkashimo.js';
import './fxdabura.js';          // ⬛ 다부라 카라바

const mapRenderer = new RenderMap();
const entityRenderer = new RenderEntity();
const effectRenderer = new RenderEffect();

// ⚫ 암흑 왕좌 렌더 격리 구간 (gameState.js 와 동일해야 함)
const DZ_MIN = 35400, DZ_MAX = 41600;

/** ⚫ 이 좌표가 암흑 왕좌 구역 안인가 */
function inDarkZone(x) { return x >= DZ_MIN && x <= DZ_MAX; }

/** 🛟 유한한 숫자면 그대로, 아니면 대체값 */
function num(v, fallback) { return Number.isFinite(v) ? v : fallback; }

/**
 * 🗺️ RenderMap 이 요구하는 POI 상수 묶음을 만든다.
 *    renderGameFrame 인자로 넘어온 값을 우선 쓰고, 없으면 window 값으로 채운다.
 */
function buildConstants(p) {
    return {
        BLUE_SHOP_X:    num(p.BLUE_SHOP_X,    num(window.BLUE_SHOP_X, 11800)),
        RED_SHOP_X:     num(p.RED_SHOP_X,     num(window.RED_SHOP_X, 20200)),
        BLUE_SMITH_X:   num(p.BLUE_SMITH_X,   num(window.BLUE_SMITH_X, 11430)),
        RED_SMITH_X:    num(p.RED_SMITH_X,    num(window.RED_SMITH_X, 20570)),
        BLUE_NEXUS_X:   num(p.BLUE_NEXUS_X,   num(window.BLUE_NEXUS_X, 12250)),
        RED_NEXUS_X:    num(p.RED_NEXUS_X,    num(window.RED_NEXUS_X, 19750)),
        BLUE_STORAGE_X: num(p.BLUE_STORAGE_X, num(window.BLUE_STORAGE_X, 11100)),
        RED_STORAGE_X:  num(p.RED_STORAGE_X,  num(window.RED_STORAGE_X, 20900)),
        // 🛠️ 테스트 창고 (renderGameFrame 인자로는 넘어오지 않는다)
        BLUE_TEST_STORAGE_X: num(window.BLUE_TEST_STORAGE_X, 10800),
        RED_TEST_STORAGE_X:  num(window.RED_TEST_STORAGE_X, 21200)
    };
}

/**
 * ⚡ 전하 4스택 대상이 화면 안에 있는가?
 *    카시모의 1번 스킬 이름이 '대기를 가르는 번개'로 바뀌는 조건이다.
 */
function updateKashimoSkillLabel(state) {
    const my = state.myPlayer;
    if (!my || my.characterType !== 'KASHIMO') {
        if (window.kashimoSkyReady) {
            window.kashimoSkyReady = false;
            if (typeof window.refreshKashimoSkillLabel === 'function') window.refreshKashimoSkillLabel(false);
        }
        return;
    }
    // ⚡🔮 환수호박 중에는 1번이 '전자파'이므로 판정하지 않는다
    if (my.amberActive) {
        if (window.kashimoSkyReady) {
            window.kashimoSkyReady = false;
            if (typeof window.refreshKashimoSkillLabel === 'function') window.refreshKashimoSkillLabel(false);
        }
        return;
    }

    const MAX = window.KASHIMO_CHARGE_MAX || 4;
    const RX = 1900, RY = 1100;
    let found = false;

    const consider = (o) => {
        if (found || !o) return;
        if ((o.kashimoCharge || 0) < MAX) return;
        if (Math.abs(o.x - my.x) > RX) return;
        if (Math.abs(o.y - my.y) > RY) return;
        found = true;
    };

    for (let pid in state.players) {
        if (pid === state.myId) continue;
        let t = state.players[pid];
        if (!t || t.isDead || t.team === my.team) continue;
        consider(t);
    }
    if (!found && state.monster && state.monster.hp > 0) consider(state.monster);
    if (!found && state.hinbeom && state.hinbeom.hp > 0 && (!state.minions || state.minions.length === 0)) consider(state.hinbeom);
    if (!found && state.blackbeard && state.blackbeard.hp > 0) consider(state.blackbeard);
    if (!found && state.burgess && state.burgess.hp > 0 && state.burgess.state !== 'none' && state.burgess.state !== 'dead') consider(state.burgess);
    if (!found && state.minions) for (let i = 0; i < state.minions.length; i++) { consider(state.minions[i]); if (found) break; }
    if (!found && state.okras) for (let i = 0; i < state.okras.length; i++) { consider(state.okras[i]); if (found) break; }

    if (window.kashimoSkyReady !== found) {
        window.kashimoSkyReady = found;
        if (typeof window.refreshKashimoSkillLabel === 'function') window.refreshKashimoSkillLabel(false);
    }
}

window.renderGameFrame = (
    ctx, myPlayer, players, monster, projectiles, shockwaves, detectors, visualFX, bases,
    okras, BLUE_SHOP_X, RED_SHOP_X, BLUE_SMITH_X, RED_SMITH_X, BLUE_NEXUS_X, RED_NEXUS_X,
    BLUE_STORAGE_X, RED_STORAGE_X, BUSHES, magmas, mantleBolts, hinbeom, minions
) => {
    if (!ctx || !myPlayer) return;

    const canvas = ctx.canvas;
    const W = canvas.width, H = canvas.height;
    const mathNow = Date.now();

    const SCALE = window.VIEW_SCALE || 0.5;
    const viewW = W / SCALE;
    const viewH = H / SCALE;

    const WORLD_W = window.WORLD_WIDTH || 42000;
    const WORLD_H = window.WORLD_HEIGHT || 3000;
    const GROUND_Y = num(window.GROUND_Y, 2000);

    // 🛟 지형 데이터가 아직 없으면 여기서 한 번 만들어 준다 (검은 화면 방지)
    if (!window.PLATFORMS && typeof window.initPhysicsTerrain === 'function') {
        try { window.initPhysicsTerrain(); } catch (e) { console.error('[RENDER] initPhysicsTerrain 실패', e); }
    }

    // ── 📷 카메라 (플레이어 중심 · 월드 경계 클램프) ─────────────────
    let px = num(myPlayer.x, 10800);
    let py = num(myPlayer.y, 1955);

    let camX = px - viewW / 2;
    let camY = py - viewH / 2;
    camX = Math.max(0, Math.min(WORLD_W - viewW, camX));
    // 세로는 위쪽(정글 상층)이 아주 높으므로 넉넉히 허용한다
    camY = Math.max(-3600, Math.min(WORLD_H - viewH, camY));
    if (!Number.isFinite(camX)) camX = 0;
    if (!Number.isFinite(camY)) camY = 0;

    // ── 💥 화면 흔들림 ───────────────────────────────────────────────
    let shakeX = 0, shakeY = 0;
    if (window.shakeUntil && mathNow < window.shakeUntil) {
        let mag = window.shakeMag || 12;
        let left = (window.shakeUntil - mathNow);
        let fade = Math.min(1, left / 400);
        shakeX = (Math.random() * 2 - 1) * mag * fade;
        shakeY = (Math.random() * 2 - 1) * mag * fade;
    } else if (window.shakeUntil && mathNow >= window.shakeUntil) {
        window.shakeUntil = 0;
        window.shakeMag = 0;
    }

    // ── 🧾 렌더 상태 묶음 ────────────────────────────────────────────
    const constants = buildConstants({
        BLUE_SHOP_X, RED_SHOP_X, BLUE_SMITH_X, RED_SMITH_X,
        BLUE_NEXUS_X, RED_NEXUS_X, BLUE_STORAGE_X, RED_STORAGE_X
    });

    const state = {
        camX: camX, camY: camY, viewW: viewW, viewH: viewH,
        mathNow: mathNow,

        // 🛟 [핵심] RenderMap / fx 모듈이 요구하는 월드 정보
        groundY: GROUND_Y,
        worldWidth: WORLD_W,
        worldHeight: WORLD_H,
        constants: constants,
        platforms: window.PLATFORMS || [],

        myPlayer: myPlayer, myId: window.myId, players: players || {},
        monster: monster, hinbeom: hinbeom, minions: minions || [],
        blackbeard: window.serverBlackbeard, burgess: window.serverBurgess,
        okras: okras || [],
        projectiles: projectiles || [], shockwaves: shockwaves || [],
        detectors: detectors || [], visualFX: visualFX || [],
        magmas: magmas || [], mantleBolts: mantleBolts || [],
        bases: bases || window.serverBases, bushes: BUSHES || [],
        hinbeomPortal: window.serverHinbeomPortal,
        darkPortal: window.serverDarkPortal,
        blackbeardPortal: window.serverBlackbeardPortal,

        // 기존 코드 호환용 (constants 와 동일한 내용)
        POIs: constants,

        // ⚫ 내 캐릭터가 암흑 왕좌 안에 있으면 바깥 세상을 그리지 않는다
        inDarkZone: inDarkZone(px)
    };

    // ⚡ 카시모 1번 스킬 이름 판정 (state.blackbeard 세팅 이후에 호출한다)
    updateKashimoSkillLabel(state);

    // ── 🎨 그리기 ────────────────────────────────────────────────────
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.scale(SCALE, SCALE);
    ctx.translate(-camX + shakeX, -camY + shakeY);

    // 🛟 한 계층에서 예외가 나도 나머지 계층은 계속 그린다
    try { mapRenderer.render(ctx, state); }
    catch (e) { logLayerError('map', e); }

    try { entityRenderer.render(ctx, state); }
    catch (e) { logLayerError('entity', e); }

    try { effectRenderer.render(ctx, state); }
    catch (e) { logLayerError('effect', e); }

    ctx.restore();
};

// 🛟 계층별 예외 로그 (5초에 한 번만)
const _layerErrAt = {};
function logLayerError(name, e) {
    const now = Date.now();
    if (!_layerErrAt[name] || now - _layerErrAt[name] > 5000) {
        _layerErrAt[name] = now;
        console.error('[RENDER:' + name + ']', e);
    }
}