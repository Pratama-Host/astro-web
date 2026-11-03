import type { APIRoute } from 'astro';
import { clearAdminSessionCookie, isSameOriginAdminMutation } from '../../../lib/admin-auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginAdminMutation(request)) return Response.json({ error: 'Permintaan lintas-origin ditolak.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': clearAdminSessionCookie(),
    },
  });
};
