// POST /api/push/send
// body: { tossUserKey, templateSetCode, context }
const { sendPush } = require('../_lib/tossPush');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { tossUserKey, templateSetCode, context } = req.body || {};
  if (!tossUserKey || !templateSetCode) {
    return res.status(400).json({ error: 'tossUserKey, templateSetCode 필수' });
  }
  try {
    const data = await sendPush({ tossUserKey, templateSetCode, context });
    return res.json({ ok: true, data });
  } catch (err) {
    console.error('[push/send] 오류:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'push_failed', detail: err.message });
  }
};
