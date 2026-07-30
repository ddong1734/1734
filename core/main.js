// main.js - 게임 코어 파이프라인 (루프, 초기화 연결)
//
// ⚠️ [수정 내역 — 2곳]
//  2-A) window.onerror 의 alert() 제거.
//       alert 은 메인 스레드를 완전히 정지시켜 렌더/통신이 모두 멈춘다.
//  1-C) 물리 계산 직전에 window.joyX / joyY 로 moveX / moveY 를 복원.
//       physics.js 의 돌진·야타·엘토르·뇌영·빙결·시전 분기가 p.moveX 를 0으로
//       지우는데, 조이스틱은 손가락이 움직일 때만 값을 쓰므로 그대로 굳어버린다.
//       → 이 2줄로 전 캐릭터의 "조작 불능" 버그가 사라진다. physics.js 는 수정 불필요.

// ★ 2-A 수정: alert 제거
window.onerror = function (message, source, lineno, colno, error) {
    console.error('[ERR]', message, source + ':' + lineno, error);
    return false;
};

const socket = io();
window.socket = socket; 
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

window.ms = (window.GameData && window.GameData.Settings) ? window.GameData.Settings.MOVEMENT_SPEED : 1.0; 

// 🚀 [최적화③] 위치 전송 스로틀 설정
//    기존에는 가만히 서 있어도 초당 60회 playerMove 를 전송했다.
//    → 30Hz(33ms)로 제한하고, 실제로 움직였을 때만 보낸다. (정지 중 트래픽 0)
window.MOVE_SEND_INTERVAL = 33;
window._lastMoveSend = 0;
window._lastSentPos = { x: -999999, y: -999999 };

// 🎞️ [보간] 30Hz 전송으로 생기는 원격 캐릭터의 계단식 움직임을 매 렌더 프레임 보간으로 메운다.
//    p.netX / p.netY = 서버가 알려준 '진짜 좌표', p.x / p.y = 화면에 그릴 '보간된 좌표'
//    LERP_RATE 를 키우면 반응이 빨라지고(덜 부드러움), 낮추면 부드러워진다(약간 지연).
window.LERP_RATE = 0.30;
window.LERP_SNAP_DIST = 600;   // 리스폰/순간이동/야타 종료처럼 크게 튀면 보간 없이 즉시 이동
window._lerpLastTime = 0;

window.interpolateRemotePlayers = (now) => {
    let dt = now - (window._lerpLastTime || now);
    window._lerpLastTime = now;
    if (dt <= 0) return;
    if (dt > 200) dt = 200;   // 탭 복귀 등으로 오래 멈췄던 경우 과보정 방지

    // 프레임레이트에 무관하게 동일한 속도로 수렴하도록 지수 감쇠 계수를 환산 (60Hz 기준값 → dt 기준)
    let k = 1 - Math.pow(1 - window.LERP_RATE, dt / 16.6667);
    let snapSq = window.LERP_SNAP_DIST * window.LERP_SNAP_DIST;

    for (let pid in window.players) {
        if (pid === window.myId) continue;       // 내 캐릭터는 로컬 물리로 직접 계산하므로 제외
        let p = window.players[pid];
        if (!p || p.netX === undefined || p.netY === undefined) continue;

        let dx = p.netX - p.x, dy = p.netY - p.y;
        let distSq = dx * dx + dy * dy;

        if (distSq > snapSq) { p.x = p.netX; p.y = p.netY; continue; }
        if (distSq < 0.01) { p.x = p.netX; p.y = p.netY; continue; }

        p.x += dx * k;
        p.y += dy * k;
    }
};

// 🚀 [최적화⑦] 매 프레임 getElementById 로 조회하던 모달 요소들을 1회만 캐싱한다.
window._modalDom = null;
const getModalDom = () => {
    if (!window._modalDom) {
        window._modalDom = {
            shop: document.getElementById('shopModal'),
            smith: document.getElementById('smithModal'),
            storage: document.getElementById('storageModal'),
            chest: document.getElementById('chestModal'),
            test: document.getElementById('testStorageModal')
        };
    }
    return window._modalDom;
};

window.resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
window.addEventListener('resize', window.resize);
window.resize();

window.showNicknameScreen = () => {
    if (window.reconnectResolved) return;
    window.reconnectResolved = true;
    let rc = document.getElementById('reconnectCheckScreen'); if (rc) rc.style.display = 'none';
    let nk = document.getElementById('nicknameScreen'); if (nk) nk.style.display = 'flex';
};

window.attemptAutoReconnect = () => { 
    if (!window.gameLoopStarted) socket.emit('attemptReconnect', { sessionId: window.mySessionId }); 
};

if (typeof window.initNetwork === 'function') window.initNetwork(socket);

socket.on('connect', window.attemptAutoReconnect);
if (socket.connected) window.attemptAutoReconnect();
socket.on('reconnectUnavailable', window.showNicknameScreen);

document.getElementById('btn-confirm-name').addEventListener('click', () => { 
    let input = document.getElementById('nicknameInput').value.trim(); 
    if(!input) return; 
    window.myNickname = input; 
    let selectedCharEl = document.querySelector('input[name="charSelect"]:checked');
    let selectedChar = selectedCharEl ? selectedCharEl.value : 'PARK';
    document.getElementById('nicknameScreen').style.display = 'none'; 
    document.getElementById('lobbyScreen').style.display = 'flex'; 
    
    socket.emit('joinLobby', { nickname: window.myNickname, character: selectedChar, sessionId: window.mySessionId }); 
});

document.getElementById('btn-start-battle').addEventListener('click', () => socket.emit('startGame'));

document.getElementById('btn-enter-battlefield').addEventListener('click', async () => { 
    if (window.gameLoopStarted) return; 
    document.getElementById('forceStartOverlay').style.display = 'none'; 
    try { await document.documentElement.requestFullscreen(); await screen.orientation.lock('landscape'); } catch(e){} 
    
    canvas.style.display = 'block'; 
    document.getElementById('mobileControls').style.display = 'block'; 
    document.getElementById('topUI').style.display = 'block'; 
    document.getElementById('goldUI').style.display = 'block'; 
    
    window.players = window.pendingServerPlayers; 
    // 🎞️ [보간] 초기 진입 시점의 좌표를 보간 목표값으로 동기화 (안 하면 첫 프레임에 원점으로 튐)
    for (let pid in window.players) { let sp = window.players[pid]; sp.netX = sp.x; sp.netY = sp.y; }

    window.myId = socket.id; 
    if(window.players[window.myId]) { Object.assign(window.myPlayer, window.players[window.myId]); } 
    
    if (typeof window.applySkillNames === 'function') window.applySkillNames();
    // 🚀 [최적화⑦] applySkillNames 가 버튼 내부를 다시 구성하므로 캐시를 한 번 비워 안전하게 재해석시킨다.
    if (typeof window.invalidateCdCache === 'function') window.invalidateCdCache();
    if (typeof window.initPhysicsTerrain === 'function') window.initPhysicsTerrain(); 
    
    window.resize(); 
    
    window.initControls(socket);
    
    window.gameLoopStarted = true; 
    window._lerpLastTime = Date.now();
    requestAnimationFrame(renderLoop); 
});

const renderLoop = () => {
    requestAnimationFrame(renderLoop);
    if (window.gameLoopStarted && typeof window.renderGameFrame === 'function') {
        // 🎞️ [보간] 그리기 직전에 원격 캐릭터 위치를 목표 좌표 쪽으로 부드럽게 이동시킨다.
        window.interpolateRemotePlayers(Date.now());

        const BUSHES_RENDER = (window.GameData && window.GameData.Map) ? window.GameData.Map.BUSHES : [];
        window.renderGameFrame(
            ctx, window.myPlayer, window.players, window.serverMonster, window.serverProjectiles, 
            window.serverShockwaves, window.serverDetectors, window.visualFX, window.serverBases, 
            window.serverOkras, window.BLUE_SHOP_X, window.RED_SHOP_X, window.BLUE_SMITH_X, 
            window.RED_SMITH_X, window.BLUE_NEXUS_X, window.RED_NEXUS_X, window.BLUE_STORAGE_X, 
            window.RED_STORAGE_X, BUSHES_RENDER, window.serverMagmas, window.serverMantleBolts
        );
    }
};

setInterval(() => {
    if (!window.gameLoopStarted) return; 
    let loopNow = Date.now(); 
    let pObj = window.myPlayer;
    
    if (typeof window.updateCDUI === 'function') {
        window.updateCDUI('btn-skill1', pObj.cd1, loopNow); 
        window.updateCDUI('btn-skill2', pObj.cd2, loopNow); 
        window.updateCDUI('btn-skill3', pObj.cd3, loopNow);
    }

    if (!pObj.isDead) { 
        pObj.moveX = window.joyX || 0;              // ★ 1-C 추가: 물리가 지운 입력을 되살린다
        pObj.moveY = window.joyY || 0;              // ★ 1-C 추가
        if (pObj.moveX > 0) pObj.lastFacing = 1; else if (pObj.moveX < 0) pObj.lastFacing = -1;

        if (pObj.isCasting && pObj.characterType === 'BORSALINO' && loopNow < (pObj.skill3EndTime || 0)) {
            let aimX = pObj.moveX, aimY = pObj.moveY;
            if (aimX === 0 && aimY === 0) { aimX = pObj.lastFacing; aimY = 0; }
            if (aimX !== window.lastSentSkill3Dir.x || aimY !== window.lastSentSkill3Dir.y) {
                window.lastSentSkill3Dir = { x: aimX, y: aimY };
                socket.emit('skill3Aim', { dirX: aimX, dirY: aimY });
            }
        }

        if (typeof window.updatePlayerPhysics === 'function') {
            window.updatePlayerPhysics(pObj, window.slowUntil, loopNow, window.visualFX);
        }
    }
    
    for (let pid in window.players) {
        let p = window.players[pid];
        if (!p.isDead && loopNow < p.skill2EndTime) { 
            let isMoving = Math.abs(p.x - (p.lastRenderX || p.x)) > 0.5 || (pid === window.myId && Math.abs(pObj.moveX) > 0); 
            p.lastRenderX = p.x; 
            if (isMoving && Math.random() < 0.2) window.visualFX.push({ type: 'trail_white', x: p.x, y: p.y, life: 25, maxLife: 25, dir: p.lastFacing }); 
        }
    }
    
    window.serverShockwaves.forEach(sw => { 
        let clientSpeed = sw.type === 'detroit' ? 50 : (sw.type === 'pheasant_peck' ? (sw.hasHie ? 45 : 15) : 9); 
        sw.x += sw.dir * clientSpeed; 
        if (sw.id === 'local_detroit') sw.life--;
        if (sw.type === 'detroit' && Math.random() < 0.2) { window.visualFX.push({ type: 'trail_white', x: sw.x - (sw.dir * 40), y: sw.y, life: 20, maxLife: 20, dir: sw.dir }); }
        if (sw.type === 'pheasant_peck' && Math.random() < 0.3 && clientSpeed > 0) { window.visualFX.push({ type: 'trail_ice', x: sw.x - (sw.dir * 20), y: sw.y, life: 15, maxLife: 15, dir: sw.dir }); }
    });

    window.serverShockwaves = window.serverShockwaves.filter(sw => sw.id !== 'local_detroit' || sw.life > 0);

    window.serverProjectiles.forEach(proj => {
        if (proj.type === 'meigou') {
            window.visualFX.push({ type: 'magma_trail', x: proj.x, y: proj.y, life: 35, maxLife: 35 });
        } else if (proj.type === 'magatama' && Math.random() < 0.5) {
            window.visualFX.push({ type: 'light_trail', x: proj.x, y: proj.y, life: 10, maxLife: 10 });
        } else if (proj.type === 'thunder_bolt' && Math.random() < 0.6) {
            window.visualFX.push({ type: 'thunder_trail', x: proj.x, y: proj.y, life: 10, maxLife: 10 });
        }
    });

    let inShop = (pObj.team === 1 && Math.abs(pObj.x - window.BLUE_SHOP_X) < 180) || (pObj.team === 2 && Math.abs(pObj.x - window.RED_SHOP_X) < 180); 
    let inSmith = (pObj.team === 1 && Math.abs(pObj.x - window.BLUE_SMITH_X) < 140) || (pObj.team === 2 && Math.abs(pObj.x - window.RED_SMITH_X) < 140); 
    let inStorage = (pObj.team === 1 && Math.abs(pObj.x - window.BLUE_STORAGE_X) < 140) || (pObj.team === 2 && Math.abs(pObj.x - window.RED_STORAGE_X) < 140);
    
    // 🛠️ 테스트 창고 구역 감지 로직
    let inTestStorage = (pObj.team === 1 && Math.abs(pObj.x - window.BLUE_TEST_STORAGE_X) < 140) || (pObj.team === 2 && Math.abs(pObj.x - window.RED_TEST_STORAGE_X) < 140);
    
    let nearSpotX = null;
    if (!pObj.hasDetector && !pObj.isDead) { 
        let spots = (pObj.team === 1) ? [8600, 9600, 10600] : [21400, 22400, 23400]; 
        for (let sx of spots) { if (!window.serverDetectors.some(d => d.x === sx) && Math.abs(pObj.x - sx) < 150) { nearSpotX = sx; break; } } 
    }
    
    let nearChest = false; 
    let myD = window.serverDetectors.find(d => d.ownerId === window.myId);
    if (!pObj.isDead && myD && Math.hypot(pObj.x - (myD.x + 90), pObj.y - (window.GROUND_Y - 22.5)) < 180) nearChest = true;

    if (!pObj.isDead && typeof window.setUnifiedBtn === 'function' && typeof window.hideUnifiedBtn === 'function') {
        if (inShop) window.setUnifiedBtn('열기', '1.0', window.openShop); 
        else if (inSmith) window.setUnifiedBtn('열기', '1.0', window.openSmith); 
        else if (inStorage) window.setUnifiedBtn('열기', '1.0', window.openStorage); 
        else if (inTestStorage) window.setUnifiedBtn('테스트<br><span style="font-size:12px;">(무한)</span>', '1.0', window.openTestStorage); // 🛠️ 테스트 창고 버튼
        else if (nearChest) { 
            if (myD && myD.chest && myD.chest.length > 0) window.setUnifiedBtn(`열기<br><span style="font-size:12px;">(${myD.chest.length}개)</span>`, '1.0', window.openChest); 
            else window.setUnifiedBtn(`열기<br><span style="font-size:12px;">(빔)</span>`, '0.5', window.openChest); 
        } 
        else if (nearSpotX !== null) { 
            window.currentNearSpotX = nearSpotX; window.setUnifiedBtn('건설', '1.0', window.buyDetectorAtSpot); 
        } 
        else { 
            window.hideUnifiedBtn(); 
            // 🚀 [최적화⑦] 캐싱된 참조로 열림 여부만 검사 (매 프레임 getElementById 5회 제거)
            let md = getModalDom();
            if(md.shop && md.shop.style.display === 'flex' && typeof window.closeShop === 'function') window.closeShop(); 
            if(md.smith && md.smith.style.display === 'flex' && typeof window.closeSmith === 'function') window.closeSmith(); 
            if(md.storage && md.storage.style.display === 'flex' && typeof window.closeStorage === 'function') window.closeStorage(); 
            if(md.chest && md.chest.style.display === 'flex' && typeof window.closeChest === 'function') window.closeChest(); 
            if(md.test && md.test.style.display === 'flex' && typeof window.closeTestStorage === 'function') window.closeTestStorage(); // 🛠️ 테스트 창고 닫기
        }
    } else if (typeof window.hideUnifiedBtn === 'function') { 
        window.hideUnifiedBtn(); 
    } 

    if (window.myId && window.players[window.myId]) { 
        pObj.id = window.myId; pObj.nickname = window.myNickname; 
        Object.assign(window.players[window.myId], pObj); 
        // 🚀 [최적화③] 30Hz 제한 + 실제 이동이 있을 때만 서버로 좌표 전송
        if (!pObj.isDead && loopNow - window._lastMoveSend >= window.MOVE_SEND_INTERVAL) { 
            let mdx = pObj.x - window._lastSentPos.x, mdy = pObj.y - window._lastSentPos.y;
            if ((mdx * mdx + mdy * mdy) > 0.25) {
                window._lastMoveSend = loopNow;
                window._lastSentPos.x = pObj.x; window._lastSentPos.y = pObj.y;
                socket.emit('playerMove', { x: pObj.x, y: pObj.y, hp: pObj.hp, maxHp: pObj.maxHp }); 
            }
        } 
    }
}, 1000 / 60);
