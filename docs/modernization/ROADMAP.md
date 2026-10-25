# Modernization roadmap

## Direction update: bird's-eye simulation

The user has prioritized a Sims-style overhead house over first-person exploration. The next delivered increment is the new default simulation surface, seven activity places, named residents, deterministic station reservations, ambient wandering and an optional read-only Grok Bot roster adapter. Classic office remains available. See [the simulation report](SIMULATION_REPORT.md) and [connection limits](../grok-bot.md).

The next integration gate is **verified live Grok Bot activity**, not more decorative rooms. The unofficial roster has no normalized working/idle/task field. Authentication with the user's account and lifecycle mapping remain unverified; synthetic animation checks are labeled separately. Follow that with spatial crowding/pathfinding for larger teams, richer task-specific gestures, quality settings and broader accessibility/performance checks.

The original plan below is retained as history; the management camera and Grok Bot investigation have been brought forward by the user's direction.

## Original sequence

1. Phase 0: source/remotes/architecture/dependency audit, baseline build and browser evidence. Windows test failures remain explicitly tracked.
2. First Phase 1 increment: two modeled workstations in the real office, local materials, nonfatal asset fallback, stable anchors, before/after capture and measured rendering cost. This is a reviewable beginning, not an approved premium room.
3. Complete Phase 1: coherent surrounding architecture/floor/window materials, collaboration nook, lighting, two refined compatible characters, three quality levels, full-room acceptance and real provider smoke test.
4. Phase 2: persistent visual profile and skeletal animation compatibility; work-state mapping, sitting/waking and recovery tests.
5. Phase 3: optional management camera using activity/focus registries, selection and existing action panels.
6. Phase 4: meeting room visuals driven by the existing meeting service.
7. Phase 5: independently persistent identities, workstation/department organization and explicit migration.
8. Phase 6: provider capability reconciliation and separate Grok Bot research.
9. Phase 7: expansion/WebGPU experiments only after visual and workflow gates pass.
10. Phase 8: accessibility, security review, restart recovery, license audit, performance and deployment documentation.

Do not expand the office until the first room is approved. No release/deployment/merge automation changes are part of this increment.
