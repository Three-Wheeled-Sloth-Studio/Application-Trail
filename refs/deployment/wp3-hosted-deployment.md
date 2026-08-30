# WP3 Hosted Deployment Contract

Date: 2026-08-30

## Accepted public topology

Canonical origin:

`https://trail.threewheeledsloth.com`

Routes:

- `/` and static assets -> `apps/web/dist`
- `/api/*` -> Application Trail API on loopback port `4310`
- `/auth/*` -> Application Trail API on loopback port `4310`
- `/health` -> Application Trail API on loopback port `4310`

PostgreSQL remains private and must not be exposed publicly.

The production web and API deliberately share one public origin. Do not create a separate public API hostname for WP3.

## Required production environment

Keep these values outside Git and outside browser-extension assets:

```text
APPLICATION_TRAIL_API_PORT=4310
APPLICATION_TRAIL_PUBLIC_URL=https://trail.threewheeledsloth.com
APPLICATION_TRAIL_EXTENSION_ORIGIN=https://trail.threewheeledsloth.com
APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=false
DATABASE_URL=<private Application Trail PostgreSQL connection string>
GOOGLE_OAUTH_CLIENT_ID=<Google Web application client id>
GOOGLE_OAUTH_CLIENT_SECRET=<Google Web application client secret>
APPLICATION_TRAIL_AUTH_SECRET=<long random secret used to sign OAuth state>
```

`APPLICATION_TRAIL_AUTH_SECRET` must be generated independently for the hosted environment and must not be reused from a checked-in example.

## Google OAuth configuration

Application Trail uses the Google OAuth 2.0 server-side authorization-code flow for identity only.

Required scopes:

- `openid`
- `email`
- `profile`

Exact production redirect URI:

`https://trail.threewheeledsloth.com/auth/google/callback`

Durable external identity is Google's stable `sub`. Email is retained only as current account/display metadata.

The application does not retain Google access or refresh tokens after retrieving the identity profile. Application Trail issues its own opaque sessions and stores only hashes of those session tokens in PostgreSQL.

## Process boundary

The API already binds to `127.0.0.1:4310`. Keep it loopback-only.

Use the process manager already established on the studio VPS. Do not introduce a second process-management convention solely for Application Trail. The process manager must:

- start `apps/api/dist/server.js` with the production environment
- restart after process failure
- restore the service after VPS reboot
- keep secrets outside the public repository

The static web build does not require a persistent Node web process in production if the existing reverse proxy can serve `apps/web/dist` directly.

## Deployment sequence

1. Confirm `trail.threewheeledsloth.com` resolves to the existing VPS.
2. Inspect the VPS's current reverse proxy, TLS, process manager, application directories, and PostgreSQL connection conventions.
3. Pull or deploy the accepted Application Trail commit.
4. Run `npm install`.
5. Provide the production environment outside Git.
6. Run `npm run build`.
7. Run `npm run migrate` with the production environment so `002_auth.sql` is applied.
8. Start/restart the Application Trail API through the existing process manager.
9. Configure the existing reverse proxy so `/api/*`, `/auth/*`, and `/health` reach `127.0.0.1:4310`, while `/` serves `apps/web/dist`.
10. Enable a valid TLS certificate and redirect HTTP to HTTPS.
11. Add the exact Google OAuth redirect URI above to the studio Google Web application OAuth client.
12. Restart the API after Google client id/secret are available.
13. Validate the gate below.

## WP3 hosted validation gate

Public web:

- `https://trail.threewheeledsloth.com/` loads the Application Trail web shell.
- `https://trail.threewheeledsloth.com/health` returns `status: ok`.
- HTTP redirects to HTTPS.

Authentication:

- Sign in with Google succeeds.
- `/auth/me` resolves the authenticated Application Trail user.
- Sign out revokes the server session.
- `APPLICATION_TRAIL_ENABLE_DEV_IDENTITY` is false.

Persistence and ownership:

- Existing WP2 data remains intact after migration.
- The same Google `sub` resolves to the same internal Application Trail UUID on subsequent logins.
- Another Google account cannot read the first user's records.

Cross-machine dogfood:

- Machine A signs in and captures a listing through the extension.
- Machine B signs in with the same Google account.
- Machine B sees the listing in the opportunity list and can open the full record.

Extension:

- The production build contains no Google client secret, database credential, or Application Trail signing secret.
- Extension sign-in opens the hosted Application Trail web flow.
- After the web flow completes, the extension exchanges its one-time grant for an opaque Application Trail extension session.

## Local developer workflow

Normal local startup is now one command:

```text
npm run dev
```

When `.env.local` defines `APPLICATION_TRAIL_SSH_HOST`, the dev supervisor:

1. builds all workspaces
2. opens the SSH PostgreSQL tunnel
3. waits for PostgreSQL
4. runs migrations
5. starts the API
6. starts the local web server/proxy
7. shuts down the complete stack together on Ctrl+C

The lower-level `start:api`, `start:web`, and `migrate` commands remain available for troubleshooting.
