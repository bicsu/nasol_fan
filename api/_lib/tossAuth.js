// 토스 OAuth 서비스 (앱인토스 appLogin SDK 기반)
// 참고: https://developers-apps-in-toss.toss.im/login/intro.html
// 모든 요청은 https://apps-in-toss-api.toss.im 로 mTLS 경유
const { tossApi } = require('./mtls');

const CLIENT_ID = () => process.env.TOSS_CLIENT_ID;
const CLIENT_SECRET = () => process.env.TOSS_CLIENT_SECRET;

const TOKEN_PATH = '/api-partner/v1/apps-in-toss/user/oauth2/generate-token';
const USERINFO_PATH = '/api-partner/v1/apps-in-toss/user/info';

// 토스 API 공통 응답 언래핑
// 성공: { resultType: "SUCCESS", success: { ... } }
// 실패: { resultType: "FAIL", error: { errorCode, reason } }
function unwrap(resData) {
  if (!resData || typeof resData !== 'object') {
    throw new Error('Toss API: empty response');
  }
  if (resData.resultType !== 'SUCCESS') {
    const reason = resData.error?.reason || resData.error?.errorCode || 'Toss API error';
    throw new Error(reason);
  }
  return resData.success;
}

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: CLIENT_ID(),
    client_secret: CLIENT_SECRET(),
  });
  const res = await tossApi.post(TOKEN_PATH, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return unwrap(res.data);
}

async function fetchTossUserInfo(accessToken) {
  const res = await tossApi.get(USERINFO_PATH, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(res.data);
}

module.exports = {
  exchangeCodeForToken,
  fetchTossUserInfo,
};
