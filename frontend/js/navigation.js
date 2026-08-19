/* navigation.js — query-string routing, curriculum lookups, breadcrumbs.
   The site has no server-side routing: every inner page is a static HTML
   file that reads its state from the URL's query string and renders
   itself with JS. This file is the shared logic behind that. */

const Nav = (() => {
  const RESOURCE_LABELS = { notes: "Notes", pyq: "PYQ", practical: "Practical" };
  const RESOURCE_TYPES = Object.keys(RESOURCE_LABELS);
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function param(name) {
    return params().get(name);
  }

  function buildUrl(page, data = {}) {
    const qs = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    const query = qs.toString();
    return query ? `${page}?${query}` : page;
  }

  function go(page, data = {}) {
    window.location.href = buildUrl(page, data);
  }

  function romanSemester(n) {
    return ROMAN[n] || String(n);
  }

  function resourceLabel(type) {
    return RESOURCE_LABELS[type] || type;
  }

  // --- curriculum lookups (mirror backend/utils.py, but read the tree the
  // page already fetched, so no extra request is needed) ---
  function findBranch(curriculum, id) {
    return curriculum.branches.find((b) => b.id === id) || null;
  }
  function findSemester(branch, num) {
    if (!branch) return null;
    return branch.semesters.find((s) => s.number === Number(num)) || null;
  }
  function findSubject(semester, id) {
    if (!semester) return null;
    return semester.subjects.find((s) => s.id === id) || null;
  }
  function findElective(subject, id) {
    if (!subject) return null;
    return (subject.electives || []).find((e) => e.id === id) || null;
  }

  /**
   * Resolves the full chain from the current URL against a curriculum tree.
   * Returns null (not partial data) if anything doesn't match, so callers
   * can render one consistent error state instead of guessing.
   */
  function resolveFromParams(curriculum) {
    const p = params();
    const branch = findBranch(curriculum, p.get("branch"));
    if (!branch) return null;
    const semester = findSemester(branch, p.get("sem"));
    if (!semester) return null;

    const subjectId = p.get("subject");
    let subject = null;
    let elective = null;
    if (subjectId) {
      subject = findSubject(semester, subjectId);
      if (!subject) return null;
      const electiveId = p.get("elective");
      if (subject.type === "special" && electiveId) {
        elective = findElective(subject, electiveId);
        if (!elective) return null;
      }
    }

    const rawType = p.get("type");
    const type = RESOURCE_TYPES.includes(rawType) ? rawType : null;
    return { branch, semester, subject, elective, type };
  }

  /** Builds the crumb-strip DOM for a resolved context. `upto` limits how
   * deep the trail goes (used on pages that haven't resolved a subject yet). */
  function renderCrumbs(container, resolved) {
    if (!container) return;
    const items = [{ label: "Home", href: "/index.html" }];

    if (resolved.branch) {
      items.push({ label: resolved.branch.name, href: buildUrl("/pages/branch.html", { branch: resolved.branch.id }) });
    }
    if (resolved.semester) {
      items.push({
        label: `Semester ${romanSemester(resolved.semester.number)}`,
        href: buildUrl("/pages/semester.html", { branch: resolved.branch.id, sem: resolved.semester.number }),
      });
    }
    if (resolved.subject) {
      const subjHref = resolved.subject.type === "special"
        ? buildUrl("/pages/special-subject.html", { branch: resolved.branch.id, sem: resolved.semester.number, subject: resolved.subject.id })
        : buildUrl("/pages/subjects.html", { branch: resolved.branch.id, sem: resolved.semester.number, subject: resolved.subject.id });
      items.push({ label: resolved.subject.name, href: subjHref });
    }
    if (resolved.elective) {
      items.push({
        label: resolved.elective.name,
        href: buildUrl("/pages/subjects.html", {
          branch: resolved.branch.id, sem: resolved.semester.number,
          subject: resolved.subject.id, elective: resolved.elective.id,
        }),
      });
    }
    if (resolved.type) {
      items.push({ label: resourceLabel(resolved.type), href: null });
    }

    container.innerHTML = items.map((item, i) => {
      const isLast = i === items.length - 1;
      const sep = i > 0 ? '<span class="crumb__sep">/</span>' : "";
      const text = isLast || !item.href
        ? `<span class="crumb__current" aria-current="page">${escapeHtml(item.label)}</span>`
        : `<a href="${item.href}">${escapeHtml(item.label)}</a>`;
      return sep + text;
    }).join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    params, param, buildUrl, go, romanSemester, resourceLabel,
    findBranch, findSemester, findSubject, findElective,
    resolveFromParams, renderCrumbs, escapeHtml,
  };
})();
