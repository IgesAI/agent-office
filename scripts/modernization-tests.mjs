// Bounded diagnostic runner for the existing suite on hosts with hanging process fixtures.
// Does not skip tests or turn timeouts into passes. Equivalent Node imports to npm test.
import { spawn, execFileSync } from 'node:child_process';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(process.argv[2] ?? '.');
const out = path.resolve(process.argv[3] ?? 'artifacts/modernization/tests');
await mkdir(out, { recursive: true });
const files = (await readdir(path.join(root, 'tests'))).filter(f => f.endsWith('.test.ts'));
const results = [];
async function run(file) {
  const start = Date.now();
  const child = spawn(process.execPath, ['--import', 'tsx', '--import=#tests/css', '--test', '--test-force-exit', `tests/${file}`], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', timedOut = false;
  child.stdout.on('data', b => output += b);
  child.stderr.on('data', b => output += b);
  const timer = setTimeout(() => {
    timedOut = true;
    if (process.platform === 'win32') { try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); } catch {} }
    else child.kill('SIGKILL');
  }, 60000);
  const code = await new Promise(resolve => { child.on('error', e => { output += e.message; resolve(-1); }); child.on('close', resolve); });
  clearTimeout(timer);
  await writeFile(path.join(out, `${file}.log`), output);
  const count = key => Number(output.match(new RegExp(`# ${key} (\\d+)`))?.[1] ?? 0);
  const result = { file, code, timedOut, ms: Date.now() - start, tests: count('tests'), pass: count('pass'), fail: count('fail'), cancelled: count('cancelled') };
  results.push(result);
  if (code || timedOut) console.log(JSON.stringify(result));
}
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => { while (next < files.length) await run(files[next++]); }));
results.sort((a, b) => a.file.localeCompare(b.file));
await writeFile(path.join(out, 'summary.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ files: results.length, passedFiles: results.filter(r => !r.code && !r.timedOut).length,
  failedFiles: results.filter(r => r.code || r.timedOut).length, tests: results.reduce((n, r) => n + r.tests, 0),
  pass: results.reduce((n, r) => n + r.pass, 0), fail: results.reduce((n, r) => n + r.fail, 0) }));
if (results.some(r => r.code || r.timedOut)) process.exitCode = 1;
