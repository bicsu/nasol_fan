// POST /api/auth/toss/disconnect
// 토스 연결 끊기 콜백: 유저가 토스 앱에서 앱 연결 해제 시 호출됨
const { disconnectTossUser } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = req.body || {};
  const key = body.tossUserKey || body.toss_user_key;
  if (!key) return res.status(400).json({ error: 'tossUserKey 누락' });

  try {
    await disconnectTossUser(key);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[auth/disconnect] 오류:', err.message);
    return res.status(500).json({ error: 'disconnect_failed', detail: err.message });
  }
};
