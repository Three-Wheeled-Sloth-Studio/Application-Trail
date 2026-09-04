---
type: Handoff
title: Application Trail Current Handoff
description: Current accepted implementation state, WP3 hosted-deployment gate, and Agent Academy alignment context.
status: stable
tags: [application-trail, handoff, wp3]
---
# Current Handoff

Date: 2026-09-04

## Current state

Application Trail has accepted WP0, WP1, and WP2, and the repository side of WP3 is implemented on `main`.

Accepted implementation commits:

- `0dd20762cd484fd6d45f5c57360017ff5f8d166b` - WP0 executable monorepo scaffold
- `1a9a7a18ccf889d03067850ba9fe0c804bfc36b1` - WP1 PostgreSQL persistence foundation
- `b8640d5f2a3a5cd49451c78db93ffd0713b289c4` - WP2 real browser capture slice
- `ed7e7c33581da5ee751d087646221c199a82e3bc` - WP3 auth, hosted-web, cross-machine-list, and local-dev-orchestration foundation

CI run #13 (`33308484820`) passed typecheck and the complete test suite against PostgreSQL 17. Documentation CI run #14 also passed.

The remaining WP3 work is hosted deployment/configuration and the live cross-machine smoke. Do not begin WP4 until that gate is accepted.

## Agent Academy alignment

As of 2026-09-04, Application Trail is aligned additively with Agent Academy commit `16691651776151a7eb1ebf13d99a92658e0684e6` and its OKF v0.2 profile.

Application Trail is treated as a mature custom refs repository rather than replacing its useful taxonomy with the blank framework template.

Alignment commits:

- `3e837f193c03b78451cc47a957e7cea04e90596f` - Agent Academy operating model, OKF discovery, refs validation, structured project memory, and tracked-path case guard
- `115dd51179f47fbb4c94a77d92d8c15e9175dae7` - portable repository-root correction for the Node-based refs tools

The repository now has:

- `refs/agents.yaml` as the authoritative project-memory operating rules
- `refs/okfProfile.yaml` pinning OKF v0.2 and the Agent Academy baseline
- OKF frontmatter on non-reserved Markdown concepts under `refs/`
- committed generated `index.md` discovery surfaces
- `refs/implementation/fileMap.yaml`
- structured decisions, open questions, and todos under `refs/planning/`
- `refs/testing/validationCommands.yaml`
- Node-based equivalent OKF generation and refs validation in the existing Node 22 toolchain
- a Git-index case-collision guard wired into build/typecheck/CI

CI run #16 (`33882952789`) is the accepted Agent Academy alignment validation gate. It passed:

- tracked-path case-collision validation
- Agent Academy / OKF refs validation and generated-index freshness
- TypeScript typecheck
- complete build and test suite against PostgreSQL 17

The preceding run #15 intentionally exposed and failed on an incorrect repository-root assumption in the new refs tooling; `115dd51179f47fbb4c94a77d92d8c15e9175dae7` corrected it before acceptance.

Normal full validation is `npm run validate`. Do not hand-edit generated refs indexes.

## Accepted WP3 topology

Canonical origin:

`https://trail.threewheeledsloth.com`

The `trail.threewheeledsloth.com` host/domain entry has been created.

Public routing contract:

- `/` -> web application
- `/api/*` -> Application Trail API
- `/auth/*` -> Application Trail API
- `/health` -> Application Trail API

Web and API intentionally share one origin. PostgreSQL remains private.

## Implemented WP3 behavior

### Google identity and sessions

- server-mediated Google OAuth authorization-code flow
- identity scopes only: `openid email profile`
- Google `sub` is the durable external identity key
- Google email/name are snapshots for display, not ownership keys
- internal `app_user.id` UUID remains the canonical ownership key
- Application Trail issues opaque web and extension sessions
- only SHA-256 hashes of Application Trail session tokens are persisted
- web sessions use HttpOnly cookies
- extension sessions use bearer tokens stored in `chrome.storage.local`
- Google access tokens are used only to retrieve Google userinfo and are not persisted
- OAuth state is HMAC-signed and browser-bound with a short-lived HttpOnly nonce cookie

### Extension authentication

The extension uses a server-mediated pairing flow rather than a Chrome-extension-id-specific Google OAuth client flow:

1. extension creates a short-lived Application Trail auth grant
2. extension opens the hosted web authorization URL
3. user signs in through the normal Google web flow
4. server binds the grant to the Application Trail user
5. extension exchanges its high-entropy one-time grant secret for an opaque extension session

This works for unpacked dogfood builds and later packaged builds without making the extension id part of the account architecture.

### Cross-machine retrieval

`GET /api/opportunities` and a minimal web opportunity list exist so machine B can discover records captured on machine A without already knowing their UUIDs.

### Database

Migration `002_auth.sql` adds:

- `user_identity`
- `user_session`
- `auth_grant`

The existing migration runner automatically discovers and applies it after `001_core.sql`.

### Local development cleanup

`npm run dev` is the normal local startup path.

With SSH tunnel variables in ignored `.env.local`, it:

- builds
- starts the database tunnel
- waits for PostgreSQL
- runs migrations
- starts API and web
- shuts the complete stack down together

The local web server also proxies `/api`, `/auth`, and `/health` to the local API, preserving the same-origin topology used in production.

## Hosted deployment still required

Follow `refs/deployment/wp3-hosted-deployment.md` and the structured queue in `refs/planning/todos.yaml`.

The exact Google production callback is:

`https://trail.threewheeledsloth.com/auth/google/callback`

Production must set:

- `APPLICATION_TRAIL_PUBLIC_URL=https://trail.threewheeledsloth.com`
- `APPLICATION_TRAIL_EXTENSION_ORIGIN=https://trail.threewheeledsloth.com`
- `APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=false`
- private `DATABASE_URL`
- Google Web application client id/secret
- a long random `APPLICATION_TRAIL_AUTH_SECRET`

Do not commit any of those secrets.

## Next gate

Deploy the accepted WP3 code to the existing studio VPS using the VPS's established reverse-proxy and process-manager patterns, apply `002_auth.sql`, enable HTTPS, configure the exact Google redirect URI, and perform the live cross-machine smoke.

Do not begin AI enrichment, duplicate/repost work, resume analysis, contacts, email ingestion, or advanced analytics until WP3 is accepted.
