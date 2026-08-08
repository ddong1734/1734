// 파일명: core/network.js
// ============================================================================
// 🔌 네트워크 진입점
//
//  실제 소켓 핸들러는 역할별 모듈로 분리되어 있다 (전부 core/ 폴더).
//      core/netUtils.js   : 공용 유틸 + 모듈 등록기   ← 가장 먼저 로드
//      core/netLobby.js   : 로비 · 게임 시작 · 재접속 · 게임 종료
//      core/netPlayer.js  : 플레이어 동기화 · 사망/부활 · 피해/회복 · 이펙트
//      core/netWorld.js   : 넥서스 · 탐지기 · 상점 · 투사체 · 몬스터 · 포탈
//      core/netBoss.js    : 박힌범 · 검은수염 · 바제스 · 열매
//      core/netKashimo.js : ⚡ 카시모 전용 이벤트
//      core/netPing.js    : 핑 측정
//
//  이 파일은 '조립'만 한다.
//
// 🛟 [게임 멈춤 방지] 연결이 끊기거나 재연결되면 모든 잠금을 즉시 초기화한다.
//    한 모듈에서 예외가 나도 나머지 모듈은 정상 등록되도록 감싼다.
// ============================================================================

window.initNetwork = (socket) => {
    const U = window.NetUtils;
    if (!U) {
        console.error('[NET] netUtils.js 가 로드되지 않았습니다. index.html 의 스크립트 순서를 확인하세요.');
        return;
    }

    // 🛟 잠금 해제 함수를 전역에 노출 (main.js 워치독 · 다른 모듈이 쓴다)
    window.releaseAllLocks = U.releaseAllLocks;

    // ── 🛟 연결 상태에 따른 잠금 복구 (모듈보다 먼저 건다) ────────────
    socket.on('disconnect', () => { U.releaseAllLocks('서버 연결 끊김'); });
    socket.on('connect', () => { if (window.gameLoopStarted) U.releaseAllLocks('서버 재연결'); });
    if (socket.io && socket.io.on) {
        socket.io.on('reconnect', () => { if (window.gameLoopStarted) U.releaseAllLocks('소켓 재연결'); });
    }

    // ── 🧩 등록된 모듈을 순서대로 실행 ───────────────────────────────
    const mods = window.NET_MODULES || [];
    if (mods.length === 0) {
        console.error('[NET] 등록된 네트워크 모듈이 없습니다. core/net*.js 로드를 확인하세요.');
    }
    for (let i = 0; i < mods.length; i++) {
        let m = mods[i];
        try {
            m.fn(socket, U);
        } catch (e) {
            console.error('[NET:' + m.name + '] 모듈 초기화 실패', e);
        }
    }

    console.log('[NET] 네트워크 모듈 ' + mods.length + '개 초기화 완료:',
                mods.map(m => m.name).join(', '));
};