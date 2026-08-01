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
import './fxblackbeard.js';    // ⚫ 검은수염 (암흑물질 / 크로우즈 / 파공아 / 공중 강림)

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
        state.worldWidth = window.GameData.Map.WORLD_WIDTH || 32000;
        state.viewW = ctx.canvas.width / viewScale;
        state.viewH = ctx.canvas.height / viewScale;

        // ⚫ 검은수염 / 포탈 상태는 window 에서 직접 읽어 온다 (호출부 수정 불필요)
        state.blackbeard = window.serverBlackbeard || null;
        state.darkPortal = window.serverDarkPortal || null;
        state.blackbeardPortal = window.serverBlackbeardPortal || null;
        state.hinbeomPortal = window.serverHinbeomPortal || null;

        // 💥 화면 흔들림 (파공아 / 공중 강림)
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

        ctx.save(); 
        ctx.scale(viewScale, viewScale); 
        ctx.translate(-state.camX, -state.camY);

        this.renderMap.render(ctx, state);
        this.renderEntity.render(ctx, state);
        this.renderEffect.render(ctx, state); 

        ctx.restore();
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