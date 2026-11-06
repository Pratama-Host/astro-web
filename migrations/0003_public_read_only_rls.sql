-- Public page read policies. Admin tables, drafts, revisions, audit records and media metadata
-- deliberately receive no anon/authenticated read policy. No write policies are created.
DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_settings' AND policyname='Public can read published site settings') THEN
    CREATE POLICY "Public can read published site settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (key = 'site');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='anggota' AND policyname='Public can read visible members') THEN
    CREATE POLICY "Public can read visible members" ON public.anggota FOR SELECT TO anon, authenticated USING (visible IS TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='galeri' AND policyname='Public can read visible gallery') THEN
    CREATE POLICY "Public can read visible gallery" ON public.galeri FOR SELECT TO anon, authenticated USING (visible IS TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='guru' AND policyname='Public can read teachers') THEN
    CREATE POLICY "Public can read teachers" ON public.guru FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='skills' AND policyname='Public can read skills') THEN
    CREATE POLICY "Public can read skills" ON public.skills FOR SELECT TO anon, authenticated USING (true);
  END IF;
END
$migration$;
