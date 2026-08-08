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
    // ⚡🌋 주력 방출 : 시전 중 완전 고정 · 🏵️ 여의 장착 시 좌우 범위 증가
    'KASHIMO_S2': {
        type: 'surge', cd: 20000, duration: 4000,
        tickInterval: 200, tickDamage: 20, stun: 200,
        width: 720, height: 900, down: 80,
        yeouiWidth: 1150,
        lockMove: true,
        effect: 'kashimo_surge'
    },
    // ⚡🔮 3번 : 환수호박 — 이동속도 1.3배 · 평타는 전격 순간이동
    'KASHIMO_S3': {
        type: 'amber', cd: 60000,
        speedMult: 1.3, drainPct: 0.04, drainInterval: 1000,
        trailDuration: 2000, trailGap: 70,
        // ⚡🔮 평타 = 전격 순간이동 (바제스 지름만큼)
        blinkDist: 151.2, blinkCooldown: 400,
        blastDamage: 150, blastStun: 1000, blastRadius: 190,
        effect: 'kashimo_amber'
    },

    // ⚡🔮 환수호박 전용 스킬
    //    전자파 : 🌩️ 뇌신 장착 시 범위·사거리 증가 + 0.3초 뒤 전체 재폭발
    'KASHIMO_A1': {
        type: 'wave', cd: 8000, damage: 200, stun: 1000,
        range: 840, radius: 135, count: 6, stepInterval: 55,
        raijinRange: 1100, raijinRadius: 175, raijinEchoDelay: 300,
        effect: 'kashimo_wave'
    },
    //    음파 : ✅ 시전자 경직 0.5초 · 🌩️ 뇌신 장착 시 번개 7발 동시 발사
    'KASHIMO_A2': {
        type: 'sonic', cd: 8000, castTime: 500, damage: 350, stun: 2000,
        range: 900, angle: 1.9478,
        raijinBolts: 7,
        effect: 'kashimo_sonic'
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkillsData;
} else if (typeof window !== 'undefined') {
    window.Skills = SkillsData;
}