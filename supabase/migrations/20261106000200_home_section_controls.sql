-- Add the four home-page sections exposed by index.astro to the generic admin section editor.
-- Additive and idempotent; does not overwrite existing labels, visibility, or ordering.
insert into public.site_sections
  (id, page_slug, section_key, label, sort_order, enabled, updated_at)
values
  ('home.hero', '/', 'hero', 'Hero', 0, true, now()),
  ('home.stats', '/', 'stats', 'Statistik kelas', 1, true, now()),
  ('home.teachers', '/', 'teachers', 'Tim pengajar', 2, true, now()),
  ('home.about', '/', 'about', 'Visi, Misi & Prestasi', 3, true, now())
on conflict (page_slug, section_key) do nothing;
