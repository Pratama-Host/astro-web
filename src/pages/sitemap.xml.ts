import type { APIRoute } from 'astro';
import { getSiteOrigin } from '../lib/site-url';

export const prerender = false;

const ROUTES = ['/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengumuman', '/pengembang'];

export const GET: APIRoute = ({ url }) => {
  const origin = getSiteOrigin(url.origin);
  const urls = ROUTES.map((route) => `<url><loc>${origin}${route}</loc></url>`).join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
