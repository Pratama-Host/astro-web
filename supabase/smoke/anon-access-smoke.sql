-- Smoke test akses anon. Jalankan di Supabase SQL Editor (aman: rollback-only).
-- Harapan: baris bertanda OK berhasil; baris bertanda DITOLAK harus error.
begin;
set local role anon;
select nama from public.anggota limit 1;                       -- OK
select count(*) from public.galeri;                             -- OK
-- DITOLAK (jalankan satu per satu; masing-masing harus 'permission denied'):
-- select nis from public.anggota limit 1;
-- insert into public.guru (nama) values ('x');
-- select * from public.content_revisions;
-- select * from public.admin_audit_logs;
rollback;
