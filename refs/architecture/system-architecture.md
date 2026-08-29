# System Architecture

## Architectural bias

Application Trail should begin as a TypeScript monorepo organized as a modular monolith with a thin browser extension, a web management application, an API, shared domain packages, and an optional local AI bridge.

Do not introduce microservices until an observed scaling, deployment, or ownership boundary justifies them.

## Target topology

```text
Chromium Extension
  - page capture
  - lightweight review
  - save/apply action
  - duplicate/repost warning
  - full-app handoff
  - source-page return
          |
          v
Application API -----------------> PostgreSQL
  - Google identity boundary
  - authorization
  - opportunity/listing operations
  - application/event operations
  - resume metadata
  - server-side normalization
          ^
          |
Web Application
  - record management
  - search/filter
  - deeper editing
  - duplicate review
  - resume management
  - analytics
  - settings

Extension / Web Application
          |
          v
Optional Local AI Bridge
  - provider discovery
  - structured inference
  - Ollama access
  - local secret access
          |
          +--------> Ollama
          +--------> optional hosted AI provider
```

## Browser extension boundary

The extension is optimized for capture, not management.

It may:

- inspect the active page
- extract structured metadata and visible text
- create a provisional listing capture
- show a compact review state
- display duplicate/repost warnings
- open the full web application in a new tab
- store non-sensitive local/sync preferences where appropriate

It must not:

- contain server secrets
- connect directly to PostgreSQL
- become the canonical data store
- silently merge listings
- own complex analytics or resume-management flows

## API boundary

The API is the canonical write/read boundary for synchronized product data.

Initial responsibilities:

- validate Google-authenticated identity
- authorize records by user
- create and update companies
- create opportunities and listing observations
- preserve listing snapshots
- record application state and events
- record resume metadata/artifact references
- expose duplicate/repost candidates and resolution actions

The first product can remain single-user optimized internally, but every canonical user-owned record should carry a user boundary from the start so later productization does not require invasive data ownership surgery.

## Persistence

PostgreSQL is the preferred canonical store. Existing Hostinger VPS infrastructure is an acceptable first deployment target.

Local/browser caching is allowed for responsiveness and temporary failure handling. It is never the canonical source of truth.

Source snapshots should be preserved in a form that allows later reprocessing. Start with text plus relevant metadata. Add richer page snapshot storage only when there is evidence it is needed.

## Identity

Google OAuth is the preferred initial sign-in mechanism. Do not build custom password authentication for MVP.

Keep application authorization separate enough from the Google-specific authentication implementation that another identity provider can be added later.

## AI boundary

Expose product-specific operations, not generic chat, such as:

- `extractJobPosting`
- `normalizeQualifications`
- `normalizeSkills`
- `classifyPresence`
- `classifyDomain`
- `compareListings`
- `compareResumeVocabulary`

Each operation should have a structured request and validated structured response.

Provider adapters may include Ollama and hosted BYOK providers. Provider-specific request formats must not leak into domain models.

## Local bridge

A local bridge is an acceptable component when direct browser-to-local-model access becomes unreliable, insecure, or too browser-specific.

Responsibilities may include:

- Ollama availability and model discovery
- structured local inference
- protected local credential storage for hosted providers
- provider health checks
- a narrow authenticated loopback interface

Do not require the local bridge for basic capture/persistence unless the feature specifically needs local AI.

## Graceful extraction fallback

Capture should degrade rather than fail.

If structured parsing is weak:

1. preserve URL
2. preserve page title
3. preserve available page text
4. create the provisional record
5. run AI enrichment if available
6. flag uncertain fields
7. allow correction in the full application

Avoid building a large collection of brittle site-specific scrapers unless repeated evidence justifies a dedicated adapter for a major ATS/source.

## Proposed monorepo shape

```text
apps/
  extension/
  web/
  api/
  local-bridge/
packages/
  domain/
  extraction/
  ai/
  database/
  auth/
refs/
```

This is a target shape, not a requirement to create every package before the first vertical slice needs it.
