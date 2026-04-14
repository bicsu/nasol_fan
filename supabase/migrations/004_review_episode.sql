-- ============================================================
-- 004_review_episode.sql
-- 검수용 에피소드 상태 갱신
-- 앱인토스 검수 기간 동안 채팅방이 항상 LIVE 상태로 유지됨
-- 검수 완료 후 실제 방영 스케줄로 교체할 것
-- ============================================================

-- 기존 시즌 21기 5회 에피소드를 검수 기간(30일) 동안 LIVE 상태로 연장
UPDATE episodes
SET
  air_start  = now() - interval '30 minutes',
  air_end    = now() + interval '30 days',
  chat_status = 'open'
WHERE season = 21 AND episode_num = 5;

-- 위 에피소드가 없으면 새로 삽입
INSERT INTO episodes (season, episode_num, title, air_start, air_end, chat_status)
SELECT
  21, 5, '나는 솔로 21기 5회 (검수용)',
  now() - interval '30 minutes',
  now() + interval '30 days',
  'open'
WHERE NOT EXISTS (
  SELECT 1 FROM episodes WHERE season = 21 AND episode_num = 5
);
