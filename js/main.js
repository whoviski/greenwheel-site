(function () {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("site-menu");
  const scrollBar = document.getElementById("scroll-bar");
  const links = Array.from(document.querySelectorAll(".menu a"));
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  function closeMenu() {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.querySelector(".sr-only").textContent = "Открыть меню";
  }

  toggle.addEventListener("click", function () {
    const open = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".sr-only").textContent = open ? "Закрыть меню" : "Открыть меню";
  });

  links.forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenu();
  });

  function onScroll() {
    const max = root.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    scrollBar.style.transform = "scaleX(" + progress + ")";
    header.classList.toggle("is-scrolled", window.scrollY > 8);

    const marker = window.scrollY + header.offsetHeight + 40;
    let current = sections[0];
    sections.forEach(function (section) {
      if (section.offsetTop <= marker) current = section;
    });
    links.forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + current.id);
    });
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const revealNodes = Array.from(document.querySelectorAll(".reveal"));
  if (reduced || !("IntersectionObserver" in window)) {
    revealNodes.forEach(function (node) { node.classList.add("is-visible"); });
  } else {
    const seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        seen.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px 40px 0px" });

    revealNodes.forEach(function (node) {
      node.classList.add("prepare");
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            node.classList.add("is-visible");
          });
        });
      } else {
        seen.observe(node);
      }
    });
  }

  const hero = document.querySelector(".hero");
  if (!reduced && window.matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", function (event) {
      const x = (event.clientX / window.innerWidth - 0.5) * 18;
      const y = (event.clientY / window.innerHeight - 0.5) * 14;
      hero.style.setProperty("--mx", x + "px");
      hero.style.setProperty("--my", y + "px");
    });
  }

  const filters = Array.from(document.querySelectorAll(".filters button"));
  const filterEmpty = document.getElementById("filter-empty");
  const stage2 = document.getElementById("stage-2");

  function applyFilter(name) {
    filters.forEach(function (button) {
      const on = button.dataset.filter === name;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-pressed", String(on));
    });

    document.querySelectorAll("[data-status]").forEach(function (node) {
      const show = name === "all" || node.dataset.status === name;
      node.classList.toggle("is-hidden", !show);
    });

    const visibleTasks = stage2.querySelectorAll("li:not(.is-hidden)").length;
    stage2.classList.toggle("is-hidden", visibleTasks === 0);
    const anyVisible = document.querySelectorAll(".stage:not(.is-hidden)").length > 0;
    filterEmpty.hidden = anyVisible;
  }

  filters.forEach(function (button) {
    button.addEventListener("click", function () {
      applyFilter(button.dataset.filter);
    });
  });

  const wrap = document.getElementById("wheel-wrap");
  const canvas = document.getElementById("wheel");
  const ctx = canvas.getContext("2d");
  const tip = document.getElementById("wheel-tip");
  const status = document.getElementById("wheel-status");
  const toggleSpin = document.getElementById("wheel-toggle");
  const resetButton = document.getElementById("wheel-reset");
  const trayButtons = Array.from(document.querySelectorAll("[data-tray]"));

  if (!ctx) return;

  wrap.classList.add("is-live");
  canvas.removeAttribute("aria-hidden");
  const wheelSvg = wrap.querySelector(".wheel-svg");
  wheelSvg.setAttribute("aria-hidden", "true");
  wheelSvg.removeAttribute("role");
  wheelSvg.removeAttribute("aria-label");

  let logical = { w: 1, h: 1 };
  let angle = -Math.PI / 2;
  let running = !reduced;
  let hoverIndex = -1;
  let lockedIndex = -1;
  let raf = 0;
  const trays = [];
  const defaultStatus = status.textContent;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    logical = { w: rect.width, h: rect.height };
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function leaf(x, y, scale, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(6, 2, 5, -7, 0, -11);
    ctx.bezierCurveTo(-5, -7, -6, 2, 0, 7);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawStand(cx, cy, size) {
    ctx.save();
    ctx.strokeStyle = "rgba(214, 255, 74, 0.28)";
    ctx.lineWidth = Math.max(2, size * 0.012);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.46, cy + size * 0.42);
    ctx.lineTo(cx - size * 0.12, cy + size * 0.02);
    ctx.moveTo(cx + size * 0.46, cy + size * 0.42);
    ctx.lineTo(cx + size * 0.12, cy + size * 0.02);
    ctx.moveTo(cx - size * 0.5, cy + size * 0.42);
    ctx.lineTo(cx + size * 0.5, cy + size * 0.42);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    const w = logical.w;
    const h = logical.h;
    const cx = w / 2;
    const cy = h / 2 + h * 0.01;
    const size = Math.min(w, h);
    const orbit = size * 0.34;
    ctx.clearRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 0.48);
    glow.addColorStop(0, "rgba(214, 255, 74, 0.16)");
    glow.addColorStop(1, "rgba(214, 255, 74, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
    ctx.fill();

    drawStand(cx, cy, size);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, orbit * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(214, 255, 74, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, orbit + size * 0.07, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    trays.length = 0;
    const active = hoverIndex >= 0 ? hoverIndex : lockedIndex;
    const trayW = size * 0.2;
    const trayH = size * 0.085;

    for (let i = 0; i < 8; i += 1) {
      const a = angle + (i * Math.PI * 2) / 8;
      const x = cx + Math.cos(a) * orbit;
      const y = cy + Math.sin(a) * orbit;
      trays.push({ i: i, x: x, y: y, w: trayW, h: trayH });

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.strokeStyle = i === active ? "rgba(214, 255, 74, 0.95)" : "rgba(214, 255, 74, 0.35)";
      ctx.lineWidth = i === active ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(size * 0.07, 0);
      ctx.lineTo(orbit - trayH, 0);
      ctx.stroke();
      ctx.restore();
    }

    trays.forEach(function (tray) {
      const highlighted = tray.i === active;
      ctx.save();
      ctx.translate(tray.x, tray.y);
      if (highlighted) ctx.scale(1.08, 1.08);
      ctx.shadowColor = highlighted ? "rgba(214, 255, 74, 0.55)" : "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = highlighted ? 18 : 10;
      ctx.shadowOffsetY = 6;

      const gradient = ctx.createLinearGradient(0, -tray.h / 2, 0, tray.h / 2);
      gradient.addColorStop(0, "#fffaf0");
      gradient.addColorStop(1, "#e4d3ae");
      roundRect(-tray.w / 2, -tray.h / 2, tray.w, tray.h, 8);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = highlighted ? 2.5 : 1.4;
      ctx.strokeStyle = highlighted ? "#d6ff4a" : "#245c40";
      ctx.stroke();

      ctx.fillStyle = "#6d8f62";
      roundRect(-tray.w / 2 + 4, -2, tray.w - 8, tray.h / 2 - 2, 4);
      ctx.fill();

      const greens = ["#1c7a40", "#3dad62", "#8fd86a", "#c6f25c"];
      for (let n = 0; n < 4; n += 1) {
        const lx = -tray.w * 0.36 + n * tray.w * 0.16;
        leaf(lx, -tray.h * 0.15, tray.h * 0.042, -0.5 + n * 0.28, greens[n % greens.length]);
      }

      ctx.fillStyle = "#163728";
      ctx.font = "700 " + Math.max(11, size * 0.028) + "px Manrope, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(String(tray.i + 1), tray.w / 2 - 6, tray.h / 2 - 3);
      ctx.restore();
    });

    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.075, 0, Math.PI * 2);
    ctx.fillStyle = "#123728";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#d6ff4a";
    ctx.stroke();
    ctx.fillStyle = "#d6ff4a";
    ctx.font = "700 " + size * 0.055 + "px Unbounded, Manrope, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("8", 0, 1);
    ctx.restore();
  }

  function activeIndex() {
    return hoverIndex >= 0 ? hoverIndex : lockedIndex;
  }

  let shownIndex = -2;

  function paintStatus() {
    const index = activeIndex();
    if (index !== shownIndex) {
      shownIndex = index;
      trayButtons.forEach(function (button) {
        button.classList.toggle("is-selected", Number(button.dataset.tray) === index);
      });
      if (index < 0) {
        tip.hidden = true;
        status.textContent = defaultStatus;
      } else {
        const label = "Лоток " + (index + 1) + " из 8";
        status.textContent = label + ". Один из восьми лотков роторного колеса для микрозелени.";
        tip.hidden = false;
        tip.textContent = label;
      }
    }
    if (index < 0) return;
    const tray = trays.find(function (item) { return item.i === index; });
    if (!tray) return;
    tip.hidden = false;
    tip.style.left = (tray.x / logical.w) * 100 + "%";
    tip.style.top = (tray.y / logical.h) * 100 + "%";
  }

  function pointerPos(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function hit(x, y) {
    for (let i = trays.length - 1; i >= 0; i -= 1) {
      const tray = trays[i];
      if (Math.abs(x - tray.x) <= tray.w / 2 + 8 && Math.abs(y - tray.y) <= tray.h / 2 + 8) {
        return tray.i;
      }
    }
    return -1;
  }

  function frame() {
    const speed = hoverIndex >= 0 ? 0.0014 : 0.0045;
    if (running) angle += speed;
    draw();
    paintStatus();
    if (running) raf = window.requestAnimationFrame(frame);
    else raf = 0;
  }

  function renderOnce() {
    if (logical.w < 2) return;
    draw();
    paintStatus();
  }

  function syncPointer(event) {
    const pos = pointerPos(event);
    hoverIndex = hit(pos.x, pos.y);
    canvas.style.cursor = hoverIndex >= 0 ? "pointer" : "default";
    if (!running) renderOnce();
  }

  canvas.addEventListener("pointermove", syncPointer);

  canvas.addEventListener("pointerleave", function () {
    hoverIndex = -1;
    if (!running) renderOnce();
  });

  canvas.addEventListener("pointerdown", function (event) {
    const pos = pointerPos(event);
    const index = hit(pos.x, pos.y);
    if (index >= 0) lockedIndex = index;
    if (!running) renderOnce();
  });

  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Иллюстрация роторного колеса с восемью лотками. Стрелки выбирают лоток.");

  canvas.addEventListener("keydown", function (event) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const base = activeIndex() < 0 ? 0 : activeIndex();
    lockedIndex = (base + delta + 8) % 8;
    hoverIndex = -1;
    if (!running) renderOnce();
  });

  trayButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      lockedIndex = Number(button.dataset.tray);
      hoverIndex = -1;
      if (!running) renderOnce();
    });
  });

  toggleSpin.addEventListener("click", function () {
    running = !running;
    toggleSpin.setAttribute("aria-pressed", String(!running));
    toggleSpin.textContent = running ? "Пауза" : "Продолжить";
    if (!raf) frame();
  });

  resetButton.addEventListener("click", function () {
    lockedIndex = -1;
    hoverIndex = -1;
    if (!running) renderOnce();
  });

  const observer = new ResizeObserver(function () {
    resize();
    renderOnce();
  });
  observer.observe(wrap);
  resize();
  renderOnce();

  if (reduced) {
    running = false;
    toggleSpin.textContent = "Продолжить";
    toggleSpin.setAttribute("aria-pressed", "true");
    renderOnce();
  } else {
    frame();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      return;
    }
    if (running && !raf) frame();
  });
})();
