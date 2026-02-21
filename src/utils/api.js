import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// Request interceptor: do not set Authorization; cookies (accessToken) are sent automatically
api.interceptors.request.use(
  (config) => {
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
    if (config.headers['Content-Type']?.includes('multipart/form-data')) {
      delete config.headers['Content-Type'];
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

// Response interceptor: on 401 try refresh once, then retry; else dispatch logout
api.interceptors.response.use(
  (response) => {
    const permissionChanged = response.headers['x-permission-changed'];
    if (permissionChanged === 'true') {
      window.dispatchEvent(new Event('auth:permission-changed'));
    }
    return response;
  },
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/logout')) {
        window.dispatchEvent(new Event('auth:logout'));
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
        await api.post('/v2/auth/refresh');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
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
