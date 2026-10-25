# Agent state model — existing behavior and next boundary

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
