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
     *   x, y    : 웹 화면 좌표 (가운데 세계정부가 0,0)
     *   cost    : 가격
     *   parents : 이 노드를 열려면 '전부' 열려 있어야 하는 노드들
     *             (예: 전군총수는 해군본부 + SSG 를 모두 열어야 한다)
     *
     *   ⚠️ 지금은 [세계정부] 만 효과가 있다. 나머지는 나중에 채운다.
     */
    const NODES = {
        // ── 가운데 ──────────────────────────────────────────────
        wg: { id: 'wg', name: '세계정부', cost: 0, x: 0, y: 0, parents: [],
              desc: '공격력 및 체력 10% 증가', effect: { atkPct: 0.10, hpPct: 0.10 } },

        // ── 🏛️ 북 : 최고 통치 및 의사결정 기관 ──────────────────
        rule:    { id: 'rule',    name: '최고 통치 및\n의사결정 기관', cost: 3000,  x: 0,     y: -1.75, parents: ['wg'] },
        reverie: { id: 'reverie', name: '레벌리',        cost: 5000,  x: -1.15, y: -2.45, parents: ['rule'] },
        celest:  { id: 'celest',  name: '천룡인',        cost: 5000,  x: 1.0,   y: -2.15, parents: ['rule'] },
        imu:     { id: 'imu',     name: '임',            cost: 15000, x: -0.35, y: -3.35, parents: ['reverie'] },
        gorosei: { id: 'gorosei', name: '오로성',        cost: 9000,  x: 0.62,  y: -3.2,  parents: ['imu'] },
        knights: { id: 'knights', name: '신의 기사단',    cost: 9000,  x: 1.3,   y: -2.8,  parents: ['gorosei', 'celest'] },

        // ── ⚓ 동 : 군사 및 치안 유지 기관 ──────────────────────
        army:    { id: 'army',    name: '군사 및\n치안 유지 기관', cost: 3000,  x: 1.7,  y: -0.15, parents: ['wg'] },
        branch:  { id: 'branch',  name: '해군지부',      cost: 5000,  x: 2.5,  y: -0.85, parents: ['army'] },
        hq:      { id: 'hq',      name: '해군본부',      cost: 8000,  x: 3.4,  y: -1.25, parents: ['branch'] },
        ssg:     { id: 'ssg',     name: 'SSG',           cost: 5000,  x: 2.95, y: 0.05,  parents: ['army'] },
        warlord: { id: 'warlord', name: '왕하칠무해',    cost: 5000,  x: 2.7,  y: 0.95,  parents: ['army'] },
        pacif:   { id: 'pacif',   name: '파시피스타',    cost: 7000,  x: 3.8,  y: 0.15,  parents: ['ssg'] },
        seraph:  { id: 'seraph',  name: '세리핌',        cost: 9000,  x: 4.6,  y: 0.05,  parents: ['pacif', 'warlord'] },
        fleet:   { id: 'fleet',   name: '전군총수',      cost: 15000, x: 4.6,  y: -1.05, parents: ['hq', 'ssg'] },

        // ── ⚖️ 서 : 사법 및 형벌 집행 기관 ──────────────────────
        law:     { id: 'law',     name: '사법 및\n형벌 집행 기관', cost: 3000, x: -1.7, y: 0.1,  parents: ['wg'] },
        enies:   { id: 'enies',   name: '애니에스 로비',  cost: 6000, x: -2.9, y: -0.2, parents: ['law'] },
        impel:   { id: 'impel',   name: '임펠다운',      cost: 6000, x: -3.0, y: 1.0,  parents: ['law'] },

        // ── 🕵️ 남 : 첩보 및 정보 수집 기관 ──────────────────────
        intel:   { id: 'intel',   name: '첩보 및\n정보 수집 기관', cost: 3000, x: 0,     y: 1.8,  parents: ['wg'] },
        rokushiki: { id: 'rokushiki', name: '육식',      cost: 5000, x: -0.95, y: 2.6,  parents: ['intel'] },
        cp18:    { id: 'cp18',    name: 'CP1-8',         cost: 5000, x: 1.1,   y: 2.65, parents: ['intel'] },
        cp9:     { id: 'cp9',     name: 'CP9',           cost: 8000, x: -0.9,  y: 3.5,  parents: ['rokushiki'] },
        cp0:     { id: 'cp0',     name: 'CP0',           cost: 12000, x: 0.2,  y: 3.8,  parents: ['cp9', 'cp18'] }
    };

    // 효과가 아직 없는 노드에는 기본 설명을 채워 넣는다
    for (const id in NODES) {
        if (!NODES[id].desc) NODES[id].desc = '아직 효과가 없습니다.';
        if (!NODES[id].effect) NODES[id].effect = null;
    }

    /**
     * 🔗 노드를 잇는 선.
     *    parents 로 자동 생성하면 그림의 '고리 모양' 연결이 빠지므로
     *    실제로 그려야 할 선을 따로 적어 둔다.
     */
    const EDGES = [
        // 🏛️ 북
        ['wg', 'rule'], ['rule', 'reverie'], ['rule', 'celest'],
        ['reverie', 'imu'], ['imu', 'gorosei'], ['gorosei', 'knights'], ['knights', 'celest'],
        // ⚓ 동
        ['wg', 'army'], ['army', 'branch'], ['branch', 'hq'], ['hq', 'fleet'],
        ['army', 'ssg'], ['ssg', 'pacif'], ['pacif', 'seraph'], ['ssg', 'fleet'],
        ['army', 'warlord'], ['warlord', 'seraph'],
        // ⚖️ 서
        ['wg', 'law'], ['law', 'enies'], ['law', 'impel'],
        // 🕵️ 남
        ['wg', 'intel'], ['intel', 'rokushiki'], ['intel', 'cp18'],
        ['rokushiki', 'cp9'], ['cp9', 'cp0'], ['cp0', 'cp18']
    ];

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

    /**
     * 이 노드를 지금 열 수 있는가.
     * ⚠️ parents 가 여럿이면 '전부' 열려 있어야 한다.
     *    (예: 전군총수는 해군본부와 SSG 를 모두 연 뒤에야 열린다)
     */
    function canUnlock(unlocked, id) {
        const n = NODES[id];
        if (!n) return false;
        if (unlocked && unlocked[id]) return false;        // 이미 열림
        const ps = n.parents || [];
        if (!ps.length) return true;                       // 뿌리 노드
        for (let i = 0; i < ps.length; i++) {
            if (!(unlocked && unlocked[ps[i]])) return false;
        }
        return true;
    }

    /** 아직 못 연 부모 목록 (설명 패널에 쓴다) */
    function missingParents(unlocked, id) {
        const n = NODES[id];
        if (!n) return [];
        return (n.parents || []).filter(function (pid) { return !(unlocked && unlocked[pid]); });
    }

    return { FACTION, decideGov, NODES, EDGES, bonusOf, canUnlock, missingParents };
}));
