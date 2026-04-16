// Supabase Admin 클라이언트 (service_role 키 사용 — RLS 우회)
const { createClient } = require('@supabase/supabase-js');

let _client = null;

function getSupabaseAdmin() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_KEY 환경변수 누락');
  }
  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

async function upsertNotificationToken({ userId, tossUserKey, enabled = true }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('notification_tokens')
    .upsert(
      {
        user_id: userId,
        toss_user_key: tossUserKey,
        is_active: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function upsertTossUser({ authUserId, tossUserKey, nickname, avatarColor }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: authUserId,
        nickname,
        toss_user_key: tossUserKey,
        avatar_color: avatarColor || '#D4537E',
      },
      { onConflict: 'id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function disconnectTossUser(tossUserKey) {
  const supabase = getSupabaseAdmin();

  // 1) 유저 조회 (auth 삭제용 id 확보)
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('toss_user_key', tossUserKey)
    .maybeSingle();

  // 2) 개인정보 익명 처리 (닉네임, 토스 유저키 제거)
  const { error: e1 } = await supabase
    .from('users')
    .update({ toss_user_key: null, nickname: '알 수 없음' })
    .eq('toss_user_key', tossUserKey);
  if (e1) throw e1;

  // 3) 푸시 토큰 비활성화
  const { error: e2 } = await supabase
    .from('notification_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('toss_user_key', tossUserKey);
  if (e2) throw e2;

  // 4) Supabase Auth 세션 무효화 (유저 삭제하지 않고 세션만 끊기)
  if (userRow?.id) {
    try {
      await supabase.auth.admin.signOut(userRow.id, { scope: 'global' });
    } catch (_) {
      // signOut 실패해도 연결 끊기 자체는 성공 처리
    }
  }
}

module.exports = {
  getSupabaseAdmin,
  upsertNotificationToken,
  upsertTossUser,
  disconnectTossUser,
};
