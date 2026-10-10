// SubSyncAI - problem report form endpoint:  POST /api/report  (multipart/form-data)
// Sends the report to the support mailbox with Cloudflare Email Workers (binding SUPPORT_MAIL).
// Everything else is served by the static assets (run_worker_first only routes /api/* here).
import { EmailMessage } from "cloudflare:email";
import { LIMITS, validateFields, sniffImage, buildMime, reportText } from "./lib.js";

const ALLOWED_ORIGINS = ["https://subsyncai.app", "https://www.subsyncai.app"];

function json(status, body, extra) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    }, extra || {}),
  });
}
const fail = (status, error, extra) => json(status, { ok: false, error }, extra);

async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // not configured: the other protections still apply
  if (!token) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: String(token).slice(0, 2048) });
  if (ip) body.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const j = await r.json();
    return j && j.success === true;
  } catch (e) { return false; }
}

async function handleReport(request, env) {
  if (request.method !== "POST") return fail(405, "method", { Allow: "POST" });

  // same-origin only: the browser always sends Origin with a cross-site or fetch() POST
  const allowed = ALLOWED_ORIGINS.concat(String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean));
  if (!allowed.includes(request.headers.get("Origin") || "")) return fail(403, "origin");
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return fail(403, "origin");

  const ctype = request.headers.get("Content-Type") || "";
  if (!/^multipart\/form-data/i.test(ctype)) return fail(415, "type");
  const len = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (!len || len > LIMITS.totalBytes + 200 * 1024) return fail(413, "size");

  const ip = request.headers.get("CF-Connecting-IP") || "";
  if (env.REPORT_RL) {
    const r = await env.REPORT_RL.limit({ key: ip || "unknown" });
    if (!r.success) return fail(429, "rate", { "Retry-After": "60" });
  }

  let form;
  try { form = await request.formData(); } catch (e) { return fail(400, "form"); }
  const get = (k) => { const v = form.get(k); return typeof v === "string" ? v : ""; };

  // bots: the hidden "website" field must stay empty and the form cannot be filled in under 4 seconds.
  // They get a normal "ok" so they learn nothing.
  const started = Number(get("started"));
  const elapsed = Date.now() - started;
  if (get("website") !== "" || !(started > 0) || elapsed < 4000) return json(200, { ok: true });

  if (!(await turnstileOk(env, get("cf-turnstile-response"), ip))) return fail(403, "captcha");

  const v = validateFields({
    name: get("name"), email: get("email"), category: get("category"), version: get("version"),
    os: get("os"), tech: get("tech"), message: get("message"), lang: get("lang"), consent: get("consent"),
  });
  if (!v.ok) return fail(422, v.error);

  const files = form.getAll("screenshot").filter((f) => typeof f === "object" && f && typeof f.arrayBuffer === "function" && f.size > 0);
  if (files.length > LIMITS.files) return fail(422, "files");
  const attachments = [];
  let total = 0;
  for (const f of files) {
    if (f.size > LIMITS.fileBytes) return fail(413, "filesize");
    total += f.size;
    if (total > LIMITS.totalBytes) return fail(413, "size");
    const bytes = new Uint8Array(await f.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind) return fail(415, "filetype");
    attachments.push({ type: kind.type, filename: "screenshot-" + (attachments.length + 1) + "." + kind.ext, bytes });
  }

  const from = env.MAIL_FROM || "forms@subsyncai.app";
  const to = env.SUPPORT_TO || "support@subsyncai.app";
  const id = crypto.randomUUID();
  const d = v.data;
  const raw = buildMime({
    from, fromName: "SubSyncAI website", to, replyTo: d.email, replyName: d.name,
    subject: "[SubSyncAI report] " + d.category + " - " + (d.message.split("\n")[0].slice(0, 70)),
    text: reportText(d, attachments.map((a) => a.filename)),
    attachments, messageId: id, date: new Date().toUTCString().replace("GMT", "+0000"),
  });
  try {
    await env.SUPPORT_MAIL.send(new EmailMessage(from, to, raw));
  } catch (e) {
    console.log("report: send failed: " + (e && e.name)); // no user data in the log
    return fail(502, "send");
  }
  return json(200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/report") {
      try { return await handleReport(request, env); }
      catch (e) { console.log("report: error: " + (e && e.name)); return fail(500, "server"); }
    }
    return env.ASSETS.fetch(request);
  },
};
