// 토스 푸시 알림 API 서비스
// 참고: https://developers-apps-in-toss.toss.im/push/develop.html
// base URL: https://apps-in-toss-api.toss.im (mtls.js 에서 설정)
const { tossApi } = require('./mtls');

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

async function sendPush({ tossUserKey, templateSetCode, context }) {
  if (!tossUserKey) throw new Error('tossUserKey 누락');
  if (!templateSetCode) throw new Error('templateSetCode 누락');

  const res = await tossApi.post(
    '/v1/push/send',
    {
      templateSetCode,
      context: context || {},
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Toss-User-Key': tossUserKey,
      },
    }
  );
  return unwrap(res.data);
}

async function sendPushBatch(targets, { templateSetCode, context }, concurrency = 10) {
  const results = [];
  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency);
    const res = await Promise.allSettled(
      chunk.map((t) =>
        sendPush({
          tossUserKey: t.toss_user_key || t.tossUserKey,
          templateSetCode,
          context,
        })
      )
    );
    results.push(...res);
  }
  return results;
}

module.exports = { sendPush, sendPushBatch };
