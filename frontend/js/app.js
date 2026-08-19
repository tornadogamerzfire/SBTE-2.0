/* app.js — shared shell every page boots with: header, footer, icons,
   formatting helpers, and small reusable render functions. */

const Icons = {
  search: '<circle cx="11" cy="11" r="6"/><line x1="20" y1="20" x2="15.5" y2="15.5"/>',
  menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  notes: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><line x1="9.5" y1="12" x2="14.5" y2="12"/><line x1="9.5" y1="15.5" x2="14.5" y2="15.5"/>',
  pyq: '<rect x="3.5" y="7" width="17" height="13" rx="1.5"/><path d="M3.5 7l1.8-3h13.4l1.8 3"/><line x1="10" y1="12" x2="14" y2="12"/>',
  practical: '<path d="M9 3h6"/><path d="M10 3v6l-5.5 9.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3"/><line x1="8.5" y1="14" x2="15.5" y2="14"/>',
  download: '<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  external: '<path d="M9 6H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4"/><path d="M14 4h6v6"/><path d="M20 4L10 14"/>',
  back: '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  civil: '<path d="M4 21h16"/><path d="M5 21V9l7-5 7 5v12"/><line x1="9" y1="21" x2="9" y2="12"/><line x1="15" y1="21" x2="15" y2="12"/>',
  cse: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><line x1="7" y1="3.2" x2="7" y2="7"/><line x1="12" y1="3.2" x2="12" y2="7"/><line x1="17" y1="3.2" x2="17" y2="7"/><line x1="7" y1="17" x2="7" y2="20.8"/><line x1="12" y1="17" x2="12" y2="20.8"/><line x1="17" y1="17" x2="17" y2="20.8"/><line x1="3.2" y1="9" x2="7" y2="9"/><line x1="3.2" y1="14" x2="7" y2="14"/><line x1="17" y1="9" x2="20.8" y2="9"/><line x1="17" y1="14" x2="20.8" y2="14"/>',
  mechanical: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.6M12 18.4V21M21 12h-2.6M5.6 12H3M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5"/>',
  electrical: '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
  electronics: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1.3"/><circle cx="15" cy="15" r="1.3"/><path d="M9 10.3V15M15 13.7V9M10.3 9H15M9 15h4.7"/>',
  empty: '<path d="M4 7l2-4h12l2 4"/><path d="M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z"/><path d="M9 12h6"/>',
  alert: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16" x2="12" y2="16.01"/>',
};

function icon(name, cls = "") {
  const body = Icons[name] || "";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="${cls}">${body}</svg>`;
}

const BRANCH_ICON = {
  civil: "civil", cse: "cse", mechanical: "mechanical", electrical: "electrical", electronics: "electronics",
};

function formatSize(kb) {
  if (kb == null) return "\u2014";
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(unixSeconds) {
  if (!unixSeconds) return "\u2014";
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function renderEmptyState(container, { title, message, iconName = "empty", isError = false }) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state ${isError ? "error-state" : ""}">
      ${icon(iconName)}
      <h3>${title}</h3>
      <p>${message}</p>
    </div>`;
}

/* ---- Shared header / footer ---------------------------------------- */

async function renderShell() {
  const headerEl = document.getElementById("site-header");
  const footerEl = document.getElementById("site-footer");

  let config;
  try {
    config = await Api.getSiteConfig();
  } catch (e) {
    config = { siteName: "SBTE 2.0", fullForm: "State Board of Technical Education 2.0", logo: "/assets/logo.jpg", footer: { text: "" } };
  }

  if (headerEl) {
    headerEl.innerHTML = `
      <div class="container">
        <a class="brand" href="/index.html">
          <img src="${config.logo}" alt="${config.siteName} logo" width="36" height="36" />
          <span>
            <span class="brand-name">${config.siteName}</span>
            <span class="brand-sub">${config.fullForm}</span>
          </span>
        </a>
        <nav class="main-nav">
          <a href="/index.html">Branches</a>
          <a href="/pages/search.html">Search</a>
        </nav>
        <form class="header-search" id="header-search-form" role="search">
          <button type="submit" aria-label="Search">${icon("search")}</button>
          <input type="search" name="q" placeholder="Search subjects, electives..." aria-label="Search subjects, electives" />
        </form>
        <button class="menu-toggle stampable" id="menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">
          ${icon("menu")}
        </button>
      </div>
      <div class="mobile-nav" id="mobile-nav">
        <a href="/index.html">Branches</a>
        <a href="/pages/search.html">Search</a>
      </div>`;

    const form = document.getElementById("header-search-form");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = (new FormData(form).get("q") || "").toString().trim();
      // Always go to the search page -- pre-filled if there's a query,
      // empty (ready to type) otherwise. This is also what makes the
      // icon-only mobile version of this button useful: on a narrow
      // screen the input is hidden, so tapping the icon just opens the
      // full search page instead of doing nothing.
      Nav.go("/pages/search.html", q ? { q } : {});
    });

    const toggle = document.getElementById("menu-toggle");
    const mobileNav = document.getElementById("mobile-nav");
    const closeMenu = () => {
      if (!mobileNav.classList.contains("is-open")) return;
      mobileNav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = icon("menu");
    };
    toggle?.addEventListener("click", () => {
      const isOpen = mobileNav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.innerHTML = icon(isOpen ? "close" : "menu");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
    document.addEventListener("click", (e) => {
      if (!mobileNav.classList.contains("is-open")) return;
      if (mobileNav.contains(e.target) || toggle.contains(e.target)) return;
      closeMenu();
    });
  }

  if (footerEl) {
    const year = new Date().getFullYear();
    footerEl.innerHTML = `
      <div class="container">
        <p>${config.siteName} \u2014 ${config.fullForm}</p>
        <p>${config.footer?.text || ""} &middot; ${year}</p>
      </div>`;
  }

  return config;
}

/* ---- Click "stamp" micro-interaction -------------------------------- */

function initStampEffect() {
  document.addEventListener("click", (e) => {
    const target = e.target.closest(".stampable, .btn, .card");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ring = document.createElement("span");
    ring.className = "stamp-ring";
    ring.style.left = `${e.clientX - rect.left}px`;
    ring.style.top = `${e.clientY - rect.top}px`;
    target.classList.add("stampable");
    target.appendChild(ring);
    ring.addEventListener("animationend", () => ring.remove());
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderShell();
  initStampEffect();
});
