// 파일명: items.js
//
// 🔧 [수정] 실제 '고유 능력'(중복 시 효과가 겹치지 않는 boolean 특성)이 없는데도
//    isUnique 로 중복 장착이 막혀 있던 아이템/유물의 isUnique 를 해제했다.
// 🥊 [추가] 박힌범 처치 드롭 전용 전설 아이템 '박힌범 오크라' (초당 체력 30 회복)
// 🐗 [추가] 할배새끼 처치 드롭 전용 전설 아이템 '할배새끼 오크라' (최대체력 +500)
// ✨ [추가] 두 오크라를 합성해 만드는 신화 아이템 '새로운 생명'
// ⚫ [추가] 검은수염 처치 드롭 전용 열매 2종 (각 20% 확률)
// 🏆 [추가] 지저스 바제스 처치 드롭 전용 희귀 아이템 '챔피언 벨트' (30%)
// 🏵️ [추가] 카시모 전용 전설 아이템 '여의' (황금 10개 + 10,000 G)
// 🌩️ [추가] 카시모 전용 신화 아이템 '뇌신'
// 🍒 [추가] 검은수염 처치 드롭 전용 희귀 아이템 '체리파이' (50% · 최대체력 +500)
// 🔯 [추가] 신화 아이템 '법진' (새로운 생명 + 황금 10개)
//    · 적 처치 1회당 최대체력 +20 / 초당회복 +2 / 방어력 +0.2% (최대 50회)
// ⚔️ [추가] 전설 아이템 '퇴마의 검' (황금 15개)
//    · 몬스터에게 주는 모든 피해 +30% (평타 · 모든 스킬 포함)
// 🗡️ [추가] 등급 ??? 아이템 '세계를 가르는 참격' (NPC '마허라' 퀘스트 보상 전용)
//    · 장착 시 4번 스킬 개방 — 0.5초 경직 후 방어 무시 참격 (피해 850 · 쿨 130초)
// ⬛ [추가] 다부라 카라바 전용 신화 아이템 '■'
//    · 어둠어둠열매 + 번쩍번쩍열매 합성
//    · [빛] 폭발 범위 증가 / [어둠] 소용돌이·구체 폭발 범위 증가
//    · [아광속 발차기] 이동속도 배율 1.5배 → 2배
//    ✅ [수정] '어둠어둠열매' 효과(hasYami)는 더 이상 부여하지 않는다.

const Items = {
    // 1. 일반 상점 아이템
    'burger': { type: 'health', buyPrice: 300, sellPrice: 150, stats: { maxHp: 50 } },
    'kimchi': { type: 'util', buyPrice: 300, sellPrice: 150, stats: { speedMult: 0.05 } },
    'bone': { type: 'attack', buyPrice: 400, sellPrice: 200, stats: { bonusDamage: 3 } },
    'pepsi': { type: 'attack', buyPrice: 500, sellPrice: 250, stats: { attackSpeedMult: 0.05 } },
    'jokbal_meat': { type: 'attack', buyPrice: 400, sellPrice: 200, stats: { bonusDamage: 3 } },
    'jokbal_skin': { type: 'health', buyPrice: 600, sellPrice: 300, stats: { defense: 0.05 } },
    'jokbal_fat': { type: 'health', buyPrice: 500, sellPrice: 250, stats: { hpRegen: 2 } },
    // 🔧 고유 능력 없음(수치 합산형) → 중복 장착 허용
    'ttakkwan': { type: 'attack', buyPrice: 12000, sellPrice: 6000, stats: { bonusDamage: 20, orbitSpheres: 1 } },
    'ttappei': { type: 'attack', buyPrice: 12000, sellPrice: 6000, stats: { attackSpeedMult: 0.20, orbitSpheres: 1 } },
    
    // 2. 유물 상자 전용 (상점 구매 불가)
    'seolgonnyak': { type: 'util', buyPrice: 0, sellPrice: 2500, stats: { orbitSpheres: 1 }, isArtifact: true },
    'jadam': { type: 'health', buyPrice: 0, sellPrice: 250, stats: { hpRegen: 5 }, isArtifact: true },
    'pepsi_art': { type: 'attack', buyPrice: 0, sellPrice: 250, stats: { attackSpeedMult: 0.05, hasPepsiArt: true }, isArtifact: true },
    'rare_box': { type: 'box', buyPrice: 0, sellPrice: 1500 },

    // ✨ 황금 (황금오크라 처치 드롭 전용 / 판매 시 즉시 3,000 G)
    'gold': { type: 'treasure', buyPrice: 0, sellPrice: 3000 },

    // 🥊 박힌범 오크라 (박힌범 처치 드롭 전용 · 전설)
    'hinbeom_okra': { type: 'health', buyPrice: 0, sellPrice: 2500, stats: { hpRegen: 30 } },

    // 🐗 할배새끼 오크라 (할배새끼 처치 드롭 전용 · 전설)
    'halbae_okra': { type: 'health', buyPrice: 0, sellPrice: 2500, stats: { maxHp: 500 } },

    // 🏆 챔피언 벨트 (지저스 바제스 처치 드롭 전용 · 희귀 · 30%)
    'champion_belt': { type: 'health', buyPrice: 0, sellPrice: 1500, stats: { defense: 0.20 } },

    // 🍒 체리파이 (검은수염 처치 드롭 전용 · 희귀 · 50%)
    //    '티치' NPC 퀘스트의 제출 재료이기도 하다
    'cherry_pie': { type: 'health', buyPrice: 0, sellPrice: 750, stats: { maxHp: 500 } },

    // 💥 흔들흔들열매 (검은수염 처치 드롭 · 20%)
    'gura_fruit': { type: 'util', buyPrice: 0, sellPrice: 2500, stats: { hasGura: true }, isArtifact: true, isUnique: true },

    // ⛓️ 어둠어둠열매 (검은수염 처치 드롭 · 20%)
    'yami_fruit': { type: 'util', buyPrice: 0, sellPrice: 2500, stats: { hasYami: true }, isArtifact: true, isUnique: true },
    
    // 3. 대장간 합성 아이템 (레시피 데이터 탑재)
    'jokbal': { 
        type: 'util', buyPrice: 0, sellPrice: 2450, stats: { hasJokbal: true }, isUnique: true, 
        recipe: { cost: 3000, ingredients: ['bone', 'jokbal_meat', 'jokbal_skin', 'jokbal_fat'] } 
    },
    'pepsi_1plus1': { 
        type: 'attack', buyPrice: 0, sellPrice: 750, stats: { attackSpeedMult: 0.10 }, 
        recipe: { cost: 1000, ingredients: ['pepsi', 'pepsi_art'] } 
    },
    // ✨ 새로운 생명 (박힌범 오크라 + 할배새끼 오크라 · 신화)
    'new_life': {
        type: 'health', buyPrice: 0, sellPrice: 15000, stats: { maxHp: 1000, hpRegen: 50 },
        recipe: { cost: 0, ingredients: ['hinbeom_okra', 'halbae_okra'] }
    },
    'dalu_fengwei': { 
        type: 'attack', buyPrice: 0, sellPrice: 24500, stats: { bonusDamage: 20, attackSpeedMult: 0.20, orbitSpheres: 3, hasDaluFengwei: true }, isUnique: true, 
        recipe: { cost: 25000, ingredients: ['ttakkwan', 'ttappei', 'seolgonnyak'] } 
    },

    // 4. 전설 및 신화 유물 추가 (탐지기 드롭 전용)
    'pika_fruit': { type: 'util', buyPrice: 0, sellPrice: 2500, stats: { hasPika: true }, isArtifact: true, isUnique: true },
    'hie_fruit': { type: 'util', buyPrice: 0, sellPrice: 2500, stats: { hasHie: true }, isArtifact: true, isUnique: true },
    'magu_fruit': { type: 'util', buyPrice: 0, sellPrice: 2500, stats: { hasMagu: true }, isArtifact: true, isUnique: true },
    'goro_fruit': { type: 'util', buyPrice: 0, sellPrice: 2500, stats: { hasGoro: true }, isArtifact: true, isUnique: true },
    'justice_coat': { type: 'util', buyPrice: 0, sellPrice: 15000, stats: { maxHp: 300, bonusDamage: 30, hasJusticeCoat: true }, isArtifact: true, isUnique: true },

    // ⚡🏵️ 여의 (카시모 전용 · 전설)
    'yeoui': {
        type: 'attack', buyPrice: 0, sellPrice: 12500, stats: { hasYeoui: true }, isUnique: true, isArtifact: true,
        recipe: { cost: 10000, ingredients: ['gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold'] }
    },

    // ⚡🌩️ 뇌신 (카시모 전용 · 신화)
    'raijin': {
        type: 'attack', buyPrice: 0, sellPrice: 30000,
        stats: { hasGoro: true, hasYeoui: true, hasRaijin: true }, isUnique: true, isArtifact: true,
        recipe: { cost: 0, ingredients: ['goro_fruit', 'yeoui', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold'] }
    },

    // ⬛ [신규] ■ (다부라 카라바 전용 · 신화)
    //    어둠어둠열매 + 번쩍번쩍열매 를 대장간에서 합성한다.
    //    · [빛]           : 폭발 범위 증가
    //    · [어둠]         : 소용돌이 및 어둠 구체 폭발 범위 증가
    //    · [아광속 발차기] : 이동속도 배율 1.5배 → 2배
    //    ✅ [수정] 어둠어둠열매 효과(hasYami)는 부여하지 않는다.
    //    고유 능력(boolean)이므로 중복 장착 불가
    'black_square': {
        type: 'util', buyPrice: 0, sellPrice: 30000,
        stats: { hasPika: true, hasSquare: true }, isUnique: true, isArtifact: true,
        recipe: { cost: 0, ingredients: ['yami_fruit', 'pika_fruit'] }
    },

    // 🔯 [신규] 법진(法陣) — 신화 (새로운 생명 1개 + 황금 10개)
    //    적을 처치할 때마다 영구히 강해진다 (최대 50회).
    //    · 1회당 : 최대체력 +20 · 초당회복 +2 · 방어력 +0.2%
    //    · 50회 : 최대체력 +1000 · 초당회복 +100 · 방어력 +10%
    //    · 처치 대상 : 적 플레이어 + 모든 몬스터/보스
    //    · 스택은 사망해도 유지된다
    //    고유 능력(boolean)이므로 중복 장착 불가
    'beopjin': {
        type: 'health', buyPrice: 0, sellPrice: 30000,
        stats: { hasBeopjin: true }, isUnique: true,
        recipe: { cost: 0, ingredients: ['new_life', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold'] }
    },

    // ⚔️ [신규] 퇴마의 검(退魔劍) — 전설 (황금 15개)
    //    몬스터에게 주는 모든 피해(평타 · 모든 스킬 · 지속피해)가 30% 증가한다.
    //    · 적용 대상 : 검은수염 · 박힌범 · 바제스 · 할배새끼(보스/소환체) · 오크라 · 황금오크라
    //    · 적 플레이어에게는 적용되지 않는다
    //    고유 능력(boolean)이므로 중복 장착 불가
    'toema_sword': {
        type: 'attack', buyPrice: 0, sellPrice: 22500,
        stats: { hasToemaSword: true }, isUnique: true,
        displayName: '퇴마의 검',
        recipe: { cost: 0, ingredients: ['gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold'] }
    },

    // 🗡️ [신규] 세계를 가르는 참격 — 등급 ??? (마허라 퀘스트 보상 전용 · 제작/구매 불가)
    //    장착하면 4번 스킬 [세계를 가르는 참격] 이 열린다.
    //    · 0.5초 경직 후 전방으로 매우 빠른 참격 발사
    //    · 방어력 완전 무시 · 피해 850 · 쿨타임 130초 · 아군을 제외한 모두를 관통 타격
    //    고유 능력(boolean)이므로 중복 장착 불가
    'world_cleave': {
        type: 'attack', buyPrice: 0, sellPrice: 40000,
        stats: { hasWorldCleave: true }, isUnique: true,
        displayName: '세계를 가르는 참격',
        exclusiveWith: ['yumyeong']
    },

    // 🌑 [신규] 유명이경 역월(幽明異境 逆越) — 등급 ??? (마허라 2차 퀘스트 보상 전용)
    //    · ⬛ 다부라 카라바 전용 · '세계를 가르는 참격' 과 함께 장착 불가
    //    · 장착하면 4번 스킬이 [유명이경 역월] 로 바뀐다 (영역 전개)
    'yumyeong': {
        type: 'attack', buyPrice: 0, sellPrice: 60000,
        stats: { hasYumyeong: true }, isUnique: true,
        displayName: '유명이경 역월',
        onlyChar: 'DABURA', onlyCharName: '다부라 카라바',
        exclusiveWith: ['world_cleave']
    },

    // 5. 해군대장 전용 및 신규 에넬 신화 장비
    'kizaru': { 
        type: 'attack', buyPrice: 0, sellPrice: 22500, stats: { maxHp: 300, bonusDamage: 30, hasJusticeCoat: true, hasPika: true, hasKizaru: true }, isUnique: true, isArtifact: true,
        recipe: { cost: 30000, ingredients: ['justice_coat', 'pika_fruit'] } 
    },
    'aokiji': { 
        type: 'attack', buyPrice: 0, sellPrice: 22500, stats: { maxHp: 300, bonusDamage: 30, hasJusticeCoat: true, hasHie: true, hasAokiji: true }, isUnique: true, isArtifact: true,
        recipe: { cost: 30000, ingredients: ['justice_coat', 'hie_fruit'] } 
    },
    'akainu': { 
        type: 'attack', buyPrice: 0, sellPrice: 22500, stats: { maxHp: 300, bonusDamage: 30, hasJusticeCoat: true, hasMagu: true, hasAkainu: true }, isUnique: true, isArtifact: true,
        recipe: { cost: 30000, ingredients: ['justice_coat', 'magu_fruit'] } 
    },
    'ark_maxim': { 
        type: 'attack', buyPrice: 0, sellPrice: 22500, stats: { hasArkMaxim: true }, isUnique: true, isArtifact: true,
        recipe: { cost: 50000, ingredients: ['gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold'] } 
    },
    // ✨ 신규 고유 등급 아이템: 갓 에넬
    'god_enel': { 
        type: 'attack', buyPrice: 0, sellPrice: 50000, stats: { maxHp: 300, bonusDamage: 30, hasGoro: true, hasArkMaxim: true, hasGodEnel: true }, isUnique: true, isArtifact: true,
        recipe: { cost: 50000, ingredients: ['goro_fruit', 'ark_maxim', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold'] } 
    }
};

module.exports = Items;