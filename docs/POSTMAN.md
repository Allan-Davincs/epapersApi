# Complete Postman configuration and tests

Import `EpapersApi/postman.json` as a Postman collection and `EpapersApi/postman/epapers.environment.json` as its environment. Select **EPapers local — fill values locally** before sending requests. The collection contains all 96 API operations, seven negative security cases, two CORS preflight checks and one direct R2 upload step: **106 requests total**. It was generated from the current API contract; no real credentials are included.

## Start and configure

Start the API with `npm run dev`, and start the worker separately with `npm run worker` when testing email, scanning, publication or cleanup. Local default baseUrl is `http://localhost:3001/api/v1`; change it to your reachable HTTPS API for cookie flows. Set appOrigin to the exact APP_ORIGIN from your local backend configuration. Do not copy DATABASE_URL, R2 keys, JWT secrets, encryption keys or SMTP passwords into Postman: the server owns these.

Fill secret environment values locally using Postman; do not export a filled environment into this repository or share tokens/signed URLs in screenshots. The committed template has empty credentials and token values. Postman's secret variable type masks values but is not a replacement for controlling environment exports or workspace access.

| Variable | Meaning |
|---|---|
| baseUrl | Complete API prefix, including `/api/v1`, without trailing slash. |
| appOrigin | Exact allowed SPA origin; added as Origin on JSON mutations. |
| username, email, password, fullName | Isolated contributor account registration/login values. Use a unique username/email for each new registration. |
| adminUsername, adminPassword | Credentials for an account manually assigned ADMIN. |
| adminEmailOtp | Six-digit code from the latest Epapers admin email; enter it locally before verification. |
| adminLoginChallengeToken, adminReauthChallengeToken | Captured automatically when login or action confirmation sends a code. |
| lecturerAccessToken | Verified-email lecturer access token; manually paste or obtain by logging in as that lecturer using username/password. |
| emailOtp, resetToken, newPassword | Values received from email and chosen reset password. Real worker/email delivery required. |
| accessToken, adminAccessToken | Captured from successful login/refresh according to returned role. Normal private routes use accessToken; admin routes use adminAccessToken. |
| reauthToken | Captured from `/auth/reauth/verify`; bound to that admin session and expires after five minutes. |
| departmentId, programId, moduleId, paperId | Selected UUIDs. Public list requests capture the first result only when a variable is empty. Clear/change them to select different records. |
| createdDepartmentId, createdProgramId, createdModuleId | Captured by admin create calls; curriculum PATCH/DELETE targets these dedicated test records. Existing seeded curriculum IDs are not selected automatically for edits/deletes. |
| targetUserId | Explicit isolated target for admin user detail/XP operations; never auto-selected from an admin user list. |
| sessionId | Explicit session UUID to inspect/revoke; select from the session-list response. |
| notificationId | Captured from your first notification if empty. |
| flagId, takedownId, moduleRequestId, contactId, verificationId, announcementId | Captured from matching creation receipts; manually select existing test IDs when exercising admin queues. |
| uploadKind | `exam` by default; set `marking_scheme` for a second PDF. Presign saves the new ID into examUploadId or markingSchemeUploadId accordingly. |
| uploadFilename, uploadSizeBytes | PDF filename and exact byte length of the selected File. Size is an unquoted JSON number. |
| uploadId, uploadUrl | Captured by presign; completion uses uploadId. URLs are secrets and expire. |
| examUploadId, markingSchemeUploadId | Completed owner-upload IDs. Submission body includes examUploadId; add markingSchemeUploadId manually for the optional second PDF. |
| programCode, csvText | Actual active program code and CSV text for import. Fill csvText with the exact header/rows below, including real newlines; the pre-request script renders a safely escaped JSON body. |
| xpGrantRequestId | UUID generated once per intended positive award. Reuse it on retries; use a new UUID only for a genuinely new award. |
| maxResponseMs | Configurable response-time assertion budget, default 10,000 ms; not a production capacity promise. |

lecturerUsername/lecturerPassword are optional scratch values: copy them into username/password before the regular login request, or enter that lecturer's token directly. loggedUserRole is captured for reference. Optional query fields appear disabled in the Params tab; enable only the filters you need. Cursor, status, period and other optional values are editable there. Unknown fields and duplicate query keys are rejected by the API.

## Runner gates and expected results

Defaults allow public reads, authenticated reads when credentials exist, login/reauth when their inputs exist, and negative tests. `allowMutations`, `allowExternalActions` and `allowDestructive` start as the exact string `false`. To run selected writes on disposable test data, set the necessary gates to `true`:

- allowMutations: all ordinary non-GET operations except login/reauth, including CSV preview, view/download counters and profile edits.
- allowExternalActions: registration/email/challenge-related calls, upload signing, submissions, reports and moderation review; this is additional to allowMutations. Direct R2 PUT also requires both.
- allowDestructive: DELETE, logout, reset-password, refresh rotation and restore, in addition to allowMutations.
- runNegativeTests: controls the separate negative folder; default `true`. These cases intentionally fail authorization/schema/CSRF before any business mutation occurs.

Missing required variables or disabled gates cause a pre-request **SKIPPED** message, with variable names only. A skipped request is not a successful test and does not prove that endpoint works. Postman supports skipping from pre-request scripts; see [execution documentation](https://learning.postman.com/v11/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-execution). Use a current Postman version supporting `pm.execution.skipRequest`. The configuration has not been executed by the real Postman client in this session.

Every successful API request expects **200**, JSON, a `{ data: ... }` envelope, the documented DTO, nosniff, a configurable latency budget, and no raw password/hash/TOTP/storage key leaks. Private responses must use no-store. Public catalog/profile DTOs must omit names/email/account status/XP. Negative tests expect their exact 401/403/422 status and the strict error DTO. Unexpected 409 FILE_NOT_READY or 429 rate limiting fails a success test; investigate prerequisites instead of treating errors as passing responses. The embedded checker covers the type/required/enum/constant/union/reference/array/pattern/bounds features used by these DTOs, not every possible JSON Schema keyword.

Assertions and variable capture run in post-response scripts; see [Postman test-script documentation](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts/). Secrets and signed URLs are never printed by these scripts. Postman's own console/history may retain request/response values; limit who can access that workspace.

## Test order and explanations

**00 Public catalog:** health, departments/programs/modules, paper search/recent/popular/detail, public profiles, public settings and active announcements. Lists capture initial IDs when empty. Seed provides departments/programs only, so modules/papers may be empty until created. Public download/view are POST calls, count events and require the mutation gate; only approved, clean, published files can download. `downloadUrl` captures the URL but does not fetch bytes automatically.

**01 User authentication:** register an isolated contributor/lecturer; run worker and receive email; verify using emailOtp; login to capture accessToken. Username availability is public. OTP/reset responses may be generic and do not prove an email was sent or an account exists. verify-otp/verify-email and resend-otp/verification/resend are aliases: choose one, not both for a single-use OTP. Forgot/reset require the appropriate email/reset values. No admin registration exists.

**02 Admin authentication:** enable `allowExternalActions` for requests that send email codes. provision a verified ADMIN account as described in ADMIN.md/DEPLOY.md. POST /auth/admin/login sends an email code and captures adminLoginChallengeToken, without a session. Set adminEmailOtp from that email, then POST /auth/admin/verify-login to capture adminAccessToken. POST /auth/reauth with the password sends a separate email code and captures adminReauthChallengeToken. Set adminEmailOtp to the new code and POST /auth/reauth/verify to capture reauthToken. Codes expire after ten minutes, allow five attempts and cannot be reused. Repeat the password request after 60 seconds to resend. Sensitive admin requests attach X-EPapers-Reauth automatically. A new login/refresh session can invalidate an old proof: reauthenticate again. No admin is seeded and the collection cannot bypass provisioning.

**03 Private account and leaderboard:** own profile, papers, sessions, achievements, notifications, export and authenticated leaderboard. Owner is determined by the token, not targetUserId. Profile PATCH changes bio by default and preserves omitted fields. Notification PATCH marks read; read-all affects only your account. Leaderboard exposes XP, while private/public profiles expose only levelTitle. Export has independent paperCursor/notificationCursor; follow each until null. Account DELETE requires your password and both mutation/destructive gates; it anonymizes and revokes the account and should be performed last on a throwaway user.

**04 Upload workflow:** choose an active module and a verified contributor/lecturer token. Set uploadFilename and uploadSizeBytes. Send presign; select that exact PDF in the R2 PUT request's Body > binary/file; send PUT; complete; then submit. The folder order includes duplicate-check, presign, PUT, complete, submission, but a Runner cannot supply your missing local file automatically. PUT uses no API bearer/CSRF headers; Postman sets Content-Length. Incoming must be private and valid R2 credentials configured on the server. The PDF must match size/content constraints. For a marking scheme, repeat presign/PUT/complete with uploadKind `marking_scheme`, then add its ID to submission. Duplicate is a warning. Wait for worker scan/moderation/publication; lecturer automatic approval is department-scoped. Collection runs do not automatically wait for these asynchronous transitions.

**06 Admin operations:** user list/detail/grants, paper queues/review, flags/takedowns/module requests, lecturer evidence review, contact inbox, audit, stats, announcements, structure CRUD/import and settings/security. Responses may contain authorized private identity/XP but never credentials. User PATCH example grants +1 XP with required reason/idempotency UUID; to test roles/status use the supported uppercase fields from ADMIN.md instead. Role/status/verification changes revoke affected sessions. Reviews approve/reject/spam/edit; rejection/spam require reason. Approved takedown hides a paper without deducting XP. Structure create stores dedicated IDs; program creation depends on createdDepartmentId and module creation on createdProgramId. Structure deletion with retained dependents returns 409; archive with isActive false instead. Paper delete hides immediately, restore only succeeds within retention and before purge begins. Audit has no update/delete endpoint. Settings PATCH example edits bannerMessage; leave lockdown/readOnly unchanged unless deliberately testing maintenance on an isolated API. Announcements have UTC visibility windows; the example starts in the past. CSV example is dryRun true, never an automatic import commit.

CSV header must be exact, with 1–50 rows:

```csv
code,name,programCode,semester,levelYear,credits
PMCSV01,"Networks, advanced",PMTESTPROG,1,2,4
```

PMTESTPROG is created by the admin program example; replace it with an actual active program code as appropriate. For a literal JSON body use `"csv": "code,name,programCode,semester,levelYear,credits\nPMCSV01,Networks,PMTESTPROG,1,2,4"`. Preview row errors; then intentionally change dryRun to false and send once. Repeating commits with existing codes fails. Clear/delete dependent test modules before deleting their program/department; create codes are fixed examples, so repeated create requests can legitimately return 409.

**07 Reports/contact:** flags, takedowns and contact require a valid bearer JWT. These examples use the accessToken captured during login. Submit module requests with matching program/department and an integer starting academic year. Creation captures receipt IDs; administrator resolution uses the queue and these IDs. Set supported enums/reasons/evidence in the Body tab; do not supply mock timestamps, usernames or arbitrary IDs.

**08 Lecturer verification:** sign in as a verified-email lecturer and request verification with active department/evidence. Review as admin with fresh reauth proof; approval sets verified scope and revokes lecturer sessions. Sign that lecturer in again before department-scoped uploads. Verified lecturers cannot submit another pending verification.

**90 Sessions/logout:** inspect active sessions; explicitly choose sessionId before revocation. Refresh rotates a single-use Secure refresh cookie; serialize calls. Postman cookie jar stores the last login's refresh cookie for that host, so login as the intended account immediately before testing refresh/logout. Separate tokens do not create separate cookie jars. Secure refresh cookies require HTTPS; HTTP local bearer calls can work while refresh fails. `logout-all` and revoking the current session invalidate subsequent requests. Run termination cases last and sign in again afterward.

**95 Negative security tests:** guests denied admin users/leaderboard (401), oversized/unknown/repeated query keys (422), wrong mutation Origin (403), admin registration rejected by role validation (422). These do not require live R2/email. Their deliberate input errors can still consume application rate limits. Do not run repeated high-volume collections against production; the API limits requests per IP/account.

The public folder also has an allowed-origin OPTIONS check expecting 204, the exact Access-Control-Allow-Origin and credentials enabled; the negative folder checks foreign-origin preflight returns 403 without an allow-origin header. These test API CORS, not browser R2 CORS. Normal JSON request bodies are rendered safely from variables, so embedded quotes in passwords and multiline CSV values do not break JSON. Edit request fields in the Body tab as needed; its pre-request script renders that current body safely. Regenerate to reset examples to the contract defaults.

Start with the public and negative folders. Then run authenticated reads. Run stateful writes individually in the order above, confirming real email/challenge/scan transitions, rather than assuming one full Runner pass can acquire OTP/email codes/challenges and a file automatically. Guest/contributor/lecturer/admin role denial, invalid reauth, ownership, unclean-file denial, double award and purge retries also have real integration coverage in `npm run test:db`; this collection's seven negatives are not a replacement for that suite.

## Rebuild and verify configuration

```text
npm run openapi
npm run postman
npm run check:postman
npm run lint
npm run typecheck
npm test
```

The generator reads OpenAPI, regenerates the collection and **blank template environment**, and refreshes the operation table below. Keep your populated environment as a separately named local Postman environment so regeneration cannot overwrite it. check:postman performs offline coverage/example/schema/script/gating/token-capture/privacy/error regression checks; it sends no HTTP requests and cannot validate real server responses, cookies, Postman runtime compatibility, SMTP or R2. Live execution remains dependent on your configured services; R2 setup was previously deferred.

See AUTH.md for cookies/authentication, ADMIN.md for exact administrative behavior, UPLOADS-MODERATION.md for storage/worker details, and openapi.yaml for full optional fields/enums. No API implementation or frontend changes are needed to import these files.

<!-- GENERATED OPERATIONS -->

## Complete operation reference

All success requests expect HTTP 200. The collection includes strict request examples and tests for each operation. Required path/query parameters are shown in each request; this table lists required JSON fields. Optional fields and enums are defined in OpenAPI.

| Method | Path (after /api/v1) | Authentication | Reauth | Required body fields |
|---|---|---|---|---|
| POST | /auth/reauth | Admin bearer | ? | password |
| POST | /auth/reauth/verify | Admin bearer | ? | challengeToken, code |
| POST | /auth/admin/verify-login | Public / optional bearer | ? | challengeToken, code |
| POST | /auth/register | Public / optional bearer | ? | username, email, password, fullName |
| POST | /auth/login | Public / optional bearer | ? | usernameOrEmail, password |
| POST | /auth/admin/login | Public / optional bearer | ? | usernameOrEmail, password |
| POST | /auth/verify-email | Public / optional bearer | ? | email, code |
| POST | /auth/verification/resend | Public / optional bearer | ? | email |
| POST | /auth/forgot-password | Public / optional bearer | ? | email |
| POST | /auth/reset-password | Public / optional bearer | ? | token, password |
| POST | /auth/change-password | User bearer | ? | currentPassword, password |
| POST | /auth/refresh | Refresh cookie | ? | {} / query only |
| POST | /auth/logout | Public / optional bearer | ? | {} / query only |
| POST | /auth/logout-all | User bearer | ? | {} / query only |
| GET | /auth/me | User bearer | ? | {} / query only |
| GET | /auth/username-availability | Public / optional bearer | ? | {} / query only |
| PATCH | /users/me | User bearer | ? | {} / query only |
| GET | /users/me/sessions | User bearer | ? | {} / query only |
| DELETE | /users/me/sessions/{id} | User bearer | ? | {} / query only |
| GET | /health | Public / optional bearer | ? | {} / query only |
| POST | /auth/verify-otp | Public / optional bearer | ? | email, code |
| POST | /auth/resend-otp | Public / optional bearer | ? | email |
| GET | /auth/sessions | User bearer | ? | {} / query only |
| DELETE | /auth/sessions/{id} | User bearer | ? | {} / query only |
| GET | /departments | Public / optional bearer | ? | {} / query only |
| GET | /programs | Public / optional bearer | ? | {} / query only |
| GET | /modules | Public / optional bearer | ? | {} / query only |
| GET | /papers | Public / optional bearer | ? | {} / query only |
| POST | /papers | User bearer | ? | moduleId, category, academicYear, semester, title, examUploadId |
| GET | /papers/recent | Public / optional bearer | ? | {} / query only |
| GET | /papers/popular | Public / optional bearer | ? | {} / query only |
| GET | /departments/{id} | Public / optional bearer | ? | {} / query only |
| GET | /programs/{id} | Public / optional bearer | ? | {} / query only |
| GET | /modules/{codeOrId} | Public / optional bearer | ? | {} / query only |
| GET | /papers/{id} | Public / optional bearer | ? | {} / query only |
| GET | /users/by-username/{username} | Public / optional bearer | ? | {} / query only |
| POST | /uploads/presign | User bearer | ? | filename, contentType, sizeBytes |
| POST | /uploads/{id}/complete | User bearer | ? | {} / query only |
| POST | /papers/duplicate-check | User bearer | ? | moduleId, category, academicYear, semester |
| POST | /papers/{id}/download-url | Public / optional bearer | ? | {} / query only |
| POST | /papers/{id}/view | Public / optional bearer | ? | {} / query only |
| GET | /users/me/papers | User bearer | ? | {} / query only |
| GET | /admin/papers | Admin bearer | ? | {} / query only |
| GET | /admin/papers/{id} | Admin bearer | ? | {} / query only |
| DELETE | /admin/papers/{id} | Admin bearer | Yes | reason |
| PATCH | /admin/papers/{id}/review | Admin bearer | ? | action |
| POST | /admin/papers/{id}/download-url | Admin bearer | ? | {} / query only |
| GET | /leaderboard | User bearer | ? | {} / query only |
| GET | /users/me/achievements | User bearer | ? | {} / query only |
| GET | /notifications | User bearer | ? | {} / query only |
| PATCH | /notifications/{id} | User bearer | ? | read |
| POST | /notifications/read-all | User bearer | ? | {} / query only |
| GET | /admin/users/{id}/xp-ledger | Admin bearer | ? | {} / query only |
| POST | /flags | User bearer | ? | paperId, reason |
| GET | /admin/flags | Admin bearer | ? | {} / query only |
| PATCH | /admin/flags/{id} | Admin bearer | ? | status, note |
| POST | /takedowns | User bearer | ? | paperId, requesterFullName, requesterEmail, affiliation, reason |
| GET | /admin/takedowns | Admin bearer | ? | {} / query only |
| PATCH | /admin/takedowns/{id} | Admin bearer | ? | status, note |
| POST | /module-requests | Public / optional bearer | ? | departmentId, programId, moduleCode, moduleName, academicYear, semester, description |
| GET | /admin/module-requests | Admin bearer | ? | {} / query only |
| PATCH | /admin/module-requests/{id} | Admin bearer | ? | status, note |
| GET | /admin/users | Admin bearer | ? | {} / query only |
| GET | /admin/users/{id} | Admin bearer | ? | {} / query only |
| PATCH | /admin/users/{id} | Admin bearer | Yes | reason |
| GET | /admin/settings | Admin bearer | ? | {} / query only |
| PATCH | /admin/settings | Admin bearer | Yes | reason |
| GET | /admin/security | Admin bearer | ? | {} / query only |
| PATCH | /admin/security | Admin bearer | Yes | reason |
| GET | /settings/public | Public / optional bearer | ? | {} / query only |
| GET | /admin/audit-logs | Admin bearer | ? | {} / query only |
| GET | /admin/dashboard/stats | Admin bearer | ? | {} / query only |
| POST | /lecturer/verifications | Lecturer bearer | ? | departmentId, evidence |
| GET | /admin/lecturer-verifications | Admin bearer | ? | {} / query only |
| PATCH | /admin/lecturer-verifications/{id} | Admin bearer | Yes | status, reason |
| POST | /admin/papers/{id}/restore | Admin bearer | Yes | reason |
| GET | /admin/departments | Admin bearer | ? | {} / query only |
| POST | /admin/departments | Admin bearer | ? | code, name, reason |
| PATCH | /admin/departments/{id} | Admin bearer | ? | reason |
| DELETE | /admin/departments/{id} | Admin bearer | Yes | reason |
| GET | /admin/programs | Admin bearer | ? | {} / query only |
| POST | /admin/programs | Admin bearer | ? | departmentId, code, name, level, awardTitle, reason |
| PATCH | /admin/programs/{id} | Admin bearer | ? | reason |
| DELETE | /admin/programs/{id} | Admin bearer | Yes | reason |
| GET | /admin/modules | Admin bearer | ? | {} / query only |
| POST | /admin/modules | Admin bearer | ? | programId, code, name, semester, reason |
| PATCH | /admin/modules/{id} | Admin bearer | ? | reason |
| DELETE | /admin/modules/{id} | Admin bearer | Yes | reason |
| POST | /admin/modules/import | Admin bearer | ? | csv, reason |
| GET | /admin/health | Admin bearer | ? | {} / query only |
| GET | /admin/announcements | Admin bearer | ? | {} / query only |
| POST | /admin/announcements | Admin bearer | ? | title, content, startsAt, reason |
| PATCH | /admin/announcements/{id} | Admin bearer | ? | reason |
| DELETE | /admin/announcements/{id} | Admin bearer | Yes | reason |
| GET | /announcements/active | Public / optional bearer | ? | {} / query only |
| POST | /contact-messages | User bearer | ? | senderName, senderEmail, subject, message |
| GET | /admin/contact-messages | Admin bearer | ? | {} / query only |
| PATCH | /admin/contact-messages/{id} | Admin bearer | ? | status, reason |
| GET | /users/me/export | User bearer | ? | {} / query only |
| DELETE | /users/me/account | User bearer | ? | password |
