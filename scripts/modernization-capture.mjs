// Run against Vite: node scripts/modernization-capture.mjs baseline|after
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const label = process.argv[2];
if (!['baseline', 'after'].includes(label)) throw new Error('Expected baseline or after');
const out = `artifacts/modernization/${label}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.LAB_BROWSER ?? 'msedge', headless: true });
const results = [];
try {
  for (const view of ['workstation', 'overview', 'lounge', 'meeting']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    // Repeatable cosmetic randomness/time in the isolated review page, never in the live app.
    await page.addInitScript(() => {
      let seed = 12345;
      Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      Date.now = () => 1792843200000;
    });
    const start = Date.now();
    await page.goto(`http://127.0.0.1:5173/lab/headquarters.html?view=${view}`);
    await page.waitForFunction(() => window.__ready);
    const readyMs = Date.now() - start;
    const facts = await page.evaluate(() => window.__ready);
    const metrics = await page.evaluate(() => window.__benchmark());
    await page.screenshot({ path: `${out}/${view}.png` });
    results.push({ view, readyMs, facts, metrics, errors });
    console.log(JSON.stringify(results.at(-1)));
    await page.close();
  }
  await writeFile(`${out}/metrics.json`, JSON.stringify({ viewport: [1440, 960], dpr: 1, results }, null, 2));
  if (results.some(r => r.errors.length)) process.exitCode = 1;
} finally { await browser.close(); }
