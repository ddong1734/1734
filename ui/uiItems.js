// 파일명: ui/uiItems.js
// ============================================================================
// 🎒 아이템 데이터 · 상점 · 보관함 · 대장간 UI
//
//   기존 ui.js 가 비대해져 4개로 분리한 것 중 첫 번째다. (동작은 분리 전과 동일)
//     · uiItems.js        : 아이템 DB · 상점 · 보관함 · 유물상자 · 대장간 · 테스트창고
//     · uiNpc.js          : NPC 대화창 · 퀘스트 배너 · 보상 표시
//     · uiHud.js          : 알림 · 쿨타임 오버레이 · 열매 배지 · 통합버튼 · 핑
//     · uiSkillButtons.js : ⚡ 카시모 · ⬛ 다부라 스킬 버튼 상태 표시
//
//   ⚠️ index.html 에서 반드시 이 순서대로 로드해야 한다.
// ============================================================================

window.GLOBAL_ITEM_DB = {
    'burger': { name: '싸이버거', desc: '최대체력+50', color: '#3498db', rarity: '일반', value: 300, sellPrice: 150 },
    'kimchi': { name: '김치제육', desc: '이속+5%', color: '#3498db', rarity: '일반', value: 300, sellPrice: 150 },
    'bone': { name: '냉족발 뼈', desc: '피해량+3', color: '#3498db', rarity: '일반', value: 400, sellPrice: 200 },
    'jokbal_meat': { name: '냉족발 살', desc: '피해량+3', color: '#3498db', rarity: '일반', value: 400, sellPrice: 200 },
    'pepsi': { name: '펩시', desc: '공속+5%', color: '#3498db', rarity: '일반', value: 500, sellPrice: 250 },
    'jokbal_fat': { name: '냉족발 지방', desc: '초당 체력 2 회복', color: '#3498db', rarity: '일반', value: 500, sellPrice: 250 },
    'jokbal_skin': { name: '냉족발 껍질', desc: '방어력+5%', color: '#3498db', rarity: '일반', value: 600, sellPrice: 300 },
    'jadam': { name: '자담치킨', desc: '초당 체력 5 회복 (중복 장착 가능)', color: '#3498db', rarity: '일반', value: 500, sellPrice: 250 },
    'pepsi_art': { name: '펩시(유물)', desc: '공격속도 +5% (중복 장착 가능)', color: '#3498db', rarity: '일반', value: 500, sellPrice: 250 },
    'rare_box': { name: '희귀한 주머니', desc: '2000 골드 즉시 획득', color: '#2ecc71', rarity: '희귀', value: 1500, sellPrice: 1500 },
    // 🏆 지저스 바제스 처치 드롭 전용 (30%)
    'champion_belt': { name: '챔피언 벨트', desc: '방어력 +20% (중복 장착 가능)', color: '#2ecc71', rarity: '희귀', value: 3000, sellPrice: 1500 },
    // 🍒 검은수염 처치 드롭 전용 (50%)
    'cherry_pie': { name: '체리파이', desc: '최대체력 +500 (중복 장착 가능)', color: '#2ecc71', rarity: '희귀', value: 1500, sellPrice: 750 },
    'pepsi_1plus1': { name: '펩시 1+1', desc: '공속 +10%', color: '#2ecc71', rarity: '희귀', value: 2000, sellPrice: 750 },
    'gold': { name: '황금', desc: '판매 시 3,000 골드 즉시 획득', color: '#2ecc71', rarity: '희귀', value: 3000, sellPrice: 3000 },
    'jokbal': { name: '냉족발', desc: '6% 확률 1초 빙결', color: '#2ecc71', rarity: '희귀', value: 4900, sellPrice: 2450 },
    'seolgonnyak': { name: '설곤약', desc: '위성 구체 +1 (중복 장착 가능)', color: '#e74c3c', rarity: '전설', value: 5000, sellPrice: 2500 },
    // 🥊 박힌범 처치 드롭 전용 전설 아이템
    'hinbeom_okra': { name: '박힌범 오크라', desc: '초당 체력 30 회복 (중복 장착 가능)', color: '#e74c3c', rarity: '전설', value: 5000, sellPrice: 2500 },
    // 🐗 할배새끼 처치 드롭 전용 전설 아이템
    'halbae_okra': { name: '할배새끼 오크라', desc: '최대체력 +500 (중복 장착 가능)', color: '#e74c3c', rarity: '전설', value: 5000, sellPrice: 2500 },
    // 💥 검은수염 처치 드롭 전용 (20%)
    'gura_fruit': { name: '흔들흔들열매', desc: '평타 시 0.5초 후 파공아 발동 (쿨 10초 · 피해 150 · 1초 기절)', color: '#ecf0f1', rarity: '전설', value: 5000, sellPrice: 2500 },
    // ⛓️ 검은수염 처치 드롭 전용 (20%)
    'yami_fruit': { name: '어둠어둠열매', desc: '평타 시 전방 크로우즈 즉시 발동 (쿨 7초 · 흡인 후 2초 속박, 0.5초마다 25)', color: '#34495e', rarity: '전설', value: 5000, sellPrice: 2500 },
    'pika_fruit': { name: '번쩍번쩍열매', desc: '볼사리노 전용: 광선 타수 및 두께 증가', color: '#f1c40f', rarity: '전설', value: 5000, sellPrice: 2500 },
    'hie_fruit': { name: '빙빙열매', desc: '쿠잔 전용: 퍼잔트백 속도 대폭 증가 및 빙결 시간 3초로 증가', color: '#3498db', rarity: '전설', value: 5000, sellPrice: 2500 },
    'magu_fruit': { name: '마그마그열매', desc: '사카즈키 전용: 명구 적 적중 대상 3초 후 폭발', color: '#e74c3c', rarity: '전설', value: 5000, sellPrice: 2500 },
    'goro_fruit': { name: '쿠릉쿠릉열매', desc: '에넬 전용: 엘 토르 공격 및 이펙트 범위 3배 증가', color: '#e74c3c', rarity: '전설', value: 5000, sellPrice: 2500 },
    // ⚡🏵️ 카시모 전용 전설 아이템
    'yeoui': { name: '여의(如意)', desc: '카시모 전용: 1번 번개의 두께 증가 + 비행 속도 비약적 상승, 2번 주력 방출의 좌우 범위 증가', color: '#e74c3c', rarity: '전설', value: 25000, sellPrice: 12500 },
    'ttakkwan': { name: '따꽌펀', desc: '공격력+20, 구체 소환 (중복 장착 가능)', color: '#e74c3c', rarity: '전설', value: 12000, sellPrice: 6000 },
    'ttappei': { name: '따페이', desc: '공속+20%, 구체 소환 (중복 장착 가능)', color: '#e74c3c', rarity: '전설', value: 12000, sellPrice: 6000 },
    // ⚔️ 신규 전설 합성 아이템: 퇴마의 검 (황금 15개)
    'toema_sword': { name: '퇴마의 검(退魔劍)', desc: '몬스터에게 주는 모든 피해 +30% (평타 및 모든 스킬 적용 · 적 플레이어에게는 미적용)', color: '#e74c3c', rarity: '전설', value: 45000, sellPrice: 22500 },
    // 🔥 스쿠나의 손가락 (전설) — 헤이안 스쿠나 처치 시 35% 확률
    'sukuna_finger': { name: '스쿠나의 손가락', desc: '공격력 20% 증가', color: '#e74c3c', rarity: '전설', value: 12000, sellPrice: 6000 },
    // ⚔️ 다이도 검 계열 (넷은 서로 함께 장착할 수 없다)
    'japgeom': { name: '잡검(雜劍)', desc: '공격력 5% 증가', color: '#3498db', rarity: '일반', value: 800, sellPrice: 400 },
    'dojwama': { name: '도좌마(刀座魔)', desc: '공격력 7.5% 증가 · ⚔️다이도 강화 평타가 3연타 → 2연타로 빨라짐', color: '#2ecc71', rarity: '희귀', value: 6000, sellPrice: 3000 },
    'yonggol': { name: '용골(龍骨)', desc: '공격력 15% 증가 · 도좌마의 모든 능력 · ⚔️다이도 모든 스킬에 흡혈 30% (평타 제외)', color: '#e74c3c', rarity: '전설', value: 18000, sellPrice: 9000 },
    'seokhondo': { name: '석혼도(石魂刀)', desc: '공격력 25% 증가 · 용골의 모든 능력 · ⚔️다이도 스킬 피해 +25%(흡혈량도 비례) · 방어 무시 · 적중 시 2.5초 동안 상대 회복량 30%로 저하', color: '#9b59b6', rarity: '신화', value: 40000, sellPrice: 20000 },
    // 🕊️ 쿠루스 하나 전용 계열 (셋은 함께 장착할 수 없다)
    'tacheon': { name: '타천(墮天)', desc: '🕊️[집회] 대상마다 30% 확률로 신성력을 1 대신 2 획득', color: '#e74c3c', rarity: '전설', value: 12000, sellPrice: 6000 },
    'angel_wing': { name: '천사의 날개', desc: '🕊️[축복] 회복량 초당 200 → 300 · [야곱의 사다리] 지속 3초 → 4초', color: '#9b59b6', rarity: '신화', value: 30000, sellPrice: 15000 },
    'angel': { name: '천사(天使)', desc: '타천 + 천사의 날개의 모든 능력 (🕊️1·2·3번 스킬 강화)', color: '#9b59b6', rarity: '신화', value: 60000, sellPrice: 30000 },
    // 🔯 신규 신화 합성 아이템: 법진 (새로운 생명 + 황금 10개)
    'beopjin': { name: '법진(法陣)', desc: '적 처치 1회당 최대체력+20, 초당회복+2, 방어력+0.2% (최대 50회 · 사망해도 유지)', color: '#9b59b6', rarity: '신화', value: 60000, sellPrice: 30000 },
    // 🗡️ 신규 ??? 등급 아이템: 세계를 가르는 참격 (NPC '마허라' 퀘스트 보상)
    'world_cleave': { name: '세계를 가르는 참격', desc: '4번 스킬 개방 — 0.5초 경직 후 정면으로 방어 무시 관통 반달 참격 (피해 850 · 쿨타임 130초)', color: '#0a0a0e', rarity: '???', value: 80000, sellPrice: 40000 },
    // 🌑 신규 ??? 등급 아이템: 유명이경 역월 (마허라 2차 퀘스트 보상 · 다부라 전용)
    'yumyeong': { name: '유명이경 역월', desc: '⬛다부라 전용 · 4번 스킬 개방 — 1초 시전 후 영역 전개 (전개 4초 · 지속 15초 · 쿨타임 130초) · 세계를 가르는 참격과 함께 장착 불가', color: '#0a0a0e', rarity: '???', value: 120000, sellPrice: 60000 },
    // ✨ 신규 신화 합성 아이템: 새로운 생명
    'new_life': { name: '새로운 생명', desc: '최대체력 +1000, 초당 체력 50 회복 (중복 장착 가능)', color: '#9b59b6', rarity: '신화', value: 28000, sellPrice: 15000 },
    'justice_coat': { name: '正義코트', desc: '최대체력+300, 공격력+30, 고유 능력(스킬2 강화)', color: '#9b59b6', rarity: '신화', value: 30000, sellPrice: 15000 },
    'dalu_fengwei': { name: '大陆风味', desc: '공+20, 공속+20%, 구체+3', color: '#9b59b6', rarity: '신화', value: 54000, sellPrice: 24500 },
    // ⚡🌩️ 카시모 전용 신화 아이템
    'raijin': { name: '뇌신(雷神)', desc: '카시모 전용: 여의의 모든 효과 + 전자파 범위·거리 증가 및 0.3초 뒤 전체 자리 동시 재폭발 + 음파 시전 시 번개 7발 동시 발사', color: '#9b59b6', rarity: '신화', value: 60000, sellPrice: 30000 },
    // ⬛ 다부라 카라바 전용 신화 아이템
    'black_square': { name: '■', desc: '다부라 카라바 전용: [빛] 폭발 범위 증가, [어둠] 소용돌이 및 어둠 구체 폭발 범위 증가, [아광속 발차기] 이동속도 증가량 1.5배 → 2배', color: '#9b59b6', rarity: '신화', value: 60000, sellPrice: 30000 },
    'kizaru': { name: '키자루', desc: '체력+300, 공격력+30, 열매+코트 특성, 시전 시 주변 광탄 폭발', color: '#f1c40f', rarity: '고유', value: 75000, sellPrice: 22500 },
    'aokiji': { name: '아오키지', desc: '체력+300, 공격력+30, 열매+코트 특성, 스킬 쿨타임 5초 동결', color: '#3498db', rarity: '고유', value: 75000, sellPrice: 22500 },
    'akainu': { name: '아카이누', desc: '체력+300, 공격력+30, 열매+코트 특성, 마그마 낙하 강화', color: '#e74c3c', rarity: '고유', value: 75000, sellPrice: 22500 },
    'ark_maxim': { name: '방주 맥심', desc: '에넬 전용: 만뢰 범위 3배, 낙뢰 두께/길이 1.5배, 낙뢰 수 2배 증가', color: '#9b59b6', rarity: '신화', value: 75000, sellPrice: 22500 },
    'god_enel': { name: '갓 에넬', desc: '체력+300, 공+30, 쿠릉쿠릉+맥심 특성, 뇌영 범위/크기 2.5배 증가', color: '#00bfff', rarity: '고유', value: 100000, sellPrice: 50000 }
};

window.getItemDef = (id) => window.GLOBAL_ITEM_DB[id] || { name: id || '알 수 없음', desc: '', color: '#7f8c8d', rarity: '일반', value: 0, sellPrice: 0 };

window.SHOP_LIST = [
    { id: 'burger', price: 300, type: 'health' }, { id: 'kimchi', price: 300, type: 'util' }, 
    { id: 'bone', price: 400, type: 'attack' }, { id: 'jokbal_meat', price: 400, type: 'attack' }, 
    { id: 'pepsi', price: 500, type: 'attack' }, { id: 'jokbal_fat', price: 500, type: 'health' },
    { id: 'jokbal_skin', price: 600, type: 'health' }, { id: 'ttakkwan', price: 12000, type: 'attack' }, { id: 'ttappei', price: 12000, type: 'attack' },
    // ⚔️ 다이도 검 계열의 시작점 (800골드)
    { id: 'japgeom', price: 800, type: 'attack' }
];

window.getBorderColor = (rarity, defaultColor) => {
    if (!rarity) return defaultColor;
    // 🗡️ '???' 등급 — 검정 (신화보다 높은 최상위 등급)
    //    '일반' 등 다른 등급보다 먼저 판정해야 한다.
    if (rarity.includes('?')) return '#0a0a0e';
    if (rarity.includes('일반')) return '#3498db'; 
    if (rarity.includes('희귀')) return '#2ecc71'; 
    if (rarity.includes('전설')) return '#e74c3c'; 
    if (rarity.includes('신화')) return '#9b59b6'; 
    if (rarity.includes('고유')) return defaultColor; 
    return defaultColor; 
};

/**
 * 🔢 아이템 목록 정렬용 비교 함수 (등급 → 가격 순).
 *    '???' 는 최상위 등급이라 항상 목록 맨 아래로 간다.
 *    아이템 정의 객체 두 개를 받는다.
 */
window.compareItemDef = (da, db) => {
    let ra = window.getRarityRank(da && da.rarity), rb = window.getRarityRank(db && db.rarity);
    if (ra !== rb) return ra - rb;
    return ((da && da.value) || 0) - ((db && db.value) || 0);
};

/** 🔢 인벤토리 항목({id,uid}) 두 개를 등급 → 가격 순으로 비교한다 */
window.compareInvItem = (a, b) => window.compareItemDef(window.getItemDef(a.id), window.getItemDef(b.id));

/**
 * 🏅 등급 서열 (낮을수록 하위)
 *    일반 < 희귀 < 전설 < 고유 < 신화 < ???
 *    '???' 는 신화보다 높은 최상위 등급이므로 목록에서 가장 뒤에 놓는다.
 */
window.getRarityRank = (rarity) => {
    if (!rarity) return 0;
    if (rarity.includes('?'))   return 6;   // ??? — 최상위
    if (rarity.includes('신화')) return 5;
    if (rarity.includes('고유')) return 4;
    if (rarity.includes('전설')) return 3;
    if (rarity.includes('희귀')) return 2;
    if (rarity.includes('일반')) return 1;
    return 0;
};

window.filterShop = (category) => {
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
    let tabEl = document.getElementById('tab-' + category);
    if(tabEl) tabEl.classList.add('active');
    
    let grid = document.getElementById('shopGrid'); 
    if(!grid) return;
    grid.innerHTML = ""; 
    
    let filtered = window.SHOP_LIST.filter(s => category === 'all' || s.type === category);
    filtered.sort(window.compareInvItem);   // 🏅 등급 → 가격 순 (??? 는 맨 아래)
    
    filtered.forEach(sItem => {
        let dbItem = window.getItemDef(sItem.id);
        let borderColor = window.getBorderColor(dbItem.rarity, dbItem.color);
        
        let box = document.createElement('div'); 
        box.className = 'shop-item-box';
        box.style.border = "3px solid " + borderColor;
        box.innerHTML = `<div><h3 style="color:${borderColor}; margin:0 0 5px 0;">${dbItem.name} <span style="font-size:12px; color:#ccc;">(${dbItem.rarity})</span></h3><p style="margin:0 0 10px 0;">${dbItem.desc}</p></div><button class="btn-main" style="padding:8px; font-size:16px; width:100%; background:${dbItem.color}; margin-top:auto;" onclick="window.socket.emit('shopBuy', '${sItem.id}')">${sItem.price} G</button>`;
        grid.appendChild(box);
    });
};

window.openShop = () => { 
    document.getElementById('shopModal').style.display = 'flex'; 
    document.getElementById('shopGoldDisplay').innerText = window.myPlayer.gold; 
    window.filterShop('all'); 
};
window.closeShop = () => { document.getElementById('shopModal').style.display = 'none'; };

window.renderStorageUI = () => {
    let pGrid = document.getElementById('personalGrid'); 
    let tGrid = document.getElementById('teamGrid'); 
    if(!pGrid || !tGrid) return;
    
    pGrid.innerHTML = ""; tGrid.innerHTML = "";
    
    let inv = window.myPlayer.inventory || [];
    if (inv.length === 0) {
        pGrid.innerHTML = "<div style='grid-column: span 2; text-align: center; color: #aaa; margin-top: 20px;'>비어있습니다.</div>";
    }
    
    let sortedInv = [...inv].sort(window.compareInvItem);   // 🏅 등급 → 가격 순
    
    sortedInv.forEach(cItem => {
        let item = window.getItemDef(cItem.id);
        let isEq = window.myPlayer.equippedUids && window.myPlayer.equippedUids.includes(cItem.uid);
        let isCon = (cItem.id || '').includes('box');
        let isTreasure = (cItem.id === 'gold');
        let bc = window.getBorderColor(item.rarity, item.color);
        let bg = isEq ? "rgba(46, 204, 113, 0.3)" : "#2c3e50"; 
        
        let btnText = isEq ? "해제" : "장착";
        let btnBg = isEq ? "#c0392b" : item.color;
        
        let bHtml = "";
        if (!isCon && !isTreasure) {
            bHtml += `<button class="btn-main" style="flex:1; padding:6px; font-size:13px; background:${btnBg}; border:none;" onclick="window.socket.emit('toggleEquip', '${cItem.uid}')">${btnText}</button>`;
        }
        if (!isCon) {
            bHtml += `<button class="btn-main" style="flex:1; padding:6px; font-size:13px; background:#f39c12; border:none;" onclick="window.socket.emit('storeToTeam', '${cItem.uid}')">보관</button>`;
        }
        if (item.sellPrice > 0) { 
            bHtml += `<button class="btn-main" style="flex:1; padding:6px; font-size:13px; background:#e74c3c; border:none;" onclick="window.socket.emit('sellItem', '${cItem.uid}')">판매</button>`; 
        }

        let box = document.createElement('div'); box.className = 'shop-item-box'; 
        box.style.border = `3px solid ${bc}`; box.style.background = bg; box.style.minHeight = "150px";
        box.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:${isEq ? '#fff' : bc}; margin:0 0 5px 0; font-size:16px;">${item.name} <span style="font-size:10px; color:#ccc;">(${item.rarity})</span></h3><p style="color:${isEq ? '#fff' : '#bdc3c7'}; margin:0; font-size:12px;">${item.desc}</p></div><div style="display:flex; gap:5px; margin-top:auto;">${bHtml}</div>`;
        pGrid.appendChild(box);
    });

    let team = window.currentTeamStorage || [];
    if (team.length === 0) {
        tGrid.innerHTML = "<div style='grid-column: span 2; text-align: center; color: #aaa; margin-top: 20px;'>금고가 비어있습니다.</div>";
    } else {
        let sortedTeam = [...team].sort(window.compareInvItem);   // 🏅 등급 → 가격 순
        sortedTeam.forEach(cItem => {
            let item = window.getItemDef(cItem.id);
            let bc = window.getBorderColor(item.rarity, item.color);
            let bHtml = `<button class="btn-main" style="width:100%; padding:6px; font-size:14px; background:#2ecc71; border:none;" onclick="window.socket.emit('acquireFromTeam', '${cItem.uid}')">획득하기</button>`;
            
            let box = document.createElement('div'); box.className = 'shop-item-box'; 
            box.style.border = `3px solid ${bc}`; box.style.minHeight = "130px";
            box.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:${bc}; margin:0 0 5px 0; font-size:16px;">${item.name} <span style="font-size:10px; color:#ccc;">(${item.rarity})</span></h3><p style="color:#bdc3c7; margin:0; font-size:12px;">${item.desc}</p></div><div style="display:flex; gap:5px; margin-top:auto;">${bHtml}</div>`;
            tGrid.appendChild(box);
        });
    }
};

window.openStorage = () => { document.getElementById('storageModal').style.display = 'flex'; window.renderStorageUI(); };
window.closeStorage = () => { document.getElementById('storageModal').style.display = 'none'; };

window.renderChestUI = () => {
    let myD = window.serverDetectors.find(d => d.ownerId === window.myId); 
    let grid = document.getElementById('chestGrid'); if(!grid) return;
    
    grid.innerHTML = "";
    if (!myD || !myD.chest || myD.chest.length === 0) {
        grid.innerHTML = "<div style='grid-column: span 3; text-align: center; color: #aaa; margin-top: 20px; font-size: 18px;'>상자가 비어있습니다.</div>"; return;
    }
    
    let sortedChest = [...myD.chest].sort(window.compareInvItem);   // 🏅 등급 → 가격 순
    
    sortedChest.forEach((cItem) => {
        let item = window.getItemDef(cItem.id);
        let bc = window.getBorderColor(item.rarity, item.color);
        let bHtml = `<button class="btn-main" style="width:100%; padding:8px; font-size:16px; background:#2ecc71; border:none;" onclick="window.socket.emit('acquireFromChest', '${cItem.uid}')">내 장비로 획득</button>`;

        let box = document.createElement('div'); box.className = 'shop-item-box'; 
        box.style.border = `3px solid ${bc}`; 
        box.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:${bc}; margin:0 0 5px 0;">${item.name} <span style="font-size:12px; color:#ccc;">(${item.rarity})</span></h3><p style="color:#bdc3c7; margin:0;">${item.desc}</p></div><div style="display:flex; gap:5px; margin-top:auto;">${bHtml}</div>`;
        grid.appendChild(box);
    });
};

window.openChest = () => { document.getElementById('chestModal').style.display = 'flex'; window.renderChestUI(); };
window.closeChest = () => { document.getElementById('chestModal').style.display = 'none'; };

window.renderSmithUI = () => {
    let grid = document.getElementById('smithGrid'); if(!grid) return;
    grid.innerHTML = "";
    
    let p = window.myPlayer;
    let inv = p.inventory || [];
    
    let hasPepsiShop = inv.some(i => i.id === 'pepsi');
    let hasPepsiArt = inv.some(i => i.id === 'pepsi_art');
    let hasGoldP = p.gold >= 1000;
    let canCraftP = hasPepsiShop && hasPepsiArt && hasGoldP;
    
    let boxP = document.createElement('div'); boxP.className = 'shop-item-box'; boxP.style.border = "3px solid #2ecc71";
    boxP.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#2ecc71; margin:0 0 5px 0;">펩시 1+1</h3><p style="color:#bdc3c7; font-size:12px;">비용: 1,000 G<br>재료: 펩시+유물펩시</p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftP?'#2ecc71':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'pepsi_1plus1')">${canCraftP?'1000 G 합성':'재료 부족'}</button>`;
    grid.appendChild(boxP);

    let hasB = inv.some(i => i.id === 'bone');
    let hasM = inv.some(i => i.id === 'jokbal_meat');
    let hasS = inv.some(i => i.id === 'jokbal_skin');
    let hasF = inv.some(i => i.id === 'jokbal_fat');
    let hasGoldJ = p.gold >= 3000;
    let canCraftJ = hasB && hasM && hasS && hasF && hasGoldJ;
    
    let boxJ = document.createElement('div'); boxJ.className = 'shop-item-box'; boxJ.style.border = "3px solid #2ecc71";
    boxJ.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#2ecc71; margin:0 0 5px 0;">냉족발</h3><p style="color:#bdc3c7; font-size:12px;">비용: 3,000 G<br>재료: 뼈+살+껍질+지방</p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftJ?'#2ecc71':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'jokbal')">${canCraftJ?'3000 G 합성':'재료 부족'}</button>`;
    grid.appendChild(boxJ);

    // ✨ 새로운 생명 (박힌범 오크라 + 할배새끼 오크라)
    let hasHinbeomOkra = inv.some(i => i.id === 'hinbeom_okra');
    let hasHalbaeOkra = inv.some(i => i.id === 'halbae_okra');
    let canCraftNewLife = hasHinbeomOkra && hasHalbaeOkra;

    let boxNL = document.createElement('div'); boxNL.className = 'shop-item-box'; boxNL.style.border = "3px solid #9b59b6";
    boxNL.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#9b59b6; margin:0 0 5px 0;">새로운 생명</h3><p style="color:#bdc3c7; font-size:12px;">비용: 무료<br>재료: 박힌범 오크라+할배새끼 오크라</p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftNewLife?'#9b59b6':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'new_life')">${canCraftNewLife?'합성하기':'재료 부족'}</button>`;
    grid.appendChild(boxNL);

    let hasTk = inv.some(i => i.id === 'ttakkwan');
    let hasTp = inv.some(i => i.id === 'ttappei');
    let hasSq = inv.some(i => i.id === 'seolgonnyak');
    let hasGoldDF = p.gold >= 25000;
    let canCraftDF = hasTk && hasTp && hasSq && hasGoldDF;
    
    let boxDF = document.createElement('div'); boxDF.className = 'shop-item-box'; boxDF.style.border = "3px solid #9b59b6";
    boxDF.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#9b59b6; margin:0 0 5px 0;">大陆风味</h3><p style="color:#bdc3c7; font-size:12px;">비용: 25,000 G<br>재료: 따꽌펀+따페이+설곤약</p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftDF?'#9b59b6':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'dalu_fengwei')">${canCraftDF?'25000 G 합성':'재료 부족'}</button>`;
    grid.appendChild(boxDF);

    let hasCoat = inv.some(i => i.id === 'justice_coat');
    let hasPika = inv.some(i => i.id === 'pika_fruit');
    let canCraftKizaru = hasCoat && hasPika && p.gold >= 30000;
    
    let boxK = document.createElement('div'); boxK.className = 'shop-item-box'; boxK.style.border = "3px solid #f1c40f";
    boxK.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#f1c40f; margin:0 0 5px 0;">키자루</h3><p style="color:#bdc3c7; font-size:12px;">비용: 30,000 G<br>재료: 正義코트+번쩍번쩍열매</p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftKizaru?'#f1c40f':'#7f8c8d'}; color:#000; margin-top:auto;" onclick="window.socket.emit('craftItem', 'kizaru')">${canCraftKizaru?'30000 G 합성':'재료 부족'}</button>`;
    grid.appendChild(boxK);

    let hasHie = inv.some(i => i.id === 'hie_fruit');
    let canCraftAokiji = hasCoat && hasHie && p.gold >= 30000;
    
    let boxA = document.createElement('div'); boxA.className = 'shop-item-box'; boxA.style.border = "3px solid #3498db";
    boxA.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#3498db; margin:0 0 5px 0;">아오키지</h3><p style="color:#bdc3c7; font-size:12px;">비용: 30,000 G<br>재료: 正義코트+빙빙열매</p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftAokiji?'#3498db':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'aokiji')">${canCraftAokiji?'30000 G 합성':'재료 부족'}</button>`;
    grid.appendChild(boxA);

    let hasMagu = inv.some(i => i.id === 'magu_fruit');
    let canCraftAkainu = hasCoat && hasMagu && p.gold >= 30000;
    
    let boxAk = document.createElement('div'); boxAk.className = 'shop-item-box'; boxAk.style.border = "3px solid #e74c3c";
    boxAk.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#e74c3c; margin:0 0 5px 0;">아카이누</h3><p style="color:#bdc3c7; font-size:12px;">비용: 30,000 G<br>재료: 正義코트+마그마그열매</p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftAkainu?'#e74c3c':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'akainu')">${canCraftAkainu?'30000 G 합성':'재료 부족'}</button>`;
    grid.appendChild(boxAk);

    let goldCount = inv.filter(i => i.id === 'gold').length;
    let canCraftArk = goldCount >= 10 && p.gold >= 50000;
    
    let boxArk = document.createElement('div'); boxArk.className = 'shop-item-box'; boxArk.style.border = "3px solid #9b59b6";
    boxArk.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#9b59b6; margin:0 0 5px 0;">방주 맥심</h3><p style="color:#bdc3c7; font-size:12px;">비용: 50,000 G<br>재료: 황금 10개</p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftArk?'#9b59b6':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'ark_maxim')">${canCraftArk?'50000 G 합성':'재료 부족'}</button>`;
    grid.appendChild(boxArk);

    // ⚡🏵️ 여의 (카시모 전용 · 전설) — 황금 10개 + 10,000 G
    let canCraftYeoui = goldCount >= 10 && p.gold >= 10000;

    let boxYe = document.createElement('div'); boxYe.className = 'shop-item-box'; boxYe.style.border = "3px solid #a855f7";
    boxYe.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#a855f7; margin:0 0 5px 0;">여의(如意)</h3><p style="color:#bdc3c7; font-size:12px;">비용: 10,000 G<br>재료: 황금 10개<br><span style="color:#c084fc;">카시모 전용</span></p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftYeoui?'#a855f7':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'yeoui')">${canCraftYeoui?'10000 G 합성':'재료 부족'}</button>`;
    grid.appendChild(boxYe);

    // ⚡🌩️ 뇌신 (카시모 전용 · 신화) — 쿠릉쿠릉열매 + 황금 10개 + 여의
    let hasGoroR = inv.some(i => i.id === 'goro_fruit');
    let hasYeouiR = inv.some(i => i.id === 'yeoui');
    let canCraftRaijin = hasGoroR && hasYeouiR && goldCount >= 10;

    let boxRj = document.createElement('div'); boxRj.className = 'shop-item-box'; boxRj.style.border = "3px solid #9b59b6";
    boxRj.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#9b59b6; margin:0 0 5px 0;">뇌신(雷神)</h3><p style="color:#bdc3c7; font-size:12px;">비용: 무료<br>재료: 쿠릉쿠릉+여의+황금 10개<br><span style="color:#c084fc;">카시모 전용</span></p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftRaijin?'#9b59b6':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'raijin')">${canCraftRaijin?'합성하기':'재료 부족'}</button>`;
    grid.appendChild(boxRj);

    // ⬛ ■ (다부라 카라바 전용 · 신화) — 어둠어둠열매 + 번쩍번쩍열매
    let hasYamiSq = inv.some(i => i.id === 'yami_fruit');
    let hasPikaSq = inv.some(i => i.id === 'pika_fruit');
    let canCraftSquare = hasYamiSq && hasPikaSq;

    let boxSq = document.createElement('div'); boxSq.className = 'shop-item-box'; boxSq.style.border = "3px solid #9b59b6";
    boxSq.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#e8e8f0; margin:0 0 5px 0; text-shadow:0 0 8px rgba(255,255,255,0.5);">■</h3><p style="color:#bdc3c7; font-size:12px;">비용: 무료<br>재료: 어둠어둠열매+번쩍번쩍열매<br><span style="color:#cbd5e1;">다부라 카라바 전용</span></p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftSquare?'#9b59b6':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'black_square')">${canCraftSquare?'합성하기':'재료 부족'}</button>`;
    grid.appendChild(boxSq);

    // ⚔️ 퇴마의 검 (전설) — 황금 15개
    let canCraftToema = goldCount >= 15;

    let boxTo = document.createElement('div'); boxTo.className = 'shop-item-box'; boxTo.style.border = "3px solid #e74c3c";
    boxTo.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#e74c3c; margin:0 0 5px 0;">퇴마의 검(退魔劍)</h3><p style="color:#bdc3c7; font-size:12px;">비용: 무료<br>재료: 황금 15개<br><span style="color:#ff9f9f;">몬스터 피해 +30%</span></p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftToema?'#e74c3c':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'toema_sword')">${canCraftToema?'합성하기':'재료 부족'}</button>`;
    grid.appendChild(boxTo);

    // 🔯 법진 (신화) — 새로운 생명 + 황금 10개
    let hasNewLifeBj = inv.some(i => i.id === 'new_life');
    let canCraftBeopjin = hasNewLifeBj && goldCount >= 10;

    let boxBj = document.createElement('div'); boxBj.className = 'shop-item-box'; boxBj.style.border = "3px solid #9b59b6";
    boxBj.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#9b59b6; margin:0 0 5px 0;">법진(法陣)</h3><p style="color:#bdc3c7; font-size:12px;">비용: 무료<br>재료: 새로운 생명+황금 10개<br><span style="color:#c084fc;">처치할수록 강해진다</span></p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftBeopjin?'#9b59b6':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'beopjin')">${canCraftBeopjin?'합성하기':'재료 부족'}</button>`;
    grid.appendChild(boxBj);

    // ══════════════════════════════════════════════════════════════
    // ⚔️ 다이도 검 계열 : 도좌마 → 용골 → 석혼도
    // ══════════════════════════════════════════════════════════════
    let fingerCount = inv.filter(i => i.id === 'sukuna_finger').length;

    // ⚔️ 도좌마 (희귀) — 잡검 + 황금 5개
    let hasJapgeomInv = inv.some(i => i.id === 'japgeom');
    let canCraftDojwama = hasJapgeomInv && goldCount >= 5;
    let boxDj = document.createElement('div'); boxDj.className = 'shop-item-box'; boxDj.style.border = "3px solid #2ecc71";
    boxDj.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#2ecc71; margin:0 0 5px 0;">도좌마(刀座魔)</h3><p style="color:#bdc3c7; font-size:12px;">비용: 무료<br>재료: 잡검+황금 5개<br><span style="color:#7ee8a2;">다이도 타격 횟수 증가</span></p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftDojwama?'#2ecc71':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'dojwama')">${canCraftDojwama?'합성하기':'재료 부족'}</button>`;
    grid.appendChild(boxDj);

    // ⚔️ 용골 (전설) — 도좌마 + 황금 5개 + 스쿠나의 손가락 1개
    let hasDojwamaInv = inv.some(i => i.id === 'dojwama');
    let canCraftYonggol = hasDojwamaInv && goldCount >= 5 && fingerCount >= 1;
    let boxYg = document.createElement('div'); boxYg.className = 'shop-item-box'; boxYg.style.border = "3px solid #e74c3c";
    boxYg.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#e74c3c; margin:0 0 5px 0;">용골(龍骨)</h3><p style="color:#bdc3c7; font-size:12px;">비용: 무료<br>재료: 도좌마+황금 5개+스쿠나의 손가락 1개<br><span style="color:#ff9f9f;">다이도 스킬 흡혈 30%</span></p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftYonggol?'#e74c3c':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'yonggol')">${canCraftYonggol?'합성하기':'재료 부족'}</button>`;
    grid.appendChild(boxYg);

    // ⚔️ 석혼도 (신화) — 용골 + 황금 5개 + 스쿠나의 손가락 3개
    let hasYonggolInv = inv.some(i => i.id === 'yonggol');
    let canCraftSeokhondo = hasYonggolInv && goldCount >= 5 && fingerCount >= 3;
    let boxSh = document.createElement('div'); boxSh.className = 'shop-item-box'; boxSh.style.border = "3px solid #9b59b6";
    boxSh.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#9b59b6; margin:0 0 5px 0;">석혼도(石魂刀)</h3><p style="color:#bdc3c7; font-size:12px;">비용: 무료<br>재료: 용골+황금 5개+스쿠나의 손가락 3개<br><span style="color:#c084fc;">방어 무시 · 회복 저하</span></p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftSeokhondo?'#9b59b6':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'seokhondo')">${canCraftSeokhondo?'합성하기':'재료 부족'}</button>`;
    grid.appendChild(boxSh);

    // ══════════════════════════════════════════════════════════════
    // 🕊️ 쿠루스 계열 : 천사의 날개 → 천사
    // ══════════════════════════════════════════════════════════════
    let halbaeCount = inv.filter(i => i.id === 'halbae_okra').length;

    // 🪽 천사의 날개 (신화) — 할배새끼 오크라 + 황금 5개 + 스쿠나의 손가락 1개
    let canCraftWing = halbaeCount >= 1 && goldCount >= 5 && fingerCount >= 1;
    let boxAw = document.createElement('div'); boxAw.className = 'shop-item-box'; boxAw.style.border = "3px solid #9b59b6";
    boxAw.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#c084fc; margin:0 0 5px 0;">천사의 날개</h3><p style="color:#bdc3c7; font-size:12px;">비용: 무료<br>재료: 할배새끼 오크라+황금 5개+스쿠나의 손가락 1개<br><span style="color:#e0b3ff;">축복 300 · 사다리 4초</span></p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftWing?'#9b59b6':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'angel_wing')">${canCraftWing?'합성하기':'재료 부족'}</button>`;
    grid.appendChild(boxAw);

    // 👼 천사 (신화) — 타천 + 천사의 날개 + 황금 5개
    let hasTacheonInv = inv.some(i => i.id === 'tacheon');
    let hasWingInv = inv.some(i => i.id === 'angel_wing');
    let canCraftAngel = hasTacheonInv && hasWingInv && goldCount >= 5;
    let boxAg = document.createElement('div'); boxAg.className = 'shop-item-box'; boxAg.style.border = "3px solid #ffd23c";
    boxAg.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#ffd23c; margin:0 0 5px 0;">천사(天使)</h3><p style="color:#bdc3c7; font-size:12px;">비용: 무료<br>재료: 타천+천사의 날개+황금 5개<br><span style="color:#fff0b3;">1·2·3번 스킬 전부 강화</span></p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftAngel?'#e0a81c':'#7f8c8d'}; margin-top:auto; color:#201800;" onclick="window.socket.emit('craftItem', 'angel')">${canCraftAngel?'합성하기':'재료 부족'}</button>`;
    grid.appendChild(boxAg);

    // ✨ 신규 고유 등급 아이템: 갓 에넬
    let hasGoro = inv.some(i => i.id === 'goro_fruit');
    let hasArkMaxim = inv.some(i => i.id === 'ark_maxim');
    let canCraftGod = hasGoro && hasArkMaxim && goldCount >= 10 && p.gold >= 50000;
    
    let boxGod = document.createElement('div'); boxGod.className = 'shop-item-box'; boxGod.style.border = "3px solid #00bfff";
    boxGod.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:#00bfff; margin:0 0 5px 0;">갓 에넬</h3><p style="color:#bdc3c7; font-size:12px;">비용: 50,000 G<br>재료: 쿠릉쿠릉+방주맥심+황금10개</p></div><button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:${canCraftGod?'#00bfff':'#7f8c8d'}; margin-top:auto;" onclick="window.socket.emit('craftItem', 'god_enel')">${canCraftGod?'50000 G 합성':'재료 부족'}</button>`;
    grid.appendChild(boxGod);
};

window.openSmith = () => { document.getElementById('smithModal').style.display = 'flex'; window.renderSmithUI(); };
window.closeSmith = () => { document.getElementById('smithModal').style.display = 'none'; };

window.renderTestStorageUI = () => {
    let grid = document.getElementById('testStorageGrid'); if(!grid) return;
    grid.innerHTML = "";
    
    let allItems = Object.keys(window.GLOBAL_ITEM_DB).map(k => ({id: k, ...window.GLOBAL_ITEM_DB[k]}));
    // 🏅 [수정] 등급 순으로 먼저 정렬하고, 같은 등급 안에서만 가격순으로 정렬한다.
    //    '???' 는 최상위 등급이라 목록 맨 아래에 놓인다.
    //    (예전에는 value 만 보고 정렬해서, 가격이 0 인 ??? 아이템이 맨 위에 있었다)
    allItems.sort((a, b) => {
        let ra = window.getRarityRank(a.rarity), rb = window.getRarityRank(b.rarity);
        if (ra !== rb) return ra - rb;
        return (a.value || 0) - (b.value || 0);
    });
    
    allItems.forEach(item => {
        let bc = window.getBorderColor(item.rarity, item.color);
        let bHtml = `<button class="btn-main" style="width:100%; padding:8px; font-size:16px; background:#e84393; border:none;" onclick="window.socket.emit('acquireFromTest', '${item.id}')">무한 획득</button>`;

        let box = document.createElement('div'); box.className = 'shop-item-box'; 
        box.style.border = `3px solid ${bc}`; 
        box.innerHTML = `<div style="margin-bottom:8px;"><h3 style="color:${bc}; margin:0 0 5px 0;">${item.name} <span style="font-size:12px; color:#ccc;">(${item.rarity})</span></h3><p style="color:#bdc3c7; margin:0; font-size:12px;">${item.desc}</p></div><div style="display:flex; gap:5px; margin-top:auto;">${bHtml}</div>`;
        grid.appendChild(box);
    });
};

window.openTestStorage = () => { document.getElementById('testStorageModal').style.display = 'flex'; window.renderTestStorageUI(); };
window.closeTestStorage = () => { document.getElementById('testStorageModal').style.display = 'none'; };

window.buyDetectorAtSpot = () => { if(window.currentNearSpotX && window.socket) window.socket.emit('buyDetector', window.currentNearSpotX); };