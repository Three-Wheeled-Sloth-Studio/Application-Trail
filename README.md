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

## Planned system shape

```text
Chromium extension -----> Application API -----> PostgreSQL
       |                       ^
       |                       |
       +---- full app tab -----+

Web application --------> Application API
       |
       +---- optional local AI bridge ----> Ollama
                                      +----> hosted AI provider
```

Google OAuth is the preferred initial identity provider.

## Repository status

The repository is in product and architecture bootstrap. The first implementation target is a thin vertical slice that can capture one real job posting, preserve its source, persist it through the API, and retrieve it from another browser session.

See `refs/README.md` for the project documentation map.

## License

Application Trail is licensed under the GNU Affero General Public License v3.0. See `LICENSE`.
