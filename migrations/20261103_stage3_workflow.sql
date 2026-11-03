-- Stage 3 workflow additions. Additive and safe to run more than once.
-- Draft data is isolated from site_pages; only authenticated preview requests may read it.
create table if not exists public.site_page_drafts (
  slug text primary key,
  title text,
  description text,
  og_image text,
  noindex boolean not null default false,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists site_page_drafts_updated_idx
  on public.site_page_drafts (updated_at desc);

alter table public.site_page_drafts enable row level security;
grant all on table public.site_page_drafts to service_role;

grant select, insert, update, delete on table public.site_page_drafts to service_role;
