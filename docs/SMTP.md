# Epapers verification emails

Gmail SMTP uses `smtp.gmail.com`, port `587`, and `SMTP_SECURE=false` with **required STARTTLS**. The sender is `Epapers <the SMTP_USER account address>`. `SMTP_PASSWORD` must be a Google app password, not the normal account password. Google's app-password label can be **Epapers**; the sender name comes from `SMTP_FROM`.

Store these settings only in the ignored local `.env` or production secret manager. The Gmail adapter removes grouping spaces from app passwords. TLS certificate checks remain enabled, and connections have bounded timeouts. `SMTP_SECURE=false` on port 587 means TLS is established using STARTTLS before authentication. For implicit TLS on port 465, use `SMTP_SECURE=true` only if that connection validates on your network.

Verify connectivity and authentication without sending a message:

```powershell
npm.cmd run email:verify
```

Run the API and email worker in separate terminals:

```powershell
npm.cmd run dev
# In another terminal, from EpapersApi:
npm.cmd run worker
```

Registration and OTP resend enqueue encrypted email jobs; an API success response alone does not establish delivery. The worker prioritizes OTP jobs, retries failures, and expires OTP jobs after 10 minutes. The configured SMTP daily budget remains active. To test delivery, register your own disposable test account or resend its OTP, then enter the six-digit code received in the mailbox. No test email is sent by the connectivity probe.

Verification messages use **Epapers** in the sender, subject, and body, include a readable six-digit code, and explain the 10-minute expiry. Reset links use `APP_ORIGIN`; use the actual frontend HTTPS origin in production.

For `EAUTH` / SMTP 535, verify the account and app password locally. Google requires 2-Step Verification for app passwords; account restrictions can make them unavailable. For connection or certificate errors, check network access, trusted certificates, and the host/port/TLS pairing. Never disable TLS verification or include credentials in logs.

The live check on port 587 verified connectivity, TLS, and authentication with the locally configured app password. No email was sent; actual inbox delivery still requires registering/resending an OTP while the worker runs. Port 465 failed certificate-chain validation on this machine, so local configuration and templates use port 587 without weakening TLS checks.

The worker and probe use Node's `--use-system-ca` option to include the machine's existing trusted certificates. Use Node 24 or Node 22.19+ for these commands. No additional CA file is required for the verified local setup.

References: [Google app passwords](https://support.google.com/accounts/answer/185833), [Nodemailer Gmail setup](https://nodemailer.com/usage/using-gmail/), and [SMTP TLS and verification](https://nodemailer.com/smtp).
