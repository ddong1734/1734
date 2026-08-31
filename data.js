// 파일명: data.js

window.GameData = {
    Settings: {
        MOVEMENT_SPEED: 1.5
    },
    Characters: {
        BORSALINO: {
            hp: 2500, baseDamage: 40, attackCooldown: 250, speedMult: 1.2,
            attackEffect: "ama_no_murakumo", attackKnockback: 0, attackSlowDuration: 150,
            themeColor: "#f1c40f", castColor: "rgba(241, 196, 15, 0.3)",
            skillIds: ["BORSALINO_S1", "BORSALINO_S2", "BORSALINO_S3"]
        },
        KUZAN: {
            hp: 2800, baseDamage: 45, attackCooldown: 500, speedMult: 1.05,
            attackEffect: "ice_glove", attackKnockback: 0, attackSlowDuration: 300,
            themeColor: "#3498db", castColor: "rgba(52, 152, 219, 0.3)",
            skillIds: ["KUZAN_S1", "KUZAN_S2", "KUZAN_S3"]
        },
        SAKAZUKI: {
            hp: 3200, baseDamage: 55, attackCooldown: 550, speedMult: 1.0,
            attackEffect: "magma_punch", attackKnockback: 0, attackSlowDuration: 250,
            themeColor: "#e74c3c", castColor: "rgba(231, 76, 60, 0.3)",
            skillIds: ["SAKAZUKI_S1", "SAKAZUKI_S2", "SAKAZUKI_S3"]
        },
        ENEL: {
            hp: 2600, baseDamage: 60, attackCooldown: 450, speedMult: 1.1,
            attackEffect: "thunder_bolt", attackKnockback: 0, attackSlowDuration: 200,
            themeColor: "#00bfff", castColor: "rgba(0, 191, 255, 0.3)",
            skillIds: ["ENEL_S1", "ENEL_S2", "ENEL_S3"]
        },
        // ⚡ 카시모 하지메 — 이동속도 1.0 · 평타 80
        KASHIMO: {
            hp: 2400, baseDamage: 80, attackCooldown: 400, speedMult: 1.0,
            attackEffect: "kashimo_strike", attackKnockback: 0, attackSlowDuration: 150,
            themeColor: "#a855f7", castColor: "rgba(168, 85, 247, 0.3)",
            skillIds: ["KASHIMO_S1", "KASHIMO_S2", "KASHIMO_S3"]
        },
        // ⬛ [신규] 다부라 카라바
        DABURA: {
            hp: 2700, baseDamage: 55, attackCooldown: 450, speedMult: 1.1,
            attackEffect: "dabura_strike", attackKnockback: 0, attackSlowDuration: 200,
            themeColor: "#cbd5e1", castColor: "rgba(240, 240, 245, 0.32)",
            skillIds: ["DABURA_S1", "DABURA_S2", "DABURA_S3"]
        },
        // ⚔️ [신규] 다이도 하가네 — characters.js 와 반드시 같은 값이어야 한다.
        //    클라이언트는 이 GameData.Characters 를 보고 스킬·평타를 처리하므로
        //    여기 빠지면 버튼을 눌러도 아무 반응이 없다.
        DAIDO: {
            hp: 2600, baseDamage: 60, attackCooldown: 420, speedMult: 1.15,
            attackEffect: "daido_slash", attackKnockback: 0, attackSlowDuration: 150,
            themeColor: "#9fd8ff", castColor: "rgba(180, 220, 255, 0.30)",
            skillIds: ["DAIDO_S1", "DAIDO_S2", "DAIDO_S3"]
        },
        // 🕊️ [신규] 쿠루스 하나 — characters.js 와 반드시 같은 값이어야 한다
        KURUSU: {
            hp: 1200, baseDamage: 45, attackCooldown: 500, speedMult: 0.95,
            attackEffect: "kurusu_strike", attackKnockback: 0, attackSlowDuration: 150,
            themeColor: "#ffe27a", castColor: "rgba(255, 226, 122, 0.30)",
            skillIds: ["KURUSU_S1", "KURUSU_S2", "KURUSU_S3"]
        },
        // 🔥 [신규] 마르코 — characters.js 와 반드시 같은 값이어야 한다
        MARCO: {
            hp: 2800, baseDamage: 52, attackCooldown: 470, speedMult: 1.12,
            attackEffect: "marco_strike", attackKnockback: 0, attackSlowDuration: 180,
            themeColor: "#5fe8e0", castColor: "rgba(95, 232, 224, 0.30)",
            skillIds: ["MARCO_S1", "MARCO_S2", "MARCO_S3"]
        },
        // 🧲 [신규] 유스타스 키드 — characters.js 와 반드시 같은 값이어야 한다
        KID: {
            hp: 2500, baseDamage: 55, attackCooldown: 550, speedMult: 1.05,
            attackEffect: "kid_strike", attackKnockback: 12, attackSlowDuration: 200,
            themeColor: "#d63cf0", castColor: "rgba(214, 60, 240, 0.30)",
            skillIds: ["KID_S1", "KID_S2", "KID_S3"]
        },
        // ❄️ [신규] 쿠잔(해적) — characters.js 와 반드시 같은 값이어야 한다
        KUZAN_P: {
            hp: 2600, baseDamage: 58, attackCooldown: 500, speedMult: 1.0,
            attackEffect: "kuzanp_strike", attackKnockback: 10, attackSlowDuration: 260,
            themeColor: "#4dd8ff", castColor: "rgba(77, 216, 255, 0.30)",
            skillIds: ["KUZANP_S1", "KUZANP_S2", "KUZANP_S3"]
        }
    },
    Skills: {
        'PARK_S1': { type: 'dash_aoe', cd: 12000, damMult: 1.5, kb: 35, radius: 250, effect: 'huge_wind_burst' },
        'PARK_S2': { type: 'buff', cd: 35000, duration: 13000, speedBoost: 0.3 },
        'PARK_S3': { type: 'charge_proj', cd: 40000, damMult: 3.0, kb: 180, speed: 100, castTime: 1000, projType: 'detroit' },
        'BORSALINO_S1': { type: 'beam', cd: 15000, damage: 150, range: 1500, effect: 'borsalino_beam' },
        'BORSALINO_S2': { type: 'beam_dash', cd: 25000, castTime: 3000, moveRange: 2600, beamDamage: 80, explosionDamage: 200, explosionRadius: 300, pathEffect: 'yata_mirror_path', expEffect: 'yata_explosion' },
        'BORSALINO_S3': { type: 'channel_barrage', cd: 45000, damage: 40, castTime: 3000, fireRate: 60, speed: 45, projType: 'magatama' },
        'KUZAN_S1': { type: 'shockwave', cd: 20000, damage: 100, kb: 40, speed: 26, freeze: 2000, effect: 'pheasant_peck' },
        'KUZAN_S2': { type: 'homing_proj', cd: 25000, damage: 70, freeze: 2000, count: 3, effect: 'partisan', spawnInterval: 150 },
        'KUZAN_S3': { type: 'aoe_freeze', cd: 45000, damage: 200, radius: 600, freeze: 5000, castTime: 1000, effect: 'ice_age' },
        
        'SAKAZUKI_S1': { type: 'fire_proj', cd: 15000, damage: 250, speed: 24, life: 70, dotDps: 20, dotDur: 2000, effect: 'meigou' },
        'SAKAZUKI_S2': { type: 'fire_proj', cd: 30000, damage: 200, speed: 12, life: 15, dotDps: 20, dotDur: 2000, effect: 'dai_funka' },
        // ☄️ 유성화산: 정글 최상층보다 높은 곳(-2900)에서 생성 + 낙하속도 24 -> 67 강화
        'SAKAZUKI_S3': { type: 'meteor', cd: 45000, delay: 1000, duration: 2000, spawnInterval: 110, spread: 480, spawnY: -2900, fallSpeed: 67, meteorDamage: 100, dotDps: 20, dotDur: 2000, effect: 'meigou_ryusei' },

        'ENEL_S1': { type: 'el_thor', cd: 18000, castTime: 2000, tickInterval: 400, tickDamage: 50, range: 1680, thickness: 90, effect: 'el_thor' },
        // ✨ 만뢰: 전체 낙하속도 55 -> 85로 상향
        // ⚡ 만뢰: 정글 최상층보다 높은 곳(-2900)에서 생성 + 낙하속도 85 -> 238 강화
        'ENEL_S2': { type: 'mantle', cd: 25000, duration: 3000, boltCount: 20, boltDamage: 60, width: 330, spawnInterval: 150, spawnY: -2900, fallSpeed: 238, effect: 'mantra_bolt' },
        'ENEL_S3': { type: 'raigo', cd: 45000, telegraph: 500, castTime: 4000, tickInterval: 400, tickDamage: 40, width: 270, offset: 320, effect: 'raigo' },

        // ⚡ 카시모 하지메 기본 스킬
        'KASHIMO_S1': {
            type: 'bolt', cd: 8000, damage: 200, stun: 2000,
            speed: 90, life: 34, hitR: 70, edgeR: 40,
            // 🏵️ 여의 강화 수치
            yeouiSpeed: 210, yeouiLife: 22, yeouiHitR: 130, yeouiEdgeR: 75,
            skyDamage: 500, skyStun: 3000,
            skyThickness: 150, skyOvershoot: 700,
            effect: 'kashimo_bolt'
        },
        // ⚡🌋 주력 방출 : 지속시간 3초 · 시전 중 완전 고정
        //    🏵️ 여의 장착 시 좌우 범위 증가
        'KASHIMO_S2': {
            type: 'surge', cd: 20000, duration: 3000,
            tickInterval: 200, tickDamage: 20, stun: 200,
            width: 720, height: 900, down: 80,
            yeouiWidth: 1150,
            lockMove: true,
            effect: 'kashimo_surge'
        },
        // ⚡🔮 3번 : 환수호박 — 이동속도 1.3배 · 평타는 전격 돌진
        'KASHIMO_S3': {
            type: 'amber', cd: 60000,
            speedMult: 1.3, drainPct: 0.04, drainInterval: 1000,
            trailDuration: 900, trailGap: 42,
            dashDist: 432, dashDuration: 200, dashSpeed: 24, dashCooldown: 400,
            dashDamage: 150, dashStun: 500, dashRadius: 120,
            effect: 'kashimo_amber'
        },

        // ⚡🔮 환수호박 전용 스킬
        'KASHIMO_A1': {
            type: 'wave', cd: 8000, damage: 200, stun: 1000,
            range: 840, radius: 135, count: 6, stepInterval: 55,
            raijinRange: 1100, raijinRadius: 175, raijinEchoDelay: 300,
            effect: 'kashimo_wave'
        },
        'KASHIMO_A2': {
            type: 'sonic', cd: 8000, castTime: 500, damage: 350, stun: 2000,
            range: 900, angle: 1.9478,
            raijinBolts: 7,
            raijinBoltDamage: 100, raijinBoltSpeed: 150, raijinBoltLife: 26,
            effect: 'kashimo_sonic'
        },

        // ========================================================
        // ⬛ [신규] 다부라 카라바
        // ========================================================
        // ☀️ 1번 [빛]
        //    · 박힌범의 지름(189)만큼 매우 빠르게 위로 솟구친다
        //    · 그 뒤 '아래쪽'으로 2초간 지속되는 큰 빛 연속폭발
        //    · 0.4초마다 50 피해 · 휘말린 대상은 폭발이 끝날 때까지 경직
        //    · 시전 중 시전자 아래로 두 줄기 빛이 빛난다
        //    ⬛ 아이템 : 폭발 범위 증가
        'DABURA_S1': {
            type: 'light', cd: 20000,
            riseDist: 189, riseTime: 180,
            duration: 2000, tickInterval: 400, tickDamage: 50,
            radius: 430, sqRadius: 645, down: 200,
            effect: 'dabura_light'
        },
        // 🌑 2번 [어둠]
        //    · 몸 중심에 일렁이는 어둠 구체 + 칼바람 소용돌이(구 형태)
        //    · 근처의 모든 적을 3초간 중심으로 끌어당긴다 (벽은 통과 못함)
        //    · 3초 뒤 구체가 터지며 넓은 범위에 300 피해
        //    ⬛ 아이템 : 소용돌이 · 폭발 범위 증가
        'DABURA_S2': {
            type: 'dark', cd: 30000,
            duration: 3000,
            radius: 900, sqRadius: 1250,
            pull: 7.4,
            blastRadius: 520, sqBlastRadius: 720, blastDamage: 300,
            effect: 'dabura_dark'
        },
        // 💫 3번 [아광속 발차기]
        //    · 2초 경직 후 빛으로 변해 기본 이동속도의 1.5배로 5초간 활공
        //    · 가로벽 통과 · 세로벽 통과 불가 · 조이스틱만으로 비행
        //    · 적중 시 변신이 풀리며 빛 대폭발 (500 피해)
        //    ⬛ 아이템 : 이동속도 배율 1.5배 → 2배
        'DABURA_S3': {
            type: 'lightkick', cd: 45000,
            castTime: 2000, flyTime: 5000,
            speedMult: 1.5, sqSpeedMult: 2.0,
            hitRadius: 95, blastRadius: 380, blastDamage: 500,
            effect: 'dabura_kick'
        },

        // ⚔️ [신규] 다이도 하가네 — skills.js 와 반드시 같은 값이어야 한다
        'DAIDO_S1': {
            type: 'daido_fury', cd: 15000,
            duration: 1500, tickInterval: 100, tickDamage: 20,
            radius: 240, effect: 'daido_fury'
        },
        'DAIDO_S2': {
            type: 'daido_rush', cd: 18000,
            duration: 1200, speedMult: 2.6,
            tickInterval: 100, tickDamage: 30, hitRadius: 210,
            pullRadius: 35,
            finishRadius: 330, finishDamage: 50, finishStun: 1500,
            effect: 'daido_rush'
        },
        'DAIDO_S3': {
            type: 'daido_iai', cd: 20000,
            castTime: 500, damage: 300,
            range: 620, thickness: 300,
            bleedDamage: 20, bleedInterval: 400, bleedDuration: 2000,
            effect: 'daido_iai'
        },
        'DAIDO_COMBO': {
            type: 'daido_spin', duration: 500, tickInterval: 100, tickDamage: 30,
            radius: 170, effect: 'daido_spin'
        },
        // 🕊️ [신규] 쿠루스 하나 — skills.js 와 반드시 같은 값이어야 한다
        'KURUSU_S1': {
            type: 'kurusu_gather', cd: 15000,
            radius: 900, effect: 'kurusu_gather'
        },
        'KURUSU_S2': {
            type: 'kurusu_bless', cd: 20000,
            radius: 520, duration: 5000, tickInterval: 1000, healPerTick: 200,
            effect: 'kurusu_bless'
        },
        // ❄️ [신규] 쿠잔(해적) — skills.js 와 반드시 같은 값이어야 한다
        'KUZANP_S1': {
            type: 'kuzanp_ball', cd: 25000,
            speed: 26, radius: 60, range: 1500,
            damage: 200, blastRadius: 330, freezeTime: 2000,
            effect: 'kuzanp_ball'
        },
        'KUZANP_S2': {
            type: 'kuzanp_glove', cd: 35000,
            duration: 6000, speedBonus: 0.35,
            blastDamage: 50, blastRadius: 190, freezeTime: 300,
            trailMs: 1000,
            effect: 'kuzanp_glove'
        },
        'KUZANP_S3': {
            type: 'kuzanp_dash', cd: 45000,
            castTime: 0, dashSpeed: 42, dashTime: 450,
            damage: 400, hitRadius: 200, freezeRadius: 380, freezeTime: 5000,
            effect: 'kuzanp_dash'
        },

        // 🧲 [신규] 유스타스 키드 — skills.js 와 반드시 같은 값이어야 한다
        'KID_S1': {
            type: 'kid_assign', cd: 25000,
            radius: 430,
            stackTime: 3000, tickInterval: 500, tickDamage: 20,
            slowMin: 0.25,
            holdTime: 1000,
            blastDamage: 200, blastRadius: 250,
            effect: 'kid_assign'
        },
        'KID_S2': {
            type: 'kid_laser', cd: 40000,
            castTime: 3000, fireTime: 4000,
            tickInterval: 100, tickDamage: 30,
            range: 2600, halfWidth: 130,
            turnSpeed: 2.6,
            effect: 'kid_laser'
        },
        'KID_S3': {
            type: 'kid_golem', cd: 85000,
            castTime: 5000, duration: 20000,
            damageMult: 1.5, rangeMult: 2.0,
            speedMult: 1.5, jumpMult: 1.5,
            effect: 'kid_golem'
        },

        // 🔥 [신규] 마르코 — skills.js 와 반드시 같은 값이어야 한다
        'MARCO_S1': {
            type: 'marco_ball', cd: 16000,
            duration: 1500, speed: 13, radius: 150,
            pullRadius: 300, contactDamage: 250,
            blastRadius: 330, blastDamage: 150,
            effect: 'marco_ball'
        },
        'MARCO_S2': {
            type: 'marco_field', cd: 22000,
            castTime: 1000, duration: 3000, tickInterval: 300,
            radius: 620, tickDamage: 30, tickHeal: 30,
            effect: 'marco_field'
        },
        'MARCO_S3': {
            type: 'marco_shield', cd: 25000,
            duration: 3500, shieldRadius: 210, shieldRadiusX: 120, shieldRadiusY: 260, offset: 150,
            blastRadius: 460, blastDamage: 300,
            effect: 'marco_shield'
        },
        'KURUSU_S3': {
            type: 'kurusu_ladder', cd: 45000,
            castTime: 2000, beamTime: 3000,
            tickInterval: 200, tickDamage: 70, cdPenalty: 1000,
            beamHalfWidth: 260, circleRadius: 540,
            maxTickDamage: 100, maxBeamHalfWidth: 440, maxCircleRadius: 800,
            effect: 'kurusu_ladder'
        }
    },
    Map: {
        WORLD_WIDTH: 50000, WORLD_HEIGHT: 3000, GROUND_Y: 2000, VIEW_SCALE: 0.5,
        POIs: { BLUE_SHOP_X: 11800, RED_SHOP_X: 20200, BLUE_NEXUS_X: 12250, RED_NEXUS_X: 19750, BLUE_SMITH_X: 11430, RED_SMITH_X: 20570, BLUE_STORAGE_X: 11100, RED_STORAGE_X: 20900 },
        BUSHES: [ { x: 14600, y: 1350, w: 2800, h: 150 } ],
        Platforms: [
            { x: 15000, y: 900, w: 2000, h: 40 }, { x: 14600, y: 1200, w: 400, h: 40 }, { x: 14200, y: 1500, w: 400, h: 40 }, { x: 13800, y: 1800, w: 400, h: 40 },
            { x: 17000, y: 1200, w: 400, h: 40 }, { x: 17400, y: 1500, w: 400, h: 40 }, { x: 17800, y: 1800, w: 400, h: 40 }, { x: 14600, y: 1500, w: 2800, h: 40 },

            // 🌲 중앙 정글 상층부 (맵 중앙 x=16000 기준 좌우 완전 대칭)
            // ── 좌측 계단
            { x: 14400, y: 600,   w: 600,  h: 40 },
            { x: 13700, y: 300,   w: 650,  h: 40 },
            // 🧱 보스 발판 기준 3칸 위(y=0) — 왼쪽으로 이동 + 왼쪽으로 길이 2배
            { x: 11600, y: 0,     w: 1800, h: 40 },
            // 🧱 왼쪽 끝: 2단 점프로 넘을 수 없는 벽 (높이 900 > 2단 점프 도달 552)
            { x: 11560, y: -900,  w: 40,   h: 900, solid: true },
            { x: 13200, y: -300,  w: 700,  h: 40 },
            { x: 13500, y: -600,  w: 600,  h: 40 },
            { x: 13750, y: -900,  w: 800,  h: 40 },

            // ── 우측 계단 (좌측 완전 미러)
            { x: 17000, y: 600,   w: 600,  h: 40 },
            { x: 17650, y: 300,   w: 650,  h: 40 },
            // 🧱 보스 발판 기준 3칸 위(y=0) — 오른쪽으로 이동 + 오른쪽으로 길이 2배
            { x: 18600, y: 0,     w: 1800, h: 40 },
            // 🧱 오른쪽 끝: 2단 점프로 넘을 수 없는 벽
            { x: 20400, y: -900,  w: 40,   h: 900, solid: true },
            { x: 18100, y: -300,  w: 700,  h: 40 },
            { x: 17900, y: -600,  w: 600,  h: 40 },
            { x: 17450, y: -900,  w: 800,  h: 40 },

            // ── 최상단 바구니형 발판 (2단 점프 전용 유지 · -1350 → -1400 으로 추가 상향)
            { x: 13400, y: -1400, w: 5200, h: 40 },
            { x: 13400, y: -2200, w: 40,   h: 800, solid: true },
            { x: 18560, y: -2200, w: 40,   h: 800, solid: true },

            // 🧱 [추가] 레드팀 정글 끝 차단벽
            //    블루팀은 x=1500 부근이 맵 좌측 끝(x<50 클램프)으로 자연히 막히지만,
            //    레드팀 쪽은 암흑 왕좌(36000)까지 뻥 뚫려 있었다.
            //    블루팀 정글 끝과 대칭이 되도록 x=30700 에 높은 벽을 세운다.
            { x: 30700, y: -1000, w: 40, h: 3000, solid: true },

            // ⚫ 검은수염 전용 공간 '암흑 왕좌' (x 36000 ~ 41000)
            { x: 36000, y: 2000, w: 5000, h: 40,  dark: true },
            { x: 36000, y: -1000, w: 40,  h: 3000, solid: true, dark: true },
            { x: 40960, y: -1000, w: 40,  h: 3000, solid: true, dark: true }
        ],
        JungleBlueData: [
            { x: 1000, y: 1650 }, { x: 3500, y: 1650 }, { x: 6000, y: 1650 },
            { x: 2200, y: 1300 }, { x: 4800, y: 1300 }, { x: 7000, y: 1300 },
            { x: 1000, y: 950 },  { x: 3500, y: 950 },  { x: 6000, y: 950 },
            { x: 2200, y: 600 },  { x: 4800, y: 600 }
        ]
    }
};