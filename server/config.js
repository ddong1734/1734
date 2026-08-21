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
const MINION_DROP_CHANCE = 0.10;   // 🐗 할배새끼 오크라 드랍 10%

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

// ══════════════════════════════════════════════════════════════════════════
// 🔥 저주의 왕 (헤이안 스쿠나) — 신규 별세계
//
//   · 박힌범을 처치하면 25% 확률로 '저주의 왕 포탈'(검붉은 색)이 열린다.
//     암흑 왕좌 포탈과 동시에 열릴 수 있으므로 좌표가 겹치지 않게 배치한다.
//   · 포탈에 3초간 머무르면 이 맵으로 이동한다. 15초 뒤 포탈은 사라진다.
//   · 맵은 붉은 하늘에 갈색 바위가 깔린 벌판이다.
//   · 암흑 왕좌(35400~41600)와 겹치지 않도록 그 오른쪽에 둔다.
// ══════════════════════════════════════════════════════════════════════════
const CURSE_AREA     = { minX: 43500, maxX: 48500, minY: 600, maxY: 2060 };
const CURSE_GROUND   = 2000;
const CURSE_ENTRY_X  = 46000;
const CURSE_ENTRY_Y  = CURSE_GROUND - 45;
const CURSE_ZONE_MIN = 42900;
const CURSE_ZONE_MAX = 49100;

const BB_RADIUS  = HINBEOM_RADIUS;                          // 94.5
const BB_MAXHP   = Math.round(HINBEOM_MAXHP * 1.2 * 1.2);   // 14400
const BB_SPEED   = 1.75;
const BB_HOME_X  = 38500;
const BB_HOME_Y  = DARK_GROUND - BB_RADIUS;
const BB_GOLD    = 8000;
const BB_XP      = 1500;
const BB_RESPAWN = 120000;

// ══════════════════════════════════════════════════════════════════════════
// 🔥 헤이안 스쿠나 — 체력과 크기는 검은수염과 동일하다.
//    (BB_RADIUS / BB_MAXHP 를 참조하므로 반드시 검은수염 상수 뒤에 와야 한다)
// ══════════════════════════════════════════════════════════════════════════
const SK_RADIUS  = BB_RADIUS;
const SK_MAXHP   = BB_MAXHP;
const SK_SPEED   = 1.75;
const SK_HOME_X  = CURSE_ENTRY_X;
const SK_HOME_Y  = CURSE_GROUND - SK_RADIUS;
const SK_GOLD    = 9000;
const SK_XP      = 1700;
const SK_RESPAWN = 120000;

// ⚔️ 참격 : 3초마다 가장 가까운 대상에게
const SK_SLASH_INTERVAL = 3000;   // 3초 주기
const SK_SLASH_TELE_MS  = 700;    // 예고(불투명 빨간 박스) 후 0.7초 뒤 발사
const SK_SLASH_DMG      = 200;    // 피해 200
const SK_SLASH_W        = 900;    // 참격 범위(가로) — 560 → 900 확대
const SK_SLASH_H        = 460;    // 참격 범위(세로) — 300 → 460 확대

// ⚔️⚔️ 연속 참격 : 참격을 날릴 때 20% 확률로 발동
const SK_BARRAGE_CHANCE  = 0.20;  // 20% 확률
const SK_BARRAGE_DUR_MS  = 2000;  // 2초 동안 퍼붓는다
const SK_BARRAGE_STEP_MS = 400;   // 0.4초마다
const SK_BARRAGE_COUNT   = 3;     // 한 번에 참격 3개

// 🏹 화염 화살 : 체력 70% · 40% 에서 각 1회
const SK_BOW_HP_GATES  = [0.70, 0.40];
const SK_BOW_AIM_MS    = 2000;   // 2초 조준 (조준 중 목표 고정)
const SK_BOW_DMG       = 700;    // 폭발 피해
const SK_BOW_BLAST_R   = 780;    // 폭발 반경 — 420 → 620 확대
const SK_BOW_FIRE_MS   = 4000;   // 불길 지속 4초
const SK_BOW_FIRE_R    = 860;    // 불길 반경 — 460 → 680 확대
const SK_BOW_FIRE_TICK = 400;    // 0.4초마다
const SK_BOW_FIRE_DMG  = 70;     // 불길 피해

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
// 🗡️ NPC '마허라'
//    티치와 마찬가지로 각 팀 정글 최상단 가로 발판 중앙에 한 명씩 서 있다.
//    · 티치   : JungleBlueData { x:2200, y:600 } 발판 중앙 → 블루 2700  / 레드 29300
//    · 마허라 : JungleBlueData { x:4800, y:600 } 발판 중앙 → 블루 5300  / 레드 26700
//    상대팀 NPC 에게는 상호작용할 수 없다.
// ============================================================================
const NPC_MAHERA = [
    { id: 'npc_mahera_1', team: 1, name: '마허라', x: 5300,  y: NPC_PLATFORM_Y - NPC_RADIUS },
    { id: 'npc_mahera_2', team: 2, name: '마허라', x: 26700, y: NPC_PLATFORM_Y - NPC_RADIUS }
];

// 🗡️ 마허라 1차 대화 (퀘스트 수락) — [동의합니다] 3번
const MAHERA_LINES_INTRO = [
    "...",
    "(법진과 퇴마의 검이 필요해 보인다)",
    "(드르륵)"
];

// 🗡️ 마허라 2차 대화 (아이템 제출)
//    · 0번 대사에서 [동의합니다] 를 누르는 순간 법진 · 퇴마의 검이 사라지고,
//      이후 대사에서는 [나가기] 버튼이 사라진다.
//    · 마지막 대사에서 [동의합니다] 를 누르면 '세계를 가르는 참격' 을 지급한다.
const MAHERA_LINES_TURNIN = [
    "('법진'과 '퇴마의 검'을 마허라에게 준다)",
    "(드르륵)"
];

// 🗡️ 제출해야 하는 아이템 (둘 다 인벤토리에 있어야 한다)
const MAHERA_QUEST_ITEMS = ['beopjin', 'toema_sword'];
const MAHERA_QUEST_TEXT  = "['마허라'에게 법진과 퇴마의 검 주기]";

// 🗡️ 퀘스트 완료 보상
const MAHERA_REWARD_ITEM = 'world_cleave';

// ============================================================================
// 🌑 마허라 2차 퀘스트 — ⬛ 다부라 카라바 전용
//    1차 퀘스트(세계를 가르는 참격)를 끝낸 다부라만 다시 말을 걸 수 있다.
//    보상은 '유명이경 역월'(등급 ???) 이며, 세계를 가르는 참격을 회수한다.
//
//    ⚠️ 대사마다 '말하는 사람'이 다르다.
//       마지막 줄만 다부라 카라바 본인이 말하므로 화자 배열을 따로 둔다.
//       (배열 길이는 대사 배열과 반드시 같아야 한다)
// ============================================================================
const MAHERA2_LINES_INTRO   = ["...", "(세계를 가르는 참격이 필요해 보인다)"];
const MAHERA2_SPEAKER_INTRO = ["마허라", "마허라"];

const MAHERA2_LINES_TURNIN   = ["(드르륵)", "진보했군, 지구의 주술은."];
const MAHERA2_SPEAKER_TURNIN = ["마허라", "다부라 카라바"];

// 🗡️ 2차 퀘스트가 요구하는 아이템 · 표시 문구 · 보상
const MAHERA2_QUEST_ITEMS = ['world_cleave'];
const MAHERA2_QUEST_TEXT  = "['마허라'에게 세계를 가르는 참격 주기]";
const MAHERA2_REWARD_ITEM = 'yumyeong';
const MAHERA2_ONLY_CHAR   = 'DABURA';

// ============================================================================
// 🌑 [유명이경 역월] — '유명이경 역월' 장착 시 열리는 4번 스킬 (영역 전개)
//
//   전개 흐름
//     ① 시전   : 1초 경직 (YUM_CAST_MS)
//     ② 전개   : 반경 YUM_RADIUS 원 안의 모든 대상이 4초 경직 (YUM_EXPAND_MS)
//                · 화면이 1초 동안 어두워졌다가 (YUM_DARK_MS)
//                  3초 동안 밝아지며 영역 배경으로 자연스럽게 바뀐다
//                · 이 4초 동안 흑백 각진 상자 더미가 점점 증식한다
//     ③ 지속   : 15초 (YUM_DURATION_MS) — 상자 더미가 서로 부딪히며 일렁인다
//     ④ 붕괴   : 배경이 무너지며 원래 장소로 돌아온다 (YUM_COLLAPSE_MS)
//
//   범위 근거
//     · 각성(갓 에넬) 뇌영 폭 = ENEL_S3.width 270 × 2.5 = 675
//     · 이를 '반지름' 으로 잡으면 지름 1350 이 되어
//       각성 엘 토르 사거리(1680)와 비슷한 크기의 큰 원이 된다.
//       두 기준을 모두 만족하는 값이라 675 로 정했다.
// ============================================================================
const YUM_CD          = 130000;  // 쿨타임 130초
const YUM_CAST_MS     = 1000;    // ① 시전 경직 1초
const YUM_EXPAND_MS   = 4000;    // ② 전개 연출 4초
const YUM_STUN_MS     = 3000;    // ②' 경직은 3초 (시전자 · 적 · 몬스터 모두)
const YUM_DARK_MS     = 1000;    //    그 중 앞 1초는 점점 어두워진다
const YUM_DURATION_MS = 17000;   // ③ 영역 지속 17초 (15초 → 2초 연장)
const YUM_COLLAPSE_MS = 1200;    // ④ 붕괴 연출
const YUM_RADIUS      = 675;     // 영역 반경

// ============================================================================
// 🗡️ [세계를 가르는 참격] — '세계를 가르는 참격' 아이템 장착 시 열리는 4번 스킬
//    · 0.5초 경직 후 전방으로 매우 빠른 참격을 발사한다.
//    · 방어력을 완전히 무시하며, 아군을 제외한 모든 대상을 관통해 타격한다.
//    · 범위 · 사거리는 각성(쿠릉쿠릉) 엘 토르와 동일하다.
//        - 엘 토르 range 1680 · thickness 90, 각성 시 thickness ×3 = 270
// ============================================================================
const CLEAVE_CD         = 130000;   // 쿨타임 130초
const CLEAVE_CAST_MS    = 500;      // 발사 전 경직 0.5초
const CLEAVE_DAMAGE     = 850;      // 고정 피해 (방어 무시)
// 📏 [확대] 사거리 1680 → 3400 · 두께 270 → 760
//    조이스틱 방향이 아니라 '바라보는 정면' 으로만 발사한다.
const CLEAVE_RANGE      = 3400;     // 사거리
const CLEAVE_THICKNESS  = 760;      // 두께
const CLEAVE_FX_MS      = 520;      // 참격 이펙트 지속시간

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

// ⚡🌋 2번 스킬 : 주력 방출 (시전 중 완전 고정 · 지속 3초)
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
// ============================================================================
const K_AMBER_COOLDOWN   = 60000;
const K_AMBER_SPEED_MULT = 1.3;
const K_AMBER_DRAIN_PCT  = 0.04;
const K_AMBER_DRAIN_MS   = 1000;
const K_AMBER_TRAIL_MS   = 900;    // 돌진 잔상 지속
const K_AMBER_TRAIL_GAP  = 42;     // 돌진 잔상 간격
const K_AMBER_TRAIL_MAX  = 60;

// ⚡🔮 환수호박 평타 = 전격 돌진(대시)
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
const K_WAVE_RAIJIN_RANGE  = 1100;
const K_WAVE_RAIJIN_RADIUS = 175;
const K_WAVE_RAIJIN_ECHO_DELAY = 300;

// ⚡ 환수호박 전용 2번 : 음파 (전방 넓은 부채꼴 전기 음파)
const K_SONIC_COOLDOWN  = 8000;
const K_SONIC_CHARGE_MS = 500;
const K_SONIC_DAMAGE    = 350;
const K_SONIC_STUN      = 2000;
const K_SONIC_RANGE     = 900;
const K_SONIC_ANGLE     = Math.PI * 0.62;
const K_SONIC_FX_MS     = 520;
// ⚡🌩️ 뇌신 장착 시 번개 7발 (각 100 피해 · 탄속 감소 · 탄환 길이 증가)
const K_SONIC_RAIJIN_BOLTS       = 7;
const K_SONIC_RAIJIN_BOLT_DAMAGE = 100;
const K_SONIC_RAIJIN_BOLT_SPEED  = 150;
const K_SONIC_RAIJIN_BOLT_LIFE   = 26;

// ============================================================================
// ⬛ [신규] 다부라 카라바 — 빛과 어둠
// ============================================================================
// ☀️ 1번 [빛]
//    · 박힌범의 '지름'(= HINBEOM_RADIUS × 2 = 189)만큼 매우 빠르게 위로 솟구친다
//    · 그 뒤 아래쪽으로 2초간 지속되는 큰 빛 연속폭발
//    · 0.4초마다 50 피해 · 폭발에 휘말린 대상은 폭발이 끝날 때까지 경직
//    ⬛ 아이템 장착 시 폭발 범위 1.5배
const D_LIGHT_COOLDOWN   = 20000;
const D_LIGHT_RISE_DIST  = HINBEOM_RADIUS * 2;    // 189
const D_LIGHT_RISE_MS    = 180;
const D_LIGHT_DURATION   = 2000;
const D_LIGHT_TICK_MS    = 400;
const D_LIGHT_TICK_DMG   = 50;
const D_LIGHT_RADIUS     = 430;
const D_LIGHT_SQ_RADIUS  = 645;
const D_LIGHT_DOWN       = 200;                   // 폭발 중심이 시전자보다 아래
const D_LIGHT_FX_MS      = 2000;
const D_LIGHT_BLAST_FX_MS = 480;

// 🌑 2번 [어둠]
//    · 시전자 몸 중심에 어둠 구체 + 칼바람 소용돌이(구 형태)가 3초간 따라다닌다
//    · 소용돌이 안의 모든 적은 중심으로 끌려간다 (벽은 통과 못함)
//      끌림 세기 D_DARK_PULL × MOVEMENT_SPEED(1.5) = 11.1
//      기본 이동속도는 10 × 1.5 = 15 이므로 '겨우' 빠져나갈 수 있다
//    · 3초 뒤 구체가 터지며 넓은 범위에 300 피해
//    ⬛ 아이템 장착 시 소용돌이 · 폭발 범위 증가
const D_DARK_COOLDOWN     = 30000;
const D_DARK_DURATION     = 3000;
const D_DARK_RADIUS       = 900;
const D_DARK_SQ_RADIUS    = 1250;
const D_DARK_PULL         = 7.4;
const D_DARK_BLAST_RADIUS = 520;
const D_DARK_BLAST_SQ_RADIUS = 720;
const D_DARK_BLAST_DAMAGE = 300;
const D_DARK_BLAST_FX_MS  = 640;
const D_DARK_CORE_R       = 78;

// 💫 3번 [아광속 발차기]
//    · 2초 경직(응축) → 빛으로 변해 기본 이동속도의 1.5배로 5초간 활공
//    · 가로벽 통과 · 세로벽 통과 불가 · 점프 없이 조이스틱만으로 비행
//    · 적중 시 변신이 풀리며 빛 대폭발 (500 피해)
//    ⬛ 아이템 장착 시 이동속도 배율 1.5배 → 2배
const D_KICK_COOLDOWN     = 45000;
const D_KICK_CHARGE_MS    = 2000;
const D_KICK_FLY_MS       = 5000;
const D_KICK_SPEED_MULT   = 1.5;
const D_KICK_SQ_SPEED_MULT = 2.0;
const D_KICK_HIT_RADIUS   = 95;
const D_KICK_BLAST_RADIUS = 380;
const D_KICK_BLAST_DAMAGE = 500;
const D_KICK_BLAST_FX_MS  = 580;
const D_KICK_TRAIL_MS     = 420;

// ⬛ 다부라 전용 신화 아이템 (어둠어둠열매 + 번쩍번쩍열매)
const D_SQUARE_ITEM = 'black_square';

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
    // 🔥 저주의 왕 (헤이안 스쿠나)
    CURSE_AREA, CURSE_GROUND, CURSE_ENTRY_X, CURSE_ENTRY_Y, CURSE_ZONE_MIN, CURSE_ZONE_MAX,
    SK_RADIUS, SK_MAXHP, SK_SPEED, SK_HOME_X, SK_HOME_Y, SK_GOLD, SK_XP, SK_RESPAWN,
    SK_SLASH_INTERVAL, SK_SLASH_TELE_MS, SK_SLASH_DMG, SK_SLASH_W, SK_SLASH_H,
    SK_BARRAGE_CHANCE, SK_BARRAGE_DUR_MS, SK_BARRAGE_STEP_MS, SK_BARRAGE_COUNT,
    SK_BOW_HP_GATES, SK_BOW_AIM_MS, SK_BOW_DMG, SK_BOW_BLAST_R,
    SK_BOW_FIRE_MS, SK_BOW_FIRE_R, SK_BOW_FIRE_TICK, SK_BOW_FIRE_DMG,
    BB_RADIUS, BB_MAXHP, BB_SPEED, BB_HOME_X, BB_HOME_Y, BB_GOLD, BB_XP, BB_RESPAWN,
    BB_GURA_DROP_ITEM, BB_GURA_DROP_CHANCE, BB_YAMI_DROP_ITEM, BB_YAMI_DROP_CHANCE,
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
    // 🗡️ NPC 마허라
    NPC_MAHERA, MAHERA_LINES_INTRO, MAHERA_LINES_TURNIN,
    MAHERA_QUEST_ITEMS, MAHERA_QUEST_TEXT, MAHERA_REWARD_ITEM,
    // 🌑 마허라 2차 퀘스트 (다부라 전용)
    MAHERA2_LINES_INTRO, MAHERA2_SPEAKER_INTRO,
    MAHERA2_LINES_TURNIN, MAHERA2_SPEAKER_TURNIN,
    MAHERA2_QUEST_ITEMS, MAHERA2_QUEST_TEXT, MAHERA2_REWARD_ITEM, MAHERA2_ONLY_CHAR,
    // 🌑 유명이경 역월 (영역 전개)
    YUM_CD, YUM_CAST_MS, YUM_EXPAND_MS, YUM_STUN_MS, YUM_DARK_MS,
    YUM_DURATION_MS, YUM_COLLAPSE_MS, YUM_RADIUS,
    // 🗡️ 세계를 가르는 참격
    CLEAVE_CD, CLEAVE_CAST_MS, CLEAVE_DAMAGE, CLEAVE_RANGE, CLEAVE_THICKNESS, CLEAVE_FX_MS,
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
    K_AMBER_COOLDOWN, K_AMBER_SPEED_MULT, K_AMBER_DRAIN_PCT, K_AMBER_DRAIN_MS,
    K_AMBER_TRAIL_MS, K_AMBER_TRAIL_GAP, K_AMBER_TRAIL_MAX,
    K_ADASH_DIST, K_ADASH_DURATION, K_ADASH_SPEED, K_ADASH_COOLDOWN,
    K_ADASH_DAMAGE, K_ADASH_STUN, K_ADASH_RADIUS, K_ADASH_FX_MS,
    K_WAVE_COOLDOWN, K_WAVE_DAMAGE, K_WAVE_STUN, K_WAVE_RANGE, K_WAVE_RADIUS,
    K_WAVE_COUNT, K_WAVE_STEP_MS, K_WAVE_FX_MS,
    K_WAVE_RAIJIN_RANGE, K_WAVE_RAIJIN_RADIUS, K_WAVE_RAIJIN_ECHO_DELAY,
    K_SONIC_COOLDOWN, K_SONIC_CHARGE_MS, K_SONIC_DAMAGE, K_SONIC_STUN,
    K_SONIC_RANGE, K_SONIC_ANGLE, K_SONIC_FX_MS,
    K_SONIC_RAIJIN_BOLTS, K_SONIC_RAIJIN_BOLT_DAMAGE, K_SONIC_RAIJIN_BOLT_SPEED, K_SONIC_RAIJIN_BOLT_LIFE,
    // ⬛ 다부라 카라바
    D_LIGHT_COOLDOWN, D_LIGHT_RISE_DIST, D_LIGHT_RISE_MS, D_LIGHT_DURATION,
    D_LIGHT_TICK_MS, D_LIGHT_TICK_DMG, D_LIGHT_RADIUS, D_LIGHT_SQ_RADIUS,
    D_LIGHT_DOWN, D_LIGHT_FX_MS, D_LIGHT_BLAST_FX_MS,
    D_DARK_COOLDOWN, D_DARK_DURATION, D_DARK_RADIUS, D_DARK_SQ_RADIUS, D_DARK_PULL,
    D_DARK_BLAST_RADIUS, D_DARK_BLAST_SQ_RADIUS, D_DARK_BLAST_DAMAGE, D_DARK_BLAST_FX_MS, D_DARK_CORE_R,
    D_KICK_COOLDOWN, D_KICK_CHARGE_MS, D_KICK_FLY_MS,
    D_KICK_SPEED_MULT, D_KICK_SQ_SPEED_MULT,
    D_KICK_HIT_RADIUS, D_KICK_BLAST_RADIUS, D_KICK_BLAST_DAMAGE, D_KICK_BLAST_FX_MS, D_KICK_TRAIL_MS,
    D_SQUARE_ITEM
};