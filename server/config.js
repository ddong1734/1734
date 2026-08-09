// 파일명: server/config.js
// ============================================================================
// 🎛️ 모든 게임 수치 상수를 한곳에 모았다.
//    index.js / gameLoop 계열이 전부 여기서 값을 읽어 쓴다.
// ============================================================================

const GROUND_Y_SERVER = 2000;
const MIRROR_WIDTH = 32000;                       // 🌲 정글 미러링 기준 폭

// ── 🥊 박힌범 (중앙 정글 최상단 '바구니' 전용 보스) ──────────────────────────
const HINBEOM_AREA   = { minX: 13400, maxX: 18600, minY: -2400, maxY: -1340 };
const HINBEOM_GROUND = -1400;
const HINBEOM_RADIUS = 63 * 1.5;                  // 94.5
const HINBEOM_MAXHP  = 2000 * 5;                  // 10000
const HINBEOM_SPEED  = 1.75;
const HINBEOM_HOME_X = 16000;
const HINBEOM_HOME_Y = HINBEOM_GROUND - HINBEOM_RADIUS;
const HINBEOM_REGEN  = 100;

const HAKI_CHANCE    = 0.07;
const HAKI_ROLL_MS   = 1000;
const HAKI_DURATION  = 4000;
const HAKI_TICK_MS   = 1000;
const HAKI_TICK_DMG  = 100;
const HAKI_TICKS     = 4;

const HINBEOM_GOLD    = 5000;
const HINBEOM_XP      = 500 * 2;
const HINBEOM_RESPAWN = 120000;

const HINBEOM_DROP_ITEM   = 'hinbeom_okra';
const HINBEOM_DROP_DAMAGE = 2500;
const HINBEOM_DROP_CHANCE = 0.15;

const MINION_DROP_ITEM   = 'halbae_okra';
const MINION_DROP_CHANCE = 0.05;

// ── 🌀 포탈 공통 ────────────────────────────────────────────────────────────
const PORTAL_RADIUS        = 110;
const PORTAL_DURATION      = HINBEOM_RESPAWN;
const DARK_PORTAL_DURATION = 15000;
const PORTAL_COOLDOWN      = 300;
const PORTAL_DWELL_MS      = 3000;

// ── 🐗 패기 3회마다 소환되는 할배새끼 ───────────────────────────────────────
const MINION_EVERY   = 3;
const MINION_HP      = 2000;
const MINION_RADIUS  = 63;
const MINION_SPEED   = 1.75;
const MINION_MARGIN  = 200;
const MINION_MAX     = 8;
const MINION_GOLD    = 1000;
const MINION_XP      = 100;

// ── ⚫ 검은수염 (암흑 왕좌) ─────────────────────────────────────────────────
const DARK_AREA     = { minX: 36000, maxX: 41000, minY: 600, maxY: 2060 };
const DARK_GROUND   = 2000;
const DARK_ENTRY_X  = 38500;
const DARK_ENTRY_Y  = DARK_GROUND - 45;
const DARK_ZONE_MIN = 35400;
const DARK_ZONE_MAX = 41600;

const BB_RADIUS  = HINBEOM_RADIUS;                          // 94.5
const BB_MAXHP   = Math.round(HINBEOM_MAXHP * 1.2 * 1.2);   // 14400
const BB_SPEED   = 1.75;
const BB_HOME_X  = 38500;
const BB_HOME_Y  = DARK_GROUND - BB_RADIUS;
const BB_GOLD    = 8000;
const BB_XP      = 1500;
const BB_RESPAWN = 120000;

const BB_GURA_DROP_ITEM   = 'gura_fruit';
const BB_GURA_DROP_CHANCE = 0.20;
const BB_YAMI_DROP_ITEM   = 'yami_fruit';
const BB_YAMI_DROP_CHANCE = 0.20;

// 🍒 체리파이 (검은수염 처치 드롭 · 희귀 · 50%)
const BB_PIE_DROP_ITEM   = 'cherry_pie';
const BB_PIE_DROP_CHANCE = 0.50;

// 🌊 암흑물질 장판
const DARKFLOOR_CHANCE   = 0.07;
const DARKFLOOR_ROLL_MS  = 1000;
const DARKFLOOR_DURATION = 4000;
const DARKFLOOR_TICK_MS  = 500;
const DARKFLOOR_TICK_DMG = 40;
const DARKFLOOR_SLOW     = 0.3;

// ⛓️ 크로우즈 + 파공아
const CROWS_INTERVAL   = 5000;
const CROWS_TELEGRAPH  = 1000;
const CROWS_RANGE      = Math.round(1680 * 3 * 1.5);   // 7560
const CROWS_THICKNESS  = Math.round(90 * 3 * 1.5);     // 405
const CROWS_PULL_MS    = 420;
const GURA_DAMAGE      = 500;
const GURA_RADIUS_MULT = 3.0;

// 🌑 공중 강림
const DESCENT_CHANCE    = 0.03;
const DESCENT_ROLL_MS   = 1000;
const DESCENT_DURATION  = 5000;
const DESCENT_TICK_MS   = 1000;
const DESCENT_TICK_DMG  = 150;
const DESCENT_RISE      = 420;
const DESCENT_ASCEND_MS = 2000;

// ── 💥 흔들흔들열매 (평타 → 0.5초 경직 후 파공아) ───────────────────────────
const P_GURA_COOLDOWN  = 10000;
const P_GURA_CHARGE_MS = 500;
const P_GURA_DAMAGE    = 150;
const P_GURA_STUN      = 1000;
const P_GURA_RADIUS    = BB_RADIUS * GURA_RADIUS_MULT;   // 283.5

// ✨ 시너지(강화) 파공아
const P_GURA_SUPER_MULT   = 1.3;
const P_GURA_SUPER_RADIUS = P_GURA_RADIUS * P_GURA_SUPER_MULT;   // 368.55
const P_GURA_SUPER_DAMAGE = 300;
const P_GURA_SUPER_STUN   = 2000;

// ── ⛓️ 어둠어둠열매 (평타 → 즉시 전방 크로우즈) ────────────────────────────
const P_YAMI_COOLDOWN  = 7000;
const P_YAMI_RANGE     = Math.round(1680 * 0.3);     // 504
const P_YAMI_THICKNESS = Math.round(90 * 3 * 0.7);   // 189
const P_YAMI_BIND_MS   = 2000;
const P_YAMI_TICK_MS   = 500;
const P_YAMI_TICK_DMG  = 25;
const P_YAMI_FX_MS     = 420;

// ── 🟪 지저스 바제스 ────────────────────────────────────────────────────────
const BG_RADIUS = BB_RADIUS * 0.8;                 // 75.6
const BG_MAXHP  = Math.round(BB_MAXHP * 0.5);      // 7200
const BG_SPEED  = 2.2;
const BG_GOLD   = 4000;
const BG_XP     = 800;

const BG_BELT_DROP_ITEM   = 'champion_belt';
const BG_BELT_DROP_CHANCE = 0.30;

const BG_FALL_FROM   = -2600;
const BG_FALL_SPEED  = 120;
const BG_LAND_DAMAGE = 500;
const BG_LAND_MULT   = 6.0;

const BG_JUMP_INTERVAL  = 2000;
const BG_JUMP_TELEGRAPH = 700;
const BG_JUMP_TRAVEL    = 320;
const BG_JUMP_DAMAGE    = 300;
const BG_JUMP_MULT      = 4.5;
const BG_JUMP_ARC       = 520;
const BG_GRAVITY        = 2.4;

// ── 🛟 캐스팅 잠금 워치독 ───────────────────────────────────────────────────
const CAST_STUCK_GRACE_MS = 1500;

// ============================================================================
// 🗣️ NPC '티치'
//    각 팀 정글(오크라 구역) 위쪽 가로 발판 중앙에 한 명씩 서 있다.
//    · 블루팀 : data.js 의 JungleBlueData { x:2200, y:600 } 발판(폭 1000)의 중앙 = 2700
//    · 레드팀 : 미러 좌표(32000 - 2200 - 1000 = 28800)의 중앙 = 29300
//    상대팀 NPC 에게는 상호작용할 수 없다.
// ============================================================================
const NPC_RADIUS         = 45;
const NPC_PLATFORM_Y     = 600;                       // 발판 윗면 Y
const NPC_INTERACT_RANGE = 200;                       // 상호작용 가능 거리

const NPC_TICH = [
    { id: 'npc_tich_1', team: 1, name: '티치', x: 2700,  y: NPC_PLATFORM_Y - NPC_RADIUS },
    { id: 'npc_tich_2', team: 2, name: '티치', x: 29300, y: NPC_PLATFORM_Y - NPC_RADIUS }
];

// 🗣️ 티치 1차 대화 (퀘스트 수락)
const TICH_LINES_INTRO = [
    "'해적'이란 건!! 이해만 일치하면 그만이다!!",
    "나에게 '체리파이' 하나만 주면 훌륭한 보상을 주도록 하지!! 제하하하하!!!",
    "사람의 꿈은!!! 끝나지 않아!!!!"
];

// 🗣️ 티치 2차 대화 (체리파이 제출)
//    · 0번 대사에서 [동의합니다] 를 누르는 순간 체리파이 1개가 사라지고,
//      이후 대사에서는 [나가기] 버튼이 사라진다.
const TICH_LINES_TURNIN = [
    "나의 사랑하는 '체리파이'는 잘 있겠지-?!",
    "이 '체리파이'는 죽음으로 맛있는데-!!",
    "보상으로 '악마의 열매' 2개를 주도록 하지!! 제하하하하!",
    "제하하하하-!! 약점보다 이점이 있는 게 '악마의 열매'잖나!!!"
];

const TICH_QUEST_ITEM = 'cherry_pie';
const TICH_QUEST_TEXT = "['티치'에게 체리파이 한 개 주기]";

// 🍈 보상으로 지급되는 '악마의 열매' 후보 (이 중 랜덤 2개)
const TICH_REWARD_FRUITS = ['pika_fruit', 'hie_fruit', 'magu_fruit', 'goro_fruit', 'gura_fruit', 'yami_fruit'];
const TICH_REWARD_COUNT  = 2;

// ============================================================================
// ⚡ 카시모 하지메 — 보랏빛 전기 특성
//    ✅ 카시모의 모든 스킬은 화면 흔들림을 발생시키지 않는다.
// ============================================================================
// 🔌 반격 전류 : 카시모를 '평타로 때린' 대상이 되받는 피해.
//    때린 쪽이 에넬 · 카시모 본인이면 면제.
//    오크라(황금오크라 포함)의 근접 공격에도 반격이 발동한다.
const KASHIMO_COUNTER_DAMAGE = 50;
const KASHIMO_COUNTER_FX_MS  = 320;

// 🔋 전하(電荷) 스택 — 지속 5초
const KASHIMO_CHARGE_MAX      = 4;
const KASHIMO_CHARGE_DECAY_MS = 5000;

// ⚡ 1번 스킬 : 번개 (전방으로 매우 빠른 한 줄기 · 관통)
const K_BOLT_COOLDOWN = 8000;
const K_BOLT_DAMAGE   = 200;
const K_BOLT_STUN     = 2000;
const K_BOLT_SPEED    = 90;
const K_BOLT_LIFE     = 34;
const K_BOLT_HITR     = 70;
const K_BOLT_EDGER    = 40;
const K_BOLT_RANGE    = K_BOLT_SPEED * K_BOLT_LIFE;   // 3060 (참고용)

// 🏵️ 여의 장착 시 번개 강화
//    · 두께(판정 반경)가 늘어나고
//    · 날아가는 속도가 비약적으로 빨라진다 (사거리 유지를 위해 life 를 줄인다)
const K_BOLT_YEOUI_HITR  = 130;
const K_BOLT_YEOUI_EDGER = 75;
const K_BOLT_YEOUI_SPEED = 210;
const K_BOLT_YEOUI_LIFE  = 22;

// ⚡✨ 전하 4스택 대상에게 발동하는 '대기를 가르는 번개' (관통 · 기절 3초)
const K_SKY_DAMAGE  = 500;
const K_SKY_STUN    = 3000;
const K_SKY_RANGE_X = 1900;
const K_SKY_RANGE_Y = 1100;
const K_SKY_FX_MS   = 700;
const K_SKY_PIERCE_THICKNESS = 150;
const K_SKY_PIERCE_OVERSHOOT = 700;

// ⚡🌋 2번 스킬 : 주력 방출 (시전 중 완전 고정)
//    ✅ [수정] 지속시간 4초 → 3초
const K_SURGE_COOLDOWN = 20000;
const K_SURGE_DURATION = 3000;
const K_SURGE_TICK_MS  = 200;
const K_SURGE_TICK_DMG = 20;
const K_SURGE_STUN     = 200;
const K_SURGE_WIDTH    = 720;    // 좌우 판정 폭 (시전자 중심 ±360)
const K_SURGE_HEIGHT   = 900;
const K_SURGE_DOWN     = 80;
// 🏵️ 여의 장착 시 주력 방출 좌우 범위 증가
const K_SURGE_YEOUI_WIDTH = 1150;

// ============================================================================
// ⚡🔮 3번 스킬 : 환수호박(幻獸琥珀)
//    · 이동속도 1.3배
//    · 죽을 때까지 해제 불가. 모든 회복 기능 무효. 초당 최대 체력 4% 소모.
//    · ✅ [수정] 평상시 전류 잔상을 없앴다. (돌진 중에만 잔상이 남는다)
//    · ✅ [수정] 평타를 누르면 조이스틱 방향으로 '전격 돌진'한다.
// ============================================================================
const K_AMBER_COOLDOWN   = 60000;
const K_AMBER_SPEED_MULT = 1.3;
const K_AMBER_DRAIN_PCT  = 0.04;
const K_AMBER_DRAIN_MS   = 1000;
const K_AMBER_TRAIL_MS   = 900;    // 돌진 잔상 지속
const K_AMBER_TRAIL_GAP  = 42;     // 돌진 잔상 간격
const K_AMBER_TRAIL_MAX  = 60;

// ⚡🔮 [수정] 환수호박 평타 = 전격 돌진(대시)
//    · 조이스틱 방향으로 매우 빠르게 돌진한다 (기존 순간이동 151.2 → 432)
//    · 가로벽(발판)은 통과할 수 있지만, 세로벽(solid)은 통과할 수 없다.
//    · 돌진 중에는 전류 잔상이 계속 남는다.
//    · 경로에 닿은 대상은 150 피해 + 0.5초 기절
const K_ADASH_DIST      = 432;     // 총 돌진 거리 (판정용)
const K_ADASH_DURATION  = 200;     // 돌진 지속 시간(ms)
const K_ADASH_SPEED     = 24;      // 프레임당 이동량 (× MOVEMENT_SPEED)
const K_ADASH_COOLDOWN  = 400;     // 돌진 최소 간격
const K_ADASH_DAMAGE    = 150;
const K_ADASH_STUN      = 500;
const K_ADASH_RADIUS    = 120;     // 경로 판정 두께(반경)
const K_ADASH_FX_MS     = 420;     // 돌진 궤적 이펙트 지속

// ⚡ 환수호박 전용 1번 : 전자파 (앞으로 날아가는 연쇄 전기폭발)
const K_WAVE_COOLDOWN  = 8000;
const K_WAVE_DAMAGE    = 200;
const K_WAVE_STUN      = 1000;
const K_WAVE_RANGE     = 840;
const K_WAVE_RADIUS    = 135;
const K_WAVE_COUNT     = 6;
const K_WAVE_STEP_MS   = 55;
const K_WAVE_FX_MS     = 320;
// ⚡🌩️ 뇌신 장착 시 전자파 강화
//    · 범위 · 사거리가 조금 늘어난다
//    · 마지막 연쇄폭발이 끝나고 0.3초 뒤, 폭발이 일어났던 모든 자리에서 동시에 재폭발
const K_WAVE_RAIJIN_RANGE  = 1100;
const K_WAVE_RAIJIN_RADIUS = 175;
const K_WAVE_RAIJIN_ECHO_DELAY = 300;

// ⚡ 환수호박 전용 2번 : 음파 (전방 넓은 부채꼴 전기 음파)
//    ✅ 시전자 경직 0.5초
const K_SONIC_COOLDOWN  = 8000;
const K_SONIC_CHARGE_MS = 500;
const K_SONIC_DAMAGE    = 350;
const K_SONIC_STUN      = 2000;
const K_SONIC_RANGE     = 900;
const K_SONIC_ANGLE     = Math.PI * 0.62;
const K_SONIC_FX_MS     = 520;
// ⚡🌩️ 뇌신 장착 시 음파와 함께 번개 7발이 부채꼴로 동시 발사된다
//    ✅ [수정] 각 100 피해 · 탄속 감소(210 → 150) · 탄환 길이 증가
const K_SONIC_RAIJIN_BOLTS       = 7;
const K_SONIC_RAIJIN_BOLT_DAMAGE = 100;
const K_SONIC_RAIJIN_BOLT_SPEED  = 150;
const K_SONIC_RAIJIN_BOLT_LIFE   = 26;

module.exports = {
    GROUND_Y_SERVER, MIRROR_WIDTH,
    HINBEOM_AREA, HINBEOM_GROUND, HINBEOM_RADIUS, HINBEOM_MAXHP, HINBEOM_SPEED,
    HINBEOM_HOME_X, HINBEOM_HOME_Y, HINBEOM_REGEN,
    HAKI_CHANCE, HAKI_ROLL_MS, HAKI_DURATION, HAKI_TICK_MS, HAKI_TICK_DMG, HAKI_TICKS,
    HINBEOM_GOLD, HINBEOM_XP, HINBEOM_RESPAWN,
    HINBEOM_DROP_ITEM, HINBEOM_DROP_DAMAGE, HINBEOM_DROP_CHANCE,
    MINION_DROP_ITEM, MINION_DROP_CHANCE,
    PORTAL_RADIUS, PORTAL_DURATION, DARK_PORTAL_DURATION, PORTAL_COOLDOWN, PORTAL_DWELL_MS,
    MINION_EVERY, MINION_HP, MINION_RADIUS, MINION_SPEED, MINION_MARGIN, MINION_MAX, MINION_GOLD, MINION_XP,
    DARK_AREA, DARK_GROUND, DARK_ENTRY_X, DARK_ENTRY_Y, DARK_ZONE_MIN, DARK_ZONE_MAX,
    BB_RADIUS, BB_MAXHP, BB_SPEED, BB_HOME_X, BB_HOME_Y, BB_GOLD, BB_XP, BB_RESPAWN,
    BB_GURA_DROP_ITEM, BB_GURA_DROP_CHANCE, BB_YAMI_DROP_ITEM, BB_YAMI_DROP_CHANCE,
    // 🍒 체리파이 드롭
    BB_PIE_DROP_ITEM, BB_PIE_DROP_CHANCE,
    DARKFLOOR_CHANCE, DARKFLOOR_ROLL_MS, DARKFLOOR_DURATION, DARKFLOOR_TICK_MS, DARKFLOOR_TICK_DMG, DARKFLOOR_SLOW,
    CROWS_INTERVAL, CROWS_TELEGRAPH, CROWS_RANGE, CROWS_THICKNESS, CROWS_PULL_MS,
    GURA_DAMAGE, GURA_RADIUS_MULT,
    DESCENT_CHANCE, DESCENT_ROLL_MS, DESCENT_DURATION, DESCENT_TICK_MS, DESCENT_TICK_DMG,
    DESCENT_RISE, DESCENT_ASCEND_MS,
    P_GURA_COOLDOWN, P_GURA_CHARGE_MS, P_GURA_DAMAGE, P_GURA_STUN, P_GURA_RADIUS,
    P_GURA_SUPER_MULT, P_GURA_SUPER_RADIUS, P_GURA_SUPER_DAMAGE, P_GURA_SUPER_STUN,
    P_YAMI_COOLDOWN, P_YAMI_RANGE, P_YAMI_THICKNESS, P_YAMI_BIND_MS, P_YAMI_TICK_MS, P_YAMI_TICK_DMG, P_YAMI_FX_MS,
    BG_RADIUS, BG_MAXHP, BG_SPEED, BG_GOLD, BG_XP,
    BG_BELT_DROP_ITEM, BG_BELT_DROP_CHANCE,
    BG_FALL_FROM, BG_FALL_SPEED, BG_LAND_DAMAGE, BG_LAND_MULT,
    BG_JUMP_INTERVAL, BG_JUMP_TELEGRAPH, BG_JUMP_TRAVEL, BG_JUMP_DAMAGE, BG_JUMP_MULT, BG_JUMP_ARC, BG_GRAVITY,
    CAST_STUCK_GRACE_MS,
    // 🗣️ NPC 티치
    NPC_RADIUS, NPC_PLATFORM_Y, NPC_INTERACT_RANGE, NPC_TICH,
    TICH_LINES_INTRO, TICH_LINES_TURNIN, TICH_QUEST_ITEM, TICH_QUEST_TEXT,
    TICH_REWARD_FRUITS, TICH_REWARD_COUNT,
    // ⚡ 카시모 하지메
    KASHIMO_COUNTER_DAMAGE, KASHIMO_COUNTER_FX_MS,
    KASHIMO_CHARGE_MAX, KASHIMO_CHARGE_DECAY_MS,
    K_BOLT_COOLDOWN, K_BOLT_DAMAGE, K_BOLT_STUN, K_BOLT_SPEED, K_BOLT_LIFE,
    K_BOLT_HITR, K_BOLT_EDGER, K_BOLT_RANGE,
    K_BOLT_YEOUI_HITR, K_BOLT_YEOUI_EDGER, K_BOLT_YEOUI_SPEED, K_BOLT_YEOUI_LIFE,
    K_SKY_DAMAGE, K_SKY_STUN, K_SKY_RANGE_X, K_SKY_RANGE_Y, K_SKY_FX_MS,
    K_SKY_PIERCE_THICKNESS, K_SKY_PIERCE_OVERSHOOT,
    K_SURGE_COOLDOWN, K_SURGE_DURATION, K_SURGE_TICK_MS, K_SURGE_TICK_DMG,
    K_SURGE_STUN, K_SURGE_WIDTH, K_SURGE_HEIGHT, K_SURGE_DOWN,
    K_SURGE_YEOUI_WIDTH,
    // ⚡🔮 환수호박
    K_AMBER_COOLDOWN, K_AMBER_SPEED_MULT, K_AMBER_DRAIN_PCT, K_AMBER_DRAIN_MS,
    K_AMBER_TRAIL_MS, K_AMBER_TRAIL_GAP, K_AMBER_TRAIL_MAX,
    // ⚡🔮 환수호박 평타 돌진
    K_ADASH_DIST, K_ADASH_DURATION, K_ADASH_SPEED, K_ADASH_COOLDOWN,
    K_ADASH_DAMAGE, K_ADASH_STUN, K_ADASH_RADIUS, K_ADASH_FX_MS,
    K_WAVE_COOLDOWN, K_WAVE_DAMAGE, K_WAVE_STUN, K_WAVE_RANGE, K_WAVE_RADIUS,
    K_WAVE_COUNT, K_WAVE_STEP_MS, K_WAVE_FX_MS,
    K_WAVE_RAIJIN_RANGE, K_WAVE_RAIJIN_RADIUS, K_WAVE_RAIJIN_ECHO_DELAY,
    K_SONIC_COOLDOWN, K_SONIC_CHARGE_MS, K_SONIC_DAMAGE, K_SONIC_STUN,
    K_SONIC_RANGE, K_SONIC_ANGLE, K_SONIC_FX_MS,
    K_SONIC_RAIJIN_BOLTS, K_SONIC_RAIJIN_BOLT_DAMAGE, K_SONIC_RAIJIN_BOLT_SPEED, K_SONIC_RAIJIN_BOLT_LIFE
};