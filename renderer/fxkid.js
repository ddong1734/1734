// 파일명: fxkid.js
// ============================================================================
// 🧲 유스타스 키드 — 자기력과 고철 이펙트
//
//   🎨 배색 : 자홍(#d63cf0) · 보라(#a855f7) · 흰 심(#fff0ff) · 청록 섬광(#6fe8ff)
//            고철은 회색 금속(#8a8f98 ~ #4a5058)
//
//   · kid_strike       : 평타 (자기력을 두른 주먹)
//   · kid_golem_strike : 골렘 평타 (거대한 팔을 크게 휘두른다)
//   · kid_assign       : 1번 [어사인] 자기력 부여
//   · kid_stack        : 대상에게 고철이 쌓이는 표시 (지속)
//   · kid_assign_blast : 고철 폭발
//   · kid_laser_cast   : 2번 [댐드 펑크] 차징
//   · kid_laser        : 레이저포 발사
//   · kid_golem_cast   : 3번 [펑크 로튼] 변신
//   · kid_golem_aura   : 골렘 유지 중 아우라
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';

const MAG_CORE = "rgba(255, 240, 255, ";   // 자기력 심 (흰빛)
const MAG_MAIN = "rgba(214, 60, 240, ";    // 자홍
const MAG_DEEP = "rgba(120, 30, 190, ";    // 짙은 보라
const MAG_CYAN = "rgba(111, 232, 255, ";   // 청록 섬광
const MAG_FADE = "rgba(60, 10, 90, 0)";

const SCRAP_L = "#9aa0aa";   // 고철 밝은 면
const SCRAP_M = "#6d7480";   // 고철 중간
const SCRAP_D = "#3f454e";   // 고철 어두운 면

/** 🔩 고철 조각 하나 — 불규칙한 금속 다각형 */
function scrapChunk(ctx, x, y, r, seed, rot) {
    const N = 5 + (seed % 3);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        // 시드로 모양을 고정해 매 프레임 흔들리지 않게 한다
        const jag = 0.62 + (((seed * 37 + i * 53) % 100) / 100) * 0.55;
        const px = Math.cos(a) * r * jag, py = Math.sin(a) * r * jag;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    // 각진 면이 도드라지도록 단단한 그라데이션
    const g = ctx.createLinearGradient(-r, -r, r * 0.6, r);
    g.addColorStop(0, "#b6bcc6");
    g.addColorStop(0.28, SCRAP_L);
    g.addColorStop(0.62, SCRAP_M);
    g.addColorStop(1, "#2a2f36");
    ctx.fillStyle = g;
    ctx.fill();

    // 두꺼운 외곽선 — 투박한 쇳덩이 느낌
    ctx.strokeStyle = "#171a1f";
    ctx.lineWidth = Math.max(1.5, r * 0.20);
    ctx.lineJoin = "miter";
    ctx.stroke();

    // 안쪽 면 분할선 (찌그러진 금속판)
    ctx.strokeStyle = "rgba(20,24,30,0.55)";
    ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.1);
    ctx.lineTo(r * 0.1, -r * 0.2);
    ctx.lineTo(r * 0.5, r * 0.35);
    ctx.stroke();

    // 금속 하이라이트 2줄
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = Math.max(1, r * 0.11);
    ctx.beginPath();
    ctx.moveTo(-r * 0.38, -r * 0.32);
    ctx.lineTo(r * 0.18, -r * 0.48);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.28);
    ctx.lineTo(-r * 0.1, r * 0.42);
    ctx.stroke();

    // 리벳 2개 — 기계 부품 느낌
    ctx.fillStyle = "rgba(30,34,40,0.85)";
    ctx.beginPath(); ctx.arc(-r * 0.32, r * 0.05, Math.max(1, r * 0.11), 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.15, Math.max(1, r * 0.09), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

/**
 * ⚡ 자기력 번개 한 줄기 — 두 점 사이를 지그재그로 잇는다.
 *    자홍색 굵은 줄기 + 흰 심 + 가끔 청록 섬광
 */
function magBolt(ctx, x1, y1, x2, y2, alpha, w, seed, cyan) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const SEG = Math.max(4, Math.round(len / 42));

    const pts = [];
    for (let i = 0; i <= SEG; i++) {
        const f = i / SEG;
        // 양 끝은 붙고 가운데가 크게 흔들린다
        const amp = Math.sin(Math.PI * f) * len * 0.11;
        const j = (((seed * 71 + i * 131) % 200) / 100 - 1) * amp;
        pts.push([x1 + dx * f + nx * j, y1 + dy * f + ny * j]);
    }

    const stroke = (col, width) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = width;
        ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.beginPath();
        pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.stroke();
    };

    stroke(MAG_DEEP + (0.5 * alpha) + ")", w * 2.6);
    stroke(MAG_MAIN + (0.9 * alpha) + ")", w * 1.5);
    if (cyan) stroke(MAG_CYAN + (0.8 * alpha) + ")", w * 0.9);
    stroke(MAG_CORE + alpha + ")", w * 0.5);
}

// ────────────────────────────────────────────────────────────────────────────
// ⚔️ 평타 — 자기력을 두른 주먹
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kid_strike', (ctx, fx, alpha, state) => {
    const dir = (fx.isLeft || fx.dir === -1) ? -1 : 1;
    const t = 1 - alpha;
    const R = 105;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(fx.x, fx.y);
    ctx.scale(dir, 1);
    ctx.globalAlpha = alpha;

    // 충격 원
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, R);
    g.addColorStop(0, MAG_CORE + "0.95)");
    g.addColorStop(0.35, MAG_MAIN + "0.7)");
    g.addColorStop(1, MAG_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R * (0.55 + t * 0.5), 0, Math.PI * 2); ctx.fill();

    // 튀는 번개
    for (let k = 0; k < 4; k++) {
        const a = -0.9 + k * 0.6;
        magBolt(ctx, 0, 0, Math.cos(a) * R * 1.15, Math.sin(a) * R * 0.8,
                alpha * 0.9, 3, k + 1, k === 1);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🗿 골렘 평타 — 거대한 고철 팔을 크게 휘두른다
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kid_golem_strike', (ctx, fx, alpha, state) => {
    const dir = (fx.isLeft || fx.dir === -1) ? -1 : 1;
    const t = 1 - alpha;
    const R = fx.radius || 273;
    const swing = Math.min(1, t / 0.45);
    const ease = 1 - Math.pow(1 - swing, 2.4);

    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.scale(dir, 1);

    // ── ① 휘두르는 팔 ──────────────────────────────────────────
    //    어깨(0,0)에서 시작해 위 → 아래로 크게 내려친다
    const a0 = -Math.PI * 0.72;
    const a1 = a0 + Math.PI * 0.95 * ease;
    const armLen = R * 0.92;
    const ex = Math.cos(a1) * armLen, ey = Math.sin(a1) * armLen;

    ctx.globalAlpha = alpha;
    // 팔뚝 (굵은 고철 기둥)
    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(a1);
    const armW = R * 0.30;
    const ag = ctx.createLinearGradient(0, -armW / 2, 0, armW / 2);
    ag.addColorStop(0, SCRAP_L);
    ag.addColorStop(0.45, SCRAP_M);
    ag.addColorStop(1, SCRAP_D);
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.moveTo(0, -armW * 0.42);
    ctx.lineTo(armLen * 0.72, -armW * 0.55);
    ctx.lineTo(armLen, -armW * 0.34);
    ctx.lineTo(armLen, armW * 0.34);
    ctx.lineTo(armLen * 0.72, armW * 0.55);
    ctx.lineTo(0, armW * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#20242b"; ctx.lineWidth = 5; ctx.stroke();
    // 팔에 박힌 고철 리벳
    for (let k = 0; k < 5; k++) {
        const f = 0.15 + k * 0.18;
        scrapChunk(ctx, armLen * f, Math.sin(k * 2.1) * armW * 0.22, armW * 0.19, k * 13 + 3, k * 0.7);
    }
    ctx.restore();

    // ── ② 주먹 (큰 고철 덩어리) ────────────────────────────────
    ctx.globalAlpha = alpha;
    scrapChunk(ctx, ex, ey, R * 0.30, 7, a1);
    for (let k = 0; k < 5; k++) {
        const a = a1 + (k - 2) * 0.45;
        scrapChunk(ctx, ex + Math.cos(a) * R * 0.24, ey + Math.sin(a) * R * 0.24,
                   R * 0.13, k * 19 + 5, a);
    }

    // ── ③ 휘두른 궤적 ──────────────────────────────────────────
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.75;
    ctx.beginPath();
    ctx.arc(0, 0, armLen * 1.02, a0, a1);
    ctx.arc(0, 0, armLen * 0.55, a1, a0, true);
    ctx.closePath();
    const tg = ctx.createRadialGradient(0, 0, armLen * 0.55, 0, 0, armLen * 1.02);
    tg.addColorStop(0, MAG_FADE);
    tg.addColorStop(0.6, MAG_MAIN + (0.55 * alpha) + ")");
    tg.addColorStop(1, MAG_CORE + (0.85 * alpha) + ")");
    ctx.fillStyle = tg;
    ctx.fill();

    // ── ④ 착탄 충격 + 흩어지는 파편 ────────────────────────────
    if (ease > 0.9) {
        const ia = alpha * ((ease - 0.9) / 0.1);
        ctx.globalAlpha = ia;
        const ig = ctx.createRadialGradient(ex, ey, 4, ex, ey, R * 0.62);
        ig.addColorStop(0, MAG_CORE + "1)");
        ig.addColorStop(0.4, MAG_MAIN + "0.7)");
        ig.addColorStop(1, MAG_FADE);
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(ex, ey, R * 0.62, 0, Math.PI * 2); ctx.fill();

        ctx.globalCompositeOperation = "source-over";
        for (let k = 0; k < 7; k++) {
            const a = (k / 7) * Math.PI * 2;
            const d = R * (0.35 + t * 0.5);
            scrapChunk(ctx, ex + Math.cos(a) * d, ey + Math.sin(a) * d * 0.7,
                       R * 0.075, k * 23 + 11, a + t * 4);
        }
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🧲 1번 [어사인] — 자기력 부여
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kid_assign', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const R = fx.radius || 430;
    const t = 1 - alpha;
    const tg = fx.targets || [];

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 퍼져나가는 자기장 고리 2겹
    for (let k = 0; k < 2; k++) {
        const ft = Math.max(0, Math.min(1, t * 1.6 - k * 0.22));
        if (ft <= 0) continue;
        const rr = R * (1 - Math.pow(1 - ft, 2.1));
        ctx.globalAlpha = alpha * (1 - ft) * 0.9;
        ctx.strokeStyle = (k === 0 ? MAG_MAIN : MAG_CYAN) + "0.95)";
        ctx.lineWidth = 8 * (1 - ft) + 2;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
    }

    // 시전자에서 각 대상으로 뻗는 자기력 줄기
    ctx.globalAlpha = alpha * 0.95;
    for (let i = 0; i < tg.length; i++) {
        const P = tg[i];
        const f = Math.min(1, t / 0.45);
        const hx = cx + (P.x - cx) * f, hy = cy + (P.y - cy) * f;
        magBolt(ctx, cx, cy, hx, hy, alpha, 4, i * 7 + 3, i % 2 === 0);
    }

    // 시전자 손에 모이는 자기력
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(cx, cy, 3, cx, cy, 70 + t * 40);
    g.addColorStop(0, MAG_CORE + "1)");
    g.addColorStop(0.35, MAG_MAIN + "0.8)");
    g.addColorStop(1, MAG_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 70 + t * 40, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🔩 고철 축적 표시 — 대상 몸에 고철이 쌓인다 (renderEntity 가 직접 호출)
// ────────────────────────────────────────────────────────────────────────────
export function drawKidStack(ctx, cx, cy, size, stack, held, mathNow) {
    if (!(stack > 0)) return;
    const R = size * 0.62;
    const N = Math.round(8 + stack * 26);       // 쌓일수록 조각이 크게 늘어난다

    ctx.save();
    // ── 고철 조각들이 몸을 감싼다 ───────────────────────────────
    for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2 + k * 0.7;
        // 아직 붙는 중이면 바깥에서 빨려 들어온다
        const settle = Math.min(1, stack * 1.6 - (k / N) * 0.5);
        if (settle <= 0) continue;
        const dist = R * (2.6 - settle * 1.55);
        const px = cx + Math.cos(a) * dist;
        const py = cy + Math.sin(a) * dist * 0.9;
        const rr = R * (0.20 + ((k * 31) % 10) / 55) * (0.6 + settle * 0.6);
        ctx.globalAlpha = 0.55 + settle * 0.45;
        scrapChunk(ctx, px, py, rr, k * 17 + 2, a + mathNow / 2200);
    }

    // ── 자기력 번개가 조각 사이를 튄다 ──────────────────────────
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.55 + stack * 0.4;
    const B = held ? 9 : 6;
    for (let k = 0; k < B; k++) {
        const a1 = (mathNow / 130 + k * 2.1);
        const a2 = a1 + 1.9 + Math.sin(mathNow / 190 + k) * 0.7;
        magBolt(ctx,
            cx + Math.cos(a1) * R * 1.1, cy + Math.sin(a1) * R,
            cx + Math.cos(a2) * R * 1.1, cy + Math.sin(a2) * R,
            0.85, held ? 3 : 2, k + Math.floor(mathNow / 110), k === 0);
    }

    // ── 완전 고정 상태면 붉은 기운이 돈다 (곧 터진다) ───────────
    if (held) {
        ctx.globalAlpha = 0.35 + Math.sin(mathNow / 70) * 0.3;
        const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.7);
        g.addColorStop(0, "rgba(255, 90, 60, 0.85)");
        g.addColorStop(0.6, MAG_MAIN + "0.5)");
        g.addColorStop(1, MAG_FADE);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// 💥 고철 폭발
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kid_assign_blast', (ctx, fx, alpha, state) => {
    const R = fx.radius || 250;
    const t = 1 - alpha;
    const rr = R * (1 - Math.pow(1 - Math.min(1, t / 0.35), 2.3));

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 폭발 섬광
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(fx.x, fx.y, 5, fx.x, fx.y, rr);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.22, MAG_CORE + "0.95)");
    g.addColorStop(0.55, MAG_MAIN + "0.7)");
    g.addColorStop(1, MAG_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr, 0, Math.PI * 2); ctx.fill();

    // 사방으로 튀는 번개
    ctx.globalAlpha = alpha * 0.9;
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        magBolt(ctx, fx.x, fx.y,
                fx.x + Math.cos(a) * rr * 1.2, fx.y + Math.sin(a) * rr * 1.2,
                alpha, 3.5, k * 5 + 1, k % 3 === 0);
    }

    // 흩날리는 고철 파편
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha;
    for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2 + 0.3;
        const d = rr * (0.5 + ((k * 29) % 10) / 16);
        scrapChunk(ctx, fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d * 0.85,
                   R * 0.055, k * 13 + 7, a + t * 6);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🔫 2번 [댐드 펑크] — 차징
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kid_laser_cast', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const t = 1 - alpha;
    const ang = fx.angle || 0;

    ctx.save();

    // ── ① 고철이 모여 포신을 이룬다 ────────────────────────────
    const barrel = 190 * Math.min(1, t / 0.7);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    for (let k = 0; k < 16; k++) {
        const f = k / 15;
        const settle = Math.min(1, t * 1.5 - f * 0.4);
        if (settle <= 0) continue;
        const px = barrel * f * settle;
        const py = Math.sin(k * 1.7) * 44 * (1 - settle * 0.55);
        ctx.globalAlpha = 0.6 + settle * 0.4;
        scrapChunk(ctx, px, py, 20 + (k % 3) * 7, k * 21 + 5, k * 0.5 + t * 2);
    }
    // 포구
    ctx.globalAlpha = alpha;
    scrapChunk(ctx, barrel, 0, 42 * Math.min(1, t / 0.6), 3, t * 3);
    ctx.restore();

    // ── ② 포구에 모이는 에너지 ─────────────────────────────────
    ctx.globalCompositeOperation = "screen";
    const mx = cx + Math.cos(ang) * barrel, my = cy + Math.sin(ang) * barrel;
    ctx.globalAlpha = 0.5 + t * 0.5;
    const cg = ctx.createRadialGradient(mx, my, 2, mx, my, 30 + t * 75);
    cg.addColorStop(0, "rgba(255,255,255,1)");
    cg.addColorStop(0.35, MAG_CORE + "0.9)");
    cg.addColorStop(0.7, MAG_MAIN + "0.6)");
    cg.addColorStop(1, MAG_FADE);
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(mx, my, 30 + t * 75, 0, Math.PI * 2); ctx.fill();

    // ── ③ 빨려드는 자기력 ──────────────────────────────────────
    ctx.globalAlpha = 0.5 + t * 0.4;
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + state.mathNow / 300;
        const far = 260 * (1 - t) + 70;
        magBolt(ctx, mx + Math.cos(a) * far, my + Math.sin(a) * far, mx, my,
                0.75, 2.5, k * 9 + 2, k % 2 === 0);
    }

    // ── ④ 곧 발사한다는 예고선 ─────────────────────────────────
    if (t > 0.72) {
        const w = (t - 0.72) / 0.28;
        ctx.globalAlpha = w * 0.5;
        const lg = ctx.createLinearGradient(mx, my, mx + Math.cos(ang) * 2600, my + Math.sin(ang) * 2600);
        lg.addColorStop(0, MAG_CORE + "0.9)");
        lg.addColorStop(1, MAG_FADE);
        ctx.strokeStyle = lg;
        ctx.lineWidth = 6 + w * 26;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(ang) * 2600, my + Math.sin(ang) * 2600);
        ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🔫 레이저포 발사
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kid_laser', (ctx, fx, alpha, state) => {
    // 각도는 서버가 매 틱 갱신해 준다
    const ang = (fx.liveAngle !== undefined) ? fx.liveAngle : (fx.angle || 0);
    const range = fx.range || 2600;
    const half = fx.halfWidth || 130;
    const t = 1 - alpha;
    const barrel = 190;

    const bx = fx.x + Math.cos(ang) * barrel;
    const by = fx.y + Math.sin(ang) * barrel;
    // 발사 직후 순식간에 뻗고, 끝날 때 부드럽게 줄어든다
    const reach = Math.min(1, t / 0.06);
    const shrink = (t > 0.93) ? (1 - (t - 0.93) / 0.07) : 1;
    const L = range * reach;
    const H = half * shrink;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(bx, by);
    ctx.rotate(ang);

    // ── ① 바깥 번짐 ────────────────────────────────────────────
    ctx.globalAlpha = alpha * 0.45;
    const og = ctx.createLinearGradient(0, -H * 2.1, 0, H * 2.1);
    og.addColorStop(0, MAG_FADE);
    og.addColorStop(0.5, MAG_MAIN + "0.55)");
    og.addColorStop(1, MAG_FADE);
    ctx.fillStyle = og;
    ctx.fillRect(0, -H * 2.1, L, H * 4.2);

    // ── ② 본체 (흰 심 + 자홍 테두리) ───────────────────────────
    ctx.globalAlpha = alpha * 0.95;
    const bg = ctx.createLinearGradient(0, -H, 0, H);
    bg.addColorStop(0, MAG_MAIN + "0.5)");
    bg.addColorStop(0.24, MAG_CORE + "0.92)");
    bg.addColorStop(0.5, "rgba(255,255,255,1)");
    bg.addColorStop(0.76, MAG_CORE + "0.92)");
    bg.addColorStop(1, MAG_MAIN + "0.5)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, -H, L, H * 2);

    // ── ③ 흔들리는 안쪽 심 ─────────────────────────────────────
    const wob = Math.sin(state.mathNow / 48) * H * 0.08;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fillRect(0, -H * 0.24 + wob, L, H * 0.48);

    // ── ④ 빔을 타고 흐르는 자기력 ──────────────────────────────
    ctx.globalAlpha = alpha * 0.7;
    for (let k = 0; k < 5; k++) {
        const f = ((state.mathNow / 300) + k / 5) % 1;
        const x = L * f;
        magBolt(ctx, x, -H * 0.85, x + 120, H * 0.85, 0.8, 3, k + Math.floor(state.mathNow / 260), k % 2 === 0);
    }

    // ── ⑤ 포구 폭광 ────────────────────────────────────────────
    ctx.globalAlpha = alpha;
    const mg = ctx.createRadialGradient(0, 0, 4, 0, 0, H * 2.4);
    mg.addColorStop(0, "rgba(255,255,255,1)");
    mg.addColorStop(0.3, MAG_CORE + "0.9)");
    mg.addColorStop(0.65, MAG_MAIN + "0.5)");
    mg.addColorStop(1, MAG_FADE);
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(0, 0, H * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ── ⑥ 포신 (고철) ──────────────────────────────────────────
    ctx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.rotate(ang);
    ctx.globalAlpha = alpha;
    for (let k = 0; k < 14; k++) {
        const f = k / 13;
        scrapChunk(ctx, barrel * f, Math.sin(k * 1.7) * 20, 21 + (k % 3) * 6, k * 21 + 5, k * 0.5);
    }
    scrapChunk(ctx, barrel, 0, 44, 3, state.mathNow / 900);
    ctx.restore();
    ctx.globalAlpha = 1;
});

// ────────────────────────────────────────────────────────────────────────────
// 🗿 3번 [펑크 로튼] — 변신
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kid_golem_cast', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const t = 1 - alpha;                       // 0 → 1 (5초에 걸쳐)

    ctx.save();

    // ── ① 사방에서 빨려오는 고철 ───────────────────────────────
    const N = 30;
    for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2 + k * 0.9;
        const settle = Math.max(0, Math.min(1, t * 1.35 - (k / N) * 0.35));
        if (settle <= 0) continue;
        const far = 620 * (1 - settle);
        const px = cx + Math.cos(a) * (far + 40);
        const py = cy + Math.sin(a) * (far + 40) * 0.75 - settle * 20;
        ctx.globalAlpha = 0.5 + settle * 0.5;
        scrapChunk(ctx, px, py, 15 + (k % 4) * 6, k * 11 + 3, a + t * 5);
    }

    // ── ② 점점 골렘 실루엣이 잡힌다 ────────────────────────────
    if (t > 0.35) {
        const f = (t - 0.35) / 0.65;
        drawGolemBody(ctx, cx, cy, f, alpha * 0.95, state.mathNow, true);
    }

    // ── ③ 몸을 휘감는 자기력 ───────────────────────────────────
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.55 + t * 0.4;
    for (let k = 0; k < 5; k++) {
        const a1 = state.mathNow / 120 + k * 1.3;
        const a2 = a1 + 2.2;
        const rr = 110 + t * 90;
        magBolt(ctx,
            cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr * 0.8,
            cx + Math.cos(a2) * rr, cy + Math.sin(a2) * rr * 0.8,
            0.9, 3.5, k + Math.floor(state.mathNow / 100), k % 2 === 0);
    }

    // ── ④ 완성 직전 번쩍임 ─────────────────────────────────────
    if (t > 0.9) {
        ctx.globalAlpha = (t - 0.9) / 0.1;
        const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 420);
        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(0.4, MAG_MAIN + "0.6)");
        g.addColorStop(1, MAG_FADE);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, 420, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
});

/**
 * 🗿 고철 골렘의 몸 — 어깨가 넓고 팔이 굵은 거대한 실루엣.
 *    grow 0 → 1 로 커지며 완성된다.
 */
export function drawGolemBody(ctx, cx, cy, grow, alpha, mathNow, ghost) {
    const S = Math.max(0.05, grow);
    const W = 250 * S, H = 315 * S;
    const top = cy - H;
    const bob = Math.sin(mathNow / 620) * 5 * S;

    // 🎨 영상의 배색 — 검푸른 장갑 + 크림빛 흰 판 + 금색 링
    const ARM_D = "#141a2e";     // 가장 어두운 장갑
    const ARM_M = "#242e4a";     // 장갑 중간
    const ARM_L = "#38446a";     // 장갑 밝은 면
    const PLATE = "#eef0e6";     // 흰 판 (크림)
    const PLATE_S = "#c3c7bb";   // 흰 판 그림자
    const GOLD = "#d9a92e";      // 금색 링
    const GOLD_L = "#f5d878";

    ctx.save();
    ctx.globalAlpha = alpha * (ghost ? 0.92 : 1);
    ctx.translate(0, bob);

    /** 🔩 가시 하나 (길고 뾰족한 흰 뿔) */
    const spike = (x, y, len, ang, w) => {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, -w); ctx.lineTo(len, 0); ctx.lineTo(0, w);
        ctx.closePath();
        const sg = ctx.createLinearGradient(0, 0, len, 0);
        sg.addColorStop(0, PLATE_S); sg.addColorStop(0.4, PLATE); sg.addColorStop(1, "#ffffff");
        ctx.fillStyle = sg; ctx.fill();
        ctx.strokeStyle = ARM_D; ctx.lineWidth = 2.5 * S; ctx.stroke();
        ctx.restore();
    };

    /** ⭕ 금색 링 */
    const ring = (x, y, r, thick) => {
        ctx.strokeStyle = GOLD; ctx.lineWidth = thick;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = GOLD_L; ctx.lineWidth = thick * 0.38;
        ctx.beginPath(); ctx.arc(x, y, r * 1.02, -2.2, 0.4); ctx.stroke();
    };

    // ── ① 다리 (짧고 두꺼운 기계 다리) ─────────────────────────
    for (const sd of [-1, 1]) {
        ctx.save();
        ctx.translate(cx + sd * W * 0.24, cy - H * 0.15);
        ctx.fillStyle = ARM_M;
        ctx.beginPath();
        ctx.moveTo(-W * 0.16, 0); ctx.lineTo(W * 0.16, 0);
        ctx.lineTo(W * 0.19, H * 0.16); ctx.lineTo(-W * 0.19, H * 0.16);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ARM_D; ctx.lineWidth = 5 * S; ctx.stroke();
        // 발 (흰 판)
        ctx.fillStyle = PLATE;
        ctx.fillRect(cx * 0 - W * 0.22, H * 0.14, W * 0.44, H * 0.055);
        ctx.strokeStyle = ARM_D; ctx.lineWidth = 4 * S;
        ctx.strokeRect(-W * 0.22, H * 0.14, W * 0.44, H * 0.055);
        ctx.restore();
    }

    // ── ② 몸통 (둥근 드럼통 — 검푸른 장갑) ─────────────────────
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.52, top + H * 0.26);
    ctx.quadraticCurveTo(cx - W * 0.62, top + H * 0.55, cx - W * 0.44, cy - H * 0.13);
    ctx.lineTo(cx + W * 0.44, cy - H * 0.13);
    ctx.quadraticCurveTo(cx + W * 0.62, top + H * 0.55, cx + W * 0.52, top + H * 0.26);
    ctx.closePath();
    const bg = ctx.createLinearGradient(cx - W * 0.6, top, cx + W * 0.5, cy);
    bg.addColorStop(0, ARM_L); bg.addColorStop(0.42, ARM_M); bg.addColorStop(1, ARM_D);
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 7 * S; ctx.stroke();

    // 가슴 흰 판 + 금색 링
    ctx.fillStyle = PLATE;
    ctx.beginPath();
    ctx.ellipse(cx, top + H * 0.44, W * 0.30, H * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ARM_D; ctx.lineWidth = 5 * S; ctx.stroke();
    ring(cx, top + H * 0.44, W * 0.36, 6 * S);
    // 가슴 중앙 십자 (영상의 상징)
    ctx.strokeStyle = ARM_D; ctx.lineWidth = 7 * S; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.17, top + H * 0.44); ctx.lineTo(cx + W * 0.17, top + H * 0.44);
    ctx.moveTo(cx, top + H * 0.34); ctx.lineTo(cx, top + H * 0.54);
    ctx.stroke();
    // 중앙 붉은 코어
    ctx.fillStyle = "#c0392b";
    ctx.beginPath(); ctx.arc(cx, top + H * 0.44, W * 0.045, 0, Math.PI * 2); ctx.fill();

    // ── ③ 어깨 (둥글고 거대 · 가시 다발) ───────────────────────
    for (const sd of [-1, 1]) {
        const sx = cx + sd * W * 0.60, sy = top + H * 0.28;
        // 어깨 덩어리
        ctx.beginPath();
        ctx.arc(sx, sy, W * 0.30, 0, Math.PI * 2);
        const sg2 = ctx.createRadialGradient(sx - sd * W * 0.1, sy - W * 0.1, W * 0.05, sx, sy, W * 0.30);
        sg2.addColorStop(0, ARM_L); sg2.addColorStop(0.6, ARM_M); sg2.addColorStop(1, ARM_D);
        ctx.fillStyle = sg2; ctx.fill();
        ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 6 * S; ctx.stroke();
        ring(sx, sy, W * 0.30, 5 * S);
        // 가시 5개 (바깥쪽으로)
        for (let k = 0; k < 5; k++) {
            const a = -1.5 + k * 0.62;
            spike(sx + Math.cos(a) * sd * W * 0.26, sy + Math.sin(a) * W * 0.26,
                  W * 0.30, sd > 0 ? a : Math.PI - a, W * 0.055);
        }

        // 팔 (기계 관절 + 발톱)
        ctx.save();
        ctx.translate(sx, sy + W * 0.16);
        ctx.rotate(sd * (0.18 + Math.sin(mathNow / 760 + sd) * 0.07));
        // 팔뚝
        ctx.fillStyle = ARM_M;
        ctx.beginPath();
        ctx.moveTo(-W * 0.17, 0); ctx.lineTo(W * 0.17, 0);
        ctx.lineTo(W * 0.14, H * 0.44); ctx.lineTo(-W * 0.20, H * 0.44);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 5 * S; ctx.stroke();
        // 관절 흰 판 2개
        for (let k = 0; k < 2; k++) {
            ctx.fillStyle = PLATE;
            ctx.fillRect(-W * 0.15, H * (0.10 + k * 0.16), W * 0.30, H * 0.06);
            ctx.strokeStyle = ARM_D; ctx.lineWidth = 3 * S;
            ctx.strokeRect(-W * 0.15, H * (0.10 + k * 0.16), W * 0.30, H * 0.06);
        }
        // 손 (발톱 4개)
        const hy = H * 0.46;
        ctx.fillStyle = ARM_D;
        ctx.beginPath(); ctx.arc(0, hy, W * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 4 * S; ctx.stroke();
        for (let k = 0; k < 4; k++) {
            const a = 0.35 + k * 0.75;
            spike(Math.cos(a) * W * 0.13, hy + Math.sin(a) * W * 0.13, W * 0.20, a, W * 0.033);
        }
        ctx.restore();
    }

    // ── ④ 머리 (네모난 고글 눈) ────────────────────────────────
    const hy2 = top + H * 0.13;
    ctx.fillStyle = ARM_D;
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.26, hy2 + H * 0.09);
    ctx.lineTo(cx - W * 0.21, hy2 - H * 0.09);
    ctx.lineTo(cx + W * 0.21, hy2 - H * 0.09);
    ctx.lineTo(cx + W * 0.26, hy2 + H * 0.09);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 6 * S; ctx.stroke();
    // 머리 위 가시 2개
    spike(cx - W * 0.16, hy2 - H * 0.08, W * 0.22, -1.9, W * 0.04);
    spike(cx + W * 0.16, hy2 - H * 0.08, W * 0.22, -1.24, W * 0.04);

    // ── ⑤ 네모난 눈 (자홍색으로 강하게 빛난다) ─────────────────
    for (const sd of [-1, 1]) {
        const ex = cx + sd * W * 0.115, ey = hy2;
        const ew = W * 0.13, eh = H * 0.075;
        // 흰 테두리
        ctx.fillStyle = PLATE;
        ctx.fillRect(ex - ew / 2 - 3 * S, ey - eh / 2 - 3 * S, ew + 6 * S, eh + 6 * S);
        ctx.strokeStyle = ARM_D; ctx.lineWidth = 3 * S;
        ctx.strokeRect(ex - ew / 2 - 3 * S, ey - eh / 2 - 3 * S, ew + 6 * S, eh + 6 * S);
        // 눈 안쪽
        ctx.fillStyle = "#0a0e1a";
        ctx.fillRect(ex - ew / 2, ey - eh / 2, ew, eh);
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = alpha * (0.8 + Math.sin(mathNow / 200) * 0.2);
        const eg = ctx.createLinearGradient(ex, ey - eh / 2, ex, ey + eh / 2);
        eg.addColorStop(0, MAG_CORE + "1)");
        eg.addColorStop(0.5, MAG_MAIN + "1)");
        eg.addColorStop(1, MAG_DEEP + "0.9)");
        ctx.fillStyle = eg;
        ctx.fillRect(ex - ew / 2 + 2 * S, ey - eh / 2 + 2 * S, ew - 4 * S, eh - 4 * S);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = alpha;
    }

    // ── ⑥ 몸을 감도는 자기력 방전 ──────────────────────────────
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.75;
    for (let k = 0; k < 4; k++) {
        const yy = top + H * (0.30 + k * 0.15);
        magBolt(ctx, cx - W * 0.55, yy, cx + W * 0.55, yy, 0.8, 2.6 * S,
                k + Math.floor(mathNow / 140), k % 2 === 0);
    }
    for (let k = 0; k < 3; k++) {
        const a1 = mathNow / 150 + k * 2.1;
        for (const sd of [-1, 1]) {
            const sx = cx + sd * W * 0.60, sy = top + H * 0.28;
            magBolt(ctx, sx, sy, sx + Math.cos(a1 * sd) * W * 0.45, sy + Math.sin(a1 * sd) * H * 0.20,
                    0.7, 2.2 * S, k + (sd > 0 ? 7 : 11), k === 0);
        }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// 🗿 골렘 유지 중 아우라
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('kid_golem_aura', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    if (!o) return;
    const cx = o.x, cy = o.y;

    // 🗿 골렘 몸체를 실제로 그린다 (변신이 끝나도 계속 보인다)
    drawGolemBody(ctx, cx, cy, 1, alpha, state.mathNow, false);

    // 🦾 [기계 의수] 주변 자기장
    if (fx.field) {
        const FR = 460;
        const tt = state.mathNow / 1000;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        // 회전하는 자기장 고리 3겹
        for (let k = 0; k < 3; k++) {
            const rr = FR * (0.55 + k * 0.22) + Math.sin(tt * 2 + k) * 12;
            ctx.globalAlpha = alpha * (0.35 - k * 0.07);
            ctx.strokeStyle = MAG_MAIN + "0.9)";
            ctx.lineWidth = 4;
            ctx.setLineDash([30, 18]);
            ctx.lineDashOffset = (k % 2 ? 1 : -1) * state.mathNow / (16 + k * 5);
            ctx.beginPath(); ctx.ellipse(cx, cy - 60, rr, rr * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.setLineDash([]);
        // 안쪽으로 빨려드는 자기력 줄기
        ctx.globalAlpha = alpha * 0.55;
        for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2 + tt * 0.8;
            const far = FR * (0.95 - ((tt * 0.6 + k / 8) % 1) * 0.6);
            magBolt(ctx, cx + Math.cos(a) * far, cy - 60 + Math.sin(a) * far * 0.42,
                    cx + Math.cos(a) * far * 0.35, cy - 60 + Math.sin(a) * far * 0.15,
                    0.7, 2.4, k + Math.floor(state.mathNow / 130), k % 3 === 0);
        }
        // 경계 표시
        ctx.globalAlpha = alpha * 0.28;
        ctx.strokeStyle = MAG_CYAN + "0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(cx, cy - 60, FR, FR * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.4;
    const g = ctx.createRadialGradient(cx, cy - 60, 20, cx, cy - 60, 230);
    g.addColorStop(0, MAG_MAIN + "0.5)");
    g.addColorStop(0.6, MAG_DEEP + "0.3)");
    g.addColorStop(1, MAG_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy - 60, 230, 0, Math.PI * 2); ctx.fill();

    // 주위를 도는 고철 조각
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * 0.85;
    for (let k = 0; k < 6; k++) {
        const a = state.mathNow / 700 + (k / 6) * Math.PI * 2;
        const rr = 175 + Math.sin(state.mathNow / 450 + k) * 22;
        scrapChunk(ctx, cx + Math.cos(a) * rr, cy - 60 + Math.sin(a) * rr * 0.42,
                   15, k * 13 + 4, a * 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
});
