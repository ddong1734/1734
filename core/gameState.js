// 파일명: core/gameState.js

window.BLUE_SHOP_X = 11800; window.RED_SHOP_X = 20200; 
window.BLUE_NEXUS_X = 12250; window.RED_NEXUS_X = 19750; 
window.BLUE_SMITH_X = 11430; window.RED_SMITH_X = 20570; 
window.BLUE_STORAGE_X = 11100; window.RED_STORAGE_X = 20900;
window.BLUE_TEST_STORAGE_X = 10800; window.RED_TEST_STORAGE_X = 21200; 

// 🥊 중앙 정글 최상단 '바구니' 공간 (박힌범 전용 · index.js 의 HINBEOM_AREA 와 동일해야 함)
//    바닥 발판 { x:13400, y:-1400, w:5200 } + 좌벽 13400 / 우벽 18560 기준
window.HINBEOM_AREA = { minX: 13400, maxX: 18600, minY: -2400, maxY: -1340 };

window.mySessionId = localStorage.getItem('faceBrawlSessionId');
if (!window.mySessionId) {
    window.mySessionId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('faceBrawlSessionId', window.mySessionId);
}

window.myId = null;
window.players = {}; 
window.serverMonster = null; 
window.serverHinbeom = null;          // 🥊 박힌범
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
    elThorLockUntil: 0, raigoPullUntil: 0 
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
