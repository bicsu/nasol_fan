-- ============================================================
-- 002_seed_data.sql
-- 개발/테스트용 더미 데이터
-- Supabase SQL Editor에서 실행
-- ============================================================

-- ----------------------------------------------------------------
-- 1. 에피소드 (과거 3개 + 현재 LIVE 1개 + 예정 1개)
-- ----------------------------------------------------------------
INSERT INTO episodes (season, episode_num, title, air_start, air_end, chat_status) VALUES
  (21, 1, '나는 솔로 21기 1회', now() - interval '30 days', now() - interval '30 days' + interval '2 hours', 'closed'),
  (21, 2, '나는 솔로 21기 2회', now() - interval '23 days', now() - interval '23 days' + interval '2 hours', 'closed'),
  (21, 3, '나는 솔로 21기 3회', now() - interval '16 days', now() - interval '16 days' + interval '2 hours', 'closed'),
  (21, 4, '나는 솔로 21기 4회', now() - interval '9 days',  now() - interval '9 days'  + interval '2 hours', 'closed'),
  (21, 5, '나는 솔로 21기 5회', now() - interval '30 minutes', now() + interval '90 minutes', 'open'),
  (21, 6, '나는 솔로 21기 6회', now() + interval '7 days',  now() + interval '7 days'  + interval '2 hours', 'closed')
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------------
-- 2. 테스트 유저 생성 (auth.users 없이 직접 삽입 — 개발 전용)
-- ----------------------------------------------------------------
-- ※ Supabase auth.users와 FK가 걸려있어 실제로는 회원가입 필요
--   아래는 auth.users에 더미 레코드를 먼저 넣는 방식
INSERT INTO auth.users (id, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, encrypted_password, email_confirmed_at, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'young@nasolfans.app', now(), now(), '{}', '{}', false, '$2a$10$abcdefghijklmnopqrstuuVGmFDJLjx8JXnlPNIXBYJfq0T8.1fgS', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000002', 'suna@nasolfans.app',  now(), now(), '{}', '{}', false, '$2a$10$abcdefghijklmnopqrstuuVGmFDJLjx8JXnlPNIXBYJfq0T8.1fgS', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000003', 'junho@nasolfans.app', now(), now(), '{}', '{}', false, '$2a$10$abcdefghijklmnopqrstuuVGmFDJLjx8JXnlPNIXBYJfq0T8.1fgS', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000004', 'miri@nasolfans.app',  now(), now(), '{}', '{}', false, '$2a$10$abcdefghijklmnopqrstuuVGmFDJLjx8JXnlPNIXBYJfq0T8.1fgS', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000005', 'dohyun@nasolfans.app',now(), now(), '{}', '{}', false, '$2a$10$abcdefghijklmnopqrstuuVGmFDJLjx8JXnlPNIXBYJfq0T8.1fgS', now(), 'authenticated', 'authenticated')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, nickname, avatar_color, total_points, badge_level) VALUES
  ('00000000-0000-0000-0000-000000000001', '영식팬', '#D4537E', 2400, 'gold'),
  ('00000000-0000-0000-0000-000000000002', '순자러버', '#5B8DEF', 1200, 'silver'),
  ('00000000-0000-0000-0000-000000000003', '준호야사랑해', '#F59E0B', 650,  'silver'),
  ('00000000-0000-0000-0000-000000000004', '미리미리', '#10B981', 180,  'bronze'),
  ('00000000-0000-0000-0000-000000000005', '도현도현', '#8B5CF6', 50,   'bronze')
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------------
-- 3. 게시글
-- ----------------------------------------------------------------
WITH ep AS (SELECT id FROM episodes WHERE episode_num = 5 AND season = 21 LIMIT 1)
INSERT INTO posts (episode_id, user_id, title, content, likes) VALUES
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000001', '오늘 5회 진짜 미쳤다 ㅋㅋㅋ', '영식이 저 표정 봤어요?? 순자한테 완전 반한 거 아님? 이번 회차 진짜 설레는데 커플 성사 각인 것 같아요 다들 어떻게 생각하세요?', 24),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000002', '순자 오늘 너무 예쁘지 않나요', '순자 저 드레스 어디 거예요? 진짜 너무 예쁘다... 나솔 나와서 더 빛나는 것 같음 ㅠㅠ 영식이랑 케미도 미쳐버렸고', 31),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000003', '이번 시즌 최고 명장면 후보 ㄷㄷ', '5회 중반부 그 장면... 편집진 진짜 천재인 듯. BGM이랑 타이밍이 완벽함. 나솔 몇 기 봤는데 이 장면은 역대급이라고 생각함', 18),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000001', '준호 매력 포인트 정리', '1. 목소리 2. 경청하는 눈빛 3. 웃을 때 눈 휘어지는 거 4. 운동 잘함 5. 요리도 잘함\n이 사람 실존인물 맞음? ㅠㅠ', 42),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000004', '다음 주 예고편 보고 심장 떨어질 뻔', '예고편 봤어요?? 영식이 저 선택이 진짜 맞아요? 저 혼자 멘탈 나갔음 ㅠㅠ 스포 있으면 알려줘요 못 기다리겠어요', 15),
  (NULL, '00000000-0000-0000-0000-000000000002', '[TMI] 나솔 촬영지 실제로 가봤어요', '제주도 그 펜션 실제로 찾아갔는데... 경치 진짜 장난 아닙니다. 사진 찍으러 가볼 만해요 ㅎㅎ 나솔 성지순례 코스 추천', 27),
  (NULL, '00000000-0000-0000-0000-000000000005', '21기 출연자 직업 정리 (아는 것만)', '영식: 사업가\n순자: 간호사\n준호: 소방관(?) 확인 필요\n미리: 디자이너\n찾아보다가 모르겠어서 아는 분 댓글로 알려주세요', 9)
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------------
-- 4. 댓글
-- ----------------------------------------------------------------
WITH p AS (SELECT id FROM posts WHERE title = '오늘 5회 진짜 미쳤다 ㅋㅋㅋ' LIMIT 1)
INSERT INTO comments (post_id, user_id, content) VALUES
  ((SELECT id FROM p), '00000000-0000-0000-0000-000000000002', '맞아요 ㅠㅠ 영식이 눈빛 장난 아니었음'),
  ((SELECT id FROM p), '00000000-0000-0000-0000-000000000003', '저도 커플 될 것 같아요!! 다음 주 빨리 왔으면'),
  ((SELECT id FROM p), '00000000-0000-0000-0000-000000000004', '진짜요?? 저는 아직 모르겠던데 ㄷㄷ');

WITH p AS (SELECT id FROM posts WHERE title = '준호 매력 포인트 정리' LIMIT 1)
INSERT INTO comments (post_id, user_id, content) VALUES
  ((SELECT id FROM p), '00000000-0000-0000-0000-000000000001', '6번 추가: 키도 큼 ㅠㅠ'),
  ((SELECT id FROM p), '00000000-0000-0000-0000-000000000005', '실존인물 아닌 것 같아요 저도 ㅋㅋㅋ');


-- ----------------------------------------------------------------
-- 5. 투표 항목 (현재 방영 중인 5회)
-- ----------------------------------------------------------------
WITH ep AS (SELECT id FROM episodes WHERE episode_num = 5 AND season = 21 LIMIT 1)
INSERT INTO vote_items (episode_id, question, options, reward_points, active_during_broadcast) VALUES
  (
    (SELECT id FROM ep),
    '이번 회차 최고의 커플은?',
    '[{"id":"a","label":"영식 + 순자"},{"id":"b","label":"준호 + 미리"},{"id":"c","label":"도현 + 지수"},{"id":"d","label":"아직 모르겠음"}]',
    100,
    true
  ),
  (
    (SELECT id FROM ep),
    '다음 회차에서 선택받을 사람은?',
    '[{"id":"a","label":"영식"},{"id":"b","label":"준호"},{"id":"c","label":"도현"},{"id":"d","label":"반전 있음"}]',
    150,
    true
  ),
  (
    (SELECT id FROM ep),
    '21기 최종 커플 예측',
    '[{"id":"a","label":"영식+순자"},{"id":"b","label":"준호+미리"},{"id":"c","label":"둘 다 성사"},{"id":"d","label":"전원 솔로"}]',
    200,
    true
  )
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------------
-- 6. 채팅 메시지 (현재 방영 중인 5회)
-- ----------------------------------------------------------------
WITH ep AS (SELECT id FROM episodes WHERE episode_num = 5 AND season = 21 LIMIT 1)
INSERT INTO chat_messages (episode_id, user_id, content, created_at) VALUES
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000001', '드디어 시작이다!!', now() - interval '25 minutes'),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000002', '오늘 영식이 표정 기대되는데 ㅠㅠ', now() - interval '24 minutes'),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000003', '준호야 오늘도 잘 부탁해 🙏', now() - interval '23 minutes'),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000004', '나 심장 이미 두근두근', now() - interval '22 minutes'),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000001', '저 BGM 뭐예요 ㅋㅋㅋ 분위기 잡는다', now() - interval '20 minutes'),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000005', '와 순자 저 드레스 대박', now() - interval '18 minutes'),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000002', '영식 눈빛 봐 ㅠㅠㅠ 완전 반했다', now() - interval '15 minutes'),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000003', '커플 성사 각이다 진짜로', now() - interval '12 minutes'),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000001', '준호도 오늘 케미 터지는 것 같음', now() - interval '10 minutes'),
  ((SELECT id FROM ep), '00000000-0000-0000-0000-000000000004', '다음 주 예고 빨리 보고 싶어 ㅠ', now() - interval '5 minutes')
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------------
-- 7. 포인트 내역
-- ----------------------------------------------------------------
INSERT INTO point_history (user_id, amount, reason) VALUES
  ('00000000-0000-0000-0000-000000000001', 100, 'vote_correct'),
  ('00000000-0000-0000-0000-000000000001', 10,  'post'),
  ('00000000-0000-0000-0000-000000000001', 5,   'comment'),
  ('00000000-0000-0000-0000-000000000002', 100, 'vote_correct'),
  ('00000000-0000-0000-0000-000000000002', 10,  'post'),
  ('00000000-0000-0000-0000-000000000003', 10,  'post'),
  ('00000000-0000-0000-0000-000000000003', 5,   'comment')
ON CONFLICT DO NOTHING;
