# TUFHelperLite IPC integration

`application/createHelperSession.js` owns the download-library state and named
user actions. Its injected message-session port owns `open(receive, state)`,
`send(name, payload)` and `close()`. It imports no React or IPC SDK code.

`adapters/createIpcPort.js` translates that port to the generated
`TufHelperContract` and the ADOFAI-IPC 2.0.0 app API. `composition.js` wires the production adapter to the
application. `src/hooks/useTufHelperLiteIpc.js` projects application snapshots
through React external-store subscriptions and owns browser UI preferences.

The mod calls `snapshot`, then `jobsChanged`, `storageChanged`,
`batchChanged` and `libraryChanged` when state changes. The adapter translates
generated method results into the application's existing correlated messages. Job progress
and completion are observed by job ID; they are never fetched on an interval.
A command is never replayed after reconnecting. A fresh snapshot replaces state
and restores bounded subscriptions.

Visible cards register their level IDs with the application. Those interests
are counted and coalesced into `watchLibrary({ ids })` calls with at most 500 IDs.
The mod calls `membershipChanged` only on the registered app that owns those interests. Library pages retain
opaque cursors and revisions; revision changes refresh visible pages.

Folder picker completion is correlated by operation ID and delivered only to
the selecting app session. Choosing a folder grants a one-time token; the web app
cannot provide arbitrary local paths. Losing a connection rejects pending
commands and observations. Closing a dialog aborts its job observers.

The SDK is fixed under `vendor/adofai-ipc`; the generated contract package is
fixed under `vendor/tufhelper-ipc`. Both are local package dependencies.
The contract source is maintained in the mod repository's `ipc/main.tsp`.
After changing it, generate C# in the mod repository and copy the generated
TypeScript package to this repository. Its contract hash must match the mod.
Building this repository does not read a sibling checkout or run TypeSpec.

Discovery remains active when the game is absent or application readiness times
out. `registerApp().use()` installs handlers and registers automatically.
`channel.onStatus` reports registered readiness and clears the snapshot gate
when availability changes. Only a fresh snapshot restores application availability.
Reconnection keeps the app ID and creates a new session ID; stale callback replies
and pending command results cannot update the new session. Browser resume calls
`app.checkConnection()`; the SDK owns liveness and recovery.
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
