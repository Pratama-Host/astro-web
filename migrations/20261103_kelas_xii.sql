-- Transition kelas XI-9 -> XII-9.
-- Additive and idempotent: existing rows are updated only when they still contain XI-9.

alter table public.anggota
  alter column kelas set default 'XII-9';

update public.anggota
set kelas = 'XII-9'
where kelas = 'XI-9';

update public.site_settings
set value = jsonb_set(value, '{namaKelas}', to_jsonb('XII-9'::text), true),
    updated_at = now()
where key = 'site'
  and value->>'namaKelas' = 'XI-9';

update public.site_settings
set value = jsonb_set(value, '{waliKelas,jabatan}', to_jsonb('Wali Kelas XII-9 TKJ'::text), true),
    updated_at = now()
where key = 'site'
  and value->'waliKelas'->>'jabatan' = 'Wali Kelas XI-9 TKJ';

update public.site_pages
set title = replace(title, 'XI-9', 'XII-9'),
    description = replace(description, 'XI-9', 'XII-9'),
    updated_at = now()
where title like '%XI-9%'
   or description like '%XI-9%';

update public.site_navigation
set label = replace(label, 'XI-9', 'XII-9'),
    updated_at = now()
where label like '%XI-9%';

update public.site_sections
set label = replace(label, 'XI-9', 'XII-9'),
    updated_at = now()
where label like '%XI-9%';

update public.site_settings
set value = jsonb_set(value, '{hero,classLabel}', to_jsonb('XII-9'::text), true),
    updated_at = now()
where key = 'site'
  and value->'hero'->>'classLabel' = 'XI-9';

