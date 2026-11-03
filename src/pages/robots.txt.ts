import type { APIRoute } from 'astro';
import { getSiteOrigin } from '../lib/site-url';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const origin = getSiteOrigin(url.origin);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /pengembang/admin',
    'Disallow: /api/admin/',
    `Sitemap: ${origin}/sitemap.xml`,
  ].join('\n') + '\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
