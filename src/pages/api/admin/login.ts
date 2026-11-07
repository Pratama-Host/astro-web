import type { APIRoute } from 'astro';
import process from 'node:process';
import { createHmac } from 'node:crypto';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { createAdminSessionCookie, isSameOriginAdminMutation, verifyAdminPassword } from '../../../lib/admin-auth';
import { isPlainRecord, readJsonRequest } from '../../../lib/cms-admin';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginAdminMutation(request)) return Response.json({ error: 'Permintaan lintas-origin ditolak.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!process.env.ADMIN_PASSWORD || !sessionSecret || new TextEncoder().encode(sessionSecret).byteLength < 32) {
    return Response.json({ error: 'ADMIN_PASSWORD wajib diisi dan ADMIN_SESSION_SECRET harus berisi minimal 32 byte.' }, { status: 503 });
  }

  const parsed = await readJsonRequest(request, 2 * 1024);
  if (parsed.error === 'too_large') return Response.json({ error: 'Permintaan login terlalu besar.' }, { status: 413 });
  if (parsed.error || !isPlainRecord(parsed.data) || typeof parsed.data.password !== 'string') {
    return Response.json({ error: 'Permintaan login tidak valid.' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) return Response.json({ error: 'Layanan autentikasi belum tersedia.' }, { status: 503 });
  const cloudflareIp = request.headers.get('cf-connecting-ip')?.trim();
  const localIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local-development';
  const ipAddress = cloudflareIp || (!import.meta.env.PROD ? localIp : '');
  if (!ipAddress) return Response.json({ error: 'Header IP Cloudflare tidak tersedia; login ditolak.' }, { status: 503 });
  // HMAC prevents practical reverse-lookup of the small IPv4 address space.
  const ipHash = createHmac('sha256', sessionSecret).update(ipAddress).digest('hex');
  const { data: allowed, error: rateLimitError } = await db.rpc('consume_tkj_admin_login_attempt', {
    p_ip_hash: ipHash, p_limit: 5, p_window_seconds: 300,
  });
  if (rateLimitError || typeof allowed !== 'boolean') {
    return Response.json({ error: 'Perlindungan login belum tersedia. Pastikan supabase/migrations/20261106000100_baseline.sql sudah diterapkan.' }, { status: 503 });
  }
  if (!allowed) {
    return Response.json({ error: 'Terlalu banyak percobaan login. Coba lagi setelah 5 menit.' }, {
      status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' },
    });
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    return Response.json({ error: 'Password salah.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const cookie = createAdminSessionCookie();
  if (!cookie) return Response.json({ error: 'ADMIN_SESSION_SECRET harus minimal 32 byte.' }, { status: 503 });
  await db.rpc('clear_tkj_admin_login_attempts', { p_ip_hash: ipHash });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie,
    },
  });
};
