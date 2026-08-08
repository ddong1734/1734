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
    //    · ✅ [수정] 기본 이동속도 1.35 → 1.2 (다른 캐릭터 기준 +20%)
    //    · 평타 피해 80 (모든 대상에게 예외 없이 적용)
    //    · 카시모를 '평타로 때린' 대상은 보라색 전류 반격 50 을 되받는다
    //      (때린 쪽이 에넬 · 카시모 본인이면 면제)
    //    · 카시모가 평타로 때린 대상에게는 전하(電荷) 스택이 1칸씩 쌓인다
    KASHIMO: {
        name: "카시모 하지메", hp: 2400, baseDamage: 80, attackCooldown: 400, speedMult: 1.2,
        attackEffect: "kashimo_strike", attackKnockback: 0, attackSlowDuration: 150,
        themeColor: "#a855f7", castMessage: "⚡ 전하 응축 중", castColor: "rgba(168, 85, 247, 0.3)",
        skillIds: ["KASHIMO_S1", "KASHIMO_S2", "KASHIMO_S3"]
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = CharactersData;
} else if (typeof window !== "undefined") {
    window.Characters = CharactersData;
}