/* SubSyncAI install guide - search box.
 * Searches the text of the guide that is currently shown (so it follows the language switcher),
 * ignores case and diacritics (c finds \u010d), shows a result list and jumps to the chosen place.
 * Nothing is sent anywhere; everything runs in the browser.
 */
(function () {
  "use strict";
  var box = document.getElementById("gs-q");
  var list = document.getElementById("gs-res");
  var info = document.getElementById("gs-info");
  var clear = document.getElementById("gs-clear");
  if (!box || !list || !info || !clear) return;

  var T = {
    en: { ph: "Search the guide (e.g. license, Edge, antivirus) ...", none: "No results for \u201c{q}\u201d. Try different words or write to support@subsyncai.app.", n: "Results: {n}", clr: "Clear", sec: "Section" },
    sl: { ph: "I\u0161\u010di po navodilih (npr. licenca, Edge, antivirus) ...", none: "Ni zadetkov za \u00bb{q}\u00ab. Poskusi z drugimi besedami ali pi\u0161i na support@subsyncai.app.", n: "Zadetkov: {n}", clr: "Po\u010disti", sec: "Razdelek" },
    de: { ph: "Anleitung durchsuchen (z. B. Lizenz, Edge, Antivirus) ...", none: "Keine Treffer f\u00fcr \u201e{q}\u201c. Versuche andere Begriffe oder schreibe an support@subsyncai.app.", n: "Treffer: {n}", clr: "L\u00f6schen", sec: "Abschnitt" },
    es: { ph: "Buscar en la gu\u00eda (p. ej. licencia, Edge, antivirus) ...", none: "Sin resultados para \u00ab{q}\u00bb. Prueba con otras palabras o escribe a support@subsyncai.app.", n: "Resultados: {n}", clr: "Borrar", sec: "Secci\u00f3n" },
    hr: { ph: "Pretra\u017ei upute (npr. licenca, Edge, antivirus) ...", none: "Nema rezultata za \u201e{q}\u201c. Poku\u0161ajte s drugim rije\u010dima ili pi\u0161ite na support@subsyncai.app.", n: "Rezultata: {n}", clr: "O\u010disti", sec: "Odjeljak" },
    it: { ph: "Cerca nella guida (es. licenza, Edge, antivirus) ...", none: "Nessun risultato per \u00ab{q}\u00bb. Prova con altre parole o scrivi a support@subsyncai.app.", n: "Risultati: {n}", clr: "Cancella", sec: "Sezione" },
    fr: { ph: "Rechercher dans le guide (ex. licence, Edge, antivirus) ...", none: "Aucun r\u00e9sultat pour \u00ab {q} \u00bb. Essayez d\u2019autres mots ou \u00e9crivez \u00e0 support@subsyncai.app.", n: "R\u00e9sultats : {n}", clr: "Effacer", sec: "Section" }
  };
  var MAX = 10;

  function L() {
    var l = String(document.documentElement.lang || "en").slice(0, 2).toLowerCase();
    return T[l] || T.en;
  }
  /* lower-case, without diacritics, same length as the original (so positions can be reused) */
  function norm(s) {
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i), n = c.normalize ? c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : c.toLowerCase();
      out += n.length ? n.charAt(0) : c;
    }
    return out;
  }
  function clean(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  /* text of an element; a space is added where one block (heading, paragraph, list item) ends and the next begins */
  var BLOCK = "h1,h2,h3,h4,p,li,summary,div,ul,ol,figcaption";
  function text(el) {
    if (!el) return "";
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), out = "", last = null, n;
    while ((n = w.nextNode())) {
      var blk = n.parentElement ? n.parentElement.closest(BLOCK) : null;
      if (last !== null && blk !== last) out += " ";
      out += n.nodeValue;
      last = blk;
    }
    return clean(out);
  }

  /* the searchable pieces of the page, read from the live DOM */
  function units() {
    var res = [];
    document.querySelectorAll(".g-body .g-sec").forEach(function (sec) {
      var h2 = sec.querySelector("h2");
      var label = text(h2);
      sec.querySelectorAll(".g-intro, ol.gsteps > li, .keep > li, details.faq, .callout").forEach(function (el) {
        var title = "";
        if (el.matches("details.faq")) title = text(el.querySelector("summary"));
        else if (el.matches("ol.gsteps > li")) title = text(el.querySelector("h3"));
        else if (el.matches(".callout")) title = text(el.querySelector("h4"));
        var body = text(el);
        if (!body) return;
        res.push({ el: el, section: label, title: title || label, body: body, nt: norm(title), nb: norm(body) });
      });
    });
    return res;
  }

  /* words that mean the same thing in the guide's languages (normalised, no diacritics) */
  var SYN = [
    ["antivirus", "protivirus", "virus", "viren", "antivir", "defender", "smartscreen"],
    ["licen", "lizenz", "licenz", "licencia"],
    ["install", "instal", "namest", "einricht", "setup"],
    ["subtit", "podnapis", "untertitel", "titlov", "sottotitol", "sous-titre"],
    ["extension", "razsiritev", "erweiterung", "pro\u0161irenj", "prosirenj", "estensione", "extensi"]
  ];
  /* one entry per typed word: the word itself plus its synonyms */
  function terms(q) {
    return norm(clean(q)).split(" ").filter(function (t) { return t.length > 0; }).map(function (t) {
      var alts = [t];
      if (t.length >= 3) SYN.forEach(function (g) {
        var hit = g.some(function (m) { return t.indexOf(m) >= 0 || m.indexOf(t) >= 0; });
        if (hit) g.forEach(function (m) { if (alts.indexOf(m) < 0) alts.push(m); });
      });
      return alts;
    });
  }
  function flat(ts) { var all = []; ts.forEach(function (a) { a.forEach(function (t) { if (all.indexOf(t) < 0) all.push(t); }); }); return all; }
  function anyIn(hay, alts) { return alts.some(function (t) { return hay.indexOf(t) >= 0; }); }

  function run(q) {
    var ts = terms(q), out = [];
    if (!ts.length) return out;
    units().forEach(function (u) {
      var score = 0;
      for (var i = 0; i < ts.length; i++) {
        if (!anyIn(u.nb, ts[i])) return;
        score += 1 + (anyIn(u.nt, ts[i]) ? 4 : 0);
      }
      u.score = score;
      out.push(u);
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  /* appends text with the search terms in <mark>; DOM nodes only, no innerHTML */
  function addMarked(parent, str, ts) {
    var n = norm(str), marks = [];
    flat(ts).forEach(function (t) {
      var p = 0;
      while ((p = n.indexOf(t, p)) >= 0) { marks.push([p, p + t.length]); p += t.length; }
    });
    marks.sort(function (a, b) { return a[0] - b[0]; });
    var pos = 0;
    marks.forEach(function (m) {
      if (m[1] <= pos) return;
      var s = Math.max(m[0], pos);
      if (s > pos) parent.appendChild(document.createTextNode(str.slice(pos, s)));
      var mk = document.createElement("mark");
      mk.textContent = str.slice(s, m[1]);
      parent.appendChild(mk);
      pos = m[1];
    });
    if (pos < str.length) parent.appendChild(document.createTextNode(str.slice(pos)));
  }

  function snippet(u, ts) {
    var first = -1;
    flat(ts).forEach(function (t) { var p = u.nb.indexOf(t); if (p >= 0 && (first < 0 || p < first)) first = p; });
    var start = Math.max(0, first - 40), end = Math.min(u.body.length, start + 130);
    var s = u.body.slice(start, end);
    return (start > 0 ? "\u2026" : "") + s + (end < u.body.length ? "\u2026" : "");
  }

  var current = [], active = -1;

  function setActive(i) {
    var items = list.children;
    if (active >= 0 && items[active]) { items[active].classList.remove("on"); items[active].setAttribute("aria-selected", "false"); }
    active = i;
    if (active >= 0 && items[active]) {
      items[active].classList.add("on");
      items[active].setAttribute("aria-selected", "true");
      box.setAttribute("aria-activedescendant", items[active].id);
      items[active].scrollIntoView({ block: "nearest" });
    } else {
      box.removeAttribute("aria-activedescendant");
    }
  }

  function close() { list.hidden = true; box.setAttribute("aria-expanded", "false"); setActive(-1); }

  function render() {
    var q = box.value, ts = terms(q), tx = L();
    clear.hidden = !clean(q);
    clear.setAttribute("aria-label", tx.clr);
    list.textContent = "";
    active = -1;
    if (!ts.length) { info.textContent = ""; current = []; close(); return; }
    current = run(q);
    if (!current.length) {
      info.textContent = "";
      var no = document.createElement("div");
      no.className = "gs-none";
      no.textContent = tx.none.replace("{q}", clean(q));
      list.appendChild(no);
    } else {
      info.textContent = tx.n.replace("{n}", current.length);
      current.slice(0, MAX).forEach(function (u, i) {
        var li = document.createElement("div");
        li.className = "gs-item"; li.id = "gs-r" + i; li.setAttribute("role", "option"); li.setAttribute("aria-selected", "false");
        var sec = document.createElement("div"); sec.className = "gs-sec"; sec.textContent = u.section;
        var tt = document.createElement("div"); tt.className = "gs-title"; addMarked(tt, u.title, ts);
        var sn = document.createElement("div"); sn.className = "gs-snip"; addMarked(sn, snippet(u, ts), ts);
        li.appendChild(sec); li.appendChild(tt); li.appendChild(sn);
        li.addEventListener("mousedown", function (e) { e.preventDefault(); go(i); });
        list.appendChild(li);
      });
    }
    list.hidden = false;
    box.setAttribute("aria-expanded", "true");
  }

  function go(i) {
    var u = current[i];
    if (!u) return;
    close();
    for (var p = u.el; p; p = p.parentElement) { if (p.tagName === "DETAILS") p.open = true; }
    u.el.scrollIntoView({ behavior: "smooth", block: "center" });
    u.el.classList.remove("gs-flash");
    void u.el.offsetWidth;
    u.el.classList.add("gs-flash");
    setTimeout(function () { u.el.classList.remove("gs-flash"); }, 2600);
  }

  function setLang() {
    var tx = L();
    box.setAttribute("placeholder", tx.ph);
    box.setAttribute("aria-label", tx.ph);
    if (clean(box.value)) render();
  }

  box.addEventListener("input", render);
  box.addEventListener("focus", function () { if (clean(box.value)) render(); });
  box.addEventListener("blur", function () { setTimeout(close, 120); });
  box.addEventListener("keydown", function (e) {
    var n = Math.min(current.length, MAX);
    if (e.key === "ArrowDown") { e.preventDefault(); if (list.hidden) render(); if (n) setActive((active + 1) % n); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (n) setActive(active <= 0 ? n - 1 : active - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (n) go(active >= 0 ? active : 0); }
    else if (e.key === "Escape") { if (!list.hidden) close(); else { box.value = ""; render(); } }
  });
  clear.addEventListener("mousedown", function (e) { e.preventDefault(); box.value = ""; render(); box.focus(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "")) {
      e.preventDefault(); box.focus();
    }
  });
  /* the language switcher changes <html lang> and the page text */
  new MutationObserver(function () { setTimeout(setLang, 0); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  setLang();
})();
