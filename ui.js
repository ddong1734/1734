// 파일명: ui.js

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
    'ttakkwan': { name: '따꽌펀', desc: '공격력+20, 구체 소환 (중복 장착 가능)', color: '#e74c3c', rarity: '전설', value: 12000, sellPrice: 6000 },
    'ttappei': { name: '따페이', desc: '공속+20%, 구체 소환 (중복 장착 가능)', color: '#e74c3c', rarity: '전설', value: 12000, sellPrice: 6000 },
    // ✨ 신규 신화 합성 아이템: 새로운 생명
    'new_life': { name: '새로운 생명', desc: '최대체력 +1000, 초당 체력 50 회복 (중복 장착 가능)', color: '#9b59b6', rarity: '신화', value: 28000, sellPrice: 15000 },
    'justice_coat': { name: '正義코트', desc: '최대체력+300, 공격력+30, 고유 능력(스킬2 강화)', color: '#9b59b6', rarity: '신화', value: 30000, sellPrice: 15000 },
    'dalu_fengwei': { name: '大陆风味', desc: '공+20, 공속+20%, 구체+3', color: '#9b59b6', rarity: '신화', value: 54000, sellPrice: 24500 },
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
    { id: 'jokbal_skin', price: 600, type: 'health' }, { id: 'ttakkwan', price: 12000, type: 'attack' }, { id: 'ttappei', price: 12000, type: 'attack' }
];

window.getBorderColor = (rarity, defaultColor) => {
    if (!rarity) return defaultColor;
    if (rarity.includes('일반')) return '#3498db'; 
    if (rarity.includes('희귀')) return '#2ecc71'; 
    if (rarity.includes('전설')) return '#e74c3c'; 
    if (rarity.includes('신화')) return '#9b59b6'; 
    if (rarity.includes('고유')) return defaultColor; 
    return defaultColor; 
};

window.filterShop = (category) => {
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
    let tabEl = document.getElementById('tab-' + category);
    if(tabEl) tabEl.classList.add('active');
    
    let grid = document.getElementById('shopGrid'); 
    if(!grid) return;
    grid.innerHTML = ""; 
    
    let filtered = window.SHOP_LIST.filter(s => category === 'all' || s.type === category);
    filtered.sort((a, b) => window.getItemDef(a.id).value - window.getItemDef(b.id).value);
    
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
    
    let sortedInv = [...inv].sort((a, b) => window.getItemDef(a.id).value - window.getItemDef(b.id).value);
    
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
        let sortedTeam = [...team].sort((a, b) => window.getItemDef(a.id).value - window.getItemDef(b.id).value);
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
    
    let sortedChest = [...myD.chest].sort((a, b) => window.getItemDef(a.id).value - window.getItemDef(b.id).value);
    
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

    // ✨ 신규 신화 아이템: 새로운 생명 (박힌범 오크라 + 할배새끼 오크라)
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
    allItems.sort((a, b) => a.value - b.value);
    
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

window.showAlertMsg = (msg) => {
    const alertBox = document.getElementById('customAlert');
    if (alertBox) {
        alertBox.innerText = msg; alertBox.style.display = 'block';
        setTimeout(() => { alertBox.style.display = 'none'; }, 1500);
    }
};

let goldenToastTimer;
window.showGoldenMsg = (msg, isFail) => {
    const box = document.getElementById('goldenToast');
    if (!box) return;
    box.innerText = msg;
    box.style.background = isFail ? 'rgba(192, 57, 43, 0.95)' : 'rgba(46, 204, 113, 0.95)';
    box.style.borderColor = isFail ? '#e74c3c' : '#27ae60';
    box.style.color = '#fff';
    box.style.display = 'block';
    clearTimeout(goldenToastTimer);
    goldenToastTimer = setTimeout(() => { box.style.display = 'none'; }, 2000);
};

let vignetteTimer;
window.flashDamageVignette = () => {
    const vignette = document.getElementById('damage-vignette');
    if(!vignette) return;
    clearTimeout(vignetteTimer);
    vignette.style.transition = 'none';
    vignette.style.boxShadow = 'inset 0 0 150px 20px rgba(231, 76, 60, 0.8)';
    requestAnimationFrame(() => { 
        requestAnimationFrame(() => { 
            vignette.style.transition = 'box-shadow 0.4s ease-out'; 
            vignette.style.boxShadow = 'inset 0 0 0px 0px rgba(231, 76, 60, 0)'; 
        }); 
    });
};

// 🚀 [최적화⑦] 스킬 버튼 / 쿨타임 오버레이 DOM 캐시
//    기존에는 매 프레임 getElementById 3회 + querySelector 3회를 실행했다.
//    applySkillNames 는 기존 .cd-overlay 요소를 '재사용해 다시 append' 하므로 캐시가 무효화되지 않는다.
//    (혹시 교체되더라도 el.parentNode 비교로 자동 재해석되며, 수동 무효화는 window.invalidateCdCache() 로 가능)
window._cdCache = {};
window.invalidateCdCache = () => { window._cdCache = {}; };

window.updateCDUI = (id, cdTime, now, activeEndTime = 0) => {
    let c = window._cdCache[id];
    if (!c || c.el.parentNode !== c.btn) {
        let btn = document.getElementById(id); if (!btn) return;
        let el = btn.querySelector('.cd-overlay'); if (!el) return;
        c = window._cdCache[id] = { btn: btn, el: el, mode: null, txt: null, shown: null };
    }
    let el = c.el;
    
    let pObj = window.myPlayer;
    
    if (pObj && pObj.skillFreezeUntil && pObj.skillFreezeUntil > now) {
        if (c.mode !== 'freeze') {
            c.mode = 'freeze';
            el.style.display = 'flex';
            el.style.background = 'rgba(135, 215, 255, 0.8)';
            el.style.color = '#fff';
            el.style.textShadow = '0 0 5px #00f';
            c.shown = true;
        }
        let text = "❄️" + Math.ceil((pObj.skillFreezeUntil - now) / 1000).toString();
        if (c.txt !== text) { c.txt = text; el.innerText = text; }
        return; 
    }

    if (activeEndTime > now) {
        if (c.mode !== 'active') {
            c.mode = 'active';
            el.style.display = 'flex';
            el.style.background = 'transparent';
            el.style.color = '#f1c40f';
            el.style.textShadow = '1px 1px 3px rgba(0,0,0,0.8), -1px -1px 3px rgba(0,0,0,0.8)';
            c.shown = true;
        }
        let text = Math.ceil((activeEndTime - now) / 1000).toString();
        if (c.txt !== text) { c.txt = text; el.innerText = text; }
    } else if (cdTime > now) {
        if (c.mode !== 'cd') {
            c.mode = 'cd';
            el.style.display = 'flex';
            el.style.background = 'rgba(0,0,0,0.7)';
            el.style.color = 'white';
            el.style.textShadow = 'none';
            c.shown = true;
        }
        let text = Math.ceil((cdTime - now) / 1000).toString();
        if (c.txt !== text) { c.txt = text; el.innerText = text; }
    } else {
        if (c.mode !== 'hidden') {
            c.mode = 'hidden'; c.txt = null; c.shown = false;
            el.style.display = 'none';
        }
    }
};

// ============================================================================
// 🍈 [신규] 흔들흔들 / 어둠어둠 열매 쿨타임 배지
//    1스킬 버튼 왼쪽 아래에 작은 원 두 개를 띄운다.
//    · 왼쪽 : 어둠어둠 (검정)
//    · 오른쪽 : 흔들흔들 (하양)
//    장착한 열매만 표시되며, 쿨타임 중에는 남은 초를 보여주고 흐려진다.
// ============================================================================
window._fruitCdDom = null;
const _makeFruitBadge = (bgColor, borderColor, textColor, label) => {
    let el = document.createElement('div');
    el.style.cssText =
        'width:44px; height:44px; border-radius:50%;' +
        'background:' + bgColor + '; border:3px solid ' + borderColor + ';' +
        'color:' + textColor + '; font-weight:bold; font-size:13px;' +
        'display:flex; align-items:center; justify-content:center; text-align:center;' +
        'box-shadow:0 2px 6px rgba(0,0,0,0.5); line-height:1;';
    el.innerText = label;
    return el;
};

const _ensureFruitCdDom = () => {
    let d = window._fruitCdDom;
    if (d && d.wrap && d.wrap.isConnected) return d;

    let parent = document.querySelector('.controls-right-action');
    if (!parent) return null;

    let wrap = document.createElement('div');
    wrap.id = 'fruitCdWrap';
    wrap.style.cssText =
        'position:absolute; bottom:4px; right:182px;' +
        'display:none; flex-direction:row; gap:8px;' +
        'pointer-events:none; z-index:16;';

    // 왼쪽 : 어둠어둠 (검정) / 오른쪽 : 흔들흔들 (하양)
    let yami = _makeFruitBadge('rgba(10, 0, 18, 0.92)', '#5b2a8a', '#e0c2ff', '어둠');
    let gura = _makeFruitBadge('rgba(245, 245, 245, 0.92)', '#bdc3c7', '#2c3e50', '흔들');

    wrap.appendChild(yami);
    wrap.appendChild(gura);
    parent.appendChild(wrap);

    d = window._fruitCdDom = { wrap: wrap, yami: yami, gura: gura, yamiTxt: null, guraTxt: null };
    return d;
};

window.updateFruitCdUI = (now) => {
    let d = _ensureFruitCdDom();
    if (!d) return;

    let p = window.myPlayer;
    if (!p) { d.wrap.style.display = 'none'; return; }

    let showY = !!p.hasYami;
    let showG = !!p.hasGura;

    let wantDisplay = (showY || showG) ? 'flex' : 'none';
    if (d.wrap.style.display !== wantDisplay) d.wrap.style.display = wantDisplay;
    if (wantDisplay === 'none') return;

    let yDisp = showY ? 'flex' : 'none';
    if (d.yami.style.display !== yDisp) d.yami.style.display = yDisp;
    let gDisp = showG ? 'flex' : 'none';
    if (d.gura.style.display !== gDisp) d.gura.style.display = gDisp;

    if (showY) {
        let left = Math.ceil(((p.yamiCdEnd || 0) - now) / 1000);
        let txt = (left > 0) ? String(left) : '어둠';
        if (d.yamiTxt !== txt) { d.yamiTxt = txt; d.yami.innerText = txt; }
        d.yami.style.opacity = (left > 0) ? '0.5' : '1';
        d.yami.style.fontSize = (left > 0) ? '20px' : '13px';
    }
    if (showG) {
        let left = Math.ceil(((p.guraCdEnd || 0) - now) / 1000);
        let txt = (left > 0) ? String(left) : '흔들';
        if (d.guraTxt !== txt) { d.guraTxt = txt; d.gura.innerText = txt; }
        d.gura.style.opacity = (left > 0) ? '0.5' : '1';
        d.gura.style.fontSize = (left > 0) ? '20px' : '13px';
    }
};

// 전투가 시작된 뒤에만 주기적으로 갱신한다 (0.1초 간격이면 초 단위 표시에 충분)
setInterval(() => {
    if (window.gameLoopStarted && typeof window.updateFruitCdUI === 'function') {
        window.updateFruitCdUI(Date.now());
    }
}, 100);

// 🚀 [최적화⑦] 통합 액션 버튼도 DOM 참조를 캐싱한다.
window._unifiedBtn = null;
const _getUnifiedBtn = () => {
    if (!window._unifiedBtn || !window._unifiedBtn.isConnected) window._unifiedBtn = document.getElementById('unifiedActionBtn');
    return window._unifiedBtn;
};

window.setUnifiedBtn = (text, opacity, onClickFn) => {
    let btn = _getUnifiedBtn();
    if (!btn) return;
    if (btn.style.display !== 'flex') btn.style.display = 'flex';
    if (btn.innerHTML !== text) btn.innerHTML = text;
    if (btn.style.opacity !== opacity) btn.style.opacity = opacity;
    if (btn.onclick !== onClickFn) btn.onclick = onClickFn;
};

window.hideUnifiedBtn = () => { 
    let btn = _getUnifiedBtn(); 
    if (btn && btn.style.display !== 'none') btn.style.display = 'none'; 
};

// ============================================================================
// 📶 [신규] 핑(지연시간) 표시
//    화면 왼쪽 위 '전장 인원' 바로 옆(#pingDisplay)에 작게 띄운다.
//    · 80ms 미만 : 초록 / 160ms 미만 : 노랑 / 그 이상 : 빨강
//    ※ #playerCount(h3) 는 renderEntity 가 innerText 로 매 프레임 덮어쓰므로,
//      핑은 반드시 별도 요소에 그려야 지워지지 않는다.
// ============================================================================
window._pingEl = null;
window._lastPingTxt = null;
window._lastPingCol = null;

window.updatePingUI = (ping) => {
    if (!window._pingEl || !window._pingEl.isConnected) window._pingEl = document.getElementById('pingDisplay');
    let el = window._pingEl;
    if (!el) return;

    let v = Math.round(ping || 0);
    let txt = '📶 ' + v + 'ms';
    if (window._lastPingTxt !== txt) { window._lastPingTxt = txt; el.innerText = txt; }

    let col = (v < 80) ? '#2ecc71' : (v < 160 ? '#f1c40f' : '#e74c3c');
    if (window._lastPingCol !== col) { window._lastPingCol = col; el.style.color = col; }
};