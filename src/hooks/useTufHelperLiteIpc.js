import { useSyncExternalStore } from "react";
import { tryConnect } from "@adofai-ipc/client";

const TUFHELPER_LITE_NAMESPACE = 'tufhelperlite';
const TUFHELPER_LITE_HEALTH_METHOD = 'health';
const MINIMUM_TUFHELPER_LITE_VERSION = [0, 1, 4];
export const TUFHELPER_LITE_STORAGE_CAPABILITY = 'download-storage-migration-v1';
export const TUFHELPER_LITE_LIBRARY_CAPABILITY = 'downloaded-level-library-v1';
export const TUFHELPER_LITE_UPDATE_CAPABILITY = 'downloaded-level-update-v1';
export const TUFHELPER_LITE_BATCH_UPDATE_CAPABILITY = 'downloaded-level-batch-update-check-v1';
export const TUFHELPER_LITE_STORAGE_RECONNECT_CAPABILITY = 'download-storage-reconnect-v1';
const IPC_PORT_START = 32145;
const IPC_PORT_END = 32155;
const IPC_HEALTH_POLL_MS = 2500;
const IPC_JOBS_POLL_MS = 1000;
const IPC_DOWNLOADED_IDS_POLL_MS = 2500;
const IPC_HEALTH_TIMEOUT_MS = 800;
const IPC_REQUEST_TIMEOUT_MS = 30000;
const IPC_NAMESPACE_READY_TIMEOUT_MS = 15000;
const IPC_NAMESPACE_POLL_INTERVAL_MS = 100;
const IPC_HEALTH_MISSES_BEFORE_OFFLINE = 3;
const IPC_INTEGRATION_STORAGE_KEY = 'tufhelperlite-integration';
const IPC_BANNER_DISMISSED_SESSION_KEY = 'tufhelperlite-banner-dismissed';
const IPC_INTEGRATION_ENABLED = 'enabled';
const IPC_INTEGRATION_HIDDEN = 'hidden';

const readStorage = (storage, key) => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const writeStorage = (storage, key, value) => {
  try {
    if (value == null) storage?.removeItem(key);
    else storage?.setItem(key, value);
  } catch {
    // Storage can be unavailable in restricted browsing contexts.
  }
};

const storedIntegrationPreference = typeof window === 'undefined'
  ? null
  : readStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY);
const initialIntegrationState = storedIntegrationPreference === IPC_INTEGRATION_HIDDEN
  ? 'hidden'
  : 'checking-permission';
const initialSessionDismissed = typeof window !== 'undefined' &&
  readStorage(window.sessionStorage, IPC_BANNER_DISMISSED_SESSION_KEY) === '1';

const tufHelperLiteIntegrationListeners = new Set();
let tufHelperLiteIntegrationSnapshot = {
  state: initialIntegrationState,
  isSessionDismissed: initialSessionDismissed,
  errorCode: null,
  versionMismatch: null,
  tufHelperLiteVersion: null,
};

const tufHelperLiteHealthListeners = new Set();
let tufHelperLiteHealthSnapshot = {
  isAvailable: false,
  isChecking: false,
  port: null,
  capabilities: [],
  supportsStorageMigration: false,
  supportsDownloadedLibrary: false,
  supportsDownloadedLevelUpdate: false,
  supportsBatchUpdateCheck: false,
  supportsStorageReconnect: false,
};
let tufHelperLiteHealthPollId = null;
let tufHelperLiteClient = null;
let tufHelperLiteNamespaceClient = null;
let isTufHelperLiteHealthChecking = false;
let tufHelperLiteConsecutiveHealthMisses = 0;

const tufHelperLiteJobsListeners = new Set();
let tufHelperLiteJobsSnapshot = { jobs: [] };
let tufHelperLiteJobsPollId = null;
let isTufHelperLiteJobsChecking = false;

const tufHelperLiteDownloadedIdsListeners = new Set();
let tufHelperLiteDownloadedIdsSnapshot = { levelIds: [], levelIdSet: new Set() };
let tufHelperLiteDownloadedIdsPollId = null;
let isTufHelperLiteDownloadedIdsChecking = false;

const getTufHelperLiteHealthSnapshot = () => tufHelperLiteHealthSnapshot;
const getTufHelperLiteJobsSnapshot = () => tufHelperLiteJobsSnapshot;
const getTufHelperLiteDownloadedIdsSnapshot = () => tufHelperLiteDownloadedIdsSnapshot;
const getTufHelperLiteIntegrationSnapshot = () => tufHelperLiteIntegrationSnapshot;

const setTufHelperLiteIntegrationSnapshot = (nextSnapshot) => {
  const normalizedSnapshot = {
    ...nextSnapshot,
    versionMismatch: nextSnapshot.versionMismatch ?? null,
    tufHelperLiteVersion: nextSnapshot.tufHelperLiteVersion ?? null,
  };
  const currentMismatch = tufHelperLiteIntegrationSnapshot.versionMismatch;
  const nextMismatch = normalizedSnapshot.versionMismatch;
  if (
    tufHelperLiteIntegrationSnapshot.state === normalizedSnapshot.state &&
    tufHelperLiteIntegrationSnapshot.isSessionDismissed === normalizedSnapshot.isSessionDismissed &&
    tufHelperLiteIntegrationSnapshot.errorCode === normalizedSnapshot.errorCode &&
    currentMismatch?.direction === nextMismatch?.direction &&
    currentMismatch?.clientVersion === nextMismatch?.clientVersion &&
    currentMismatch?.serverVersion === nextMismatch?.serverVersion &&
    currentMismatch?.protocolVersion === nextMismatch?.protocolVersion &&
    tufHelperLiteIntegrationSnapshot.tufHelperLiteVersion === normalizedSnapshot.tufHelperLiteVersion
  ) {
    return;
  }

  tufHelperLiteIntegrationSnapshot = normalizedSnapshot;
  tufHelperLiteIntegrationListeners.forEach((listener) => listener());
};

const setTufHelperLiteHealthSnapshot = (nextSnapshot) => {
  const capabilities = Array.isArray(nextSnapshot.capabilities)
    ? nextSnapshot.capabilities
    : tufHelperLiteHealthSnapshot.capabilities;
  const normalizedSnapshot = {
    ...nextSnapshot,
    capabilities,
    supportsStorageMigration: capabilities.includes(TUFHELPER_LITE_STORAGE_CAPABILITY),
    supportsDownloadedLibrary: capabilities.includes(TUFHELPER_LITE_LIBRARY_CAPABILITY),
    supportsDownloadedLevelUpdate: capabilities.includes(TUFHELPER_LITE_UPDATE_CAPABILITY),
    supportsBatchUpdateCheck: capabilities.includes(TUFHELPER_LITE_BATCH_UPDATE_CAPABILITY),
    supportsStorageReconnect: capabilities.includes(TUFHELPER_LITE_STORAGE_RECONNECT_CAPABILITY),
  };
  if (
    tufHelperLiteHealthSnapshot.isAvailable === normalizedSnapshot.isAvailable &&
    tufHelperLiteHealthSnapshot.isChecking === normalizedSnapshot.isChecking &&
    tufHelperLiteHealthSnapshot.port === normalizedSnapshot.port &&
    tufHelperLiteHealthSnapshot.supportsStorageMigration === normalizedSnapshot.supportsStorageMigration &&
    tufHelperLiteHealthSnapshot.supportsDownloadedLibrary === normalizedSnapshot.supportsDownloadedLibrary
    && tufHelperLiteHealthSnapshot.supportsDownloadedLevelUpdate === normalizedSnapshot.supportsDownloadedLevelUpdate
    && tufHelperLiteHealthSnapshot.supportsBatchUpdateCheck === normalizedSnapshot.supportsBatchUpdateCheck
    && tufHelperLiteHealthSnapshot.supportsStorageReconnect === normalizedSnapshot.supportsStorageReconnect
  ) {
    return;
  }

  tufHelperLiteHealthSnapshot = normalizedSnapshot;
  tufHelperLiteHealthListeners.forEach((listener) => listener());
};

const setTufHelperLiteJobsSnapshot = (nextSnapshot) => {
  tufHelperLiteJobsSnapshot = nextSnapshot;
  tufHelperLiteJobsListeners.forEach((listener) => listener());
};

const setTufHelperLiteDownloadedIdsSnapshot = (nextSnapshot) => {
  tufHelperLiteDownloadedIdsSnapshot = nextSnapshot;
  tufHelperLiteDownloadedIdsListeners.forEach((listener) => listener());
};

const normalizeAdofaiIpcResponse = (data) => {
  if (!data || typeof data !== 'object') return data;

  if ('Ok' in data || 'Result' in data || 'Error' in data || 'Id' in data) {
    return {
      ok: data.Ok,
      result: data.Result,
      error: data.Error,
      id: data.Id,
    };
  }

  return data;
};

const adofaiIpcFetch = async (...args) => {
  const response = await fetch(...args);
  const requestUrl = String(args[0] instanceof Request ? args[0].url : args[0]);

  if (!requestUrl.endsWith('/ipc')) {
    return response;
  }

  const text = await response.clone().text();
  if (!text) return response;

  try {
    const normalized = normalizeAdofaiIpcResponse(JSON.parse(text));
    return new Response(JSON.stringify(normalized), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch {
    return response;
  }
};

const getTufHelperLitePort = (client) => {
  const port = Number(new URL(client.baseUrl).port);
  return Number.isFinite(port) ? port : null;
};

const getTufHelperLiteIpcErrorCode = (error) => (
  error && typeof error === 'object' && typeof error.code === 'string'
    ? error.code
    : 'UNAVAILABLE'
);

const isTufHelperLiteNamespaceFailure = (code) => (
  code === 'VERSION_MISMATCH' ||
  code === 'TUFHELPERLITE_OUTDATED' ||
  code === 'namespace_status_unavailable' ||
  code === 'namespace_error' ||
  code === 'namespace_initializing' ||
  code === 'namespace_not_found'
);

const readTufHelperLiteVersion = (health) => health?.Version ?? health?.version ?? null;
const readTufHelperLiteCapabilities = (health) => health?.Capabilities ?? health?.capabilities ?? [];

export const isSupportedTufHelperLiteVersion = (value) => {
  if (typeof value !== 'string') return false;

  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/.exec(value.trim());
  if (!match) return false;

  const installed = match.slice(1, 4).map(Number);
  for (let index = 0; index < MINIMUM_TUFHELPER_LITE_VERSION.length; index += 1) {
    if (installed[index] !== MINIMUM_TUFHELPER_LITE_VERSION[index]) {
      return installed[index] > MINIMUM_TUFHELPER_LITE_VERSION[index];
    }
  }

  return true;
};

const assertSupportedTufHelperLiteVersion = (health) => {
  const version = readTufHelperLiteVersion(health);
  if (isSupportedTufHelperLiteVersion(version)) return;

  const error = new Error('TUFHelperLite 0.1.4 or newer is required.');
  error.code = 'TUFHELPERLITE_OUTDATED';
  error.tufHelperLiteVersion = typeof version === 'string' ? version : null;
  throw error;
};

const versionMismatchSnapshot = (error) => ({
  direction: error.direction,
  clientVersion: error.clientVersion,
  serverVersion: error.serverVersion,
  protocolVersion: error.protocolVersion,
});

const reportTufHelperLiteVersionMismatch = (error) => {
  setTufHelperLiteIntegrationSnapshot({
    state: 'unavailable',
    isSessionDismissed: false,
    errorCode: 'VERSION_MISMATCH',
    versionMismatch: versionMismatchSnapshot(error),
  });
};

const connectTufHelperLiteIpc = async () => {
  const client = await tryConnect({
    startPort: IPC_PORT_START,
    endPort: IPC_PORT_END,
    fetch: adofaiIpcFetch,
    probeTimeoutMs: IPC_HEALTH_TIMEOUT_MS,
    requestTimeoutMs: IPC_REQUEST_TIMEOUT_MS,
    onVersionMismatch: reportTufHelperLiteVersionMismatch,
  });

  await client.waitForNamespace(TUFHELPER_LITE_NAMESPACE, {
    status: 'ready',
    timeoutMs: IPC_NAMESPACE_READY_TIMEOUT_MS,
    pollIntervalMs: IPC_NAMESPACE_POLL_INTERVAL_MS,
    requestTimeoutMs: IPC_HEALTH_TIMEOUT_MS,
  });

  const namespaceClient = client.namespace(TUFHELPER_LITE_NAMESPACE);
  const health = await namespaceClient.call(TUFHELPER_LITE_HEALTH_METHOD);
  assertSupportedTufHelperLiteVersion(health);
  const capabilities = readTufHelperLiteCapabilities(health);
  setTufHelperLiteHealthSnapshot({
    ...tufHelperLiteHealthSnapshot,
    capabilities: Array.isArray(capabilities) ? capabilities : [],
  });

  tufHelperLiteClient = client;
  tufHelperLiteNamespaceClient = namespaceClient;
  return client;
};

const clearTufHelperLiteClient = () => {
  tufHelperLiteClient = null;
  tufHelperLiteNamespaceClient = null;
};

const resetTufHelperLiteConnectionData = () => {
  clearTufHelperLiteClient();
  tufHelperLiteConsecutiveHealthMisses = 0;
  setTufHelperLiteHealthSnapshot({
    isAvailable: false,
    isChecking: false,
    port: null,
    capabilities: [],
  });
  setTufHelperLiteJobsSnapshot({ jobs: [] });
  setTufHelperLiteDownloadedIdsSnapshot({ levelIds: [], levelIdSet: new Set() });
};

const isTufHelperLiteIntegrationEnabled = () =>
  tufHelperLiteIntegrationSnapshot.state === 'enabled';

const queryTufHelperLitePermission = async () => {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null;

  for (const name of ['loopback-network', 'local-network-access']) {
    try {
      const permission = await navigator.permissions.query({ name });
      return permission.state;
    } catch {
      // Try the compatibility permission name when the granular name is unsupported.
    }
  }

  return null;
};

let isTufHelperLiteIntegrationInitialized = initialIntegrationState === 'hidden';

export const initializeTufHelperLiteIntegration = async () => {
  if (isTufHelperLiteIntegrationInitialized) return;
  isTufHelperLiteIntegrationInitialized = true;

  const permissionState = await queryTufHelperLitePermission();
  // Some Chrome builds keep reporting `prompt` after a successful loopback request.
  // A completed IPC handshake is the more reliable signal that the user opted in.
  const shouldEnable = permissionState === 'granted' ||
    storedIntegrationPreference === IPC_INTEGRATION_ENABLED;

  if (shouldEnable) {
    writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, IPC_INTEGRATION_ENABLED);
    setTufHelperLiteIntegrationSnapshot({ state: 'enabled', isSessionDismissed: false, errorCode: null });
    setTufHelperLiteHealthSnapshot({ isAvailable: false, isChecking: true, port: null });
    void checkTufHelperLiteHealth();
    return;
  }

  writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, null);
  setTufHelperLiteIntegrationSnapshot({
    state: 'prompt',
    isSessionDismissed: tufHelperLiteIntegrationSnapshot.isSessionDismissed,
    errorCode: null,
  });
};

export const showTufHelperLiteIntegrationBanner = () => {
  isTufHelperLiteIntegrationInitialized = true;
  writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, null);
  writeStorage(window.sessionStorage, IPC_BANNER_DISMISSED_SESSION_KEY, null);
  resetTufHelperLiteConnectionData();
  setTufHelperLiteIntegrationSnapshot({ state: 'prompt', isSessionDismissed: false, errorCode: null });
};

export const connectTufHelperLiteIntegration = async () => {
  if (tufHelperLiteIntegrationSnapshot.state === 'connecting') return false;

  setTufHelperLiteIntegrationSnapshot({ state: 'connecting', isSessionDismissed: false, errorCode: null });
  setTufHelperLiteHealthSnapshot({ isAvailable: false, isChecking: true, port: null });

  try {
    const client = await connectTufHelperLiteIpc();
    const workingPort = getTufHelperLitePort(client);
    if (workingPort == null) throw new Error('TUFHelperLite IPC port is not available.');

    tufHelperLiteConsecutiveHealthMisses = 0;
    writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, IPC_INTEGRATION_ENABLED);
    writeStorage(window.sessionStorage, IPC_BANNER_DISMISSED_SESSION_KEY, null);
    setTufHelperLiteHealthSnapshot({ isAvailable: true, isChecking: false, port: workingPort });
    setTufHelperLiteIntegrationSnapshot({ state: 'enabled', isSessionDismissed: false, errorCode: null });
    await Promise.all([checkTufHelperLiteJobs(), checkTufHelperLiteDownloadedIds()]);
    return true;
  } catch (error) {
    const errorCode = getTufHelperLiteIpcErrorCode(error);
    resetTufHelperLiteConnectionData();
    writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, null);
    setTufHelperLiteIntegrationSnapshot({
      state: errorCode === 'TUFHELPERLITE_OUTDATED' ? 'unsupported' : 'unavailable',
      isSessionDismissed: false,
      errorCode,
      versionMismatch: errorCode === 'VERSION_MISMATCH'
        ? versionMismatchSnapshot(error)
        : null,
      tufHelperLiteVersion: errorCode === 'TUFHELPERLITE_OUTDATED'
        ? error.tufHelperLiteVersion
        : null,
    });
    return false;
  }
};

export const dismissTufHelperLiteBannerForSession = () => {
  writeStorage(window.sessionStorage, IPC_BANNER_DISMISSED_SESSION_KEY, '1');
  setTufHelperLiteIntegrationSnapshot({
    ...tufHelperLiteIntegrationSnapshot,
    isSessionDismissed: true,
  });
};

export const hideTufHelperLiteIntegration = () => {
  writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, IPC_INTEGRATION_HIDDEN);
  writeStorage(window.sessionStorage, IPC_BANNER_DISMISSED_SESSION_KEY, null);
  resetTufHelperLiteConnectionData();
  setTufHelperLiteIntegrationSnapshot({ state: 'hidden', isSessionDismissed: false, errorCode: null });
};

export const invokeTufHelperLiteIpc = async (method, params = {}) => {
  if (!isTufHelperLiteIntegrationEnabled()) {
    throw new Error('TUFHelperLite integration is not enabled.');
  }

  if (!tufHelperLiteNamespaceClient) {
    await connectTufHelperLiteIpc();
  }

  if (!tufHelperLiteNamespaceClient) {
    throw new Error('TUFHelperLite IPC port is not available.');
  }

  try {
    return await tufHelperLiteNamespaceClient.call(method, params, `tufhelperlite-${method}`);
  } catch (error) {
    clearTufHelperLiteClient();
    throw error;
  }
};

export const getTufHelperLiteStorage = () => invokeTufHelperLiteIpc('storage.get', {});

export const startTufHelperLiteFolderPicker = ({ allowExisting = false } = {}) =>
  invokeTufHelperLiteIpc('storage.folder-pick.start', { AllowExisting: allowExisting });

export const getTufHelperLiteFolderPickerStatus = (operationId) =>
  invokeTufHelperLiteIpc('storage.folder-pick.status', { OperationId: operationId });

export const startTufHelperLiteStorageMigration = ({ selectionToken = null, useDefault = false } = {}) =>
  invokeTufHelperLiteIpc('storage.migration.start', {
    SelectionToken: selectionToken,
    UseDefault: useDefault,
  });

export const getTufHelperLiteStorageMigrationStatus = () =>
  invokeTufHelperLiteIpc('storage.migration.status', {});

export const retryTufHelperLiteStorageMigration = () =>
  invokeTufHelperLiteIpc('storage.migration.retry', {});

export const startTufHelperLiteStorageChange = ({ selectionToken = null, useDefault = false } = {}) =>
  invokeTufHelperLiteIpc('storage.change.start', {
    SelectionToken: selectionToken,
    UseDefault: useDefault,
  });

export const getTufHelperLiteStorageChangeStatus = () =>
  invokeTufHelperLiteIpc('storage.change.status', {});

export const retryTufHelperLiteStorageChange = () =>
  invokeTufHelperLiteIpc('storage.change.retry', {});

export const cancelTufHelperLiteStorageChange = () =>
  invokeTufHelperLiteIpc('storage.change.cancel', {});

export const getTufHelperLiteDownloadedLevelPage = ({ cursor = null, direction = 'next', limit = 20 } = {}) =>
  invokeTufHelperLiteIpc('level.downloaded-page', {
    Cursor: cursor,
    Direction: direction,
    Limit: limit,
  });

export const getTufHelperLiteDownloadedLevelSummary = () =>
  invokeTufHelperLiteIpc('level.downloaded-summary', {});

export const checkTufHelperLiteLevelUpdate = (id) =>
  invokeTufHelperLiteIpc('level.update.check', { Id: String(id) });

export const startTufHelperLiteLevelUpdate = (id) =>
  invokeTufHelperLiteIpc('level.update.start', { Id: String(id) });

export const getTufHelperLiteLevelJobStatus = (jobId) =>
  invokeTufHelperLiteIpc('level.status', { JobId: jobId });

export const startTufHelperLiteBatchUpdateCheck = () =>
  invokeTufHelperLiteIpc('level.update.check-all.start', {});

export const getTufHelperLiteBatchUpdateCheckStatus = () =>
  invokeTufHelperLiteIpc('level.update.check-all.status', {});

export const cancelTufHelperLiteBatchUpdateCheck = () =>
  invokeTufHelperLiteIpc('level.update.check-all.cancel', {});

export const checkTufHelperLiteHealth = async () => {
  if (!isTufHelperLiteIntegrationEnabled()) {
    if (tufHelperLiteHealthSnapshot.isChecking) {
      setTufHelperLiteHealthSnapshot({ isAvailable: false, isChecking: false, port: null });
    }
    return;
  }

  if (isTufHelperLiteHealthChecking) return;
  isTufHelperLiteHealthChecking = true;

  try {
    setTufHelperLiteHealthSnapshot({ ...tufHelperLiteHealthSnapshot, isChecking: true });

    const existingClient = tufHelperLiteClient;
    const client = existingClient ?? await connectTufHelperLiteIpc();
    const workingPort = getTufHelperLitePort(client);

    if (existingClient) {
      const health = await client.namespace(TUFHELPER_LITE_NAMESPACE).call(TUFHELPER_LITE_HEALTH_METHOD);
      assertSupportedTufHelperLiteVersion(health);
    }

    if (workingPort != null) {
      tufHelperLiteConsecutiveHealthMisses = 0;
    }

    const shouldStayAvailable =
      workingPort == null &&
      tufHelperLiteHealthSnapshot.isAvailable &&
      tufHelperLiteConsecutiveHealthMisses < IPC_HEALTH_MISSES_BEFORE_OFFLINE;

    setTufHelperLiteHealthSnapshot({
      isAvailable: workingPort != null || shouldStayAvailable,
      isChecking: false,
      port: workingPort ?? (shouldStayAvailable ? tufHelperLiteHealthSnapshot.port : null),
    });
  } catch (error) {
    clearTufHelperLiteClient();
    tufHelperLiteConsecutiveHealthMisses += 1;

    const errorCode = getTufHelperLiteIpcErrorCode(error);
    if (isTufHelperLiteNamespaceFailure(errorCode)) {
      writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, null);
      setTufHelperLiteIntegrationSnapshot({
        state: errorCode === 'TUFHELPERLITE_OUTDATED' ? 'unsupported' : 'unavailable',
        isSessionDismissed: false,
        errorCode,
        versionMismatch: errorCode === 'VERSION_MISMATCH'
          ? versionMismatchSnapshot(error)
          : null,
        tufHelperLiteVersion: errorCode === 'TUFHELPERLITE_OUTDATED'
          ? error.tufHelperLiteVersion
          : null,
      });
    }

    const shouldStayAvailable =
      tufHelperLiteHealthSnapshot.isAvailable &&
      tufHelperLiteConsecutiveHealthMisses < IPC_HEALTH_MISSES_BEFORE_OFFLINE;

    setTufHelperLiteHealthSnapshot({
      isAvailable: shouldStayAvailable,
      isChecking: false,
      port: shouldStayAvailable ? tufHelperLiteHealthSnapshot.port : null,
    });
  } finally {
    isTufHelperLiteHealthChecking = false;
  }
};

export const checkTufHelperLiteJobs = async () => {
  if (isTufHelperLiteJobsChecking) return;
  if (!tufHelperLiteHealthSnapshot.isAvailable || !tufHelperLiteHealthSnapshot.port) {
    setTufHelperLiteJobsSnapshot({ jobs: [] });
    return;
  }

  isTufHelperLiteJobsChecking = true;

  try {
    const result = await invokeTufHelperLiteIpc('level.jobs', {});
    setTufHelperLiteJobsSnapshot({ jobs: result?.Jobs || result?.jobs || [] });
  } catch {
    setTufHelperLiteJobsSnapshot({ jobs: [] });
  } finally {
    isTufHelperLiteJobsChecking = false;
  }
};

export const checkTufHelperLiteDownloadedIds = async () => {
  if (isTufHelperLiteDownloadedIdsChecking) return;
  if (!tufHelperLiteHealthSnapshot.isAvailable || !tufHelperLiteHealthSnapshot.port) {
    setTufHelperLiteDownloadedIdsSnapshot({ levelIds: [], levelIdSet: new Set() });
    return;
  }

  isTufHelperLiteDownloadedIdsChecking = true;

  try {
    const result = await invokeTufHelperLiteIpc('level.downloaded-ids', {});
    const levelIds = result?.LevelIds || result?.levelIds || [];
    setTufHelperLiteDownloadedIdsSnapshot({
      levelIds,
      levelIdSet: new Set(levelIds.map(String)),
    });
  } catch {
    setTufHelperLiteDownloadedIdsSnapshot({ levelIds: [], levelIdSet: new Set() });
  } finally {
    isTufHelperLiteDownloadedIdsChecking = false;
  }
};

const subscribeTufHelperLiteHealth = (listener) => {
  tufHelperLiteHealthListeners.add(listener);

  if (tufHelperLiteHealthPollId == null) {
    void checkTufHelperLiteHealth();
    tufHelperLiteHealthPollId = window.setInterval(checkTufHelperLiteHealth, IPC_HEALTH_POLL_MS);
  }

  return () => {
    tufHelperLiteHealthListeners.delete(listener);

    if (tufHelperLiteHealthListeners.size === 0 && tufHelperLiteHealthPollId != null) {
      window.clearInterval(tufHelperLiteHealthPollId);
      tufHelperLiteHealthPollId = null;
    }
  };
};

const subscribeTufHelperLiteIntegration = (listener) => {
  tufHelperLiteIntegrationListeners.add(listener);
  return () => tufHelperLiteIntegrationListeners.delete(listener);
};

const subscribeTufHelperLiteJobs = (listener) => {
  tufHelperLiteJobsListeners.add(listener);

  if (tufHelperLiteJobsPollId == null) {
    void checkTufHelperLiteJobs();
    tufHelperLiteJobsPollId = window.setInterval(checkTufHelperLiteJobs, IPC_JOBS_POLL_MS);
  }

  return () => {
    tufHelperLiteJobsListeners.delete(listener);

    if (tufHelperLiteJobsListeners.size === 0 && tufHelperLiteJobsPollId != null) {
      window.clearInterval(tufHelperLiteJobsPollId);
      tufHelperLiteJobsPollId = null;
    }
  };
};

const subscribeTufHelperLiteDownloadedIds = (listener) => {
  tufHelperLiteDownloadedIdsListeners.add(listener);

  if (tufHelperLiteDownloadedIdsPollId == null) {
    void checkTufHelperLiteDownloadedIds();
    tufHelperLiteDownloadedIdsPollId = window.setInterval(checkTufHelperLiteDownloadedIds, IPC_DOWNLOADED_IDS_POLL_MS);
  }

  return () => {
    tufHelperLiteDownloadedIdsListeners.delete(listener);

    if (tufHelperLiteDownloadedIdsListeners.size === 0 && tufHelperLiteDownloadedIdsPollId != null) {
      window.clearInterval(tufHelperLiteDownloadedIdsPollId);
      tufHelperLiteDownloadedIdsPollId = null;
    }
  };
};

const normalizeTufHelperLiteUrl = (url) => (url || '').trim().replace(/\/+$/, '').toLowerCase();

const getJobValue = (job, key) => job?.[key] ?? job?.[key.charAt(0).toLowerCase() + key.slice(1)];

export const findTufHelperLiteJob = (jobs, level, dlLink) => {
  const levelId = level?.id == null ? '' : String(level.id);
  const normalizedDlLink = normalizeTufHelperLiteUrl(dlLink);

  return jobs
    .filter((job) => {
      const jobLevelId = getJobValue(job, 'LevelId');
      const sourceUrl = normalizeTufHelperLiteUrl(getJobValue(job, 'SourceUrl'));
      const directUrl = normalizeTufHelperLiteUrl(getJobValue(job, 'DirectUrl'));

      return (
        (levelId && String(jobLevelId || '') === levelId) ||
        (normalizedDlLink && (sourceUrl === normalizedDlLink || directUrl === normalizedDlLink))
      );
    })
    .sort((a, b) => (getJobValue(b, 'UpdatedAtUnixMs') || 0) - (getJobValue(a, 'UpdatedAtUnixMs') || 0))[0];
};

export const getTufHelperLiteDownloadState = (health, jobs, downloadedLevelIdSet, level, dlLink) => {
  if (!health.isAvailable) {
    return { state: 'offline', progress: 0, job: null };
  }

  const job = findTufHelperLiteJob(jobs, level, dlLink);
  const status = String(getJobValue(job, 'Status') || '').toLowerCase();
  if (job && (status === 'queued' || status === 'running')) {
    const progress = Math.max(0, Math.min(1, Number(getJobValue(job, 'Progress')) || 0));
    return { state: 'downloading', progress, job };
  }

  const levelId = level?.id == null ? '' : String(level.id);
  if (levelId && downloadedLevelIdSet?.has(levelId)) {
    return { state: 'downloaded', progress: 1, job: null };
  }

  return { state: 'not-downloaded', progress: 0, job };
};

export const useTufHelperLiteHealth = () => useSyncExternalStore(
  subscribeTufHelperLiteHealth,
  getTufHelperLiteHealthSnapshot,
  getTufHelperLiteHealthSnapshot,
);

export const useTufHelperLiteJobs = () => useSyncExternalStore(
  subscribeTufHelperLiteJobs,
  getTufHelperLiteJobsSnapshot,
  getTufHelperLiteJobsSnapshot,
);

export const useTufHelperLiteDownloadedIds = () => useSyncExternalStore(
  subscribeTufHelperLiteDownloadedIds,
  getTufHelperLiteDownloadedIdsSnapshot,
  getTufHelperLiteDownloadedIdsSnapshot,
);

export const useTufHelperLiteIntegration = () => useSyncExternalStore(
  subscribeTufHelperLiteIntegration,
  getTufHelperLiteIntegrationSnapshot,
  getTufHelperLiteIntegrationSnapshot,
);
