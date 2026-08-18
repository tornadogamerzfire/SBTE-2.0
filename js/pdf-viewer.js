/* pdf-viewer.js — powers pages/pdf-viewer.html */

(function () {
  async function init() {
    const p = Nav.params();
    const branch = p.get("branch"), sem = p.get("sem"), subject = p.get("subject"),
      elective = p.get("elective"), type = p.get("type"), file = p.get("file");

    const titleEl = document.getElementById("viewer-title");
    const frameWrap = document.getElementById("viewer-frame");
    const iframe = document.getElementById("viewer-iframe");
    const downloadBtn = document.getElementById("viewer-download");
    const openBtn = document.getElementById("viewer-open");
    const backBtn = document.getElementById("viewer-back");
    const crumbEl = document.getElementById("crumb");

    if (!branch || !sem || !subject || !type || !file) {
      renderEmptyState(document.getElementById("viewer-main"), {
        title: "Missing document reference",
        message: "This link is missing some information. Go back and open the PDF again from its list.",
        isError: true, iconName: "alert",
      });
      return;
    }

    const fileLabel = file.replace(/\.pdf$/i, "");
    if (titleEl) titleEl.textContent = fileLabel;
    document.title = `${fileLabel} \u2014 SBTE 2.0`;

    const url = Api.pdfUrl({ branch, sem, subject, elective, type, file });
    if (iframe) { iframe.src = url; iframe.title = fileLabel; }
    if (downloadBtn) { downloadBtn.href = url; downloadBtn.setAttribute("download", file); }
    if (openBtn) openBtn.href = url;

    // Some browsers explicitly report they can't render a PDF inline
    // (navigator.pdfViewerEnabled). When that's the case, show the
    // download/open-in-new-tab fallback message instead of an iframe
    // that would just render blank.
    if (typeof navigator.pdfViewerEnabled === "boolean" && !navigator.pdfViewerEnabled) {
      frameWrap?.classList.add("no-support");
    }

    const backUrl = Nav.buildUrl("/pages/resources.html", { branch, sem, subject, elective, type });
    if (backBtn) backBtn.href = backUrl;

    try {
      const curriculum = await Api.getCurriculum();
      const resolved = Nav.resolveFromParams(curriculum);
      if (resolved) {
        resolved.type = type;
        Nav.renderCrumbs(crumbEl, resolved);
      }
    } catch (e) { /* breadcrumb is a nice-to-have; viewer still works without it */ }

    Animate.fadeIn(frameWrap);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
