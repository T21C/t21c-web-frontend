// tuf-search: #useLoginFlow #loginFlow
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { parseAuthError } from '@/utils/authErrors';
import { supportsPasskeys } from '@/utils/supportsPasskeys';

/**
 * Explicit login step machine: credentials → optional MFA.
 */
export function useLoginFlow() {
  const [step, setStep] = useState(/** @type {'credentials' | 'mfa'} */ ('credentials'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [retryAfter, setRetryAfter] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const timerRef = useRef(null);

  const [mfaCode, setMfaCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [mfaMethods, setMfaMethods] = useState(/** @type {string[]} */ ([]));
  const [rememberDevice, setRememberDevice] = useState(true);
  const [resendAvailableAt, setResendAvailableAt] = useState(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [mfaCodeRequested, setMfaCodeRequested] = useState(false);
  const [passkeysSupported] = useState(() => supportsPasskeys());

  const {
    login,
    loginWithDiscord,
    requestLoginMfaEmail,
    verifyLoginMfa,
    loginWithPasskey,
    verifyLoginMfaPasskey,
  } = useAuth();
  const { t } = useTranslation('pages');

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (retryAfter) {
      const endTime = Date.now() + retryAfter;

      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, endTime - Date.now());

        if (remaining <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setError('');
          setRetryAfter(null);
        } else {
          setRetryAfter(remaining);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [retryAfter]);

  useEffect(() => {
    if (!resendAvailableAt) {
      setResendSeconds(0);
      return undefined;
    }
    const tick = () => {
      const ms = new Date(resendAvailableAt).getTime() - Date.now();
      setResendSeconds(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [resendAvailableAt]);

  const formatTime = (ms) => {
    if (!ms) return '0s';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60) % 60;
    const hours = Math.floor(seconds / 3600) % 24;
    const days = Math.floor(seconds / 86400);

    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0 || days > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
    result += `${seconds % 60}s`;

    return result;
  };

  const requestMfaCode = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await requestLoginMfaEmail();
      setMaskedEmail(data?.maskedEmail || '');
      setResendAvailableAt(data?.emailResendAvailableAt || null);
      setMfaCodeRequested(true);
    } catch (err) {
      setMfaCodeRequested(true);
      const codeName = err?.response?.data?.code || err?.code;
      const msg = err?.response?.data?.message || err?.message;
      if (codeName === 'MFA_PENDING_REQUIRED') {
        setStep('credentials');
        setError(msg || t('login.mfa.expired'));
        return;
      }
      if (codeName === 'RESEND_COOLDOWN') {
        const retry = err?.response?.data?.retryAfter;
        if (typeof retry === 'number') {
          setResendAvailableAt(new Date(Date.now() + retry).toISOString());
        }
        if (err?.response?.data?.maskedEmail) {
          setMaskedEmail(err.response.data.maskedEmail);
        }
        return;
      }
      setError(msg || t('login.mfa.sendFailed'));
    } finally {
      setLoading(false);
    }
  }, [requestLoginMfaEmail, t]);

  useEffect(() => {
    if (step === 'mfa' && !mfaCodeRequested && mfaMethods.includes('email')) {
      void requestMfaCode();
    }
  }, [step, mfaCodeRequested, mfaMethods, requestMfaCode]);

  /**
   * @param {React.FormEvent} e
   * @returns {Promise<{ completed: boolean }>}
   */
  const submitCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setRetryAfter(null);
    setLoading(true);

    try {
      if (requireCaptcha && !captchaToken) {
        setError(t('login.errors.captcha.incomplete'));
        setLoading(false);
        return { completed: false };
      }

      const data = await login(email, password, captchaToken);

      if (data?.status === 'mfa_required') {
        const methods = Array.isArray(data.methods) ? data.methods : [];
        setMfaMethods(methods);
        setMaskedEmail(data.maskedEmail || '');
        setMfaCode('');
        setRememberDevice(true);
        const availableAtMs = data.emailResendAvailableAt
          ? new Date(data.emailResendAvailableAt).getTime()
          : 0;
        const cooldownActive = availableAtMs > Date.now();
        setResendAvailableAt(cooldownActive ? data.emailResendAvailableAt : null);
        // Skip auto-request when email MFA is unavailable, or cooldown is active.
        setMfaCodeRequested(cooldownActive || !methods.includes('email'));
        setStep('mfa');
        return { completed: false };
      }

      if (data?.user) {
        setStep('credentials');
        return { completed: true };
      }

      return { completed: false };
    } catch (err) {
      console.error('Login error:', err);

      const status = err?.response?.status;
      let labels = {
        generic: t('login.errors.generic'),
        network: t('login.errors.network'),
      };
      if (status === 401) {
        labels = { ...labels, generic: t('login.errors.invalidCredentials') };
      } else if (status === 403) {
        labels = { ...labels, generic: t('login.errors.emailNotVerified') };
      } else if (status === 429) {
        labels = { ...labels, generic: t('login.errors.rateLimit') };
      }

      const parsed = parseAuthError(err, labels);
      if (parsed.retryAfter != null) {
        parsed.message = parsed.message || t('login.errors.rateLimit');
      }

      setError(parsed.message);
      if (parsed.retryAfter) setRetryAfter(parsed.retryAfter);
      if (parsed.requireCaptcha) setRequireCaptcha(true);
      captchaRef.current?.reset();
      return { completed: false };
    } finally {
      setLoading(false);
    }
  };

  /**
   * @returns {Promise<{ completed: boolean }>}
   */
  const submitPasskey = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await loginWithPasskey();
      if (data?.cancelled) {
        return { completed: false };
      }
      if (data?.user) {
        return { completed: true };
      }
      return { completed: false };
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message;
      setError(msg || t('login.passkey.failed'));
      return { completed: false };
    } finally {
      setLoading(false);
    }
  };

  /**
   * @param {React.FormEvent} e
   * @returns {Promise<{ completed: boolean }>}
   */
  const submitMfa = async (e) => {
    e.preventDefault();
    setError('');
    if (!mfaCode || mfaCode.length < 8) {
      setError(t('login.mfa.codeRequired'));
      return { completed: false };
    }
    setLoading(true);
    try {
      const data = await verifyLoginMfa({
        code: mfaCode,
        rememberDevice,
      });
      if (data?.user) {
        return { completed: true };
      }
      return { completed: false };
    } catch (err) {
      const codeName = err?.response?.data?.code || err?.code;
      const msg = err?.response?.data?.message || err?.message;
      if (codeName === 'MFA_PENDING_REQUIRED') {
        setStep('credentials');
        setError(msg || t('login.mfa.expired'));
        return { completed: false };
      }
      setError(msg || t('login.mfa.invalidCode'));
      return { completed: false };
    } finally {
      setLoading(false);
    }
  };

  /**
   * @returns {Promise<{ completed: boolean }>}
   */
  const submitMfaPasskey = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await verifyLoginMfaPasskey({ rememberDevice });
      if (data?.cancelled) {
        return { completed: false };
      }
      if (data?.user) {
        return { completed: true };
      }
      return { completed: false };
    } catch (err) {
      const codeName = err?.response?.data?.code || err?.code;
      const msg = err?.response?.data?.message || err?.message;
      if (codeName === 'MFA_PENDING_REQUIRED') {
        setStep('credentials');
        setError(msg || t('login.mfa.expired'));
        return { completed: false };
      }
      setError(msg || t('login.mfa.passkeyFailed'));
      return { completed: false };
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = () => {
    setStep('credentials');
    setMfaCode('');
    setMfaMethods([]);
    setMfaCodeRequested(false);
    setResendAvailableAt(null);
    setError('');
  };

  const submitDiscord = async () => {
    try {
      setError('');
      await loginWithDiscord();
    } catch {
      setError(t('login.errors.discordFailed'));
    }
  };

  return {
    step,
    email,
    setEmail,
    password,
    setPassword,
    error,
    loading,
    requireCaptcha,
    retryAfter,
    captchaToken,
    setCaptchaToken,
    captchaRef,
    formatTime,
    submitCredentials,
    submitDiscord,
    submitPasskey,
    passkeysSupported,
    mfaCode,
    setMfaCode,
    maskedEmail,
    mfaMethods,
    rememberDevice,
    setRememberDevice,
    resendSeconds,
    requestMfaCode,
    submitMfa,
    submitMfaPasskey,
    backToCredentials,
  };
}
