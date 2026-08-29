// 파일명: ui/uiCharSelect.js
// ============================================================================
// 📖 캐릭터 선택 화면 — 카드 목록 + 상세 정보
//
//   · 카드를 누르면 선택된다 (기존 라디오 버튼을 대신한다)
//   · 카드 오른쪽 위 ⓘ 를 누르면 스탯과 스킬 설명이 뜬다
//   · 기존 코드가 document.querySelector('input[name=charSelect]:checked')
//     로 값을 읽으므로, 숨겨진 라디오를 그대로 유지해 호환을 지킨다
// ============================================================================

(function () {
    // 캐릭터별 표시 정보 (색 · 한 줄 소개 · 스킬 설명)
    const CHAR_INFO = {
        BORSALINO: {
            name: '볼사리노', color: '#f1c40f', tag: '빛의 속도로 싸우는 대장',
            skills: [
                ['광선', '손끝에서 빛의 광선을 쏘아 관통시킨다.'],
                ['야타의 거울', '빛이 되어 지정한 경로를 따라 순간이동하며 지나간 길의 적을 벤다.'],
                ['팔척경곡옥', '거대한 빛 구슬을 떨어뜨려 폭발시킨다.']
            ]
        },
        KUZAN: {
            name: '쿠잔(해군)', color: '#3498db', tag: '얼려붙이는 얼음의 대장',
            skills: [
                ['퍼잔트백', '얼음 창을 던져 꿰뚫는다.'],
                ['파르티잔', '거대한 얼음 창을 만들어 내리꽂는다.'],
                ['아이스 에이지', '넓은 범위를 통째로 얼려버린다.']
            ]
        },
        KUZAN_P: {
            name: '쿠잔(해적)', color: '#4dd8ff', tag: '얼음을 다루는 전 해군 대장',
            skills: [
                ['아이스 볼', '이동키 방향으로 얼음 구슬을 빠르게 던진다. 관통하지 않으며, 맞은 자리에 냉기가 터져 200 피해와 함께 주변을 2초간 얼린다.'],
                ['아이스 글러브', '6초간 주먹에 얼음 장갑을 두른다. 이동속도 +35%, 평타가 맞을 때마다 냉기가 터져 50 피해와 0.3초 동결을 추가로 준다. 지나간 자리에 서리가 남는다.'],
                ['아이스 타임', '0.5초간 몸이 얼음으로 뒤덮인 뒤 이동키 방향으로 곧게 돌진한다. 맞은 대상과 그 주변이 5초간 얼며 400 피해를 입는다.']
            ],
            note: '돌진은 방향을 바꿀 수 없고, 처음 맞은 대상에서 멈춘다. 가로 발판은 통과한다.'
        },
        SAKAZUKI: {
            name: '사카즈키', color: '#e74c3c', tag: '모든 것을 태우는 마그마',
            skills: [
                ['명구', '마그마 주먹을 날려 화상을 입힌다.'],
                ['대분화', '마그마 주먹으로 지면을 크게 터뜨린다.'],
                ['유성 화산', '하늘에서 마그마 유성을 쏟아붓는다.']
            ]
        },
        ENEL: {
            name: '에넬', color: '#00bfff', tag: '번개를 다루는 신',
            skills: [
                ['엘 토르', '거대한 번개 기둥을 떨어뜨린다.'],
                ['만뢰', '주변에 번개를 흩뿌려 광범위하게 감전시킨다.'],
                ['뇌영', '적을 지면으로 끌어내려 벼락을 꽂는다.']
            ]
        },
        KASHIMO: {
            name: '카시모 하지메', color: '#a855f7', tag: '전하를 쌓아 폭발시키는 격투가',
            skills: [
                ['전자파', '전하를 실은 파동을 쏜다.'],
                ['음파', '쌓인 전하를 음파로 터뜨린다.'],
                ['환수 호박', '모습을 바꿔 강화된 전용 기술을 쓴다.']
            ]
        },
        DABURA: {
            name: '다부라 카라바', color: '#cbd5e1', tag: '빛과 어둠을 함께 쓰는 이단아',
            skills: [
                ['빛', '위로 솟구친 뒤 아래로 2초간 연속 폭발한다.'],
                ['어둠', '어둠 구체로 3초간 빨아들인 뒤 크게 터뜨린다.'],
                ['아광속 발차기', '2초 응축 후 5초간 활공하며, 적중 시 대폭발한다.']
            ]
        },
        DAIDO: {
            name: '다이도 하가네', color: '#9fd8ff', tag: '검 하나로 몰아치는 검사',
            skills: [
                ['무자비', '1.5초간 제자리에서 사방으로 난무한다. (0.1초마다 20)'],
                ['질풍참', '조이스틱 방향으로 1.2초간 돌진하며 적을 끌고 간다. (0.1초마다 30 · 마무리 50 + 기절 1.5초)'],
                ['일섬', '0.5초 발도 후 전방을 크게 베어 300 피해와 출혈을 남긴다.']
            ],
            passive: ['3연타 마무리', '평타 3번째에 전방위 베기가 나간다. (도좌마 이상 장착 시 2번째)']
        },
        KURUSU: {
            name: '쿠루스 하나', color: '#ffe27a', tag: '신성력을 다루는 성직자',
            skills: [
                ['집회', '넓은 반경 안의 대상 수만큼 신성력을 흡수한다.'],
                ['축복', '아군과 자신을 5초간 초당 200 회복시킨다.<br><span style="color:#ffd23c">신성력 가득 시 [신성한 축복] — 여분의 목숨 부여</span>'],
                ['야곱의 사다리', '2초 마방진 후 3초간 빛 기둥. 0.2초마다 70 피해 + 쿨타임 1초 증가.<br><span style="color:#ffd23c">신성력 가득 시 [최대 출력] — 0.2초당 100 · 범위 확대</span>']
            ],
            passive: ['신성력', '10초마다 1씩 차오르며 최대 50. 가득 차면 2·3번이 강화되고, 쓰면 0으로 돌아간다.'],
            note: '점프가 없다. 점프 버튼을 누르고 있으면 천천히 떠오르고, 떼면 천천히 내려온다.'
        },
        MARCO: {
            name: '마르코', color: '#5fe8e0', tag: '불사조의 푸른 불꽃',
            skills: [
                ['봉황인', '바라보는 방향으로 큰 불꽃 덩어리를 날린다. 근처 적을 강하게 끌고 가며 접촉 250, 1.5초 뒤 폭발 150.'],
                ['봉리력', '1초 응축 후 큰 반경에 3초 불길. 적에겐 0.3초마다 30 피해, 아군에겐 0.3초마다 30 회복.'],
                ['불사 엉겅퀴', '조이스틱 방향에 2초간 불꽃 보호막. 모든 공격을 막고 적은 통과할 수 없다. 2초 뒤 회전 폭발 300.']
            ],
            passive: ['재생', '받은 피해가 게이지에 쌓여 2500이 되면 3초간 불꽃에 뒤덮이며 0.5초마다 100씩 회복한다.']
        },
        KID: {
            name: '유스타스 키드', color: '#d63cf0', tag: '자기력으로 고철을 부리는 파괴자',
            skills: [
                ['어사인', '주변 적에게 자기력을 부여해 고철을 붙인다. 3초간 0.5초마다 20 피해를 주며 점점 느려지고, 3초 뒤 1초간 완전히 고정된 후 폭발해 200 피해.'],
                ['댐드 펑크', '3초간 고철 레이저포를 차징한 뒤 4초간 발사한다. 0.1초마다 30 피해. 발사 중 이동키로 조준을 천천히 돌릴 수 있다.'],
                ['펑크 로튼', '5초간 고철을 쌓아 골렘이 된다. 20초간 평타 피해 1.5배·범위 대폭 증가, 점프 높이와 이동속도 1.5배.']
            ],
            note: '차징·발사·변신 중에는 공중에서도 완전히 고정된다.'
        }
    };

    // 🏷️ 진영별 분류 — 화면에 이 순서·묶음대로 보여 준다
    const CATEGORIES = [
        { name: '해군', color: '#5dade2', ids: ['BORSALINO', 'KUZAN', 'SAKAZUKI'] },
        { name: '해적', color: '#e67e22', ids: ['KUZAN_P', 'KID', 'MARCO', 'ENEL'] },
        { name: '주술', color: '#a569bd', ids: ['KASHIMO', 'DABURA', 'DAIDO', 'KURUSU'] }
    ];
    const ORDER = CATEGORIES.reduce((a, c) => a.concat(c.ids), []);
    let picked = ORDER[0];

    /** 선택 상태를 화면에 반영한다 */
    function refresh() {
        ORDER.forEach(id => {
            const card = document.getElementById('cc_' + id);
            if (!card) return;
            const on = (id === picked);
            const c = CHAR_INFO[id].color;
            card.style.borderColor = on ? c : '#39424f';
            card.style.background = on ? 'rgba(52,152,219,0.18)' : '#1a1e29';
            card.style.boxShadow = on ? ('0 0 14px ' + c + '66') : 'none';
            const r = document.getElementById('cr_' + id);
            if (r) r.checked = on;
        });
    }

    window.pickChar = function (id) { picked = id; refresh(); };

    /** 📖 상세 정보 창을 연다 */
    window.openCharInfo = function (id) {
        const info = CHAR_INFO[id]; if (!info) return;
        const G = window.GameData;
        const c = (G && G.Characters) ? G.Characters[id] : null;

        document.getElementById('ciName').textContent = info.name;
        document.getElementById('ciName').style.color = info.color;

        let h = '<div style="color:' + info.color + '; font-size:15px; font-weight:bold; margin-bottom:12px;">' + info.tag + '</div>';

        // ── 스탯 ────────────────────────────────────────────
        if (c) {
            const spd = Math.round((c.speedMult || 1) * 100);
            h += '<div style="display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:14px;">'
               + statBox('체력', c.hp, '#2ecc71')
               + statBox('공격력', c.baseDamage, '#e74c3c')
               + statBox('공격 속도', (c.attackCooldown || 0) + 'ms', '#f1c40f')
               + statBox('이동 속도', spd + '%', '#3498db')
               + '</div>';
        }

        // ── 고유 패시브 ─────────────────────────────────────
        if (info.passive) {
            h += '<div style="background:#12151c; border-left:4px solid ' + info.color + '; border-radius:8px; padding:10px 12px; margin-bottom:12px;">'
               + '<div style="color:' + info.color + '; font-weight:bold; font-size:15px; margin-bottom:4px;">🌟 ' + info.passive[0] + '</div>'
               + '<div style="color:#bdc3c7; font-size:13px; line-height:1.5;">' + info.passive[1] + '</div></div>';
        }

        // ── 스킬 ────────────────────────────────────────────
        const cds = [];
        if (c && c.skillIds && G && G.Skills) {
            c.skillIds.forEach(sid => {
                const sk = G.Skills[sid];
                cds.push(sk && sk.cd ? (sk.cd / 1000) + '초' : '-');
            });
        }
        info.skills.forEach((sk, i) => {
            h += '<div style="background:#232838; border-radius:8px; padding:10px 12px; margin-bottom:8px;">'
               + '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">'
               + '<span style="color:#fff; font-weight:bold; font-size:15px;">' + (i + 1) + '. ' + sk[0] + '</span>'
               + '<span style="color:#8fa3b8; font-size:12px;">쿨타임 ' + (cds[i] || '-') + '</span></div>'
               + '<div style="color:#bdc3c7; font-size:13px; line-height:1.5;">' + sk[1] + '</div></div>';
        });

        if (info.note) {
            h += '<div style="color:#ffd23c; font-size:13px; margin-top:10px; line-height:1.5;">💡 ' + info.note + '</div>';
        }

        document.getElementById('ciBody').innerHTML = h;
        const pick = document.getElementById('ciPick');
        pick.style.background = info.color;
        pick.style.color = (id === 'DABURA' || id === 'KURUSU' || id === 'MARCO' || id === 'DAIDO') ? '#101520' : '#fff';
        pick.onclick = function () { window.pickChar(id); window.closeCharInfo(); };
        document.getElementById('charInfoModal').style.display = 'flex';
    };

    window.closeCharInfo = function () {
        const m = document.getElementById('charInfoModal');
        if (m) m.style.display = 'none';
    };

    function statBox(label, val, col) {
        return '<div style="background:#12151c; border-radius:8px; padding:8px 10px;">'
             + '<div style="color:#8fa3b8; font-size:11px;">' + label + '</div>'
             + '<div style="color:' + col + '; font-size:18px; font-weight:bold;">' + val + '</div></div>';
    }

    /** 카드 목록을 만든다 — 진영(해군 · 해적 · 주술)별로 묶어 보여 준다 */
    function build() {
        const grid = document.getElementById('charSelectGrid');
        if (!grid) return;
        grid.innerHTML = '';
        // 세로로 쌓되, 각 진영 안에서는 카드가 가로로 흐른다
        grid.style.flexDirection = 'column';
        grid.style.gap = '6px';

        CATEGORIES.forEach(cat => {
            // ── 진영 이름표 ────────────────────────────────
            const head = document.createElement('div');
            head.style.cssText = 'display:flex; align-items:center; gap:7px; width:100%; margin-top:2px;';
            head.innerHTML =
                '<span style="color:' + cat.color + '; font-size:12px; font-weight:bold; letter-spacing:1px;">'
              + cat.name + '</span>'
              + '<span style="flex:1; height:1px; background:' + cat.color + '55;"></span>';
            grid.appendChild(head);

            // ── 그 진영의 카드들 ───────────────────────────
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; justify-content:center; width:100%;';
            cat.ids.forEach(id => {
                const info = CHAR_INFO[id];
                if (!info) return;
                const wrap = document.createElement('div');
                wrap.id = 'cc_' + id;
                wrap.style.cssText = 'position:relative; background:#1a1e29; border:2px solid #39424f; border-radius:10px;'
                                   + 'padding:6px 8px; width:152px; cursor:pointer; transition:0.15s; touch-action:manipulation;';
                wrap.innerHTML =
                    '<input type="radio" name="charSelect" id="cr_' + id + '" value="' + id + '" style="display:none;">'
                  + '<div style="color:' + info.color + '; font-size:12.5px; font-weight:bold; margin-bottom:1px; padding-right:20px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + info.name + '</div>'
                  + '<div style="color:#8fa3b8; font-size:9px; line-height:1.25; height:22px; overflow:hidden;">' + info.tag + '</div>'
                  + '<div style="position:absolute; top:4px; right:4px; width:18px; height:18px; border-radius:50%;'
                  + 'background:#2c3e50; color:#dfe6ec; font-size:11px; font-weight:bold; line-height:18px; text-align:center;">i</div>';
                wrap.addEventListener('click', function (e) {
                    const r = wrap.getBoundingClientRect();
                    if (e.clientX > r.right - 27 && e.clientY < r.top + 27) window.openCharInfo(id);
                    else window.pickChar(id);
                });
                row.appendChild(wrap);
            });
            grid.appendChild(row);
        });
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
})();
