// SubSyncAI - problem report form: pure helper functions (no Cloudflare APIs, so they can be tested anywhere).

export const LIMITS = {
  name: 100, email: 254, version: 40, os: 200, tech: 600, message: 5000, messageMin: 10,
  files: 3, fileBytes: 2.5 * 1024 * 1024, totalBytes: 6 * 1024 * 1024,
};
export const CATEGORIES = ["install", "license", "translation", "extension", "download", "other"];
export const LANGS = ["en", "sl", "de", "es", "hr", "it", "fr"];

/* one line of text: no control characters (so no header injection), trimmed, length-limited */
export function line(value, max) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/* multi-line text: only \n and \t are kept */
export function block(value, max) {
  return String(value == null ? "" : value).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029]/g, "").trim().slice(0, max);
}

export function isEmail(s) {
  return s.length > 3 && s.length <= LIMITS.email && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(s);
}

/* what the file REALLY is (the browser-supplied type is not trusted) */
export function sniffImage(b) {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { type: "image/png", ext: "png" };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return { type: "image/gif", ext: "gif" };
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { type: "image/webp", ext: "webp" };
  return null;
}

export function base64Wrapped(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/(.{76})/g, "$1\r\n");
}

/* RFC 2047 encoded-word(s) for a header value that may contain non-ASCII characters */
export function encodeHeader(text) {
  if (/^[\x20-\x7e]*$/.test(text)) return text;
  const enc = new TextEncoder(), out = [];
  let cur = "";
  for (const ch of text) {
    if (enc.encode(cur + ch).length > 36) { out.push(cur); cur = ""; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out.map((p) => "=?UTF-8?B?" + base64Wrapped(enc.encode(p)).replace(/\r\n/g, "") + "?=").join("\r\n ");
}

function quotedPrintable(text) {
  const enc = new TextEncoder().encode(text.replace(/\r?\n/g, "\r\n"));
  let out = "", lineLen = 0;
  for (let i = 0; i < enc.length; i++) {
    const c = enc[i];
    let chunk;
    if (c === 0x0d && enc[i + 1] === 0x0a) { out += "\r\n"; i++; lineLen = 0; continue; }
    if ((c >= 33 && c <= 126 && c !== 61) || c === 32 || c === 9) chunk = String.fromCharCode(c);
    else chunk = "=" + c.toString(16).toUpperCase().padStart(2, "0");
    if (lineLen + chunk.length > 75) { out += "=\r\n"; lineLen = 0; }
    out += chunk; lineLen += chunk.length;
  }
  return out;
}

/* a person's name for an address header: no <, > (could add a second address), quoted if plain ASCII */
export function displayName(name) {
  const n = line(name, 80).replace(/[<>]/g, "");
  if (!n) return "";
  if (/^[ -~]*$/.test(n)) return '"' + n.replace(/(["\\])/g, "\\$1") + '"';
  return encodeHeader(n);
}

/* Builds the raw e-mail (multipart/mixed: text + optional image attachments). */
export function buildMime({ from, fromName, to, replyTo, replyName, subject, text, attachments, messageId, date }) {
  const boundary = "=_ssai_" + messageId.replace(/[^A-Za-z0-9]/g, "");
  const h = [
    "From: " + displayName(fromName) + " <" + from + ">",
    "To: " + to,
    "Reply-To: " + (displayName(replyName) ? displayName(replyName) + " <" + replyTo + ">" : replyTo),
    "Subject: " + encodeHeader(line(subject, 200)),
    "Date: " + date,
    "Message-ID: <" + messageId + "@" + from.split("@")[1] + ">",
    "MIME-Version: 1.0",
    "Auto-Submitted: auto-generated",
    "X-SubSync-Form: problem-report",
    'Content-Type: multipart/mixed; boundary="' + boundary + '"',
  ];
  let body = "--" + boundary + "\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n" + quotedPrintable(text) + "\r\n";
  for (const a of attachments) {
    body += "--" + boundary + "\r\nContent-Type: " + a.type + '; name="' + a.filename + '"\r\nContent-Transfer-Encoding: base64\r\n' +
      'Content-Disposition: attachment; filename="' + a.filename + '"\r\n\r\n' + base64Wrapped(a.bytes) + "\r\n";
  }
  body += "--" + boundary + "--\r\n";
  return h.join("\r\n") + "\r\n\r\n" + body;
}

/* Validates the text fields. Returns {ok:true, data} or {ok:false, error}. */
export function validateFields(f) {
  const data = {
    name: line(f.name, LIMITS.name),
    email: line(f.email, LIMITS.email),
    category: line(f.category, 20),
    version: line(f.version, LIMITS.version),
    os: line(f.os, LIMITS.os),
    tech: block(f.tech, LIMITS.tech),
    message: block(f.message, LIMITS.message),
    lang: line(f.lang, 2).toLowerCase(),
  };
  if (!isEmail(data.email)) return { ok: false, error: "email" };
  if (!CATEGORIES.includes(data.category)) return { ok: false, error: "category" };
  if (data.message.length < LIMITS.messageMin) return { ok: false, error: "message" };
  if (f.consent !== "yes") return { ok: false, error: "consent" };
  if (!LANGS.includes(data.lang)) data.lang = "en";
  return { ok: true, data };
}

export function reportText(d, attachmentNames) {
  return [
    "New problem report from the SubSyncAI website",
    "",
    "Category:    " + d.category,
    "Name:        " + (d.name || "-"),
    "E-mail:      " + d.email,
    "App version: " + (d.version || "-"),
    "System:      " + (d.os || "-"),
    "Page lang:   " + d.lang,
    "Screenshots: " + (attachmentNames.length ? attachmentNames.join(", ") : "none"),
    "",
    "--- Message ---",
    d.message,
    "",
    "--- Technical information (sent by the browser, if the user allowed it) ---",
    d.tech || "-",
    "",
  ].join("\n");
}
