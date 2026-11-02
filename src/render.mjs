// HTML rendering for every page of the site. Pure functions: data in, HTML out.
import path from 'node:path/posix';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/\$/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Relative link from the page being rendered to a site path. Works on any host or sub-folder.
export function linker(pagePath) {
  const depth = pagePath.split('/').length - 1; // 'index.html' → 0, 'browse/index.html' → 1
  const up = depth ? '../'.repeat(depth) : './';
  return (to, anchor = '') => (to === '' || to === '/' ? up : up + to.replace(/^\/+/, '')) + anchor;
}

export const BUYING_FOR = [
  { name: 'Mum', blurb: "She says she doesn't want anything. She does.", cls: 'tile-blush' },
  { name: 'Dad', blurb: 'Not socks. Not this year.' },
  { name: 'The kids', blurb: 'Toys, books, lessons, adventures.', cls: 'tile-gold' },
  { name: 'The foodie', blurb: 'Local produce, sauces, hampers, dinners out.' },
  { name: 'Secret Santa', blurb: 'Under $25 and better than a mug.' },
  { name: 'Teachers & coaches', blurb: "A thank-you that isn't another candle.", cls: 'tile-aqua' },
  { name: 'The hard-to-buy-for', blurb: 'Vouchers and experiences. Done.' },
  { name: 'Someone who has everything', blurb: 'Give them a day on the water instead.', cls: 'tile-navy' },
  { name: 'Colleagues & clients', blurb: 'Local, generous and easy to post.' },
];
export const PRICE_BANDS = [
  { name: 'Under $25', xmas: 'Stocking fillers', year: 'Little treats', sub: 'Kris Kringle, teachers, the office' },
  { name: '$25–$50', xmas: 'Secret Santa, sorted', year: 'Thank-yous, sorted', sub: 'Small, local and nicer than it needs to be' },
  { name: '$50–$100', xmas: 'The nice list', year: 'Birthday, sorted', sub: "Something they'll actually keep" },
  { name: '$100+', xmas: 'The very nice list', year: 'The big one', sub: 'Experiences, jewellery, the big one' },
];
export const TOWNS = ['Airlie Beach', 'Cannonvale', 'Proserpine', 'Bowen', 'Collinsville', 'Jubilee Pocket', 'Shute Harbour', 'Online or markets only'];
const PH = ['ph-coral', 'ph-navy', 'ph-gold', 'ph-aqua', 'ph-blush'];

const ICON = {
  tick: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
  arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  pin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  logo: '<svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><rect x="4" y="12" width="36" height="28" rx="6" fill="#CF4630"/><rect x="20" y="12" width="4" height="28" fill="#E0A83A"/><rect x="4" y="22" width="36" height="4" fill="#E0A83A"/><path d="M22 12c-4-8-12-8-12-3s8 3 12 3zm0 0c4-8 12-8 12-3s-8 3-12 3z" fill="none" stroke="#E0A83A" stroke-width="3"/></svg>',
};

// ---------- data shaping ----------
export function shapeListing(l) {
  const name = l['Business name'] || 'Unnamed business';
  const level = l['Listing level'] || 'Basic';
  return {
    id: l.id, name, slug: slugify(name), level,
    featured: level === 'Featured' || level === 'Campaign partner',
    partner: level === 'Campaign partner',
    town: l.Town || 'Online or markets only',
    categories: l.Categories || [], buyingFor: l['Good gifts for'] || [], prices: l['Price bands'] || [],
    description: (l.Description || '').trim(),
    vouchers: !!l['Sells gift vouchers'], ships: !!l['Ships Australia-wide'], xmasEve: !!l['Open Christmas Eve'], market: !!l['At a December market'],
    address: l['Street address'] || '', phone: l.Phone || '', email: l.Email || '', website: l.Website || '', instagram: l.Instagram || '', facebook: l.Facebook || '',
    hours: (l['Christmas trading hours'] || '').split('\n').map(s => s.trim()).filter(Boolean),
    keyDates: l['Last orders / key dates'] || '',
    photos: l.photoFiles || [], logo: l.logoFile || null,
    sample: /sample/i.test(l['Admin notes'] || ''),
  };
}

export function readSettings(rows) {
  const s = {};
  for (const r of rows) if (r.Setting) s[r.Setting.trim()] = (r.Value || '').trim();
  const theme = (s.theme || 'christmas').toLowerCase().includes('year') ? 'year-round' : 'christmas';
  return {
    theme, isXmas: theme === 'christmas',
    siteUrl: (s.site_url || '').replace(/\/+$/, ''), year: s.campaign_year || String(new Date().getFullYear()),
    regClose: s.registration_close || '[DATE]', campaignDates: s.campaign_dates || '[DATE] to 24 December',
    contactName: s.contact_name || '', contactEmail: s.contact_email || '', contactPhone: s.contact_phone || '',
    formUrl: s.registration_form_url || '', formButton: s.registration_button_text || '', formIntro: s.registration_intro || '', formNote: s.registration_note || '', newspaper: s.newspaper_name || 'the newspaper',
    priceBasic: s.price_basic || 'Free for members', priceFeatured: s.price_featured || '', pricePartner: s.price_partner || '',
    partners: (s.partners || '').split('\n').map(x => x.trim()).filter(Boolean),
  };
}

// ---------- components ----------
function photoOrPh(l, i = 0, cls = '', label = 'Photo') {
  const p = l.photos[i];
  if (p) return `<img class="photo" src="${esc(cls)}" alt="${esc(l.name)}" loading="lazy">`.replace('src="', `src="${'{IMG}'}`).replace('{IMG}', '');
  return '';
}
function media(l, href, i, label) {
  const p = l.photos[i];
  const ph = PH[(l.name.length + i) % PH.length];
  if (p) return `<img class="photo" src="${href(`img/${p.file}`)}" alt="${esc(l.name)}" loading="lazy" width="${p.width || ''}" height="${p.height || ''}">`;
  return `<div class="ph ${ph}" style="width:100%;height:100%" aria-hidden="true">${label || 'Photo coming'}</div>`;
}

export function card(l, href, S) {
  const tags = [l.featured ? `<span class="chip chip-gold l">${l.partner ? 'Campaign partner' : 'Featured'}</span>` : '', l.sample ? '<span class="chip chip-white r">Sample</span>' : ''].join('');
  const meta = [l.town, l.prices.length ? priceRange(l.prices) : '', l.vouchers ? 'Vouchers' : ''].filter(Boolean).join(' · ');
  return `<a class="card" href="${href(`listing/${l.slug}/`)}">
  <div class="card-media">${media(l, href, 0)}${tags}</div>
  <div class="card-body">
    <div class="chips">${l.categories.slice(0, 3).map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>
    <h3>${esc(l.name)}</h3>
    <p>${esc(truncate(l.description, 180))}</p>
    <span class="meta">${esc(meta)}</span>
  </div></a>`;
}
export function priceRange(prices) {
  const order = PRICE_BANDS.map(b => b.name);
  const sorted = [...prices].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (sorted.length === 1) return sorted[0];
  const lo = sorted[0], hi = sorted[sorted.length - 1];
  if (lo === 'Under $25' && hi === '$100+') return 'Under $25 to $100+';
  return `${lo} to ${hi}`;
}
const truncate = (s, n) => s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + '…';

function topband(S, href, right) {
  return `<div class="topband"><div class="wrap"><span>${S.isXmas ? `Christmas ${esc(S.year)}` : 'Gift Local'} · Powered by the Whitsundays business community</span><span class="hide-m">${right}</span></div></div>`;
}
function nav(S, href, current) {
  const link = (to, label, key) => `<a class="navlink" href="${href(to)}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="nav"><nav class="wrap" aria-label="Main">
  <a class="brand" href="${href('')}">${ICON.logo}<span class="brand-word"><b>GIFT LOCAL</b><small>THE WHITSUNDAYS</small></span></a>
  <button class="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="navlinks" data-menu><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15213A" stroke-width="2.5" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  <div class="navlinks" id="navlinks">
    ${link('browse/', 'Browse gifts', 'browse')}${link('towns/', 'By town', 'towns')}${link('vouchers/', 'Vouchers', 'vouchers')}${link('', 'Markets', 'markets').replace(`href="${href('')}"`, `href="${href('', '#markets')}"`)}
    <a class="btn ${current === 'get-listed' ? 'btn-navy' : 'btn-coral'}" href="${href('get-listed/')}">List your business</a>
  </div></nav></header>`;
}
function footer(S, href) {
  const partners = S.partners.length ? S.partners.map(p => `<div>${esc(p)}</div>`).join('') : ['Partner logo', 'Partner logo', 'Partner logo', 'Partner logo', 'Media partner', 'Council'].map(p => `<div>${p}</div>`).join('');
  return `<footer class="foot"><div class="wrap">
  <div style="display:flex;flex-direction:column;gap:16px"><span class="eyebrow">Powered by the Whitsundays business community</span><div class="logos">${partners}</div></div>
  <div class="footcols">
    <div><b>Browse</b><a href="${href('browse/')}">All listings</a><a href="${href('for/')}">Who are you buying for</a><a href="${href('price/')}">By budget</a><a href="${href('towns/')}">By town</a><a href="${href('vouchers/')}">Vouchers &amp; experiences</a></div>
    <div><b>Businesses</b><a href="${href('get-listed/')}">Get listed</a><a href="${href('get-listed/', '#tiers')}">Featured &amp; partner packages</a><a href="${href('get-listed/', '#faq')}">Questions</a></div>
    <div><b>About</b><a href="${href('', '#markets')}">Markets calendar</a><a href="${href('a-z/')}">A–Z of businesses</a>${S.contactEmail && !S.contactEmail.startsWith('[') ? `<a href="mailto:${esc(S.contactEmail)}">Contact</a>` : ''}</div>
    <div><b>An initiative of</b><span style="color:var(--on-navy-2)">Whitsundays Chamber of Commerce and Industry, with regional partners. Listing details are supplied by each business.</span></div>
  </div>
  <div class="footbar"><span>© ${esc(S.year)} Gift Local | The Whitsundays</span><span>Built by the region's business community</span></div>
</div></footer>`;
}

export function layout({ S, href, title, description, current, canonical, body, jsonld, topRight, noindex }) {
  const fullTitle = title ? `${title} · Gift Local | The Whitsundays` : `Gift Local | The Whitsundays — ${S.isXmas ? `Christmas ${S.year} gift guide` : 'the Whitsundays gift guide'}`;
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:title" content="${esc(fullTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website">${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
<link rel="icon" href="${href('favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800;9..144,900&family=DM+Sans:wght@400;500;700&display=swap">
<link rel="stylesheet" href="${href('styles.css')}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body class="theme-${S.theme}">
<a class="skip" href="#main">Skip to content</a>
<div style="display:flex;flex-direction:column;min-height:100vh">
${topband(S, href, topRight || 'Shop local from Bowen to Airlie Beach, Proserpine to Collinsville')}
${nav(S, href, current)}
<main id="main">${body}</main>
${footer(S, href)}
</div>
<script src="${href('site.js')}" defer></script>
</body></html>`;
}

// ---------- pages ----------
export function homePage(ctx) {
  const { S, listings, markets, href, counts } = ctx;
  const featured = listings.filter(l => l.featured).slice(0, 3);
  const featuredOrTop = featured.length >= 3 ? featured : [...featured, ...listings.filter(l => !l.featured)].slice(0, 3);
  const heroArt = `<svg class="hero-art" aria-hidden="true" viewBox="0 0 1360 620" preserveAspectRatio="xMidYMid slice">
    ${S.isXmas ? `<g stroke="#E0A83A" stroke-width="2" fill="none"><path d="M120 0v70"/><path d="M1240 0v110"/><path d="M1130 0v60"/><path d="M60 0v40"/></g>
    <circle cx="120" cy="92" r="24" fill="#CF4630"/><circle cx="120" cy="92" r="24" fill="none" stroke="#E0A83A" stroke-width="3" stroke-dasharray="4 6"/>
    <circle cx="1240" cy="134" r="26" fill="#15213A"/><path d="M1226 134h28M1240 120v28" stroke="#E0A83A" stroke-width="3"/>
    <circle cx="1130" cy="82" r="20" fill="#E0A83A"/><circle cx="60" cy="60" r="16" fill="#1FA9B8"/>
    <path d="M1040 560l12-30 12 30 30 4-22 22 6 32-26-16-26 16 6-32-22-22z" fill="#E0A83A"/>
    <path d="M1320 300l8-20 8 20 20 3-15 15 4 21-17-11-17 11 4-21-15-15z" fill="#CF4630"/>` :
    `<circle cx="120" cy="92" r="24" fill="#1FA9B8"/><circle cx="1240" cy="134" r="26" fill="#15213A"/><circle cx="1130" cy="82" r="20" fill="#E0A83A"/>
    <path d="M1040 560l12-30 12 30 30 4-22 22 6 32-26-16-26 16 6-32-22-22z" fill="#E0A83A"/>`}
    <circle cx="1300" cy="420" r="6" fill="#CF4630"/><circle cx="40" cy="380" r="8" fill="#E0A83A"/><circle cx="1180" cy="520" r="5" fill="#1FA9B8"/></svg>`;
  const collage = featuredOrTop.length ? [0, 1, 2, 3].map(i => {
    const l = listings[i % Math.max(listings.length, 1)];
    return l ? `<div class="ph ${PH[i]}">${media(l, href, 0, ['Local maker', 'Shopfront', 'Experience', 'Markets'][i])}</div>` : `<div class="ph ${PH[i]}">Photo</div>`;
  }).join('') : '';
  const body = `
<section class="hero">${heroArt}<div class="wrap">
  <div class="hero-copy">
    <span class="chip chip-navy" style="align-self:flex-start">${S.isXmas ? 'Christmas gift guide' : 'Gift guide'} · 100% Whitsundays businesses</span>
    <h1>Every gift on this list is from <span class="squiggle">right here.<svg aria-hidden="true" viewBox="0 0 300 18"><path d="M4 12c60-12 120-8 180-4s80 2 112-6" fill="none" stroke="#E0A83A" stroke-width="6" stroke-linecap="round"/></svg></span></h1>
    <p class="lede" style="max-width:560px">One place to find Whitsundays makers, shops, experiences and vouchers${S.isXmas ? ' this Christmas' : ''}. Sorted by who you're buying for, what you want to spend and where you are.</p>
    <form class="search" action="${href('browse/')}" method="get" data-search>
      <label>I'm buying for<select name="for"><option value="">Anyone</option>${BUYING_FOR.map(b => `<option>${esc(b.name)}</option>`).join('')}</select></label>
      <label>Near<select name="town"><option value="">Anywhere in the Whitsundays</option>${TOWNS.map(t => `<option>${esc(t)}</option>`).join('')}</select></label>
      <button class="btn btn-coral btn-lg" type="submit">Find gifts ${ICON.arrow}</button>
    </form>
    <div class="ticks"><span style="color:var(--coral-dk)">${ICON.tick}<span style="color:var(--muted)">${listings.length} local business${listings.length === 1 ? '' : 'es'} listed</span></span><span style="color:var(--coral-dk)">${ICON.tick}<span style="color:var(--muted)">Free to browse, free to list</span></span><span style="color:var(--coral-dk)">${ICON.tick}<span style="color:var(--muted)">Vouchers and experiences count</span></span></div>
  </div>
  <div class="hero-collage" aria-hidden="true">${collage}</div>
</div></section>

<section class="section"><div class="wrap">
  <div class="section-head"><div class="stack"><span class="eyebrow">Start here</span><h2>Who are you buying for?</h2></div><a class="more" href="${href('browse/')}">See every listing →</a></div>
  <div class="grid g4">${BUYING_FOR.slice(0, 8).map(b => `<a class="tile ${b.cls || ''}" href="${href(`for/${slugify(b.name)}/`)}"><b>${esc(b.name)}</b><span>${esc(b.blurb)}</span></a>`).join('')}</div>
</div></section>

<section class="section-tight"><div class="wrap">
  <h2 style="font-size:32px;margin-bottom:24px">Or start with a budget</h2>
  <div class="grid g4">${PRICE_BANDS.map(b => `<a class="band" href="${href(`price/${slugify(b.name)}/`)}"><em>${esc(b.name)}</em><b>${esc(S.isXmas ? b.xmas : b.year)}</b><span>${esc(b.sub)}</span></a>`).join('')}</div>
</div></section>

${featuredOrTop.length ? `<section class="dark section" style="margin-top:40px;padding-bottom:80px"><div class="wrap">
  <div class="section-head"><div class="stack"><span class="eyebrow">${featured.length ? 'Featured this week' : 'From the guide'}</span><h2>Meet the people behind the gifts</h2></div><a class="more" href="${href('browse/')}">All listings →</a></div>
  <div class="grid g3">${featuredOrTop.map(l => card(l, href, S)).join('')}</div>
</div></section>` : ''}

<section class="section"><div class="wrap">
  <div class="section-head"><div class="stack"><span class="eyebrow">Shop by town</span><h2>Where are you?</h2></div></div>
  <div class="grid g4">${TOWNS.map((t, i) => `<a class="town ${i === TOWNS.length - 1 ? 'town-coral' : ''}" href="${href(`town/${slugify(t)}/`)}">${esc(t)} <small>${counts.town[t] || 0} listing${counts.town[t] === 1 ? '' : 's'}</small></a>`).join('')}</div>
</div></section>

<section class="section-tight"><div class="wrap">
  <div class="callout">
    <svg aria-hidden="true" style="position:absolute;right:-40px;top:-40px;width:320px;height:320px;opacity:.25" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 5"/><circle cx="50" cy="50" r="30" fill="#fff"/></svg>
    <div class="c8"><span class="eyebrow">${S.isXmas ? 'Running late?' : 'Forgot a birthday?'}</span><h2>A voucher from a local business still counts.</h2><p style="max-width:620px">Cafés, salons, tours, gyms, bookshops and tradies. Most can email a voucher the same day, and every dollar stays in the region.</p></div>
    <div class="c4"><a class="btn btn-white btn-lg" href="${href('vouchers/')}">Browse vouchers</a></div>
  </div>
</div></section>

${markets.length ? `<section id="markets" class="section-tight"><div class="wrap" style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:32px;align-items:start">
  <div style="grid-column:span 5;display:flex;flex-direction:column;gap:12px"><span class="eyebrow">In person</span><h2 style="font-size:40px">Catch the makers at the markets</h2><p class="lede" style="font-size:17px">Many listed businesses also trade at the region's markets${S.isXmas ? ' in December' : ''}.</p></div>
  <div style="grid-column:span 7;display:flex;flex-direction:column;gap:12px">${markets.map(m => `<div class="rowcard"><b>${esc(m.Market)}</b><span>${esc(fmtDate(m.Date))}${m.Town ? ` · ${esc(m.Town)}` : ''}</span></div>`).join('')}</div>
</div></section>` : ''}

<section class="section" style="padding-bottom:88px"><div class="wrap">
  <div class="boxed">
    <div class="c7"><span class="eyebrow">For Whitsundays businesses</span><h2 style="font-size:40px">Sell something people could give? Get listed.</h2><p class="lede" style="font-size:17px">A basic listing is free for every Chamber member in the region. Featured listings and campaign partner packages put you in the newspaper lift-out, on social and at the top of the guide. Registrations close <b>${esc(S.regClose)}</b>.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;padding-top:8px"><a class="btn btn-navy" href="${href('get-listed/')}">See the options</a><a class="btn btn-ghost" href="${href('get-listed/', '#register')}">${S.formUrl && !/airtable\.com/.test(S.formUrl) ? 'Register your interest' : 'Register now, 5 minutes'}</a></div></div>
    <div class="c5 tiers-mini"><div><span class="display">Free</span><small>Basic listing (members)</small></div><div style="background:var(--blush)"><span class="display" style="color:var(--coral-dk)">Featured</span><small>${esc(S.priceFeatured.split('/')[0].trim() || 'Paid')}</small></div><div style="background:var(--navy)"><span class="display" style="color:var(--gold)">Partner</span><small style="color:var(--on-navy)">${esc(S.pricePartner.split('/')[0].trim() || 'Paid')}</small></div></div>
  </div>
</div></section>`;
  return layout({ S, href, title: '', description: `Find Whitsundays makers, shops, experiences and gift vouchers from Bowen to Airlie Beach. ${listings.length} local businesses, sorted by who you're buying for, budget and town.`, current: 'home', canonical: S.siteUrl ? `${S.siteUrl}/` : '', body,
    jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Gift Local | The Whitsundays', url: S.siteUrl || undefined, description: 'A shop-local gift guide for the Whitsundays region, Queensland.', publisher: { '@type': 'Organization', name: 'Whitsundays Chamber of Commerce and Industry' } } });
}

export function fmtDate(d) {
  if (!d) return '[DATE]';
  const dt = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long' });
}

// Browse / filtered listing pages share one renderer.
export function browsePage(ctx, { pagePath, title, eyebrow, intro, items, filter = {}, current = 'browse', description, canonicalPath }) {
  const { S, listings, href, counts } = ctx;
  const check = (group, name, n) => `<label class="fl"><input type="checkbox" name="${group}" value="${esc(name)}"${filter[group] === name ? ' checked' : ''}>${esc(name)}<small>${n ?? ''}</small></label>`;
  const filters = `<aside class="filters" aria-label="Filters"><details open><summary>Filter listings</summary><div>
    <div class="fg"><h3>Buying for</h3>${BUYING_FOR.map(b => check('for', b.name, counts.for[b.name] || 0)).join('')}</div>
    <div class="fg"><h3>Budget</h3>${PRICE_BANDS.map(b => check('price', b.name, counts.price[b.name] || 0)).join('')}</div>
    <div class="fg"><h3>Town</h3>${TOWNS.map(t => check('town', t, counts.town[t] || 0)).join('')}</div>
    <div class="fg"><h3>Category</h3>${Object.keys(counts.category).sort().map(c => check('category', c, counts.category[c])).join('')}</div>
    <div class="fg"><h3>Good to know</h3>${check('flag', 'Sells gift vouchers', counts.flag.vouchers)}${check('flag', 'Ships Australia-wide', counts.flag.ships)}${check('flag', 'Open Christmas Eve', counts.flag.xmasEve)}${check('flag', 'At a December market', counts.flag.market)}</div>
    <div class="fg"><a class="btn btn-ghost" href="${href('browse/')}" style="width:100%">Clear filters</a></div>
  </div></details></aside>`;
  const cards = items.map(l => `<div class="hit" data-for="${esc(l.buyingFor.join('|'))}" data-price="${esc(l.prices.join('|'))}" data-town="${esc(l.town)}" data-category="${esc(l.categories.join('|'))}" data-flag="${[l.vouchers && 'Sells gift vouchers', l.ships && 'Ships Australia-wide', l.xmasEve && 'Open Christmas Eve', l.market && 'At a December market'].filter(Boolean).join('|')}" data-name="${esc(l.name.toLowerCase())}" data-featured="${l.featured ? 1 : 0}">${card(l, href, S)}</div>`).join('');
  const body = `
<section class="pagehead"><div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${href('')}">Home</a> › ${eyebrow ? `<a href="${href('browse/')}">Browse</a> › ` : ''}<span>${esc(title)}</span></nav>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap">
    <div class="stack" style="display:flex;flex-direction:column;gap:8px">${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}<h1 style="font-size:clamp(34px,4.5vw,52px)">${title}</h1></div>
    <form class="search" style="box-shadow:none;padding:6px;max-width:460px;flex:1 1 300px" role="search" onsubmit="return false"><label style="padding:4px 10px">Search<input type="search" data-q placeholder="Business, product or category" style="border:0;outline:0;font-size:16px;background:transparent;font-family:inherit;min-height:28px"></label></form>
  </div>
  ${intro ? `<p class="lede" style="font-size:17px;max-width:720px">${intro}</p>` : ''}
</div></section>
<div class="wrap browse">
  ${filters}
  <div class="results">
    <div class="results-bar"><span><b style="color:var(--navy)" data-count>${items.length}</b> business${items.length === 1 ? '' : 'es'}${Object.keys(filter).length ? '' : ' · featured listings first'}</span>
      <label style="display:flex;align-items:center;gap:8px;font-weight:600">Sort <select data-sort><option value="featured">Featured first</option><option value="az">A–Z</option><option value="town">By town</option></select></label></div>
    <div class="grid g3" data-hits>${cards}
      <div class="card card-cta"><div style="display:flex;flex-direction:column;gap:10px"><span class="eyebrow">Your business here</span><h3>Sell something they'd love?</h3><p>A basic listing is free for Chamber members. Registrations close ${esc(S.regClose)}.</p></div><a class="btn btn-coral" href="${href('get-listed/')}" style="align-self:flex-start">Get listed</a></div>
    </div>
    <div class="empty" data-empty hidden>No listings match those filters yet. Try fewer filters, or <a href="${href('browse/')}">see everything</a>.</div>
  </div>
</div>`;
  return layout({ S, href, title: title.replace(/<[^>]+>/g, ''), description, current, canonical: S.siteUrl ? `${S.siteUrl}/${canonicalPath}` : '', body, topRight: `Registrations for businesses close ${esc(S.regClose)}` });
}

export function hubPage(ctx, { title, eyebrow, intro, links, current, canonicalPath, description }) {
  const { S, href } = ctx;
  const body = `<section class="pagehead"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="${href('')}">Home</a> › <span>${esc(title)}</span></nav><div class="stack" style="display:flex;flex-direction:column;gap:8px"><span class="eyebrow">${esc(eyebrow)}</span><h1 style="font-size:clamp(34px,4.5vw,52px)">${esc(title)}</h1></div>${intro ? `<p class="lede" style="font-size:17px;max-width:720px">${intro}</p>` : ''}</div></section>
  <section class="section"><div class="wrap"><div class="grid g4">${links}</div></div></section>`;
  return layout({ S, href, title, description, current, canonical: S.siteUrl ? `${S.siteUrl}/${canonicalPath}` : '', body });
}

export function listingPage(ctx, l, nearby) {
  const { S, href, markets } = ctx;
  const site = S.siteUrl;
  const canonical = site ? `${site}/listing/${l.slug}/` : '';
  const photos = l.photos.length ? l.photos : [];
  const gallery = photos.length ? photos.slice(0, 5).map((p, i) => `<div>${media(l, href, i)}</div>`).join('') + (photos.length < 2 ? '' : '')
    : [0, 1, 2, 3, 4].map(i => `<div class="ph ${PH[i]}" aria-hidden="true">${i === 0 ? 'Photo coming' : ''}</div>`).join('');
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: l.name, description: l.description,
    url: l.website || canonical || undefined, telephone: l.phone || undefined, email: l.email || undefined,
    image: photos.length && site ? photos.map(p => `${site}/img/${p.file}`) : undefined,
    address: l.address ? { '@type': 'PostalAddress', streetAddress: l.address, addressLocality: l.town, addressRegion: 'QLD', addressCountry: 'AU' } : { '@type': 'PostalAddress', addressLocality: l.town === 'Online or markets only' ? 'Whitsundays' : l.town, addressRegion: 'QLD', addressCountry: 'AU' },
    areaServed: 'Whitsunday Region, Queensland', sameAs: [l.instagram, l.facebook].filter(Boolean),
    isPartOf: { '@type': 'WebSite', name: 'Gift Local | The Whitsundays', url: site || undefined },
  };
  const kv = (k, v) => v ? `<div class="kv"><span>${k}</span><span>${v}</span></div>` : '';
  const body = `
<section class="wrap" style="padding-top:28px;display:flex;flex-direction:column;gap:16px">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${href('')}">Home</a> › <a href="${href(`town/${slugify(l.town)}/`)}">${esc(l.town)}</a> › <span>${esc(l.name)}</span></nav>
  <div class="gallery">${gallery}</div>
</section>
<div class="wrap listing">
  <article class="listing-main">
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="chips">${l.featured ? `<span class="chip chip-gold">${l.partner ? 'Campaign partner' : 'Featured listing'}</span>` : ''}${l.categories.map(c => `<a class="chip" style="text-decoration:none" href="${href(`category/${slugify(c)}/`)}">${esc(c)}</a>`).join('')}${l.sample ? '<span class="chip chip-white">Sample business</span>' : ''}</div>
      <h1 style="font-size:clamp(36px,5vw,56px)">${esc(l.name)}</h1>
      <p style="font-size:17px;color:var(--muted);display:flex;align-items:center;gap:8px"><span style="color:var(--coral-dk)">${ICON.pin}</span>${esc(l.address ? `${l.address}` : l.town)}${l.market && markets.length ? ' · also at the markets' : ''}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px"><h2 style="font-size:26px">What we ${l.categories.some(c => /experience|dining|lesson|beauty|trade/i.test(c)) ? 'offer' : 'make and sell'}</h2><p class="desc">${esc(l.description || 'Description coming soon.')}</p></div>
    ${l.buyingFor.length ? `<div style="display:flex;flex-direction:column;gap:12px"><h2 style="font-size:26px">Good gifts for</h2><div class="chips">${l.buyingFor.map(b => `<a class="chip chip-link" href="${href(`for/${slugify(b)}/`)}">${esc(b)}</a>`).join('')}</div></div>` : ''}
    ${l.prices.length ? `<div style="display:flex;flex-direction:column;gap:12px"><h2 style="font-size:26px">Price guide</h2><div class="grid g4" style="gap:12px">${PRICE_BANDS.filter(b => l.prices.includes(b.name)).map(b => `<a class="gift" style="text-decoration:none;color:var(--ink)" href="${href(`price/${slugify(b.name)}/`)}"><em>${esc(b.name)}</em><span style="font-size:14px;color:var(--muted)">${esc(S.isXmas ? b.xmas : b.year)}</span></a>`).join('')}</div></div>` : ''}
    <div class="grid g2" style="gap:24px">
      ${l.hours.length || l.keyDates ? `<div><h2 style="font-size:22px;margin-bottom:8px">${S.isXmas ? 'Christmas trading' : 'Trading hours'}</h2>${l.hours.map(h => { const [a, ...b] = h.split(/\s{2,}|\t|: /); const rest = b.join(' '); return rest ? kv(esc(a), esc(rest)) : `<div class="kv"><span>${esc(h)}</span><span></span></div>`; }).join('')}${l.keyDates ? `<div class="kv" style="border:0"><span>Key dates</span><span style="color:var(--coral-dk)">${esc(l.keyDates)}</span></div>` : ''}</div>` : ''}
      <div><h2 style="font-size:22px;margin-bottom:8px">Good to know</h2>
        ${kv('Gift vouchers', l.vouchers ? 'Yes' : 'Ask in store')}${kv('Posts Australia-wide', l.ships ? 'Yes' : '')}${l.xmasEve ? kv('Christmas Eve', 'Open') : ''}${l.market ? kv('At the markets', `Yes${markets.length ? ` · ${esc(markets[0].Market)}` : ''}`) : ''}${kv('Based in', esc(l.town))}
      </div>
    </div>
  </article>
  <aside class="listing-side">
    <div class="contact"><span class="eyebrow">Get in touch</span>
      ${l.website ? `<a class="btn btn-coral" href="${esc(l.website)}" rel="noopener" target="_blank">Visit website</a>` : ''}
      ${l.phone ? `<a class="btn btn-navy" href="tel:${esc(l.phone.replace(/\s+/g, ''))}">Call ${esc(l.phone)}</a>` : ''}
      ${l.email ? `<a class="btn btn-ghost" href="mailto:${esc(l.email)}">Email</a>` : ''}
      ${!l.website && !l.phone && !l.email ? '<p style="color:var(--muted);font-size:14px;text-align:center">Contact details coming soon.</p>' : ''}
      <div class="socials">
        ${l.facebook ? `<a href="${esc(l.facebook)}" aria-label="Facebook" rel="noopener" target="_blank"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15213A" stroke-width="2" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/></svg></a>` : ''}
        ${l.instagram ? `<a href="${esc(l.instagram)}" aria-label="Instagram" rel="noopener" target="_blank"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15213A" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#15213A"/></svg></a>` : ''}
        <a href="${canonical || '#'}" aria-label="Copy link to this listing" data-share><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15213A" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg></a>
      </div></div>
    ${l.address ? `<a class="ph" style="height:160px;border-radius:20px;background:#E3F3F5;color:var(--navy);border:2px solid var(--sand);flex-direction:column;gap:4px;text-transform:none;letter-spacing:0;font-size:14px;text-decoration:none" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${l.name}, ${l.address}, ${l.town} QLD`)}" rel="noopener" target="_blank"><span style="color:var(--coral-dk)">${ICON.pin}</span>Open in Google Maps<span style="font-weight:500;color:var(--muted)">${esc(l.address)}</span></a>` : ''}
    <div class="note"><b>Is this your business?</b><span>Update your photos, hours and description any time${S.isXmas ? ' before 24 December' : ''}.</span>${S.contactEmail && !S.contactEmail.startsWith('[') ? `<a href="mailto:${esc(S.contactEmail)}?subject=${encodeURIComponent(`Gift Local listing update: ${l.name}`)}" style="font-weight:700;color:var(--coral-dk)">Email us an update →</a>` : `<a href="${href('get-listed/')}" style="font-weight:700;color:var(--coral-dk)">Contact the campaign team →</a>`}</div>
  </aside>
</div>
${nearby.length ? `<section style="background:#fff;border-top:1px solid var(--sand)"><div class="wrap" style="padding:56px 24px 64px"><div class="section-head"><h2 style="font-size:34px">More in ${esc(l.town)}</h2><a class="more" href="${href(`town/${slugify(l.town)}/`)}">All ${esc(l.town)} listings →</a></div><div class="grid g4">${nearby.map(n => `<a class="card" href="${href(`listing/${n.slug}/`)}"><div class="card-media" style="height:120px">${media(n, href, 0, 'Photo')}</div><div class="card-body" style="padding:16px;gap:6px"><b class="display" style="font-size:19px">${esc(n.name)}</b><span class="meta" style="font-size:13px">${esc(n.categories[0] || '')}${n.prices.length ? ` · ${esc(priceRange(n.prices))}` : ''}</span></div></a>`).join('')}</div></div></section>` : ''}`;
  return layout({ S, href, title: `${l.name} — ${l.town}`, description: truncate(l.description || `${l.name} in ${l.town}, part of the Gift Local Whitsundays guide.`, 155), current: 'browse', canonical, body, jsonld, noindex: l.sample });
}

export function getListedPage(ctx) {
  const { S, href } = ctx;
  const tick = c => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="3" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>`;
  const split = p => { const [m, n] = p.split('/').map(x => x.trim()); return { m: m || '', n: n || '' }; };
  const pb = split(S.priceBasic), pf = split(S.priceFeatured), pp = split(S.pricePartner);
  // Airtable form links are embedded on the page; any other link (an EOI form elsewhere) becomes a button.
  const isAirtable = /airtable\.com/.test(S.formUrl);
  const btnText = S.formButton || (isAirtable ? 'Register my business' : 'Register your interest');
  const formEmbed = !S.formUrl ? `<div class="empty">Registration form coming soon. In the meantime, email ${esc(S.contactEmail)}.</div>`
    : isAirtable ? `<div class="formwrap"><iframe class="airtable-embed" src="${esc(S.formUrl.replace('airtable.com/', 'airtable.com/embed/'))}" title="Registration form" loading="lazy"></iframe></div><p style="font-size:14px;color:var(--muted);margin-top:12px">Form not loading? <a href="${esc(S.formUrl)}" rel="noopener" target="_blank">Open it in a new tab</a>.</p>`
    : `<div class="boxed" style="grid-template-columns:minmax(0,1fr);box-shadow:8px 8px 0 var(--gold)"><div style="display:flex;flex-direction:column;gap:16px;align-items:flex-start"><h3 style="font-size:28px">${esc(S.formIntro || 'Step one: tell us you\'re keen.')}</h3><p class="lede" style="font-size:17px">${esc(S.formNote || 'Takes two minutes. We\'ll come back to you with the listing form and your rate.')}</p><a class="btn btn-coral btn-lg" href="${esc(S.formUrl)}" rel="noopener" target="_blank">${esc(btnText)} ${ICON.arrow}</a></div></div>`;
  const body = `
<section class="dark" style="position:relative;overflow:hidden"><svg aria-hidden="true" style="position:absolute;right:0;top:0;height:100%;width:40%" viewBox="0 0 500 400" preserveAspectRatio="xMaxYMid slice"><circle cx="380" cy="90" r="60" fill="#CF4630"/><circle cx="380" cy="90" r="60" fill="none" stroke="#E0A83A" stroke-width="4" stroke-dasharray="6 10"/><circle cx="470" cy="260" r="90" fill="#E0A83A"/><path d="M470 170v180M380 260h180" stroke="#15213A" stroke-width="6"/><circle cx="300" cy="330" r="36" fill="#1FA9B8"/></svg>
<div class="wrap" style="position:relative;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:32px;padding-top:72px;padding-bottom:72px"><div style="grid-column:span 7;display:flex;flex-direction:column;gap:20px">
  <span class="eyebrow">For Whitsundays businesses</span><h1 style="color:#fff;font-size:clamp(38px,5.5vw,64px)">Get in front of every ${S.isXmas ? 'Christmas ' : ''}shopper in the region.</h1>
  <p class="lede" style="color:#D8DFEC;max-width:560px">Gift Local is a campaign, not a PDF. A dedicated website, a newspaper lift-out, social content and in-town promotion, all pointing people to businesses like yours. A basic listing is free for every Chamber member in the Whitsundays.</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;padding-top:6px"><a class="btn btn-coral btn-lg" href="#register">${esc(btnText)}</a><a class="btn btn-lg" href="#tiers" style="border-color:#F6E7D2;color:#F6E7D2">Compare the options</a></div>
  <div class="stats"><span><b>${esc(S.campaignDates)}</b>campaign dates</span><span><b>${esc(S.regClose)}</b>registrations close</span><span><b>5 mins</b>to register online</span></div>
</div></div></section>

<section id="tiers" class="section"><div class="wrap">
  <div class="stack" style="display:flex;flex-direction:column;gap:10px;max-width:720px;margin-bottom:28px"><span class="eyebrow">Three ways in</span><h2>Pick the level that fits</h2><p class="lede" style="font-size:17px">Member rates apply to current members of the Whitsundays Chamber of Commerce and Industry and Bowen Chamber.${S.priceBasic.toLowerCase().includes('draft') || true ? ' Prices are confirmed on your invoice.' : ''}</p></div>
  <div class="grid g3" style="gap:20px;align-items:stretch">
    <div class="tier"><span class="chip" style="align-self:flex-start">Every business</span><h3>Basic listing</h3><div class="price"><b>${esc(pb.m)}</b><span>${esc(pb.n)}</span></div>
      <ul class="inc"><li>${tick('#CF4630')}Your business on the website: name, town, categories, ~50 words and photos</li><li>${tick('#CF4630')}Searchable by who you're buying for, budget and town</li><li>${tick('#CF4630')}Name and town in the lift-out's A–Z directory</li><li>${tick('#CF4630')}"We're in the guide" social tiles and window sticker</li></ul>
      <a class="btn btn-ghost" href="#register" style="margin-top:auto">Register</a></div>
    <div class="tier featured"><span class="chip" style="align-self:flex-start;background:var(--coral-dk);color:#fff">Most popular</span><h3>Featured listing</h3><div class="price"><b>${esc(pf.m)}</b><span>${esc(pf.n)}</span></div>
      <ul class="inc"><li>${tick('#CF4630')}Everything in Basic, shown first in search results</li><li>${tick('#CF4630')}Photo gallery, price guide and trading hours on your page</li><li>${tick('#CF4630')}A boxed feature with photo in the newspaper lift-out</li><li>${tick('#CF4630')}One dedicated social post across campaign channels</li></ul>
      <a class="btn btn-coral" href="#register" style="margin-top:auto">Go featured</a></div>
    <div class="tier partner"><span class="chip chip-gold" style="align-self:flex-start">Limited places</span><h3>Campaign partner</h3><div class="price"><b>${esc(pp.m)}</b><span>${esc(pp.n)}</span></div>
      <ul class="inc"><li>${tick('#E0A83A')}Everything in Featured, plus your logo on the site, lift-out and campaign collateral</li><li>${tick('#E0A83A')}Half-page in the lift-out and a home-page feature slot</li><li>${tick('#E0A83A')}Named in media releases and at the launch</li><li>${tick('#E0A83A')}Post-campaign report with reach and click-through figures</li></ul>
      <a class="btn" href="#register" style="margin-top:auto;background:var(--gold);color:var(--navy)">Talk to us about partnering</a></div>
  </div>
</div></section>

<section class="section-tight"><div class="wrap"><h2 style="font-size:34px;margin-bottom:24px">How it works</h2><div class="grid g4">
  <div class="step"><em>1</em><b>Register by ${esc(S.regClose)}</b><span>Five minutes online. Tell us what you sell, who it suits and where to find you.</span></div>
  <div class="step"><em>2</em><b>We build your page</b><span>Your listing goes live once it's approved. Check it and send us any tweaks.</span></div>
  <div class="step"><em>3</em><b>The campaign runs</b><span>Website, lift-out in ${esc(S.newspaper)}, social and in-town promotion, ${esc(S.campaignDates)}.</span></div>
  <div class="step"><em>4</em><b>It keeps working</b><span>After Christmas the guide switches to a year-round look. Your listing stays live for birthdays, thank-yous and visitors.</span></div>
</div></div></section>

<section id="register" style="background:#fff;border-top:1px solid var(--sand);border-bottom:1px solid var(--sand)"><div class="wrap" style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:48px;padding-top:64px;padding-bottom:64px;align-items:start">
  <div style="grid-column:span 4;display:flex;flex-direction:column;gap:14px"><span class="eyebrow">Register</span><h2 style="font-size:40px">Tell us about your business</h2><p style="color:var(--ink-2)">Your listing is a business, not a single product. Describe what you sell in about 50 words, pick the people it suits, and we'll do the rest.</p>
    <div class="note" style="background:var(--cream)"><b style="color:var(--navy)">Need a hand?</b>${esc(S.contactName)}${S.contactPhone ? ` · ${esc(S.contactPhone)}` : ''}${S.contactEmail ? ` · ${esc(S.contactEmail)}` : ''}</div></div>
  <div style="grid-column:span 8">${formEmbed}</div>
</div></section>

<section id="faq" class="section" style="padding-bottom:80px"><div class="wrap" style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:48px">
  <div style="grid-column:span 4"><h2 style="font-size:40px">Questions businesses ask</h2></div>
  <div style="grid-column:span 8;display:flex;flex-direction:column">
    <div class="faq"><b>I don't sell products. Can I still list?</b><span>Yes. Vouchers and experiences are some of the most-searched gifts. Cafés, salons, tours, gyms, lessons and trades all belong in the guide.</span></div>
    <div class="faq"><b>Do I have to be a Chamber member?</b><span>No. The guide is for the whole region. Members get the free or discounted rate; non-members pay the standard rate.</span></div>
    <div class="faq"><b>Can I list more than one product?</b><span>Your listing is your business, with your categories and a short description. The price guide shows shoppers what's on offer at each budget.</span></div>
    <div class="faq"><b>What happens after Christmas?</b><span>The site swaps its Christmas look for a year-round one and keeps running. Listings stay live, and the campaign returns each Christmas.</span></div>
    <div class="faq" style="border:0"><b>Who is behind Gift Local?</b><span>It's an initiative of the Whitsundays Chamber of Commerce and Industry, delivered with regional partners and powered by the businesses that take part.</span></div>
  </div>
</div></section>`;
  return layout({ S, href, title: 'List your business', description: 'List your Whitsundays business in the Gift Local gift guide. Free basic listings for Chamber members, featured and campaign partner packages available.', current: 'get-listed', canonical: S.siteUrl ? `${S.siteUrl}/get-listed/` : '', body, topRight: `Registrations close ${esc(S.regClose)}` });
}

export function azPage(ctx) {
  const { S, href, listings } = ctx;
  const sorted = [...listings].sort((a, b) => a.name.localeCompare(b.name, 'en-AU'));
  let letter = '';
  const items = sorted.map(l => {
    const L = l.name[0].toUpperCase();
    const head = L !== letter ? `<div style="border:0;padding-top:18px"><b class="display" style="font-size:22px;color:var(--coral-dk)">${L}</b></div>` : '';
    letter = L;
    return head + `<div><a href="${href(`listing/${l.slug}/`)}">${esc(l.name)}</a><small>${esc(l.town)}${l.vouchers ? ' · vouchers' : ''}</small></div>`;
  }).join('');
  const body = `<section class="pagehead"><div class="wrap"><nav class="crumbs"><a href="${href('')}">Home</a> › <span>A–Z</span></nav><h1 style="font-size:clamp(34px,4.5vw,52px)">Every business, A to Z</h1><p class="lede" style="font-size:17px">${listings.length} businesses across the Whitsundays.</p></div></section><section class="section"><div class="wrap"><div class="az">${items}</div></div></section>`;
  return layout({ S, href, title: 'A–Z of businesses', description: 'Every business in the Gift Local Whitsundays guide, A to Z.', current: 'browse', canonical: S.siteUrl ? `${S.siteUrl}/a-z/` : '', body });
}

export function notFoundPage(ctx) {
  const { S, href } = ctx;
  const body = `<section class="section" style="padding:96px 0"><div class="wrap" style="text-align:center;display:flex;flex-direction:column;gap:20px;align-items:center"><span class="eyebrow">404</span><h1>That page has wandered off.</h1><p class="lede">Maybe the listing moved, or the link was mistyped.</p><div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center"><a class="btn btn-coral" href="${href('browse/')}">Browse all gifts</a><a class="btn btn-ghost" href="${href('')}">Home</a></div></div></section>`;
  return layout({ S, href, title: 'Page not found', description: 'Page not found', current: '', body, noindex: true });
}

export const SITE_JS = `(function(){
  var btn=document.querySelector('[data-menu]'),links=document.getElementById('navlinks');
  if(btn&&links){btn.addEventListener('click',function(){var o=links.classList.toggle('open');btn.setAttribute('aria-expanded',o);});}
  var share=document.querySelector('[data-share]');
  if(share){share.addEventListener('click',function(e){if(navigator.clipboard){e.preventDefault();navigator.clipboard.writeText(location.href).then(function(){share.setAttribute('title','Link copied');});}});}
  var hits=document.querySelector('[data-hits]');if(!hits)return;
  var cards=[].slice.call(hits.querySelectorAll('.hit')),empty=document.querySelector('[data-empty]'),count=document.querySelector('[data-count]'),q=document.querySelector('[data-q]'),sort=document.querySelector('[data-sort]');
  var boxes=[].slice.call(document.querySelectorAll('.filters input[type=checkbox]'));
  var params=new URLSearchParams(location.search);
  boxes.forEach(function(b){if(params.get(b.name)===b.value)b.checked=true;});
  function active(){var a={};boxes.forEach(function(b){if(b.checked){(a[b.name]=a[b.name]||[]).push(b.value);}});return a;}
  function apply(){var a=active(),term=(q&&q.value||'').toLowerCase().trim(),n=0;
    cards.forEach(function(c){var ok=true;Object.keys(a).forEach(function(g){var vals=(c.getAttribute('data-'+g)||'').split('|');if(!a[g].some(function(v){return vals.indexOf(v)>-1}))ok=false;});
      if(ok&&term){var hay=(c.getAttribute('data-name')+' '+c.getAttribute('data-category')+' '+c.getAttribute('data-town')+' '+c.textContent).toLowerCase();if(hay.indexOf(term)<0)ok=false;}
      c.hidden=!ok;if(ok)n++;});
    if(count)count.textContent=n;if(empty)empty.hidden=n>0;
    var sp=new URLSearchParams();Object.keys(a).forEach(function(g){a[g].forEach(function(v){sp.append(g,v)})});history.replaceState(null,'',location.pathname+(sp.toString()?'?'+sp:''));}
  function resort(){var mode=sort?sort.value:'featured';var arr=cards.slice();arr.sort(function(x,y){
    if(mode==='az')return x.getAttribute('data-name').localeCompare(y.getAttribute('data-name'));
    if(mode==='town')return x.getAttribute('data-town').localeCompare(y.getAttribute('data-town'))||x.getAttribute('data-name').localeCompare(y.getAttribute('data-name'));
    return (y.getAttribute('data-featured')-x.getAttribute('data-featured'))||x.getAttribute('data-name').localeCompare(y.getAttribute('data-name'));});
    var cta=hits.querySelector('.card-cta');arr.forEach(function(c){hits.insertBefore(c,cta);});}
  boxes.forEach(function(b){b.addEventListener('change',apply)});if(q)q.addEventListener('input',apply);if(sort)sort.addEventListener('change',resort);
  resort();apply();
})();`;

export const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><rect width="44" height="44" rx="10" fill="#15213A"/><rect x="6" y="14" width="32" height="24" rx="5" fill="#CF4630"/><rect x="20" y="14" width="4" height="24" fill="#E0A83A"/><rect x="6" y="23" width="32" height="4" fill="#E0A83A"/><path d="M22 14c-4-8-12-8-12-3s8 3 12 3zm0 0c4-8 12-8 12-3s-8 3-12 3z" fill="none" stroke="#E0A83A" stroke-width="3"/></svg>`;
