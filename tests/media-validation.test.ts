import { describe, expect, it } from 'vitest';
import { inspectMediaFile, isVerifiedWebpThumbnail } from '../src/lib/media-validation';

describe('media upload signatures', () => {
  it('accepts a PNG signature regardless of browser MIME', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = new File([bytes], 'photo.png', { type: 'text/html' });
    await expect(inspectMediaFile(file)).resolves.toEqual({ extension: 'png', mimeType: 'image/png', kind: 'image' });
  });
  it('rejects mismatched signatures and active SVG uploads', async () => {
    const fakePng = new File(['<html>not an image</html>'], 'fake.png', { type: 'image/png' });
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], 'active.svg', { type: 'image/svg+xml' });
    await expect(inspectMediaFile(fakePng)).resolves.toBeNull();
    await expect(inspectMediaFile(svg)).resolves.toBeNull();
  });
  it('accepts only bounded WebP thumbnail signatures', async () => {
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    await expect(isVerifiedWebpThumbnail(new File([bytes], 'thumb.webp'))).resolves.toBe(true);
    await expect(isVerifiedWebpThumbnail(new File(['not webp'], 'thumb.webp'))).resolves.toBe(false);
  });
});
