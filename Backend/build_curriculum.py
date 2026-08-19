"""
build_curriculum.py
--------------------
Single source of truth for the SBTE 2.0 curriculum. Encodes every branch,
semester and subject as plain Python data (so it's easy to read and verify
against the syllabus), then compiles it into frontend/data/subjects.json.

Run manually any time the curriculum changes:
    python3 backend/build_curriculum.py

After editing this file, re-run it, then re-run backend/setup_folders.py to
create any newly-added subject folders (existing folders/PDFs are untouched).
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "frontend", "data")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    s = re.sub(r"-{2,}", "-", s)
    return s


# A few subject names contain characters that are illegal (or unwise) in a
# real folder name on some operating systems: "/" is a path separator
# everywhere, ":" is reserved on Windows, and a trailing "." is stripped by
# Windows. We keep the *display* name exactly as written in the syllabus,
# but compute a filesystem-safe folder name separately.
FOLDER_OVERRIDES = {
    "Open Electives / COE": "Open Electives - COE",
    "Data Science: Data Warehousing and Data Mining": "Data Science - Data Warehousing and Data Mining",
}


def folder_safe(name: str) -> str:
    if name in FOLDER_OVERRIDES:
        return FOLDER_OVERRIDES[name]
    f = name.replace("/", "-").replace(":", " -")
    f = re.sub(r"\s{2,}", " ", f)
    f = f.rstrip(". ").strip()
    return f


def make_subject(name: str, seen: set) -> dict:
    sid = slugify(name)
    assert sid not in seen, f"Duplicate subject id '{sid}' from '{name}'"
    seen.add(sid)
    return {"id": sid, "name": name, "folder": folder_safe(name), "type": "normal"}


def make_special(name: str, electives: list, seen: set) -> dict:
    sid = slugify(name)
    assert sid not in seen, f"Duplicate subject id '{sid}' from '{name}'"
    seen.add(sid)
    e_seen = set()
    e_list = []
    for e_name in electives:
        eid = slugify(e_name)
        assert eid not in e_seen, f"Duplicate elective id '{eid}' in '{name}'"
        e_seen.add(eid)
        e_list.append({"id": eid, "name": e_name, "folder": folder_safe(e_name)})
    return {"id": sid, "name": name, "folder": folder_safe(name), "type": "special", "electives": e_list}


# ---------------------------------------------------------------------------
# Shared elective groups (Open Electives / COE is identical across every
# branch, offered as "Basic" in Semester 5 and "Advanced" in Semester 6)
# ---------------------------------------------------------------------------

OPEN_ELECTIVES_BASIC = [
    "Artificial Intelligence (Basic)",
    "Internet of Things (Basic)",
    "Drone Technology (Basic)",
    "3D Printing and Design (Basic)",
    "Industrial Automation (Basic)",
    "Electric Vehicle (Basic)",
    "Robotics (Basic)",
    "Transformer Manufacturing and Repairing (Basic)",
    "Optical Fiber and 5G Communication (Basic)",
]

OPEN_ELECTIVES_ADVANCED = [
    "Artificial Intelligence (Advanced)",
    "Internet of Things (Advanced)",
    "Drone Technology (Advanced)",
    "3D Printing and Design (Advanced)",
    "Industrial Automation (Advanced)",
    "Electric Vehicle (Advanced)",
    "Robotics (Advanced)",
    "Transformer Manufacturing and Repairing (Advanced)",
    "Optical Fiber and 5G Communication (Advanced)",
]

# A plain string = a normal subject (one PDF folder).
# A (name, [options]) tuple = a "special" subject: an extra middle page
# listing options, each with its own PDF folder.

RAW_BRANCHES = [
    {
        "id": "civil", "name": "Civil Engineering", "folder": "Civil Engineering",
        "tagline": "Structures, surveying & sustainable infrastructure",
        "accent": "#d4a657", "icon": "civil",
        "semesters": [
            ["Basic Engg. Mathematics", "Applied Chemistry -A", "Fundamentals of Mechanical Engg.",
             "Communication Skills (English)", "Engg. Drawing & Graphics"],
            ["Applied Physics -A", "Python Programming", "Engg. Mechanics", "Applied Mathematics -A"],
            ["Basic Surveying", "Concrete Technology", "Strength of Material for Civil Engg.",
             "Building Construction & Material", "Water Resource Engg."],
            ["Advance Surveying", "Theory of Structure", "Building Planning and Drawing with Auto CAD",
             "Soil Mechanics & Foundation", "Transportation Engg."],
            ["Hydraulics", "RCC Structure", "Estimating, Costing & Contracts",
             ("Open Electives / COE", OPEN_ELECTIVES_BASIC)],
            ["Environmental Engg.", "Steel Structure",
             ("Programme Electives", ["Pre-Stress and Precast Concrete", "Traffic Engineering and Pavement Design",
                                       "Green Building and Sustainability", "Water and Waste Water Management"]),
             ("Open Electives / COE", OPEN_ELECTIVES_ADVANCED)],
        ],
    },
    {
        "id": "cse", "name": "Computer Science and Engineering", "folder": "Computer Science and Engineering",
        "tagline": "Code, data & intelligent systems",
        "accent": "#3fa9f5", "icon": "cse",
        "semesters": [
            ["Basic Engg. Mathematics", "Applied Physics -B", "Fundamentals of Electrical and Electronic Engg.",
             "Introduction to Artificial Intelligence", "ICT Tools"],
            ["Programming with C", "Web Technology", "Applied Chemistry -B",
             "Communication Skills (English)", "Applied Mathematics -B"],
            ["Data Structures and Algorithm", "Operating System", "Discrete Structures",
             "Digital Electronics & Microprocessor", "Python Programming"],
            ["Java Programming", "Theory of Computation", "Database Management System",
             "Computer Organization and Architecture", "Computer Troubleshooting and Maintenance"],
            ["Data Communication and Computer Network", "Software Engineering",
             ("Programme Electives", ["Data Science: Data Warehousing and Data Mining", "Advanced JAVA Programming"]),
             ("Open Electives / COE", OPEN_ELECTIVES_BASIC)],
            ["Cloud Computing", "Computer Network with Linux & Windows",
             ("Programme Electives", ["Introduction to Machine Learning", "Mobile Application Development"]),
             ("Open Electives / COE", OPEN_ELECTIVES_ADVANCED)],
        ],
    },
    {
        "id": "mechanical", "name": "Mechanical Engineering", "folder": "Mechanical Engineering",
        "tagline": "Machines, thermodynamics & manufacturing",
        "accent": "#e8734a", "icon": "mechanical",
        "semesters": [
            ["Basic Engg. Mathematics", "Applied Chemistry -A", "Introduction to Artificial Intelligence",
             "Communication Skills (English)", "Engineering Drawing"],
            ["Applied Physics -A", "Fundamentals of Electrical and Electronic Engg.", "Engg. Mechanics",
             "Applied Mathematics -A"],
            ["Manufacturing Engineering", "Material Science & Engineering",
             "Strength of Materials for Mechanical Engg.", "Basic Thermodynamics"],
            ["Engineering Metrology and Instrumentation", "Fluid Mechanics & Hydraulic Machinery",
             "Applied Thermodynamics and HVAC", "Theory of Machines",
             "Advance Manufacturing Engineering and Cost Estimation"],
            ["Industrial Engineering & Management", "Industrial Automation and Mechatronics",
             "Hybrid Automobile Engineering", ("Open Electives / COE", OPEN_ELECTIVES_BASIC)],
            ["Design of Machine Elements", "Maintenance & Safety of Mechanical & Solar Appliances",
             ("Programme Electives", ["Heat and Mass Transfer", "Power Plant Engineering",
                                       "Press Tool, Jigs and Fixtures", "Hydraulic & Pneumatic Controls",
                                       "Renewable and Alternate Energy Sources"]),
             ("Open Electives / COE", OPEN_ELECTIVES_ADVANCED)],
        ],
    },
    {
        "id": "electrical", "name": "Electrical Engineering", "folder": "Electrical Engineering",
        "tagline": "Power systems, machines & control",
        "accent": "#f5c542", "icon": "electrical",
        "semesters": [
            ["Basic Engg. Mathematics", "Applied Physics -B", "Basic Electrical Engg.",
             "Engg. Drawing & Graphics", "Introduction to Artificial Intelligence"],
            ["Fundamentals of Electronics Engg.", "Applied Chemistry -B", "Communication Skills (English)",
             "Engg. Mechanics", "Applied Mathematics -C"],
            ["Electrical Circuit and Networks", "Electrical Measurements and Instrumentation",
             "DC Machines and Transformers", "Electrical Power Generation Transmission and Distribution",
             "Python Programming"],
            ["Power Electronics", "Microprocessor and Microcontrollers", "AC Machines",
             "Control System and PLC", "Electrical Software Lab"],
            ["Switchgear and Protection", "Solar & Wind Power Technology", "Energy Conservation and Audit",
             ("Open Electives / COE", OPEN_ELECTIVES_BASIC)],
            ["Utilization of Electrical Energy", "Electrical Installation, Testing and Commissioning",
             ("Programme Electives", ["Data Communication", "Industrial Drives",
                                       "Electrification of Building Complexes"]),
             ("Open Electives / COE", OPEN_ELECTIVES_ADVANCED)],
        ],
    },
    {
        "id": "electronics", "name": "Electronics Engineering", "folder": "Electronics Engineering",
        "tagline": "Circuits, signals & communication systems",
        "accent": "#5bc49f", "icon": "electronics",
        "semesters": [
            ["Basic Engg. Mathematics", "Applied Physics -B", "Applied Chemistry -B", "Engg. Mechanics"],
            ["Basic Electronics Engg.", "Electric Circuits and Machines", "Communication Skills (English)",
             "Applied Mathematics -C", "Fundamentals of IT and C Programming"],
            ["Analog Electronics", "Measuring Instruments and Sensors", "Digital Electronics",
             "Principles of Electronic Communication", "Electronic Simulation Software Practice"],
            ["Linear Integrated Circuit", "Microcontroller and its Applications", "Digital Communication",
             "Electronic Equipment Maintenance", "Python Programming"],
            ["Industrial Engineering & Management", "Antennas and Microwave Engineering",
             "Automated Control System and PLC", ("Open Electives / COE", OPEN_ELECTIVES_BASIC)],
            ["Data Communication and Computer Networking", "Embedded System",
             ("Programme Electives", ["Artificial Intelligence & Machine Learning", "Industrial Electronics",
                                       "Biomedical Electronics", "Advance Communication Systems"]),
             ("Open Electives / COE", OPEN_ELECTIVES_ADVANCED)],
        ],
    },
]

# Expected subject counts per semester, transcribed directly from the brief,
# used as a self-check so a typo here fails loudly instead of shipping silently.
EXPECTED_COUNTS = {
    "civil": [5, 4, 5, 5, 4, 4],
    "cse": [5, 5, 5, 5, 4, 4],
    "mechanical": [5, 4, 4, 5, 4, 4],
    "electrical": [5, 5, 5, 5, 4, 4],
    "electronics": [4, 5, 5, 5, 4, 4],
}


def build():
    branches_out = []
    total_leaf_folders = 0

    for b in RAW_BRANCHES:
        semesters_out = []
        expected = EXPECTED_COUNTS[b["id"]]
        for i, subject_list in enumerate(b["semesters"]):
            sem_number = i + 1
            assert len(subject_list) == expected[i], (
                f"{b['id']} semester {sem_number}: expected {expected[i]} subjects, "
                f"got {len(subject_list)}"
            )
            seen = set()
            subjects_out = []
            for entry in subject_list:
                if isinstance(entry, tuple):
                    name, electives = entry
                    subj = make_special(name, electives, seen)
                    total_leaf_folders += len(electives)
                else:
                    subj = make_subject(entry, seen)
                    total_leaf_folders += 1
                subjects_out.append(subj)
            semesters_out.append({"number": sem_number, "subjects": subjects_out})

        branches_out.append({
            "id": b["id"],
            "name": b["name"],
            "folder": b["folder"],
            "tagline": b["tagline"],
            "accent": b["accent"],
            "icon": b["icon"],
            "semesters": semesters_out,
        })

    curriculum = {"branches": branches_out}

    os.makedirs(DATA_DIR, exist_ok=True)
    out_path = os.path.join(DATA_DIR, "subjects.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(curriculum, f, indent=2, ensure_ascii=False)

    print(f"Wrote {out_path}")
    print(f"Branches: {len(branches_out)}")
    print(f"Leaf subject folders per resource type (notes/pyq/practical): {total_leaf_folders}")
    print(f"Total folders that will be created: {total_leaf_folders * 3}")


if __name__ == "__main__":
    build()
