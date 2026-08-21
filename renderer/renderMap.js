// 파일명: renderMap.js

export class RenderMap {
    constructor() {
        this.cachedSkyGrad = null;
        this.cachedGroundGrad = null;
        this.cachedDarkGrad = null;      // ⚫ 암흑 왕좌 배경
    }

    render(ctx, state) {
        const { camX, camY, viewW, viewH, groundY, worldWidth, constants, bases, detectors, platforms, bushes, mathNow, myPlayer } = state;

        // ====================================================================
        // 🔥 저주의 왕 격리 판정 (붉은 하늘 · 갈색 바위 벌판)
        //    암흑 왕좌보다 먼저 판정한다 (서로 겹치지 않지만 순서를 고정해 둔다)
        // ====================================================================
        const CZ = (typeof window !== 'undefined' && window.CURSE_ZONE_X) ? window.CURSE_ZONE_X : { min: 42900, max: 49100 };
        const inCurseZone = !!(myPlayer && myPlayer.x >= CZ.min && myPlayer.x <= CZ.max);
        state.inCurseZone = inCurseZone;

        if (inCurseZone) {
            this.drawCurseLand(ctx, camX, camY, viewW, viewH, mathNow, groundY);
            return;
        }

        // ====================================================================
        // ⚫ 암흑 왕좌 격리 판정
        // ====================================================================
        const DZ = (typeof window !== 'undefined' && window.DARK_ZONE_X) ? window.DARK_ZONE_X : { min: 35400, max: 41600 };
        const inDarkZone = !!(myPlayer && myPlayer.x >= DZ.min && myPlayer.x <= DZ.max);
        state.inDarkZone = inDarkZone;

        if (inDarkZone) {
            // ── 암흑 왕좌 전용 화면 ────────────────────────────────────────
            this.drawDarkThrone(ctx, camX, camY, viewW, viewH, mathNow, true);

            if (platforms) {
                for (let p of platforms) {
                    if (!p.dark) continue;
                    if (!this.isVisible(camX, camY, viewW, viewH, p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2)) continue;
                    ctx.fillStyle = "#26073d"; ctx.fillRect(p.x, p.y, p.w, p.h);
                    ctx.fillStyle = "#7b2fbe"; ctx.fillRect(p.x, p.y, p.w, 8);
                    ctx.fillStyle = "rgba(255, 215, 90, 0.85)"; ctx.fillRect(p.x, p.y, p.w, 3);
                }
            }
            return;
        }

        // ====================================================================
        // 🌍 일반 맵 화면
        // ====================================================================
        if (!this.cachedSkyGrad || !this.cachedGroundGrad) {
            this.cachedSkyGrad = ctx.createLinearGradient(0, -3000, 0, groundY); 
            this.cachedSkyGrad.addColorStop(0, "#060d20"); 
            this.cachedSkyGrad.addColorStop(0.28, "#152b55"); 
            this.cachedSkyGrad.addColorStop(0.55, "#3b6ea5"); 
            this.cachedSkyGrad.addColorStop(0.78, "#87CEEB"); 
            this.cachedSkyGrad.addColorStop(1, "#E0F6FF"); 
            this.cachedGroundGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 1000); 
            this.cachedGroundGrad.addColorStop(0, "#228B22"); this.cachedGroundGrad.addColorStop(1, "#145214"); 
        }

        // 하늘/지면은 암흑 왕좌 구역 앞(DZ.min)까지만 그린다
        let bgRight = Math.min(camX + viewW + 2, DZ.min);
        let bgW = Math.max(0, bgRight - camX);
        if (bgW > 0) {
            ctx.fillStyle = this.cachedSkyGrad; ctx.fillRect(camX, camY, bgW, groundY - camY);
            ctx.fillStyle = this.cachedGroundGrad; ctx.fillRect(camX, groundY, bgW, 1000);
        }
        
        // ✅ [수정] 팀 진영 배경 오버레이
        //    블루 : 맵 좌측 끝 ~ 블루 정글 끝(x 0 ~ 11000)
        //    레드 : 레드 정글 시작 ~ 레드 정글 끝(x 21000 ~ 31000)
        //    → 기존에는 레드 오버레이가 12000~23000 이라 블루 넥서스와 중앙 정글까지 덮었다.
        const BLUE_ZONE_START = 0,     BLUE_ZONE_END = 11000;
        const RED_ZONE_START  = 21000, RED_ZONE_END  = 31000;

        if (camX < BLUE_ZONE_END) {
            ctx.fillStyle = "rgba(52, 152, 219, 0.1)";
            ctx.fillRect(BLUE_ZONE_START, camY, BLUE_ZONE_END - BLUE_ZONE_START, groundY - camY + 1000);
        }
        if (camX + viewW > RED_ZONE_START) {
            ctx.fillStyle = "rgba(231, 76, 60, 0.1)";
            ctx.fillRect(RED_ZONE_START, camY, RED_ZONE_END - RED_ZONE_START, groundY - camY + 1000);
        }

        // 멀리 보이는 암흑 왕좌 실루엣
        this.drawDarkThrone(ctx, camX, camY, viewW, viewH, mathNow, false);

        const drawShop = (x, y, team) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 100, 180)) return; ctx.fillStyle = team === 1 ? "#1e3799" : "#c0392b"; ctx.fillRect(x - 100, y - 180, 200, 180); ctx.fillStyle = "#fff"; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center"; ctx.fillText("상점", x, y - 195); };
        const drawSmith = (x, y, team) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 80, 140)) return; ctx.fillStyle = team === 1 ? "#34495e" : "#2c3e50"; ctx.fillRect(x - 80, y - 140, 160, 140); ctx.fillStyle = "#fff"; ctx.font = "bold 24px sans-serif"; ctx.textAlign = "center"; ctx.fillText("대장간", x, y - 150); };
        const drawStorage = (x, y, team) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 70, 100)) return; ctx.fillStyle = "#2c3e50"; ctx.fillRect(x - 70, y - 100, 140, 100); ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("보관함", x, y - 110); };
        const drawSign = (x, y) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 15, 90, 100)) return; ctx.fillStyle = "#8B4513"; ctx.fillRect(x - 7.5, y - 90, 15, 90); ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText("탐지기", x, y - 108); };
        const drawTurret = (x, y, team) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 40, 120)) return; ctx.fillStyle = "#2c3e50"; ctx.fillRect(x - 30, y - 120, 60, 120); ctx.fillStyle = team === 1 ? "#3498db" : "#e74c3c"; ctx.beginPath(); ctx.arc(x, y - 120, 40, 0, Math.PI * 2); ctx.fill(); };
        const drawTestStorage = (x, y, team) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 70, 100)) return; ctx.fillStyle = "#e84393"; ctx.fillRect(x - 70, y - 100, 140, 100); ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("테스트", x, y - 110); };

        drawShop(constants.BLUE_SHOP_X, groundY, 1); drawShop(constants.RED_SHOP_X, groundY, 2);
        drawSmith(constants.BLUE_SMITH_X, groundY, 1); drawSmith(constants.RED_SMITH_X, groundY, 2);
        drawStorage(constants.BLUE_STORAGE_X, groundY, 1); drawStorage(constants.RED_STORAGE_X, groundY, 2);
        
        if (constants.BLUE_TEST_STORAGE_X) drawTestStorage(constants.BLUE_TEST_STORAGE_X, groundY, 1);
        if (constants.RED_TEST_STORAGE_X) drawTestStorage(constants.RED_TEST_STORAGE_X, groundY, 2);
        
        [8600, 9600, 10600, 21400, 22400, 23400].forEach(sx => { if (!detectors.some(d => d.x === sx)) drawSign(sx, groundY); });

        // 🏛️ [신규] 넥서스 본체를 그린다.
        //    예전에는 이름표와 체력바만 있고 건물이 아예 안 그려져 투명했다.
        const drawNexus = (nx, team) => {
            const b = bases[team]; if (!b) return;
            const col = (team === 1) ? "#3498db" : "#e74c3c";
            const dark = (team === 1) ? "#1b4f72" : "#7b241c";
            const lite = (team === 1) ? "#85c1e9" : "#f1948a";
            const gy = groundY;
            const hpF = Math.max(0, b.hp / b.maxHp);

            ctx.save();

            // ── 기단 (3층 계단) ─────────────────────────────────
            for (let k = 0; k < 3; k++) {
                const w = 190 - k * 34, h = 26;
                const yy = gy - k * h;
                ctx.fillStyle = k % 2 ? "#5d6d7e" : "#7f8c8d";
                ctx.fillRect(nx - w / 2, yy - h, w, h);
                ctx.strokeStyle = "#2c3e50"; ctx.lineWidth = 3;
                ctx.strokeRect(nx - w / 2, yy - h, w, h);
            }
            const baseTop = gy - 78;

            // ── 기둥 4개 ────────────────────────────────────────
            for (const px of [-62, -22, 22, 62]) {
                ctx.fillStyle = "#95a5a6";
                ctx.fillRect(nx + px - 9, baseTop - 96, 18, 96);
                ctx.fillStyle = "#bdc3c7";
                ctx.fillRect(nx + px - 9, baseTop - 96, 6, 96);
                ctx.strokeStyle = "#2c3e50"; ctx.lineWidth = 2;
                ctx.strokeRect(nx + px - 9, baseTop - 96, 18, 96);
            }

            // ── 지붕 ────────────────────────────────────────────
            ctx.fillStyle = dark;
            ctx.beginPath();
            ctx.moveTo(nx - 106, baseTop - 96);
            ctx.lineTo(nx + 106, baseTop - 96);
            ctx.lineTo(nx + 78, baseTop - 132);
            ctx.lineTo(nx - 78, baseTop - 132);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#1c2833"; ctx.lineWidth = 3; ctx.stroke();

            // ── 가운데 떠 있는 코어 결정 ────────────────────────
            const cy2 = baseTop - 176 + Math.sin(mathNow / 520) * 8;
            const R = 40;
            // 빛무리
            const gg = ctx.createRadialGradient(nx, cy2, 4, nx, cy2, R * 2.6);
            gg.addColorStop(0, col);
            gg.addColorStop(0.35, col + "88");
            gg.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalAlpha = 0.55 * (0.6 + hpF * 0.4);
            ctx.fillStyle = gg;
            ctx.beginPath(); ctx.arc(nx, cy2, R * 2.6, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;

            // 결정 (마름모)
            ctx.save();
            ctx.translate(nx, cy2);
            ctx.rotate(mathNow / 1600);
            ctx.beginPath();
            ctx.moveTo(0, -R); ctx.lineTo(R * 0.62, 0);
            ctx.lineTo(0, R); ctx.lineTo(-R * 0.62, 0);
            ctx.closePath();
            const cg = ctx.createLinearGradient(0, -R, 0, R);
            cg.addColorStop(0, lite); cg.addColorStop(0.5, col); cg.addColorStop(1, dark);
            ctx.fillStyle = cg; ctx.fill();
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.restore();

            // ── 코어를 감싸는 회전 고리 ─────────────────────────
            ctx.strokeStyle = col; ctx.lineWidth = 4;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.ellipse(nx, cy2, R * 1.7, R * 0.5, mathNow / 900, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;

            // ── 체력이 낮으면 금이 간다 ─────────────────────────
            if (hpF < 0.5) {
                ctx.strokeStyle = "rgba(30,20,10,0.75)"; ctx.lineWidth = 3;
                for (let k = 0; k < 4; k++) {
                    const sx = nx - 70 + k * 40;
                    ctx.beginPath();
                    ctx.moveTo(sx, baseTop - 90);
                    ctx.lineTo(sx + 12, baseTop - 50);
                    ctx.lineTo(sx - 6, baseTop - 18);
                    ctx.stroke();
                }
            }
            ctx.restore();
        };
        if (bases[1]) drawNexus(constants.BLUE_NEXUS_X, 1);
        if (bases[2]) drawNexus(constants.RED_NEXUS_X, 2);

        if (bases[1] && this.isVisible(camX, camY, viewW, viewH, constants.BLUE_NEXUS_X, groundY, 150, 300)) { 
            ctx.fillStyle = "#fff"; ctx.font = "bold 35px sans-serif"; ctx.textAlign = "center"; ctx.fillText("블루 넥서스", constants.BLUE_NEXUS_X, groundY - 270); 
            ctx.fillStyle = "#3498db"; ctx.fillRect(constants.BLUE_NEXUS_X - 98, groundY - 318, 196 * (Math.max(0, bases[1].hp) / bases[1].maxHp), 16); 
            ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.strokeRect(constants.BLUE_NEXUS_X - 98, groundY - 318, 196, 16); 
        }
        if (bases[2] && this.isVisible(camX, camY, viewW, viewH, constants.RED_NEXUS_X, groundY, 150, 300)) { 
            ctx.fillStyle = "#fff"; ctx.font = "bold 35px sans-serif"; ctx.textAlign = "center"; ctx.fillText("레드 넥서스", constants.RED_NEXUS_X, groundY - 270); 
            ctx.fillStyle = "#e74c3c"; ctx.fillRect(constants.RED_NEXUS_X - 98, groundY - 318, 196 * (Math.max(0, bases[2].hp) / bases[2].maxHp), 16); 
            ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5; ctx.strokeRect(constants.RED_NEXUS_X - 98, groundY - 318, 196, 16); 
        }

        if (platforms) { 
            for (let p of platforms) { 
                if (!this.isVisible(camX, camY, viewW, viewH, p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2)) continue; 
                if (p.dark) {
                    ctx.fillStyle = "#26073d"; ctx.fillRect(p.x, p.y, p.w, p.h);
                    ctx.fillStyle = "#7b2fbe"; ctx.fillRect(p.x, p.y, p.w, 8);
                    ctx.fillStyle = "rgba(255, 215, 90, 0.85)"; ctx.fillRect(p.x, p.y, p.w, 3);
                    continue;
                }
                ctx.fillStyle = "#7f8c8d"; ctx.fillRect(p.x, p.y, p.w, p.h); 
                ctx.fillStyle = "#95a5a6"; ctx.fillRect(p.x, p.y, p.w, 8); 
            } 
        }
        drawTurret(12500, groundY, 1); drawTurret(19500, groundY, 2);

        for (let d of detectors) {
            if (!this.isVisible(camX, camY, viewW, viewH, d.x, groundY, 50, 150)) continue;
            ctx.fillStyle = d.team === 1 ? "#2980b9" : "#c0392b"; ctx.fillRect(d.x - 15, groundY - 120, 30, 120); ctx.beginPath(); ctx.arc(d.x, groundY - 120, 45, Math.PI, 0); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText(d.ownerName, d.x, groundY - 185);
            
            if (d.nextMineTime) {
                let left = Math.ceil((d.nextMineTime - mathNow) / 1000);
                if (left > 0) {
                    ctx.fillStyle = "#f1c40f"; ctx.font = "bold 16px sans-serif"; ctx.fillText(`발굴: ${left}초`, d.x, groundY - 215);
                } else {
                    ctx.fillStyle = "#2ecc71"; ctx.font = "bold 16px sans-serif"; ctx.fillText(`발굴 완료!`, d.x, groundY - 215);
                }
            }
            if (d.chest.length > 0) { 
                ctx.fillStyle = "rgba(241, 196, 15, 0.4)"; ctx.beginPath(); ctx.arc(d.x + 90, groundY - 22.5, 60, 0, Math.PI * 2); ctx.fill(); 
                ctx.fillStyle = "#fff"; ctx.font = "bold 24px sans-serif"; ctx.fillText(d.chest.length, d.x + 90, groundY - 65); 
            }
        }

        if (bushes) { 
            for (let b of bushes) { 
                if (!this.isVisible(camX, camY, viewW, viewH, b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2)) continue; 
                ctx.fillStyle = "rgba(34, 139, 34, 0.75)"; ctx.fillRect(b.x, b.y, b.w, b.h); 
            } 
        }
    }

    // ⚫ 암흑 왕좌 배경
    /**
     * 🔥 저주의 왕 — 붉은 하늘에 갈색 바위가 깔린 벌판.
     *    바위는 시드 난수로 배치해 모든 플레이어에게 똑같이 보인다.
     */
    drawCurseLand(ctx, camX, camY, viewW, viewH, mathNow, groundY) {
        const GY = groundY || 2000;

        // ── 하늘 : 검붉은 그라디언트 ────────────────────────────────
        if (!this._curseSky) {
            let g = ctx.createLinearGradient(0, -3000, 0, GY);
            g.addColorStop(0, "#1a0304");
            g.addColorStop(0.45, "#5c0d0c");
            g.addColorStop(0.78, "#a8261a");
            g.addColorStop(1, "#d4552b");
            this._curseSky = g;
        }
        ctx.fillStyle = this._curseSky;
        ctx.fillRect(camX - 20, camY - 20, viewW + 40, (GY - camY) + 40);

        // ── 하늘에 감도는 붉은 기운 ─────────────────────────────────
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        for (let k = 0; k < 3; k++) {
            let hx = camX + viewW * (0.2 + k * 0.3);
            let hy = camY + viewH * 0.22 + Math.sin(mathNow / 2600 + k) * 40;
            let rr = viewH * 0.5;
            let hg = ctx.createRadialGradient(hx, hy, 10, hx, hy, rr);
            hg.addColorStop(0, "rgba(255, 96, 40, 0.20)");
            hg.addColorStop(1, "rgba(120, 20, 10, 0)");
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.arc(hx, hy, rr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // ── 지면 : 마른 붉은 흙 ─────────────────────────────────────
        let gg = ctx.createLinearGradient(0, GY, 0, GY + 900);
        gg.addColorStop(0, "#6b3220");
        gg.addColorStop(0.35, "#4a2016");
        gg.addColorStop(1, "#2a0f0a");
        ctx.fillStyle = gg;
        ctx.fillRect(camX - 20, GY, viewW + 40, 1000);

        // 지면 경계선
        ctx.fillStyle = "rgba(214, 96, 48, 0.8)";
        ctx.fillRect(camX - 20, GY, viewW + 40, 6);

        // ── 갈색 바위 : 화면에 보이는 구간만 시드로 만들어 그린다 ────
        const CELL = 320;
        const startI = Math.floor((camX - 200) / CELL);
        const endI = Math.ceil((camX + viewW + 200) / CELL);

        for (let i = startI; i <= endI; i++) {
            // 셀 번호로 결정론적 난수 (모두에게 같은 배치)
            let s = (i * 1103515245 + 12345) >>> 0;
            const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

            const count = 1 + Math.floor(rnd() * 3);
            for (let k = 0; k < count; k++) {
                const bx = i * CELL + rnd() * CELL;
                const scale = 0.5 + rnd() * 1.3;
                const w = 70 * scale, h = 46 * scale;
                const by = GY - h * 0.34;
                const tone = 0.55 + rnd() * 0.4;

                const r0 = Math.round(126 * tone), g0 = Math.round(84 * tone), b0 = Math.round(54 * tone);

                // 바위 몸통 (다각형)
                ctx.beginPath();
                ctx.moveTo(bx - w * 0.5, by + h * 0.5);
                ctx.lineTo(bx - w * 0.36, by - h * 0.25);
                ctx.lineTo(bx - w * 0.05, by - h * 0.5);
                ctx.lineTo(bx + w * 0.32, by - h * 0.3);
                ctx.lineTo(bx + w * 0.5, by + h * 0.5);
                ctx.closePath();
                ctx.fillStyle = `rgb(${r0},${g0},${b0})`;
                ctx.fill();

                // 윗면 하이라이트
                ctx.beginPath();
                ctx.moveTo(bx - w * 0.36, by - h * 0.25);
                ctx.lineTo(bx - w * 0.05, by - h * 0.5);
                ctx.lineTo(bx + w * 0.32, by - h * 0.3);
                ctx.lineTo(bx + w * 0.02, by - h * 0.12);
                ctx.closePath();
                ctx.fillStyle = `rgba(${r0 + 46},${g0 + 34},${b0 + 24},0.9)`;
                ctx.fill();

                // 그림자
                ctx.fillStyle = "rgba(30, 10, 6, 0.35)";
                ctx.beginPath();
                ctx.ellipse(bx, GY + 6, w * 0.55, h * 0.16, 0, 0, Math.PI * 2);
                ctx.fill();

                // 테두리
                ctx.strokeStyle = "rgba(40, 16, 10, 0.75)";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(bx - w * 0.5, by + h * 0.5);
                ctx.lineTo(bx - w * 0.36, by - h * 0.25);
                ctx.lineTo(bx - w * 0.05, by - h * 0.5);
                ctx.lineTo(bx + w * 0.32, by - h * 0.3);
                ctx.lineTo(bx + w * 0.5, by + h * 0.5);
                ctx.stroke();
            }
        }
    }

    drawDarkThrone(ctx, camX, camY, viewW, viewH, mathNow, full) {
        const A = (typeof window !== 'undefined' && window.DARK_AREA) ? window.DARK_AREA : { minX: 36000, maxX: 41000, minY: 600, maxY: 2060 };
        const DZ = (typeof window !== 'undefined' && window.DARK_ZONE_X) ? window.DARK_ZONE_X : { min: 35400, max: 41600 };
        const cx = (A.minX + A.maxX) / 2;

        if (!full) {
            if (!this.isVisible(camX, camY, viewW, viewH, cx, A.maxY, (A.maxX - A.minX) / 2 + 400, 1200)) return;
        }

        const left = full ? camX : DZ.min;
        const right = full ? (camX + viewW + 2) : DZ.max;
        const top = full ? camY : (A.minY - 1400);
        const bottom = full ? (camY + viewH + 2) : (A.maxY + 1200);
        const w = right - left;
        const h = bottom - top;
        if (w <= 0 || h <= 0) return;

        if (!this.cachedDarkGrad) {
            this.cachedDarkGrad = ctx.createLinearGradient(0, -1400, 0, 2400);
            this.cachedDarkGrad.addColorStop(0, "#04000a");
            this.cachedDarkGrad.addColorStop(0.42, "#1a0430");
            this.cachedDarkGrad.addColorStop(0.78, "#2d0a4d");
            this.cachedDarkGrad.addColorStop(1, "#0d0118");
        }

        ctx.save();
        ctx.fillStyle = this.cachedDarkGrad;
        ctx.fillRect(left, top, w, h);

        ctx.globalCompositeOperation = "screen";
        let fog = ctx.createRadialGradient(cx, A.maxY - 300, 60, cx, A.maxY - 300, 2600);
        fog.addColorStop(0, "rgba(150, 60, 240, 0.30)");
        fog.addColorStop(0.55, "rgba(90, 20, 160, 0.16)");
        fog.addColorStop(1, "rgba(30, 0, 60, 0)");
        ctx.fillStyle = fog;
        ctx.fillRect(left, top, w, h);
        ctx.globalCompositeOperation = "source-over";

        ctx.lineCap = "round"; ctx.lineJoin = "round";
        const gw = A.maxX - A.minX;
        for (let v = 0; v < 16; v++) {
            let baseX = A.minX + ((v + 0.5) / 16) * gw;
            let sway = Math.sin(v * 1.7 + mathNow / 1400) * 40;
            let glow = 0.45 + Math.abs(Math.sin(v * 2.3 + mathNow / 900)) * 0.45;
            let gTop = A.minY - 1100;
            let gH = (A.maxY - gTop);

            ctx.strokeStyle = `rgba(160, 70, 250, ${0.35 * glow})`;
            ctx.lineWidth = 14;
            ctx.beginPath();
            for (let s = 0; s <= 6; s++) {
                let t = s / 6;
                let yy = gTop + t * gH;
                let xx = baseX + Math.sin(t * 5 + v * 2.1) * 90 + sway * t;
                if (s === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 214, 92, ${0.85 * glow})`;
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            for (let s = 0; s <= 6; s++) {
                let t = s / 6;
                let yy = gTop + t * gH;
                let xx = baseX + Math.sin(t * 5 + v * 2.1) * 90 + sway * t;
                if (s === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
        }

        ctx.globalCompositeOperation = "screen";
        for (let d = 0; d < 26; d++) {
            let t = ((mathNow / 4200) + d * 0.038) % 1;
            let dx = A.minX + ((d * 397) % gw);
            let dy = A.maxY - t * 1600;
            let a = (1 - t) * 0.8;
            ctx.fillStyle = `rgba(255, 226, 130, ${a})`;
            ctx.beginPath(); ctx.arc(dx, dy, 3.5 + (d % 3), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";

        ctx.font = "bold 90px sans-serif"; ctx.textAlign = "center"; ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(20, 0, 35, 0.95)"; ctx.lineWidth = 10;
        ctx.strokeText("암 흑 왕 좌", cx, A.minY - 200);
        let tg = ctx.createLinearGradient(cx - 300, 0, cx + 300, 0);
        tg.addColorStop(0, "#7b2fbe"); tg.addColorStop(0.5, "#ffd95e"); tg.addColorStop(1, "#7b2fbe");
        ctx.fillStyle = tg;
        ctx.fillText("암 흑 왕 좌", cx, A.minY - 200);

        ctx.restore();
    }

    isVisible(camX, camY, viewW, viewH, objX, objY, objW = 0, objH = 0, padding = 300) {
        return (objX + objW > camX - padding) &&
               (objX - objW < camX + viewW + padding) &&
               (objY + objH > camY - padding) &&
               (objY - objH < camY + viewH + padding);
    }
}