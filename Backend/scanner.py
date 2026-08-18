"""
scanner.py
----------
Reads the notes/pyq/practical folders directly, live, on every request.
Nothing is pre-indexed or cached: drop a PDF into a subject's folder and
it appears on the website on the very next page load, with no restart
needed. This is the whole point of the "automatic detection" requirement.

Every function here takes already-validated path segments (produced by
utils.resolve_context, which only ever emits values that came from the
trusted curriculum JSON) and additionally re-checks with os.path.realpath
that the resolved location cannot escape its resource directory. This
matters even though path_parts are trusted, because it's a cheap, correct
safety net against future refactors.
"""
import os

from config import RESOURCE_DIRS, ALLOWED_EXTENSIONS


def _safe_join(base_dir, path_parts):
    """Join base_dir with path_parts and confirm the result is still
    inside base_dir. Returns the real path, or None if not."""
    real_base = os.path.realpath(base_dir)
    candidate = os.path.join(base_dir, *path_parts) if path_parts else base_dir
    real_candidate = os.path.realpath(candidate)
    if real_candidate != real_base and not real_candidate.startswith(real_base + os.sep):
        return None
    return real_candidate


def scan_pdfs(resource_type, path_parts):
    """Return a sorted list of PDF file descriptors found in the folder
    identified by path_parts, or [] if the type/folder is invalid/missing."""
    base_dir = RESOURCE_DIRS.get(resource_type)
    if not base_dir:
        return []

    folder = _safe_join(base_dir, path_parts)
    if not folder or not os.path.isdir(folder):
        return []

    results = []
    with os.scandir(folder) as it:
        for entry in it:
            try:
                if not entry.is_file():
                    continue
                ext = os.path.splitext(entry.name)[1].lower()
                if ext not in ALLOWED_EXTENSIONS:
                    continue
                stat = entry.stat()
            except OSError:
                # Unreadable / disappeared mid-scan / permission error on
                # this one entry -- skip it rather than failing the whole
                # listing over a single bad file.
                continue
            results.append({
                "filename": entry.name,
                "display_name": os.path.splitext(entry.name)[0],
                "size_kb": round(stat.st_size / 1024, 1),
                "modified": int(stat.st_mtime),
            })

    results.sort(key=lambda r: r["display_name"].lower())
    return results


def resolve_pdf_path(resource_type, path_parts, filename):
    """Resolve a single PDF's real path for streaming, or None if the
    request doesn't point at a real, in-bounds PDF file."""
    if not filename or "/" in filename or "\\" in filename or ".." in filename:
        return None
    if os.path.splitext(filename)[1].lower() not in ALLOWED_EXTENSIONS:
        return None

    base_dir = RESOURCE_DIRS.get(resource_type)
    if not base_dir:
        return None

    folder = _safe_join(base_dir, path_parts)
    if not folder or not os.path.isdir(folder):
        return None

    full_path = os.path.realpath(os.path.join(folder, filename))
    real_base = os.path.realpath(base_dir)
    if not full_path.startswith(real_base + os.sep):
        return None
    if not os.path.isfile(full_path):
        return None

    return full_path
