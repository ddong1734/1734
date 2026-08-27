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

        // ══════════════════════════════════════════════════════════════
        // 🌳 중앙 정글 배경 — 나무 · 바위 · 구름
        //    시드 난수라 매 프레임 같은 자리에 그려진다.
        // ══════════════════════════════════════════════════════════════
        const jr = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

        const drawJungleProps = () => {
            // 🌳 각 진영(넥서스 12250 / 19750 · 상점 11800 / 20200 · 대장간 · 저장소)을
            //    넉넉히 피한 '중앙 정글' 구간에만 심는다.
            const J0 = 13300, J1 = 18700;
            if (camX > J1 || camX + viewW < J0) return;
            // ── 🌳 나무 22그루 ─────────────────────────────────
            for (let i = 0; i < 22; i++) {
                const x = J0 + jr(i) * (J1 - J0);
                if (x < camX - 260 || x > camX + viewW + 260) continue;
                const sc = 0.65 + jr(i + 90) * 0.6;
                const th = 190 * sc;
                // 줄기
                ctx.fillStyle = "#5b3d22";
                ctx.beginPath();
                ctx.moveTo(x - 13 * sc, groundY);
                ctx.lineTo(x - 8 * sc, groundY - th);
                ctx.lineTo(x + 8 * sc, groundY - th);
                ctx.lineTo(x + 13 * sc, groundY);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = "#3a2614"; ctx.lineWidth = 3; ctx.stroke();
                // 잎 3덩이
                for (let k = 0; k < 3; k++) {
                    const lx = x + (k - 1) * 36 * sc;
                    const ly = groundY - th - 18 * sc + Math.abs(k - 1) * 26 * sc;
                    const lr = (60 - Math.abs(k - 1) * 14) * sc;
                    const lg = ctx.createRadialGradient(lx - lr * 0.3, ly - lr * 0.3, lr * 0.2, lx, ly, lr);
                    lg.addColorStop(0, "#4fa85f");
                    lg.addColorStop(0.6, "#2f7d43");
                    lg.addColorStop(1, "#1c5a2e");
                    ctx.fillStyle = lg;
                    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = "#164826"; ctx.lineWidth = 2.5; ctx.stroke();
                }
            }
            // ── 🪨 바위 16개 ───────────────────────────────────
            for (let i = 0; i < 16; i++) {
                const x = J0 + jr(i + 200) * (J1 - J0);
                if (x < camX - 160 || x > camX + viewW + 160) continue;
                const r = 22 + jr(i + 300) * 34;
                ctx.beginPath();
                for (let k = 0; k < 7; k++) {
                    const a = (k / 7) * Math.PI * 2;
                    const rr = r * (0.72 + jr(i * 7 + k) * 0.5);
                    const px = x + Math.cos(a) * rr, py = groundY - Math.abs(Math.sin(a)) * rr * 0.75;
                    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                const rg = ctx.createLinearGradient(x - r, groundY - r, x + r, groundY);
                rg.addColorStop(0, "#9aa2ad"); rg.addColorStop(0.5, "#6d7784"); rg.addColorStop(1, "#454d58");
                ctx.fillStyle = rg; ctx.fill();
                ctx.strokeStyle = "#2f353d"; ctx.lineWidth = 3; ctx.stroke();
            }
            // ── 🌿 풀 40포기 ───────────────────────────────────
            ctx.strokeStyle = "#3f8f4e"; ctx.lineWidth = 3; ctx.lineCap = "round";
            for (let i = 0; i < 40; i++) {
                const x = J0 + jr(i + 400) * (J1 - J0);
                if (x < camX - 40 || x > camX + viewW + 40) continue;
                const h = 16 + jr(i + 500) * 20;
                const sway = Math.sin(mathNow / 900 + i) * 5;
                ctx.beginPath();
                ctx.moveTo(x, groundY);
                ctx.quadraticCurveTo(x + sway * 0.5, groundY - h * 0.6, x + sway, groundY - h);
                ctx.stroke();
            }
        };

        // ☁️ 구름 — 할배새끼(y≈1400) 위, 박힌범(y≈900) 아래 사이에 분포
        const drawClouds = () => {
            // ☁️ 박힌범(공중 바구니) 바로 아래 ~ 할배새끼가 노는 높이 위쪽 사이.
            //    HINBEOM_AREA 는 minY(위) ~ maxY(아래) 다.
            const HA = (typeof window !== 'undefined' && window.HINBEOM_AREA)
                     ? window.HINBEOM_AREA : { minY: -2400, maxY: -1340 };
            const CY0 = HA.maxY + 80;      // 박힌범 바구니 아래
            const CY1 = HA.maxY + 620;     // 할배새끼가 내려오는 높이 위쪽
            for (let i = 0; i < 26; i++) {
                const baseX = 11500 + jr(i + 700) * 9000;
                // 아주 천천히 흐른다
                const x = baseX + ((mathNow / 90) * (0.25 + jr(i + 800) * 0.4)) % 9000;
                const wx = ((x - 11500) % 9000) + 11500;
                if (wx < camX - 400 || wx > camX + viewW + 400) continue;
                const y = CY0 + jr(i + 900) * (CY1 - CY0);
                const sc = 0.6 + jr(i + 1000) * 0.9;
                ctx.save();
                ctx.globalAlpha = 0.26 + jr(i + 1100) * 0.22;
                ctx.fillStyle = "#ffffff";
                for (let k = 0; k < 4; k++) {
                    const cxx = wx + (k - 1.5) * 52 * sc;
                    const cyy = y + Math.sin(k * 1.7 + i) * 12 * sc;
                    const cr = (46 - Math.abs(k - 1.5) * 11) * sc;
                    ctx.beginPath(); ctx.arc(cxx, cyy, cr, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }
        };

        drawClouds();
        drawJungleProps();

        // ══════════════════════════════════════════════════════════════
        // 🏪 건물 — 이름에 맞는 생김새로 그린다
        // ══════════════════════════════════════════════════════════════
        const bldgBase = (x, y, w, h, wallA, wallB) => {
            const g = ctx.createLinearGradient(x - w, y - h, x + w, y);
            g.addColorStop(0, wallA); g.addColorStop(1, wallB);
            ctx.fillStyle = g; ctx.fillRect(x - w, y - h, w * 2, h);
            ctx.strokeStyle = "#1c2833"; ctx.lineWidth = 5; ctx.strokeRect(x - w, y - h, w * 2, h);
        };
        const bldgRoof = (x, y, w, rh, col) => {
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(x - w * 1.12, y); ctx.lineTo(x, y - rh); ctx.lineTo(x + w * 1.12, y);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#1c2833"; ctx.lineWidth = 5; ctx.stroke();
        };
        const bldgDoor = (x, y, w, h, col) => {
            ctx.fillStyle = col || "#4a3520";
            ctx.fillRect(x - w / 2, y - h, w, h);
            ctx.strokeStyle = "#1c2833"; ctx.lineWidth = 4; ctx.strokeRect(x - w / 2, y - h, w, h);
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath(); ctx.arc(x + w * 0.28, y - h * 0.5, 5, 0, Math.PI * 2); ctx.fill();
        };
        const bldgLabel = (x, y, text, col, size) => {
            ctx.font = "bold " + (size || 26) + "px sans-serif"; ctx.textAlign = "center";
            ctx.lineWidth = 6; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(10,12,16,0.9)";
            ctx.strokeText(text, x, y); ctx.fillStyle = col || "#fff"; ctx.fillText(text, x, y);
        };

        // 🏪 상점 — 차양(스트라이프 천막) + 진열창
        const drawShop = (x, y, team) => {
            if (!this.isVisible(camX, camY, viewW, viewH, x, y, 110, 200)) return;
            const main = team === 1 ? "#2d4ea8" : "#b53228";
            bldgBase(x, y, 100, 150, main, team === 1 ? "#15265c" : "#6e1c14");
            // 진열창 2개
            for (const dx of [-52, 52]) {
                ctx.fillStyle = "rgba(180,230,255,0.85)";
                ctx.fillRect(x + dx - 34, y - 128, 68, 54);
                ctx.strokeStyle = "#1c2833"; ctx.lineWidth = 4;
                ctx.strokeRect(x + dx - 34, y - 128, 68, 54);
                ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(x + dx - 26, y - 78); ctx.lineTo(x + dx + 20, y - 122); ctx.stroke();
            }
            bldgDoor(x, y, 54, 78);
            // 차양 (빨강/흰 줄무늬)
            for (let k = 0; k < 8; k++) {
                ctx.fillStyle = (k % 2) ? "#ecf0f1" : "#e74c3c";
                ctx.beginPath();
                ctx.moveTo(x - 112 + k * 28, y - 150);
                ctx.lineTo(x - 112 + (k + 1) * 28, y - 150);
                ctx.lineTo(x - 106 + (k + 1) * 28, y - 118);
                ctx.lineTo(x - 106 + k * 28, y - 118);
                ctx.closePath(); ctx.fill();
            }
            ctx.strokeStyle = "#1c2833"; ctx.lineWidth = 4;
            ctx.strokeRect(x - 112, y - 150, 224, 32);
            // 💰 간판
            bldgLabel(x, y - 168, "🛒 상점", "#ffe27a", 28);
        };

        // 🔨 대장간 — 굴뚝 + 모루 + 불빛
        const drawSmith = (x, y, team) => {
            if (!this.isVisible(camX, camY, viewW, viewH, x, y, 95, 170)) return;
            bldgBase(x, y, 85, 130, "#4b5563", "#242b36");
            // 굴뚝
            ctx.fillStyle = "#5d6d7e"; ctx.fillRect(x + 40, y - 178, 34, 52);
            ctx.strokeStyle = "#1c2833"; ctx.lineWidth = 4; ctx.strokeRect(x + 40, y - 178, 34, 52);
            // 연기
            for (let k = 0; k < 3; k++) {
                const f = ((mathNow / 1400) + k / 3) % 1;
                ctx.globalAlpha = (1 - f) * 0.45;
                ctx.fillStyle = "#aab2bd";
                ctx.beginPath(); ctx.arc(x + 57 + Math.sin(f * 5 + k) * 12, y - 182 - f * 70, 12 + f * 16, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
            // 화덕 불빛
            const fg = ctx.createRadialGradient(x - 34, y - 52, 4, x - 34, y - 52, 44);
            fg.addColorStop(0, "rgba(255,220,120,0.95)");
            fg.addColorStop(0.5, "rgba(255,120,30,0.7)");
            fg.addColorStop(1, "rgba(255,80,0,0)");
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(x - 34, y - 52, 44 + Math.sin(mathNow / 180) * 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#1c2833"; ctx.fillRect(x - 58, y - 56, 48, 42);
            // 모루
            ctx.fillStyle = "#2f3640";
            ctx.beginPath();
            ctx.moveTo(x + 6, y - 44); ctx.lineTo(x + 74, y - 44); ctx.lineTo(x + 62, y - 28);
            ctx.lineTo(x + 52, y - 28); ctx.lineTo(x + 52, y - 10); ctx.lineTo(x + 22, y - 10);
            ctx.lineTo(x + 22, y - 28); ctx.lineTo(x + 12, y - 28);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#0f1318"; ctx.lineWidth = 3; ctx.stroke();
            bldgLabel(x, y - 190, "🔨 대장간", "#f0b27a", 24);
        };

        // 📦 저장소 — 나무 상자와 자물쇠
        const drawStorage = (x, y, team) => {
            if (!this.isVisible(camX, camY, viewW, viewH, x, y, 80, 130)) return;
            bldgBase(x, y, 72, 104, "#2ecc71", "#14663a");
            // 나무 상자 3개
            for (let k = 0; k < 3; k++) {
                const bx = x - 40 + (k % 2) * 46, by = y - 20 - Math.floor(k / 2) * 40;
                ctx.fillStyle = "#a5713a"; ctx.fillRect(bx - 20, by - 32, 40, 32);
                ctx.strokeStyle = "#5b3d1d"; ctx.lineWidth = 3; ctx.strokeRect(bx - 20, by - 32, 40, 32);
                ctx.beginPath(); ctx.moveTo(bx - 20, by - 32); ctx.lineTo(bx + 20, by); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(bx + 20, by - 32); ctx.lineTo(bx - 20, by); ctx.stroke();
            }
            // 자물쇠
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(x + 26, y - 76, 26, 22);
            ctx.strokeStyle = "#8a6d0b"; ctx.lineWidth = 3; ctx.strokeRect(x + 26, y - 76, 26, 22);
            ctx.beginPath(); ctx.arc(x + 39, y - 78, 9, Math.PI, 0); ctx.stroke();
            bldgLabel(x, y - 120, "📦 저장소", "#7ee8a2", 23);
        };

        // 🧪 테스트 창고 — 실험 플라스크
        const drawTestStorage = (x, y, team) => {
            if (!this.isVisible(camX, camY, viewW, viewH, x, y, 78, 120)) return;
            bldgBase(x, y, 70, 96, "#e84393", "#7d1f4d");
            // 플라스크 2개
            for (const dx of [-32, 30]) {
                ctx.fillStyle = "rgba(220,250,255,0.9)";
                ctx.beginPath();
                ctx.moveTo(x + dx - 8, y - 76); ctx.lineTo(x + dx + 8, y - 76);
                ctx.lineTo(x + dx + 22, y - 22); ctx.lineTo(x + dx - 22, y - 22);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = "#1c2833"; ctx.lineWidth = 3; ctx.stroke();
                // 안의 액체
                ctx.fillStyle = (dx < 0) ? "rgba(110,230,255,0.9)" : "rgba(255,220,90,0.9)";
                ctx.beginPath();
                ctx.moveTo(x + dx - 15, y - 44); ctx.lineTo(x + dx + 15, y - 44);
                ctx.lineTo(x + dx + 22, y - 22); ctx.lineTo(x + dx - 22, y - 22);
                ctx.closePath(); ctx.fill();
                // 보글보글
                for (let k = 0; k < 2; k++) {
                    const f = ((mathNow / 800) + k / 2 + (dx < 0 ? 0 : 0.3)) % 1;
                    ctx.globalAlpha = 1 - f;
                    ctx.fillStyle = "#fff";
                    ctx.beginPath(); ctx.arc(x + dx + (k ? 6 : -6), y - 26 - f * 20, 3.5, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
            bldgLabel(x, y - 112, "🧪 테스트", "#ffb3d9", 21);
        };

        const drawSign = (x, y) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 15, 90, 100)) return; ctx.fillStyle = "#8B4513"; ctx.fillRect(x - 7.5, y - 90, 15, 90); ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.fillText("탐지기", x, y - 108); };
        const drawTurret = (x, y, team) => { if (!this.isVisible(camX, camY, viewW, viewH, x, y, 40, 120)) return; ctx.fillStyle = "#2c3e50"; ctx.fillRect(x - 30, y - 120, 60, 120); ctx.fillStyle = team === 1 ? "#3498db" : "#e74c3c"; ctx.beginPath(); ctx.arc(x, y - 120, 40, 0, Math.PI * 2); ctx.fill(); };

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
        // ══════════════════════════════════════════════════════════════
        // 🕶️ 암매상 — 맵 중앙 맨 아래 (할배새끼와 같은 x)
        // ══════════════════════════════════════════════════════════════
        const bm = (typeof window !== 'undefined') ? window.blackMarket : null;
        if (bm && this.isVisible(camX, camY, viewW, viewH, bm.x, bm.y, 140, 220)) {
            const bx = bm.x, by = bm.y;

            // 좌판 (천막)
            ctx.fillStyle = "#3b2a52";
            ctx.beginPath();
            ctx.moveTo(bx - 100, by - 96); ctx.lineTo(bx + 100, by - 96);
            ctx.lineTo(bx + 78, by - 132); ctx.lineTo(bx - 78, by - 132);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#1a1226"; ctx.lineWidth = 5; ctx.stroke();
            // 기둥
            for (const dx of [-88, 88]) {
                ctx.fillStyle = "#4a3520";
                ctx.fillRect(bx + dx - 7, by - 96, 14, 96);
                ctx.strokeStyle = "#241a10"; ctx.lineWidth = 3;
                ctx.strokeRect(bx + dx - 7, by - 96, 14, 96);
            }
            // 매대
            ctx.fillStyle = "#5b4230";
            ctx.fillRect(bx - 92, by - 44, 184, 18);
            ctx.strokeStyle = "#2b1e14"; ctx.lineWidth = 4;
            ctx.strokeRect(bx - 92, by - 44, 184, 18);
            // 매대 위 물건들
            const goods = ["#f1c40f", "#4fd8d0", "#e74c3c", "#e67e22", "#9b59b6"];
            goods.forEach((c, k) => {
                const gx = bx - 66 + k * 33;
                ctx.fillStyle = c;
                ctx.beginPath(); ctx.arc(gx, by - 54, 9, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "#1a1226"; ctx.lineWidth = 2.5; ctx.stroke();
            });

            // 🕶️ 상인 (후드를 쓴 실루엣)
            ctx.fillStyle = "#241833";
            ctx.beginPath();
            ctx.moveTo(bx - 26, by - 26);
            ctx.quadraticCurveTo(bx, by - 118, bx + 26, by - 26);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#0f0a17"; ctx.lineWidth = 4; ctx.stroke();
            // 빛나는 눈
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = 0.7 + Math.sin(mathNow / 260) * 0.3;
            for (const dx of [-8, 8]) {
                const eg2 = ctx.createRadialGradient(bx + dx, by - 74, 1, bx + dx, by - 74, 10);
                eg2.addColorStop(0, "rgba(255,255,255,1)");
                eg2.addColorStop(0.4, "rgba(200,120,255,0.95)");
                eg2.addColorStop(1, "rgba(120,40,180,0)");
                ctx.fillStyle = eg2;
                ctx.beginPath(); ctx.arc(bx + dx, by - 74, 10, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();

            // ⏱️ 머리 위 5분 카운트다운
            const left = Math.max(0, (bm.nextRollAt || 0) - Date.now());
            const mm = Math.floor(left / 60000);
            const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
            const txt = mm + ':' + ss;
            ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
            ctx.lineWidth = 5; ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(10,6,16,0.92)";
            ctx.strokeText("⏱️ " + txt, bx, by - 148);
            ctx.fillStyle = (left < 30000) ? "#ff6b6b" : "#c9a2ff";
            ctx.fillText("⏱️ " + txt, bx, by - 148);
            // 간판
            ctx.font = "bold 22px sans-serif";
            ctx.lineWidth = 6; ctx.strokeStyle = "rgba(10,6,16,0.92)";
            ctx.strokeText("🕶️ 암매상", bx, by - 172);
            ctx.fillStyle = "#b07cff";
            ctx.fillText("🕶️ 암매상", bx, by - 172);
        }

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