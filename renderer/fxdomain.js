// 파일명: fxdomain.js
// ============================================================================
// 🌑 [유명이경 역월] 영역 전개 연출
//
//   ── 연출 흐름 (서버 config.js 의 타이밍과 반드시 일치해야 한다) ──
//     ① cast    1초 : 시전자 발밑으로 검은 기운이 모여든다        (yumyeong_cast)
//     ② expand  4초 :
//          · 앞 1초 (암전 구간) — 눈처럼 생긴 '구체' 만 떠오른다.
//                                 판자는 아직 하나도 생기지 않는다.
//          · 뒤 3초 (밝아지는 구간) — 흑백 판자가 구체 바깥에서부터
//                                 부챗살 구조를 이루며 자라난다.
//     ③ active 15초 : 판자들이 서로 맞부딪히며 일렁인다
//     ④ collapse    : 바깥 판자부터 무너지며 원래 장소로 돌아온다
//
//   🧿 구체와 판자는 절대 겹치지 않는다.
//      판자는 구체 반지름의 SLAB_GAP 배 바깥에서만 생겨난다.
//
//   영역 안에 있는 사람에게는 화면 전체가 영역 배경으로 바뀌고,
//   밖에 있는 사람에게는 그냥 커다란 검은 원으로 보인다.
//
//   ⚠️ 이 파일은 '월드 좌표계' 안에서 그려진다 (renderEngine 이 변환을 걸어 둠).
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';

// 서버 config.js 와 동일해야 하는 값
const YUM_EXPAND_MS = 4000;
const YUM_DARK_MS   = 1000;

// 🧿 구체 : 영역 반지름 대비 크기와 위치
const SPHERE_R_RATIO = 0.30;    // 구체 반지름 = R * 0.30
const SPHERE_Y_RATIO = 0.34;    // 구체는 중심보다 이만큼 위에 뜬다
const SLAB_GAP       = 1.45;    // 판자는 구체 반지름의 1.45배 밖에서만 생긴다

// ────────────────────────────────────────────────────────────────────────────
// 🎲 결정론적 난수 — 같은 영역은 누가 보든 똑같이 보여야 한다
// ────────────────────────────────────────────────────────────────────────────
function seeded(seed) {
    let s = seed >>> 0;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function hashId(str) {
    let h = 2166136261 >>> 0;
    str = String(str || 'x');
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
}

// ────────────────────────────────────────────────────────────────────────────
// 🧱 판자 배치 — '구조' 를 이루도록 동심 고리 + 나선 비틀림으로 놓는다
//
//   · 구체를 중심으로 동심 고리를 만들고, 고리마다 판자를 균등 배치한다.
//   · 고리가 바깥으로 갈수록 각도를 조금씩 비틀어(나선) 부챗살처럼 보이게 한다.
//   · 판자는 중심에서 바깥을 향하도록(방사 방향) 눕힌다.
//   · birth 는 고리 순서로 정해지므로 안쪽 고리부터 차례로 자라난다.
//
//   예전에는 완전 무작위라 어수선했다. 이제는 규칙 위에 약간의 흔들림만 준다.
// ────────────────────────────────────────────────────────────────────────────
const slabCache = new Map();

function getSlabs(dm) {
    let key = dm.ownerId + ':' + Math.round(dm.x) + ':' + Math.round(dm.y) + ':v2';
    let hit = slabCache.get(key);
    if (hit) return hit;

    const rnd = seeded(hashId(key));
    const R = dm.radius;
    const sphereR = R * SPHERE_R_RATIO;

    const RINGS = 8;
    const innerR = sphereR * SLAB_GAP;      // 🧿 구체와 겹치지 않는 시작 반지름
    const outerR = R * 1.75;                // 화면을 채우도록 영역보다 넉넉하게

    let list = [];

    for (let ring = 0; ring < RINGS; ring++) {
        const rt = ring / (RINGS - 1);                       // 0(안) ~ 1(밖)
        const rad = innerR + (outerR - innerR) * rt;

        // 바깥 고리일수록 판자를 많이 놓는다 (둘레가 기니까)
        const count = Math.round(9 + rt * 15);

        // 🌀 나선 비틀림 — 고리마다 각도를 조금씩 밀어 부챗살 흐름을 만든다
        const spin = ring * 0.42 + rnd() * 0.18;

        for (let k = 0; k < count; k++) {
            const baseA = (k / count) * Math.PI * 2 + spin;
            // 규칙을 깨지 않을 만큼만 흔든다
            const a = baseA + (rnd() - 0.5) * (Math.PI * 2 / count) * 0.34;
            const rr = rad * (0.94 + rnd() * 0.12);

            // 📏 [확대] 판자를 크게 — 길이 R*0.34~0.62 · 두께 R*0.075~0.125
            const w = R * (0.34 + rnd() * 0.28);
            const h = R * (0.075 + rnd() * 0.050);

            list.push({
                x: Math.cos(a) * rr,
                y: Math.sin(a) * rr * 0.86,                  // 살짝 납작한 타원 배치
                w: w, h: h,
                // 방사 방향으로 눕히되 살짝만 어긋나게 (판자 더미 느낌)
                rot: a + (rnd() - 0.5) * 0.5,
                ring: ring,
                // 안쪽 고리부터 자라난다
                birth: Math.min(0.97, rt * 0.80 + rnd() * 0.16),
                phase: rnd() * Math.PI * 2,
                speed: 0.55 + rnd() * 0.85,
                sway: R * (0.007 + rnd() * 0.016),
                tone: 0.34 + rnd() * 0.56,
                bump: 0.4 + rnd() * 1.1
            });
        }
    }

    list.sort((a, b) => a.birth - b.birth);

    if (slabCache.size > 8) slabCache.clear();
    slabCache.set(key, list);
    return list;
}

// ────────────────────────────────────────────────────────────────────────────
// 🧿 눈처럼 생긴 구체 — 동심원 + 방사선 거미줄
// ────────────────────────────────────────────────────────────────────────────
function drawSphere(ctx, cx, cy, R, alpha, spin) {
    if (alpha <= 0.001 || R <= 1) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);

    // 바깥 후광
    let halo = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.5);
    halo.addColorStop(0, "rgba(255,255,255,0.55)");
    halo.addColorStop(1, "rgba(210,215,230,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, Math.PI * 2); ctx.fill();

    ctx.rotate(spin);

    // 흰 원반
    ctx.fillStyle = "rgba(250, 250, 252, 0.96)";
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = "rgba(10, 10, 14, 0.95)";
    ctx.lineCap = "butt";

    // 동심원 8겹 — 바깥으로 갈수록 간격이 벌어진다
    for (let k = 1; k <= 8; k++) {
        let rr = R * Math.pow(k / 8, 0.86);
        ctx.lineWidth = Math.max(1.4, R * 0.030 * (1 - k / 16));
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    }

    // 방사선 20개
    ctx.lineWidth = Math.max(1.4, R * 0.026);
    for (let k = 0; k < 20; k++) {
        let a = (k / 20) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.12, Math.sin(a) * R * 0.12);
        ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
        ctx.stroke();
    }

    // 한가운데 검은 눈동자
    ctx.fillStyle = "rgba(6, 6, 10, 1)";
    ctx.beginPath(); ctx.arc(0, 0, R * 0.15, 0, Math.PI * 2); ctx.fill();

    // 테두리
    ctx.strokeStyle = "rgba(8, 8, 12, 1)";
    ctx.lineWidth = Math.max(2, R * 0.045);
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();

    ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// 🧱 판자 더미
//    grow  : 0~1 — 이 값보다 birth 가 작은 판자만 나타난다 (증식)
//    settle: 0~1 — 1이면 완전히 자리잡아 맞부딪히며 일렁이는 상태
// ────────────────────────────────────────────────────────────────────────────
function drawSlabs(ctx, dm, t, grow, settle, alpha, sphereCx, sphereCy, sphereR) {
    if (grow <= 0.001 || alpha <= 0.001) return;

    const slabs = getSlabs(dm);
    const R = dm.radius;

    ctx.save();
    ctx.translate(sphereCx, sphereCy);
    ctx.globalAlpha = alpha;

    const guardR = sphereR * SLAB_GAP * 0.98;   // 🧿 이 안쪽으로는 절대 안 그린다

    for (let i = 0; i < slabs.length; i++) {
        const s = slabs[i];
        if (s.birth > grow) continue;

        // 갓 생겨난 판자는 작게 시작해 제 크기로 커진다
        let age = Math.min(1, (grow - s.birth) / 0.14);
        let pop = 0.30 + age * 0.70;

        // 🌊 일렁임 + 맞부딪힘
        let w1 = Math.sin(t * s.speed + s.phase);
        let w2 = Math.sin(t * s.speed * 1.73 + s.phase * 2.1);
        let ox = w1 * s.sway * settle;
        let oy = w2 * s.sway * 0.7 * settle;
        let hit = Math.pow(Math.abs(w1), 8) * s.bump * settle;
        let rot = s.rot + w2 * 0.04 * settle + hit * 0.025;

        let px = s.x + ox, py = s.y + oy;
        // 🧿 흔들리다가도 구체 영역은 침범하지 않는다
        if (Math.hypot(px, py) < guardR) continue;

        let g = Math.round(255 * s.tone);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.scale(pop, pop);

        // 본체
        ctx.fillStyle = `rgb(${g},${g},${Math.min(255, g + 6)})`;
        ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
        // 검은 테두리 — 만화 느낌
        ctx.strokeStyle = "rgba(10,10,14,0.92)";
        ctx.lineWidth = Math.max(1.5, R * 0.006);
        ctx.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);
        // 두께감을 주는 옆면
        ctx.fillStyle = `rgba(${Math.round(g * 0.55)},${Math.round(g * 0.55)},${Math.round(g * 0.6)},0.9)`;
        ctx.fillRect(-s.w / 2, s.h / 2 - s.h * 0.26, s.w, s.h * 0.26);
        // 윗면 하이라이트 (부딪힐 때 번쩍인다)
        ctx.fillStyle = `rgba(255,255,255,${0.12 + hit * 0.28})`;
        ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h * 0.3);

        ctx.restore();
    }

    ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// ① 시전 1초 — 발밑으로 검은 기운이 모여든다
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('yumyeong_cast', (ctx, fx, alpha, state) => {
    let o = state.players[fx.id] || (fx.id === state.myId ? state.myPlayer : null);
    let cx = o ? o.x : fx.x, cy = o ? o.y : fx.y;
    let grow = 1 - alpha;

    ctx.save();
    ctx.translate(cx, cy);

    let g = ctx.createRadialGradient(0, 0, 4, 0, 0, 120 + grow * 160);
    g.addColorStop(0, `rgba(8,8,12,${0.15 + grow * 0.75})`);
    g.addColorStop(0.55, `rgba(20,20,30,${0.10 + grow * 0.45})`);
    g.addColorStop(1, "rgba(30,30,45,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 120 + grow * 160, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = `rgba(240,244,255,${0.25 + grow * 0.6})`;
    ctx.lineWidth = 2.5; ctx.lineCap = "round";
    for (let k = 0; k < 6; k++) {
        let a = (k / 6) * Math.PI * 2 + state.mathNow / 260;
        let far = 250 * alpha + 60, near = far - 70;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * far, Math.sin(a) * far);
        ctx.lineTo(Math.cos(a) * near, Math.sin(a) * near);
        ctx.stroke();
    }
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// ② 전개 순간 — 바깥으로 퍼지는 충격 링 (구체는 drawDomain 이 그린다)
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('yumyeong_open', (ctx, fx, alpha, state) => {
    const R = fx.radius || 675;
    let t = 1 - alpha;
    let openT = Math.min(1, t / 0.26);
    let ease = 1 - Math.pow(1 - openT, 3);
    let fade = t < 0.26 ? 1 : Math.max(0, 1 - (t - 0.26) / 0.5);

    ctx.save();
    ctx.globalAlpha = fade * 0.75;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 7 * (1 - openT) + 2;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R * ease, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
});

// ============================================================================
// 🌑💥 [영역 전용] 평타 — 보랏빛 빛 폭발 + 시전자와 대상을 잇는 연결고리
// ============================================================================
registerVisualFX('domain_light_burst', (ctx, fx, alpha, state) => {
    const R = fx.radius || 260;
    const t = 1 - alpha;                     // 0 → 1
    const blasts = fx.blasts || [];
    const links = fx.links || [];

    // ── ① 연결고리 (시전자 ↔ 각 대상) ─────────────────────────────
    //    앞 35% 구간에 쭉 뻗어 나가고, 이후 서서히 옅어진다
    const reach = Math.min(1, t / 0.35);
    const linkFade = (t < 0.35) ? 1 : Math.max(0, 1 - (t - 0.35) / 0.65);

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < links.length; i++) {
        const L = links[i];
        const ex = fx.x + (L.x - fx.x) * reach;
        const ey = fx.y + (L.y - fx.y) * reach;

        // 바깥 번짐 (보랏빛)
        ctx.globalAlpha = linkFade * 0.55;
        ctx.strokeStyle = "rgba(178, 142, 255, 0.85)";
        ctx.lineWidth = 16;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(ex, ey); ctx.stroke();

        // 안쪽 심 (거의 흰빛)
        ctx.globalAlpha = linkFade * 0.95;
        ctx.strokeStyle = "rgba(245, 235, 255, 1)";
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(ex, ey); ctx.stroke();

        // 줄기를 타고 흐르는 빛 알갱이
        ctx.globalAlpha = linkFade * 0.9;
        for (let k = 0; k < 3; k++) {
            let ft = (t * 2.2 + k / 3) % 1;
            let bx = fx.x + (L.x - fx.x) * ft * reach;
            let by = fx.y + (L.y - fx.y) * ft * reach;
            let bg = ctx.createRadialGradient(bx, by, 1, bx, by, 22);
            bg.addColorStop(0, "rgba(255,255,255,1)");
            bg.addColorStop(0.4, "rgba(200,170,255,0.7)");
            bg.addColorStop(1, "rgba(150,110,255,0)");
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(bx, by, 22, 0, Math.PI * 2); ctx.fill();
        }
    }

    // ── ② 빛 폭발 (시전자 + 각 대상 위치) ─────────────────────────
    //    연결고리가 닿은 뒤에 터진다
    const boomT = Math.max(0, (t - 0.28) / 0.72);
    if (boomT > 0) {
        const ease = 1 - Math.pow(1 - Math.min(1, boomT / 0.45), 2.4);
        const rr = R * ease;
        const bFade = Math.max(0, 1 - Math.max(0, boomT - 0.45) / 0.55);

        for (let i = 0; i < blasts.length; i++) {
            const B = blasts[i];
            ctx.globalAlpha = bFade * (B.self ? 0.85 : 1);

            let g = ctx.createRadialGradient(B.x, B.y, rr * 0.08, B.x, B.y, rr);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(0.35, "rgba(226, 208, 255, 0.9)");
            g.addColorStop(0.7, "rgba(168, 128, 255, 0.5)");
            g.addColorStop(1, "rgba(120, 80, 220, 0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(B.x, B.y, rr, 0, Math.PI * 2); ctx.fill();

            // 테두리 링
            ctx.globalAlpha = bFade * 0.8;
            ctx.strokeStyle = "rgba(220, 200, 255, 0.9)";
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(B.x, B.y, rr * 0.94, 0, Math.PI * 2); ctx.stroke();

            // 사방으로 뻗는 빛살
            ctx.globalAlpha = bFade * 0.7;
            ctx.strokeStyle = "rgba(255,255,255,0.9)";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            for (let k = 0; k < 8; k++) {
                let a = (k / 8) * Math.PI * 2 + i * 0.4;
                ctx.beginPath();
                ctx.moveTo(B.x + Math.cos(a) * rr * 0.5, B.y + Math.sin(a) * rr * 0.5);
                ctx.lineTo(B.x + Math.cos(a) * rr * 1.25, B.y + Math.sin(a) * rr * 1.25);
                ctx.stroke();
            }
        }
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 🌑☀️ [영역 전용] 빛 — ① 1초 동안 대기의 빛이 대상 중심으로 모여든다
// ============================================================================
registerVisualFX('domain_light_gather', (ctx, fx, alpha, state) => {
    const pts = fx.points || [];
    const t = 1 - alpha;                     // 0 → 1 (수렴 진행도)

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < pts.length; i++) {
        const P = pts[i];

        // 바깥에서 안으로 빨려드는 빛줄기 10가닥
        ctx.globalAlpha = 0.35 + t * 0.55;
        ctx.strokeStyle = "rgba(255, 250, 220, 0.9)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        for (let k = 0; k < 10; k++) {
            let a = (k / 10) * Math.PI * 2 + i * 0.7 + state.mathNow / 700;
            let far = 300 * (1 - t) + 45;
            let near = far - 60 - t * 40;
            if (near < 10) near = 10;
            ctx.beginPath();
            ctx.moveTo(P.x + Math.cos(a) * far, P.y + Math.sin(a) * far);
            ctx.lineTo(P.x + Math.cos(a) * near, P.y + Math.sin(a) * near);
            ctx.stroke();
        }

        // 중심에 뭉치는 빛덩이 (점점 커지고 밝아진다)
        let cr = 20 + t * 55;
        ctx.globalAlpha = 0.4 + t * 0.6;
        let g = ctx.createRadialGradient(P.x, P.y, 2, P.x, P.y, cr);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.45, "rgba(255, 245, 190, 0.8)");
        g.addColorStop(1, "rgba(255, 220, 120, 0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(P.x, P.y, cr, 0, Math.PI * 2); ctx.fill();

        // 조여드는 링
        ctx.globalAlpha = (1 - t) * 0.7;
        ctx.strokeStyle = "rgba(255, 250, 220, 0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(P.x, P.y, 300 * (1 - t) + 45, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 🌑☀️ [영역 전용] 빛 — ② 0.3초마다 터지는 작은 빛 폭발
// ============================================================================
registerVisualFX('domain_light_tick', (ctx, fx, alpha, state) => {
    const pts = fx.points || [];
    const t = 1 - alpha;
    const rr = 40 + t * 85;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;

    for (let i = 0; i < pts.length; i++) {
        const P = pts[i];
        let g = ctx.createRadialGradient(P.x, P.y, 2, P.x, P.y, rr);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.4, "rgba(255, 244, 186, 0.85)");
        g.addColorStop(1, "rgba(255, 210, 110, 0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(P.x, P.y, rr, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = "rgba(255, 250, 225, 0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(P.x, P.y, rr * 0.9, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 🌑☀️🌑 [영역 전용] 빛 · 어둠 — 흑백 판자가 에너지로 변한다
//
//   서버는 '시드' 와 '대상 1명당 개수' 만 보낸다.
//   판자 목록은 클라이언트가 시드로 만들어 두었으므로, 같은 시드를 쓰면
//   모든 플레이어에게 똑같은 판자가 선택된다.
//
//   fx.kind : 'light' (노란 빛) | 'dark' (보라 어둠)
// ============================================================================

/** 🎯 이 영역의 판자 중 count 개를 시드로 골라 좌표를 돌려준다 */
function pickSlabPoints(dm, seed, count) {
    if (!dm) return [];
    const slabs = getSlabs(dm);
    if (!slabs.length) return [];

    const rnd = seeded((seed >>> 0) ^ hashId(dm.ownerId));
    const sphereCx = dm.x;
    const sphereCy = dm.y - dm.radius * SPHERE_Y_RATIO;

    let out = [];
    for (let i = 0; i < count; i++) {
        const s = slabs[Math.floor(rnd() * slabs.length)];
        out.push({ x: sphereCx + s.x, y: sphereCy + s.y, w: s.w, h: s.h, rot: s.rot });
    }
    return out;
}

/** 현재 화면에 떠 있는 영역 중 주인이 ownerId 인 것 */
function findDomainByOwner(ownerId) {
    const list = (typeof window !== 'undefined' && window.serverDomains) ? window.serverDomains : [];
    for (let i = 0; i < list.length; i++) if (list[i] && list[i].ownerId === ownerId) return list[i];
    return null;
}

registerVisualFX('domain_energy_gather', (ctx, fx, alpha, state) => {
    const pts = fx.points || [];
    const t = 1 - alpha;                      // 0 → 1 (변환 진행도)
    const isDark = (fx.kind === 'dark');

    // 판자 좌표는 한 번만 계산해 캐시한다
    if (!fx._slabs) {
        const dm = findDomainByOwner(fx.id);
        const count = Math.max(1, (fx.perTarget || 1) * Math.max(1, pts.length));
        fx._slabs = dm ? pickSlabPoints(dm, fx.seed || 1, count) : [];
    }
    const slabs = fx._slabs;
    if (!slabs.length) return;

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const coreCol = isDark ? "rgba(150, 90, 255, " : "rgba(255, 245, 190, ";
    const edgeCol = isDark ? "rgba(90, 40, 190, 0)" : "rgba(255, 210, 110, 0)";

    for (let i = 0; i < slabs.length; i++) {
        const s = slabs[i];
        // 판자마다 조금씩 시차를 두고 변한다 (자연스럽게)
        const lag = (i % 7) / 14;
        const tt = Math.max(0, Math.min(1, (t - lag) / (1 - lag || 1)));
        if (tt <= 0) continue;

        // ① 판자 윤곽이 점점 빛나며 녹아든다
        ctx.globalAlpha = (1 - tt) * 0.85;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.strokeStyle = isDark ? "rgba(190, 150, 255, 0.95)" : "rgba(255, 250, 210, 0.95)";
        ctx.lineWidth = 3 + tt * 5;
        ctx.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);
        ctx.restore();

        // ② 에너지 구슬로 뭉친다
        let rr = 10 + tt * 46;
        ctx.globalAlpha = 0.35 + tt * 0.65;
        let g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, rr);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.45, coreCol + "0.85)");
        g.addColorStop(1, edgeCol);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, Math.PI * 2); ctx.fill();

        // ③ 주변에서 빨려드는 잔가루
        ctx.globalAlpha = (1 - tt) * 0.6;
        ctx.strokeStyle = isDark ? "rgba(170,120,255,0.9)" : "rgba(255,248,200,0.9)";
        ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) {
            let a = (k / 4) * Math.PI * 2 + state.mathNow / 500 + i;
            let far = 90 * (1 - tt) + 20, near = far - 30;
            ctx.beginPath();
            ctx.moveTo(s.x + Math.cos(a) * far, s.y + Math.sin(a) * far);
            ctx.lineTo(s.x + Math.cos(a) * near, s.y + Math.sin(a) * near);
            ctx.stroke();
        }
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 🌑☀️ [영역 전용] 빛 — 에너지가 대상에게 빠르게 폭격된다 (0.3초마다 1발)
// ============================================================================
registerVisualFX('domain_bolt', (ctx, fx, alpha, state) => {
    const pts = fx.points || [];
    const from = fx.from || [];
    const t = 1 - alpha;
    const isDark = (fx.kind === 'dark');

    const fly = Math.min(1, t / 0.45);        // 앞 45% 에 꽂힌다 (매우 빠름)
    const boom = Math.max(0, (t - 0.4) / 0.6);

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (let i = 0; i < pts.length; i++) {
        const P = pts[i];
        const F = from[i] || { x: P.x, y: P.y - 420 };

        // ① 날아가는 에너지 (긴 꼬리)
        if (fly < 1) {
            const cx = F.x + (P.x - F.x) * fly;
            const cy = F.y + (P.y - F.y) * fly;
            const tx = F.x + (P.x - F.x) * Math.max(0, fly - 0.25);
            const ty = F.y + (P.y - F.y) * Math.max(0, fly - 0.25);

            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = isDark ? "rgba(170, 120, 255, 0.9)" : "rgba(255, 246, 190, 0.9)";
            ctx.lineWidth = 12; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(cx, cy); ctx.stroke();

            ctx.strokeStyle = "rgba(255,255,255,0.95)";
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(cx, cy); ctx.stroke();

            let hg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
            hg.addColorStop(0, "rgba(255,255,255,1)");
            hg.addColorStop(0.5, isDark ? "rgba(160,110,255,0.8)" : "rgba(255,240,170,0.8)");
            hg.addColorStop(1, "rgba(120,80,200,0)");
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
        }

        // ② 착탄 폭발
        if (boom > 0) {
            const rr = (isDark ? 190 : 105) * (1 - Math.pow(1 - Math.min(1, boom / 0.5), 2.2));
            ctx.globalAlpha = Math.max(0, 1 - Math.max(0, boom - 0.5) / 0.5);
            let g = ctx.createRadialGradient(P.x, P.y, 2, P.x, P.y, rr);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(0.4, isDark ? "rgba(150, 90, 255, 0.85)" : "rgba(255, 244, 186, 0.85)");
            g.addColorStop(1, isDark ? "rgba(80, 30, 170, 0)" : "rgba(255, 210, 110, 0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(P.x, P.y, rr, 0, Math.PI * 2); ctx.fill();

            ctx.strokeStyle = isDark ? "rgba(200,170,255,0.9)" : "rgba(255,250,225,0.9)";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(P.x, P.y, rr * 0.9, 0, Math.PI * 2); ctx.stroke();
        }
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 💫 [영역 전용] 아광속 발차기 — 별 궤도 접촉 폭발
// ============================================================================
registerVisualFX('domain_kick_blast', (ctx, fx, alpha, state) => {
    const R = fx.radius || 300;
    const t = 1 - alpha;
    const rr = R * (1 - Math.pow(1 - Math.min(1, t / 0.4), 2.3));

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha;

    let g = ctx.createRadialGradient(fx.x, fx.y, 3, fx.x, fx.y, rr);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255, 250, 215, 0.9)");
    g.addColorStop(0.7, "rgba(255, 225, 130, 0.5)");
    g.addColorStop(1, "rgba(255, 200, 80, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, rr * 0.92, 0, Math.PI * 2); ctx.stroke();

    // 사방으로 뻗는 빛살
    ctx.lineWidth = 4; ctx.lineCap = "round";
    for (let k = 0; k < 10; k++) {
        let a = (k / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(fx.x + Math.cos(a) * rr * 0.55, fx.y + Math.sin(a) * rr * 0.55);
        ctx.lineTo(fx.x + Math.cos(a) * rr * 1.35, fx.y + Math.sin(a) * rr * 1.35);
        ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ============================================================================
// 💫 [영역 전용] 별 궤도 — 지나갈 경로를 은은하게 미리 그린다
// ============================================================================
registerVisualFX('domain_kick_path', (ctx, fx, alpha, state) => {
    const path = fx.path || [];
    if (path.length < 2) return;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = "rgba(255, 248, 200, 0.9)";
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 16]);
    ctx.lineDashOffset = -state.mathNow / 25;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🌑 영역 본체 — renderEngine 이 매 프레임 직접 호출한다
// ────────────────────────────────────────────────────────────────────────────

/**
 * 영역을 월드 좌표계에 그린다.
 * @param inView 내가 이 영역 안에 있는가 (안이면 배경까지, 밖이면 검은 원만)
 */
export function drawDomain(ctx, dm, now, mathNow, inView, camX, camY, viewW, viewH) {
    if (!dm) return;

    const R = dm.radius;
    const t = mathNow / 1000;

    // ── 진행도 계산 ─────────────────────────────────────────────────
    //    구체 : 암전 구간(앞 1초)에 먼저 완성된다
    //    판자 : 밝아지기 시작하는 1초 지점부터 자라난다
    let sphereT = 1, slabT = 1, settle = 1, collapseT = 0;

    if (dm.phase === 'expand') {
        const el = now - dm.startAt;
        sphereT = Math.min(1, Math.max(0, el / (YUM_DARK_MS * 0.9)));
        slabT = Math.min(1, Math.max(0, (el - YUM_DARK_MS) / (YUM_EXPAND_MS - YUM_DARK_MS)));
        settle = Math.max(0, (slabT - 0.5) / 0.5);
    } else if (dm.phase === 'collapse') {
        collapseT = Math.min(1, Math.max(0, (now - dm.endAt) / Math.max(1, dm.collapseEnd - dm.endAt)));
        slabT = 1 - collapseT;        // 바깥 판자부터 무너진다
        sphereT = 1 - collapseT;
    }

    const sphereR = R * SPHERE_R_RATIO * (0.25 + sphereT * 0.75);
    const sphereCx = dm.x;
    const sphereCy = dm.y - R * SPHERE_Y_RATIO;

    // ── 밖에서 보는 사람 : 커다란 검은 원 ───────────────────────────
    if (!inView) {
        let a = (dm.phase === 'collapse') ? (1 - collapseT)
              : (dm.phase === 'expand' ? Math.min(1, (now - dm.startAt) / (YUM_DARK_MS * 1.2)) : 1);
        ctx.save();
        ctx.globalAlpha = a * 0.93;
        let g = ctx.createRadialGradient(dm.x, dm.y, R * 0.55, dm.x, dm.y, R);
        g.addColorStop(0, "rgba(4,4,7,1)");
        g.addColorStop(0.82, "rgba(8,8,13,0.98)");
        g.addColorStop(1, "rgba(16,16,26,0.55)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(dm.x, dm.y, R, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = a * 0.55;
        ctx.strokeStyle = "rgba(235,240,255,0.8)";
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(dm.x, dm.y, R, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        return;
    }

    // ── 안에 있는 사람 : 화면 전체가 영역 배경 ──────────────────────
    ctx.save();

    // 바탕 — 판자가 자라날수록 밝아진다
    let bg = ctx.createLinearGradient(0, camY, 0, camY + viewH);
    let lum = 0.35 + slabT * 0.65;
    const mix = (a, b) => Math.round(a + (b - a) * lum);
    bg.addColorStop(0, `rgb(${mix(20, 232)},${mix(20, 236)},${mix(26, 244)})`);
    bg.addColorStop(0.55, `rgb(${mix(16, 198)},${mix(16, 204)},${mix(22, 216)})`);
    bg.addColorStop(1, `rgb(${mix(10, 150)},${mix(10, 156)},${mix(14, 170)})`);
    ctx.fillStyle = bg;
    ctx.fillRect(camX - 10, camY - 10, viewW + 20, viewH + 20);

    // 🧱 판자 더미 — 화면을 채우도록 3겹으로 반복해 그린다
    //    (겹마다 구체 중심을 기준으로 확대/축소하므로 구체는 계속 비어 있다)
    const layers = [
        { s: 1.00, a: 1.00 },
        { s: 1.62, a: 0.50 },
        { s: 0.74, a: 0.72 }
    ];
    for (let L of layers) {
        ctx.save();
        ctx.translate(sphereCx, sphereCy);
        ctx.scale(L.s, L.s);
        ctx.translate(-sphereCx, -sphereCy);
        drawSlabs(ctx, dm, t * (0.8 + L.s * 0.3), slabT, settle, L.a,
                  sphereCx, sphereCy, sphereR);
        ctx.restore();
    }

    // 🧿 구체는 판자보다 나중에 그려 항상 맨 앞에 온다 (겹침 방지)
    drawSphere(ctx, sphereCx, sphereCy, sphereR, sphereT, mathNow / 5200);

    ctx.restore();
}

/**
 * 🌗 영역 전개 중 화면 밝기 오버레이.
 *    ① 앞 1초  : 검게 어두워진다 (0 → 1)
 *    ② 뒤 3초  : 다시 밝아진다   (1 → 0)
 *    화면 좌표계(변환 없음)에서 그려야 하므로 renderEngine 이 따로 호출한다.
 *
 *  @return 0~1 (0 이면 그릴 필요 없음)
 */
export function domainFadeAlpha(dm, now) {
    if (!dm) return 0;
    if (dm.phase === 'expand') {
        let el = now - dm.startAt;
        if (el <= YUM_DARK_MS) return Math.min(1, el / YUM_DARK_MS);
        let rest = YUM_EXPAND_MS - YUM_DARK_MS;
        return Math.max(0, 1 - (el - YUM_DARK_MS) / rest);
    }
    if (dm.phase === 'collapse') {
        let span = Math.max(1, dm.collapseEnd - dm.endAt);
        return Math.min(1, Math.max(0, (now - dm.endAt) / span)) * 0.85;
    }
    return 0;
}
