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
// ⚡ [신규] 카시모 하지메 — 보랏빛 전기 특성
// ============================================================================
// 🔌 반격 전류 (Counter)
//    카시모를 '평타로 때린' 대상이 되받는 피해.
//    때린 쪽이 에넬 · 카시모 본인이면 면제된다 (둘 다 전기 속성이라 감전되지 않는다).
//    ✅ [수정] 오크라(황금오크라 포함)의 근접 공격에도 반격이 발동한다.
//    ※ 스킬 피해에는 반응하지 않는다 — 오직 평타(근접 타격)에만 발동.
const KASHIMO_COUNTER_DAMAGE = 50;
const KASHIMO_COUNTER_FX_MS  = 320;    // 반격 전류 이펙트 지속 시간

// 🔋 전하(電荷) 스택
//    '카시모가 평타로 적중시킨 대상'에게 1칸씩 쌓인다 (최대 4칸).
const KASHIMO_CHARGE_MAX      = 4;
//    마지막 적중으로부터 8초가 지날 때마다 1칸씩 감소한다.
const KASHIMO_CHARGE_DECAY_MS = 8000;

// ⚡ 1번 스킬 : 번개 (전방으로 매우 빠른 한 줄기 · 관통)
const K_BOLT_COOLDOWN = 8000;
const K_BOLT_DAMAGE   = 200;
const K_BOLT_STUN     = 2000;
const K_BOLT_SPEED    = 90;
const K_BOLT_LIFE     = 34;
const K_BOLT_HITR     = 70;
const K_BOLT_EDGER    = 40;
const K_BOLT_RANGE    = K_BOLT_SPEED * K_BOLT_LIFE;   // 3060 (참고용)

// ⚡✨ 전하 4스택 대상에게 발동하는 '대기를 가르는 번개' (필중)
//    ✅ [수정] 하늘이 아니라 '시전자의 몸속'에서 번개가 뻗어 나간다.
const K_SKY_DAMAGE  = 500;
const K_SKY_STUN    = 5000;
// '화면 안'으로 간주하는 서버 판정 범위 (클라 시야와 대략 일치)
const K_SKY_RANGE_X = 1900;
const K_SKY_RANGE_Y = 1100;
const K_SKY_FX_MS   = 700;

// ⚡🌋 [신규] 2번 스킬 : 주력 방출
//    4초 동안 위로 솟구치는 보랏빛 에너지를 마구 방출한다.
//    범위 안의 대상은 0.2초마다 20 피해 + 0.2초 경직을 받는다.
const K_SURGE_COOLDOWN = 20000;
const K_SURGE_DURATION = 4000;
const K_SURGE_TICK_MS  = 200;
const K_SURGE_TICK_DMG = 20;
const K_SURGE_STUN     = 200;
const K_SURGE_WIDTH    = 360;    // 좌우 판정 폭 (시전자 중심 ±180)
const K_SURGE_HEIGHT   = 900;    // 위로 뻗는 판정 높이
const K_SURGE_DOWN     = 80;     // 발밑 판정 여유

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
    // ⚡ 카시모 하지메
    KASHIMO_COUNTER_DAMAGE, KASHIMO_COUNTER_FX_MS,
    KASHIMO_CHARGE_MAX, KASHIMO_CHARGE_DECAY_MS,
    K_BOLT_COOLDOWN, K_BOLT_DAMAGE, K_BOLT_STUN, K_BOLT_SPEED, K_BOLT_LIFE,
    K_BOLT_HITR, K_BOLT_EDGER, K_BOLT_RANGE,
    K_SKY_DAMAGE, K_SKY_STUN, K_SKY_RANGE_X, K_SKY_RANGE_Y, K_SKY_FX_MS,
    K_SURGE_COOLDOWN, K_SURGE_DURATION, K_SURGE_TICK_MS, K_SURGE_TICK_DMG,
    K_SURGE_STUN, K_SURGE_WIDTH, K_SURGE_HEIGHT, K_SURGE_DOWN
};