import { connectIpc } from '../../../../vendor/adofai-ipc/src';

const EVENTS = ['snapshot', 'jobs.changed', 'job.started', 'job.cancelled', 'level.selected', 'library.changed', 'library.membership', 'library.page', 'storage.changed', 'batch.changed', 'folder.pick-started', 'folder.selection', 'command.failed', 'command.rejected'];
export function createWebSocketPort() {
  let connection; let channel; let closed = false; const cleanup = [];
  return {
    async open(receive, connectionChanged) {
      connection = await connectIpc();
      if (closed) { connection.close(); throw new Error("Connection cancelled."); }
      channel = connection.namespace('tufhelperlite');
      for (const name of EVENTS) cleanup.push(channel.on(name, (payload, message) => receive(name, payload, message)));
      cleanup.push(connection.onState((state) => connectionChanged(state === 'connected', state === 'incompatible' ? Object.assign(new Error('Update ADOFAI-IPC and refresh this page, then reconnect.'), { code: 'INCOMPATIBLE' }) : null)));
      cleanup.push(channel.onStatus((status, error) => { if (status !== 'ready') connectionChanged(false, error ? Object.assign(new Error(error.message), { code: error.code }) : null); }));
      await channel.whenReady({ timeoutMs: 15000 });
    },
    send(name, payload) { return channel.send(name, payload); },
    close() { closed = true; cleanup.splice(0).forEach((unsubscribe) => unsubscribe()); connection?.close(); },
  };
}
