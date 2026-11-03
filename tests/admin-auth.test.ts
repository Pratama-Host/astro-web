import { describe, expect, it } from 'vitest';
import { isSameOriginAdminMutation } from '../src/lib/admin-auth';

describe('same-origin protection for admin mutations', () => {
  it('allows safe read methods without an Origin header', () => {
    expect(isSameOriginAdminMutation(new Request('https://site.example/api/admin/content'))).toBe(true);
    expect(isSameOriginAdminMutation(new Request('https://site.example/api/admin/content', { method: 'GET' }))).toBe(true);
  });

  it('requires an exact same-origin Origin for mutations', () => {
    const url = 'https://site.example/api/admin/content';
    expect(isSameOriginAdminMutation(new Request(url, { method: 'POST', headers: { Origin: 'https://site.example' } }))).toBe(true);
    expect(isSameOriginAdminMutation(new Request(url, { method: 'POST', headers: { Origin: 'https://evil.example' } }))).toBe(false);
    expect(isSameOriginAdminMutation(new Request(url, { method: 'POST' }))).toBe(false);
    expect(isSameOriginAdminMutation(new Request(url, { method: 'DELETE', headers: { Origin: 'null' } }))).toBe(false);
  });
});
