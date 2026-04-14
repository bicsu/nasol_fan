-- episode chat_status 자동 전환 (Supabase pg_cron)
-- Vercel Hobby 플랜 cron 제약 우회

-- pg_cron 활성화 (Supabase에서 기본 제공)
create extension if not exists pg_cron;

-- 기존 job 있으면 삭제
select cron.unschedule('episode-status-update')
where exists (
  select 1 from cron.job where jobname = 'episode-status-update'
);

-- 매분 chat_status 자동 전환
select cron.schedule(
  'episode-status-update',
  '* * * * *',
  $$
  -- closed → open (air_start 도달)
  update episodes
  set chat_status = 'open'
  where chat_status = 'closed'
    and air_start <= now()
    and air_end > now();

  -- open → extended (air_end 도달, 1시간 연장)
  update episodes
  set chat_status = 'extended'
  where chat_status = 'open'
    and air_end <= now()
    and air_end + interval '1 hour' > now();

  -- extended → closed (air_end + 1시간 경과)
  update episodes
  set chat_status = 'closed'
  where chat_status = 'extended'
    and air_end + interval '1 hour' <= now();
  $$
);
