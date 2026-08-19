# SBTE 2.0

**State Board of Technical Education 2.0** — a notes/PYQ/practical portal for five engineering branches, six semesters each. Drop a PDF into the right folder and it appears on the site immediately — nothing to rebuild, re-index, or restart.

## Quick start

```bash
cd SBTE-2.0
pip install -r backend/requirements.txt
python backend/app.py
```

Then open **http://localhost:5000**.

That's it — the `notes/`, `pyq/` and `practical/` folder trees are already created for every branch, semester and subject. There's nothing else to configure.

## Adding your PDFs

Every subject already has its own empty folder, in three parallel trees:

```text
notes/<Branch>/Semester <N>/<Subject>/*.pdf
pyq/<Branch>/Semester <N>/<Subject>/*.pdf
practical/<Branch>/Semester <N>/<Subject>/*.pdf
```

For example:

```text
notes/Civil Engineering/Semester 1/Basic Engg. Mathematics/Unit 1 - Differential Calculus.pdf
```

Just copy a PDF in. Refresh the site — it's there. The site displays the filename with `.pdf` removed, so name your files the way you want students to see them (e.g. `Unit 3 - Fluid Dynamics.pdf`, not `unit3_fluidmech_FINAL_v2.pdf`).

**Elective subjects** (Open Electives / COE, Programme Electives) have one extra folder level for the option chosen, e.g.:

```text
notes/Civil Engineering/Semester 5/Open Electives - COE/Artificial Intelligence (Basic)/*.pdf
```

Note that on disk this folder is named **`Open Electives - COE`** (hyphen), not `Open Electives / COE` — a forward slash can't be part of a real folder name on any operating system, so the slash was swapped for a hyphen when the folder tree was generated. The website still displays it as "Open Electives / COE"; only the folder name on disk differs.

If you're not sure which folder a subject maps to, browse to it on the live site first — the breadcrumb and the URL's `subject`/`elective` values correspond directly to `frontend/data/subjects.json`.

## How it's organized

```text
SBTE-2.0/
├── frontend/               Complete frontend application
│   ├── index.html          Homepage — the 5 branches
│   ├── pages/              branch → semester → subject → resource-type → PDF
│   ├── css/                Stylesheets
│   ├── js/                 Frontend JavaScript
│   ├── assets/             Images, icons and other frontend assets
│   ├── data/               subjects.json, branches.json, site-config.json
│   └── manifest.json       Web app manifest
├── backend/                Flask API/server — see backend/README.md
├── notes/                  Notes PDF tree
├── pyq/                    Previous-year-question PDF tree
├── practical/              Practical PDF tree
├── robots.txt              Root-level crawler rules
├── README.md               Project documentation
└── .gitignore
```

The frontend is plain HTML/CSS/JS under `frontend/` (no build step, no framework) — every inner page is a static `.html` file that reads its state from the URL's query string (`?branch=civil&sem=1&subject=...`) and renders itself. The only things that ever hit the Python backend are: listing the PDFs in a folder, and streaming one PDF file. Everything else (branch/semester/subject browsing, search) runs off the static `frontend/data/*.json` files directly in the browser.

## Editing the curriculum

The curriculum (branches, semesters, subjects, electives) lives in one place: `frontend/data/subjects.json`, generated from `backend/build_curriculum.py`. To change it:

1. Edit the branch/semester/subject data inside `backend/build_curriculum.py`.
2. Run `python3 backend/build_curriculum.py` — it rewrites `frontend/data/subjects.json` and asserts the subject counts and IDs are all still consistent (it will raise an error rather than write bad data if something doesn't add up).
3. Run `python3 backend/setup_folders.py` to create any newly-added subject folders. Existing folders and PDFs are never touched or deleted.
4. **Restart the Flask server** (`Ctrl+C`, then `python3 backend/app.py` again). The curriculum is read once and cached in memory for the life of the process, so a running server won't pick up the edit on its own — this is the one thing here that isn't automatic.

## Design

The visual language is drawn from engineering drafting itself rather than generic dashboard styling: a deep-ink background with blueprint-blue linework, an amber "marker" accent for actions, and a recurring **title block** — the corner stamp found on every real technical drawing — used as the site's signature element. PDF listings are styled as a document register (a drawing log), and each branch's card accent is drawn from a real material of that discipline (concrete ochre for Civil, PCB green for Electronics, brass/copper for Electrical, and so on). The ambient 3D background (Three.js) is five wireframe solids rotating slowly over a faint drafting-grid floor — restrained on purpose, and it disables itself automatically under `prefers-reduced-motion` or if WebGL/the CDN script fails to load, so the site is fully usable either way.

## Browser support note

The frontend uses a small number of modern CSS features (`color-mix()`, `backdrop-filter`, `inset`) that are standard in current Chrome, Edge, Firefox and Safari but not in very old browsers. Everything has a sensible fallback or degrades gracefully — nothing breaks, a couple of decorative effects just won't render on very old browsers.

## Production deployment

`python3 backend/app.py` runs Flask's built-in development server, which is fine for running this on your own machine or a college LAN. If you put this on the public internet, set `SBTE_DEBUG=false` (the interactive debugger it otherwise exposes lets anyone who triggers a server error run code on your machine) and put it behind a real WSGI server such as gunicorn, e.g.:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 --chdir backend app:app
```

## License / credit

Built for students, by students. Do whatever you like with it.
