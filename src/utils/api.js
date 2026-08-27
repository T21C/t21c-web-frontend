// tuf-search: #api
import axios from 'axios';
import { routes } from '@/api/routes';
import { API_BASE } from '@/config/env';
import {
  clearCsrfToken,
  getCsrfToken,
  setCsrfToken,
  syncCsrfFromResponse,
} from '@/utils/csrf';
import { getPendingAuthBoot } from '@/utils/authBoot';
import { isUnauthorizedError } from '@/utils/authErrors';
import { createSuperAdminProof } from '@/utils/superAdminProof';
import { getSuperAdminProofActor } from '@/utils/superAdminProofActor';

const baseURL = API_BASE;

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

let csrfEnsurePromise = null;

/**
 * Ensure we have a CSRF token the SPA can send as a header (needed cross-origin).
 */
export async function ensureCsrfToken({ force = false } = {}) {
  if (!force && getCsrfToken()) return getCsrfToken();
  if (csrfEnsurePromise) return csrfEnsurePromise;

  csrfEnsurePromise = api
    .get(routes.auth.csrf())
    .then((response) => {
      syncCsrfFromResponse(response);
      return getCsrfToken();
    })
    .finally(() => {
      csrfEnsurePromise = null;
    });

  return csrfEnsurePromise;
}

function isPlainRequestBody(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof FormData !== 'undefined' && data instanceof FormData) return false;
  if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) return false;
  if (typeof Blob !== 'undefined' && data instanceof Blob) return false;
  return true;
}

function readAxiosHeader(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') {
    const value = headers.get(name);
    return typeof value === 'string' ? value : '';
  }
  const value = headers[name] ?? headers[name.toLowerCase()];
  return typeof value === 'string' ? value : '';
}

function setAxiosHeader(headers, name, value) {
  if (typeof headers.set === 'function') {
    headers.set(name, value);
    return;
  }
  headers[name] = value;
}

function deleteAxiosHeader(headers, name) {
  if (typeof headers.delete === 'function') {
    headers.delete(name);
    return;
  }
  delete headers[name];
  delete headers[name.toLowerCase()];
}

async function applySuperAdminProof(config) {
  const headers = config.headers || {};
  const fromHeader = readAxiosHeader(headers, 'X-Super-Admin-Password');
  const body = isPlainRequestBody(config.data) ? config.data : null;
  const fromBody = typeof body?.superAdminPassword === 'string' ? body.superAdminPassword : '';
  const secret = fromHeader || fromBody;
  if (!secret) return;

  deleteAxiosHeader(headers, 'X-Super-Admin-Password');
  if (body && 'superAdminPassword' in body) {
    delete body.superAdminPassword;
  }

  const actor = getSuperAdminProofActor();
  if (!actor) {
    throw new Error('Super admin proof requires an authenticated user');
  }

  const proof = await createSuperAdminProof({
    secret,
    userId: actor.id,
    username: actor.username,
    method: config.method || 'get',
    path: config.url || '/',
  });
  setAxiosHeader(headers, 'X-Super-Admin-Proof', proof);
  config.headers = headers;
}

// Request interceptor: cookies + CSRF double-submit header for mutating calls
api.interceptors.request.use(
  async (config) => {
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
    if (config.headers['Content-Type']?.includes('multipart/form-data')) {
      delete config.headers['Content-Type'];
    }
    const method = (config.method || 'get').toLowerCase();
    const url = String(config.url || '');
    const isCsrfBootstrap = url.includes('/auth/csrf');
    if (method !== 'get' && method !== 'head' && method !== 'options' && !isCsrfBootstrap) {
      let csrf = getCsrfToken();
      if (!csrf) {
        try {
          csrf = await ensureCsrfToken();
        } catch {
          csrf = null;
        }
      }
      if (csrf) {
        config.headers['X-CSRF-Token'] = csrf;
      }
    }
    await applySuperAdminProof(config);
    return config;
  },
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: sync CSRF, on 401 try refresh once, retry CSRF once on mismatch
api.interceptors.response.use(
  (response) => {
    syncCsrfFromResponse(response);
    const permissionChanged = response.headers['x-permission-changed'];
    if (permissionChanged === 'true') {
      window.dispatchEvent(new Event('auth:permission-changed'));
    }
    return response;
  },
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);

    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // CSRF mismatch: refresh token from server and retry once
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'CSRF_INVALID' &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      try {
        clearCsrfToken();
        const csrf = await ensureCsrfToken({ force: true });
        if (csrf) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['X-CSRF-Token'] = csrf;
        }
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try refresh for auth endpoints that return 401 as part of their normal flow
      const isLoginOrRegister = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');
      if (isLoginOrRegister || originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/logout')) {
        if (!isLoginOrRegister && isUnauthorizedError(error)) {
          clearCsrfToken();
          window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // A boot still in flight may be rotating the refresh cookie already;
        // racing it with /refresh would invalidate one of the two new tokens.
        const pendingBoot = getPendingAuthBoot();
        const boot = pendingBoot ? await pendingBoot.catch(() => null) : null;
        if (boot && typeof boot === 'object' && 'csrfToken' in boot) {
          if (typeof boot.csrfToken === 'string' && boot.csrfToken.length > 0) {
            setCsrfToken(boot.csrfToken);
          }
          if (!boot.user) {
            // Boot settled with an explicit anonymous session.
            processQueue(error, null);
            clearCsrfToken();
            window.dispatchEvent(new Event('auth:logout'));
            return Promise.reject(error);
          }
          processQueue(null);
          return api({
            ...originalRequest,
            withCredentials: true,
          });
        }

        await api.post(routes.auth.refresh());
        processQueue(null);
        return api({
          ...originalRequest,
          withCredentials: true,
        });
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (isUnauthorizedError(refreshError)) {
          clearCsrfToken();
          window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

api.CancelToken = axios.CancelToken;
api.isCancel = axios.isCancel;

export default api;
