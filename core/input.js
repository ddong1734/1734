// input.js - 조이스틱 및 버튼 입력 처리 전담

window.initControls = (socket) => {
    if (window.controlsInitialized) return; window.controlsInitialized = true;
    const zone = document.getElementById('joystickZone'); const knob = document.getElementById('knob');
    let activeId = null; const maxR = 40;
    
    const isSkill3Aiming = () => window.myPlayer.isCasting && window.myPlayer.characterType === 'BORSALINO' && Date.now() < (window.myPlayer.skill3EndTime || 0);
    // ⚡ 엘 토르 시전 중에는 조이스틱이 2초간 완전히 고정됨
    const isElThorLocked = () => window.myPlayer.characterType === 'ENEL' && Date.now() < (window.myPlayer.elThorLockUntil || 0);

    zone.addEventListener('pointerdown', (e) => { e.preventDefault(); if(window.myPlayer.isDead) return; if (isElThorLocked()) return; activeId = e.pointerId; zone.setPointerCapture(e.pointerId); moveKnob(e); });
    zone.addEventListener('pointermove', (e) => { if(activeId === e.pointerId && !window.myPlayer.isDead) { e.preventDefault(); if (isElThorLocked()) return; if ((window.myPlayer.isCasting && !isSkill3Aiming()) || window.myPlayer.skill1Dashing) return; moveKnob(e); }});
    const moveKnob = (e) => { 
        const rect = zone.getBoundingClientRect(); const cx = rect.left + rect.width/2; const cy = rect.top + rect.height/2; 
        let dx = e.clientX - cx; let dy = e.clientY - cy; let d = Math.hypot(dx, dy); 
        if(d > maxR) { dx = (dx/d)*maxR; dy = (dy/d)*maxR; } 
        knob.style.transform = `translate(${dx}px, ${dy}px)`; 
        window.myPlayer.moveX = dx / maxR; 
        window.myPlayer.moveY = dy / maxR;
    };
    const release = (e) => { if (isElThorLocked()) return; if(activeId === e.pointerId) { activeId = null; knob.style.transform = 'translate(0px, 0px)'; window.myPlayer.moveX = 0; window.myPlayer.moveY = 0; }};
    zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release);

    document.getElementById('btn-jump').addEventListener('pointerdown', (e) => { 
        e.preventDefault(); if (Date.now() < window.myPlayer.frozenUntil || window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.skill1Dashing) return; 
        if (Date.now() < (window.myPlayer.raigoPullUntil || 0)) return; 
        
        if (window.myPlayer.jumpCount > 0) { 
            window.myPlayer.vy = Math.min(window.myPlayer.vy, (Date.now() < window.myPlayer.jumpNerfUntil) ? (-13 * window.ms) : (-18 * window.ms)); 
            window.myPlayer.jumpCount--; 
        } 
    });

    const triggerAttack = () => {
        let now = Date.now(); if (now < window.myPlayer.frozenUntil || window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.skill1Dashing || now < (window.myPlayer.lightDashUntil || 0)) return; 
        if (now < (window.myPlayer.raigoPullUntil || 0)) return; 
        
        let charType = window.myPlayer.characterType || 'PARK';
        let defaultCd = window.GameData.Characters[charType].attackCooldown; 
        let spd = window.myPlayer.attackSpeedMult || 1.0; 
        let cool = defaultCd / spd; 
        let sd = (window.GameData.Characters[charType].attackSlowDuration) / spd;
        let effectLife = Math.max(5, Math.round(cool / (1000 / 60))); 
        
        if (now - window.lastAttackTime >= cool) { 
            window.lastAttackTime = now; if (window.myPlayer.vy === 0) window.slowUntil = now + sd; 
            
            let effectType = charType === 'BORSALINO' ? 'ama_no_murakumo' : (charType === 'KUZAN' ? 'ice_glove' : (charType === 'SAKAZUKI' ? 'magma_punch' : (charType === 'ENEL' ? 'thunder_bolt' : 'punch')));
            
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

    document.getElementById('btn-skill1').addEventListener('pointerdown', (e) => {
        e.preventDefault(); let now = Date.now();
        if (window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.yataActive || window.myPlayer.skill1Dashing || now < window.myPlayer.frozenUntil || now < window.myPlayer.cd1) return;
        if (now < (window.myPlayer.raigoPullUntil || 0)) return; 
        
        let charType = window.myPlayer.characterType || 'PARK';
        window.myPlayer.cd1 = now + getSkill(charType, 1).cd; 
        
        if (charType === 'PARK') {
            window.myPlayer.skill1Dashing = true; window.myPlayer.vy = -12 * window.ms; window.myPlayer.dashDir = window.myPlayer.lastFacing;
            window.visualFX.push({ x: window.myPlayer.x, y: window.myPlayer.y, life: 30, maxLife: 30, type: 'huge_wind_burst', isLeft: window.myPlayer.lastFacing === -1, team: window.myPlayer.team, dir: window.myPlayer.lastFacing });
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        } else if (charType === 'ENEL') {
            // ⚡ 엘 토르: 시전 순간 조이스틱 방향 고정, 2초간 완전 고정 경직 + 조이스틱 잠금
            let sk = getSkill(charType, 1);
            let castTime = sk.castTime || 2000;
            let dirX = window.myPlayer.moveX || window.myPlayer.lastFacing;
            let dirY = window.myPlayer.moveY || 0;
            
            window.myPlayer.isCasting = true;
            window.myPlayer.elThorLockUntil = now + castTime;
            
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY, x: window.myPlayer.x, y: window.myPlayer.y });
            
            setTimeout(() => { 
                window.myPlayer.isCasting = false; 
                window.myPlayer.elThorLockUntil = 0; 
            }, castTime);
        } else if (charType === 'BORSALINO' || charType === 'KUZAN' || charType === 'SAKAZUKI') {
            socket.emit('useSkill', { type: 1, dir: window.myPlayer.lastFacing, x: window.myPlayer.x, y: window.myPlayer.y });
        }
    });

    document.getElementById('btn-skill2').addEventListener('pointerdown', (e) => {
        e.preventDefault(); let now = Date.now();
        let charType = window.myPlayer.characterType || 'PARK';

        if (charType === 'BORSALINO' && window.myPlayer.yataActive) {
            if (!window.myPlayer.yataCanceling) {
                window.myPlayer.yataCanceling = true;
                socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing });
            }
            return;
        }

        if (window.myPlayer.isDead || window.myPlayer.isCasting || now < window.myPlayer.frozenUntil || now < window.myPlayer.cd2) return;
        if (now < (window.myPlayer.raigoPullUntil || 0)) return; 
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
        } else if (charType === 'BORSALINO') {
            let dirX = window.myPlayer.moveX || window.myPlayer.lastFacing;
            let dirY = window.myPlayer.moveY || 0;
            socket.emit('useSkill', { type: 2, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY });
        }
    });

    document.getElementById('btn-skill3').addEventListener('pointerdown', (e) => {
        e.preventDefault(); let now = Date.now();
        if (window.myPlayer.isDead || window.myPlayer.isCasting || window.myPlayer.yataActive || window.myPlayer.skill1Dashing || now < window.myPlayer.frozenUntil || now < window.myPlayer.cd3) return;
        if (now < (window.myPlayer.raigoPullUntil || 0)) return; 
        
        let charType = window.myPlayer.characterType || 'PARK';
        let sk = getSkill(charType, 3);
        let castTime = sk.castTime;

        window.myPlayer.cd3 = now + sk.cd; 
        
        let dirX = window.myPlayer.moveX || window.myPlayer.lastFacing;
        let dirY = window.myPlayer.moveY || 0;

        if (charType === 'KUZAN') {
            window.myPlayer.isCasting = true;
            window.myPlayer.iceAgeActive = true;
            socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY });
            setTimeout(() => { window.myPlayer.isCasting = false; window.myPlayer.iceAgeActive = false; }, castTime + 300);
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

        window.myPlayer.isCasting = true; 
        
        if (charType === 'BORSALINO') {
            window.myPlayer.skill3Active = true;
            window.myPlayer.skill3EndTime = now + castTime;
            window.lastSentSkill3Dir = { x: 0, y: 0 };
        }

        socket.emit('useSkill', { type: 3, dir: window.myPlayer.lastFacing, dirX: dirX, dirY: dirY });
        
        setTimeout(() => { 
            window.myPlayer.isCasting = false; 
            window.myPlayer.skill3Active = false;
            if (charType === 'PARK') {
                window.serverShockwaves.push({ id: 'local_detroit', type: 'detroit', x: window.myPlayer.x + (window.myPlayer.lastFacing * 60), y: window.myPlayer.y - 70, dir: window.myPlayer.lastFacing, speed: 100, life: 60 });
            }
        }, castTime);
    });
};