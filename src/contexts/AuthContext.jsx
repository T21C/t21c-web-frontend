import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from './NotificationContext';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { restartNotifications, resetNotifications, cleanup } = useNotification();

  // Listen for auth events
  useEffect(() => {
    const handlePermissionChange = () => {
      fetchUser();
    };

    const handleLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth:permission-changed', handlePermissionChange);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:permission-changed', handlePermissionChange);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_ME}`);
     setUser(response.data.user);
      if (response.data.user?.isSuperAdmin || response.data.user?.isRater) {
        restartNotifications(true);
      }
    } catch (error) {
      console.error('[Auth] Error fetching user:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Update token utility function
  const updateToken = (token) => {
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    }
  };

  const login = async (emailOrUsername, password, captchaToken = null) => { 
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_LOGIN}`, {
        emailOrUsername,
        password,
        captchaToken
      });

      const { token } = response.data;
      updateToken(token);
      return response.data;
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    await axios.post(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_REGISTER}`, userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    cleanup();
    resetNotifications();
    setUser(null);
  };

  const loginWithDiscord = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_DISCORD_LOGIN}`);
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Discord login error:', error);
      throw error;
    }
  };

  const linkDiscord = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_LINK_PROVIDER}/discord`);
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Discord linking error:', error);
      throw error;
    }
  };

  const unlinkProvider = async (provider) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_UNLINK_PROVIDER}/${provider}`);
      await fetchUser();
    } catch (error) {
      console.error('Provider unlinking error:', error);
      throw error;
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/v2/auth/profile/me`, data);
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const changePassword = async (data) => {
    try {
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/v2/auth/profile/password`, data);
      await fetchUser();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update password');
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    loginWithDiscord,
    linkDiscord,
    unlinkProvider,
    fetchUser,
    updateProfile,
    changePassword,
    updateToken
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
