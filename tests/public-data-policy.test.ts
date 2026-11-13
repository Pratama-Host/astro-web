import { describe, expect, it } from 'vitest';
import { PUBLIC_MEMBER_COLUMNS, PUBLIC_GALLERY_COLUMNS, SHOW_MEMBER_NIS, stripPrivateMemberFields } from '../src/lib/public-data-policy';
import fallback from '../src/data/G.json';

describe('public data policy', () => {
  it('keeps NIS private by default', () => {
    expect(SHOW_MEMBER_NIS).toBe(false);
    expect(PUBLIC_MEMBER_COLUMNS.split(', ')).not.toContain('nis');
  });
  it('uses explicit columns, never a wildcard', () => {
    expect(PUBLIC_MEMBER_COLUMNS).not.toContain('*');
    expect(PUBLIC_GALLERY_COLUMNS).not.toContain('*');
  });
  it('strips NIS from member and fallback records', () => {
    expect(stripPrivateMemberFields({ nama: 'A', nis: '1' })).toEqual({ nama: 'A' });
    const cleaned = (fallback as any).namaSiswa.map(stripPrivateMemberFields);
    expect(cleaned.some((m: any) => 'nis' in m)).toBe(false);
  });
});
