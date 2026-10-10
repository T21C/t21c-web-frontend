# TUFHelperLite WebSocket integration

`application/createHelperSession.js` owns the download-library state and named
user actions. Its injected message-session port owns `open(receive, state)`,
`send(name, payload)` and `close()`. It imports no React or IPC SDK code.

`adapters/createWebSocketPort.js` translates that port to the canonical
ADOFAI-IPC 1.0.0 SDK. `composition.js` wires the production adapter to the
application. `src/hooks/useTufHelperLiteIpc.js` projects application snapshots
through React external-store subscriptions and owns browser UI preferences.

The game sends an initial `snapshot`, then `jobs.changed`, `storage.changed`,
`batch.changed` and `library.changed` whenever state changes. Commands receive
named, correlated events such as `job.started` and `library.page`. Job progress
and completion are observed by job ID; they are never fetched on an interval.
A command is never replayed after reconnecting. A fresh snapshot replaces state
and restores bounded subscriptions.

Visible cards register their level IDs with the application. Those interests
are counted and coalesced into `library.watch` messages with at most 500 IDs.
The game sends `library.membership` only to that browser. Library pages retain
opaque cursors and revisions; revision changes refresh visible pages.

Folder picker completion is correlated by operation ID and delivered only to
the selecting peer. Choosing a folder grants a one-time token; the web app
cannot provide arbitrary local paths. Losing a connection rejects pending
commands and observations. Closing a dialog aborts its job observers.

The SDK is checked in as raw source under `vendor/adofai-ipc`, with its license,
source revision and content hashes. It is synchronized from the canonical
`adofai-ipc` repository with `scripts/run.sh client-sync <vendor-directory>`.
No npm registry package or sibling-directory symlink is required.

Discovery remains active when the game is absent or application readiness times
out. Listeners are installed before discovery, and only the mod's fresh snapshot
restores application availability. Browser resume checks retained connections;
the vendored SDK handles heartbeat recovery and Chromium handshake delays.
All build modes verify the SDK's source revision, file inventory and content
hashes before bundling; `npm run sdk:check` runs the same check explicitly.

Validation:

- `npm run lint`
- `npm run test:ipc`
- `npm run build:staging`

The application tests inject a deterministic message port and cover correlated
results, terminal-state ordering, reconnect without command replay, discarded
old connections, early picker completion, subscription disposal and domain
rejections.
