// 파일명: core/netPing.js
// ============================================================================
// 📶 핑(왕복 지연시간) 측정
//    1초마다 서버에 타임스탬프를 보내고, 되돌아온 값으로 RTT 를 계산한다.
//    값은 지수 이동 평균으로 부드럽게 만들어 UI 가 요동치지 않게 한다.
// ============================================================================

window.registerNetModule('ping', function (socket, U) {

    window.myPing = 0;

    const sendPingCheck = () => {
        if (socket.connected) socket.emit('pingCheck', Date.now());
    };

    socket.on('pongCheck', (ts) => {
        if (typeof ts !== 'number') return;
        let rtt = Math.max(0, Date.now() - ts);
        // 지수 이동 평균 (이전 60% + 이번 40%)
        window.myPing = (window.myPing > 0) ? Math.round(window.myPing * 0.6 + rtt * 0.4) : rtt;
        if (typeof window.updatePingUI === 'function') window.updatePingUI(window.myPing);
    });

    socket.on('connect', sendPingCheck);
    if (socket.connected) sendPingCheck();

    if (window._pingInterval) clearInterval(window._pingInterval);
    window._pingInterval = setInterval(sendPingCheck, 1000);
});