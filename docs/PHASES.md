# Phase 1 and Phase 2 review

Phase 1 provides strict TypeScript configuration, a standalone Next.js API build, startup environment validation, recursively redacted pino logs, standard errors and security headers, serializable transaction retries (SQLSTATE 40001 / Prisma P2034), default soft-delete filtering and an explicit withDeleted escape hatch, CockroachDB schema/migrations, partial and hash-sharded indexes, idempotent versioned DIT curriculum seeds, a database health handler, and CI for lint/typecheck/tests/dependency audit/gitleaks/secret-file checks.

Phase 2 provides registration as contributor/lecturer (no admin self-registration), Turnstile verification, hashed expiring OTPs with cooldown/attempt limits, Argon2id passwords and common-password rejection, minimal signed JWTs, rotating peppered refresh hashes, family revocation on token reuse, logout/all-session logout, session listing/revocation, single-use password reset with session revocation, username availability and transactional registry changes with historical reservations/cooldown/audit, private account DTOs with levelTitle and no XP, admin TOTP login and reauthentication, strict input/body limits, Origin/header CSRF and credentialed CORS, database-backed rate limits, interchangeable SMTP/Resend adapters, and an encrypted email outbox worker with retry/budget/expiry handling.

## Database verification

All five migrations were applied to a separate CockroachDB Cloud v26.2.7 test database, then to the initially empty configured epapersDb. The main database contains eight departments and 36 programme/campus entries. The seed creates no users, passwords, modules, papers, Masters programmes or vocational certificates.

Initial real-database testing exposed CockroachDB schema locking and an unsupported constrained-column type rewrite. The final migrations explicitly create unlocked tables for future DDL and retain CockroachDB INT8 widths for auxiliary counters/ledger amounts, represented as BigInt in Prisma. The existing change that omitted SPAM from the initial enum is preserved; a later migration adds SPAM.

Index verification uses 200 test modules and 3,000 test papers, explicitly checks actual fixture counts, refreshes current statistics, and captures EXPLAIN / EXPLAIN ANALYZE in [INDEXES.json](INDEXES.json). CockroachDB does not accept placeholders in EXPLAIN ANALYZE; the parameterized module plan uses EXPLAIN, with a separate static fixture query for runtime analysis. No test files exist in R2. Public listing, popular, upload filtering, normalized prefix lookup and account lookup indexes are checked. Larger load/backup/restore tests belong to Phase 7.

## Manual setup before production

- Confirm programme assignments flagged in the versioned seed against the DIT prospectus.
- Configure real Google SMTP or Resend sender credentials and Turnstile hostname/site keys. Live external email delivery and real browser challenges are not exercised by automated tests.
- Keep DATA_ENCRYPTION_KEY secure and backed up; losing it prevents decrypting queued emails and admin TOTP secrets. Admin provisioning/enrollment/recovery remains manual until Phase 6. Sensitive future admin actions must enforce the reauthentication wrapper.
- Serve the API and SPA over HTTPS under the same registrable domain. Secure refresh cookies require HTTPS during development too. Restrict VPS ingress to Cloudflare before trusting cf-connecting-ip.
- CI configuration is checked in; its hosted gitleaks job has not been run from this local environment. The local tracked-file check confirms environment/private-key files are not tracked. The gitleaks allowlist is limited to the public RFC 6238 test vector.

## Commands

npm run lint; npm run typecheck; npm test; npm run test:db; npm run build; npm run openapi; npm run check:secrets; npm audit --audit-level=high.

Regular npm test runs the unit/handler tests and skips database tests unless TEST_DATABASE_URL is explicitly supplied. npm run test:db loads the local test URL, deploys migrations there, seeds curriculum, runs integration tests and writes index plans. It refuses a database whose name does not contain test.
