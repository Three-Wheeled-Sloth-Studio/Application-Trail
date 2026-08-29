import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';

export interface ApiInfo {
  service: 'application-trail-api';
  status: 'ok';
  version: string;
}

export function buildApiInfo(): ApiInfo {
  return {
    service: 'application-trail-api',
    status: 'ok',
    version: process.env.npm_package_version ?? '0.1.0'
  };
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(body));
}

export function requestHandler(request: IncomingMessage, response: ServerResponse): void {
  const url = new URL(request.url ?? '/', 'http://localhost');

  if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    sendJson(response, 200, buildApiInfo());
    return;
  }

  sendJson(response, 404, { error: 'not_found' });
}

export function startServer(port = Number(process.env.APPLICATION_TRAIL_API_PORT ?? 4310)) {
  const server = createServer(requestHandler);
  server.listen(port, '127.0.0.1', () => {
    console.log(`Application Trail API listening on http://127.0.0.1:${port}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
