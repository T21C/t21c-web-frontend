import { useSyncExternalStore } from "react";
import { tryConnect } from "@adofai-ipc/client";

const TUFHELPER_LITE_NAMESPACE = 'tufhelperlite';
const TUFHELPER_LITE_HEALTH_METHOD = 'health';
const IPC_PORT_START = 32145;
const IPC_PORT_END = 32155;
const IPC_HEALTH_POLL_MS = 2500;
const IPC_JOBS_POLL_MS = 1000;
const IPC_DOWNLOADED_IDS_POLL_MS = 2500;
const IPC_HEALTH_TIMEOUT_MS = 800;
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
};

const tufHelperLiteHealthListeners = new Set();
let tufHelperLiteHealthSnapshot = {
  isAvailable: false,
  isChecking: false,
  port: null,
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
  if (
    tufHelperLiteIntegrationSnapshot.state === nextSnapshot.state &&
    tufHelperLiteIntegrationSnapshot.isSessionDismissed === nextSnapshot.isSessionDismissed
  ) {
    return;
  }

  tufHelperLiteIntegrationSnapshot = nextSnapshot;
  tufHelperLiteIntegrationListeners.forEach((listener) => listener());
};

const setTufHelperLiteHealthSnapshot = (nextSnapshot) => {
  if (
    tufHelperLiteHealthSnapshot.isAvailable === nextSnapshot.isAvailable &&
    tufHelperLiteHealthSnapshot.isChecking === nextSnapshot.isChecking &&
    tufHelperLiteHealthSnapshot.port === nextSnapshot.port
  ) {
    return;
  }

  tufHelperLiteHealthSnapshot = nextSnapshot;
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

const connectTufHelperLiteIpc = async () => {
  const client = await tryConnect({
    startPort: IPC_PORT_START,
    endPort: IPC_PORT_END,
    fetch: adofaiIpcFetch,
    timeoutMs: IPC_HEALTH_TIMEOUT_MS,
  });

  tufHelperLiteClient = client;
  tufHelperLiteNamespaceClient = client.namespace(TUFHELPER_LITE_NAMESPACE);
  return client;
};

const clearTufHelperLiteClient = () => {
  tufHelperLiteClient = null;
  tufHelperLiteNamespaceClient = null;
};

const resetTufHelperLiteConnectionData = () => {
  clearTufHelperLiteClient();
  tufHelperLiteConsecutiveHealthMisses = 0;
  setTufHelperLiteHealthSnapshot({ isAvailable: false, isChecking: false, port: null });
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
    setTufHelperLiteIntegrationSnapshot({ state: 'enabled', isSessionDismissed: false });
    setTufHelperLiteHealthSnapshot({ isAvailable: false, isChecking: true, port: null });
    void checkTufHelperLiteHealth();
    return;
  }

  writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, null);
  setTufHelperLiteIntegrationSnapshot({
    state: 'prompt',
    isSessionDismissed: tufHelperLiteIntegrationSnapshot.isSessionDismissed,
  });
};

export const showTufHelperLiteIntegrationBanner = () => {
  isTufHelperLiteIntegrationInitialized = true;
  writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, null);
  writeStorage(window.sessionStorage, IPC_BANNER_DISMISSED_SESSION_KEY, null);
  resetTufHelperLiteConnectionData();
  setTufHelperLiteIntegrationSnapshot({ state: 'prompt', isSessionDismissed: false });
};

export const connectTufHelperLiteIntegration = async () => {
  if (tufHelperLiteIntegrationSnapshot.state === 'connecting') return false;

  setTufHelperLiteIntegrationSnapshot({ state: 'connecting', isSessionDismissed: false });
  setTufHelperLiteHealthSnapshot({ isAvailable: false, isChecking: true, port: null });

  try {
    const client = await connectTufHelperLiteIpc();
    const workingPort = getTufHelperLitePort(client);
    if (workingPort == null) throw new Error('TUFHelperLite IPC port is not available.');

    await client.namespace(TUFHELPER_LITE_NAMESPACE).call(TUFHELPER_LITE_HEALTH_METHOD);

    tufHelperLiteConsecutiveHealthMisses = 0;
    writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, IPC_INTEGRATION_ENABLED);
    writeStorage(window.sessionStorage, IPC_BANNER_DISMISSED_SESSION_KEY, null);
    setTufHelperLiteHealthSnapshot({ isAvailable: true, isChecking: false, port: workingPort });
    setTufHelperLiteIntegrationSnapshot({ state: 'enabled', isSessionDismissed: false });
    await Promise.all([checkTufHelperLiteJobs(), checkTufHelperLiteDownloadedIds()]);
    return true;
  } catch {
    resetTufHelperLiteConnectionData();
    writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, null);
    setTufHelperLiteIntegrationSnapshot({ state: 'unavailable', isSessionDismissed: false });
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
  setTufHelperLiteIntegrationSnapshot({ state: 'hidden', isSessionDismissed: false });
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
  } catch {
    clearTufHelperLiteClient();
    throw new Error('TUFHelperLite IPC returned an error.');
  }
};

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

    const client = tufHelperLiteClient ?? await connectTufHelperLiteIpc();
    const workingPort = getTufHelperLitePort(client);

    await client.namespace(TUFHELPER_LITE_NAMESPACE).call(TUFHELPER_LITE_HEALTH_METHOD);

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
  } catch {
    clearTufHelperLiteClient();
    tufHelperLiteConsecutiveHealthMisses += 1;

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
