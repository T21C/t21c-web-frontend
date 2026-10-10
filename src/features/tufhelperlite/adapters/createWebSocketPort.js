const EVENTS = ['snapshot', 'jobs.changed', 'job.started', 'job.cancelled', 'level.selected', 'library.changed', 'library.membership', 'library.page', 'storage.changed', 'batch.changed', 'folder.pick-started', 'folder.selection', 'command.failed', 'command.rejected'];
export function createWebSocketPort({ createConnection, browser = globalThis.window, page = globalThis.document }) {
  let connection; let channel; let closed = false; const cleanup = [];
  return {
    async open(receive, connectionChanged) {
      if (closed) throw new Error('Connection cancelled.');
      connection = createConnection();
      channel = connection.namespace('tufhelperlite', 1);
      for (const name of EVENTS) cleanup.push(channel.on(name, (payload, message) => { if (!closed) receive(name, payload, message); }));
      const changed = (error) => {
        if (!closed) connectionChanged(connection.state === 'connected' && channel.status === 'ready', error);
      };
      cleanup.push(connection.onState((state) => changed(state === 'incompatible' ? Object.assign(new Error('Update ADOFAI-IPC and refresh this page, then reconnect.'), { code: 'INCOMPATIBLE' }) : null)));
      cleanup.push(channel.onStatus((_status, error) => changed(error ? Object.assign(new Error(error.message), { code: error.code }) : null)));
      const resume = () => { if (!closed && page?.visibilityState === 'visible') connection.checkConnection(); };
      const online = () => { if (!closed) connection.checkConnection(); };
      for (const name of ['pageshow', 'focus']) {
        browser?.addEventListener(name, resume);
        cleanup.push(() => browser?.removeEventListener(name, resume));
      }
      browser?.addEventListener('online', online);
      page?.addEventListener('visibilitychange', resume);
      cleanup.push(() => browser?.removeEventListener('online', online), () => page?.removeEventListener('visibilitychange', resume));
      // Readiness deadlines belong to the application. Keep discovery and event
      // subscriptions alive so a game started later can still send its snapshot.
      await connection.start();
      if (closed) throw new Error('Connection cancelled.');
    },
    send(name, payload) { return channel.send(name, payload); },
    close() { closed = true; cleanup.splice(0).forEach((unsubscribe) => unsubscribe()); connection?.close(); },
  };
}
