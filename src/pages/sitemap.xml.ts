import type { APIRoute } from 'astro';
import { getPageSEO } from '../lib/data';
import { getSiteOrigin } from '../lib/site-url';

export const prerender = false;

const ROUTES = ['/', '/anggota', '/galeri', '/struktur', '/keahlian', '/tkj', '/pengumuman', '/pengembang'];

export const GET: APIRoute = async ({ url }) => {
  const origin = getSiteOrigin(url.origin);
  const routeMetadata = await Promise.all(ROUTES.map(async (route) => ({ route, seo: await getPageSEO(route) })));
  const indexableRoutes = routeMetadata.filter(({ seo }) => seo.noindex !== true).map(({ route }) => route);
  const urls = indexableRoutes.map((route) => `<url><loc>${origin}${route}</loc></url>`).join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
