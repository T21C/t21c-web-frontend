import { createHelperSession } from './application/createHelperSession';
import { createWebSocketPort } from './adapters/createWebSocketPort';
import { IpcConnection } from '../../../vendor/adofai-ipc/src';
export const helperSession = createHelperSession({ createPort: () => createWebSocketPort({ createConnection: () => new IpcConnection() }) });
