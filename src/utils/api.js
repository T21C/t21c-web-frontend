import axios from 'axios';

// Create a custom axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Request interceptor to add auth header
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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
  (response) => response,
  (error) => {
    // Don't transform cancel errors, just pass them through
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    
    // Handle other errors here
    return Promise.reject(error);
  }
);

// Add cancel token utilities to the api instance
api.CancelToken = axios.CancelToken;
api.isCancel = axios.isCancel;

export default api; 