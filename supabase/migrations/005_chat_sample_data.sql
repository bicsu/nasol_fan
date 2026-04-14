-- ============================================================
-- 005_chat_sample_data.sql
-- 검수용 채팅 샘플 데이터 (독립 실행 가능)
-- Supabase SQL Editor에서 전체 붙여넣고 실행
-- ============================================================

-- ----------------------------------------------------------------
-- 1. auth.users 더미 레코드 (FK 선행 조건)
-- ----------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','authenticated','authenticated','u1@nasolfans.app','$2a$10$PxFhDP8mvOIpfn8LHYQ6S.7wB1kVqF5Ls7F3OqYv5LB6F6bqhfXOa',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000002','authenticated','authenticated','u2@nasolfans.app','$2a$10$PxFhDP8mvOIpfn8LHYQ6S.7wB1kVqF5Ls7F3OqYv5LB6F6bqhfXOa',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000003','authenticated','authenticated','u3@nasolfans.app','$2a$10$PxFhDP8mvOIpfn8LHYQ6S.7wB1kVqF5Ls7F3OqYv5LB6F6bqhfXOa',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000004','authenticated','authenticated','u4@nasolfans.app','$2a$10$PxFhDP8mvOIpfn8LHYQ6S.7wB1kVqF5Ls7F3OqYv5LB6F6bqhfXOa',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000005','authenticated','authenticated','u5@nasolfans.app','$2a$10$PxFhDP8mvOIpfn8LHYQ6S.7wB1kVqF5Ls7F3OqYv5LB6F6bqhfXOa',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000006','authenticated','authenticated','u6@nasolfans.app','$2a$10$PxFhDP8mvOIpfn8LHYQ6S.7wB1kVqF5Ls7F3OqYv5LB6F6bqhfXOa',now(),'{}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000007','authenticated','authenticated','u7@nasolfans.app','$2a$10$PxFhDP8mvOIpfn8LHYQ6S.7wB1kVqF5Ls7F3OqYv5LB6F6bqhfXOa',now(),'{}','{}',now(),now(),'','','','')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 2. 커뮤니티 유저
-- ----------------------------------------------------------------
INSERT INTO users (id, nickname, avatar_color, total_points, badge_level) VALUES
  ('00000000-0000-0000-0000-000000000001', '영식팬',     '#D4537E', 2400, 'gold'),
  ('00000000-0000-0000-0000-000000000002', '순자러버',   '#5B8DEF', 1200, 'silver'),
  ('00000000-0000-0000-0000-000000000003', '나솔마스터', '#F59E0B',  850, 'silver'),
  ('00000000-0000-0000-0000-000000000004', '준호야사랑해','#10B981',  320, 'bronze'),
  ('00000000-0000-0000-0000-000000000005', '미리미리',   '#8B5CF6',  180, 'bronze'),
  ('00000000-0000-0000-0000-000000000006', '나솔덕후',   '#EC4899',  500, 'silver'),
  ('00000000-0000-0000-0000-000000000007', '솔로탈출각', '#6366F1',   90, 'bronze')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- 3. 검수용 에피소드 (30일간 LIVE)
-- ----------------------------------------------------------------
INSERT INTO episodes (season, episode_num, title, air_start, air_end, chat_status)
VALUES (21, 5, '나는 솔로 21기 5회', now() - interval '40 minutes', now() + interval '30 days', 'open')
ON CONFLICT DO NOTHING;

UPDATE episodes
SET air_start = now() - interval '40 minutes',
    air_end   = now() + interval '30 days',
    chat_status = 'open'
WHERE season = 21 AND episode_num = 5;

-- ----------------------------------------------------------------
-- 4. 채팅 메시지 (리얼한 팬 반응 40개)
-- ----------------------------------------------------------------
DO $$
DECLARE ep_id uuid;
BEGIN
  SELECT id INTO ep_id FROM episodes WHERE season = 21 AND episode_num = 5;

  INSERT INTO chat_messages (episode_id, user_id, content, created_at) VALUES
    (ep_id, '00000000-0000-0000-0000-000000000001', '드디어 시작이다!!!', now() - interval '38 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000002', '오늘도 나솔 본방 사수 🙌', now() - interval '37 minutes' - interval '30 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000003', '저 BGM 뭐예요 ㅋㅋㅋ 분위기 잡네', now() - interval '37 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000004', '준호 오늘 너무 잘생겼다 ㅠㅠ', now() - interval '36 minutes' - interval '45 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000001', '영식이 표정 봐 저거 순자 보는 눈빛 맞지??', now() - interval '36 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000005', '순자 저 드레스 어디꺼예요 진짜 너무 예쁘다', now() - interval '35 minutes' - interval '20 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000002', '맞아요 영식이 완전 반했음 ㅋㅋ', now() - interval '35 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000006', '이번 회차 진짜 설레는데 커플 성사 각인듯', now() - interval '34 minutes' - interval '10 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000003', '준호 저 멘트 뭐야 작가님이 써줬나 ㅋㅋㅋ', now() - interval '34 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000007', '첫 참여인데 다들 반가워요 😊', now() - interval '33 minutes' - interval '30 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000001', '환영해요~~ 나솔 재밌죠??', now() - interval '33 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000004', '아 진짜 영식+순자 성사됐으면 ㅠㅠ', now() - interval '32 minutes' - interval '40 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000002', '저도요 이번 시즌 최고 케미인 것 같음', now() - interval '32 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000005', '근데 미리도 너무 예쁘지 않나요??', now() - interval '31 minutes' - interval '15 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000006', '맞아요 미리 이번에 갑자기 매력 터짐', now() - interval '31 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000003', '준호 눈빛 실화냐 심장 떨어질 뻔 했잖아', now() - interval '30 minutes' - interval '50 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000001', 'ㄹㅇ 저도 봤어요 그 장면', now() - interval '30 minutes' - interval '20 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000007', '영식이 지금 뭐하는 거예요 ㅋㅋㅋ', now() - interval '30 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000004', '순자한테 말 걸려고 하는 거 보임 ㅋㅋ', now() - interval '29 minutes' - interval '30 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000002', '이 장면 진짜 편집 천재다 BGM이랑 타이밍이', now() - interval '29 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000006', '와 방금 그 눈 마주친 거 봤어요?? 심장 💓', now() - interval '28 minutes' - interval '10 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000005', '진짜요?? 저 잠깐 폰 봤는데 ㅠㅠ', now() - interval '28 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000003', '다시보기 필수 구간ㅋㅋㅋ', now() - interval '27 minutes' - interval '40 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000001', '근데 다음 주 예고 보면 반전 있을 것 같은데', now() - interval '27 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000007', '스포 ㄴㄴ 저 아직 모름 ㅠ', now() - interval '26 minutes' - interval '20 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000004', '저도 스포 싫어요!! 같이 두근거리며 봐요', now() - interval '26 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000002', '넵넵 스포 없이 갑시다 ㅋㅋ', now() - interval '25 minutes' - interval '10 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000006', '아 나 투표 참여했는데 맞을 것 같음 ㅋㅋ', now() - interval '25 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000005', '저도 영식+순자에 걸었어요 포인트 ㄱ', now() - interval '24 minutes' - interval '30 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000003', '커머셜 ㅠㅠ 왜 이렇게 길어', now() - interval '24 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000001', '광고 시간에 화장실 다녀옴 ㅋㅋ', now() - interval '23 minutes' - interval '40 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000007', '저도요 ㅋㅋㅋ 나솔 보는 사람 다 같은 생각인가봐', now() - interval '23 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000004', '다시 시작한다!!!!', now() - interval '22 minutes' - interval '10 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000002', '집중 집중 🔥🔥', now() - interval '22 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000006', '영식이 저거 고백 각 아니야?????', now() - interval '20 minutes' - interval '30 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000001', '맞는 것 같아요 저도 심장 쿵 내려앉았음', now() - interval '20 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000005', '오늘 회차 진짜 레전드다 역대급', now() - interval '18 minutes' - interval '20 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000003', '21기 최고 명장면 탄생하는 중', now() - interval '18 minutes'),
    (ep_id, '00000000-0000-0000-0000-000000000007', '나솔팬즈 앱 너무 좋다 같이 보는 느낌이에요 ㅠㅠ', now() - interval '15 minutes' - interval '10 seconds'),
    (ep_id, '00000000-0000-0000-0000-000000000004', '맞아요 혼자 보는 것보다 훨씬 재밌음 ㅋㅋ', now() - interval '15 minutes');
END $$;

-- ----------------------------------------------------------------
-- 5. 게시글 샘플 (검수용)
-- ----------------------------------------------------------------
INSERT INTO posts (episode_id, user_id, title, content, likes)
SELECT
  e.id,
  '00000000-0000-0000-0000-000000000001',
  '오늘 5회 진짜 레전드 ㄷㄷ',
  '영식이 그 눈빛 실화냐고요 ㅠㅠ 순자한테 완전 반한 거 다 보이는데 이번엔 진짜 커플 성사될 것 같아요. 다들 어떻게 생각하세요?',
  24
FROM episodes e WHERE e.season = 21 AND e.episode_num = 5
ON CONFLICT DO NOTHING;

INSERT INTO posts (episode_id, user_id, title, content, likes)
SELECT
  e.id,
  '00000000-0000-0000-0000-000000000002',
  '준호 이번 회차 매력 포인트 정리',
  '1. 목소리 2. 경청하는 눈빛 3. 웃을 때 눈 휘어지는 거 4. 운동 잘함 5. 요리도 잘함 — 이 사람 실존인물 맞음??',
  38
FROM episodes e WHERE e.season = 21 AND e.episode_num = 5
ON CONFLICT DO NOTHING;

INSERT INTO posts (episode_id, user_id, title, content, likes)
SELECT
  NULL,
  '00000000-0000-0000-0000-000000000003',
  '[TMI] 나솔 촬영지 제주도 펜션 다녀온 후기',
  '실제로 찾아갔는데 경치 진짜 장난 아닙니다. 나솔 성지순례 코스로 강추해요. 사진 찍기에도 너무 좋음!',
  21
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- 6. 투표 항목 (현재 에피소드)
-- ----------------------------------------------------------------
INSERT INTO vote_items (episode_id, question, options, reward_points, active_during_broadcast)
SELECT
  e.id,
  '이번 회차 최고의 커플은?',
  '[{"id":"a","label":"영식 + 순자"},{"id":"b","label":"준호 + 미리"},{"id":"c","label":"도현 + 지수"},{"id":"d","label":"아직 모르겠음"}]',
  100,
  true
FROM episodes e WHERE e.season = 21 AND e.episode_num = 5
ON CONFLICT DO NOTHING;

INSERT INTO vote_items (episode_id, question, options, reward_points, active_during_broadcast)
SELECT
  e.id,
  '다음 회차에서 선택받을 사람은?',
  '[{"id":"a","label":"영식"},{"id":"b","label":"준호"},{"id":"c","label":"도현"},{"id":"d","label":"반전 있음"}]',
  150,
  true
FROM episodes e WHERE e.season = 21 AND e.episode_num = 5
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- 7. 랭킹용 포인트 내역
-- ----------------------------------------------------------------
INSERT INTO point_history (user_id, amount, reason) VALUES
  ('00000000-0000-0000-0000-000000000001', 100, 'vote_correct'),
  ('00000000-0000-0000-0000-000000000001',  10, 'post'),
  ('00000000-0000-0000-0000-000000000001',   5, 'comment'),
  ('00000000-0000-0000-0000-000000000002', 100, 'vote_correct'),
  ('00000000-0000-0000-0000-000000000002',  10, 'post'),
  ('00000000-0000-0000-0000-000000000003',  10, 'post'),
  ('00000000-0000-0000-0000-000000000006', 100, 'vote_correct'),
  ('00000000-0000-0000-0000-000000000006',  10, 'post')
ON CONFLICT DO NOTHING;
