/* api.js — every network call the frontend makes, in one place. */

const Api = (() => {
  const API_BASE = "/api";

  async function fetchJSON(url) {
    let res;
    try {
      res = await fetch(url);
    } catch (networkErr) {
      throw new Error("Could not reach the server. Is the Flask app running?");
    }
    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = await res.json();
        if (body && body.error) message = body.error;
      } catch (_) { /* body wasn't JSON, keep statusText */ }
      throw new Error(message);
    }
    return res.json();
  }

  function buildQuery({ branch, sem, subject, elective, type }) {
    const params = new URLSearchParams({ branch, sem, subject, type });
    if (elective) params.set("elective", elective);
    return params;
  }

  return {
    // Static, rarely-changing data — served directly as files.
    getSiteConfig: () => fetchJSON("/data/site-config.json"),
    getBranches: () => fetchJSON("/data/branches.json"),
    getCurriculum: () => fetchJSON("/data/subjects.json"),

    // Live filesystem data — served through the Flask API.
    getResources: (ctx) => fetchJSON(`${API_BASE}/resources?${buildQuery(ctx).toString()}`),

    pdfUrl: (ctx) => {
      const params = buildQuery(ctx);
      params.set("file", ctx.file);
      return `${API_BASE}/pdf?${params.toString()}`;
    },
  };
})();
