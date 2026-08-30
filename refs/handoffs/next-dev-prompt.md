# Next Development Prompt

Continue implementation in:

`https://github.com/Three-Wheeled-Sloth-Studio/Application-Trail`

Work from the current `main` branch.

Read these first:

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
- WP2 capture slice: `b8640d5f2a3a5cd49451c78db93ffd0713b289c4`

WP0, WP1, and WP2 automated validation are green. WP1/WP2 CI use PostgreSQL 17 and exercise the real persistence integration test.

The manual WP2 browser smoke also passed on 2026-08-29 against a real listing. The extension captured the listing successfully and the resulting application was successfully marked `applied` against the persistent Application Trail database.

## Immediate objective

Proceed to WP3: Google authentication and the first cross-machine dogfood gate.

Replace the temporary development identity with Google-authenticated user identity while preserving the existing internal `user_id` ownership boundary.

Target behavior:

- user signs in with Google
- web and extension resolve to the same Application Trail account
- API validates Google identity server-side
- use Google's immutable `sub` claim as the external identity key, not email
- extension no longer sends a generated development UUID in normal operation
- captured data remains authorization-scoped by internal Application Trail user ID
- data captured on machine A can be retrieved from machine B against the same hosted backend
- no privileged Google, database, or service credentials enter extension assets or Git

## Preferred auth boundary

Favor a server-mediated Google OAuth/session flow rather than embedding privileged credentials in the extension.

A suitable direction is:

1. web or extension initiates sign-in through the Application Trail API
2. API performs the Google OAuth authorization-code flow using server-side configuration
3. API resolves or creates an Application Trail user from Google's stable subject (`sub`)
4. API issues an Application Trail session credential
5. web uses a secure HTTP-only session cookie where practical
6. extension uses an Application Trail bearer/session credential, not a Google client secret

For the extension, `chrome.identity.launchWebAuthFlow()` is acceptable for completing a browser-mediated auth flow that returns through the Application Trail backend and then to the extension callback URL. Do not require a separate Chrome-specific Google OAuth client unless implementation evidence shows that is necessary.

The existing studio Google OAuth project/configuration should be reused where compatible. Do not commit the client secret or other privileged credentials. Public client identifiers may be configured where appropriate.

The temporary development identity may remain behind `APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=true` for local troubleshooting, but it must not become a production fallback.

## Existing dogfood infrastructure

Application Trail uses the existing studio PostgreSQL server while retaining its own database and user:

- database: `application_trail`
- application user: `application_trail`
- local Windows development connects through the existing SSH-tunnel pattern
- Docker is not required for normal dogfood use

Do not change this persistence arrangement as part of WP3 unless auth implementation exposes a concrete need.

## Scope discipline

Do not start AI enrichment, duplicate/repost semantics, resume analysis, or the local AI bridge during WP3 unless Google auth implementation genuinely requires a shared seam.

The immediate product goal remains cross-machine dogfoodable capture, not feature breadth.

## Validation and handoff

Run all existing validation plus auth-focused tests. Preserve the PostgreSQL integration gate. Add tests for identity mapping, session validation, unauthorized access, and cross-user isolation where practical.

Update `currentHandoff.md` and this file at the next meaningful checkpoint.