#!/usr/bin/env node
// Refresh the Vendée Arctique fleet from the official Geovoile tracker.
// Drives the Geovoile viewer in a headless Chrome (its engine decodes the
// proprietary track data), samples every boat's position across the race
// timeline, and writes va-fleet.json into dist/ and project/.
//
// Usage:  node tools/refresh-fleet.mjs
// Used automatically by "Lancer Vendée Arctique.command" at startup.

import puppeteer from 'puppeteer-core';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const VIEWER = 'https://vendeearctique.geovoile.com/2026/viewer/';
const STEP = 300; // seconds between samples (5 min)

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,   // CI : chemin fourni par setup-chrome
  process.env.CHROME_PATH,                 // override manuel éventuel
  // macOS (poste local)
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  // Linux (GitHub Actions / serveur)
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);
const chromePath = CHROME_CANDIDATES.find(p => existsSync(p));
if (!chromePath) { console.error('[refresh-fleet] Chrome introuvable.'); process.exit(2); }

const log = (...a) => console.log('[refresh-fleet]', ...a);

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

try {
  const page = await browser.newPage();
  log('Ouverture de la carto Geovoile…');
  await page.goto(VIEWER, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait until the Geovoile engine has loaded + decoded the fleet/timeline.
  await page.waitForFunction(() => {
    const t = window.tracker;
    return t && t._boats && t._boats.length &&
           t.timeline && Number.isFinite(t.timeline._timeStart) &&
           Number.isFinite(t.timeline._timeEnd) &&
           t.timeline._timeEnd > t.timeline._timeStart;
  }, { timeout: 45000, polling: 500 });

  log('Échantillonnage des positions…');
  const data = await page.evaluate((STEP) => {
    const t = window.tracker, tl = t.timeline;
    const t0 = tl._timeStart, t1 = tl._timeEnd;
    const boats = t._boats.map(b => ({
      id: b.id, name: b.name, color: b.mainColor || b.trackColor || 'cccccc',
      sailor: (b.sailors && b.sailors[0])
        ? (b.sailors[0].shortName ||
           ((b.sailors[0].fname || '') + ' ' + (b.sailors[0].lname || '')).trim())
        : '',
      lat: [], lng: [],
    }));
    for (let tc = t0; tc <= t1; tc += STEP) {
      tl.moveTo(tc);
      for (let i = 0; i < t._boats.length; i++) {
        const b = t._boats[i];
        boats[i].lat.push(+b.lat.toFixed(4));
        boats[i].lng.push(+b.lng.toFixed(4));
      }
    }
    return { source: 'geovoile vendeearctique 2026', t0, t1, step: STEP,
             n: boats[0].lat.length, boats };
  }, STEP);

  if (!data.boats || !data.boats.length || !data.boats[0].lat.length) {
    throw new Error('Aucune donnée échantillonnée.');
  }
  data.fetchedAt = Date.now();

  const json = JSON.stringify(data);
  for (const dir of ['dist', 'project']) {
    try { writeFileSync(join(ROOT, dir, 'va-fleet.json'), json); } catch (e) { /* dir may not exist */ }
  }
  const endUtc = new Date(data.t1 * 1000).toISOString().slice(11, 16);
  log(`OK — ${data.boats.length} bateaux, ${data.n} points/bateau, relevé jusqu'à ${endUtc} UTC.`);
} catch (e) {
  console.error('[refresh-fleet] Échec :', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
