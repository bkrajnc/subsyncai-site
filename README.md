# SubSync AI - marketing site

Plain HTML/CSS, no build step. Files:

- `index.html` - home page (hero, how it works, features, pricing, FAQ)
- `terms.html`, `privacy.html`, `refund.html` - legal pages
- `assets/style.css` - all styling
- `assets/screenshots/` - drop real app screenshots here (see its own README)
- `CNAME` - tells GitHub Pages this site's custom domain is `subsyncai.app`

## Before going live

Search each page for `[DATE]`, `[REGISTERED ADDRESS]`, `[MATIČNA ŠTEVILKA]`
and `[ID ZA DDV]` (highlighted in yellow with a dashed border) and fill in
your real company details. Also swap the `support@subsyncai.app` email
addresses for your real support inbox once it exists, and check the pricing
section still matches your actual Lemon Squeezy prices.

## 1. Put it on GitHub

```bash
cd subsyncai-site
git init
git add .
git commit -m "Initial site"
gh repo create subsyncai-site --public --source=. --push
# or manually: create a repo on github.com, then:
# git remote add origin https://github.com/<you>/subsyncai-site.git
# git branch -M main
# git push -u origin main
```

## 2. Turn on GitHub Pages

1. On GitHub, open the repo → **Settings → Pages**.
2. Under "Build and deployment", source = **Deploy from a branch**, branch = `main`, folder = `/ (root)`.
3. Under "Custom domain", enter `subsyncai.app` and save (this matches the
   `CNAME` file already in the repo, so it should be pre-filled).
4. Leave "Enforce HTTPS" unchecked for now - it only becomes available once
   the domain's DNS is correctly pointed at GitHub and verified (next step).

## 3. Point the domain at GitHub via Cloudflare

In the Cloudflare dashboard for `subsyncai.app`, under **DNS → Records**, add:

| Type  | Name | Content              | Proxy status |
|-------|------|----------------------|--------------|
| A     | @    | 185.199.108.153       | DNS only     |
| A     | @    | 185.199.109.153       | DNS only     |
| A     | @    | 185.199.110.153       | DNS only     |
| A     | @    | 185.199.111.153       | DNS only     |
| CNAME | www  | `<your-username>.github.io` | DNS only |

Use **DNS only** (grey cloud, not orange) at first. GitHub needs to see your
real DNS to issue its own HTTPS certificate for the domain; Cloudflare's
proxy would get in the way of that verification.

Wait a few minutes, then go back to GitHub **Settings → Pages** and tick
**Enforce HTTPS** once it's selectable (GitHub shows "DNS check successful"
when ready - this can take up to ~30 minutes to propagate).

## 4. (Optional) Turn Cloudflare's proxy/CDN back on

Once HTTPS is working via GitHub, you can switch the DNS records above to
**Proxied** (orange cloud) if you want Cloudflare's CDN/caching and analytics.
If you do, go to **SSL/TLS → Overview** in Cloudflare and set the mode to
**Full (strict)** - not "Flexible" - otherwise you'll get a redirect loop,
since GitHub Pages already serves valid HTTPS.

## 5. Update the site later

Any push to `main` redeploys automatically within about a minute - no
separate build or deploy command needed.
