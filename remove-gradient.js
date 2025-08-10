(function hideGptLandingBackground() {
  /**
   * Returns true if we're on a landing-like route (root path), not in a chat thread.
   * We avoid touching chat routes to prevent breaking React trees.
   */
  function isLandingRoute() {
    // Only act on the exact root ("/"); chats typically use other paths (e.g., "/c/...").
    return location.pathname === "/" || location.pathname === "";
  }

  /**
   * Inject a CSS rule using :has() if supported.
   * Keeping nodes in the DOM avoids React removeChild errors.
   */
  function injectHasCssRule() {
    try {
      // Check if :has is supported before injecting the rule
      if (CSS && CSS.supports && CSS.supports("selector(:has(*))")) {
        const style = document.createElement("style");
        style.setAttribute("data-gptbg-style", "1");
        style.textContent = `
          picture:has(img[src*="burrito-nux"]), 
          picture:has(source[srcset*="burrito-nux"]) {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }
        `;
        document.documentElement.appendChild(style);
      }
    } catch (_) {
      // Ignore if CSS.supports is unavailable; we'll fall back to JS-based hiding.
    }
  }

  /**
   * JS fallback: find <picture> elements containing an img/source with "burrito-nux"
   * and hide them without removing from the DOM.
   */
  function hidePicturesByHeuristic() {
    const pictures = document.querySelectorAll("picture");
    let hiddenCount = 0;

    pictures.forEach((picture) => {
      if (picture.hasAttribute("data-gptbg-hidden")) return;

      const hasBurrito = [...picture.querySelectorAll("source, img")].some((el) => {
        const src = el.getAttribute("src") || "";
        const srcset = el.getAttribute("srcset") || "";
        return src.includes("burrito-nux") || srcset.includes("burrito-nux");
      });

      if (hasBurrito) {
        // Keep node in the tree; just hide it.
        picture.style.setProperty("display", "none", "important");
        picture.style.setProperty("visibility", "hidden", "important");
        picture.style.setProperty("pointer-events", "none", "important");
        picture.setAttribute("data-gptbg-hidden", "1");
        hiddenCount++;
      }
    });
  }

  /**
   * Run both CSS and JS strategies. CSS handles future dynamic insertions (via :has),
   * JS handles browsers without :has or race conditions.
   */
  function neutralizeLandingBackground() {
    injectHasCssRule();
    hidePicturesByHeuristic();
  }

  // Guard: only run on landing
  if (!isLandingRoute()) {
    // Optional: still neutralize if the transitional landing background appears briefly on rootless routes.
    // If you want to be ultra-strict, return here and do nothing.
    return;
  }

  // Run initially on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", neutralizeLandingBackground, { once: true });
  } else {
    neutralizeLandingBackground();
  }

  // Also run after full load in case of late injections
  window.addEventListener("load", () => {
    neutralizeLandingBackground();
    setTimeout(neutralizeLandingBackground, 500);
    setTimeout(neutralizeLandingBackground, 1500);
  });

  // Observe DOM mutations but DO NOT remove nodes; only hide them.
  const observer = new MutationObserver((mutations) => {
    // Cheap short-circuit: only work if any added node could include a picture
    if (mutations.some(m => [...m.addedNodes].some(n => n.nodeType === 1))) {
      hidePicturesByHeuristic();
    }
  });

  // Start observing as soon as body exists
  const startObserver = () => {
    if (document.body && !document.body.hasAttribute("data-gptbg-observing")) {
      observer.observe(document.body, { childList: true, subtree: true });
      document.body.setAttribute("data-gptbg-observing", "1");
    } else if (!document.body) {
      // In very early runs, body may not be ready
      document.addEventListener("DOMContentLoaded", startObserver, { once: true });
    }
  };
  startObserver();
})();
