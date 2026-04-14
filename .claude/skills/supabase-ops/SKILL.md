---
name: supabase-ops
description: 나솔팬즈 Supabase 운영 가이드. PostgreSQL 마이그레이션 작성, RLS 정책 설계·구현, Realtime 채널 설정, Edge Function 개발, 인덱스 최적화. 스키마 변경, 새 테이블·컬럼 추가, RLS 정책 수정, 실시간 기능 설정, 데이터베이스 성능 개선 요청 시 반드시 이 스킬을 사용할 것.
---

# Supabase 운영 가이드

나솔팬즈 Supabase PostgreSQL DB를 안전하고 효율적으로 관리하기 위한 패턴.

## 마이그레이션 파일 컨벤션

```
supabase/migrations/
├── 001_security_fixes.sql
├── 002_add_toss_user_key.sql   # 예시
└── 003_add_indexes.sql
```

**파일명:** `{3자리 번호}_{설명_snake_case}.sql`

**파일 구조:**
```sql
-- Migration: 002_add_toss_user_key
-- Description: 토스 로그인 연동을 위해 users 테이블에 toss_user_key 추가
-- Created: YYYY-MM-DD
-- Rollback:
--   ALTER TABLE users DROP COLUMN IF EXISTS toss_user_key;
--   DROP INDEX IF EXISTS idx_users_toss_user_key;

-- ↑ 위에 롤백 SQL을 항상 주석으로 포함

ALTER TABLE users ADD COLUMN IF NOT EXISTS toss_user_key text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_toss_user_key ON users(toss_user_key);
```

## RLS 정책 템플릿

```sql
-- 테이블에 RLS 활성화 (신규 테이블 필수)
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 전체 조회 허용
CREATE POLICY "table_name_select_all" ON table_name
  FOR SELECT USING (true);

-- 본인 레코드만 수정
CREATE POLICY "table_name_update_own" ON table_name
  FOR UPDATE USING (auth.uid() = user_id);

-- 로그인 유저만 삽입
CREATE POLICY "table_name_insert_auth" ON table_name
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 서비스 롤만 삽입 (point_history 등)
CREATE POLICY "point_history_insert_service" ON point_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

## 현재 스키마의 핵심 테이블

### episodes (채팅방 상태 관리)
```sql
-- chat_status 값: 'closed' | 'open' | 'extended'
-- chat_status 변경 → Realtime으로 앱에 즉시 전파
-- 자동 상태 변경: Edge Function 또는 cron으로 처리
```

### users (토스 로그인 연동 후 추가 필드)
```sql
-- toss_user_key: 토스 유저 식별자 (unique)
-- badge_level 자동 업데이트: total_points 변화 시 트리거 또는 Function
```

## 자동 채팅방 상태 변경 (Edge Function)

```typescript
// supabase/functions/update-chat-status/index.ts
// 방영 시작/종료 시 chat_status 자동 변경
Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!);
  const now = new Date().toISOString();

  // 방영 시작: closed → open
  await supabase.from('episodes')
    .update({ chat_status: 'open' })
    .eq('chat_status', 'closed')
    .lte('air_start', now)
    .gte('air_end', now);

  // 방영 종료: open → extended
  await supabase.from('episodes')
    .update({ chat_status: 'extended' })
    .eq('chat_status', 'open')
    .lt('air_end', now);

  // 연장 종료(1시간): extended → closed
  // air_end + interval '1 hour' < now
  await supabase.rpc('close_extended_episodes');

  return new Response('ok');
});
```

## 인덱스 전략

```sql
-- 자주 조회되는 패턴에 인덱스 추가
CREATE INDEX idx_chat_messages_episode_id ON chat_messages(episode_id, created_at DESC);
CREATE INDEX idx_posts_episode_id ON posts(episode_id, created_at DESC);
CREATE INDEX idx_vote_responses_item_user ON vote_responses(vote_item_id, user_id);
CREATE INDEX idx_point_history_user_id ON point_history(user_id, created_at DESC);
```

## 포인트 업데이트 트리거 패턴

```sql
-- posts 테이블에 INSERT 시 +10p 자동 부여
CREATE OR REPLACE FUNCTION award_post_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET total_points = total_points + 10 WHERE id = NEW.user_id;
  INSERT INTO point_history(user_id, amount, reason) 
    VALUES (NEW.user_id, 10, 'post');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_award_post_points
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION award_post_points();
```
