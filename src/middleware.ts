import { defineMiddleware } from 'astro:middleware';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https: http:",
  "media-src 'self' data: blob: https: http:",
  "connect-src 'self' https:",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const headers = new Headers(response.headers);

  // _headers covers static assets; this middleware covers Astro SSR and API responses.
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  if (!headers.has('Content-Security-Policy')) headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);

  const url = new URL(context.request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const isAdminRoute = pathname === '/pengembang/admin' || pathname.startsWith('/api/admin/');
  const isDraftPreview = url.searchParams.get('previewDraft') === '1';
  if (isAdminRoute || isDraftPreview) {
    headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    headers.set('CDN-Cache-Control', 'no-store');
    headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    headers.set('Surrogate-Control', 'no-store');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    const varyValues = (headers.get('Vary') || '').split(',').map((value) => value.trim()).filter(Boolean);
    if (!varyValues.some((value) => value.toLowerCase() === 'cookie')) {
      headers.set('Vary', [...varyValues, 'Cookie'].join(', '));
    }
  } else if (pathname.startsWith('/api/') && pathname !== '/api/public/settings') {
    // Workers Cache is enabled for this Worker; make every non-public API explicit.
    headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  } else if (
    context.request.method === 'GET' &&
    response.status === 200 &&
    headers.get('Content-Type')?.toLowerCase().includes('text/html') &&
    !pathname.startsWith('/api/')
  ) {
    // Workers Cache stores the rendered public document for a short edge TTL.
    // Private/admin routes and draft previews have already taken the no-store path above.
    headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
    headers.set('Cache-Tag', 'site-html');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
