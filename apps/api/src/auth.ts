import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';

export type SessionType = 'web' | 'extension';

export interface GoogleProfile {
  sub: string;
  email?: string;
  name?: string;
}

export interface AuthenticatedIdentity {
  userId: string;
  provider: 'google';
  providerSubject: string;
  email?: string;
  displayName?: string;
}

export interface SessionResolution extends AuthenticatedIdentity {
  sessionId: string;
  sessionType: SessionType;
  expiresAt: string;
}

export interface CreatedSession {
  sessionId: string;
  token: string;
  expiresAt: string;
}

export type ExtensionGrantConsumption =
  | { status: 'pending' }
  | { status: 'authorized'; userId: string }
  | { status: 'invalid' | 'expired' | 'consumed' };

function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export class PgAuthStore {
  constructor(private readonly pool: Pool) {}

  async upsertGoogleIdentity(profile: GoogleProfile): Promise<AuthenticatedIdentity> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        `SELECT user_id FROM user_identity WHERE provider = 'google' AND provider_subject = $1 FOR UPDATE`,
        [profile.sub]
      );
      let userId = existing.rows[0]?.user_id as string | undefined;
      if (!userId) {
        userId = randomUUID();
        await client.query('INSERT INTO app_user (id) VALUES ($1)', [userId]);
        await client.query(
          `INSERT INTO user_identity
            (user_id, provider, provider_subject, email_snapshot, display_name, created_at, last_authenticated_at)
           VALUES ($1, 'google', $2, $3, $4, now(), now())`,
          [userId, profile.sub, profile.email ?? null, profile.name ?? null]
        );
      } else {
        await client.query(
          `UPDATE user_identity
           SET email_snapshot = $1, display_name = $2, last_authenticated_at = now()
           WHERE provider = 'google' AND provider_subject = $3`,
          [profile.email ?? null, profile.name ?? null, profile.sub]
        );
      }
      await client.query('COMMIT');
      return {
        userId,
        provider: 'google',
        providerSubject: profile.sub,
        ...(profile.email ? { email: profile.email } : {}),
        ...(profile.name ? { displayName: profile.name } : {})
      };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async createSession(userId: string, sessionType: SessionType, ttlMs: number): Promise<CreatedSession> {
    const token = randomBytes(32).toString('base64url');
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.pool.query(
      `INSERT INTO user_session
        (id, user_id, session_type, token_hash, created_at, expires_at, last_used_at)
       VALUES ($1, $2, $3, $4, now(), $5, now())`,
      [sessionId, userId, sessionType, hashSecret(token), expiresAt]
    );
    return { sessionId, token, expiresAt: expiresAt.toISOString() };
  }

  async resolveSessionToken(token: string): Promise<SessionResolution | null> {
    const result = await this.pool.query(
      `UPDATE user_session s
       SET last_used_at = now()
       FROM user_identity ui
       WHERE s.token_hash = $1
         AND s.user_id = ui.user_id
         AND ui.provider = 'google'
         AND s.revoked_at IS NULL
         AND s.expires_at > now()
       RETURNING s.id, s.user_id, s.session_type, s.expires_at,
                 ui.provider_subject, ui.email_snapshot, ui.display_name`,
      [hashSecret(token)]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      sessionId: row.id,
      userId: row.user_id,
      sessionType: row.session_type,
      expiresAt: new Date(row.expires_at).toISOString(),
      provider: 'google',
      providerSubject: row.provider_subject,
      ...(row.email_snapshot ? { email: row.email_snapshot } : {}),
      ...(row.display_name ? { displayName: row.display_name } : {})
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.pool.query('UPDATE user_session SET revoked_at = now() WHERE id = $1', [sessionId]);
  }

  async createExtensionGrant(ttlMs = 10 * 60 * 1000): Promise<{ grantId: string; grantSecret: string; expiresAt: string }> {
    const grantId = randomUUID();
    const grantSecret = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.pool.query(
      `INSERT INTO auth_grant (id, grant_secret_hash, created_at, expires_at)
       VALUES ($1, $2, now(), $3)`,
      [grantId, hashSecret(grantSecret), expiresAt]
    );
    return { grantId, grantSecret, expiresAt: expiresAt.toISOString() };
  }

  async authorizeExtensionGrant(grantId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE auth_grant
       SET user_id = $1, authorized_at = now()
       WHERE id = $2 AND expires_at > now() AND consumed_at IS NULL
       RETURNING id`,
      [userId, grantId]
    );
    return Boolean(result.rowCount);
  }

  async consumeExtensionGrant(grantId: string, grantSecret: string): Promise<ExtensionGrantConsumption> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT * FROM auth_grant WHERE id = $1 FOR UPDATE', [grantId]);
      const row = result.rows[0];
      if (!row) {
        await client.query('ROLLBACK');
        return { status: 'invalid' };
      }
      if (row.grant_secret_hash !== hashSecret(grantSecret)) {
        await client.query('ROLLBACK');
        return { status: 'invalid' };
      }
      if (row.consumed_at) {
        await client.query('ROLLBACK');
        return { status: 'consumed' };
      }
      if (new Date(row.expires_at).getTime() <= Date.now()) {
        await client.query('ROLLBACK');
        return { status: 'expired' };
      }
      if (!row.user_id || !row.authorized_at) {
        await client.query('ROLLBACK');
        return { status: 'pending' };
      }
      await client.query('UPDATE auth_grant SET consumed_at = now() WHERE id = $1', [grantId]);
      await client.query('COMMIT');
      return { status: 'authorized', userId: row.user_id };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

export interface OAuthStatePayload {
  nonce: string;
  purpose: 'web' | 'extension';
  grantId?: string;
  returnPath?: string;
  expiresAt: number;
}

function authSecret(): string {
  const value = process.env.APPLICATION_TRAIL_AUTH_SECRET;
  if (!value) throw new Error('APPLICATION_TRAIL_AUTH_SECRET is not configured.');
  return value;
}

export function createOAuthState(input: Omit<OAuthStatePayload, 'nonce' | 'expiresAt'>): { state: string; nonce: string } {
  const payload: OAuthStatePayload = {
    ...input,
    nonce: randomBytes(24).toString('base64url'),
    expiresAt: Date.now() + 10 * 60 * 1000
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', authSecret()).update(encoded).digest('base64url');
  return { state: `${encoded}.${signature}`, nonce: payload.nonce };
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  const [encoded, suppliedSignature] = state.split('.');
  if (!encoded || !suppliedSignature) return null;
  const expectedSignature = createHmac('sha256', authSecret()).update(encoded).digest('base64url');
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as OAuthStatePayload;
    if (!payload.nonce || !payload.purpose || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function publicUrl(): URL {
  return new URL(process.env.APPLICATION_TRAIL_PUBLIC_URL ?? 'http://127.0.0.1:4320');
}

function googleConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth client configuration is not complete.');
  return {
    clientId,
    clientSecret,
    redirectUri: new URL('/auth/google/callback', publicUrl()).toString()
  };
}

export function buildGoogleAuthorizationUrl(state: string): string {
  const config = googleConfig();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('include_granted_scopes', 'true');
  return url.toString();
}

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const config = googleConfig();
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code'
    })
  });
  if (!tokenResponse.ok) throw new Error(`Google token exchange failed with HTTP ${tokenResponse.status}.`);
  const tokens = await tokenResponse.json() as { access_token?: unknown };
  if (typeof tokens.access_token !== 'string') throw new Error('Google returned no access token.');

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${tokens.access_token}` }
  });
  if (!profileResponse.ok) throw new Error(`Google userinfo failed with HTTP ${profileResponse.status}.`);
  const profile = await profileResponse.json() as Record<string, unknown>;
  if (typeof profile.sub !== 'string' || !profile.sub) throw new Error('Google returned no stable subject identifier.');
  return {
    sub: profile.sub,
    ...(typeof profile.email === 'string' ? { email: profile.email } : {}),
    ...(typeof profile.name === 'string' ? { name: profile.name } : {})
  };
}
