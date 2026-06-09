(function () {
  const flowers = [
    "assets/flower-horizontal-bloom.svg",
    "assets/flower-rosette-cross.svg",
    "assets/flower-diagonal-pair.svg",
    "assets/flower-side-bloom.svg",
    "assets/flower-stacked-stem.svg"
  ];

  const targets = [
    ...[...document.querySelectorAll(".project-index")].map((element) => ({ element, mode: "prefix" })),
    ...[...document.querySelectorAll(".eyebrow > span:first-child")].map((element) => ({ element, mode: "separator" }))
  ];

  targets.forEach(({ element: target, mode }) => {
    if (target.classList.contains("flower-index")) {
      return;
    }

    const text = target.textContent.trim();
    const match = text.match(/\d+/);
    const seed = match ? Number(match[0]) : hashText(text);
    const flower = new URL(flowers[Math.abs(seed - 1) % flowers.length], document.baseURI).href;
    const rotation = ((seed * 37) % 28) - 14;

    target.textContent = "";
    target.classList.add("flower-index");
    target.style.setProperty("--flower-index-icon", `url("${flower}")`);
    target.style.setProperty("--flower-index-rotation", `${rotation}deg`);

    const icon = document.createElement("span");
    icon.className = "flower-index__icon";
    icon.setAttribute("aria-hidden", "true");

    if (mode === "separator" && text.includes("/")) {
      const [index, ...rest] = text.split("/");
      const indexLabel = document.createElement("span");
      indexLabel.className = "flower-index__text";
      indexLabel.textContent = index.trim();

      const titleLabel = document.createElement("span");
      titleLabel.className = "flower-index__text";
      titleLabel.textContent = rest.join("/").trim();

      target.append(indexLabel, icon, titleLabel);
      return;
    }

    const label = document.createElement("span");
    label.className = "flower-index__text";
    label.textContent = text;

    target.append(icon, label);
  });

  function hashText(text) {
    return [...text].reduce((hash, char) => hash + char.charCodeAt(0), 0);
  }
})();
