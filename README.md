# Gift Local | The Whitsundays — website

A static website generated from an Airtable base. Google sees plain, fast HTML with one page per
business; you add or change listings by editing Airtable, and the site rebuilds itself.

**Airtable base:** https://airtable.com/appPoEgYaSjA1tpJg
**Registration form (live):** https://airtable.com/appPoEgYaSjA1tpJg/pagFH4bjjw327kXFA/form

## How it works

```
Business fills in the form  →  row lands in Airtable as "Pending"
Cait sets Status = Approved →  within the hour GitHub rebuilds the site  →  live on the domain
```

- Only rows with **Status = Approved** appear on the site. Pending, Declined and Hidden rows never do.
- The **Settings** table controls the theme (`christmas` or `year-round`), the domain, prices, dates,
  contact details and the registration form link. Change a Value, wait for the next rebuild.
- The **Markets** table feeds the markets block on the home page (tick "Show on site").
- Photos are copied into the site at build time (Airtable's image links expire, so this matters).

## One-time setup — about 15 minutes, only you can do these

### 1. Airtable token (2 min)
1. Go to https://airtable.com/create/tokens → **Create new token**.
2. Name: `Gift Local site build`. Scopes: `data.records:read` and `schema.bases:read`.
   Access: just the **Gift Local | The Whitsundays** base.
3. Copy the token (starts with `pat…`). You'll paste it into GitHub in step 3.

### 2. Put this folder on GitHub (5 min)
1. Create a free account at https://github.com if you don't have one.
2. **New repository** → name it `Gift-Local-Whitsunday`, Public, no README → Create.
3. Upload the contents of this folder (drag and drop works on the repo page: "uploading an existing
   file"). Make sure the hidden `.github` folder comes with it — if drag-and-drop skips it, use
   GitHub Desktop or ask Claude to push it once the repo exists.
4. Repo → **Settings → Pages** → Source: **GitHub Actions**.

### 3. Add the secret (1 min)
Repo → **Settings → Secrets and variables → Actions → New repository secret**
- Name: `AIRTABLE_TOKEN` · Value: the token from step 1.

### 4. First build (1 min)
Repo → **Actions → "Build and deploy Gift Local" → Run workflow**. About a minute later the site is
live at `https://portfolioswcci.github.io/gift-local-whitsunday/`.

### 5. Domain (when you've bought one)
1. Buy the domain (e.g. `whitsundaysgiftguide.com.au`, roughly $20/yr at VentraIP, Crazy Domains, etc.).
2. At the registrar, add DNS records:
   - `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www` → `portfolioswcci.github.io`
3. Repo → **Settings → Pages → Custom domain** → enter the domain, tick **Enforce HTTPS**.
4. Repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   `SITE_DOMAIN` = `whitsundaysgiftguide.com.au` (keeps the domain through rebuilds).
5. In Airtable **Settings**, make sure `site_url` is `https://whitsundaysgiftguide.com.au` (no trailing slash).
6. Submit the sitemap to Google: https://search.google.com/search-console → add the domain →
   Sitemaps → `https://whitsundaysgiftguide.com.au/sitemap.xml`.

## Day to day

| You want to…                      | Do this                                                                    |
| --------------------------------- | -------------------------------------------------------------------------- |
| Approve a new business            | Airtable → Listings → set Status to **Approved**. Live within the hour.    |
| Rebuild right now                 | GitHub → Actions → Build and deploy → **Run workflow**.                    |
| Hide a listing                    | Status → **Hidden**.                                                       |
| Switch to the year-round look     | Settings → `theme` → `year-round`.                                         |
| Change prices, dates, contact     | Settings table → edit the Value.                                           |
| Add a partner to the footer       | Settings → `partners` → one name per line.                                 |
| Embed a different form            | Settings → `registration_form_url`.                                        |

## Before launch
- Delete the 14 **SAMPLE** rows in Listings (filter Admin notes contains "SAMPLE"). They are fictional.
- Fill in the `[DATE]`, `[EMAIL]`, `[PHONE]` and `[NEWSPAPER NAME]` values in Settings.
- Add real market dates in the Markets table.
- Check the form's share settings: https://airtable.com/appPoEgYaSjA1tpJg/pagFH4bjjw327kXFA/form?share=show

## Optional: instant rebuild from Airtable
Hourly is usually fine. For instant, add an Airtable automation: *When record matches conditions
(Status is Approved)* → *Run script* that POSTs to
`https://api.github.com/repos/PortfoliosWCCI/gift-local-whitsunday/dispatches` with body
`{"event_type":"rebuild"}` and a GitHub fine-grained token (Contents: read & write) in the
`Authorization: Bearer` header. Ask Claude to set this up when you're ready.

## Running locally
```
node build.mjs                      # uses data/sample.json
AIRTABLE_TOKEN=pat… node build.mjs  # uses live Airtable data
npx serve dist
```
No dependencies to install. Node 20 or newer.

## Files
- `build.mjs` — fetches data and writes every page into `dist/`
- `src/fetch.mjs` — Airtable API + photo download
- `src/render.mjs` — the HTML for every page type
- `src/styles.css` — all styling; `body.theme-christmas` / `body.theme-year-round`
- `data/sample.json` — fallback data for previews
- `.github/workflows/build-and-deploy.yml` — hourly rebuild + deploy to GitHub Pages
