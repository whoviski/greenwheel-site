(function () {
  var KEY = "gw-cookie-consent";
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
  var banner = null;
  var lastFocus = null;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.necessary !== true || typeof data.ts !== "number") return null;
      if (Date.now() - data.ts > MAX_AGE_MS) return null;
      data.analytics = !!data.analytics;
      data.marketing = !!data.marketing;
      return data;
    } catch (err) {
      return null;
    }
  }

  function apply(choice) {
    document.documentElement.setAttribute("data-consent", choice ? "set" : "unset");
    /* Optional scripts may be inserted only inside this function,
       and only after the matching flag is true. This site has none. */
    if (choice && choice.analytics) return;
    if (choice && choice.marketing) return;
  }

  function write(choice) {
    var data = {
      necessary: true,
      analytics: !!choice.analytics,
      marketing: !!choice.marketing,
      ts: Date.now()
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    apply(data);
    return data;
  }

  function setOpen(open) {
    if (!banner) return;
    banner.hidden = !open;
    if (open) {
      lastFocus = document.activeElement;
      banner.focus();
    } else if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  }

  function fill(choice) {
    var analytics = banner.querySelector("#cookie-analytics");
    var marketing = banner.querySelector("#cookie-marketing");
    analytics.checked = !!(choice && choice.analytics);
    marketing.checked = !!(choice && choice.marketing);
  }

  function build() {
    banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.id = "cookie-banner";
    banner.hidden = true;
    banner.tabIndex = -1;
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-labelledby", "cookie-title");
    banner.setAttribute("aria-describedby", "cookie-text");
    banner.innerHTML =
      '<h2 id="cookie-title">Файлы cookie и локальное хранение</h2>' +
      '<p id="cookie-text">Сайт не ставит аналитические и рекламные cookie. В этом браузере сохраняется только ваш выбор по баннеру (localStorage, ключ gw-cookie-consent). Подробности — в <a href="cookies.html">политике cookie</a>.</p>' +
      '<div class="cookie-actions">' +
      '<button type="button" class="cookie-primary" id="cookie-all">Принять все</button>' +
      '<button type="button" id="cookie-necessary">Только необходимые</button>' +
      '<button type="button" id="cookie-configure" aria-expanded="false" aria-controls="cookie-panel">Настроить</button>' +
      "</div>" +
      '<div class="cookie-panel" id="cookie-panel" hidden>' +
      "<fieldset>" +
      "<legend>Категории</legend>" +
      '<label><input type="checkbox" checked disabled> Необходимые. Запись выбора в этом браузере, чтобы не спрашивать снова в течение 365 суток.</label>' +
      '<label><input type="checkbox" id="cookie-analytics"> Аналитические. Сейчас не используются: счётчики не подключаются, даже если пункт отмечен.</label>' +
      '<label><input type="checkbox" id="cookie-marketing"> Маркетинговые. Сейчас не используются: рекламные скрипты не подключаются, даже если пункт отмечен.</label>' +
      "</fieldset>" +
      '<div class="cookie-panel-actions"><button type="button" class="cookie-primary" id="cookie-save">Сохранить выбор</button></div>' +
      "</div>";
    document.body.appendChild(banner);

    banner.querySelector("#cookie-all").addEventListener("click", function () {
      write({ analytics: true, marketing: true });
      setOpen(false);
    });
    banner.querySelector("#cookie-necessary").addEventListener("click", function () {
      write({ analytics: false, marketing: false });
      setOpen(false);
    });
    banner.querySelector("#cookie-configure").addEventListener("click", function (event) {
      var panel = banner.querySelector("#cookie-panel");
      var open = panel.hidden;
      panel.hidden = !open;
      event.currentTarget.setAttribute("aria-expanded", String(open));
    });
    banner.querySelector("#cookie-save").addEventListener("click", function () {
      write({
        analytics: banner.querySelector("#cookie-analytics").checked,
        marketing: banner.querySelector("#cookie-marketing").checked
      });
      setOpen(false);
    });
    banner.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (!read()) return;
      setOpen(false);
    });
  }

  function openSettings() {
    fill(read());
    var panel = banner.querySelector("#cookie-panel");
    panel.hidden = false;
    banner.querySelector("#cookie-configure").setAttribute("aria-expanded", "true");
    setOpen(true);
  }

  document.querySelectorAll(".cookie-settings").forEach(function (button) {
    button.addEventListener("click", openSettings);
  });

  build();
  var existing = read();
  apply(existing);
  if (!existing) {
    fill(null);
    setOpen(true);
  }
})();
