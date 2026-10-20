# TUFHelperLite IPC integration

`application/createHelperSession.js` owns the download-library state and named
user actions. Its injected message-session port owns `open(receive, state)`,
`send(name, payload)` and `close()`. It imports no React or IPC SDK code.

`adapters/createIpcPort.js` translates that port to the generated
`TufHelperContract` and the ADOFAI-IPC 2.1.0 app API. `composition.js` wires the production adapter to the
application. `src/hooks/useTufHelperLiteIpc.js` projects application snapshots
through React external-store subscriptions and owns browser UI preferences.

The mod calls `snapshot`, then `jobsChanged`, `storageChanged`, `settingsChanged`,
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

**TUFHelperLite Settings** contains temporary download mode and storage location.
Its **Manage downloads** action replaces Settings with the library dialog, where
individual saved levels can be deleted. Temporary mode hides the saved-library
and storage controls. `setTempDownloadMode`, `flushTemp` and `deleteLevel` use the
generated contract; settings pushes also update other open apps. The mod owns
filesystem paths and validates deletion and in-use files.

Automatic discovery, game shutdown and reconnection update availability quietly.
A dismissed connection notice stays dismissed for the browser session. API or
contract mismatches use a persistent banner; explicit user action failures retain
their error toast.

The `adofai-ipc` SDK is installed from npm with an exact version and tarball
integrity pinned in `package-lock.json`. The generated contract package remains
fixed under `vendor/tufhelper-ipc` and depends on the same npm SDK version.
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
All build modes verify the SDK's exact npm version and registry integrity, plus
the generated contract's file inventory and content hashes before bundling;
`npm run sdk:check` runs the same check explicitly. The helper downloads remote
chart archives into its game-side library. It currently sends no files to the
browser, so this integration does not create an IPC file download or upload flow.

The level page opens TUFHelperLite Settings. Storage controls live in that
dialog; Manage downloads replaces it with the downloaded-level library.
Settings are supplied by the mod snapshot and `settingsChanged` notifications,
including changes made by another connected app. Temp mode hides the saved
library and storage controls. Flush temp and saved-level deletion require
confirmation, and failures stay beside the action that caused them.
Deletion refreshes the visible library and its summary. Changing modes,
clearing files and deleting levels are never replayed after reconnecting.

Validation:

- `npm run lint`
- `npm run test:ipc`
- `npm run build:staging`

The application tests inject a deterministic message port and cover correlated
results, terminal-state ordering, reconnect without command replay, discarded
old connections, early picker completion, subscription disposal and domain
rejections. Set `TUFHELPER_IPC_FIXTURE` to the mod's built
`build/tests/core/TUFHelperLite.Tests.dll` to include the real C# server integration
test. It checks settings broadcasts, actual temp-file clearing and managed-level
deletion in addition to reconnect, targeted notifications and cancellation.
