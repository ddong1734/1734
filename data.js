// 파일명: data.js

window.GameData = {
    Settings: {
        MOVEMENT_SPEED: 1.5
    },
    Characters: {
        PARK: {
            hp: 3000, baseDamage: 50, attackCooldown: 600, speedMult: 1.0,
            attackEffect: "punch", attackKnockback: 15, attackSlowDuration: 250,
            themeColor: "#000", castColor: "rgba(255, 255, 255, 0.3)",
            skillIds: ["PARK_S1", "PARK_S2", "PARK_S3"]
        },
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
        // ⚡ [신규] 카시모 하지메 — 이동속도 1.35 (다른 캐릭터 기준 +35%) · 평타 80
        KASHIMO: {
            hp: 2400, baseDamage: 80, attackCooldown: 400, speedMult: 1.35,
            attackEffect: "kashimo_strike", attackKnockback: 0, attackSlowDuration: 150,
            themeColor: "#a855f7", castColor: "rgba(168, 85, 247, 0.3)",
            skillIds: ["KASHIMO_S1", "KASHIMO_S2", "KASHIMO_S3"]
        }
    },
    Skills: {
        'PARK_S1': { type: 'dash_aoe', cd: 12000, damMult: 1.5, kb: 35, radius: 250, effect: 'huge_wind_burst' },
        'PARK_S2': { type: 'buff', cd: 35000, duration: 13000, speedBoost: 0.3 },
        'PARK_S3': { type: 'charge_proj', cd: 40000, damMult: 3.0, kb: 180, speed: 100, castTime: 1000, projType: 'detroit' },
        'BORSALINO_S1': { type: 'beam', cd: 15000, damage: 150, range: 1500, effect: 'borsalino_beam' },
        'BORSALINO_S2': { type: 'beam_dash', cd: 25000, castTime: 3000, moveRange: 2600, beamDamage: 80, explosionDamage: 200, explosionRadius: 300, pathEffect: 'yata_mirror_path', expEffect: 'yata_explosion' },
        'BORSALINO_S3': { type: 'channel_barrage', cd: 45000, damage: 40, castTime: 3000, fireRate: 60, speed: 45, projType: 'magatama' },
        'KUZAN_S1': { type: 'shockwave', cd: 20000, damage: 100, kb: 40, speed: 15, freeze: 2000, effect: 'pheasant_peck' },
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

        // ⚡ [신규] 카시모 하지메 1번 스킬
        //    · 기본       : 전방으로 매우 빠른 한 줄기 번개(관통) · 200 · 기절 2초
        //    · 4스택 발동 : 대기를 가르는 번개(필중) · 500 · 감전 5초
        'KASHIMO_S1': {
            type: 'bolt', cd: 8000, damage: 200, stun: 2000,
            speed: 90, life: 34, hitR: 70, edgeR: 40,
            skyDamage: 500, skyStun: 5000,
            effect: 'kashimo_bolt'
        }
        // 🚧 KASHIMO_S2 / KASHIMO_S3 은 아직 구현하지 않았다.
    },
    Map: {
        WORLD_WIDTH: 42000, WORLD_HEIGHT: 3000, GROUND_Y: 2000, VIEW_SCALE: 0.5,
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