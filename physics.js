// physics.js - 물리 엔진 (야타의 거울 '빔 대시' 이동 반영 + 좌우 벽 충돌)
//
// 🪨 [수정] 고속 낙하 시 발판을 뚫고 지나가던 터널링 버그 수정
//    기존: 이번 프레임의 '발 위치'가 발판 윗면 30px 안에 들어와야만 착지 판정
//          → 낙하 속도가 30px/프레임을 넘으면 발판을 그냥 통과해 버렸다.
//          (바구니 y=-1400 에서 지상 y=2000 까지 낙하하면 속도가 90px/프레임을 넘는다)
//    수정: 이동 '이전 Y'와 '이후 Y' 사이를 스윕(경로) 판정해, 경로가 발판 윗면을
//          가로질렀으면 무조건 착지시킨다. (기존 30px 판정도 그대로 병행 유지)
// ⚫ [검은수염] 크로우즈에 끌려가는 동안 검은수염 쪽으로 강제 이동 (이동/스킬 불가)
//    ✅ [수정] 끌려가는 속도를 75 → 210 으로 대폭 상향 (빠르게 빨려 들어간다)

window.initPhysicsTerrain = () => {
    if (!window.GameData || !window.GameData.Map) return;
    
    window.WORLD_WIDTH = window.GameData.Map.WORLD_WIDTH || 32000;
    window.WORLD_HEIGHT = window.GameData.Map.WORLD_HEIGHT || 3000;
    window.GROUND_Y = window.GameData.Map.GROUND_Y || 2000;
    window.VIEW_SCALE = window.GameData.Map.VIEW_SCALE || 0.5;

    window.PLATFORMS = window.GameData.Map.Platforms ? JSON.parse(JSON.stringify(window.GameData.Map.Platforms)) : [];
    window.PLATFORMS = window.PLATFORMS.filter(p => p.type !== 'jungle'); 
    
    const blueData = window.GameData.Map.JungleBlueData || [];
    blueData.forEach(pos => {
        window.PLATFORMS.push({ x: pos.x, y: pos.y, w: 1000, h: 30, type: 'jungle' });
        window.PLATFORMS.push({ x: window.WORLD_WIDTH - pos.x - 1000, y: pos.y, w: 1000, h: 30, type: 'jungle' }); 
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
//    (기존 일반 발판/정글 발판은 예전 그대로 위에서만 착지되는 통과형으로 유지)
window.resolveSideCollision = (p, prevX) => {
    if (!window.PLATFORMS) return;
    const HALF_W = 45;

    for (let plat of window.PLATFORMS) {
        if (!plat.solid) continue;

        let feetY = p.y + 45;
        let headY = p.y - 45;

        // 벽 위에 올라서 있는 경우(발밑 == 벽 상단)는 측면 충돌로 보지 않는다.
        if (feetY <= plat.y + 4) continue;
        if (headY >= plat.y + plat.h) continue;

        // 가로 겹침이 없으면 통과
        if (p.x + HALF_W <= plat.x) continue;
        if (p.x - HALF_W >= plat.x + plat.w) continue;

        // 진입 방향에 따라 벽 바깥으로 밀어낸다.
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
        let step = 210 * ms;                       // ✅ [수정] 75 → 210 : 훨씬 빠르게 빨려 들어간다
        if (dist <= step || dist === 0) { p.x = tx; p.y = ty; }
        else { p.x += (dx / dist) * step; p.y += (dy / dist) * step; }
        if (window.visualFX && Math.random() < 0.95) window.visualFX.push({ type: 'crows_trail', x: p.x, y: p.y, life: 16, maxLife: 16 });
        return;
    }

    // ⚡ 에넬 엘 토르 시전 중: 2초간 완전 고정 (공중이면 공중에 뜬 채로 정지)
    if (p.characterType === 'ENEL' && loopNow < (p.elThorLockUntil || 0)) {
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0; p.moveY = 0;
        return;
    }

    // ⚡ 뇌영에 끌려 내려가는 중: 강제 하강 + 이동/스킬 불가 (4초 내내)
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

    // ⚡ 엘 토르 피격 경직: 공중에서도 뜬 채로 고정 (중력 무시)
    if (loopNow < (p.airFreezeUntil || 0)) {
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0; p.moveY = 0;
        return;
    }

    // 🚨 야타의 거울 '빔 대시' 이동 중: 일반 물리를 무시하고 지그재그 경로를 따라 전진
    if (p.yataActive && p.yataPath) {
        let dur = (window.GameData.Skills.BORSALINO_S2 && window.GameData.Skills.BORSALINO_S2.castTime) || 3000;
        let elapsed = loopNow - (p.yataStartTime || loopNow);
        p.yataProgress = Math.min(1, elapsed / dur);
        let pos = window.sampleYataPath(p.yataPath, p.yataProgress);
        if (pos) { p.x = pos.x; p.y = pos.y; }
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0;
        // 잔상 트레일
        if (window.visualFX && Math.random() < 0.7) window.visualFX.push({ type: 'yata_trail', x: p.x, y: p.y, life: 14, maxLife: 14, dir: p.lastFacing });
        return; // 종료(복귀/폭발)는 main.js 루프가 판정
    }

    // 🌟 볼사리노 빛 돌진: 연속 평타 5회(빠른 간격)로 발동 — 짧게 앞으로 순간 돌진
    if (p.characterType === 'BORSALINO' && loopNow < (p.lightDashUntil || 0)) {
        let dashPrevX = p.x;
        p.x += (p.lightDashDir || 1) * 30 * ms;
        p.vy = 0; p.knockbackForce = 0; p.moveX = 0;
        if (window.visualFX && Math.random() < 0.9) window.visualFX.push({ type: 'yata_trail', x: p.x, y: p.y, life: 12, maxLife: 12, dir: p.lightDashDir || 1 });
        window.resolveSideCollision(p, dashPrevX); // 🧱 돌진 중에도 벽은 통과 불가
        let wWidthDash = window.WORLD_WIDTH || 32000;
        if (p.x < 50) p.x = 50; if (p.x > wWidthDash - 50) p.x = wWidthDash - 50;
        return; // 돌진 중엔 일반 물리(중력/이동) 무시
    }

    // 🚨 볼사리노 그 외 스킬 시전 중(팔척경곡옥 등) 위치 100% 고정
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

    let prevX = p.x; // 🧱 측면 충돌 판정을 위한 이동 전 X좌표
    let prevY = p.y; // 🪨 [수정] 발판 관통(터널링) 방지를 위한 이동 전 Y좌표

    p.x += p.moveX * (10 * ms) * speed; 
    p.vy += (0.56 * ms * ms); 
    p.y += p.vy;

    if (p.knockbackForce !== 0) { p.x += p.knockbackForce * ms; p.knockbackForce *= 0.85; if (Math.abs(p.knockbackForce) < 1) p.knockbackForce = 0; }

    let groundY = window.GROUND_Y || 2000;

    // 🪨 [수정] 스윕(경로) 착지 판정
    //    · 기존 판정(발이 발판 윗면 30px 안) 유지 → 기존 조작감/점프 착지 그대로
    //    · + 이동 경로가 발판 윗면을 가로지른 경우도 착지 처리 → 아무리 빨리 떨어져도 관통 불가
    //    · 한 프레임에 여러 발판을 지나쳤다면 '가장 위쪽(먼저 부딪히는)' 발판에 착지시킨다
    if (p.vy >= 0 && window.PLATFORMS) {
        let prevFeetY = prevY + 45;
        let curFeetY = p.y + 45;
        let landPlat = null;

        for (let plat of window.PLATFORMS) {
            if (p.x < plat.x || p.x > plat.x + plat.w) continue;

            let oldHit = (curFeetY >= plat.y && curFeetY <= plat.y + 30);            // 기존 판정
            let sweptHit = (prevFeetY <= plat.y + 2 && curFeetY >= plat.y);          // 🪨 추가된 경로 판정
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

    // 🧱 좌우 벽 충돌 (착지 판정 이후에 처리해야 벽 위에 올라선 상태가 오작동하지 않음)
    window.resolveSideCollision(p, prevX);
    
    let wWidth = window.WORLD_WIDTH || 32000;
    if (p.x < 50) p.x = 50; if (p.x > wWidth - 50) p.x = wWidth - 50;
};