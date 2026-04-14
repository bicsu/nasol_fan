// POST /api/push/schedule-broadcast
// body: { episodeId, templateSetCode, context }
// 알림 수신 동의 유저 전체에게 발송
const { sendPushBatch } = require('../_lib/tossPush');
const { getSupabaseAdmin } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { episodeId, templateSetCode, context } = req.body || {};
  if (!templateSetCode) {
    return res.status(400).json({ error: 'templateSetCode 필수' });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data: tokens, error } = await supabase
      .from('notification_tokens')
      .select('toss_user_key')
      .eq('is_active', true)
      .not('toss_user_key', 'is', null);
    if (error) throw error;

    const results = await sendPushBatch(
      tokens || [],
      { templateSetCode, context: { episodeId, ...(context || {}) } },
      10
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const fail = results.length - ok;
    return res.json({ ok: true, total: results.length, success: ok, failed: fail });
  } catch (err) {
    console.error('[push/schedule-broadcast] 오류:', err.message);
    return res.status(500).json({ error: 'broadcast_failed', detail: err.message });
  }
};
