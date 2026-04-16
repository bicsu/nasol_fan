// POST /api/log/error — 미니앱 프론트 에러 수집
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = req.body || {};
  console.error('[FRONTEND ERROR]', JSON.stringify(body));
  return res.status(200).json({ ok: true });
};
