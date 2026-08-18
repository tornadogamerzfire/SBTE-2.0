"""
utils.py
--------
Loads the curriculum (data/subjects.json) and resolves branch/semester/
subject/elective combinations against it. This is the security boundary
for the whole backend: every folder path the scanner ever touches is built
exclusively from fields that came out of this trusted JSON file, never
directly from a request parameter. A request parameter is only ever used
to *look up* an entry; if it doesn't match anything, resolution fails and
nothing is read from disk.
"""
import json
from functools import lru_cache

from config import CURRICULUM_PATH


@lru_cache(maxsize=1)
def get_curriculum():
    """Cached read of data/subjects.json. Restart the server after editing
    the curriculum (or call get_curriculum.cache_clear())."""
    with open(CURRICULUM_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def find_branch(branch_id):
    if not branch_id:
        return None
    for b in get_curriculum()["branches"]:
        if b["id"] == branch_id:
            return b
    return None


def find_semester(branch, sem_number):
    if branch is None or sem_number is None:
        return None
    for s in branch["semesters"]:
        if s["number"] == sem_number:
            return s
    return None


def find_subject(semester, subject_id):
    if semester is None or not subject_id:
        return None
    for subj in semester["subjects"]:
        if subj["id"] == subject_id:
            return subj
    return None


def find_elective(subject, elective_id):
    if subject is None or not elective_id:
        return None
    for e in subject.get("electives", []):
        if e["id"] == elective_id:
            return e
    return None


def resolve_context(branch_id, sem_number, subject_id, elective_id=None):
    """
    Validate a (branch, semester, subject[, elective]) combination against
    the curriculum and, if valid, return the resolved objects plus the
    filesystem-safe path segments to reach that subject's folder.

    Returns None if any part of the chain doesn't match the curriculum --
    including a missing elective_id for a 'special' subject, or an
    elective_id supplied for a 'normal' subject.
    """
    branch = find_branch(branch_id)
    if not branch:
        return None

    semester = find_semester(branch, sem_number)
    if not semester:
        return None

    subject = find_subject(semester, subject_id)
    if not subject:
        return None

    path_parts = [branch["folder"], f"Semester {semester['number']}", subject["folder"]]

    elective = None
    if subject.get("type") == "special":
        elective = find_elective(subject, elective_id)
        if not elective:
            return None
        path_parts.append(elective["folder"])
    elif elective_id:
        # A normal subject was given an elective_id it doesn't support.
        return None

    return {
        "branch": branch,
        "semester": semester,
        "subject": subject,
        "elective": elective,
        "path_parts": path_parts,
    }
