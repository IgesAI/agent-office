# Bot House and Grok Bot

The default `/` page is a bird's-eye house. Drag to pan, scroll to zoom, rotate with the toolbar or Q/E, and reset with R. Select Bots in the house or household list. Place buttons focus a room and show how many Bots are there. Working Bots carry a speech bubble with their task, the room they work in glows, and **Around the house** lists changes since the page opened. Pause stops cosmetic animation; it does not pause remote work. Reduced-motion preferences start the scene paused. The original office remains at `/office.html`; `/lite` still provides its 2D controls.

No Bots are invented at startup. Only identities in a connected roster become residents. A complete roster adds, renames and removes them by stable ID, preserving exact names even when two Bots share a name. Disconnection retains the last household and clears activity; only a successful complete roster confirms deletion.

## Spaces

| Place | Verified activity represented |
| --- | --- |
| Build studio | Coding, debugging and computer work |
| Kitchen | Recipes, cooking instructions and meal planning |
| Rest nook | Explicit idle state, sleeping in a bed |
| Library | Writing, reading and content work |
| Atlas corner | Travel research and itineraries |
| Planning board | Research, analysis and operations |
| Common room | Coordination and collaboration |

These cover the user's requested activities and examples in [Grok Bot's use-case guide](https://docs.x.ai/grok-bot/use-cases). They are not a measured ranking of trending Bots. Station seating is limited; additional residents wait in the clear aisle instead of overlapping. Ambient wandering is decorative and does not imply a remote action.

## Connection status and limits

Grok Bot is the persistent-Bot product, separate from the office's existing Grok coding CLI provider. The official [team documentation](https://docs.x.ai/grok-bot/teams-and-enterprises) describes its hosted computers and enterprise controls. The reviewed public documentation did not establish a supported personal roster plus normalized task-lifecycle API for this integration.

The optional adapter uses the **unofficial**, MIT-licensed [RongleCat/grok-bot-sdk](https://github.com/RongleCat/grok-bot-sdk) pinned to commit `0b499a88a48c3b038010758fb6cd4d73ed4e022a`. Its read-only `listBots` gives names, IDs and each Bot's own title/description (shown as its role), but no working/idle state. Without `--activity`, Bots show **Activity unavailable** and wander.

### Task awareness (`--activity`)

With `--activity`, the bridge also opens the SDK's read-only transcript watch (`WatchGrokBotTranscripts`) for each Bot's session, after reading its last 12 rows (`ListGrokBotTranscriptEntries`) to learn the most recent request. From that traffic it derives:

| Observation | State in the house |
| --- | --- |
| A new request or tool step | **Working** for up to two minutes after the last step |
| The Bot's reply with nothing after it | Settles to **Resting** within 30 seconds |
| A failed turn | **Task error** for one minute |
| Watch connected, nothing happening | **Resting** (bed) |
| Watch not connected | **Activity unavailable** |

History only seeds the last task; it never makes a Bot look busy. The room comes from keywords in the request and the tools it is using (for example “fix the bug” → Build studio, “lasagna recipe” → Kitchen, “compare sponsor pricing” → Planning board). If the request does not clearly match, the Bot's own role decides, and the selected-Bot card says so. Requests that match nothing leave a working Bot thinking in the hall. Bot names are never used.

Only the first 140 characters of the latest request, the room, the state and when it began leave the bridge. Transcript bodies, replies and tool output stay in the bridge's memory. The SDK reports text messages without a sender, so when no clear user request is visible the Bot's latest message picks the room (its text is not shown). The first time it sees each transcript entry kind, the bridge prints that kind name (never content), which helps tune the mapping against the real protocol.

## Optional local bridge

This adapter speaks a private desktop protocol and may stop working without notice. Review the pinned source before signing in. It is optional: the house and Classic office work without it.

From a source checkout:

```sh
git clone --no-checkout https://github.com/RongleCat/grok-bot-sdk.git artifacts/grok-bot-sdk-review
git -C artifacts/grok-bot-sdk-review checkout --detach 0b499a88a48c3b038010758fb6cd4d73ed4e022a
node scripts/grok-bot-bridge.mjs --experimental --login --activity
```

Leave out `--activity` for a names-only roster. The bridge checks the exact commit and a clean checkout before importing it. It prints a fresh sign-in URL on `https://cursor.com/loginDeepControl` (the SDK's Grok Bot login flow). Open that URL yourself and approve sign-in only if you want this experimental connection. Tokens remain in process memory; no desktop/keychain/session files are read and no tokens are saved. Restarting requires signing in again. Keep the bridge running; Ctrl+C disconnects it. This is a source-checkout tool, not included in the npm runtime package.

Start the office against the same checkout (`npx tsx src/server/cli.ts . --port 4600 --password dev --no-open`) and Vite (`npx vite --host 127.0.0.1`). Open `http://127.0.0.1:5173` and use the local office password. The bridge's default data directory is `.agent-office` relative to its working directory. If the server uses another office home, pass its exact data path with `--data-dir PATH`.

Shared-password sessions read the `shared` scope; everyone with that password can see those Bot names. For an office with individual accounts, pass `--account ID` using the office account's ID (not its display name or Grok identity). The scope is SHA-256 of that ID. The authenticated route only reads that account's scope, with no fallback to the shared roster. The operator is responsible for pairing the right Grok sign-in with the right local account. Keep the local office loopback-only unless intentionally sharing it.

Only `/auth/poll`, `DashboardService/GetMe`, `GrokBotService/ListGrokBotAgents`, `ListGrokBotTranscriptEntries` and `WatchGrokBotTranscripts` at `https://api2.cursor.sh` are permitted by the bridge's fetch boundary; the last two are used only with `--activity`. Redirects, mutation RPCs and oversized responses are rejected (1 MiB per reply, 16 MiB per watch connection, after which it reconnects and resumes). No Bot creation, message sending, remote tools or execution commands are used. The roster excludes team-owned Bots. Partial/truncated rosters are treated as failures. Two bridges cannot write the same scope simultaneously. If a process crashes, verify the PID in `bridge.lock` is no longer running before removing only that lock file and restarting.

## Activity boundary for future adapters

`GET /api/simulation` requires an existing office session. It serves a whitelisted projection of `<dataDir>/grok-bot/<scope>/snapshot.json`; it exposes no write endpoint. Writes are local, atomic file replacements by the trusted adapter. Snapshot version is 1, source is `grok-bot`, timestamps are Unix milliseconds, and the roster is limited to 200 identities and 1 MiB. Unknown fields are discarded. Both roster and per-Bot observations expire after 45 seconds.

Each Bot carries `id`, exact `name`, `color`, `observedAt`, and state `unknown | idle | working | waiting | error | offline`. It may also carry `role`, a short `task`, `activity` (`coding | cooking | travel | writing | analysis | meeting | rest | general`), `activitySource` (`task | role`) and `since` (when the state began). Working without a category stays in the common aisle. Idle uses a bed. Future producers must preserve original provider IDs, timestamps and lifecycle semantics; do not fabricate snapshots to make the live house appear busy.

## Verification

Run `npm run typecheck`, `npm run build`, and the repository tests. With an isolated local server and no existing shared bridge/snapshot, `node scripts/simulation-smoke.mjs` verifies login, the authenticated API, real file-to-browser delivery, rename/removal, stale/error recovery, modals, mobile layout and Classic office. Its synthetic snapshot is marked in screenshots and removed in `finally`. The script refuses to overwrite any existing snapshot or active bridge lock. Use `SIMULATION_URL` to test the built server at `http://127.0.0.1:4600` as well as Vite.
