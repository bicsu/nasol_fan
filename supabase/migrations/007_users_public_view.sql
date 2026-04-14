-- ============================================================
-- 007_users_public_view.sql
-- 보안 패치: users 테이블 toss_user_key 공개 노출 차단
--
-- 문제:
--   000/001/006 마이그레이션의 users_public_read 정책(USING true)은
--   anon/authenticated 역할에게 users 테이블 전체 컬럼 SELECT 를 허용함.
--   → toss_user_key(토스 유저 식별자) 등 민감 컬럼이 공개 API 로 노출됨.
--
-- 해결:
--   1) users_public_read 정책 제거.
--   2) 본인 행 전체 컬럼 조회는 users_own_read 로 유지.
--   3) 타인 프로필 조회용 공개 컬럼 뷰 users_public 제공
--      (security_definer 로 RLS 우회하되 공개 컬럼만 노출).
--
-- 실행 순서: 006_phase2_auth.sql 이후
-- Supabase SQL Editor 에서 실행 (멱등)
-- ============================================================

-- ----------------------------------------------------------------
-- 1. users 테이블 SELECT 정책 재정의
-- ----------------------------------------------------------------
-- 기존 전체 공개 SELECT 정책 제거
DROP POLICY IF EXISTS "users_public_read" ON public.users;

-- 본인 행 전체 컬럼 조회만 허용
DROP POLICY IF EXISTS "users_own_read" ON public.users;
CREATE POLICY "users_own_read"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- NOTE: PostgreSQL RLS 는 컬럼 단위 제어가 불가하므로
-- 타인 프로필(공개 컬럼)은 아래 뷰를 통해서만 접근한다.


-- ----------------------------------------------------------------
-- 2. 공개 컬럼 전용 뷰 users_public
-- ----------------------------------------------------------------
-- 노출 컬럼: id, nickname, avatar_color, total_points, badge_level, created_at
-- 제외 컬럼: toss_user_key (민감)
CREATE OR REPLACE VIEW public.users_public AS
  SELECT
    id,
    nickname,
    avatar_color,
    total_points,
    badge_level,
    created_at
  FROM public.users;

-- security_definer(기본값) 로 뷰 소유자 권한 실행 → users RLS 우회
-- 뷰 정의상 공개 컬럼만 포함되므로 toss_user_key 는 어떤 역할도 조회 불가
ALTER VIEW public.users_public SET (security_invoker = false);

-- anon / authenticated 역할에 뷰 SELECT 권한 부여
GRANT SELECT ON public.users_public TO anon, authenticated;


-- ----------------------------------------------------------------
-- 3. 영향 정리
-- ----------------------------------------------------------------
-- - users 테이블 SELECT: 본인 행만 가능 (users_own_read)
-- - users_public 뷰: 누구나 공개 컬럼만 조회 가능
-- - toss_user_key: 클라이언트에서 조회 불가
--   → 토스 유저키 매칭이 필요한 로그인/동기화는 백엔드 service_role 로 수행
--
-- 클라이언트 코드 영향:
--   stores/authStore.ts
--     - 본인 조회(.eq('id', user.id) / signIn nickname 조회)는 정상 동작
--       단, signIn 의 nickname 으로 타인 users 조회는 RLS 로 막히므로
--       Phase 2 토스 로그인 전환 시 백엔드 경유로 이관 필요.
--   app/(tabs)/ranking.tsx
--     - .from('users') → .from('users_public') 로 변경 필요
--   app/(tabs)/chat.tsx / board.tsx 등 타인 프로필 조인 부분도 동일하게 교체
--
-- ============================================================
-- 롤백 SQL (필요 시 주석 해제)
-- ------------------------------------------------------------
-- REVOKE SELECT ON public.users_public FROM anon, authenticated;
-- DROP VIEW IF EXISTS public.users_public;
-- DROP POLICY IF EXISTS "users_own_read" ON public.users;
-- CREATE POLICY "users_public_read" ON public.users FOR SELECT USING (true);
-- ============================================================
