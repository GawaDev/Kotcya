import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import packageJson from './package.json' with { type: 'json' };

const port = Number.parseInt(process.env.PORT ?? '8787', 10);
const distRoot = resolve('dist');
const repository = 'https://github.com/GawaDev/Kotcya';
const publicOrigin = process.env.KOTCYA_PUBLIC_ORIGIN ?? 'https://kotcya.onrender.com';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self' blob: https://cdn.jsdelivr.net https://storage.googleapis.com",
    "worker-src 'self' blob: https://cdn.jsdelivr.net",
    "child-src 'self' blob:",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; '),
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
};

function sendJson(response, status, value) {
  response.writeHead(status, {
    ...securityHeaders,
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(value));
}

async function resolvePublicFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested = resolve(distRoot, `.${decoded === '/' ? '/index.html' : decoded}`);
  if (requested !== distRoot && !requested.startsWith(`${distRoot}${sep}`)) return null;

  try {
    const info = await stat(requested);
    return info.isFile() ? requested : null;
  } catch {
    if (extname(decoded)) return null;
    return resolve(distRoot, 'index.html');
  }
}

const server = createServer(async (request, response) => {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? '/', publicOrigin);

  if (url.pathname === '/health') {
    sendJson(response, 200, {
      status: 'ok',
      name: 'Kotcya',
      version: packageJson.version,
      repository,
      publicOrigin,
    });
    return;
  }

  if (method !== 'GET' && method !== 'HEAD') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  let file;
  try {
    file = await resolvePublicFile(url.pathname);
  } catch {
    sendJson(response, 400, { error: 'Invalid path' });
    return;
  }
  if (!file) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  const extension = extname(file);
  response.writeHead(200, {
    ...securityHeaders,
    'Cache-Control': file.includes(`${sep}assets${sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
    'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
  });
  if (method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Kotcya is listening on ${port}`);
});
