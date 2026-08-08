// 파일명: core/netKashimo.js
// ============================================================================
// ⚡ 카시모 하지메 전용 네트워크 이벤트
//
//  ✅ 카시모의 모든 스킬은 화면 흔들림(triggerScreenShake)을 발생시키지 않는다.
//
//   · kashimoCharge         : 🔋 전하 스택 갱신 (지속 5초)
//   · kashimoCounter        : 🔌 반격 전류 (플레이어 · 오크라)
//   · kashimoBoltCast       : ⚡ 1번 스킬 시전 섬광 (🏵️ 여의 반영)
//   · kashimoBoltHit        : ⚡ 번개 적중 전격
//   · kashimoSkyBolt        : ⚡✨ 대기를 가르는 번개 (관통)
//   · kashimoSurgeStart/End : ⚡🌋 주력 방출 (시전 중 완전 고정 · 🏵️ 여의 범위)
//   · kashimoAmberStart/End : ⚡🔮 환수호박
//   · kashimoAmberTrail     : ⚡🔮 전기 잔상
//   · kashimoBlink          : ⚡🔮 [신규] 전격 순간이동 (출발↔도착 전류)
//   · kashimoBlinkBlast     : ⚡🔮 [신규] 순간이동 도착지 전기폭발
//   · kashimoWaveCast/Blast : ⚡🔮 전자파 연쇄 폭발
//   · kashimoWaveEcho       : ⚡🌩️ [신규] 뇌신 재폭발 (0.3초 뒤 전체 자리)
//   · kashimoSonicCharge/Fire : ⚡🔮 음파 (경직 0.5초 · 🌩️ 번개 7발)
// ============================================================================

window.registerNetModule('kashimo', function (socket, U) {

    // ── 🔋 전하 스택 갱신 ────────────────────────────────────────────
    socket.on('kashimoCharge', (d) => {
        if (!d) return;
        U.applyCharge(d.targetKind || 'player', d.targetId, d.charge || 0, d.until || 0);
    });

    // ── 🔌 반격 전류 ─────────────────────────────────────────────────
    socket.on('kashimoCounter', (d) => {
        if (!d) return;
        let dur = d.duration || 320;
        window.visualFX.push({
            type: 'kashimo_counter',
            x: d.x, y: d.y,
            ownerId: d.ownerId || null,
            targetKind: d.targetKind || 'player',
            targetId: d.targetId,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    // ── ⚡ 1번 스킬 시전 섬광 (흔들림 없음 · 🏵️ 여의 반영) ──────────
    socket.on('kashimoBoltCast', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'kashimo_bolt_cast',
            x: d.x, y: d.y, dir: d.dir || 1, ownerId: d.id,
            // 🏵️ 여의 : 섬광이 더 크고 밝아진다
            yeoui: !!d.yeoui,
            durationMs: 260,
            life: 16, maxLife: 16
        });
    });

    // ── ⚡ 번개 적중 전격 ────────────────────────────────────────────
    socket.on('kashimoBoltHit', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'kashimo_bolt_hit',
            x: d.x, y: d.y, ownerId: d.ownerId || null,
            durationMs: 300,
            life: 18, maxLife: 18
        });
    });

    // ── ⚡✨ 대기를 가르는 번개 (관통 · 흔들림 없음) ─────────────────
    socket.on('kashimoSkyBolt', (d) => {
        if (!d) return;
        let dur = d.duration || 700;
        window.visualFX.push({
            type: 'kashimo_sky_bolt',
            x: d.x, y: d.y,                                   // 지목한 대상 좌표
            x2: (d.originX !== undefined) ? d.originX : d.x,   // 시전자(발사 지점)
            y2: (d.originY !== undefined) ? d.originY : d.y,
            // ✅ 관통 : 번개가 실제로 도달하는 끝점과 두께
            endX: (d.endX !== undefined) ? d.endX : null,
            endY: (d.endY !== undefined) ? d.endY : null,
            radius: (d.thickness !== undefined) ? d.thickness : 150,
            ownerId: d.ownerId || null,
            targetKind: d.targetKind || 'player', targetId: d.targetId,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    // ── ⚡🌋 주력 방출 시작 (완전 고정 · 🏵️ 여의 범위 · 흔들림 없음) ─
    socket.on('kashimoSurgeStart', (d) => {
        if (!d) return;
        let dur = d.duration || 4000;
        U.clearSurgeFX(d.id);

        let until = Date.now() + dur;
        if (d.id === window.myId) {
            window.myPlayer.surgeActive = true;
            window.myPlayer.surgeEnd = until;
            window.myPlayer.surgeLockUntil = until;      // ✅ 이동 · 스킬 · 평타 봉인
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
        }
        if (window.players[d.id]) {
            window.players[d.id].surgeActive = true;
            window.players[d.id].surgeEnd = until;
            window.players[d.id].surgeLockUntil = until;
        }

        window.visualFX.push({
            type: 'kashimo_surge',
            x: d.x, y: d.y,
            ownerId: d.id,
            radius: d.width || 720,        // 🏵️ 여의면 서버가 1150 을 보낸다
            arc: d.height || 900,
            yeoui: !!d.yeoui,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    // ── ⚡🌋 주력 방출 종료 ──────────────────────────────────────────
    socket.on('kashimoSurgeEnd', (d) => {
        if (!d) return;
        if (d.id === window.myId) {
            window.myPlayer.surgeActive = false;
            window.myPlayer.surgeEnd = 0;
            window.myPlayer.surgeLockUntil = 0;
        }
        if (window.players[d.id]) {
            window.players[d.id].surgeActive = false;
            window.players[d.id].surgeEnd = 0;
            window.players[d.id].surgeLockUntil = 0;
        }
        U.clearSurgeFX(d.id);
    });

    // ── ⚡🔮 환수호박 발동 (흔들림 없음) ─────────────────────────────
    socket.on('kashimoAmberStart', (d) => {
        if (!d) return;

        if (d.id === window.myId) {
            window.myPlayer.amberActive = true;
            // 🔮 전용 스킬은 즉시 사용 가능
            window.myPlayer.cd1 = 0;
            window.myPlayer.cd2 = 0;
            window.myPlayer.waveCdEnd = 0;
            window.myPlayer.sonicCdEnd = 0;
            window.myPlayer.sonicChargeUntil = 0;
            window.myPlayer.blinkCdEnd = 0;
            // 🔮 1·2번이 전용 스킬로 바뀌고 3번은 사라진다
            if (typeof window.applySkillNames === 'function') window.applySkillNames();
        }
        if (window.players[d.id]) window.players[d.id].amberActive = true;

        U.startAmberFX(d.id);
    });

    // ── ⚡🔮 환수호박 해제 (사망 시에만) ─────────────────────────────
    socket.on('kashimoAmberEnd', (d) => {
        if (!d) return;

        if (d.id === window.myId) {
            window.myPlayer.amberActive = false;
            window.myPlayer.sonicChargeUntil = 0;
            window.myPlayer.blinkCdEnd = 0;
            window.myPlayer.cd1 = 0;
            window.myPlayer.cd2 = 0;
            window.myPlayer.cd3 = 0;              // 🔮 3번 스킬이 다시 생겨난다
            window.myPlayer.amberCdEnd = 0;
            if (typeof window.applySkillNames === 'function') window.applySkillNames();
        }
        if (window.players[d.id]) window.players[d.id].amberActive = false;

        U.clearAmberFX(d.id);
        U.clearAmberTrailFX(d.id);
    });

    // ── ⚡🔮 환수호박 전기 잔상 ──────────────────────────────────────
    socket.on('kashimoAmberTrail', (d) => {
        if (!d) return;
        let dur = d.duration || 2000;
        window.visualFX.push({
            type: 'kashimo_amber_trail',
            x: d.x, y: d.y,
            ownerId: d.ownerId || null,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    // ── ⚡🔮 [신규] 전격 순간이동 — 출발지 ↔ 도착지 사이 전류 ────────
    socket.on('kashimoBlink', (d) => {
        if (!d) return;
        let dur = d.duration || 380;

        // 🛟 내 캐릭터라면 로컬 좌표도 즉시 맞춘다 (teleport 이벤트와 이중 안전망)
        if (d.ownerId === window.myId) {
            if (Number.isFinite(d.toX)) window.myPlayer.x = d.toX;
            if (Number.isFinite(d.toY)) window.myPlayer.y = d.toY;
            window.myPlayer.vy = 0;
            window.myPlayer.knockbackForce = 0;
            window._lastSentPos = { x: window.myPlayer.x, y: window.myPlayer.y };
        }
        // 다른 플레이어라면 보간을 건너뛰고 즉시 스냅한다 (순간이동이므로)
        if (window.players[d.ownerId] && d.ownerId !== window.myId) {
            U.snapTo(window.players[d.ownerId], d.toX, d.toY);
        }

        window.visualFX.push({
            type: 'kashimo_blink',
            x: d.fromX, y: d.fromY,
            x2: d.toX, y2: d.toY,
            ownerId: d.ownerId || null,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    // ── ⚡🔮 [신규] 순간이동 도착지 전기폭발 ─────────────────────────
    socket.on('kashimoBlinkBlast', (d) => {
        if (!d) return;
        let dur = d.duration || 340;
        window.visualFX.push({
            type: 'kashimo_blink_blast',
            x: d.x, y: d.y,
            ownerId: d.ownerId || null,
            radius: d.radius || 190,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    // ── ⚡🔮 전자파 시전 (흔들림 없음) ───────────────────────────────
    socket.on('kashimoWaveCast', (d) => {
        if (!d) return;
        window.visualFX.push({
            type: 'kashimo_bolt_cast',
            x: d.x, y: d.y, dir: d.dir || 1, ownerId: d.id,
            yeoui: !!d.raijin,          // 🌩️ 뇌신이면 섬광을 더 크게
            durationMs: 260,
            life: 16, maxLife: 16
        });
    });

    // ── ⚡🔮 전자파 연쇄 폭발 하나 ───────────────────────────────────
    socket.on('kashimoWaveBlast', (d) => {
        if (!d) return;
        let dur = d.duration || 320;
        window.visualFX.push({
            type: 'kashimo_wave_blast',
            x: d.x, y: d.y,
            ownerId: d.ownerId || null,
            radius: d.radius || 135,
            val: d.index || 0,               // 폭발 순번 (연출 시드)
            raijin: !!d.raijin,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    // ── ⚡🌩️ [신규] 뇌신 재폭발 — 0.3초 뒤 전체 자리 동시 폭발 ──────
    socket.on('kashimoWaveEcho', (d) => {
        if (!d) return;
        let dur = d.duration || 320;
        window.visualFX.push({
            type: 'kashimo_wave_echo',
            x: d.x, y: d.y,
            ownerId: d.ownerId || null,
            radius: d.radius || 175,
            val: d.index || 0,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    // ── ⚡🔮 음파 응축 (0.5초 경직) ──────────────────────────────────
    socket.on('kashimoSonicCharge', (d) => {
        if (!d) return;
        let until = U.capUntil(Date.now() + (d.duration || 500));

        if (d.id === window.myId) {
            window.myPlayer.sonicChargeUntil = until;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
        }
        if (window.players[d.id]) window.players[d.id].sonicChargeUntil = until;

        let dur = d.duration || 500;
        window.visualFX.push({
            type: 'kashimo_sonic_charge',
            x: d.x, y: d.y, dir: d.dir || 1,
            ownerId: d.id,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    // ── ⚡🔮 음파 발사 (부채꼴 · 🌩️ 번개 7발 · 흔들림 없음) ─────────
    socket.on('kashimoSonicFire', (d) => {
        if (!d) return;
        let dur = d.duration || 520;

        if (d.ownerId === window.myId) window.myPlayer.sonicChargeUntil = 0;
        if (window.players[d.ownerId]) window.players[d.ownerId].sonicChargeUntil = 0;

        window.visualFX.push({
            type: 'kashimo_sonic',
            x: d.x, y: d.y, dir: d.dir || 1,
            ownerId: d.ownerId || null,
            radius: d.range || 900,          // 부채꼴 반경
            arc: d.angle || 1.9478,          // 부채꼴 전체 각도
            raijin: !!d.raijin,              // 🌩️ 뇌신이면 더 화려하게
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });
});