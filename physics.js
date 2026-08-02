// physics.js - 물리 엔진 (야타의 거울 '빔 대시' 이동 반영 + 좌우 벽 충돌)
//
// 🪨 [수정] 고속 낙하 시 발판을 뚫고 지나가던 터널링 버그 수정 (스윕 판정)
// ⚫ [검은수염] 크로우즈에 끌려가는 동안 검은수염 쪽으로 빠르게 강제 이동
// 🗺️ [수정] 암흑 왕좌가 x 36000~41000 으로 이동함에 따라 월드 폭을 최소 42000 으로 보정.
//    단, 정글 발판 미러링은 '원래 기준 폭(32000)'을 유지해 레드팀 정글 위치가 변하지 않게 한다.

window.initPhysicsTerrain = () => {
    if (!window.GameData || !window.GameData.Map) return;
    
    // 🗺️ 암흑 왕좌(최대 x=41000)까지 담을 수 있도록 월드 폭을 보정한다
    let baseWidth = window.GameData.Map.WORLD_WIDTH || 42000;
    window.WORLD_WIDTH = Math.max(baseWidth, 42000);
    window.WORLD_HEIGHT = window.GameData.Map.WORLD_HEIGHT || 3000;
    window.GROUND_Y = window.GameData.Map.GROUND_Y || 2000;
    window.VIEW_SCALE = window.GameData.Map.VIEW_SCALE || 0.5;

    window.PLATFORMS = window.GameData.Map.Platforms ? JSON.parse(JSON.stringify(window.GameData.Map.Platforms)) : [];
    window.PLATFORMS = window.PLATFORMS.filter(p => p.type !== 'jungle'); 
    
    // ✅ 정글 미러링 기준 폭은 32000 으로 고정 (월드 폭 확장과 무관하게 위치 유지)
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

    // ⚫ 크로우즈에 끌려가는 중: 검은수염 쪽으로 '빠르게' 강제 이동 (조작 전면 봉인)
    if (loopNow < (p.crowsPullUntil || 0)) {
        p.moveX = 0; p.moveY = 0; p.knockbackForce = 0; p.vy = 0;
        let tx = (p.crowsTargetX !== undefined && p.crowsTargetX !== 0) ? p.crowsTargetX : p.x;
        let ty = (p.crowsTargetY !== undefined && p.crowsTargetY !== 0) ? p.crowsTargetY : p.y;
        let dx = tx - p.x, dy = ty - p.y;
        let dist = Math.hypot(dx, dy);
        let step = 210 * ms;
        if (dist <= step || dist === 0) { p.x = tx; p.y = ty; }
        else { p.x += (dx / dist) * step; p.y += (dy / dist) * step; }
        if (window.visualFX && Math.random() < 0.95) window.visualFX.push({ type: 'crows_trail', x: p.x, y: p.y, life: 16, maxLife: 16 });
        return;
    }

    // ⚡ 에넬 엘 토르 시전 중: 2초간 완전 고정
    if (p.characterType === 'ENEL' && loopNow < (p.elThorLockUntil || 0)) {
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0; p.moveY = 0;
        return;
    }

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

    // ⚡ 엘 토르 피격 경직
    if (loopNow < (p.airFreezeUntil || 0)) {
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0; p.moveY = 0;
        return;
    }

    // 🚨 야타의 거울 '빔 대시' 이동 중
    if (p.yataActive && p.yataPath) {
        let dur = (window.GameData.Skills.BORSALINO_S2 && window.GameData.Skills.BORSALINO_S2.castTime) || 3000;
        let elapsed = loopNow - (p.yataStartTime || loopNow);
        p.yataProgress = Math.min(1, elapsed / dur);
        let pos = window.sampleYataPath(p.yataPath, p.yataProgress);
        if (pos) { p.x = pos.x; p.y = pos.y; }
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0;
        if (window.visualFX && Math.random() < 0.7) window.visualFX.push({ type: 'yata_trail', x: p.x, y: p.y, life: 14, maxLife: 14, dir: p.lastFacing });
        return;
    }

    // 🌟 볼사리노 빛 돌진
    if (p.characterType === 'BORSALINO' && loopNow < (p.lightDashUntil || 0)) {
        let dashPrevX = p.x;
        p.x += (p.lightDashDir || 1) * 30 * ms;
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0;
        if (window.visualFX && Math.random() < 0.9) window.visualFX.push({ type: 'yata_trail', x: p.x, y: p.y, life: 12, maxLife: 12, dir: p.lightDashDir || 1 });
        window.resolveSideCollision(p, dashPrevX);
        let wWidthDash = window.WORLD_WIDTH || 42000;
        if (p.x < 50) p.x = 50; if (p.x > wWidthDash - 50) p.x = wWidthDash - 50;
        return;
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
    
    if (loopNow < p.frozenUntil || p.isCasting) { speed = 0; p.moveX = 0; } 
    else { 
        if (loopNow < slowUntil) speed *= 0.1; 
        if (loopNow < p.slowNerfUntil) speed *= 0.6; 
    }

    if (p.skill1Dashing) { p.moveX = p.dashDir * 2.5; speed = 1.0; }
    
    if (isNaN(p.x)) p.x = 10800;
    if (isNaN(p.y)) p.y = 1955;
    if (isNaN(p.vy)) p.vy = 0;

    let prevX = p.x;
    let prevY = p.y;

    p.x += p.moveX * (10 * ms) * speed; 
    p.vy += (0.56 * ms * ms); 
    p.y += p.vy;

    if (p.knockbackForce !== 0) { p.x += p.knockbackForce * ms; p.knockbackForce *= 0.85; if (Math.abs(p.knockbackForce) < 1) p.knockbackForce = 0; }

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
            if (p.skill1Dashing) { p.skill1Dashing = false; p.moveX = 0; if (window.socket && p.id === window.myId) { window.visualFX.push({ x: p.x, y: p.y, life: 30, maxLife: 30, type: 'huge_wind_burst', isLeft: p.lastFacing === -1, team: p.team, dir: p.lastFacing }); window.socket.emit('landSkill1', { x: p.x, y: p.y, dir: p.lastFacing }); } }
        }
    }
    
    if (p.y >= groundY - 45) { 
        p.y = groundY - 45; 
        if (p.vy > 0) { 
            p.vy = 0; p.jumpCount = 2; 
            if (p.skill1Dashing) { p.skill1Dashing = false; p.moveX = 0; if (window.socket && p.id === window.myId) { window.visualFX.push({ x: p.x, y: p.y, life: 30, maxLife: 30, type: 'huge_wind_burst', isLeft: p.lastFacing === -1, team: p.team, dir: p.lastFacing }); window.socket.emit('landSkill1', { x: p.x, y: p.y, dir: p.lastFacing }); } }
        } 
    }

    // 🧱 좌우 벽 충돌
    window.resolveSideCollision(p, prevX);
    
    let wWidth = window.WORLD_WIDTH || 42000;
    if (p.x < 50) p.x = 50; if (p.x > wWidth - 50) p.x = wWidth - 50;
};