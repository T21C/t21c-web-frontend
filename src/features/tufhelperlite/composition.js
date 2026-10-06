import { createHelperSession } from './application/createHelperSession';
import { createWebSocketPort } from './adapters/createWebSocketPort';
export const helperSession = createHelperSession({ createPort: createWebSocketPort });
