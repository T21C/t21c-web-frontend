// tuf-search: #useLoginFlow #loginFlow
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { parseAuthError } from '@/utils/authErrors';

/**
 * Explicit login step machine. Today only `credentials`; `mfa` reserved for 2FA.
 * @returns {{
 *   step: 'credentials' | 'mfa',
 *   email: string,
 *   setEmail: (v: string) => void,
 *   password: string,
 *   setPassword: (v: string) => void,
 *   error: string,
 *   loading: boolean,
 *   requireCaptcha: boolean,
 *   retryAfter: number | null,
 *   captchaToken: string | null,
 *   setCaptchaToken: (v: string | null) => void,
 *   captchaRef: React.MutableRefObject<any>,
 *   formatTime: (ms: number | null) => string,
 *   submitCredentials: (e: React.FormEvent) => Promise<{ completed: boolean }>,
 *   submitDiscord: () => Promise<void>,
 * }}
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
  const { login, loginWithDiscord } = useAuth();
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

  /**
   * @param {React.FormEvent} e
   * @returns {Promise<{ completed: boolean }>} completed=true when a session was issued
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

      // Future: if (data?.mfaRequired) { setStep('mfa'); return { completed: false }; }
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
  };
}
