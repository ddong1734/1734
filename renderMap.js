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