// 파일명: ui/uiBlackMarket.js
// ============================================================================
// 🕶️ 암매상 상점 UI
//
//   · 5개 물건을 판다. 30% 확률로 할인이 붙는다 (5% ~ 50%)
//   · 할인된 물건은 옆에 빨간 글씨로 할인율을 강조한다
//   · 5분마다 할인율이 갱신되며 남은 시간을 함께 보여 준다
// ============================================================================

(function () {
    const STOCK = [
        { id: 'gold',          price: 3000,  name: '황금',            color: '#f1c40f' },
        { id: 'haeru',         price: 10000, name: '해루석',          color: '#4fd8d0' },
        { id: 'sukuna_finger', price: 10000, name: '스쿠나의 손가락',  color: '#e74c3c' },
        { id: 'halbae_okra',   price: 25000, name: '할배새끼 오크라',  color: '#e67e22' },
        { id: 'hinbeom_okra',  price: 25000, name: '박힌범 오크라',    color: '#9b59b6' }
    ];

    window.openBlackMarket = function () {
        const m = document.getElementById('blackMarketModal');
        if (m) { m.style.display = 'flex'; window.renderBlackMarketUI(); }
    };
    window.closeBlackMarket = function () {
        const m = document.getElementById('blackMarketModal');
        if (m) m.style.display = 'none';
    };

    window.renderBlackMarketUI = function () {
        const grid = document.getElementById('bmGrid');
        if (!grid) return;
        const bm = window.blackMarket || { discounts: {} };
        const gold = (window.myPlayer && window.myPlayer.gold) || 0;

        const gEl = document.getElementById('bmGold');
        if (gEl) gEl.textContent = gold.toLocaleString();

        grid.innerHTML = '';
        STOCK.forEach(it => {
            const off = bm.discounts[it.id] || 0;
            const price = Math.round(it.price * (1 - off / 100));
            const can = gold >= price;

            const box = document.createElement('div');
            box.className = 'shop-item-box';
            box.style.border = off > 0 ? '3px solid #e74c3c' : '3px solid #5d3a7a';

            // 💸 할인 표시 — 옆에 빨간 글씨로 강조
            const priceHtml = off > 0
                ? '<span style="text-decoration:line-through; color:#7f8c8d;">' + it.price.toLocaleString() + '</span> '
                  + '<span style="color:#ffd23c; font-weight:bold;">' + price.toLocaleString() + ' G</span>'
                  + '<span style="color:#ff4d4d; font-weight:bold; margin-left:6px;">-' + off + '%</span>'
                : '<span style="color:#f1c40f; font-weight:bold;">' + price.toLocaleString() + ' G</span>';

            box.innerHTML =
                '<div style="margin-bottom:8px;">'
              + '<h3 style="color:' + it.color + '; margin:0 0 5px 0;">' + it.name
              + (off > 0 ? ' <span style="color:#ff4d4d; font-size:13px;">SALE</span>' : '') + '</h3>'
              + '<p style="font-size:13px;">' + priceHtml + '</p></div>'
              + '<button class="btn-main" style="padding:8px; font-size:15px; width:100%; background:'
              + (can ? '#8e44ad' : '#7f8c8d') + '; margin-top:auto;" '
              + 'onclick="window.socket.emit(\'blackMarketBuy\', \'' + it.id + '\')">'
              + (can ? '구매' : '골드 부족') + '</button>';
            grid.appendChild(box);
        });
    };

    // ⏱️ 남은 시간 표시 (1초마다)
    setInterval(function () {
        const el = document.getElementById('bmTimer');
        if (!el || !window.blackMarket) return;
        const left = Math.max(0, (window.blackMarket.nextRollAt || 0) - Date.now());
        const mm = Math.floor(left / 60000);
        const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
        el.textContent = '갱신까지 ' + mm + ':' + ss;
        // 창이 열려 있으면 골드도 함께 갱신한다
        const m = document.getElementById('blackMarketModal');
        if (m && m.style.display === 'flex') {
            const gEl = document.getElementById('bmGold');
            if (gEl && window.myPlayer) gEl.textContent = (window.myPlayer.gold || 0).toLocaleString();
        }
    }, 1000);
})();
