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
        // 🏔️ 마리조아 — 성지
        mariejois: { id: 'mariejois', name: '마리조아',  cost: 5000,  x: -1.4,  y: -2.4,  parents: ['rule'] },
        celest:  { id: 'celest',  name: '천룡인',        cost: 5000,  x: 2.6,   y: -2.4,  parents: ['rule'] },
        // 🎯 인간 사냥 — 천룡인을 열면 나타난다
        hunt:    { id: 'hunt',    name: '인간 사냥',      cost: 7000,  x: 3.55,  y: -3.25, parents: ['celest'] },

        // ── 📜 계약 계보 : 최고 통치 기관에서 위로 뻗는다 ─────
        pactSky:  { id: 'pactSky',  name: '천해계약',     cost: 6000, x: 0.35, y: -3.0,  parents: ['rule'] },
        seal:     { id: 'seal',     name: '신의 종인',     cost: 7000, x: 0.7,  y: -4.05, parents: ['pactSky'] },
        pactDeep: { id: 'pactDeep', name: '심해계약',     cost: 8000, x: 1.0,  y: -5.1,  parents: ['seal'] },
        pactAbyss:{ id: 'pactAbyss',name: '심심해계약',   cost: 9000, x: 1.9,  y: -5.75, parents: ['pactDeep'] },

        // 🛡️ 신의 기사단 — 심해계약 + 천룡인을 모두 열어야 한다
        knights: { id: 'knights', name: '신의 기사단',    cost: 9000,  x: 2.0,   y: -4.3,  parents: ['pactDeep', 'celest'] },
        // ⭐ 오로성 — 심심해계약 + 천룡인을 모두 열어야 한다
        gorosei: { id: 'gorosei', name: '오로성',        cost: 11000, x: 3.0,   y: -6.2,  parents: ['pactAbyss', 'celest'] },

        // ✴️ 오망성(어비스) — 오로성과 신의 기사단을 모두 열어야 한다
        abyss5:  { id: 'abyss5',  name: '오망성\n(어비스)',  cost: 14000, x: 3.75, y: -5.05, parents: ['gorosei', 'knights'] },

        // 🏛️ 레벨리 — 오로성과 마리조아
        reverie: { id: 'reverie', name: '레벨리',        cost: 12000, x: -0.6,  y: -6.3,  parents: ['gorosei', 'mariejois'] },
        // 👑 임 — 오로성과 레벨리
        imu:     { id: 'imu',     name: '임',            cost: 16000, x: -1.9,  y: -7.2,  parents: ['gorosei', 'reverie'] },

        // ── ⚓ 동 : 군사 및 치안 유지 기관 ──────────────────────
        army:    { id: 'army',    name: '군사 및\n치안 유지 기관', cost: 3000,  x: 1.7,  y: -0.15, parents: ['wg'] },
        branch:  { id: 'branch',  name: '해군지부',      cost: 5000,  x: 2.5,  y: -0.85, parents: ['army'],
                   desc: '아군 포탑의 피해량과 연사 속도 25% 증가 (대포 제외)', effect: { turretBoost: 0.25 } },
        hq:      { id: 'hq',      name: '해군본부',      cost: 8000,  x: 3.4,  y: -1.25, parents: ['branch'],
                   desc: '세계정부 왼쪽에 대포가 세워진다. 폭발하는 큰 포탄을 쏜다.', effect: { cannon: true } },
        // 📞 버스터 콜 — 해군본부만 열면 바로 열린다 (전군총수와 달리 SSG 는 필요 없다)
        buster:  { id: 'buster',  name: '버스터 콜',      cost: 12000, x: 3.9,  y: -2.15, parents: ['hq'],
                   desc: '세계정부 근처에서 발동하면 군함 10척이 출항한다. 쿨타임 9분.', effect: { buster: 1 } },
        ssg:     { id: 'ssg',     name: 'SSG',           cost: 5000,  x: 2.9,  y: 0.1,   parents: ['army'],
                   desc: '(과학 기술 해금)' },
        warlord: { id: 'warlord', name: '왕하 칠무해',    cost: 5000,  x: 2.8,  y: 1.35,  parents: ['army'],
                   desc: '세계정부에서 칠무해가 싸운다. 쓰러지면 4분 뒤 되살아난다.', effect: { warlord: 1 } },
        pacif:   { id: 'pacif',   name: '파시피스타',    cost: 7000,  x: 3.7,  y: 0.55,  parents: ['ssg'],
                   desc: '3분마다 파시피스타가 출격한다. 적 넥서스만 노려 빛 레이저를 쏜다.', effect: { pacifista: 1 } },
        // 🤖 파시피스타 마크 Ⅲ — 파시피스타 아래.
        //    세라핌(4.6, 0.05) 과 왕하 칠무해(2.7, 0.95) 를 잇는 선 바깥에 둔다.
        pacif3:  { id: 'pacif3',  name: '파시피스타\n마크 Ⅲ', cost: 9000, x: 4.55, y: 0.95, parents: ['pacif'],
                   desc: '3분마다 마크 Ⅲ 가 출격한다. 더 크고 버블 보호막을 두르며 피해가 500 이다.', effect: { pacifista3: 1 } },
        seraph:  { id: 'seraph',  name: '세라핌',        cost: 9000,  x: 4.5,  y: 1.75,  parents: ['pacif', 'warlord'],
                   desc: '칠무해가 세라핌으로 대체된다. 체력이 무한이지만 회복은 없다.', effect: { seraph: 1 } },
        fleet:   { id: 'fleet',   name: '전군총수',      cost: 15000, x: 4.7,  y: -1.0,  parents: ['hq', 'ssg'],
                   desc: '세계정부의 체력 3배 · 초당 100 회복', effect: { nexusHpMult: 3, nexusRegen: 100 } },

        // ── ⚖️ 서 : 사법 및 형벌 집행 기관 ──────────────────────
        law:     { id: 'law',     name: '사법 및\n형벌 집행 기관', cost: 3000, x: -1.7, y: 0.1,  parents: ['wg'] },
        // ── 사법 기관에서 세 갈래로 뻗는다 ────────────────────
        //   ⚠️ 정의의 문이 세 갈래를 모두 받아야 해서 부채꼴이 넓어야 한다.
        //      위·아래를 크게 벌려야 '뉴 마린 포드' 가 들어갈 자리가 생긴다.
        enies:   { id: 'enies',   name: '에니에스 로비',  cost: 6000, x: -2.9,  y: -1.8,  parents: ['law'],
                   desc: '상대를 처치하면 그 상대의 경험치 10% 를 빼앗는다.', effect: { stealXp: 0.10 } },
        oldMari: { id: 'oldMari', name: '구 마린 포드',   cost: 6000, x: -2.95, y: 0.15,  parents: ['law'],
                   desc: '세계정부를 감싸는 회복 돔이 생긴다. 아군이 초당 100 회복한다.', effect: { healZone: 100 } },
        impel:   { id: 'impel',   name: '임펠 다운',      cost: 6000, x: -2.9,  y: 2.1,   parents: ['law'],
                   desc: '내가 처치한 상대는 부활에 30초가 걸린다. (플레이어 처치에만 적용)', effect: { impelDown: 1 } },
        // 각 갈래에서 하나씩 더 뻗는다
        tower:   { id: 'tower',   name: '사법의 탑',      cost: 9000, x: -2.7,  y: -2.9,  parents: ['enies'],
                   desc: '상대를 처치하면 그 상대의 골드 10% 를 빼앗는다.', effect: { stealGold: 0.10 } },
        newMari: { id: 'newMari', name: '뉴 마린 포드',   cost: 9000, x: -3.9,  y: -0.42, parents: ['oldMari'],
                   desc: '회복 돔이 강해진다. 초당 회복량이 200 이 된다.', effect: { healZone: 100 } },
        // ⛩️ 정의의 문 — 세 곳을 모두 열어야 한다 (부채꼴이 모이는 끝)
        gate:    { id: 'gate',    name: '정의의 문',      cost: 12000, x: -5.3, y: 0.15, parents: ['enies', 'oldMari', 'impel'],
                   desc: '새 스킬이 열린다. 5초를 버티면 아군 세계정부로 순간이동한다. 쿨타임 200초.', effect: { gateSkill: 1 } },

        // ── 🕵️ 남 : 첩보 및 정보 수집 기관 ──────────────────────
        intel:   { id: 'intel',   name: '첩보 및\n정보 수집 기관', cost: 3000, x: 0,     y: 1.8,  parents: ['wg'] },
        rokushiki: { id: 'rokushiki', name: '육식',      cost: 5000, x: -0.95, y: 2.6,  parents: ['intel'],
                   desc: '육식을 갖췄을 때 비로소 초인이 된다.' },
        cp18:    { id: 'cp18',    name: 'CP1-8',         cost: 5000, x: 1.1,   y: 2.65, parents: ['intel'],
                   desc: '아군 군함·파시피스타의 위치와 생존 여부가 미니맵에 드러난다.', effect: { seeUnits: 1 } },
        cp9:     { id: 'cp9',     name: 'CP9',           cost: 8000, x: -0.9,  y: 3.5,  parents: ['rokushiki'],
                   desc: '몬스터와 보스의 위치·생존 여부가 아군 미니맵에 드러난다.', effect: { seeMobs: 1 } },
        cp0:     { id: 'cp0',     name: 'CP0',           cost: 12000, x: 0.2,  y: 3.8,  parents: ['cp9', 'cp18'],
                   desc: '상대 플레이어의 위치와 생존 여부까지 미니맵에 드러난다.', effect: { seeEnemies: 1 } }
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
        ['wg', 'rule'], ['rule', 'mariejois'], ['rule', 'celest'], ['celest', 'hunt'],
        // 📜 계약 계보
        ['rule', 'pactSky'], ['pactSky', 'seal'], ['seal', 'pactDeep'], ['pactDeep', 'pactAbyss'],
        // 🛡️⭐ 계약 + 천룡인 을 모두 열어야 한다
        ['pactDeep', 'knights'], ['celest', 'knights'],
        ['pactAbyss', 'gorosei'], ['celest', 'gorosei'],
        // ⚠️ 신의 기사단 → 오망성 선은 천룡인→오로성 선과 겹쳐서 그리지 않는다.
        //    해금 조건에는 그대로 들어 있고, 설명 패널의 '필요한 노드' 가 알려 준다.
        ['gorosei', 'abyss5'],
        ['gorosei', 'reverie'], ['mariejois', 'reverie'],
        ['gorosei', 'imu'], ['reverie', 'imu'],
        // ⚓ 동
        ['wg', 'army'], ['army', 'branch'], ['branch', 'hq'], ['hq', 'fleet'], ['hq', 'buster'],
        ['army', 'ssg'], ['ssg', 'pacif'], ['pacif', 'seraph'], ['ssg', 'fleet'], ['pacif', 'pacif3'],
        ['army', 'warlord'], ['warlord', 'seraph'],
        // ⚖️ 서
        ['wg', 'law'], ['law', 'enies'], ['law', 'oldMari'], ['law', 'impel'],
        ['enies', 'tower'], ['oldMari', 'newMari'],
        ['enies', 'gate'], ['oldMari', 'gate'], ['impel', 'gate'],
        // 🕵️ 남
        ['wg', 'intel'], ['intel', 'rokushiki'], ['intel', 'cp18'],
        ['rokushiki', 'cp9'], ['cp9', 'cp0'], ['cp0', 'cp18']
    ];

    /** 열려 있는 노드로 계산한 팀 보너스 */
    function bonusOf(unlocked) {
        const b = {
            atkPct: 0, hpPct: 0,
            turretBoost: 0,      // 🏹 포탑 피해·연사 증가율
            cannon: false,       // 💣 대포 설치 여부
            nexusHpMult: 1,      // 🏛️ 넥서스 최대 체력 배수
            nexusRegen: 0,       // 🏛️ 넥서스 초당 회복
            pacifista: 0,        // 🤖 파시피스타 출격
            pacifista3: 0,       // 🤖 마크 Ⅲ 출격
            warlord: 0,          // ⚔️ 칠무해
            seraph: 0,           // 👼 세라핌 (칠무해를 대체)
            buster: 0,           // 🚢 버스터 콜
            healZone: 0,         // 💚 회복 돔 (초당 회복량)
            impelDown: 0,        // ⛓️ 처치한 상대의 부활 시간 연장
            stealXp: 0,          // 📚 처치 시 경험치 강탈 비율
            stealGold: 0,        // 💰 처치 시 골드 강탈 비율
            gateSkill: 0,        // ⛩️ 정의의 문 스킬
            seeMobs: 0,          // 🔍 몬스터·보스 미니맵 표시
            seeUnits: 0,         // 🔍 아군 유닛 미니맵 표시
            seeEnemies: 0        // 🔍 적 플레이어 미니맵 표시
        };
        if (!unlocked) return b;
        for (const id in NODES) {
            if (!unlocked[id]) continue;
            const e = NODES[id].effect;
            if (!e) continue;
            b.atkPct += (e.atkPct || 0);
            b.hpPct += (e.hpPct || 0);
            b.turretBoost += (e.turretBoost || 0);
            if (e.cannon) b.cannon = true;
            if (e.nexusHpMult) b.nexusHpMult *= e.nexusHpMult;
            b.nexusRegen += (e.nexusRegen || 0);
            b.pacifista += (e.pacifista || 0);
            b.pacifista3 += (e.pacifista3 || 0);
            b.warlord += (e.warlord || 0);
            b.seraph += (e.seraph || 0);
            b.buster += (e.buster || 0);
            b.healZone += (e.healZone || 0);
            b.impelDown += (e.impelDown || 0);
            b.stealXp += (e.stealXp || 0);
            b.stealGold += (e.stealGold || 0);
            b.gateSkill += (e.gateSkill || 0);
            b.seeMobs += (e.seeMobs || 0);
            b.seeUnits += (e.seeUnits || 0);
            b.seeEnemies += (e.seeEnemies || 0);
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
