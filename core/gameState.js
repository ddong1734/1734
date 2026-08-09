// 파일명: core/gameState.js
//
// 🛟 window.myPlayer 초기 객체에 잠금 관련 필드를 모두 명시했다.
//    castLockUntil / dashLockUntil 은 main.js 의 워치독과 physics.js 가
//    '시전 잠금이 정당한가'를 판정하는 기준값이다.
// ⚡ 카시모 하지메 전용 상태(전하 · 주력 방출 · 환수호박 · 전격 돌진)를 추가했다.
// 🗣️ NPC 대화 / 퀘스트 상태를 추가했다.

window.BLUE_SHOP_X = 11800; window.RED_SHOP_X = 20200; 
window.BLUE_NEXUS_X = 12250; window.RED_NEXUS_X = 19750; 
window.BLUE_SMITH_X = 11430; window.RED_SMITH_X = 20570; 
window.BLUE_STORAGE_X = 11100; window.RED_STORAGE_X = 20900;
window.BLUE_TEST_STORAGE_X = 10800; window.RED_TEST_STORAGE_X = 21200; 

// 🌲 정글 미러링 기준 폭 (월드 폭이 늘어나도 레드팀 정글 위치가 변하지 않도록 고정)
window.JUNGLE_MIRROR_WIDTH = 32000;

// 🥊 중앙 정글 최상단 '바구니' 공간 (박힌범 전용 · index.js 의 HINBEOM_AREA 와 동일해야 함)
window.HINBEOM_AREA = { minX: 13400, maxX: 18600, minY: -2400, maxY: -1340 };

// ⚫ 검은수염 전용 공간 '암흑 왕좌' (index.js 의 DARK_AREA 와 동일해야 함)
window.DARK_AREA   = { minX: 36000, maxX: 41000, minY: 600, maxY: 2060 };
window.DARK_GROUND = 2000;

// 렌더링 격리 구간
window.DARK_ZONE_X = { min: 35400, max: 41600 };

// ⚡ 카시모 전하 스택 상수 (server/config.js 와 동일해야 함)
window.KASHIMO_CHARGE_MAX = 4;
window.KASHIMO_CHARGE_DECAY_MS = 5000;
// ⚡ 전하 4스택 대상이 화면 안에 있는가 (renderEngine 이 매 프레임 갱신한다)
window.kashimoSkyReady = false;

// 🗣️ NPC 상호작용 가능 거리 (server/config.js 의 NPC_INTERACT_RANGE 와 동일해야 함)
window.NPC_INTERACT_RANGE = 200;

/** ⚫ 대상이 암흑 왕좌 안에 있는가 */
window.isInDarkArea = (e) => {
    if (!e) return false;
    const A = window.DARK_AREA;
    return e.x >= A.minX && e.x <= A.maxX && e.y >= A.minY && e.y <= A.maxY;
};

/** ⚫ 대상이 '암흑 왕좌 구역(렌더 격리 범위)' 안에 있는가 — X만 본다 */
window.isInDarkZone = (e) => {
    if (!e) return false;
    return e.x >= window.DARK_ZONE_X.min && e.x <= window.DARK_ZONE_X.max;
};

/** ⚫ 암흑물질 장판이 이 대상에게 적용 중인가 (점프력 70% 감소 판정용) */
window.isDarkFloorActiveFor = (e) => {
    const bb = window.serverBlackbeard;
    if (!bb || !bb.darkFloorUntil) return false;
    if (Date.now() >= bb.darkFloorUntil) return false;
    return window.isInDarkArea(e);
};

// 💥 화면 흔들림
window.shakeUntil = 0;
window.shakeMag = 0;
window.triggerScreenShake = (durationMs, magnitude, darkOnly) => {
    if (darkOnly && !window.isInDarkZone(window.myPlayer)) return;
    let dur = Number(durationMs);
    if (!Number.isFinite(dur) || dur <= 0) dur = 400;
    if (dur > 6000) dur = 6000;
    let until = Date.now() + dur;
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
window.serverHinbeomPortal = null;
window.serverDarkPortal = null;
window.serverBlackbeard = null;       // ⚫ 검은수염
window.serverBurgess = null;          // 🟪 지저스 바제스
window.serverBlackbeardPortal = null;
window.serverOkras = []; 
window.serverProjectiles = []; 
window.serverShockwaves = []; 
window.serverDetectors = [];
window.serverMagmas = []; 
window.serverMantleBolts = []; 
window.serverNpcs = [];               // 🗣️ NPC 목록
window.serverBases = { 1: { hp: 10000, maxHp: 10000 }, 2: { hp: 10000, maxHp: 10000 } };
window.currentTeamStorage = []; 
window.myNickname = ''; 
window.currentQuestText = null;       // 📜 현재 퀘스트 문구
window.npcDialogOpen = false;         // 🗣️ 대화창 열림 여부
window.currentNearNpcId = null;       // 🗣️ 근처 NPC id

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

// 🕹️ 조이스틱 입력 원본
window.joyX = 0;
window.joyY = 0;

// 📶 핑(왕복 지연시간)
window.myPing = 0;

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
            fx.hasGodEnel = data.hasGodEnel ?? false;

            // ⚡ 에넬 이펙트용 방향 벡터 매핑 (엘 토르)
            if (data.dirX !== undefined) fx.dirX = data.dirX;
            if (data.dirY !== undefined) fx.dirY = data.dirY;

            // ⚫ 검은수염 / 🟪 바제스 / ⚡ 카시모 이펙트용 추가 필드
            if (data.radius !== undefined) fx.radius = data.radius;
            if (data.x2 !== undefined) fx.x2 = data.x2;
            if (data.y2 !== undefined) fx.y2 = data.y2;
            if (data.area !== undefined) fx.area = data.area;
            if (data.arc !== undefined) fx.arc = data.arc;

            // ⚡ 카시모 이펙트용 추가 필드 (대상 추적 · 시전자 추적)
            if (data.ownerId !== undefined) fx.ownerId = data.ownerId;
            if (data.targetKind !== undefined) fx.targetKind = data.targetKind;

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
    hasGura: false, hasYami: false,
    guraCdEnd: 0, yamiCdEnd: 0,
    lightDashUntil: 0, lightDashDir: 1,
    elThorLockUntil: 0, raigoPullUntil: 0,
    airFreezeUntil: 0, skillFreezeUntil: 0,
    portalDwellUntil: 0, darkDwellUntil: 0,
    darkBanned: false,
    crowsPullUntil: 0, crowsTargetX: 0, crowsTargetY: 0,
    yamiLockUntil: 0, yamiBindUntil: 0, guraChargeUntil: 0,

    // 🗣️ NPC 대화 / 퀘스트
    npcTalking: null,
    tichStage: 0,

    // ⚡ 카시모 하지메 — 전하 스택 / 번개 쿨타임
    kashimoCharge: 0,
    kashimoChargeUntil: 0,
    kashimoBoltCdEnd: 0,
    // ⚡🌋 주력 방출 (2번 스킬)
    surgeActive: false,
    surgeEnd: 0,
    surgeCdEnd: 0,
    // ⚡🔮 환수호박 (3번 스킬) — 죽을 때까지 유지된다
    amberActive: false,
    amberCdEnd: 0,
    // ⚡🔮 환수호박 평타 = 전격 돌진
    dashCdEnd: 0,
    amberDashUntil: 0,
    amberDashDirX: 1,
    amberDashDirY: 0,
    // ⚡🔮 환수호박 전용 스킬
    waveCdEnd: 0,
    sonicCdEnd: 0,
    sonicChargeUntil: 0,

    // 🛟 시전 / 대시 잠금의 '만료 시각'
    castLockUntil: 0,
    dashLockUntil: 0,

    // 🛟 워치독 내부 상태
    _cliStuckSince: 0,
    _offlineSince: 0
};

// ============================================================================
// 스킬 이름 동적 UI 업데이트
//   ⚡ 카시모의 1번 스킬은 전하 4스택 대상이 화면 안에 있으면
//      '대기를 가르는 번개'로 이름이 바뀐다 (window.kashimoSkyReady).
//   ⚡🔮 환수호박 발동 중에는 1·2번이 전용 스킬로 바뀌고 3번은 사라진다.
// ============================================================================
window.applySkillNames = () => {
    let charType = window.myPlayer.characterType;
    let isBors = charType === 'BORSALINO';
    let isKuzan = charType === 'KUZAN';
    let isSaka = charType === 'SAKAZUKI';
    let isEnel = charType === 'ENEL';
    let isKashimo = charType === 'KASHIMO';
    let amber = isKashimo && !!window.myPlayer.amberActive;
    
    const setLabel = (id, name) => {
        let btn = document.getElementById(id); if (!btn) return;
        let cd = btn.querySelector('.cd-overlay');
        btn.innerHTML = name;
        if (cd) btn.appendChild(cd); else { let d = document.createElement('div'); d.className = 'cd-overlay'; btn.appendChild(d); }
    };

    // ── 1번 ──────────────────────────────────────────────────────────
    let s1 = isBors ? '광선'
           : (isKuzan ? '퍼잔트백'
           : (isSaka ? '명구'
           : (isEnel ? '엘 토르'
           : (isKashimo ? (amber ? '전자파'
                                 : (window.kashimoSkyReady ? '대기를<br>가르는<br>번개' : '번개'))
           : '멀리뛰기'))));
    setLabel('btn-skill1', s1);

    // ── 2번 ──────────────────────────────────────────────────────────
    let s2 = isBors ? '야타의<br>거울'
           : (isKuzan ? '파르티잔'
           : (isSaka ? '대분화'
           : (isEnel ? '만뢰'
           : (isKashimo ? (amber ? '음파' : '주력<br>방출')
           : '50m'))));
    setLabel('btn-skill2', s2);

    // ── 3번 ──────────────────────────────────────────────────────────
    let s3 = isBors ? '팔척경<br>곡옥'
           : (isKuzan ? '아이스<br>에이지'
           : (isSaka ? '유성<br>화산'
           : (isEnel ? '뇌영'
           : (isKashimo ? '환수<br>호박' : '디트로이트'))));
    setLabel('btn-skill3', s3);

    // ⚡ 카시모 스킬 버튼 색상 · 3번 버튼 표시 여부 갱신
    if (typeof window.refreshKashimoSkillLabel === 'function') window.refreshKashimoSkillLabel(true);
};

// ============================================================================
// ⚡ 카시모 스킬 버튼 라벨 · 색상 · 표시 여부 갱신
//    · 1번 : 전하 4스택 감지 / 환수호박 여부에 따라 이름과 색이 바뀐다
//    · 2번 : 환수호박 여부에 따라 '주력 방출' ↔ '음파'
//    · 3번 : 환수호박 발동 중에는 아예 사라진다 (죽으면 다시 나타난다)
//    라벨 텍스트만 바꾸고 .cd-overlay 는 그대로 유지해야 쿨타임 표시가 깨지지 않는다.
// ============================================================================
window._kashimoLabelState = null;     // '기본' | '각성' | null(비카시모)
window._kashimoSkyState = null;       // 4스택 감지 상태

/** 내부 : .cd-overlay 를 보존한 채 라벨 텍스트만 교체 */
window._setSkillLabelKeepCd = (btnId, html) => {
    let btn = document.getElementById(btnId);
    if (!btn) return null;
    let cd = btn.querySelector('.cd-overlay');
    btn.innerHTML = html;
    if (cd) btn.appendChild(cd);
    else { let d = document.createElement('div'); d.className = 'cd-overlay'; btn.appendChild(d); }
    return btn;
};

window.refreshKashimoSkillLabel = (force) => {
    let p = window.myPlayer;
    if (!p) return;

    let btn1 = document.getElementById('btn-skill1');
    let btn2 = document.getElementById('btn-skill2');
    let btn3 = document.getElementById('btn-skill3');
    if (!btn1 || !btn2 || !btn3) return;

    // ── 카시모가 아니면 원상 복구 ────────────────────────────────────
    if (p.characterType !== 'KASHIMO') {
        if (window._kashimoLabelState !== null || force) {
            window._kashimoLabelState = null;
            window._kashimoSkyState = null;
            [btn1, btn2, btn3].forEach(b => {
                b.style.background = '';
                b.style.borderColor = '';
                b.style.boxShadow = '';
                b.style.fontSize = '';
                b.style.display = '';
                b.style.opacity = '';
                b.style.filter = '';
            });
        }
        return;
    }

    let amber = !!p.amberActive;
    let mode = amber ? '각성' : '기본';
    let sky = !!window.kashimoSkyReady;

    let modeChanged = (window._kashimoLabelState !== mode);
    let skyChanged = (window._kashimoSkyState !== sky);
    if (!modeChanged && !skyChanged && !force) return;

    window._kashimoLabelState = mode;
    window._kashimoSkyState = sky;

    if (amber) {
        // ── ⚡🔮 환수호박 각성 상태 ──────────────────────────────────
        // 1번 : 전자파
        window._setSkillLabelKeepCd('btn-skill1', '전자파');
        btn1.style.background = 'rgba(126, 34, 206, 0.95)';
        btn1.style.borderColor = '#e9d5ff';
        btn1.style.boxShadow = '0 0 16px 4px rgba(168, 85, 247, 0.85)';
        btn1.style.fontSize = '14px';
        btn1.style.display = '';
        btn1.style.opacity = '';
        btn1.style.filter = '';

        // 2번 : 음파
        window._setSkillLabelKeepCd('btn-skill2', '음파');
        btn2.style.background = 'rgba(126, 34, 206, 0.95)';
        btn2.style.borderColor = '#e9d5ff';
        btn2.style.boxShadow = '0 0 16px 4px rgba(168, 85, 247, 0.85)';
        btn2.style.fontSize = '16px';
        btn2.style.display = '';
        btn2.style.opacity = '';
        btn2.style.filter = '';

        // 3번 : 🔮 환수호박 중에는 스킬 자체가 사라진다
        btn3.style.display = 'none';
    } else {
        // ── ⚡ 기본 상태 ─────────────────────────────────────────────
        // 1번 : 번개 / 대기를 가르는 번개
        window._setSkillLabelKeepCd('btn-skill1', sky ? '대기를<br>가르는<br>번개' : '번개');
        if (sky) {
            btn1.style.background = 'rgba(126, 34, 206, 0.95)';
            btn1.style.borderColor = '#e9d5ff';
            btn1.style.boxShadow = '0 0 18px 4px rgba(168, 85, 247, 0.9)';
            btn1.style.fontSize = '11px';
        } else {
            btn1.style.background = 'rgba(168, 85, 247, 0.85)';
            btn1.style.borderColor = '#7e22ce';
            btn1.style.boxShadow = '';
            btn1.style.fontSize = '14px';
        }
        btn1.style.display = '';
        btn1.style.opacity = '';
        btn1.style.filter = '';

        // 2번 : 주력 방출
        window._setSkillLabelKeepCd('btn-skill2', '주력<br>방출');
        btn2.style.background = 'rgba(168, 85, 247, 0.85)';
        btn2.style.borderColor = '#7e22ce';
        btn2.style.boxShadow = '';
        btn2.style.fontSize = '14px';
        btn2.style.display = '';
        btn2.style.opacity = '';
        btn2.style.filter = '';

        // 3번 : 환수호박 (다시 나타난다)
        window._setSkillLabelKeepCd('btn-skill3', '환수<br>호박');
        btn3.style.display = '';
        btn3.style.background = 'rgba(88, 20, 160, 0.9)';
        btn3.style.borderColor = '#a855f7';
        btn3.style.boxShadow = '';
        btn3.style.fontSize = '14px';
        btn3.style.opacity = '';
        btn3.style.filter = '';
    }

    // 🛟 라벨을 교체하면 .cd-overlay 참조가 바뀔 수 있으므로 캐시를 비운다
    if (typeof window.invalidateCdCache === 'function') window.invalidateCdCache();
};