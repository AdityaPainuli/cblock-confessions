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
  -- Reader reports. At REPORT_THRESHOLD the row hides itself pending review.
  reports     integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists confessions_feed_idx
  on public.confessions (to_block, status, created_at desc);

create index if not exists confessions_top_idx
  on public.confessions (to_block, status, hearts desc, created_at desc);

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
-- One heart and one report per device per confession. The device key is the
-- fingerprint hash the client derives; it identifies a browser profile, not a
-- person, and is only ever used to stop a single reader voting repeatedly.
-- ---------------------------------------------------------------------------
create table if not exists public.confession_votes (
  confession_id uuid not null references public.confessions(id) on delete cascade,
  device_key    text not null,
  kind          text not null check (kind in ('heart', 'report')),
  created_at    timestamptz not null default now(),
  primary key (confession_id, device_key, kind)
);

-- ---------------------------------------------------------------------------
-- Admin announcements. One row is active at a time; the site shows it as a
-- banner. Public and readable, unlike everything else in the admin surface.
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  message    text not null check (char_length(message) between 2 and 280),
  -- 'info' for news, 'alert' for something people need to act on.
  level      text not null default 'info' check (level in ('info', 'alert')),
  link_url   text,
  link_label text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists announcements_active_idx
  on public.announcements (active, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.confessions     enable row level security;
alter table public.confession_meta enable row level security;
alter table public.confession_votes enable row level security;
alter table public.announcements    enable row level security;

drop policy if exists "approved confessions are public" on public.confessions;
create policy "approved confessions are public"
  on public.confessions for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "active announcements are public" on public.announcements;
create policy "active announcements are public"
  on public.announcements for select
  to anon, authenticated
  using (active);

-- confession_meta and confession_votes intentionally have zero policies.
-- Only the service-role key (server side) can read or write them.

-- ---------------------------------------------------------------------------
-- Heart counter. Called from the server with the service-role key.
-- ---------------------------------------------------------------------------
-- Records the vote and bumps the counter in one statement, so a device that
-- votes twice is a no-op rather than a double count.
create or replace function public.cast_vote(cid uuid, device text, vote text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  fresh boolean;
  total integer;
begin
  insert into public.confession_votes (confession_id, device_key, kind)
  values (cid, device, vote)
  on conflict do nothing;

  get diagnostics fresh = row_count;

  if vote = 'heart' then
    if fresh then
      update public.confessions set hearts = hearts + 1
       where id = cid and status = 'approved';
    end if;
    select hearts into total from public.confessions where id = cid;
  else
    if fresh then
      update public.confessions
         set reports = reports + 1,
             -- Enough reports and it leaves the wall until a human looks.
             status = case when reports + 1 >= 3 then 'pending' else status end
       where id = cid;
    end if;
    select reports into total from public.confessions where id = cid;
  end if;

  return coalesce(total, 0);
end;
$$;

revoke all on function public.cast_vote(uuid, text, text) from public, anon, authenticated;
