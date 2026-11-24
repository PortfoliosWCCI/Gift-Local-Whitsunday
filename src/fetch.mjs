// Pulls listings, settings and markets from Airtable.
// Falls back to data/sample.json when no AIRTABLE_TOKEN is set (local preview).
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appPoEgYaSjA1tpJg';
const TOKEN = process.env.AIRTABLE_TOKEN;
const TABLES = { listings: 'Listings', settings: 'Settings', markets: 'Markets' };

async function airtableAll(table) {
  const out = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) throw new Error(`Airtable ${table}: ${res.status} ${await res.text()}`);
    const json = await res.json();
    out.push(...json.records.map(r => ({ id: r.id, ...r.fields })));
    offset = json.offset;
  } while (offset);
  return out;
}

export async function loadData() {
  if (!TOKEN) {
    console.log('No AIRTABLE_TOKEN set: building from data/sample.json');
    const raw = await fs.readFile(path.resolve('data/sample.json'), 'utf8');
    return JSON.parse(raw);
  }
  console.log('Fetching from Airtable base', BASE_ID);
  const [listings, settings, markets] = await Promise.all([
    airtableAll(TABLES.listings), airtableAll(TABLES.settings), airtableAll(TABLES.markets),
  ]);
  const data = { listings, settings, markets, fetchedAt: new Date().toISOString() };
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile('data/last-fetch.json', JSON.stringify(data, null, 2));
  return data;
}

// Airtable attachment URLs expire after a couple of hours, so photos are
// copied into the site at build time.
// When the `sharp` package is installed (the GitHub build installs it) each photo is also
// turned the right way up, shrunk to at most MAX_PX on its longest side and saved as a JPEG,
// so a 30 MB phone photo doesn't slow the site down. Without sharp, photos are copied as they are.
const MAX_PX = 1600;
const TINY_PX = 400; // photos smaller than this on their short side go to the back of the queue
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.log('sharp not installed: photos copied at original size'); }

async function prepare(buf, p) {
  if (!sharp) return null;
  try {
    const r = await sharp(buf).rotate().resize({ width: MAX_PX, height: MAX_PX, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    return { data: r.data, width: r.info.width, height: r.info.height };
  } catch (e) {
    console.warn(`Photo not resized (${p.filename || 'unnamed'}): ${e.message}`);
    return null;
  }
}
export async function downloadAttachments(listings, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  for (const l of listings) {
    l.photoFiles = [];
    const photos = Array.isArray(l.Photos) ? l.Photos.slice(0, 5) : [];
    for (const [i, p] of photos.entries()) {
      if (!p.url) continue;
      const ext = (p.type || '').includes('png') ? 'png' : (p.type || '').includes('webp') ? 'webp' : 'jpg';
      try {
        const res = await fetch(p.url);
        if (!res.ok) throw new Error(res.status);
        const original = Buffer.from(await res.arrayBuffer());
        const small = await prepare(original, p);
        const file = `${l.id}-${i + 1}.${small ? 'jpg' : ext}`;
        await fs.writeFile(path.join(outDir, file), small ? small.data : original);
        l.photoFiles.push({ file, width: small ? small.width : p.width, height: small ? small.height : p.height });
      } catch (e) {
        console.warn(`Photo skipped for ${l['Business name']}: ${e.message}`);
      }
    }
    // A very small photo looks blurry as the main picture, so bigger ones go first (order otherwise kept).
    const tiny = f => Math.min(f.width || 0, f.height || 0) < TINY_PX;
    if (l.photoFiles.some(f => !tiny(f))) l.photoFiles = [...l.photoFiles.filter(f => !tiny(f)), ...l.photoFiles.filter(tiny)];
    const logo = Array.isArray(l.Logo) && l.Logo[0];
    if (logo?.url) {
      const file = `${l.id}-logo.png`;
      try {
        const res = await fetch(logo.url);
        if (res.ok) { await fs.writeFile(path.join(outDir, file), Buffer.from(await res.arrayBuffer())); l.logoFile = file; }
      } catch { /* optional */ }
    }
  }
}
