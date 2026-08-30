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

WP0 through WP2 are accepted. The repository side of WP3 is implemented and CI-green; hosted deployment and live Google/cross-machine smoke remain.

Current target topology:

```text
Chromium extension -----> https://trail.threewheeledsloth.com
                                  |
                                  +-- /        web application
                                  +-- /api/*   Application Trail API
                                  +-- /auth/*  Google/session boundary
                                                   |
                                                   v
                                              PostgreSQL
                                                private
```

The extension captures generic job-page evidence, saves as Saved or Applied, and can open the full synchronized record. The web application now includes Google sign-in plumbing and a minimal opportunity list required for cross-machine retrieval.

Google authentication is server-mediated. Google's stable `sub` maps to the existing internal Application Trail UUID. The application persists opaque Application Trail session hashes, not Google access tokens.

See `refs/deployment/wp3-hosted-deployment.md` for the hosted deployment contract.

## Local development

Requires Node.js 22+ and PostgreSQL access.

Install dependencies and create ignored local configuration:

```text
npm install
copy .env.example .env.local
```

Fill in the local values in `.env.local`.

Normal startup is now one command:

```text
npm run dev
```

`npm run dev` builds the repository, starts the configured SSH PostgreSQL tunnel when `APPLICATION_TRAIL_SSH_HOST` is present, waits for the database, applies migrations, starts the API, and starts the local same-origin web proxy. Ctrl+C shuts the stack down together.

For the existing studio PostgreSQL tunnel pattern, configure these ignored local variables instead of manually opening a tunnel terminal:

```text
APPLICATION_TRAIL_SSH_HOST=<ssh-user-and-host>
APPLICATION_TRAIL_SSH_LOCAL_PORT=55432
APPLICATION_TRAIL_SSH_REMOTE_HOST=127.0.0.1
APPLICATION_TRAIL_SSH_REMOTE_PORT=5432
DATABASE_URL=postgresql://application_trail:<password>@127.0.0.1:55432/application_trail
```

`APPLICATION_TRAIL_SSH_IDENTITY_FILE` is optional when the normal SSH configuration already selects the correct key.

Lower-level troubleshooting commands remain available:

```text
npm run migrate
npm run start:api
npm run start:web
```

## Extension development

`npm run build` creates `apps/extension/dist`.

The extension build reads `APPLICATION_TRAIL_EXTENSION_ORIGIN` from the environment. Without an override it targets the hosted dogfood origin:

`https://trail.threewheeledsloth.com`

When `npm run dev` builds with a local `.env.local`, set:

```text
APPLICATION_TRAIL_EXTENSION_ORIGIN=http://127.0.0.1:4320
```

Then load `apps/extension/dist` unpacked in Chrome or Edge.

The explicit development identity remains available only when both the extension build and API are intentionally configured with:

```text
APPLICATION_TRAIL_ENABLE_DEV_IDENTITY=true
```

Never enable that flag in the hosted environment.

## Validation

```text
npm run typecheck
npm test
```

CI runs the same build/typecheck/test path against PostgreSQL 17 and validates core persistence plus WP3 identity/session/grant behavior.

## License

Application Trail is licensed under the GNU Affero General Public License v3.0. See `LICENSE`.
