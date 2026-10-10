# JWT authentication replaces Turnstile

Turnstile is removed for now. No widget script, CAPTCHA token, Siteverify request, or Turnstile secret is required. The Cloudflare dashboard widget was not deleted.

Contact messages, flags, and takedowns require a valid bearer JWT from the existing login endpoint. Registration, login, OTP, and password recovery remain public so an account can be created or recovered; rate limits, input validation, and Origin/header CSRF checks remain active.

## Frontend

Set VITE_API_BASE_URL to the deployed API URL including /api/v1 (default http://localhost:3001/api/v1). Sign in with a real API account to obtain an access JWT. The frontend keeps it in memory and sends Authorization: Bearer on protected form requests. Demo account switching does not issue JWTs. After refreshing the page or expiry, sign in again. Other catalogue/moderation views still use the existing demo service.

## Postman

Import the regenerated postman.json and blank environment. Login captures accessToken. Send it as a Bearer token for POST /contact-messages, /flags, and /takedowns. Do not send turnstileToken; strict schemas reject unknown fields. Saved environments can remove that variable. See POSTMAN.md for all request setup.

## Configuration

TURNSTILE_SECRET and VITE_TURNSTILE_SITE_KEY have been removed from local configuration and templates. JWT signing, refresh-token, and encryption secrets remain server-only. APP_ORIGIN still controls the permitted browser origin. Cloudflare R2 remains in use.
