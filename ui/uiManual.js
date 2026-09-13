// 파일명: ui/uiManual.js
// ============================================================================
// 📖 설명서
//
//   설명서 → 항목 고르기 → 구체적인 설명
// ============================================================================

(function () {
    const C = { head: '#8fd4ff', sub: '#8fa3b8', key: '#ffd97a', ok: '#7fe08a', bad: '#ff9b9b' };

    /** 표 한 줄 */
    const row = (k, v, c) =>
        '<div style="display:flex; justify-content:space-between; gap:12px; padding:9px 2px; border-bottom:1px solid #232a3a;">'
      + '<span style="color:' + C.sub + '; font-size:13px; flex:1 1 auto;">' + k + '</span>'
      + '<span style="color:' + (c || '#e8eef6') + '; font-size:13px; font-weight:bold; flex:0 0 auto; text-align:right;">' + v + '</span></div>';
    /** 소제목 */
    const h = (t) => '<div style="color:' + C.head + '; font-size:15px; font-weight:bold; margin:16px 0 6px 0;">' + t + '</div>';
    /** 본문 */
    const p = (t) => '<div style="color:#c3cfdd; font-size:13px; line-height:1.85; margin-bottom:8px;">' + t + '</div>';

    // ── 📚 설명 내용 ───────────────────────────────────────────
    const TOPICS = [
        {
            id: 'rule', icon: '⚔️', name: '게임 규칙',
            desc: '승리 조건과 기본 흐름',
            body: () =>
                p('두 팀으로 나뉘어 <b>상대 넥서스를 먼저 부수는 팀이 이깁니다.</b>')
              + h('기본 흐름')
              + p('몬스터를 잡고 유물을 모아 골드를 법니다. 골드로 아이템을 사서 강해진 뒤 상대 진영으로 넘어가 넥서스를 공격합니다.')
              + h('주요 수치')
              + row('넥서스 체력', '20,000')
              + row('부활 시간', '15초')
              + row('임펠 다운 적용 시', '30초', C.bad)
              + row('최대 레벨', '50')
              + h('진영')
              + p('해군 · 해적 · 주술 세 계열이 있고, 팀에 모인 캐릭터에 따라 넥서스가 <b>세계정부</b> 등으로 바뀌며 스킬 웹이 열립니다.')
        },
        {
            id: 'mob', icon: '👹', name: '몬스터 생성 주기',
            desc: '보스와 몬스터가 나타나는 때',
            body: () =>
                h('일반')
              + row('오크라', '상시 · 처치 후 재생성')
              + row('하수인', '박힌범이 소환')
              + h('보스')
              + row('몬스터(중앙)', '30초 후 부활')
              + row('박힌범', '60초 후 부활')
              + row('검은수염', '90초 후 부활')
              + row('버제스', '검은수염과 함께')
              + row('스쿠나', '특수 조건')
              + h('세계정부 유닛')
              + row('파시피스타', '2분 30초마다', C.key)
              + row('칠무해 부활', '4분')
              + row('버스터 콜 쿨타임', '9분')
              + row('어비스 쿨타임', '150초 (팀 공용)')
              + h('알아 둘 것')
              + p('보스는 처치한 팀에 큰 골드와 경험치를 줍니다. 부활 시각을 재 두면 상대보다 먼저 잡을 수 있습니다.')
        },
        {
            id: 'drop', icon: '🎁', name: '아이템 획득 확률',
            desc: '상자에서 나오는 것들',
            body: () =>
                h('유물 상자')
              + row('일반 (자담 · 펩시)', '55 %')
              + row('희귀 상자', '12 %', '#6fb7ff')
              + row('황금', '12 %', C.key)
              + row('해군 코트', '6 %', '#c08bff')
              + row('해루석', '6 %', '#2fd8c8')
              + row('열매 6종', '각 1.5 %', C.bad)
              + h('합성')
              + p('같은 재료를 모으면 더 강한 물건이 됩니다. 예를 들어 <b>정의의 코트</b> 는 해군 코트 + 황금 5 + 해루석 3 으로 만듭니다.')
              + h('알아 둘 것')
              + p('열매는 전부 합쳐도 9 % 라 드뭅니다. 대신 나오면 판을 뒤집을 수 있습니다.')
        },
        {
            id: 'detector', icon: '⛏️', name: '유물 탐지기',
            desc: '탐지 주기와 나오는 것',
            body: () =>
                h('주기')
              + row('기본 탐지 시간', '1분')
              + row('레벨리 해금 시', '50초', C.ok)
              + row('상자 최대 보관', '가득 차면 멈춤')
              + h('놓인 곳')
              + p('맵 양쪽 바깥에 세 대씩 있습니다. 상대 진영 쪽 탐지기도 쓸 수 있지만 위험합니다.')
              + h('나오는 것')
              + p('위의 <b>아이템 획득 확률</b> 과 같습니다. 탐지기를 자주 비우는 쪽이 물자에서 앞섭니다.')
        },
        {
            id: 'physics', icon: '🏃', name: '물리 판정',
            desc: '이동 · 점프 · 충돌',
            body: () =>
                h('이동')
              + row('중력', '아래로 계속 당김')
              + row('2단 점프', '가능')
              + row('발판 통과', '아래에서 위로 통과')
              + h('충돌')
              + p('세로 벽은 막히고, 가로 발판은 <b>위에서 내려올 때만</b> 딛습니다. 아래에서 뛰어오르면 그대로 통과합니다.')
              + h('넉백')
              + p('공격을 맞으면 밀려납니다. 절벽 근처에서는 밀려 떨어질 수 있으니 조심하세요.')
              + h('보호막')
              + p('보호막이 남아 있으면 <b>모든 피해를 보호막이 먼저 받습니다.</b> 포탑 탄환이나 대포알도 마찬가지입니다.')
        },
        {
            id: 'combat', icon: '🗡️', name: '전투 · 상태이상',
            desc: '피해 계산과 특수 효과',
            body: () =>
                h('상태이상')
              + row('화상', '시간당 피해', C.bad)
              + row('동결', '움직임 봉인', '#6fb7ff')
              + row('넉백', '뒤로 밀림')
              + h('아이템 효과')
              + row('아카이누 코트', '화상 +2초')
              + row('아오키지 코트', '동결 +1초')
              + row('키자루 코트', '볼사리노 쿨 −3초')
              + h('처치 보상')
              + row('골드', '800')
              + row('경험치', '상대 레벨 × 10')
              + h('세계정부 효과')
              + p('천룡인을 열면 골드·경험치가 <b>5 % 늘어납니다.</b> 에니에스 로비와 사법의 탑은 처치한 상대의 경험치·골드를 10 % 빼앗습니다.')
        },
        {
            id: 'gov', icon: '🏛️', name: '세계정부 스킬 웹',
            desc: '노드 45개와 해금 구조',
            body: () =>
                h('여는 법')
              + p('팀에 해군 계열이 많으면 넥서스가 <b>세계정부</b> 가 됩니다. 넥서스 근처에서 버튼을 눌러 스킬 웹을 엽니다.')
              + h('네 갈래')
              + row('북 · 최고 통치', '마리조아 · 천룡인 · 임')
              + row('동 · 군사', '해군본부 · 파시피스타 · 버스터 콜')
              + row('서 · 사법', '임펠 다운 · 정의의 문')
              + row('남 · 첩보', 'CP9 · CP0 (미니맵 공개)')
              + h('눈여겨볼 노드')
              + row('구 마린 포드', '회복 돔 100/초', C.ok)
              + row('뉴 마린 포드', '회복 돔 200/초', C.ok)
              + row('판게아 성', '인벤토리 +10')
              + row('마리조아', '판매가 +10 %')
              + row('정의의 문', '5초 후 귀환')
              + row('어비스', '좌표 순간이동')
              + h('알아 둘 것')
              + p('노드를 누르면 <b>필요한 노드</b> 가 표시됩니다. 선이 그려지지 않은 조건도 여기서 확인할 수 있습니다.')
        }
    ];

    function box() {
        let el = document.getElementById('manualModal');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'manualModal';
        el.style.cssText = 'position:fixed; inset:0; z-index:1300000; display:none;'
            + 'background:rgba(6,9,16,0.93); align-items:center; justify-content:center; padding:16px;';
        document.body.appendChild(el);
        return el;
    }
    const shell = (title, inner, back) =>
        '<div style="background:#161b27; border:3px solid #3a86c8; border-radius:16px; width:560px;'
      + ' max-width:94vw; max-height:88vh; display:flex; flex-direction:column; overflow:hidden;'
      + ' box-shadow:0 14px 40px rgba(0,0,0,0.7);">'
      + '<div style="flex:0 0 auto; padding:15px 18px; border-bottom:2px solid #232a3a; display:flex; align-items:center; gap:10px;">'
      + (back ? '<button onclick="window.openManual()" style="background:#2a3143; border:none; color:#cfe0ff; font-size:17px; width:34px; height:34px; border-radius:9px;">‹</button>' : '')
      + '<h2 style="margin:0; flex:1 1 auto; font-size:20px; color:#fff;">' + title + '</h2>'
      + '<button onclick="window.closeManual()" style="background:#7f8c8d; border:none; color:#fff; font-size:19px; font-weight:bold; width:36px; height:36px; border-radius:9px;">✕</button>'
      + '</div>'
      + '<div style="flex:1 1 auto; overflow-y:auto; padding:16px 18px; -webkit-overflow-scrolling:touch;">' + inner + '</div>'
      + '</div>';

    /** 📖 항목 고르기 */
    window.openManual = function () {
        const el = box();
        const list = TOPICS.map(t =>
            '<button onclick="window.openManualTopic(\'' + t.id + '\')"'
          + ' style="width:100%; text-align:left; margin-bottom:9px; padding:14px 15px; border:2px solid #2a3143;'
          + ' border-radius:12px; background:#1b2130; color:#fff; display:flex; align-items:center; gap:13px;">'
          + '<span style="font-size:24px; flex:0 0 auto;">' + t.icon + '</span>'
          + '<span style="flex:1 1 auto;">'
          + '<span style="display:block; font-size:16px; font-weight:bold;">' + t.name + '</span>'
          + '<span style="display:block; font-size:12px; color:' + C.sub + '; margin-top:2px;">' + t.desc + '</span>'
          + '</span><span style="color:#5f7185; font-size:19px;">›</span></button>'
        ).join('');
        el.innerHTML = shell('📖 설명서', list, false);
        el.style.display = 'flex';
    };

    /** 📄 구체적인 설명 */
    window.openManualTopic = function (id) {
        const t = TOPICS.find(x => x.id === id);
        if (!t) return;
        const el = box();
        el.innerHTML = shell(t.icon + ' ' + t.name, t.body(), true);
        el.style.display = 'flex';
        el.querySelector('div > div:last-child').scrollTop = 0;
    };

    window.closeManual = function () {
        const el = document.getElementById('manualModal');
        if (el) el.style.display = 'none';
    };
})();
