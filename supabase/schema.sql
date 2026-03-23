-- 나솔팬즈 Supabase DB 스키마
-- Supabase SQL Editor에서 실행하세요

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
  options jsonb not null,
  reward_points int default 100,
  correct_option_id text,
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
  reason text not null,
  created_at timestamptz default now()
);

-- RLS (Row Level Security) 활성화
alter table episodes enable row level security;
alter table users enable row level security;
alter table chat_messages enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table vote_items enable row level security;
alter table vote_responses enable row level security;
alter table point_history enable row level security;

-- 읽기 정책: 모든 테이블 공개 읽기
create policy "Public read episodes" on episodes for select using (true);
create policy "Public read users" on users for select using (true);
create policy "Public read chat_messages" on chat_messages for select using (true);
create policy "Public read posts" on posts for select using (true);
create policy "Public read comments" on comments for select using (true);
create policy "Public read vote_items" on vote_items for select using (true);
create policy "Public read vote_responses" on vote_responses for select using (true);
create policy "Public read point_history" on point_history for select using (true);

-- 쓰기 정책: 인증된 유저만
create policy "Auth insert users" on users for insert with check (auth.uid() = id);
create policy "Auth update users" on users for update using (auth.uid() = id);

create policy "Auth insert chat_messages" on chat_messages for insert with check (auth.uid() = user_id);
create policy "Auth insert posts" on posts for insert with check (auth.uid() = user_id);
create policy "Auth insert comments" on comments for insert with check (auth.uid() = user_id);
create policy "Auth insert vote_responses" on vote_responses for insert with check (auth.uid() = user_id);
create policy "Auth insert point_history" on point_history for insert with check (auth.uid() = user_id);

-- posts 좋아요 업데이트는 모든 인증 유저 허용
create policy "Auth update posts likes" on posts for update using (auth.role() = 'authenticated');

-- Realtime 활성화
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table episodes;
