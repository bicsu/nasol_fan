# 나솔팬즈 기능 테스트 플랜

## 테스트 환경
- Supabase URL: .env 참조
- 테스트 실행: curl / Supabase REST API
- 날짜: 2026-03-23

---

## Phase 1: 인프라 확인

### T-01. Supabase 연결 확인 -- PASS
- 8개 테이블 모두 HTTP 200 응답

### T-02. 테이블 존재 확인 -- PASS
- episodes, users, chat_messages, posts, comments, vote_items, vote_responses, point_history 전부 확인

---

## Phase 2: 테스트 데이터 생성

### T-03. 테스트 유저 생성 -- PASS
- 팬심이: `585c353d-47a1-4ee7-ab8a-9d93ec523673` (fansimi.test@gmail.com / test1234!!)
- 솔로킹: `2d57f093-9e0a-4499-902d-99904abc7d3b` (soloking.test@gmail.com / test1234!!)

### T-04. 에피소드 4개 생성 -- PASS
- EP1: 시즌22 1회 "첫 만남의 설렘" (closed)
- EP2: 시즌22 2회 "흔들리는 마음" (closed)
- EP3: 시즌22 3회 "진심의 고백" (open = LIVE)
- EP4: 시즌22 4회 "최종 선택" (closed, 미래)

### T-05. 게시글 5개 생성 -- PASS
- 팬심이 3개 (likes: 25, 12, 8)
- 솔로킹 2개 (likes: 18, 5)
- + RLS 테스트 글 1개 (팬심이, authenticated insert 검증용)

### T-06. 댓글 8개 생성 -- PASS

### T-07. 채팅 메시지 10개 생성 (EP3 LIVE) -- PASS

### T-08. 투표 2개 + 응답 4개 생성 -- PASS
- 투표1: "3회에서 영수는 누구를 선택할까요?" (순자/영자/미자)
- 투표2: "이번 회차 커플 성사 수는?" (0~3커플)
- 팬심이: 투표1 순자(적중 +100p), 투표2 1커플(적중 +200p)
- 솔로킹: 투표1 영자(미적중), 투표2 2커플(적중 +200p)

### T-09. 포인트 업데이트 -- PASS
- 팬심이: 345p (브론즈)
- 솔로킹: 240p (브론즈)

---

## Phase 3: RLS 정책 검증

### T-10. 비인증 읽기 허용 -- PASS
- anon key로 episodes SELECT -> HTTP 200

### T-11. 비인증 쓰기 차단 -- PASS
- anon key로 posts INSERT -> RLS 위반 에러 (42501)

### T-12. 인증 유저 쓰기 -- PASS
- access_token으로 posts INSERT -> HTTP 201

---

## Phase 4: 앱 화면 확인 (수동)

### T-13. 홈 탭
- [ ] LIVE 배너 표시 (시즌22 3회 방영 중)
- [ ] 최신 게시글 목록 표시

### T-14. 채팅 탭
- [ ] 채팅 메시지 10개 표시
- [ ] 입력창 활성화 상태 (LIVE)

### T-15. 게시판 탭
- [ ] 게시글 목록 표시 (6개)
- [ ] FAB(+) 버튼 표시

### T-16. 투표 탭
- [ ] 투표 2개 표시
- [ ] 옵션 선택 가능

### T-17. 랭킹 탭
- [ ] 팬심이 1위 (345p), 솔로킹 2위 (240p)

### T-18. 로그인
- [ ] 닉네임 입력 -> 가입/로그인 동작

---

## 결과 요약

| Phase | 항목 수 | 통과 | 실패 | 비고 |
|---|---|---|---|---|
| 1. 인프라 | 2 | 2 | 0 | |
| 2. 데이터 | 7 | 7 | 0 | |
| 3. RLS | 3 | 3 | 0 | |
| 4. 앱 화면 | 6 | - | - | 수동 확인 필요 |
| **합계** | **18** | **12** | **0** | |

---

## 테스트 계정 정보

| 닉네임 | 이메일 | 비밀번호 | 포인트 |
|---|---|---|---|
| 팬심이 | fansimi.test@gmail.com | test1234!! | 345p |
| 솔로킹 | soloking.test@gmail.com | test1234!! | 240p |
