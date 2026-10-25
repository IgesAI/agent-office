# Agent state model — existing behavior and next boundary

## Simulation projection

`shared/simulation.ts` now defines a separate read-only Grok Bot projection. Stable provider ID and exact name identify a resident. `unknown`, `idle`, `working`, `waiting`, `error` and `offline` stay distinct. Both snapshot and individual observations expire at 45 seconds; unavailable state cannot become idle. Only a complete successful roster removes identities. Lost/invalid/partial connections retain the known household with unknown activity. A working Bot goes to an activity landmark only when the producer supplies a category. The bridge's `--activity` mode derives it from the live request text and tool names, falling back to the Bot's own title/description, and records which in `activitySource`; Bot names are never classified. Idle reserves a bed. Reservations are stable by ID, finite, and released when a Bot leaves.

Without `--activity` the optional unofficial bridge provides identity and role only and emits `unknown`. With it, state follows observed transcript traffic: a request or tool step is `working` for two minutes, a Bot reply settles within 30 seconds, a failed turn is `error` for a minute, and a watched but quiet Bot is `idle`. History seeds the last task but never makes a Bot look busy. The browser's locomotion and poses are cosmetic. Current bridge and future activity boundaries are documented in [the Grok Bot guide](../grok-bot.md). The original worker model below remains separate and unchanged.

## Original workstation increment

No authoritative execution-state changes in this increment.

Existing WorkerInfo has a worker ID, provider/model/effort, optional provider session ID, desk ID, name/color, task/prompt, worktree/PR data, creation/waiting timestamps, status and optional usage. A process may exit while its session remains resumable. An independent persistent person/profile ID does not yet exist for workers.

Observed mappings to preserve:

- starting → starting; idle → idle; working → working.
- needs_input → awaiting_input; done → completed **turn**, not proof the whole assigned project succeeded.
- offline → offline/restored; exited → process ended, with exitCode inspected before inferring success/failure.
- meeting is a workflow association (`meeting` ID), not a replacement for permission or worker state.
- queued belongs to the task queue, not an invented state on a running process.
- disconnected describes transport observability. Unknown is the honest fallback when data is unavailable. Neither should become idle based on elapsed silence.

The presentation consumes store events after authoritative updates. Purely cosmetic sleep/gesture is separate from work state; the lab must identify simulated poses. Do not infer thinking, tokens or cost without provider evidence. A future state envelope should carry source/session, observedAt and monotonic revision, with snapshot reconciliation on reconnect; that protocol migration is not implemented here.

Future persistent identity should link an appearance/workstation profile to successive worker/session IDs without moving provider credentials into browser state. Define retention and migration before introducing a new ID or database.
