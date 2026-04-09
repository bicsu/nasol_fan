# 나솔팬즈 · 개발 기획서

> 나는 솔로 팬들의 실시간 채팅 · 토론 · 예측 커뮤니티 앱
> **앱인토스(토스 미니앱) 출시** · React Native (Expo) + Supabase + 자체 백엔드

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 앱 이름 | 나솔팬즈 |
| appName | `nasolFans` (앱인토스 등록용, 변경 불가) |
| 한 줄 소개 | 나는 솔로 팬들의 실시간 채팅 · 토론 · 예측 커뮤니티 |
| 플랫폼 | 토스 앱 내 미니앱 (WebView) + 웹 (Vercel) |
| 타겟 유저 | 30–40대 열혈 나는 솔로 팬 (만 19세 이상) |
| 수익 모델 | 무료 · 앱인토스 광고 (전면형/보상형/배너) |
| 회원가입 | 토스 로그인 (필수) — 자사/타사 로그인 불가 |

---

## 2. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 앱 프레임워크 | React Native (Expo SDK 54) | 미니앱 WebView + 웹 동시 지원 |
| 실시간 채팅 | Supabase Realtime | 무료 티어 넉넉, 설정 간단 |
| DB / 게시판 | Supabase PostgreSQL | 채팅과 같은 서비스로 통합 |
| 인증 | **토스 로그인** → Supabase Auth 연동 | 앱인토스 필수 (mTLS 경유) |
| 푸시 알림 | **토스 푸시 API** | 앱인토스 전용, REST API 호출 |
| 백엔드 서버 | Node.js (별도 서버) | mTLS 인증서 적용, 토스 API 중계 |
| 광고 | 앱인토스 광고 (전면형/보상형/배너) | 외부 광고 네트워크 사용 불가 (정책) |
| 상태 관리 | Zustand | 가볍고 단순 |
| 내비게이션 | Expo Router (파일 기반) | 최신 Expo 표준 |
| 웹 배포 | Vercel | 웹 버전 호스팅 |

---

## 3. 시스템 아키텍처

```
사용자 (토스 앱)
    │
    ├─→ 나솔팬즈 미니앱 (WebView)
    │       │
    │       ├─→ Supabase (DB, Realtime, 채팅)
    │       │
    │       └─→ 자체 백엔드 서버 (Node.js)
    │               │
    │               ├─→ 토스 로그인 API (mTLS)
    │               ├─→ 토스 푸시 알림 API (mTLS)
    │               └─→ Supabase Admin (서비스 키)
    │
사용자 (웹 브라우저)
    │
    └─→ Vercel (웹 버전) ─→ Supabase
```

### mTLS 인증서

- 앱인토스 콘솔에서 발급 (유효기간 390일)
- 자체 백엔드 서버에 설치
- 토스 API 호출 시 양방향 신원 검증
- 필수 적용 대상: 토스 로그인, 푸시 알림, 토스페이, 프로모션

---

## 4. 화면 구조 (탭 5개)

```
app/
├── (tabs)/
│   ├── index.tsx         # 홈 — 카운트다운 + 최신 게시글 + 방영 알림
│   ├── chat.tsx          # 채팅 — 실시간 채팅방 (자동 오픈/종료)
│   ├── board.tsx         # 게시판 — 에피소드별 토론 · TMI
│   ├── vote.tsx          # 투표 — 방영 중 예측 투표 + 포인트
│   └── ranking.tsx       # 랭킹 — 월간 포인트 순위 + 뱃지
├── episode/[id].tsx      # 회차 아카이브 상세 페이지
├── post/[id].tsx         # 게시글 상세
├── login.tsx             # 토스 로그인 (현재: 닉네임 임시 로그인)
└── profile.tsx           # 내 예측 기록 프로필
```

### 탭별 핵심 기능

#### 홈 (index.tsx)
- 다음 방영까지 실시간 카운트다운 (`D-00:42:17` 형식)
- 방영 중이면 "LIVE" 배너 + 채팅방 입장 버튼
- 최신 게시글 목록 (HOT 태그, 에피소드 태그)
- 하단 배너 광고 (앱인토스 광고)

#### 채팅 (chat.tsx)
- 현재 방영 회차의 실시간 채팅 (Supabase Realtime)
- chat_status에 따라 입력창 활성/비활성 처리
- 닉네임 + 아바타 컬러 표시
- 채팅 종료 후 읽기 전용 아카이브 전환

#### 게시판 (board.tsx)
- 에피소드 필터 탭 (전체 / 회차별)
- 글쓰기 (제목 + 내용 + 에피소드 태그)
- 좋아요 / 댓글 수 표시
- 포인트: 게시글 작성 +10p, 댓글 +5p

#### 투표 (vote.tsx)
- 방영 중에만 투표 활성화
- 투표 항목별 실시간 퍼센트 표시
- 적중 시 포인트 지급 (100p 기본, 이벤트 시 2배)
- 내 투표 기록 저장 → 프로필 히스토리 연동

#### 랭킹 (ranking.tsx)
- 월간 포인트 TOP 100
- 1/2/3위 금/은/동 강조
- 내 순위 항상 하단 고정 표시
- 뱃지 시스템: 브론즈 → 실버 → 골드 → 플래티넘 → 전설

---

## 5. 인증 흐름 (토스 로그인)

```
사용자 → 토스 로그인 버튼 → 토스 앱 OAuth 화면
  → 동의 후 인가코드 발급
  → 자체 백엔드 서버 (mTLS) → 토스 서버에 토큰 교환
  → 유저 정보 수신 (토스 유저키, 닉네임 등)
  → Supabase Auth에 유저 생성/로그인
  → 앱에 세션 반환
```

### 필수 구현 사항
- 약관 및 동의문 등록 (개인정보처리방침, 서비스 이용약관)
- 사용자 정보 수집 범위 설정 (콘솔)
- 연결 끊기 콜백 구현 (로그인 해제 시 유저 데이터 처리)

### 현재 상태
- 닉네임 기반 임시 로그인 구현됨 (app/login.tsx)
- 사업자 등록 후 토스 로그인으로 교체 예정

---

## 6. 푸시 알림 (토스 API)

### 발송 방식
```
자체 백엔드 서버 → POST 토스 푸시 API (mTLS)
  헤더: X-Toss-User-Key
  바디: templateSetCode + context (변수)
```

### 알림 시나리오
| 시점 | 종류 | 내용 |
|---|---|---|
| 방영 30분 전 | 기능성 | "나솔 21회 곧 시작! 채팅방 입장하기" |
| 투표 결과 발표 | 기능성 | "예측 적중! +100p 획득" |
| 인기글 알림 | 광고성 | "HOT 게시글이 올라왔어요" |

### 선행 조건
1. 토스 로그인 연동 완료
2. 콘솔에서 메시지 템플릿 사전 등록
3. mTLS 인증서 백엔드 적용

---

## 7. Supabase DB 스키마

```sql
-- 에피소드 (방영 스케줄)
create table episodes (
  id uuid primary key default gen_random_uuid(),
  season int not null,
  episode_num int not null,
  title text,
  air_start timestamptz not null,
  air_end timestamptz not null,
  chat_status text default 'closed', -- closed | open | extended
  created_at timestamptz default now()
);

-- 유저
create table users (
  id uuid primary key references auth.users,
  nickname text unique not null,
  avatar_color text default '#D4537E',
  toss_user_key text unique,          -- 토스 로그인 유저키
  total_points int default 0,
  badge_level text default 'bronze',  -- bronze | silver | gold | platinum | legend
  created_at timestamptz default now()
);

-- 채팅 메시지
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references episodes(id),
  user_id uuid references users(id),
  content text not null,
  created_at timestamptz default now()
);

-- 게시글
create table posts (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references episodes(id),
  user_id uuid references users(id),
  title text not null,
  content text not null,
  likes int default 0,
  created_at timestamptz default now()
);

-- 댓글
create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id),
  user_id uuid references users(id),
  content text not null,
  created_at timestamptz default now()
);

-- 투표 항목
create table vote_items (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid references episodes(id),
  question text not null,
  options jsonb not null, -- [{"id": "a", "label": "영식+순자"}, ...]
  reward_points int default 100,
  correct_option_id text, -- 방영 후 정답 입력
  active_during_broadcast boolean default true,
  created_at timestamptz default now()
);

-- 투표 응답
create table vote_responses (
  id uuid primary key default gen_random_uuid(),
  vote_item_id uuid references vote_items(id),
  user_id uuid references users(id),
  selected_option_id text not null,
  is_correct boolean,
  points_awarded int default 0,
  created_at timestamptz default now(),
  unique(vote_item_id, user_id)
);

-- 포인트 내역
create table point_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  amount int not null,
  reason text not null, -- 'vote_correct' | 'post' | 'comment' | 'event'
  created_at timestamptz default now()
);
```

---

## 8. 채팅방 자동 오픈 로직

### 상태 흐름
```
방영 30분 전 → 토스 푸시 알림 발송 (백엔드 → 토스 API)
방영 시작 (air_start) → chat_status = 'open'
방영 종료 (air_end) → chat_status = 'extended' (1시간 연장)
air_end + 1시간 → chat_status = 'closed' (읽기 전용 아카이브)
```

### 구현 방식
- Supabase Edge Function 또는 자체 백엔드 cron으로 스케줄 관리
- 앱 포그라운드 진입 시 현재 에피소드 상태 실시간 조회
- `chat_status` 변경은 Supabase Realtime으로 앱에 즉시 반영

---

## 9. 핵심 차별점 (경쟁자 대비)

| 기능 | 디씨 | 블라인드 | 오픈카톡 | 나솔팬즈 |
|---|---|---|---|---|
| 실시간 채팅 | O | X | O | O |
| 에피소드 게시판 | O | O | X | O |
| 투표 / 예측 | - | - | X | O |
| **회차 아카이브** | X | X | X | **유일** |
| **예측 기록 프로필** | X | X | X | **유일** |
| **방영 타이머 + 자동알림** | X | X | X | **유일** |
| 나솔 전용 | X | X | X | O |

---

## 10. 포인트 & 뱃지 시스템

> **포인트는 앱 내 랭킹/뱃지 전용이며, 현금 교환 · 출금 · 외부 이전이 불가합니다.**
> 사행성 요소 없음 — 실제 금전적 가치가 없는 순수 재미/참여 보상 시스템

### 포인트 적립
| 행동 | 포인트 |
|---|---|
| 투표 예측 적중 | +100p (이벤트 시 2배) |
| 게시글 작성 | +10p |
| 댓글 작성 | +5p |
| 첫 로그인 (일별) | +5p |

### 뱃지 등급
| 등급 | 조건 |
|---|---|
| 브론즈 | 0p~ |
| 실버 | 500p~ |
| 골드 | 2,000p~ |
| 플래티넘 | 5,000p~ |
| 전설 | 10,000p~ |

---

## 11. 개발 우선순위

### Phase 1 · MVP (완료)
- [x] Expo 프로젝트 초기 세팅 (expo-router)
- [x] Supabase 연결 + DB 스키마 생성
- [x] 홈 탭 — 카운트다운 + 방영 알림 배너
- [x] 채팅 탭 — 실시간 채팅 (자동 오픈/종료)
- [x] 게시판 탭 — 글쓰기 / 목록 / 상세
- [x] 닉네임 기반 임시 로그인
- [x] 투표 탭 — 예측 투표 + 포인트
- [x] 랭킹 탭 + 뱃지 시스템
- [x] 프로필 — 투표 기록 / 포인트 내역
- [x] Vercel 웹 배포

### Phase 2 · 앱인토스 연동 (진행 중)
- [ ] 사업자등록증 수령
- [ ] 앱인토스 개발자센터 가입 + 앱 등록 (appName: nasolFans)
- [ ] mTLS 인증서 발급 (콘솔)
- [ ] 자체 백엔드 서버 구축 (Node.js + mTLS)
- [ ] 토스 로그인 연동 (현재 닉네임 로그인 교체)
- [ ] 약관 동의 UI + 개인정보처리방침 / 이용약관 페이지
- [ ] 토스 푸시 알림 연동 (템플릿 등록 + API)
- [ ] 미니앱 가이드라인 준수 확인 (운영/디자인/기능/보안)
- [ ] 앱 번들 업로드 + 출시 검수 (영업일 3일)

### Phase 3 · 성장
- [ ] 앱인토스 광고 연동 (전면형/보상형/배너)
- [ ] 게시글 좋아요 / 인기글 필터
- [ ] 이벤트 투표 (포인트 2배 등)
- [ ] 스마트 발송 (세그먼트 + 발송 시점 최적화)

---

## 12. 앱인토스 등록 정보

**appName:** nasolFans (변경 불가)
**앱 이름:** 나솔팬즈
**카테고리:** 커뮤니티
**고객문의 이메일:** (사업용 이메일 준비 필요)

**부제:** 나는 솔로 팬들의 실시간 채팅 · 토론 · 예측 커뮤니티

**소개 본문:**
```
나솔팬즈는 나는 솔로를 사랑하는 팬들이 모여 함께 방영을 즐기는 커뮤니티 앱입니다.

방영 시간에 맞춰 채팅방이 자동으로 열려요
본방 시작과 동시에 수백 명의 팬들과 실시간으로 반응을 나눠보세요.

에피소드별 게시판에서 마음껏 떠들어요
감상평, 짤 분석, 출연자 TMI까지 — 나솔 얘기라면 뭐든 환영합니다.

방영 중 투표 & 예측에 참여하세요
커플 성사 여부, 다음 장면 예측 투표에 참여하고 적중하면 포인트를 받아요.

포인트로 랭킹에 도전하세요
예측 적중과 활동으로 포인트를 모아 월간 랭킹에 이름을 올려보세요.

회차 아카이브로 추억을 되새겨요
지난 방영의 실시간 반응, 투표 결과, 명장면 게시글을 언제든 다시 볼 수 있어요.

※ 본 앱은 팬이 만든 비공식 커뮤니티로, 방송사 및 제작사와 무관합니다.
```

**검색 키워드:** 나는솔로, 나솔, 연애리얼리티, 실시간채팅, 커뮤니티, 팬앱, 투표, 예능팬

### 앱인토스 제약사항
- 만 19세 이상만 이용 가능
- Android 7+ / iOS 16+ 지원
- 앱 번들 용량: 압축 해제 기준 100MB 이하
- 출시 검수: 운영 · 디자인 · 기능 · 보안 (영업일 3일)
- appName 등록 후 수정/삭제 불가

### 앱인토스 서비스 오픈 정책 준수

#### 로그인 / 결제 / 광고
- 로그인: **토스 로그인만** 허용 (자사/소셜/간편 로그인 불가)
- 결제: 실물 → 토스페이만, 디지털 → 인앱결제만 (현재 결제 기능 없음)
- 광고: **앱인토스 광고만** 허용 (AdMob 등 외부 광고 네트워크 사용 불가)

#### 외부 링크 / 앱 설치 유도 금지
- 자사 앱 설치 유도 금지
- 외부 링크는 법률 고지 등 허용된 경우만 가능
- 모든 기능은 미니앱 내에서 완결되어야 함

#### 사행성 관련
- 포인트는 현금 교환 불가, 랭킹/뱃지 전용 (사행성 아님)
- 투표는 무료 참여, 금전적 보상 없음을 약관에 명시 필요

---

## 13. 디자인 가이드

**메인 컬러:** #D4537E (핑크)
**배경:** #F5F4F0
**카드 배경:** #FFFFFF
**텍스트 primary:** #1A1A18
**텍스트 secondary:** #888888
**포인트 컬러:** #D4537E (핑크) / #1D9E75 (그린, 적중)

**폰트 크기:**
- 앱 이름: 18px / 600
- 섹션 타이틀: 15px / 600
- 본문: 13px / 400
- 메타 정보: 11px / 400

---

## 14. 참고 문서

- 앱인토스 개발자센터: https://developers-apps-in-toss.toss.im/
- 토스 로그인 연동: https://developers-apps-in-toss.toss.im/login/intro.html
- API 연동 (mTLS): https://developers-apps-in-toss.toss.im/development/integration-process.html
- 푸시 알림: https://developers-apps-in-toss.toss.im/push/develop.html
- FAQ: https://developers-apps-in-toss.toss.im/faq.html
- 출시 체크리스트: .claude/apps-in-toss-checklist.md
