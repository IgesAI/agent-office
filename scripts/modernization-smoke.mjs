// Browser verification of the real local service. Never starts a paid agent or writes credentials.
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = 'artifacts/modernization/after';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.LAB_BROWSER ?? 'msedge', headless: true });
const errors = [], messages = new Set();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addInitScript(() => {
    localStorage.setItem('agent-office.profile', JSON.stringify({ name: 'Visual review', color: '#527a70', look: { skin: 2, hair: 1, style: 2 } }));
    localStorage.setItem('agent-office.settings', JSON.stringify({ muted: true, musicMuted: true, notify: false, view: 'first' }));
    localStorage.setItem('agent-office.spot', JSON.stringify({ floor: 'headquarters', name: 'headquarters', map: 'office', x: -11.6, y: 0, z: -6.4, facing: 0 }));
    localStorage.setItem('agent-office.floor', 'headquarters');
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('websocket', ws => ws.on('framereceived', e => { try { const t = JSON.parse(e.payload.toString()).t; if (typeof t === 'string') messages.add(t); } catch {} }));
  await page.goto('http://127.0.0.1:5173/login');
  await page.locator('#password').fill('dev');
  const login = page.waitForResponse(r => r.url().endsWith('/api/login') && r.request().method() === 'POST');
  await page.locator('#submit').click();
  const response = await login;
  if (!response.ok()) throw new Error(`Local login failed: ${response.status()} ${await response.text()}`);
  await page.waitForURL('http://127.0.0.1:5173/');
  await page.waitForFunction(() => document.querySelector('#loading')?.classList.contains('hidden') || !document.querySelector('#loading'), null, { timeout: 45000 });
  // Existing store is read for verification only. No synthetic execution messages are sent.
  await page.waitForFunction(async () => (await import('/state/index.ts')).store.you !== '');
  const state = await page.evaluate(async () => {
    const { store } = await import('/state/index.ts');
    return { floor: store.floor, floors: store.floors.length, workers: store.workers.size, admin: store.me.admin };
  });
  assert.equal(state.floor, 'headquarters', 'requires the isolated headquarters verification floor');
  assert.equal(state.workers, 0, 'refusing to run the shell check against an occupied floor');
  await page.screenshot({ path: `${out}/live-office.png` });
  await page.keyboard.press('b');
  await page.waitForFunction(async () => [...(await import('/state/index.ts')).store.workers.values()].some(w => w.kind === 'shell' && w.deskId === 'desk-1'), null, { timeout: 20000 });
  await page.keyboard.press('e');
  const terminal = page.locator('.xterm-helper-textarea');
  await terminal.waitFor({ state: 'attached' });
  await terminal.focus();
  await page.keyboard.type('echo HQ_VISUAL_SMOKE');
  await page.keyboard.press('Enter');
  await page.waitForFunction(async () => {
    const { store } = await import('/state/index.ts');
    const shell = [...store.workers.values()].find(w => w.kind === 'shell' && w.deskId === 'desk-1');
    return shell && shell.status !== 'exited' && store.screens.get(shell.id)?.lines.some(row => row.map(r => r[0]).join('').trim() === 'HQ_VISUAL_SMOKE');
  }, null, { timeout: 20000 });
  await page.screenshot({ path: `${out}/live-terminal.png` });
  await page.getByRole('button', { name: 'Hide terminal', exact: true }).first().click();
  await page.waitForFunction(() => !document.querySelector('.modal.term'));
  await page.screenshot({ path: `${out}/live-monitor.png` });
  await page.keyboard.press('x');
  await page.getByRole('button', { name: 'Send home', exact: true }).click();
  await page.waitForFunction(async () => (await import('/state/index.ts')).store.workers.size === 0);
  await page.keyboard.press('Tab');
  await page.getByRole('menuitem').filter({ hasText: 'Meeting' }).click();
  await page.getByRole('dialog').waitFor();
  await page.screenshot({ path: `${out}/meeting-controls.png` });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  console.log(JSON.stringify({ state, shellTerminal: 'echo marker received through real PTY/screen events; test shell removed' }));
  await page.goto('http://127.0.0.1:5173/lite');
  await page.waitForFunction(async () => (await import('/state/index.ts')).store.you !== '');
  await page.screenshot({ path: `${out}/lite.png` });
  await writeFile(`${out}/smoke.json`, JSON.stringify({ state, shellTerminal: true, testShellRemoved: true, meetingControls: true, messages: [...messages], errors, lite: await page.title() }, null, 2));
  if (errors.length || !messages.has('welcome')) process.exitCode = 1;
} finally { await browser.close(); }
