# Remaining operator and live-service checks

Implementation and repeatable local checks are complete for Phases 6–8. These external steps remain pending; credentials stay in local deployment files.

- Configure working private R2 endpoint/keys/incoming/published buckets, as deferred by the user. Apply exact SPA-origin CORS and verify browser PUT, complete, streaming scan, copy, signed GET, Range requests, hide/restore and expired-object purge with real PDFs. Current adapter tests isolate storage; load checks sign metadata URLs without transferring objects.
- Configure SMTP app-password or Resend, sending identity/domain records and real Turnstile hostname/secret. Verify OTP/reset/review delivery, challenge rejection, daily budget deferral and retry. Automated integration tests never send email.
- Provision VPS/TLS/Nginx/API/worker/systemd, Cloudflare DNS/WAF/cache and origin firewall. Validate `nginx -t` and actual Linux service startup. Templates have not been installed on a host.
- Verify flagged DIT program/campus assignments against the prospectus and load approved module CSVs. Seed contains only departments/programs.
- Create a verified account and bootstrap the first admin with a fresh authenticator secret using the documented operator script. No admin/password is seeded. Additional admin enrollment and any lost-TOTP recovery require a trusted operator; there is no public TOTP reset endpoint.
- Establish native CockroachDB backups plus private object copies and separate encryption-key backup. Run a full isolated native recovery, measure RPO/RTO and record sign-off. The successful synthetic logical drill does not validate native backups or object recovery. No automatic backup-trigger job was added.
- Choose/install a real malware scanning provider if required. Current PDF edge/content/hash checks do not establish antivirus protection.
- Run production-shaped HTTP/Cloudflare/R2 throughput tests from the VPS region and define latency/error targets. The recorded 3,000-paper load run uses service calls over the development-to-CockroachDB network and local signing; it is not a production capacity promise.
- Review data-retention policy for tombstone accounts, positive XP/ledger/audit records, historical handles, free-text reports and backups. Terminal email ciphertext is cleared after seven days; retained papers purge after the configured window.
- Run hosted CI/gitleaks with repository credentials. Local lint/types/tests/build/dependency audit/secret guard results are recorded in PHASES.md; no hosted workflow success is claimed.
- Replace the frontend mock services using FRONTEND-INTEGRATION.md and perform browser acceptance tests. Frontend code remains unchanged.
