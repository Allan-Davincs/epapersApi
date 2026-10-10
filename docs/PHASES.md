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

## Final check results

| Check | Result |
|---|---|
| ESLint | Pass |
| tsc --noEmit | Pass |
| Unit/handler tests | 17 passed; database suite skipped intentionally in the unit command |
| Real CockroachDB integration tests | 8 passed; refresh DTO/reuse test also rerun after final projection change |
| Standalone next build | Pass |
| Main database health handler | HTTP 200 |
| Main seed counts | 8 departments, 36 programme/campus entries; 0 users/modules/papers |
| EXPLAIN / EXPLAIN ANALYZE | Intended upload, recent, popular, prefix and account indexes used |
| npm audit | 0 vulnerabilities |
| Tracked secret-file guard | Pass |

The standard TypeScript/JavaScript ESLint rules replace the Next.js lint dependency chain that introduced an unpatched braces advisory; the build emits a non-blocking Next.js lint-plugin notice. Prisma's configuration dependency is overridden to the fixed deepmerge-ts release; Prisma generation and real migrations were exercised with that override. Hosted CI/gitleaks still requires a repository workflow run.

## Commands

npm run lint; npm run typecheck; npm test; npm run test:db; npm run build; npm run openapi; npm run check:secrets; npm audit --audit-level=high.

Regular npm test runs the unit/handler tests and skips database tests unless TEST_DATABASE_URL is explicitly supplied. npm run test:db loads the local test URL, deploys migrations there, seeds curriculum, runs integration tests and writes index plans. It refuses a database whose name does not contain test.

## Phase 3: curriculum and search

Implemented department/program/module selectors and details, program/semester/department filtering, case-insensitive module lookup, paper search/recent/popular/detail, historical-handle public profiles, bounded cursor lists and public cache headers. Public queries require active, non-deleted curriculum ancestors and approved papers. Explicit DTOs expose handles and level titles without personal names, email, account status, file keys or XP.

## Phase 4: uploads and papers

Implemented PDF-only presign with UTC daily quotas, verified account/lockdown checks, generated object keys, signed type/length/create-only PUT headers, owner-only idempotent completion and byte validation. Added file lifecycle fields and worker scan/hash/page estimate hooks. Submissions check completed ownership and reuse, produce duplicate warnings, and enforce the verified lecturer department rule. Public signed downloads require clean, published files and approved papers, use a bounded LRU, and append events independently of signing. Worker rollups update counters and processed markers atomically; abandoned uploads are cleaned after 24 hours.

## Phase 5: moderation and gamification

Implemented admin queue/detail/scanned-file preview/review, positive idempotent +50/+30 approval rewards, user totals, badge progress, private notifications, encrypted review email outbox, authenticated period leaderboards, admin-only XP ledger, flags, takedowns and module requests with admin resolutions. Review writes commit together; durable outbox intents dispatch actual email/publication work after commit. Concurrent approvals and concurrent counter rollups are verified on CockroachDB. Rejection, spam and takedown leave earned XP unchanged. Metadata edits preserve rejection reasons and cannot award XP before scanning.

Migration 0005 adds completion/publication/page-count fields, job lease tokens and deduplication keys, unique reward keys, unprocessed-event indexes and three badge definitions. It was applied successfully to the disposable CockroachDB database and then the configured application database. No frontend code was changed, no dependencies were added, and local credentials remain untracked. The combined implementation is on `backend/phase-5-moderation-gamification`; phase branch names were created in order.

### Phase 3–5 verification

| Check | Result |
|---|---|
| ESLint | Pass, no warnings |
| tsc --noEmit | Pass |
| Unit/handler tests | 25 passed; database suites intentionally skipped in the unit command |
| Real CockroachDB suites | 17 passed: 8 auth/foundation and 9 Phase 3–5 tests |
| Migration deploy | Pass on test and application databases |
| Standalone Next.js build | Pass |
| OpenAPI generation | Pass, new request and response schemas included |
| Dependency audit | 0 vulnerabilities |
| Tracked secret-file guard | Pass |

The integration suite uses real CockroachDB with isolated mocked storage and Turnstile, and never sends email. It verifies ownership/idempotent completion, unsafe scans, duplicate warnings, department scope, private DTOs, concurrent approval reward uniqueness, publication, concurrent rollup uniqueness, takedowns without XP reversal, notification ownership, module requests, leaderboard exclusions and abandoned upload cleanup. Query plans are refreshed against the retained 200-module/3,000-paper fixture.

Both live R2 bucket probes failed with the current local settings; the user elected to configure R2 later. Live browser PUT/CORS, R2 copy/download, SMTP/Resend delivery and real Turnstile challenges therefore remain unverified. The structural scanner is a safety hook, not antivirus; see [uploads and moderation](UPLOADS-MODERATION.md) for setup, examples, scan limitations and signed URL expiry behavior. Broader admin CRUD/restore/purge is Phase 6; load testing and deployment hardening are Phase 7.
