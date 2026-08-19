"""
setup_folders.py
-----------------
Creates every notes/ pyq/ practical/ folder described in frontend/data/subjects.json.
Safe to run any time: existing folders (and any PDFs already inside them)
are left completely untouched, only missing folders are created.

Usage:
    python3 backend/setup_folders.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "frontend", "data", "subjects.json")
RESOURCE_FOLDERS = ["notes", "pyq", "practical"]


def make_dirs(parts):
    created = 0
    for resource in RESOURCE_FOLDERS:
        path = os.path.join(ROOT, resource, *parts)
        if not os.path.isdir(path):
            os.makedirs(path, exist_ok=True)
            created += 1
    return created


def main():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        curriculum = json.load(f)

    created = 0
    leaf_count = 0

    for branch in curriculum["branches"]:
        for semester in branch["semesters"]:
            sem_folder = f"Semester {semester['number']}"
            for subject in semester["subjects"]:
                base_parts = [branch["folder"], sem_folder, subject["folder"]]
                if subject.get("type") == "special" and subject.get("electives"):
                    for elective in subject["electives"]:
                        created += make_dirs(base_parts + [elective["folder"]])
                        leaf_count += 1
                else:
                    created += make_dirs(base_parts)
                    leaf_count += 1

    print(f"Checked {leaf_count} subject folders x {len(RESOURCE_FOLDERS)} resource types.")
    print(f"Created {created} new folders (everything else already existed).")


if __name__ == "__main__":
    main()
