// 파일명: fxenvironment.js

import { RenderUtils } from './renderUtils.js';

// 🚀 [최적화⑤] 그라디언트 캐시
//    낙뢰/마그마는 매 프레임 개체마다 createLinearGradient + createRadialGradient 를 호출했다.
//    방주 맥심 만뢰(낙뢰 50개) 기준 초당 6,000개의 그라디언트 객체가 생성되던 것을 radius 별 1회로 줄인다.
//    ※ 그라디언트 좌표는 withContext 의 translate 이후 '로컬 좌표' 기준이므로 위치가 달라도 재사용이 안전하다.
const _magmaGradCache = new Map();
const _boltGradCache = new Map();

// 캔버스 리사이즈 등으로 컨텍스트를 새로 잡는 경우를 대비한 수동 무효화 함수
window.clearFxGradientCache = () => { _magmaGradCache.clear(); _boltGradCache.clear(); };

function getMagmaGrads(ctx, radius) {
    let g = _magmaGradCache.get(radius);
    if (g) return g;

    let tail = ctx.createLinearGradient(0, -radius * 5, 0, 0);
    tail.addColorStop(0, "rgba(255, 210, 70, 0)"); tail.addColorStop(0.5, "rgba(255, 120, 20, 0.5)"); tail.addColorStop(1, "rgba(255, 230, 120, 0.9)");

    let aura = ctx.createRadialGradient(0, 0, 4, 0, 0, radius * 1.9);
    aura.addColorStop(0, "rgba(255, 200, 70, 0.95)"); aura.addColorStop(0.5, "rgba(255, 70, 10, 0.5)"); aura.addColorStop(1, "rgba(180, 30, 0, 0)");

    let core = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.2, 0, 0, radius);
    core.addColorStop(0, "#fff0bf"); core.addColorStop(0.4, "#ff5e12"); core.addColorStop(0.85, "#7a1500"); core.addColorStop(1, "#280700");

    g = { tail, aura, core };
    _magmaGradCache.set(radius, g);
    return g;
}

function getBoltGrads(ctx, radius) {
    let g = _boltGradCache.get(radius);
    if (g) return g;

    let bLen = radius * 7;
    let tail = ctx.createLinearGradient(0, -bLen, 0, 0);
    tail.addColorStop(0, "rgba(0, 190, 255, 0)"); tail.addColorStop(0.5, "rgba(0, 200, 255, 0.5)"); tail.addColorStop(1, "rgba(190, 245, 255, 0.9)");

    let aura = ctx.createRadialGradient(0, 0, 3, 0, 0, radius * 2.0);
    aura.addColorStop(0, "rgba(200, 245, 255, 0.95)"); aura.addColorStop(0.45, "rgba(0, 190, 255, 0.55)"); aura.addColorStop(1, "rgba(0, 120, 220, 0)");

    g = { tail, aura, bLen };
    _boltGradCache.set(radius, g);
    return g;
}

export function drawMagma(ctx, m, mathNow) {
    let G = getMagmaGrads(ctx, m.radius);
    RenderUtils.withContext(ctx, m.x, m.y, () => {
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = G.tail;
        ctx.beginPath(); ctx.moveTo(-m.radius * 0.8, 0); ctx.lineTo(0, -m.radius * 5); ctx.lineTo(m.radius * 0.8, 0); ctx.closePath(); ctx.fill();
        for (let s = 0; s < 5; s++) {
            let t = ((mathNow / 120) + s * 0.4) % 1; let ey = -t * m.radius * 4.5; let ex = Math.sin(s * 2 + mathNow / 90) * m.radius * 0.5;
            ctx.fillStyle = `rgba(255, ${Math.round(210 - t * 120)}, 60, ${(1 - t) * 0.9})`;
            ctx.beginPath(); ctx.arc(ex, ey, Math.max(2, m.radius * 0.14) * (1 - t * 0.5), 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = G.aura; ctx.beginPath(); ctx.arc(0, 0, m.radius * 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        
        ctx.fillStyle = G.core; ctx.beginPath(); ctx.arc(0, 0, m.radius, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = "rgba(255, 200, 60, 0.9)"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
        for (let c = 0; c < 5; c++) {
            let a2 = (Math.PI * 2 / 5) * c + mathNow / 300;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a2) * m.radius * 0.85, Math.sin(a2) * m.radius * 0.85); ctx.stroke();
        }
    });
}

export function drawMantleBolt(ctx, mb, mathNow) {
    let G = getBoltGrads(ctx, mb.radius);
    RenderUtils.withContext(ctx, mb.x, mb.y, () => {
        ctx.globalCompositeOperation = "screen";
        let bLen = G.bLen;
        ctx.fillStyle = G.tail;
        ctx.beginPath(); ctx.moveTo(-mb.radius * 0.55, 0); ctx.lineTo(0, -bLen); ctx.lineTo(mb.radius * 0.55, 0); ctx.closePath(); ctx.fill();
        
        ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath();
        for (let bi = 0; bi <= 6; bi++) {
            let by = -bLen * (bi / 6), bx = (bi === 0) ? 0 : Math.sin(bi * 2.1 + mathNow / 60) * mb.radius * 0.75;
            if (bi === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
        }
        ctx.stroke();
        
        ctx.fillStyle = G.aura; ctx.beginPath(); ctx.arc(0, 0, mb.radius * 2.0, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.beginPath(); ctx.arc(0, 0, mb.radius * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    });
}