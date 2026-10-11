# Phase 1 and Phase 2 review

Phase 1 provides strict TypeScript configuration, a standalone Next.js API build, startup environment validation, recursively redacted pino logs, standard errors and security headers, serializable transaction retries (SQLSTATE 40001 / Prisma P2034), default soft-delete filtering and an explicit withDeleted escape hatch, CockroachDB schema/migrations, partial and hash-sharded indexes, idempotent versioned DIT curriculum seeds, a database health handler, and CI for lint/typecheck/tests/dependency audit/gitleaks/secret-file checks.

Phase 2 provides registration as contributor/lecturer (no admin self-registration), hashed expiring OTPs with cooldown/attempt limits, Argon2id passwords and common-password rejection, minimal signed JWTs, rotating peppered refresh hashes, family revocation on token reuse, logout/all-session logout, session listing/revocation, single-use password reset with session revocation, username availability and transactional registry changes with historical reservations/cooldown/audit, private account DTOs with levelTitle and no XP, admin TOTP login and reauthentication, strict input/body limits, Origin/header CSRF and credentialed CORS, database-backed rate limits, interchangeable SMTP/Resend adapters, and an encrypted email outbox worker with retry/budget/expiry handling.

## Database verification

All five migrations were applied to a separate CockroachDB Cloud v26.2.7 test database, then to the initially empty configured epapersDb. The main database contains eight departments and 36 programme/campus entries. The seed creates no users, passwords, modules, papers, Masters programmes or vocational certificates.

Initial real-database testing exposed CockroachDB schema locking and an unsupported constrained-column type rewrite. The final migrations explicitly create unlocked tables for future DDL and retain CockroachDB INT8 widths for auxiliary counters/ledger amounts, represented as BigInt in Prisma. The existing change that omitted SPAM from the initial enum is preserved; a later migration adds SPAM.

Index verification uses 200 test modules and 3,000 test papers, explicitly checks actual fixture counts, refreshes current statistics, and captures EXPLAIN / EXPLAIN ANALYZE in [INDEXES.json](INDEXES.json). CockroachDB does not accept placeholders in EXPLAIN ANALYZE; the parameterized module plan uses EXPLAIN, with a separate static fixture query for runtime analysis. No test files exist in R2. Public listing, popular, upload filtering, normalized prefix lookup and account lookup indexes are checked. Larger load/backup/restore tests belong to Phase 7.

## Manual setup before production

- Confirm programme assignments flagged in the versioned seed against the DIT prospectus.
- Configure real Google SMTP or Resend sender credentials. Live external email delivery are not exercised by automated tests.
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
| Focused final moderation regressions | 2 passed: edits before scanning award no XP; edits preserve rejection reasons |
| Migration deploy | Pass on test and application databases |
| Standalone Next.js build | Pass |
| OpenAPI generation | Pass, new request and response schemas included |
| Dependency audit | 0 vulnerabilities |
| Tracked secret-file guard | Pass |

The integration suite uses real CockroachDB with isolated mocked storage, and never sends email. It verifies ownership/idempotent completion, unsafe scans, duplicate warnings, department scope, private DTOs, concurrent approval reward uniqueness, publication, concurrent rollup uniqueness, takedowns without XP reversal, notification ownership, module requests, leaderboard exclusions and abandoned upload cleanup. Query plans are refreshed against the retained 200-module/3,000-paper fixture.

Both live R2 bucket probes failed with the current local settings; the user elected to configure R2 later. Live browser PUT/CORS, R2 copy/download, SMTP/Resend delivery therefore remain unverified. The structural scanner is a safety hook, not antivirus; see [uploads and moderation](UPLOADS-MODERATION.md) for setup, examples, scan limitations and signed URL expiry behavior. Broader admin CRUD/restore/purge is Phase 6; load testing and deployment hardening are Phase 7.

## Phase 6: administration

Implemented admin user list/detail/status/role/department/lecturer verification and positive idempotent XP grants; evidence-based lecturer verification queue; curriculum CRUD/archive and bounded CSV dry-run/atomic commit; paper soft-delete/restore with retention expiry; settings/lockdown/read-only/banner; timed announcements; security policy, append-only audit view, stats and contact inbox. Sensitive writes recheck current database account/session and session-bound reauthentication inside transactions. Role/status/verification changes revoke sessions; self-lockout and negative/zero awards are rejected. PATCH preserves omitted fields, including defaults.

Account export returns safe independently paged private lists. Account deletion anonymizes identity and linked data while preserving positive awards, retained papers and audit integrity. Hourly maintenance expires sessions/challenges, clears terminal email payloads after seven days and retries object purge. Purge marks its start before deleting objects, blocks restoration once started, and preserves positive ledger amounts with a null paper link. An operator-only first-admin bootstrap script requires a verified active account, password and working TOTP and refuses when an admin exists; it was type/lint checked but not run to provision an account.

Migration 0006 adds lecturer verification, purge state and maintenance settings; 0007 adds the partial retention-selection index. Both were applied successfully to the disposable test and application databases. Details and examples are in [ADMIN.md](ADMIN.md).

## Phase 7: hardening

Added guest/contributor/lecturer/admin authorization and reauth-session matrix tests, disabled/deleted-account denial, strict patch/CSV/positive award tests, nested credential/URL/log redaction, read-only recovery checks and real CockroachDB admin/retention/account/announcement regressions. The full database run passed 23 tests; the final seven-test admin suite added the announcement regression and passed independently, giving 24 distinct database tests across the suites. A first teardown missed lecturer notifications; teardown was fixed, the full suite reran successfully and the abandoned synthetic fixtures were removed from the test database.

The repeatable load check ran 40 searches and 40 downloads with concurrency four over 200 module/3,000 paper fixtures: zero errors, 40 cached URL reuses and 41 download events including warmup. Search p95 was 2,543 ms; download p95 1,615 ms, over the development-to-CockroachDB network. This is service-level load with local S3 signing, not HTTP/Cloudflare/R2 transfer capacity. EXPLAIN verified recent/popular/module/prefix/account/retention indexes and recorded the broad runtime search's recent-index scan/filter limitation. See [load results](LOAD-RESULTS.json), [plans](INDEXES.json) and [interpretation](INDEXES.md).

The synthetic logical restore drill verified a three-row curriculum serialization/checksum and relational insert round-trip, then removed its fixture. It does not prove a native database backup, private-object recovery or RPO/RTO. [Backup/restore notes](BACKUP-RESTORE.md) make those pending operator checks explicit. Added [DEPLOY.md](DEPLOY.md), [SECURITY.md](SECURITY.md) and reviewable Nginx/systemd/R2 CORS templates; no host or Cloudflare configuration was installed.

## Phase 8: handover

Generated request/response OpenAPI now covers 83 paths and 96 operations, including admin/verification/settings/announcements/contact/account flows. Contract tests verify every implemented method, Node.js runtime declarations, schema references, admin bearer access and sensitive reauth headers. [FRONTEND-INTEGRATION.md](FRONTEND-INTEGRATION.md) maps every mock service function and documents DTO/filter/pagination/auth/upload adaptations; the frontend remains unchanged. [MANUAL.md](MANUAL.md) lists live services, native recovery, VPS setup, TOTP enrollment, scanner, curriculum verification and browser integration still requiring operator work.

Phase branches were created in order: `backend/phase-6-admin`, `backend/phase-7-hardening`, `backend/phase-8-handover`. No dependencies, seed passwords or frontend edits were introduced. Credentials remain local and untracked.

### Phase 6–8 final verification

| Check | Result |
|---|---|
| ESLint | Pass, no warnings |
| tsc --noEmit | Pass |
| Unit/handler/contract tests | 44 passed; 24 database tests intentionally skipped in ordinary unit command |
| Real CockroachDB | 24 distinct tests passed across full and final focused runs |
| Migrations 0006/0007 | Applied on test and application databases |
| Standalone build | Pass |
| Built process smoke checks | 10 passed; main database health, public DTOs, private denial, duplicate queries, CSRF |
| Generated OpenAPI coverage | 83 paths / 96 operations; route/reference checks pass |
| Service load | 80 calls, zero errors, cache/event correctness verified |
| EXPLAIN | Intended indexes present; broad-search scan explicitly recorded |
| Synthetic logical restore | Pass; native recovery remains manual |
| npm audit | 0 vulnerabilities |
| Tracked secret-file guard | Pass |

Nonblocking tooling notices remain: Prisma's package.json config deprecation, Vitest config-loader notice and Next.js ESLint-plugin notice. Hosted CI/gitleaks has not been run by this session. Live R2, SMTP/Resend, VPS installation, full native backup/object restore and production HTTP capacity remain unverified; these are documented external checks rather than claimed successful deployment.
