// 파일명: core/gameState.js

window.BLUE_SHOP_X = 11800; window.RED_SHOP_X = 20200; 
window.BLUE_NEXUS_X = 12250; window.RED_NEXUS_X = 19750; 
window.BLUE_SMITH_X = 11430; window.RED_SMITH_X = 20570; 
window.BLUE_STORAGE_X = 11100; window.RED_STORAGE_X = 20900;
window.BLUE_TEST_STORAGE_X = 10800; window.RED_TEST_STORAGE_X = 21200; 

// 🥊 중앙 정글 최상단 '바구니' 공간 (박힌범 전용 · index.js 의 HINBEOM_AREA 와 동일해야 함)
window.HINBEOM_AREA = { minX: 13400, maxX: 18600, minY: -2400, maxY: -1340 };

// ⚫ 검은수염 전용 공간 '암흑 왕좌' (index.js 의 DARK_AREA 와 동일해야 함)
//    ✅ [수정] 지상과 같은 높이(y=2000)로 내리고 맵 최우측으로 멀리 이동
window.DARK_AREA   = { minX: 28000, maxX: 33000, minY: 600, maxY: 2060 };
window.DARK_GROUND = 2000;

/** ⚫ 대상이 암흑 왕좌 안에 있는가 */
window.isInDarkArea = (e) => {
    if (!e) return false;
    const A = window.DARK_AREA;
    return e.x >= A.minX && e.x <= A.maxX && e.y >= A.minY && e.y <= A.maxY;
};

/** ⚫ 암흑물질 장판이 이 대상에게 적용 중인가 (점프력 70% 감소 판정용) */
window.isDarkFloorActiveFor = (e) => {
    const bb = window.serverBlackbeard;
    if (!bb || !bb.darkFloorUntil) return false;
    if (Date.now() >= bb.darkFloorUntil) return false;
    return window.isInDarkArea(e);
};

// 💥 화면 흔들림 (파공아 / 검은수염 공중 강림)
//    ✅ [수정] 검은수염 스킬로 인한 흔들림은 '암흑 왕좌 안에 있는 플레이어'에게만 적용된다.
window.shakeUntil = 0;
window.shakeMag = 0;
window.triggerScreenShake = (durationMs, magnitude, darkOnly) => {
    // darkOnly 가 true 이면 내가 암흑 왕좌 안에 있을 때만 흔든다
    if (darkOnly && !window.isInDarkArea(window.myPlayer)) return;
    let until = Date.now() + (durationMs || 400);
    if (until > window.shakeUntil) window.shakeUntil = until;
    window.shakeMag = Math.max(window.shakeMag || 0, magnitude || 18);
};

window.mySessionId = localStorage.getItem('faceBrawlSessionId');
if (!window.mySessionId) {
    window.mySessionId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('faceBrawlSessionId', window.mySessionId);
}

window.myId = null;
window.players = {}; 
window.serverMonster = null; 
window.serverHinbeom = null;          // 🥊 박힌범
window.serverMinions = [];            // 🐗 패기로 소환된 할배새끼들
window.serverHinbeomPortal = null;    // 🌀 박힌범 처치 시 생기는 기지 귀환 포탈
window.serverDarkPortal = null;       // 🟣 박힌범 처치 시 25% 확률로 생기는 암흑 왕좌 포탈
window.serverBlackbeard = null;       // ⚫ 검은수염
window.serverBlackbeardPortal = null; // 🌀 검은수염 처치 시 생기는 기지 귀환 포탈
window.serverOkras = []; 
window.serverProjectiles = []; 
window.serverShockwaves = []; 
window.serverDetectors = [];
window.serverMagmas = []; 
window.serverMantleBolts = []; 
window.serverBases = { 1: { hp: 10000, maxHp: 10000 }, 2: { hp: 10000, maxHp: 10000 } };
window.currentTeamStorage = []; 
window.myNickname = ''; 

window.lastSentSkill3Dir = { x: 0, y: 0 };
window.lastAttackTime = 0; 
window.slowUntil = 0; 
window.autoAttackInterval = null; 
window.borsComboCount = 0; 
window.borsLastComboTime = 0; 
window.gameLoopStarted = false; 
window.currentNearSpotX = null; 
window.reconnectResolved = false;
window.respawnInterval = null;
window.pendingServerPlayers = null;
window.controlsInitialized = false;

// 휘발성 이펙트 전용 메모리 풀
const FX_POOL_SIZE = 300;
window.visualFX = Array.from({ length: FX_POOL_SIZE }, () => ({ active: false }));
window.visualFX.push = function(data) {
    for (let i = 0; i < FX_POOL_SIZE; i++) {
        if (!this[i].active) {
            let fx = this[i];
            for(let key in fx) delete fx[key]; 
            Object.assign(fx, data);
            fx.active = true;
            fx.x = data.x || 0; fx.y = data.y || 0;
            fx.life = data.life || 30; fx.maxLife = data.maxLife || 30;
            fx.type = data.type;
            fx.isLeft = data.isLeft ?? false; fx.team = data.team ?? 1;
            fx.dir = data.dir ?? 1; fx.val = data.val ?? 0; fx.targetId = data.targetId ?? null;
            
            // ✅ 시각적 이펙트 처리를 위한 열매 강화 및 코트 상태 명시적 매핑
            fx.hasJusticeCoat = data.hasJusticeCoat ?? false;
            fx.hasPika = data.hasPika ?? false;
            fx.hasHie = data.hasHie ?? false;
            fx.hasMagu = data.hasMagu ?? false;
            fx.hasKizaru = data.hasKizaru ?? false;
            fx.hasAokiji = data.hasAokiji ?? false;
            fx.hasAkainu = data.hasAkainu ?? false;
            fx.hasGoro = data.hasGoro ?? false;
            fx.hasArkMaxim = data.hasArkMaxim ?? false;
            fx.hasGodEnel = data.hasGodEnel ?? false; // ✨ 갓 에넬 상태값 매핑

            // ⚡ 에넬 이펙트용 방향 벡터 매핑 (엘 토르)
            if (data.dirX !== undefined) fx.dirX = data.dirX;
            if (data.dirY !== undefined) fx.dirY = data.dirY;

            // ⚫ 검은수염 이펙트용 추가 필드
            if (data.radius !== undefined) fx.radius = data.radius;
            if (data.x2 !== undefined) fx.x2 = data.x2;
            if (data.y2 !== undefined) fx.y2 = data.y2;
            if (data.area !== undefined) fx.area = data.area;

            if (data.durationMs !== undefined) {
                fx.durationMs = data.durationMs;
                fx.endAt = data.endAt || (Date.now() + data.durationMs);
            }
            
            return fx;
        }
    }
};

let defaultParkHp = (window.GameData && window.GameData.Characters) ? window.GameData.Characters.PARK.hp : 3000;

// 내 캐릭터 로컬 상태
window.myPlayer = { 
    id: '', nickname: '', characterType: 'PARK', x: 10800, y: 1955, moveX: 0, moveY: 0, vy: 0, jumpCount: 2, 
    level: 0, xp: 0, maxXp: 100, hp: defaultParkHp, maxHp: defaultParkHp, 
    color: '#3498db', team: 1, speedMult: 1.0, attackSpeedMult: 1.0, orbitSpheres: 0, orbitSpeedMult: 1.0,
    hasDetector: false, inventory: [], equippedUids: [], frozenUntil: 0, electrocutedUntil: 0, slowNerfUntil: 0,
    jumpNerfUntil: 0, lastFacing: 1, knockbackForce: 0, hasDaluFengwei: false, isDead: false, 
    cd1: 0, cd2: 0, cd3: 0, isCasting: false, skill1Dashing: false, skill2EndTime: 0,
    yataActive: false, yataCanceling: false, yataPath: null, yataStartTime: 0, yataProgress: 0, 
    skill3Active: false, skill3EndTime: 0, 
    iceAgeActive: false, 
    burningUntil: 0, maguBombUntil: 0, justiceBombUntil: 0,
    hasPika: false, hasHie: false, hasMagu: false, hasJusticeCoat: false,
    hasGoro: false, hasArkMaxim: false, hasGodEnel: false,
    lightDashUntil: 0, lightDashDir: 1,
    elThorLockUntil: 0, raigoPullUntil: 0,
    portalDwellUntil: 0, darkDwellUntil: 0,                // 🌀🟣 포탈 대기 카운트다운
    crowsPullUntil: 0, crowsTargetX: 0, crowsTargetY: 0     // ⚫ 크로우즈에 끌려가는 중
};

// 스킬 이름 동적 UI 업데이트
window.applySkillNames = () => {
    let charType = window.myPlayer.characterType;
    let isBors = charType === 'BORSALINO';
    let isKuzan = charType === 'KUZAN';
    let isSaka = charType === 'SAKAZUKI';
    let isEnel = charType === 'ENEL';
    
    const setLabel = (id, name) => {
        let btn = document.getElementById(id); if (!btn) return;
        let cd = btn.querySelector('.cd-overlay');
        btn.innerHTML = name;
        if (cd) btn.appendChild(cd); else { let d = document.createElement('div'); d.className = 'cd-overlay'; btn.appendChild(d); }
    };
    setLabel('btn-skill1', isBors ? '광선' : (isKuzan ? '퍼잔트백' : (isSaka ? '명구' : (isEnel ? '엘 토르' : '멀리뛰기'))));
    setLabel('btn-skill2', isBors ? '야타의<br>거울' : (isKuzan ? '파르티잔' : (isSaka ? '대분화' : (isEnel ? '만뢰' : '50m'))));
    setLabel('btn-skill3', isBors ? '팔척경<br>곡옥' : (isKuzan ? '아이스<br>에이지' : (isSaka ? '유성<br>화산' : (isEnel ? '뇌영' : '디트로이트'))));
};