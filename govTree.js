// 파일명: govTree.js
// ============================================================================
// 🏛️ 세계정부 — 진영 판정 · 스킬 웹 트리 정의
//
//   서버와 클라이언트가 같은 값을 봐야 하므로 한 파일에 모아 둔다.
//   (Node 에서는 require, 브라우저에서는 window.GovTree 로 쓴다)
//
//   ── 넥서스 진영 ───────────────────────────────────────────────────────
//     팀에 해군 계열 캐릭터가 가장 많으면 그 팀 넥서스가 '세계정부' 가 된다.
//     수가 같으면 '먼저 들어온 유저' 의 계열을 따른다.
//     지금은 해군(세계정부)만 구현되어 있다.
//
//   ── 스킬 웹 ───────────────────────────────────────────────────────────
//     가운데 [세계정부] 를 열면 동서남북 4개 기관이 펼쳐진다.
//     그림처럼 육각형 노드를 선으로 이어 거미줄 모양을 이룬다.
// ============================================================================

(function (root, factory) {
    const mod = factory();
    if (typeof module === 'object' && module.exports) module.exports = mod;
    else root.GovTree = mod;
}(typeof self !== 'undefined' ? self : this, function () {

    /** 🏴 캐릭터 → 계열 */
    const FACTION = {
        BORSALINO: 'navy', KUZAN: 'navy', SAKAZUKI: 'navy',
        KUZAN_P: 'pirate', KID: 'pirate', MARCO: 'pirate', ENEL: 'pirate',
        KASHIMO: 'jujutsu', DABURA: 'jujutsu', DAIDO: 'jujutsu', KURUSU: 'jujutsu'
    };

    /**
     * 🏛️ 팀의 넥서스 진영을 정한다.
     * @param members [{ charType, joinOrder }] — joinOrder 가 작을수록 먼저 들어온 사람
     * @return 'wg' (세계정부) | 'none'
     */
    function decideGov(members) {
        if (!members || !members.length) return 'none';
        const count = {};
        members.forEach(m => {
            const f = FACTION[m.charType] || 'jujutsu';
            count[f] = (count[f] || 0) + 1;
        });

        let best = null, bestN = -1, tied = false;
        for (const f in count) {
            if (count[f] > bestN) { best = f; bestN = count[f]; tied = false; }
            else if (count[f] === bestN) tied = true;
        }

        // 동점이면 '먼저 들어온 유저' 의 계열을 따른다
        if (tied) {
            const first = members.slice().sort((a, b) => (a.joinOrder || 0) - (b.joinOrder || 0))[0];
            best = FACTION[first.charType] || 'jujutsu';
        }
        return (best === 'navy') ? 'wg' : 'none';
    }

    /**
     * 🕸️ 스킬 웹 노드
     *   x, y  : 웹 화면에서의 상대 좌표 (가운데가 0,0)
     *   cost  : 가격
     *   parent: 이 노드를 열려면 먼저 열어야 하는 노드
     */
    const NODES = {
        wg: {
            id: 'wg', name: '세계정부', cost: 0, x: 0, y: 0, parent: null,
            desc: '공격력 및 체력 10% 증가',
            effect: { atkPct: 0.10, hpPct: 0.10 }
        },
        rule: {
            id: 'rule', name: '최고 통치 및\n의사결정 기관', cost: 3000, x: 0, y: -1, parent: 'wg',
            desc: '아직 효과가 없습니다.', effect: null
        },
        army: {
            id: 'army', name: '군사 및\n치안 유지 기관', cost: 3000, x: 1, y: 0, parent: 'wg',
            desc: '아직 효과가 없습니다.', effect: null
        },
        law: {
            id: 'law', name: '사법 및\n형벌 집행 기관', cost: 3000, x: -1, y: 0, parent: 'wg',
            desc: '아직 효과가 없습니다.', effect: null
        },
        intel: {
            id: 'intel', name: '첩보 및\n정보 수집 기관', cost: 3000, x: 0, y: 1, parent: 'wg',
            desc: '아직 효과가 없습니다.', effect: null
        }
    };

    /** 열려 있는 노드로 계산한 팀 보너스 */
    function bonusOf(unlocked) {
        const b = { atkPct: 0, hpPct: 0 };
        if (!unlocked) return b;
        for (const id in NODES) {
            if (!unlocked[id]) continue;
            const e = NODES[id].effect;
            if (!e) continue;
            b.atkPct += (e.atkPct || 0);
            b.hpPct += (e.hpPct || 0);
        }
        return b;
    }

    /** 이 노드를 지금 열 수 있는가 */
    function canUnlock(unlocked, id) {
        const n = NODES[id];
        if (!n) return false;
        if (unlocked && unlocked[id]) return false;        // 이미 열림
        if (!n.parent) return true;                        // 뿌리 노드
        return !!(unlocked && unlocked[n.parent]);         // 부모가 열려 있어야 한다
    }

    return { FACTION, decideGov, NODES, bonusOf, canUnlock };
}));
