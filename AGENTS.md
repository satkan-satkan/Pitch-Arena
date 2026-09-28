# Pitch Arena development

- Never commit real passwords, login tokens, API keys, `.env`, local databases, backups, or uploaded private slides. Keep server secrets out of `VITE_*` variables and browser code. `.env.example` contains placeholders only.
- Run `npm run check:secrets` before every commit. Review the staged file list as well; pattern matching does not detect every secret. Do not print secret values when investigating a finding.
- Do not create default credentials or automatically assign administrative rights to the first account. Assign owner access only to the account identified by the user.
- Keep public startup listings separate from private projects and pitches. Public API responses must use approved snapshots, with revenue labelled founder reported.
- Test new ownership, publication and invitation behavior against isolated PostgreSQL schemas. Never seed test accounts into the working database.
- Keep RU/EN strings, existing guest saves and account session recovery working. `/` is the landing page and `/play` is the game.
- OpenAI credentials and Railway deployment are deferred until the user requests them.
