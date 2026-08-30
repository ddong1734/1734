// 파일명: skills.js

const SkillsData = {
    // 박인범 스킬
    'PARK_S1': { type: 'dash_aoe', cd: 12000, damMult: 1.5, kb: 35, radius: 250, effect: 'huge_wind_burst' },
    'PARK_S2': { type: 'buff', cd: 35000, duration: 13000, speedBoost: 0.3 },
    'PARK_S3': { type: 'charge_proj', cd: 40000, damMult: 3.0, kb: 180, speed: 100, castTime: 1000, projType: 'detroit' },

    // 볼사리노 스킬
    'BORSALINO_S1': { type: 'beam', cd: 15000, damage: 150, range: 1500, effect: 'borsalino_beam' },
    'BORSALINO_S2': {
        type: 'beam_dash', cd: 25000, castTime: 3000, moveRange: 2600,
        beamDamage: 80, explosionDamage: 200, explosionRadius: 300,
        pathEffect: 'yata_mirror_path', expEffect: 'yata_explosion'
    },
    'BORSALINO_S3': { type: 'channel_barrage', cd: 45000, damage: 40, castTime: 3000, fireRate: 60, speed: 45, projType: 'magatama' },

    // 쿠잔 스킬
    'KUZAN_S1': { type: 'shockwave', cd: 20000, damage: 100, kb: 40, speed: 15, freeze: 2000, effect: 'pheasant_peck' },
    'KUZAN_S2': { type: 'homing_proj', cd: 25000, damage: 70, freeze: 2000, count: 3, effect: 'partisan', spawnInterval: 150 },
    'KUZAN_S3': { type: 'aoe_freeze', cd: 45000, damage: 200, radius: 600, freeze: 5000, castTime: 1000, effect: 'ice_age' },

    'SAKAZUKI_S1': { type: 'fire_proj', cd: 15000, damage: 250, speed: 24, life: 70, dotDps: 20, dotDur: 2000, effect: 'meigou' },
    'SAKAZUKI_S2': { type: 'fire_proj', cd: 30000, damage: 200, speed: 12, life: 15, dotDps: 20, dotDur: 2000, effect: 'dai_funka' },
    // ☄️ 유성화산: 정글 최상층보다 높은 곳(-2900)에서 생성 + 낙하속도 24 -> 67 강화
    'SAKAZUKI_S3': { type: 'meteor', cd: 45000, delay: 1000, duration: 2000, spawnInterval: 110, spread: 480, spawnY: -2900, fallSpeed: 67, meteorDamage: 100, dotDps: 20, dotDur: 2000, effect: 'meigou_ryusei' },

    // ⚡ 에넬 스킬
    'ENEL_S1': { type: 'el_thor', cd: 18000, castTime: 2000, tickInterval: 400, tickDamage: 50, range: 1680, thickness: 90, effect: 'el_thor' },
    // ✨ 만뢰: 전체 낙하속도 55 -> 85로 상향
    // ⚡ 만뢰: 정글 최상층보다 높은 곳(-2900)에서 생성 + 낙하속도 85 -> 238 강화
    'ENEL_S2': { type: 'mantle', cd: 25000, duration: 3000, boltCount: 20, boltDamage: 60, width: 330, spawnInterval: 150, spawnY: -2900, fallSpeed: 238, effect: 'mantra_bolt' },
    'ENEL_S3': { type: 'raigo', cd: 45000, telegraph: 500, castTime: 4000, tickInterval: 400, tickDamage: 40, width: 270, offset: 320, effect: 'raigo' },

    // ⚡ 카시모 하지메 기본 스킬
    //    · 번개 : 🏵️ 여의 장착 시 두께 증가 + 속도 비약적 상승
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
    //    전자파 : 🌩️ 뇌신 장착 시 범위·거리 증가 + 0.3초 뒤 전체 재폭발
    'KASHIMO_A1': {
        type: 'wave', cd: 8000, damage: 200, stun: 1000,
        range: 840, radius: 135, count: 6, stepInterval: 55,
        raijinRange: 1100, raijinRadius: 175, raijinEchoDelay: 300,
        effect: 'kashimo_wave'
    },
    //    음파 : 시전자 경직 0.5초
    //    🌩️ 뇌신 장착 시 번개 7발 동시 발사 (각 100 · 탄속↓ · 길이↑)
    'KASHIMO_A2': {
        type: 'sonic', cd: 8000, castTime: 500, damage: 350, stun: 2000,
        range: 900, angle: 1.9478,
        raijinBolts: 7,
        raijinBoltDamage: 100, raijinBoltSpeed: 150, raijinBoltLife: 26,
        effect: 'kashimo_sonic'
    },

    // ========================================================================
    // ⬛ [신규] 다부라 카라바
    // ========================================================================
    // ☀️ 1번 [빛] — 위로 솟구친 뒤 아래로 2초간 빛 연속폭발
    //    ⬛ 아이템 : 폭발 범위 증가
    'DABURA_S1': {
        type: 'light', cd: 20000,
        riseDist: 189, riseTime: 180,
        duration: 2000, tickInterval: 400, tickDamage: 50,
        radius: 430, sqRadius: 645, down: 200,
        effect: 'dabura_light'
    },
    // 🌑 2번 [어둠] — 어둠 구체 + 칼바람 소용돌이 (3초 흡인 후 폭발 300)
    //    ⬛ 아이템 : 소용돌이 · 폭발 범위 증가
    'DABURA_S2': {
        type: 'dark', cd: 30000,
        duration: 3000,
        radius: 900, sqRadius: 1250,
        pull: 7.4,
        blastRadius: 520, sqBlastRadius: 720, blastDamage: 300,
        effect: 'dabura_dark'
    },
    // 💫 3번 [아광속 발차기] — 2초 경직 후 빛으로 변해 5초 활공 (적중 시 500)
    //    ⬛ 아이템 : 이동속도 배율 1.5배 → 2배
    'DABURA_S3': {
        type: 'lightkick', cd: 45000,
        castTime: 2000, flyTime: 5000,
        speedMult: 1.5, sqSpeedMult: 2.0,
        hitRadius: 95, blastRadius: 380, blastDamage: 500,
        effect: 'dabura_kick'
    },

    // ══════════════════════════════════════════════════════════════════
    // ⚔️ 다이도 하가네
    // ══════════════════════════════════════════════════════════════════

    // 1번 [무자비] — 1.5초간 경직된 채 전방위로 검을 휘두른다 (0.1초마다 20)
    'DAIDO_S1': {
        type: 'daido_fury', cd: 15000,
        duration: 1500, tickInterval: 100, tickDamage: 20,
        radius: 240,
        effect: 'daido_fury'
    },

    // 2번 [질풍참] — 2초간 돌진하며 베고(0.2초마다 20), 맞은 적을 끌어당긴다.
    //    돌진이 끝나면 360도 마무리 베기(50 + 1초 기절).
    'DAIDO_S2': {
        type: 'daido_rush', cd: 18000,
        duration: 1200, speedMult: 2.6,
        tickInterval: 100, tickDamage: 30, hitRadius: 210,
        pullRadius: 35,                  // 시전자 주변 이 거리까지 강하게 끌어당긴다
        finishRadius: 330, finishDamage: 50, finishStun: 1500,
        effect: 'daido_rush'
    },

    // 3번 [일섬] — 0.5초 후 전방으로 크게 벤다 (300 + 출혈 0.4초마다 20, 2초)
    'DAIDO_S3': {
        type: 'daido_iai', cd: 20000,
        castTime: 500, damage: 300,
        range: 620, thickness: 300,
        bleedDamage: 20, bleedInterval: 400, bleedDuration: 2000,
        effect: 'daido_iai'
    },

    // 평타 3연타 마무리 — 0.5초간 짧은 전방위 베기 (0.1초마다 30 · 경직 없음)
    'DAIDO_COMBO': {
        type: 'daido_spin', duration: 500, tickInterval: 100, tickDamage: 30,
        radius: 170, effect: 'daido_spin'
    },

    // ══════════════════════════════════════════════════════════════════
    // 🕊️ 쿠루스 하나
    // ══════════════════════════════════════════════════════════════════

    // 1번 [집회] — 넓은 반경 안의 대상 수만큼 신성력을 얻는다
    'KURUSU_S1': {
        type: 'kurusu_gather', cd: 15000,
        radius: 900, effect: 'kurusu_gather'
    },

    // 2번 [축복] — 보통 반경의 아군과 자신에게 5초간 초당 200 회복
    //    강화 시 : 여분의 목숨을 하나 준다
    'KURUSU_S2': {
        type: 'kurusu_bless', cd: 20000,
        radius: 520, duration: 5000, tickInterval: 1000, healPerTick: 200,
        effect: 'kurusu_bless'
    },

    // 3번 [야곱의 사다리] — 2초간 마방진을 그린 뒤 3초간 빛 기둥
    //    강화 시 [최대 출력 야곱의 사다리] : 피해와 굵기가 커진다
    // ══════════════════════════════════════════════════════════════════
    // 🔥 마르코 — 불사조의 푸른 불꽃
    // ══════════════════════════════════════════════════════════════════

    // ══════════════════════════════════════════════════════════════════
    // 🧲 유스타스 키드 — 자기력과 고철
    // ══════════════════════════════════════════════════════════════════

    // ══════════════════════════════════════════════════════════════════
    // ❄️ 쿠잔(해적) — 얼음과 냉기
    // ══════════════════════════════════════════════════════════════════

    // 1번 [아이스 볼] — 관통 불가. 맞은 자리에 냉기 폭발 + 2초 동결
    'KUZANP_S1': {
        type: 'kuzanp_ball', cd: 25000,
        speed: 26, radius: 60, range: 1500,
        damage: 200, blastRadius: 330, freezeTime: 2000,
        effect: 'kuzanp_ball'
    },

    // 2번 [아이스 글러브] — 6초간 이동 +35% · 평타에 냉기 폭발
    'KUZANP_S2': {
        type: 'kuzanp_glove', cd: 35000,
        duration: 6000, speedBonus: 0.35,
        blastDamage: 50, blastRadius: 190, freezeTime: 300,
        trailMs: 1000,
        effect: 'kuzanp_glove'
    },

    // 3번 [아이스 타임] — 0.5초 결빙 후 직선 돌진 · 5초 동결
    'KUZANP_S3': {
        type: 'kuzanp_dash', cd: 45000,
        castTime: 0, dashSpeed: 42, dashTime: 450,
        damage: 400, hitRadius: 200, freezeRadius: 380, freezeTime: 5000,
        effect: 'kuzanp_dash'
    },

    // 1번 [어사인] — 좁은 반경의 적에게 고철을 붙인다
    //    3초간 쌓임(0.5초마다 20 · 점점 느려짐) → 1초 완전 고정 → 폭발 200
    'KID_S1': {
        type: 'kid_assign', cd: 25000,
        radius: 430,
        stackTime: 3000, tickInterval: 500, tickDamage: 20,
        slowMin: 0.25,                 // 3초 뒤 이동속도가 25% 까지 떨어진다
        holdTime: 1000,                // 완전 고정
        blastDamage: 200, blastRadius: 250,
        effect: 'kid_assign'
    },

    // 2번 [댐드 펑크] — 3초 차징 후 4초간 레이저포
    'KID_S2': {
        type: 'kid_laser', cd: 40000,
        castTime: 3000, fireTime: 4000,
        tickInterval: 100, tickDamage: 30,
        range: 2600, halfWidth: 130,
        turnSpeed: 2.6,                // 초당 회전 각도(라디안) — 천천히 돈다
        effect: 'kid_laser'
    },

    // 3번 [펑크 로튼] — 5초 변신 후 20초간 고철 골렘
    'KID_S3': {
        type: 'kid_golem', cd: 85000,
        castTime: 5000, duration: 20000,
        damageMult: 1.5, rangeMult: 2.0,
        speedMult: 1.5, jumpMult: 1.5,
        effect: 'kid_golem'
    },

    // 1번 [봉황인] — 큰 불꽃 덩어리를 전방으로 날린다 (1.5초 유지)
    //    · 근처 대상은 강하게 끌려와 덩어리와 함께 이동한다
    //    · 접촉 250 · 1.5초 뒤 폭발 150
    'MARCO_S1': {
        type: 'marco_ball', cd: 16000,
        duration: 1500, speed: 13, radius: 150,
        pullRadius: 300, contactDamage: 250,
        blastRadius: 330, blastDamage: 150,
        effect: 'marco_ball'
    },

    // 2번 [봉리력] — 1초 응축 후 큰 반경에 3초짜리 불길
    //    · 적 0.3초마다 30 피해 · 아군 0.3초마다 30 회복
    'MARCO_S2': {
        type: 'marco_field', cd: 22000,
        castTime: 1000, duration: 3000, tickInterval: 300,
        radius: 620, tickDamage: 30, tickHeal: 30,
        effect: 'marco_field'
    },

    // 3번 [불사 엉겅퀴] — 조이스틱 방향으로 2초간 불꽃 보호막
    //    · 시전자 위치 고정 · 닿은 모든 투사체와 공격을 막는다
    //    · 2초 뒤 회전하며 폭발 (300)
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
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkillsData;
} else if (typeof window !== 'undefined') {
    window.Skills = SkillsData;
}