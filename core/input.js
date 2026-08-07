// input.js - 조이스틱 및 버튼 입력 처리 전담
//
// ⚠️ [수정 내역 — 2곳]
//  1-A) moveKnob() 이 window.joyX / joyY 에 '입력 원본'을 보관한다.
//  1-B) release() 의 isElThorLocked() 조기 return 제거.
// ⚫ [검은수염] 크로우즈에 끌려가는 동안 모든 행동 봉인 + 암흑물질 장판 위 점프력 70% 감소
// 🍈 [열매] 어둠 흡수(시전자·대상) / 파공아 시전 경직 동안에도 모든 행동 봉인
//
// 🛟 [게임 멈춤 방지]
//   시전 잠금을 걸 때 반드시 '만료 시각(castLockUntil / dashLockUntil)'을 함께
//   기록한다. main.js 의 워치독이 이 값을 보고 타이머 없이도 잠금을 푼다.
//
// ⚡ [카시모 하지메]
//   · 평타 : 보랏빛 전격 타격(kashimo_strike)
//   · 1번  : 번개 (경직 없음) / 전하 4스택 시 서버가 '대기를 가르는 번개'로 전환
//   · 2번  : 주력 방출 (경직 없음 · 4초 지속)
//   · 3번  : ✅ [신규] 환수호박 — 죽을 때까지 해제 불가
//
// ⚡🔮 [환수호박 각성 상태]
//   · 1번  : 전자파 (연쇄 전기폭발 · 경직 없음)
//   · 2번  : 음파 (0.5초 경직 후 부채꼴 발사)
//   · 3번  : 스킬 자체가 사라진다 (버튼 숨김)

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
    // ⚡ 엘 토르 시전 중에는 조이스틱 '방향 변경'만 잠근다 (해제는 항상 허용)
    const isElThorLocked = () => window.myPlayer.characterType === 'ENEL' && Date.now() < (window.myPlayer.elThorLockUntil || 0);
    // ⚫ 크로우즈에 끌려가는 중에는 모든 조작이 봉인된다
    const isCrowsPulled = () => Date.now() < (window.myPlayer.crowsPullUntil || 0);
    // 🕳️ 어둠 흡수 중(시전자 또는 대상) · 💥 파공아 시전 경직 중에도 모든 조작이 봉인된다
    const isFruitLocked = () => {
        let now = Date.now();
        return now < (window.myPlayer.yamiLockUntil || 0)
            || now < (window.myPlayer.yamiBindUntil || 0)
            || now < (window.myPlayer.guraChargeUntil || 0);
    };
    // ⚡🔮 음파 응축(0.5초) 중에는 모든 조작이 봉인된다
    const isSonicCharging = () => Date.now() < (window.myPlayer.sonicChargeUntil || 0);
    // ⚡🔮 환수호박 각성 상태인가
    const isAmber = () => window.myPlayer.characterType === 'KASHIMO' && !!window.myPlayer.amberActive;

    zone.addEventListener('pointerdown', (e) => { e.preventDefault(); if(window.myPlayer.isDead) return; if (isElThorLocked()) return; if (isCrowsPulled()) return; if (isFruitLocked()) return; if (isSonicCharging()) return; activeId = e.pointerId; zone.setPointerCapture(e.pointerId); moveKnob(e); });
    zone.addEventListener('pointermove', (e) => { if(activeId === e.pointerId && !window.myPlayer.isDead) { e.preventDefault(); if (isElThorLocked()) return; if (isCrowsPulled()) return; if (isFruitLocked()) return; if (isSonicCharging()) return; if ((window.myPlayer.isCasting && !isSkill3Aiming()) || window.myPlayer.skill1Dashing) return; moveKnob(e); }});

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
        e.preventDefault(); if (Date.now() < window.myPlayer.frozenUntil || window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.skill1Dashing) return; 
        if (Date.now() < (window.myPlayer.raigoPullUntil || 0)) return; 
        if (isCrowsPulled()) return;                                        // ⚫ 크로우즈 봉인
        if (isFruitLocked()) return;                                        // 🍈 어둠 흡수 / 파공아 경직 봉인
        if (isSonicCharging()) return;                                      // ⚡🔮 음파 응축 봉인
        
        if (window.myPlayer.jumpCount > 0) { 
            let jumpV = (Date.now() < window.myPlayer.jumpNerfUntil) ? (-13 * window.ms) : (-18 * window.ms);
            // ⚫ 암흑물질 장판에 잠긴 동안에는 점프력이 70% 감소한다
            if (typeof window.isDarkFloorActiveFor === 'function' && window.isDarkFloorActiveFor(window.myPlayer)) jumpV *= 0.3;
            window.myPlayer.vy = Math.min(window.myPlayer.vy, jumpV); 
            window.myPlayer.jumpCount--; 
        } 
    });

    const triggerAttack = () => {
        let now = Date.now(); if (now < window.myPlayer.frozenUntil || window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.skill1Dashing || now < (window.myPlayer.lightDashUntil || 0)) return; 
        if (now < (window.myPlayer.raigoPullUntil || 0)) return; 
        if (now < (window.myPlayer.crowsPullUntil || 0)) return;            // ⚫ 크로우즈 봉인
        if (isFruitLocked()) return;                                        // 🍈 어둠 흡수 / 파공아 경직 봉인
        if (isSonicCharging()) return;                                      // ⚡🔮 음파 응축 봉인
        
        let charType = window.myPlayer.characterType || 'PARK';
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
                           : (charType === 'KASHIMO' ? 'kashimo_strike' : 'punch'))));
            
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

    document.getElementById('btn-skill1').addEventListener('pointerdown', (e) => {
        e.preventDefault(); let now = Date.now();
        if (window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.yataActive || window.myPlayer.skill1Dashing || now < window.myPlayer.frozenUntil || now < window.myPlayer.cd1) return;
        if (now < (window.myPlayer.raigoPullUntil || 0)) return; 
        if (now < (window.myPlayer.crowsPullUntil || 0)) return;            // ⚫ 크로우즈 스킬 봉인
        if (isFruitLocked()) return;                                        // 🍈 어둠 흡수 / 파공아 경직 봉인
        if (isSonicCharging()) return;                                      // ⚡🔮 음파 응축 봉인
        
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
            window.myPlayer.dashLockUntil = now + 3000;   // 🛟 착지 신호를 놓쳐도 3초 뒤 자동 해제
            window.myPlayer.vy = -12 * window.ms; window.myPlayer.dashDir = window.myPlayer.lastFacing;
            window.visualFX.push({ x: window.myPlayer.x, y: window.myPlayer.y, life: 30, maxLife: 30, type: 'huge_wind_burst', isLeft: window.myPlayer.lastFacing === -1, team: window.myPlayer.team, dir: window.myPlayer.lastFacing });
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        } else if (charType === 'ENEL') {
            // ⚡ 엘 토르: 시전 순간 조이스틱 방향 고정, 2초간 완전 고정 경직 + 조이스틱 잠금
            let sk = getSkill(charType, 1);
            let castTime = sk.castTime || 2000;
            let dirX = window.myPlayer.moveX || window.myPlayer.lastFacing;
            let dirY = window.myPlayer.moveY || 0;
            
            beginCast(castTime, 500);                                 // 🛟 만료 시각 기록
            window.myPlayer.elThorLockUntil = now + castTime;
            
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY, x: window.myPlayer.x, y: window.myPlayer.y });
            
            setTimeout(() => { 
                endCast();
                window.myPlayer.elThorLockUntil = 0; 
            }, castTime);
        } else if (charType === 'KASHIMO') {
            // ⚡ 번개 : 경직 없이 즉시 발사한다.
            window.myPlayer.kashimoBoltCdEnd = now + (getSkill(charType, 1).cd || 8000);
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        } else if (charType === 'BORSALINO' || charType === 'KUZAN' || charType === 'SAKAZUKI') {
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        }
    });

    document.getElementById('btn-skill2').addEventListener('pointerdown', (e) => {
        e.preventDefault(); let now = Date.now();
        let charType = window.myPlayer.characterType || 'PARK';

        if (now < (window.myPlayer.crowsPullUntil || 0)) return;            // ⚫ 크로우즈 스킬 봉인
        if (isFruitLocked()) return;                                        // 🍈 어둠 흡수 / 파공아 경직 봉인
        if (isSonicCharging()) return;                                      // ⚡🔮 음파 응축 봉인

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
            // 🔊 응축 동안 완전 고정 (서버도 같은 값을 보내 준다)
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
            // ⚡ 만뢰: 에넬은 경직 없음 (자유 이동 가능)
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing });
        } else if (charType === 'KASHIMO') {
            // ⚡🌋 주력 방출 : 경직 없음 (시전 중 자유 이동 가능)
            let sk = getSkill(charType, 2);
            let dur = sk.duration || 4000;
            window.myPlayer.surgeActive = true;
            window.myPlayer.surgeEnd = now + dur;
            window.myPlayer.surgeCdEnd = now + (sk.cd || 20000);
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing });
        } else if (charType === 'BORSALINO') {
            let dirX = window.myPlayer.moveX || window.myPlayer.lastFacing;
            let dirY = window.myPlayer.moveY || 0;
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY });
        }
    });

    document.getElementById('btn-skill3').addEventListener('pointerdown', (e) => {
        e.preventDefault(); let now = Date.now();
        let charTypePre = window.myPlayer.characterType || 'PARK';

        // ⚡🔮 환수호박 중에는 3번 스킬이 존재하지 않는다
        if (charTypePre === 'KASHIMO' && window.myPlayer.amberActive) return;

        if (window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.yataActive || window.myPlayer.skill1Dashing || now < window.myPlayer.frozenUntil || now < window.myPlayer.cd3) return;
        if (now < (window.myPlayer.raigoPullUntil || 0)) return; 
        if (now < (window.myPlayer.crowsPullUntil || 0)) return;            // ⚫ 크로우즈 스킬 봉인
        if (isFruitLocked()) return;                                        // 🍈 어둠 흡수 / 파공아 경직 봉인
        if (isSonicCharging()) return;                                      // ⚡🔮 음파 응축 봉인
        
        let charType = charTypePre;
        let sk = getSkill(charType, 3);
        let castTime = sk.castTime;

        window.myPlayer.cd3 = now + sk.cd; 
        
        let dirX = window.myPlayer.moveX || window.myPlayer.lastFacing;
        let dirY = window.myPlayer.moveY || 0;

        if (charType === 'KUZAN') {
            beginCast(castTime, 800);                                 // 🛟 만료 시각 기록
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
            // ⚡ 뇌영: 에넬은 경직 없음 (자유 이동 가능)
            socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY });
            return;
        }

        if (charType === 'KASHIMO') {
            // ⚡🔮 환수호박 : 경직 없이 즉시 발동한다. 죽을 때까지 해제할 수 없다.
            window.myPlayer.amberActive = true;
            window.myPlayer.amberCdEnd = now + (sk.cd || 60000);
            // 🔮 전용 스킬은 즉시 사용 가능
            window.myPlayer.cd1 = 0;
            window.myPlayer.cd2 = 0;
            window.myPlayer.waveCdEnd = 0;
            window.myPlayer.sonicCdEnd = 0;
            // 🔮 1·2번이 전용 스킬로 바뀌고 3번 버튼이 사라진다
            if (typeof window.applySkillNames === 'function') window.applySkillNames();
            socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
            return;
        }

        beginCast(castTime, 500);                                     // 🛟 만료 시각 기록
        
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
};