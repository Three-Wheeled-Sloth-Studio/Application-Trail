# Current Handoff

Date: 2026-08-29

## Current state

Application Trail has progressed from architecture bootstrap through WP0, WP1, and the first WP2 browser capture slice on `main`.

Current implementation commit:

- `b8640d5f2a3a5cd49451c78db93ffd0713b289c4` - `feat: capture browser listings into postgres`

Preceding accepted checkpoints:

- `0dd20762cd484fd6d45f5c57360017ff5f8d166b` - WP0 executable monorepo scaffold
- `1a9a7a18ccf889d03067850ba9fe0c804bfc36b1` - WP1 PostgreSQL persistence foundation

## Validation

WP0 GitHub Actions run #1 (`33265633859`) passed.

WP1 GitHub Actions run #2 (`33265952117`) passed against PostgreSQL 17, including the integration test for:

- source URL and source-text round trip
- user ownership isolation
- applied capture creating an application event
- Applied -> Passed creating a status-change event

WP2 GitHub Actions run #3 (`33266190178`) completed its validation job with all steps green, including typecheck, build/tests, and the PostgreSQL integration test.

Local WP2 validation also passed:

- `npm run typecheck`
- `npm test`

The local Postgres integration test skips when `DATABASE_URL` is unavailable; CI executes it against a real Postgres service.

## Implemented system

### Monorepo

- `apps/extension`
- `apps/web`
- `apps/api`
- `packages/domain`

### PostgreSQL persistence

The first migration creates ownership-aware tables for:

- user/account
- company
- opportunity
- listing observation
- listing snapshot
- resume artifact metadata
- application
- application event

### API

Current development routes:

- `GET /health`
- `POST /api/opportunities/capture`
- `GET /api/opportunities/:id`
- `POST /api/opportunities/:id/application-status`

The temporary development identity path is disabled unless `APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=true`. It uses an `x-application-trail-user-id` header only to enable the local vertical slice. It is not the production auth design.

### Extension

The Manifest V3 extension now:

- reads the active Chrome/Edge page
- extracts generic source URL, page title, and visible source text
- looks for schema.org `JobPosting` JSON-LD
- previews detected title, company, and location when available
- saves as Saved or Applied
- calls the Application Trail API
- can hand off to the full local web record after capture

No source-specific ATS scraper has been added.

### Web

The current web shell can load one captured Opportunity by ID and display:

- title
- normalized company
- status
- captured location when available
- link back to the original posting
- preserved source text

## Product and architecture constraints still in force

- Opportunity remains distinct from Listing Observation/Snapshot.
- Original source URL and source text are preserved separately from derived fields.
- Browser storage is not canonical.
- Suspected duplicates/reposts must never silently merge.
- Google OAuth remains the intended identity provider.
- AI/Ollama is deferred until the extraction/enrichment slice needs it.
- Do not add the local bridge before a real need appears.
- Keep all secrets and real user data out of Git.

## Manual browser smoke gate

Before WP3, run the current slice against several real job listings in Chrome or Edge.

Suggested local setup:

1. `npm install`
2. Copy `.env.example` to `.env.local`.
3. Set `APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=true` in `.env.local`.
4. Start local PostgreSQL with `docker compose up -d` or point `DATABASE_URL` to another development Postgres instance.
5. `npm run build`
6. `npm run migrate`
7. In one terminal: `npm run start:api`
8. In another terminal: `npm run start:web`
9. In Chrome/Edge extension developer mode, load unpacked `apps/extension/dist`.
10. Open a real job listing and activate Application Trail.
11. Confirm detected title/company/location are reasonable.
12. Save the role or mark it Applied.
13. Open the full record and verify the original URL and source text are present.

Useful smoke targets should include at least one page with schema.org JobPosting metadata and one page where generic fallback is required.

## Next work

After the browser smoke passes, proceed to WP3 Google authentication and the first cross-machine dogfood gate.

If the smoke exposes page-capture failures, fix only the generic extraction boundary first. Add a site-specific adapter only when repeated evidence shows one is justified.
