# Stage 3 — Workflow, media and maintainability

## Included

1. GitHub Actions runs Astro diagnostics, Vitest unit tests and a production build on pushes to `main`, pull requests, and manual dispatch.
2. Page content/SEO uses isolated `site_page_drafts`. Saving a draft does not alter `site_pages`; publish copies the draft to `site_pages` and writes a content revision. Drafts are included in CMS JSON backup/import.
3. Authenticated preview uses `?previewDraft=1`. Draft content is served only when the signed `tkj_admin_session` cookie is valid. Preview pages are `noindex` and show a banner.
4. Admin upload forms create a 480px maximum WebP thumbnail in the browser for supported raster images. Original files remain canonical; generated thumbnails are stored in the same Supabase Storage bucket under `_thumbnails/` and indexed in `media_assets.metadata`.
5. `admin.astro` no longer embeds its large CSS/JavaScript blocks; these are in `src/styles/admin.css` and `src/scripts/admin.js`. The Astro file remains the page shell and markup to keep the refactor low-risk.
6. Audit log reader has authenticated filters and offset pagination.

## Database migration

For the active `astro` project these migrations are historical; the database already contains the draft/login tables and the nine application RPCs. Do not re-run them on the live project. For a genuinely new database, follow the canonical chain in [`MIGRATIONS.md`](MIGRATIONS.md): baseline `0001`, CMS core, schema alignment `0002`, CMS RPCs `0003`, revision fix `0004`, and nested-settings/section migration `0005`. The older Stage 3 files remain for historical reference, not as the primary bootstrap sequence.

## Draft workflow

Open CMS → SEO → select a page → edit fields → **Simpan draft** → **Pratinjau draft**. The preview must be opened in the same browser profile where the admin session is logged in. It renders the actual route using draft content, with a visible preview banner. Choose **Publikasikan draft** only after checking the preview. Public routes never query or expose drafts to unauthenticated visitors.

## Thumbnail behavior

The browser creates WebP thumbnails for JPEG/PNG/WebP/AVIF-like browser-decodable raster inputs where `createImageBitmap` is available. SVG/GIF are excluded to avoid losing vector/animation behavior. If thumbnail creation or upload fails, the original upload remains successful and the API reports a warning. This implementation generates admin-library previews only; public page image URLs remain original quality.

## Risk estimates

| Change | Estimated risk | Reason |
|---|---:|---|
| CI + unit tests | Low | Validation-only workflow; no runtime behavior changed |
| Draft schema/API | Medium | New table, write/publish lifecycle and authenticated preview |
| Thumbnail generation | Medium | Adds optional Storage objects and metadata cleanup; originals are retained |
| Admin CSS/JS split | Low–Medium | Markup and script behavior retained but asset bundling changes |
| Audit pagination | Low | Read-only authenticated endpoint |

## Hardening notes

- Admin JSON endpoints enforce per-route body-size limits while reading the actual request stream. Login rejects malformed/oversized bodies and uses a persistent Supabase-backed throttle (5 attempts per HMAC-keyed source-IP fingerprint per 5 minutes); raw IP addresses are never stored. Add a Cloudflare WAF rate-limiting rule as a second outer layer.
- Media upload verifies file signatures and accepts only raster images, known audio formats, or PDF. SVG/HTML/script uploads are rejected. Request body size is enforced while streaming.
- Media deletion checks members, gallery, global settings, published pages, drafts and revision snapshots with pagination. If a read fails or exceeds the scan ceiling, deletion fails closed.
- Backup import is sent as one PostgreSQL RPC transaction. All tables are upserted; rows absent from a backup are intentionally preserved. Export and import share a 20 MiB payload ceiling and 100,000-row-per-table cap.
- Draft preview responses are marked private/no-store/noindex and bypass the service worker cache. SSR/API security headers and admin no-store behavior are also applied by `src/middleware.ts`, because static `_headers` files do not cover every Worker-rendered response.
- Versioned WebP thumbnail paths avoid stale long-lived cache entries after replacement.

## Rollback

- Disable/remove the GitHub workflow if CI needs to be paused; it does not deploy to Cloudflare.
- To roll back code, revert the Stage 3 commit. The draft table can remain safely unused. Do not drop it until any unpublished drafts are no longer needed.
- To disable thumbnail generation, remove the `appendImageThumbnail` calls and helper; old thumbnails can remain without affecting original media. Deleting the table rows is not required.
- The old public `site_pages` rows remain unchanged until a draft is explicitly published.

## Required production checks

1. Apply the additive SQL migration.
2. Deploy code with the new `/api/admin/drafts` and `/api/admin/audit` routes.
3. Login to CMS and save one test draft on a low-impact page.
4. Open its preview in the same authenticated browser; confirm the banner, draft text and `noindex` meta tag.
5. Confirm the public page without `previewDraft=1` still shows published content.
6. Publish the test draft and confirm a new content revision and audit event.
7. Upload a test JPEG/PNG and confirm its media card uses `thumbnail_url`; verify original public page URLs remain unchanged.
8. Confirm audit filters and pagination work.

Do not commit real `.env` values or Supabase service-role credentials. The active project’s database permission model is intentionally left unchanged during this development phase.

## Deployment without a local phone build

This is an Astro SSR Worker, not a static upload. Configure Cloudflare **Workers Builds** with build command `npm run build` and deploy command `npx wrangler deploy`. Cloudflare's build machine performs dependency installation and compilation; the maintainer does not need to run npm on the phone. Use Node.js 22.23.4 or newer. The included `.nvmrc` selects Node.js 24.22.1, which is available in the current Workers Builds image. Configure the required secrets/variables in Cloudflare. Do not use Cloudflare Pages for this adapter generation.
