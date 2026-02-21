import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';
import { useNotification } from './NotificationContext';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { hasAnyFlag, hasFlag, permissionFlags } from '@/utils/UserPermissions';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const { restartNotifications, resetNotifications, cleanup } = useNotification();
  const navigate = useNavigate();

  // Cookie management for origin URL
  const getOriginUrl = () => {
    return Cookies.get('originUrl') || null;
  };

  const setOriginUrl = (url) => {
    if (url) {
      // Set cookie with 5 minute expiration
      Cookies.set('originUrl', url, { 
        expires: 1/288, // 5 minutes (1/288 of a day)
        secure: true,
        sameSite: 'strict'
      });
    } else {
      Cookies.remove('originUrl');
    }
  };

  const clearOriginUrl = () => {
    Cookies.remove('originUrl');
  };

  // Listen for auth events
  useEffect(() => {
    const handlePermissionChange = () => {
      fetchUser();
    };

    const handleLogout = () => {
      setUser(null);
      clearOriginUrl();
    };

    window.addEventListener('auth:permission-changed', handlePermissionChange);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:permission-changed', handlePermissionChange);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  useEffect(() => {
    const bootAuth = async () => {
      try {
        const response = await api.get('/v2/auth/profile/me');
        setUser(response.data.user);
        if (hasAnyFlag(response.data.user, [permissionFlags.SUPER_ADMIN, permissionFlags.RATER])) {
          restartNotifications(true);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          try {
            await api.post('/v2/auth/refresh');
            const retry = await api.get('/v2/auth/profile/me');
            setUser(retry.data.user);
            if (hasAnyFlag(retry.data.user, [permissionFlags.SUPER_ADMIN, permissionFlags.RATER])) {
              restartNotifications(true);
            }
          } catch (refreshErr) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    bootAuth();
  }, []);

  // Add verification state check
  const checkVerificationState = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/v2/auth/profile/me');
      const currentVerificationState = hasFlag(response.data.user, permissionFlags.EMAIL_VERIFIED);
      // If verification state has changed, update user
      if (currentVerificationState !== hasFlag(user, permissionFlags.EMAIL_VERIFIED)) {
        setUser(response.data.user);
        return true; // State changed
      }
      return false; // No change
    } catch (error) {
      console.error('[Auth] Error checking verification state:', error);
      return false;
    }
  }, [user]);

  const fetchUser = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchTime < 1000) return;
    setLastFetchTime(now);

    try {
      setLoading(true);
      const response = await api.get('/v2/auth/profile/me');
      const newUser = response.data.user;
      setUser(newUser);
      if (hasAnyFlag(newUser, [permissionFlags.SUPER_ADMIN, permissionFlags.RATER])) {
        restartNotifications(true);
      }
    } catch (error) {
      console.error('[Auth] Error fetching user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Add periodic verification check
  useEffect(() => {
    if (!user) return;

    const checkInterval = setInterval(async () => {
      await checkVerificationState();
    }, 300000); // Check every 5 minutes

    return () => clearInterval(checkInterval);
  }, [user, checkVerificationState]);

  const initiateLogin = (originUrl = "") => {
    setOriginUrl(originUrl);
    navigate('/login');
  };

  const updateToken = (token) => {
    if (token) fetchUser();
  };

  const login = async (emailOrUsername, password, captchaToken = null) => { 
    try {
      const response = await api.post('/v2/auth/login', {
        emailOrUsername,
        password,
        captchaToken
      });
      await fetchUser(true);
      return response.data;
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/v2/auth/register', userData);
      if (response.data.user) {
        setUser(response.data.user);
        if (hasAnyFlag(response.data.user, [permissionFlags.SUPER_ADMIN, permissionFlags.RATER])) {
          restartNotifications(true);
        }
      }
      return response.data;
    } catch (error) {
      // Create a structured error object with all relevant information
      const errorData = {
        message: error.response?.data?.message || 'Registration failed',
        retryAfter: error.response?.data?.retryAfter,
        status: error.response?.status,
        data: error.response?.data
      };
      
      // Throw the structured error object
      throw errorData;
    }
  };

  const logout = async () => {
    try {
      await api.post('/v2/auth/logout');
    } catch (e) {
      // ignore
    }
    cleanup();
    resetNotifications();
    setUser(null);
  };

  const loginWithDiscord = async () => {
    try {
      const response = await api.get('/v2/auth/login/discord');
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Discord login error:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
      throw error;
    }
  };

  const linkProvider = async (provider) => {
    try {
      
      if (provider !== 'discord') {
        console.error('Unsupported provider:', provider);
        throw new Error('Unsupported provider');
      }

      const response = await api.get(`/v2/auth/oauth/link/${provider}`);

      // Open Discord auth in a new window
      window.location.href = response.data.url;
      
    } catch (error) {
      console.error('Error linking provider:', error);
      throw error;
    }
  };

  const unlinkProvider = async (provider) => {
    try {
      await api.post(`/v2/auth/oauth/unlink/${provider}`);
      await fetchUser();
    } catch (error) {
      console.error('Provider unlinking error:', error);
      throw error;
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await api.put('/v2/auth/profile/me', data);
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const changePassword = async (data) => {
    try {
      const response = await api.put('/v2/auth/profile/password', data);
      await fetchUser();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update password');
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await api.post('/v2/auth/verify/email', { token });
      await fetchUser();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to verify email');
    }
  };

  const resendVerification = async (email) => {
    try {
      const response = await api.post('/v2/auth/verify/resend', { email });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to resend verification email');
    }
  };

  const requestPasswordReset = async (email, captchaToken = null) => {
    try {
      const response = await api.post('/v2/auth/forgot-password/request', {
        email,
        captchaToken
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const response = await api.post('/v2/auth/forgot-password/reset', {
        token,
        password
      });
      return response.data;
    } catch (error) {
      throw error;
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
    linkProvider,
    unlinkProvider,
    fetchUser,
    updateProfile,
    changePassword,
    updateToken,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword,
    setUser,
    getOriginUrl,
    setOriginUrl,
    clearOriginUrl,
    initiateLogin,
    checkVerificationState // Expose this for manual checks
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
