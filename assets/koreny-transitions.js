(function () {
  const transitionKey = "koreny.pageTransition";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const incoming = readIncomingTransition();
  const body = document.body;
  let transitionBackdrop = null;

  if (incoming) {
    body.classList.add("page-transition-entering");
    if (isProjectPage()) {
      body.classList.add("page-transition-project-wait");
      body.classList.add("page-transition-content-wait");
    }
  }

  setupStaticGrain();
  setupTransitionBackdrop();
  setupInternalLinks();

  window.KorenyTransitions = {
    runProjectIntro(callback) {
      if (typeof callback !== "function") {
        return;
      }

      if (!incoming || reduceMotion) {
        body.classList.add("project-shadow-ready");
        callback();
        return;
      }

      window.setTimeout(() => {
        fadeTransitionBackdrop();
      }, 120);

      window.setTimeout(() => {
        body.classList.remove("page-transition-project-wait");
        body.classList.add("page-transition-shadow-live");
        body.classList.add("project-shadow-ready");
        callback();
      }, 860);

      window.setTimeout(() => {
        body.classList.remove("page-transition-entering", "page-transition-content-wait");
        body.classList.add("page-transition-revealing");
      }, 1700);

      window.setTimeout(clearRevealClasses, 2850);
    }
  };

  if (incoming && !isProjectPage()) {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        fadeTransitionBackdrop();
      }, 80);

      window.setTimeout(() => {
        body.classList.remove("page-transition-entering");
        body.classList.add("page-transition-revealing");
        window.setTimeout(clearRevealClasses, 1100);
      }, 620);
    });
  }

  function readIncomingTransition() {
    try {
      const value = sessionStorage.getItem(transitionKey);
      sessionStorage.removeItem(transitionKey);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function isProjectPage() {
    return /(^|\/)project-[^/]+\.html$/.test(window.location.pathname);
  }

  function setupInternalLinks() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link || link.target || link.hasAttribute("download")) {
        return;
      }

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.hash) {
        return;
      }

      const isHtml = !url.pathname.split("/").pop().includes(".") || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
      if (!isHtml) {
        return;
      }

      event.preventDefault();
      startPageExit(url.href);
    }, true);
  }

  function startPageExit(href) {
    if (reduceMotion) {
      window.location.href = href;
      return;
    }

    try {
      sessionStorage.setItem(transitionKey, JSON.stringify({
        from: window.location.pathname,
        to: new URL(href, window.location.href).pathname,
        at: Date.now()
      }));
    } catch {
      // Ignore storage failures; the navigation still works.
    }

    body.classList.add("page-transition-exiting");
    clearImageOverlays();
    window.setTimeout(() => {
      window.location.href = href;
    }, 760);
  }

  function clearRevealClasses() {
    body.classList.remove(
      "page-transition-entering",
      "page-transition-revealing",
      "page-transition-project-wait",
      "page-transition-content-wait",
      "page-transition-shadow-live"
    );
  }

  function clearImageOverlays() {
    for (const overlay of document.querySelectorAll(".shadow-clear-image")) {
      overlay.style.transitionDuration = "1ms";
      overlay.style.opacity = "0";
    }
  }

  function setupTransitionBackdrop() {
    if (!incoming || reduceMotion) {
      return;
    }

    transitionBackdrop = document.createElement("div");
    transitionBackdrop.className = "page-transition-backdrop";
    transitionBackdrop.setAttribute("aria-hidden", "true");
    document.body.insertBefore(transitionBackdrop, document.body.firstChild);
  }

  function fadeTransitionBackdrop() {
    if (!transitionBackdrop) {
      return;
    }

    transitionBackdrop.classList.add("is-fading");
    window.setTimeout(() => {
      transitionBackdrop?.remove();
      transitionBackdrop = null;
    }, 1780);
  }

  function setupStaticGrain() {
    let canvas = document.getElementById("grain-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "grain-canvas";
      canvas.setAttribute("aria-hidden", "true");
      document.body.insertBefore(canvas, document.body.firstChild);
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      return;
    }

    let lastWidth = 0;
    let lastHeight = 0;
    function resize() {
      const width = Math.max(1, Math.round(window.innerWidth));
      const height = Math.max(1, Math.round(window.innerHeight));
      if (width === lastWidth && height === lastHeight) {
        return;
      }

      lastWidth = width;
      lastHeight = height;
      renderGrain(canvas, ctx, width, height);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
  }

  function grainRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function renderGrain(canvas, ctx, width, height) {
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const image = ctx.createImageData(width, height);
    const data = image.data;
    const random = grainRandom((width * 73856093) ^ (height * 19349663) ^ 0x9E3779B9);
    for (let i = 0; i < data.length; i += 4) {
      const fine = random();
      const neighbor = random();
      const value = Math.max(0, Math.min(255, 118 + (fine - 0.5) * 92 + (neighbor - 0.5) * 34));
      const alpha = Math.max(0, Math.min(255, 24 + Math.abs(fine - 0.5) * 52 + random() * 16));
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = alpha;
    }
    ctx.putImageData(image, 0, 0);
    canvas.dataset.renderedSize = `${width}x${height}`;
    document.body.dataset.grainSize = `${width}x${height}`;
  }
})();
