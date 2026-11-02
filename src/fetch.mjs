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
export async function downloadAttachments(listings, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  for (const l of listings) {
    l.photoFiles = [];
    const photos = Array.isArray(l.Photos) ? l.Photos.slice(0, 5) : [];
    for (const [i, p] of photos.entries()) {
      if (!p.url) continue;
      const ext = (p.type || '').includes('png') ? 'png' : (p.type || '').includes('webp') ? 'webp' : 'jpg';
      const file = `${l.id}-${i + 1}.${ext}`;
      try {
        const res = await fetch(p.url);
        if (!res.ok) throw new Error(res.status);
        await fs.writeFile(path.join(outDir, file), Buffer.from(await res.arrayBuffer()));
        l.photoFiles.push({ file, width: p.width, height: p.height });
      } catch (e) {
        console.warn(`Photo skipped for ${l['Business name']}: ${e.message}`);
      }
    }
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
