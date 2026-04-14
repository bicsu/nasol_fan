// POST /api/auth/token
// 프론트(appLogin SDK)에서 받은 인가코드 → 토스 토큰 교환 → 유저 정보 조회
// → Supabase 유저 upsert → Supabase 세션(access_token/refresh_token) 반환
const {
  exchangeCodeForToken,
  fetchTossUserInfo,
} = require('../_lib/tossAuth');
const {
  getSupabaseAdmin,
  upsertTossUser,
  upsertNotificationToken,
} = require('../_lib/supabase');

// 인가코드 1회 사용 보장용 in-memory set (서버리스 콜드스타트마다 초기화)
// 운영 환경에서는 Redis/Upstash 또는 Supabase 테이블 기반으로 교체 권장
const usedCodes = new Set();

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = readBody(req);
  const { authorizationCode, referrer } = body || {};

  if (!authorizationCode) {
    return res.status(400).json({ error: 'authorizationCode 누락' });
  }
  if (usedCodes.has(authorizationCode)) {
    return res.status(400).json({ error: '이미 사용된 인가코드' });
  }

  try {
    // 1) 토스 토큰 교환 (tossAuth가 이미 success 페이로드를 반환)
    const token = await exchangeCodeForToken(authorizationCode);
    const accessToken = token?.accessToken || token?.access_token;
    usedCodes.add(authorizationCode);

    if (!accessToken) {
      return res
        .status(502)
        .json({ error: 'toss_token_missing', detail: 'accessToken 없음' });
    }

    // 2) 토스 유저 정보 조회 (이미 success 페이로드가 반환됨)
    const info = (await fetchTossUserInfo(accessToken)) || {};
    const tossUserKey = info.tossUserKey;
    if (!tossUserKey) {
      return res.status(502).json({ error: 'toss_user_key_missing' });
    }
    const realName = info.user_name || null;
    const realEmail = info.user_email || null;
    const gender = info.user_gender || null;
    const birthday = info.user_birthday || null;
    // 닉네임: 이름 있으면 사용, 없으면 팬_XXXXXX
    const nickname = realName || `팬_${String(tossUserKey).slice(-6)}`;
    const avatarColor = '#D4537E';

    // 3) Supabase Auth 유저 생성 or 기존 조회
    const supabase = getSupabaseAdmin();
    // 실제 이메일이 있으면 사용, 없으면 가상 이메일 (토스 유저키 기반)
    const email = realEmail || `${tossUserKey}@nasolfans.app`;

    let authUserId;
    let existing = null;
    try {
      const { data: existingData } =
        await supabase.auth.admin.getUserByEmail(email);
      existing = existingData?.user || existingData || null;
    } catch (e) {
      existing = null;
    }

    if (existing && existing.id) {
      authUserId = existing.id;
    } else {
      const { data: created, error: createErr } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            toss_user_key: tossUserKey,
            nickname,
            real_name: realName,
            gender,
            birthday,
            referrer: referrer || null,
          },
        });
      if (createErr) throw createErr;
      authUserId = created.user.id;
    }

    // 4) users 테이블 upsert
    await upsertTossUser({
      authUserId,
      tossUserKey,
      nickname,
      avatarColor,
    });

    // 5) notification_tokens upsert
    await upsertNotificationToken({
      userId: authUserId,
      tossUserKey,
      enabled: true,
    });

    // 6) Supabase 세션 발급 (magiclink → verifyOtp 로 세션 교환)
    const { data: linkData, error: linkErr } =
      await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
    if (linkErr) throw linkErr;

    const hashedToken =
      linkData?.properties?.hashed_token ||
      linkData?.properties?.hashedToken;
    if (!hashedToken) {
      return res.status(500).json({ error: 'session_link_failed' });
    }

    const { data: verifyData, error: verifyErr } =
      await supabase.auth.verifyOtp({
        type: 'magiclink',
        token_hash: hashedToken,
      });
    if (verifyErr) throw verifyErr;

    const session = verifyData?.session;
    if (!session) {
      return res.status(500).json({ error: 'session_issue_failed' });
    }

    return res.status(200).json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: {
        id: authUserId,
        toss_user_key: tossUserKey,
        nickname,
      },
    });
  } catch (err) {
    console.error('[auth/token] 오류:', err?.response?.data || err.message);
    return res
      .status(500)
      .json({ error: 'auth_failed', detail: err.message });
  }
};
