(function () {
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const shadowVariant = document.body.dataset.shadowVariant || "window";
  const variantStorageVersion = { moon: "v2", cave: "v2" }[shadowVariant];
  const storageKey = shadowVariant === "window"
    ? "koreny.windowShadow"
    : `koreny.windowShadow.${shadowVariant}${variantStorageVersion ? `.${variantStorageVersion}` : ""}`;
  const defaultShadowStates = {
    0: {
      intensity: 0.24,
      blur: 0.19,
      light: 0.46,
      angle: -17,
      stretch: 1.8,
      x: 25,
      y: -19,
      scale: 0.74
    },
    1: {
      intensity: 0.24,
      blur: 0.19,
      light: 0.46,
      angle: -13,
      stretch: 2.05,
      x: 25,
      y: -19,
      scale: 0.74
    }
  };
  const variantShadowStates = {
    moon: {
      0: {
        intensity: 0.2,
        blur: 0.19,
        light: 0.6,
        angle: -17,
        stretch: 1.8,
        x: 25,
        y: -19,
        scale: 0.74
      },
      1: {
        intensity: 0.2,
        blur: 0.19,
        light: 0.6,
        angle: -13,
        stretch: 2.05,
        x: 25,
        y: -19,
        scale: 0.74
      }
    },
    cave: {
      0: {
        intensity: 0.24,
        blur: 0.19,
        light: 0.56,
        angle: -8,
        stretch: 1.7,
        x: 10,
        y: -12,
        scale: 0.86
      },
      1: {
        intensity: 0.24,
        blur: 0.19,
        light: 0.56,
        angle: -8,
        stretch: 1.7,
        x: 10,
        y: -12,
        scale: 0.86
      }
    }
  };
  const shadowDefaults = variantShadowStates[shadowVariant] || defaultShadowStates;
  const shadowNames = Object.keys(shadowDefaults[1]);
  const shadowRoot = ensureWindowShadow();
  const butterflyLayer = shadowRoot.querySelector(".window-shadow-butterfly");
  const panel = ensureShadowPanel();
  const toggle = panel.querySelector(".shadow-toggle");
  const stateButtons = panel.querySelectorAll("[data-shadow-state]");
  const saveButton = panel.querySelector(".shadow-save");
  const playButton = panel.querySelector(".shadow-play");
  const status = panel.querySelector(".shadow-status");
  let hoverClearImage = null;
  let hoverClearOverlay = null;
  const fadingClearOverlays = [];
  let introAnimationFrame = 0;
  let butterflyAnimationFrame = 0;
  let butterflyTimeout = 0;
  let activeShadowState = "1";
  let shadowStates = readSavedShadowStates();
  setupCaveWaterShadows();

  const shadowControls = {
    intensity: {
      input: panel.querySelector("#shadow-intensity"),
      value: panel.querySelector("#shadow-intensity-value"),
      format: (value) => value.toFixed(2),
      apply: (value) => shadowRoot.style.setProperty("--window-shadow-opacity", value.toFixed(2))
    },
    blur: {
      input: panel.querySelector("#shadow-blur"),
      value: panel.querySelector("#shadow-blur-value"),
      format: (value) => value.toFixed(2),
      apply: (value) => shadowRoot.style.setProperty("--window-shadow-blur", `${(4 + value * 28).toFixed(1)}px`)
    },
    light: {
      input: panel.querySelector("#shadow-light"),
      value: panel.querySelector("#shadow-light-value"),
      format: (value) => value.toFixed(2),
      apply: (value) => shadowRoot.style.setProperty("--window-light-opacity", value.toFixed(2))
    },
    angle: {
      input: panel.querySelector("#shadow-angle"),
      value: panel.querySelector("#shadow-angle-value"),
      format: (value) => value.toFixed(0),
      apply: (value) => shadowRoot.style.setProperty("--window-shadow-angle", `${value.toFixed(0)}deg`)
    },
    stretch: {
      input: panel.querySelector("#shadow-stretch"),
      value: panel.querySelector("#shadow-stretch-value"),
      format: (value) => value.toFixed(2),
      apply: (value) => shadowRoot.style.setProperty("--window-shadow-stretch", value.toFixed(2))
    },
    x: {
      input: panel.querySelector("#shadow-x"),
      value: panel.querySelector("#shadow-x-value"),
      format: (value) => value.toFixed(0),
      apply: (value) => shadowRoot.style.setProperty("--window-shadow-x", `${value.toFixed(0)}vw`)
    },
    y: {
      input: panel.querySelector("#shadow-y"),
      value: panel.querySelector("#shadow-y-value"),
      format: (value) => value.toFixed(0),
      apply: (value) => shadowRoot.style.setProperty("--window-shadow-y", `${value.toFixed(0)}vh`)
    },
    scale: {
      input: panel.querySelector("#shadow-scale"),
      value: panel.querySelector("#shadow-scale-value"),
      format: (value) => value.toFixed(2),
      apply: (value) => shadowRoot.style.setProperty("--window-shadow-scale", value.toFixed(2))
    }
  };

  shadowNames.forEach((name) => {
    const control = shadowControls[name];
    control.input.addEventListener("input", (event) => {
      cancelIntroAnimation();
      cancelButterflyFlight();
      setShadowControl(name, event.target.value);
      status.textContent = "";
    });
  });

  stateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      cancelIntroAnimation();
      cancelButterflyFlight();
      showShadowState(button.dataset.shadowState);
    });
  });

  saveButton.addEventListener("click", () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(shadowStates));
      status.textContent = "Saved";
    } catch {
      status.textContent = "Save failed";
    }
  });

  playButton.addEventListener("click", () => {
    status.textContent = "";
    runIntroAnimation();
  });

  toggle.addEventListener("click", () => {
    const collapsed = panel.classList.toggle("is-collapsed");
    toggle.textContent = collapsed ? "+" : "-";
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute(
      "aria-label",
      collapsed ? "Rozbalit ovladani stinu" : "Minimalizovat ovladani stinu"
    );
  });

  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("mouseenter", () => {
      showHoverClearImage(image);
    });
    image.addEventListener("mousemove", syncClearOverlays);
    image.addEventListener("mouseleave", () => {
      if (hoverClearImage === image) {
        releaseHoverOverlay();
      }
    });
  });

  document.addEventListener("pointerover", (event) => {
    const image = event.target.closest?.("img");
    if (!image || image.classList.contains("shadow-clear-image")) {
      return;
    }

    showHoverClearImage(image);
  }, true);

  document.addEventListener("mouseover", (event) => {
    const image = event.target.closest?.("img");
    if (!image || image.classList.contains("shadow-clear-image")) {
      return;
    }

    showHoverClearImage(image);
  }, true);

  document.addEventListener("pointerout", (event) => {
    if (!hoverClearImage || event.target !== hoverClearImage) {
      return;
    }

    releaseHoverOverlay();
  }, true);

  window.addEventListener("resize", () => {
    syncClearOverlays();
  });
  window.addEventListener("scroll", syncClearOverlays, { passive: true });

  showShadowState("1");
  if (window.KorenyTransitions) {
    window.KorenyTransitions.runProjectIntro(runIntroAnimation);
  } else {
    runIntroAnimation();
  }

  function ensureWindowShadow() {
    const existing = document.querySelector(".window-shadow");
    if (existing) {
      return existing;
    }

    const shadow = document.createElement("div");
    shadow.className = "window-shadow";
    shadow.setAttribute("aria-hidden", "true");
    shadow.innerHTML = `
      <div class="window-shadow-layer window-shadow-frame"></div>
      <div class="window-shadow-layer window-shadow-glass"></div>
      <div class="window-shadow-layer window-shadow-butterfly">
        <div class="butterfly-shadow">
          <span class="butterfly-wing butterfly-wing--left"></span>
          <span class="butterfly-wing butterfly-wing--right"></span>
        </div>
      </div>
      <div class="cave-shadow cave-light"></div>
      <div class="cave-shadow cave-shadow-opening"></div>
      <div class="cave-shadow cave-water-shadows"></div>
    `;
    document.body.insertBefore(shadow, document.querySelector(".page") || document.body.firstChild);
    return shadow;
  }

  function setupCaveWaterShadows() {
    if (shadowVariant !== "cave" || reduceMotionQuery.matches) {
      return;
    }

    const waterLayer = shadowRoot.querySelector(".cave-water-shadows");
    if (!waterLayer) {
      return;
    }

    const drops = [
      { x: "44%", size: "16px", fall: "106vh", duration: "1.42s", delay: "0.8s" },
      { x: "52%", size: "14px", fall: "106vh", duration: "1.65s", delay: "3.4s" },
      { x: "61%", size: "13px", fall: "106vh", duration: "1.89s", delay: "6.0s" },
      { x: "68%", size: "15px", fall: "106vh", duration: "2.07s", delay: "8.8s" }
    ];

    waterLayer.replaceChildren(...drops.map((drop) => {
      const element = document.createElement("span");
      element.className = "cave-drop-shadow";
      element.style.setProperty("--drop-x", drop.x);
      element.style.setProperty("--drop-size", drop.size);
      element.style.setProperty("--drop-fall", drop.fall);
      element.style.setProperty("--drop-duration", drop.duration);
      element.style.setProperty("--drop-delay", drop.delay);
      return element;
    }));
  }

  function ensureShadowPanel() {
    const existing = document.querySelector(".shadow-panel");
    if (existing) {
      return existing;
    }

    const nextPanel = document.createElement("aside");
    nextPanel.className = "shadow-panel is-collapsed";
    nextPanel.setAttribute("aria-label", "Window shadow controls");
    nextPanel.innerHTML = `
      <div class="shadow-panel-header">
        <div class="shadow-panel-title">Window shadow</div>
        <button class="shadow-toggle" type="button" aria-expanded="false" aria-label="Rozbalit ovladani stinu">+</button>
      </div>
      <div class="shadow-panel-body">
        <div class="shadow-state-row" aria-label="Animation state">
          <button class="shadow-state" data-shadow-state="0" type="button">0</button>
          <button class="shadow-state is-active" data-shadow-state="1" type="button">1</button>
          <button class="shadow-play" type="button">Play</button>
          <button class="shadow-save" type="button">Save</button>
        </div>
        <div class="shadow-status" aria-live="polite"></div>
        ${shadowControlTemplate("intensity", "Intensity", "0", "1", "0.01", "0.24")}
        ${shadowControlTemplate("blur", "Blur", "0", "1", "0.01", "0.19")}
        ${shadowControlTemplate("light", "Glass light", "0", "1", "0.01", "0.46")}
        ${shadowControlTemplate("angle", "Angle", "-36", "8", "1", "-13")}
        ${shadowControlTemplate("stretch", "Projection", "0.85", "3.6", "0.01", "2.05")}
        ${shadowControlTemplate("x", "Offset X", "-56", "72", "1", "25")}
        ${shadowControlTemplate("y", "Offset Y", "-72", "56", "1", "-19")}
        ${shadowControlTemplate("scale", "Scale", "0.65", "2.4", "0.01", "0.74")}
      </div>
    `;
    document.body.appendChild(nextPanel);
    return nextPanel;
  }

  function shadowControlTemplate(name, label, min, max, step, value) {
    return `
      <div class="shadow-control">
        <label for="shadow-${name}">${label} <span class="shadow-value" id="shadow-${name}-value"></span></label>
        <input id="shadow-${name}" data-shadow-control="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">
      </div>
    `;
  }

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(shadowDefaults));
  }

  function readSavedShadowStates() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || typeof saved !== "object") {
        return cloneDefaults();
      }

      return {
        0: Object.fromEntries(shadowNames.map((name) => {
          const value = Number(saved[0]?.[name]);
          return [name, Number.isFinite(value) ? value : shadowDefaults[0][name]];
        })),
        1: Object.fromEntries(shadowNames.map((name) => {
          const value = Number(saved[1]?.[name]);
          return [name, Number.isFinite(value) ? value : shadowDefaults[1][name]];
        }))
      };
    } catch {
      return cloneDefaults();
    }
  }

  function setShadowControl(name, rawValue, options = {}) {
    const control = shadowControls[name];
    const value = Number(rawValue);
    control.input.value = String(value);
    control.value.textContent = control.format(value);
    if (options.updateState !== false) {
      shadowStates[activeShadowState][name] = value;
    }
    if (options.apply !== false) {
      control.apply(value);
    }
  }

  function applyAnimatedShadowValue(name, value) {
    if (name === "intensity") {
      shadowRoot.style.setProperty("--window-shadow-opacity", value.toFixed(4));
    } else if (name === "blur") {
      shadowRoot.style.setProperty("--window-shadow-blur", `${(4 + value * 28).toFixed(3)}px`);
    } else if (name === "light") {
      shadowRoot.style.setProperty("--window-light-opacity", value.toFixed(4));
    } else if (name === "angle") {
      shadowRoot.style.setProperty("--window-shadow-angle", `${value.toFixed(3)}deg`);
    } else if (name === "stretch") {
      shadowRoot.style.setProperty("--window-shadow-stretch", value.toFixed(4));
    } else if (name === "x") {
      shadowRoot.style.setProperty("--window-shadow-x", `${value.toFixed(3)}vw`);
    } else if (name === "y") {
      shadowRoot.style.setProperty("--window-shadow-y", `${value.toFixed(3)}vh`);
    } else if (name === "scale") {
      shadowRoot.style.setProperty("--window-shadow-scale", value.toFixed(4));
    }
  }

  function applyShadowState(stateKey) {
    shadowNames.forEach((name) => {
      setShadowControl(name, shadowStates[stateKey][name], {
        updateState: false
      });
    });
  }

  function showShadowState(stateKey) {
    activeShadowState = stateKey;
    stateButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.shadowState === stateKey);
    });
    applyShadowState(stateKey);
    status.textContent = "";
  }

  function cancelIntroAnimation() {
    if (introAnimationFrame) {
      cancelAnimationFrame(introAnimationFrame);
      introAnimationFrame = 0;
    }
  }

  function cancelButterflyFlight() {
    if (butterflyAnimationFrame) {
      cancelAnimationFrame(butterflyAnimationFrame);
      butterflyAnimationFrame = 0;
    }

    if (butterflyTimeout) {
      clearTimeout(butterflyTimeout);
      butterflyTimeout = 0;
    }

    butterflyLayer.style.setProperty("--butterfly-opacity", "0");
  }

  function smoothstep(value) {
    return value * value * (3 - 2 * value);
  }

  function cubicBezier(a, b, c, d, t) {
    const mt = 1 - t;
    return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
  }

  function runButterflyFlight() {
    cancelButterflyFlight();

    if (reduceMotionQuery.matches) {
      return;
    }

    const upward = Math.random() > 0.5;
    const startX = 42 + Math.random() * 34;
    const endX = 42 + Math.random() * 34;
    const startY = upward ? 84 + Math.random() * 8 : 24 - Math.random() * 8;
    const endY = upward ? 24 - Math.random() * 8 : 84 + Math.random() * 8;
    const control1X = 38 + Math.random() * 42;
    const control2X = 38 + Math.random() * 42;
    const control1Y = upward ? 66 + Math.random() * 18 : 42 - Math.random() * 18;
    const control2Y = upward ? 42 - Math.random() * 18 : 66 + Math.random() * 18;
    const drift = -12 + Math.random() * 24;
    const wobble = 2.4 + Math.random() * 3.2;
    const duration = 4200 + Math.random() * 1500;
    const seed = Math.random() * Math.PI * 2;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = smoothstep(progress);
      const arc = Math.sin(progress * Math.PI);
      const x = cubicBezier(startX, control1X, control2X, endX, eased)
        + drift * arc
        + Math.sin(progress * Math.PI * 8 + seed) * wobble
        + Math.sin(progress * Math.PI * 17 + seed * 1.7) * wobble * 0.26;
      const y = cubicBezier(startY, control1Y, control2Y, endY, eased)
        + Math.sin(progress * Math.PI * 6 + seed) * wobble * 0.82
        + Math.sin(progress * Math.PI * 15 + seed * 0.8) * wobble * 0.18;
      const fade = Math.min(smoothstep(Math.min(progress / 0.18, 1)), smoothstep(Math.min((1 - progress) / 0.22, 1)));
      const nextT = Math.min(eased + 0.01, 1);
      const nextX = cubicBezier(startX, control1X, control2X, endX, nextT);
      const nextY = cubicBezier(startY, control1Y, control2Y, endY, nextT);
      const flap = Math.abs(Math.sin(now * 0.068 + seed));
      const wing = 18 + flap * 62 + Math.sin(now * 0.112 + seed) * 7;
      const wingSpread = 0.42 + flap * 0.92;
      const rotation = Math.atan2(nextY - y, nextX - x) * 180 / Math.PI + Math.sin(progress * Math.PI * 9 + seed) * 13;
      const scale = 0.52 + arc * 0.22 + Math.sin(progress * Math.PI * 13 + seed) * 0.05;

      butterflyLayer.style.setProperty("--butterfly-x", `${x.toFixed(3)}%`);
      butterflyLayer.style.setProperty("--butterfly-y", `${y.toFixed(3)}%`);
      butterflyLayer.style.setProperty("--butterfly-opacity", (fade * 0.92).toFixed(3));
      butterflyLayer.style.setProperty("--butterfly-wing", `${wing.toFixed(3)}deg`);
      butterflyLayer.style.setProperty("--butterfly-wing-spread", wingSpread.toFixed(3));
      butterflyLayer.style.setProperty("--butterfly-rotate", `${rotation.toFixed(3)}deg`);
      butterflyLayer.style.setProperty("--butterfly-scale", scale.toFixed(3));

      if (progress < 1) {
        butterflyAnimationFrame = requestAnimationFrame(tick);
      } else {
        butterflyAnimationFrame = 0;
        butterflyLayer.style.setProperty("--butterfly-opacity", "0");
        scheduleButterflyFlight();
      }
    }

    butterflyAnimationFrame = requestAnimationFrame(tick);
  }

  function scheduleButterflyFlight() {
    if (shadowVariant !== "window" && shadowVariant !== "moon") {
      return;
    }

    cancelButterflyFlight();
    butterflyTimeout = setTimeout(runButterflyFlight, 2400 + Math.random() * 5200);
  }

  function runIntroAnimation() {
    cancelIntroAnimation();
    cancelButterflyFlight();

    if (reduceMotionQuery.matches) {
      showShadowState("1");
      return;
    }

    const startState = shadowStates[0];
    const endState = shadowStates[1];
    const animatedShadowNames = shadowNames.filter((name) => {
      return name !== "blur" && Math.abs(endState[name] - startState[name]) > 0.0001;
    });
    const duration = 1650;
    const start = performance.now();

    function easeInOutQuad(value) {
      return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
    }

    shadowNames.forEach((name) => {
      applyAnimatedShadowValue(name, startState[name]);
    });

    if (!animatedShadowNames.length) {
      showShadowState("1");
      scheduleButterflyFlight();
      return;
    }

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = easeInOutQuad(progress);

      animatedShadowNames.forEach((name) => {
        const value = startState[name] + (endState[name] - startState[name]) * eased;
        applyAnimatedShadowValue(name, value);
      });

      if (progress < 1) {
        introAnimationFrame = requestAnimationFrame(tick);
      } else {
        introAnimationFrame = 0;
        showShadowState("1");
        scheduleButterflyFlight();
      }
    }

    introAnimationFrame = requestAnimationFrame(tick);
  }

  function createClearOverlay() {
    const image = document.createElement("img");
    image.className = "shadow-clear-image";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    return image;
  }

  function positionClearOverlay(overlay, sourceImage) {
    if (!overlay || !sourceImage) {
      return false;
    }

    const rect = sourceImage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.right < 0 || rect.left > window.innerWidth || rect.bottom < 0 || rect.top > window.innerHeight) {
      overlay.style.opacity = "0";
      return false;
    }

    const styles = getComputedStyle(sourceImage);
    overlay.src = sourceImage.currentSrc || sourceImage.src;
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.objectFit = styles.objectFit;
    overlay.style.objectPosition = styles.objectPosition;
    overlay.style.borderRadius = styles.borderRadius;
    return true;
  }

  function trackFadingClearOverlay(overlay, sourceImage, duration = 2200) {
    if (!overlay || !sourceImage) {
      return;
    }

    const item = { overlay, sourceImage };
    fadingClearOverlays.push(item);
    overlay.style.opacity = "0";
    window.setTimeout(() => {
      const index = fadingClearOverlays.indexOf(item);
      if (index !== -1) {
        fadingClearOverlays.splice(index, 1);
      }
      overlay.remove();
    }, duration);
  }

  function syncClearOverlays() {
    if (hoverClearOverlay && hoverClearImage) {
      positionClearOverlay(hoverClearOverlay, hoverClearImage);
    }
    for (const item of fadingClearOverlays) {
      positionClearOverlay(item.overlay, item.sourceImage);
    }
  }

  function releaseHoverOverlay() {
    if (!hoverClearOverlay) {
      hoverClearImage = null;
      return;
    }

    const overlay = hoverClearOverlay;
    const sourceImage = hoverClearImage;
    hoverClearImage = null;
    hoverClearOverlay = null;
    trackFadingClearOverlay(overlay, sourceImage, 2200);
  }

  function showHoverClearImage(image) {
    if (!image || image === hoverClearImage || image.classList.contains("shadow-clear-image")) {
      return;
    }

    releaseHoverOverlay();
    const overlay = createClearOverlay();
    if (!positionClearOverlay(overlay, image)) {
      return;
    }

    hoverClearImage = image;
    hoverClearOverlay = overlay;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });
  }
})();
