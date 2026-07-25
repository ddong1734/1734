// 파일명: renderMap.js

export class RenderMap {
    constructor() {
        this.cachedSkyGrad = null;
        this.cachedGroundGrad = null;
    }

    render(ctx, state) {
        const { camX, camY, viewW, viewH, groundY, worldWidth, constants, bases, detectors, platforms, bushes, mathNow } = state;
        
        if (!this.cachedSkyGrad || !this.cachedGroundGrad) {
            // 🌌 고도가 높아질수록 하늘이 훨씬 더 어두워지도록 대비 강화 (정글 최상층까지 커버)
            this.cachedSkyGrad = ctx.createLinearGradient(0, -3000, 0, groundY); 
            this.cachedSkyGrad.addColorStop(0, "#060d20"); 
            this.cachedSkyGrad.addColorStop(0.28, "#152b55"); 
            this.cachedSkyGrad.addColorStop(0.55, "#3b6ea5"); 
            this.cachedSkyGrad.addColorStop(0.78, "#87CEEB"); 
            this.cachedSkyGrad.addColorStop(1, "#E0F6FF"); 
            this.cachedGroundGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 1000); 
            this.cachedGroundGrad.addColorStop(0, "#228B22"); this.cachedGroundGrad.addColorStop(1, "#145214"); 
        }

        ctx.fillStyle = this.cachedSkyGrad; ctx.fillRect(camX, camY, viewW + 2, groundY - camY);
        ctx.fillStyle = this.cachedGroundGrad; ctx.fillRect(camX, groundY, viewW + 2, 1000);
        
        if (camX < 11000) { ctx.fillStyle = "rgba(52, 152, 219, 0.1)"; ctx.fillRect(0, 0, 11000, groundY); }
        if (camX + viewW > worldWidth - 11000) { ctx.fillStyle = "rgba(231, 76, 60, 0.1)"; ctx.fillRect(worldWidth - 11000, 0, 11000, groundY); }

        const drawShop = (x, y, team) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 100, 180)) return; ctx.fillStyle = team === 1 ? "#1e3799" : "#c0392b"; ctx.fillRect(x - 100, y - 180, 200, 180); ctx.fillStyle = "#fff"; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center"; ctx.fillText("상점", x, y - 195); };
        const drawSmith = (x, y, team) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 80, 140)) return; ctx.fillStyle = team === 1 ? "#34495e" : "#2c3e50"; ctx.fillRect(x - 80, y - 140, 160, 140); ctx.fillStyle = "#fff"; ctx.font = "bold 24px sans-serif"; ctx.textAlign = "center"; ctx.fillText("대장간", x, y - 150); };
        const drawStorage = (x, y, team) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 70, 100)) return; ctx.fillStyle = "#2c3e50"; ctx.fillRect(x - 70, y - 100, 140, 100); ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("보관함", x, y - 110); };
        const drawSign = (x, y) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 15, 90, 100)) return; ctx.fillStyle = "#8B4513"; ctx.fillRect(x - 7.5, y - 90, 15, 90); ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText("탐지기", x, y - 108); };
        const drawTurret = (x, y, team) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 40, 120)) return; ctx.fillStyle = "#2c3e50"; ctx.fillRect(x - 30, y - 120, 60, 120); ctx.fillStyle = team === 1 ? "#3498db" : "#e74c3c"; ctx.beginPath(); ctx.arc(x, y - 120, 40, 0, Math.PI * 2); ctx.fill(); };

        // 🛠️ 테스트 창고를 렌더링하는 함수 (자주색)
        const drawTestStorage = (x, y, team) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 70, 100)) return; ctx.fillStyle = "#e84393"; ctx.fillRect(x - 70, y - 100, 140, 100); ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("테스트", x, y - 110); };

        drawShop(constants.BLUE_SHOP_X, groundY, 1); drawShop(constants.RED_SHOP_X, groundY, 2);
        drawSmith(constants.BLUE_SMITH_X, groundY, 1); drawSmith(constants.RED_SMITH_X, groundY, 2);
        drawStorage(constants.BLUE_STORAGE_X, groundY, 1); drawStorage(constants.RED_STORAGE_X, groundY, 2);
        
        // 🛠️ 맵에 테스트 창고 렌더링
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

    isVisible(camX, camY, viewW, viewH, objX, objY, objW = 0, objH = 0, padding = 300) {
        return (objX + objW > camX - padding) &&
               (objX - objW < camX + viewW + padding) &&
               (objY + objH > camY - padding) &&
               (objY - objH < camY + viewH + padding);
    }
}