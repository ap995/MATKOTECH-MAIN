(() => {
  "use strict";

  const ROOT_CLASS = "mtk-layout-safety-ready";
  const MOBILE_QUERY = "(max-width: 900px)";
  const SERVICES_QUERY = "(max-width: 600px)";
  const carouselTimers = new WeakMap();

  const selectors = {
    carousels: [
      {
        track: "#capabilities-section .capabilities-static-grid",
        item: ".industry-item",
        media: MOBILE_QUERY,
        interval: 3400
      },
      {
        track: "#mtk-cards-grid",
        item: ".mtk-card:not(.mtk-hidden)",
        media: SERVICES_QUERY,
        interval: 3600
      }
    ],
    imageCards: ".mtk-card-img-wrap, .industry-img-container, .sd-sub-card-box",
    interactive: "a, button, input, textarea, select, [tabindex]"
  };

  function injectLayoutStyles() {
    if (document.getElementById("mtk-layout-safety-style")) return;

    const style = document.createElement("style");
    style.id = "mtk-layout-safety-style";
    style.textContent = `
      html.${ROOT_CLASS},
      html.${ROOT_CLASS} body {
        max-width: 100%;
        overflow-x: clip;
      }

      html.${ROOT_CLASS} *,
      html.${ROOT_CLASS} *::before,
      html.${ROOT_CLASS} *::after {
        box-sizing: border-box;
      }

      html.${ROOT_CLASS} img,
      html.${ROOT_CLASS} picture,
      html.${ROOT_CLASS} video,
      html.${ROOT_CLASS} canvas,
      html.${ROOT_CLASS} svg {
        max-width: 100%;
      }

      html.${ROOT_CLASS} .mtk-safe-carousel {
        overflow-x: auto !important;
        overflow-y: hidden !important;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        touch-action: pan-x pan-y;
        overscroll-behavior-inline: contain;
      }

      html.${ROOT_CLASS} .mtk-safe-carousel::-webkit-scrollbar {
        display: none;
      }

      html.${ROOT_CLASS} .mtk-safe-carousel > * {
        scroll-snap-align: center;
      }

      html.${ROOT_CLASS} .mtk-image-missing {
        background:
          linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.72)),
          repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 8px, transparent 8px 16px) !important;
      }

      html.${ROOT_CLASS} .mtk-focus-visible :focus-visible {
        outline: 3px solid rgba(22, 163, 74, 0.45);
        outline-offset: 3px;
      }

      @media (prefers-reduced-motion: reduce) {
        html.${ROOT_CLASS} *,
        html.${ROOT_CLASS} *::before,
        html.${ROOT_CLASS} *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function hardenLinks() {
    document.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href") || "";
      const isExternal = /^https?:\/\//i.test(href) && !href.includes(location.hostname);

      if (isExternal || link.target === "_blank") {
        link.setAttribute("rel", "noopener noreferrer");
      }

      if (href.trim().toLowerCase().startsWith("javascript:")) {
        link.removeAttribute("href");
        link.setAttribute("role", "button");
        link.setAttribute("aria-disabled", "true");
      }
    });
  }

  function hardenForms() {
    document.querySelectorAll("form").forEach((form) => {
      if (form.dataset.layoutSafetyBound === "true") return;
      form.dataset.layoutSafetyBound = "true";

      form.addEventListener("submit", () => {
        form.querySelectorAll("input[type='text'], input[type='email'], input[type='tel'], textarea").forEach((field) => {
          field.value = field.value.replace(/\s+/g, " ").trim();
        });
      });
    });
  }

  function protectImages() {
    document.querySelectorAll("img").forEach((img) => {
      img.loading = img.loading || "lazy";
      img.decoding = img.decoding || "async";

      if (!img.getAttribute("alt")) {
        img.setAttribute("alt", "");
      }

      if (img.dataset.layoutSafetyBound === "true") return;
      img.dataset.layoutSafetyBound = "true";

      img.addEventListener("error", () => {
        const visualBox = img.closest(selectors.imageCards);
        if (visualBox) {
          visualBox.classList.add("mtk-image-missing");
        }
      });
    });
  }

  function getStep(track, itemSelector) {
    const item = track.querySelector(itemSelector);
    if (!item) return Math.max(track.clientWidth, 1);

    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return item.getBoundingClientRect().width + gap;
  }

  function stopCarousel(track) {
    const state = carouselTimers.get(track);
    if (!state) return;

    window.clearInterval(state.intervalId);
    window.clearTimeout(state.resumeId);
    carouselTimers.delete(track);
  }

  function startCarousel(config) {
    const track = document.querySelector(config.track);
    if (!track) return;

    track.classList.add("mtk-safe-carousel");
    stopCarousel(track);

    if (!window.matchMedia(config.media).matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const advance = () => {
      const maxScroll = track.scrollWidth - track.clientWidth - 4;
      if (maxScroll <= 0) return;

      if (track.scrollLeft >= maxScroll) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        track.scrollBy({ left: getStep(track, config.item), behavior: "smooth" });
      }
    };

    const state = {
      intervalId: window.setInterval(advance, config.interval),
      resumeId: 0
    };

    const pauseThenResume = () => {
      window.clearInterval(state.intervalId);
      window.clearTimeout(state.resumeId);
      state.resumeId = window.setTimeout(() => {
        state.intervalId = window.setInterval(advance, config.interval);
      }, 4200);
    };

    track.addEventListener("touchstart", pauseThenResume, { passive: true });
    track.addEventListener("pointerdown", pauseThenResume);
    track.addEventListener("wheel", pauseThenResume, { passive: true });

    carouselTimers.set(track, state);
  }

  function setupCarousels() {
    selectors.carousels.forEach(startCarousel);
  }

  function stabilizeMobileScroll() {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    if (document.documentElement.scrollLeft || document.body.scrollLeft) {
      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
    }
  }

  function refresh() {
    document.documentElement.classList.add(ROOT_CLASS, "mtk-focus-visible");
    injectLayoutStyles();
    hardenLinks();
    hardenForms();
    protectImages();
    setupCarousels();
    stabilizeMobileScroll();
  }

  function debounce(fn, wait) {
    let timer = 0;
    return () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fn, wait);
    };
  }

  const refreshSoon = debounce(refresh, 120);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }

  window.addEventListener("resize", refreshSoon, { passive: true });
  window.addEventListener("orientationchange", refreshSoon, { passive: true });
  window.addEventListener("scroll", stabilizeMobileScroll, { passive: true });

  new MutationObserver(refreshSoon).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.MatkotechLayoutSafety = {
    refresh
  };
})();
