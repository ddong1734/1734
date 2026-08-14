// 파일명: gameLoop/portals.js
// ============================================================================
// 🌀 포탈 처리
//    ✅ 기지 귀환 포탈(박힌범 · 검은수염)은 같은 대기 필드(portalDwellUntil)를
//       공유하므로 반드시 '한 번의 순회'로 묶어서 처리해야 한다.
//       따로 돌리면 한쪽 루프가 다른 쪽 포탈의 대기를 매 프레임 지워버려
//       카운트다운이 영원히 끝나지 않는다.
// ============================================================================

module.exports = {
    update: (ctx, now) => {
        const { State, io } = ctx;
        const { players, bases } = State;

        const DWELL_MS = ctx.PORTAL_DWELL_MS || 3000;
        const COOLDOWN = ctx.PORTAL_COOLDOWN || 300;

        function clearDwell(p, pid, dwellKey, startKey, eventName) {
            if (!p || !p[dwellKey]) return;
            p[dwellKey] = 0; p[startKey] = 0;
            io.emit(eventName, { id: pid, until: 0 });
        }

        /** 같은 대기 필드를 공유하는 포탈 여러 개를 한 번에 처리 */
        function processPortalList(portalList, dwellKey, startKey, useKey, eventName, onComplete, banCheck) {
            for (let pid in players) {
                let p = players[pid];
                if (!p) continue;

                if (p.isDead || (banCheck && p.darkBanned)) { clearDwell(p, pid, dwellKey, startKey, eventName); continue; }

                let inPortal = false;
                for (let i = 0; i < portalList.length; i++) {
                    let pt = portalList[i];
                    if (!pt) continue;
                    if (Math.hypot(p.x - pt.x, p.y - pt.y) <= (pt.radius + 60)) { inPortal = true; break; }
                }
                if (!inPortal) { clearDwell(p, pid, dwellKey, startKey, eventName); continue; }

                if (!p[dwellKey]) {
                    if (now - (p[useKey] || 0) < COOLDOWN) continue;
                    p[startKey] = now;
                    p[dwellKey] = now + DWELL_MS;
                    io.emit(eventName, { id: pid, until: p[dwellKey] });
                    continue;
                }

                if (now >= p[dwellKey]) {
                    p[dwellKey] = 0; p[startKey] = 0; p[useKey] = now;
                    io.emit(eventName, { id: pid, until: 0 });
                    onComplete(p, pid);
                }
            }
        }

        function goHome(p, pid) {
            let myBase = bases[p.team];
            p.x = myBase ? myBase.x : (p.team === 1 ? 12250 : 19750);
            p.y = 1955; p.vy = 0; p.knockbackForce = 0;
            io.to(pid).emit('teleport', { x: p.x, y: p.y });
            io.emit('syncPlayerFull', p);
        }

        function goDark(p, pid) {
            p.x = ctx.DARK_ENTRY_X + (Math.random() * 400 - 200);
            p.y = ctx.DARK_ENTRY_Y; p.vy = 0; p.knockbackForce = 0;
            io.to(pid).emit('teleport', { x: p.x, y: p.y });
            io.emit('syncPlayerFull', p);
        }

        function goCurse(p, pid) {
            p.x = ctx.CURSE_ENTRY_X + (Math.random() * 400 - 200);
            p.y = ctx.CURSE_ENTRY_Y; p.vy = 0; p.knockbackForce = 0;
            io.to(pid).emit('teleport', { x: p.x, y: p.y });
            io.emit('syncPlayerFull', p);
        }

        // ── 만료된 포탈 정리 ──────────────────────────────────────────
        if (State.hinbeomPortal && now >= State.hinbeomPortal.expireAt) { State.hinbeomPortal = null; io.emit('syncHinbeomPortal', null); }
        if (State.blackbeardPortal && now >= State.blackbeardPortal.expireAt) { State.blackbeardPortal = null; io.emit('syncBlackbeardPortal', null); }
        if (State.darkPortal && now >= State.darkPortal.expireAt) { State.darkPortal = null; io.emit('syncDarkPortal', null); }
        if (State.cursePortal && now >= State.cursePortal.expireAt) { State.cursePortal = null; io.emit('syncCursePortal', null); }

        // ── 🌀 기지 귀환 포탈 (대기 필드 공유 → 통합 순회) ────────────
        //    🔥 스쿠나 처치 포탈도 검은수염과 똑같이 기지로 돌려보낸다.
        let homePortals = [];
        if (State.hinbeomPortal) homePortals.push(State.hinbeomPortal);
        if (State.blackbeardPortal) homePortals.push(State.blackbeardPortal);
        if (State.sukunaPortal) homePortals.push(State.sukunaPortal);

        if (homePortals.length > 0) {
            processPortalList(homePortals, 'portalDwellUntil', 'portalDwellStart', 'lastPortalUse', 'portalDwell', goHome, false);
        } else {
            for (let pid in players) clearDwell(players[pid], pid, 'portalDwellUntil', 'portalDwellStart', 'portalDwell');
        }

        // ── 🟣 암흑 왕좌 포탈 (전용 대기 필드) ────────────────────────
        if (State.darkPortal) {
            processPortalList([State.darkPortal], 'darkDwellUntil', 'darkDwellStart', 'lastDarkPortalUse', 'darkDwell', goDark, true);
        } else {
            for (let pid in players) clearDwell(players[pid], pid, 'darkDwellUntil', 'darkDwellStart', 'darkDwell');
        }

        // ── 🔥 저주의 왕 포탈 (전용 대기 필드) ────────────────────────
        //    암흑 포탈과 동시에 열릴 수 있으므로 대기 필드를 따로 둔다.
        //    (같이 쓰면 서로의 카운트다운을 매 프레임 지워버린다)
        if (State.cursePortal) {
            processPortalList([State.cursePortal], 'curseDwellUntil', 'curseDwellStart', 'lastCursePortalUse', 'curseDwell', goCurse, false);
        } else {
            for (let pid in players) clearDwell(players[pid], pid, 'curseDwellUntil', 'curseDwellStart', 'curseDwell');
        }
    }
};