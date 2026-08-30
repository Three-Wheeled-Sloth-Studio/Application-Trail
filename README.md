# Application Trail

Application Trail is a job application tracking and job-market intelligence system from Three-Wheeled Sloth Studio.

The immediate goal is simple: capture a job or application from the browser in seconds, preserve the source posting, and keep the record synchronized across computers.

The longer-term goal is to turn that accumulated trail into useful market intelligence: which skills and phrases employers request, which roles recur or are reposted, which resume variants perform better, and where existing resume language has drifted away from current industry wording.

## Product principles

- Capture first. Perfect cleanup can happen later.
- Preserve source evidence. URLs and original job descriptions are historical records.
- Separate source facts from derived interpretations.
- Preserve both original wording and normalized concepts.
- Improve durable resume positioning rather than tailoring every application.
- Treat duplicate and repost detection as a core capability.
- Keep the browser extension thin and hand off complex work to the full application.
- Keep secrets and user data outside the public repository.
- Prefer local AI through Ollama, while supporting user-provided hosted provider keys.
- Dogfood first without creating architectural traps that prevent later productization.

## Current implementation

The first local capture vertical slice is implemented:

```text
Chromium extension -----> Application API -----> PostgreSQL
       |                       ^
       |                       |
       +---- full app tab -----+

Web application --------> Application API
```

The extension can inspect a job page, preview generic schema.org JobPosting metadata when available, preserve visible source text, save as Saved or Applied, and open the stored record in the web application.

Google OAuth is the next identity step. The current local vertical slice uses an explicitly gated development identity only when `APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=true`.

## PostgreSQL environment

Application Trail uses its own PostgreSQL database and application user on the existing studio PostgreSQL server. It does not share World Forge/Parchment Worlds tables or application permissions.

For local Windows dogfooding, the standard path is an SSH tunnel to that existing PostgreSQL service. The ignored `.env.local` holds the local `DATABASE_URL` using loopback port `55432`.

Docker Compose remains available only as an optional disposable local database and for CI-style isolation. Docker is not required to run Application Trail locally when the shared development database is reachable.

## Local WP2 smoke setup

Requires Node.js 22+ and access to PostgreSQL.

Install dependencies and build:

```text
npm install
npm run build
```

Ensure `.env.local` contains the configured `DATABASE_URL` and:

```text
APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=true
```

When using the existing studio PostgreSQL server, open the configured SSH tunnel in a separate terminal before migration or API startup. The local database connection uses `127.0.0.1:55432`.

Run migrations:

```text
npm run migrate
```

Start the API and web application in separate terminals:

```text
npm run start:api
```

```text
npm run start:web
```

In Chrome or Edge:

1. Open the extensions management page.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select `apps/extension/dist`.
5. Open a job listing and activate Application Trail.
6. Review the detected title/company/location.
7. Choose Save job or I applied.
8. Choose Open full record to verify persistence and the return-to-source link.

The current local development URLs are API port `4310` and web port `4320`.

## Optional disposable PostgreSQL

Developers who prefer an isolated local database may use Docker Compose:

```text
docker compose up -d
```

This is optional for local development. CI uses an isolated PostgreSQL service so integration tests can create, migrate, and destroy data without touching persistent development data.

## Validation

CI typechecks and builds all workspaces and runs the PostgreSQL integration test against PostgreSQL 17.

See `refs/handoffs/currentHandoff.md` for the current accepted checkpoint and `refs/README.md` for the documentation map.

## License

Application Trail is licensed under the GNU Affero General Public License v3.0. See `LICENSE`.
