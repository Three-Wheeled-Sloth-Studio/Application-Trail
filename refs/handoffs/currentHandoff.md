# Current Handoff

Date: 2026-08-30

## Current state

Application Trail has progressed from architecture bootstrap through accepted WP0, WP1, and WP2 on `main`.

Accepted implementation commits:

- `0dd20762cd484fd6d45f5c57360017ff5f8d166b` - WP0 executable monorepo scaffold
- `1a9a7a18ccf889d03067850ba9fe0c804bfc36b1` - WP1 PostgreSQL persistence foundation
- `b8640d5f2a3a5cd49451c78db93ffd0713b289c4` - WP2 real browser capture slice

The project is now paused at a **WP3 design-review gate**. Do not begin Google-auth implementation until the deployment/domain/auth topology is reviewed and explicitly approved.

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

Manual WP2 browser smoke passed against a real job listing:

- Chromium extension loaded successfully
- a real listing was captured
- the user applied to the role
- the resulting record was successfully marked `applied`
- persistence and status handling worked through the live Application Trail PostgreSQL environment

WP2 is accepted. Do not reopen it without new evidence.

## Implemented system

### Monorepo

- `apps/extension`
- `apps/web`
- `apps/api`
- `packages/domain`

### PostgreSQL persistence

Application Trail has its own database and application user on the existing studio PostgreSQL server used by World Forge/Parchment Worlds.

Current logical boundary:

- database: `application_trail`
- application user: `application_trail`
- PostgreSQL is not publicly exposed
- local Windows development uses the existing SSH-tunnel pattern to local port `55432`
- Docker is optional for disposable local/CI use and is not required for normal dogfooding

Migration `001_core.sql` has been applied successfully to the persistent Application Trail database.

The Application Trail user can CRUD its own database and has been verified not to have access to World Forge/Parchment Worlds application tables.

Secrets remain outside Git. Local ignored `.env.local` contains the working development database configuration.

### API

Current development routes:

- `GET /health`
- `POST /api/opportunities/capture`
- `GET /api/opportunities/:id`
- `POST /api/opportunities/:id/application-status`

The current temporary identity is explicitly gated by `APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=true` and uses `x-application-trail-user-id`. This exists only to support the accepted local WP2 slice and is not the intended production identity design.

### Extension

The Manifest V3 Chromium extension can:

- read the active page
- extract generic URL/title/source text
- use schema.org `JobPosting` JSON-LD when available
- preview detected title/company/location
- save as Saved or Applied
- call the Application Trail API
- open the persisted record in the local web application

No source-specific ATS scraper has been added.

### Web

The current web shell can load one captured Opportunity by ID and display:

- title
- normalized company
- status
- captured location when available
- original posting link
- preserved source text

## Product and architecture constraints still in force

- Opportunity remains distinct from Listing Observation/Snapshot.
- Original source URL and source text are preserved separately from derived fields.
- Browser storage is not canonical.
- Suspected duplicates/reposts must never silently merge.
- AI/Ollama is deferred until the extraction/enrichment slice needs it.
- Do not add the local AI bridge before a real need appears.
- Keep all secrets and real user data out of Git.

## WP3 review status

Google OAuth remains the intended identity provider, but the specific WP3 implementation proposal has **not yet been approved**.

A preliminary proposal considered:

- keeping internal Application Trail UUIDs as canonical ownership keys
- mapping Google identity through Google's stable `sub`, not email
- using a server-mediated OAuth/session boundary
- letting web and extension resolve to the same Application Trail account
- preserving the explicit development identity only for local troubleshooting

Treat those as design candidates, not accepted implementation instructions.

Before implementation, review these unresolved deployment/auth questions:

1. **Production web domain is not yet selected or configured.**
2. **Production API URL/host is not yet selected.**
3. Decide whether web and API will share one origin/domain or use separate hostnames/subdomains.
4. Decide how the Chromium extension will enter and complete the Google sign-in flow.
5. Confirm whether the existing studio Google OAuth client/project can support the chosen redirect URIs/origins or whether any additional client configuration is actually necessary.
6. Decide the Application Trail session transport for web and extension after OAuth.
7. Determine the minimum VPS deployment needed for the first cross-machine dogfood gate.

Do not make external Google Cloud changes or lock in redirect URIs until the domain/deployment topology is settled.

## Next work

The next conversation should begin with a **WP3 design review**, not implementation.

Review the hosted topology, domain strategy, Google OAuth flow, extension-to-web handoff, and session model. Resolve only what is needed for the first cross-machine dogfood gate.

After that review is explicitly accepted, update `refs/handoffs/next-dev-prompt.md` with the implementation instructions and then hand off to the coding agent.

Do not start AI enrichment, duplicate/repost work, resume analysis, contacts, email ingestion, or advanced analytics during this review.
