"""
config.py
---------
Central configuration. Every path is derived from this file's own location,
so the app behaves the same whether it's launched with `python app.py`,
`python backend/app.py`, or from a process manager with a different
working directory.
"""
import os

# backend/config.py -> parents[1] is the project root (SBTE-2.0/)
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)

# Frontend is isolated under frontend/ (index.html, css/, js/, pages/, assets/, data/)
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

# The three resource trees the scanner reads PDFs from
NOTES_DIR = os.path.join(ROOT_DIR, "notes")
PYQ_DIR = os.path.join(ROOT_DIR, "pyq")
PRACTICAL_DIR = os.path.join(ROOT_DIR, "practical")

RESOURCE_DIRS = {
    "notes": NOTES_DIR,
    "pyq": PYQ_DIR,
    "practical": PRACTICAL_DIR,
}

DATA_DIR = os.path.join(FRONTEND_DIR, "data")
CURRICULUM_PATH = os.path.join(DATA_DIR, "subjects.json")

ALLOWED_EXTENSIONS = {".pdf"}

# Top-level folders the static file server is allowed to serve from.
# Deliberately excludes backend/ (source code) and notes/pyq/practical
# (those are only ever served through the validated /api/pdf route).
ALLOWED_STATIC_DIRS = {"css", "js", "assets", "pages", "data"}

HOST = os.environ.get("SBTE_HOST", "0.0.0.0")
PORT = int(os.environ.get("SBTE_PORT", "5000"))
DEBUG = os.environ.get("SBTE_DEBUG", "true").lower() == "true"
