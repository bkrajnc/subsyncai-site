/* SubSyncAI - problem report form (report.html). Sends multipart/form-data to POST /api/report.
 * Screenshots: choose, drag and drop, or paste (Ctrl+V). Large images are shrunk in the browser first;
 * the server checks type and size again, so nothing here is trusted. */
(function () {
  "use strict";
  var form = document.getElementById("rp");
  if (!form) return;
  var drop = document.getElementById("rp-drop"), fileIn = document.getElementById("rp-file"), thumbs = document.getElementById("rp-thumbs");
  var box = document.getElementById("rp-msgbox"), send = document.getElementById("rp-send");
  var MAX_FILES = 3, SOFT_BYTES = 1.5 * 1024 * 1024, HARD_BYTES = 2.4 * 1024 * 1024, MAX_SIDE = 1920, TOTAL = 5.8 * 1024 * 1024;
  var started = Date.now(), items = [], sending = false, lastMsg = null;

  function T(key) { return (window.subsyncT && window.subsyncT(key)) || ""; }

  /* ---- status message (kept so that it can be translated when the language changes) */
  function show(key, kind) {
    lastMsg = key ? { key: key, kind: kind } : null;
    if (!key) { box.hidden = true; box.textContent = ""; return; }
    var text = T(key), mail = "support@subsyncai.app", i = text.indexOf(mail);
    box.textContent = "";
    box.className = "rp-status " + (kind || "err");
    if (i >= 0) {
      box.appendChild(document.createTextNode(text.slice(0, i)));
      var a = document.createElement("a"); a.href = "mailto:" + mail; a.textContent = mail; box.appendChild(a);
      box.appendChild(document.createTextNode(text.slice(i + mail.length)));
    } else {
      box.appendChild(document.createTextNode(text));
    }
    if (kind === "ok") {
      var b = document.createElement("div"); b.className = "rp-ok2"; b.textContent = T("m_ok_b"); box.appendChild(b);
    }
    box.hidden = false;
  }

  /* ---- screenshots */
  function isImage(f) { return f && /^image\/(png|jpeg|webp|gif)$/.test(f.type); }

  function loadBitmap(file) {
    if (window.createImageBitmap) return createImageBitmap(file);
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () { URL.revokeObjectURL(url); res(img); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("img")); };
      img.src = url;
    });
  }
  function toBlob(canvas, q) { return new Promise(function (res) { canvas.toBlob(res, "image/jpeg", q); }); }

  /* big images: scale down to MAX_SIDE and save as JPEG until they are small enough */
  async function prepare(file) {
    var bmp = await loadBitmap(file); // also proves that the file really is a picture the browser can decode
    if (file.size <= SOFT_BYTES) {
      if (bmp.close) bmp.close();
      var buf = await file.arrayBuffer(); // keep our own copy: the file input is cleared right after choosing
      if (!buf.byteLength) throw new Error("empty");
      return new Blob([buf], { type: file.type });
    }
    var w = bmp.width, h = bmp.height, scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    for (var attempt = 0; attempt < 4; attempt++) {
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      var blob = await toBlob(c, attempt < 2 ? 0.85 : 0.7);
      if (blob && blob.size <= HARD_BYTES) { if (bmp.close) bmp.close(); return blob; }
      scale *= 0.75;
    }
    if (bmp.close) bmp.close();
    throw new Error("too big");
  }

  function totalSize() { return items.reduce(function (s, it) { return s + it.blob.size; }, 0); }

  function renderThumbs() {
    thumbs.textContent = "";
    items.forEach(function (it, idx) {
      var li = document.createElement("li");
      var img = document.createElement("img"); img.src = it.url; img.alt = "";
      var b = document.createElement("button"); b.type = "button"; b.className = "rp-x"; b.textContent = "\u00d7";
      b.setAttribute("aria-label", T("f_remove")); b.title = T("f_remove");
      b.addEventListener("click", function () { URL.revokeObjectURL(it.url); items.splice(idx, 1); renderThumbs(); show(null); });
      li.appendChild(img); li.appendChild(b); thumbs.appendChild(li);
    });
  }

  async function addFiles(list) {
    show(null);
    var files = Array.prototype.slice.call(list || []);
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!isImage(f)) { show("m_err_file"); continue; }
      if (items.length >= MAX_FILES) { show("m_err_toomany"); break; }
      try {
        var blob = await prepare(f);
        if (totalSize() + blob.size > TOTAL) { show("m_err_size"); continue; }
        items.push({ blob: blob, url: URL.createObjectURL(blob) });
      } catch (e) { show("m_err_file"); }
    }
    renderThumbs();
  }

  drop.addEventListener("click", function () { fileIn.click(); });
  drop.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileIn.click(); } });
  fileIn.addEventListener("change", function () { addFiles(fileIn.files); fileIn.value = ""; });
  ["dragenter", "dragover"].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add("on"); }); });
  ["dragleave", "drop"].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove("on"); }); });
  drop.addEventListener("drop", function (e) { addFiles(e.dataTransfer && e.dataTransfer.files); });
  document.addEventListener("paste", function (e) {
    var files = e.clipboardData && e.clipboardData.files;
    if (files && files.length) { var imgs = Array.prototype.filter.call(files, isImage); if (imgs.length) { e.preventDefault(); addFiles(imgs); } }
  });

  /* ---- send */
  function techInfo() {
    var n = navigator, s = window.screen || {};
    return ["User agent: " + n.userAgent, "Platform: " + (n.platform || "-"), "Browser language: " + (n.language || "-"),
      "Screen: " + (s.width || "?") + "x" + (s.height || "?") + " @" + (window.devicePixelRatio || 1), "Time zone offset (min): " + new Date().getTimezoneOffset()].join("\n");
  }
  var ERR = { email: "m_err_email", message: "m_err_message", consent: "m_err_consent", filetype: "m_err_file", files: "m_err_toomany", filesize: "m_err_size", size: "m_err_size", rate: "m_err_rate" };

  function validate() {
    var email = form.elements.email, msg = form.elements.message, consent = document.getElementById("rp-consent");
    if (!email.value.trim() || !email.checkValidity()) { email.focus(); return "m_err_email"; }
    if (msg.value.trim().length < 10) { msg.focus(); return "m_err_message"; }
    if (!consent.checked) { consent.focus(); return "m_err_consent"; }
    return null;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (sending) return;
    var bad = validate();
    if (bad) { show(bad); return; }
    sending = true; send.disabled = true; show(null);
    var label = send.textContent; send.textContent = T("f_sending") || label;
    try {
      var fd = new FormData(form);
      fd.append("consent", "yes");
      fd.append("lang", String(document.documentElement.lang || "en").slice(0, 2));
      fd.append("started", String(started));
      if (document.getElementById("rp-tech").checked) fd.append("tech", techInfo());
      items.forEach(function (it, i) { fd.append("screenshot", it.blob, "screenshot-" + (i + 1)); });
      var r = await fetch("/api/report", { method: "POST", body: fd, credentials: "omit", cache: "no-store" });
      var j = null; try { j = await r.json(); } catch (x) {}
      if (r.ok && j && j.ok) {
        items.forEach(function (it) { URL.revokeObjectURL(it.url); }); items = []; renderThumbs();
        form.reset(); started = Date.now(); show("m_ok_t", "ok");
        box.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        show((j && ERR[j.error]) || "m_err_generic");
      }
    } catch (err) {
      show("m_err_network");
    } finally {
      sending = false; send.disabled = false; send.textContent = label;
      if (window.subsyncT) { var t = T("f_send"); if (t) send.textContent = t; }
    }
  });

  /* ---- language changes: placeholder, open message, remove buttons */
  function setLang() {
    form.elements.message.setAttribute("placeholder", T("f_msg_ph"));
    if (lastMsg) show(lastMsg.key, lastMsg.kind);
    renderThumbs();
  }
  new MutationObserver(function () { setTimeout(setLang, 0); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  setTimeout(setLang, 0);
})();
