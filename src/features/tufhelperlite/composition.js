import { createHelperSession } from './application/createHelperSession';
import { createIpcPort } from './adapters/createIpcPort';
import { ipc } from 'adofai-ipc';
import { TufHelperContract } from '@tufhelper/ipc';
export const helperSession = createHelperSession({ createPort: () => createIpcPort({ registerApp: (options) => ipc.registerApp(options), contract: TufHelperContract }) });
