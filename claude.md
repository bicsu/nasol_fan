# 나솔팬즈 · 개발 기획서

> 나는 솔로 팬들의 실시간 채팅 · 토론 · 예측 커뮤니티 앱  
> 앱인토스 출시 목표 · React Native (Expo) + Supabase

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 앱 이름 | 나솔팬즈 |
| 한 줄 소개 | 나는 솔로 팬들의 실시간 채팅 · 토론 · 예측 커뮤니티 |
| 플랫폼 | iOS / Android (Expo) |
| 타겟 유저 | 30–40대 열혈 나는 솔로 팬 |
| 수익 모델 | 무료 · 배너 광고 (Google AdMob) |
| 회원가입 | 닉네임 기반 · 앱인토스 자체 연동 |

---

## 2. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 앱 프레임워크 | React Native (Expo) | iOS/Android 동시, 빠른 MVP |
| 실시간 채팅 | Supabase Realtime | 무료 티어 넉넉, 설정 간단 |
| DB / 게시판 | Supabase PostgreSQL | 채팅과 같은 서비스로 통합 |
| 인증 | Supabase Auth (닉네임) | 앱인토스 연동 고려 |
| 푸시 알림 | Expo Push Notifications | 방영 30분 전 자동 발송 |
| 배너 광고 | Google AdMob | 업계 표준 |
| 상태 관리 | Zustand | 가볍고 단순 |
| 내비게이션 | Expo Router (파일 기반) | 최신 Expo 표준 |

---

## 3. 화면 구조 (탭 5개)

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
└── profile.tsx           # 내 예측 기록 프로필
```

### 탭별 핵심 기능

#### 홈 (index.tsx)
- 다음 방영까지 실시간 카운트다운 (`D-00:42:17` 형식)
- 방영 중이면 "LIVE" 배너 + 채팅방 입장 버튼
- 최신 게시글 목록 (HOT 태그, 에피소드 태그)
- 하단 배너 광고 (AdMob)

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

## 4. Supabase DB 스키마

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
  total_points int default 0,
  badge_level text default 'bronze', -- bronze | silver | gold | platinum | legend
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

## 5. 채팅방 자동 오픈 로직

### 상태 흐름
```
방영 30분 전 → 푸시 알림 발송
방영 시작 (air_start) → chat_status = 'open'
방영 종료 (air_end) → chat_status = 'extended' (1시간 연장)
air_end + 1시간 → chat_status = 'closed' (읽기 전용 아카이브)
```

### 구현 방식
- Supabase Edge Function으로 스케줄 관리
- 앱 포그라운드 진입 시 현재 에피소드 상태 실시간 조회
- `chat_status` 변경은 Supabase Realtime으로 앱에 즉시 반영

```typescript
// 현재 방영 중인 에피소드 조회 예시
const { data: liveEpisode } = await supabase
  .from('episodes')
  .select('*')
  .in('chat_status', ['open', 'extended'])
  .single();
```

---

## 6. 핵심 차별점 (경쟁자 대비)

| 기능 | 디씨 | 블라인드 | 오픈카톡 | 나솔팬즈 |
|---|---|---|---|---|
| 실시간 채팅 | ○ | ✕ | ○ | ○ |
| 에피소드 게시판 | ○ | ○ | ✕ | ○ |
| 투표 · 예측 | △ | △ | ✕ | ○ |
| **회차 아카이브** | ✕ | ✕ | ✕ | **★ 유일** |
| **예측 기록 프로필** | ✕ | ✕ | ✕ | **★ 유일** |
| **방영 타이머 + 자동알림** | ✕ | ✕ | ✕ | **★ 유일** |
| 나솔 전용 | ✕ | ✕ | ✕ | ○ |

### 차별점 상세

1. **회차 아카이브** — 지난 방영의 채팅 반응, 투표 결과, HOT 게시글을 회차별로 묶어 영구 보존. 디씨는 흘러가고, 오픈카톡은 사라짐.

2. **예측 기록 프로필** — 내가 언제 어떤 예측을 했는지 타임스탬프와 함께 프로필에 기록. "7회부터 영식+순자 예측"을 데이터로 증명 가능.

3. **방영 타이머 + 자동 오픈** — 홈 화면에 실시간 카운트다운, 방영 30분 전 푸시 알림, 채팅방 자동 오픈/종료. 오픈카톡은 직접 찾아 들어가야 함.

---

## 7. 포인트 & 뱃지 시스템

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

## 8. 개발 우선순위

### Phase 1 · MVP (우선 출시)
- [ ] Expo 프로젝트 초기 세팅 (expo-router)
- [ ] Supabase 연결 + DB 스키마 생성
- [ ] 홈 탭 — 카운트다운 + 방영 알림 배너
- [ ] 채팅 탭 — 실시간 채팅 (자동 오픈/종료)
- [ ] 게시판 탭 — 글쓰기 / 목록 / 상세
- [ ] 닉네임 기반 회원가입 / 로그인
- [ ] 푸시 알림 (방영 30분 전)

### Phase 2 · 차별점 구현
- [ ] 투표 탭 — 방영 중 예측 투표 + 포인트 지급
- [ ] 회차 아카이브 페이지
- [ ] 랭킹 탭 + 뱃지 시스템
- [ ] 배너 광고 (AdMob) 연동

### Phase 3 · 성장
- [ ] 예측 기록 프로필
- [ ] 게시글 좋아요 / 인기글 필터
- [ ] 이벤트 투표 (포인트 2배 등)
- [ ] 앱인토스 최종 등록

---

## 9. 앱인토스 등록 문구

**앱 이름:** 나솔팬즈

**부제:** 나는 솔로 팬들의 실시간 채팅 · 토론 · 예측 커뮤니티

**소개 본문:**
```
나솔팬즈는 나는 솔로를 사랑하는 팬들이 모여 함께 방영을 즐기는 커뮤니티 앱입니다.

📺 방영 시간에 맞춰 채팅방이 자동으로 열려요
본방 시작과 동시에 수백 명의 팬들과 실시간으로 반응을 나눠보세요.

💬 에피소드별 게시판에서 마음껏 떠들어요
감상평, 짤 분석, 출연자 TMI까지 — 나솔 얘기라면 뭐든 환영합니다.

🗳️ 방영 중 투표 & 예측에 참여하세요
커플 성사 여부, 다음 장면 예측 투표에 참여하고 적중하면 포인트를 받아요.

🏆 포인트로 랭킹에 도전하세요
예측 적중과 활동으로 포인트를 모아 월간 랭킹에 이름을 올려보세요.

📅 회차 아카이브로 추억을 되새겨요
지난 방영의 실시간 반응, 투표 결과, 명장면 게시글을 언제든 다시 볼 수 있어요.

※ 본 앱은 팬이 만든 비공식 커뮤니티로, 방송사 및 제작사와 무관합니다.
```

**검색 키워드:** 나는솔로, 나솔, 연애리얼리티, 실시간채팅, 커뮤니티, 팬앱, 투표, 예능팬

---

## 10. 디자인 가이드

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

*이 문서를 Claude Code에 붙여넣고 "이 기획대로 나솔팬즈 앱을 만들어줘"로 시작하세요.*