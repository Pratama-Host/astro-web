import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const memberScript = readFileSync(new URL('../src/scripts/anggota.js', import.meta.url), 'utf8');
const memberPage = readFileSync(new URL('../src/pages/anggota.astro', import.meta.url), 'utf8');
const structurePage = readFileSync(new URL('../src/pages/struktur.astro', import.meta.url), 'utf8');
const structureScript = readFileSync(new URL('../src/scripts/struktur.js', import.meta.url), 'utf8');
const logoComponent = readFileSync(new URL('../src/components/LogoLightbox.astro', import.meta.url), 'utf8');
const appScript = readFileSync(new URL('../src/scripts/utama.js', import.meta.url), 'utf8');

describe('member dialog keyboard and focus safety', () => {
  it('exposes the profile avatar action as a keyboard-operable control', () => {
    expect(memberPage).toContain('id="modal-avatar" class="avatar lg avatar-ring" role="button"');
    expect(memberPage).toContain('aria-disabled="true"');
    expect(memberPage).toContain('aria-hidden="true" aria-labelledby="modal-name" aria-describedby="modal-desc" inert');
    expect(memberPage).toContain('aria-label="Foto profil diperbesar" inert');
    expect(memberScript).toContain('modal.inert = false');
    expect(memberScript).toContain('photoLightbox.inert = true');
    expect(memberScript).toContain('avatarEl.tabIndex = canOpenPhoto ? 0 : -1');
    expect(memberScript).toContain('event.key === "Enter" || event.key === " "');
    expect(readFileSync(new URL('../src/styles/avatar.css', import.meta.url), 'utf8')).toContain('#modal-avatar[aria-disabled="false"]:focus-visible');
  });

  it('does not pop an unrelated focus trap when Escape is pressed outside the member dialog', () => {
    expect(memberScript).toContain('if (!modal?.classList.contains("terbuka")) return;');
    expect(structurePage).toContain('aria-label="Detail pengurus kelas" inert');
    expect(structureScript).toContain('lightbox.inert = false');
    expect(structureScript).toContain('lightbox.inert = true');
    expect(logoComponent).toContain('aria-hidden="true" aria-label="Logo TKJ XII-9 diperbesar" inert');
    expect(appScript).toContain('lightbox.inert = false');
  });
});
