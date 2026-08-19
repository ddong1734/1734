// 파일명: core/input.js - 조이스틱 및 버튼 입력 처리 전담
//
// ⚠️ [수정 내역 — 2곳]
//  1-A) moveKnob() 이 window.joyX / joyY 에 '입력 원본'을 보관한다.
//  1-B) release() 의 isElThorLocked() 조기 return 제거.
// ⚫ [검은수염] 크로우즈에 끌려가는 동안 모든 행동 봉인 + 암흑물질 장판 위 점프력 70% 감소
// 🍈 [열매] 어둠 흡수(시전자·대상) / 파공아 시전 경직 동안에도 모든 행동 봉인
// 🗣️ [NPC] 대화 중에는 이동 · 점프 · 평타 · 스킬이 전부 봉인된다
//
// 🛟 [게임 멈춤 방지]
//   시전 잠금을 걸 때 반드시 '만료 시각(castLockUntil / dashLockUntil)'을 함께
//   기록한다. main.js 의 워치독이 이 값을 보고 타이머 없이도 잠금을 푼다.
//
// ⚡ [카시모 하지메]
//   · 평타 : 보랏빛 전격 타격(kashimo_strike)
//            ⚡🔮 환수호박 중이면 조이스틱 방향으로 '전격 돌진'이 나간다.
//   · 1번  : 번개 / 2번 : 주력 방출(3초) / 3번 : 환수호박
//
// ⬛ [다부라 카라바]
//   · 1번 [빛]           : 위로 솟구친 뒤 공중에 고정된 채 2초 연속폭발 (조작 봉인)
//   · 2번 [어둠]         : ✅ [수정] 시전자는 3초 동안 완전히 고정된다 (조작 봉인)
//   · 3번 [아광속 발차기] : 2초 응축(완전 고정) → 5초 활공
//                          (활공 중에는 조이스틱으로만 움직이고 점프·평타 불가)

window.initControls = (socket) => {
    if (window.controlsInitialized) return; window.controlsInitialized = true;
    const zone = document.getElementById('joystickZone'); const knob = document.getElementById('knob');
    let activeId = null; const maxR = 40;

    /** 🛟 시전 잠금을 '만료 시각'과 함께 건다 (타이머 유실에도 안전) */
    const beginCast = (durationMs, extraMs) => {
        let now = Date.now();
        window.myPlayer.isCasting = true;
        window.myPlayer.castLockUntil = now + (durationMs || 0) + (extraMs === undefined ? 500 : extraMs);
    };
    /** 🛟 시전 잠금을 해제한다 (setTimeout 정상 경로) */
    const endCast = () => {
        window.myPlayer.isCasting = false;
        window.myPlayer.castLockUntil = 0;
    };

    const isSkill3Aiming = () => window.myPlayer.isCasting && window.myPlayer.characterType === 'BORSALINO' && Date.now() < (window.myPlayer.skill3EndTime || 0);
    const isElThorLocked = () => window.myPlayer.characterType === 'ENEL' && Date.now() < (window.myPlayer.elThorLockUntil || 0);
    const isCrowsPulled = () => Date.now() < (window.myPlayer.crowsPullUntil || 0);
    const isFruitLocked = () => {
        let now = Date.now();
        return now < (window.myPlayer.yamiLockUntil || 0)
            || now < (window.myPlayer.yamiBindUntil || 0)
            || now < (window.myPlayer.guraChargeUntil || 0);
    };
    // ⚡🔮 음파 응축(0.5초) 중에는 모든 조작이 봉인된다
    const isSonicCharging = () => Date.now() < (window.myPlayer.sonicChargeUntil || 0);
    // ⚡🌋 주력 방출 중에는 이동 · 스킬 · 평타가 모두 봉인된다
    const isSurgeLocked = () => Date.now() < (window.myPlayer.surgeLockUntil || 0);
    // 🗣️ NPC 대화 중에는 모든 조작이 봉인된다
    const isNpcTalking = () => !!window.myPlayer.npcTalking;
    // ⚡🔮 환수호박 각성 상태인가
    const isAmber = () => window.myPlayer.characterType === 'KASHIMO' && !!window.myPlayer.amberActive;
    // ⚡🔮 전격 돌진 중인가
    const isAmberDashing = () => Date.now() < (window.myPlayer.amberDashUntil || 0);

    // ⬛ 다부라 : [빛] 시전 중인가
    const isDLight = () => !!window.myPlayer.dLightActive;
    // ⬛ 다부라 : [어둠] 시전 중인가 (✅ 3초간 완전 고정)
    const isDDark = () => !!window.myPlayer.dDarkActive && Date.now() < (window.myPlayer.dDarkEnd || 0);
    // ⬛ 다부라 : [아광속 발차기] 응축 중인가
    const isDKickCharging = () => !!window.myPlayer.dKickCharging;
    // ⬛ 다부라 : [아광속 발차기] 비행 중인가
    const isDKickFlying = () => !!window.myPlayer.dKickFlying;

    // 🗡️ 세계를 가르는 참격 : 0.5초 경직 중에는 모든 조작이 봉인된다
    const isCleaveCasting = () => !!window.myPlayer.cleaveCasting && Date.now() < (window.myPlayer.cleaveCastEnd || 0);

    // 🌑 유명이경 역월 : 1초 시전 경직 중에는 모든 조작이 봉인된다
    const isYumCasting = () => !!window.myPlayer.yumCasting && Date.now() < (window.myPlayer.yumCastEnd || 0);

    // ⚔️ 다이도 : 질풍참 돌진 · 무자비 난무 · 일섬 발도 중에는 조작이 봉인된다
    //    (돌진 중에는 공중에 떠 있을 수 있으므로 물리는 막지 않는다)
    const isDaidoLocked = () => {
        const now = Date.now();
        if (window.myPlayer.daidoRush && now < (window.myPlayer.daidoRushEnd || 0)) return true;
        if (window.myPlayer.daidoFury && now < (window.myPlayer.daidoFuryEnd || 0)) return true;
        if (window.myPlayer.daidoIaiAt && now < window.myPlayer.daidoIaiAt) return true;
        return false;
    };

    /** 🛟 모든 조작을 막아야 하는 상태인가 (공통 판정) */
    const isFullyLocked = () => isCrowsPulled() || isFruitLocked() || isSonicCharging()
                             || isSurgeLocked() || isNpcTalking()
                             || isDLight() || isDDark() || isDKickCharging()
                             || isCleaveCasting() || isYumCasting()
                             || isDaidoLocked();

    zone.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (window.myPlayer.isDead) return;
        if (isElThorLocked()) return;
        // 💫 비행 중에는 조이스틱을 계속 써야 하므로 잠금에서 제외한다
        if (isFullyLocked()) return;
        activeId = e.pointerId; zone.setPointerCapture(e.pointerId); moveKnob(e);
    });

    zone.addEventListener('pointermove', (e) => {
        if (activeId !== e.pointerId || window.myPlayer.isDead) return;
        e.preventDefault();
        if (isElThorLocked()) return;
        if (isFullyLocked()) return;
        // 💫 비행 중에는 isCasting 이 아니므로 그대로 통과한다
        if ((window.myPlayer.isCasting && !isSkill3Aiming()) || window.myPlayer.skill1Dashing) return;
        moveKnob(e);
    });

    const moveKnob = (e) => { 
        const rect = zone.getBoundingClientRect(); const cx = rect.left + rect.width/2; const cy = rect.top + rect.height/2; 
        let dx = e.clientX - cx; let dy = e.clientY - cy; let d = Math.hypot(dx, dy); 
        if(d > maxR) { dx = (dx/d)*maxR; dy = (dy/d)*maxR; } 
        knob.style.transform = `translate(${dx}px, ${dy}px)`; 
        window.joyX = dx / maxR;                    // ★ 1-A 추가: 입력 원본 보관
        window.joyY = dy / maxR;                    // ★ 1-A 추가
        window.myPlayer.moveX = window.joyX; 
        window.myPlayer.moveY = window.joyY;
    };

    // ★ 1-B 수정: isElThorLocked() 조기 return 제거 + joyX/joyY 초기화
    const release = (e) => { if(activeId === e.pointerId) { activeId = null; knob.style.transform = 'translate(0px, 0px)'; window.joyX = 0; window.joyY = 0; window.myPlayer.moveX = 0; window.myPlayer.moveY = 0; }};
    zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release);

    // 🛟 포인터를 잡은 채 창을 벗어나거나 화면이 꺼지면 입력이 눌린 상태로 굳는다.
    const forceRelease = () => {
        activeId = null;
        knob.style.transform = 'translate(0px, 0px)';
        window.joyX = 0; window.joyY = 0;
        window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
        clearInterval(window.autoAttackInterval);
    };
    window.addEventListener('blur', forceRelease);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') forceRelease(); });

    document.getElementById('btn-jump').addEventListener('pointerdown', (e) => { 
        e.preventDefault();
        if (Date.now() < window.myPlayer.frozenUntil || window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.skill1Dashing) return; 
        if (Date.now() < (window.myPlayer.raigoPullUntil || 0)) return; 
        if (isFullyLocked()) return;
        if (isAmberDashing()) return;                 // ⚡🔮 돌진 중에는 점프 불가
        if (isDKickFlying()) return;                  // 💫 활공 중에는 점프 불필요
        
        // 🕊️ [쿠루스 하나] 점프가 없다. 누르고 있는 동안 천천히 떠오른다.
        if (window.myPlayer.characterType === 'KURUSU') {
            window.myPlayer.kurusuGliding = true;
            if (window.socket) window.socket.emit('kurusuGlide', { up: true });
            return;
        }

        if (window.myPlayer.jumpCount > 0) { 
            let jumpV = (Date.now() < window.myPlayer.jumpNerfUntil) ? (-13 * window.ms) : (-18 * window.ms);
            if (typeof window.isDarkFloorActiveFor === 'function' && window.isDarkFloorActiveFor(window.myPlayer)) jumpV *= 0.3;
            window.myPlayer.vy = Math.min(window.myPlayer.vy, jumpV); 
            window.myPlayer.jumpCount--; 
        } 
    });

    // 🕊️ [쿠루스 하나] 손가락을 떼면 천천히 내려온다
    const stopGlide = () => {
        if (!window.myPlayer || window.myPlayer.characterType !== 'KURUSU') return;
        if (!window.myPlayer.kurusuGliding) return;
        window.myPlayer.kurusuGliding = false;
        if (window.socket) window.socket.emit('kurusuGlide', { up: false });
    };
    document.getElementById('btn-jump').addEventListener('pointerup', stopGlide);
    document.getElementById('btn-jump').addEventListener('pointercancel', stopGlide);
    document.getElementById('btn-jump').addEventListener('pointerleave', stopGlide);

    const triggerAttack = () => {
        let now = Date.now();
        if (now < window.myPlayer.frozenUntil || window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.skill1Dashing || now < (window.myPlayer.lightDashUntil || 0)) return; 
        if (now < (window.myPlayer.raigoPullUntil || 0)) return; 
        if (isFullyLocked()) return;
        if (isDKickFlying()) return;                  // 💫 활공 중에는 평타 불가
        
        let charType = window.myPlayer.characterType || 'PARK';

        // ⚡🔮 환수호박 중이면 평타 대신 '전격 돌진'이 나간다.
        if (isAmber()) {
            const KS3 = window.GameData.Skills.KASHIMO_S3 || {};
            let dashCd = KS3.dashCooldown || 400;
            let dashDur = KS3.dashDuration || 200;
            if (now < (window.myPlayer.dashCdEnd || 0)) return;
            if (now < (window.myPlayer.amberDashUntil || 0)) return;
            window.myPlayer.dashCdEnd = now + dashCd;

            let dirX = window.joyX || 0;
            let dirY = window.joyY || 0;
            if (Math.hypot(dirX, dirY) < 0.05) { dirX = window.myPlayer.lastFacing; dirY = 0; }

            let ln = Math.hypot(dirX, dirY) || 1;
            window.myPlayer.amberDashDirX = dirX / ln;
            window.myPlayer.amberDashDirY = dirY / ln;
            window.myPlayer.amberDashUntil = now + dashDur;

            socket.emit('action', {
                type: 'kashimo_amber_dash',
                x: window.myPlayer.x, y: window.myPlayer.y,
                dir: window.myPlayer.lastFacing,
                dirX: dirX, dirY: dirY,
                lifeFrames: 12
            });
            return;
        }

        let defaultCd = window.GameData.Characters[charType].attackCooldown; 
        let spd = window.myPlayer.attackSpeedMult || 1.0; 
        let cool = defaultCd / spd; 
        let sd = (window.GameData.Characters[charType].attackSlowDuration) / spd;
        let effectLife = Math.max(5, Math.round(cool / (1000 / 60))); 
        
        if (now - window.lastAttackTime >= cool) { 
            window.lastAttackTime = now; if (window.myPlayer.vy === 0) window.slowUntil = now + sd; 
            
            let effectType = charType === 'BORSALINO' ? 'ama_no_murakumo'
                           : (charType === 'KUZAN' ? 'ice_glove'
                           : (charType === 'SAKAZUKI' ? 'magma_punch'
                           : (charType === 'ENEL' ? 'thunder_bolt'
                           : (charType === 'KASHIMO' ? 'kashimo_strike'
                           : (charType === 'DABURA' ? 'dabura_strike'
                           : (charType === 'DAIDO' ? 'daido_slash'
                           : (charType === 'KURUSU' ? 'kurusu_strike' : 'punch')))))));
            
            if (charType === 'BORSALINO') {
                let comboGap = now - window.borsLastComboTime;
                let comboWindow = cool * 2.5; 
                if (window.borsLastComboTime > 0 && comboGap <= comboWindow) window.borsComboCount++;
                else window.borsComboCount = 1;
                window.borsLastComboTime = now;

                if (window.borsComboCount >= 3) {
                    window.borsComboCount = 0;
                    window.myPlayer.lightDashUntil = now + 220;
                    window.myPlayer.lightDashDir = window.myPlayer.lastFacing;
                    window.visualFX.push({ type: 'light_dash', x: window.myPlayer.x, y: window.myPlayer.y, life: 20, maxLife: 20, dir: window.myPlayer.lastFacing });
                    socket.emit('borsLightDash', { dir: window.myPlayer.lastFacing }); 
                    
                    socket.emit('action', { type: 'light_dash_attack', x: window.myPlayer.x + (window.myPlayer.lastFacing * 30), y: window.myPlayer.y, dir: window.myPlayer.lastFacing, lifeFrames: 20 });
                } else {
                    window.visualFX.push({ x: window.myPlayer.x + (window.myPlayer.lastFacing * 60), y: window.myPlayer.y, life: effectLife, maxLife: effectLife, type: effectType, isLeft: window.myPlayer.lastFacing === -1, team: window.myPlayer.team, dir: window.myPlayer.lastFacing });
                    socket.emit('action', { type: effectType, x: window.myPlayer.x + (window.myPlayer.lastFacing * 60), y: window.myPlayer.y, dir: window.myPlayer.lastFacing, lifeFrames: effectLife });
                }
            } else if (charType === 'DAIDO') {
                // ⚔️ 다이도 연타 — 볼사리노와 같은 판정(쿨타임 × 2.5 안에 이어치면 연타)
                //    🗡️ 도좌마 이상을 장착하면 3연타 → 2연타로 빨라진다.
                let dGap = now - window.daidoLastComboTime;
                let dWindow = cool * 2.5;
                if (window.daidoLastComboTime > 0 && dGap <= dWindow) window.daidoComboCount++;
                else window.daidoComboCount = 1;
                window.daidoLastComboTime = now;

                let comboNeed = window.myPlayer.hasDojwama ? 2 : 3;
                if (window.daidoComboCount >= comboNeed) {
                    window.daidoComboCount = 0;
                    // 🌀 세 번째 평타는 짧은 전방위 베기로 바뀐다 (경직 없음)
                    window.visualFX.push({
                        type: 'daido_spin', id: window.myId,
                        x: window.myPlayer.x, y: window.myPlayer.y,
                        radius: 170, life: 30, maxLife: 30
                    });
                    socket.emit('daidoCombo', { x: window.myPlayer.x, y: window.myPlayer.y });
                } else {
                    window.visualFX.push({ x: window.myPlayer.x + (window.myPlayer.lastFacing * 60), y: window.myPlayer.y, life: effectLife, maxLife: effectLife, type: effectType, isLeft: window.myPlayer.lastFacing === -1, team: window.myPlayer.team, dir: window.myPlayer.lastFacing });
                    socket.emit('action', { type: effectType, x: window.myPlayer.x + (window.myPlayer.lastFacing * 60), y: window.myPlayer.y, dir: window.myPlayer.lastFacing, lifeFrames: effectLife });
                }
            } else {
                window.visualFX.push({ x: window.myPlayer.x + (window.myPlayer.lastFacing * 60), y: window.myPlayer.y, life: effectLife, maxLife: effectLife, type: effectType, isLeft: window.myPlayer.lastFacing === -1, team: window.myPlayer.team, dir: window.myPlayer.lastFacing });
                socket.emit('action', { type: effectType, x: window.myPlayer.x + (window.myPlayer.lastFacing * 60), y: window.myPlayer.y, dir: window.myPlayer.lastFacing, lifeFrames: effectLife }); 
            }
        }
    };
    
    document.getElementById('btn-attack').addEventListener('pointerdown', (e) => { e.preventDefault(); clearInterval(window.autoAttackInterval); triggerAttack(); window.autoAttackInterval = setInterval(triggerAttack, 100); });
    const stopAtk = (e) => { e.preventDefault(); clearInterval(window.autoAttackInterval); };
    document.getElementById('btn-attack').addEventListener('pointerup', stopAtk); document.getElementById('btn-attack').addEventListener('pointercancel', stopAtk); document.getElementById('btn-attack').addEventListener('pointerleave', stopAtk);

    const getSkill = (charType, slot) => {
        let ids = window.GameData.Characters[charType].skillIds;
        return window.GameData.Skills[ids[slot - 1]] || {};
    };
    /** ⚡🔮 환수호박 전용 스킬 데이터 */
    const getAmberSkill = (slot) => {
        return window.GameData.Skills[slot === 1 ? 'KASHIMO_A1' : 'KASHIMO_A2'] || {};
    };

    // ── 1번 스킬 ────────────────────────────────────────────────────
    document.getElementById('btn-skill1').addEventListener('pointerdown', (e) => {
        e.preventDefault(); let now = Date.now();
        if (window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.yataActive || window.myPlayer.skill1Dashing || now < window.myPlayer.frozenUntil || now < window.myPlayer.cd1) return;
        if (now < (window.myPlayer.raigoPullUntil || 0)) return; 
        if (isFullyLocked()) return;
        if (isDKickFlying()) return;                  // 💫 활공 중에는 스킬 불가
        
        let charType = window.myPlayer.characterType || 'PARK';

        // ⚡🔮 환수호박 각성 : 1번 = 전자파
        if (isAmber()) {
            let sk = getAmberSkill(1);
            window.myPlayer.cd1 = now + (sk.cd || 8000);
            window.myPlayer.waveCdEnd = window.myPlayer.cd1;
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
            return;
        }

        window.myPlayer.cd1 = now + getSkill(charType, 1).cd; 
        
        if (charType === 'PARK') {
            window.myPlayer.skill1Dashing = true;
            window.myPlayer.dashLockUntil = now + 3000;
            window.myPlayer.vy = -12 * window.ms; window.myPlayer.dashDir = window.myPlayer.lastFacing;
            window.visualFX.push({ x: window.myPlayer.x, y: window.myPlayer.y, life: 30, maxLife: 30, type: 'huge_wind_burst', isLeft: window.myPlayer.lastFacing === -1, team: window.myPlayer.team, dir: window.myPlayer.lastFacing });
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        } else if (charType === 'ENEL') {
            let sk = getSkill(charType, 1);
            let castTime = sk.castTime || 2000;
            let dirX = window.myPlayer.moveX || window.myPlayer.lastFacing;
            let dirY = window.myPlayer.moveY || 0;
            
            beginCast(castTime, 500);
            window.myPlayer.elThorLockUntil = now + castTime;
            
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY, x: window.myPlayer.x, y: window.myPlayer.y });
            
            setTimeout(() => { 
                endCast();
                window.myPlayer.elThorLockUntil = 0; 
            }, castTime);
        } else if (charType === 'KASHIMO') {
            window.myPlayer.kashimoBoltCdEnd = now + (getSkill(charType, 1).cd || 8000);
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        } else if (charType === 'DABURA') {
            // ⬛☀️ [빛] — 위로 솟구친 뒤 공중에 고정된 채 2초 연속폭발
            let sk = getSkill(charType, 1);
            let riseTime = sk.riseTime || 180;
            let dur = sk.duration || 2000;
            // 🛟 로컬에서도 즉시 시전 상태로 진입 (조작 봉인)
            window.myPlayer.dLightActive = true;
            window.myPlayer.dLightRiseUntil = now + riseTime;
            window.myPlayer.dLightEnd = now + riseTime + dur;
            window.myPlayer.dLightCdEnd = now + (sk.cd || 20000);
            window.myPlayer.vy = 0; window.myPlayer.knockbackForce = 0;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        } else if (charType === 'BORSALINO' || charType === 'KUZAN' || charType === 'SAKAZUKI') {
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        } else if (charType === 'DAIDO') {
            // ⚔️ [무자비] 1.5초간 제자리 난무 — 서버가 판정과 이펙트를 전부 처리한다
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        } else if (charType === 'KURUSU') {
            // 🕊️ [집회] 주변 대상 수만큼 신성력 흡수
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        }
    });

    // ── 2번 스킬 ────────────────────────────────────────────────────
    document.getElementById('btn-skill2').addEventListener('pointerdown', (e) => {
        e.preventDefault(); let now = Date.now();
        let charType = window.myPlayer.characterType || 'PARK';

        if (isFullyLocked()) return;
        if (isDKickFlying()) return;                  // 💫 활공 중에는 스킬 불가

        if (charType === 'BORSALINO' && window.myPlayer.yataActive) {
            if (!window.myPlayer.yataCanceling) {
                window.myPlayer.yataCanceling = true;
                socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing });
            }
            return;
        }

        if (window.myPlayer.isDead || window.myPlayer.isCasting || now < window.myPlayer.frozenUntil || now < window.myPlayer.cd2) return;
        if (now < (window.myPlayer.raigoPullUntil || 0)) return; 

        // ⚡🔮 환수호박 각성 : 2번 = 음파 (0.5초 경직 후 발사)
        if (isAmber()) {
            let sk = getAmberSkill(2);
            let castTime = sk.castTime || 500;
            window.myPlayer.cd2 = now + (sk.cd || 8000);
            window.myPlayer.sonicCdEnd = window.myPlayer.cd2;
            window.myPlayer.sonicChargeUntil = now + castTime;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
            return;
        }

        window.myPlayer.cd2 = now + getSkill(charType, 2).cd; 

        if (charType === 'PARK') {
            window.myPlayer.skill2EndTime = now + getSkill(charType, 2).duration; 
            socket.emit('useSkill', { type: 2 });
        } else if (charType === 'KUZAN') {
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing });
        } else if (charType === 'SAKAZUKI') {
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing });
        } else if (charType === 'ENEL') {
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing });
        } else if (charType === 'KASHIMO') {
            let sk = getSkill(charType, 2);
            let dur = sk.duration || 3000;
            window.myPlayer.surgeActive = true;
            window.myPlayer.surgeEnd = now + dur;
            window.myPlayer.surgeLockUntil = now + dur;
            window.myPlayer.surgeCdEnd = now + (sk.cd || 20000);
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing });
        } else if (charType === 'DABURA') {
            // ⬛🌑 [어둠] — ✅ [수정] 시전자는 3초 동안 완전히 고정된다
            let sk = getSkill(charType, 2);
            let dur = sk.duration || 3000;
            window.myPlayer.dDarkActive = true;
            window.myPlayer.dDarkEnd = now + dur;
            window.myPlayer.dDarkCdEnd = now + (sk.cd || 30000);
            window.myPlayer.vy = 0; window.myPlayer.knockbackForce = 0;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
            let knobEl = document.getElementById('knob');
            if (knobEl) knobEl.style.transform = 'translate(0px, 0px)';
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        } else if (charType === 'KURUSU') {
            // 🕊️ [축복] 아군 회복 (신성력 가득 차면 여분의 목숨)
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        } else if (charType === 'DAIDO') {
            // ⚔️💨 [질풍참] 2초 돌진 — 돌진 중에는 이동·스킬이 봉인된다.
            //    (공중에 떠 있을 수 있어야 하므로 vy 는 건드리지 않는다)
            let sk = getSkill(charType, 2);
            let dur = sk.duration || 2000;
            window.myPlayer.daidoRush = true;
            window.myPlayer.daidoRushEnd = now + dur;
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
            let knobEl2 = document.getElementById('knob');
            if (knobEl2) knobEl2.style.transform = 'translate(0px, 0px)';
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        } else if (charType === 'BORSALINO') {
            let dirX = window.myPlayer.moveX || window.myPlayer.lastFacing;
            let dirY = window.myPlayer.moveY || 0;
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY });
        }
    });

    // ── 3번 스킬 ────────────────────────────────────────────────────
    document.getElementById('btn-skill3').addEventListener('pointerdown', (e) => {
        e.preventDefault(); let now = Date.now();
        let charTypePre = window.myPlayer.characterType || 'PARK';

        // ⚡🔮 환수호박 중에는 3번 스킬이 존재하지 않는다
        if (charTypePre === 'KASHIMO' && window.myPlayer.amberActive) return;

        if (window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.yataActive || window.myPlayer.skill1Dashing || now < window.myPlayer.frozenUntil || now < window.myPlayer.cd3) return;
        if (now < (window.myPlayer.raigoPullUntil || 0)) return; 
        if (isFullyLocked()) return;
        if (isDKickFlying()) return;                  // 💫 이미 활공 중이면 중복 시전 불가
        
        let charType = charTypePre;
        let sk = getSkill(charType, 3);
        let castTime = sk.castTime;

        window.myPlayer.cd3 = now + sk.cd; 
        
        let dirX = window.myPlayer.moveX || window.myPlayer.lastFacing;
        let dirY = window.myPlayer.moveY || 0;

        if (charType === 'KUZAN') {
            beginCast(castTime, 800);
            window.myPlayer.iceAgeActive = true;
            socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY });
            setTimeout(() => { endCast(); window.myPlayer.iceAgeActive = false; }, castTime + 300);
            return;
        }

        if (charType === 'SAKAZUKI') {
            socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY });
            return;
        }

        if (charType === 'ENEL') {
            socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY });
            return;
        }

        if (charType === 'KASHIMO') {
            window.myPlayer.amberActive = true;
            window.myPlayer.amberCdEnd = now + (sk.cd || 60000);
            window.myPlayer.cd1 = 0;
            window.myPlayer.cd2 = 0;
            window.myPlayer.waveCdEnd = 0;
            window.myPlayer.sonicCdEnd = 0;
            window.myPlayer.dashCdEnd = 0;
            window.myPlayer.amberDashUntil = 0;
            if (typeof window.applySkillNames === 'function') window.applySkillNames();
            socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
            return;
        }

        if (charType === 'DABURA') {
            // ⬛💫 [아광속 발차기] — 2초 응축(완전 고정) 후 5초 활공
            let cTime = sk.castTime || 2000;
            window.myPlayer.dKickCharging = true;
            window.myPlayer.dKickChargeEnd = now + cTime;
            window.myPlayer.dKickFlying = false;
            window.myPlayer.dKickFlyEnd = 0;
            window.myPlayer.dKickCdEnd = now + (sk.cd || 45000);
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
            socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
            return;
        }

        if (charType === 'KURUSU') {
            // 🕊️ [야곱의 사다리] 2초 마방진 후 3초 빛 기둥
            socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
            return;
        }

        if (charType === 'DAIDO') {
            // ⚔️⚡ [일섬] — 0.5초 발도 준비 후 전방 대참격
            window.myPlayer.daidoIaiAt = now + (sk.castTime || 500);
            window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
            window.joyX = 0; window.joyY = 0;
            clearInterval(window.autoAttackInterval);
            let knobEl3 = document.getElementById('knob');
            if (knobEl3) knobEl3.style.transform = 'translate(0px, 0px)';
            socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
            return;
        }

        beginCast(castTime, 500);
        
        if (charType === 'BORSALINO') {
            window.myPlayer.skill3Active = true;
            window.myPlayer.skill3EndTime = now + castTime;
            window.lastSentSkill3Dir = { x: 0, y: 0 };
        }

        socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY });
        
        setTimeout(() => { 
            endCast();
            window.myPlayer.skill3Active = false;
            if (charType === 'PARK') {
                window.serverShockwaves.push({ id: 'local_detroit', type: 'detroit', x: window.myPlayer.x + (window.myPlayer.lastFacing * 60), y: window.myPlayer.y - 70, dir: window.myPlayer.lastFacing, speed: 100, life: 60 });
            }
        }, castTime);
    });

    // ── 🗡️ 4번 스킬 : 세계를 가르는 참격 ────────────────────────────
    //    캐릭터와 무관하게 '세계를 가르는 참격' 아이템을 장착하면 사용할 수 있다.
    //    누르면 0.5초간 완전히 고정된 뒤 전방으로 관통 참격이 발사된다.
    document.getElementById('btn-skill4').addEventListener('pointerdown', (e) => {
        e.preventDefault(); let now = Date.now();

        // 🌑 유명이경 역월이 우선 (두 아이템은 동시 장착 불가라 실제로는 배타적이다)
        let useYum = !!window.myPlayer.hasYumyeong;
        if (!useYum && !window.myPlayer.hasWorldCleave) return;   // 🚫 둘 다 미장착
        if (window.myPlayer.isDead) return;
        if (window.myPlayer.cleaveCasting || window.myPlayer.yumCasting) return;
        if (now < (useYum ? (window.myPlayer.cdY || 0) : (window.myPlayer.cd4 || 0))) return;
        if (window.myPlayer.isCasting || window.myPlayer.yataActive || window.myPlayer.skill1Dashing) return;
        if (now < window.myPlayer.frozenUntil) return;
        if (now < (window.myPlayer.raigoPullUntil || 0)) return;
        if (isFullyLocked()) return;
        if (isDKickFlying()) return;
        if (isAmberDashing()) return;

        // 🧭 방향은 조이스틱을 초기화하기 '전에' 확정해야 한다
        let cDirX = window.myPlayer.moveX || window.myPlayer.lastFacing;
        let cDirY = window.myPlayer.moveY || 0;

        // ⏳ 쿨타임 / 경직 (server/config.js 의 값과 반드시 같아야 한다)
        //    · 세계를 가르는 참격 : 쿨 130초 · 경직 0.5초
        //    · 유명이경 역월     : 쿨 180초 · 경직 1초
        let sk4Cd  = useYum ? 180000 : 130000;
        let castMs = useYum ? 1000 : 500;

        // 🔒 경직 — 이동 · 조작을 즉시 봉인한다
        if (useYum) {
            window.myPlayer.cdY = now + sk4Cd;
            window.myPlayer.yumCasting = true;
            window.myPlayer.yumCastEnd = now + castMs;
        } else {
            window.myPlayer.cd4 = now + sk4Cd;
            window.myPlayer.cleaveCasting = true;
            window.myPlayer.cleaveCastEnd = now + castMs;
        }
        window.myPlayer.moveX = 0; window.myPlayer.moveY = 0;
        window.joyX = 0; window.joyY = 0;
        clearInterval(window.autoAttackInterval);
        let knobEl4 = document.getElementById('knob');
        if (knobEl4) knobEl4.style.transform = 'translate(0px, 0px)';

        socket.emit(useYum ? 'useYumyeong' : 'useWorldCleave',
            { dir: window.myPlayer.lastFacing, dirX: cDirX, dirY: cDirY, x: window.myPlayer.x, y: window.myPlayer.y });

        // 🛟 서버 응답이 유실돼도 경직이 영구히 남지 않도록 보정한다
        setTimeout(() => {
            if (window.myPlayer.cleaveCasting && Date.now() >= (window.myPlayer.cleaveCastEnd || 0)) {
                window.myPlayer.cleaveCasting = false;
                window.myPlayer.cleaveCastEnd = 0;
            }
            if (window.myPlayer.yumCasting && Date.now() >= (window.myPlayer.yumCastEnd || 0)) {
                window.myPlayer.yumCasting = false;
                window.myPlayer.yumCastEnd = 0;
            }
        }, castMs + 200);
    });
};

// ============================================================================
// 🗣️ NPC 상호작용 버튼 트리거
//    main.js 의 poi 틱이 근처 NPC 를 감지해 window.currentNearNpcId 를 채운다.
// ============================================================================
window.interactNpc = () => {
    if (!window.socket) return;
    if (!window.currentNearNpcId) return;
    if (window.myPlayer.npcTalking) return;
    window.socket.emit('npcInteract', window.currentNearNpcId);
};