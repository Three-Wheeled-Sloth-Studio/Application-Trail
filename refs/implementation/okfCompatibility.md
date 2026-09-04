---
type: Compatibility Contract
title: Application Trail Agent Academy OKF Compatibility
description: Authority boundaries and interoperability rules for Application Trail's additive Agent Academy and OKF v0.2 alignment.
status: stable
tags: [application-trail, agent-academy, okf, interoperability]
---
# Application Trail Agent Academy OKF Compatibility

Application Trail had a useful custom `refs/` structure before Agent Academy adopted Open Knowledge Format compatibility. The alignment is therefore additive: preserve the established Application Trail taxonomy and deterministic project state, while making its Markdown knowledge portable and discoverable through the Agent Academy OKF profile.

## Authority Boundary

| Concern | Authoritative representation |
| --- | --- |
| Agent reading order and operating rules | `AGENTS.md` and `refs/agents.yaml` |
| Project identity and current gate | `refs/project.yaml` |
| Product requirements | `refs/product/product-requirements.md` |
| Architecture and security | `refs/architecture/` |
| Deployment contract | `refs/deployment/` |
| Structured decisions, questions, and todos | `refs/planning/*.yaml` |
| Roadmap narrative | `refs/planning/mvp-roadmap.md` |
| Current state and next-agent context | `refs/handoffs/` |
| Human-readable knowledge concepts | OKF-compatible Markdown under `refs/` |
| Portable discovery | Generated `index.md` files |

The originating Application Trail documents remain source of truth. Generated indexes are discovery artifacts, not duplicate state.

## Concept Rules

Every Markdown file under `refs/` is an OKF concept except reserved `index.md` and `log.md` files.

Each concept must begin with parseable YAML frontmatter containing a non-empty `type`. Optional lifecycle or provenance fields are added only when they are meaningful. Do not invent `generated`, `verified`, `sources`, or `stale_after` metadata merely to make a document look more complete.

## Index Rules

`index.md` files are generated deterministically by `refs/tools/generate-okf-indexes.mjs`, committed to Git, and checked by `npm run validate:refs`. Do not edit them manually.

The root `refs/index.md` declares the supported OKF version. Non-root indexes contain no frontmatter.

## Tooling Exception

Agent Academy's reusable harness currently ships Python generation and validation tools. Application Trail implements equivalent generation and validation semantics in Node.js because Node 22 is already the required project toolchain and CI dependency. This avoids adding a second package/bootstrap path solely for refs maintenance.

The format contract is unchanged: the project uses Agent Academy's pinned OKF version and baseline, preserves deterministic YAML, requires OKF concept frontmatter, commits deterministic discovery indexes, and validates the resulting bundle in CI.

## Trust Rules

- Creation by a human or agent does not imply verification.
- Passing tests does not imply verification.
- Passing refs validation proves structural conformance, not factual truth.
- Git history is not a substitute for explicit OKF trust metadata.
- A future studio catalog is a derived navigation layer. The project repository at the recorded commit remains authoritative.
