-- Tambahkan tautan Pengumuman ke navigasi publik tanpa mengganti konfigurasi menu yang sudah ada.
insert into public.site_navigation (id, label, href, icon, sort_order, enabled)
select
  'pengumuman',
  'Pengumuman',
  '/pengumuman',
  'fa-bullhorn',
  coalesce((select max(sort_order) + 1 from public.site_navigation), 0),
  true
where not exists (
  select 1
  from public.site_navigation
  where href = '/pengumuman'
     or id = 'pengumuman'
)
on conflict (id) do nothing;
