---
type: Development Handoff
title: Application Trail Next Development Prompt
description: Infrastructure-focused instructions for completing WP3 hosted deployment and the cross-machine dogfood gate.
status: stable
tags: [application-trail, handoff, deployment, wp3]
---
# Next Development Prompt

Continue in:

`https://github.com/Three-Wheeled-Sloth-Studio/Application-Trail`

Work from current `main`.

## Objective

Finish the WP3 hosted deployment and cross-machine dogfood gate. The application code is already implemented and CI-green. This is primarily an infrastructure/configuration slice.

Accepted WP3 implementation commit:

`ed7e7c33581da5ee751d087646221c199a82e3bc`

Agent Academy baseline:

`16691651776151a7eb1ebf13d99a92658e0684e6`

Read first:

1. `AGENTS.md`
2. `refs/agents.yaml`
3. `refs/project.yaml`
4. `refs/planning/mvp-roadmap.md`
5. `refs/planning/todos.yaml`
6. `refs/handoffs/currentHandoff.md`
7. `refs/implementation/fileMap.yaml`
8. `refs/deployment/wp3-hosted-deployment.md`
9. `refs/architecture/security-and-secrets.md`
10. `refs/testing/validationCommands.yaml`
11. `.env.example`

Use `refs/index.md` for discovery after the required reading order. Do not hand-edit generated indexes.

## Critical deployment constraint

Before changing the VPS, inspect the existing studio VPS conventions for:

- reverse proxy / web server
- TLS certificate management
- process manager / startup services
- deployed application directories
- PostgreSQL connectivity
- existing studio application isolation

Reuse those conventions. Do not introduce a second proxy, a second process-manager convention, Docker, or a new database host merely for Application Trail unless existing infrastructure makes that necessary and you document why.

Do not disrupt World Forge, Parchment Worlds, or any other hosted studio application.

Record any previously unknown durable VPS convention in `refs/planning/decisions.yaml` or `refs/planning/openQuestions.yaml` as appropriate.

## Accepted public topology

Canonical origin:

`https://trail.threewheeledsloth.com`

Routes:

- `/` and static assets -> `apps/web/dist`
- `/api/*` -> API at loopback `127.0.0.1:4310`
- `/auth/*` -> API at loopback `127.0.0.1:4310`
- `/health` -> API at loopback `127.0.0.1:4310`

PostgreSQL must remain non-public.

## Required work

1. Confirm `trail.threewheeledsloth.com` resolves to the intended VPS.
2. Pull/deploy the accepted current `main`.
3. Install dependencies and run `npm run validate` before deployment changes.
4. Configure production secrets/environment outside Git.
5. Run `npm run migrate` against the existing private `application_trail` database and verify `002_auth.sql` applies cleanly without altering existing WP2 records.
6. Run the API through the VPS's existing process manager with `APPLICATION_TRAIL_API_PORT=4310` and loopback binding.
7. Serve `apps/web/dist` at `/` through the existing reverse proxy.
8. Proxy `/api/*`, `/auth/*`, and `/health` to the API.
9. Enable a valid HTTPS certificate and redirect HTTP to HTTPS.
10. Verify `https://trail.threewheeledsloth.com/health` returns the API health response.
11. Configure or report the exact required Google OAuth settings. If you do not have Google Cloud access, do not invent credentials; stop at the point where the site is HTTPS-live and report the manual Google action required.
12. Once Google OAuth credentials are available, restart the API and test Google sign-in.
13. Perform the cross-machine and extension validation gate below if browser access is available.

## Required production environment

```text
APPLICATION_TRAIL_API_PORT=4310
APPLICATION_TRAIL_PUBLIC_URL=https://trail.threewheeledsloth.com
APPLICATION_TRAIL_EXTENSION_ORIGIN=https://trail.threewheeledsloth.com
APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=false
DATABASE_URL=<existing private application_trail database connection>
GOOGLE_OAUTH_CLIENT_ID=<Google Web application client id>
GOOGLE_OAUTH_CLIENT_SECRET=<Google Web application client secret>
APPLICATION_TRAIL_AUTH_SECRET=<new long random production secret>
```

Never commit these real values.

## Google OAuth manual configuration

Exact authorized redirect URI:

`https://trail.threewheeledsloth.com/auth/google/callback`

Scopes are only:

- `openid`
- `email`
- `profile`

Use the existing studio Google OAuth project/client if it is a compatible Web application client. Do not create a second Google project merely because Application Trail is a new app.

## Validation gate

Automated:

- `npm run validate`

Hosted:

- HTTPS web shell loads
- `/health` is green
- HTTP redirects to HTTPS
- PostgreSQL is not publicly exposed
- dev identity is disabled
- Google sign-in succeeds
- same Google account maps to the same internal user on repeat sign-in
- a different Google account cannot read the first account's opportunity

Cross-machine:

1. machine A signs in
2. machine A extension captures a real job
3. machine B signs in with the same Google account
4. machine B opportunity list shows that captured job
5. machine B opens the full stored record

Extension:

- Sign in with Google starts the hosted web flow
- pairing completes
- extension can save a job with its opaque Application Trail session
- no privileged credential exists in the extension build

## Stop condition

WP3 is complete only when the hosted cross-machine dogfood gate passes.

Do not begin WP4 extraction/enrichment or later roadmap work during this slice.
