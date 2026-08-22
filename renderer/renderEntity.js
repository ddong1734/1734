// 파일명: renderEntity.js
// ============================================================================
// 🎭 엔티티 렌더링 오케스트레이터
//
//   이 파일은 '무엇을 어떤 순서로 그릴지' 만 결정한다.
//   실제 그리는 일은 아래 모듈들이 나눠 맡는다.
//
//   ── 그리는 순서 (뒤 → 앞) ───────────────────────────────────────────────
//     ① renderBoss.js   : 🌀 포탈 · 👾 몬스터 · 🥊 박힌범 · 🐗 할배새끼
//                          🔥 헤이안 스쿠나 · ⚫ 검은수염 · 🟪 지저스 바제스
//     ② renderMob.js    : 🎃 오크라(일반·황금·해루석) · 🗣️ NPC
//     ③ renderPlayer.js : 🧍 플레이어 · 체력바 · 게이지 · 상태이상
//
//   ── 기존에 쓰던 보조 모듈 ──────────────────────────────────────────────
//     · renderEntityParts.js : 체력 눈금 · 전하 표시 · 환수호박/빛 몸통
//     · renderNpc.js         : 🗣️ 티치 · 🗡️ 마허라
//     · renderPortal.js      : 🌀 포탈 본체 · 카운트다운
//
//   ⚠️ 923줄짜리 단일 파일을 쪼갠 것이며, 그리는 내용과 순서는 그대로다.
//      플레이어가 항상 맨 앞에 오도록 순서를 반드시 지켜야 한다.
// ============================================================================

import { drawBosses } from './renderBoss.js';
import { drawMobs } from './renderMob.js';
import { drawPlayers } from './renderPlayer.js';

export class RenderEntity {
    constructor() {
        // 전장 인원수 DOM 은 매 프레임 찾지 않고 한 번만 잡아 둔다
        this._pCountEl = null;
        this._lastAliveCount = -1;
    }

    render(ctx, state) {
        // 🌑🔥 별세계(암흑 왕좌 · 저주의 왕) 판정은 renderMap 이 미리 계산해
        //      state 에 넣어 준다. 세 모듈이 같은 값을 봐야 하므로 한 번만 꺼낸다.
        const zone = {
            inDarkZone: !!state.inDarkZone,
            inCurseZone: !!state.inCurseZone
        };

        drawBosses(ctx, state, zone);                        // ① 뒤쪽
        drawMobs(ctx, state, zone);                          // ②
        const aliveCount = drawPlayers(ctx, state, zone);    // ③ 맨 앞

        this._updatePlayerCount(aliveCount);
    }

    /** 🔢 전장 인원수 — 값이 바뀔 때만 DOM 을 건드린다 */
    _updatePlayerCount(aliveCount) {
        if (aliveCount === this._lastAliveCount) return;
        if (!this._pCountEl) this._pCountEl = document.getElementById('playerCount');
        if (!this._pCountEl) return;
        this._pCountEl.innerText = `전장 인원: ${aliveCount}명`;
        this._lastAliveCount = aliveCount;
    }
}
