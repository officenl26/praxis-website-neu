/* ═══════════════════════════════════════════════════════════════════
   np-consent.js · Consent-Banner + Google Analytics 4 + Meta-Pixel
   für naturheilpraxis-lurz.de

   - Vor Einwilligung wird nichts geladen, kein Cookie gesetzt.
   - Zwei getrennte Zwecke: Statistik (GA4) und Marketing (Meta-Pixel).
     "Ablehnen", "Nur Statistik" und "Alle akzeptieren" sind gleichwertig
     gestaltet und je ein Klick (DSGVO, § 25 TDDDG).
   - Die Wahl liegt in localStorage ("np_consent" als JSON mit Zeitstempel),
     sie verfällt nach 12 Monaten und der Banner fragt erneut.
   - Widerruf: Link mit data-np-consent-open oder window.npConsent.open().
     Wird eine Einwilligung zurückgenommen, löscht das Skript die Cookies
     und lädt die Seite neu, damit nichts weiterläuft.
   - GA4: Google Consent Mode v2, Google Signale und Werbe-Personalisierung aus.
   - Meta-Pixel: nur PageView, automatische Ereignis-Erkennung aus,
     auf Blog-Artikeln (Gesundheitsthemen) gar nicht geladen.
     Conversion je Seite optional über window.NP_META_EVENT
     (z. B. { name: "Lead" }), feuert einmal pro Sitzung und Seite.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var STORAGE_KEY = "np_consent";
  var GA_ID = "G-DKGPX2XSJ8";
  var PIXEL_ID = "527175982943912";
  var PRIVACY_URL = "/datenschutz/";
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 12 Monate

  // Seiten, auf denen der Meta-Pixel nie lädt: Blog-Artikel zu Gesundheitsthemen
  // (die URL allein ließe Rückschlüsse auf Gesundheitsdaten zu, Art. 9 DSGVO).
  function metaAllowedHere() {
    return !/^\/blog\/.+/.test(location.pathname);
  }

  /* ---------- Einwilligung lesen / schreiben ---------- */
  function readConsent() {
    var raw;
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try {
      var obj = JSON.parse(raw);
      if (!obj || typeof obj.s !== "boolean" || typeof obj.m !== "boolean") return null;
      if (typeof obj.t === "number" && Date.now() - obj.t > MAX_AGE_MS) return null;
      return { stats: obj.s, marketing: obj.m };
    } catch (e) { return null; }
  }
  function writeConsent(stats, marketing) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ s: !!stats, m: !!marketing, t: Date.now() }));
    } catch (e) {}
  }

  /* ---------- Google Analytics 4 ---------- */
  var gaStarted = false;

  function startGA() {
    if (gaStarted) return;
    gaStarted = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted"
    });
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }

  /* ---------- Meta-Pixel ---------- */
  var pixelStarted = false;

  function startPixel() {
    if (pixelStarted || !metaAllowedHere()) return;
    pixelStarted = true;

    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0";
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    // Keine automatische Erfassung von Klicks und Formularinhalten
    window.fbq("set", "autoConfig", false, PIXEL_ID);
    window.fbq("init", PIXEL_ID);
    window.fbq("track", "PageView");
    firePageEvent();
  }

  // Conversion-Event nur einmal je Sitzung und Seite feuern
  function alreadyFired(name) {
    var key = "np_ev_" + name + "_" + location.pathname;
    try {
      if (window.sessionStorage.getItem(key)) return true;
      window.sessionStorage.setItem(key, "1");
      return false;
    } catch (e) { return false; }
  }

  function firePageEvent() {
    var ev = window.NP_META_EVENT;
    if (!ev || !ev.name) return;
    try {
      if (!alreadyFired(ev.name)) window.fbq("track", ev.name, ev.params || {});
    } catch (e) {}
  }

  /* ---------- Widerruf: Cookies entfernen ---------- */
  function deleteCookies(prefixes) {
    var all = document.cookie ? document.cookie.split(";") : [];
    var host = location.hostname.replace(/^www\./, "");
    for (var i = 0; i < all.length; i++) {
      var name = all[i].split("=")[0].trim();
      for (var j = 0; j < prefixes.length; j++) {
        if (name.indexOf(prefixes[j]) === 0) {
          var exp = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
          document.cookie = name + exp;
          document.cookie = name + exp + "; domain=" + host;
          document.cookie = name + exp + "; domain=." + host;
        }
      }
    }
  }

  function apply(stats, marketing) {
    var before = readConsent() || { stats: false, marketing: false };
    writeConsent(stats, marketing);
    removeBanner();

    var revoked = (before.stats && !stats) || (before.marketing && !marketing);
    if (revoked) {
      if (!stats && gaStarted) {
        // GA sofort stoppen, sonst schreibt es seine Cookies vor dem Reload neu
        window["ga-disable-" + GA_ID] = true;
        window.gtag("consent", "update", { analytics_storage: "denied" });
      }
      if (!marketing && pixelStarted) window.fbq("consent", "revoke");
      if (!stats) deleteCookies(["_ga"]);
      if (!marketing) deleteCookies(["_fbp", "_fbc"]);
      location.reload();
      return;
    }
    if (stats) startGA();
    if (marketing) startPixel();
  }

  /* ---------- Banner ---------- */
  var STYLE = [
    ".npc-banner{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;",
    "background:var(--bg-elev,#161A17);color:var(--text,#F2EFE6);",
    "border-top:1px solid var(--line-strong,rgba(242,239,230,.16));",
    "font-family:var(--font-sans,'Inter',system-ui,-apple-system,sans-serif);",
    "box-shadow:0 -8px 40px rgba(0,0,0,.4)}",
    ".npc-inner{max-width:1040px;margin:0 auto;padding:20px 24px;display:flex;",
    "gap:16px 28px;align-items:center;flex-wrap:wrap}",
    ".npc-text{flex:1 1 360px;font-size:14px;line-height:1.6;color:var(--text-soft,#C9C7BD);margin:0}",
    ".npc-text strong{color:var(--text,#F2EFE6);font-weight:600}",
    ".npc-text a{color:var(--sage,#8FA68E);text-decoration:underline}",
    ".npc-actions{display:flex;gap:10px;flex-wrap:wrap}",
    ".npc-btn{font:inherit;font-size:14px;font-weight:600;padding:11px 20px;border-radius:8px;",
    "cursor:pointer;line-height:1;transition:opacity .15s;",
    "background:var(--surface,#1A201C);color:var(--text,#F2EFE6);",
    "border:1px solid rgba(143,166,142,.55)}",
    ".npc-btn:hover{opacity:.85}",
    ".npc-btn:focus-visible{outline:2px solid var(--sage,#8FA68E);outline-offset:2px}",
    "@media(max-width:600px){.npc-inner{padding:16px}.npc-actions{width:100%}",
    ".npc-btn{flex:1 1 auto;text-align:center;padding:12px 10px}}"
  ].join("");

  function injectStyle() {
    if (document.getElementById("npc-style")) return;
    var s = document.createElement("style");
    s.id = "npc-style";
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function removeBanner() {
    var b = document.getElementById("npc-banner");
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  function showBanner() {
    injectStyle();
    removeBanner();

    var wrap = document.createElement("div");
    wrap.className = "npc-banner";
    wrap.id = "npc-banner";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Einwilligung zu Statistik und Marketing");

    wrap.innerHTML =
      '<div class="npc-inner">' +
        '<p class="npc-text">Mit Ihrer Einwilligung nutzt diese Website <strong>Google Analytics</strong>, ' +
        'um zu sehen, welche Seiten gelesen werden, und den <strong>Meta-Pixel</strong> (Facebook, Instagram), ' +
        'um die Wirkung von Anzeigen zu messen. Beide setzen Cookies, dabei können Daten in die USA übertragen werden. ' +
        'Ohne Ihre Zustimmung wird nichts davon geladen. Ihre Wahl können Sie jederzeit unter ' +
        '„Cookie-Einstellungen" im Seitenfuß ändern. Mehr in der ' +
        '<a href="' + PRIVACY_URL + '">Datenschutzerklärung</a>.</p>' +
        '<div class="npc-actions">' +
          '<button type="button" class="npc-btn" id="npc-decline">Ablehnen</button>' +
          '<button type="button" class="npc-btn" id="npc-stats">Nur Statistik</button>' +
          '<button type="button" class="npc-btn" id="npc-accept">Alle akzeptieren</button>' +
        '</div>' +
      '</div>';

    (document.body || document.documentElement).appendChild(wrap);

    document.getElementById("npc-decline").addEventListener("click", function () { apply(false, false); });
    document.getElementById("npc-stats").addEventListener("click", function () { apply(true, false); });
    document.getElementById("npc-accept").addEventListener("click", function () { apply(true, true); });
  }

  /* ---------- Öffentliche Steuerung ---------- */
  window.npConsent = {
    open: showBanner,
    acceptAll: function () { apply(true, true); },
    statsOnly: function () { apply(true, false); },
    decline: function () { apply(false, false); },
    reset: function () {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      showBanner();
    },
    status: readConsent
  };

  function wireOpeners() {
    var nodes = document.querySelectorAll("[data-np-consent-open]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener("click", function (e) {
        e.preventDefault();
        showBanner();
      });
    }
  }

  /* ---------- Start ---------- */
  function init() {
    var c = readConsent();
    // Übrig gebliebene Cookies ohne Einwilligung immer entfernen
    if (!c || !c.stats) deleteCookies(["_ga"]);
    if (!c || !c.marketing) deleteCookies(["_fbp", "_fbc"]);
    if (c) {
      if (c.stats) startGA();
      if (c.marketing) startPixel();
    } else {
      showBanner();
    }
    wireOpeners();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
