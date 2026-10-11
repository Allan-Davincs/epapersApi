# Browser PDF upload CORS

The frontend requests `/api/v1/uploads/presign` from Heroku, uploads PDF bytes directly to the returned R2 URL with PUT, then calls `/uploads/{uploadId}/complete`. A successful presign does not verify bucket CORS or upload permission. A browser storage error occurs outside Heroku, so the failed PUT is absent from Heroku logs.

## Applied fix and evidence

On 11 October 2026, the incoming bucket configured in the local backend `.env` rejected the upload preflight for `https://epapers.15botyear.workers.dev` with HTTP 403. The `epapers-browser-upload` CORS rule was applied to that bucket, retaining existing rules. After propagation, the signed-URL OPTIONS check returned HTTP 204 with the required origin, method and headers. No object was uploaded by this check; a full authenticated browser upload is still needed to verify PUT, completion and worker scanning.

## Configuration and verification

From `EpapersApi`, with the correct bucket credentials and APP_ORIGIN in local `.env`:

```powershell
npm.cmd run r2:cors:check
npm.cmd run r2:cors:apply
npm.cmd run r2:cors:check
```

The apply command uses the S3-compatible API to read the current CORS rules and add or replace its own named rule. It only changes the incoming bucket. Credentials must permit reading and setting bucket CORS; an authorization failure requires a suitably scoped credential or dashboard configuration. The script normalizes APP_ORIGIN to scheme/host/port, without a trailing slash. It does not print credentials or signed URLs. It does not upload test PDFs or change public bucket access.

CORS changes can take up to 30 seconds to propagate. If the immediate check after apply fails, rerun the check after propagation. Re-running apply retains other rules and replaces this rule rather than duplicating it.

Alternatively, open Cloudflare Dashboard → R2 → the incoming bucket identified by R2_INCOMING_BUCKET → Settings → CORS Policy. Add the rule in [r2-incoming-cors.json](../deploy/r2-incoming-cors.json) alongside any existing rules. Use the exact frontend origin when the frontend hostname changes:

```json
[
  {
    "AllowedOrigins": ["https://epapers.15botyear.workers.dev"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "Content-Length", "If-None-Match"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

Do not add OPTIONS to AllowedMethods; R2 handles preflight for the allowed PUT operation. The browser sends Content-Length automatically from the File body. The frontend removes it from explicitly supplied headers, while preserving application/pdf and If-None-Match: *. Keep the bucket private: CORS permits browser requests but does not replace signed-URL authentication.

## Browser acceptance check

Reload the frontend and upload a small valid PDF. In DevTools Network, expect presign 200, R2 OPTIONS 2xx, R2 PUT 2xx, then upload completion success. Do not share a full signed URL in logs or screenshots. Verify the paper submission and worker scan separately. The R2 configuration fix is effective immediately after propagation; redeploy the frontend to include the clearer upload error messages.

If OPTIONS passes but PUT fails, inspect the storage response for expired URL, signature mismatch or write permissions. URLs expire after five minutes; retry with a fresh presign. If fetch has no readable response, check Console for CORS, DNS/TLS or connectivity failures. A successful preflight alone does not prove object write authorization.

Reference: [Cloudflare R2 CORS documentation](https://developers.cloudflare.com/r2/buckets/cors/).
