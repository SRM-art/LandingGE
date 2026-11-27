import type { APIRoute } from 'astro';
import { indexPublicSite, publicOrigin } from '#runtime';

export const GET: APIRoute = () => new Response(indexPublicSite()
  ? `User-agent: *\nDisallow: /admin/\nSitemap: ${new URL('/sitemap.xml', publicOrigin()).href}\n`
  : 'User-agent: *\nDisallow: /\n', {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
