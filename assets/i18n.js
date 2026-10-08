/* SubSyncAI site - language switcher. English is the default; the choice is remembered.
   Each page defines window.SUBSYNC_PAGE = {dict: {key: {lang: html}}, head: {title: {...}, desc: {...}}} first. */
(function () {
  var LANGS = [["en", "English"], ["sl", "Slovenščina"], ["de", "Deutsch"], ["es", "Español"], ["hr", "Hrvatski"], ["it", "Italiano"], ["fr", "Français"]];
  var PAGE = window.SUBSYNC_PAGE || {dict: {}, head: null};
  var DICT = PAGE.dict, HEAD = PAGE.head;
  var DEFAULT = "en", current = DEFAULT;
  function has(l) { return LANGS.some(function (x) { return x[0] === l; }); }
  function stored() { try { return localStorage.getItem("lang"); } catch (e) { return null; } }
  function remember(l) { try { localStorage.setItem("lang", l); } catch (e) {} }
  function plain(html) { var d = document.createElement("div"); d.innerHTML = html; return d.textContent; }
  window.subsyncT = function (key) { var e = DICT[key]; return e && (e[current] || e[DEFAULT]) ? plain(e[current] || e[DEFAULT]) : ""; };
  function apply(lang) {
    if (!has(lang)) lang = DEFAULT;
    current = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var e = DICT[el.getAttribute("data-i18n")];
      if (e && e[lang]) el.innerHTML = e[lang];
    });
    document.querySelectorAll("img[data-src-sl]").forEach(function (el) {
      el.setAttribute("src", lang === "sl" ? el.getAttribute("data-src-sl") : el.getAttribute("data-src-en"));
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var e = DICT[el.getAttribute("data-i18n-alt")];
      if (e && e[lang]) el.setAttribute("alt", plain(e[lang]));
    });
    if (HEAD) {
      document.title = HEAD.title[lang];
      [["meta[name=description]", "desc"], ["meta[property='og:title']", "title"]].forEach(function (p) {
        var m = document.querySelector(p[0]);
        if (m) m.setAttribute("content", HEAD[p[1]][lang]);
      });
    }
    var sel = document.getElementById("lang");
    if (sel) sel.value = lang;
  }
  function init() {
    var q = new URLSearchParams(location.search).get("lang");
    var start = has(q) ? q : (has(stored()) ? stored() : DEFAULT);
    var sel = document.getElementById("lang");
    if (sel) {
      sel.innerHTML = LANGS.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + "</option>"; }).join("");
      sel.addEventListener("change", function () { remember(sel.value); apply(sel.value); });
    }
    if (start !== DEFAULT) apply(start); else if (sel) sel.value = DEFAULT;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
