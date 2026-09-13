// 파일명: ui/uiAccount.js
// ============================================================================
// 👤 계정 · 📖 설명서 화면
//
//   · 처음 온 사람에게 이름을 한 번만 묻는다
//   · 캐릭터 선택 화면에서 내 전적과 게임 설명을 볼 수 있다
// ============================================================================

(function () {
    const KEY = 'faceBattle.accountId';

    /** 이 브라우저의 계정 ID — 없으면 새로 만든다 */
    function myAccountId() {
        try {
            let id = localStorage.getItem(KEY);
            if (!id) {
                id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
                localStorage.setItem(KEY, id);
            }
            return id;
        } catch (e) {
            return 'a' + Math.random().toString(36).slice(2, 12);
        }
    }
    window.myAccountId = myAccountId;

    // ── 화면 만들기 ────────────────────────────────────────────
    function box(id, z) {
        let el = document.getElementById(id);
        if (el) return el;
        el = document.createElement('div');
        el.id = id;
        el.style.cssText = 'position:fixed; inset:0; z-index:' + z + '; display:none;'
            + 'background:rgba(6,9,16,0.93); align-items:center; justify-content:center; padding:16px;';
        document.body.appendChild(el);
        return el;
    }
    const panel = (inner, w) =>
        '<div style="background:#161b27; border:3px solid #3a86c8; border-radius:16px;'
        + 'width:' + (w || 520) + 'px; max-width:94vw; max-height:88vh; display:flex;'
        + 'flex-direction:column; overflow:hidden; box-shadow:0 14px 40px rgba(0,0,0,0.7);">'
        + inner + '</div>';

    // ══════════════════════════════════════════════════════════
    // 🆕 이름 정하기 (처음 한 번)
    // ══════════════════════════════════════════════════════════
    window.askNickname = function () {
        const el = box('nickSetupModal', 1400000);
        el.innerHTML = panel(
            '<div style="padding:22px 20px; text-align:center;">'
          + '<div style="font-size:26px; font-weight:bold; color:#8fd4ff; margin-bottom:6px;">환영합니다</div>'
          + '<div style="font-size:13px; color:#8fa3b8; margin-bottom:18px; line-height:1.7;">'
          + '앞으로 쓸 이름을 정해 주세요.<br>한 번 정하면 바꿀 수 없습니다.</div>'
          + '<input id="nickSetupInput" type="text" maxlength="8" placeholder="이름 (최대 8자)" autocomplete="off"'
          + ' style="width:100%; box-sizing:border-box; padding:13px; font-size:18px; text-align:center;'
          + ' border-radius:10px; border:2px solid #3a86c8; background:#0e1420; color:#fff; margin-bottom:8px;">'
          + '<div id="nickSetupMsg" style="font-size:12px; color:#ff9b9b; min-height:18px; margin-bottom:10px;"></div>'
          + '<button id="nickSetupBtn" style="width:100%; padding:14px; font-size:18px; font-weight:bold;'
          + ' border:none; border-radius:10px; background:#2f86d8; color:#fff;">이 이름으로 시작</button>'
          + '</div>', 420);
        el.style.display = 'flex';

        const go = () => {
            const v = (document.getElementById('nickSetupInput').value || '').trim();
            const msg = document.getElementById('nickSetupMsg');
            if (!v) { msg.textContent = '이름을 입력해 주세요.'; return; }
            msg.style.color = '#8fa3b8';
            msg.textContent = '만드는 중…';
            window.socket.emit('accountCreate', { id: myAccountId(), nickname: v });
        };
        document.getElementById('nickSetupBtn').addEventListener('click', go);
        document.getElementById('nickSetupInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') go();
        });
        setTimeout(() => { try { document.getElementById('nickSetupInput').focus(); } catch (e) { } }, 120);
    };
    window.closeNickname = function () {
        const el = document.getElementById('nickSetupModal');
        if (el) el.style.display = 'none';
    };

    // ══════════════════════════════════════════════════════════
    // 👤 계정 정보
    // ══════════════════════════════════════════════════════════
    window.openAccount = function () {
        const a = window.myAccount;
        const el = box('accountModal', 1300000);
        if (!a) {
            el.innerHTML = panel(
                '<div style="padding:26px; text-align:center; color:#8fa3b8; font-size:14px; line-height:1.8;">'
              + '계정을 불러오지 못했습니다.<br>잠시 뒤 다시 시도해 주세요.'
              + '<div style="margin-top:16px;"><button onclick="window.closeAccount()"'
              + ' style="padding:11px 26px; border:none; border-radius:9px; background:#7f8c8d; color:#fff; font-weight:bold;">닫기</button></div>'
              + '</div>', 400);
            el.style.display = 'flex';
            return;
        }
        const need = 500 + ((a.level || 1) - 1) * 250;
        const pct = Math.max(0, Math.min(100, Math.round(((a.xp || 0) / need) * 100)));
        const games = a.play_count || 0;
        const wr = games ? Math.round(((a.wins || 0) / games) * 100) : 0;
        const kd = (a.deaths || 0) ? ((a.kills || 0) / a.deaths).toFixed(2) : (a.kills || 0).toFixed(2);

        const row = (k, v, c) =>
            '<div style="display:flex; justify-content:space-between; padding:11px 2px; border-bottom:1px solid #232a3a;">'
          + '<span style="color:#8fa3b8; font-size:14px;">' + k + '</span>'
          + '<span style="color:' + (c || '#e8eef6') + '; font-size:15px; font-weight:bold;">' + v + '</span></div>';

        el.innerHTML = panel(
            '<div style="flex:0 0 auto; padding:16px 18px; border-bottom:2px solid #232a3a; display:flex; align-items:center; justify-content:space-between;">'
          + '<h2 style="margin:0; font-size:21px; color:#fff;">👤 내 계정</h2>'
          + '<button onclick="window.closeAccount()" style="background:#7f8c8d; border:none; color:#fff; font-size:19px; font-weight:bold; width:36px; height:36px; border-radius:9px;">✕</button>'
          + '</div>'
          + '<div style="flex:1 1 auto; overflow-y:auto; padding:18px; -webkit-overflow-scrolling:touch;">'
          + '<div style="text-align:center; margin-bottom:18px;">'
          + '<div style="font-size:28px; font-weight:bold; color:#ffd97a;">' + (a.nickname || '이름없음') + '</div>'
          + '<div style="font-size:15px; color:#8fd4ff; margin-top:4px;">Lv. ' + (a.level || 1) + '</div>'
          + '<div style="margin:12px 0 4px 0; height:11px; background:#0e1420; border-radius:6px; overflow:hidden;">'
          + '<div style="width:' + pct + '%; height:100%; background:linear-gradient(90deg,#3a86c8,#8fd4ff);"></div></div>'
          + '<div style="font-size:11px; color:#6d8199;">' + (a.xp || 0) + ' / ' + need + '</div>'
          + '</div>'
          + row('총 판 수', games + ' 판')
          + row('승 / 패', (a.wins || 0) + ' 승 ' + (a.losses || 0) + ' 패')
          + row('승률', wr + ' %', wr >= 50 ? '#7fe08a' : '#ff9b9b')
          + row('처치 / 사망', (a.kills || 0) + ' / ' + (a.deaths || 0))
          + row('K/D', kd, '#ffd97a')
          + '<div style="margin-top:16px; font-size:11px; color:#5f7185; line-height:1.7; text-align:center;">'
          + '계정은 이 브라우저에 저장됩니다.<br>다른 기기로 접속하면 새 계정이 됩니다.</div>'
          + '</div>');
        el.style.display = 'flex';
    };
    window.closeAccount = function () {
        const el = document.getElementById('accountModal');
        if (el) el.style.display = 'none';
    };
})();
