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

// 토스가 AES-256-CBC 로 암호화한 개인정보 복호화
// 키: base64 인코딩된 32바이트 AES 키
// 암호문 형식: base64(IV[16] + ciphertext)
function decryptField(encryptedValue) {
  if (!encryptedValue) return null;
  const keyBase64 = process.env.TOSS_DECRYPT_PRIVATE_KEY;
  if (!keyBase64) {
    console.warn('[tossAuth] TOSS_DECRYPT_PRIVATE_KEY 미설정 — 복호화 스킵');
    return null;
  }
  try {
    const key = Buffer.from(keyBase64, 'base64');
    const data = Buffer.from(encryptedValue, 'base64');
    const iv = data.slice(0, 16);
    const ciphertext = data.slice(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
  } catch (err) {
    console.error('[tossAuth] 복호화 실패:', err.message);
    return null;
  }
}

// 암호화된 필드가 포함된 유저 정보를 복호화하여 반환
// 토스 인증 문서 응답 필드: userKey, name, email, gender, birthday
// 레거시 필드: tossUserKey, user_name, user_email, user_gender, user_birthday
// 두 형식 모두 처리하여 통일된 필드명으로 반환
function decryptUserInfo(info) {
  const rawName = info.name || info.user_name;
  const rawEmail = info.email || info.user_email;
  const rawGender = info.gender || info.user_gender;
  const rawBirthday = info.birthday || info.user_birthday;

  return {
    ...info,
    // 토스 문서 표준 필드명으로 통일
    userKey: info.userKey || info.tossUserKey,
    name: decryptField(rawName) || rawName,
    email: decryptField(rawEmail) || rawEmail,
    gender: decryptField(rawGender) || rawGender,
    birthday: decryptField(rawBirthday) || rawBirthday,
    // 하위 호환: 기존 코드가 참조하는 레거시 필드도 유지
    tossUserKey: info.userKey || info.tossUserKey,
    user_name: decryptField(rawName) || rawName,
    user_email: decryptField(rawEmail) || rawEmail,
    user_gender: decryptField(rawGender) || rawGender,
    user_birthday: decryptField(rawBirthday) || rawBirthday,
  };
}

async function exchangeCodeForToken(code) {
  const redirectUri = process.env.TOSS_REDIRECT_URI || 'https://nasolfan.vercel.app';
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: CLIENT_ID(),
    client_secret: CLIENT_SECRET(),
    redirect_uri: redirectUri,
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
