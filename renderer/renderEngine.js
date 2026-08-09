// 파일명: renderEngine.js
// ============================================================================
// 🎨 렌더 오케스트레이터
//    · 카메라 · 화면 흔들림 · 암흑 왕좌 격리 렌더링을 관리한다.
//    · 실제 그리기는 RenderMap / RenderEntity / RenderEffect 가 담당한다.
//    · fx*.js 모듈들을 import 하여 effectRegistry 에 자기 자신을 등록시킨다.
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
import './fxdabura.js';          // ⬛ [신규] 다부라 카라바

const mapRenderer = new RenderMap();
const entityRenderer = new RenderEntity();
const effectRenderer = new RenderEffect();

// ⚫ 암흑 왕좌 렌더 격리 구간 (gameState.js 와 동일해야 함)
const DZ_MIN = 35400, DZ_MAX = 41600;

/** ⚫ 이 좌표가 암흑 왕좌 구역 안인가 */
function inDarkZone(x) { return x >= DZ_MIN && x <= DZ_MAX; }

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
    const canvas = ctx.canvas;
    const W = canvas.width, H = canvas.height;
    const mathNow = Date.now();

    const SCALE = window.VIEW_SCALE || 0.5;
    const viewW = W / SCALE;
    const viewH = H / SCALE;

    const WORLD_W = window.WORLD_WIDTH || 42000;
    const WORLD_H = window.WORLD_HEIGHT || 3000;

    // ── 📷 카메라 (플레이어 중심 · 월드 경계 클램프) ─────────────────
    let camX = myPlayer.x - viewW / 2;
    let camY = myPlayer.y - viewH / 2;
    camX = Math.max(0, Math.min(WORLD_W - viewW, camX));
    // 세로는 위쪽(정글 상층)이 아주 높으므로 넉넉히 허용한다
    camY = Math.max(-3600, Math.min(WORLD_H - viewH, camY));

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
    const state = {
        camX: camX, camY: camY, viewW: viewW, viewH: viewH,
        mathNow: mathNow,
        myPlayer: myPlayer, myId: window.myId, players: players,
        monster: monster, hinbeom: hinbeom, minions: minions || [],
        blackbeard: window.serverBlackbeard, burgess: window.serverBurgess,
        okras: okras || [],
        projectiles: projectiles || [], shockwaves: shockwaves || [],
        detectors: detectors || [], visualFX: visualFX || [],
        magmas: magmas || [], mantleBolts: mantleBolts || [],
        bases: bases, bushes: BUSHES || [],
        hinbeomPortal: window.serverHinbeomPortal,
        darkPortal: window.serverDarkPortal,
        blackbeardPortal: window.serverBlackbeardPortal,
        POIs: {
            BLUE_SHOP_X, RED_SHOP_X, BLUE_SMITH_X, RED_SMITH_X,
            BLUE_NEXUS_X, RED_NEXUS_X, BLUE_STORAGE_X, RED_STORAGE_X
        },
        // ⚫ 내 캐릭터가 암흑 왕좌 안에 있으면 바깥 세상을 그리지 않는다
        inDarkZone: inDarkZone(myPlayer.x)
    };

    // ⚡ 카시모 1번 스킬 이름 판정 (state.blackbeard 세팅 이후에 호출한다)
    updateKashimoSkillLabel(state);

    // ── 🎨 그리기 ────────────────────────────────────────────────────
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.scale(SCALE, SCALE);
    ctx.translate(-camX + shakeX, -camY + shakeY);

    mapRenderer.render(ctx, state);
    entityRenderer.render(ctx, state);
    effectRenderer.render(ctx, state);

    ctx.restore();
};