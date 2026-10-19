// The application consumes a message-session port; neither React nor the SDK belongs here.
const value = (object, name) => object != null && Object.prototype.hasOwnProperty.call(object, name)
  ? object[name] : object?.[name.charAt(0).toUpperCase() + name.slice(1)];
const initial = () => ({ connected: false, connectionError: null, health: null, jobs: [], levelIds: [], storage: null, batch: null, summary: null });
const failure = (payload) => Object.assign(new Error(value(payload, 'message') || 'The game could not complete this action.'), { code: value(payload, 'code') || value(payload, 'errorCode') });

export function createHelperSession({ createPort, timeoutMs = 30000 }) {
  let state = initial();
  let port = null;
  let connecting = null;
  let generation = 0;
  const listeners = new Set();
  const results = new Map();
  const observations = new Set();
  const interests = new Map();
  const folders = new Map();
  let interestScheduled = false;
  let lastInterest = null;
  const update = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
    for (const observation of observations) if (observation.test(state)) observation.finish(state);
  };
  const settle = (id, payload, error) => {
    const pending = results.get(id);
    if (!pending) return;
    results.delete(id);
    clearTimeout(pending.timer);
    if (error) pending.reject(error); else pending.resolve(payload);
  };
  const rejectPending = (error) => { for (const id of results.keys()) settle(id, null, error); };
  const sendInterests = () => {
    if (!state.connected || !port) return;
    const ids = [...interests.keys()].slice(0, 500);
    const fingerprint = ids.join(',');
    if (fingerprint === lastInterest) return;
    lastInterest = fingerprint;
    port.send('library.watch', { ids });
  };
  const scheduleInterests = () => {
    if (interestScheduled) return;
    interestScheduled = true; queueMicrotask(() => { interestScheduled = false; sendInterests(); });
  };
  const receive = (name, payload, message = {}) => {
    if (name === 'snapshot') {
      lastInterest = null;
      update({ connected: true, connectionError: null, levelIds: [], health: value(payload, 'health'), jobs: value(payload, 'jobs') || [], storage: value(payload, 'storage'), batch: value(payload, 'batch'), summary: value(payload, 'summary') });
      sendInterests();
    } else if (name === 'jobs.changed') update({ jobs: value(payload, 'jobs') || [] });
    else if (name === 'job.started') {
      const id = value(payload, 'jobId');
      const current = state.jobs.find((job) => value(job, 'jobId') === id);
      if (!current || (!value(current, 'done') && Number(value(current, 'updatedAtUnixMs')) <= Number(value(payload, 'updatedAtUnixMs')))) update({ jobs: [...state.jobs.filter((job) => value(job, 'jobId') !== id), payload] });
    } else if (name === 'library.membership') update({ levelIds: value(payload, 'levelIds') || [] });
    else if (name === 'library.changed') update({ summary: value(payload, 'summary') });
    else if (name === 'storage.changed') update({ storage: payload });
    else if (name === 'batch.changed') update({ batch: payload });
    else if (name === 'folder.selection') {
      folders.set(value(payload, 'operationId'), payload);
      if (folders.size > 8) folders.delete(folders.keys().next().value);
      for (const observation of observations) if (observation.folderId === value(payload, 'operationId')) observation.finish(payload);
    }
    const pending = results.get(message.correlationId);
    if (name === 'command.failed' || name === 'command.rejected') settle(message.correlationId, null, failure(payload));
    else if (pending?.event === name) settle(message.correlationId, payload);
  };
  const observe = (test, { signal, folderId, noDeadline = false } = {}) => new Promise((resolve, reject) => {
    if (test(state)) { resolve(state); return; }
    if (signal?.aborted) { reject(signal.reason || new Error('Action cancelled.')); return; }
    const entry = { test, folderId };
    const finish = (result, error) => {
      observations.delete(entry); clearTimeout(entry.timer); signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(result);
    };
    const abort = () => finish(null, signal.reason || new Error('Action cancelled.'));
    entry.finish = finish;
    if (!noDeadline) entry.timer = setTimeout(() => finish(null, Object.assign(new Error('The game took too long to respond. Try again.'), { code: 'TIMEOUT' })), folderId ? 300000 : timeoutMs);
    observations.add(entry); signal?.addEventListener('abort', abort, { once: true });
  });
  const expect = (event, name, payload) => {
    if (!port || !state.connected) return Promise.reject(new Error('Connect to the game before starting this action.'));
    return new Promise((resolve, reject) => {
      const id = port.send(name, payload);
      const timer = setTimeout(() => settle(id, null, Object.assign(new Error('The game took too long to respond. Try again.'), { code: 'TIMEOUT' })), timeoutMs);
      results.set(id, { event, resolve, reject, timer });
    });
  };
  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async connect() {
      if (state.connected) return;
      if (connecting) return connecting;
      const epoch = ++generation;
      port?.close();
      const openingPort = createPort();
      port = openingPort;
      connecting = (async () => {
        await openingPort.open((name, payload, message) => { if (epoch === generation) receive(name, payload, message); }, (connected, reason) => {
          if (epoch !== generation || connected) return;
          const error = reason || Object.assign(new Error('Connection to the game was interrupted.'), { code: 'DISCONNECTED' });
          update({ connected: false, connectionError: error });
          rejectPending(error);
          for (const observation of [...observations]) observation.finish(null, error);
        });
        if (epoch !== generation) throw new Error("Connection cancelled.");
        await observe((snapshot) => snapshot.connected);
      })().finally(() => { connecting = null; });
      return connecting;
    },
    close() { folders.clear(); ++generation; port?.close(); port = null; connecting = null; rejectPending(new Error('Connection closed.')); for (const item of [...observations]) item.finish(null, new Error('Connection closed.')); update(initial()); },
    watchLevel(id) {
      id = String(id || '');
      if (!/^\d+$/.test(id)) return () => {};
      interests.set(id, (interests.get(id) || 0) + 1); scheduleInterests();
      return () => { const count = interests.get(id) || 0; if (count > 1) interests.set(id, count - 1); else interests.delete(id); scheduleInterests(); };
    },
    openById: (id, openAfterDownload = true) => expect('job.started', 'level.open-from-id', { id: String(id), openAfterDownload }),
    openByUrl: (url, openAfterDownload = true) => expect('job.started', 'level.open-from-url', { url, openAfterDownload }),
    download: (url, levelId) => expect('job.started', 'level.download', { url, levelId }),
    cancelJob: (jobId) => expect('job.cancelled', 'level.cancel', { jobId }),
    selectLevel: (jobId, levelPath) => expect('level.selected', 'level.select', { jobId, levelPath }),
    page: (request) => expect('library.page', 'library.page', request),
    checkUpdate: (id) => expect('job.started', 'level.update.check', { id: String(id) }),
    updateLevel: (id) => expect('job.started', 'level.update.start', { id: String(id) }),
    checkAll: () => expect('batch.changed', 'level.update.check-all.start', {}),
    updateAll: () => expect('batch.changed', 'level.update.all.start', {}),
    cancelCheckAll: () => expect('batch.changed', 'level.update.check-all.cancel', {}),
    cancelUpdateAll: () => expect('batch.changed', 'level.update.all.cancel', {}),
    pickFolder: (allowExisting) => expect('folder.pick-started', 'storage.folder-pick.start', { allowExisting }),
    changeStorage: (request) => expect('storage.changed', 'storage.change.start', request),
    migrateStorage: (request) => expect('storage.changed', 'storage.migration.start', request),
    retryChange: () => expect('storage.changed', 'storage.change.retry', {}),
    retryMigration: () => expect('storage.changed', 'storage.migration.retry', {}),
    cancelChange: () => expect('storage.changed', 'storage.change.cancel', {}),
    waitForJob: async (jobId, options) => {
      const snapshot = await observe((next) => next.jobs.some((job) => value(job, 'jobId') === jobId && value(job, 'done')), { ...options, noDeadline: true });
      return snapshot.jobs.find((job) => value(job, 'jobId') === jobId);
    },
    waitForFolder: (operationId, options) => folders.has(operationId) ? Promise.resolve(folders.get(operationId)) : observe(() => false, { ...options, folderId: operationId }),
  };
}
