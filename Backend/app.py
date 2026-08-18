"""
app.py
------
Entry point. Serves the frontend (index.html, css/, js/, pages/, assets/,
data/) and mounts the /api blueprint from routes.py.

Run with:
    python3 Backend/app.py
Then open:
    http://localhost:5000
"""
import os

from flask import Flask, send_from_directory, jsonify, request

from config import FRONTEND_DIR, ALLOWED_STATIC_DIRS, HOST, PORT, DEBUG
from routes import api

app = Flask(__name__, static_folder=None)
app.register_blueprint(api)


def _serve_404():
    # /api/* must always get a JSON error, even for a route that was never
    # registered at all -- a frontend (or any other API client) calling a
    # bad or mistyped endpoint should never have to handle an HTML page
    # where it expected JSON.
    if request.path.startswith("/api/"):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(os.path.join(FRONTEND_DIR, "pages"), "404.html"), 404


@app.route("/")
@app.route("/index.html")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/manifest.json")
def manifest():
    return send_from_directory(FRONTEND_DIR, "manifest.json")


@app.route("/robots.txt")
def robots():
    return send_from_directory(FRONTEND_DIR, "robots.txt")


@app.route("/<path:req_path>")
def static_files(req_path):
    """
    Serves everything the frontend needs (css/js/assets/pages/data) from
    the project root, while refusing to serve anything outside an explicit
    folder whitelist (so Backend/ source and the notes/pyq/practical trees
    are never reachable as plain static files -- PDFs only ever go out
    through the validated /api/pdf route).
    """
    top_level = req_path.split("/", 1)[0]
    if top_level not in ALLOWED_STATIC_DIRS:
        return _serve_404()

    real_root = os.path.realpath(FRONTEND_DIR)
    real_target = os.path.realpath(os.path.join(FRONTEND_DIR, req_path))
    if real_target != real_root and not real_target.startswith(real_root + os.sep):
        return _serve_404()
    if not os.path.isfile(real_target):
        return _serve_404()

    rel_dir = os.path.dirname(req_path)
    filename = os.path.basename(req_path)
    directory = os.path.join(FRONTEND_DIR, rel_dir) if rel_dir else FRONTEND_DIR
    response = send_from_directory(directory, filename)

    # data/*.json changes rarely (only when the curriculum is edited) but
    # should still be revalidated rather than trusted blindly; css/js/assets
    # only change on redeploy, so a real cache window is safe and speeds up
    # every subsequent page navigation (this is a many-page, no-bundler
    # site, so every nav re-requests these).
    if top_level == "data":
        response.headers["Cache-Control"] = "no-cache"
    else:
        response.headers["Cache-Control"] = "public, max-age=3600"
    return response


@app.errorhandler(404)
def handle_404(e):
    return _serve_404()


@app.after_request
def add_common_headers(response):
    # Baseline hardening -- none of this changes behavior for a normal
    # visitor, it only removes ambiguity for browsers/proxies/scanners.
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    # /api/resources and /api/health reflect live server/filesystem state
    # and must never be cached by the browser or an intermediate proxy --
    # that would directly break the "drop a PDF in, it appears immediately"
    # guarantee. (/api/pdf is left alone: Flask's send_file already sets a
    # correct ETag/Last-Modified per file, which is the right behavior
    # there.)
    if request.path in ("/api/resources", "/api/health"):
        response.headers["Cache-Control"] = "no-store"
    return response


if __name__ == "__main__":
    print(f"SBTE 2.0 running at http://localhost:{PORT}  (debug={DEBUG})")
    app.run(host=HOST, port=PORT, debug=DEBUG)
