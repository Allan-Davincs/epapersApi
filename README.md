# EPapers API

Import [postman.json](postman.json) and the [blank environment](postman/epapers.environment.json) to test all API operations. The [Postman guide](docs/POSTMAN.md) explains every endpoint, variables, authentication, upload flow, safe run gates and response tests. Regenerate with `npm run postman`; verify offline with `npm run check:postman`.

The Postman Local View workspace is in `../Apitester`. Run `npm run postman:sync` after regeneration to update its requests, JWT authentication, schemas, environment and guide while preserving filled environment values.

Strict TypeScript API for DIT using Next.js App Router, Prisma and CockroachDB. Base path: `/api/v1`. Contact, flags, and takedowns require JWT authentication; registration and recovery remain public. See [current authentication setup](docs/TURNSTILE.md).

## Setup

1. Use Node.js 24 or Node.js 22.19+. Copy `.env.example` to `.env` and configure credentials locally.
2. For CockroachDB Cloud use TLS: `sslmode=require&sslaccept=strict` (Prisma connection options). Never disable certificate validation.
3. Run `npm install`, `npm run db:generate`, `npm run db:migrate`, then `npm run db:seed`.
4. Run `npm run dev`. Secure refresh cookies require HTTPS, including development.
5. Run the worker separately: `npm run worker`.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test`.
- Set `TEST_DATABASE_URL` in `.env` to a disposable CockroachDB database whose name contains `test`, then run `npm run test:db`. This applies migrations, seeds curriculum, runs auth and Phase 3–8 integration tests, and verifies index plans. It never runs against `DATABASE_URL`. Storage integration tests use an isolated adapter and never send email.
- `npm run test:load`, `npm run test:restore`, `npm run test:indexes` and `npm run test:admin` run scoped disposable-database checks. After building, `npm run test:smoke` starts/stops a local standalone process against the configured application database for public/denied-route checks.
- `npm run build` validates the standalone deployment build.
- `npm run openapi` regenerates `docs/openapi.yaml` directly from request Zod schemas (JSON is valid YAML).

The versioned curriculum seed includes only departments/programs, no modules, users, passwords, Masters or vocational certificates. Programme assignments flagged in `prisma/seed/curriculum-v1.json` require prospectus verification before production. Module CSV contract: `code,name,programCode,semester,levelYear,credits`; `/api/v1/admin/modules/import` supports dry-run and atomic commit.

See [auth contract](docs/AUTH.md) and [phase verification](docs/PHASES.md). Production email delivery needs configured service credentials. `DATA_ENCRYPTION_KEY` encrypts email outbox and admin TOTP secrets; back it up securely and keep it separate from JWT and refresh secrets.

Verification emails are branded **Epapers**. See [SMTP setup and worker instructions](docs/SMTP.md); `npm run email:verify` checks SMTP TLS/authentication without sending a message. Keep `npm run worker` running to deliver queued verification codes.

Phases 3–5 add curriculum/search, private PDF uploads, signed downloads, moderation, achievements, notifications, authenticated leaderboards and reporting queues. See [uploads and moderation](docs/UPLOADS-MODERATION.md) for request examples, worker behavior and remaining live service setup.

Phases 6–8 add [guarded administration and retention](docs/ADMIN.md), [security checks](docs/SECURITY.md), [deployment templates](docs/DEPLOY.md), [load/index evidence](docs/INDEXES.md), [backup/restore notes](docs/BACKUP-RESTORE.md) and a complete [frontend integration mapping](docs/FRONTEND-INTEGRATION.md). The [manual checklist](docs/MANUAL.md) identifies live service and operator checks still pending. OpenAPI covers every implemented route.
