// 파일명: server/blackMarket.js
// ============================================================================
// 🕶️ 암매상 — 맵 중앙 맨 아래(할배새끼와 같은 x)
//
//   · 황금 3,000 G · 해루석 10,000 G · 스쿠나의 손가락 10,000 G
//     할배새끼 오크라 25,000 G · 박힌범 오크라 25,000 G
//   · 각 아이템은 30% 확률로 할인된다 (5% ~ 50%, 5% 단위)
//   · 할인율은 5분마다 다시 굴린다
// ============================================================================

const S = require('./state.js');
const State = S.State;

const BM_X = 16000;          // 할배새끼와 같은 x
const BM_Y = 2000;           // 지상
const ROLL_MS = 5 * 60 * 1000;   // 5분

/** 🕶️ 파는 물건 (원가) */
const STOCK = [
    { id: 'gold',         price: 3000  },
    { id: 'haeru',        price: 10000 },
    { id: 'sukuna_finger', price: 10000 },
    { id: 'halbae_okra',  price: 25000 },
    { id: 'hinbeom_okra', price: 25000 }
];

/** 🎲 할인율을 다시 굴린다 */
function rollDiscounts(now) {
    const d = {};
    STOCK.forEach(it => {
        // 30% 확률로 할인
        if (Math.random() < 0.30) {
            // 5% ~ 50% 를 5% 단위로
            d[it.id] = (1 + Math.floor(Math.random() * 10)) * 5;
        } else {
            d[it.id] = 0;
        }
    });
    State.blackMarket.discounts = d;
    State.blackMarket.nextRollAt = now + ROLL_MS;
    return d;
}

/** 🕶️ 매 프레임 : 5분마다 갱신 */
function process(now, io) {
    if (!State.blackMarket.nextRollAt || now >= State.blackMarket.nextRollAt) {
        rollDiscounts(now);
        io.emit('blackMarketSync', {
            x: BM_X, y: BM_Y,
            discounts: State.blackMarket.discounts,
            nextRollAt: State.blackMarket.nextRollAt
        });
    }
}

/** 💰 실제 가격 (할인 적용) */
function priceOf(itemId) {
    const it = STOCK.find(s2 => s2.id === itemId);
    if (!it) return null;
    const off = State.blackMarket.discounts[itemId] || 0;
    return Math.round(it.price * (1 - off / 100));
}

function isNear(p) {
    if (!p) return false;
    return Math.hypot(p.x - BM_X, p.y - BM_Y) < 260;
}

module.exports = { BM_X, BM_Y, ROLL_MS, STOCK, rollDiscounts, process, priceOf, isNear };
