# EPapers API

TypeScript API for DIT, built with Next.js route handlers, Prisma, CockroachDB,
and Cloudflare R2. The API base path is `/api/v1`; the separate Vite frontend
remains unchanged.

## Local setup

1. Use Node.js 20 or newer and a CockroachDB cluster/database.
2. Copy `.env.example` to `.env` and fill in credentials locally. Keep `.env`
   out of version control.
3. Install packages with `npm install`.
4. Apply the checked-in migrations using `npm run db:migrate`.
5. Start the API using `npm run dev`.

`GET /api/v1/health` checks database connectivity. Do not expose database or
storage credentials in logs or client responses. R2 buckets must remain private.

## Database notes

The Prisma schema uses CockroachDB. `prisma/migrations` includes the initial
schema and CockroachDB SQL constraints/indexes Prisma cannot represent. Apply
and validate migrations against CockroachDB, not PostgreSQL. Curriculum seed
rows are intentionally not included until the DIT department/program mappings
marked for verification in `backend.md` are confirmed.

## Configuration

See `.env.example`. Environment values are validated at server startup. When
`EMAIL_PROVIDER=smtp`, Google SMTP credentials are required; when using
`resend`, `RESEND_API_KEY` is required. Production secrets must be independently
generated and managed by the deployment environment.
