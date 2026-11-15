import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const uploader = readFileSync(new URL('../scripts/upload-media.mjs', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/pages/api/admin/media.ts', import.meta.url), 'utf8');
const validator = readFileSync(new URL('../src/lib/media-validation.ts', import.meta.url), 'utf8');

describe('media upload allowlist and batch safety contract', () => {
  it('keeps active SVG out of both the endpoint and batch uploader', () => {
    expect(validator).toContain('SVG sengaja tidak diterima');
    expect(api).toContain('SVG/HTML/script tidak diizinkan');
    expect(uploader).not.toMatch(/\.svg['\"]\s*:/i);
  });

  it('validates file signatures and caps size before upload', () => {
    expect(uploader).toContain('MAX_FILE_BYTES = 20 * 1024 * 1024');
    expect(uploader).toContain('format.signature(bytes.subarray(0, 64))');
    expect(uploader).toContain('targetExtension !== extension');
  });

  it('rejects traversal/duplicate targets and provides an offline dry-run', () => {
    expect(uploader).toContain("part !== '..'");
    expect(uploader).toContain('seenTargets.has(item.targetPath)');
    expect(uploader).toContain("args.includes('--dry-run')");
    expect(uploader).toContain('if (dryRun)');
    expect(uploader).toContain("await import('@supabase/supabase-js')");
  });
});
