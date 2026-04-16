// 공통 CORS 미들웨어 — 토스 미니앱 + 콘솔 도메인 허용
function isAllowedOrigin(origin) {
  if (!origin) return false;
  return (
    origin.endsWith('.tossmini.com') ||
    origin.endsWith('.toss.im') ||
    origin === 'https://nasolfan.vercel.app'
  );
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowOrigin = isAllowedOrigin(origin) ? origin : '*';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (allowOrigin !== '*') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = { applyCors };
