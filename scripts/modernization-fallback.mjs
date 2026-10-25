// Missing cosmetic model must leave the usable original desks in the real office builder.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: process.env.LAB_BROWSER ?? 'msedge', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
  // Vite's ?import&url wrapper is JavaScript; block only the binary download.
  await page.route(url => url.pathname.endsWith('/models/headquarters.glb') && !url.searchParams.has('import') && !url.searchParams.has('url'), route => route.abort());
  await page.goto('http://127.0.0.1:5173/lab/headquarters.html?view=workstation');
  await page.waitForFunction(() => window.__ready);
  const facts = await page.evaluate(() => window.__ready);
  assert.equal(facts.studioScreens, 0);
  assert.equal(facts.deskAnchorsIntact, true);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: 'artifacts/modernization/after/missing-model.png' });
  await writeFile('artifacts/modernization/after/fallback.json', JSON.stringify({ facts, errors }, null, 2));
  console.log('PASS: model download blocked; original office and desk anchors remain usable.');
} finally { await browser.close(); }
