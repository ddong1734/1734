// 파일명: server/socketEvents.js
// ============================================================================
// 🔌 소켓 이벤트 · 🗣️ NPC 대화 퀘스트
//
//   · npcLines / endNpcTalk / sendNpcLine : 🗣️ 티치 · 🗡️ 마허라 공용 대화 헬퍼
//   · giveTichReward / giveMaheraReward   : 퀘스트 보상 지급
//   · register()                          : io.on('connection') 전체 등록
//
// 🔗 순환 참조는 index.js 가 wire() 로 나중에 주입하고,
//    모든 모듈이 준비된 뒤 register() 를 호출해 실제 이벤트를 붙인다.
// ============================================================================

let io, C, State, compressors, Characters, CharLogic;
let Damage, Fruits, Kashimo, ShopManager, serverContext, Domain;
let isNum, getNpc, makePlayer;
let recalcStats, resetGame, tryReconnect;
let clearBurns, handleBasicAttack, sanitizeActionData, isDaburaLocked, isDaidoLocked;

/** 🔗 index.js 가 모든 모듈을 만든 뒤 호출한다 */
function wire(d) {
    io = d.io; C = d.C; State = d.State; compressors = d.compressors;
    Characters = d.Characters; CharLogic = d.CharLogic;
    Damage = d.Damage; Fruits = d.Fruits; Kashimo = d.Kashimo;
    ShopManager = d.ShopManager; serverContext = d.serverContext;
    Domain = d.Domain;
    isNum = d.isNum; getNpc = d.getNpc; makePlayer = d.makePlayer;
    recalcStats = d.recalcStats; resetGame = d.resetGame; tryReconnect = d.tryReconnect;
    clearBurns = d.clearBurns; handleBasicAttack = d.handleBasicAttack;
    sanitizeActionData = d.sanitizeActionData; isDaburaLocked = d.isDaburaLocked;
    isDaidoLocked = d.isDaidoLocked || function () { return false; };
}

// ============================================================================
// 🗣️ NPC 대화 헬퍼
// ============================================================================

/** 🗣️ 현재 대화 모드에 해당하는 대사 배열
 *  @param kind  'tich' | 'mahera'
 *  @param mode  'intro' | 'turnin' | 'intro2' | 'turnin2'
 *
 *  🌑 intro2 / turnin2 는 ⬛ 다부라 전용 마허라 2차 퀘스트다.
 */
function npcLines(kind, mode) {
    if (kind === 'mahera') {
        if (mode === 'turnin2') return C.MAHERA2_LINES_TURNIN;
        if (mode === 'intro2')  return C.MAHERA2_LINES_INTRO;
        return (mode === 'turnin') ? C.MAHERA_LINES_TURNIN : C.MAHERA_LINES_INTRO;
    }
    return (mode === 'turnin') ? C.TICH_LINES_TURNIN : C.TICH_LINES_INTRO;
}

/** 🗣️ 줄마다 '말하는 사람' 이 다를 수 있다 (없으면 NPC 이름을 그대로 쓴다)
 *      · 마허라 2차 퀘스트의 마지막 줄은 ⬛ 다부라 카라바 본인이 말한다.
 */
function npcSpeaker(kind, mode, line, fallback) {
    let arr = null;
    if (kind === 'mahera') {
        if (mode === 'turnin2') arr = C.MAHERA2_SPEAKER_TURNIN;
        else if (mode === 'intro2') arr = C.MAHERA2_SPEAKER_INTRO;
    }
    if (arr && arr[line]) return arr[line];
    return fallback;
}

/** 🌑 마허라 2차 퀘스트를 시작할 수 있는 상태인가
 *      · ⬛ 다부라 카라바 전용
 *      · 1차 퀘스트(세계를 가르는 참격)를 이미 끝냈어야 한다
 *      · 2차 퀘스트를 아직 안 끝냈어야 한다
 */
function canMahera2(p) {
    if (!p) return false;
    if (p.characterType !== C.MAHERA2_ONLY_CHAR) return false;
    if ((p.maheraStage || 0) < 2) return false;
    return (p.maheraStage2 || 0) < 2;
}

/** 🌑 2차 퀘스트가 요구하는 아이템(세계를 가르는 참격)을 갖고 있는가 */
function hasAllMahera2Items(p) {
    if (!p || !p.inventory) return false;
    return C.MAHERA2_QUEST_ITEMS.every(id => p.inventory.some(i => i.id === id));
}

/** 🌑 마허라 2차 퀘스트 보상 : '유명이경 역월' 1개 */
function giveMahera2Reward(p) {
    if (p.inventory.length >= 20) {
        io.to(p.id).emit('goldenDrop', { msg: '인벤토리가 가득 차 보상을 놓쳤습니다!', fail: true });
        return;
    }
    let id = C.MAHERA2_REWARD_ITEM;
    p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: id });
    recalcStats(p);
    io.to(p.id).emit('buySuccess', p);
    io.to(p.id).emit('npcReward', { items: [id] });
}

/** 🗣️ 대화를 끝내고 모든 잠금을 해제한다 */
function endNpcTalk(p) {
    if (!p) return;
    p.npcTalking = null; p.npcMode = null; p.npcLine = 0; p.npcNoExit = false;
    io.to(p.id).emit('npcDialogEnd');
    io.emit('syncPlayerFull', p);
}

/** 🗣️ 현재 줄을 클라이언트에 보낸다 */
function sendNpcLine(p, npc) {
    let lines = npcLines(npc.kind, p.npcMode);
    let text = lines[p.npcLine] || '';
    // 🚪 [나가기] 버튼 : turnin 모드에서 제출을 마친 뒤에는 사라진다
    let canExit = !p.npcNoExit;
    io.to(p.id).emit('npcDialog', {
        npcId: npc.id,
        name: npcSpeaker(npc.kind, p.npcMode, p.npcLine, npc.name),
        kind: npc.kind,
        mode: p.npcMode, line: p.npcLine,
        total: lines.length,
        text: text, canExit: canExit
    });
}



/** 🗡️ 마허라가 요구하는 아이템(법진 · 퇴마의 검)을 모두 갖고 있는가 */
function hasAllMaheraItems(p) {
    if (!p || !p.inventory) return false;
    return C.MAHERA_QUEST_ITEMS.every(id => p.inventory.some(i => i.id === id));
}

/** 🗡️ 마허라 퀘스트 보상 : '세계를 가르는 참격' 1개 */
function giveMaheraReward(p) {
    if (p.inventory.length >= 20) {
        io.to(p.id).emit('goldenDrop', { msg: '인벤토리가 가득 차 보상을 놓쳤습니다!', fail: true });
        return;
    }
    let id = C.MAHERA_REWARD_ITEM;
    p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: id });
    recalcStats(p);
    io.to(p.id).emit('buySuccess', p);
    io.to(p.id).emit('npcReward', { items: [id] });
}

/** 🎁 티치 퀘스트 보상 : 랜덤 악마의 열매 2개 */
function giveTichReward(p) {
    let pool = C.TICH_REWARD_FRUITS.slice();
    let got = [];
    for (let i = 0; i < C.TICH_REWARD_COUNT; i++) {
        if (pool.length === 0) break;
        let idx = Math.floor(Math.random() * pool.length);
        let id = pool.splice(idx, 1)[0];
        if (p.inventory.length >= 20) {
            io.to(p.id).emit('goldenDrop', { msg: '인벤토리가 가득 차 보상을 놓쳤습니다!', fail: true });
            break;
        }
        p.inventory.push({ uid: Math.random().toString(36).substr(2, 9), id: id });
        got.push(id);
    }
    recalcStats(p);
    io.to(p.id).emit('buySuccess', p);
    if (got.length > 0) io.to(p.id).emit('npcReward', { items: got });
}


// ============================================================================
// 🔌 소켓 이벤트
// ============================================================================
/** 🔌 실제 소켓 이벤트를 등록한다 (index.js 가 wire() 뒤에 한 번 호출) */
function register() {

io.on('connection', (socket) => {
    ShopManager.registerEvents(socket, serverContext);

    socket.on('pingCheck', (ts) => { socket.emit('pongCheck', ts); });

    socket.on('attemptReconnect', (data) => {
        let sessionId = (data && data.sessionId) ? data.sessionId : null;
        if (!tryReconnect(socket, sessionId)) socket.emit('reconnectUnavailable');
    });

    socket.on('joinLobby', (data) => {
        let nick = typeof data === 'string' ? data : data.nickname;
        let charType = typeof data === 'string' ? 'PARK' : (data.character || 'PARK');
        let sessionId = (data && data.sessionId) ? data.sessionId : null;

        if (State.gameStarted) {
            if (tryReconnect(socket, sessionId)) return;
            socket.emit('joinFail', '이미 게임이 진행 중입니다.'); return;
        }
        if (Object.keys(State.players).length >= 6) { socket.emit('joinFail', '로비가 가득 찼습니다.'); return; }
        if (!State.masterId) State.masterId = socket.id;

        let bCount = 0, rCount = 0;
        for (let id in State.players) { if (State.players[id].team === 1) bCount++; else rCount++; }

        State.players[socket.id] = makePlayer({
            id: socket.id, nick: nick, charType: charType,
            team: (bCount <= rCount) ? 1 : 2,
            sessionId: sessionId, Characters: Characters
        });
        io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId });
    });

    socket.on('toggleTeam', (targetId) => {
        if (State.masterId !== socket.id) return;
        let t = State.players[targetId];
        if (!t) return;
        t.team = t.team === 1 ? 2 : 1;
        t.x = t.team === 1 ? 12800 : 19200;
        io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId });
    });

    socket.on('startGame', () => {
        if (State.masterId !== socket.id || Object.keys(State.players).length === 0) return;
        for (let k in compressors) compressors[k].snapshots.clear();
        State.gameStarted = true;
        io.emit('gameStartSign', State.players);
        io.emit('syncDetectors', State.detectors);
        io.emit('syncTeamStorage', State.teamStorages);
        io.emit('syncHinbeomPortal', State.hinbeomPortal);
        io.emit('syncDarkPortal', State.darkPortal);
        io.emit('syncBlackbeardPortal', State.blackbeardPortal);
        // 🔥 [버그 수정] 저주의 왕 상태를 처음에 반드시 보낸다.
        //    sukunaUpdate 는 '바뀐 부분만' 보내는 델타라, 아무도 없을 때
        //    스쿠나가 가만히 있으면 아예 전송되지 않아 화면에 안 보였다.
        io.emit('syncCursePortal', State.cursePortal);
        io.emit('syncSukuna', State.sukuna);
        io.emit('syncSukunaPortal', State.sukunaPortal);
        io.emit('syncSukunaFires', State.sukunaFires);
        // 🗣️ NPC 목록 전송
        io.emit('syncNpcs', State.npcs);
    });

    socket.on('playerMove', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        if (!data || !isNum(data.x) || !isNum(data.y)) return;
        let now = Date.now();
        if (now - (p.lastRespawn || 0) < 500) return;
        if (now - (p.lastPortalUse || 0) < 500) return;
        if (now - (p.lastDarkPortalUse || 0) < 500) return;
        // 🗣️ NPC 대화 중에는 좌표를 갱신하지 않는다 (완전 고정)
        if (p.npcTalking) return;
        if (p.isCasting && (p.characterType === 'BORSALINO' || p.iceAgeActive || p.elThorActive)) return;
        // ⚡🔮 음파 경직 · ⚡🌋 주력 방출 중에는 좌표를 갱신하지 않는다 (완전 고정)
        if (now < (p.sonicChargeUntil || 0)) return;
        if (now < (p.surgeLockUntil || 0)) return;
        // ⬛ 다부라 : 발차기 응축(2초) 중에는 완전 고정
        if (p.dKickCharging) return;
        // 🗡️ 세계를 가르는 참격 : 0.5초 경직 중에는 완전 고정
        if (p.cleaveCasting) return;
        // 🌑 유명이경 역월 : 1초 시전 경직 중에는 완전 고정
        if (p.yumCasting) return;
        // ⚔️ [버그 수정] 다이도 스킬 중에는 서버가 좌표를 직접 몬다.
        //    여기서 막지 않으면 시전자 클라이언트가 자기 좌표를 계속 덮어써서
        //    '남들 화면에선 잘 되는데 내 화면에선 제자리' 가 된다.
        //      · 무자비 · 일섬 : 그 자리에 굳어야 한다
        //      · 질풍참       : 서버가 앞으로 밀어 준다
        if (p.daidoFury && now < (p.daidoFuryEnd || 0)) return;
        if (p.daidoRush && now < (p.daidoRushEnd || 0)) return;
        if (p.daidoIaiAt && now < p.daidoIaiAt) return;
        // 💫 [영역] 별 궤도 비행 중에는 서버가 좌표를 직접 몰기 때문에
        //    클라이언트가 보낸 좌표를 받아들이면 안 된다
        if (p.domKickEnd && Date.now() < p.domKickEnd) return;
        // ⬛☀️ [수정] 빛 시전 중(솟구침 + 2초 폭발)에는 서버가 좌표를 그대로 유지한다.
        //    (클라이언트가 공중 고정 좌표를 보내오지만, 튐 방지를 위해 갱신을 막는다)
        if (p.dLightActive) return;
        // ⬛🌑 [수정] 어둠 시전 중(3초)에는 완전 고정
        if (p.dDarkActive && now < (p.dDarkEnd || 0)) return;

        // 🚧 [유명이경 역월] 영역 벽 — 안에서 밖으로, 밖에서 안으로 넘어갈 수 없다.
        //    서버가 최종 판정하므로 클라이언트를 조작해도 통과할 수 없다.
        let wall = Domain.clampToDomainWall(p, data.x, data.y);
        p.x = wall.x; p.y = wall.y;
        // 벽에 막혔다면 보정된 좌표를 본인에게도 돌려보내 위치를 맞춘다
        if (wall.blocked) socket.emit('domainWallPush', { x: p.x, y: p.y });

        let pDelta = compressors.playerDelta.getDelta(socket.id, p);
        if (pDelta) socket.broadcast.emit('enemyUpdate', pDelta);
    });

    socket.on('skill3Aim', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead || !p.skill3Active || p.characterType !== 'BORSALINO') return;
        if (!data || !isNum(data.dirX) || !isNum(data.dirY)) return;
        if (data.dirX !== 0 || data.dirY !== 0) { p.skill3DirX = data.dirX; p.skill3DirY = data.dirY; }
    });

    socket.on('borsLightDash', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead || p.characterType !== 'BORSALINO') return;
        if (p.npcTalking) return;                    // 🗣️ 대화 중 봉인
        if (Fruits.isActionLocked(p)) return;
        let dir = (data && data.dir === -1) ? -1 : 1;
        io.emit('borsLightDash', { id: socket.id, dir: dir, duration: 220 });
        let minX = dir === 1 ? p.x : p.x - 450;
        let maxX = dir === 1 ? p.x + 450 : p.x;
        Damage.applyBoxDamage(p, minX, maxX, p.y - 70, p.y + 70, 70, 0);
    });

    socket.on('useSkill', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        if (p.cleaveCasting) return;                 // ⚔ 참격 경직 중 봉인
        if (p.yumCasting) return;                    // 🌑 유명이경 시전 중 봉인
        if (p.npcTalking) return;                    // 🗣️ 대화 중 봉인
        if (Fruits.isActionLocked(p)) return;
        let now = Date.now();
        if (now < (p.sonicChargeUntil || 0)) return;
        if (now < (p.surgeLockUntil || 0)) return;
        // ⬛ 다부라 : 빛 시전 / 어둠 시전 / 발차기 응축 중에는 스킬 봉인
        if (isDaburaLocked(p, now)) return;
        if (isDaidoLocked(p, now)) return;                // ⚔️ 다이도 시전 중 봉인
        let safeData = sanitizeActionData(p, data);
        if (!safeData) return;
        let logic = CharLogic[p.characterType];
        if (logic && logic.useSkill) logic.useSkill(p, safeData, serverContext);
    });

    // ========================================================================
    // 🗡️ [세계를 가르는 참격] — 4번 스킬 (아이템 장착 시에만 사용 가능)
    //    캐릭터와 무관하게 동작하므로 CharLogic 을 거치지 않는다.
    // ========================================================================
    socket.on('useWorldCleave', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        if (!p.hasWorldCleave) return;               // 🚫 아이템 미장착
        if (p.npcTalking) return;                    // 🗣️ 대화 중 봉인
        if (Fruits.isActionLocked(p)) return;

        let now = Date.now();
        if (now < (p.cd4 || 0)) return;              // ⏳ 쿨타임
        if (p.cleaveCasting) return;                 // 이미 시전 중
        if (p.yumCasting) return;                    // 🌑 유명이경 시전 중 봉인
        if (now < (p.frozenUntil || 0)) return;
        if (now < (p.sonicChargeUntil || 0)) return;
        if (now < (p.surgeLockUntil || 0)) return;
        if (now < (p.crowsPullUntil || 0)) return;
        if (isDaburaLocked(p, now)) return;
        if (isDaidoLocked(p, now)) return;                // ⚔️ 다이도 시전 중 봉인

        let safeData = sanitizeActionData(p, data);
        if (!safeData) return;

        // 🧭 [수정] 정면 발사 — 조이스틱 방향을 쓰지 않는다
        let ux = (safeData.dir === -1) ? -1 : 1;
        let uy = 0;
        p.lastFacing = ux;

        p.cd4 = now + C.CLEAVE_CD;
        p.cleaveCasting = true;
        p.cleaveCastEnd = now + C.CLEAVE_CAST_MS;
        p.cleaveDirX = ux;
        p.cleaveDirY = 0;

        // 🎬 0.5초 경직 — 클라이언트에도 시전 시작을 알린다
        io.emit('worldCleaveCast', {
            id: p.id, x: p.x, y: p.y, dirX: ux, dirY: uy,
            castMs: C.CLEAVE_CAST_MS
        });
        io.emit('syncPlayerFull', p);
    });

    socket.on('landSkill1', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        if (p.npcTalking) return;                    // 🗣️ 대화 중 봉인
        let safeData = sanitizeActionData(p, data);
        if (!safeData) return;
        let logic = CharLogic[p.characterType];
        if (logic && logic.landSkill1) logic.landSkill1(p, safeData, serverContext);
    });

    socket.on('action', (actionData) => {
        if (!State.gameStarted) return;
        let attacker = State.players[socket.id];
        if (!attacker || attacker.isDead || attacker.isCasting) return;
        if (attacker.cleaveCasting) return;          // ⚔ 참격 경직 중 봉인
        if (attacker.yumCasting) return;             // 🌑 유명이경 시전 중 봉인
        if (attacker.npcTalking) return;             // 🗣️ 대화 중 봉인
        if (Fruits.isActionLocked(attacker)) return;
        let now = Date.now();
        if (now < (attacker.sonicChargeUntil || 0)) return;
        if (now < (attacker.surgeLockUntil || 0)) return;
        // ⬛ 다부라 : 빛 시전 / 어둠 시전 / 발차기 응축·비행 중에는 평타 봉인
        if (isDaburaLocked(attacker, now)) return;
        if (attacker.dKickFlying) return;

        let safeData = sanitizeActionData(attacker, actionData);
        if (!safeData) return;

        // ⚡🔮 환수호박 중인 카시모는 평타 대신 전격 돌진이 나간다.
        if (attacker.characterType === 'KASHIMO' && attacker.amberActive) {
            Kashimo.tryAmberDash(attacker, safeData, serverContext);
            return;
        }

        io.emit('actionEffect', {
            id: socket.id, type: safeData.type, x: safeData.x, y: safeData.y,
            dir: safeData.dir, life: safeData.lifeFrames, maxLife: safeData.lifeFrames
        });

        if (safeData.type === 'thunder_bolt') {
            let dir = safeData.dir;
            State.projectiles.push({
                id: State.projIdCounter++, team: attacker.team, type: 'thunder_bolt', ownerId: socket.id,
                x: attacker.x + (dir * 60), y: attacker.y - 20,
                vx: dir * 40, vy: 0,
                life: 45, damage: attacker.baseDamage + attacker.bonusDamage,
                hitR: 45, edgeR: 20, canHitBase: true, piercing: false
            });
            Fruits.triggerFruitOnAttack(attacker, dir);
            return;
        }

        handleBasicAttack(socket, attacker, safeData);
        Fruits.triggerFruitOnAttack(attacker, safeData.dir);
    });

    // ========================================================================
    // 🗣️ NPC 대화 이벤트
    // ========================================================================

    /** 🗣️ 상호작용 시작 */
    socket.on('npcInteract', (npcId) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        if (p.npcTalking) return;
        if (!State.gameStarted) return;

        let npc = getNpc(npcId);
        if (!npc) return;
        // 🚫 상대팀 NPC 에게는 상호작용할 수 없다
        if (npc.team !== p.team) return socket.emit('buyFail', '상대팀 NPC 입니다.');
        // 📏 거리 검사
        if (Math.hypot(p.x - npc.x, p.y - npc.y) > C.NPC_INTERACT_RANGE) return;

        let mode;

        if (npc.kind === 'mahera') {
            // ── 🗡️ 마허라 ────────────────────────────────────────────
            if ((p.maheraStage || 0) >= 2) {
                // 🌑 1차를 끝낸 ⬛ 다부라 카라바만 2차 퀘스트를 이어서 할 수 있다
                if (!canMahera2(p)) return;

                if ((p.maheraStage2 || 0) === 0) {
                    mode = 'intro2';
                } else {
                    if (!hasAllMahera2Items(p)) {
                        return socket.emit('buyFail', "'세계를 가르는 참격'이 필요합니다!");
                    }
                    mode = 'turnin2';
                }
            } else if ((p.maheraStage || 0) === 0) {
                mode = 'intro';
            } else {
                // 퀘스트 진행 중 : 법진 · 퇴마의 검을 모두 갖고 있어야 대화가 열린다
                if (!hasAllMaheraItems(p)) {
                    return socket.emit('buyFail', "'법진'과 '퇴마의 검'이 모두 필요합니다!");
                }
                mode = 'turnin';
            }
        } else {
            // ── 🗣️ 티치 ──────────────────────────────────────────────
            // ✅ 퀘스트가 이미 완료된 NPC 는 다시 상호작용할 수 없다
            if ((p.tichStage || 0) >= 2) return;

            if ((p.tichStage || 0) === 0) {
                mode = 'intro';
            } else {
                // 퀘스트 진행 중 : 체리파이를 갖고 있어야 대화가 열린다
                if (!p.inventory.some(i => i.id === C.TICH_QUEST_ITEM)) {
                    return socket.emit('buyFail', "'체리파이'가 없습니다!");
                }
                mode = 'turnin';
            }
        }

        p.npcTalking = npc.id;
        p.npcMode = mode;
        p.npcLine = 0;
        p.npcNoExit = false;

        sendNpcLine(p, npc);
        io.emit('syncPlayerFull', p);
    });

    /** 🟢 [동의합니다] — 다음 대사로 진행 */
    socket.on('npcAgree', () => {
        let p = State.players[socket.id];
        if (!p || !p.npcTalking) return;
        let npc = getNpc(p.npcTalking);
        if (!npc) { endNpcTalk(p); return; }

        let isMahera = (npc.kind === 'mahera');
        let lines = npcLines(npc.kind, p.npcMode);

        // 📦 turnin 모드 첫 대사에서 동의하면 요구 아이템이 사라지고
        //    이후 대사부터 [나가기] 버튼이 사라진다
        if (p.npcMode === 'turnin' && p.npcLine === 0 && !p.npcNoExit) {
            if (isMahera) {
                // 🗡️ 법진 + 퇴마의 검을 한 번에 회수한다
                if (!hasAllMaheraItems(p)) {
                    socket.emit('buyFail', "'법진'과 '퇴마의 검'이 모두 필요합니다!");
                    endNpcTalk(p);
                    return;
                }
                for (let reqId of C.MAHERA_QUEST_ITEMS) {
                    let idx = p.inventory.findIndex(i => i.id === reqId);
                    if (idx === -1) continue;
                    let uid = p.inventory[idx].uid;
                    p.equippedUids = p.equippedUids.filter(u => u !== uid);
                    p.inventory.splice(idx, 1);
                }
            } else {
                let idx = p.inventory.findIndex(i => i.id === C.TICH_QUEST_ITEM);
                if (idx === -1) {
                    socket.emit('buyFail', "'체리파이'가 없습니다!");
                    endNpcTalk(p);
                    return;
                }
                let uid = p.inventory[idx].uid;
                p.equippedUids = p.equippedUids.filter(u => u !== uid);
                p.inventory.splice(idx, 1);
            }
            p.npcNoExit = true;
            recalcStats(p);
            socket.emit('buySuccess', p);
        }

        // 🌑 2차 퀘스트(다부라 전용) turnin 첫 대사 : 세계를 가르는 참격을 회수하고
        //    그 자리에서 '유명이경 역월' 을 지급한다. 이후 [나가기] 버튼이 사라진다.
        if (p.npcMode === 'turnin2' && p.npcLine === 0 && !p.npcNoExit) {
            if (!hasAllMahera2Items(p)) {
                socket.emit('buyFail', "'세계를 가르는 참격'이 필요합니다!");
                endNpcTalk(p);
                return;
            }
            for (let reqId of C.MAHERA2_QUEST_ITEMS) {
                let idx = p.inventory.findIndex(i => i.id === reqId);
                if (idx === -1) continue;
                let uid = p.inventory[idx].uid;
                p.equippedUids = p.equippedUids.filter(u => u !== uid);
                p.inventory.splice(idx, 1);
            }
            p.npcNoExit = true;
            recalcStats(p);
            giveMahera2Reward(p);
        }

        p.npcLine++;

        if (p.npcLine >= lines.length) {
            // ── 대화 종료 ────────────────────────────────────────────
            if (isMahera) {
                if (p.npcMode === 'intro2') {
                    // 🌑 2차 퀘스트 수락
                    p.maheraStage2 = 1;
                    io.to(p.id).emit('npcQuest', { key: 'mahera2', text: C.MAHERA2_QUEST_TEXT });
                } else if (p.npcMode === 'turnin2') {
                    // 🌑 2차 퀘스트 완료 (보상은 첫 대사에서 이미 지급됐다)
                    p.maheraStage2 = 2;
                    io.to(p.id).emit('npcQuest', { key: 'mahera2', text: null });
                } else if (p.npcMode === 'intro') {
                    p.maheraStage = 1;
                    io.to(p.id).emit('npcQuest', { key: 'mahera', text: C.MAHERA_QUEST_TEXT });
                } else {
                    p.maheraStage = 2;
                    io.to(p.id).emit('npcQuest', { key: 'mahera', text: null });
                    giveMaheraReward(p);
                }
            } else {
                if (p.npcMode === 'intro') {
                    p.tichStage = 1;
                    io.to(p.id).emit('npcQuest', { key: 'tich', text: C.TICH_QUEST_TEXT });
                } else {
                    p.tichStage = 2;
                    io.to(p.id).emit('npcQuest', { key: 'tich', text: null });
                    giveTichReward(p);
                }
            }
            endNpcTalk(p);
            return;
        }

        sendNpcLine(p, npc);
    });

    /** 🔴 [나가기] — 대화 즉시 종료 */
    socket.on('npcExit', () => {
        let p = State.players[socket.id];
        if (!p || !p.npcTalking) return;
        if (p.npcNoExit) return;                     // 🚫 체리파이를 넘긴 뒤에는 나갈 수 없다
        endNpcTalk(p);
    });

    // ========================================================================
    // 🌑 [유명이경 역월] — 4번 스킬 (영역 전개)
    //    ⬛ 다부라 카라바 전용. 누르면 1초 경직 후 영역이 전개된다.
    // ========================================================================
    socket.on('useYumyeong', (data) => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        if (!p.hasYumyeong) return;                  // 🚫 아이템 미장착
        if (p.npcTalking) return;                    // 🗣️ 대화 중 봉인
        if (Fruits.isActionLocked(p)) return;

        let now = Date.now();
        if (now < (p.cdY || 0)) return;              // ⏳ 쿨타임
        if (p.yumCasting) return;                    // 이미 시전 중
        if (p.cleaveCasting) return;                 // 참격 시전 중
        if (now < (p.frozenUntil || 0)) return;
        if (now < (p.sonicChargeUntil || 0)) return;
        if (now < (p.surgeLockUntil || 0)) return;
        if (now < (p.crowsPullUntil || 0)) return;
        if (isDaburaLocked(p, now)) return;
        if (isDaidoLocked(p, now)) return;                // ⚔️ 다이도 시전 중 봉인

        p.cdY = now + C.YUM_CD;
        p.yumCasting = true;
        p.yumCastEnd = now + C.YUM_CAST_MS;

        // 🎬 1초 시전 경직 — 클라이언트 연출 시작
        io.emit('yumyeongCast', { id: p.id, x: p.x, y: p.y, castMs: C.YUM_CAST_MS });
        io.emit('syncPlayerFull', p);
    });

    // ⚔️ 다이도 3연타 마무리 — 짧은 전방위 베기 (경직 없음)
    socket.on('daidoCombo', () => {
        let p = State.players[socket.id];
        if (!p || p.isDead) return;
        if (p.characterType !== 'DAIDO') return;
        if (p.npcTalking) return;
        if (Fruits.isActionLocked(p)) return;
        if (p.daidoRush || p.daidoFury || p.daidoIaiAt) return;
        if (p.daidoSpinEnd && Date.now() < p.daidoSpinEnd) return;   // 중복 방지
        let logic = CharLogic['DAIDO'];
        if (logic && logic.startComboSpin) logic.startComboSpin(p, serverContext);
    });

    socket.on('disconnect', () => {
        let dp = State.players[socket.id];
        if (dp && dp.surgeActive) {
            dp.surgeActive = false; dp.surgeEnd = 0; dp.surgeNextTick = 0; dp.surgeLockUntil = 0;
            io.emit('kashimoSurgeEnd', { id: socket.id });
        }
        // ⬛ 다부라 : 진행 중이던 스킬 이펙트를 끈다
        if (dp && dp.dLightActive) { dp.dLightActive = false; io.emit('daburaLightEnd', { id: socket.id }); }
        if (dp && dp.dDarkActive) { dp.dDarkActive = false; io.emit('daburaDarkEnd', { id: socket.id }); }
        if (dp && (dp.dKickCharging || dp.dKickFlying)) {
            dp.dKickCharging = false; dp.dKickFlying = false;
            io.emit('daburaKickEnd', { id: socket.id });
        }
        // 🗣️ 대화 중이었다면 상태를 정리한다
        if (dp && dp.npcTalking) {
            dp.npcTalking = null; dp.npcMode = null; dp.npcLine = 0; dp.npcNoExit = false;
        }
        for (let i = State.amberTrails.length - 1; i >= 0; i--) {
            if (State.amberTrails[i].ownerId === socket.id) State.amberTrails.splice(i, 1);
        }
        for (let i = State.waveChains.length - 1; i >= 0; i--) {
            if (State.waveChains[i].ownerId === socket.id) State.waveChains.splice(i, 1);
        }
        for (let i = State.waveEchoes.length - 1; i >= 0; i--) {
            if (State.waveEchoes[i].ownerId === socket.id) State.waveEchoes.splice(i, 1);
        }

        if (State.players[socket.id]) {
            if (State.gameStarted) {
                State.players[socket.id].disconnected = true;
                State.players[socket.id].disconnectTime = Date.now();
            } else {
                clearBurns(socket.id, State.players[socket.id]);
                delete State.players[socket.id];
                compressors.playerDelta.remove(socket.id);
                io.emit('playerLeft', socket.id);
            }
        }
        Fruits.clearYamiBindsFor(socket.id);
        Fruits.clearGuraChargesFor(socket.id);

        const bb = State.blackbeard;
        if (bb) {
            if (bb.crowsPendingTarget === socket.id) bb.crowsPendingTarget = null;
            if (bb.crowsActiveTarget === socket.id) { bb.crowsActiveTarget = null; bb.crowsHitAt = 0; io.emit('crowsEnd', { id: socket.id }); }
        }
        if (State.burgess && State.burgess.targetId === socket.id) State.burgess.targetId = null;

        let remaining = Object.keys(State.players).filter(pid => !State.players[pid].disconnected);
        if (remaining.length === 0) resetGame();
        else if (socket.id === State.masterId) {
            State.masterId = remaining[0];
            io.emit('lobbyUpdated', { players: State.players, masterId: State.masterId });
        }
    });
});
}

module.exports = {
    wire, register,
    npcLines, endNpcTalk, sendNpcLine,
    hasAllMaheraItems, giveMaheraReward, giveTichReward
};
