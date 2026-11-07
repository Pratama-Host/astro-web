-- Public section controls must expose both enabled=true and enabled=false rows.
-- The page renderer relies on false values to hide disabled sections. This adds a
-- permissive SELECT policy without removing the existing enabled-only policy.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_sections'
      AND policyname = 'Public can read section visibility metadata'
  ) THEN
    CREATE POLICY "Public can read section visibility metadata"
      ON public.site_sections
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END
$migration$;
