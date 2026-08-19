const CharactersData = {
    PARK: {
        name: "박인범",
        hp: 3000, baseDamage: 50, attackCooldown: 600, speedMult: 1.0,
        attackEffect: "punch", attackKnockback: 15, attackSlowDuration: 250,
        themeColor: "#000", castMessage: "🌀 기절 (공기 모으는 중)", castColor: "rgba(255, 255, 255, 0.3)",
        skillIds: ["PARK_S1", "PARK_S2", "PARK_S3"]
    },
    BORSALINO: {
        name: "볼사리노", hp: 2500, baseDamage: 40, attackCooldown: 250, speedMult: 1.2,
        attackEffect: "ama_no_murakumo", attackKnockback: 0, attackSlowDuration: 150,
        themeColor: "#f1c40f", castMessage: "✨ 빛의 힘 모으는 중", castColor: "rgba(241, 196, 15, 0.3)",
        skillIds: ["BORSALINO_S1", "BORSALINO_S2", "BORSALINO_S3"]
    },
    KUZAN: {
        name: "쿠잔", hp: 2800, baseDamage: 45, attackCooldown: 500, speedMult: 1.05,
        attackEffect: "ice_glove", attackKnockback: 0, attackSlowDuration: 300,
        themeColor: "#3498db", castMessage: "❄️ 냉기 방출 중", castColor: "rgba(52, 152, 219, 0.3)",
        skillIds: ["KUZAN_S1", "KUZAN_S2", "KUZAN_S3"]
    },
    SAKAZUKI: {
        name: "사카즈키", hp: 3200, baseDamage: 55, attackCooldown: 550, speedMult: 1.0,
        attackEffect: "magma_punch", attackKnockback: 0, attackSlowDuration: 250,
        themeColor: "#e74c3c", castMessage: "🌋 마그마 응축 중", castColor: "rgba(231, 76, 60, 0.3)",
        skillIds: ["SAKAZUKI_S1", "SAKAZUKI_S2", "SAKAZUKI_S3"]
    },
    ENEL: {
        name: "에넬", hp: 2600, baseDamage: 60, attackCooldown: 450, speedMult: 1.1,
        attackEffect: "thunder_bolt", attackKnockback: 0, attackSlowDuration: 200,
        themeColor: "#00bfff", castMessage: "⚡ 뇌전 응축 중", castColor: "rgba(0, 191, 255, 0.3)",
        skillIds: ["ENEL_S1", "ENEL_S2", "ENEL_S3"]
    },
    // ⚡ 카시모 하지메 — 보랏빛 전기 특성
    //    · 기본 이동속도 1.0 (다른 캐릭터와 동일)
    //    · 평타 피해 80 (모든 대상에게 예외 없이 적용)
    //    · 카시모를 '평타로 때린' 대상은 보라색 전류 반격 50 을 되받는다
    //      (때린 쪽이 에넬 · 카시모 본인이면 면제)
    //    · 카시모가 평타로 때린 대상에게는 전하(電荷) 스택이 1칸씩 쌓인다
    KASHIMO: {
        name: "카시모 하지메", hp: 2400, baseDamage: 80, attackCooldown: 400, speedMult: 1.0,
        attackEffect: "kashimo_strike", attackKnockback: 0, attackSlowDuration: 150,
        themeColor: "#a855f7", castMessage: "⚡ 전하 응축 중", castColor: "rgba(168, 85, 247, 0.3)",
        skillIds: ["KASHIMO_S1", "KASHIMO_S2", "KASHIMO_S3"]
    },
    // ⬛ [신규] 다부라 카라바 — 빛과 어둠을 함께 다루는 이형(異形)
    //    · 1번 [빛]           : 위로 솟구친 뒤 아래로 2초간 빛 연속폭발
    //    · 2번 [어둠]         : 몸 중심에 어둠 구체 + 칼바람 소용돌이 (3초 흡인 후 폭발)
    //    · 3번 [아광속 발차기] : 2초 응축 후 빛으로 변해 5초간 활공, 적중 시 대폭발
    DABURA: {
        name: "다부라 카라바", hp: 2700, baseDamage: 55, attackCooldown: 450, speedMult: 1.1,
        attackEffect: "dabura_strike", attackKnockback: 0, attackSlowDuration: 200,
        themeColor: "#cbd5e1", castMessage: "☀️🌑 빛과 어둠 응축 중", castColor: "rgba(240, 240, 245, 0.32)",
        skillIds: ["DABURA_S1", "DABURA_S2", "DABURA_S3"]
    },

    // ⚔️ [신규] 다이도 하가네 — 검 하나로 모든 걸 베는 검사
    //    · 1번 [무자비]     : 1.5초간 제자리에서 전방위로 검을 휘두른다
    //    · 2번 [질풍참]     : 2초간 돌진하며 베고, 맞은 적을 끌어당긴 뒤 360도 마무리
    //    · 3번 [일섬]       : 0.5초 후 전방으로 크게 베어 출혈을 남긴다
    //    · 평타 3연타마다 짧은 전방위 베기가 나간다
    DAIDO: {
        name: "다이도 하가네", hp: 2600, baseDamage: 60, attackCooldown: 420, speedMult: 1.15,
        attackEffect: "daido_slash", attackKnockback: 0, attackSlowDuration: 150,
        themeColor: "#9fd8ff", castMessage: "⚔️ 검을 벼리는 중", castColor: "rgba(180, 220, 255, 0.30)",
        skillIds: ["DAIDO_S1", "DAIDO_S2", "DAIDO_S3"]
    },

    // 🕊️ [신규] 쿠루스 하나 — 신성력을 다루는 성직자
    //    · 점프 불가. 점프 버튼을 누르고 있으면 천천히 떠오르고, 떼면 천천히 내려온다.
    //    · 고유 패시브 [신성력] : 10초마다 1씩 차오르며 최대 50.
    //      가득 차면 2·3번 스킬이 강화되고, 강화 스킬을 쓰면 0으로 돌아간다.
    KURUSU: {
        name: "쿠루스 하나", hp: 1000, baseDamage: 45, attackCooldown: 500, speedMult: 1.05,
        attackEffect: "kurusu_strike", attackKnockback: 0, attackSlowDuration: 150,
        themeColor: "#ffe27a", castMessage: "🕊️ 신성력을 모으는 중", castColor: "rgba(255, 226, 122, 0.30)",
        skillIds: ["KURUSU_S1", "KURUSU_S2", "KURUSU_S3"]
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = CharactersData;
} else if (typeof window !== "undefined") {
    window.Characters = CharactersData;
}