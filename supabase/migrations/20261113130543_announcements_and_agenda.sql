-- Modul pengumuman dan agenda; semua mutasi melalui server admin.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 5000),
  category text not null default 'Kelas' check (char_length(category) <= 60),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  pinned boolean not null default false,
  publish_at timestamptz,
  expires_at timestamptz,
  link_url text check (link_url is null or link_url ~* '^https?://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_window_check check (expires_at is null or publish_at is null or expires_at > publish_at)
);

create table if not exists public.agenda_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 3000),
  category text not null default 'Kelas' check (char_length(category) <= 60),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text check (location is null or char_length(location) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agenda_events_range_check check (ends_at is null or ends_at >= starts_at)
);

create index if not exists announcements_public_idx
  on public.announcements (status, pinned desc, publish_at desc);
create index if not exists agenda_events_public_idx
  on public.agenda_events (status, starts_at);

alter table public.announcements enable row level security;
alter table public.agenda_events enable row level security;

drop policy if exists "Public can read live announcements" on public.announcements;
create policy "Public can read live announcements"
  on public.announcements for select to anon, authenticated
  using (
    status = 'published'
    and (publish_at is null or publish_at <= now())
    and (expires_at is null or expires_at > now())
  );

drop policy if exists "Public can read published agenda" on public.agenda_events;
create policy "Public can read published agenda"
  on public.agenda_events for select to anon, authenticated
  using (status = 'published');

revoke all on table public.announcements, public.agenda_events from anon, authenticated;
grant select on public.announcements, public.agenda_events to anon, authenticated;
grant all on public.announcements, public.agenda_events to service_role;
