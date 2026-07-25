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
        state.camX = state.myPlayer.x - state.viewW / 2; 
        state.camY = state.myPlayer.y - state.viewH / 2 - 140; 
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

window.renderGameFrame = (ctx, myPlayer, players, serverMonster, serverProjectiles, serverShockwaves, serverDetectors, visualFX, serverBases, serverOkras, BLUE_SHOP_X, RED_SHOP_X, BLUE_SMITH_X, RED_SMITH_X, BLUE_NEXUS_X, RED_NEXUS_X, BLUE_STORAGE_X, RED_STORAGE_X, BUSHES, magmas, mantleBolts) => {
    const state = {
        myPlayer, players, visualFX, magmas, mantleBolts, 
        myId: window.myId,
        monster: serverMonster,
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
