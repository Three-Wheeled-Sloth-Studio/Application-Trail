import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import type { CaptureListingInput } from '@application-trail/domain';
import { Pool } from 'pg';
import { PgApplicationTrailStore, type ApplicationTrailStore } from './store.js';

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

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function resolveDevelopmentUserId(request: IncomingMessage): string | null {
  if (process.env.APPLICATION_TRAIL_ENABLE_DEV_IDENTITY !== 'true') return null;
  const value = request.headers['x-application-trail-user-id'];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isCaptureListingInput(value: unknown): value is CaptureListingInput {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sourceSite === 'string' &&
    typeof candidate.sourceUrl === 'string' &&
    typeof candidate.pageTitle === 'string' &&
    typeof candidate.sourceText === 'string' &&
    typeof candidate.publishedTitle === 'string' &&
    typeof candidate.publishedCompanyName === 'string' &&
    (candidate.status === 'saved' || candidate.status === 'applied')
  );
}

export function createRequestHandler(store?: ApplicationTrailStore) {
  return async function requestHandler(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (process.env.APPLICATION_TRAIL_ENABLE_DEV_IDENTITY === 'true') {
      response.setHeader('access-control-allow-origin', '*');
      response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
      response.setHeader('access-control-allow-headers', 'content-type,x-application-trail-user-id');
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      sendJson(response, 200, buildApiInfo());
      return;
    }

    if (!store) {
      sendJson(response, 503, { error: 'database_not_configured' });
      return;
    }

    const userId = resolveDevelopmentUserId(request);
    if (!userId) {
      sendJson(response, 401, { error: 'authentication_required' });
      return;
    }

    try {
      if (request.method === 'POST' && url.pathname === '/api/opportunities/capture') {
        const body = await readJson(request);
        if (!isCaptureListingInput(body)) {
          sendJson(response, 400, { error: 'invalid_capture' });
          return;
        }
        const record = await store.captureOpportunity(userId, body);
        sendJson(response, 201, record);
        return;
      }

      const opportunityMatch = url.pathname.match(/^\/api\/opportunities\/([^/]+)$/);
      if (request.method === 'GET' && opportunityMatch?.[1]) {
        const record = await store.getOpportunity(userId, opportunityMatch[1]);
        sendJson(response, record ? 200 : 404, record ?? { error: 'not_found' });
        return;
      }

      const statusMatch = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/application-status$/);
      if (request.method === 'POST' && statusMatch?.[1]) {
        const body = await readJson(request) as { status?: unknown } | null;
        if (body?.status !== 'applied' && body?.status !== 'passed') {
          sendJson(response, 400, { error: 'invalid_application_status' });
          return;
        }
        const record = await store.setApplicationStatus(userId, statusMatch[1], body.status);
        sendJson(response, 200, record);
        return;
      }
    } catch (error) {
      console.error('Application Trail API request failed', error instanceof Error ? error.message : 'unknown error');
      sendJson(response, 500, { error: 'internal_error' });
      return;
    }

    sendJson(response, 404, { error: 'not_found' });
  };
}

export function startServer(port = Number(process.env.APPLICATION_TRAIL_API_PORT ?? 4310)) {
  const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : undefined;
  const store = pool ? new PgApplicationTrailStore(pool) : undefined;
  const server = createServer(createRequestHandler(store));
  server.listen(port, '127.0.0.1', () => {
    console.log(`Application Trail API listening on http://127.0.0.1:${port}`);
  });
  server.on('close', () => {
    void pool?.end();
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
