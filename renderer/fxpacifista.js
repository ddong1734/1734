// 파일명: fxpacifista.js
// ============================================================================
// 🤖 파시피스타 — 세계정부 공성 유닛
//
//   · 검은 정장 · 곱슬머리 · 선글라스의 거구
//   · 손바닥에서 폭발하는 노란 빛 레이저를 쏜다
//   · 마크 Ⅲ 는 더 크고 붉은 기운을 두르며 버블 보호막이 감싼다
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';

const L_CORE = "rgba(255, 255, 255, ";
const L_MAIN = "rgba(255, 226, 92, ";
const L_DEEP = "rgba(214, 152, 20, ";
const L_FADE = "rgba(180, 120, 10, 0)";

/**
 * 🤖 파시피스타 본체를 그린다.
 *    renderEntity 쪽에서 유닛마다 불러 쓴다.
 */
export function drawPacifista(ctx, u, mathNow) {
    const R = u.radius || 72;
    const cx = u.x, cy = u.y;
    const mk3 = !!u.isMk3;
    const bob = Math.sin(mathNow / 520) * 3;

    ctx.save();
    ctx.translate(0, bob);

    // 🫧 버블 보호막 (마크 Ⅲ)
    if (mk3 && u.shield > 0) {
        const f = u.shield / (u.maxShield || 1);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.30 + f * 0.30;
        const bg = ctx.createRadialGradient(cx, cy - R * 0.2, R * 0.4, cx, cy - R * 0.2, R * 1.55);
        bg.addColorStop(0, "rgba(140,220,255,0.05)");
        bg.addColorStop(0.72, "rgba(120,200,255,0.35)");
        bg.addColorStop(1, "rgba(190,240,255,0.75)");
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(cx, cy - R * 0.2, R * 1.55, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(210,245,255,0.85)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }

    // ── 몸통 (검은 정장) ───────────────────────────────────
    ctx.fillStyle = mk3 ? "#241a14" : "#15171f";
    ctx.beginPath();
    ctx.ellipse(cx, cy + R * 0.18, R * 0.82, R * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 4; ctx.stroke();

    // 옷깃 (V자)
    ctx.strokeStyle = mk3 ? "#6b5a3a" : "#3a4152";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.32, cy - R * 0.35);
    ctx.lineTo(cx, cy + R * 0.18);
    ctx.lineTo(cx + R * 0.32, cy - R * 0.35);
    ctx.stroke();

    // 가슴의 정부 문양
    ctx.fillStyle = mk3 ? "#c8b48a" : "#8f98ad";
    ctx.beginPath(); ctx.arc(cx, cy + R * 0.3, R * 0.13, 0, Math.PI * 2); ctx.fill();

    // ── 팔 (앞으로 뻗은 손바닥) ────────────────────────────
    const dir = (u.team === 1) ? 1 : -1;
    ctx.strokeStyle = mk3 ? "#241a14" : "#15171f";
    ctx.lineWidth = R * 0.30; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + dir * R * 0.45, cy);
    ctx.lineTo(cx + dir * R * 1.05, cy - R * 0.1);
    ctx.stroke();
    // 손바닥
    ctx.fillStyle = "#e8c49a";
    ctx.beginPath(); ctx.arc(cx + dir * R * 1.12, cy - R * 0.12, R * 0.20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8a6440"; ctx.lineWidth = 3; ctx.stroke();

    // ── 머리 ───────────────────────────────────────────────
    const hy = cy - R * 0.85;
    // 곱슬머리
    ctx.fillStyle = "#1a1410";
    for (let k = 0; k < 9; k++) {
        const a = Math.PI + (k / 8) * Math.PI;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * R * 0.42, hy + Math.sin(a) * R * 0.34, R * 0.20, 0, Math.PI * 2);
        ctx.fill();
    }
    // 얼굴
    ctx.fillStyle = "#e8c49a";
    ctx.beginPath(); ctx.arc(cx, hy, R * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#8a6440"; ctx.lineWidth = 3; ctx.stroke();
    // 선글라스
    ctx.fillStyle = mk3 ? "#4a1010" : "#0d0f16";
    ctx.fillRect(cx - R * 0.34, hy - R * 0.10, R * 0.68, R * 0.16);
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2.5;
    ctx.strokeRect(cx - R * 0.34, hy - R * 0.10, R * 0.68, R * 0.16);
    if (mk3) {
        // 마크 Ⅲ 는 붉은 눈이 빛난다
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.7 + Math.sin(mathNow / 220) * 0.3;
        for (const sd of [-1, 1]) {
            const g = ctx.createRadialGradient(cx + sd * R * 0.17, hy - R * 0.02, 1, cx + sd * R * 0.17, hy - R * 0.02, R * 0.12);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(0.4, "rgba(255,90,60,0.95)");
            g.addColorStop(1, "rgba(200,40,20,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(cx + sd * R * 0.17, hy - R * 0.02, R * 0.12, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        // PX-Ⅲ 표기
        ctx.fillStyle = "#e8dcc0";
        ctx.font = "bold " + Math.round(R * 0.2) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PX-Ⅲ", cx, cy + R * 0.72);
    }

    ctx.restore();

    // ── 체력바 ─────────────────────────────────────────────
    const bw = R * 1.7, bx = cx - bw / 2, by = cy - R * 1.5;
    ctx.fillStyle = "#2b1a1a"; ctx.fillRect(bx, by, bw, 8);
    ctx.fillStyle = mk3 ? "#ff7a4d" : "#f1c40f";
    ctx.fillRect(bx, by, bw * Math.max(0, u.hp / u.maxHp), 8);
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, 8);
    // 🫧 보호막 바
    if (mk3 && u.maxShield > 0) {
        ctx.fillStyle = "#123044"; ctx.fillRect(bx, by - 10, bw, 6);
        ctx.fillStyle = "#7ad4ff";
        ctx.fillRect(bx, by - 10, bw * Math.max(0, u.shield / u.maxShield), 6);
        ctx.strokeStyle = "#000"; ctx.lineWidth = 1.2; ctx.strokeRect(bx, by - 10, bw, 6);
    }
    // 이름
    ctx.font = "bold 17px sans-serif"; ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 4; ctx.lineJoin = "round";
    const nm = mk3 ? "파시피스타 마크 Ⅲ" : "파시피스타";
    ctx.strokeText(nm, cx, by - (mk3 ? 18 : 8));
    ctx.fillStyle = mk3 ? "#ffc9a8" : "#ffe9a8";
    ctx.fillText(nm, cx, by - (mk3 ? 18 : 8));
}

// ────────────────────────────────────────────────────────────────────────────
// 💥 빛 레이저 — 손바닥에서 넥서스로
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('pacifista_laser', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const dx = fx.tx - fx.x, dy = fx.ty - fx.y;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const reach = L * Math.min(1, t / 0.25);      // 빠르게 뻗어 나간다
    const W = (fx.isMk3 ? 30 : 22) * (1 - t * 0.4);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;

    // 광선 본체
    const g = ctx.createLinearGradient(fx.x, fx.y, fx.x + ux * reach, fx.y + uy * reach);
    g.addColorStop(0, L_CORE + "1)");
    g.addColorStop(0.3, L_MAIN + "0.95)");
    g.addColorStop(1, L_FADE);
    ctx.strokeStyle = g; ctx.lineWidth = W; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.x + ux * reach, fx.y + uy * reach); ctx.stroke();
    // 흰 심
    ctx.strokeStyle = L_CORE + (0.95 * alpha) + ")";
    ctx.lineWidth = W * 0.35;
    ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.x + ux * reach, fx.y + uy * reach); ctx.stroke();

    // 발사구 섬광
    const fg = ctx.createRadialGradient(fx.x, fx.y, 2, fx.x, fx.y, W * 2.4);
    fg.addColorStop(0, L_CORE + "1)");
    fg.addColorStop(0.4, L_MAIN + "0.9)");
    fg.addColorStop(1, L_FADE);
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, W * 2.4, 0, Math.PI * 2); ctx.fill();

    // 착탄 폭발
    if (t > 0.22) {
        const bt = (t - 0.22) / 0.78;
        const br = (fx.isMk3 ? 190 : 150) * (1 - Math.pow(1 - bt, 2.2));
        const bg2 = ctx.createRadialGradient(fx.tx, fx.ty, 3, fx.tx, fx.ty, br);
        bg2.addColorStop(0, L_CORE + "1)");
        bg2.addColorStop(0.3, L_MAIN + "0.9)");
        bg2.addColorStop(0.7, L_DEEP + "0.5)");
        bg2.addColorStop(1, L_FADE);
        ctx.fillStyle = bg2;
        ctx.beginPath(); ctx.arc(fx.tx, fx.ty, br, 0, Math.PI * 2); ctx.fill();
        // 사방으로 뻗는 빛살
        for (let k = 0; k < 10; k++) {
            const a = (k / 10) * Math.PI * 2 + bt;
            ctx.strokeStyle = L_MAIN + (0.8 * alpha) + ")";
            ctx.lineWidth = 5 * (1 - bt);
            ctx.beginPath();
            ctx.moveTo(fx.tx, fx.ty);
            ctx.lineTo(fx.tx + Math.cos(a) * br * 1.25, fx.ty + Math.sin(a) * br * 1.25);
            ctx.stroke();
        }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// 💥 파괴
registerVisualFX('pacifista_down', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const R = (fx.isMk3 ? 210 : 170) * (1 - Math.pow(1 - Math.min(1, t / 0.4), 2.2));
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(fx.x, fx.y, 4, fx.x, fx.y, R);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, L_MAIN + "0.9)");
    g.addColorStop(1, L_FADE);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = "#3a3f4d";
    for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const d = R * (0.5 + (k % 3) * 0.2);
        ctx.beginPath();
        ctx.arc(fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d * 0.7 + t * 90, 8 - (k % 3) * 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
});

// 💣 대포 폭발
registerVisualFX('cannon_blast', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const R = (fx.radius || 220) * (1 - Math.pow(1 - Math.min(1, t / 0.35), 2.3));
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(fx.x, fx.y, 3, fx.x, fx.y, R);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,214,120,0.95)");
    g.addColorStop(0.6, "rgba(232,124,40,0.7)");
    g.addColorStop(1, "rgba(120,50,10,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,236,180,0.9)";
    ctx.lineWidth = 5 * (1 - t) + 1.5;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R * 0.92, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
});
