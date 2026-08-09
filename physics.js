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
// 🛟 [게임 멈춤 방지]
//   모든 조기 return 구간에 '만료 시각' 조건을 함께 검사한다.
//   근거가 사라지면 그 자리에서 잠금을 풀고 정상 물리로 넘어간다.
//   좌표가 NaN 으로 오염되면 즉시 복구한다.

// ⚫ 암흑 왕좌 구역 상수 (gameState.js 와 동일)
const DZ_MIN = 35400, DZ_MAX = 41600;
const DA_MIN_X = 36000, DA_MAX_X = 41000;
const DA_GROUND = 2000, DA_CEIL = 600;

/** ⚫ 암흑 왕좌 구역 안에 있는 좌표인가 */
function inDarkZoneX(x) { return x >= DZ_MIN && x <= DZ_MAX; }

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
    
    let baseWidth = window.GameData.Map.WORLD_WIDTH || 42000;
    window.WORLD_WIDTH = Math.max(baseWidth, 42000);
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

window.updatePlayerPhysics = (p, slowUntil, loopNow, visualFX) => {
    let ms = (window.GameData && window.GameData.Settings) ? window.GameData.Settings.MOVEMENT_SPEED : 1.0; 

    // 🛟 [최우선] 좌표 오염 복구 — 이후 모든 판정의 전제 조건이다
    sanitize(p);

    // 🗣️ NPC 대화 중에는 완전히 고정된다
    if (p.npcTalking) {
        p.moveX = 0; p.moveY = 0; p.knockbackForce = 0; p.vy = 0;
        return;
    }

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

    // ⚡🔮 [신규] 환수호박 전격 돌진 중
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
        if (inDarkZoneX(dashPrevX)) clampToDarkArea(p);

        let wWidthDash = window.WORLD_WIDTH || 42000;
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
            if (pos && fin(pos.x) && fin(pos.y)) { p.x = pos.x; p.y = pos.y; }
            p.vy = 0; p.knockbackForce = 0; p.moveX = 0;
            // ⚫ 암흑 왕좌 안이라면 절대 구역 밖/바닥 아래로 나가지 않는다
            if (inDarkZoneX(p.x)) clampToDarkArea(p);
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
        if (inDarkZoneX(dashPrevX)) clampToDarkArea(p);
        let wWidthDash = window.WORLD_WIDTH || 42000;
        if (p.x < 50) p.x = 50; if (p.x > wWidthDash - 50) p.x = wWidthDash - 50;
        return;
    }
    if (p.lightDashUntil && loopNow >= p.lightDashUntil) p.lightDashUntil = 0;

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
    
    let charType = p.characterType || 'PARK';
    let skillId2 = (charType === 'BORSALINO') ? 'BORSALINO_S2' : 'PARK_S2';
    
    if (loopNow < p.skill2EndTime) {
        let sb = (window.GameData && window.GameData.Skills && window.GameData.Skills[skillId2]) ? window.GameData.Skills[skillId2].speedBoost : 0.3;
        speed += (sb || 0);
    }

    // ⚡🔮 환수호박 : 몸이 전기 덩어리로 변해 이동속도가 1.3배가 된다.
    //    서버의 speedMult 에도 반영되지만, 내 캐릭터는 로컬 물리로 움직이므로
    //    서버 동기화가 늦어도 즉시 빨라지도록 여기서도 보정한다.
    //    (서버 값이 이미 반영됐다면 중복 적용되지 않도록 플래그로 관리한다)
    if (charType === 'KASHIMO' && p.amberActive) {
        const KS3 = (window.GameData && window.GameData.Skills) ? window.GameData.Skills.KASHIMO_S3 : null;
        const amberMult = (KS3 && KS3.speedMult) ? KS3.speedMult : 1.3;
        const baseMult = (window.GameData && window.GameData.Characters && window.GameData.Characters.KASHIMO)
                       ? (window.GameData.Characters.KASHIMO.speedMult || 1.0) : 1.0;
        // 서버가 이미 배율을 곱해 보냈다면 speedMult 가 기본값보다 충분히 크다.
        // 아직 반영 전(≈ 기본값)이라면 로컬에서 곱해 준다.
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
    p.vy += (0.56 * ms * ms); 
    p.y += p.vy;

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
    
    let wWidth = window.WORLD_WIDTH || 42000;
    if (p.x < 50) p.x = 50; if (p.x > wWidth - 50) p.x = wWidth - 50;

    // 🛟 마지막 안전망 — 여기까지 와서도 오염됐다면 기지 앞으로 되돌린다
    sanitize(p);
};