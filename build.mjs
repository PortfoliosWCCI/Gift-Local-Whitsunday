#!/usr/bin/env node
// Builds the Gift Local | The Whitsundays website into ./dist from Airtable (or data/sample.json).
//   AIRTABLE_TOKEN=pat... node build.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadData, downloadAttachments } from './src/fetch.mjs';
import * as R from './src/render.mjs';

const OUT = path.resolve(process.env.OUT_DIR || 'dist');

async function write(rel, html) {
  const file = path.join(OUT, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, html);
}

const data = await loadData();
const S = R.readSettings(data.settings || []);
if (process.env.THEME) S.theme = process.env.THEME, S.isXmas = S.theme === 'christmas';

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

const approvedRaw = (data.listings || []).filter(l => l.Status === 'Approved' && l['Business name']);
await downloadAttachments(approvedRaw, path.join(OUT, 'img'));
const listings = approvedRaw.map(R.shapeListing).sort((a, b) => (b.featured - a.featured) || a.name.localeCompare(b.name, 'en-AU'));
// De-duplicate slugs
const seen = new Map();
for (const l of listings) { const n = seen.get(l.slug) || 0; seen.set(l.slug, n + 1); if (n) l.slug = `${l.slug}-${n + 1}`; }

const markets = (data.markets || []).filter(m => m['Show on site'] && m.Market).sort((a, b) => String(a.Date || '').localeCompare(String(b.Date || '')));

const counts = { for: {}, price: {}, town: {}, category: {}, flag: { vouchers: 0, ships: 0, xmasEve: 0, market: 0 } };
for (const l of listings) {
  for (const b of l.buyingFor) counts.for[b] = (counts.for[b] || 0) + 1;
  for (const p of l.prices) counts.price[p] = (counts.price[p] || 0) + 1;
  counts.town[l.town] = (counts.town[l.town] || 0) + 1;
  for (const c of l.categories) counts.category[c] = (counts.category[c] || 0) + 1;
  if (l.vouchers) counts.flag.vouchers++; if (l.ships) counts.flag.ships++; if (l.xmasEve) counts.flag.xmasEve++; if (l.market) counts.flag.market++;
}

const pages = []; // for sitemap
function ctxFor(pagePath) { return { S, listings, markets, counts, href: R.linker(pagePath) }; }
async function page(pagePath, render, { sitemap = true, priority = 0.6 } = {}) {
  const ctx = ctxFor(pagePath);
  await write(pagePath, render(ctx));
  if (sitemap) pages.push({ loc: pagePath.replace(/index\.html$/, ''), priority });
}

// Static assets
await write('styles.css', await fs.readFile(new URL('./src/styles.css', import.meta.url), 'utf8'));
await write('site.js', R.SITE_JS);
await write('favicon.svg', R.FAVICON);

// Home, browse, hubs
await page('index.html', R.homePage, { priority: 1.0 });
await page('browse/index.html', ctx => R.browsePage(ctx, { pagePath: 'browse/index.html', title: 'Every gift, every town', intro: `${listings.length} Whitsundays businesses. Filter by who you're buying for, your budget, town or category.`, items: listings, description: `Browse every business in the Gift Local Whitsundays gift guide. Filter by who you're buying for, budget, town and category.`, canonicalPath: 'browse/' }), { priority: 0.9 });
await page('vouchers/index.html', ctx => R.browsePage(ctx, { pagePath: 'vouchers/index.html', title: 'Gift vouchers &amp; experiences', eyebrow: 'The hard-to-buy-for, sorted', intro: 'Every listed business that sells gift vouchers. Most can email one the same day.', items: listings.filter(l => l.vouchers || l.categories.includes('Experiences & tours')), filter: { flag: 'Sells gift vouchers' }, current: 'vouchers', description: 'Whitsundays businesses that sell gift vouchers and experiences. Cafés, salons, tours, lessons and more.', canonicalPath: 'vouchers/' }), { priority: 0.8 });

for (const b of R.BUYING_FOR) {
  const items = listings.filter(l => l.buyingFor.includes(b.name));
  await page(`for/${R.slugify(b.name)}/index.html`, ctx => R.browsePage(ctx, { pagePath: `for/${R.slugify(b.name)}/index.html`, title: `Gifts for <span style="color:var(--coral-dk)">${R.esc(b.name.toLowerCase() === b.name ? b.name : b.name.replace(/^The /, 'the '))}</span>`, eyebrow: 'Who are you buying for?', intro: b.blurb, items, filter: { for: b.name }, description: `Whitsundays gift ideas for ${b.name.toLowerCase()}: ${items.length} local businesses, from ${R.PRICE_BANDS[0].name.toLowerCase()} up.`, canonicalPath: `for/${R.slugify(b.name)}/` }), { priority: 0.8 });
}
for (const b of R.PRICE_BANDS) {
  const items = listings.filter(l => l.prices.includes(b.name));
  await page(`price/${R.slugify(b.name)}/index.html`, ctx => R.browsePage(ctx, { pagePath: `price/${R.slugify(b.name)}/index.html`, title: `${R.esc(b.name)}: <span style="color:var(--coral-dk)">${R.esc(S.isXmas ? b.xmas : b.year)}</span>`, eyebrow: 'By budget', intro: b.sub, items, filter: { price: b.name }, description: `Whitsundays gifts ${b.name.toLowerCase()}: ${items.length} local businesses.`, canonicalPath: `price/${R.slugify(b.name)}/` }), { priority: 0.7 });
}
for (const t of R.TOWNS) {
  const items = listings.filter(l => l.town === t);
  await page(`town/${R.slugify(t)}/index.html`, ctx => R.browsePage(ctx, { pagePath: `town/${R.slugify(t)}/index.html`, title: t === 'Online or markets only' ? 'Online &amp; at the markets' : `Shop local in <span style="color:var(--coral-dk)">${R.esc(t)}</span>`, eyebrow: 'Shop by town', intro: `${items.length} ${t === 'Online or markets only' ? 'businesses trading online or at the markets' : `businesses in ${t}`}.`, items, filter: { town: t }, current: 'towns', description: `Gift ideas from ${t} businesses in the Whitsundays: ${items.length} local shops, makers and experiences.`, canonicalPath: `town/${R.slugify(t)}/` }), { priority: 0.8 });
}
for (const c of Object.keys(counts.category)) {
  const items = listings.filter(l => l.categories.includes(c));
  await page(`category/${R.slugify(c)}/index.html`, ctx => R.browsePage(ctx, { pagePath: `category/${R.slugify(c)}/index.html`, title: R.esc(c), eyebrow: 'By category', intro: '', items, filter: { category: c }, description: `${c} gifts from Whitsundays businesses: ${items.length} listed.`, canonicalPath: `category/${R.slugify(c)}/` }), { priority: 0.6 });
}

// Hub pages
await page('towns/index.html', ctx => R.hubPage(ctx, { title: 'Shop by town', eyebrow: 'Where are you?', intro: 'From Bowen to Airlie Beach, Proserpine to Collinsville.', current: 'towns', canonicalPath: 'towns/', description: 'Whitsundays gift guide by town: Airlie Beach, Cannonvale, Proserpine, Bowen, Collinsville and more.', links: R.TOWNS.map((t, i) => `<a class="town ${i === R.TOWNS.length - 1 ? 'town-coral' : ''}" href="${ctx.href(`town/${R.slugify(t)}/`)}">${R.esc(t)} <small>${counts.town[t] || 0} listing${counts.town[t] === 1 ? '' : 's'}</small></a>`).join('') }), { priority: 0.7 });
await page('for/index.html', ctx => R.hubPage(ctx, { title: 'Who are you buying for?', eyebrow: 'Start here', intro: '', current: 'browse', canonicalPath: 'for/', description: 'Whitsundays gift ideas by person: Mum, Dad, the kids, the foodie, Secret Santa and the hard-to-buy-for.', links: R.BUYING_FOR.map(b => `<a class="tile ${b.cls || ''}" href="${ctx.href(`for/${R.slugify(b.name)}/`)}"><b>${R.esc(b.name)}</b><span>${R.esc(b.blurb)}</span></a>`).join('') }), { priority: 0.7 });
await page('price/index.html', ctx => R.hubPage(ctx, { title: 'Start with a budget', eyebrow: 'By price', intro: '', current: 'browse', canonicalPath: 'price/', description: 'Whitsundays gifts by budget: under $25, $25–$50, $50–$100 and $100+.', links: R.PRICE_BANDS.map(b => `<a class="band" href="${ctx.href(`price/${R.slugify(b.name)}/`)}"><em>${R.esc(b.name)}</em><b>${R.esc(S.isXmas ? b.xmas : b.year)}</b><span>${R.esc(b.sub)}</span></a>`).join('') }), { priority: 0.7 });
await page('a-z/index.html', R.azPage, { priority: 0.6 });
await page('get-listed/index.html', R.getListedPage, { priority: 0.9 });

// Listings
for (const l of listings) {
  const nearby = listings.filter(n => n.town === l.town && n.slug !== l.slug).slice(0, 4);
  await page(`listing/${l.slug}/index.html`, ctx => R.listingPage(ctx, l, nearby), { sitemap: !l.sample, priority: l.featured ? 0.8 : 0.7 });
}

// 404, robots, sitemap, data snapshot
await write('404.html', R.notFoundPage(ctxFor('404.html')));
await write('robots.txt', `User-agent: *\nAllow: /\n${S.siteUrl ? `Sitemap: ${S.siteUrl}/sitemap.xml\n` : ''}`);
const today = new Date().toISOString().slice(0, 10);
await write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${(S.siteUrl || '')}/${p.loc}</loc><lastmod>${today}</lastmod><priority>${p.priority.toFixed(1)}</priority></url>`).join('\n')}\n</urlset>\n`);
await write('.nojekyll', '');
await write('CNAME.example', (S.siteUrl || 'https://example.com').replace(/^https?:\/\//, ''));

console.log(`Built ${pages.length + 2} pages for ${listings.length} approved listings (theme: ${S.theme}) → ${OUT}`);
