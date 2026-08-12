// 파일명: ui/uiHud.js
// ============================================================================
// 🖥️ 상시 HUD
//
//   · showAlertMsg / showGoldenMsg : 화면 알림
//   · flashDamageVignette          : 피격 시 붉은 비네트
//   · updateCDUI                   : 스킬 쿨타임 오버레이 (DOM 캐시 사용)
//   · updateFruitCdUI              : 🍈 흔들흔들 / 어둠어둠 열매 쿨타임 배지
//   · setUnifiedBtn / hideUnifiedBtn : 상점·NPC 등 통합 액션 버튼
//   · updatePingUI                 : 📶 지연시간 표시
// ============================================================================

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
// 🍈 흔들흔들 / 어둠어둠 열매 쿨타임 배지
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
// 📶 핑(지연시간) 표시
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