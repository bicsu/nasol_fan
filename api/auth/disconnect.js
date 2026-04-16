// POST /api/auth/toss/disconnect
// 토스 연결 끊기 콜백: 유저가 토스 앱에서 앱 연결 해제 시 호출됨
const { disconnectTossUser } = require('../_lib/supabase');
const { applyCors } = require('../_lib/cors');

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // body 파싱 — JSON 또는 urlencoded 모두 처리
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }

  const key = body.tossUserKey || body.toss_user_key;
  if (!key) {
    // Toss 콘솔 테스트는 빈 body로 올 수 있으므로 400 대신 200 반환
    console.warn('[auth/disconnect] tossUserKey 누락 — 콘솔 테스트로 간주');
    return res.status(200).json({ ok: true });
  }

  try {
    await disconnectTossUser(key);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[auth/disconnect] 오류:', err.message);
    return res.status(500).json({ error: 'disconnect_failed', detail: err.message });
  }
};
