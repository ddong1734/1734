// 파일명: core/netDaido.js
// ============================================================================
// ⚔️ 다이도 하가네 — 네트워크 수신
//
//   서버가 보내는 이벤트를 받아 검 이펙트를 띄운다.
//     · daidoFury        : 1번 [무자비]  1.5초 난무
//     · daidoRush        : 2번 [질풍참]  2초 돌진
//     · daidoRushTick    : 돌진 중 0.2초마다 베기
//     · daidoRushFinish  : 돌진 끝 360도 마무리
//     · daidoIaiCharge   : 3번 [일섬]   0.5초 발도 준비
//     · daidoIai         : [일섬] 전방 대참격
//     · daidoSpin        : 평타 3연타 마무리 (남이 쓴 것도 보이게)
//
//   ⚠️ 내가 쓴 3연타 마무리는 input.js 가 이미 그렸으므로 중복 생성하지 않는다.
// ============================================================================

window.registerNetModule('daido', function (socket, U) {

    const frames = (ms) => Math.max(1, Math.round(ms / (1000 / 60)));

    // ── ⚔️ 1번 [무자비] ────────────────────────────────────────────
    socket.on('daidoFury', (d) => {
        if (!d) return;
        const ms = d.durationMs || 1500;
        window.visualFX.push({
            id: d.id, type: 'daido_fury',
            x: d.x, y: d.y, radius: d.radius || 240,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
    });

    // ── 💨 2번 [질풍참] ────────────────────────────────────────────
    socket.on('daidoRush', (d) => {
        if (!d) return;
        const ms = d.durationMs || 2000;
        window.visualFX.push({
            id: d.id, type: 'daido_rush',
            x: d.x, y: d.y, dir: d.dir, hitRadius: d.hitRadius || 190,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
        // 돌진 중에는 조작이 봉인되므로 내 상태에도 반영한다
        if (d.id === window.myId) {
            window.myPlayer.daidoRush = true;
            window.myPlayer.daidoRushEnd = Date.now() + ms;
        } else if (window.players[d.id]) {
            window.players[d.id].daidoRush = true;
            window.players[d.id].daidoRushEnd = Date.now() + ms;
        }
    });

    socket.on('daidoRushTick', (d) => {
        if (!d) return;
        window.visualFX.push({
            id: d.id, type: 'daido_rush_tick',
            x: d.x, y: d.y, radius: d.radius || 190,
            durationMs: 220, life: 14, maxLife: 14
        });
    });

    socket.on('daidoRushFinish', (d) => {
        if (!d) return;
        window.visualFX.push({
            id: d.id, type: 'daido_rush_finish',
            x: d.x, y: d.y, radius: d.radius || 330,
            durationMs: 520, life: 32, maxLife: 32
        });
        if (d.id === window.myId) {
            window.myPlayer.daidoRush = false;
            window.myPlayer.daidoRushEnd = 0;
        } else if (window.players[d.id]) {
            window.players[d.id].daidoRush = false;
            window.players[d.id].daidoRushEnd = 0;
        }
    });

    // ── ⚡ 3번 [일섬] ──────────────────────────────────────────────
    socket.on('daidoIaiCharge', (d) => {
        if (!d) return;
        const ms = d.castMs || 500;
        window.visualFX.push({
            id: d.id, type: 'daido_iai_charge',
            x: d.x, y: d.y, dir: d.dir,
            range: d.range || 620, thickness: d.thickness || 300,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
    });

    socket.on('daidoIai', (d) => {
        if (!d) return;
        window.visualFX.push({
            id: d.id, type: 'daido_iai',
            x: d.x, y: d.y, dir: d.dir,
            range: d.range || 620, thickness: d.thickness || 300,
            durationMs: 520, life: 32, maxLife: 32
        });
    });

    // ── ⚔️ 타격마다 날아가는 검기 한 줄기 ──────────────────────────
    //    [무자비] 15회(도좌마 이상 20회) · [질풍참] 5회(7회) 만큼 나온다.
    socket.on('daidoSwing', (d) => {
        if (!d) return;
        window.visualFX.push({
            id: d.id, type: 'daido_swing',
            x: d.x, y: d.y, angle: d.angle || 0, radius: d.radius || 200,
            durationMs: 300, life: 18, maxLife: 18
        });
    });

    // ── 🌀 평타 3연타 마무리 ───────────────────────────────────────
    socket.on('daidoSpin', (d) => {
        if (!d) return;
        // 내가 쓴 것은 input.js 가 이미 그렸다
        if (d.id === window.myId) return;
        const ms = d.durationMs || 500;
        window.visualFX.push({
            id: d.id, type: 'daido_spin',
            x: d.x, y: d.y, radius: d.radius || 170,
            durationMs: ms, life: frames(ms), maxLife: frames(ms)
        });
    });
});
