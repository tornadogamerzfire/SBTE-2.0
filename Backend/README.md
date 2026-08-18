# Backend

A small Flask app with exactly two jobs: **scan a folder for PDFs**, and **stream one PDF**. Everything else the site needs (curriculum browsing, search) is static JSON served straight from `../data/`.

## Files

| File | Role |
|---|---|
| `app.py` | Entry point. Serves the frontend and mounts the API. Run this. |
| `config.py` | All paths, derived from this file's own location — works no matter what directory you launch it from. |
| `routes.py` | The entire API: `/api/resources`, `/api/pdf`, `/api/health`. |
| `utils.py` | Loads `data/subjects.json` and resolves a branch/semester/subject/elective combination against it. This is the security boundary — see below. |
| `scanner.py` | Reads a folder's PDFs live, on every request. No caching, no pre-indexing — that's what makes "just drop a PDF in" work. |
| `build_curriculum.py` | Generates `data/subjects.json` from hand-written curriculum data. Re-run after editing the curriculum. |
| `setup_folders.py` | Creates every `notes/pyq/practical` subject folder from `data/subjects.json`. Safe to re-run any time — never deletes or overwrites anything. |
| `audit_links.py` | Dev tool: checks every `href`/`src` in the frontend resolves to a real *file on disk*. Fast, no server needed. Not needed to run the site. |
| `audit_links_live.py` | Dev tool: checks every internal link against the *actual running server*. Needs `python3 app.py` running first. This is the one that matters — a path can exist as a file and still 404 if app.py's routing doesn't happen to serve that exact URL (this caught a real bug: `/index.html` itself, used all over the site as the "home" link, was never actually wired up — only bare `/` was). Run this after any change to routing or to any page's links. |
| `_gen_logo.py` | One-off script that generated `assets/logo.jpg`. Not needed at runtime. |

A note on how these bugs were found: HTTP status checks, HTML/JS syntax validation, and disk-based link checks all passed while the site still had a blank hero section, a duplicated nav in the header, and six broken "home" links — none of that class of bug is visible to those checks, because they never actually execute the page's JavaScript against a real DOM the way a browser does. Catching them took loading the real pages through jsdom (a JS-engine-level DOM implementation) with the actual CSS and JS files, running them to completion, and inspecting the resulting element state directly — closer to what a real browser produces than anything achievable with curl and a parser alone.

## Running it

```bash
pip install -r requirements.txt
python3 app.py
```

Environment variables (all optional):

| Variable | Default | Purpose |
|---|---|---|
| `SBTE_HOST` | `0.0.0.0` | Interface to bind |
| `SBTE_PORT` | `5000` | Port |
| `SBTE_DEBUG` | `true` | Flask debug mode + autoreload. **Set to `false` before exposing this to anyone but yourself** — the debugger allows arbitrary code execution if it's reachable publicly. |

## API

**`GET /api/resources`** — list the PDFs available for one subject.
Query params: `branch`, `sem`, `subject`, `type` (`notes`/`pyq`/`practical`), and `elective` (only for elective-group subjects).

```
GET /api/resources?branch=civil&sem=1&subject=basic-engg-mathematics&type=notes
→ { "branch": "...", "semester": 1, "subject": "...", "count": 2, "files": [ { "filename": "...", "display_name": "...", "size_kb": 812.4, "modified": 1755600000 }, ... ] }
```

**`GET /api/pdf`** — stream one PDF. Same query params as above, plus `file` (the exact filename from `/api/resources`).

**`GET /api/health`** — `{ "status": "ok" }`.

Any other `/api/...` path that doesn't match one of these three always gets a JSON `{"error": "Not found"}` with a 404 status — never an HTML page — so a frontend (or any other API client) never has to guess which content type a failed request came back as.

## Response headers

Every response gets three standard hardening headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`) that don't change behavior for a normal visitor. Caching is deliberately split three ways:

- `css/`, `js/`, `assets/` — `Cache-Control: public, max-age=3600`. These only change on redeploy, and this is a many-page site with no bundler, so every navigation re-requests them.
- `data/*.json` — `Cache-Control: no-cache` (always revalidates via the ETag Flask sets automatically; cheap 304 if unchanged).
- `/api/resources` and `/api/health` — `Cache-Control: no-store`. These reflect live filesystem state; caching them would directly break the "drop a PDF in, it appears immediately" guarantee.
- `/api/pdf` is left to Flask's own default `ETag`/`Last-Modified` handling, which is already correct for a file that only changes when someone replaces it.

## Why the API surface is this small

Per the brief, the backend's job is specifically to scan PDFs from folders and serve them automatically. Branch/semester/subject browsing and search don't need a server round-trip — the frontend fetches `data/subjects.json` once and does all of that client-side. Keeping the server-rendered surface to two real routes means there's very little here that can break.

## Security model

Every value in a request (`branch`, `subject`, `elective`, `file`, ...) is either:

1. **Looked up against `data/subjects.json`** (`utils.resolve_context`) — if it doesn't match a known branch/semester/subject/elective exactly, the request 404s before anything is read from disk. The actual folder path used is always built from the *matched entry's* trusted `folder` field, never from the raw request string.
2. **Re-verified with `os.path.realpath`** (`scanner._safe_join`, `scanner.resolve_pdf_path`) to confirm the resolved path is still inside the intended `notes/`/`pyq/`/`practical` directory, as a second independent check.
3. For `file` specifically: rejected outright if it contains `/`, `\`, or `..`, and rejected unless its extension is `.pdf`.

The static file server (`app.py`) only serves from an explicit whitelist of top-level folders (`css`, `js`, `assets`, `pages`, `data`) — `Backend/` itself and the `notes`/`pyq`/`practical` trees are never reachable as plain static files, only through the validated `/api/pdf` route.

This was tested directly (path traversal via `file=`, `..` in a branch name, mismatched branch/semester/subject/elective combinations, wrong resource type, non-PDF extensions) — all correctly rejected with 400/404 rather than exposing anything outside the intended folders.
