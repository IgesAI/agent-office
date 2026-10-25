# Architecture and compatibility audit

Audit date: 2026-10-24 (America/New_York). Base: `852e2ab28c4f3f31bffdf4b20353bd119c9d3270` (`Keep outdoor fog out of the office interior (#320)`).

## Provenance and workflow

The supplied `agent-office-main/agent-office-main` was a ZIP extraction without Git metadata. It remains untouched. The user subsequently forked the project. GitHub's connected account verified ownership/admin access to **IgesAI/agent-office**. Work now lives in a separate Git worktree, `headquarters`, on `codex/headquarters-visual-foundation`, based on freshly fetched `origin/main`.

- Origin: https://github.com/IgesAI/agent-office.git
- Upstream reference: https://github.com/AgentSystemLabs/agent-office.git
- No upstream publishing or automatic merge is authorized by this work.
- Local Node 22.14.0, npm 11.6.2. The existing npm lockfile is retained.

## 1. Actual architecture

Vite compiles `src/client` into `dist/public`; TypeScript compiles the Node server. The main office is imperative Three.js with DOM UI. React 18 serves the Excalidraw whiteboard, not the 3D renderer. `main.ts` is a composition list; `core/context.ts` provides shared objects through `Ctx`. `core/loop.ts` registers ordered frame phases in `core/registry.ts`. The UI reads the event-driven `state/store.ts`, `state/core.ts` and registered slices.

The Node composition root builds per-floor services, an authenticated HTTP route table, WebSocket handler registry, PTY hosts, worker managers, and loopback hooks. Shared protocol domains and pure layout/navigation/status modules connect both halves. There is no need for a second orchestration service.

## 2. Graphics pipeline

`core/scene.ts` uses WebGLRenderer, MSAA, high-performance preference, sRGB output, device pixel ratio capped at 2, PCF shadows, a 2048-square sun shadow map and a perspective camera (55°). Tone mapping remains the Three.js default (none). OutlineEffect wraps the renderer; view filters also implement gameplay effects. `world/toon.ts` caches three-band MeshToonMaterials. Screens use unlit canvas textures. `Sky` updates light, haze and weather each frame and patches shader chunks for indoor lighting, fog exclusion and precipitation. Changing renderer or global shaders is therefore cross-cutting.

The sun shadow camera spans 64 by 60 metres. Contact detail at a desk is limited by that large coverage. Local PBR geometry is compatible, but must be checked against the existing sky shader and OutlineEffect. Global exposure changes could damage terminal readability and other maps. `fitWindow` resizes both the scene and first-person hands. Shared geometry/materials and model caches are application-lifetime resources; per-worker UI textures have disposal paths.

## 3. Agent execution/status pipeline

Provider adapters (`server/providers`) launch CLI processes through worker services and PTYs; DeepSeek Harness additionally uses ACP. Authenticated loopback hooks, PTY progress and provider events update WorkerInfo. WebSocket messages update the client store before registered feature handlers. `features/workers/views.ts` creates Worker/Laptop views; laptop canvases paint real terminal frames. The authoritative status union is starting, idle, working, needs_input, done, exited, offline. Provider detail and observability differ. Missing telemetry does not establish idleness. A new normalized identity/state model is deferred; see AGENT_STATE_MODEL.md.

## 4. Characters and assets

Humans (`Person`) and bean-shaped workers (`Worker`) are different procedural rigs. Workers use blended poses in `worker-stance.ts` and local gesture/walk/sleep/error logic; they are not interchangeable with a skeletal humanoid. Dogs already use GLB skeletons and clips. A full humanoid replacement must preserve hand/seat pivots, meeting arrivals, departures, costumes and map-specific poses.

`world/models.ts` has GLTFLoader caching, SkeletonUtils cloning, preload progress, and nonfatal missing-model handling. Blender scripts are source; GLBs are committed output. Existing assets include lounge, plants, kitchen and desk props. Runtime paint is by material name. Models use metres, +Y up, +Z forward, with origins and collision proxies specified separately. Preserve this contract for the first workstation asset.

## 5. Camera/input

`player/` owns first-person and orbit/third-person movement, physics and pointer capture. WASD/Shift/Space, mouse drag/wheel and E interactions are working control contracts. `input/focus.ts` mediates modals and mouse-look restoration. Activities can take the camera; view effects affect FOV and rendering. Management camera should be an activity with existing focus handling, not a second input controller. It is not implemented in this increment.

## 6. Meetings, projects and maps

`server/meetings.ts` already implements real multi-agent workflows, role prompts, rounds, outputs, persisted notes, worktrees and completion. Client meeting and workers features present and animate them. Projects remain separate floors with independent workers, boards and queues. The office builder is fixture-based TypeScript; custom JSON can extend castle/station, **not** the default office. A new office finish should use fixtures rather than a misleading JSON map overlay. Preserve multiplayer, voice, shared TV and whiteboard services.

## 7. Registry and structural constraints

New features install once through the composition list. Office fixtures return handles and optional update/setLevel callbacks; the type system ensures every OfficeHandle is provided. InteractKinds are augmented next to their defining feature. Source files are limited to 600 lines, with explicit shrinking ceilings for legacy files. `/lite` must have no transitive imports of the 3D engine. No feature logic belongs in `main.ts`, the protocol aggregator, server root or central store.

## 8. Baseline validation and coverage

82 existing test files cover auth, hooks, providers, tasks, meetings, PTYs, floors, maps, navigation, model contracts, client registries and structural limits. A Playwright-core lab screenshot helper already exists; it does not constitute full application workflow coverage.

- Locked `npm ci` installed dependencies; its prepare build initially failed because Vite inherited `C:/Users/natha/postcss.config.js`, which requires missing Tailwind. A local empty PostCSS plugin list isolates the app's plain CSS. No Tailwind dependency was added.
- `npm run typecheck`: passed before visual edits.
- `npm run build`: passed after that configuration fix.
- `npm test`: baseline has Windows failures. Registry source scanners compare POSIX paths against Windows backslashes; clone/shell fixtures also fail. Sandboxed PTY tests additionally fail or hang. Full results and reproducible logs are recorded in PERFORMANCE_BENCHMARKS.md and the delivery report; do not claim a green suite.
- Vite and the actual server start on loopback. Static office screenshots use the production builder, fixed camera and clear daylight. Browser evidence is stored under `artifacts/modernization`.
- No paid provider execution or genuine meeting output has yet been verified. Shell workflow checks are not proof of an AI integration.

## 9. Retain

Three.js 0.186.1, @types/three 0.186.0, React/ReactDOM 18.3.1, Vite 8.3.1, TypeScript 7.0.2, Playwright-core 1.63.0, existing WebSocket/PTY/xterm stack. These are the lockfile versions, not suggestions to upgrade. Keep the existing npm package manager and registries.

## 10. Dependency decisions

No new runtime dependencies. Blender 5.2 is installed and matches the documented asset toolchain. Reuse GLTFLoader, MeshStandardMaterial and existing model caching. Meshopt/Draco/KTX2 and glTF Transform remain evaluation options; the small untextured workstation asset does not yet justify decoder downloads or a build dependency. Do not add R3F/Drei/Triplex/Theatre to solve a furniture/material problem. See GRAPHICS_PIPELINE.md for official sources and migration tradeoffs.

## 11–13. Compatibility decisions and migration strategy

- **SAFE:** isolated Blender workstation asset and material palette; retain desk IDs, laptop/seat anchors, original collider extents and chair objects. Fall back to existing furniture if the asset is absent.
- **SAFE:** fixed-view browser screenshots and honest GPU/frame measurements; no fabricated execution.
- **SAFE:** project-local PostCSS isolation; no library upgrade.
- **CAUTION:** global tone mapping, ambient occlusion, shadow-budget changes and reflections. First profile a local slice and verify all maps/screens before expanding.
- **CAUTION:** persistent agent identities and state normalization need migration/reconciliation design; WorkerInfo currently combines worker/session/visual properties.
- **CAUTION:** management camera must participate in activity, focus, modal and travel logic.
- **BLOCKED for production replacement:** WebGPU/TSL has no demonstrated parity with OutlineEffect, sky shader injection and gameplay filters. Alternative: retain WebGL; build a separate renderer experiment later.
- **BLOCKED for direct substitution:** skeletal humanoids cannot replace Worker without a rig/animation compatibility layer. Alternative: keep current workers while modeling and validating a compatible rig separately.
- **BLOCKED:** extending the default office by custom JSON is unsupported. Alternative: use the existing fixture plan.
- **BLOCKED:** persistent Grok Bot teammates are not proven by Grok CLI support. Alternative: retain the CLI adapter and separately research Bot APIs.

Implement a limited two-desk visual slice first, verify real seating and terminals, inspect before/after images, then expand the room only after review. Backend rewrite, framework migration, protocol replacement and release-pipeline changes are unnecessary. This audit is an implementation baseline, not certification that the full product roadmap is complete.
