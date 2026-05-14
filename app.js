window.requestAnimationFrame(() => {
  document.body.classList.add("is-loaded");
});

document.querySelectorAll(".plain-header").forEach((header) => {
  if (!header.querySelector(".lang-switch")) {
    header.insertAdjacentHTML(
      "beforeend",
      `
        <a class="lang-switch" href="#" aria-label="Language selection">
          <span class="flag" aria-hidden="true"></span>
          <span>EN</span>
          <span aria-hidden="true">v</span>
        </a>
      `
    );
  }
});

document.querySelectorAll(".detail-hero").forEach((hero) => {
  if (!hero.querySelector(".detail-back-link")) {
    hero.insertAdjacentHTML(
      "afterbegin",
      `
        <a class="detail-back-link" href="products-services.html" aria-label="Back to Services">
          <span class="back-arrow" aria-hidden="true">←</span>
          <span>Back to Services</span>
        </a>
      `
    );
  }
});

const revealTargets = [
  ".services-intro",
  ".services-toolbar",
  ".service-card",
  ".service-menu-card",
  ".service-menu-item",
  ".detail-hero",
  ".detail-card",
  ".section-title",
  ".section-rule",
  ".industries-grid .industry-card",
  ".industries-bottom .industry-card",
  ".capabilities-heading",
  ".capabilities-subtitle",
  ".capabilities-track .capability-link",
  ".footer-inner > *",
  ".footer-bottom",
  ".plain-header .brand",
  ".plain-header .pill-nav"
];

const revealElements = revealTargets.flatMap((selector) =>
  Array.from(document.querySelectorAll(selector))
);

revealElements.forEach((element, index) => {
  element.setAttribute("data-reveal", "");
  element.style.setProperty("--reveal-delay", `${Math.min(index * 45, 360)}ms`);
});

if (revealElements.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        } else {
          entry.target.classList.remove("is-visible");
        }
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -4% 0px"
    }
  );

  revealElements.forEach((element) => revealObserver.observe(element));
}

const floatingHeaders = Array.from(document.querySelectorAll(".site-header"));
let lastScrollY = window.scrollY;

function syncFloatingHeaders() {
  const currentScrollY = window.scrollY;
  const shouldCompact = currentScrollY > 18;

  floatingHeaders.forEach((header) => {
    header.classList.toggle("is-scrolled", shouldCompact);
    header.style.transform = "translate(-50%, 0)";
    header.style.opacity = "1";
  });

  lastScrollY = currentScrollY;
}

syncFloatingHeaders();
window.addEventListener("scroll", syncFloatingHeaders, { passive: true });

function closeFooterPhoneMenus() {
  document.querySelectorAll(".footer-phone-wrap.is-open").forEach((wrap) => {
    wrap.classList.remove("is-open");
    const trigger = wrap.querySelector(".footer-phone-trigger");
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

document.querySelectorAll(".footer-phone-trigger").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const wrap = trigger.closest(".footer-phone-wrap");
    if (!wrap) {
      return;
    }

    const isOpening = !wrap.classList.contains("is-open");
    closeFooterPhoneMenus();
    wrap.classList.toggle("is-open", isOpening);
    trigger.setAttribute("aria-expanded", String(isOpening));
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".footer-phone-wrap")) {
    closeFooterPhoneMenus();
  }
});

const capabilitiesTrack = document.getElementById("capabilitiesTrack");
const capabilitiesViewport = document.getElementById("capabilitiesViewport");

if (capabilitiesTrack && capabilitiesViewport) {
  const prevButton = document.querySelector(".capability-arrow.prev");
  const nextButton = document.querySelector(".capability-arrow.next");
  const originalCards = Array.from(capabilitiesTrack.children);
  const autoScrollState = { paused: false };
  let scrollLoopId = 0;

  for (let copyIndex = 0; copyIndex < 2; copyIndex += 1) {
    originalCards.forEach((card) => {
      capabilitiesTrack.appendChild(card.cloneNode(true));
    });
  }

  const getSetWidth = () => {
    const styles = window.getComputedStyle(capabilitiesTrack);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0");
    const cards = Array.from(capabilitiesTrack.querySelectorAll(".capability-link")).slice(0, originalCards.length);

    return cards.reduce((total, card, index) => {
      const extraGap = index < cards.length - 1 ? gap : 0;
      return total + card.getBoundingClientRect().width + extraGap;
    }, 0);
  };

  const getCardStep = () => {
    const card = capabilitiesTrack.querySelector(".capability-link");
    if (!card) {
      return 0;
    }

    const styles = window.getComputedStyle(capabilitiesTrack);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0");
    return card.getBoundingClientRect().width + gap;
  };

  const normalizeScroll = () => {
    const setWidth = getSetWidth();

    if (!setWidth) {
      return;
    }

    if (capabilitiesViewport.scrollLeft >= setWidth * 2) {
      capabilitiesViewport.scrollLeft -= setWidth;
    } else if (capabilitiesViewport.scrollLeft <= setWidth * 0.5) {
      capabilitiesViewport.scrollLeft += setWidth;
    }
  };

  const startAutoScroll = () => {
    const tick = () => {
      if (!autoScrollState.paused && window.innerWidth > 820) {
        capabilitiesViewport.scrollLeft += 0.55;
        normalizeScroll();
      }

      scrollLoopId = window.requestAnimationFrame(tick);
    };

    scrollLoopId = window.requestAnimationFrame(tick);
  };

  const manualScroll = (direction) => {
    const step = getCardStep();
    if (!step) {
      return;
    }

    capabilitiesViewport.scrollBy({
      left: step * direction,
      behavior: "smooth"
    });
  };

  capabilitiesViewport.addEventListener("mouseenter", () => {
    autoScrollState.paused = true;
  });

  capabilitiesViewport.addEventListener("mouseleave", () => {
    autoScrollState.paused = false;
  });

  if (prevButton && nextButton) {
    prevButton.addEventListener("click", () => manualScroll(-1));
    nextButton.addEventListener("click", () => manualScroll(1));
  }

  const primeLoopPosition = () => {
    const setWidth = getSetWidth();
    if (setWidth) {
      capabilitiesViewport.scrollLeft = setWidth;
    }
  };

  window.requestAnimationFrame(primeLoopPosition);
  startAutoScroll();

  window.addEventListener("resize", primeLoopPosition);

  window.addEventListener("beforeunload", () => {
    if (scrollLoopId) {
      window.cancelAnimationFrame(scrollLoopId);
    }
  });
}

const serviceSearch = document.getElementById("serviceSearch");
const serviceCards = Array.from(document.querySelectorAll("[data-service-card]"));
const serviceCount = document.getElementById("serviceCount");

if (serviceSearch && serviceCards.length && serviceCount) {
  const syncServiceResults = () => {
    const query = serviceSearch.value.trim().toLowerCase();
    let visibleCount = 0;

    serviceCards.forEach((card) => {
      const haystack = (card.getAttribute("data-search") || "").toLowerCase();
      const matches = !query || haystack.includes(query);
      card.hidden = !matches;

      if (matches) {
        visibleCount += 1;
        card.style.removeProperty("animation");
        window.requestAnimationFrame(() => {
          card.style.animation = "riseIn 0.45s cubic-bezier(0.22, 1, 0.36, 1)";
        });
      }
    });

    serviceCount.textContent = String(visibleCount);
  };

  serviceSearch.addEventListener("input", syncServiceResults);
  syncServiceResults();
}

// --- Global Google Translate Watchdog ---
// Forces the layout to remain stable when the translation widget is active.
(function() {
  const killTranslateBanner = () => {
    const banners = [
      '.goog-te-banner-frame',
      '#goog-te-banner-frame',
      '.goog-te-banner',
      '.skiptranslate iframe'
    ];
    
    banners.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
      });
    });

    // Reset layout shift on html and body
    [document.body, document.documentElement].forEach(el => {
      el.style.setProperty('top', '0', 'important');
      el.style.setProperty('margin-top', '0', 'important');
      el.style.setProperty('padding-top', '0', 'important');
    });
  };

  // Run frequently to catch re-injections
  setInterval(killTranslateBanner, 200);
  
  // Observe changes to body/html to override injected styles
  const observer = new MutationObserver(killTranslateBanner);

  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    killTranslateBanner();
  });
})();
