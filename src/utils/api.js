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
        if (!isLoginOrRegister) {
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
        await api.post(routes.auth.refresh());
        processQueue(null);
        return api({
          ...originalRequest,
          withCredentials: true,
        });
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearCsrfToken();
        window.dispatchEvent(new Event('auth:logout'));
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
