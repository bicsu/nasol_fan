// GET /api/cron/episode-status — Vercel Cron (매 1분)
// chat_status 자동 전환: episodes 테이블 조회 → 시간 경계 기준 상태 전이
const { getSupabaseAdmin } = require('../_lib/supabase');

const ONE_HOUR_MS = 60 * 60 * 1000;

async function tick() {
  const supabase = getSupabaseAdmin();
  const now = new Date();

  const { data: episodes, error } = await supabase
    .from('episodes')
    .select('id, air_start, air_end, chat_status');
  if (error) {
    console.error('[cron:episodeStatus] 조회 오류:', error.message);
    return { updated: 0, error: error.message };
  }
  if (!episodes?.length) return { updated: 0 };

  let updated = 0;
  for (const ep of episodes) {
    const start = new Date(ep.air_start).getTime();
    const end = new Date(ep.air_end).getTime();
    const closeAt = end + ONE_HOUR_MS;
    const t = now.getTime();

    let next = ep.chat_status;
    if (t >= start && t < end) next = 'open';
    else if (t >= end && t < closeAt) next = 'extended';
    else if (t >= closeAt) next = 'closed';
    else next = 'closed';

    if (next !== ep.chat_status) {
      const { error: uerr } = await supabase
        .from('episodes')
        .update({ chat_status: next })
        .eq('id', ep.id);
      if (uerr) {
        console.error(`[cron] episode ${ep.id} 업데이트 실패:`, uerr.message);
      } else {
        updated += 1;
        console.log(
          `[cron] episode ${ep.id} chat_status: ${ep.chat_status} → ${next}`
        );
      }
    }
  }
  return { updated, total: episodes.length };
}

module.exports = async function handler(req, res) {
  // Vercel Cron 은 GET 요청 + Authorization: Bearer <CRON_SECRET> 헤더
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).end('Unauthorized');
  }

  try {
    const result = await tick();
    return res.json({ ok: true, ...result, ts: new Date().toISOString() });
  } catch (e) {
    console.error('[cron:episodeStatus] tick 예외:', e.message);
    return res.status(500).json({ error: 'cron_failed', detail: e.message });
  }
};

module.exports.tick = tick;
