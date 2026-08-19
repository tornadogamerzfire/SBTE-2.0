/* search.js — powers pages/search.html. Runs entirely against the
   curriculum JSON already fetched by the page; no server round-trip. */

(function () {
  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function collectMatches(curriculum, query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const results = [];

    curriculum.branches.forEach((branch) => {
      branch.semesters.forEach((semester) => {
        semester.subjects.forEach((subject) => {
          if (subject.name.toLowerCase().includes(q)) {
            results.push({
              level: subject.type === "special" ? "group" : "subject",
              branch, semester, subject,
              label: subject.name,
            });
          }
          (subject.electives || []).forEach((elective) => {
            if (elective.name.toLowerCase().includes(q)) {
              results.push({
                level: "elective",
                branch, semester, subject, elective,
                label: elective.name,
              });
            }
          });
        });
      });
    });

    return results.slice(0, 60);
  }

  function linkFor(result) {
    const { branch, semester, subject, elective, level } = result;
    if (level === "group") {
      return Nav.buildUrl("/pages/special-subject.html", { branch: branch.id, sem: semester.number, subject: subject.id });
    }
    if (level === "elective") {
      return Nav.buildUrl("/pages/subjects.html", { branch: branch.id, sem: semester.number, subject: subject.id, elective: elective.id });
    }
    return Nav.buildUrl("/pages/subjects.html", { branch: branch.id, sem: semester.number, subject: subject.id });
  }

  function pathFor(result) {
    const parts = [result.branch.name, `Semester ${Nav.romanSemester(result.semester.number)}`, result.subject.name];
    if (result.elective) parts.push(result.elective.name);
    return parts.join(" / ");
  }

  function badgeFor(level) {
    if (level === "group") return "Electives";
    if (level === "elective") return "Elective";
    return "Subject";
  }

  function render(container, results, query) {
    if (!query || query.trim().length < 2) {
      renderEmptyState(container, {
        title: "Start typing to search",
        message: "Search across every branch for a subject or elective — try \u201cPython\u201d, \u201cIoT\u201d or \u201cSurveying\u201d.",
      });
      return;
    }
    if (!results.length) {
      renderEmptyState(container, {
        title: "No matches",
        message: `Nothing found for \u201c${Nav.escapeHtml(query)}\u201d. Check the spelling, or browse by branch instead.`,
        iconName: "alert",
      });
      return;
    }

    const grouped = {};
    results.forEach((r) => {
      const key = r.branch.name;
      (grouped[key] = grouped[key] || []).push(r);
    });

    container.innerHTML = Object.entries(grouped).map(([branchName, items]) => `
      <div class="search-group">
        <div class="search-group__label">${branchName} &middot; ${items.length} match${items.length === 1 ? "" : "es"}</div>
        ${items.map((r) => `
          <a class="search-result-row stampable" href="${linkFor(r)}">
            <div>
              <div>${Nav.escapeHtml(r.label)} <span class="badge">${badgeFor(r.level)}</span></div>
              <div class="search-result-row__path">${Nav.escapeHtml(pathFor(r))}</div>
            </div>
            ${icon("chevron")}
          </a>`).join("")}
      </div>
    `).join("");

    Animate.revealCards(".search-result-row");
  }

  async function init() {
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");
    if (!input || !results) return;

    const initialQuery = Nav.param("q") || "";
    input.value = initialQuery;

    let curriculum;
    try {
      curriculum = await Api.getCurriculum();
    } catch (e) {
      renderEmptyState(results, { title: "Couldn't load search index", message: e.message, isError: true, iconName: "alert" });
      return;
    }

    const runSearch = (q) => render(results, collectMatches(curriculum, q), q);
    runSearch(initialQuery);

    input.addEventListener("input", debounce((e) => {
      const q = e.target.value;
      history.replaceState(null, "", Nav.buildUrl("/pages/search.html", { q }));
      runSearch(q);
    }, 220));

    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (canHover) input.focus({ preventScroll: true });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
