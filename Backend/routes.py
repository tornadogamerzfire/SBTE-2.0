"""
routes.py
---------
The backend's entire job, per the brief, is "scan PDFs directly from
folders and show them automatically" -- so that's the entire API surface:

  GET /api/resources   list the PDFs available for a branch/sem/subject
  GET /api/pdf         stream one specific PDF
  GET /api/health      trivial liveness check

Curriculum browsing (branches/semesters/subjects) is served as plain
static JSON from /frontend/data/*.json since it doesn't change per-request, and
search runs entirely client-side against that same JSON. Keeping the
server-rendered surface this small means there's very little here that
can go wrong.
"""
from flask import Blueprint, jsonify, request, send_file, abort

from utils import resolve_context
from scanner import scan_pdfs, resolve_pdf_path

api = Blueprint("api", __name__, url_prefix="/api")

VALID_TYPES = {"notes", "pyq", "practical"}


def _parse_common_args(args):
    branch_id = (args.get("branch") or "").strip()
    subject_id = (args.get("subject") or "").strip()
    elective_id = (args.get("elective") or "").strip() or None
    rtype = (args.get("type") or "").strip()

    sem_raw = args.get("sem")
    try:
        sem_number = int(sem_raw) if sem_raw is not None else None
    except (TypeError, ValueError):
        sem_number = None

    return branch_id, sem_number, subject_id, elective_id, rtype


@api.get("/health")
def health():
    return jsonify({"status": "ok"})


@api.get("/resources")
def resources():
    branch_id, sem_number, subject_id, elective_id, rtype = _parse_common_args(request.args)

    if rtype not in VALID_TYPES:
        abort(400, description="type must be one of: notes, pyq, practical")
    if not branch_id or sem_number is None or not subject_id:
        abort(400, description="branch, sem and subject are required")

    ctx = resolve_context(branch_id, sem_number, subject_id, elective_id)
    if not ctx:
        abort(404, description="That branch/semester/subject combination was not found")

    files = scan_pdfs(rtype, ctx["path_parts"])

    return jsonify({
        "type": rtype,
        "branch": ctx["branch"]["name"],
        "semester": ctx["semester"]["number"],
        "subject": ctx["subject"]["name"],
        "elective": ctx["elective"]["name"] if ctx["elective"] else None,
        "count": len(files),
        "files": files,
    })


@api.get("/pdf")
def pdf():
    branch_id, sem_number, subject_id, elective_id, rtype = _parse_common_args(request.args)
    filename = (request.args.get("file") or "").strip()

    if rtype not in VALID_TYPES:
        abort(400, description="type must be one of: notes, pyq, practical")
    if not branch_id or sem_number is None or not subject_id or not filename:
        abort(400, description="branch, sem, subject and file are required")

    ctx = resolve_context(branch_id, sem_number, subject_id, elective_id)
    if not ctx:
        abort(404, description="That branch/semester/subject combination was not found")

    path = resolve_pdf_path(rtype, ctx["path_parts"], filename)
    if not path:
        abort(404, description="PDF not found")

    return send_file(path, mimetype="application/pdf", as_attachment=False, download_name=filename)


@api.errorhandler(400)
def bad_request(e):
    return jsonify({"error": e.description}), 400


@api.errorhandler(404)
def not_found(e):
    return jsonify({"error": e.description or "Not found"}), 404
