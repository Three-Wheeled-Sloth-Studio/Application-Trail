import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.APPLICATION_TRAIL_WEB_PORT ?? 4320);
const apiOrigin = new URL(process.env.APPLICATION_TRAIL_API_INTERNAL_URL ?? 'http://127.0.0.1:4310');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

function proxyToApi(request, response) {
  const target = new URL(request.url ?? '/', apiOrigin);
  const headers = { ...request.headers, host: target.host };
  const proxy = httpRequest(target, { method: request.method, headers }, proxyResponse => {
    response.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers);
    proxyResponse.pipe(response);
  });
  proxy.once('error', error => {
    response.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'api_unavailable', detail: error.message }));
  });
  request.pipe(proxy);
}

createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/') || pathname === '/health') {
    proxyToApi(request, response);
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = join(root, relativePath);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error('not a file');
    response.writeHead(200, { 'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream' });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Application Trail web shell listening on http://127.0.0.1:${port}`);
});
