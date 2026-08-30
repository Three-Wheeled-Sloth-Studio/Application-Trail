import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import type { CaptureListingInput } from '@application-trail/domain';
import { Pool } from 'pg';
import {
  buildGoogleAuthorizationUrl,
  createOAuthState,
  exchangeGoogleCode,
  PgAuthStore,
  type SessionResolution,
  verifyOAuthState
} from './auth.js';
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

function sendHtml(response: ServerResponse, statusCode: number, body: string): void {
  response.writeHead(statusCode, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(body);
}

function redirect(response: ServerResponse, location: string): void {
  response.writeHead(302, { location, 'cache-control': 'no-store' });
  response.end();
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function parseCookies(request: IncomingMessage): Record<string, string> {
  const result: Record<string, string> = {};
  const value = request.headers.cookie;
  if (!value) return result;
  for (const part of value.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const cookieValue = part.slice(index + 1).trim();
    if (name) result[name] = decodeURIComponent(cookieValue);
  }
  return result;
}

function isSecureDeployment(): boolean {
  return (process.env.APPLICATION_TRAIL_PUBLIC_URL ?? '').startsWith('https://');
}

function sessionCookieName(): string {
  return isSecureDeployment() ? '__Host-application_trail_session' : 'application_trail_session';
}

function appendCookie(response: ServerResponse, cookie: string): void {
  const existing = response.getHeader('set-cookie');
  const values = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : [];
  response.setHeader('set-cookie', [...values, cookie]);
}

function cookie(name: string, value: string, maxAgeSeconds: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
  ];
  if (isSecureDeployment()) parts.push('Secure');
  return parts.join('; ');
}

function setSessionCookie(response: ServerResponse, token: string, expiresAt: string): void {
  const maxAgeSeconds = (new Date(expiresAt).getTime() - Date.now()) / 1000;
  appendCookie(response, cookie(sessionCookieName(), token, maxAgeSeconds));
}

function clearSessionCookie(response: ServerResponse): void {
  appendCookie(response, cookie(sessionCookieName(), '', 0));
}

function setOAuthNonceCookie(response: ServerResponse, nonce: string): void {
  appendCookie(response, cookie('application_trail_oauth_nonce', nonce, 10 * 60));
}

function clearOAuthNonceCookie(response: ServerResponse): void {
  appendCookie(response, cookie('application_trail_oauth_nonce', '', 0));
}

function bearerToken(request: IncomingMessage): string | null {
  const value = request.headers.authorization;
  if (!value?.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length).trim();
  return token || null;
}

function resolveDevelopmentUserId(request: IncomingMessage): string | null {
  if (process.env.APPLICATION_TRAIL_ENABLE_DEV_IDENTITY !== 'true') return null;
  const value = request.headers['x-application-trail-user-id'];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

interface RequestIdentity {
  userId: string;
  session?: SessionResolution;
  provider: 'google' | 'development';
  email?: string;
  displayName?: string;
}

async function resolveRequestIdentity(request: IncomingMessage, authStore?: PgAuthStore): Promise<RequestIdentity | null> {
  if (authStore) {
    const cookies = parseCookies(request);
    const token = bearerToken(request) ?? cookies[sessionCookieName()] ?? null;
    if (token) {
      const session = await authStore.resolveSessionToken(token);
      if (session) {
        return {
          userId: session.userId,
          session,
          provider: 'google',
          ...(session.email ? { email: session.email } : {}),
          ...(session.displayName ? { displayName: session.displayName } : {})
        };
      }
    }
  }
  const developmentUserId = resolveDevelopmentUserId(request);
  return developmentUserId ? { userId: developmentUserId, provider: 'development' } : null;
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

function publicUrl(): URL {
  return new URL(process.env.APPLICATION_TRAIL_PUBLIC_URL ?? 'http://127.0.0.1:4320');
}

function safeReturnPath(value: string | null): string | undefined {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : undefined;
}

function configureCors(request: IncomingMessage, response: ServerResponse): void {
  if (process.env.APPLICATION_TRAIL_ENABLE_DEV_IDENTITY === 'true') {
    response.setHeader('access-control-allow-origin', '*');
  } else if (request.headers.origin?.startsWith('chrome-extension://')) {
    response.setHeader('access-control-allow-origin', request.headers.origin);
    response.setHeader('vary', 'origin');
  }
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type,authorization,x-application-trail-user-id');
}

export function createRequestHandler(store?: ApplicationTrailStore, authStore?: PgAuthStore) {
  return async function requestHandler(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://localhost');
    configureCors(request, response);

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      sendJson(response, 200, buildApiInfo());
      return;
    }

    if (request.method === 'GET' && url.pathname === '/auth/google/start') {
      try {
        const purpose = url.searchParams.get('purpose') === 'extension' ? 'extension' : 'web';
        const grantId = purpose === 'extension' ? url.searchParams.get('grant') ?? undefined : undefined;
        if (purpose === 'extension' && !grantId) {
          sendJson(response, 400, { error: 'extension_grant_required' });
          return;
        }
        const returnPath = safeReturnPath(url.searchParams.get('return'));
        const { state, nonce } = createOAuthState({ purpose, ...(grantId ? { grantId } : {}), ...(returnPath ? { returnPath } : {}) });
        setOAuthNonceCookie(response, nonce);
        redirect(response, buildGoogleAuthorizationUrl(state));
      } catch (error) {
        console.error('Google OAuth start failed', error instanceof Error ? error.message : 'unknown error');
        sendJson(response, 503, { error: 'oauth_not_configured' });
      }
      return;
    }

    if (request.method === 'GET' && url.pathname === '/auth/google/callback') {
      if (!authStore) {
        sendJson(response, 503, { error: 'database_not_configured' });
        return;
      }
      try {
        const code = url.searchParams.get('code');
        const stateValue = url.searchParams.get('state');
        const state = stateValue ? verifyOAuthState(stateValue) : null;
        const nonce = parseCookies(request).application_trail_oauth_nonce;
        if (!code || !state || !nonce || nonce !== state.nonce) {
          sendJson(response, 400, { error: 'invalid_oauth_callback' });
          return;
        }
        const profile = await exchangeGoogleCode(code);
        const identity = await authStore.upsertGoogleIdentity(profile);
        const session = await authStore.createSession(identity.userId, 'web', 7 * 24 * 60 * 60 * 1000);
        clearOAuthNonceCookie(response);
        setSessionCookie(response, session.token, session.expiresAt);

        if (state.purpose === 'extension' && state.grantId) {
          const authorized = await authStore.authorizeExtensionGrant(state.grantId, identity.userId);
          if (!authorized) {
            sendJson(response, 400, { error: 'extension_grant_expired' });
            return;
          }
          redirect(response, new URL(`/auth/extension/complete?grant=${encodeURIComponent(state.grantId)}`, publicUrl()).toString());
          return;
        }
        redirect(response, new URL(state.returnPath ?? '/', publicUrl()).toString());
      } catch (error) {
        console.error('Google OAuth callback failed', error instanceof Error ? error.message : 'unknown error');
        sendJson(response, 500, { error: 'oauth_callback_failed' });
      }
      return;
    }

    if (request.method === 'POST' && url.pathname === '/auth/extension/start') {
      if (!authStore) {
        sendJson(response, 503, { error: 'database_not_configured' });
        return;
      }
      const grant = await authStore.createExtensionGrant();
      sendJson(response, 201, {
        ...grant,
        verificationUrl: new URL(`/auth/extension/authorize?grant=${encodeURIComponent(grant.grantId)}`, publicUrl()).toString()
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/auth/extension/authorize') {
      if (!authStore) {
        sendJson(response, 503, { error: 'database_not_configured' });
        return;
      }
      const grantId = url.searchParams.get('grant');
      if (!grantId) {
        sendJson(response, 400, { error: 'extension_grant_required' });
        return;
      }
      const identity = await resolveRequestIdentity(request, authStore);
      if (!identity || identity.provider !== 'google') {
        redirect(response, new URL(`/auth/google/start?purpose=extension&grant=${encodeURIComponent(grantId)}`, publicUrl()).toString());
        return;
      }
      const authorized = await authStore.authorizeExtensionGrant(grantId, identity.userId);
      if (!authorized) {
        sendJson(response, 400, { error: 'extension_grant_expired' });
        return;
      }
      redirect(response, new URL(`/auth/extension/complete?grant=${encodeURIComponent(grantId)}`, publicUrl()).toString());
      return;
    }

    if (request.method === 'GET' && url.pathname === '/auth/extension/complete') {
      sendHtml(response, 200, '<!doctype html><html><head><meta charset="utf-8"><title>Application Trail</title></head><body><main><h1>Application Trail</h1><p>Extension sign-in complete. You can close this tab and return to the job listing.</p></main></body></html>');
      return;
    }

    if (request.method === 'POST' && url.pathname === '/auth/extension/exchange') {
      if (!authStore) {
        sendJson(response, 503, { error: 'database_not_configured' });
        return;
      }
      try {
        const body = await readJson(request) as { grantId?: unknown; grantSecret?: unknown } | null;
        if (typeof body?.grantId !== 'string' || typeof body.grantSecret !== 'string') {
          sendJson(response, 400, { error: 'invalid_extension_grant' });
          return;
        }
        const consumed = await authStore.consumeExtensionGrant(body.grantId, body.grantSecret);
        if (consumed.status === 'pending') {
          sendJson(response, 202, { status: 'pending' });
          return;
        }
        if (consumed.status !== 'authorized') {
          sendJson(response, consumed.status === 'expired' || consumed.status === 'consumed' ? 410 : 400, { error: `extension_grant_${consumed.status}` });
          return;
        }
        const session = await authStore.createSession(consumed.userId, 'extension', 30 * 24 * 60 * 60 * 1000);
        sendJson(response, 200, { status: 'authorized', token: session.token, expiresAt: session.expiresAt });
      } catch (error) {
        console.error('Extension auth exchange failed', error instanceof Error ? error.message : 'unknown error');
        sendJson(response, 500, { error: 'extension_auth_failed' });
      }
      return;
    }

    if (request.method === 'GET' && url.pathname === '/auth/me') {
      const identity = await resolveRequestIdentity(request, authStore);
      if (!identity) {
        sendJson(response, 401, { error: 'authentication_required' });
        return;
      }
      sendJson(response, 200, {
        userId: identity.userId,
        provider: identity.provider,
        ...(identity.email ? { email: identity.email } : {}),
        ...(identity.displayName ? { displayName: identity.displayName } : {})
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/auth/logout') {
      const identity = await resolveRequestIdentity(request, authStore);
      if (identity?.session && authStore) await authStore.revokeSession(identity.session.sessionId);
      clearSessionCookie(response);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (!store) {
      sendJson(response, 503, { error: 'database_not_configured' });
      return;
    }

    const identity = await resolveRequestIdentity(request, authStore);
    if (!identity) {
      sendJson(response, 401, { error: 'authentication_required' });
      return;
    }
    const userId = identity.userId;

    try {
      if (request.method === 'GET' && url.pathname === '/api/opportunities') {
        const records = await store.listOpportunities(userId);
        sendJson(response, 200, { opportunities: records });
        return;
      }

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
  const authStore = pool ? new PgAuthStore(pool) : undefined;
  const server = createServer(createRequestHandler(store, authStore));
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
