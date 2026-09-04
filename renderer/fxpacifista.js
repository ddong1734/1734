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

    // 🎨 사진에서 뽑은 특징
    //    · 거대한 검은 몸집 · 풍성한 곱슬머리 · 진한 선글라스
    //    · 기본형 : 흰 해군 모자 · 검은 코트에 흰 문양
    //    · 마크 Ⅲ : 카키 군복 · 금색 단추 · 붉은 눈 · 가슴의 PX-Ⅲ 표기
    const COAT = mk3 ? "#3d3a2a" : "#14161d";     // 마크Ⅲ 는 카키, 기본은 검정
    const COAT_D = mk3 ? "#26241a" : "#0a0c11";
    const SKIN = "#d9a877";
    const SKIN_D = "#a87a4e";
    const HAIR = "#2b1f18";
    const GOLD = "#c9a227";

    ctx.save();
    ctx.translate(0, bob);

    // 🫧 버블 보호막 (마크 Ⅲ)
    if (mk3 && u.shield > 0) {
        const f = u.shield / (u.maxShield || 1);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.28 + f * 0.32;
        const bg = ctx.createRadialGradient(cx, cy - R * 0.25, R * 0.4, cx, cy - R * 0.25, R * 1.6);
        bg.addColorStop(0, "rgba(140,220,255,0.04)");
        bg.addColorStop(0.72, "rgba(120,200,255,0.32)");
        bg.addColorStop(1, "rgba(190,240,255,0.8)");
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(cx, cy - R * 0.25, R * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(210,245,255,0.9)"; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
    }

    // ── 다리 (짧고 굵다) ───────────────────────────────────
    ctx.fillStyle = COAT_D;
    for (const sd of [-1, 1]) {
        ctx.fillRect(cx + sd * R * 0.34 - R * 0.16, cy + R * 0.62, R * 0.32, R * 0.42);
    }

    // ── 몸통 (거대한 상체) ─────────────────────────────────
    ctx.fillStyle = COAT;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.86, cy + R * 0.7);
    ctx.quadraticCurveTo(cx - R * 0.95, cy - R * 0.4, cx - R * 0.5, cy - R * 0.62);
    ctx.lineTo(cx + R * 0.5, cy - R * 0.62);
    ctx.quadraticCurveTo(cx + R * 0.95, cy - R * 0.4, cx + R * 0.86, cy + R * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 4; ctx.stroke();

    if (mk3) {
        // 🎖️ 군복 옷깃 + 금색 단추
        ctx.strokeStyle = "#5c5740"; ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx - R * 0.42, cy - R * 0.58);
        ctx.lineTo(cx, cy - R * 0.05);
        ctx.lineTo(cx + R * 0.42, cy - R * 0.58);
        ctx.stroke();
        ctx.fillStyle = GOLD;
        for (const sd of [-1, 1]) {
            ctx.beginPath(); ctx.arc(cx + sd * R * 0.44, cy - R * 0.34, R * 0.09, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#8a6c15"; ctx.lineWidth = 2; ctx.stroke();
        }
        // 가슴의 PX-Ⅲ 표기
        ctx.fillStyle = "#e8e2cc";
        ctx.font = "bold " + Math.round(R * 0.24) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PX-Ⅲ", cx, cy + R * 0.34);
    } else {
        // ⚪ 검은 코트 위의 흰 원형 문양
        ctx.strokeStyle = "#e9edf2"; ctx.lineWidth = R * 0.11;
        ctx.beginPath();
        ctx.arc(cx - R * 0.1, cy + R * 0.08, R * 0.42, Math.PI * 0.35, Math.PI * 1.5);
        ctx.stroke();
        // 허리 벨트
        ctx.fillStyle = "#e9edf2";
        ctx.fillRect(cx - R * 0.7, cy + R * 0.5, R * 1.4, R * 0.13);
    }

    // ── 팔 (몸 옆으로 내린 자세) ───────────────────────────
    ctx.strokeStyle = COAT; ctx.lineWidth = R * 0.30; ctx.lineCap = "round";
    for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sd * R * 0.62, cy - R * 0.34);
        ctx.lineTo(cx + sd * R * 0.86, cy + R * 0.5);
        ctx.stroke();
    }
    // 손
    ctx.fillStyle = SKIN;
    for (const sd of [-1, 1]) {
        ctx.beginPath(); ctx.arc(cx + sd * R * 0.88, cy + R * 0.58, R * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = SKIN_D; ctx.lineWidth = 2.5; ctx.stroke();
    }

    // ── 머리 ───────────────────────────────────────────────
    const hy = cy - R * 0.95;
    // 풍성한 곱슬머리 (사진의 큰 특징)
    ctx.fillStyle = HAIR;
    for (let k = 0; k < 11; k++) {
        const a = Math.PI * 0.92 + (k / 10) * Math.PI * 1.16;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * R * 0.46, hy + Math.sin(a) * R * 0.40, R * 0.21, 0, Math.PI * 2);
        ctx.fill();
    }
    // 얼굴
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(cx, hy + R * 0.05, R * 0.37, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = SKIN_D; ctx.lineWidth = 3; ctx.stroke();

    // 선글라스 (진하고 넓다)
    ctx.fillStyle = mk3 ? "#2a1410" : "#0b0d13";
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.38, hy - R * 0.07);
    ctx.lineTo(cx + R * 0.38, hy - R * 0.07);
    ctx.lineTo(cx + R * 0.34, hy + R * 0.11);
    ctx.lineTo(cx - R * 0.34, hy + R * 0.11);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 3; ctx.stroke();

    if (mk3) {
        // 마크 Ⅲ — 붉은 눈이 빛난다
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.7 + Math.sin(mathNow / 220) * 0.3;
        for (const sd of [-1, 1]) {
            const g = ctx.createRadialGradient(cx + sd * R * 0.18, hy + R * 0.02, 1, cx + sd * R * 0.18, hy + R * 0.02, R * 0.13);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(0.4, "rgba(255,90,60,0.95)");
            g.addColorStop(1, "rgba(200,40,20,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(cx + sd * R * 0.18, hy + R * 0.02, R * 0.13, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        // 모자챙에 새긴 PX-Ⅲ
        ctx.fillStyle = "#d8d2bc";
        ctx.font = "bold " + Math.round(R * 0.13) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PX-Ⅲ", cx + R * 0.02, hy - R * 0.13);
    } else {
        // 🎩 기본형 — 흰 해군 모자
        ctx.fillStyle = "#eef1f5";
        ctx.beginPath();
        ctx.ellipse(cx, hy - R * 0.34, R * 0.44, R * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#9aa3ad"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "#e2e7ee";
        ctx.beginPath();
        ctx.ellipse(cx, hy - R * 0.46, R * 0.30, R * 0.17, 0, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "#9aa3ad"; ctx.lineWidth = 3; ctx.stroke();
    }

    // 👄 입 — 여기서 빛 레이저가 나간다
    ctx.fillStyle = "#5a3b2a";
    ctx.beginPath();
    ctx.ellipse(cx, hy + R * 0.25, R * 0.16, R * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a2418"; ctx.lineWidth = 2; ctx.stroke();

    ctx.restore();

    // ── 체력바 ─────────────────────────────────────────────
    const bw = R * 1.7, bx = cx - bw / 2, by = cy - R * 1.62;
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
    const R = (fx.radius || 220) * (1 - Math.pow(1 - Math.min(1, t / 0.32), 2.3));
    const tt = (state ? state.mathNow : 0) / 1000;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;

    // 💥 중심 화구
    const g = ctx.createRadialGradient(fx.x, fx.y, 3, fx.x, fx.y, R);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,240,180,1)");
    g.addColorStop(0.45, "rgba(255,180,70,0.9)");
    g.addColorStop(0.75, "rgba(226,96,26,0.6)");
    g.addColorStop(1, "rgba(110,40,8,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.fill();

    // 이중 충격 고리
    for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = "rgba(255,238,190," + (0.9 * alpha * (1 - k * 0.4)) + ")";
        ctx.lineWidth = (7 - k * 3) * (1 - t) + 1.5;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, R * (0.92 - k * 0.22), 0, Math.PI * 2); ctx.stroke();
    }

    // 사방으로 튀는 불티
    for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2 + tt * 0.4;
        const d = R * (0.5 + (k % 4) * 0.16);
        ctx.strokeStyle = "rgba(255,200,90," + (0.9 * alpha) + ")";
        ctx.lineWidth = 5 * (1 - t) + 1;
        ctx.beginPath();
        ctx.moveTo(fx.x + Math.cos(a) * R * 0.28, fx.y + Math.sin(a) * R * 0.28);
        ctx.lineTo(fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d);
        ctx.stroke();
    }

    // 검은 연기
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = "#2e2a26";
    for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.arc(fx.x + Math.cos(a) * R * 0.5, fx.y + Math.sin(a) * R * 0.45 - t * 30,
                R * 0.22 * (0.6 + t * 0.6), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
});
