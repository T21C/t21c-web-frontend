import axios from 'axios';

// Create a custom axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Request interceptor to add auth header
api.interceptors.request.use(
  (config) => {
    // Get token directly from localStorage instead of using the hook
    const user = localStorage.getItem('user') 
      ? JSON.parse(localStorage.getItem('user'))
      : null;
    
    //console.log("user", user);
    if (user?.access_token) {
      config.headers.Authorization = `Bearer ${user.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api; 