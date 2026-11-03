-- Remove obsolete runtime configuration that is now source-controlled.
-- Idempotent: repeated execution leaves the same JSON structure.
update public.site_settings
set value = value - 'baseUrl' - 'countdown',
    updated_at = now()
where key = 'site'
  and (value ? 'baseUrl' or value ? 'countdown');
