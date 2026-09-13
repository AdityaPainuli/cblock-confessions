-- C Block Confessions :: database schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Public content. Readable by anyone, but only rows that passed moderation.
-- ---------------------------------------------------------------------------
create table if not exists public.confessions (
  id          uuid primary key default gen_random_uuid(),
  body        text not null check (char_length(body) between 4 and 1000),
  tag         text not null default 'general',
  mood        text not null default 'neutral',
  -- The wall this was posted to. Only blocks open for receiving are accepted.
  to_block    text not null default 'C',
  status      text not null default 'approved'
              check (status in ('pending', 'approved', 'rejected')),
  hearts      integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists confessions_feed_idx
  on public.confessions (to_block, status, created_at desc);

-- ---------------------------------------------------------------------------
-- Submission metadata. Admin-only: no anon/authenticated policy is ever added,
-- so with RLS on, this table is unreachable with the public anon key.
-- ---------------------------------------------------------------------------
create table if not exists public.confession_meta (
  confession_id   uuid primary key references public.confessions(id) on delete cascade,
  ip              text,
  user_agent      text,
  browser         text,
  browser_version text,
  engine          text,
  os              text,
  os_version      text,
  device_type     text,
  device_vendor   text,
  device_model    text,
  screen          text,
  viewport        text,
  pixel_ratio     numeric,
  timezone        text,
  languages       text,
  platform        text,
  device_memory   numeric,
  cpu_cores       integer,
  touch_points    integer,
  gpu             text,
  fingerprint     text,
  -- Author's own block and course. Admin-only, for usage insight.
  from_block      text,
  from_course     text,
  geo_city        text,
  geo_region      text,
  geo_country     text,
  geo_postal      text,
  geo_lat         double precision,
  geo_lon         double precision,
  geo_isp         text,
  geo_source      text,
  referrer        text,
  created_at      timestamptz not null default now()
);

create index if not exists confession_meta_fingerprint_idx
  on public.confession_meta (fingerprint);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.confessions    enable row level security;
alter table public.confession_meta enable row level security;

drop policy if exists "approved confessions are public" on public.confessions;
create policy "approved confessions are public"
  on public.confessions for select
  to anon, authenticated
  using (status = 'approved');

-- confession_meta intentionally has zero policies.
-- Only the service-role key (server side) can read or write it.

-- ---------------------------------------------------------------------------
-- Heart counter. Called from the server with the service-role key.
-- ---------------------------------------------------------------------------
create or replace function public.increment_hearts(cid uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.confessions
     set hearts = hearts + 1
   where id = cid and status = 'approved'
  returning hearts;
$$;

revoke all on function public.increment_hearts(uuid) from public, anon, authenticated;
