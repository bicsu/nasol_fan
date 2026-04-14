// mTLS axios 인스턴스 (Vercel Serverless 용)
// 인증서는 환경변수(base64)에서 로드한다.
const https = require('https');
const axios = require('axios');

function decode(envName) {
  const v = process.env[envName];
  if (!v) return null;
  try {
    return Buffer.from(v, 'base64');
  } catch (e) {
    console.warn(`[mtls] ${envName} base64 디코드 실패:`, e.message);
    return null;
  }
}

function createMtlsAgent() {
  const cert = decode('TOSS_CERT_BASE64');
  const key = decode('TOSS_KEY_BASE64');
  const ca = decode('TOSS_CA_BASE64');

  if (!cert || !key) {
    console.warn('[mtls] TOSS_CERT_BASE64/TOSS_KEY_BASE64 누락 → 기본 HTTPS agent 반환');
    return new https.Agent();
  }

  return new https.Agent({
    cert,
    key,
    ca: ca || undefined,
    rejectUnauthorized: true,
    keepAlive: true,
  });
}

// 콜드 스타트마다 재생성되지만 모듈 캐시로 웜 인스턴스에서는 재사용됨
const mtlsAgent = createMtlsAgent();

const tossApi = axios.create({
  baseURL: process.env.TOSS_AUTH_BASE_URL || 'https://apps-in-toss-api.toss.im',
  httpsAgent: mtlsAgent,
  timeout: 10000,
});

module.exports = {
  mtlsAgent,
  tossApi,
};
