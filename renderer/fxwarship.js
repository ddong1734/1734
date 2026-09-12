// 파일명: fxwarship.js
// ============================================================================
// ⚔️ 칠무해 · 👼 세라핌 · 🚢 버스터 콜 군함
//
//   🎨 군함은 사진을 참고했다.
//     · 짙은 남보라 선체 · 금색 테두리 · 둥근 창문
//     · MARINE 이 적힌 흰 돛 두 장 (닻 문양)
//     · 앞뒤에 총구, 가운데에 큰 대포
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';

const NAVY = "#3b3a6e";
const NAVY_D = "#26264a";
const NAVY_L = "#5a58a0";

const G_GOLD = "#d8b44a";
const SAIL = "#eef2f6";
const SAIL_D = "#c6d0da";
const MARINE_BLUE = "#4a90d9";

// ────────────────────────────────────────────────────────────────────────────
// ⚔️ 칠무해 / 👼 세라핌
// ────────────────────────────────────────────────────────────────────────────
export function drawWarlord(ctx, w, mathNow) {
    const R = w.radius || 58;
    const cx = w.x, cy = w.y;
    const ser = (w.kind === 'seraph');
    const bob = Math.sin(mathNow / 480) * 2.5;

    ctx.save();
    ctx.translate(0, bob);

    // 👼 세라핌 — 등 뒤의 불꽃 날개
    if (ser) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        for (const sd of [-1, 1]) {
            for (let k = 0; k < 5; k++) {
                const t = k / 4;
                const fl = 1 + Math.sin(mathNow / 190 + k * 1.3 + sd) * 0.22;
                const bx = cx + sd * (R * 0.5 + t * R * 0.75);
                const by = cy - R * 0.25 - t * R * 0.55;
                const h = R * (0.75 - t * 0.28) * fl;
                const g = ctx.createLinearGradient(bx, by, bx, by - h);
                g.addColorStop(0, "rgba(255,236,150,0.95)");
                g.addColorStop(0.4, "rgba(255,150,50,0.85)");
                g.addColorStop(1, "rgba(220,60,20,0)");
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(bx - R * 0.16, by);
                ctx.quadraticCurveTo(bx + sd * R * 0.1, by - h * 0.6, bx, by - h);
                ctx.quadraticCurveTo(bx - sd * R * 0.1, by - h * 0.6, bx + R * 0.16, by);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.restore();
    }

    const SKIN = ser ? "#b07a4e" : "#e0b184";     // 세라핌은 살짝 탄 피부
    const SKIN_D = ser ? "#7d5028" : "#ab7f52";
    const CLOTH = ser ? "#2a2440" : "#1e2a3d";

    // 몸통
    ctx.fillStyle = CLOTH;
    ctx.beginPath();
    ctx.ellipse(cx, cy + R * 0.22, R * 0.62, R * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0d1018"; ctx.lineWidth = 3.5; ctx.stroke();

    // 어깨 장식
    ctx.fillStyle = ser ? "#c9a227" : "#8f98ad";
    for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + sd * R * 0.55, cy - R * 0.18, R * 0.2, R * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // 팔
    ctx.strokeStyle = CLOTH; ctx.lineWidth = R * 0.22; ctx.lineCap = "round";
    for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sd * R * 0.5, cy - R * 0.05);
        ctx.lineTo(cx + sd * R * 0.72, cy + R * 0.6);
        ctx.stroke();
    }
    ctx.fillStyle = SKIN;
    for (const sd of [-1, 1]) {
        ctx.beginPath(); ctx.arc(cx + sd * R * 0.74, cy + R * 0.68, R * 0.13, 0, Math.PI * 2); ctx.fill();
    }

    // 머리
    const hy = cy - R * 0.82;
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(cx, hy, R * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = SKIN_D; ctx.lineWidth = 3; ctx.stroke();
    // 머리카락
    ctx.fillStyle = ser ? "#f0e2c0" : "#2b2118";
    ctx.beginPath();
    ctx.arc(cx, hy - R * 0.08, R * 0.35, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    // 눈
    ctx.fillStyle = ser ? "#ffcf5a" : "#111";
    for (const sd of [-1, 1]) {
        ctx.beginPath(); ctx.arc(cx + sd * R * 0.13, hy + R * 0.04, R * 0.055, 0, Math.PI * 2); ctx.fill();
    }
    if (ser) {
        // 👼 머리 위 고리
        ctx.strokeStyle = "rgba(255,214,90,0.9)"; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(cx, hy - R * 0.52, R * 0.28, R * 0.09, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();

    // 체력바 · 이름
    const bw = R * 1.6, bx = cx - bw / 2, by = cy - R * 1.55;
    ctx.fillStyle = "#2b1a1a"; ctx.fillRect(bx, by, bw, 7);
    ctx.fillStyle = ser ? "#ffd05a" : "#e74c3c";
    const f = w.infinite ? 1 : Math.max(0, w.hp / w.maxHp);
    ctx.fillRect(bx, by, bw * f, 7);
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.4; ctx.strokeRect(bx, by, bw, 7);

    ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 4; ctx.lineJoin = "round";
    const nm = w.escortName || (ser ? "세라핌" : "칠무해");
    ctx.strokeText(nm, cx, by - 7);
    ctx.fillStyle = ser ? "#ffe9a8" : "#ffb8b0";
    ctx.fillText(nm, cx, by - 7);
}

// ⚔️ 칠무해 평타
registerVisualFX('warlord_strike', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const dir = (fx.dir === -1) ? -1 : 1;
    const ser = (fx.kind === 'seraph');
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    const R = 90 * (0.5 + t * 0.7);
    const g = ctx.createRadialGradient(fx.x + dir * 60, fx.y, 3, fx.x + dir * 60, fx.y, R);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, ser ? "rgba(255,190,80,0.9)" : "rgba(255,120,110,0.9)");
    g.addColorStop(1, "rgba(180,60,30,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x + dir * 60, fx.y, R, 0, Math.PI * 2); ctx.fill();
    // 베는 선
    ctx.strokeStyle = ser ? "rgba(255,220,140,0.95)" : "rgba(255,255,255,0.9)";
    ctx.lineWidth = 7 * (1 - t) + 2;
    ctx.beginPath();
    ctx.moveTo(fx.x + dir * 18, fx.y - 55);
    ctx.quadraticCurveTo(fx.x + dir * 96, fx.y, fx.x + dir * 18, fx.y + 55);
    ctx.stroke();
    ctx.restore();
});

registerVisualFX('warlord_down', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const R = 150 * (1 - Math.pow(1 - Math.min(1, t / 0.4), 2.2));
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(fx.x, fx.y, 3, fx.x, fx.y, R);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,140,90,0.85)");
    g.addColorStop(1, "rgba(150,40,20,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🚢 버스터 콜 군함
// ────────────────────────────────────────────────────────────────────────────
export function drawWarship(ctx, w, mathNow) {
    const R = w.radius || 92;
    const cx = w.x, cy = w.y;
    const dir = (w.team === 1) ? 1 : -1;      // 나아가는 쪽
    const bob = Math.sin(mathNow / 620 + cx * 0.01) * 4;

    ctx.save();
    ctx.translate(0, bob);

    // ── 돛 (뒤에 그린다) ───────────────────────────────────
    const drawSail = (sx, sy, sw, sh) => {
        // 돛대
        ctx.strokeStyle = "#7a6242"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(sx, sy + sh); ctx.lineTo(sx, sy - 14); ctx.stroke();
        // 천
        const wave = Math.sin(mathNow / 420) * 4;
        ctx.beginPath();
        ctx.moveTo(sx - sw / 2, sy);
        ctx.quadraticCurveTo(sx, sy - 6 + wave, sx + sw / 2, sy);
        ctx.lineTo(sx + sw / 2, sy + sh);
        ctx.quadraticCurveTo(sx, sy + sh - 6 + wave, sx - sw / 2, sy + sh);
        ctx.closePath();
        const sg = ctx.createLinearGradient(sx, sy, sx, sy + sh);
        sg.addColorStop(0, SAIL); sg.addColorStop(1, SAIL_D);
        ctx.fillStyle = sg; ctx.fill();
        ctx.strokeStyle = "#9aa6b2"; ctx.lineWidth = 2.5; ctx.stroke();
        // ⚓ 닻 문양 두 개
        ctx.strokeStyle = MARINE_BLUE; ctx.lineWidth = 3;
        for (const ad of [-1, 1]) {
            const ax = sx + ad * sw * 0.2, ay = sy + sh * 0.34;
            ctx.beginPath(); ctx.moveTo(ax, ay - sh * 0.14); ctx.lineTo(ax, ay + sh * 0.1); ctx.stroke();
            ctx.beginPath(); ctx.arc(ax, ay + sh * 0.1, sh * 0.11, 0, Math.PI); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ax - sh * 0.09, ay - sh * 0.09); ctx.lineTo(ax + sh * 0.09, ay - sh * 0.09); ctx.stroke();
        }
        // MARINE 글자
        ctx.fillStyle = MARINE_BLUE;
        ctx.font = "bold " + Math.round(sh * 0.19) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("MARINE", sx, sy + sh * 0.75);
    };
    drawSail(cx - dir * R * 0.18, cy - R * 1.15, R * 0.78, R * 0.62);
    drawSail(cx + dir * R * 0.34, cy - R * 0.95, R * 0.66, R * 0.54);

    // ── 선체 ───────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.95, cy - R * 0.34);
    ctx.lineTo(cx + R * 0.95, cy - R * 0.34);
    ctx.quadraticCurveTo(cx + R * 0.72, cy + R * 0.5, cx, cy + R * 0.54);
    ctx.quadraticCurveTo(cx - R * 0.72, cy + R * 0.5, cx - R * 0.95, cy - R * 0.34);
    ctx.closePath();
    const hg = ctx.createLinearGradient(cx, cy - R * 0.34, cx, cy + R * 0.54);
    hg.addColorStop(0, NAVY_L); hg.addColorStop(0.5, NAVY); hg.addColorStop(1, NAVY_D);
    ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = "#15142c"; ctx.lineWidth = 4; ctx.stroke();

    // 금색 갑판 테두리
    ctx.strokeStyle = G_GOLD; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.95, cy - R * 0.34);
    ctx.lineTo(cx + R * 0.95, cy - R * 0.34);
    ctx.stroke();

    // 둥근 창문
    ctx.fillStyle = "#1a1930";
    for (let k = -2; k <= 2; k++) {
        const wx = cx + k * R * 0.31;
        ctx.beginPath(); ctx.arc(wx, cy - R * 0.06, R * 0.075, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = G_GOLD; ctx.lineWidth = 2.5; ctx.stroke();
    }

    // ── 🔫 앞·뒤 총구 ──────────────────────────────────────
    for (const sd of [-1, 1]) {
        const gx = cx + sd * R * 0.78, gy = cy - R * 0.46;
        ctx.fillStyle = "#3a4150";
        ctx.beginPath(); ctx.arc(gx, gy, R * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#15142c"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "#59616f";
        ctx.fillRect(gx, gy - R * 0.045, sd * R * 0.24, R * 0.09);
        ctx.strokeStyle = "#15142c"; ctx.lineWidth = 2; ctx.strokeRect(gx, gy - R * 0.045, sd * R * 0.24, R * 0.09);
    }

    // ── 💥 가운데 대포 ─────────────────────────────────────
    ctx.fillStyle = "#4a5260";
    ctx.beginPath(); ctx.arc(cx, cy - R * 0.5, R * 0.19, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#15142c"; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy - R * 0.5); ctx.rotate(dir * -0.3);
    ctx.fillStyle = "#39424f";
    ctx.fillRect(0, -R * 0.085, dir * R * 0.5, R * 0.17);
    ctx.strokeStyle = "#15142c"; ctx.lineWidth = 3;
    ctx.strokeRect(0, -R * 0.085, dir * R * 0.5, R * 0.17);
    ctx.restore();

    ctx.restore();

    // 체력바
    const bw = R * 1.5, bx = cx - bw / 2, by = cy - R * 1.85;
    ctx.fillStyle = "#2b1a1a"; ctx.fillRect(bx, by, bw, 7);
    ctx.fillStyle = "#5dade2";
    ctx.fillRect(bx, by, bw * Math.max(0, w.hp / w.maxHp), 7);
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.4; ctx.strokeRect(bx, by, bw, 7);
}

// 🔫💥 군함 발사체
registerVisualFX('warship_shot', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const dx = fx.tx - fx.x, dy = fx.ty - fx.y;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const isC = (fx.kind === 'cannon');
    // 탄속은 넥서스 포탑과 같다 (15)
    const travel = Math.min(L, 15 * (fx.maxLife || 40) * t);
    const px = fx.x + ux * travel, py = fx.y + uy * travel;
    const rr = isC ? 25 : 10;     // 🔫 총알을 키우고 대포알은 그 2.5배

    ctx.save();
    if (isC) {
        // 💥 대포알 — 검은 쇳덩이 + 불꽃 꼬리
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = alpha * 0.8;
        const tg = ctx.createRadialGradient(px - ux * 22, py - uy * 22, 2, px - ux * 22, py - uy * 22, rr * 2);
        tg.addColorStop(0, "rgba(255,210,120,0.9)");
        tg.addColorStop(1, "rgba(200,90,20,0)");
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(px - ux * 22, py - uy * 22, rr * 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#2a2e38";
        ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#0d0f14"; ctx.lineWidth = 2.5; ctx.stroke();
        // 💥 착탄 폭발 — 크게 터지고 불티가 사방으로 튄다
        if (travel >= L - 8) {
            const bt = Math.min(1, (travel - (L - 8)) / 8 + (1 - alpha));
            const br = 150 * (1 - Math.pow(1 - bt, 2.2));
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = alpha;
            const bg = ctx.createRadialGradient(fx.tx, fx.ty, 4, fx.tx, fx.ty, br);
            bg.addColorStop(0, "rgba(255,255,255,1)");
            bg.addColorStop(0.22, "rgba(255,228,140,0.97)");
            bg.addColorStop(0.55, "rgba(240,130,40,0.75)");
            bg.addColorStop(1, "rgba(120,45,10,0)");
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(fx.tx, fx.ty, br, 0, Math.PI * 2); ctx.fill();
            // 충격 고리
            ctx.strokeStyle = "rgba(255,238,190,0.9)";
            ctx.lineWidth = 6 * (1 - bt) + 1.5;
            ctx.beginPath(); ctx.arc(fx.tx, fx.ty, br * 0.9, 0, Math.PI * 2); ctx.stroke();
            // 튀는 불티
            for (let k = 0; k < 10; k++) {
                const a = (k / 10) * Math.PI * 2 + bt * 0.6;
                const d = br * (0.55 + (k % 3) * 0.2);
                ctx.strokeStyle = "rgba(255,200,90," + (0.85 * alpha) + ")";
                ctx.lineWidth = 4 * (1 - bt) + 1;
                ctx.beginPath();
                ctx.moveTo(fx.tx + Math.cos(a) * br * 0.35, fx.ty + Math.sin(a) * br * 0.35);
                ctx.lineTo(fx.tx + Math.cos(a) * d, fx.ty + Math.sin(a) * d);
                ctx.stroke();
            }
            // 검은 연기
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = alpha * 0.45;
            ctx.fillStyle = "#2e2a26";
            for (let k = 0; k < 5; k++) {
                const a = (k / 5) * Math.PI * 2 + 0.5;
                ctx.beginPath();
                ctx.arc(fx.tx + Math.cos(a) * br * 0.45, fx.ty + Math.sin(a) * br * 0.42 - bt * 22,
                        br * 0.24, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    } else {
        // 🔫 총알 — 노랗고 가늘다
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = alpha;
        const ang = Math.atan2(uy, ux);
        ctx.save();
        ctx.translate(px, py); ctx.rotate(ang);
        const g = ctx.createLinearGradient(-34, 0, 10, 0);
        g.addColorStop(0, "rgba(255,220,80,0)");
        g.addColorStop(0.55, "rgba(255,225,110,0.9)");
        g.addColorStop(1, "rgba(255,255,220,1)");
        ctx.fillStyle = g;
        ctx.fillRect(-34, -3.6, 44, 7.2);
        // 탄두 끝의 밝은 점
        ctx.fillStyle = "rgba(255,255,235,1)";
        ctx.beginPath(); ctx.arc(9, 0, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    ctx.restore();
});

registerVisualFX('warship_down', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const R = 190 * (1 - Math.pow(1 - Math.min(1, t / 0.4), 2.2));
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(fx.x, fx.y, 4, fx.x, fx.y, R);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,190,90,0.9)");
    g.addColorStop(1, "rgba(150,50,20,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// ⛩️ 정의의 문 — 5초 채널링 · 순간이동
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('gate_channel', (ctx, fx, alpha, state) => {
    const o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    const cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    const t = 1 - alpha;                    // 0 → 1 (5초)
    const tt = state.mathNow / 1000;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    // 발밑에서 차오르는 빛 기둥
    const h = 60 + t * 300;
    const g = ctx.createLinearGradient(cx, cy + 50, cx, cy + 50 - h);
    g.addColorStop(0, "rgba(255,255,255," + (0.85 * alpha) + ")");
    g.addColorStop(0.4, "rgba(200,215,255," + (0.6 * alpha) + ")");
    g.addColorStop(1, "rgba(120,140,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - 46, cy + 50 - h, 92, h);

    // 모여드는 빛 조각
    ctx.globalAlpha = alpha * 0.9;
    for (let k = 0; k < 20; k++) {
        const a = (k / 20) * Math.PI * 2 + tt * 1.6;
        const d = 260 * (1 - t) + 26;
        const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.6;
        ctx.fillStyle = "rgba(220,230,255,0.95)";
        ctx.beginPath(); ctx.arc(px, py, 5 - t * 2, 0, Math.PI * 2); ctx.fill();
    }

    // 🌀 위로 솟구치는 빛 소용돌이
    ctx.globalAlpha = alpha * 0.75;
    for (let k = 0; k < 5; k++) {
        const ph = (tt * 1.3 + k / 5) % 1;
        const rr = 70 * (1 - ph * 0.55);
        const yy = cy + 48 - ph * 250;
        ctx.strokeStyle = "rgba(200,218,255," + (0.85 * (1 - ph)) + ")";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(cx, yy, rr, rr * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ⛩️ 머리 위에 떠오르는 세계정부 문양
    ctx.globalAlpha = alpha * (0.4 + t * 0.6);
    const my2 = cy - 150 - t * 26, MR = 9 + t * 5, MA = 22 + t * 12;
    ctx.strokeStyle = "rgba(226,236,255,0.95)"; ctx.lineWidth = 6;
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
        ctx.beginPath();
        ctx.moveTo(cx, my2);
        ctx.lineTo(cx + d[0] * MA, my2 + d[1] * MA);
        ctx.stroke();
    });
    ctx.fillStyle = "rgba(238,244,255,0.95)";
    [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
        ctx.beginPath(); ctx.arc(cx + d[0] * MA, my2 + d[1] * MA, MR, 0, Math.PI * 2); ctx.fill();
    });

    // 발밑 마법진 (세계정부 문양)
    ctx.globalAlpha = alpha;
    const R = 74;
    ctx.strokeStyle = "rgba(180,200,255,0.9)"; ctx.lineWidth = 4;
    ctx.setLineDash([16, 10]); ctx.lineDashOffset = -tt * 60;
    ctx.beginPath(); ctx.ellipse(cx, cy + 48, R, R * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 6;
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + 48);
        ctx.lineTo(cx + d[0] * R * 0.62, cy + 48 + d[1] * R * 0.22);
        ctx.stroke();
    });

    ctx.globalCompositeOperation = "source-over";
    // ⏱️ 머리 위 카운트다운
    const left = Math.max(0, 5 - t * 5);
    ctx.font = "bold 34px sans-serif"; ctx.textAlign = "center";
    ctx.lineWidth = 7; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(10,12,26,0.92)";
    ctx.strokeText(left.toFixed(1), cx, cy - 92);
    ctx.fillStyle = (left < 1.5) ? "#ffe27a" : "#cfe0ff";
    ctx.fillText(left.toFixed(1), cx, cy - 92);
    ctx.globalAlpha = 1;
    ctx.restore();
});

registerVisualFX('gate_warp', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const R = 260 * (1 - Math.pow(1 - Math.min(1, t / 0.4), 2.2));
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(fx.x, fx.y, 4, fx.x, fx.y, R);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(200,215,255,0.9)");
    g.addColorStop(1, "rgba(110,130,240,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        ctx.strokeStyle = "rgba(230,238,255," + (0.85 * alpha) + ")";
        ctx.lineWidth = 5 * (1 - t) + 1;
        ctx.beginPath();
        ctx.moveTo(fx.x + Math.cos(a) * R * 0.3, fx.y + Math.sin(a) * R * 0.3);
        ctx.lineTo(fx.x + Math.cos(a) * R * 1.15, fx.y + Math.sin(a) * R * 1.15);
        ctx.stroke();
    }
    ctx.restore();
});

// ⛩️💥 정의의 문 — 채널링이 깨질 때
registerVisualFX('gate_break', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    // 짧게 번쩍인 뒤 흩어진다
    const R = 130 * (1 - Math.pow(1 - Math.min(1, t / 0.3), 2.2));
    const g = ctx.createRadialGradient(fx.x, fx.y, 3, fx.x, fx.y, R);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(200,215,255,0.85)");
    g.addColorStop(1, "rgba(110,130,240,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.fill();
    // 흩어지는 빛 조각
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = "#cfe0ff";
    for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + 0.3;
        const d = 40 + t * 150;
        ctx.beginPath();
        ctx.arc(fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d * 0.8 + t * 40,
                4 * (1 - t), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// ✴️ 어비스(오망성) — 마방진
//
//   🎨 참고 이미지의 특징을 뽑았다.
//     · 청록빛 원형 진 위에 분홍/자홍으로 빛나는 오각별(펜타그램)
//     · 바깥에 두 겹의 고리와 그 사이를 채운 룬 문자열
//     · 각 변마다 안쪽을 향한 화살촉
//     · 전체가 천천히 돌면서 맥동하고, 중심에서 빛기둥이 솟는다
// ────────────────────────────────────────────────────────────────────────────
const AB_CYAN = "rgba(90, 240, 235, ";
const AB_PINK = "rgba(255, 105, 210, ";
const AB_MAG = "rgba(210, 70, 255, ";
const AB_WHITE = "rgba(255, 255, 255, ";

/** 룬처럼 보이는 짧은 획들 */
function abyssRunes(ctx, r, count, seed, alpha) {
    ctx.save();
    ctx.strokeStyle = AB_CYAN + (0.9 * alpha) + ")";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        const h = 9 + ((k * 7 + seed) % 5) * 2.2;
        const w = 5 + ((k * 11 + seed) % 3) * 2;
        // 세로획 + 가로획 조합으로 문자처럼 보이게 한다
        ctx.beginPath();
        ctx.moveTo(r - h / 2, -w / 2); ctx.lineTo(r + h / 2, -w / 2);
        ctx.moveTo(r, -w / 2); ctx.lineTo(r, w / 2);
        if ((k + seed) % 3 === 0) { ctx.moveTo(r - h / 2, w / 2); ctx.lineTo(r + h / 2, w / 2); }
        if ((k + seed) % 4 === 1) { ctx.moveTo(r - h / 2, -w / 2); ctx.lineTo(r - h / 2, w / 2); }
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

/** 🔮 마방진 하나 (바닥에 눕힌 타원 원근) */
export function drawAbyssCircle(ctx, cx, cy, R, t, alpha, mathNow) {
    const spin = mathNow / 2600;
    const pulse = 0.88 + Math.sin(mathNow / 190) * 0.12;
    const grow = Math.min(1, t / 0.25);          // 처음 0.25 구간에 펼쳐진다
    const rr = R * grow * pulse;
    if (rr <= 1) return;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.42);                          // 바닥에 눕힌 느낌
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;

    // ── 진 안쪽을 채우는 빛 ────────────────────────────────
    const g = ctx.createRadialGradient(0, 0, rr * 0.05, 0, 0, rr);
    g.addColorStop(0, AB_WHITE + (0.35 * alpha) + ")");
    g.addColorStop(0.45, AB_CYAN + (0.30 * alpha) + ")");
    g.addColorStop(0.85, AB_MAG + (0.22 * alpha) + ")");
    g.addColorStop(1, "rgba(20,40,90,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();

    ctx.rotate(spin);

    // ── 바깥 두 겹 고리 + 룬 ───────────────────────────────
    ctx.strokeStyle = AB_CYAN + (0.95 * alpha) + ")";
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, rr * 0.86, 0, Math.PI * 2); ctx.stroke();
    abyssRunes(ctx, rr * 0.93, 26, 3, alpha);

    // 반대로 도는 안쪽 고리
    ctx.save();
    ctx.rotate(-spin * 2.1);
    ctx.strokeStyle = AB_PINK + (0.85 * alpha) + ")";
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(0, 0, rr * 0.72, 0, Math.PI * 2); ctx.stroke();
    abyssRunes(ctx, rr * 0.79, 18, 7, alpha * 0.8);
    ctx.restore();

    // ── ⭐ 오각별 (핵심) ───────────────────────────────────
    const P = [];
    for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
        P.push([Math.cos(a) * rr * 0.68, Math.sin(a) * rr * 0.68]);
    }
    // 별을 이루는 다섯 선 (0-2-4-1-3-0)
    const order = [0, 2, 4, 1, 3];
    ctx.beginPath();
    ctx.moveTo(P[order[0]][0], P[order[0]][1]);
    for (let k = 1; k < 5; k++) ctx.lineTo(P[order[k]][0], P[order[k]][1]);
    ctx.closePath();
    // 안쪽 면
    ctx.fillStyle = AB_CYAN + (0.22 * alpha) + ")";
    ctx.fill();
    // 선 — 굵은 분홍 위에 흰 심
    ctx.strokeStyle = AB_PINK + (0.95 * alpha) + ")";
    ctx.lineWidth = 7; ctx.lineJoin = "round";
    ctx.stroke();
    ctx.strokeStyle = AB_WHITE + (0.9 * alpha) + ")";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // 별을 감싸는 원
    ctx.strokeStyle = AB_PINK + (0.8 * alpha) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, rr * 0.68, 0, Math.PI * 2); ctx.stroke();

    // ── 각 변 안쪽을 향한 화살촉 ───────────────────────────
    for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k / 5) * Math.PI * 2 + Math.PI / 5;
        const bx = Math.cos(a) * rr * 0.5, by = Math.sin(a) * rr * 0.5;
        ctx.save();
        ctx.translate(bx, by); ctx.rotate(a + Math.PI);
        ctx.strokeStyle = AB_PINK + (0.95 * alpha) + ")";
        ctx.lineWidth = 4.5; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-rr * 0.14, 0); ctx.lineTo(rr * 0.12, 0);
        ctx.moveTo(rr * 0.12, 0); ctx.lineTo(rr * 0.03, -rr * 0.07);
        ctx.moveTo(rr * 0.12, 0); ctx.lineTo(rr * 0.03, rr * 0.07);
        ctx.stroke();
        ctx.restore();
    }
    // ── ✨ 바깥으로 퍼지는 충격 고리 3겹 ──────────────────
    for (let k = 0; k < 3; k++) {
        const ph = ((mathNow / 900) + k / 3) % 1;
        ctx.strokeStyle = AB_CYAN + (0.75 * alpha * (1 - ph)) + ")";
        ctx.lineWidth = 4 * (1 - ph) + 1;
        ctx.beginPath(); ctx.arc(0, 0, rr * (0.9 + ph * 0.5), 0, Math.PI * 2); ctx.stroke();
    }

    // ── 🔯 별 꼭짓점마다 빛나는 결절 ──────────────────────
    for (let k = 0; k < 5; k++) {
        const pb = 0.7 + Math.sin(mathNow / 150 + k * 1.3) * 0.3;
        const ng = ctx.createRadialGradient(P[k][0], P[k][1], 1, P[k][0], P[k][1], rr * 0.14 * pb);
        ng.addColorStop(0, AB_WHITE + alpha + ")");
        ng.addColorStop(0.45, AB_PINK + (0.9 * alpha) + ")");
        ng.addColorStop(1, "rgba(180,40,200,0)");
        ctx.fillStyle = ng;
        ctx.beginPath(); ctx.arc(P[k][0], P[k][1], rr * 0.14 * pb, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // ── ⚡ 진 안에서 위로 솟는 빛 입자 ────────────────────
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.9;
    for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2 + spin * 2;
        const f = ((mathNow / 800) + k / 16) % 1;
        const d = R * (0.25 + (k % 4) * 0.18);
        const px = cx + Math.cos(a) * d;
        const py = cy + Math.sin(a) * d * 0.42 - f * R * 1.6;
        ctx.fillStyle = (k % 3 === 0 ? AB_PINK : AB_CYAN) + (0.9 * (1 - f)) + ")";
        ctx.beginPath(); ctx.arc(px, py, 4.5 * (1 - f * 0.6), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // ── 중심에서 솟는 빛기둥 ───────────────────────────────
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.8;
    const h = R * 2.4 * grow;
    const pg = ctx.createLinearGradient(cx, cy, cx, cy - h);
    pg.addColorStop(0, AB_WHITE + "0.9)");
    pg.addColorStop(0.35, AB_CYAN + "0.5)");
    pg.addColorStop(1, "rgba(60,120,220,0)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.3, cy);
    ctx.quadraticCurveTo(cx - R * 0.08, cy - h * 0.6, cx, cy - h);
    ctx.quadraticCurveTo(cx + R * 0.08, cy - h * 0.6, cx + R * 0.3, cy);
    ctx.closePath(); ctx.fill();
    ctx.restore();
}

registerVisualFX('abyss_circle', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    drawAbyssCircle(ctx, fx.x, fx.y + 45, fx.R || 170, t, alpha, state.mathNow);
});

registerVisualFX('abyss_warp', (ctx, fx, alpha, state) => {
    const t = 1 - alpha;
    const R = 300 * (1 - Math.pow(1 - Math.min(1, t / 0.35), 2.3));
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(fx.x, fx.y, 4, fx.x, fx.y, R);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.28, AB_CYAN + "0.9)");
    g.addColorStop(0.62, AB_PINK + "0.55)");
    g.addColorStop(1, "rgba(40,60,140,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        ctx.strokeStyle = AB_WHITE + (0.85 * alpha) + ")";
        ctx.lineWidth = 5 * (1 - t) + 1;
        ctx.beginPath();
        ctx.moveTo(fx.x + Math.cos(a) * R * 0.25, fx.y + Math.sin(a) * R * 0.25);
        ctx.lineTo(fx.x + Math.cos(a) * R * 1.1, fx.y + Math.sin(a) * R * 1.1);
        ctx.stroke();
    }
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🟣 동반 유닛의 보라 필드
//   · 이 안에 들어온 것은 무엇이든 공격받는다
//   · 유닛도 이 밖으로는 나가지 않는다
// ────────────────────────────────────────────────────────────────────────────
export function drawEscortField(ctx, cx, cy, R, mathNow) {
    const t = mathNow / 1000;
    const pulse = 0.86 + Math.sin(t * 1.7) * 0.14;
    const spin = t * 0.28;

    ctx.save();

    // ── ① 바닥을 물들이는 보라 장판 ────────────────────────
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.40 * pulse;
    const g = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R);
    g.addColorStop(0, "rgba(236,198,255,0.70)");
    g.addColorStop(0.35, "rgba(186,110,255,0.50)");
    g.addColorStop(0.72, "rgba(126,44,220,0.32)");
    g.addColorStop(1, "rgba(58,12,120,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.42, 0, 0, Math.PI * 2); ctx.fill();

    // ── ② 일렁이는 대기 — 가장자리가 물결친다 ──────────────
    for (let layer = 0; layer < 3; layer++) {
        const rr = R * (0.72 + layer * 0.14);
        const amp = R * 0.035 * (1 + layer * 0.5);
        ctx.globalAlpha = (0.42 - layer * 0.1) * pulse;
        ctx.strokeStyle = layer === 0 ? "rgba(235,195,255,0.95)" : "rgba(175,95,250,0.8)";
        ctx.lineWidth = 4 - layer;
        ctx.beginPath();
        for (let k = 0; k <= 72; k++) {
            const a = (k / 72) * Math.PI * 2;
            // 여러 파형을 겹쳐 자연스럽게 일렁이게 한다
            const wob = Math.sin(a * 3 + t * 1.6 + layer) * amp
                      + Math.sin(a * 7 - t * 2.3 + layer * 2) * amp * 0.45
                      + Math.sin(a * 11 + t * 1.1) * amp * 0.22;
            const rx = (rr + wob), ry = (rr + wob) * 0.42;
            const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
    }

    // ── ③ 경계선 — 진하고 또렷하게 ─────────────────────────
    ctx.globalAlpha = 0.95 * pulse;
    ctx.strokeStyle = "rgba(226,176,255,0.98)";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    // 바깥으로 번지는 잔광
    ctx.globalAlpha = 0.45 * pulse;
    ctx.strokeStyle = "rgba(160,80,240,0.6)";
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.01, R * 0.425, 0, 0, Math.PI * 2); ctx.stroke();

    // ── ④ 회전하는 룬 고리 ────────────────────────────────
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(1, 0.42); ctx.rotate(spin);
    ctx.globalAlpha = 0.7 * pulse;
    ctx.strokeStyle = "rgba(210,150,255,0.9)";
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 18]);
    ctx.beginPath(); ctx.arc(0, 0, R * 0.88, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // 짧은 룬 획
    ctx.lineWidth = 2.6; ctx.lineCap = "round";
    for (let k = 0; k < 30; k++) {
        const a = (k / 30) * Math.PI * 2;
        ctx.save(); ctx.rotate(a);
        const h = R * (0.045 + ((k * 7) % 4) * 0.012);
        ctx.beginPath();
        ctx.moveTo(R * 0.88 - h, -3); ctx.lineTo(R * 0.88 + h, -3);
        ctx.moveTo(R * 0.88, -3); ctx.lineTo(R * 0.88, 4);
        if (k % 3 === 0) { ctx.moveTo(R * 0.88 - h, 4); ctx.lineTo(R * 0.88 + h, 4); }
        ctx.stroke();
        ctx.restore();
    }
    // 반대로 도는 안쪽 고리
    ctx.rotate(-spin * 2.6);
    ctx.globalAlpha = 0.55 * pulse;
    ctx.strokeStyle = "rgba(245,215,255,0.85)";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([14, 22]);
    ctx.beginPath(); ctx.arc(0, 0, R * 0.58, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ── ⑤ 마력 — 안쪽으로 빨려 드는 입자 ───────────────────
    ctx.globalCompositeOperation = "screen";
    for (let k = 0; k < 26; k++) {
        const a = (k / 26) * Math.PI * 2 + spin * 2.2;
        const f = ((t * 0.5) + k / 26) % 1;
        const d = R * (1.02 - f * 0.85);
        const px = cx + Math.cos(a) * d;
        const py = cy + Math.sin(a) * d * 0.42 - f * R * 0.28;
        const sz = (3.4 + (k % 3) * 1.4) * (1 - f * 0.45);
        ctx.globalAlpha = 0.85 * (1 - f) * pulse;
        const pg = ctx.createRadialGradient(px, py, 0.5, px, py, sz * 2.4);
        pg.addColorStop(0, "rgba(255,245,255,1)");
        pg.addColorStop(0.35, "rgba(220,160,255,0.9)");
        pg.addColorStop(1, "rgba(140,60,230,0)");
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, sz * 2.4, 0, Math.PI * 2); ctx.fill();
    }

    // ── ⑥ 위로 피어오르는 보라 아지랑이 ────────────────────
    ctx.globalAlpha = 0.34 * pulse;
    for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + t * 0.2;
        const f = ((t * 0.34) + k / 12) % 1;
        const bx = cx + Math.cos(a) * R * 0.82;
        const by = cy + Math.sin(a) * R * 0.82 * 0.42;
        const h = R * 0.5 * f;
        const wob = Math.sin(t * 2.4 + k) * R * 0.035;
        const mg = ctx.createLinearGradient(bx, by, bx + wob, by - h);
        mg.addColorStop(0, "rgba(200,140,255," + (0.55 * (1 - f)) + ")");
        mg.addColorStop(1, "rgba(120,40,200,0)");
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.moveTo(bx - R * 0.05, by);
        ctx.quadraticCurveTo(bx + wob - R * 0.02, by - h * 0.6, bx + wob, by - h);
        ctx.quadraticCurveTo(bx + wob + R * 0.02, by - h * 0.6, bx + R * 0.05, by);
        ctx.closePath(); ctx.fill();
    }

    // ── ⑦ 중심에서 퍼지는 충격 고리 ────────────────────────
    for (let k = 0; k < 2; k++) {
        const f = ((t * 0.55) + k / 2) % 1;
        ctx.globalAlpha = 0.5 * (1 - f) * pulse;
        ctx.strokeStyle = "rgba(230,185,255,0.9)";
        ctx.lineWidth = 5 * (1 - f) + 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * f, R * f * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// 🛡️ 신의 기사단 — 흰 바탕에 금빛이 어우러진 정장
//
//   · 흰 정장 상의 · 금색 옷깃과 단추 · 금빛 견장
//   · 흰 장갑 · 금테를 두른 흰 가면(투구)
//   · 몸을 감도는 은은한 금빛 성광
// ────────────────────────────────────────────────────────────────────────────
const KN_WHITE = "#f6f7fa";
const KN_WHITE_D = "#d7dbe4";
const KN_GOLD = "#d9b24c";
const KN_GOLD_L = "#f2d98a";
const KN_GOLD_D = "#9c7a22";

export function drawKnight(ctx, w, mathNow) {
    const R = w.radius || 62;
    const cx = w.x, cy = w.y;
    const bob = Math.sin(mathNow / 500) * 2.5;

    ctx.save();
    ctx.translate(0, bob);

    // ── ✨ 몸을 감도는 금빛 성광 ────────────────────────────
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.35 + Math.sin(mathNow / 420) * 0.12;
    const hg = ctx.createRadialGradient(cx, cy - R * 0.2, R * 0.3, cx, cy - R * 0.2, R * 1.5);
    hg.addColorStop(0, "rgba(255,240,190,0.55)");
    hg.addColorStop(0.6, "rgba(217,178,76,0.25)");
    hg.addColorStop(1, "rgba(160,120,30,0)");
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(cx, cy - R * 0.2, R * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ── 다리 (흰 슬랙스) ───────────────────────────────────
    ctx.fillStyle = KN_WHITE_D;
    for (const sd of [-1, 1]) {
        ctx.fillRect(cx + sd * R * 0.3 - R * 0.14, cy + R * 0.55, R * 0.28, R * 0.45);
    }
    // 검은 구두
    ctx.fillStyle = "#20232b";
    for (const sd of [-1, 1]) {
        ctx.fillRect(cx + sd * R * 0.3 - R * 0.17, cy + R * 0.94, R * 0.34, R * 0.12);
    }

    // ── 상의 (흰 정장) ─────────────────────────────────────
    const bg = ctx.createLinearGradient(cx - R * 0.7, cy - R * 0.6, cx + R * 0.7, cy + R * 0.7);
    bg.addColorStop(0, KN_WHITE);
    bg.addColorStop(0.55, KN_WHITE);
    bg.addColorStop(1, KN_WHITE_D);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.62, cy + R * 0.62);
    ctx.quadraticCurveTo(cx - R * 0.74, cy - R * 0.3, cx - R * 0.42, cy - R * 0.52);
    ctx.lineTo(cx + R * 0.42, cy - R * 0.52);
    ctx.quadraticCurveTo(cx + R * 0.74, cy - R * 0.3, cx + R * 0.62, cy + R * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = KN_GOLD_D; ctx.lineWidth = 3; ctx.stroke();

    // 금색 옷깃 (V자)
    ctx.strokeStyle = KN_GOLD; ctx.lineWidth = 6; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.36, cy - R * 0.5);
    ctx.lineTo(cx, cy + R * 0.02);
    ctx.lineTo(cx + R * 0.36, cy - R * 0.5);
    ctx.stroke();
    // 옷깃 안쪽 밝은 선
    ctx.strokeStyle = KN_GOLD_L; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.36, cy - R * 0.5);
    ctx.lineTo(cx, cy + R * 0.02);
    ctx.lineTo(cx + R * 0.36, cy - R * 0.5);
    ctx.stroke();

    // 금색 단추 세 개
    ctx.fillStyle = KN_GOLD_L;
    for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(cx, cy + R * (0.12 + k * 0.17), R * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = KN_GOLD_D; ctx.lineWidth = 1.6; ctx.stroke();
    }

    // 금빛 견장
    for (const sd of [-1, 1]) {
        const ox = cx + sd * R * 0.56, oy = cy - R * 0.38;
        ctx.fillStyle = KN_GOLD;
        ctx.beginPath();
        ctx.ellipse(ox, oy, R * 0.2, R * 0.12, sd * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = KN_GOLD_D; ctx.lineWidth = 2; ctx.stroke();
        // 술 장식
        ctx.strokeStyle = KN_GOLD_L; ctx.lineWidth = 2;
        for (let k = -1; k <= 1; k++) {
            ctx.beginPath();
            ctx.moveTo(ox + k * R * 0.07, oy + R * 0.08);
            ctx.lineTo(ox + k * R * 0.07, oy + R * 0.22);
            ctx.stroke();
        }
    }

    // ── 팔 ─────────────────────────────────────────────────
    ctx.strokeStyle = KN_WHITE; ctx.lineWidth = R * 0.26; ctx.lineCap = "round";
    for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sd * R * 0.52, cy - R * 0.22);
        ctx.lineTo(cx + sd * R * 0.72, cy + R * 0.5);
        ctx.stroke();
    }
    // 금색 소맷단
    ctx.strokeStyle = KN_GOLD; ctx.lineWidth = R * 0.09;
    for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sd * R * 0.68, cy + R * 0.36);
        ctx.lineTo(cx + sd * R * 0.71, cy + R * 0.46);
        ctx.stroke();
    }
    // 흰 장갑
    ctx.fillStyle = KN_WHITE;
    for (const sd of [-1, 1]) {
        ctx.beginPath(); ctx.arc(cx + sd * R * 0.73, cy + R * 0.56, R * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = KN_GOLD_D; ctx.lineWidth = 2; ctx.stroke();
    }

    // ── 머리 (금테 흰 가면) ────────────────────────────────
    const hy = cy - R * 0.82;
    // 흰 두건
    ctx.fillStyle = KN_WHITE;
    ctx.beginPath(); ctx.arc(cx, hy, R * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = KN_GOLD; ctx.lineWidth = 3.5; ctx.stroke();
    // 가면 면
    ctx.fillStyle = "#e9ecf2";
    ctx.beginPath();
    ctx.ellipse(cx, hy + R * 0.04, R * 0.27, R * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = KN_GOLD_D; ctx.lineWidth = 2; ctx.stroke();
    // 눈구멍 두 줄
    ctx.fillStyle = "#2b2f3a";
    for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + sd * R * 0.12, hy + R * 0.02, R * 0.07, R * 0.04, sd * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    // 이마의 금빛 십자 문양
    ctx.strokeStyle = KN_GOLD_L; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, hy - R * 0.26); ctx.lineTo(cx, hy - R * 0.1);
    ctx.moveTo(cx - R * 0.08, hy - R * 0.19); ctx.lineTo(cx + R * 0.08, hy - R * 0.19);
    ctx.stroke();

    ctx.restore();

    // ── 이름 ───────────────────────────────────────────────
    const by = cy - R * 1.45;
    ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 4; ctx.lineJoin = "round";
    ctx.strokeText("신의 기사단", cx, by);
    ctx.fillStyle = KN_GOLD_L;
    ctx.fillText("신의 기사단", cx, by);
}

// ────────────────────────────────────────────────────────────────────────────
// ⭐ 오로성 — 세계정부 최고 권력자
//
//   🎨 원작의 특징을 뽑았다.
//     · 검은 정장 차림의 노인 · 긴 백발과 풍성한 흰 수염
//     · 저마다 다른 무기(칼 · 활 · 총 · 검 · 지팡이)를 들고 다닌다
//     · 어두운 위압감 — 발밑에서 피어오르는 검은 기운
//     · 가슴에 세계정부 문양
// ────────────────────────────────────────────────────────────────────────────
const GS_BLACK = "#14151c";
const GS_BLACK_L = "#2a2c38";
const GS_HAIR = "#e8e9ee";
const GS_SKIN = "#c99b73";
const GS_SKIN_D = "#8f6642";
const GS_NAVY = "#151b52";

export function drawGorosei(ctx, w, mathNow) {
    const R = w.radius || 66;
    const cx = w.x, cy = w.y;
    const bob = Math.sin(mathNow / 560) * 2.2;
    // 다섯 명이 각기 다른 무기를 든다
    const wp = (w.idx || 0) % 5;

    ctx.save();
    ctx.translate(0, bob);

    // ── 🖤 발밑에서 피어오르는 검은 기운 ───────────────────
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (let k = 0; k < 6; k++) {
        const f = ((mathNow / 1300) + k / 6) % 1;
        const px = cx + Math.sin(k * 2.1 + mathNow / 700) * R * 0.5;
        const py = cy + R * 0.9 - f * R * 1.5;
        ctx.globalAlpha = 0.4 * (1 - f);
        ctx.fillStyle = "#0d0e14";
        ctx.beginPath();
        ctx.ellipse(px, py, R * 0.26 * (1 - f * 0.4), R * 0.17 * (1 - f * 0.4), 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // ── 다리 · 구두 ────────────────────────────────────────
    ctx.fillStyle = GS_BLACK;
    for (const sd of [-1, 1]) {
        ctx.fillRect(cx + sd * R * 0.28 - R * 0.13, cy + R * 0.55, R * 0.26, R * 0.45);
    }
    ctx.fillStyle = "#0a0b10";
    for (const sd of [-1, 1]) {
        ctx.fillRect(cx + sd * R * 0.28 - R * 0.16, cy + R * 0.95, R * 0.32, R * 0.11);
    }

    // ── 검은 정장 상의 ─────────────────────────────────────
    const bg = ctx.createLinearGradient(cx - R * 0.7, cy - R * 0.6, cx + R * 0.7, cy + R * 0.7);
    bg.addColorStop(0, GS_BLACK_L);
    bg.addColorStop(0.5, GS_BLACK);
    bg.addColorStop(1, "#0b0c12");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.6, cy + R * 0.62);
    ctx.quadraticCurveTo(cx - R * 0.72, cy - R * 0.28, cx - R * 0.4, cy - R * 0.5);
    ctx.lineTo(cx + R * 0.4, cy - R * 0.5);
    ctx.quadraticCurveTo(cx + R * 0.72, cy - R * 0.28, cx + R * 0.6, cy + R * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#000"; ctx.lineWidth = 3; ctx.stroke();

    // 흰 셔츠 + 넥타이
    ctx.fillStyle = "#dfe3ea";
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.17, cy - R * 0.48);
    ctx.lineTo(cx + R * 0.17, cy - R * 0.48);
    ctx.lineTo(cx + R * 0.1, cy + R * 0.1);
    ctx.lineTo(cx - R * 0.1, cy + R * 0.1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#6b1220";
    ctx.beginPath();
    ctx.moveTo(cx, cy - R * 0.4);
    ctx.lineTo(cx + R * 0.07, cy - R * 0.28);
    ctx.lineTo(cx + R * 0.05, cy + R * 0.1);
    ctx.lineTo(cx - R * 0.05, cy + R * 0.1);
    ctx.lineTo(cx - R * 0.07, cy - R * 0.28);
    ctx.closePath(); ctx.fill();

    // 옷깃
    ctx.strokeStyle = "#3a3d4a"; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.34, cy - R * 0.48);
    ctx.lineTo(cx - R * 0.06, cy + R * 0.02);
    ctx.moveTo(cx + R * 0.34, cy - R * 0.48);
    ctx.lineTo(cx + R * 0.06, cy + R * 0.02);
    ctx.stroke();

    // 🏛️ 가슴의 세계정부 문양
    const mx2 = cx - R * 0.36, my2 = cy + R * 0.16, mr = R * 0.045, ma = R * 0.1;
    ctx.strokeStyle = GS_NAVY; ctx.lineWidth = 3;
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
        ctx.beginPath(); ctx.moveTo(mx2, my2);
        ctx.lineTo(mx2 + d[0] * ma, my2 + d[1] * ma); ctx.stroke();
    });
    ctx.fillStyle = GS_NAVY;
    [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
        ctx.beginPath(); ctx.arc(mx2 + d[0] * ma, my2 + d[1] * ma, mr, 0, Math.PI * 2); ctx.fill();
    });

    // ── 팔 ─────────────────────────────────────────────────
    ctx.strokeStyle = GS_BLACK; ctx.lineWidth = R * 0.24; ctx.lineCap = "round";
    for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sd * R * 0.5, cy - R * 0.22);
        ctx.lineTo(cx + sd * R * 0.7, cy + R * 0.48);
        ctx.stroke();
    }
    ctx.fillStyle = GS_SKIN;
    for (const sd of [-1, 1]) {
        ctx.beginPath(); ctx.arc(cx + sd * R * 0.72, cy + R * 0.55, R * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = GS_SKIN_D; ctx.lineWidth = 2; ctx.stroke();
    }

    // ── ⚔️ 저마다 다른 무기 ────────────────────────────────
    const wx = cx + R * 0.78, wy = cy + R * 0.5;
    ctx.save();
    ctx.translate(wx, wy);
    if (wp === 0) {
        // 칼 (일본도)
        ctx.rotate(-0.5);
        ctx.strokeStyle = "#5a4a2a"; ctx.lineWidth = R * 0.07;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, R * 0.22); ctx.stroke();
        ctx.strokeStyle = "#c8ccd6"; ctx.lineWidth = R * 0.06;
        ctx.beginPath(); ctx.moveTo(0, -R * 0.05); ctx.lineTo(0, -R * 0.95); ctx.stroke();
    } else if (wp === 1) {
        // 활
        ctx.rotate(0.2);
        ctx.strokeStyle = "#6b5730"; ctx.lineWidth = R * 0.06;
        ctx.beginPath(); ctx.arc(0, -R * 0.3, R * 0.5, -Math.PI * 0.45, Math.PI * 0.45); ctx.stroke();
        ctx.strokeStyle = "#d6d9e0"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(R * 0.05, -R * 0.75); ctx.lineTo(R * 0.05, R * 0.15); ctx.stroke();
    } else if (wp === 2) {
        // 총
        ctx.fillStyle = "#3a3d4a";
        ctx.fillRect(-R * 0.05, -R * 0.42, R * 0.14, R * 0.5);
        ctx.fillStyle = "#2a2c38";
        ctx.fillRect(-R * 0.05, -R * 0.12, R * 0.1, R * 0.24);
    } else if (wp === 3) {
        // 양날 검
        ctx.rotate(-0.3);
        ctx.strokeStyle = "#7a6a3a"; ctx.lineWidth = R * 0.09;
        ctx.beginPath(); ctx.moveTo(-R * 0.13, -R * 0.1); ctx.lineTo(R * 0.13, -R * 0.1); ctx.stroke();
        const sg = ctx.createLinearGradient(0, -R * 0.1, 0, -R * 0.9);
        sg.addColorStop(0, "#e6e9f0"); sg.addColorStop(1, "#9aa0ac");
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(-R * 0.07, -R * 0.1); ctx.lineTo(0, -R * 0.95);
        ctx.lineTo(R * 0.07, -R * 0.1); ctx.closePath(); ctx.fill();
    } else {
        // 지팡이
        ctx.strokeStyle = "#4a3a22"; ctx.lineWidth = R * 0.07;
        ctx.beginPath(); ctx.moveTo(0, R * 0.2); ctx.lineTo(0, -R * 0.85); ctx.stroke();
        ctx.fillStyle = "#c9a227";
        ctx.beginPath(); ctx.arc(0, -R * 0.92, R * 0.11, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // ── 머리 (백발 노인 + 흰 수염) ─────────────────────────
    const hy = cy - R * 0.8;
    // 긴 백발 (뒤로 흐른다)
    ctx.fillStyle = GS_HAIR;
    ctx.beginPath();
    ctx.ellipse(cx, hy + R * 0.06, R * 0.42, R * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 얼굴
    ctx.fillStyle = GS_SKIN;
    ctx.beginPath(); ctx.arc(cx, hy + R * 0.02, R * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = GS_SKIN_D; ctx.lineWidth = 2.5; ctx.stroke();
    // 굵은 눈썹
    ctx.strokeStyle = "#f0f1f5"; ctx.lineWidth = R * 0.07; ctx.lineCap = "round";
    for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + sd * R * 0.05, hy - R * 0.1);
        ctx.lineTo(cx + sd * R * 0.2, hy - R * 0.05);
        ctx.stroke();
    }
    // 매서운 눈
    ctx.fillStyle = "#1a1c24";
    for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + sd * R * 0.12, hy + R * 0.02, R * 0.05, R * 0.028, sd * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }
    // 풍성한 흰 수염
    ctx.fillStyle = GS_HAIR;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.24, hy + R * 0.12);
    ctx.quadraticCurveTo(cx - R * 0.3, hy + R * 0.52, cx, hy + R * 0.62);
    ctx.quadraticCurveTo(cx + R * 0.3, hy + R * 0.52, cx + R * 0.24, hy + R * 0.12);
    ctx.quadraticCurveTo(cx, hy + R * 0.26, cx - R * 0.24, hy + R * 0.12);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#c9ccd4"; ctx.lineWidth = 1.5; ctx.stroke();
    // 콧수염
    ctx.strokeStyle = GS_HAIR; ctx.lineWidth = R * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.14, hy + R * 0.13);
    ctx.quadraticCurveTo(cx, hy + R * 0.19, cx + R * 0.14, hy + R * 0.13);
    ctx.stroke();

    ctx.restore();

    // ── 이름 ───────────────────────────────────────────────
    const by = cy - R * 1.5;
    ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 4; ctx.lineJoin = "round";
    ctx.strokeText("오로성", cx, by);
    ctx.fillStyle = "#d8dae2";
    ctx.fillText("오로성", cx, by);
}
