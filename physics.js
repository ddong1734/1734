// physics.js - 물리 엔진 (야타의 거울 '빔 대시' 이동 반영 + 좌우 벽 충돌)
//
// 🪨 고속 낙하 시 발판을 뚫고 지나가던 터널링 버그 수정 (스윕 판정)
// ⚫ 크로우즈에 끌려가는 동안 검은수염 쪽으로 빠르게 강제 이동
// 🌊 암흑물질 장판(블랙홀) 시전 중에는 이동속도가 0.3배로 느려진다
// ⚫ [수정] 암흑 왕좌 안에서는 야타/대시가 구역 밖으로 나가지 못하게 클램프
// 🍈 [추가] 어둠 흡수(시전자·대상) / 파공아 시전 경직 중에는 완전히 고정된다
// ⚡🔮 [추가] 음파 응축(0.5초) 중에는 완전히 고정된다
// 🗣️ [추가] NPC 대화 중에는 완전히 고정된다 (이동 · 점프 · 평타 · 스킬 봉인)
// ⚡🔮 [추가] 환수호박 평타 = 전격 돌진 — 돌진 중에는 조이스틱 방향으로
//    아주 빠르게 이동하며 전류 잔상을 남긴다. (평상시 잔상은 없다)
//
// ⬛ [신규] 다부라 카라바
//    · ☀️ [빛]           : 시전 순간 박힌범 지름만큼 위로 솟구친 뒤,
//                          ✅ [수정] 폭발이 끝날 때까지 공중에 완전히 고정된다
//    · 🌑 [어둠]         : ✅ [수정] 시전자는 3초 동안 완전히 고정된다
//                          (소용돌이에 걸린 대상은 중심으로 끌려간다 · 벽 통과 불가)
//    · 💫 [아광속 발차기] : 2초 응축(완전 고정) → 5초간 조이스틱 활공
//                          (중력 없음 · 가로벽 통과 · 세로벽 통과 불가)
//
// 🛟 [게임 멈춤 방지]
//   모든 조기 return 구간에 '만료 시각' 조건을 함께 검사한다.
//   근거가 사라지면 그 자리에서 잠금을 풀고 정상 물리로 넘어간다.
//   좌표가 NaN 으로 오염되면 즉시 복구한다.

// ⚫ 암흑 왕좌 구역 상수 (gameState.js 와 동일)
const DZ_MIN = 35400, DZ_MAX = 41600;
const DA_MIN_X = 36000, DA_MAX_X = 41000;
const DA_GROUND = 2000, DA_CEIL = 600;

// 🔥 저주의 왕 (헤이안 스쿠나) — server/config.js 의 CURSE_* 와 동일해야 한다
const CZ_MIN = 42900, CZ_MAX = 49100;
const CA_MIN_X = 43500, CA_MAX_X = 48500;
const CA_GROUND = 2000, CA_CEIL = 600;

/** ⚫ 암흑 왕좌 구역 안에 있는 좌표인가 */
function inDarkZoneX(x) { return x >= DZ_MIN && x <= DZ_MAX; }

/** 🔥 저주의 왕 구역 안인가 */
function inCurseZoneX(x) { return x >= CZ_MIN && x <= CZ_MAX; }

/**
 * 🔥 저주의 왕 안이라면 좌표를 구역 내부로 제한한다.
 *    · 좌우 벽을 넘어갈 수 없다 (야타의 거울 같은 순간이동도 막힌다)
 *    · 바닥을 뚫고 내려갈 수 없다
 */
function clampToCurseArea(p) {
    const HALF_W = 45;
    p.x = Math.max(CA_MIN_X + HALF_W + 5, Math.min(CA_MAX_X - HALF_W - 5, p.x));
    p.y = Math.max(CA_CEIL + 45, Math.min(CA_GROUND - 45, p.y));
}

/** ⚫🔥 별세계(암흑 왕좌 · 저주의 왕) 공통 경계 제한 */
function clampToSpecialArea(p, refX) {
    const x = (refX === undefined) ? p.x : refX;
    if (inDarkZoneX(x)) { clampToDarkArea(p); return true; }
    if (inCurseZoneX(x)) { clampToCurseArea(p); return true; }
    return false;
}

/** ⚫ 암흑 왕좌 안이라면 좌표를 구역 내부로 제한한다 */
function clampToDarkArea(p) {
    const HALF_W = 45;
    p.x = Math.max(DA_MIN_X + HALF_W + 5, Math.min(DA_MAX_X - HALF_W - 5, p.x));
    p.y = Math.max(DA_CEIL + 45, Math.min(DA_GROUND - 45, p.y));
}

/** 🛟 유한한 숫자인가 */
function fin(v) { return typeof v === 'number' && Number.isFinite(v); }

/** 🛟 좌표·속도 오염을 그 자리에서 복구한다 */
function sanitize(p) {
    if (!fin(p.x)) p.x = 10800;
    if (!fin(p.y)) p.y = 1955;
    if (!fin(p.vy)) p.vy = 0;
    if (!fin(p.knockbackForce)) p.knockbackForce = 0;
    if (!fin(p.moveX)) p.moveX = 0;
    if (!fin(p.moveY)) p.moveY = 0;
}

window.initPhysicsTerrain = () => {
    if (!window.GameData || !window.GameData.Map) return;
    
    let baseWidth = window.GameData.Map.WORLD_WIDTH || 50000;
    window.WORLD_WIDTH = Math.max(baseWidth, 50000);   // 🔥 저주의 왕 맵(42900~49100) 을 포함하도록 확장
    window.WORLD_HEIGHT = window.GameData.Map.WORLD_HEIGHT || 3000;
    window.GROUND_Y = window.GameData.Map.GROUND_Y || 2000;
    window.VIEW_SCALE = window.GameData.Map.VIEW_SCALE || 0.5;

    window.PLATFORMS = window.GameData.Map.Platforms ? JSON.parse(JSON.stringify(window.GameData.Map.Platforms)) : [];
    window.PLATFORMS = window.PLATFORMS.filter(p => p.type !== 'jungle'); 
    
    const mirrorWidth = (typeof window.JUNGLE_MIRROR_WIDTH === 'number') ? window.JUNGLE_MIRROR_WIDTH : 32000;
    const blueData = window.GameData.Map.JungleBlueData || [];
    blueData.forEach(pos => {
        window.PLATFORMS.push({ x: pos.x, y: pos.y, w: 1000, h: 30, type: 'jungle' });
        window.PLATFORMS.push({ x: mirrorWidth - pos.x - 1000, y: pos.y, w: 1000, h: 30, type: 'jungle' }); 
    });
};

// 🚨 야타 경로(waypoints)를 진행도(frac, 0~1)에 따라 위치로 변환
window.sampleYataPath = (pts, frac) => {
    if (!pts || pts.length < 2) return null;
    let total = 0;
    let segLens = [];
    for (let i = 1; i < pts.length; i++) { let L = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y); segLens.push(L); total += L; }
    let target = Math.max(0, Math.min(1, frac)) * total;
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
        if (acc + segLens[i-1] >= target) {
            let f = segLens[i-1] > 0 ? (target - acc) / segLens[i-1] : 1;
            return { x: pts[i-1].x + (pts[i].x - pts[i-1].x) * f, y: pts[i-1].y + (pts[i].y - pts[i-1].y) * f };
        }
        acc += segLens[i-1];
    }
    return { x: pts[pts.length-1].x, y: pts[pts.length-1].y };
};

// 🧱 좌우(측면) 충돌 처리 — solid:true 로 지정된 발판(벽)에만 적용된다.
window.resolveSideCollision = (p, prevX) => {
    if (!window.PLATFORMS) return;
    if (!fin(prevX)) return;                      // 🛟 오염된 이전 좌표로는 판정하지 않는다
    const HALF_W = 45;

    for (let plat of window.PLATFORMS) {
        if (!plat.solid) continue;

        let feetY = p.y + 45;
        let headY = p.y - 45;

        if (feetY <= plat.y + 4) continue;
        if (headY >= plat.y + plat.h) continue;

        if (p.x + HALF_W <= plat.x) continue;
        if (p.x - HALF_W >= plat.x + plat.w) continue;

        if (prevX + HALF_W <= plat.x) {
            p.x = plat.x - HALF_W;
        } else if (prevX - HALF_W >= plat.x + plat.w) {
            p.x = plat.x + plat.w + HALF_W;
        } else {
            let pushLeft = (p.x + HALF_W) - plat.x;
            let pushRight = (plat.x + plat.w) - (p.x - HALF_W);
            if (pushLeft <= pushRight) p.x = plat.x - HALF_W;
            else p.x = plat.x + plat.w + HALF_W;
        }
        p.knockbackForce = 0;
    }
};

/**
 * 🧱 [신규] 세로벽(solid) 안에 파고들었으면 밖으로 밀어낸다.
 *    💫 아광속 발차기(자유 비행)처럼 '이전 X 좌표'만으로는 판정이 어려운
 *       이동에 쓴다. (X · Y 모두 겹칠 때, 파고든 깊이가 가장 얕은 축으로 민다)
 */
window.pushOutOfSolid = (p) => {
    if (!window.PLATFORMS) return;
    const HALF_W = 45, HALF_H = 45;

    for (let plat of window.PLATFORMS) {
        if (!plat.solid) continue;

        let left = plat.x, right = plat.x + plat.w;
        let top = plat.y, bottom = plat.y + plat.h;

        if (p.x + HALF_W <= left) continue;
        if (p.x - HALF_W >= right) continue;
        if (p.y + HALF_H <= top) continue;
        if (p.y - HALF_H >= bottom) continue;

        // 네 방향으로 빠져나가는 데 필요한 거리
        let pushL = (p.x + HALF_W) - left;      // 왼쪽으로 밀기
        let pushR = right - (p.x - HALF_W);     // 오른쪽으로 밀기
        let pushU = (p.y + HALF_H) - top;       // 위로 밀기
        let pushD = bottom - (p.y - HALF_H);    // 아래로 밀기

        let m = Math.min(pushL, pushR, pushU, pushD);
        if (m === pushL) p.x = left - HALF_W;
        else if (m === pushR) p.x = right + HALF_W;
        else if (m === pushU) p.y = top - HALF_H;
        else p.y = bottom + HALF_H;

        p.knockbackForce = 0;
    }
};

window.updatePlayerPhysics = (p, slowUntil, loopNow, visualFX) => {
    let ms = (window.GameData && window.GameData.Settings) ? window.GameData.Settings.MOVEMENT_SPEED : 1.0; 

    // 🛟 [최우선] 좌표 오염 복구 — 이후 모든 판정의 전제 조건이다
    sanitize(p);

    // 🗣️ NPC 대화 중에는 완전히 고정된다
    if (p.npcTalking) {
        p.moveX = 0; p.moveY = 0; p.knockbackForce = 0; p.vy = 0;
        return;
    }

    // ⚔️ [신규] 다이도 — 무자비 난무 · 일섬 발도 중에는 제자리에 굳는다.
    //    질풍참 돌진 중에는 서버가 좌표를 몰기 때문에 물리를 아예 건너뛴다.
    //    (여기서 막지 않으면 클라이언트가 자기 좌표를 덮어써 제자리로 보인다)
    if (p.daidoRush && loopNow < (p.daidoRushEnd || 0)) {
        p.moveX = 0; p.moveY = 0; p.vy = 0; p.knockbackForce = 0;
        return;
    }
    if (p.daidoFury && loopNow < (p.daidoFuryEnd || 0)) {
        p.moveX = 0; p.moveY = 0; p.vy = 0; p.knockbackForce = 0;
        return;
    }
    if (p.daidoIaiAt && loopNow < p.daidoIaiAt) {
        p.moveX = 0; p.moveY = 0; p.vy = 0; p.knockbackForce = 0;
        return;
    }
    // 🕊️ [쿠루스] 야곱의 사다리 — 공중에 뜬 채로도 완전히 멈춘다.
    //    동결 이펙트가 붙지 않도록 frozenUntil 이 아닌 전용 플래그를 쓴다.
    if (p.ladderLockUntil && loopNow < p.ladderLockUntil) {
        p.moveX = 0; p.moveY = 0; p.vy = 0; p.knockbackForce = 0;
        return;
    }
    // ❄️ [쿠잔(해적)] 결빙(0.5초) 중에는 그 자리에 굳는다.
    //    돌진 중에는 서버가 좌표를 몰기 때문에 클라 물리를 건드리지 않는다.
    if (p.kzDashCastEnd && loopNow < p.kzDashCastEnd) {
        p.moveX = 0; p.moveY = 0; p.vy = 0; p.knockbackForce = 0;
        return;
    }
    if (p.kzDashEnd && loopNow < p.kzDashEnd) {
        p.moveX = 0; p.moveY = 0; p.vy = 0; p.knockbackForce = 0;
        return;
    }

    // 🧲 [키드] 차징 · 발사 · 변신 · 고철 고정 중에는 공중에서도 완전히 멈춘다
    if ((p.kidLaserCastEnd && loopNow < p.kidLaserCastEnd) ||
        (p.kidLaserFireEnd && loopNow < p.kidLaserFireEnd) ||
        (p.kidGolemCastEnd && loopNow < p.kidGolemCastEnd) ||
        (p.kidHoldUntil && loopNow < p.kidHoldUntil)) {
        p.moveX = 0; p.moveY = 0; p.vy = 0; p.knockbackForce = 0;
        return;
    }

    // 🔥 [마르코] 봉리력 응축 · 불사 엉겅퀴 유지 중에는 공중에서도 완전히 멈춘다
    if ((p.marcoCastEnd && loopNow < p.marcoCastEnd) ||
        (p.marcoShieldEnd && loopNow < p.marcoShieldEnd)) {
        p.moveX = 0; p.moveY = 0; p.vy = 0; p.knockbackForce = 0;
        return;
    }

    // 🌑 [신규] 유명이경 역월 — 1초 시전 경직 중에는 완전히 고정된다
    if (p.yumCasting && loopNow < (p.yumCastEnd || 0)) {
        p.moveX = 0; p.moveY = 0; p.knockbackForce = 0; p.vy = 0;
        return;
    }
    if (p.yumCasting && p.yumCastEnd && loopNow >= p.yumCastEnd) {
        p.yumCasting = false; p.yumCastEnd = 0;
    }

    // 🗡️ [신규] 세계를 가르는 참격 — 0.5초 경직 중에는 완전히 고정된다
    if (p.cleaveCasting && loopNow < (p.cleaveCastEnd || 0)) {
        p.moveX = 0; p.moveY = 0; p.knockbackForce = 0; p.vy = 0;
        return;
    }
    if (p.cleaveCasting && p.cleaveCastEnd && loopNow >= p.cleaveCastEnd) {
        // 서버 동기화가 늦어도 로컬은 경직을 풀어 준다
        p.cleaveCasting = false; p.cleaveCastEnd = 0;
    }

    // ⬛💫 [신규] 아광속 발차기 — 응축(2초) 중에는 완전히 고정된다
    if (p.dKickCharging && loopNow < (p.dKickChargeEnd || 0)) {
        p.moveX = 0; p.moveY = 0; p.knockbackForce = 0; p.vy = 0;
        return;
    }
    if (p.dKickCharging && p.dKickChargeEnd && loopNow >= p.dKickChargeEnd) {
        // 서버가 launchKick 을 보내기 전이라도 로컬은 응축을 풀어 준다
        p.dKickCharging = false;
    }

    // ⬛💫 [신규] 아광속 발차기 — 빛으로 변해 5초간 자유 비행
    //    · 중력 없음 (점프 불필요)
    //    · 조이스틱 방향으로만 이동
    //    · 가로 발판은 통과, 세로벽(solid)은 통과 불가
    if (p.dKickFlying && loopNow < (p.dKickFlyEnd || 0)) {
        const S3 = (window.GameData && window.GameData.Skills) ? window.GameData.Skills.DABURA_S3 : null;
        let baseMult = (window.GameData && window.GameData.Characters && window.GameData.Characters.DABURA)
                     ? (window.GameData.Characters.DABURA.speedMult || 1.1) : 1.1;
        // ⬛ ■ 장착 시 1.5배 → 2배
        let kickMult = p.hasSquare
            ? ((S3 && S3.sqSpeedMult) ? S3.sqSpeedMult : 2.0)
            : ((S3 && S3.speedMult) ? S3.speedMult : 1.5);

        let jx = window.joyX || 0;
        let jy = window.joyY || 0;
        let jl = Math.hypot(jx, jy);
        // 조이스틱이 중립이면 바라보는 방향으로 계속 날아간다
        if (!fin(jl) || jl < 0.05) { jx = (p.lastFacing === -1) ? -1 : 1; jy = 0; jl = 1; }
        jx /= jl; jy /= jl;

        if (jx > 0) p.lastFacing = 1; else if (jx < 0) p.lastFacing = -1;

        let flyPrevX = p.x;
        let flyPrevY = p.y;
        let step = (10 * ms) * baseMult * kickMult;

        p.x += jx * step;
        p.y += jy * step;
        p.vy = 0; p.knockbackForce = 0;
        p.moveX = 0; p.moveY = 0;

        // 💫 빛의 잔상
        if (window.visualFX) {
            window.visualFX.push({
                type: 'dabura_kick_trail', x: p.x, y: p.y,
                ownerId: p.id, square: !!p.hasSquare,
                durationMs: 360, life: 22, maxLife: 22
            });
        }

        // 🧱 세로벽은 통과 불가
        window.resolveSideCollision(p, flyPrevX);
        window.pushOutOfSolid(p);

        // ⚫ 암흑 왕좌 안이라면 구역 밖으로 나가지 않는다
        clampToSpecialArea(p, flyPrevX);

        let wWidthFly = window.WORLD_WIDTH || 50000;
        if (p.x < 50) p.x = 50; if (p.x > wWidthFly - 50) p.x = wWidthFly - 50;

        // 🌍 지면 아래로는 내려가지 않는다
        let gYf = window.GROUND_Y || 2000;
        if (p.y > gYf - 45) { p.y = gYf - 45; p.jumpCount = 2; }
        // ☁️ 너무 높이 올라가지 않도록 상한
        if (p.y < -3400) p.y = -3400;

        sanitize(p);
        return;
    }
    if (p.dKickFlying && p.dKickFlyEnd && loopNow >= p.dKickFlyEnd) p.dKickFlying = false;

    // ⚫ 크로우즈에 끌려가는 중
    if (loopNow < (p.crowsPullUntil || 0)) {
        p.moveX = 0; p.moveY = 0; p.knockbackForce = 0; p.vy = 0;
        let tx = (fin(p.crowsTargetX) && p.crowsTargetX !== 0) ? p.crowsTargetX : p.x;
        let ty = (fin(p.crowsTargetY) && p.crowsTargetY !== 0) ? p.crowsTargetY : p.y;
        let dx = tx - p.x, dy = ty - p.y;
        let dist = Math.hypot(dx, dy);
        let step = 210 * ms;
        if (dist <= step || dist === 0) { p.x = tx; p.y = ty; }
        else { p.x += (dx / dist) * step; p.y += (dy / dist) * step; }
        if (window.visualFX && Math.random() < 0.95) window.visualFX.push({ type: 'crows_trail', x: p.x, y: p.y, life: 16, maxLife: 16 });
        return;
    }
    // 🛟 만료된 잔재 즉시 정리
    if (p.crowsPullUntil && loopNow >= p.crowsPullUntil) p.crowsPullUntil = 0;

    // ⚡🔮 환수호박 전격 돌진 중
    //    조이스틱 방향으로 아주 빠르게 이동하며, 전류 잔상을 남긴다.
    if (loopNow < (p.amberDashUntil || 0)) {
        const KS3 = (window.GameData && window.GameData.Skills) ? window.GameData.Skills.KASHIMO_S3 : null;
        let dashSpd = (KS3 && KS3.dashSpeed) ? KS3.dashSpeed : 24;
        let ux = fin(p.amberDashDirX) ? p.amberDashDirX : ((p.lastFacing === -1) ? -1 : 1);
        let uy = fin(p.amberDashDirY) ? p.amberDashDirY : 0;
        let ln = Math.hypot(ux, uy);
        if (!fin(ln) || ln < 0.001) { ux = (p.lastFacing === -1) ? -1 : 1; uy = 0; ln = 1; }
        ux /= ln; uy /= ln;

        let dashPrevX = p.x;
        p.x += ux * dashSpd * ms;
        p.y += uy * dashSpd * ms;
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0; p.moveY = 0;

        // ⚡ 전류 잔상 (돌진 중에만 나온다)
        if (window.visualFX) {
            window.visualFX.push({
                type: 'kashimo_amber_trail', x: p.x, y: p.y,
                ownerId: p.id,
                durationMs: 380, life: 23, maxLife: 23
            });
        }

        window.resolveSideCollision(p, dashPrevX);
        // ⚫ 암흑 왕좌 안이라면 구역 밖으로 나가지 않는다
        clampToSpecialArea(p, dashPrevX);

        let wWidthDash = window.WORLD_WIDTH || 50000;
        if (p.x < 50) p.x = 50; if (p.x > wWidthDash - 50) p.x = wWidthDash - 50;

        // 지면 아래로는 내려가지 않는다
        let gY = window.GROUND_Y || 2000;
        if (p.y > gY - 45) { p.y = gY - 45; p.jumpCount = 2; }

        sanitize(p);
        return;
    }
    if (p.amberDashUntil && loopNow >= p.amberDashUntil) p.amberDashUntil = 0;

    // ⚡🔮 음파 응축(0.5초) 중에는 완전히 고정된다
    if (loopNow < (p.sonicChargeUntil || 0)) {
        p.moveX = 0; p.moveY = 0; p.knockbackForce = 0; p.vy = 0;
        return;
    }
    if (p.sonicChargeUntil && loopNow >= p.sonicChargeUntil) p.sonicChargeUntil = 0;

    // 🍈 어둠 흡수(시전자·대상) · 파공아 시전 경직 중에는 완전히 고정된다
    if (loopNow < (p.yamiLockUntil || 0) || loopNow < (p.yamiBindUntil || 0) || loopNow < (p.guraChargeUntil || 0)) {
        p.moveX = 0; p.moveY = 0; p.knockbackForce = 0; p.vy = 0;
        return;
    }
    if (p.yamiLockUntil && loopNow >= p.yamiLockUntil) p.yamiLockUntil = 0;
    if (p.yamiBindUntil && loopNow >= p.yamiBindUntil) p.yamiBindUntil = 0;
    if (p.guraChargeUntil && loopNow >= p.guraChargeUntil) p.guraChargeUntil = 0;

    // ⚡ 에넬 엘 토르 시전 중
    if (p.characterType === 'ENEL' && loopNow < (p.elThorLockUntil || 0)) {
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0; p.moveY = 0;
        return;
    }
    if (p.elThorLockUntil && loopNow >= p.elThorLockUntil) p.elThorLockUntil = 0;

    // ⚡ 뇌영에 끌려 내려가는 중
    if (loopNow < (p.raigoPullUntil || 0)) {
        p.moveX = 0; p.moveY = 0; p.knockbackForce = 0;
        let rgGround = window.GROUND_Y || 2000;
        if (p.y < rgGround - 45) {
            p.vy = 45 * ms;
            p.y += p.vy;
            if (p.y >= rgGround - 45) { p.y = rgGround - 45; p.vy = 0; p.jumpCount = 2; }
        } else {
            p.y = rgGround - 45; p.vy = 0; p.jumpCount = 2;
        }
        return;
    }
    if (p.raigoPullUntil && loopNow >= p.raigoPullUntil) p.raigoPullUntil = 0;

    // ⚡ 엘 토르 피격 경직
    if (loopNow < (p.airFreezeUntil || 0)) {
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0; p.moveY = 0;
        return;
    }
    if (p.airFreezeUntil && loopNow >= p.airFreezeUntil) p.airFreezeUntil = 0;

    // 🚨 야타의 거울 '빔 대시' 이동 중
    if (p.yataActive) {
        let dur = (window.GameData.Skills.BORSALINO_S2 && window.GameData.Skills.BORSALINO_S2.castTime) || 3000;
        let started = fin(p.yataStartTime) ? p.yataStartTime : loopNow;
        let elapsed = loopNow - started;

        // 🛟 경로가 없거나 시전 시간이 크게 지났으면 강제 종료 (영구 잠금 차단)
        if (!p.yataPath || p.yataPath.length < 2 || elapsed > dur + 2000) {
            p.yataActive = false; p.yataPath = null; p.yataCanceling = false;
            p.isCasting = false; p.castLockUntil = 0;
            p.vy = 0; p.knockbackForce = 0;
        } else {
            p.yataProgress = Math.min(1, elapsed / dur);
            let pos = window.sampleYataPath(p.yataPath, p.yataProgress);
            // ⚫🔥 [버그 수정] 별세계 경계는 '이동 전 좌표' 로 판정해야 한다.
            //    예전에는 좌표를 먼저 옮긴 뒤 clampToSpecialArea(p) 를 불렀는데,
            //    그때는 이미 구역 밖이라 어떤 별세계에도 속하지 않아 그냥 통과했다.
            //    (야타로 스쿠나 맵에서 튕겨 나가던 진짜 원인)
            let yPrevX = p.x, yPrevY = p.y;
            if (pos && fin(pos.x) && fin(pos.y)) { p.x = pos.x; p.y = pos.y; }
            p.vy = 0; p.knockbackForce = 0; p.moveX = 0;
            clampToSpecialArea(p, yPrevX);
            // 🛟 그래도 벗어났다면(경로가 통째로 밖이면) 이동 자체를 취소한다
            if (inDarkZoneX(yPrevX) && !inDarkZoneX(p.x)) { p.x = yPrevX; p.y = yPrevY; }
            if (inCurseZoneX(yPrevX) && !inCurseZoneX(p.x)) { p.x = yPrevX; p.y = yPrevY; }
            if (window.visualFX && Math.random() < 0.7) window.visualFX.push({ type: 'yata_trail', x: p.x, y: p.y, life: 14, maxLife: 14, dir: p.lastFacing });
            return;
        }
    }

    // 🌟 볼사리노 빛 돌진
    if (p.characterType === 'BORSALINO' && loopNow < (p.lightDashUntil || 0)) {
        let dashPrevX = p.x;
        p.x += (p.lightDashDir || 1) * 30 * ms;
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0;
        if (window.visualFX && Math.random() < 0.9) window.visualFX.push({ type: 'yata_trail', x: p.x, y: p.y, life: 12, maxLife: 12, dir: p.lightDashDir || 1 });
        window.resolveSideCollision(p, dashPrevX);
        // ⚫ 암흑 왕좌 안이라면 구역 밖으로 나가지 않는다
        clampToSpecialArea(p, dashPrevX);
        let wWidthDash = window.WORLD_WIDTH || 50000;
        if (p.x < 50) p.x = 50; if (p.x > wWidthDash - 50) p.x = wWidthDash - 50;
        return;
    }
    if (p.lightDashUntil && loopNow >= p.lightDashUntil) p.lightDashUntil = 0;

    // ⬛☀️ [신규] 빛 — 시전 순간 위로 솟구친다
    //    riseUntil 까지는 조이스틱 입력을 무시하고 위로만 올라간다.
    if (p.dLightActive && loopNow < (p.dLightRiseUntil || 0)) {
        const S1 = (window.GameData && window.GameData.Skills) ? window.GameData.Skills.DABURA_S1 : null;
        let riseDist = (S1 && S1.riseDist) ? S1.riseDist : 189;
        let riseTime = (S1 && S1.riseTime) ? S1.riseTime : 180;
        // 프레임당 상승량 (60fps 기준)
        let perFrame = riseDist / Math.max(1, (riseTime / (1000 / 60)));

        p.y -= perFrame;
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0; p.moveY = 0;

        if (window.visualFX && Math.random() < 0.85) {
            window.visualFX.push({
                type: 'dabura_light_rise', x: p.x, y: p.y,
                ownerId: p.id, square: !!p.hasSquare,
                durationMs: 300, life: 18, maxLife: 18
            });
        }

        clampToSpecialArea(p);
        if (p.y < -3400) p.y = -3400;
        sanitize(p);
        return;
    }

    // ⬛☀️ [수정] 빛 — 솟구친 뒤에는 폭발이 끝날 때까지 '공중에 완전히 고정'된다.
    //    중력을 적용하지 않고 좌표를 그대로 유지해, 빛을 쏘는 2초 동안 떠 있는다.
    if (p.dLightActive && loopNow < (p.dLightEnd || 0)) {
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0; p.moveY = 0;

        clampToSpecialArea(p);
        if (p.y < -3400) p.y = -3400;
        sanitize(p);
        return;
    }
    // 🛟 만료된 잔재 정리
    if (p.dLightActive && p.dLightEnd && loopNow >= p.dLightEnd) {
        p.dLightActive = false; p.dLightEnd = 0; p.dLightRiseUntil = 0;
    }

    // ⬛🌑 [수정] 어둠 — 시전자는 3초 동안 그 자리에 완전히 고정된다.
    if (p.dDarkActive && loopNow < (p.dDarkEnd || 0)) {
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0; p.moveY = 0;

        clampToSpecialArea(p);
        sanitize(p);
        return;
    }
    // 🛟 만료된 잔재 정리
    if (p.dDarkActive && p.dDarkEnd && loopNow >= p.dDarkEnd) {
        p.dDarkActive = false; p.dDarkEnd = 0;
    }

    // 🛟 [핵심] 근거 없는 시전 잠금을 여기서 끊어 준다.
    if (p.isCasting && !(loopNow < (p.castLockUntil || 0))) {
        p.isCasting = false;
        p.castLockUntil = 0;
        p.skill3Active = false;
        p.iceAgeActive = false;
    }
    // 🛟 대시 잠금도 만료 시각으로 함께 검사한다
    if (p.skill1Dashing && p.dashLockUntil && loopNow >= p.dashLockUntil) {
        p.skill1Dashing = false; p.dashLockUntil = 0; p.moveX = 0;
    }

    // 🚨 볼사리노 그 외 스킬 시전 중 위치 100% 고정
    if (p.characterType === 'BORSALINO' && (p.isCasting || loopNow < p.frozenUntil)) {
        p.vy = 0; 
        p.knockbackForce = 0;
        return; 
    }

    let speed = p.speedMult || 1.0;

    // 🧲 [키드] 어사인의 고철이 쌓일수록 느려진다 (100% → 25%)
    if (p.kidSlow !== undefined && p.kidSlow < 1) speed *= Math.max(0, p.kidSlow);
    // 🗿 [키드] 고철 골렘 상태에서는 이동속도 1.5배
    if (p.kidGolemEnd && loopNow < p.kidGolemEnd) speed *= 1.5;
    // 🦾 [기계 의수] 자기장 안에서는 이동속도 절반
    if (p.kidFieldUntil && loopNow < p.kidFieldUntil) speed *= 0.5;
    // ❄️ [아이스 글러브] 착용 중에는 이동속도 +35%
    if (p.kzGloveEnd && loopNow < p.kzGloveEnd) speed *= 1.35;
    
    let charType = p.characterType || 'BORSALINO';
    let skillId2 = (charType === 'BORSALINO') ? 'BORSALINO_S2' : 'PARK_S2';
    
    if (loopNow < p.skill2EndTime) {
        let sb = (window.GameData && window.GameData.Skills && window.GameData.Skills[skillId2]) ? window.GameData.Skills[skillId2].speedBoost : 0.3;
        speed += (sb || 0);
    }

    // ⚡🔮 환수호박 : 몸이 전기 덩어리로 변해 이동속도가 1.3배가 된다.
    if (charType === 'KASHIMO' && p.amberActive) {
        const KS3 = (window.GameData && window.GameData.Skills) ? window.GameData.Skills.KASHIMO_S3 : null;
        const amberMult = (KS3 && KS3.speedMult) ? KS3.speedMult : 1.3;
        const baseMult = (window.GameData && window.GameData.Characters && window.GameData.Characters.KASHIMO)
                       ? (window.GameData.Characters.KASHIMO.speedMult || 1.0) : 1.0;
        if (speed < baseMult * amberMult * 0.95) speed *= amberMult;
    }
    
    if (loopNow < p.frozenUntil || p.isCasting) { speed = 0; p.moveX = 0; } 
    else { 
        if (loopNow < slowUntil) speed *= 0.1; 
        if (loopNow < p.slowNerfUntil) speed *= 0.6; 
        // 🌊 암흑물질 장판(블랙홀) 시전 중에는 이동속도가 0.3배로 느려진다
        if (typeof window.isDarkFloorActiveFor === 'function' && window.isDarkFloorActiveFor(p)) speed *= 0.3;
    }

    if (p.skill1Dashing) { p.moveX = p.dashDir * 2.5; speed = 1.0; }
    
    if (isNaN(p.x)) p.x = 10800;
    if (isNaN(p.y)) p.y = 1955;
    if (isNaN(p.vy)) p.vy = 0;
    if (!fin(speed)) speed = 1.0;                 // 🛟 속도 오염 차단

    let prevX = p.x;
    let prevY = p.y;

    p.x += p.moveX * (10 * ms) * speed; 

    // 🕊️ [쿠루스 하나] 점프가 없고 활공만 한다.
    //    · 버튼을 누르고 있으면 점점 느리게 위로 떠오른다 (올라갈수록 감속)
    //    · 손가락을 떼면 천천히 아래로 내려온다 (일반 중력의 1/4)
    if (p.characterType === 'KURUSU') {
        const groundY = (window.GameData && window.GameData.Map ? window.GameData.Map.GROUND_Y : 2000) - 45;
        if (p.kurusuGliding) {
            // 높이 올라갈수록 상승이 둔해진다
            const climbed = Math.max(0, groundY - p.y);
            const slow = 1 / (1 + climbed / 700);
            p.vy = -6.2 * ms * slow;
        } else {
            p.vy += (0.14 * ms * ms);          // 부드럽게 하강
            const maxFall = 5.0 * ms;
            if (p.vy > maxFall) p.vy = maxFall;
        }
        p.y += p.vy;
        p.jumpCount = 0;                        // 점프는 영원히 불가
    } else {
        p.vy += (0.56 * ms * ms); 
        p.y += p.vy;
    }

    // ⬛🌑 [신규] 어둠 소용돌이에 끌려간다
    //    · 서버가 보내 준 중심 좌표로 매 프레임 조금씩 당겨진다.
    //    · 끌림 세기(pull)는 기본 이동속도보다 약간 작아 '겨우' 빠져나갈 수 있다.
    //    · 벽을 통과하지는 못한다 (아래 resolveSideCollision 이 처리).
    if (loopNow < (p.darkPullUntil || 0)) {
        const S2 = (window.GameData && window.GameData.Skills) ? window.GameData.Skills.DABURA_S2 : null;
        let pullBase = fin(p.darkPullPower) ? p.darkPullPower : ((S2 && S2.pull) ? S2.pull : 7.4);
        let tx = fin(p.darkPullX) ? p.darkPullX : p.x;
        let ty = fin(p.darkPullY) ? p.darkPullY : p.y;
        let dx = tx - p.x, dy = ty - p.y;
        let dist = Math.hypot(dx, dy);
        if (dist > 6) {
            let step = Math.min(dist, pullBase * ms);
            p.x += (dx / dist) * step;
            p.y += (dy / dist) * step;
            // 소용돌이에 휘말리는 동안에는 낙하가 완화된다 (공중에 붕 뜬 느낌)
            if (p.vy > 0) p.vy *= 0.55;
        }
    }
    if (p.darkPullUntil && loopNow >= p.darkPullUntil) p.darkPullUntil = 0;

    if (p.knockbackForce !== 0) { p.x += p.knockbackForce * ms; p.knockbackForce *= 0.85; if (Math.abs(p.knockbackForce) < 1) p.knockbackForce = 0; }

    // 🛟 이번 프레임 계산이 오염됐다면 이전 좌표로 되돌린다
    if (!fin(p.x)) { p.x = prevX; }
    if (!fin(p.y)) { p.y = prevY; p.vy = 0; }
    if (!fin(p.knockbackForce)) p.knockbackForce = 0;

    let groundY = window.GROUND_Y || 2000;

    // 🪨 스윕(경로) 착지 판정
    if (p.vy >= 0 && window.PLATFORMS) {
        let prevFeetY = prevY + 45;
        let curFeetY = p.y + 45;
        let landPlat = null;

        for (let plat of window.PLATFORMS) {
            if (p.x < plat.x || p.x > plat.x + plat.w) continue;

            let oldHit = (curFeetY >= plat.y && curFeetY <= plat.y + 30);
            let sweptHit = (prevFeetY <= plat.y + 2 && curFeetY >= plat.y);
            if (!oldHit && !sweptHit) continue;

            if (!landPlat || plat.y < landPlat.y) landPlat = plat;
        }

        if (landPlat) {
            p.y = landPlat.y - 45; p.vy = 0; p.jumpCount = 2;
            if (p.skill1Dashing) { p.skill1Dashing = false; p.dashLockUntil = 0; p.moveX = 0; if (window.socket && p.id === window.myId) { window.visualFX.push({ x: p.x, y: p.y, life: 30, maxLife: 30, type: 'huge_wind_burst', isLeft: p.lastFacing === -1, team: p.team, dir: p.lastFacing }); window.socket.emit('landSkill1', { x: p.x, y: p.y, dir: p.lastFacing }); } }
        }
    }
    
    if (p.y >= groundY - 45) { 
        p.y = groundY - 45; 
        if (p.vy > 0) { 
            p.vy = 0; p.jumpCount = 2; 
            if (p.skill1Dashing) { p.skill1Dashing = false; p.dashLockUntil = 0; p.moveX = 0; if (window.socket && p.id === window.myId) { window.visualFX.push({ x: p.x, y: p.y, life: 30, maxLife: 30, type: 'huge_wind_burst', isLeft: p.lastFacing === -1, team: p.team, dir: p.lastFacing }); window.socket.emit('landSkill1', { x: p.x, y: p.y, dir: p.lastFacing }); } }
        } 
    }

    // 🧱 좌우 벽 충돌
    window.resolveSideCollision(p, prevX);
    
    let wWidth = window.WORLD_WIDTH || 50000;
    if (p.x < 50) p.x = 50; if (p.x > wWidth - 50) p.x = wWidth - 50;

    // 🛡️ [마르코 · 불사 엉겅퀴] 보호막은 벽이다.
    //    아군을 뺀 모든 대상이 통과할 수 없다 (세로로 긴 타원).
    if (window.serverPlayers || window.players) {
        const all = window.players || {};
        for (const sid in all) {
            const sp = all[sid];
            if (!sp || !sp.marcoShieldEnd || loopNow >= sp.marcoShieldEnd) continue;
            if (sp.team === p.team) continue;                 // 아군은 통과
            const RX = 120, RY = (sp.marcoShieldRY || 260);
            // 🧭 벽은 바라보는 방향으로 돌아가 있다 — 판정도 같은 각도로 회전
            const wa = Math.atan2(
        (sp.marcoShieldDY === undefined ? 0 : sp.marcoShieldDY),
        (sp.marcoShieldDX === undefined ? 1 : sp.marcoShieldDX));
            const ca = Math.cos(-wa), sa = Math.sin(-wa);
            const rdx = p.x - sp.marcoShieldX, rdy = p.y - sp.marcoShieldY;
            let ddx = rdx * ca - rdy * sa;
            let ddy = rdx * sa + rdy * ca;
            const n = (ddx * ddx) / (RX * RX) + (ddy * ddy) / (RY * RY);
            if (n < 1 && n > 0) {
                // 타원 표면으로 밀어낸 뒤 원래 좌표계로 되돌린다
                const k = 1 / Math.sqrt(n);
                ddx *= k * 1.02; ddy *= k * 1.02;
                const cb = Math.cos(wa), sb = Math.sin(wa);
                p.x = sp.marcoShieldX + (ddx * cb - ddy * sb);
                p.y = sp.marcoShieldY + (ddx * sb + ddy * cb);
                p.knockbackForce = 0;
            }
        }
    }

    // ⚫🔥 별세계 경계 — 암흑 왕좌 · 저주의 왕 밖으로 나갈 수 없다.
    //    야타의 거울 같은 순간이동으로 튕겨 나가던 문제를 여기서 최종 차단한다.
    //    (이동 전 좌표로 판정해, 별세계 안에 있던 사람만 가둔다)
    clampToSpecialArea(p, prevX);

    // 🚧 [유명이경 역월] 영역 벽 — 안에서 밖으로도, 밖에서 안으로도 넘어갈 수 없다.
    //    서버가 최종 판정하지만 여기서도 같은 계산을 해야 화면이 튀지 않는다.
    applyDomainWall(p, prevX, prevY);

    // 🛟 마지막 안전망 — 여기까지 와서도 오염됐다면 기지 앞으로 되돌린다
    sanitize(p);
};

/**
 * 🚧 [유명이경 역월] 영역 벽 판정
 *    · 영역 안에 있던 사람은 밖으로 나갈 수 없다.
 *    · 영역 밖에 있던 사람은 안으로 들어올 수 없다.
 *    · 붕괴 중인 영역은 벽이 이미 풀린 것으로 본다.
 *
 *    prevX/prevY (이동 전 좌표) 로 '안에 있었는지' 를 판단하므로,
 *    영역이 펼쳐지는 순간 안에 있던 사람은 계속 안에, 밖은 계속 밖에 남는다.
 */
const DOMAIN_WALL_MARGIN = 6;

function applyDomainWall(p, prevX, prevY) {
    let list = (typeof window !== 'undefined' && window.serverDomains) ? window.serverDomains : null;
    if (!list || !list.length || !p) return;

    for (let i = 0; i < list.length; i++) {
        let dm = list[i];
        if (!dm || dm.phase === 'collapse') continue;

        const R = dm.radius;
        const wasInside = Math.hypot(prevX - dm.x, prevY - dm.y) <= R;

        let dx = p.x - dm.x, dy = p.y - dm.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.0001) { dx = 1; dy = 0; dist = 1; }

        if (wasInside && dist > R - DOMAIN_WALL_MARGIN) {
            let k = (R - DOMAIN_WALL_MARGIN) / dist;
            p.x = dm.x + dx * k; p.y = dm.y + dy * k;
        } else if (!wasInside && dist < R + DOMAIN_WALL_MARGIN) {
            let k = (R + DOMAIN_WALL_MARGIN) / dist;
            p.x = dm.x + dx * k; p.y = dm.y + dy * k;
        }
    }
}