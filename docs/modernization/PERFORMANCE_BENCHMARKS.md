# Performance and validation

## Method and limits

Windows, Node 22.14.0, headless Edge, 1440 × 960, DPR 1. Renderer: ANGLE / NVIDIA GeForce RTX 3060 Laptop GPU / D3D11; Three r186. One local hardware sample, not cross-device certification. Four matching cameras, fixed random seed/date, clear daylight, 20 warm-up and 120 measured frames per view. Counters include shadow and outline passes (`renderer.info.autoReset=false`, reset once per complete frame).

This is the static real office builder, without animated workers or network traffic. The roughly 75 FPS result appears refresh-limited. CPU submission time is not GPU time. Texture/geometry counts are not allocated bytes. Readiness timings include development-server/cache variation and are not a cold-load benchmark. No performance improvement or whole-app 60 FPS guarantee is claimed. Real meetings, many active workers, moving cameras and long-session memory recovery still require measurements.

## Matching before/after measurements

| View | FPS before → after | Frame p95 ms | CPU submit p95 ms | Draw calls | Rendered triangles |
| --- | --- | --- | --- | --- | --- |
| Workstation | 75.00 → 75.00 | 13.5 → 13.5 | 12.6 → 13.4 | 2,587 → 2,539 | 427,781 → 465,313 |
| Overview | 75.00 → 75.00 | 13.5 → 13.5 | 10.1 → 11.5 | 2,272 → 2,224 | 300,523 → 338,055 |
| Lounge | 75.00 → 75.00 | 13.4 → 13.4 | 7.6 → 7.5 | 1,297 → 1,289 | 239,377 → 259,249 |
| Meeting | 75.01 → 75.00 | 13.5 → 13.5 | 9.5 → 10.7 | 1,630 → 1,622 | 325,357 → 345,229 |

Workstation geometry count: 891 → 877; textures: 41 → 44. The 246,308-byte asset contains 11,046 triangles. Higher triangle cost includes two instances and shadow passes; fewer draw calls do not imply faster rendering. The local PBR pieces disable toon outlines and combine geometry by material, while the rest of the scene retains its rendering. See [raw baseline metrics](evidence/metrics-before.json) and [raw after metrics](evidence/metrics-after.json).

## Test results

- `npm run typecheck`: passes.
- `npm run build`: passes for client and server; existing large-chunk/build-timing warnings remain.
- Focused model, display-state, registry, `/lite` dependency and source-size checks: **30/30 pass**.
- Actual local browser: login, WebSocket welcome, real CMD shell creation, standalone echo output through PTY/screen events, terminal opening/hiding, shell removal, meeting controls opening/Escape closing, and `/lite`: **pass**, zero page errors. No paid AI worker or genuine meeting was executed.
- Missing-model browser test: new GLB request deliberately aborted; original desk anchors remain intact and office renders, zero page errors. Expected failed-download console warning is not a successful-download claim.
- Reconnect behavior is covered by the display-state unit test, not a full network-restart end-to-end test.

The normal `npm test` was run but hangs in existing Windows process fixtures. A bounded diagnostic runner executes every test file using the same Node imports, with four concurrent processes and a 60-second per-file deadline. Timeouts remain failures; this is not a substitute for a green standard suite.

| Compared run | Files | Passing files | Reported passing tests | Reported failing tests | Timeout |
| --- | --- | --- | --- | --- | --- |
| Clean origin/main, 852e2ab | 82 | 74 | 548 | 34 | workers.test.ts |
| Visual increment, before added reconnect unit test | 83 | 76 | 553 | 31 | workers.test.ts |

Failing files in both runs: `clone` (6), `docs` (1), `dsh` (17), `install` (1), `maps` (3), `repos` (4 baseline / 3 after), plus the worker timeout. Baseline `client-registry` failed twice due to Windows path separators; normalization fixes those checks. Repository-test count variance is not attributed to this visual change. The added reconnect unit test subsequently passed within the 30-test focused run. Raw [baseline](evidence/tests-before.json) and [after](evidence/tests-after.json) summaries retain per-file outcomes; logs are local in `artifacts/modernization/tests-*`.

## Reproduction

From the feature checkout:

```sh
npm ci
npm run typecheck
npm test
npm run build
node --import=tsx --import=#tests/css --test tests/headquarters-state.test.ts tests/headquarters-model.test.ts tests/client-registry.test.ts tests/client-structure.test.ts tests/size.test.ts
```

Start `npx vite --host 127.0.0.1` in one terminal. For the **isolated local verification project**, start `npx tsx src/server/cli.ts . --port 4600 --password dev --no-open` in another. `dev` is only the disposable local check's shared password; do not use this command to expose a public server. On Windows, unset an inherited PowerShell `SHELL` in that terminal first with `Remove-Item Env:SHELL -ErrorAction SilentlyContinue` so the existing launcher uses CMD. This changes only that process environment.

```sh
node scripts/modernization-capture.mjs after
node scripts/modernization-fallback.mjs
node scripts/modernization-smoke.mjs
node scripts/modernization-tests.mjs . artifacts/modernization/tests
```

The smoke script requires an empty test project/floor named `headquarters`; it creates a real shell at desk 1, executes an echo, then sends only that test shell home. Do not run it against an occupied office. Browser scripts default to installed Edge; set `LAB_BROWSER` for another installed Playwright channel. Capture labels do not switch code: a baseline must actually run the base scene, with the same review harness and camera, before capturing `baseline`. All scripts write ignored artifacts; selected public evidence is copied into this document's `evidence` folder.
