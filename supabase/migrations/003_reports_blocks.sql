-- ============================================================
-- 003_reports_blocks.sql
-- 신고 / 차단 테이블 + RLS
-- Supabase SQL Editor에서 실행
-- ============================================================

-- ----------------------------------------------------------------
-- 1. 신고 테이블
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      uuid NOT NULL REFERENCES users(id),
  reported_user_id uuid NOT NULL REFERENCES users(id),
  message_id       uuid REFERENCES chat_messages(id), -- 채팅 신고 시 메시지 ID
  reason           text NOT NULL,                      -- 'spam' | 'abuse' | 'illegal' | 'etc'
  detail           text,                               -- 추가 설명 (선택)
  status           text DEFAULT 'pending',             -- pending | reviewed | dismissed
  created_at       timestamptz DEFAULT now()
);

-- ----------------------------------------------------------------
-- 2. 차단 테이블
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid NOT NULL REFERENCES users(id),
  blocked_id  uuid NOT NULL REFERENCES users(id),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

-- ----------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------

-- reports: 본인 신고만 조회/작성, 관리자는 전체 조회 (서비스 키로 처리)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_own_insert"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_own_read"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- blocks: 본인 차단 목록만 조회/작성/삭제
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_own_insert"
  ON blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocks_own_read"
  ON blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "blocks_own_delete"
  ON blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- ----------------------------------------------------------------
-- 4. 인덱스 (차단 목록 조회 성능)
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS blocks_blocker_idx ON blocks (blocker_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status);
