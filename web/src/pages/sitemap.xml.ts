import type { APIRoute } from 'astro';
import { indexPublicSite, publicOrigin } from '#runtime';
import { all } from '../server/db';

const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export const GET: APIRoute = async () => {
  if (!indexPublicSite()) return new Response(null, { status: 404 });
  const records = await all(`SELECT 'catalogo' AS section, slug, updated_at FROM product
    WHERE state='published' AND deleted_at IS NULL
    UNION ALL SELECT 'proyectos', slug, updated_at FROM project
    WHERE state='published' AND deleted_at IS NULL ORDER BY section, slug`);
  const origin = publicOrigin();
  const entry = (path: string, updated?: string) => {
    const date = updated ? new Date(updated) : null;
    const lastmod = date && Number.isFinite(date.getTime()) ? `<lastmod>${date.toISOString()}</lastmod>` : '';
    return `<url><loc>${xml(new URL(path, origin).href)}</loc>${lastmod}</url>`;
  };
  const pages = ['/', '/catalogo', '/proyectos', '/nosotros'].map(path => entry(path));
  pages.push(...records.map(record => entry(`/${record.section}/${encodeURIComponent(record.slug)}`, record.updated_at)));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.join('\n')}\n</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
