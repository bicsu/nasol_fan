-- ============================================================
-- 006_phase2_auth.sql
-- Phase 2 앱인토스 연동 준비
--   1) users 테이블 RLS 정책 보완 (기존 정책 멱등 재선언)
--   2) user_consents 테이블 신규 (약관/개인정보/연령 동의)
--   3) notification_tokens 테이블 신규 (토스 푸시 타겟 키 관리)
-- Supabase SQL Editor에서 실행 (IF NOT EXISTS 패턴으로 멱등성 보장)
-- ============================================================

-- ----------------------------------------------------------------
-- 1. users 테이블 RLS 보완
-- ----------------------------------------------------------------
-- 000에서 이미 RLS 활성화 및 정책 생성되어 있으나, 누락 환경 대비 멱등 처리
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_public_read" ON users;
CREATE POLICY "users_public_read"
  ON users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "users_own_insert" ON users;
CREATE POLICY "users_own_insert"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_own_update" ON users;
CREATE POLICY "users_own_update"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- toss_user_key 조회 인덱스 (로그인 시 중복 체크용)
CREATE INDEX IF NOT EXISTS users_toss_user_key_idx ON users (toss_user_key);

-- 주의: toss_user_key 는 토스 로그인 전환 전까지 NULL 허용 유지 (NOT NULL 제약 추가하지 않음)


-- ----------------------------------------------------------------
-- 2. user_consents — 약관/개인정보/연령 동의 기록
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_consents (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES users(id) ON DELETE CASCADE,
  terms_agreed    boolean     NOT NULL DEFAULT false,  -- 서비스 이용약관
  privacy_agreed  boolean     NOT NULL DEFAULT false,  -- 개인정보처리방침
  age_verified    boolean     NOT NULL DEFAULT false,  -- 만 19세 이상 확인
  agreed_at       timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS user_consents_user_idx ON user_consents (user_id);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_consents_own_read" ON user_consents;
CREATE POLICY "user_consents_own_read"
  ON user_consents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_consents_own_insert" ON user_consents;
CREATE POLICY "user_consents_own_insert"
  ON user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_consents_own_update" ON user_consents;
CREATE POLICY "user_consents_own_update"
  ON user_consents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ----------------------------------------------------------------
-- 3. notification_tokens — 토스 푸시 발송 타겟 관리
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_tokens (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        REFERENCES users(id) ON DELETE CASCADE,
  toss_user_key  text        NOT NULL,
  is_active      boolean     DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS notification_tokens_user_idx ON notification_tokens (user_id);
CREATE INDEX IF NOT EXISTS notification_tokens_active_idx ON notification_tokens (is_active) WHERE is_active = true;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_tokens_set_updated_at ON notification_tokens;
CREATE TRIGGER notification_tokens_set_updated_at
  BEFORE UPDATE ON notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

-- 본인만 조회 가능. insert/update 정책은 만들지 않음 → service_role(서비스 키) 만 쓰기 가능
DROP POLICY IF EXISTS "notification_tokens_own_read" ON notification_tokens;
CREATE POLICY "notification_tokens_own_read"
  ON notification_tokens FOR SELECT
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------
-- 4. posts / comments 주의
--   reports / blocks 는 003_reports_blocks.sql 에서 이미 처리되었으므로 스킵
-- ----------------------------------------------------------------

-- ============================================================
-- 롤백 SQL (필요 시 주석 해제하여 실행)
-- ------------------------------------------------------------
-- DROP TRIGGER IF EXISTS notification_tokens_set_updated_at ON notification_tokens;
-- DROP TABLE IF EXISTS notification_tokens;
-- DROP TABLE IF EXISTS user_consents;
-- DROP FUNCTION IF EXISTS set_updated_at();
-- -- users RLS 정책은 000_initial_schema.sql 에서 관리되므로 별도 롤백 불필요
-- ============================================================
