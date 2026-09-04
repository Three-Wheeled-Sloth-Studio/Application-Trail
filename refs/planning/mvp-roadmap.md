---
type: Roadmap
title: Application Trail MVP Roadmap
description: Thin-slice implementation sequence from executable scaffold through cross-machine auth, extraction, duplicate detection, AI, and resume intelligence.
status: stable
tags: [application-trail, roadmap, mvp]
---
# MVP Roadmap

The goal is to reach dogfoodable capture quickly. Work in thin end-to-end slices and resist building every future package before it is needed.

## WP0 - Executable repository scaffold

Establish only the infrastructure needed for the first vertical slice.

Target:

- TypeScript monorepo/workspaces
- shared formatting/typecheck/test baseline
- `apps/extension`
- `apps/web`
- `apps/api`
- `packages/domain`
- PostgreSQL development configuration or a clearly replaceable local equivalent for automated tests
- ignored environment configuration with safe examples
- CI that runs the current validation commands

Do not create `apps/local-bridge` until the first AI slice actually needs it.

Exit criteria:

- clean install
- typecheck green
- tests green
- extension builds
- web app builds/starts
- API builds/starts

## WP1 - Core domain and persistence

Implement the minimum canonical schema for:

- user/account ownership
- company
- opportunity
- listing observation
- listing snapshot
- application
- application event
- resume artifact metadata

Build migrations and repository/service boundaries around actual MVP workflows.

Exit criteria:

- create/retrieve an Opportunity with one Listing Observation and Snapshot
- source URL and source text round-trip unchanged
- application status change creates an event
- user ownership is enforced at the service/API boundary

## WP2 - First extension capture

Implement a Manifest V3 Chromium extension that can:

- read active page URL/title
- capture visible/available job-description text
- inspect basic structured metadata such as JSON-LD where present
- show a compact provisional review
- save as Saved or Applied
- degrade gracefully when extraction is weak
- open the full application record in a new tab

Start with generic capture. Add source-specific adapters only when observed pages demonstrate a need.

Exit criteria:

- capture one real job listing end to end
- preserve source evidence
- retrieve the record after browser restart or from another machine/session against the same backend

## WP3 - Google authentication and cross-machine dogfood gate

Integrate Google OAuth using existing studio credentials/configuration patterns where appropriate.

Exit criteria:

- user signs in through Google
- extension and web app operate against the same authenticated account
- data captured on machine A appears on machine B
- no privileged credential is present in extension assets or Git

This is the first serious dogfood checkpoint. Begin using Application Trail for real applications as soon as this gate is reliable.

## WP4 - Structured extraction and lightweight review

Add deterministic extraction for obvious fields first:

- company
- title
- location
- salary
- employment type
- external requisition ID
- structured job-posting metadata

Add evidence/provenance tracking and user correction semantics.

Exit criteria:

- popup review shows extracted fields and missing/uncertain fields
- corrections persist and survive reprocessing
- original source values remain available

## WP5 - Duplicate and repost warning

Implement progressive candidate detection:

1. exact URL
2. external job/requisition ID
3. normalized company/title/location
4. deterministic text fingerprint/similarity

Add semantic similarity only when the AI provider layer is ready.

Exit criteria:

- revisiting an exact listing warns rather than duplicates silently
- likely reposts can be linked, rejected as different, or left unsure
- all listing observations remain preserved

## WP6 - AI provider and semantic enrichment

Reuse the provider ideas documented in `refs/architecture/review-room-ai-reference.md`.

Initial semantic operations:

- classify required vs preferred qualifications
- normalize skills and terminology while preserving source wording
- classify role/domain
- classify ambiguous presence type
- compare listing similarity

Prefer Ollama. Support hosted BYOK through a provider-neutral interface.

Introduce the local bridge when needed for shared web/extension local inference or protected durable BYOK credential storage.

## WP7 - Resume association and early market intelligence

Support:

- base resume records
- limited presentation variants
- exact submitted artifact association
- display-title alignment workflow

Begin simple aggregate analysis only after enough real job data exists to inform priorities.

Candidate first analyses:

- requested skill frequency
- source wording frequency
- required vs preferred frequency
- presence/location distribution
- salary distribution
- recurring/reposted opportunities

Let observed dogfood value determine the next analytics priorities rather than pre-ranking the entire backlog now.
