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
    const nm = ser ? "세라핌" : "칠무해";
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
    for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + tt * 1.6;
        const d = 200 * (1 - t) + 26;
        const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.6;
        ctx.fillStyle = "rgba(220,230,255,0.95)";
        ctx.beginPath(); ctx.arc(px, py, 5 - t * 2, 0, Math.PI * 2); ctx.fill();
    }

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
