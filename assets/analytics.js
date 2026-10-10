/* SubSyncAI - Google Analytics 4 with a consent banner (GDPR / ZEKom-1).
 *
 * Nothing is loaded and no banner is shown until GA_ID is set below.
 * Google's scripts are loaded ONLY after the visitor clicks "Accept"; "Reject" loads nothing.
 * The choice is kept in localStorage ("subsync_analytics_consent") and can be changed any time
 * with the "Cookie settings" link that is added to the footer.
 */
(function () {
  "use strict";

  /* >>> Paste the GA4 Measurement ID here (Admin > Data streams > your web stream), e.g. "G-ABCD123456" <<< */
  var GA_ID = "G-R3FBZT1XXN";

  if (!/^G-[A-Z0-9]{6,}$/.test(GA_ID)) return;

  var KEY = "subsync_analytics_consent";
  var T = {
    en: { t: "We use Google Analytics to understand how this website is used. It sets cookies only if you accept. Without your consent nothing is loaded.", a: "Accept", r: "Reject", p: "Privacy Policy", s: "Cookie settings" },
    sl: { t: "Za razumevanje uporabe te spletne strani uporabljamo Google Analytics. Pi\u0161kotke nastavi samo, \u010de sprejmete. Brez va\u0161ega soglasja se ne nalo\u017ei ni\u010d.", a: "Sprejmem", r: "Zavrnem", p: "Politika zasebnosti", s: "Nastavitve pi\u0161kotkov" },
    de: { t: "Wir verwenden Google Analytics, um zu verstehen, wie diese Website genutzt wird. Cookies werden nur gesetzt, wenn Sie zustimmen. Ohne Ihre Einwilligung wird nichts geladen.", a: "Akzeptieren", r: "Ablehnen", p: "Datenschutzerkl\u00e4rung", s: "Cookie-Einstellungen" },
    es: { t: "Usamos Google Analytics para entender c\u00f3mo se usa este sitio web. Solo se instalan cookies si aceptas. Sin tu consentimiento no se carga nada.", a: "Aceptar", r: "Rechazar", p: "Pol\u00edtica de privacidad", s: "Configuraci\u00f3n de cookies" },
    hr: { t: "Koristimo Google Analytics kako bismo razumjeli kako se ova web-stranica koristi. Kola\u010di\u0107i se postavljaju samo ako prihvatite. Bez va\u0161e privole ne u\u010ditava se ni\u0161ta.", a: "Prihva\u0107am", r: "Odbijam", p: "Pravila privatnosti", s: "Postavke kola\u010di\u0107a" },
    it: { t: "Usiamo Google Analytics per capire come viene utilizzato questo sito. I cookie vengono impostati solo se accetti. Senza il tuo consenso non viene caricato nulla.", a: "Accetta", r: "Rifiuta", p: "Informativa sulla privacy", s: "Impostazioni cookie" },
    fr: { t: "Nous utilisons Google Analytics pour comprendre comment ce site est utilis\u00e9. Des cookies ne sont d\u00e9pos\u00e9s que si vous acceptez. Sans votre consentement, rien n\u2019est charg\u00e9.", a: "Accepter", r: "Refuser", p: "Politique de confidentialit\u00e9", s: "Param\u00e8tres des cookies" }
  };

  function lang() {
    var l = "";
    try { l = new URLSearchParams(location.search).get("lang") || ""; } catch (e) {}
    if (!T[String(l).slice(0, 2).toLowerCase()]) { try { l = localStorage.getItem("lang") || ""; } catch (e) {} }
    if (!T[String(l).slice(0, 2).toLowerCase()]) l = document.documentElement.lang || "en";
    l = String(l).slice(0, 2).toLowerCase();
    return T[l] ? l : "en";
  }
  function getConsent() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var loaded = false;
  function loadGA() {
    if (loaded) return;
    loaded = true;
    window["ga-disable-" + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    document.addEventListener("click", trackClicks, true);
  }

  function unloadGA() {
    window["ga-disable-" + GA_ID] = true;
    document.removeEventListener("click", trackClicks, true);
    var host = location.hostname, parts = host.split("."), domains = [host, "." + host];
    if (parts.length > 2) domains.push("." + parts.slice(-2).join("."));
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (n === "_ga" || n.indexOf("_ga_") === 0 || n === "_gid" || n.indexOf("_gat") === 0) {
        domains.forEach(function (d) { document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + d; });
        document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      }
    });
  }

  /* Custom events for the two things that matter: installer download and license purchase. */
  function trackClicks(e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || !window.gtag) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("download.subsyncai.app") !== -1) {
      window.gtag("event", "download_click", { file_name: href.split("/").pop().split("?")[0], page_path: location.pathname });
    } else if (href.indexOf("lemonsqueezy.com") !== -1) {
      window.gtag("event", "buy_click", { page_path: location.pathname });
    }
  }

  var css = "#sa-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;max-width:760px;margin:0 auto;background:#0e1628;color:#f7f9ff;border:1px solid #2a3b5e;border-radius:14px;padding:16px 18px;box-shadow:0 18px 50px #000a;font:14px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;gap:14px;align-items:center;flex-wrap:wrap}" +
    "#sa-banner p{margin:0;flex:1 1 320px;color:#c9d4ea}#sa-banner a{color:#55e6ff}" +
    "#sa-banner .sa-btns{display:flex;gap:10px;flex:0 0 auto}" +
    "#sa-banner button{font:inherit;font-weight:600;padding:9px 18px;border-radius:10px;border:1px solid #3a4d78;background:#16233d;color:#f7f9ff;cursor:pointer}" +
    "#sa-banner button:hover{border-color:#55e6ff}#sa-banner button:focus-visible{outline:2px solid #55e6ff;outline-offset:2px}" +
    ".sa-link{cursor:pointer;text-decoration:underline;background:none;border:0;color:inherit;font:inherit;padding:0}";

  function showBanner() {
    var old = document.getElementById("sa-banner");
    if (old) old.remove();
    var L = T[lang()];
    var b = document.createElement("div");
    b.id = "sa-banner"; b.setAttribute("role", "dialog"); b.setAttribute("aria-live", "polite"); b.setAttribute("aria-label", "Cookies");
    var p = document.createElement("p");
    p.appendChild(document.createTextNode(L.t + " "));
    var a = document.createElement("a"); a.href = "privacy.html"; a.textContent = L.p; p.appendChild(a);
    var w = document.createElement("div"); w.className = "sa-btns";
    var rej = document.createElement("button"); rej.type = "button"; rej.textContent = L.r;
    var acc = document.createElement("button"); acc.type = "button"; acc.textContent = L.a;
    rej.addEventListener("click", function () { setConsent("denied"); unloadGA(); b.remove(); });
    acc.addEventListener("click", function () { setConsent("granted"); loadGA(); b.remove(); });
    w.appendChild(rej); w.appendChild(acc); b.appendChild(p); b.appendChild(w);
    document.body.appendChild(b);
  }

  function addFooterLink() {
    var foot = document.querySelector("footer .footer-links") || document.querySelector("footer .wrap") || document.querySelector("footer");
    if (!foot || document.getElementById("sa-settings")) return;
    var btn = document.createElement("button");
    btn.type = "button"; btn.id = "sa-settings"; btn.className = "sa-link"; btn.textContent = T[lang()].s;
    btn.addEventListener("click", function () { btn.textContent = T[lang()].s; showBanner(); });
    foot.appendChild(document.createTextNode(" ")); foot.appendChild(btn);
  }

  function init() {
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    addFooterLink();
    /* the language switcher changes <html lang>: translate an open banner and the footer link */
    new MutationObserver(function () {
      var sb = document.getElementById("sa-settings"); if (sb) sb.textContent = T[lang()].s;
      if (document.getElementById("sa-banner")) showBanner();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    var c = getConsent();
    if (c === "granted") loadGA();
    else if (c !== "denied") showBanner();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
