"""
audit_links.py
---------------
Scans every HTML file for local href="..."/src="..." references and confirms
each one resolves to a real file on disk (or a known dynamic route, like
/api/... or a page that requires query params). Run before every release.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND = os.path.join(ROOT, "frontend")
HTML_FILES = ["frontend/index.html"] + [f"frontend/pages/{f}" for f in os.listdir(os.path.join(FRONTEND, "pages")) if f.endswith(".html")]

# Things that are legitimately not on-disk files: external URLs, in-page
# anchors, API routes (dynamic), and mailto/tel links.
SKIP_PREFIXES = ("http://", "https://", "#", "mailto:", "tel:", "/api/")

problems = []
checked = 0

for rel_path in HTML_FILES:
    full_path = os.path.join(ROOT, rel_path)
    if not os.path.isfile(full_path):
        problems.append(f"{rel_path}: file listed but does not exist")
        continue
    content = open(full_path, "r", encoding="utf-8").read()

    # Only look at *static* attributes, not JS template strings inside <script>
    static_content = re.sub(r"<script\b[^>]*>.*?</script>", "", content, flags=re.DOTALL)

    refs = re.findall(r'(?:href|src)="([^"]+)"', static_content)
    for ref in refs:
        checked += 1
        if ref.startswith(SKIP_PREFIXES):
            continue
        target = ref.split("?")[0].split("#")[0]
        target_path = os.path.join(FRONTEND, target.lstrip("/"))
        if not os.path.isfile(target_path):
            problems.append(f"{rel_path}: broken reference '{ref}' -> expected {target_path}")

print(f"Checked {checked} static href/src references across {len(HTML_FILES)} HTML files.")
if problems:
    print(f"\n{len(problems)} PROBLEM(S) FOUND:")
    for p in problems:
        print(" -", p)
else:
    print("No broken static references found.")

# Cross-check: every page/js/css file mentioned by name in js/*.js
# (Nav.buildUrl / Api targets) also exists.
print()
js_dir = os.path.join(FRONTEND, "js")
page_names = set(os.listdir(os.path.join(FRONTEND, "pages")))
mentioned_pages = set()
for fname in os.listdir(js_dir):
    content = open(os.path.join(js_dir, fname)).read()
    for m in re.findall(r'/pages/([a-zA-Z0-9\-]+\.html)', content):
        mentioned_pages.add(m)

missing = mentioned_pages - page_names
print(f"Pages referenced by filename inside js/*.js: {sorted(mentioned_pages)}")
if missing:
    print(f"MISSING PAGES referenced in JS but not on disk: {missing}")
else:
    print("All JS-referenced page filenames exist on disk.")
