# Security and Secrets

Application Trail is designed for a public code repository. Public visibility is an architectural constraint, not a reason to hide implementation details.

## Never commit

- `.env`
- `.env.local`
- OAuth client secrets
- database credentials
- deployment tokens
- production service credentials
- hosted AI API keys
- user-entered provider keys
- captured job/application records
- resumes or cover letters containing user data
- contact data
- database dumps
- private operational exports

Provide `.env.example` files with names and safe placeholders only when implementation begins.

## Browser extension rule

Nothing bundled into or downloaded by a browser extension is secret.

The extension may contain public identifiers where the provider expects them to be public, but it must not contain privileged credentials that authorize backend or third-party access.

The extension talks to the Application Trail API through user-authenticated requests. It never receives PostgreSQL credentials.

## Google authentication

Google OAuth is the preferred initial authentication mechanism. Treat OAuth client identifiers and secrets according to the flow actually implemented. Server-side secrets remain server-side.

Do not add custom password storage for MVP.

## Hosted provider BYOK

User-provided AI API keys should remain local to the machine by default.

Do not synchronize them through PostgreSQL or Chrome sync storage.

Preferred production direction:

1. User configures a provider in Application Trail settings.
2. A local bridge receives the credential.
3. The bridge stores it using a protected OS credential facility or an equivalent secure local secret store.
4. The web/extension client references the configured provider without receiving the durable raw key again when avoidable.

Development-only credentials may be read from ignored `.env.local` files.

Do not implement end-user credential persistence by writing into the repository's `.env.local` file.

## Local bridge security

If a local bridge is implemented, it must not become an unauthenticated general-purpose proxy to Ollama, the local filesystem, or hosted providers.

Keep its loopback API narrow and task-oriented. Consider origin checks, ephemeral/session authorization, explicit allowed operations, and limits on arbitrary URL or filesystem access.

## User data and tenancy

Even during single-user dogfooding, canonical user-owned records should include an ownership boundary. Authorization rules must prevent another authenticated user from reading or mutating records they do not own if multi-user hosting is later enabled.

## Source content

Job descriptions are third-party source content captured for the user's tracking and analysis. Preserve only what is needed for product functionality and do not accidentally expose one user's captured content through public logs, telemetry, fixtures, screenshots, or test snapshots.

Synthetic fixtures should be used in public automated tests unless a source is explicitly suitable for redistribution.

## Logging

Avoid logging raw tokens, API keys, resume bodies, full job descriptions, or sensitive request payloads. Prefer IDs, operation names, timing, and sanitized error context.
