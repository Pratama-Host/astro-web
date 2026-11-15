import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createAdminSessionCookie, isAdminRequest, isSameOriginAdminMutation, verifyAdminPassword } from '../src/lib/admin-auth';

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


describe('signed admin session', () => {
  const originalSecret = process.env.ADMIN_SESSION_SECRET;
  const originalPassword = process.env.ADMIN_PASSWORD;
  const secret = 'test-only-session-secret-with-more-than-32-bytes';

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalSecret;
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = originalPassword;
  });

  it('creates an HttpOnly, SameSite=Strict, root-path cookie and accepts its signature', () => {
    process.env.ADMIN_SESSION_SECRET = secret;
    const cookie = createAdminSessionCookie();
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    const cookiePair = cookie?.split(';')[0];
    const request = new Request('https://site.example/api/admin/cms', { headers: { cookie: cookiePair || '' } });
    expect(isAdminRequest(request)).toBe(true);
  });

  it('rejects tampered and expired session tokens', () => {
    process.env.ADMIN_SESSION_SECRET = secret;
    const tampered = new Request('https://site.example/api/admin/cms', {
      headers: { cookie: 'tkj_admin_session=2000000000.invalid' },
    });
    expect(isAdminRequest(tampered)).toBe(false);

    const expired = String(Math.floor(Date.now() / 1000) - 10);
    const signature = createHmac('sha256', secret).update(expired).digest('base64url');
    const request = new Request('https://site.example/api/admin/cms', {
      headers: { cookie: `tkj_admin_session=${expired}.${signature}` },
    });
    expect(isAdminRequest(request)).toBe(false);
  });

  it('fails closed when the session secret is too short and checks passwords safely', () => {
    process.env.ADMIN_SESSION_SECRET = 'too-short';
    expect(createAdminSessionCookie()).toBeNull();
    process.env.ADMIN_PASSWORD = 'a-test-password';
    expect(verifyAdminPassword('a-test-password')).toBe(true);
    expect(verifyAdminPassword('wrong')).toBe(false);
    delete process.env.ADMIN_PASSWORD;
    expect(verifyAdminPassword('a-test-password')).toBe(false);
  });
});
