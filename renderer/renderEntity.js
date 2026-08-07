// 파일명: renderEntity.js

import { RenderUtils } from './renderUtils.js';

// ============================================================================
// 🩸 체력 눈금 — 최대 체력 400당 눈금 1개
// ============================================================================
const HP_TICK_UNIT = 400;
function drawHpTicks(ctx, x, y, w, h, maxHp) {
    if (!maxHp || maxHp <= HP_TICK_UNIT || w <= 0) return;
    const count = Math.floor(maxHp / HP_TICK_UNIT);
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.lineWidth = (w > 150) ? 1.5 : 1;
    ctx.beginPath();
    for (let i = 1; i <= count; i++) {
        const v = i * HP_TICK_UNIT;
        if (v >= maxHp) break;
        const tx = x + w * (v / maxHp);
        ctx.moveTo(tx, y);
        ctx.lineTo(tx, y + h);
    }
    ctx.stroke();
    ctx.restore();
}

// ============================================================================
// ⚡ 카시모 전하(電荷) 게이지
//    · 평타 1회당 1칸씩 보라색으로 채워진다 (아래에서 위로)
//    · 감쇠 타이머는 위에서 아래로 줄어든다
//    · 전체를 굵은 검은 테두리로 감싼다
// ============================================================================
const CHARGE_MAX = 4;
const CHARGE_DECAY_MS = 8000;

function drawKashimoCharge(ctx, obj, hpX, hpW, hpY, hpH, mathNow, scale) {
    if (!obj) return;
    const charge = obj.kashimoCharge || 0;
    if (charge <= 0) return;

    const s = scale || 1;
    const GAP       = 6 * s;
    const CELL_W    = 15 * s;
    const CELL_H    = 9 * s;
    const CELL_GAP  = 2.5 * s;
    const TIMER_W   = 6 * s;
    const TIMER_GAP = 3.5 * s;
    const PAD       = 3 * s;

    const totalH = CELL_H * CHARGE_MAX + CELL_GAP * (CHARGE_MAX - 1);
    const baseX = hpX + hpW + GAP;
    const baseY = hpY + hpH / 2 - totalH / 2;

    const until = obj.kashimoChargeUntil || 0;
    const hasTimer = (until > mathNow);

    const groupW = CELL_W + (hasTimer ? (TIMER_GAP + TIMER_W) : 0);
    const outX = baseX - PAD, outY = baseY - PAD;
    const outW = groupW + PAD * 2, outH = totalH + PAD * 2;

    ctx.save();

    // ── 전체를 감싸는 검은 테두리 + 배경 ─────────────────────────────
    ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
    ctx.fillRect(outX, outY, outW, outH);
    ctx.strokeStyle = "rgba(0, 0, 0, 1)";
    ctx.lineWidth = Math.max(2, 2.5 * s);
    ctx.strokeRect(outX, outY, outW, outH);

    // ── 전하 4칸 (아래에서 위로 채워진다) ────────────────────────────
    for (let i = 0; i < CHARGE_MAX; i++) {
        const cy = baseY + totalH - CELL_H - i * (CELL_H + CELL_GAP);
        const filled = (i < charge);

        ctx.fillStyle = "rgba(18, 6, 30, 0.9)";
        ctx.fillRect(baseX, cy, CELL_W, CELL_H);

        if (filled) {
            let g = ctx.createLinearGradient(baseX, cy, baseX + CELL_W, cy + CELL_H);
            g.addColorStop(0, "#d8b4fe");
            g.addColorStop(0.5, "#a855f7");
            g.addColorStop(1, "#6b21a8");
            ctx.fillStyle = g;
            ctx.fillRect(baseX + 1.5 * s, cy + 1.2 * s, CELL_W - 3 * s, CELL_H - 2.4 * s);

            if (charge >= CHARGE_MAX) {
                let pulse = 0.45 + Math.abs(Math.sin(mathNow / 130)) * 0.55;
                ctx.globalCompositeOperation = "screen";
                ctx.fillStyle = `rgba(233, 213, 255, ${pulse * 0.85})`;
                ctx.fillRect(baseX + 1.5 * s, cy + 1.2 * s, CELL_W - 3 * s, CELL_H - 2.4 * s);
                ctx.globalCompositeOperation = "source-over";
            }
        }

        ctx.strokeStyle = (filled && charge >= CHARGE_MAX)
            ? `rgba(233, 213, 255, ${0.75 + Math.abs(Math.sin(mathNow / 130)) * 0.25})`
            : "rgba(0, 0, 0, 1)";
        ctx.lineWidth = Math.max(1.5, 1.8 * s);
        ctx.strokeRect(baseX, cy, CELL_W, CELL_H);
    }

    // ── ⏳ 감쇠 타이머 (위에서 아래로 사라진다) ──────────────────────
    if (hasTimer) {
        let remain = until - mathNow;
        let ratio = Math.max(0, Math.min(1, remain / CHARGE_DECAY_MS));

        const tx = baseX + CELL_W + TIMER_GAP;

        ctx.fillStyle = "rgba(18, 6, 30, 0.9)";
        ctx.fillRect(tx, baseY, TIMER_W, totalH);

        let fillH = totalH * ratio;
        let fillY = baseY + (totalH - fillH);
        let g2 = ctx.createLinearGradient(tx, fillY, tx, baseY + totalH);
        g2.addColorStop(0, "#e9d5ff");
        g2.addColorStop(1, "#7e22ce");
        ctx.fillStyle = g2;
        ctx.fillRect(tx + 1 * s, fillY + 1 * s, TIMER_W - 2 * s, Math.max(0, fillH - 2 * s));

        if (remain <= 2000) {
            let blink = 0.4 + Math.abs(Math.sin(mathNow / 100)) * 0.6;
            ctx.fillStyle = `rgba(255, 80, 120, ${blink * 0.8})`;
            ctx.fillRect(tx + 1 * s, fillY + 1 * s, TIMER_W - 2 * s, Math.max(0, fillH - 2 * s));
        }

        ctx.strokeStyle = "rgba(0, 0, 0, 1)";
        ctx.lineWidth = Math.max(1.5, 1.8 * s);
        ctx.strokeRect(tx, baseY, TIMER_W, totalH);
    }

    ctx.restore();
}

// ============================================================================
// ⚡🔮 [신규] 환수호박 — 플레이어 몸을 '전기 덩어리'로 그린다.
//    기본 원형 대신 불규칙하게 요동치는 보랏빛 전기 덩어리로 대체된다.
//    (오라 · 잔상은 fxkashimo.js 가 담당하고, 여기서는 '몸' 자체를 그린다)
// ============================================================================
function drawAmberBody(ctx, px, py, mathNow, team) {
    const R = 45;

    ctx.save();
    ctx.translate(px, py);

    // ── ① 바깥 전기 후광 ─────────────────────────────────────────────
    ctx.globalCompositeOperation = "screen";
    let pulse = 1 + Math.sin(mathNow / 65) * 0.2;
    let auraR = R * 1.9 * pulse;
    let aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraR);
    aura.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    aura.addColorStop(0.3, "rgba(233, 213, 255, 0.7)");
    aura.addColorStop(0.65, "rgba(168, 85, 247, 0.45)");
    aura.addColorStop(1, "rgba(88, 20, 160, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // ── ② 요동치는 전기 덩어리 본체 ──────────────────────────────────
    const LOBES = 13;
    ctx.beginPath();
    for (let i = 0; i <= LOBES; i++) {
        let a = (Math.PI * 2 / LOBES) * i;
        let wob = 1
            + Math.sin(a * 3 + mathNow / 80) * 0.17
            + Math.sin(a * 5 - mathNow / 130) * 0.12
            + Math.sin(a * 7 + mathNow / 55) * 0.07;
        let rr = R * wob;
        let xx = Math.cos(a) * rr, yy = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.closePath();

    let body = ctx.createRadialGradient(-R * 0.25, -R * 0.25, R * 0.12, 0, 0, R * 1.1);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.3, "#f0dcff");
    body.addColorStop(0.62, "#a855f7");
    body.addColorStop(1, "#4c1080");
    ctx.fillStyle = body;
    ctx.fill();

    // 팀 색 윤곽 (아군/적군 구분은 유지되어야 한다)
    ctx.strokeStyle = (team === 1) ? "rgba(80, 170, 255, 0.9)" : "rgba(255, 100, 100, 0.9)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 + Math.abs(Math.sin(mathNow / 85)) * 0.3})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // ── ③ 덩어리 내부를 흐르는 전류 ──────────────────────────────────
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let b = 0; b < 4; b++) {
        let a0 = (Math.PI * 2 / 4) * b + mathNow / 210;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + Math.abs(Math.sin(b + mathNow / 100)) * 0.4})`;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let q = 0; q <= 6; q++) {
            let t = q / 6;
            let a = a0 + t * 1.6;
            let rr = R * (0.15 + t * 0.75) * (1 + Math.sin(q * 2.2 + mathNow / 70) * 0.16);
            let xx = Math.cos(a) * rr, yy = Math.sin(a) * rr;
            if (q === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
    }

    // ── ④ 중심 백광 코어 ─────────────────────────────────────────────
    let corePulse = 1 + Math.sin(mathNow / 45) * 0.28;
    let cc = ctx.createRadialGradient(0, 0, 1, 0, 0, R * 0.42 * corePulse);
    cc.addColorStop(0, "rgba(255, 255, 255, 1)");
    cc.addColorStop(0.55, "rgba(240, 220, 255, 0.75)");
    cc.addColorStop(1, "rgba(168, 85, 247, 0)");
    ctx.fillStyle = cc;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.42 * corePulse, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
}

// ============================================================================
// ⏳ 포탈 소멸까지 남은 시간 표시
// ============================================================================
function drawPortalLifetime(ctx, pt, mathNow, isDark) {
    if (!pt || !pt.expireAt) return;
    let remain = pt.expireAt - mathNow;
    if (remain <= 0) return;

    const R = pt.radius || 110;
    let sec = Math.max(1, Math.ceil(remain / 1000));
    let urgent = (remain <= 5000);
    let blink = urgent ? (0.55 + Math.abs(Math.sin(mathNow / 110)) * 0.45) : 1;
    let beat = 1 + (1 - ((remain % 1000) / 1000)) * (urgent ? 0.3 : 0.14);

    ctx.save();
    ctx.translate(pt.x, pt.y - R * 2.15);
    ctx.scale(beat, beat);

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = blink;
    let g = ctx.createRadialGradient(0, 0, 5, 0, 0, 70);
    if (urgent) {
        g.addColorStop(0, "rgba(255, 190, 190, 0.95)");
        g.addColorStop(0.5, "rgba(255, 60, 60, 0.55)");
        g.addColorStop(1, "rgba(160, 0, 0, 0)");
    } else if (isDark) {
        g.addColorStop(0, "rgba(230, 200, 255, 0.9)");
        g.addColorStop(0.5, "rgba(150, 55, 245, 0.5)");
        g.addColorStop(1, "rgba(60, 0, 120, 0)");
    } else {
        g.addColorStop(0, "rgba(255, 250, 200, 0.9)");
        g.addColorStop(0.5, "rgba(255, 200, 40, 0.5)");
        g.addColorStop(1, "rgba(255, 170, 0, 0)");
    }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.strokeStyle = urgent ? "rgba(60, 0, 0, 0.95)" : (isDark ? "rgba(15, 0, 30, 0.95)" : "rgba(70, 45, 0, 0.95)");
    ctx.lineWidth = 9;
    ctx.strokeText(sec, 0, 0);
    ctx.fillStyle = urgent ? `rgba(255, 120, 120, ${blink})` : (isDark ? "#e0c2ff" : "#fff3b0");
    ctx.fillText(sec, 0, 0);

    ctx.font = "bold 20px sans-serif";
    ctx.strokeStyle = urgent ? "rgba(60, 0, 0, 0.95)" : (isDark ? "rgba(15, 0, 30, 0.95)" : "rgba(70, 45, 0, 0.95)");
    ctx.lineWidth = 5;
    ctx.strokeText("소멸까지", 0, -42);
    ctx.fillStyle = urgent ? "#ffb0b0" : (isDark ? "#c9a0ff" : "#ffe680");
    ctx.fillText("소멸까지", 0, -42);

    ctx.textBaseline = "alphabetic";
    ctx.restore();
}

// ============================================================================
// 🌀 포탈 그리기 공용 함수
// ============================================================================
function drawPortal(ctx, camX, camY, viewW, viewH, mathNow, pt, kind, label, showLifetime) {
    if (!pt) return;
    const R = pt.radius || 110;
    if (!RenderUtils.isVisible(camX, camY, viewW, viewH, pt.x, pt.y, R * 2, R * 2)) return;

    const spin = mathNow / 500;
    const pulse = 1 + Math.sin(mathNow / 220) * 0.12;
    const isDark = (kind === 'dark');

    ctx.save();
    ctx.translate(pt.x, pt.y);

    ctx.globalCompositeOperation = "screen";
    let aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 2.1 * pulse);
    if (isDark) {
        aura.addColorStop(0, "rgba(205, 150, 255, 0.85)");
        aura.addColorStop(0.45, "rgba(126, 30, 220, 0.5)");
        aura.addColorStop(1, "rgba(40, 0, 80, 0)");
    } else {
        aura.addColorStop(0, "rgba(255, 250, 190, 0.85)");
        aura.addColorStop(0.45, "rgba(255, 205, 40, 0.45)");
        aura.addColorStop(1, "rgba(255, 170, 0, 0)");
    }
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 2.1 * pulse, R * 1.6 * pulse, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    if (isDark) {
        ctx.fillStyle = "rgba(3, 0, 8, 0.98)";
        ctx.beginPath(); ctx.ellipse(0, 0, R * pulse, R * 1.25 * pulse, 0, 0, Math.PI * 2); ctx.fill();

        ctx.globalCompositeOperation = "screen";
        let core = ctx.createRadialGradient(0, 0, R * 0.06, 0, 0, R * pulse);
        core.addColorStop(0, "rgba(240, 215, 255, 0.95)");
        core.addColorStop(0.3, "rgba(150, 55, 245, 0.6)");
        core.addColorStop(0.72, "rgba(70, 0, 140, 0.35)");
        core.addColorStop(1, "rgba(10, 0, 25, 0)");
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.ellipse(0, 0, R * pulse, R * 1.25 * pulse, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    } else {
        ctx.globalCompositeOperation = "screen";
        let core = ctx.createRadialGradient(0, 0, R * 0.08, 0, 0, R * pulse);
        core.addColorStop(0, "rgba(255, 255, 255, 1)");
        core.addColorStop(0.35, "rgba(255, 236, 120, 0.95)");
        core.addColorStop(0.75, "rgba(240, 176, 20, 0.7)");
        core.addColorStop(1, "rgba(180, 110, 0, 0)");
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.ellipse(0, 0, R * pulse, R * 1.25 * pulse, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    }

    ctx.lineCap = "round";
    for (let a = 0; a < 4; a++) {
        let base = spin + a * (Math.PI / 2);
        if (isDark) {
            ctx.strokeStyle = "rgba(4, 0, 10, 0.95)";
            ctx.lineWidth = 13;
            ctx.beginPath();
            for (let t = 0; t <= 1.0001; t += 0.08) {
                let ang = base + t * Math.PI * 1.5;
                let rr = t * R * 1.05 * pulse;
                let xx = Math.cos(ang) * rr, yy = Math.sin(ang) * rr * 1.25;
                if (t === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
        }
        ctx.strokeStyle = isDark ? "rgba(190, 110, 255, 0.95)" : "rgba(255, 245, 190, 0.9)";
        ctx.lineWidth = isDark ? 5 : 7;
        ctx.beginPath();
        for (let t = 0; t <= 1.0001; t += 0.08) {
            let ang = base + t * Math.PI * 1.5;
            let rr = t * R * 1.05 * pulse;
            let xx = Math.cos(ang) * rr, yy = Math.sin(ang) * rr * 1.25;
            if (t === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
    }

    ctx.strokeStyle = isDark
        ? `rgba(160, 70, 255, ${0.8 + Math.sin(mathNow / 130) * 0.2})`
        : `rgba(255, 215, 60, ${0.8 + Math.sin(mathNow / 130) * 0.2})`;
    ctx.lineWidth = 6;
    ctx.setLineDash([18, 12]);
    ctx.lineDashOffset = -mathNow / 25;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.12 * pulse, R * 1.4 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    if (showLifetime && pt.expireAt && pt.createdAt) {
        let total = pt.expireAt - pt.createdAt;
        let left = Math.max(0, pt.expireAt - mathNow);
        let ratio = total > 0 ? (left / total) : 0;
        ctx.strokeStyle = (left <= 5000)
            ? `rgba(255, 70, 70, ${0.7 + Math.abs(Math.sin(mathNow / 110)) * 0.3})`
            : "rgba(220, 170, 255, 0.9)";
        ctx.lineWidth = 9;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
        ctx.stroke();
        ctx.lineCap = "butt";
    }

    ctx.globalCompositeOperation = "screen";
    for (let s = 0; s < 10; s++) {
        let t = ((mathNow / 900) + s * 0.1) % 1;
        let ang = s * 2.3 + spin * 2;
        let rr = (1 - t) * R * 1.9;
        ctx.globalAlpha = t;
        ctx.fillStyle = isDark ? "rgba(205, 150, 255, 0.95)" : "rgba(255, 250, 200, 0.95)";
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * rr, Math.sin(ang) * rr * 1.2, 5 * t + 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
    ctx.strokeStyle = isDark ? "rgba(15, 0, 30, 0.95)" : "rgba(70, 45, 0, 0.95)"; ctx.lineWidth = 6;
    ctx.strokeText(label, 0, -R * 1.55);
    ctx.fillStyle = isDark ? "#d9b3ff" : "#ffe680";
    ctx.fillText(label, 0, -R * 1.55);

    ctx.restore();

    if (showLifetime) drawPortalLifetime(ctx, pt, mathNow, isDark);
}

// 🌀 포탈 대기 중인 플레이어 머리 위 카운트다운
function drawPortalCountdown(ctx, px, py, until, mathNow) {
    if (!until || mathNow >= until) return;
    let remain = until - mathNow;
    let sec = Math.max(1, Math.ceil(remain / 1000));
    let beat = 1 + (1 - ((remain % 1000) / 1000)) * 0.25;

    ctx.save();
    ctx.translate(px, py - 125);
    ctx.scale(beat, beat);

    ctx.globalCompositeOperation = "screen";
    let g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    g.addColorStop(0, "rgba(255, 250, 200, 0.9)");
    g.addColorStop(0.5, "rgba(255, 200, 40, 0.5)");
    g.addColorStop(1, "rgba(255, 170, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.font = "bold 46px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(70, 45, 0, 0.95)"; ctx.lineWidth = 8;
    ctx.strokeText(sec, 0, 0);
    ctx.fillStyle = "#fff3b0";
    ctx.fillText(sec, 0, 0);

    ctx.textBaseline = "alphabetic";
    ctx.restore();
}

// 🟣 암흑 포탈 대기 카운트다운 (보라색)
function drawDarkPortalCountdown(ctx, px, py, until, mathNow) {
    if (!until || mathNow >= until) return;
    let remain = until - mathNow;
    let sec = Math.max(1, Math.ceil(remain / 1000));
    let beat = 1 + (1 - ((remain % 1000) / 1000)) * 0.25;

    ctx.save();
    ctx.translate(px, py - 125);
    ctx.scale(beat, beat);

    ctx.globalCompositeOperation = "screen";
    let g = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
    g.addColorStop(0, "rgba(230, 200, 255, 0.9)");
    g.addColorStop(0.5, "rgba(150, 55, 245, 0.55)");
    g.addColorStop(1, "rgba(60, 0, 120, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.font = "bold 46px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(15, 0, 30, 0.95)"; ctx.lineWidth = 8;
    ctx.strokeText(sec, 0, 0);
    ctx.fillStyle = "#e0c2ff";
    ctx.fillText(sec, 0, 0);

    ctx.textBaseline = "alphabetic";
    ctx.restore();
}

export class RenderEntity {
    constructor() {
        this._pCountEl = null;
        this._lastAliveCount = -1;
    }

    render(ctx, state) {
        const { camX, camY, viewW, viewH, monster, hinbeom, minions, okras, players, myId, myPlayer, mathNow } = state;

        const inDarkZone = !!state.inDarkZone;

        // 🌀 포탈들
        if (!inDarkZone) {
            drawPortal(ctx, camX, camY, viewW, viewH, mathNow, state.hinbeomPortal, 'base', '기지 귀환 포탈 (3초 대기)', false);
            drawPortal(ctx, camX, camY, viewW, viewH, mathNow, state.darkPortal, 'dark', '암흑 왕좌 (3초 대기)', true);
        }
        drawPortal(ctx, camX, camY, viewW, viewH, mathNow, state.blackbeardPortal, 'base', '기지 귀환 포탈 (3초 대기)', false);

        // ====================================================================
        // 기존 맵 몬스터들 — 암흑 왕좌 안에서는 그리지 않는다
        // ====================================================================
        if (!inDarkZone) {
            if (monster && monster.hp > 0 && RenderUtils.isVisible(camX, camY, viewW, viewH, monster.x, monster.y, monster.radius, monster.radius)) {
                ctx.beginPath(); ctx.arc(monster.x, monster.y, monster.radius, 0, Math.PI * 2); ctx.fillStyle = "#8e44ad"; ctx.fill();
                ctx.fillStyle = "#fff"; ctx.font = "bold 35px sans-serif"; ctx.textAlign = "center"; ctx.fillText("할배새끼", monster.x, monster.y - 100);
                ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(monster.x - 80, monster.y - 85, 160, 16); 
                ctx.fillStyle = "#e74c3c"; ctx.fillRect(monster.x - 78, monster.y - 83, 156 * (monster.hp / monster.maxHp), 12); 
                drawHpTicks(ctx, monster.x - 78, monster.y - 83, 156, 12, monster.maxHp);
                ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.strokeRect(monster.x - 80, monster.y - 85, 160, 16);
                drawKashimoCharge(ctx, monster, monster.x - 80, 160, monster.y - 85, 16, mathNow, 1.15);
                
                let mShock = Math.max(monster.airFreezeUntil || 0, monster.raigoPullUntil || 0, monster.electrocutedUntil || 0);
                if (mShock && mathNow < mShock) {
                    RenderUtils.drawShockEffect(ctx, monster.x, monster.y, monster.radius * 1.5, mathNow);
                } else if (monster.frozenUntil && mathNow < monster.frozenUntil) {
                    RenderUtils.drawFrozenEffect(ctx, monster.x, monster.y, monster.radius * 2.4, mathNow);
                }

                if (monster.burningUntil && mathNow < monster.burningUntil) RenderUtils.drawBurningEffect(ctx, monster.x, monster.y, monster.radius * 2.4, mathNow);
                if (monster.maguBombUntil && mathNow < monster.maguBombUntil) RenderUtils.drawMaguBomb(ctx, monster.x, monster.y, monster.radius * 1.5, mathNow, monster.maguBombUntil);
                if (monster.justiceBombUntil && mathNow < monster.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, monster.x, monster.y, monster.radius * 1.5, mathNow, monster.justiceBombUntil);
            }

            // 🐗 패왕색 패기로 소환된 할배새끼들
            if (minions) {
                for (let mi = 0; mi < minions.length; mi++) {
                    let mn = minions[mi];
                    if (!mn || mn.hp <= 0) continue;
                    if (!RenderUtils.isVisible(camX, camY, viewW, viewH, mn.x, mn.y, mn.radius, mn.radius)) continue;

                    const MR = mn.radius || 63;
                    ctx.beginPath(); ctx.arc(mn.x, mn.y, MR, 0, Math.PI * 2); ctx.fillStyle = "#8e44ad"; ctx.fill();
                    ctx.strokeStyle = "rgba(255, 60, 60, 0.9)"; ctx.lineWidth = 4; ctx.stroke();

                    ctx.fillStyle = "#fff"; ctx.font = "bold 35px sans-serif"; ctx.textAlign = "center";
                    ctx.fillText("할배새끼", mn.x, mn.y - 100);
                    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(mn.x - 80, mn.y - 85, 160, 16);
                    ctx.fillStyle = "#e74c3c"; ctx.fillRect(mn.x - 78, mn.y - 83, 156 * (Math.max(0, mn.hp) / mn.maxHp), 12);
                    drawHpTicks(ctx, mn.x - 78, mn.y - 83, 156, 12, mn.maxHp);
                    ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.strokeRect(mn.x - 80, mn.y - 85, 160, 16);
                    drawKashimoCharge(ctx, mn, mn.x - 80, 160, mn.y - 85, 16, mathNow, 1.15);

                    let nShock = Math.max(mn.airFreezeUntil || 0, mn.raigoPullUntil || 0, mn.electrocutedUntil || 0);
                    if (nShock && mathNow < nShock) {
                        RenderUtils.drawShockEffect(ctx, mn.x, mn.y, MR * 1.5, mathNow);
                    } else if (mn.frozenUntil && mathNow < mn.frozenUntil) {
                        RenderUtils.drawFrozenEffect(ctx, mn.x, mn.y, MR * 2.4, mathNow);
                    }
                    if (mn.burningUntil && mathNow < mn.burningUntil) RenderUtils.drawBurningEffect(ctx, mn.x, mn.y, MR * 2.4, mathNow);
                    if (mn.maguBombUntil && mathNow < mn.maguBombUntil) RenderUtils.drawMaguBomb(ctx, mn.x, mn.y, MR * 1.5, mathNow, mn.maguBombUntil);
                    if (mn.justiceBombUntil && mathNow < mn.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, mn.x, mn.y, MR * 1.5, mathNow, mn.justiceBombUntil);
                }
            }

            // 🥊 박힌범
            if (hinbeom && hinbeom.hp > 0 && hinbeom.state !== 'dead'
                && RenderUtils.isVisible(camX, camY, viewW, viewH, hinbeom.x, hinbeom.y, hinbeom.radius, hinbeom.radius)) {

                const HR = hinbeom.radius || 94.5;
                const hakiOn = hinbeom.hakiActiveUntil && mathNow < hinbeom.hakiActiveUntil;
                const hasShield = minions && minions.length > 0;

                if (hakiOn) {
                    ctx.save(); ctx.globalCompositeOperation = "screen";
                    let hPulse = 1 + Math.sin(mathNow / 80) * 0.22;
                    let hAura = ctx.createRadialGradient(hinbeom.x, hinbeom.y, HR * 0.5, hinbeom.x, hinbeom.y, HR * 2.6 * hPulse);
                    hAura.addColorStop(0, "rgba(255, 80, 80, 0.78)");
                    hAura.addColorStop(0.45, "rgba(200, 10, 10, 0.45)");
                    hAura.addColorStop(1, "rgba(70, 0, 0, 0)");
                    ctx.fillStyle = hAura;
                    ctx.beginPath(); ctx.arc(hinbeom.x, hinbeom.y, HR * 2.6 * hPulse, 0, Math.PI * 2); ctx.fill();
                    ctx.globalCompositeOperation = "source-over"; ctx.restore();
                }

                ctx.beginPath(); ctx.arc(hinbeom.x, hinbeom.y, HR, 0, Math.PI * 2);
                ctx.fillStyle = "#5c0f22"; ctx.fill();
                ctx.strokeStyle = hakiOn ? "#ff3b3b" : "#c0392b";
                ctx.lineWidth = hakiOn ? 8 : 5; ctx.stroke();

                if (hasShield) {
                    ctx.save();
                    ctx.globalCompositeOperation = "screen";
                    let sPulse = 1 + Math.sin(mathNow / 120) * 0.15;
                    let sGrad = ctx.createRadialGradient(hinbeom.x, hinbeom.y, HR * 0.8, hinbeom.x, hinbeom.y, HR * 1.5 * sPulse);
                    sGrad.addColorStop(0, "rgba(255, 255, 255, 0.4)");
                    sGrad.addColorStop(0.4, "rgba(255, 215, 0, 0.6)");
                    sGrad.addColorStop(1, "rgba(255, 180, 0, 0)");
                    ctx.fillStyle = sGrad;
                    ctx.beginPath(); ctx.arc(hinbeom.x, hinbeom.y, HR * 1.5 * sPulse, 0, Math.PI * 2); ctx.fill();

                    ctx.strokeStyle = `rgba(255, 220, 50, ${0.8 + Math.sin(mathNow / 60) * 0.2})`;
                    ctx.lineWidth = 6;
                    ctx.setLineDash([15, 10]);
                    ctx.lineDashOffset = -mathNow / 20;
                    ctx.beginPath(); ctx.arc(hinbeom.x, hinbeom.y, HR * 1.25 * sPulse, 0, Math.PI * 2); ctx.stroke();
                    
                    ctx.globalCompositeOperation = "source-over";
                    ctx.restore();
                }

                ctx.font = "bold 44px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
                ctx.strokeStyle = "rgba(40, 0, 0, 0.95)"; ctx.lineWidth = 6;
                ctx.strokeText("박힌범", hinbeom.x, hinbeom.y - HR - 78);
                ctx.fillStyle = hakiOn ? "#ff7070" : "#fff";
                ctx.fillText("박힌범", hinbeom.x, hinbeom.y - HR - 78);

                ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(hinbeom.x - 130, hinbeom.y - HR - 62, 260, 22);
                ctx.fillStyle = "#e74c3c"; ctx.fillRect(hinbeom.x - 127, hinbeom.y - HR - 59, 254 * (Math.max(0, hinbeom.hp) / hinbeom.maxHp), 16);
                drawHpTicks(ctx, hinbeom.x - 127, hinbeom.y - HR - 59, 254, 16, hinbeom.maxHp);
                ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(hinbeom.x - 130, hinbeom.y - HR - 62, 260, 22);
                drawKashimoCharge(ctx, hinbeom, hinbeom.x - 130, 260, hinbeom.y - HR - 62, 22, mathNow, 1.5);

                let hShock = Math.max(hinbeom.airFreezeUntil || 0, hinbeom.raigoPullUntil || 0, hinbeom.electrocutedUntil || 0);
                if (hShock && mathNow < hShock) {
                    RenderUtils.drawShockEffect(ctx, hinbeom.x, hinbeom.y, HR * 1.5, mathNow);
                } else if (hinbeom.frozenUntil && mathNow < hinbeom.frozenUntil) {
                    RenderUtils.drawFrozenEffect(ctx, hinbeom.x, hinbeom.y, HR * 2.4, mathNow);
                }
                if (hinbeom.burningUntil && mathNow < hinbeom.burningUntil) RenderUtils.drawBurningEffect(ctx, hinbeom.x, hinbeom.y, HR * 2.4, mathNow);
                if (hinbeom.maguBombUntil && mathNow < hinbeom.maguBombUntil) RenderUtils.drawMaguBomb(ctx, hinbeom.x, hinbeom.y, HR * 1.5, mathNow, hinbeom.maguBombUntil);
                if (hinbeom.justiceBombUntil && mathNow < hinbeom.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, hinbeom.x, hinbeom.y, HR * 1.5, mathNow, hinbeom.justiceBombUntil);
            }
        }

        // ====================================================================
        // ⚫ 검은수염
        // ====================================================================
        const bb = state.blackbeard;
        const bbRising = (bb && bb.risingUntil && mathNow < bb.risingUntil);
        if (bb && bb.hp > 0 && bb.state !== 'dead' && !bbRising
            && RenderUtils.isVisible(camX, camY, viewW, viewH, bb.x, bb.y, bb.radius, bb.radius)) {

            const BR = bb.radius || 94.5;
            const casting = (bb.castingUntil && mathNow < bb.castingUntil);
            const stunned = (bb.telegraphUntil && mathNow < bb.telegraphUntil);
            const inSky = (bb.descentUntil && mathNow < bb.descentUntil);

            ctx.save();

            let aPulse = 1 + Math.sin(mathNow / 150) * 0.16;
            let aR = BR * 2.5 * aPulse;
            let aura = ctx.createRadialGradient(bb.x, bb.y, BR * 0.5, bb.x, bb.y, aR);
            aura.addColorStop(0, "rgba(0, 0, 0, 0.92)");
            aura.addColorStop(0.4, "rgba(18, 0, 34, 0.72)");
            aura.addColorStop(0.72, "rgba(58, 6, 96, 0.38)");
            aura.addColorStop(1, "rgba(20, 0, 40, 0)");
            ctx.fillStyle = aura;
            ctx.beginPath(); ctx.arc(bb.x, bb.y, aR, 0, Math.PI * 2); ctx.fill();

            ctx.lineCap = "round";
            for (let s = 0; s < 12; s++) {
                let sa = (Math.PI * 2 / 12) * s + mathNow / 1400;
                let sl = BR * (1.15 + Math.abs(Math.sin(s * 1.7 + mathNow / 400)) * 0.8);
                ctx.strokeStyle = `rgba(3, 0, 8, ${0.55 + Math.sin(s + mathNow / 300) * 0.25})`;
                ctx.lineWidth = 13;
                ctx.beginPath();
                ctx.moveTo(bb.x + Math.cos(sa) * BR * 0.7, bb.y + Math.sin(sa) * BR * 0.7);
                ctx.quadraticCurveTo(
                    bb.x + Math.cos(sa + 0.5) * sl * 0.8, bb.y + Math.sin(sa + 0.5) * sl * 0.8,
                    bb.x + Math.cos(sa + 0.2) * sl, bb.y + Math.sin(sa + 0.2) * sl
                );
                ctx.stroke();
            }

            ctx.beginPath(); ctx.arc(bb.x, bb.y, BR, 0, Math.PI * 2);
            let body = ctx.createRadialGradient(bb.x - BR * 0.3, bb.y - BR * 0.3, BR * 0.15, bb.x, bb.y, BR);
            body.addColorStop(0, "#3b0f5c");
            body.addColorStop(0.55, "#170426");
            body.addColorStop(1, "#040008");
            ctx.fillStyle = body; ctx.fill();
            ctx.strokeStyle = stunned ? "#ff3b3b" : (casting ? "#c07bff" : "#4b1178");
            ctx.lineWidth = stunned ? 9 : (casting ? 8 : 5);
            ctx.stroke();

            if (inSky) {
                ctx.globalCompositeOperation = "source-over";
                for (let d = 0; d < 7; d++) {
                    let dt = ((mathNow / 520) + d * 0.143) % 1;
                    let dx = bb.x + Math.sin(d * 2.1 + mathNow / 380) * BR * 0.8;
                    let dy = bb.y + BR * 0.5 + dt * 190;
                    ctx.globalAlpha = (1 - dt) * 0.8;
                    ctx.fillStyle = "rgba(8, 0, 18, 0.9)";
                    ctx.beginPath(); ctx.ellipse(dx, dy, 15 * (1 - dt) + 5, 26 * (1 - dt) + 8, 0, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            if (casting) {
                ctx.globalCompositeOperation = "screen";
                let cPulse = 1 + Math.sin(mathNow / 90) * 0.2;
                ctx.strokeStyle = `rgba(200, 120, 255, ${0.7 + Math.sin(mathNow / 70) * 0.3})`;
                ctx.lineWidth = 7;
                ctx.setLineDash([22, 16]);
                ctx.lineDashOffset = -mathNow / 16;
                ctx.beginPath(); ctx.arc(bb.x, bb.y, BR * 1.35 * cPulse, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalCompositeOperation = "source-over";
            }

            ctx.restore();

            ctx.font = "bold 46px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(8, 0, 16, 0.98)"; ctx.lineWidth = 7;
            ctx.strokeText("검은수염", bb.x, bb.y - BR - 78);
            let ng = ctx.createLinearGradient(bb.x - 120, 0, bb.x + 120, 0);
            ng.addColorStop(0, "#8e44ff"); ng.addColorStop(0.5, "#ffffff"); ng.addColorStop(1, "#8e44ff");
            ctx.fillStyle = ng;
            ctx.fillText("검은수염", bb.x, bb.y - BR - 78);

            ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(bb.x - 130, bb.y - BR - 62, 260, 22);
            let hg = ctx.createLinearGradient(bb.x - 127, 0, bb.x + 127, 0);
            hg.addColorStop(0, "#4b1178"); hg.addColorStop(1, "#b83bff");
            ctx.fillStyle = hg;
            ctx.fillRect(bb.x - 127, bb.y - BR - 59, 254 * (Math.max(0, bb.hp) / bb.maxHp), 16);
            drawHpTicks(ctx, bb.x - 127, bb.y - BR - 59, 254, 16, bb.maxHp);
            ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(bb.x - 130, bb.y - BR - 62, 260, 22);
            drawKashimoCharge(ctx, bb, bb.x - 130, 260, bb.y - BR - 62, 22, mathNow, 1.5);

            let bShock = Math.max(bb.airFreezeUntil || 0, bb.raigoPullUntil || 0, bb.electrocutedUntil || 0);
            if (bShock && mathNow < bShock) {
                RenderUtils.drawShockEffect(ctx, bb.x, bb.y, BR * 1.5, mathNow);
            } else if (bb.frozenUntil && mathNow < bb.frozenUntil) {
                RenderUtils.drawFrozenEffect(ctx, bb.x, bb.y, BR * 2.4, mathNow);
            }
            if (bb.burningUntil && mathNow < bb.burningUntil) RenderUtils.drawBurningEffect(ctx, bb.x, bb.y, BR * 2.4, mathNow);
            if (bb.maguBombUntil && mathNow < bb.maguBombUntil) RenderUtils.drawMaguBomb(ctx, bb.x, bb.y, BR * 1.5, mathNow, bb.maguBombUntil);
            if (bb.justiceBombUntil && mathNow < bb.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, bb.x, bb.y, BR * 1.5, mathNow, bb.justiceBombUntil);
        }

        // ====================================================================
        // 🟪 지저스 바제스
        // ====================================================================
        const bg = state.burgess;
        if (bg && bg.hp > 0 && bg.state !== 'dead' && bg.state !== 'none'
            && RenderUtils.isVisible(camX, camY, viewW, viewH, bg.x, bg.y, bg.radius * 2, bg.radius * 2)) {

            const GR = bg.radius || 75.6;
            const isFalling = (bg.state === 'falling');
            const isTele = (bg.jumpTelegraphUntil && mathNow < bg.jumpTelegraphUntil);
            const isJumping = (bg.jumpingUntil && mathNow < bg.jumpingUntil);

            ctx.save();

            if (isFalling || isJumping) {
                ctx.globalCompositeOperation = "screen";
                let tg = ctx.createLinearGradient(bg.x, bg.y - GR * 3.2, bg.x, bg.y);
                tg.addColorStop(0, "rgba(180, 90, 255, 0)");
                tg.addColorStop(0.6, "rgba(160, 60, 250, 0.35)");
                tg.addColorStop(1, "rgba(220, 160, 255, 0.6)");
                ctx.fillStyle = tg;
                ctx.beginPath();
                ctx.moveTo(bg.x - GR * 0.55, bg.y);
                ctx.lineTo(bg.x + GR * 0.55, bg.y);
                ctx.lineTo(bg.x + GR * 0.15, bg.y - GR * 3.2);
                ctx.lineTo(bg.x - GR * 0.15, bg.y - GR * 3.2);
                ctx.closePath();
                ctx.fill();
                ctx.globalCompositeOperation = "source-over";
            }

            ctx.globalCompositeOperation = "screen";
            let gPulse = 1 + Math.sin(mathNow / 170) * 0.14;
            let gAura = ctx.createRadialGradient(bg.x, bg.y, GR * 0.4, bg.x, bg.y, GR * 2.1 * gPulse);
            gAura.addColorStop(0, "rgba(190, 110, 255, 0.62)");
            gAura.addColorStop(0.45, "rgba(126, 40, 220, 0.34)");
            gAura.addColorStop(1, "rgba(60, 0, 120, 0)");
            ctx.fillStyle = gAura;
            ctx.beginPath(); ctx.arc(bg.x, bg.y, GR * 2.1 * gPulse, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = "source-over";

            ctx.beginPath(); ctx.arc(bg.x, bg.y, GR, 0, Math.PI * 2);
            let gBody = ctx.createRadialGradient(bg.x - GR * 0.3, bg.y - GR * 0.3, GR * 0.15, bg.x, bg.y, GR);
            gBody.addColorStop(0, "#a855f7");
            gBody.addColorStop(0.55, "#6b21a8");
            gBody.addColorStop(1, "#2e0850");
            ctx.fillStyle = gBody; ctx.fill();
            ctx.strokeStyle = isTele ? "#ff3b3b" : "#c084fc";
            ctx.lineWidth = isTele ? 8 : 5;
            ctx.stroke();

            ctx.strokeStyle = "rgba(216, 180, 254, 0.55)";
            ctx.lineWidth = 4;
            for (let k = 0; k < 3; k++) {
                let ky = bg.y - GR * 0.4 + k * GR * 0.4;
                ctx.beginPath();
                ctx.moveTo(bg.x - GR * 0.55, ky);
                ctx.quadraticCurveTo(bg.x, ky + GR * 0.18, bg.x + GR * 0.55, ky);
                ctx.stroke();
            }

            ctx.restore();

            ctx.font = "bold 40px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(25, 0, 45, 0.98)"; ctx.lineWidth = 6;
            ctx.strokeText("지저스 바제스", bg.x, bg.y - GR - 72);
            let bng = ctx.createLinearGradient(bg.x - 140, 0, bg.x + 140, 0);
            bng.addColorStop(0, "#c084fc"); bng.addColorStop(0.5, "#ffffff"); bng.addColorStop(1, "#c084fc");
            ctx.fillStyle = bng;
            ctx.fillText("지저스 바제스", bg.x, bg.y - GR - 72);

            ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(bg.x - 110, bg.y - GR - 58, 220, 20);
            let bhg = ctx.createLinearGradient(bg.x - 107, 0, bg.x + 107, 0);
            bhg.addColorStop(0, "#6b21a8"); bhg.addColorStop(1, "#d8b4fe");
            ctx.fillStyle = bhg;
            ctx.fillRect(bg.x - 107, bg.y - GR - 55, 214 * (Math.max(0, bg.hp) / bg.maxHp), 14);
            drawHpTicks(ctx, bg.x - 107, bg.y - GR - 55, 214, 14, bg.maxHp);
            ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(bg.x - 110, bg.y - GR - 58, 220, 20);
            drawKashimoCharge(ctx, bg, bg.x - 110, 220, bg.y - GR - 58, 20, mathNow, 1.4);

            let gShock = Math.max(bg.airFreezeUntil || 0, bg.raigoPullUntil || 0, bg.electrocutedUntil || 0);
            if (gShock && mathNow < gShock) {
                RenderUtils.drawShockEffect(ctx, bg.x, bg.y, GR * 1.5, mathNow);
            } else if (bg.frozenUntil && mathNow < bg.frozenUntil) {
                RenderUtils.drawFrozenEffect(ctx, bg.x, bg.y, GR * 2.4, mathNow);
            }
            if (bg.burningUntil && mathNow < bg.burningUntil) RenderUtils.drawBurningEffect(ctx, bg.x, bg.y, GR * 2.4, mathNow);
            if (bg.maguBombUntil && mathNow < bg.maguBombUntil) RenderUtils.drawMaguBomb(ctx, bg.x, bg.y, GR * 1.5, mathNow, bg.maguBombUntil);
            if (bg.justiceBombUntil && mathNow < bg.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, bg.x, bg.y, GR * 1.5, mathNow, bg.justiceBombUntil);
        }

        // ====================================================================
        // 쫄몹(오크라)
        // ====================================================================
        if (!inDarkZone) {
            for (let ok of okras) {
                if (ok.hp <= 0 || !RenderUtils.isVisible(camX, camY, viewW, viewH, ok.x, ok.y, ok.radius, ok.radius)) continue;

                if (ok.isGolden) {
                    ctx.save(); ctx.globalCompositeOperation = "screen";
                    let gPulse = 1 + Math.sin(mathNow / 220) * 0.18;
                    let gAura = ctx.createRadialGradient(ok.x, ok.y, ok.radius * 0.4, ok.x, ok.y, ok.radius * 2.4 * gPulse);
                    gAura.addColorStop(0, "rgba(255, 240, 150, 0.75)");
                    gAura.addColorStop(0.5, "rgba(255, 200, 40, 0.35)");
                    gAura.addColorStop(1, "rgba(255, 180, 0, 0)");
                    ctx.fillStyle = gAura; ctx.beginPath(); ctx.arc(ok.x, ok.y, ok.radius * 2.4 * gPulse, 0, Math.PI * 2); ctx.fill();
                    ctx.globalCompositeOperation = "source-over"; ctx.restore();

                    ctx.beginPath(); ctx.arc(ok.x, ok.y, ok.radius, 0, Math.PI * 2); ctx.fillStyle = "#f1c40f"; ctx.fill();
                    ctx.strokeStyle = "#fff8d0"; ctx.lineWidth = 3; ctx.stroke();

                    ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
                    ctx.strokeStyle = "rgba(90, 60, 0, 0.9)"; ctx.lineWidth = 4; ctx.lineJoin = "round";
                    ctx.strokeText("황금오크라", ok.x, ok.y - 45);
                    ctx.fillStyle = "#ffe680"; ctx.fillText("황금오크라", ok.x, ok.y - 45);

                    ctx.fillStyle = "#f39c12"; ctx.fillRect(ok.x - 29, ok.y - 34, 58 * (ok.hp / ok.maxHp), 8);
                    drawHpTicks(ctx, ok.x - 29, ok.y - 34, 58, 8, ok.maxHp);
                    ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(ok.x - 29, ok.y - 34, 58, 8);
                } else {
                    ctx.beginPath(); ctx.arc(ok.x, ok.y, ok.radius, 0, Math.PI * 2); ctx.fillStyle = "#27ae60"; ctx.fill();
                    ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.fillText("오크라", ok.x, ok.y - 45);
                    ctx.fillStyle = "#e74c3c"; ctx.fillRect(ok.x - 29, ok.y - 34, 58 * (ok.hp / ok.maxHp), 8); 
                    drawHpTicks(ctx, ok.x - 29, ok.y - 34, 58, 8, ok.maxHp);
                    ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(ok.x - 29, ok.y - 34, 58, 8);
                }
                drawKashimoCharge(ctx, ok, ok.x - 29, 58, ok.y - 34, 8, mathNow, 0.8);
                
                let oShock = Math.max(ok.airFreezeUntil || 0, ok.raigoPullUntil || 0, ok.electrocutedUntil || 0);
                if (oShock && mathNow < oShock) {
                    RenderUtils.drawShockEffect(ctx, ok.x, ok.y, ok.radius * 1.8, mathNow);
                } else if (ok.frozenUntil && mathNow < ok.frozenUntil) {
                    RenderUtils.drawFrozenEffect(ctx, ok.x, ok.y, ok.radius * 2.8, mathNow);
                }

                if (ok.burningUntil && mathNow < ok.burningUntil) RenderUtils.drawBurningEffect(ctx, ok.x, ok.y, ok.radius * 2.8, mathNow);
                if (ok.maguBombUntil && mathNow < ok.maguBombUntil) RenderUtils.drawMaguBomb(ctx, ok.x, ok.y, ok.radius * 1.5, mathNow, ok.maguBombUntil);
                if (ok.justiceBombUntil && mathNow < ok.justiceBombUntil) RenderUtils.drawMaguBomb(ctx, ok.x, ok.y, ok.radius * 1.5, mathNow, ok.justiceBombUntil);
            }
        }

        // ====================================================================
        // 플레이어
        // ====================================================================
        let aliveCount = 0;
        for (let id in players) {
            let p = players[id]; 
            if (p.isDead || !RenderUtils.isVisible(camX, camY, viewW, viewH, p.x, p.y, 50, 100)) continue;
            aliveCount++;

            let portalUntil = (id === myId) ? (myPlayer.portalDwellUntil || 0) : (p.portalDwellUntil || 0);
            let darkUntil = (id === myId) ? (myPlayer.darkDwellUntil || 0) : (p.darkDwellUntil || 0);
            let chargeSrc = (id === myId) ? myPlayer : p;
            // ⚡🔮 환수호박 여부 (내 캐릭터는 로컬 상태를 우선한다)
            let amberOn = (id === myId) ? !!myPlayer.amberActive : !!p.amberActive;

            if (p.yataActive) {
                ctx.save(); ctx.translate(p.x, p.y); ctx.globalCompositeOperation = "screen";
                let pulse = 1 + Math.sin(mathNow / 40) * 0.2;
                let grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 70 * pulse);
                grad.addColorStop(0, "rgba(255,255,255,1)");
                grad.addColorStop(0.4, "rgba(255,240,120,0.9)");
                grad.addColorStop(1, "rgba(255,200,40,0)");
                ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, 70 * pulse, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = "rgba(255,255,180,0.5)";
                ctx.beginPath(); ctx.ellipse(-(p.lastFacing||1)*40, 0, 80, 22, 0, 0, Math.PI*2); ctx.fill();
                ctx.globalCompositeOperation = "source-over"; ctx.restore();
                
                let cmax = p.maxHp || 2500;
                ctx.fillStyle = "#2ecc71"; ctx.fillRect(p.x - 39, p.y - 79, 78 * (Math.max(0,p.hp)/cmax), 5);
                drawHpTicks(ctx, p.x - 39, p.y - 79, 78, 5, cmax);
                drawKashimoCharge(ctx, chargeSrc, p.x - 39, 78, p.y - 79, 5, mathNow, 1.0);
                ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText(p.nickname, p.x, p.y - 88);
                drawPortalCountdown(ctx, p.x, p.y, portalUntil, mathNow);
                drawDarkPortalCountdown(ctx, p.x, p.y, darkUntil, mathNow);
                continue;
            }

            let ldUntil = (id === myId) ? myPlayer.lightDashUntil : p.lightDashUntil;
            if (ldUntil && mathNow < ldUntil) {
                let ldDir = ((id === myId) ? myPlayer.lightDashDir : p.lightDashDir) || 1;
                ctx.save(); ctx.translate(p.x, p.y); ctx.globalCompositeOperation = "screen";
                let pulse = 1 + Math.sin(mathNow / 35) * 0.25;
                let grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 66 * pulse);
                grad.addColorStop(0, "rgba(255,255,255,1)");
                grad.addColorStop(0.4, "rgba(255,240,120,0.9)");
                grad.addColorStop(1, "rgba(255,200,40,0)");
                ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, 66 * pulse, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = "rgba(255,255,180,0.55)";
                ctx.beginPath(); ctx.ellipse(-ldDir * 46, 0, 96, 24, 0, 0, Math.PI*2); ctx.fill();
                ctx.globalCompositeOperation = "source-over"; ctx.restore();
                drawPortalCountdown(ctx, p.x, p.y, portalUntil, mathNow);
                drawDarkPortalCountdown(ctx, p.x, p.y, darkUntil, mathNow);
                continue;
            }

            if (p.isCasting) {
                let isBors = p.characterType === 'BORSALINO';
                let isKuz = p.characterType === 'KUZAN';
                let isEnel = p.characterType === 'ENEL';
                let isKashimo = p.characterType === 'KASHIMO';
                let castTxt = isBors ? "✨ 빛의 힘" : (isKuz ? "❄️ 냉기 방출 중" : (isEnel ? "⚡ 뇌전 응축 중" : (isKashimo ? "⚡ 전하 응축 중" : "🌀 기절 (공기 모으는 중)")));
                let castCol = isBors ? "rgba(241, 196, 15, 0.3)" : (isKuz ? "rgba(52, 152, 219, 0.3)" : (isEnel ? "rgba(0, 191, 255, 0.3)" : (isKashimo ? "rgba(168, 85, 247, 0.3)" : "rgba(255, 255, 255, 0.3)")));
                ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; 
                ctx.fillText(castTxt, p.x, p.y - 100);
                ctx.beginPath(); ctx.arc(p.x, p.y, 80, 0, Math.PI * 2); ctx.fillStyle = castCol; ctx.fill();
            }

            // ⚡🔮 환수호박 상태면 몸을 전기 덩어리로 그린다
            if (amberOn) {
                drawAmberBody(ctx, p.x, p.y, mathNow, p.team);
            } else {
                ctx.beginPath(); ctx.arc(p.x, p.y, 45, 0, Math.PI * 2);
                ctx.fillStyle = p.team === 1 ? "#3498db" : "#e74c3c"; ctx.fill();
                ctx.strokeStyle = p.characterType === 'BORSALINO' ? "#f1c40f" : (p.characterType === 'KUZAN' ? "#3498db" : (p.characterType === 'SAKAZUKI' ? "#e74c3c" : (p.characterType === 'ENEL' ? "#00bfff" : (p.characterType === 'KASHIMO' ? "#a855f7" : "#000")))); 
                ctx.lineWidth = 3; ctx.stroke();
            }

            let ctype = p.characterType || 'PARK';
            let currentMaxHp = p.maxHp || (window.Characters && window.Characters[ctype] ? window.Characters[ctype].hp : 3000);
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(p.x - 39, p.y - 69, 78 * (Math.max(0, p.hp) / currentMaxHp), 6); 
            drawHpTicks(ctx, p.x - 39, p.y - 69, 78, 6, currentMaxHp);
            ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(p.x - 39, p.y - 69, 78, 6);
            drawKashimoCharge(ctx, chargeSrc, p.x - 39, 78, p.y - 69, 6, mathNow, 1.0);
            ctx.fillStyle = "#f1c40f"; ctx.fillRect(p.x - 39, p.y - 62, 78 * (Math.max(0, p.xp || 0) / (p.maxXp || 100)), 4); 
            ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(p.x - 39, p.y - 62, 78, 4);
            ctx.fillStyle = "#000"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; 
            ctx.fillText(`Lv.${p.level || 0} ${p.nickname}`, p.x, p.y - 82);

            // ⚡🔮 환수호박 표식
            if (amberOn) {
                ctx.save();
                ctx.font = "bold 19px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
                ctx.strokeStyle = "rgba(30, 0, 60, 0.95)"; ctx.lineWidth = 4;
                ctx.strokeText("🔮 환수호박", p.x, p.y - 102);
                let ag = ctx.createLinearGradient(p.x - 60, 0, p.x + 60, 0);
                ag.addColorStop(0, "#c084fc"); ag.addColorStop(0.5, "#ffffff"); ag.addColorStop(1, "#c084fc");
                ctx.fillStyle = ag;
                ctx.fillText("🔮 환수호박", p.x, p.y - 102);
                ctx.restore();
            }

            drawPortalCountdown(ctx, p.x, p.y, portalUntil, mathNow);
            drawDarkPortalCountdown(ctx, p.x, p.y, darkUntil, mathNow);

            // 🚫 암흑 왕좌 입장 금지 표시 (본인에게만)
            if (id === myId && myPlayer.darkBanned && state.darkPortal) {
                ctx.save();
                ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
                ctx.strokeStyle = "rgba(40, 0, 0, 0.9)"; ctx.lineWidth = 4;
                ctx.strokeText("🚫 암흑 왕좌 입장 불가", p.x, p.y + 118);
                ctx.fillStyle = "#ff8a8a";
                ctx.fillText("🚫 암흑 왕좌 입장 불가", p.x, p.y + 118);
                ctx.restore();
            }

            // ⚫ 크로우즈에 끌려가는 중 표시
            let crowsUntil = (id === myId) ? (myPlayer.crowsPullUntil || 0) : (p.crowsPullUntil || 0);
            if (crowsUntil && mathNow < crowsUntil) {
                ctx.save();
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = `rgba(10, 0, 20, ${0.75 + Math.sin(mathNow / 80) * 0.25})`;
                ctx.lineWidth = 9;
                ctx.beginPath(); ctx.arc(p.x, p.y, 58, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = "rgba(176, 82, 255, 0.9)";
                ctx.lineWidth = 3.5;
                ctx.beginPath(); ctx.arc(p.x, p.y, 58, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = "rgba(220, 180, 255, 0.95)"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
                ctx.strokeStyle = "rgba(15,0,30,0.85)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
                ctx.strokeText("⛓️ 스킬 봉인", p.x, p.y + 90); ctx.fillText("⛓️ 스킬 봉인", p.x, p.y + 90);
                ctx.restore();
            }

            // ⚡ 플레이어 상태 이상
            let myElectro = (id === myId) ? myPlayer.electrocutedUntil : p.electrocutedUntil;
            let myShock = Math.max(
                (id === myId) ? (myPlayer.airFreezeUntil || 0) : (p.airFreezeUntil || 0),
                (id === myId) ? (myPlayer.raigoPullUntil || 0) : (p.raigoPullUntil || 0),
                myElectro || 0
            );

            if (myShock && mathNow < myShock) {
                RenderUtils.drawShockEffect(ctx, p.x, p.y, 66, mathNow);
                if (!p.isCasting) {
                    ctx.fillStyle = "rgba(190, 245, 255, 0.95)"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
                    ctx.strokeStyle = "rgba(0,60,120,0.8)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
                    ctx.strokeText("⚡ 감전", p.x, p.y + 90); ctx.fillText("⚡ 감전", p.x, p.y + 90);
                }
            } else {
                let myFrozen = (id === myId) ? myPlayer.frozenUntil : p.frozenUntil;
                if (myFrozen && mathNow < myFrozen && !p.isCasting) {
                    RenderUtils.drawFrozenEffect(ctx, p.x, p.y, 130, mathNow);
                    ctx.fillStyle = "rgba(180, 235, 255, 0.95)"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
                    ctx.strokeStyle = "rgba(0,60,120,0.8)"; ctx.lineWidth = 3; ctx.lineJoin = "round";
                    ctx.strokeText("❄️ 동결", p.x, p.y + 90); ctx.fillText("❄️ 동결", p.x, p.y + 90);
                }
            }

            let myBurn = (id === myId) ? myPlayer.burningUntil : p.burningUntil;
            if (myBurn && mathNow < myBurn) RenderUtils.drawBurningEffect(ctx, p.x, p.y, 130, mathNow);
            
            let myMaguBomb = (id === myId) ? myPlayer.maguBombUntil : p.maguBombUntil;
            if (myMaguBomb && mathNow < myMaguBomb) RenderUtils.drawMaguBomb(ctx, p.x, p.y, 65, mathNow, myMaguBomb);
            let myJusticeBomb = (id === myId) ? myPlayer.justiceBombUntil : p.justiceBombUntil;
            if (myJusticeBomb && mathNow < myJusticeBomb) RenderUtils.drawMaguBomb(ctx, p.x, p.y, 75, mathNow, myJusticeBomb);

            let spheresCount = p.orbitSpheres || 0; let speedMult = p.orbitSpeedMult || 1.0;
            if (id === myId) { spheresCount = myPlayer.orbitSpheres || 0; speedMult = myPlayer.orbitSpeedMult || 1.0; }
            if (spheresCount > 0) {
                for (let i = 0; i < spheresCount; i++) {
                    let angle = (mathNow / (300 / speedMult)) + (i * Math.PI * 2 / spheresCount);
                    let sx = p.x + Math.cos(angle) * 110; let sy = p.y + Math.sin(angle) * 110;
                    ctx.beginPath(); ctx.arc(sx, sy, 15, 0, Math.PI * 2); ctx.fillStyle = "#e67e22"; ctx.fill();
                }
            }
        }

        if (aliveCount !== this._lastAliveCount) {
            if (!this._pCountEl) this._pCountEl = document.getElementById('playerCount');
            if (this._pCountEl) {
                this._pCountEl.innerText = `전장 인원: ${aliveCount}명`;
                this._lastAliveCount = aliveCount;
            }
        }
    }
}