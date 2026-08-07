// 파일명: renderEngine.js

import { RenderMap } from './renderMap.js'; 
import { RenderEntity } from './renderEntity.js';
import { RenderEffect } from './renderEffect.js'; 

import './fxenel.js';
import './fxborsalino.js';
import './fxkuzan.js';
import './fxsakazuki.js';
import './fxcommon.js';
import './fxprojectiles.js';
import './fxenvironment.js';
import './fxhaki.js';          // 🥊 패왕색 패기
import './fxblackbeard.js';    // ⚫ 검은수염 (암흑물질 / 크로우즈 / 파공아 / 공중 강림) + 🟪 지저스 바제스
import './fxkashimo.js';       // ⚡ 카시모 하지메 (평타 · 반격 전류 · 번개 · 대기를 가르는 번개)

class RenderEngine {
    constructor() {
        this.renderMap = new RenderMap();
        this.renderEntity = new RenderEntity();
        this.renderEffect = new RenderEffect();
    }

    renderFrame(ctx, state) {
        if (!window.GameData || !window.GameData.Map) return;

        const viewScale = window.GameData.Map.VIEW_SCALE || 0.5;
        state.groundY = window.GameData.Map.GROUND_Y || 2000;
        state.worldWidth = window.GameData.Map.WORLD_WIDTH || 34000;
        state.viewW = ctx.canvas.width / viewScale;
        state.viewH = ctx.canvas.height / viewScale;

        // ⚫ 검은수염 / 🟪 바제스 / 포탈 상태는 window 에서 직접 읽어 온다 (호출부 수정 불필요)
        state.blackbeard = window.serverBlackbeard || null;
        state.burgess = window.serverBurgess || null;              // 🟪 지저스 바제스
        state.darkPortal = window.serverDarkPortal || null;
        state.blackbeardPortal = window.serverBlackbeardPortal || null;
        state.hinbeomPortal = window.serverHinbeomPortal || null;

        // 💥 화면 흔들림 (파공아 / 공중 강림 / 바제스 착지)
        let shakeX = 0, shakeY = 0;
        let nowShake = Date.now();
        if (window.shakeUntil && nowShake < window.shakeUntil) {
            let mag = window.shakeMag || 18;
            shakeX = (Math.random() - 0.5) * mag * 2;
            shakeY = (Math.random() - 0.5) * mag * 2;
        } else {
            window.shakeMag = 0;
        }

        state.camX = state.myPlayer.x - state.viewW / 2 + shakeX; 
        state.camY = state.myPlayer.y - state.viewH / 2 - 140 + shakeY; 
        state.mathNow = Date.now();

        // ⚡ [신규] 카시모 1번 스킬 라벨 전환 판정
        //    전하 4스택이 채워진 대상이 '화면 안'에 있으면 스킬 이름이
        //    '대기를 가르는 번개'로 바뀐다. 화면에서 벗어나면 다시 '번개'.
        //    렌더 프레임마다 카메라 범위를 알 수 있으므로 여기서 계산한다.
        this.updateKashimoSkillLabel(state);

        ctx.save(); 
        ctx.scale(viewScale, viewScale); 
        ctx.translate(-state.camX, -state.camY);

        this.renderMap.render(ctx, state);
        this.renderEntity.render(ctx, state);
        this.renderEffect.render(ctx, state); 

        ctx.restore();
    }

    /**
     * ⚡ 전하 4스택 대상이 화면 안에 있는지 검사해 window.kashimoSkyReady 를 갱신한다.
     *    ui.js 의 applySkillNames / updateKashimoSkillLabel 이 이 값을 읽어
     *    1번 스킬 버튼 이름을 바꾼다.
     */
    updateKashimoSkillLabel(state) {
        const my = state.myPlayer;
        if (!my || my.characterType !== 'KASHIMO') {
            if (window.kashimoSkyReady) {
                window.kashimoSkyReady = false;
                if (typeof window.refreshKashimoSkillLabel === 'function') window.refreshKashimoSkillLabel();
            }
            return;
        }

        const camX = state.camX, camY = state.camY;
        const viewW = state.viewW, viewH = state.viewH;
        const MAX = 4;

        // 화면 안(약간의 여유 포함)에 있는가
        const onScreen = (o) => {
            if (!o) return false;
            return o.x > camX - 60 && o.x < camX + viewW + 60
                && o.y > camY - 60 && o.y < camY + viewH + 60;
        };
        const isFull = (o) => o && (o.kashimoCharge || 0) >= MAX;

        let ready = false;

        // 적 플레이어
        for (let id in state.players) {
            if (id === state.myId) continue;
            let t = state.players[id];
            if (!t || t.isDead || t.team === my.team) continue;
            if (isFull(t) && onScreen(t)) { ready = true; break; }
        }
        // 몬스터 · 보스
        if (!ready && state.monster && state.monster.hp > 0 && isFull(state.monster) && onScreen(state.monster)) ready = true;
        if (!ready && state.hinbeom && state.hinbeom.hp > 0 && state.hinbeom.state !== 'dead' && isFull(state.hinbeom) && onScreen(state.hinbeom)) ready = true;
        if (!ready && state.blackbeard && state.blackbeard.hp > 0 && state.blackbeard.state !== 'dead' && isFull(state.blackbeard) && onScreen(state.blackbeard)) ready = true;
        if (!ready && state.burgess && state.burgess.hp > 0 && state.burgess.state !== 'dead' && state.burgess.state !== 'none' && isFull(state.burgess) && onScreen(state.burgess)) ready = true;
        // 소환체
        if (!ready && state.minions) {
            for (let i = 0; i < state.minions.length; i++) {
                let mn = state.minions[i];
                if (mn && mn.hp > 0 && isFull(mn) && onScreen(mn)) { ready = true; break; }
            }
        }
        // 오크라
        if (!ready && state.okras) {
            for (let i = 0; i < state.okras.length; i++) {
                let ok = state.okras[i];
                if (ok && ok.hp > 0 && isFull(ok) && onScreen(ok)) { ready = true; break; }
            }
        }

        if (window.kashimoSkyReady !== ready) {
            window.kashimoSkyReady = ready;
            if (typeof window.refreshKashimoSkillLabel === 'function') window.refreshKashimoSkillLabel();
        }
    }
}

let gameRendererInstance = new RenderEngine();

window.renderGameFrame = (ctx, myPlayer, players, serverMonster, serverProjectiles, serverShockwaves, serverDetectors, visualFX, serverBases, serverOkras, BLUE_SHOP_X, RED_SHOP_X, BLUE_SMITH_X, RED_SMITH_X, BLUE_NEXUS_X, RED_NEXUS_X, BLUE_STORAGE_X, RED_STORAGE_X, BUSHES, magmas, mantleBolts, serverHinbeom, serverMinions) => {
    const state = {
        myPlayer, players, visualFX, magmas, mantleBolts, 
        myId: window.myId,
        monster: serverMonster,
        hinbeom: serverHinbeom,          // 🥊 박힌범
        minions: serverMinions,          // 🐗 소환된 할배새끼
        okras: serverOkras,
        projectiles: serverProjectiles,
        shockwaves: serverShockwaves,
        detectors: serverDetectors,
        bases: serverBases,
        platforms: window.PLATFORMS,
        bushes: BUSHES,
        // 🛠️ 테스트 창고 X좌표 상태 추가
        constants: { BLUE_SHOP_X, RED_SHOP_X, BLUE_SMITH_X, RED_SMITH_X, BLUE_NEXUS_X, RED_NEXUS_X, BLUE_STORAGE_X, RED_STORAGE_X, BLUE_TEST_STORAGE_X: window.BLUE_TEST_STORAGE_X, RED_TEST_STORAGE_X: window.RED_TEST_STORAGE_X },
        mathNow: Date.now()
    };
    gameRendererInstance.renderFrame(ctx, state);
};