import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const upstream = new URL('http://127.0.0.1:4322');
const originFile = process.env.REVIEW_ORIGIN_FILE || resolve(import.meta.dirname, 'origin.txt');
const blocked = new Set(['/admin/correo-local', '/admin/configurar', '/admin/api/auth/setup']);

http.createServer((request, response) => {
  let external;
  try {
    external = new URL(readFileSync(originFile, 'utf8').trim());
    if (external.protocol !== 'https:' || !external.hostname.endsWith('.trycloudflare.com')) throw Error();
  } catch {
    response.writeHead(503).end('Preparando la vista previa.');
    return;
  }
  if (request.headers.host !== external.host) {
    response.writeHead(403).end('Host no permitido.');
    return;
  }
  const url = new URL(request.url, external);
  let path;
  try {
    path = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';
  } catch {
    response.writeHead(400).end('Ruta no válida.');
    return;
  }
  if (url.origin !== external.origin || blocked.has(path)) {
    response.writeHead(404).end('Página no disponible en la revisión compartida.');
    return;
  }
  if (request.headers.origin && request.headers.origin !== external.origin) {
    response.writeHead(403).end('Origen no permitido.');
    return;
  }
  const headers = { ...request.headers, host: upstream.host };
  for (const name of Object.keys(headers)) {
    if (name.startsWith('x-forwarded-') || name === 'forwarded') delete headers[name];
  }
  if (headers.origin) headers.origin = upstream.origin;
  const forwarded = http.request(new URL(url.pathname + url.search, upstream), {
    method: request.method, headers, timeout: 30000
  }, result => {
    const outputHeaders = { ...result.headers, 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };
    if (outputHeaders.location?.startsWith(upstream.origin)) {
      outputHeaders.location = external.origin + outputHeaders.location.slice(upstream.origin.length);
    }
    if (outputHeaders['set-cookie']) {
      outputHeaders['set-cookie'] = outputHeaders['set-cookie'].map(cookie => /;\s*secure(?:;|$)/i.test(cookie) ? cookie : cookie + '; Secure');
    }
    response.writeHead(result.statusCode || 502, outputHeaders);
    result.pipe(response);
  });
  forwarded.on('timeout', () => forwarded.destroy());
  forwarded.on('error', () => {
    if (!response.headersSent) response.writeHead(502);
    response.end('La vista previa no está disponible.');
  });
  request.on('aborted', () => forwarded.destroy());
  request.pipe(forwarded);
}).listen(4319, '0.0.0.0', () => console.log('Proxy de revisión listo dentro del contenedor'));
