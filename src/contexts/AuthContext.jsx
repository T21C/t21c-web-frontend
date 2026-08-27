// tuf-search: #AuthContext #authContext
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';
import { clearCsrfToken, getCsrfToken, setCsrfToken } from '@/utils/csrf';
import { completeAuthBoot, ensureAuthBoot } from '@/utils/authBoot';
import { clearCachedUser, readCachedUser, writeCachedUser } from '@/utils/authUserCache';
import { setSuperAdminProofActor } from '@/utils/superAdminProofActor';
import { isUnauthorizedError } from '@/utils/authErrors';
import { routes } from '@/api/routes';
import { useNotification } from './NotificationContext';
import { useNavigate } from 'react-router-dom';
import { hasAnyFlag, hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { navigateExternal } from '@/utils/externalNavigationGate';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(() => {
    const cached = readCachedUser();
    if (cached) {
      setSuperAdminProofActor({ id: cached.id, username: cached.username });
    }
    return cached;
  });
  const [loading, setLoading] = useState(() => !readCachedUser());
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const { restartNotifications, resetNotifications, cleanup } = useNotification();
  const navigate = useNavigate();

  // LocalStorage management for origin URL (5 minute expiration)
  const ORIGIN_URL_KEY = 'originUrl';
  const ORIGIN_URL_EXPIRY_KEY = 'originUrl_expiry';
  const ORIGIN_URL_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes in ms

  const getOriginUrl = () => {
    const value = localStorage.getItem(ORIGIN_URL_KEY);
    const expiry = localStorage.getItem(ORIGIN_URL_EXPIRY_KEY);
    if (!value) return null;
    if (!expiry || Date.now() > Number(expiry)) {
      localStorage.removeItem(ORIGIN_URL_KEY);
      localStorage.removeItem(ORIGIN_URL_EXPIRY_KEY);
      return null;
    }
    return value;
  };

  const setOriginUrl = (url) => {
    if (url) {
      localStorage.setItem(ORIGIN_URL_KEY, url);
      localStorage.setItem(ORIGIN_URL_EXPIRY_KEY, String(Date.now() + ORIGIN_URL_EXPIRY_MS));
    } else {
      localStorage.removeItem(ORIGIN_URL_KEY);
      localStorage.removeItem(ORIGIN_URL_EXPIRY_KEY);
    }
  };

  const clearOriginUrl = () => {
    localStorage.removeItem(ORIGIN_URL_KEY);
    localStorage.removeItem(ORIGIN_URL_EXPIRY_KEY);
  };

  // Started on first render, before child effects can fire their own requests, so
  // everything shares one boot promise instead of racing refresh rotations.
  const [sessionBoot] = useState(() =>
    ensureAuthBoot(async () => (await api.get(routes.auth.session())).data),
  );

  const commitUser = useCallback((next) => {
    setUserState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      if (resolved) {
        writeCachedUser(resolved);
        setSuperAdminProofActor({ id: resolved.id, username: resolved.username });
      } else {
        clearCachedUser();
        setSuperAdminProofActor(null);
      }
      return resolved ?? null;
    });
  }, []);

  const acceptSessionUser = useCallback((nextUser) => {
    if (!nextUser) return;
    commitUser(nextUser);
    setLoading(false);
    completeAuthBoot({
      user: nextUser,
      csrfToken: getCsrfToken() || '',
    });
    if (hasAnyFlag(nextUser, [permissionFlags.SUPER_ADMIN, permissionFlags.RATER])) {
      restartNotifications(true);
    }
  }, [commitUser, restartNotifications]);

  // Listen for auth events
  useEffect(() => {
    const handlePermissionChange = () => {
      fetchUser();
    };

    const handleLogout = () => {
      completeAuthBoot({
        user: null,
        csrfToken: '',
      });
      commitUser(null);
      clearOriginUrl();
    };

    window.addEventListener('auth:permission-changed', handlePermissionChange);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:permission-changed', handlePermissionChange);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [commitUser]);

  useEffect(() => {
    const applySessionPayload = (data) => {
      if (!data || typeof data !== 'object') {
        return;
      }
      if (typeof data.csrfToken === 'string' && data.csrfToken.length > 0) {
        setCsrfToken(data.csrfToken);
      }
      const nextUser = data.user ?? null;
      if (nextUser) {
        acceptSessionUser(nextUser);
      } else {
        commitUser(null);
        setLoading(false);
      }
    };

    const bootAuth = async () => {
      try {
        applySessionPayload(await sessionBoot);
      } catch {
        // Transient boot failures keep retrying; do not treat them as logout.
      } finally {
        setLoading(false);
      }
    };
    bootAuth();
  }, [sessionBoot, acceptSessionUser, commitUser]);

  // Add verification state check
  const checkVerificationState = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await api.get(routes.auth.profile.me());
      const currentVerificationState = hasFlag(response.data.user, permissionFlags.EMAIL_VERIFIED);
      // If verification state has changed, update user
      if (currentVerificationState !== hasFlag(user, permissionFlags.EMAIL_VERIFIED)) {
        commitUser(response.data.user);
        return true; // State changed
      }
      return false; // No change
    } catch (error) {
      console.error('[Auth] Error checking verification state:', error);
      return false;
    }
  }, [user, commitUser]);

  /**
   * @param {boolean} force
   * @param {{ silent?: boolean }} [options] If silent, does not toggle global `loading` (avoids unmounting the tree — needed after verify-email / change-email so the verification page does not remount and retry a one-time token).
   * @returns {Promise<object | null | undefined>} Current profile user, null on 401, undefined if skipped (throttle) or the fetch failed without 401
   */
  const fetchUser = async (force = false, options = {}) => {
    const silent = options && typeof options === 'object' && options.silent === true;
    const now = Date.now();
    if (!force && now - lastFetchTime < 1000) {
      return undefined;
    }
    setLastFetchTime(now);

    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await api.get(routes.auth.profile.me());
      const newUser = response.data.user;
      acceptSessionUser(newUser);
      return newUser;
    } catch (error) {
      console.error('[Auth] Error fetching user:', error);
      if (isUnauthorizedError(error)) {
        commitUser(null);
        return null;
      }
      return undefined;
    } finally {
      if (!silent) {
        setLoading(false);
      }
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
      const response = await api.post(routes.auth.login(), {
        emailOrUsername,
        password,
        captchaToken
      });
      // Only load profile when the server issued a session (has user).
      // MFA challenge returns { status: 'mfa_required' } with no user.
      if (response.data?.user) {
        acceptSessionUser(response.data.user);
        await fetchUser(true, { silent: true });
      }
      return response.data;
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    }
  };

  const requestLoginMfaEmail = async () => {
    const response = await api.post(routes.auth.mfa.email());
    return response.data;
  };

  const verifyLoginMfa = async ({ code, rememberDevice = true } = {}) => {
    const response = await api.post(routes.auth.mfa.verify(), {
      code,
      rememberDevice: Boolean(rememberDevice),
    });
    if (response.data?.user) {
      acceptSessionUser(response.data.user);
      await fetchUser(true, { silent: true });
    }
    return response.data;
  };

  const loginWithPasskey = async () => {
    try {
      const optionsRes = await api.post(routes.auth.passkeys.loginOptions());
      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: optionsRes.data });
      } catch (err) {
        if (err?.name === 'NotAllowedError') {
          return { cancelled: true };
        }
        throw err;
      }
      const response = await api.post(routes.auth.passkeys.loginVerify(), {
        response: assertion,
      });
      if (response.data?.user) {
        acceptSessionUser(response.data.user);
        await fetchUser(true, { silent: true });
      }
      return response.data;
    } catch (error) {
      console.error('[Auth] Passkey login failed:', error);
      throw error;
    }
  };

  const verifyLoginMfaPasskey = async ({ rememberDevice = true } = {}) => {
    try {
      const optionsRes = await api.post(routes.auth.mfa.passkeyOptions());
      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: optionsRes.data });
      } catch (err) {
        if (err?.name === 'NotAllowedError') {
          return { cancelled: true };
        }
        throw err;
      }
      const response = await api.post(routes.auth.mfa.passkeyVerify(), {
        response: assertion,
        rememberDevice: Boolean(rememberDevice),
      });
      if (response.data?.user) {
        acceptSessionUser(response.data.user);
        await fetchUser(true, { silent: true });
      }
      return response.data;
    } catch (error) {
      console.error('[Auth] Passkey MFA failed:', error);
      throw error;
    }
  };

  const registerPasskey = async (name) => {
    const optionsRes = await api.post(routes.auth.passkeys.registerOptions());
    let attestation;
    try {
      attestation = await startRegistration({ optionsJSON: optionsRes.data });
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        return { cancelled: true };
      }
      throw err;
    }
    const response = await api.post(routes.auth.passkeys.registerVerify(), {
      response: attestation,
      name: typeof name === 'string' ? name : undefined,
    });
    return response.data;
  };

  const register = async (userData) => {
    try {
      const response = await api.post(routes.auth.register(), userData);
      if (response.data.user) {
        acceptSessionUser(response.data.user);
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
    completeAuthBoot({
      user: null,
      csrfToken: '',
    });
    commitUser(null);
    try {
      const {unsubscribeCurrentBrowser} = await import('@/utils/webPush');
      await unsubscribeCurrentBrowser();
    } catch {
      // ignore
    }
    try {
      await api.post(routes.auth.logout());
    } catch (e) {
      // ignore
    }
    clearCsrfToken();
    cleanup();
    resetNotifications();
  };

  const loginWithProvider = async (provider) => {
    try {
      try {
        sessionStorage.setItem('oauthFlow', JSON.stringify({ mode: 'login', provider }));
      } catch {
        /* ignore */
      }
      const response = await api.get(routes.auth.oauthLogin(provider));
      await navigateExternal(response.data.url);
    } catch (error) {
      console.error('OAuth login error:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
      throw error;
    }
  };

  const loginWithDiscord = () => loginWithProvider('discord');

  const linkProvider = async (provider) => {
    try {
      try {
        sessionStorage.setItem('oauthFlow', JSON.stringify({ mode: 'linking', provider }));
      } catch {
        /* ignore */
      }
      const response = await api.get(routes.auth.oauthLink(provider));
      await navigateExternal(response.data.url);
    } catch (error) {
      console.error('Error linking provider:', error);
      throw error;
    }
  };

  const unlinkProvider = async (provider) => {
    try {
      await api.post(routes.auth.oauthUnlink(provider));
      await fetchUser();
    } catch (error) {
      console.error('Provider unlinking error:', error);
      throw error;
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await api.put(routes.auth.profile.me(), data);
      commitUser(response.data.user);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const changePassword = async (data) => {
    try {
      const response = await api.put(routes.auth.profilePassword(), data);
      await fetchUser();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update password');
    }
  };

  const verifyEmail = async (code) => {
    try {
      const response = await api.post(routes.auth.verify.email(), { code });
      if (response.data?.requireLogin) {
        completeAuthBoot({
          user: null,
          csrfToken: '',
        });
        commitUser(null);
        window.dispatchEvent(new Event('auth:logout'));
        return response.data;
      }
      const profileUser = await fetchUser(true, { silent: true });
      window.dispatchEvent(new Event('auth:permission-changed'));
      return {
        ...response.data,
        user: profileUser ?? null,
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to verify email');
    }
  };

  const resendVerification = async () => {
    try {
      const response = await api.post(routes.auth.verify.resend());
      if (response.data?.emailResendAvailableAt || response.data?.pendingEmail) {
        commitUser((prev) =>
          prev
            ? {
                ...prev,
                pendingEmail: response.data.pendingEmail ?? prev.pendingEmail,
                emailResendAvailableAt:
                  response.data.emailResendAvailableAt ?? prev.emailResendAvailableAt,
              }
            : prev,
        );
      }
      return response.data;
    } catch (error) {
      const retryAfter = error.response?.data?.retryAfter;
      if (retryAfter != null && Number.isFinite(Number(retryAfter))) {
        const availableAt = new Date(Date.now() + Number(retryAfter)).toISOString();
        commitUser((prev) =>
          prev ? { ...prev, emailResendAvailableAt: availableAt } : prev,
        );
      }
      const err = new Error(
        error.response?.data?.message || 'Failed to resend verification email',
      );
      err.retryAfter = retryAfter;
      err.code = error.response?.data?.code;
      throw err;
    }
  };

  const stepUp = async (passwordOrOpts, scopeArg = 'email-change') => {
    const body =
      passwordOrOpts && typeof passwordOrOpts === 'object'
        ? {
            code: passwordOrOpts.code,
            password: passwordOrOpts.password,
            scope: passwordOrOpts.scope ?? scopeArg,
          }
        : { password: passwordOrOpts, scope: scopeArg };
    const response = await api.post(routes.auth.stepUp(), body);
    return response.data;
  };

  const requestStepUpEmail = async (scope = 'security') => {
    const response = await api.post(routes.auth.stepUpEmail(), { scope });
    return response.data;
  };

  const startOAuthReauth = async (provider = 'discord', scope = 'email-change') => {
    try {
      sessionStorage.setItem('stepUpScope', scope);
      sessionStorage.setItem('oauthFlow', JSON.stringify({ mode: 'reauth', provider, scope }));
    } catch {
      /* ignore */
    }
    const response = await api.get(routes.auth.oauthReauth(provider), {
      params: { scope },
    });
    if (response.data?.url) {
      await navigateExternal(response.data.url);
    }
    return response.data;
  };

  const changeEmail = async (email) => {
    try {
      const response = await api.post(routes.auth.verify.changeEmail(), { email });
      if (response.data?.user) {
        commitUser((prev) =>
          prev
            ? {
                ...prev,
                email: response.data.user.email,
                pendingEmail: response.data.user.pendingEmail ?? response.data.pendingEmail,
                emailResendAvailableAt:
                  response.data.user.emailResendAvailableAt ??
                  response.data.emailResendAvailableAt ??
                  prev.emailResendAvailableAt,
                isEmailVerified: response.data.user.isEmailVerified,
                permissionFlags: response.data.user.permissionFlags,
              }
            : response.data.user
        );
      } else if (response.data?.pendingEmail) {
        commitUser((prev) =>
          prev
            ? {
                ...prev,
                pendingEmail: response.data.pendingEmail,
                emailResendAvailableAt:
                  response.data.emailResendAvailableAt ?? prev.emailResendAvailableAt,
              }
            : prev
        );
      }
      await fetchUser(true, { silent: true });
      window.dispatchEvent(new Event('auth:permission-changed'));
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const cancelPendingEmail = async () => {
    const response = await api.delete(routes.auth.verify.pendingEmail());
    await fetchUser(true, { silent: true });
    return response.data;
  };

  const requestPasswordReset = async (email, captchaToken = null) => {
    try {
      const response = await api.post(routes.auth.forgotPassword.request(), {
        email,
        captchaToken
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email, code, password) => {
    try {
      const response = await api.post(routes.auth.forgotPassword.reset(), {
        email,
        code,
        password
      });
      if (response.data?.requireLogin) {
        completeAuthBoot({
          user: null,
          csrfToken: '',
        });
        commitUser(null);
        window.dispatchEvent(new Event('auth:logout'));
      }
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
    loginWithProvider,
    loginWithDiscord,
    requestLoginMfaEmail,
    verifyLoginMfa,
    loginWithPasskey,
    verifyLoginMfaPasskey,
    registerPasskey,
    linkProvider,
    unlinkProvider,
    fetchUser,
    updateProfile,
    changePassword,
    updateToken,
    verifyEmail,
    resendVerification,
    stepUp,
    requestStepUpEmail,
    startOAuthReauth,
    changeEmail,
    cancelPendingEmail,
    requestPasswordReset,
    resetPassword,
    setUser: commitUser,
    acceptSessionUser,
    getOriginUrl,
    setOriginUrl,
    clearOriginUrl,
    initiateLogin,
    checkVerificationState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
