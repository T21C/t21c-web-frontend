const COMMANDS = {
  'level.open-from-id': ['openFromId', 'job.started'],
  'level.open-from-url': ['openFromUrl', 'job.started'],
  'level.download': ['download', 'job.started'],
  'level.cancel': ['cancelJob', 'job.cancelled'],
  'level.select': ['selectLevel', 'level.selected'],
  'library.watch': ['watchLibrary', 'library.membership'],
  'library.page': ['libraryPage', 'library.page'],
  'level.update.check': ['checkUpdate', 'job.started'],
  'level.update.start': ['updateLevel', 'job.started'],
  'level.update.check-all.start': ['checkAll', 'batch.changed', true],
  'level.update.all.start': ['updateAll', 'batch.changed', true],
  'level.update.check-all.cancel': ['cancelCheckAll', 'batch.changed', true],
  'level.update.all.cancel': ['cancelUpdateAll', 'batch.changed', true],
  'storage.folder-pick.start': ['pickFolder', 'folder.pick-started'],
  'storage.change.start': ['changeStorage', 'storage.changed'],
  'storage.migration.start': ['migrateStorage', 'storage.changed'],
  'storage.change.retry': ['retryChange', 'storage.changed', true],
  'storage.migration.retry': ['retryMigration', 'storage.changed', true],
  'storage.change.cancel': ['cancelChange', 'storage.changed', true],
};

/** Adapt generated methods to the application's correlated message port. */
export function createIpcPort({ registerApp, contract, browser = globalThis.window, page = globalThis.document }) {
  let app; let channel; let closed = false; let epoch = 0; let nextId = 0;
  let snapshotReceived = false; let pendingSnapshot; let sessionId;
  let receiveMessage; let reportConnection;
  const cleanup = [];
  const push = (name, payload) => {
    if (closed) return;
    if (name === 'snapshot') {
      if (channel?.status !== 'ready') { pendingSnapshot = payload; return; }
      snapshotReceived = true; receiveMessage(name, payload); return;
    }
    if (snapshotReceived && channel?.status === 'ready') receiveMessage(name, payload);
  };
  const statusChanged = (status, error) => {
    if (closed) return;
    if (status !== 'ready') {
      const wasAvailable = snapshotReceived;
      epoch++; sessionId = undefined; snapshotReceived = false; pendingSnapshot = undefined;
      if (wasAvailable || error) reportConnection(false, error || null);
      return;
    }
    if (sessionId !== channel.sessionId) { epoch++; sessionId = channel.sessionId; snapshotReceived = false; }
    reportConnection(true, null);
    if (pendingSnapshot) { const snapshot = pendingSnapshot; pendingSnapshot = undefined; push('snapshot', snapshot); }
  };
  return {
    async open(receive, connectionChanged) {
      if (closed || app) throw new Error('Connection cancelled.');
      receiveMessage = receive; reportConnection = connectionChanged;
      app = registerApp({ displayName: 'T21C Web' });
      channel = app.use(contract, {
        snapshot: ({ state }) => { push('snapshot', state); },
        jobsChanged: ({ jobs }) => { push('jobs.changed', { jobs }); },
        libraryChanged: ({ summary }) => { push('library.changed', { summary }); },
        membershipChanged: ({ levelIds }) => { push('library.membership', { levelIds }); },
        storageChanged: ({ storage }) => { push('storage.changed', storage); },
        batchChanged: ({ batch }) => { push('batch.changed', batch); },
        folderSelection: ({ selection }) => { push('folder.selection', selection); },
      });
      cleanup.push(channel.onStatus(statusChanged));
      const resume = () => { if (!closed && page?.visibilityState === 'visible') app.checkConnection(); };
      const online = () => { if (!closed) app.checkConnection(); };
      for (const name of ['pageshow', 'focus']) {
        browser?.addEventListener(name, resume);
        cleanup.push(() => browser?.removeEventListener(name, resume));
      }
      browser?.addEventListener('online', online);
      page?.addEventListener('visibilitychange', resume);
      cleanup.push(() => browser?.removeEventListener('online', online), () => page?.removeEventListener('visibilitychange', resume));
      // The application owns its readiness deadline. SDK discovery stays active after it expires.
    },
    send(name, payload = {}) {
      if (closed || channel?.status !== 'ready' || !snapshotReceived) throw new Error('Connect to the game before starting this action.');
      const command = COMMANDS[name];
      if (!command) throw new Error(`Unknown helper action: ${name}.`);
      const [method, event, noArguments] = command;
      const id = `${app.appId}-${++nextId}`; const sentEpoch = epoch;
      Promise.resolve().then(() => {
        if (closed || sentEpoch !== epoch || channel.status !== 'ready' || !snapshotReceived) throw new Error('Connection to the game was interrupted.');
        return noArguments ? channel[method]() : channel[method](payload);
      }).then((result) => {
        queueMicrotask(() => {
          if (!closed && sentEpoch === epoch && channel.status === 'ready' && snapshotReceived)
            receiveMessage(event, result, { correlationId: id });
        });
      }, (error) => {
        queueMicrotask(() => {
          if (!closed && sentEpoch === epoch) receiveMessage('command.failed', { code: error?.code, message: error?.message }, { correlationId: id });
        });
      });
      return id;
    },
    close() {
      if (closed) return;
      closed = true; epoch++; pendingSnapshot = undefined; snapshotReceived = false;
      cleanup.splice(0).forEach((unsubscribe) => unsubscribe()); app?.dispose();
    },
  };
}
