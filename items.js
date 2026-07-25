// 파일명: items.js

const Items = {
    // 1. 일반 상점 아이템
    'burger': { type: 'health', buyPrice: 300, sellPrice: 150, stats: { maxHp: 50 } },
    'kimchi': { type: 'util', buyPrice: 300, sellPrice: 150, stats: { speedMult: 0.05 } },
    'bone': { type: 'attack', buyPrice: 400, sellPrice: 200, stats: { bonusDamage: 3 } },
    'pepsi': { type: 'attack', buyPrice: 500, sellPrice: 250, stats: { attackSpeedMult: 0.05 } },
    'jokbal_meat': { type: 'attack', buyPrice: 400, sellPrice: 200, stats: { bonusDamage: 3 } },
    'jokbal_skin': { type: 'health', buyPrice: 600, sellPrice: 300, stats: { defense: 0.05 } },
    'jokbal_fat': { type: 'health', buyPrice: 500, sellPrice: 250, stats: { hpRegen: 2 } },
    'ttakkwan': { type: 'attack', buyPrice: 12000, sellPrice: 6000, stats: { bonusDamage: 20, orbitSpheres: 1 }, isUnique: true },
    'ttappei': { type: 'attack', buyPrice: 12000, sellPrice: 6000, stats: { attackSpeedMult: 0.20, orbitSpheres: 1 }, isUnique: true },
    
    // 2. 유물 상자 전용 (상점 구매 불가)
    'seolgonnyak': { type: 'util', buyPrice: 0, sellPrice: 2500, stats: { orbitSpheres: 1 }, isArtifact: true, isUnique: true },
    'jadam': { type: 'health', buyPrice: 0, sellPrice: 250, stats: { hasJadam: true }, isArtifact: true, isUnique: true },
    'pepsi_art': { type: 'attack', buyPrice: 0, sellPrice: 250, stats: { attackSpeedMult: 0.05, hasPepsiArt: true }, isArtifact: true, isUnique: true },
    'rare_box': { type: 'box', buyPrice: 0, sellPrice: 1500 },

    // ✨ 황금 (황금오크라 처치 드롭 전용 / 판매 시 즉시 3,000 G)
    'gold': { type: 'treasure', buyPrice: 0, sellPrice: 3000 },
    
    // 3. 대장간 합성 아이템 (레시피 데이터 탑재)
    'jokbal': { 
        type: 'util', buyPrice: 0, sellPrice: 2450, stats: { hasJokbal: true }, isUnique: true, 
        recipe: { cost: 3000, ingredients: ['bone', 'jokbal_meat', 'jokbal_skin', 'jokbal_fat'] } 
    },
    'pepsi_1plus1': { 
        type: 'attack', buyPrice: 0, sellPrice: 750, stats: { attackSpeedMult: 0.10 }, 
        recipe: { cost: 1000, ingredients: ['pepsi', 'pepsi_art'] } 
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
