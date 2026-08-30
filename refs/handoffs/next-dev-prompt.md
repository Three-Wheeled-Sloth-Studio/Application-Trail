# Next Development Prompt

Continue in:

`https://github.com/Three-Wheeled-Sloth-Studio/Application-Trail`

Work from the current `main` branch.

## Important: design review only

Do **not** begin WP3 implementation yet.

The previous WP3 implementation prompt was intentionally paused for review because the hosted deployment/domain topology has not been selected. In particular, Application Trail does not yet have a production web domain or production API URL.

The next conversation should perform a focused WP3 design review and return a recommended implementation plan for approval.

## Read these first

1. `AGENTS.md`
2. `refs/project.yaml`
3. `refs/product/product-requirements.md`
4. `refs/architecture/system-architecture.md`
5. `refs/architecture/domain-model.md`
6. `refs/architecture/security-and-secrets.md`
7. `refs/planning/mvp-roadmap.md`
8. `refs/handoffs/currentHandoff.md`

## Accepted implementation baseline

- WP0: `0dd20762cd484fd6d45f5c57360017ff5f8d166b`
- WP1: `1a9a7a18ccf889d03067850ba9fe0c804bfc36b1`
- WP2: `b8640d5f2a3a5cd49451c78db93ffd0713b289c4`

WP0, WP1, and WP2 automated validation are green.

WP2 also passed a real manual browser smoke. A live job listing was captured through the Chromium extension and successfully persisted/marked `applied` in the persistent Application Trail PostgreSQL database.

Treat WP2 as accepted unless new evidence exposes a defect.

## Current infrastructure

Application Trail already has:

- its own `application_trail` PostgreSQL database
- its own `application_trail` database user
- database hosting on the existing studio PostgreSQL server used by World Forge/Parchment Worlds
- local Windows development through the existing SSH-tunnel pattern
- working local API at `http://127.0.0.1:4310`
- working local web app at `http://127.0.0.1:4320`
- a working Chromium Manifest V3 extension

Docker is optional for disposable local/CI PostgreSQL and is not required for normal dogfooding.

## Current identity state

Normal WP2 development currently uses the explicitly gated temporary identity:

`APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=true`

This is not a production auth design.

Google OAuth remains the intended identity provider, but no WP3 auth architecture should be treated as approved yet.

## Design questions to resolve

Review and recommend the smallest coherent deployment/auth topology needed to reach the cross-machine dogfood gate.

At minimum address:

1. **Domain strategy**
   - Application Trail currently has no production domain configured.
   - Recommend whether to use a new dedicated domain, a subdomain under an existing studio domain, or another simple first-dogfood arrangement.
   - Do not register or modify DNS during the review unless explicitly asked.

2. **Web/API hosting topology**
   - Decide whether the web app and API should share an origin or use separate hostnames/subdomains.
   - Account for the existing Hostinger VPS and PostgreSQL environment.
   - Prefer the smallest deployment that supports secure cross-machine use.

3. **Google OAuth topology**
   - The studio already has Google OAuth configuration used by other applications.
   - Determine how much can be reused.
   - Do not assume redirect URIs or OAuth client types before the domain/hosting topology is chosen.
   - Preserve the likely principle that Google `sub`, not email, should be the durable external identity key.

4. **Extension sign-in path**
   - Recommend how the Chromium extension should authenticate without embedding privileged Google credentials.
   - Compare a server-mediated browser/web sign-in handoff with any Chrome-specific OAuth mechanism only as needed.

5. **Application Trail session model**
   - Recommend how the web app and extension should hold/use Application Trail session credentials after Google authentication.
   - Keep the design MVP-sized and testable.

6. **Cross-machine gate**
   - Define the minimum deployment needed so machine A and machine B using the same Google account resolve to the same Application Trail user/data.
   - Identify whether a minimal opportunity list is needed for practical second-machine retrieval.

7. **Security boundary**
   - Keep Google client secrets, DB credentials, signing secrets, and user data out of extension assets and Git.
   - Preserve the existing internal Application Trail `user_id` ownership boundary.

## Expected output of the review

Return:

1. recommended production/dogfood topology
2. domain/hostname recommendation
3. Google OAuth flow recommendation
4. extension authentication flow
5. Application Trail session model
6. schema changes required for external identity/session support
7. required deployment/configuration changes
8. exact external/manual actions required, if any
9. risks/tradeoffs and any decisions that should remain deferred
10. proposed WP3 execution sequence and validation gate

Do not implement the recommendation until it is explicitly approved.

## Scope discipline

Do not begin:

- AI enrichment
- Ollama/local bridge
- duplicate/repost implementation
- resume analysis
- contacts
- email ingestion
- listing monitoring
- billing/tenancy
- advanced analytics

The sole objective is to make WP3 implementation safe and unambiguous before handing it to the coding agent.
