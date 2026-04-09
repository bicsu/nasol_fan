-- ============================================================
-- 001_security_fixes.sql
-- 적용 순서: Supabase SQL Editor에서 순차 실행
-- ============================================================

-- ----------------------------------------------------------------
-- 1. vote_responses: 중복 투표 방지 UNIQUE constraint (C-1)
-- ----------------------------------------------------------------
ALTER TABLE vote_responses
  ADD CONSTRAINT vote_responses_user_vote_item_unique
  UNIQUE (user_id, vote_item_id);


-- ----------------------------------------------------------------
-- 2. award_points RPC: 포인트 원자적 지급 (C-2, C-3)
--    - point_history insert + users.total_points 증가를 단일 트랜잭션
--    - SECURITY DEFINER: point_history 직접 INSERT RLS 우회 방지
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION award_points(
  p_user_id uuid,
  p_amount   int,
  p_reason   text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO point_history (user_id, amount, reason)
  VALUES (p_user_id, p_amount, p_reason);

  UPDATE users
  SET total_points = total_points + p_amount   -- 원자적 증가
  WHERE id = p_user_id;
END;
$$;


-- ----------------------------------------------------------------
-- 3. RLS (Row Level Security) 정책 (H-1)
-- ----------------------------------------------------------------

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_public_read"  ON users FOR SELECT USING (true);
CREATE POLICY "users_own_update"   ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_own_insert"   ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- episodes (공개 읽기)
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "episodes_public_read" ON episodes FOR SELECT USING (true);

-- posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_public_read"          ON posts FOR SELECT  USING (true);
CREATE POLICY "posts_authenticated_insert" ON posts FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_own_delete"           ON posts FOR DELETE  USING (auth.uid() = user_id);

-- comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_public_read"          ON comments FOR SELECT  USING (true);
CREATE POLICY "comments_authenticated_insert" ON comments FOR INSERT  WITH CHECK (auth.uid() = user_id);

-- chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_public_read"          ON chat_messages FOR SELECT  USING (true);
CREATE POLICY "chat_messages_authenticated_insert" ON chat_messages FOR INSERT  WITH CHECK (auth.uid() = user_id);

-- vote_items (공개 읽기)
ALTER TABLE vote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vote_items_public_read" ON vote_items FOR SELECT USING (true);

-- vote_responses (본인만 읽기/작성)
ALTER TABLE vote_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vote_responses_own_read"             ON vote_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vote_responses_authenticated_insert" ON vote_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- point_history (본인만 읽기, 쓰기는 award_points RPC만 허용)
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_history_own_read" ON point_history FOR SELECT USING (auth.uid() = user_id);
-- INSERT는 SECURITY DEFINER RPC(award_points)만 가능 — 직접 INSERT 차단
