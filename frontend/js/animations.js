/* animations.js — the one orchestrated hero sequence, plus a small
   reveal-on-render helper used by every card grid. Every function
   degrades to "just show the content" if GSAP didn't load or the
   person prefers reduced motion. */

const Animate = (() => {
  const hasGSAP = typeof gsap !== "undefined";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Stagger-reveal a card grid right after it's rendered into the DOM. */
  function revealCards(selectorOrEls, opts = {}) {
    const els = typeof selectorOrEls === "string"
      ? document.querySelectorAll(selectorOrEls)
      : selectorOrEls;
    if (!els || !els.length) return;

    if (!hasGSAP || reduced) {
      els.forEach((el) => { el.style.opacity = 1; });
      return;
    }
    gsap.set(els, { opacity: 0, y: 18 });
    gsap.to(els, {
      opacity: 1,
      y: 0,
      duration: 0.55,
      ease: "power3.out",
      stagger: opts.stagger ?? 0.06,
      delay: opts.delay ?? 0,
    });
  }

  /** The single orchestrated hero moment on index.html: kicker, headline,
   * lede, actions and the title block draw in as one sequence.
   *
   * Uses fromTo() with an explicit end state everywhere, not from(). Every
   * one of these elements starts at opacity:0 via the .js-reveal CSS
   * class, and gsap.from() determines its implicit "end" value by reading
   * the element's CURRENT computed style -- which is already 0 because of
   * that class, so it animates from 0 to 0 and the element never becomes
   * visible. fromTo() states the end value explicitly instead of
   * inferring it, which sidesteps that entirely. */
  function heroSequence({ kicker, title, lede, actions, titleBlock } = {}) {
    const els = [kicker, title, lede, actions, titleBlock].filter(Boolean);
    if (!hasGSAP || reduced) {
      els.forEach((el) => { el.style.opacity = 1; });
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    if (kicker) tl.fromTo(kicker, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 });
    if (title) tl.fromTo(title, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.25");
    if (lede) tl.fromTo(lede, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.4");
    if (actions) tl.fromTo(actions, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.35");
    if (titleBlock) tl.fromTo(titleBlock, { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.6 }, "-=0.5");
  }

  function fadeIn(el, opts = {}) {
    if (!el) return;
    if (!hasGSAP || reduced) { el.style.opacity = 1; return; }
    gsap.fromTo(
      el,
      { opacity: 0, y: opts.y ?? 10 },
      { opacity: 1, y: 0, duration: opts.duration ?? 0.5, ease: "power2.out", delay: opts.delay ?? 0 }
    );
  }

  return { revealCards, heroSequence, fadeIn, hasGSAP, reduced };
})();
