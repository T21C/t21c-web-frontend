import axios from 'axios';

// Create a custom axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// Request interceptor to add auth header
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Ensure cache prevention headers are always set
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';

    // Don't modify content-type if it's multipart/form-data
    // Let the browser set the correct boundary
    if (config.headers['Content-Type']?.includes('multipart/form-data')) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    // Handle request errors, but don't interfere with cancellation
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Check for new token in headers
    const newToken = response.headers['x-new-token'];
    const permissionChanged = response.headers['x-permission-changed'];

    if (newToken) {
      localStorage.setItem('token', newToken);
      api.defaults.headers.Authorization = `Bearer ${newToken}`;
    }

    // Emit a custom event for permission changes that AuthContext can listen to
    if (permissionChanged === 'true') {
      window.dispatchEvent(new Event('auth:permission-changed'));
    }

    return response;
  },
  (error) => {
    // Don't transform cancel errors, just pass them through
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    
    // Handle 401 responses
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      delete api.defaults.headers.Authorization;
      window.dispatchEvent(new Event('auth:logout'));
    }
    
    return Promise.reject(error);
  }
);

// Add cancel token utilities to the api instance
api.CancelToken = axios.CancelToken;
api.isCancel = axios.isCancel;

export default api; 