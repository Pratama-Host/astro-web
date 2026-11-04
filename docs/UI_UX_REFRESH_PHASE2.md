# UI/UX Refresh — Phase 2

## Scope
This phase builds on the shared visual foundation from Phase 1. It focuses on interaction quality, accessibility semantics, mobile navigation, and graceful empty states while keeping CMS endpoints, database structure, content contracts, and public routes unchanged.

## Changes

### Public pages
- Refined global content rhythm, focus feedback, touch targets, safe-area spacing, cards, dialogs, gallery, organization chart, skills, and TKJ surfaces through `src/styles/ui-finish.css`.
- Member search now matches name, NIS, and role, announces result counts, and shows a visible empty state.
- Member photo lightbox is now a nested focus-managed dialog; closing it restores focus to the member detail dialog and preserves background scroll locking.
- Focus-trap utility supports stacked dialogs and restores focus to the correct dialog beneath a nested overlay.
- Gallery carousel pauses for hover, keyboard focus, hidden tabs, and reduced-motion preferences; it has a manual pause/resume control.
- Gallery carousel controls use button semantics and announce current slide state. The lightbox works when the gallery grid is disabled in CMS section settings.
- Gallery and skills pages show clear empty states when there is no content.
- Added consistent reduced-motion handling across public content.

### CMS admin
- Mobile sidebar updates `aria-hidden` and `inert`, moves focus into the drawer on open, and returns focus to the menu trigger on close.
- Active navigation uses `aria-current="page"` rather than toggle-button semantics.
- Skip-to-content navigation and live status announcements were added.
- Improved form controls, status messages, media cards, table overflow, sticky action grouping on larger screens, and safe-area behavior in `src/styles/admin-finish.css`.

### Developer portfolio
- Added responsive overflow protection, safe interactive sizing, and consistent reduced-motion handling without replacing the existing visual identity.

## Files changed
- `src/scripts/alat.js`
- `src/scripts/anggota.js`
- `src/scripts/galeri.js`
- `src/scripts/struktur.js`
- `src/scripts/admin.js`
- `src/pages/anggota.astro`
- `src/pages/galeri.astro`
- `src/pages/keahlian.astro`
- `src/pages/struktur.astro`
- `src/pages/pengembang/admin.astro`
- `src/layouts/Layout.astro`
- `src/layouts/DeveloperLayout.astro`
- `src/styles/ui-finish.css`
- `src/styles/admin-finish.css`
- `src/styles/developer-finish.css`

## Verification
- `node --check` passes for every file in `src/scripts/*.js` using the available Node `22.16.0`.
- The three new finish stylesheets parse successfully with `tinycss2`; JavaScript syntax checks pass across all 15 frontend scripts.
- Astro compiler checks, Vitest, and production build remain pending because dependencies are not installed and local Node `22.16.0` is below the repository's declared minimum `22.23.4` (the `.nvmrc` requests `24.22.1`).

## Manual acceptance checklist
1. Test pages `/`, `/anggota`, `/galeri`, `/struktur`, `/keahlian`, and `/tkj` in all three themes (`dark`, `light`, `blue`).
2. Test member search by full/partial name, NIS, and role; clear the query; verify no-results message and count.
3. Open member detail, open profile photo, close with button and Escape; verify focus returns to the member dialog and the background remains locked until the member dialog closes.
4. Open a gallery photo from both the grid and featured carousel; close with button, backdrop, and Escape; verify focus returns to the opener (also test with the gallery grid disabled in CMS).
5. Test carousel previous/next, dots, active image, pause/resume, hover, keyboard focus, tab visibility, and reduced-motion mode.
6. Confirm empty states on gallery and skills pages, including when CMS sections are enabled but have no records.
7. On mobile, open/close CMS sidebar by button, navigation choice, backdrop, and Escape; verify focus behavior.
8. Test CMS forms, file selection, tables, status announcements, accessible labels on action buttons, and long content at 360px, 390px, 768px, 1024px, and desktop widths.
9. Check developer portfolio navigation, long text/code blocks, and reduced-motion mode.
