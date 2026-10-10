# EPapers API

Strict TypeScript API for DIT using Next.js App Router, Prisma and CockroachDB. The separate frontend is unchanged. Base path: `/api/v1`.

## Setup

1. Use Node.js 22 or newer. Copy `.env.example` to `.env` and configure credentials locally.
2. For CockroachDB Cloud use TLS: `sslmode=require&sslaccept=strict` (Prisma connection options). Never disable certificate validation.
3. Run `npm install`, `npm run db:generate`, `npm run db:migrate`, then `npm run db:seed`.
4. Run `npm run dev`. Secure refresh cookies require HTTPS, including development.
5. Run the worker separately: `node --env-file=.env --conditions=react-server --import tsx worker/index.ts`.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test`.
- Set `TEST_DATABASE_URL` in `.env` to a disposable CockroachDB database whose name contains `test`, then run `npm run test:db`. This applies migrations, seeds curriculum, runs auth and Phase 3–5 integration tests, and prints index plans. It never runs against `DATABASE_URL`. Storage integration tests use an isolated in-memory adapter and never send email.
- `npm run build` validates the standalone deployment build.
- `npm run openapi` regenerates `docs/openapi.yaml` directly from request Zod schemas (JSON is valid YAML).

The versioned curriculum seed includes only departments/programs, no modules, users, passwords, Masters or vocational certificates. Programme assignments flagged in `prisma/seed/curriculum-v1.json` require prospectus verification before production. Module CSV contract: `code,name,programCode,semester,levelYear,credits`; dry-run and commit endpoints are planned for Phase 6.

See [auth contract](docs/AUTH.md) and [phase verification](docs/PHASES.md). Production email/Turnstile delivery needs configured service credentials. `DATA_ENCRYPTION_KEY` encrypts email outbox and admin TOTP secrets; back it up securely and keep it separate from JWT and refresh secrets.

Phases 3–5 add curriculum/search, private PDF uploads, signed downloads, moderation, achievements, notifications, authenticated leaderboards and reporting queues. See [uploads and moderation](docs/UPLOADS-MODERATION.md) for request examples, worker behavior and remaining live service setup.
