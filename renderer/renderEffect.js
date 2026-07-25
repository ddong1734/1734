// 파일명: renderEffect.js

import { getProjectileRenderer, getShockwaveRenderer, getVisualFXRenderer } from './effectRegistry.js';
import { drawMagma, drawMantleBolt } from './fxenvironment.js';
import { RenderUtils } from './renderUtils.js';

export class RenderEffect {
    render(ctx, state) {
        const { camX, camY, viewW, viewH, projectiles, magmas, mantleBolts, shockwaves, visualFX } = state;

        // 1. 투사체
        for (let i = 0; i < projectiles.length; i++) { 
            let proj = projectiles[i];
            if (!RenderUtils.isVisible(camX, camY, viewW, viewH, proj.x, proj.y, 250, 250)) continue; 
            getProjectileRenderer(proj.type)(ctx, proj, state);
        }

        // 2. 낙하 마그마
        if (magmas) {
            for (let i = 0; i < magmas.length; i++) {
                if (RenderUtils.isVisible(camX, camY, viewW, viewH, magmas[i].x, magmas[i].y, 140, 480)) {
                    drawMagma(ctx, magmas[i], state.mathNow);
                }
            }
        }

        // 3. 만뢰 낙뢰
        if (mantleBolts) {
            for (let i = 0; i < mantleBolts.length; i++) {
                if (RenderUtils.isVisible(camX, camY, viewW, viewH, mantleBolts[i].x, mantleBolts[i].y, 120, 480)) {
                    drawMantleBolt(ctx, mantleBolts[i], state.mathNow);
                }
            }
        }

        // 4. 충격파
        for (let i = 0; i < shockwaves.length; i++) {
            let sw = shockwaves[i];
            if (!RenderUtils.isVisible(camX, camY, viewW, viewH, sw.x, sw.y, 400, 400, 200)) continue;
            getShockwaveRenderer(sw.type)(ctx, sw, state);
        }

        // 5. 스킬 및 상태 이펙트
        for (let i = 0; i < visualFX.length; i++) {
            let fx = visualFX[i];
            if (!fx.active) continue;

            let alpha;
            // ⚡ endAt(절대 종료 시각)이 있는 이펙트는 '시간 기반' 수명으로 처리한다.
            //    → 화면 주사율(60/90/120Hz)이나 프레임 드랍과 무관하게
            //      스킬 지속시간과 이펙트 지속시간이 항상 정확히 일치한다.
            if (fx.endAt) {
                let remain = fx.endAt - state.mathNow;
                if (remain <= 0) { fx.active = false; continue; }
                let total = fx.durationMs || remain;
                alpha = Math.max(0, Math.min(1, remain / total));
                // 기존 렌더러들이 fx.life를 파티클 위상 계산에 쓰므로 남은 시간으로 환산해 채워준다.
                fx.life = Math.max(1, Math.round(remain / (1000 / 60)));
            } else {
                fx.life--;
                if (fx.life <= 0) { fx.active = false; continue; }
                alpha = fx.life / fx.maxLife;
            }
            
            let renderer = getVisualFXRenderer(fx.type);
            if (renderer) {
                renderer(ctx, fx, alpha, state);
            }
        }
    }
}