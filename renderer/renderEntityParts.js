// 파일명: renderEntityParts.js
// ============================================================================
// 🧩 엔티티 렌더링 공용 파츠
//
//   renderEntity.js 가 비대해져 분리했다. 아래 4개는 보스 · 플레이어 렌더링에서
//   공통으로 쓰이는 '부품' 들이다. 로직은 분리 전과 완전히 동일하다.
//
//     · drawHpTicks         : 체력바 위 눈금
//     · drawKashimoCharge   : ⚡ 카시모 전하 스택 표시
//     · drawAmberBody       : ⚡🔮 환수호박 상태의 몸통
//     · drawDaburaLightBody : ⬛☀️ 다부라 [빛] 상태의 몸통
// ============================================================================

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
// ============================================================================
const CHARGE_MAX = 4;
const CHARGE_DECAY_MS = 5000;

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
// ⚡🔮 환수호박 — 플레이어 몸을 '전기 덩어리'로 그린다.
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
// ⬛💫 [신규] 아광속 발차기 — 플레이어 몸을 '빛 덩어리'로 그린다.
//    진행 방향으로 길게 늘어난 유선형 빛으로 표현한다.
// ============================================================================
function drawDaburaLightBody(ctx, px, py, mathNow, team, facing, square) {
    const R = square ? 52 : 45;
    const dir = (facing === -1) ? -1 : 1;

    ctx.save();
    ctx.translate(px, py);

    // ── ① 강렬한 백광 후광 ──────────────────────────────────────────
    ctx.globalCompositeOperation = "screen";
    let pulse = 1 + Math.sin(mathNow / 62) * 0.18;
    let auraR = R * 2.2 * pulse;
    let aura = ctx.createRadialGradient(0, 0, R * 0.15, 0, 0, auraR);
    aura.addColorStop(0, "rgba(255, 255, 255, 1)");
    aura.addColorStop(0.28, "rgba(255, 250, 220, 0.9)");
    aura.addColorStop(0.62, "rgba(255, 226, 130, 0.5)");
    aura.addColorStop(1, "rgba(255, 190, 40, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();

    // ── ② 유선형 빛 본체 (진행 방향으로 늘어난다) ───────────────────
    ctx.save();
    ctx.scale(dir, 1);
    ctx.globalCompositeOperation = "source-over";
    let body = ctx.createLinearGradient(-R * 2.0, 0, R * 1.05, 0);
    body.addColorStop(0, "rgba(255, 200, 60, 0)");
    body.addColorStop(0.35, "rgba(255, 226, 130, 0.7)");
    body.addColorStop(0.78, "rgba(255, 250, 220, 0.96)");
    body.addColorStop(1, "#ffffff");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(R * 1.0, 0);
    ctx.quadraticCurveTo(R * 0.2, -R * 0.9, -R * 2.0, -R * 0.26);
    ctx.quadraticCurveTo(-R * 2.4, 0, -R * 2.0, R * 0.26);
    ctx.quadraticCurveTo(R * 0.2, R * 0.9, R * 1.0, 0);
    ctx.closePath();
    ctx.fill();

    // 팀 색 윤곽 (아군/적군 구분 유지)
    ctx.strokeStyle = (team === 1) ? "rgba(80, 170, 255, 0.9)" : "rgba(255, 100, 100, 0.9)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 + Math.abs(Math.sin(mathNow / 80)) * 0.25})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    // ── ③ 사방으로 뻗는 빛살 ────────────────────────────────────────
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";
    for (let s = 0; s < (square ? 12 : 9); s++) {
        let ang = (Math.PI * 2 / (square ? 12 : 9)) * s + mathNow / 700;
        let len = R * (1.15 + Math.abs(Math.sin(s * 1.9 + mathNow / 190)) * 0.75);
        ctx.strokeStyle = `rgba(255, 226, 130, ${0.7})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.stroke();
    }

    // ── ④ 중심 백광 코어 ────────────────────────────────────────────
    let corePulse = 1 + Math.sin(mathNow / 44) * 0.24;
    let cc = ctx.createRadialGradient(0, 0, 1, 0, 0, R * 0.5 * corePulse);
    cc.addColorStop(0, "rgba(255, 255, 255, 1)");
    cc.addColorStop(0.55, "rgba(255, 250, 220, 0.78)");
    cc.addColorStop(1, "rgba(255, 226, 130, 0)");
    ctx.fillStyle = cc;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.5 * corePulse, 0, Math.PI * 2); ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
}

export { drawHpTicks, drawKashimoCharge, drawAmberBody, drawDaburaLightBody };

/**
 * 🧊 [쿠잔(해적) · 아이스 타임] 돌진 중 전신이 얼음으로 변한 모습.
 *    · 각진 얼음 결정면으로 뒤덮인 몸
 *    · 몸을 감도는 냉기와 사방으로 삐죽 솟은 얼음 가시
 *    · 뒤로 흩날리는 서리 조각
 */
export function drawIceBody(ctx, cx, cy, mathNow, team, dirX, dirY) {
    const R = 46;
    const tt = mathNow / 1000;
    const dx = (dirX === undefined) ? 1 : dirX;
    const dy = (dirY === undefined) ? 0 : dirY;

    ctx.save();

    // ── 뒤로 끌리는 냉기 잔상 ──────────────────────────────
    ctx.globalCompositeOperation = "screen";
    for (let k = 1; k <= 5; k++) {
        const px = cx - dx * k * 26, py = cy - dy * k * 26;
        const rr = R * (1.15 - k * 0.14);
        if (rr <= 0) break;
        const g = ctx.createRadialGradient(px, py, 2, px, py, rr);
        g.addColorStop(0, "rgba(198,240,255,0.55)");
        g.addColorStop(0.6, "rgba(77,216,255,0.28)");
        g.addColorStop(1, "rgba(8,60,120,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
    }

    // ── 몸을 감싼 냉기 ─────────────────────────────────────
    const ag = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.9);
    ag.addColorStop(0, "rgba(255,255,255,0.5)");
    ag.addColorStop(0.5, "rgba(150,225,255,0.3)");
    ag.addColorStop(1, "rgba(30,120,200,0)");
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.9, 0, Math.PI * 2); ctx.fill();

    // ── 얼음 몸통 ──────────────────────────────────────────
    ctx.globalCompositeOperation = "source-over";
    const bg = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(0.38, "#bfe9ff");
    bg.addColorStop(0.72, "#5fb8e8");
    bg.addColorStop(1, "#2273b0");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#eaf8ff"; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = "rgba(20,80,130,0.7)"; ctx.lineWidth = 2; ctx.stroke();

    // 결정면 (각진 조각으로 갈라진 표면)
    ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 2.2;
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.35;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94);
        ctx.stroke();
    }
    // 표면 하이라이트
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(cx - R * 0.3, cy - R * 0.36, R * 0.26, R * 0.15, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // ── 사방으로 솟은 얼음 가시 ────────────────────────────
    ctx.globalCompositeOperation = "screen";
    for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + tt * 1.1;
        const len = R * (0.52 + ((k * 31) % 10) / 26);
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(R * 0.7, -7);
        ctx.lineTo(R * 0.7 + len, 0);
        ctx.lineTo(R * 0.7, 7);
        ctx.closePath();
        const sg = ctx.createLinearGradient(R * 0.7, 0, R * 0.7 + len, 0);
        sg.addColorStop(0, "rgba(255,255,255,0.95)");
        sg.addColorStop(0.5, "rgba(190,238,255,0.9)");
        sg.addColorStop(1, "rgba(60,170,230,0)");
        ctx.fillStyle = sg; ctx.fill();
        ctx.restore();
    }

    // ── 흩날리는 서리 조각 ─────────────────────────────────
    ctx.globalCompositeOperation = "source-over";
    for (let k = 0; k < 8; k++) {
        const f = ((mathNow / 230) + k / 8) % 1;
        const px = cx - dx * f * 190 + Math.sin(k * 2.1 + tt * 5) * 26;
        const py = cy - dy * f * 190 + Math.cos(k * 1.7 + tt * 4) * 24;
        ctx.globalAlpha = (1 - f) * 0.85;
        ctx.strokeStyle = "rgba(214,245,255,0.95)";
        ctx.lineWidth = 2;
        const rr = 8 * (1 - f * 0.5);
        for (let j = 0; j < 3; j++) {
            const a2 = (j / 3) * Math.PI + tt + k;
            ctx.beginPath();
            ctx.moveTo(px - Math.cos(a2) * rr, py - Math.sin(a2) * rr);
            ctx.lineTo(px + Math.cos(a2) * rr, py + Math.sin(a2) * rr);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}
