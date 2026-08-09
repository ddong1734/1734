// 파일명: items.js
//
// 🔧 [수정] 실제 '고유 능력'(중복 시 효과가 겹치지 않는 boolean 특성)이 없는데도
//    isUnique 로 중복 장착이 막혀 있던 아이템/유물의 isUnique 를 해제했다.
//    · 해제 : 따꽌펀, 따페이, 설곤약, 자담치킨, 펩시(유물)  → 전부 수치 합산형이라 중복 장착이 정상 동작한다
//    · 유지 : 냉족발, 大陆风味, 각종 열매, 正義코트, 해군대장 3종, 방주 맥심, 갓 에넬 (전부 boolean 고유 특성)
//    · 자담치킨은 hasJadam(boolean) 대신 hpRegen 수치로 바꿔 중복 장착이 실제로 합산되도록 했다.
//      (단일 장착 시 회복량은 기존과 동일한 초당 5)
// 🥊 [추가] 박힌범 처치 드롭 전용 전설 아이템 '박힌범 오크라' (초당 체력 30 회복)
// 🐗 [추가] 할배새끼 처치 드롭 전용 전설 아이템 '할배새끼 오크라' (최대체력 +500)
// ✨ [추가] 두 오크라를 합성해 만드는 신화 아이템 '새로운 생명' (최대체력 +1000, 초당 체력 50 회복)
// ⚫ [추가] 검은수염 처치 드롭 전용 열매 2종 (각 20% 확률)
//    · 흔들흔들열매 : 평타에 파공아 발동
//    · 어둠어둠열매 : 평타에 크로우즈 발동
// 🏆 [추가] 지저스 바제스 처치 드롭 전용 희귀 아이템 '챔피언 벨트' (30% · 방어력 +20%)
// 🏵️ [추가] 카시모 전용 전설 아이템 '여의' (황금 10개 + 10,000 G)
//    · 1번 스킬 번개의 두께 증가 + 비행 속도 비약적 상승
//    · 2번 스킬 주력 방출의 좌우 범위 증가
// 🌩️ [추가] 카시모 전용 신화 아이템 '뇌신' (쿠릉쿠릉열매 + 황금 10개 + 여의)
//    · 여의의 전용 효과를 모두 포함
//    · 전자파의 범위·거리 증가 + 마지막 연쇄폭발 0.3초 뒤 전체 자리 동시 재폭발
//    · 음파 시전 시 음파 범위로 번개 7발 동시 발사
// 🍒 [추가] 검은수염 처치 드롭 전용 희귀 아이템 '체리파이' (50% · 최대체력 +500)
//    · 티치 NPC 퀘스트의 제출 재료로도 쓰인다

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
    // 🔧 고유 능력 없음(위성 구체 수치 합산) → 중복 장착 허용
    'seolgonnyak': { type: 'util', buyPrice: 0, sellPrice: 2500, stats: { orbitSpheres: 1 }, isArtifact: true },
    // 🔧 hasJadam(boolean) → hpRegen 5 로 변경 : 중복 장착 시 정상 합산 (단일 효과는 기존과 동일)
    'jadam': { type: 'health', buyPrice: 0, sellPrice: 250, stats: { hpRegen: 5 }, isArtifact: true },
    // 🔧 고유 능력 없음(공속 합산) → 중복 장착 허용
    'pepsi_art': { type: 'attack', buyPrice: 0, sellPrice: 250, stats: { attackSpeedMult: 0.05, hasPepsiArt: true }, isArtifact: true },
    'rare_box': { type: 'box', buyPrice: 0, sellPrice: 1500 },

    // ✨ 황금 (황금오크라 처치 드롭 전용 / 판매 시 즉시 3,000 G)
    'gold': { type: 'treasure', buyPrice: 0, sellPrice: 3000 },

    // 🥊 박힌범 오크라 (박힌범 처치 드롭 전용 · 전설)
    //    고유 능력이 아닌 수치 회복형이므로 중복 장착 가능
    'hinbeom_okra': { type: 'health', buyPrice: 0, sellPrice: 2500, stats: { hpRegen: 30 } },

    // 🐗 할배새끼 오크라 (할배새끼 처치 드롭 전용 · 전설)
    //    최대체력 수치 증가형이므로 중복 장착 가능
    'halbae_okra': { type: 'health', buyPrice: 0, sellPrice: 2500, stats: { maxHp: 500 } },

    // 🏆 챔피언 벨트 (지저스 바제스 처치 드롭 전용 · 희귀 · 30%)
    //    방어력 수치 증가형이므로 중복 장착 가능
    'champion_belt': { type: 'health', buyPrice: 0, sellPrice: 1500, stats: { defense: 0.20 } },

    // 🍒 체리파이 (검은수염 처치 드롭 전용 · 희귀 · 50%)
    //    최대체력 수치 증가형이므로 중복 장착 가능
    //    '티치' NPC 퀘스트의 제출 재료이기도 하다
    'cherry_pie': { type: 'health', buyPrice: 0, sellPrice: 750, stats: { maxHp: 500 } },

    // 💥 흔들흔들열매 (검은수염 처치 드롭 · 20%)
    //    평타 시 0.5초 경직 후 파공아를 터뜨린다 — 고유 능력이므로 중복 장착 불가
    'gura_fruit': { type: 'util', buyPrice: 0, sellPrice: 2500, stats: { hasGura: true }, isArtifact: true, isUnique: true },

    // ⛓️ 어둠어둠열매 (검은수염 처치 드롭 · 20%)
    //    평타 시 전방 크로우즈로 대상을 즉시 끌어온다 — 고유 능력이므로 중복 장착 불가
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
    //    수치형 능력이므로 중복 장착 가능
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
    //    황금 10개 + 10,000 G 로 대장간에서 합성한다.
    //    · 1번 스킬 [번개] : 두께 증가 + 비행 속도 비약적 상승
    //    · 2번 스킬 [주력 방출] : 좌우 범위 증가
    //    고유 능력(boolean)이므로 중복 장착 불가
    'yeoui': {
        type: 'attack', buyPrice: 0, sellPrice: 12500, stats: { hasYeoui: true }, isUnique: true, isArtifact: true,
        recipe: { cost: 10000, ingredients: ['gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold'] }
    },

    // ⚡🌩️ 뇌신 (카시모 전용 · 신화)
    //    쿠릉쿠릉열매 + 황금 10개 + 여의
    //    · 여의의 전용 효과를 그대로 포함한다 (hasYeoui)
    //    · 전자파 : 범위 · 거리 증가 + 마지막 연쇄폭발 0.3초 뒤 전체 자리 동시 재폭발
    //    · 음파   : 시전 시 음파 범위로 번개 7발 동시 발사
    //    고유 능력(boolean)이므로 중복 장착 불가
    'raijin': {
        type: 'attack', buyPrice: 0, sellPrice: 30000,
        stats: { hasGoro: true, hasYeoui: true, hasRaijin: true }, isUnique: true, isArtifact: true,
        recipe: { cost: 0, ingredients: ['goro_fruit', 'yeoui', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold', 'gold'] }
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