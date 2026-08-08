// 파일명: core/netBoss.js
// ============================================================================
// 👹 보스 · 열매 네트워크 이벤트
//
//   🥊 박힌범     : hinbeomUpdate / syncMinions / minionSpawn / hakiBurst / hakiEnd
//   ⚫ 검은수염   : blackbeardUpdate / darkFloor / crows / gura / darkRise / descent
//   🟪 지저스 바제스 : burgessUpdate / burgessSpawn / Despawn / Telegraph / Jump / Blast
//   🍈 열매       : playerGura / guraCd / guraCharge / yamiSlash / yamiAbsorb /
//                   yamiCd / yamiSelfLock / yamiBind / yamiBindEnd
//   ⚡ 에넬 뇌영  : raigoPull
//
//   ⚠️ 카시모 이벤트는 netKashimo.js 가 담당한다 (여기에는 없다).
//   ⚠️ 보스 · 열매의 화면 흔들림은 기존대로 유지된다.
// ============================================================================

window.registerNetModule('boss', function (socket, U) {

    /** 🎯 보스 델타를 안전하게 병합하는 공통 함수 */
    const mergeBossDelta = (target, delta, fields) => {
        for (let i = 0; i < fields.length; i++) {
            let k = fields[i];
            if (delta[k] !== undefined) target[k] = delta[k];
        }
        if (delta.knockbackForce !== undefined) target.knockbackForce = delta.knockbackForce;
        if (delta.x !== undefined && Number.isFinite(delta.x)) target.x = delta.x;
        if (delta.y !== undefined && Number.isFinite(delta.y)) target.y = delta.y;
    };

    // 모든 보스가 공유하는 상태이상 · 전하 필드
    const STATUS = ['hp','maxHp','radius','state',
                    'frozenUntil','electrocutedUntil','airFreezeUntil','raigoPullUntil',
                    'burningUntil','maguBombUntil','justiceBombUntil',
                    'kashimoCharge','kashimoChargeUntil'];

    // ════════════════════════════════════════════════════════════════
    // 🥊 박힌범
    // ════════════════════════════════════════════════════════════════
    socket.on('hinbeomUpdate', (delta) => {
        if (!delta) return;
        if (!window.serverHinbeom) { window.serverHinbeom = delta; return; }
        mergeBossDelta(window.serverHinbeom, delta, STATUS.concat(['hakiActiveUntil']));
    });

    // 🐗 패기로 소환된 할배새끼 목록
    socket.on('syncMinions', (list) => { window.serverMinions = list || []; });

    socket.on('minionSpawn', (data) => {
        if (!data || !data.xs) return;
        for (let i = 0; i < data.xs.length; i++) {
            window.visualFX.push({ type: 'minion_spawn', x: data.xs[i], y: data.y, life: 26, maxLife: 26 });
        }
    });

    // 🥊 패왕색 패기 (영역 전체 연출)
    socket.on('hakiBurst', (data) => {
        if (!data) return;
        U.clearFXByType('haki_burst');
        let dur = data.duration || 4000;
        window.visualFX.push({
            type: 'haki_burst', x: data.x, y: data.y,
            area: data.area || window.HINBEOM_AREA,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    socket.on('hakiEnd', () => { U.clearFXByType('haki_burst'); });

    // ════════════════════════════════════════════════════════════════
    // ⚫ 검은수염
    // ════════════════════════════════════════════════════════════════
    socket.on('blackbeardUpdate', (delta) => {
        if (!delta) return;
        if (!window.serverBlackbeard) { window.serverBlackbeard = delta; return; }
        mergeBossDelta(window.serverBlackbeard, delta,
            STATUS.concat(['castingUntil','telegraphUntil','darkFloorUntil','risingUntil','descentUntil']));
    });

    // 🌊 암흑물질 장판 (블랙홀)
    socket.on('darkFloorStart', (data) => {
        if (!data) return;
        U.clearFXByType('dark_floor');
        let dur = data.duration || 4000;
        window.visualFX.push({
            type: 'dark_floor', x: data.x || 0, y: data.y || 0,
            area: data.area || window.DARK_AREA,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    socket.on('darkFloorEnd', () => { U.clearFXByType('dark_floor'); });

    // ⛓️ 크로우즈 예고선
    socket.on('crowsTelegraph', (data) => {
        if (!data) return;
        let dur = data.duration || 1000;
        window.visualFX.push({
            type: 'crows_telegraph',
            x: data.x, y: data.y, x2: data.x2, y2: data.y2,
            radius: data.thickness ? data.thickness / 2 : 202.5,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    // ⛓️ 크로우즈 흡인 시작 — 대상은 모든 조작이 봉인된다
    socket.on('crowsStart', (data) => {
        if (!data) return;
        let dur = data.duration || 420;
        // 🛟 흡인 시간은 아무리 길어도 3초를 넘지 않는다 (영구 잠금 차단)
        if (!Number.isFinite(dur) || dur <= 0 || dur > 3000) dur = 420;

        if (data.id === window.myId) {
            const p = window.myPlayer;
            p.crowsPullUntil = Date.now() + dur;
            p.crowsTargetX = Number.isFinite(data.destX) ? data.destX : p.x;
            p.crowsTargetY = Number.isFinite(data.destY) ? data.destY : p.y;
            p.isCasting = false; p.castLockUntil = 0;
            p.skill1Dashing = false; p.dashLockUntil = 0;
            p.yataActive = false; p.yataPath = null;
            p.skill3Active = false;
            p.moveX = 0; p.moveY = 0;
            window.joyX = 0; window.joyY = 0;
        }
        if (window.players[data.id]) {
            window.players[data.id].crowsPullUntil = Date.now() + dur;
            window.players[data.id].crowsTargetX = data.destX;
            window.players[data.id].crowsTargetY = data.destY;
        }

        window.visualFX.push({
            type: 'crows_beam',
            x: data.x, y: data.y, x2: data.x2, y2: data.y2,
            targetId: data.id, ownerId: data.ownerId || null,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    socket.on('crowsEnd', (data) => {
        if (!data) return;
        if (data.id === window.myId) window.myPlayer.crowsPullUntil = 0;
        if (window.players[data.id]) window.players[data.id].crowsPullUntil = 0;
        U.clearFXByTarget('crows_beam', data.id);
    });

    // 💥 검은수염 파공아
    socket.on('guraImpact', (data) => {
        if (!data) return;
        window.visualFX.push({
            type: 'gura_impact', x: data.x, y: data.y,
            radius: data.radius || 283, life: 34, maxLife: 34
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(520, 24, true);
    });

    // 🌑 공중 강림 — 상승
    socket.on('darkRise', (data) => {
        if (!data) return;
        let dur = data.duration || 2000;
        window.visualFX.push({
            type: 'dark_rise', x: data.x, y: data.fromY, y2: data.fromY, radius: data.toY,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(dur, 8, true);
    });

    // 🌑 공중 강림 — 지속 피해
    socket.on('descentStart', (data) => {
        if (!data) return;
        U.clearFXByType('dark_descent');
        let dur = data.duration || 5000;
        window.visualFX.push({
            type: 'dark_descent', x: data.x, y: data.y,
            area: data.area || window.DARK_AREA,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(dur, 11, true);
    });

    socket.on('descentEnd', () => { U.clearFXByType('dark_descent'); });

    // ════════════════════════════════════════════════════════════════
    // 🟪 지저스 바제스
    // ════════════════════════════════════════════════════════════════
    socket.on('burgessUpdate', (delta) => {
        if (!delta) return;
        if (!window.serverBurgess) { window.serverBurgess = delta; return; }
        mergeBossDelta(window.serverBurgess, delta,
            STATUS.concat(['fallingUntil','jumpTelegraphUntil','jumpingUntil',
                           'jumpTargetX','jumpTargetY','airborne']));
    });

    socket.on('burgessSpawn', (data) => {
        if (!data) return;
        window.visualFX.push({
            type: 'burgess_spawn', x: data.x, y: data.y,
            radius: data.radius || 76, life: 50, maxLife: 50
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(700, 12, true);
    });

    socket.on('burgessDespawn', () => {
        window.serverBurgess = null;
        U.clearFXByType('burgess_telegraph');
        U.clearFXByType('burgess_blast');
        U.clearFXByType('burgess_spawn');
        U.clearFXByType('burgess_jump');
    });

    socket.on('burgessTelegraph', (data) => {
        if (!data) return;
        let dur = data.duration || 700;
        window.visualFX.push({
            type: 'burgess_telegraph',
            x: data.x, y: data.y, groundY: data.groundY,
            radius: data.radius || 340,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    socket.on('burgessJump', (data) => {
        if (!data) return;
        let dur = data.duration || 320;
        window.visualFX.push({
            type: 'burgess_jump',
            x: data.fromX, y: data.fromY, x2: data.toX, y2: data.toY,
            radius: data.radius || 76, arc: data.arc || 520,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    socket.on('burgessBlast', (data) => {
        if (!data) return;
        window.visualFX.push({
            type: 'burgess_blast', x: data.x, y: data.y,
            radius: data.radius || 450, life: 34, maxLife: 34
        });
        if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(420, 20, true);
    });

    // ════════════════════════════════════════════════════════════════
    // 💥 흔들흔들열매 (플레이어 평타 파공아)
    // ════════════════════════════════════════════════════════════════
    socket.on('playerGura', (data) => {
        if (!data) return;
        if (data.super) {
            window.visualFX.push({
                type: 'gura_impact_super', x: data.x, y: data.y,
                radius: data.radius || 368, life: 46, maxLife: 46
            });
            if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(760, 34, false);
        } else {
            window.visualFX.push({
                type: 'gura_impact', x: data.x, y: data.y,
                radius: data.radius || 283, life: 34, maxLife: 34
            });
            if (typeof window.triggerScreenShake === 'function') window.triggerScreenShake(520, 24, false);
        }
    });

    socket.on('guraCd', (d) => {
        if (!d) return;
        window.myPlayer.guraCdEnd = d.until || 0;
    });

    // 💥 파공아 시전 경직 (0.5초) + ⚪ 흰색 아우라
    socket.on('guraCharge', (d) => {
        if (!d) return;
        let until = U.capUntil(d.until);

        if (d.id === window.myId) {
            const p = window.myPlayer;
            p.guraChargeUntil = until;
            if (until > 0) {
                p.isCasting = false; p.castLockUntil = 0;
                p.skill1Dashing = false; p.dashLockUntil = 0;
                p.moveX = 0; p.moveY = 0;
                window.joyX = 0; window.joyY = 0;
            }
        }
        if (window.players[d.id]) window.players[d.id].guraChargeUntil = until;

        if (until > 0) {
            let dur = d.duration || 500;
            window.visualFX.push({
                type: 'gura_charge_aura',
                ownerId: d.id,
                x: (d.x !== undefined) ? d.x : 0,
                y: (d.y !== undefined) ? d.y : 0,
                radius: 110,
                durationMs: dur,
                life: U.frames(dur), maxLife: U.frames(dur)
            });
        } else {
            U.clearFXByType('gura_charge_aura', d.id);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // ⛓️ 어둠어둠열매
    // ════════════════════════════════════════════════════════════════
    socket.on('yamiSlash', (data) => {
        if (!data) return;
        let dur = data.duration || 420;
        window.visualFX.push({
            type: 'yami_slash',
            x: data.x, y: data.y, x2: data.x2, y2: data.y2,
            ownerId: data.ownerId || null, radius: data.half || 95,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    socket.on('yamiAbsorb', (data) => {
        if (!data) return;
        let dur = data.duration || 2000;
        window.visualFX.push({
            type: 'yami_absorb',
            x: data.x, y: data.y,
            targetKind: data.targetKind || 'player', targetId: data.targetId,
            radius: data.radius || 90,
            durationMs: dur,
            life: U.frames(dur), maxLife: U.frames(dur)
        });
    });

    socket.on('yamiCd', (d) => {
        if (!d) return;
        window.myPlayer.yamiCdEnd = d.until || 0;
    });

    // ⛓️ 흡수 시전자 경직
    socket.on('yamiSelfLock', (d) => {
        if (!d) return;
        let until = U.capUntil(d.until);
        if (d.id === window.myId) {
            const p = window.myPlayer;
            p.yamiLockUntil = until;
            // ⚠️ until === 0 (해제 신호) 일 때는 조작을 건드리지 않는다
            if (until > 0) {
                p.isCasting = false; p.castLockUntil = 0;
                p.skill1Dashing = false; p.dashLockUntil = 0;
                p.moveX = 0; p.moveY = 0;
                window.joyX = 0; window.joyY = 0;
            }
        }
        if (window.players[d.id]) window.players[d.id].yamiLockUntil = until;
    });

    // ⛓️ 흡수 대상 속박
    socket.on('yamiBind', (d) => {
        if (!d) return;
        let until = U.capUntil(d.until);
        if (d.id === window.myId) {
            const p = window.myPlayer;
            p.yamiBindUntil = until;
            if (until > 0) {
                p.isCasting = false; p.castLockUntil = 0;
                p.skill1Dashing = false; p.dashLockUntil = 0;
                p.moveX = 0; p.moveY = 0;
                window.joyX = 0; window.joyY = 0;
            }
        }
        if (window.players[d.id]) window.players[d.id].yamiBindUntil = until;
    });

    socket.on('yamiBindEnd', (d) => {
        if (!d) return;
        if (d.id === window.myId) {
            window.myPlayer.yamiBindUntil = 0;
            window.myPlayer.yamiLockUntil = 0;
        }
        if (window.players[d.id]) window.players[d.id].yamiBindUntil = 0;
        U.clearFXByTarget('yami_absorb', d.id);
    });

    // ════════════════════════════════════════════════════════════════
    // ⚡ 에넬 뇌영 — 대상을 지면으로 끌어내린다
    // ════════════════════════════════════════════════════════════════
    socket.on('raigoPull', (data) => {
        if (!data) return;
        let until = U.capUntil(data.until);
        if (data.id === window.myId) {
            const p = window.myPlayer;
            p.raigoPullUntil = until;
            if (until > 0) {
                p.isCasting = false; p.castLockUntil = 0;
                p.skill1Dashing = false; p.dashLockUntil = 0;
                p.moveX = 0; p.moveY = 0;
            }
        } else if (window.players[data.id]) {
            window.players[data.id].raigoPullUntil = until;
        }
    });
});