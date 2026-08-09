// main.js - 게임 코어 파이프라인 (루프, 초기화 연결)
//
// ⚠️ [기존 수정 유지]
//  2-A) window.onerror 의 alert() 제거.
//  1-C) 물리 계산 직전에 window.joyX / joyY 로 moveX / moveY 를 복원.
// ⚠️ [보스 추가]
//  🥊 renderGameFrame 에 window.serverHinbeom (박힌범) 전달
//  🐗 renderGameFrame 에 window.serverMinions (소환된 할배새끼) 전달
//
// 🛟 [게임 멈춤 방지]
//   시전 잠금 해제가 setTimeout 하나에 의존하면 모바일에서 타이머가 유실될 때
//   잠금이 영원히 풀리지 않는다. 매 프레임 도는 워치독이 근거 없는 잠금을 해제한다.
//
// ⚡🔮 [카시모] 음파 응축(sonicChargeUntil) · ⚡🌋 주력 방출(surgeLockUntil) ·
//   ⚡🔮 전격 돌진(amberDashUntil) 도 워치독 감시 대상에 포함한다.
//
// 🗣️ [NPC] 근처 NPC 감지 → 상호작용 버튼 표시 / 대화 중 조작 봉인

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
window.MOVE_SEND_INTERVAL = 33;
window._lastMoveSend = 0;
window._lastSentPos = { x: -999999, y: -999999 };

// 🎞️ [보간] 30Hz 전송으로 생기는 원격 캐릭터의 계단식 움직임을 매 렌더 프레임 보간으로 메운다.
window.LERP_RATE = 0.30;
window.LERP_SNAP_DIST = 600;
window._lerpLastTime = 0;

// ============================================================================
// 🛟 클라이언트 잠금 워치독
// ============================================================================
window.LOCK_MAX_MS = 15000;
window.CLIENT_CAST_STUCK_MS = 2000;

// 매 프레임 검사하는 '시각(timestamp) 기반 잠금' 목록
window.CLIENT_LOCK_TIMERS = [
    'frozenUntil', 'electrocutedUntil', 'airFreezeUntil', 'raigoPullUntil',
    'crowsPullUntil', 'yamiLockUntil', 'yamiBindUntil', 'guraChargeUntil',
    'elThorLockUntil', 'lightDashUntil', 'slowNerfUntil', 'jumpNerfUntil',
    'portalDwellUntil', 'darkDwellUntil',
    'castLockUntil', 'dashLockUntil', 'skill3EndTime', 'skill2EndTime',
    'sonicChargeUntil',                   // ⚡🔮 음파 응축
    'surgeLockUntil',                     // ⚡🌋 주력 방출 고정
    'amberDashUntil'                      // ⚡🔮 전격 돌진
];

window.clientWatchdog = (now) => {
    const p = window.myPlayer;
    if (!p) return;

    // ── ① 좌표 오염(NaN) 복구 ────────────────────────────────────────
    if (!Number.isFinite(p.x)) p.x = 10800;
    if (!Number.isFinite(p.y)) p.y = 1955;
    if (!Number.isFinite(p.vy)) p.vy = 0;
    if (!Number.isFinite(p.knockbackForce)) p.knockbackForce = 0;
    if (!Number.isFinite(p.moveX)) p.moveX = 0;
    if (!Number.isFinite(p.moveY)) p.moveY = 0;

    // ── ② 만료된 / 비정상적으로 긴 잠금 정리 ─────────────────────────
    const T = window.CLIENT_LOCK_TIMERS;
    for (let i = 0; i < T.length; i++) {
        let k = T[i], v = p[k];
        if (v === undefined || v === null) continue;
        if (!Number.isFinite(v)) { p[k] = 0; continue; }
        if (v > now + window.LOCK_MAX_MS) { p[k] = now + window.LOCK_MAX_MS; v = p[k]; }
        if (v !== 0 && v <= now) p[k] = 0;
    }

    // ⚡🌋 방출이 끝났는데 플래그만 남아 있으면 정리한다
    if (p.surgeActive && !(now < (p.surgeEnd || 0))) {
        p.surgeActive = false; p.surgeEnd = 0; p.surgeLockUntil = 0;
    }

    // 🗣️ 대화창이 닫혔는데 잠금 플래그만 남아 있으면 정리한다
    if (p.npcTalking && !window.npcDialogOpen) p.npcTalking = null;

    if (p.isDead) { p._cliStuckSince = 0; return; }

    // ── ③ 경로 없는 야타 잔재 정리 ───────────────────────────────────
    if (p.yataActive && !p.yataPath) {
        p.yataActive = false; p.yataCanceling = false; p.isCasting = false;
    }
    if (p.yataActive && p.yataStartTime) {
        let S2 = (window.GameData && window.GameData.Skills) ? window.GameData.Skills.BORSALINO_S2 : null;
        let dur = (S2 && S2.castTime) ? S2.castTime : 3000;
        if (now - p.yataStartTime > dur + 2000) {
            p.yataActive = false; p.yataPath = null; p.yataCanceling = false; p.isCasting = false;
        }
    }

    // ── ④ 대시 잔재 정리 ─────────────────────────────────────────────
    if (p.skill1Dashing && !(p.dashLockUntil > now)) p.skill1Dashing = false;

    // ── ⑤ 근거 없는 isCasting 강제 해제 ──────────────────────────────
    let justified =
           (p.yataActive === true && !!p.yataPath)
        || (p.skill1Dashing === true)
        || (now < (p.castLockUntil || 0))
        || (now < (p.crowsPullUntil || 0))
        || (now < (p.yamiLockUntil || 0))
        || (now < (p.yamiBindUntil || 0))
        || (now < (p.guraChargeUntil || 0))
        || (now < (p.raigoPullUntil || 0))
        || (now < (p.airFreezeUntil || 0))
        || (now < (p.elThorLockUntil || 0))
        || (now < (p.sonicChargeUntil || 0))       // ⚡🔮 음파 응축
        || (now < (p.surgeLockUntil || 0));        // ⚡🌋 주력 방출

    if (p.isCasting && !justified) {
        if (!p._cliStuckSince) p._cliStuckSince = now;
        else if (now - p._cliStuckSince >= window.CLIENT_CAST_STUCK_MS) {
            p.isCasting = false;
            p.skill3Active = false;
            p.iceAgeActive = false;
            p.yataActive = false; p.yataPath = null; p.yataCanceling = false;
            p.skill1Dashing = false;
            p._cliStuckSince = 0;
            console.warn('[WATCHDOG] 근거 없는 시전 잠금을 강제 해제했습니다.');
        }
    } else {
        p._cliStuckSince = 0;
    }

    // ── ⑥ 서버와의 연결이 끊긴 채 오래 지나면 잠금을 모두 푼다 ───────
    if (window.socket && !window.socket.connected) {
        if (!p._offlineSince) p._offlineSince = now;
        else if (now - p._offlineSince >= 5000) {
            p.crowsPullUntil = 0; p.yamiLockUntil = 0; p.yamiBindUntil = 0;
            p.guraChargeUntil = 0; p.raigoPullUntil = 0; p.airFreezeUntil = 0;
            p.frozenUntil = 0; p.electrocutedUntil = 0; p.elThorLockUntil = 0;
            p.sonicChargeUntil = 0;
            p.surgeLockUntil = 0; p.surgeActive = false; p.surgeEnd = 0;
            p.amberDashUntil = 0;
            p.isCasting = false; p.castLockUntil = 0;
            // 🗣️ 대화 잠금도 함께 푼다
            p.npcTalking = null;
            if (typeof window.closeNpcDialog === 'function') window.closeNpcDialog();
        }
    } else {
        p._offlineSince = 0;
    }
};

window.interpolateRemotePlayers = (now) => {
    let dt = now - (window._lerpLastTime || now);
    window._lerpLastTime = now;
    if (dt <= 0) return;
    if (dt > 200) dt = 200;

    let k = 1 - Math.pow(1 - window.LERP_RATE, dt / 16.6667);
    let snapSq = window.LERP_SNAP_DIST * window.LERP_SNAP_DIST;

    for (let pid in window.players) {
        if (pid === window.myId) continue;
        let p = window.players[pid];
        if (!p || p.netX === undefined || p.netY === undefined) continue;
        if (!Number.isFinite(p.netX) || !Number.isFinite(p.netY)) continue;
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) { p.x = p.netX; p.y = p.netY; continue; }

        let dx = p.netX - p.x, dy = p.netY - p.y;
        let distSq = dx * dx + dy * dy;

        if (distSq > snapSq) { p.x = p.netX; p.y = p.netY; continue; }
        if (distSq < 0.01) { p.x = p.netX; p.y = p.netY; continue; }

        // ⚡🔮 돌진 중인 원격 플레이어는 더 빠르게 따라붙는다
        let rate = (p.amberDashUntil && now < p.amberDashUntil) ? Math.min(1, k * 2.4) : k;
        p.x += dx * rate;
        p.y += dy * rate;
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
    for (let pid in window.players) { let sp = window.players[pid]; sp.netX = sp.x; sp.netY = sp.y; }

    window.myId = socket.id; 
    if(window.players[window.myId]) { Object.assign(window.myPlayer, window.players[window.myId]); } 

    // 🛟 전장 진입 시점에 모든 잠금을 깨끗이 비운다
    window.myPlayer.isCasting = false;
    window.myPlayer.skill1Dashing = false;
    window.myPlayer.skill3Active = false;
    window.myPlayer.iceAgeActive = false;
    window.myPlayer.yataActive = false; window.myPlayer.yataPath = null; window.myPlayer.yataCanceling = false;
    window.myPlayer.castLockUntil = 0; window.myPlayer.dashLockUntil = 0;
    window.myPlayer.elThorLockUntil = 0; window.myPlayer.raigoPullUntil = 0;
    window.myPlayer.crowsPullUntil = 0; window.myPlayer.yamiLockUntil = 0;
    window.myPlayer.yamiBindUntil = 0; window.myPlayer.guraChargeUntil = 0;
    window.myPlayer.frozenUntil = 0; window.myPlayer.airFreezeUntil = 0;
    window.myPlayer.sonicChargeUntil = 0;                       // ⚡🔮
    window.myPlayer.surgeLockUntil = 0;                         // ⚡🌋
    window.myPlayer.surgeActive = false; window.myPlayer.surgeEnd = 0;
    window.myPlayer.amberDashUntil = 0; window.myPlayer.dashCdEnd = 0;   // ⚡🔮 돌진
    window.myPlayer.npcTalking = null;                          // 🗣️
    window.myPlayer._cliStuckSince = 0; window.myPlayer._offlineSince = 0;
    
    if (typeof window.applySkillNames === 'function') window.applySkillNames();
    if (typeof window.invalidateCdCache === 'function') window.invalidateCdCache();
    if (typeof window.initPhysicsTerrain === 'function') window.initPhysicsTerrain(); 
    
    window.resize(); 
    
    window.initControls(socket);
    
    window.gameLoopStarted = true; 
    window._lerpLastTime = Date.now();
    requestAnimationFrame(renderLoop); 
});

// ============================================================================
// 🎨 렌더 루프
// ============================================================================
let _renderErrAt = 0;

const renderLoop = () => {
    requestAnimationFrame(renderLoop);
    if (!window.gameLoopStarted || typeof window.renderGameFrame !== 'function') return;

    try {
        // 🛟 이전 프레임에서 restore 가 빠졌더라도 여기서 원상 복구된다
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.setLineDash([]);

        window.interpolateRemotePlayers(Date.now());

        const BUSHES_RENDER = (window.GameData && window.GameData.Map) ? window.GameData.Map.BUSHES : [];
        window.renderGameFrame(
            ctx, window.myPlayer, window.players, window.serverMonster, window.serverProjectiles, 
            window.serverShockwaves, window.serverDetectors, window.visualFX, window.serverBases, 
            window.serverOkras, window.BLUE_SHOP_X, window.RED_SHOP_X, window.BLUE_SMITH_X, 
            window.RED_SMITH_X, window.BLUE_NEXUS_X, window.RED_NEXUS_X, window.BLUE_STORAGE_X, 
            window.RED_STORAGE_X, BUSHES_RENDER, window.serverMagmas, window.serverMantleBolts,
            window.serverHinbeom,                                    // 🥊 박힌범
            window.serverMinions                                     // 🐗 소환된 할배새끼
        );
    } catch (e) {
        let now = Date.now();
        if (now - _renderErrAt > 5000) { _renderErrAt = now; console.error('[RENDER ERROR]', e); }
        try {
            for (let i = 0; i < window.visualFX.length; i++) window.visualFX[i].active = false;
        } catch (e2) {}
    }
};

// ============================================================================
// 🔁 60Hz 로컬 루프 (물리 · 입력 복원 · UI · 좌표 전송)
// ============================================================================
const _tickErrAt = {};
function safeTick(name, fn) {
    try { fn(); }
    catch (e) {
        let now = Date.now();
        if (!_tickErrAt[name] || now - _tickErrAt[name] > 5000) { _tickErrAt[name] = now; console.error('[TICK:' + name + ']', e); }
    }
}

setInterval(() => {
    if (!window.gameLoopStarted) return; 
    let loopNow = Date.now(); 
    let pObj = window.myPlayer;

    // 🛟 [최우선] 잠금 워치독 — 무슨 일이 있어도 가장 먼저 돈다
    safeTick('watchdog', () => window.clientWatchdog(loopNow));
    
    safeTick('cdUI', () => {
        if (typeof window.updateCDUI === 'function') {
            window.updateCDUI('btn-skill1', pObj.cd1, loopNow); 
            window.updateCDUI('btn-skill2', pObj.cd2, loopNow); 
            // ⚡🔮 환수호박 중에는 3번 버튼이 숨겨져 있으므로 갱신하지 않는다
            if (!(pObj.characterType === 'KASHIMO' && pObj.amberActive)) {
                window.updateCDUI('btn-skill3', pObj.cd3, loopNow);
            }
        }
    });

    safeTick('physics', () => {
        if (!pObj.isDead) { 
            // ⚡🌋 주력 방출 · ⚡🔮 음파 응축 · ⚡🔮 돌진 · 🗣️ NPC 대화 중에는
            //    입력 자체를 무시한다
            let inputLocked = (loopNow < (pObj.surgeLockUntil || 0))
                           || (loopNow < (pObj.sonicChargeUntil || 0))
                           || (loopNow < (pObj.amberDashUntil || 0))
                           || !!pObj.npcTalking;
            if (inputLocked) {
                pObj.moveX = 0; pObj.moveY = 0;
            } else {
                pObj.moveX = window.joyX || 0;          // ★ 1-C: 물리가 지운 입력을 되살린다
                pObj.moveY = window.joyY || 0;          // ★ 1-C
                if (pObj.moveX > 0) pObj.lastFacing = 1; else if (pObj.moveX < 0) pObj.lastFacing = -1;
            }

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
    });
    
    safeTick('trails', () => {
        for (let pid in window.players) {
            let p = window.players[pid];
            if (!p.isDead && loopNow < p.skill2EndTime) { 
                let isMoving = Math.abs(p.x - (p.lastRenderX || p.x)) > 0.5 || (pid === window.myId && Math.abs(pObj.moveX) > 0); 
                p.lastRenderX = p.x; 
                if (isMoving && Math.random() < 0.2) window.visualFX.push({ type: 'trail_white', x: p.x, y: p.y, life: 25, maxLife: 25, dir: p.lastFacing }); 
            }
            // ⚡🔮 원격 카시모가 돌진 중이면 전류 잔상을 그려 준다
            if (pid !== window.myId && p.amberDashUntil && loopNow < p.amberDashUntil) {
                window.visualFX.push({
                    type: 'kashimo_amber_trail', x: p.x, y: p.y,
                    ownerId: pid, durationMs: 380, life: 23, maxLife: 23
                });
            }
        }
    });
    
    safeTick('shockwaves', () => {
        window.serverShockwaves.forEach(sw => { 
            let clientSpeed = sw.type === 'detroit' ? 50 : (sw.type === 'pheasant_peck' ? (sw.hasHie ? 45 : 15) : 9); 
            sw.x += sw.dir * clientSpeed; 
            if (sw.id === 'local_detroit') sw.life--;
            if (sw.type === 'detroit' && Math.random() < 0.2) { window.visualFX.push({ type: 'trail_white', x: sw.x - (sw.dir * 40), y: sw.y, life: 20, maxLife: 20, dir: sw.dir }); }
            if (sw.type === 'pheasant_peck' && Math.random() < 0.3 && clientSpeed > 0) { window.visualFX.push({ type: 'trail_ice', x: sw.x - (sw.dir * 20), y: sw.y, life: 15, maxLife: 15, dir: sw.dir }); }
        });

        window.serverShockwaves = window.serverShockwaves.filter(sw => sw.id !== 'local_detroit' || sw.life > 0);
    });

    safeTick('projTrails', () => {
        window.serverProjectiles.forEach(proj => {
            if (proj.type === 'meigou') {
                window.visualFX.push({ type: 'magma_trail', x: proj.x, y: proj.y, life: 35, maxLife: 35 });
            } else if (proj.type === 'magatama' && Math.random() < 0.5) {
                window.visualFX.push({ type: 'light_trail', x: proj.x, y: proj.y, life: 10, maxLife: 10 });
            } else if (proj.type === 'thunder_bolt' && Math.random() < 0.6) {
                window.visualFX.push({ type: 'thunder_trail', x: proj.x, y: proj.y, life: 10, maxLife: 10 });
            }
        });
    });

    safeTick('poi', () => {
        let inShop = (pObj.team === 1 && Math.abs(pObj.x - window.BLUE_SHOP_X) < 180) || (pObj.team === 2 && Math.abs(pObj.x - window.RED_SHOP_X) < 180); 
        let inSmith = (pObj.team === 1 && Math.abs(pObj.x - window.BLUE_SMITH_X) < 140) || (pObj.team === 2 && Math.abs(pObj.x - window.RED_SMITH_X) < 140); 
        let inStorage = (pObj.team === 1 && Math.abs(pObj.x - window.BLUE_STORAGE_X) < 140) || (pObj.team === 2 && Math.abs(pObj.x - window.RED_STORAGE_X) < 140);
        
        let inTestStorage = (pObj.team === 1 && Math.abs(pObj.x - window.BLUE_TEST_STORAGE_X) < 140) || (pObj.team === 2 && Math.abs(pObj.x - window.RED_TEST_STORAGE_X) < 140);
        
        // 🗣️ 근처 NPC 감지 — 같은 팀 · 퀘스트 미완료 · 사거리 안
        let nearNpc = null;
        if (!pObj.isDead && !pObj.npcTalking && (pObj.tichStage || 0) < 2) {
            let range = window.NPC_INTERACT_RANGE || 200;
            let list = window.serverNpcs || [];
            for (let i = 0; i < list.length; i++) {
                let n = list[i];
                if (!n || n.team !== pObj.team) continue;      // 🚫 상대팀 NPC 불가
                if (Math.hypot(pObj.x - n.x, pObj.y - n.y) > range) continue;
                nearNpc = n; break;
            }
        }
        // 🍒 퀘스트 진행 중이라면 체리파이를 갖고 있어야 다시 상호작용할 수 있다
        if (nearNpc && (pObj.tichStage || 0) === 1) {
            let inv = pObj.inventory || [];
            if (!inv.some(i => i.id === 'cherry_pie')) nearNpc = null;
        }
        window.currentNearNpcId = nearNpc ? nearNpc.id : null;
        
        let nearSpotX = null;
        if (!pObj.hasDetector && !pObj.isDead) { 
            let spots = (pObj.team === 1) ? [8600, 9600, 10600] : [21400, 22400, 23400]; 
            for (let sx of spots) { if (!window.serverDetectors.some(d => d.x === sx) && Math.abs(pObj.x - sx) < 150) { nearSpotX = sx; break; } } 
        }
        
        let nearChest = false; 
        let myD = window.serverDetectors.find(d => d.ownerId === window.myId);
        if (!pObj.isDead && myD && Math.hypot(pObj.x - (myD.x + 90), pObj.y - (window.GROUND_Y - 22.5)) < 180) nearChest = true;

        if (!pObj.isDead && typeof window.setUnifiedBtn === 'function' && typeof window.hideUnifiedBtn === 'function') {
            // 🗣️ NPC 상호작용이 최우선 (대화 중에는 버튼을 숨긴다)
            if (pObj.npcTalking) window.hideUnifiedBtn();
            else if (nearNpc) window.setUnifiedBtn('대화<br><span style="font-size:12px;">(' + (nearNpc.name || 'NPC') + ')</span>', '1.0', window.interactNpc);
            else if (inShop) window.setUnifiedBtn('열기', '1.0', window.openShop); 
            else if (inSmith) window.setUnifiedBtn('열기', '1.0', window.openSmith); 
            else if (inStorage) window.setUnifiedBtn('열기', '1.0', window.openStorage); 
            else if (inTestStorage) window.setUnifiedBtn('테스트<br><span style="font-size:12px;">(무한)</span>', '1.0', window.openTestStorage);
            else if (nearChest) { 
                if (myD && myD.chest && myD.chest.length > 0) window.setUnifiedBtn(`열기<br><span style="font-size:12px;">(${myD.chest.length}개)</span>`, '1.0', window.openChest); 
                else window.setUnifiedBtn(`열기<br><span style="font-size:12px;">(빔)</span>`, '0.5', window.openChest); 
            } 
            else if (nearSpotX !== null) { 
                window.currentNearSpotX = nearSpotX; window.setUnifiedBtn('건설', '1.0', window.buyDetectorAtSpot); 
            } 
            else { 
                window.hideUnifiedBtn(); 
                let md = getModalDom();
                if(md.shop && md.shop.style.display === 'flex' && typeof window.closeShop === 'function') window.closeShop(); 
                if(md.smith && md.smith.style.display === 'flex' && typeof window.closeSmith === 'function') window.closeSmith(); 
                if(md.storage && md.storage.style.display === 'flex' && typeof window.closeStorage === 'function') window.closeStorage(); 
                if(md.chest && md.chest.style.display === 'flex' && typeof window.closeChest === 'function') window.closeChest(); 
                if(md.test && md.test.style.display === 'flex' && typeof window.closeTestStorage === 'function') window.closeTestStorage();
            }
        } else if (typeof window.hideUnifiedBtn === 'function') { 
            window.hideUnifiedBtn(); 
        } 
    });

    safeTick('sendPos', () => {
        if (window.myId && window.players[window.myId]) { 
            pObj.id = window.myId; pObj.nickname = window.myNickname; 
            Object.assign(window.players[window.myId], pObj); 
            if (!pObj.isDead && !pObj.npcTalking && loopNow - window._lastMoveSend >= window.MOVE_SEND_INTERVAL) { 
                if (!Number.isFinite(pObj.x) || !Number.isFinite(pObj.y)) return;
                let mdx = pObj.x - window._lastSentPos.x, mdy = pObj.y - window._lastSentPos.y;
                if ((mdx * mdx + mdy * mdy) > 0.25) {
                    window._lastMoveSend = loopNow;
                    window._lastSentPos.x = pObj.x; window._lastSentPos.y = pObj.y;
                    socket.emit('playerMove', { x: pObj.x, y: pObj.y, hp: pObj.hp, maxHp: pObj.maxHp }); 
                }
            } 
        }
    });
}, 1000 / 60);

// ============================================================================
// 📵 화면 복귀 처리
// ============================================================================
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    let now = Date.now();
    window._lerpLastTime = now;
    if (typeof window.clientWatchdog === 'function') window.clientWatchdog(now);
    const p = window.myPlayer;
    if (p && !p.isDead && p.isCasting && !(p.yataActive && p.yataPath)) {
        p._cliStuckSince = now - window.CLIENT_CAST_STUCK_MS;
    }
});

window.addEventListener('pageshow', () => {
    let now = Date.now();
    window._lerpLastTime = now;
    if (typeof window.clientWatchdog === 'function') window.clientWatchdog(now);
});