// 토스 OAuth 서비스 (앱인토스 appLogin SDK 기반)
// 참고: https://developers-apps-in-toss.toss.im/login/intro.html
// 모든 요청은 https://apps-in-toss-api.toss.im 로 mTLS 경유
const crypto = require('crypto');
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

// 토스가 RSA-OAEP 로 암호화한 개인정보 복호화
function decryptField(encryptedValue) {
  if (!encryptedValue) return null;
  const keyPem = process.env.TOSS_DECRYPT_PRIVATE_KEY;
  if (!keyPem) {
    console.warn('[tossAuth] TOSS_DECRYPT_PRIVATE_KEY 미설정 — 복호화 스킵');
    return null;
  }
  try {
    const buffer = Buffer.from(encryptedValue, 'base64');
    const decrypted = crypto.privateDecrypt(
      { key: keyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      buffer
    );
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[tossAuth] 복호화 실패:', err.message);
    return null;
  }
}

// 암호화된 필드가 포함된 유저 정보를 복호화하여 반환
function decryptUserInfo(info) {
  return {
    ...info,
    user_name: decryptField(info.user_name) || info.user_name,
    user_email: decryptField(info.user_email) || info.user_email,
    user_gender: decryptField(info.user_gender) || info.user_gender,
    user_birthday: decryptField(info.user_birthday) || info.user_birthday,
  };
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
  const raw = unwrap(res.data);
  return decryptUserInfo(raw);
}

module.exports = {
  exchangeCodeForToken,
  fetchTossUserInfo,
};
