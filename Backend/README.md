# SBTE 2.0 Production Backend

This directory contains the production Cloudflare Worker API for SBTE 2.0.

The production architecture from the project plan is:

```text
Cloudflare Pages frontend
        |
        | GET /api/*
        v
Cloudflare Worker
        |
        | R2 binding: SBTE_PDFS
        v
Cloudflare R2
  ├── notes/
  ├── pyq/
  └── practical/
```

The Worker replaces the filesystem-dependent part of the old Flask backend. It does not run Flask, does not read `notes/`, `pyq/`, or `practical/` from the repository, and does not fetch PDFs from GitHub.

## Files

| File | Purpose |
|---|---|
| `worker.js` | Cloudflare Worker implementation and the complete production API |
| `wrangler.toml` | Wrangler configuration and the `SBTE_PDFS` R2 binding |
| `README.md` | This deployment/API/security documentation |

The older Python files in this directory remain available in the repository for local development unless you explicitly remove them later. This production backend does not depend on them.

## API contract

The frontend API contract is preserved exactly:

### `GET /api/health`

Response:

```json
{"status":"ok"}
```

### `GET /api/resources`

Required query parameters:

- `branch`
- `sem`
- `subject`
- `type`

Optional:

- `elective`

Allowed `type` values:

- `notes`
- `pyq`
- `practical`

Example:

```text
/api/resources?branch=civil&sem=1&subject=basic-engg-mathematics&type=notes
```

Response shape:

```json
{
  "type": "notes",
  "branch": "Civil Engineering",
  "semester": 1,
  "subject": "Basic Engg. Mathematics",
  "elective": null,
  "count": 2,
  "files": [
    {
      "filename": "Unit 1 - Differential Calculus.pdf",
      "display_name": "Unit 1 - Differential Calculus",
      "size_kb": 812.4,
      "modified": 1755600000
    }
  ]
}
```

The list is generated live from R2 using an exact prefix, so uploading a new PDF to the correct R2 location makes it appear without rebuilding or redeploying the frontend.

### `GET /api/pdf`

Required query parameters:

- `branch`
- `sem`
- `subject`
- `type`
- `file`

Optional:

- `elective`

Example:

```text
/api/pdf?branch=civil&sem=1&subject=basic-engg-mathematics&type=notes&file=Unit%201%20-%20Differential%20Calculus.pdf
```

The response is the PDF itself with `Content-Type: application/pdf` and `Content-Disposition: inline`, so the browser can open the PDF viewer instead of forcing a download.

Byte-range requests are supported for PDF viewers. Invalid ranges return HTTP 416 with an appropriate `Content-Range` header.

## R2 bucket structure

R2 is object storage, so these are object-key prefixes rather than real filesystem directories.

Normal subject:

```text
notes/Civil Engineering/Semester 1/Basic Engg. Mathematics/<file>.pdf
pyq/Civil Engineering/Semester 1/Basic Engg. Mathematics/<file>.pdf
practical/Civil Engineering/Semester 1/Basic Engg. Mathematics/<file>.pdf
```

Elective subject:

```text
notes/Civil Engineering/Semester 5/Open Electives - COE/Artificial Intelligence (Basic)/<file>.pdf
pyq/Civil Engineering/Semester 5/Open Electives - COE/Artificial Intelligence (Basic)/<file>.pdf
practical/Civil Engineering/Semester 5/Open Electives - COE/Artificial Intelligence (Basic)/<file>.pdf
```

Use the exact folder names already represented by the project's curriculum. Do not rename folders casually, because the Worker constructs R2 prefixes from its trusted curriculum mapping.

## Validation and security model

The Worker does not trust request values as filesystem or R2 paths.

For every resource/PDF request it:

1. Validates `type`.
2. Validates `branch`, `sem`, and `subject` against the trusted curriculum mapping embedded in `worker.js`.
3. Validates electives against the exact elective list for special subjects.
4. Rejects an elective on a normal subject.
5. Builds the R2 prefix only from trusted curriculum folder values.
6. Allows the requested PDF filename only when it is a single filename component ending in `.pdf`.
7. Rejects `/`, `\\`, `..`, blank filenames, and non-PDF filenames.
8. Fetches only the constructed R2 object key.
9. Never exposes an arbitrary R2 prefix or object key.
10. Returns JSON for all `/api/*` errors.

HTTP status usage:

| Status | Meaning |
|---:|---|
| `200` | Successful API response |
| `204` | Successful CORS preflight |
| `400` | Invalid parameters |
| `404` | Valid request structure but route/context/PDF does not exist |
| `405` | Unsupported HTTP method |
| `416` | Invalid/unsatisfiable PDF byte range |
| `500` | Unexpected Worker/R2 error |

## CORS

Production frontend:

```text
https://sbte-2-0.pages.dev
```

Local development origins allowed by the Worker:

```text
http://localhost:5000
http://127.0.0.1:5000
```

The Worker does not use wildcard `Access-Control-Allow-Origin: *`.

The Worker also responds to `OPTIONS` requests for CORS preflight.

## Configure R2

First create the bucket in Cloudflare R2. Bucket names must be lowercase and may contain letters, numbers, and hyphens.

Example:

```bash
npx wrangler login
npx wrangler r2 bucket create sbte-2-0-pdfs
```

Then update `backend/wrangler.toml`:

```toml
[[r2_buckets]]
binding = "SBTE_PDFS"
bucket_name = "sbte-2-0-pdfs"
```

Do not put an R2 access key, secret key, or API token into `worker.js`. The Worker receives the bucket through the R2 binding.

## Upload PDF trees to R2

The required keys are the paths under:

```text
notes/
pyq/
practical/
```

The R2 dashboard can be used for uploads. For large uploads, use Wrangler or another S3-compatible tool.

After a PDF exists at the correct key, test its corresponding `/api/resources` endpoint. No frontend build is required for resource discovery.

## Local Worker testing

From the `backend/` directory, with Wrangler installed:

```bash
npx wrangler dev
```

The local Worker should expose the API on the Wrangler development URL.

Test health:

```bash
curl http://127.0.0.1:8787/api/health
```

Test a resource list:

```bash
curl "http://127.0.0.1:8787/api/resources?branch=civil&sem=1&subject=basic-engg-mathematics&type=notes"
```

Test a PDF:

```bash
curl -I "http://127.0.0.1:8787/api/pdf?branch=civil&sem=1&subject=basic-engg-mathematics&type=notes&file=Unit%201%20-%20Differential%20Calculus.pdf"
```

The exact local port may differ depending on Wrangler's output.

For a local Worker that should use a remote R2 bucket, use the Wrangler remote/R2 configuration appropriate to your Cloudflare account. Do not commit secrets.

## Deploy

From `backend/`:

```bash
npx wrangler deploy
```

Wrangler reads `wrangler.toml`, binds `SBTE_PDFS`, and deploys `worker.js`.

After deployment, Cloudflare will provide the Worker URL, typically similar to:

```text
https://sbte-2-0-api.<your-subdomain>.workers.dev
```

Use the actual URL shown by Wrangler. Do not guess it.

## Frontend connection

The current frontend still uses the relative API base:

```js
const API_BASE = "/api";
```

Do not hardcode a guessed Worker URL into the frontend before the Worker has actually been deployed.

After the Worker is deployed and verified, update the frontend API base to the real Worker origin. That is a separate frontend change and is intentionally not included in this backend-only package.

## Production checklist

Before switching the public frontend to this Worker:

- Create the R2 bucket.
- Upload `notes/`, `pyq/`, and `practical/` object keys to R2.
- Replace the bucket placeholder in `wrangler.toml`.
- Run `npx wrangler dev` and verify the three API endpoints.
- Deploy with `npx wrangler deploy`.
- Verify the deployed `/api/health`.
- Verify at least one `/api/resources` query for each resource type.
- Verify `/api/pdf` opens a real PDF.
- Verify an invalid branch/subject/elective is rejected.
- Verify a traversal filename such as `../secret.pdf` is rejected.
- Upload one additional PDF to an existing R2 prefix and confirm it appears in `/api/resources` without redeploying.

## Important scope boundary

This Worker is intentionally an API only.

It does not:

- serve the frontend HTML/CSS/JS;
- serve repository files;
- serve arbitrary R2 objects;
- upload files;
- delete files;
- process PDFs;
- run OCR;
- authenticate users;
- use a database;
- require Flask/FastAPI/Express;
- fetch curriculum data from GitHub at runtime.
