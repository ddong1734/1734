// 파일명: server/accounts.js
// ============================================================================
// 👤 계정 시스템
//
//   · 브라우저에 계정 ID 를 저장하고, 실제 자료는 외부 DB(Supabase) 에 둔다
//   · 서버가 재시작되어도 남아 있고, 로그인 절차가 없어 진입이 가볍다
//   · 같은 기기 · 같은 브라우저로 오면 전적이 이어진다
//
//   ⚠️ 접속 키가 없으면 조용히 꺼진 상태로 동작한다.
//      (DB 없이도 게임은 문제없이 돌아간다)
// ============================================================================

const URL = process.env.SUPABASE_URL || '';
const KEY = process.env.SUPABASE_KEY || '';

let db = null;
let ready = false;
let lastError = '';

try {
    if (URL && KEY) {
        const { createClient } = require('@supabase/supabase-js');
        db = createClient(URL, KEY, { auth: { persistSession: false } });
        ready = true;
        console.log('👤 계정 시스템 : 연결됨');
    } else {
        console.log('👤 계정 시스템 : 키가 없어 꺼짐 (게임은 정상 동작)');
    }
} catch (e) {
    lastError = e.message;
    console.error('👤 계정 시스템 : 연결 실패 —', e.message);
}

/** 이 서버가 계정을 쓸 수 있는가 */
function isReady() { return ready; }

/**
 * 📥 계정을 불러온다. 없으면 null 을 준다.
 */
async function load(accountId) {
    if (!ready || !accountId) return null;
    try {
        const { data, error } = await db
            .from('accounts').select('*').eq('id', accountId).maybeSingle();
        if (error) { console.error('[ACCOUNT load]', error.message); return null; }
        return data || null;
    } catch (e) {
        console.error('[ACCOUNT load]', e.message);
        return null;
    }
}

/**
 * 🆕 계정을 새로 만든다. 닉네임을 정하는 순간 한 번만 부른다.
 */
async function create(accountId, nickname) {
    if (!ready || !accountId) return null;
    try {
        const row = {
            id: accountId, nickname: String(nickname || '').slice(0, 8),
            level: 1, xp: 0, wins: 0, losses: 0,
            kills: 0, deaths: 0, play_count: 0,
            updated_at: new Date().toISOString()
        };
        const { data, error } = await db
            .from('accounts').insert(row).select().maybeSingle();
        if (error) { console.error('[ACCOUNT create]', error.message); return null; }
        return data || row;
    } catch (e) {
        console.error('[ACCOUNT create]', e.message);
        return null;
    }
}

/** 계정 레벨에 필요한 경험치 */
function needXp(level) { return 500 + (level - 1) * 250; }

/**
 * 📊 한 판이 끝나면 전적을 더한다.
 *   @param r { win, kills, deaths, damage }
 */
async function addResult(accountId, r) {
    if (!ready || !accountId) return null;
    try {
        const cur = await load(accountId);
        if (!cur) return null;

        // 🎖️ 이기면 100, 져도 50. 여기에 성과를 더한다.
        let gain = (r.win ? 100 : 50)
                 + (r.kills || 0) * 20
                 + Math.floor((r.damage || 0) / 2000) * 5;

        let level = cur.level || 1;
        let xp = (cur.xp || 0) + gain;
        while (xp >= needXp(level)) { xp -= needXp(level); level++; }

        const next = {
            level: level, xp: xp,
            wins: (cur.wins || 0) + (r.win ? 1 : 0),
            losses: (cur.losses || 0) + (r.win ? 0 : 1),
            kills: (cur.kills || 0) + (r.kills || 0),
            deaths: (cur.deaths || 0) + (r.deaths || 0),
            play_count: (cur.play_count || 0) + 1,
            updated_at: new Date().toISOString()
        };
        const { error } = await db.from('accounts').update(next).eq('id', accountId);
        if (error) { console.error('[ACCOUNT save]', error.message); return null; }
        return Object.assign({ id: accountId, nickname: cur.nickname }, next, { gained: gain });
    } catch (e) {
        console.error('[ACCOUNT save]', e.message);
        return null;
    }
}

module.exports = { isReady, load, create, addResult, needXp, lastError };
