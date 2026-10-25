# Integration compatibility

## Simulation increment

The new default page reads an authenticated, account-scoped `/api/simulation` projection. It does not start workers or replace the worker store, WebSocket protocol, hooks, task queue or CLI providers. Classic office remains at `/office.html`; safe login destinations preserve that view and `/lite`. The overhead page uses no pointer lock. Its dialogs return focus to the canvas with a free pointer, following the user's new interaction direction.

An optional **unofficial** Grok Bot roster bridge is supplied for source checkouts, disabled unless explicitly invoked. It uses a pinned external SDK and fresh login, a five-endpoint read-only network allowlist, in-memory tokens, scoped snapshots and bounded responses. No desktop credentials, mutations or tasks are read/executed. Transcripts are read only with the explicit `--activity` flag, and only a 140-character task line, category and state leave the bridge. See [setup and limitations](../grok-bot.md). The user chose to leave this integration disconnected; no live provider sign-in was attempted.

## Earlier workstation slice

This change uses existing client/office extension seams. It adds no provider or backend command.

Retain Claude, Codex, OpenCode, Grok CLI, Muse, DeepSeek Harness ACP, Pi, Cursor and custom CLI adapters as found in `server/providers`. Their hooks/session mechanisms differ; consult `docs/agents.md` rather than assuming equal observability. Grok Bot identity, APIs, lifecycle, permission model and event streams have not been verified. No Bot integration is shipped.

Retain authenticated HTTP routes, session/origin-checked WebSockets, loopback hooks with per-worker tokens, account-scoped configuration, worktree safety checks and DOM sanitization. No credentials belong in a GLB, model manifest, screenshot, client feature or URL.

Compatibility boundaries for the workstation slice: same desk IDs and colliders; same seat/laptop/stage/vacancy objects; same rotating chair group; existing Worker and Laptop classes; same floor/map visibility and meeting workflow. `/lite` must not import the new 3D code. Missing model falls back to the current desk. No task is delayed by a visual asset.

Runtime testing of a real paid CLI and a genuine multi-agent meeting remains outstanding. Passing mock/provider unit tests or shell smoke tests must not be reported as that validation.

Verified locally with the real server and browser: shared-password login, authenticated WebSocket welcome, shell creation at desk 1, `echo HQ_VISUAL_SMOKE` executed by a real Windows CMD PTY and received as a standalone output row, opening/hiding its terminal, worker removal, opening/closing meeting controls, and `/lite` connection. No browser page errors were recorded. No real meeting or paid provider was started. A separate browser check blocks the new GLB download to verify fallback; a state-transition unit test checks that cached output is hidden through reconnect until reconciliation.

Windows environment caveat: an inherited `SHELL=powershell.exe` makes the existing shell launcher pass Unix `-l` to PowerShell, causing it to exit. The verification server was started with `SHELL` unset in that process so its existing Windows default selects CMD. No backend or machine-wide environment setting was changed. This pre-existing launcher issue remains outside the visual increment.
