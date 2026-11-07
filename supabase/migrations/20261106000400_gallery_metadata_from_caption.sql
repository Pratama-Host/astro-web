-- Fill only absent gallery titles and alt text from the already-populated caption.
-- Existing user-authored values are retained; safe to re-run.
UPDATE public.galeri
SET
  title = COALESCE(NULLIF(BTRIM(title), ''), BTRIM(caption)),
  alt_text = COALESCE(NULLIF(BTRIM(alt_text), ''), BTRIM(caption)),
  updated_at = now()
WHERE NULLIF(BTRIM(caption), '') IS NOT NULL
  AND (
    NULLIF(BTRIM(title), '') IS NULL
    OR NULLIF(BTRIM(alt_text), '') IS NULL
  );
