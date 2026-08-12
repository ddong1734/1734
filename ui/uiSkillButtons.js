// 파일명: ui/uiSkillButtons.js
// ============================================================================
// 🎛️ 캐릭터별 스킬 버튼 상태 표시
//
//   ⚡ 카시모 하지메
//     · 🌋 주력 방출 중에는 2번 버튼이 보랏빛으로 빛난다
//     · 🔮 환수호박 중에는 3번 버튼이 숨겨지고 1·2번이 각성 스킬로 바뀐다
//     · 🔮 환수호박 중에는 평타 버튼이 '순간이동'으로 표시된다
//
//   ⬛ 다부라 카라바
//     · ☀️ [빛] 시전 중이면 1번 버튼이 하얗게 폭발하듯 빛난다
//     · 🌑 [어둠] 지속 중이면 2번 버튼이 검보랏빛으로 일렁인다
//     · 💫 [아광속 발차기] 응축/활공 중이면 3번 버튼이 금빛으로 빛나고,
//          활공 중에는 평타 버튼이 '충돌'로 바뀐다
// ============================================================================

// ============================================================================
// ⚡ 카시모 하지메 — 스킬 버튼 상태 표시
//    ⚡🌋 주력 방출 중에는 2번 버튼이 보랏빛으로 빛난다.
//    ⚡🔮 환수호박 중에는 3번 버튼이 숨겨지고 1·2번이 각성 스킬로 바뀐다.
//    ⚡🔮 환수호박 중에는 평타 버튼이 '순간이동'으로 표시된다.
// ============================================================================
window._kashimoDimState = null;
window._kashimoSurgeBtnState = null;
window._kashimoAmberBtnState = null;
window._kashimoAtkLabel = null;

window.updateKashimoSkillDim = () => {
    let p = window.myPlayer;
    if (!p) return;
    let isKashimo = (p.characterType === 'KASHIMO');

    // ── 캐릭터가 바뀌면 버튼 스타일을 원복한다 ────────────────────────
    if (window._kashimoDimState !== isKashimo) {
        window._kashimoDimState = isKashimo;
        if (!isKashimo) {
            // ⬛ 다부라는 자기 색을 따로 칠하므로 여기서 지우지 않는다
            if (p.characterType !== 'DABURA') {
                ['btn-skill1', 'btn-skill2', 'btn-skill3'].forEach(id => {
                    let b = document.getElementById(id);
                    if (!b) return;
                    b.style.opacity = '';
                    b.style.filter = '';
                    b.style.background = '';
                    b.style.borderColor = '';
                    b.style.boxShadow = '';
                    b.style.display = '';
                });
            }
            let atk = document.getElementById('btn-attack');
            if (atk) {
                atk.innerText = '공격';
                atk.style.background = '';
                atk.style.borderColor = '';
                atk.style.fontSize = '';
            }
            window._kashimoSurgeBtnState = null;
            window._kashimoAmberBtnState = null;
            window._kashimoAtkLabel = null;
        }
    }

    if (!isKashimo) return;

    let amber = !!p.amberActive;

    // ── ⚡🔮 환수호박 상태 변화 감지 → 라벨 · 3번 버튼 · 평타 버튼 갱신 ─
    if (window._kashimoAmberBtnState !== amber) {
        window._kashimoAmberBtnState = amber;
        if (typeof window.refreshKashimoSkillLabel === 'function') window.refreshKashimoSkillLabel(true);
        window._kashimoSurgeBtnState = null;   // 2번 버튼 색을 다시 계산하게 한다
    }

    // ── ⚡🔮 평타 버튼 : 환수호박 중이면 '순간이동' ──────────────────
    let wantAtk = amber ? '순간\n이동' : '공격';
    if (window._kashimoAtkLabel !== wantAtk) {
        window._kashimoAtkLabel = wantAtk;
        let atk = document.getElementById('btn-attack');
        if (atk) {
            if (amber) {
                atk.innerHTML = '순간<br>이동';
                atk.style.background = 'rgba(126, 34, 206, 0.9)';
                atk.style.borderColor = '#e9d5ff';
                atk.style.fontSize = '18px';
            } else {
                atk.innerText = '공격';
                atk.style.background = '';
                atk.style.borderColor = '';
                atk.style.fontSize = '';
            }
        }
    }

    // ── ⚡🌋 주력 방출 중이면 2번 버튼을 보랏빛으로 빛나게 한다 ────────
    if (!amber) {
        let surging = !!(p.surgeActive && Date.now() < (p.surgeEnd || 0));
        if (window._kashimoSurgeBtnState !== surging) {
            window._kashimoSurgeBtnState = surging;
            let btn2 = document.getElementById('btn-skill2');
            if (btn2) {
                if (surging) {
                    btn2.style.background = 'rgba(126, 34, 206, 0.95)';
                    btn2.style.borderColor = '#e9d5ff';
                    btn2.style.boxShadow = '0 0 20px 5px rgba(168, 85, 247, 0.95)';
                } else {
                    btn2.style.background = 'rgba(168, 85, 247, 0.85)';
                    btn2.style.borderColor = '#7e22ce';
                    btn2.style.boxShadow = '';
                }
                btn2.style.opacity = '';
                btn2.style.filter = '';
            }
        }
    }
};

// 전투 중 0.1초마다 카시모 스킬 버튼 상태를 점검한다
setInterval(() => {
    if (window.gameLoopStarted && typeof window.updateKashimoSkillDim === 'function') {
        window.updateKashimoSkillDim();
    }
}, 100);

// ============================================================================
// ⬛ [신규] 다부라 카라바 — 스킬 버튼 상태 표시
//    · ☀️ [빛] 시전 중이면 1번 버튼이 하얗게 폭발하듯 빛난다
//    · 🌑 [어둠] 지속 중이면 2번 버튼이 검보랏빛으로 일렁인다
//    · 💫 [아광속 발차기] 응축/활공 중이면 3번 버튼이 금빛으로 강하게 빛나고,
//         활공 중에는 평타 버튼이 '충돌'로 바뀐다 (평타 불가 표시)
// ============================================================================
window._daburaDimState = null;
window._daburaLightBtnState = null;
window._daburaDarkBtnState = null;
window._daburaKickBtnState = null;
window._daburaAtkLabel = null;

window.updateDaburaSkillDim = () => {
    let p = window.myPlayer;
    if (!p) return;
    let isDabura = (p.characterType === 'DABURA');

    // ── 캐릭터가 바뀌면 버튼 스타일을 원복한다 ────────────────────────
    if (window._daburaDimState !== isDabura) {
        window._daburaDimState = isDabura;
        if (!isDabura) {
            if (p.characterType !== 'KASHIMO') {
                ['btn-skill1', 'btn-skill2', 'btn-skill3'].forEach(id => {
                    let b = document.getElementById(id);
                    if (!b) return;
                    b.style.opacity = '';
                    b.style.filter = '';
                    b.style.background = '';
                    b.style.borderColor = '';
                    b.style.boxShadow = '';
                    b.style.display = '';
                    b.style.color = '';
                });
            }
            let atk = document.getElementById('btn-attack');
            if (atk && window._daburaAtkLabel !== null) {
                atk.innerText = '공격';
                atk.style.background = '';
                atk.style.borderColor = '';
                atk.style.fontSize = '';
            }
            window._daburaLightBtnState = null;
            window._daburaDarkBtnState = null;
            window._daburaKickBtnState = null;
            window._daburaAtkLabel = null;
        } else {
            // 다부라로 진입 → 기본 색을 즉시 칠한다
            if (typeof window.refreshDaburaSkillLabel === 'function') window.refreshDaburaSkillLabel(true);
        }
    }

    if (!isDabura) return;

    let now = Date.now();
    let sq = !!p.hasSquare;

    // ── ☀️ [빛] 시전 중 ─────────────────────────────────────────────
    let lightOn = !!p.dLightActive && now < (p.dLightEnd || 0);
    if (window._daburaLightBtnState !== lightOn) {
        window._daburaLightBtnState = lightOn;
        let b1 = document.getElementById('btn-skill1');
        if (b1) {
            if (lightOn) {
                b1.style.background = 'rgba(255, 255, 255, 0.98)';
                b1.style.borderColor = '#fff9d0';
                b1.style.boxShadow = '0 0 26px 9px rgba(255, 255, 230, 1)';
            } else {
                b1.style.background = 'rgba(250, 250, 252, 0.92)';
                b1.style.borderColor = sq ? '#ffe680' : '#e2e8f0';
                b1.style.boxShadow = sq ? '0 0 18px 5px rgba(255, 240, 170, 0.9)' : '0 0 12px 3px rgba(255,255,255,0.55)';
            }
        }
    }

    // ── 🌑 [어둠] 지속 중 ───────────────────────────────────────────
    let darkOn = !!p.dDarkActive && now < (p.dDarkEnd || 0);
    if (window._daburaDarkBtnState !== darkOn) {
        window._daburaDarkBtnState = darkOn;
        let b2 = document.getElementById('btn-skill2');
        if (b2) {
            if (darkOn) {
                b2.style.background = 'rgba(4, 0, 10, 0.98)';
                b2.style.borderColor = '#a855f7';
                b2.style.boxShadow = '0 0 24px 8px rgba(90, 30, 170, 0.95)';
            } else {
                b2.style.background = 'rgba(14, 10, 22, 0.95)';
                b2.style.borderColor = sq ? '#ffe680' : '#4b3a6b';
                b2.style.boxShadow = sq ? '0 0 18px 5px rgba(255, 240, 170, 0.75)' : '0 0 12px 3px rgba(60, 30, 110, 0.85)';
            }
        }
    }

    // ── 💫 [아광속 발차기] 응축 / 활공 중 ───────────────────────────
    let kickOn = (!!p.dKickCharging && now < (p.dKickChargeEnd || 0))
              || (!!p.dKickFlying && now < (p.dKickFlyEnd || 0));
    if (window._daburaKickBtnState !== kickOn) {
        window._daburaKickBtnState = kickOn;
        let b3 = document.getElementById('btn-skill3');
        if (b3) {
            if (kickOn) {
                b3.style.background = 'rgba(255, 250, 210, 0.98)';
                b3.style.borderColor = '#ffffff';
                b3.style.boxShadow = '0 0 28px 10px rgba(255, 250, 200, 1)';
            } else {
                b3.style.background = 'rgba(255, 236, 150, 0.92)';
                b3.style.borderColor = sq ? '#ffffff' : '#f0c419';
                b3.style.boxShadow = sq ? '0 0 20px 6px rgba(255, 255, 220, 0.95)' : '0 0 12px 3px rgba(255, 220, 90, 0.8)';
            }
        }
    }

    // ── 💫 평타 버튼 : 활공 중에는 '충돌'로 표시 (평타 불가) ─────────
    let flying = !!p.dKickFlying && now < (p.dKickFlyEnd || 0);
    let wantAtk = flying ? '충돌' : '공격';
    if (window._daburaAtkLabel !== wantAtk) {
        window._daburaAtkLabel = wantAtk;
        let atk = document.getElementById('btn-attack');
        if (atk) {
            if (flying) {
                atk.innerText = '충돌';
                atk.style.background = 'rgba(255, 236, 150, 0.9)';
                atk.style.borderColor = '#ffffff';
                atk.style.fontSize = '20px';
            } else {
                atk.innerText = '공격';
                atk.style.background = '';
                atk.style.borderColor = '';
                atk.style.fontSize = '';
            }
        }
    }
};

// 전투 중 0.1초마다 다부라 스킬 버튼 상태를 점검한다
setInterval(() => {
    if (window.gameLoopStarted && typeof window.updateDaburaSkillDim === 'function') {
        window.updateDaburaSkillDim();
    }
}, 100);