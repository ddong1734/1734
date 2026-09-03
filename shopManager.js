// shopManager.js - 상점 구매, 장비 탈착, 팀 창고, 합성 등을 전담

// ══════════════════════════════════════════════════════════════════
// 🏛️ [세계정부] 마리조아 · 판게아 성 보정
//   · 마리조아   : 아이템 판매가 10% 증가
//   · 판게아 성  : 인벤토리 한도 10 증가
// ══════════════════════════════════════════════════════════════════
function govShop(p, State) {
    try {
        const GT = require('./govTree.js');
        if (State.bases[p.team] && State.bases[p.team].govType === 'wg') {
            const b = GT.bonusOf(State.govTree[p.team]);
            if (b) return b;
        }
    } catch (e) { }
    return { sellPct: 0, invSlots: 0 };
}
/** 이 사람의 인벤토리 한도 */
function invMax(p, State) { return 20 + (govShop(p, State).invSlots || 0); }

const Items = require('./items.js');

const DETECTOR_SPOTS = { 1: [8600, 9600, 10600], 2: [21400, 22400, 23400] };

module.exports = {
    registerEvents: (socket, ctx) => {
        const { State, io } = ctx;
        const recalcStats = (typeof ctx.recalcStats === 'function') ? ctx.recalcStats : function () {};

        socket.on('shopBuy', (type) => { 
            let p = State.players[socket.id]; if (!p || p.isDead) return; 
            if (p.inventory.length >= invMax(p, State)) return socket.emit('buyFail', '인벤토리가 가득 찼습니다!'); 
            
            let itemData = Items[type];
            if (!itemData || !itemData.buyPrice || itemData.buyPrice <= 0) return socket.emit('buyFail', '상점에서 살 수 없는 아이템입니다.');
            if (p.gold < itemData.buyPrice) return socket.emit('buyFail', '골드가 부족합니다!'); 
            
            p.gold -= itemData.buyPrice; 
            p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: type }); 
            socket.emit('buySuccess', p); 
        });

        socket.on('sellItem', (uid) => { 
            let p = State.players[socket.id]; if (!p || p.isDead) return; 
            let idxInv = p.inventory.findIndex(i => i.uid === uid); 
            if (idxInv === -1) return; 
            
            let item = p.inventory[idxInv]; 
            let itemData = Items[item.id];
            let sellAmount = itemData ? (itemData.sellPrice || 0) : 0;
            // 🏔️ 마리조아 : 판매가 10% 증가
            sellAmount = Math.round(sellAmount * (1 + (govShop(p, State).sellPct || 0)));
            
            
            p.inventory.splice(idxInv, 1); 
            p.equippedUids = p.equippedUids.filter(u => u !== uid); 
            p.gold += sellAmount; 
            recalcStats(p); 
            socket.emit('buySuccess', p); 
        });

        socket.on('acquireFromChest', (uid) => { 
            let p = State.players[socket.id]; if (!p || p.isDead) return; 
            for (let d of State.detectors) { 
                let idx = d.chest.findIndex(c => c.uid === uid); 
                if (idx !== -1) { 
                    let item = d.chest[idx]; 
                    if (item.id === 'rare_box' || item.id === 'mythic_box') { 
                        d.chest.splice(idx, 1); 
                        p.gold += (item.id === 'rare_box' ? 2000 : 10000); 
                        socket.emit('updateGold', p.gold); 
                    } else { 
                        if (p.inventory.length >= invMax(p, State)) return socket.emit('buyFail', '인벤토리가 가득 찼습니다!');
                        d.chest.splice(idx, 1); 
                        p.inventory.push(item); 
                    } 
                    socket.emit('buySuccess', p); 
                    io.emit('syncDetectors', State.detectors); 
                    return; 
                } 
            } 
        });

        socket.on('storeToTeam', (uid) => { 
            let p = State.players[socket.id]; if (!p || p.isDead) return; 
            let idx = p.inventory.findIndex(i => i.uid === uid); 
            if (idx === -1) return; 
            
            let item = p.inventory[idx]; 
            p.equippedUids = p.equippedUids.filter(u => u !== uid); 
            p.inventory.splice(idx, 1); 
            State.teamStorages[p.team].push(item); 
            recalcStats(p); 
            socket.emit('buySuccess', p); 
            io.emit('syncTeamStorage', State.teamStorages); 
        });

        socket.on('acquireFromTeam', (uid) => { 
            let p = State.players[socket.id]; if (!p || p.isDead) return; 
            let tStorage = State.teamStorages[p.team]; 
            let idx = tStorage.findIndex(i => i.uid === uid); 
            if (idx === -1) return; 
            if (p.inventory.length >= invMax(p, State)) return socket.emit('buyFail', '인벤토리가 가득 찼습니다!');
            
            let item = tStorage[idx]; 
            tStorage.splice(idx, 1); 
            p.inventory.push(item); 
            socket.emit('buySuccess', p); 
            io.emit('syncTeamStorage', State.teamStorages); 
        });

        socket.on('buyDetector', (spotX) => { 
            let p = State.players[socket.id]; if (!p || p.hasDetector || p.gold < 5000 || p.isDead) return; 
            if (!DETECTOR_SPOTS[p.team] || !DETECTOR_SPOTS[p.team].includes(spotX) || State.detectors.some(d => d.x === spotX)) return; 
            
            p.gold -= 5000; 
            p.hasDetector = true; 
            State.detectors.push({ id: 'd_' + socket.id, ownerId: socket.id, ownerName: p.nickname, team: p.team, x: spotX, y: 2000, nextMineTime: Date.now() + 3000, chest: [] }); 
            socket.emit('buySuccess', p); 
            io.emit('syncDetectors', State.detectors); 
        });

        socket.on('toggleEquip', (uid) => {
            let p = State.players[socket.id]; if (!p || p.isDead) return;
            let item = p.inventory.find(i => i.uid === uid); 
            if (!item) return;
            let itemData = Items[item.id];
            if (!itemData) return;

            if (itemData.type === 'box' || itemData.type === 'treasure') return socket.emit('buyFail', '장착할 수 없는 아이템입니다.');

            let isEquipped = p.equippedUids.includes(uid); 

            if (isEquipped) { 
                p.equippedUids = p.equippedUids.filter(u => u !== uid); 
            } else {
                if (itemData.isArtifact) {
                    let equippedArtsCount = p.equippedUids.filter(eUid => { let eItem = p.inventory.find(i => i.uid === eUid); return eItem && Items[eItem.id] && Items[eItem.id].isArtifact; }).length;
                    if (equippedArtsCount >= 3) return socket.emit('buyFail', '유물 장착 슬롯이 가득 찼습니다!');
                } else {
                    let equippedItemsCount = p.equippedUids.filter(eUid => { let eItem = p.inventory.find(i => i.uid === eUid); return eItem && Items[eItem.id] && !Items[eItem.id].isArtifact; }).length;
                    if (equippedItemsCount >= 10) return socket.emit('buyFail', '일반 아이템 장착 슬롯이 가득 찼습니다!');
                }
                if (itemData.isUnique) {
                    let alreadyEq = p.equippedUids.some(eUid => { let eItem = p.inventory.find(i => i.uid === eUid); return eItem && eItem.id === item.id; });
                    if (alreadyEq) return socket.emit('buyFail', '고유 능력을 가진 장비는 중복 장착할 수 없습니다.');
                }
                // 🎭 캐릭터 전용 장비 (예: 유명이경 역월 = 다부라 카라바 전용)
                if (itemData.onlyChar && p.characterType !== itemData.onlyChar) {
                    return socket.emit('buyFail', (itemData.onlyCharName || '특정 캐릭터') + ' 전용 장비입니다.');
                }
                // 🚫 함께 장착할 수 없는 장비 (예: 세계를 가르는 참격 ↔ 유명이경 역월)
                if (itemData.exclusiveWith && itemData.exclusiveWith.length) {
                    let clash = p.equippedUids.find(eUid => {
                        let eItem = p.inventory.find(i => i.uid === eUid);
                        return eItem && itemData.exclusiveWith.includes(eItem.id);
                    });
                    if (clash) {
                        let cItem = p.inventory.find(i => i.uid === clash);
                        let cName = (Items[cItem.id] && Items[cItem.id].displayName) ? Items[cItem.id].displayName : cItem.id;
                        return socket.emit('buyFail', `'${cName}' 과(와) 함께 장착할 수 없습니다.`);
                    }
                }
                p.equippedUids.push(uid);
            }
            recalcStats(p); 
            socket.emit('buySuccess', p);
        });

        socket.on('craftItem', (recipeId) => {
            let p = State.players[socket.id]; if (!p || p.isDead) return;
            let itemData = Items[recipeId]; if (!itemData || !itemData.recipe) return;

            let cost = itemData.recipe.cost;
            let reqIngs = itemData.recipe.ingredients;
            if (p.gold < cost) return socket.emit('buyFail', `합성 비용(${cost.toLocaleString()} G)이 부족합니다.`); 

            let foundUids = []; let missing = false; let tempInv = [...p.inventory]; 

            for (let ing of reqIngs) {
                let idx = tempInv.findIndex(i => i.id === ing);
                if (idx !== -1) { foundUids.push(tempInv[idx].uid); tempInv.splice(idx, 1); } 
                else { missing = true; break; }
            }

            if (!missing) {
                p.gold -= cost; 
                p.equippedUids = p.equippedUids.filter(u => !foundUids.includes(u)); 
                p.inventory = p.inventory.filter(i => !foundUids.includes(i.uid));
                p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: recipeId }); 
                recalcStats(p); 
                socket.emit('buySuccess', p);
            } else { socket.emit('buyFail', '내 인벤토리에 요구 재료가 모두 있어야 합니다.'); }
        });

        // 🛠️ 테스트 창고 무한 획득 로직 추가
        socket.on('acquireFromTest', (itemId) => {
            let p = State.players[socket.id]; if (!p || p.isDead) return;
            if (p.inventory.length >= invMax(p, State)) return socket.emit('buyFail', '인벤토리가 가득 찼습니다!');
            let itemData = Items[itemId];
            if (!itemData) return socket.emit('buyFail', '존재하지 않는 아이템입니다.');
            
            p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: itemId });
            recalcStats(p); 
            socket.emit('buySuccess', p);
        });
    }
};
