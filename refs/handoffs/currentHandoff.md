# Current Handoff

Date: 2026-08-29

## Current state

Application Trail has progressed from architecture bootstrap through WP0, WP1, and WP2 on `main`.

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

WP2 GitHub Actions run #3 (`33266190178`) passed, including typecheck, build/tests, and the PostgreSQL integration test.

Documentation head run #4 (`33266265265`) also passed.

Local WP2 validation passed:

- `npm run typecheck`
- `npm test`

Manual WP2 browser smoke passed on 2026-08-29 against a real job listing:

- Chromium extension loaded successfully
- a real listing was captured
- the user applied to the role
- the listing/application was successfully marked `applied`
- persistence and status handling worked through the live Application Trail PostgreSQL environment

This clears the manual browser gate for WP3.

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

### Shared PostgreSQL environment

Application Trail has been provisioned on the existing studio PostgreSQL server already used by World Forge/Parchment Worlds, while retaining an independent database and application user.

Provisioned logical boundary:

- database: `application_trail`
- application user: `application_trail`
- PostgreSQL listener is not publicly exposed
- local Windows development connects through an SSH tunnel to loopback port `55432`
- future VPS/container deployment can connect through the existing internal PostgreSQL network service

The current migration `001_core.sql` has been applied successfully to the persistent Application Trail database. Synthetic rollback-only CRUD succeeded, and the Application Trail user was verified not to have access to the World Forge/Parchment Worlds application tables.

The database password remains outside Git. Local development configuration is already present in ignored `.env.local` and the VPS secret is stored outside the repository.

Docker is not required for the normal Application Trail dogfood workflow. It remains an optional disposable local database path and an isolated CI mechanism.

Root npm commands `migrate`, `start:api`, and `start:web` explicitly load `.env.local` through Node's `--env-file` support.

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

## Next work

Proceed to WP3 Google authentication and the first cross-machine dogfood gate.

Preserve the current `user_id` ownership boundary while replacing the generated development UUID in normal operation with Google-authenticated identity.

Use Google's immutable account subject (`sub`) as the external identity key, not email. Prefer a server-mediated OAuth/session boundary so Google client secrets remain server-side and the extension receives only Application Trail session credentials. The temporary dev identity may remain behind its explicit environment flag for local troubleshooting.

Do not start AI enrichment, duplicate/repost work, resume analysis, or the local bridge during WP3.