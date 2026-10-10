import { useEffect, useSyncExternalStore } from "react";
import { helperSession } from "@/features/tufhelperlite/composition";
import {
  CLIENT_PREF_KEYS,
  getClientPreference,
  readBootTufHelperLiteNeverShow,
  setClientPreferences,
  setTufHelperLiteNeverShowListener,
} from '@/utils/clientPreferences';

export const TUFHELPER_LITE_STORAGE_CAPABILITY = 'download-storage-migration-v1';
export const TUFHELPER_LITE_LIBRARY_CAPABILITY = 'downloaded-level-library-v1';
export const TUFHELPER_LITE_POSITIONED_PAGES_CAPABILITY = 'downloaded-level-positioned-pages-v1';
export const TUFHELPER_LITE_UPDATE_CAPABILITY = 'downloaded-level-update-v1';
export const TUFHELPER_LITE_BATCH_UPDATE_CAPABILITY = 'downloaded-level-batch-update-check-v1';
export const TUFHELPER_LITE_UPDATE_ALL_CAPABILITY = 'downloaded-level-batch-update-v1';
export const TUFHELPER_LITE_STORAGE_RECONNECT_CAPABILITY = 'download-storage-reconnect-v1';
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
const bootNeverShow = typeof window !== 'undefined' && readBootTufHelperLiteNeverShow();
const storedEnabled = storedIntegrationPreference === IPC_INTEGRATION_ENABLED;
const initialIntegrationState = storedEnabled
  ? 'checking-permission'
  : (storedIntegrationPreference === IPC_INTEGRATION_HIDDEN || bootNeverShow)
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
  supportsPositionedDownloadedPages: false,
  supportsDownloadedLevelUpdate: false,
  supportsBatchUpdateCheck: false,
  supportsBatchUpdate: false,
  supportsStorageReconnect: false,
};

const tufHelperLiteJobsListeners = new Set();
let tufHelperLiteJobsSnapshot = { jobs: [] };

const tufHelperLiteDownloadedIdsListeners = new Set();
let tufHelperLiteDownloadedIdsSnapshot = { levelIds: [], levelIdSet: new Set() };

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
    supportsPositionedDownloadedPages: capabilities.includes(TUFHELPER_LITE_POSITIONED_PAGES_CAPABILITY),
    supportsDownloadedLevelUpdate: capabilities.includes(TUFHELPER_LITE_UPDATE_CAPABILITY),
    supportsBatchUpdateCheck: capabilities.includes(TUFHELPER_LITE_BATCH_UPDATE_CAPABILITY),
    supportsBatchUpdate: capabilities.includes(TUFHELPER_LITE_UPDATE_ALL_CAPABILITY),
    supportsStorageReconnect: capabilities.includes(TUFHELPER_LITE_STORAGE_RECONNECT_CAPABILITY),
  };
  if (
    tufHelperLiteHealthSnapshot.isAvailable === normalizedSnapshot.isAvailable &&
    tufHelperLiteHealthSnapshot.isChecking === normalizedSnapshot.isChecking &&
    tufHelperLiteHealthSnapshot.port === normalizedSnapshot.port &&
    tufHelperLiteHealthSnapshot.supportsStorageMigration === normalizedSnapshot.supportsStorageMigration &&
    tufHelperLiteHealthSnapshot.supportsDownloadedLibrary === normalizedSnapshot.supportsDownloadedLibrary
    && tufHelperLiteHealthSnapshot.supportsPositionedDownloadedPages === normalizedSnapshot.supportsPositionedDownloadedPages
    && tufHelperLiteHealthSnapshot.supportsDownloadedLevelUpdate === normalizedSnapshot.supportsDownloadedLevelUpdate
    && tufHelperLiteHealthSnapshot.supportsBatchUpdateCheck === normalizedSnapshot.supportsBatchUpdateCheck
    && tufHelperLiteHealthSnapshot.supportsBatchUpdate === normalizedSnapshot.supportsBatchUpdate
    && tufHelperLiteHealthSnapshot.supportsStorageReconnect === normalizedSnapshot.supportsStorageReconnect
  ) {
    return;
  }

  tufHelperLiteHealthSnapshot = normalizedSnapshot;
  tufHelperLiteHealthListeners.forEach((listener) => listener());
};

const areSnapshotValuesEqual = (left, right) => {
  if (Object.is(left, right)) return true;
  if (typeof left !== 'object' || left == null || typeof right !== 'object' || right == null) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => areSnapshotValuesEqual(value, right[index]));
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) &&
      areSnapshotValuesEqual(left[key], right[key]));
};

const setTufHelperLiteJobsSnapshot = (nextSnapshot) => {
  if (areSnapshotValuesEqual(tufHelperLiteJobsSnapshot.jobs, nextSnapshot.jobs)) return;
  tufHelperLiteJobsSnapshot = nextSnapshot;
  tufHelperLiteJobsListeners.forEach((listener) => listener());
};

const setTufHelperLiteDownloadedIdsSnapshot = (nextSnapshot) => {
  const currentIds = tufHelperLiteDownloadedIdsSnapshot.levelIdSet;
  const nextIds = nextSnapshot.levelIdSet;
  if (
    currentIds.size === nextIds.size &&
    Array.from(currentIds).every((levelId) => nextIds.has(levelId))
  ) {
    return;
  }
  tufHelperLiteDownloadedIdsSnapshot = nextSnapshot;
  tufHelperLiteDownloadedIdsListeners.forEach((listener) => listener());
};

const subscribeHealth = (listener) => { tufHelperLiteHealthListeners.add(listener); return () => tufHelperLiteHealthListeners.delete(listener); };
const subscribeJobs = (listener) => { tufHelperLiteJobsListeners.add(listener); return () => tufHelperLiteJobsListeners.delete(listener); };
const subscribeIds = (listener) => { tufHelperLiteDownloadedIdsListeners.add(listener); return () => tufHelperLiteDownloadedIdsListeners.delete(listener); };
const subscribeIntegration = (listener) => { tufHelperLiteIntegrationListeners.add(listener); return () => tufHelperLiteIntegrationListeners.delete(listener); };
const field = (object, name) => object?.[name] ?? object?.[name.charAt(0).toUpperCase() + name.slice(1)];
helperSession.subscribe(() => {
  const snapshot = helperSession.getSnapshot();
  setTufHelperLiteHealthSnapshot({ isAvailable: snapshot.connected, isChecking: false, port: null, capabilities: field(snapshot.health, 'capabilities') || [] });
  setTufHelperLiteJobsSnapshot({ jobs: snapshot.jobs });
  setTufHelperLiteDownloadedIdsSnapshot({ levelIds: snapshot.levelIds, levelIdSet: new Set(snapshot.levelIds.map(String)) });
  if (!snapshot.connected && tufHelperLiteIntegrationSnapshot.state === 'enabled') setTufHelperLiteIntegrationSnapshot({ state: 'unavailable', isSessionDismissed: false, errorCode: snapshot.connectionError?.code || 'DISCONNECTED' });
  else if (snapshot.connected && tufHelperLiteIntegrationSnapshot.state === 'unavailable') setTufHelperLiteIntegrationSnapshot({ state: 'enabled', isSessionDismissed: false, errorCode: null });
});
const getTufHelperLiteIpcErrorCode = (error) => error?.code || 'CONNECTION_FAILED';
const versionMismatchSnapshot = (error) => ({ direction: error?.direction || (error?.code === 'INCOMPATIBLE' ? (error.protocolVersion > 3 ? 'client_outdated' : 'server_outdated') : null), clientVersion: error?.clientVersion, serverVersion: error?.serverVersion, protocolVersion: error?.protocolVersion });
let isTufHelperLiteIntegrationInitialized = initialIntegrationState === 'hidden' && !storedEnabled;
export const initializeTufHelperLiteIntegration = async () => {
  if (isTufHelperLiteIntegrationInitialized) return;
  isTufHelperLiteIntegrationInitialized = true;
  if (storedEnabled) { await connectTufHelperLiteIntegration(); return; }
  setTufHelperLiteIntegrationSnapshot({ state: bootNeverShow ? 'hidden' : 'prompt', isSessionDismissed: initialSessionDismissed, errorCode: null });
};
export const showTufHelperLiteIntegrationBanner = () => {
  isTufHelperLiteIntegrationInitialized = true;
  setClientPreferences({ [CLIENT_PREF_KEYS.TUFHELPERLITE_NEVER_SHOW]: false });
  writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, null);
  writeStorage(window.sessionStorage, IPC_BANNER_DISMISSED_SESSION_KEY, null);
  helperSession.close();
  setTufHelperLiteIntegrationSnapshot({ state: 'prompt', isSessionDismissed: false, errorCode: null });
};
export const connectTufHelperLiteIntegration = async () => {
  if (tufHelperLiteIntegrationSnapshot.state === 'connecting') return false;
  setTufHelperLiteIntegrationSnapshot({ state: 'connecting', isSessionDismissed: false, errorCode: null });
  setTufHelperLiteHealthSnapshot({ isAvailable: false, isChecking: true, port: null });
  try {
    await helperSession.connect();
    if (tufHelperLiteIntegrationSnapshot.state !== 'connecting') return false;
    writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, IPC_INTEGRATION_ENABLED);
    setTufHelperLiteIntegrationSnapshot({ state: 'enabled', isSessionDismissed: false, errorCode: null });
    return true;
  } catch (error) {
    if (tufHelperLiteIntegrationSnapshot.state !== 'connecting') return false;
    // A readiness timeout must not cancel SDK discovery. Late snapshots restore
    // availability without a reload; terminal protocol mismatches cannot recover.
    if (error?.code === 'INCOMPATIBLE') helperSession.close();
    setTufHelperLiteIntegrationSnapshot({ state: 'unavailable', isSessionDismissed: false, errorCode: getTufHelperLiteIpcErrorCode(error), versionMismatch: versionMismatchSnapshot(error) });
    return false;
  }
};
export const dismissTufHelperLiteBannerForSession = () => {
  writeStorage(window.sessionStorage, IPC_BANNER_DISMISSED_SESSION_KEY, '1');
  setTufHelperLiteIntegrationSnapshot({ ...tufHelperLiteIntegrationSnapshot, isSessionDismissed: true });
};
export const hideTufHelperLiteIntegration = () => {
  setClientPreferences({ [CLIENT_PREF_KEYS.TUFHELPERLITE_NEVER_SHOW]: true });
  writeStorage(window.localStorage, IPC_INTEGRATION_STORAGE_KEY, IPC_INTEGRATION_HIDDEN);
  helperSession.close();
  setTufHelperLiteIntegrationSnapshot({ state: 'hidden', isSessionDismissed: false, errorCode: null });
};
export const openTufHelperLiteLevelById = (id, openAfterDownload = true) => helperSession.openById(id, openAfterDownload);
export const openTufHelperLiteLevelByUrl = (url, openAfterDownload = true) => helperSession.openByUrl(url, openAfterDownload);
export const startTufHelperLiteFolderPicker = ({ allowExisting = false } = {}) => helperSession.pickFolder(allowExisting);
export const waitForTufHelperLiteFolderSelection = (operationId, options) => helperSession.waitForFolder(operationId, options);
export const startTufHelperLiteStorageMigration = (request) => helperSession.migrateStorage(request);
export const retryTufHelperLiteStorageMigration = () => helperSession.retryMigration();
export const startTufHelperLiteStorageChange = (request) => helperSession.changeStorage(request);
export const retryTufHelperLiteStorageChange = () => helperSession.retryChange();
export const cancelTufHelperLiteStorageChange = () => helperSession.cancelChange();
export const getTufHelperLiteDownloadedLevelPage = ({ cursor = null, direction = 'next', limit = 20 } = {}) => helperSession.page({ cursor, direction, limit });
export const getTufHelperLiteDownloadedLevelSummary = async () => helperSession.getSnapshot().summary;
export const checkTufHelperLiteLevelUpdate = (id) => helperSession.checkUpdate(id);
export const startTufHelperLiteLevelUpdate = (id) => helperSession.updateLevel(id);
export const waitForTufHelperLiteJob = (jobId, options) => helperSession.waitForJob(jobId, options);
export const startTufHelperLiteBatchUpdateCheck = () => helperSession.checkAll();
export const cancelTufHelperLiteBatchUpdateCheck = () => helperSession.cancelCheckAll();
export const startTufHelperLiteBatchUpdate = () => helperSession.updateAll();
export const cancelTufHelperLiteBatchUpdate = () => helperSession.cancelUpdateAll();
export const useTufHelperLiteStorage = () => useSyncExternalStore(helperSession.subscribe, () => helperSession.getSnapshot().storage, () => null);
export const useTufHelperLiteBatch = () => useSyncExternalStore(helperSession.subscribe, () => helperSession.getSnapshot().batch, () => null);
export const useTufHelperLiteSummary = () => useSyncExternalStore(helperSession.subscribe, () => helperSession.getSnapshot().summary, () => null);
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
  subscribeHealth,
  getTufHelperLiteHealthSnapshot,
  getTufHelperLiteHealthSnapshot,
);

export const useTufHelperLiteJobs = () => useSyncExternalStore(
  subscribeJobs,
  getTufHelperLiteJobsSnapshot,
  getTufHelperLiteJobsSnapshot,
);

export const useTufHelperLiteDownloadedIds = (levelId) => {
  useEffect(() => helperSession.watchLevel(levelId), [levelId]);
  return useSyncExternalStore(subscribeIds, getTufHelperLiteDownloadedIdsSnapshot, getTufHelperLiteDownloadedIdsSnapshot);
};

export const useTufHelperLiteIntegration = () => useSyncExternalStore(
  subscribeIntegration,
  getTufHelperLiteIntegrationSnapshot,
  getTufHelperLiteIntegrationSnapshot,
);

setTufHelperLiteNeverShowListener((neverShow) => {
  if (!neverShow) return;
  const state = tufHelperLiteIntegrationSnapshot.state;
  if (state === 'prompt' || state === 'unavailable' || state === 'checking-permission') {
    isTufHelperLiteIntegrationInitialized = true;
    setTufHelperLiteIntegrationSnapshot({
      ...tufHelperLiteIntegrationSnapshot,
      state: 'hidden',
    });
  }
});
