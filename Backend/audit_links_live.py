"""
audit_links_live.py
--------------------
Unlike audit_links.py (which only checks that a referenced path exists as
a FILE on disk), this hits the actual running server for every internal
reference and checks the real HTTP status. This is the check that catches
routing bugs -- a file can exist on disk at the right path and still 404
if app.py's routing doesn't happen to serve that exact URL (exactly what
happened with /index.html).

Requires the server to already be running on http://127.0.0.1:5000.
"""
import re
import os
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_URL = "http://127.0.0.1:5000"
HTML_FILES = ["index.html"] + [f"pages/{f}" for f in os.listdir(os.path.join(ROOT, "pages")) if f.endswith(".html")]
JS_FILES = [f"js/{f}" for f in os.listdir(os.path.join(ROOT, "js")) if f.endswith(".js")]

SKIP_PREFIXES = ("http://", "https://", "#", "mailto:", "tel:", "/api/")
# Pages that only make sense with query params -- request them the way the
# site actually links to them, not bare.
NEEDS_PARAMS = {
    "/pages/branch.html": "?branch=civil",
    "/pages/semester.html": "?branch=civil&sem=1",
    "/pages/special-subject.html": "?branch=civil&sem=5&subject=open-electives-coe",
    "/pages/subjects.html": "?branch=civil&sem=1&subject=basic-engg-mathematics",
    "/pages/resources.html": "?branch=civil&sem=1&subject=basic-engg-mathematics&type=notes",
    "/pages/pdf-viewer.html": "?branch=civil&sem=1&subject=basic-engg-mathematics&type=notes&file=x.pdf",
}


def check_url(path):
    url = BASE_URL + path
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        return f"ERROR: {e}"


def extract_refs(path, content):
    static_content = re.sub(r"<script\b[^>]*>.*?</script>", "", content, flags=re.DOTALL)
    refs = set(re.findall(r'(?:href|src)="([^"]+)"', static_content))
    return refs


all_refs = set()
for rel in HTML_FILES:
    content = open(os.path.join(ROOT, rel)).read()
    all_refs |= extract_refs(rel, content)
    # Inline <script> blocks (page-specific bootstrapping code) reference
    # /pages/*.html as literal strings too -- scan the FULL content here,
    # not the script-stripped version extract_refs uses for href/src.
    for m in re.findall(r'(/pages/[a-zA-Z0-9\-]+\.html)', content):
        all_refs.add(m)

# Also pull /pages/*.html targets built dynamically in external JS files
# (Nav.buildUrl calls reference these page filenames as string literals
# even though the full query string is assembled at runtime).
for rel in JS_FILES:
    content = open(os.path.join(ROOT, rel)).read()
    for m in re.findall(r'(/pages/[a-zA-Z0-9\-]+\.html)', content):
        all_refs.add(m)

results = []
checked_paths = set()
for ref in sorted(all_refs):
    if ref.startswith(SKIP_PREFIXES):
        continue
    path = ref.split("?")[0].split("#")[0]
    test_path = path + NEEDS_PARAMS.get(path, "")
    if test_path in checked_paths:
        continue
    checked_paths.add(test_path)
    status = check_url(test_path)
    ok = status == 200
    results.append((test_path, status, ok))

print(f"Checked {len(results)} unique URLs against the live server.\n")
failures = [r for r in results if not r[2]]
for path, status, ok in results:
    marker = "OK " if ok else "FAIL"
    print(f"[{marker}] {status}  {path}")

print()
if failures:
    print(f"{len(failures)} BROKEN LINK(S) FOUND (file exists on disk but server doesn't serve it at this URL):")
    for path, status, ok in failures:
        print(f"  - {path} -> {status}")
else:
    print("No broken links -- every internal reference resolves correctly on the live server.")
