// 파일명: fxdomain.js
// ============================================================================
// 🌑 [유명이경 역월] 영역 전개 연출
//
//   ── 연출 흐름 (서버 config.js 의 타이밍과 반드시 일치해야 한다) ──
//     ① cast    1초 : 시전자 발밑으로 검은 기운이 모여든다        (yumyeong_cast)
//     ② expand  4초 : 방사형 거미줄 원반이 펼쳐지고,
//                     흑백 각진 상자 더미가 '증식' 한다.
//                     · 앞 1초 : 화면이 점점 어두워진다
//                     · 뒤 3초 : 점점 밝아지며 영역 배경이 드러난다
//     ③ active 15초 : 상자 더미가 서로 맞부딪히며 일렁인다
//     ④ collapse    : 배경이 무너지며 원래 장소로 돌아온다
//
//   영역 안에 있는 사람에게는 화면 전체가 영역 배경으로 바뀌고,
//   밖에 있는 사람에게는 그냥 커다란 검은 원으로 보인다.
//
//   ⚠️ 이 파일은 '월드 좌표계' 안에서 그려진다 (renderEngine 이 이미 변환을 걸어 둠).
// ============================================================================

import { registerVisualFX } from './effectRegistry.js';

// 서버 config.js 와 동일해야 하는 값
const YUM_EXPAND_MS = 4000;
const YUM_DARK_MS   = 1000;

// ────────────────────────────────────────────────────────────────────────────
// 🧱 상자 더미 — 결정론적 난수
//    같은 영역은 누가 보든 똑같이 보여야 하므로 시드 난수를 쓴다.
// ────────────────────────────────────────────────────────────────────────────
function seeded(seed) {
    let s = seed >>> 0;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

/** 문자열 id → 정수 시드 */
function hashId(str) {
    let h = 2166136261 >>> 0;
    str = String(str || 'x');
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
}

/**
 * 🧱 영역 하나에 대한 상자 더미를 만든다 (한 번만 만들고 캐시한다).
 *    각 판자는 중심에서 바깥으로 뻗는 방향을 가지며,
 *    'birth' (0~1) 값이 작을수록 먼저 생겨난다 → 증식 연출에 쓴다.
 */
const slabCache = new Map();

function getSlabs(dm) {
    let key = dm.ownerId + ':' + Math.round(dm.x) + ':' + Math.round(dm.y);
    let hit = slabCache.get(key);
    if (hit) return hit;

    const rnd = seeded(hashId(key));
    const R = dm.radius;
    const COUNT = 150;
    let list = [];

    for (let i = 0; i < COUNT; i++) {
        // 중심에서 멀수록 늦게 생겨난다 (안쪽 → 바깥쪽으로 증식)
        let distT = Math.pow(rnd(), 0.62);          // 0(중심) ~ 1(가장자리)
        let ang = rnd() * Math.PI * 2;
        let dist = distT * R * 1.02;

        list.push({
            x: Math.cos(ang) * dist,
            y: Math.sin(ang) * dist * 0.82,          // 살짝 납작하게
            w: R * (0.10 + rnd() * 0.30),            // 길쭉한 판자
            h: R * (0.020 + rnd() * 0.055),
            rot: (rnd() - 0.5) * Math.PI,            // 제각각 기울어짐
            // 증식 순서 : 중심에 가까울수록 빨리, 약간의 무작위를 섞는다
            birth: Math.min(0.98, distT * 0.78 + rnd() * 0.22),
            // 일렁임 : 각자 다른 주기 · 위상으로 흔들린다
            phase: rnd() * Math.PI * 2,
            speed: 0.55 + rnd() * 0.9,
            sway: R * (0.006 + rnd() * 0.018),
            // 명도 : 흑백 톤을 다양하게
            tone: 0.30 + rnd() * 0.62,
            // 부딪힘 : 서로 맞부딪히며 튕기는 정도
            bump: 0.4 + rnd() * 1.2
        });
    }

    // 안쪽부터 그려야 자연스럽게 쌓인다
    list.sort((a, b) => a.birth - b.birth);

    // 캐시가 무한정 커지지 않게 제한한다
    if (slabCache.size > 8) slabCache.clear();
    slabCache.set(key, list);
    return list;
}

// ────────────────────────────────────────────────────────────────────────────
// 🕸️ 방사형 거미줄 원반 — 영역의 상징
// ────────────────────────────────────────────────────────────────────────────
function drawWeb(ctx, cx, cy, R, alpha, spin, fill) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin);
    ctx.globalAlpha = alpha;

    if (fill) {
        ctx.fillStyle = "rgba(250, 250, 252, 0.92)";
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    }

    ctx.strokeStyle = "rgba(12, 12, 16, 0.95)";
    ctx.lineCap = "butt";

    // 동심원 8겹
    for (let k = 1; k <= 8; k++) {
        let rr = R * (k / 8);
        ctx.lineWidth = Math.max(1.2, R * 0.012 * (1 - k / 14));
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
    }

    // 방사선 24개
    ctx.lineWidth = Math.max(1.2, R * 0.010);
    for (let k = 0; k < 24; k++) {
        let a = (k / 24) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.10, Math.sin(a) * R * 0.10);
        ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
        ctx.stroke();
    }

    // 한가운데 검은 눈
    ctx.fillStyle = "rgba(8, 8, 12, 1)";
    ctx.beginPath(); ctx.arc(0, 0, R * 0.085, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// 🧱 상자 더미를 그린다
//    grow  : 0~1 — 이 값보다 birth 가 작은 판자만 나타난다 (증식)
//    settle: 0~1 — 1이면 완전히 자리잡아 일렁이는 상태
// ────────────────────────────────────────────────────────────────────────────
function drawSlabs(ctx, dm, t, grow, settle, alpha) {
    const slabs = getSlabs(dm);
    const R = dm.radius;

    ctx.save();
    ctx.translate(dm.x, dm.y);
    ctx.globalAlpha = alpha;

    for (let i = 0; i < slabs.length; i++) {
        const s = slabs[i];
        if (s.birth > grow) continue;

        // 갓 생겨난 판자는 작게 시작해 제 크기로 커진다
        let age = Math.min(1, (grow - s.birth) / 0.16);
        let pop = 0.35 + age * 0.65;

        // 🌊 일렁임 + 맞부딪힘
        //    settle 이 1에 가까울수록 흔들림이 또렷해진다
        let w1 = Math.sin(t * s.speed + s.phase);
        let w2 = Math.sin(t * s.speed * 1.73 + s.phase * 2.1);
        let ox = w1 * s.sway * settle;
        let oy = w2 * s.sway * 0.7 * settle;
        // 부딪히는 순간 살짝 튕긴다 (|sin| 이 1에 가까울 때)
        let hit = Math.pow(Math.abs(w1), 8) * s.bump * settle;
        let rot = s.rot + w2 * 0.05 * settle + hit * 0.03;

        let g = Math.round(255 * s.tone);
        ctx.save();
        ctx.translate(s.x + ox, s.y + oy);
        ctx.rotate(rot);
        ctx.scale(pop, pop);

        // 본체
        ctx.fillStyle = `rgb(${g},${g},${Math.min(255, g + 6)})`;
        ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
        // 검은 테두리 — 만화 느낌
        ctx.strokeStyle = "rgba(10,10,14,0.9)";
        ctx.lineWidth = Math.max(1, R * 0.004);
        ctx.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);
        // 윗면 하이라이트
        ctx.fillStyle = `rgba(255,255,255,${0.10 + hit * 0.25})`;
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

    // 모여드는 검은 기운
    let g = ctx.createRadialGradient(0, 0, 4, 0, 0, 120 + grow * 160);
    g.addColorStop(0, `rgba(8,8,12,${0.15 + grow * 0.75})`);
    g.addColorStop(0.55, `rgba(20,20,30,${0.10 + grow * 0.45})`);
    g.addColorStop(1, "rgba(30,30,45,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 120 + grow * 160, 0, Math.PI * 2); ctx.fill();

    // 안쪽으로 빨려 들어오는 흰 선
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
// ② 전개 순간 — 거미줄 원반이 확 펼쳐진다
// ────────────────────────────────────────────────────────────────────────────
registerVisualFX('yumyeong_open', (ctx, fx, alpha, state) => {
    const R = fx.radius || 675;
    let t = 1 - alpha;                       // 0 → 1
    let openT = Math.min(1, t / 0.30);       // 앞 30% 구간에 원반이 다 펼쳐진다
    let ease = 1 - Math.pow(1 - openT, 3);

    // 원반은 펼쳐진 뒤 서서히 옅어진다
    let fade = t < 0.30 ? 1 : Math.max(0, 1 - (t - 0.30) / 0.55);

    drawWeb(ctx, fx.x, fx.y, R * 0.55 * ease, 0.9 * fade, state.mathNow / 2600, false);

    // 바깥으로 퍼지는 충격 링
    ctx.save();
    ctx.globalAlpha = fade * 0.7;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 6 * (1 - openT) + 2;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, R * ease, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
});

// ────────────────────────────────────────────────────────────────────────────
// 🌑 영역 본체 — renderEngine 이 매 프레임 직접 호출한다
//    (visualFX 가 아니라 '지속되는 상태' 라서 별도 함수로 뺐다)
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
    let expandT = 1, settle = 1, collapseT = 0;
    if (dm.phase === 'expand') {
        expandT = Math.min(1, Math.max(0, (now - dm.startAt) / YUM_EXPAND_MS));
        settle = Math.max(0, (expandT - 0.55) / 0.45);   // 후반부터 일렁이기 시작
    } else if (dm.phase === 'collapse') {
        collapseT = Math.min(1, Math.max(0, (now - dm.endAt) / Math.max(1, dm.collapseEnd - dm.endAt)));
    }

    // 증식 진행도 : 전개 4초에 걸쳐 0 → 1
    let grow = (dm.phase === 'expand') ? Math.pow(expandT, 0.75) : 1;
    // 붕괴하면 바깥쪽부터 사라진다
    if (dm.phase === 'collapse') grow = 1 - collapseT;

    // ── 밖에서 보는 사람 : 커다란 검은 원 ───────────────────────────
    if (!inView) {
        let a = (dm.phase === 'collapse') ? (1 - collapseT) : Math.min(1, expandT * 1.6);
        ctx.save();
        ctx.globalAlpha = a * 0.93;
        let g = ctx.createRadialGradient(dm.x, dm.y, R * 0.55, dm.x, dm.y, R);
        g.addColorStop(0, "rgba(4,4,7,1)");
        g.addColorStop(0.82, "rgba(8,8,13,0.98)");
        g.addColorStop(1, "rgba(16,16,26,0.55)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(dm.x, dm.y, R, 0, Math.PI * 2); ctx.fill();

        // 가장자리 흰 테두리
        ctx.globalAlpha = a * 0.55;
        ctx.strokeStyle = "rgba(235,240,255,0.8)";
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(dm.x, dm.y, R, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        return;
    }

    // ── 안에 있는 사람 : 화면 전체가 영역 배경 ──────────────────────
    //    보이는 영역 전체를 덮어야 하므로 카메라 사각형을 쓴다.
    ctx.save();

    // 바탕 (흐린 흰 하늘)
    ctx.fillStyle = "#e9ecf2";
    ctx.fillRect(camX - 10, camY - 10, viewW + 20, viewH + 20);

    // 바닥 쪽으로 갈수록 어두워지는 그라디언트
    let bg = ctx.createLinearGradient(0, camY, 0, camY + viewH);
    bg.addColorStop(0, "rgba(232,236,244,1)");
    bg.addColorStop(0.55, "rgba(198,204,216,1)");
    bg.addColorStop(1, "rgba(150,156,170,1)");
    ctx.fillStyle = bg;
    ctx.fillRect(camX - 10, camY - 10, viewW + 20, viewH + 20);

    // 하늘의 거미줄 원반 (영역의 상징)
    drawWeb(ctx, dm.x, dm.y - R * 0.45, R * 0.42, 0.85 * grow, mathNow / 5200, true);

    // 🧱 상자 더미 — 화면을 채우도록 3겹으로 반복해 그린다
    let layers = [
        { s: 1.00, a: 1.00, dx: 0,          dy: 0 },
        { s: 1.55, a: 0.55, dx: -R * 0.35,  dy: R * 0.22 },
        { s: 0.72, a: 0.75, dx: R * 0.40,   dy: -R * 0.18 }
    ];
    for (let L of layers) {
        ctx.save();
        ctx.translate(dm.x + L.dx, dm.y + L.dy);
        ctx.scale(L.s, L.s);
        ctx.translate(-dm.x, -dm.y);
        drawSlabs(ctx, dm, t * (0.8 + L.s * 0.3), grow, settle, L.a);
        ctx.restore();
    }

    // 검은 균열선 몇 가닥
    ctx.globalAlpha = 0.55 * grow;
    ctx.strokeStyle = "rgba(10,10,14,0.9)";
    ctx.lineWidth = 4;
    const rnd = seeded(hashId(dm.ownerId) ^ 0x5a5a);
    for (let k = 0; k < 12; k++) {
        let a = rnd() * Math.PI * 2;
        let r0 = R * (0.2 + rnd() * 0.5), r1 = R * (0.9 + rnd() * 0.7);
        let wob = Math.sin(t * 0.8 + k) * R * 0.02;
        ctx.beginPath();
        ctx.moveTo(dm.x + Math.cos(a) * r0, dm.y + Math.sin(a) * r0 * 0.8 + wob);
        ctx.lineTo(dm.x + Math.cos(a) * r1, dm.y + Math.sin(a) * r1 * 0.8 - wob);
        ctx.stroke();
    }

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
