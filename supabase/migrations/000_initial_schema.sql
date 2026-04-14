-- ============================================================
-- 000_initial_schema.sql
-- 새 Supabase 프로젝트에 최초 1회 실행
-- Supabase SQL Editor에서 전체 붙여넣기 후 실행
-- ============================================================

-- ----------------------------------------------------------------
-- 1. 테이블 생성
-- ----------------------------------------------------------------

-- 에피소드 (방영 스케줄)
CREATE TABLE IF NOT EXISTS episodes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  season       int         NOT NULL,
  episode_num  int         NOT NULL,
  title        text,
  air_start    timestamptz NOT NULL,
  air_end      timestamptz NOT NULL,
  chat_status  text        DEFAULT 'closed', -- closed | open | extended
  created_at   timestamptz DEFAULT now()
);

-- 유저
CREATE TABLE IF NOT EXISTS users (
  id             uuid  PRIMARY KEY REFERENCES auth.users,
  nickname       text  UNIQUE NOT NULL,
  avatar_color   text  DEFAULT '#D4537E',
  toss_user_key  text  UNIQUE,
  total_points   int   DEFAULT 0,
  badge_level    text  DEFAULT 'bronze', -- bronze | silver | gold | platinum | legend
  created_at     timestamptz DEFAULT now()
);

-- 채팅 메시지
CREATE TABLE IF NOT EXISTS chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id  uuid REFERENCES episodes(id),
  user_id     uuid REFERENCES users(id),
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- 게시글
CREATE TABLE IF NOT EXISTS posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id  uuid REFERENCES episodes(id),
  user_id     uuid REFERENCES users(id),
  title       text NOT NULL,
  content     text NOT NULL,
  likes       int  DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- 댓글
CREATE TABLE IF NOT EXISTS comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid REFERENCES posts(id),
  user_id     uuid REFERENCES users(id),
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- 투표 항목
CREATE TABLE IF NOT EXISTS vote_items (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id              uuid    REFERENCES episodes(id),
  question                text    NOT NULL,
  options                 jsonb   NOT NULL, -- [{"id": "a", "label": "영식+순자"}, ...]
  reward_points           int     DEFAULT 100,
  correct_option_id       text,
  active_during_broadcast boolean DEFAULT true,
  created_at              timestamptz DEFAULT now()
);

-- 투표 응답
CREATE TABLE IF NOT EXISTS vote_responses (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_item_id       uuid REFERENCES vote_items(id),
  user_id            uuid REFERENCES users(id),
  selected_option_id text NOT NULL,
  is_correct         boolean,
  points_awarded     int  DEFAULT 0,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (vote_item_id, user_id)
);

-- 포인트 내역
CREATE TABLE IF NOT EXISTS point_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id),
  amount      int  NOT NULL,
  reason      text NOT NULL, -- 'vote_correct' | 'post' | 'comment' | 'event'
  created_at  timestamptz DEFAULT now()
);


-- ----------------------------------------------------------------
-- 2. award_points RPC (포인트 원자적 지급)
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
  SET total_points = total_points + p_amount
  WHERE id = p_user_id;
END;
$$;


-- ----------------------------------------------------------------
-- 3. RLS (Row Level Security)
-- ----------------------------------------------------------------

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_public_read" ON users FOR SELECT USING (true);
CREATE POLICY "users_own_update"  ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_own_insert"  ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- episodes (공개 읽기)
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "episodes_public_read" ON episodes FOR SELECT USING (true);

-- posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_public_read"          ON posts FOR SELECT USING (true);
CREATE POLICY "posts_authenticated_insert" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_own_delete"           ON posts FOR DELETE USING (auth.uid() = user_id);

-- comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_public_read"          ON comments FOR SELECT USING (true);
CREATE POLICY "comments_authenticated_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_public_read"          ON chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_messages_authenticated_insert" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- vote_items (공개 읽기)
ALTER TABLE vote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vote_items_public_read" ON vote_items FOR SELECT USING (true);

-- vote_responses (본인만)
ALTER TABLE vote_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vote_responses_own_read"             ON vote_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vote_responses_authenticated_insert" ON vote_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- point_history (본인만 읽기, 쓰기는 award_points RPC만)
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "point_history_own_read" ON point_history FOR SELECT USING (auth.uid() = user_id);


-- ----------------------------------------------------------------
-- 4. Realtime 활성화 (채팅용)
-- ----------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE episodes;


-- ----------------------------------------------------------------
-- 5. 테스트 데이터 (개발용 에피소드 1개)
-- ----------------------------------------------------------------
INSERT INTO episodes (season, episode_num, title, air_start, air_end, chat_status)
VALUES (
  21,
  1,
  '나는 솔로 21기 1회',
  now() - interval '1 hour',
  now() + interval '2 hours',
  'open'
) ON CONFLICT DO NOTHING;
