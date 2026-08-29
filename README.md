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

## Local WP2 smoke setup

Requires Node.js 22+ and PostgreSQL. Docker Compose can provide the development database.

```text
npm install
```

Copy `.env.example` to `.env.local`, then set:

```text
APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=true
```

Start the bundled development Postgres instance:

```text
docker compose up -d
```

Build and migrate:

```text
npm run build
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

## Validation

CI typechecks and builds all workspaces and runs the PostgreSQL integration test against PostgreSQL 17.

See `refs/handoffs/currentHandoff.md` for the current accepted checkpoint and `refs/README.md` for the documentation map.

## License

Application Trail is licensed under the GNU Affero General Public License v3.0. See `LICENSE`.
