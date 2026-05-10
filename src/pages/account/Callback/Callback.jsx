// tuf-search: #Callback #account #callback
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from "@/contexts/AuthContext";
import api from '@/utils/api';
import './callback.css';

const XSOLLA_POLL_INTERVAL_MS = 1500;
const XSOLLA_POLL_TIMEOUT_MS = 25000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Survives React 18 Strict Mode (effect mount → unmount → remount): skip duplicate Xsolla handler runs for the same return URL. */
const xsollaCallbackLocks = new Map();

function readXsollaParams(search) {
  const urlParams = new URLSearchParams(search);
  const invoiceId = urlParams.get('invoice_id');
  const foreignInvoice = urlParams.get('foreignInvoice');
  return {
    invoiceId,
    foreignInvoice,
    xsollaStatus: urlParams.get('status'),
    isXsollaReturn: Boolean(invoiceId || foreignInvoice),
    lockKey: `${invoiceId || ''}|${foreignInvoice || ''}|${urlParams.get('status') || ''}`,
  };
}

function initialXsollaState(search) {
  const { invoiceId, foreignInvoice, xsollaStatus } = readXsollaParams(search);
  return {
    status: xsollaStatus || '',
    invoiceId: invoiceId || foreignInvoice || null,
  };
}

const CallbackPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('pages');
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const xsollaFromUrl = readXsollaParams(search);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [mode, setMode] = useState(() => (xsollaFromUrl.isXsollaReturn ? 'xsolla' : 'oauth'));
  const [xsollaState, setXsollaState] = useState(() => initialXsollaState(search));
  const { fetchUser, getOriginUrl } = useAuth();

  /** OAuth branch only: stable empty-string ref so finally doesn't read stale state `error`. */
  const oauthErrorRef = useRef('');

  const handleContinue = () => {
    setRedirecting(true);
    if (mode === 'xsolla') {
      navigate('/settings/billing', { replace: true });
      return;
    }
    if (isLinking) {
      navigate('/settings/account', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleSuccessfulAuth = () => {
    setRedirecting(true);
    const origin = getOriginUrl();
    if (origin && origin !== '/register' && origin !== '/login') {
      navigate(origin, { replace: true });
    } else {
      navigate('/profile', { replace: true });
    }
  };

  useEffect(() => {
    let cancelled = false;
    let navigateTimerId = null;

    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);

      const invoiceId = urlParams.get('invoice_id');
      const foreignInvoice = urlParams.get('foreignInvoice');
      const xsollaStatus = urlParams.get('status');
      const isXsollaReturn = Boolean(invoiceId || foreignInvoice);

      if (isXsollaReturn) {
        setMode('xsolla');
        setXsollaState({ status: xsollaStatus || '', invoiceId: invoiceId || foreignInvoice || null });

        if (xsollaStatus && xsollaStatus !== 'done') {
          setError(t('billing.callback.statusNotDone', { defaultValue: 'Payment was not completed. You can try again from the billing page.' }));
          setLoading(false);
          return;
        }

        const lockKey = `${invoiceId || ''}|${foreignInvoice || ''}|${xsollaStatus || ''}`;
        if (xsollaCallbackLocks.get(lockKey)) {
          setLoading(false);
          setRedirecting(true);
          navigateTimerId = window.setTimeout(() => {
            if (!cancelled) navigate('/settings/billing', { replace: true });
          }, 400);
          return;
        }
        xsollaCallbackLocks.set(lockKey, true);

        try {
          /* silent: global AuthProvider hides entire app while loading — would unmount this page and abort polling */
          if (!cancelled) await fetchUser(true, { silent: true });
        } catch {
          /* keep going; webhook may still arrive */
        }

        const startedAt = Date.now();
        let confirmed = false;
        while (!cancelled && Date.now() - startedAt < XSOLLA_POLL_TIMEOUT_MS) {
          try {
            const res = await api.get('/v3/billing/me');
            const expiresAt = res?.data?.expiresAt ? new Date(res.data.expiresAt).getTime() : null;
            const active = Boolean(res?.data?.active && expiresAt && expiresAt > Date.now());
            if (active) {
              confirmed = true;
              break;
            }
          } catch {
            /* network blip; keep polling */
          }
          await wait(XSOLLA_POLL_INTERVAL_MS);
        }

        if (cancelled) return;

        try {
          await fetchUser(true, { silent: true });
        } catch { /* ignore */ }

        if (cancelled) return;

        setLoading(false);
        setRedirecting(true);

        if (confirmed) {
          toast.success(t('billing.callback.success'));
        } else {
          toast(t('billing.callback.pending'));
        }

        navigateTimerId = window.setTimeout(() => {
          if (!cancelled) navigate('/settings/billing', { replace: true });
        }, 800);
        return;
      }

      const code = urlParams.get('code');
      const errorParam = urlParams.get('error');
      const linking = urlParams.get('linking') === 'true';
      setIsLinking(linking);
      const provider = urlParams.get('provider') || 'discord';
      oauthErrorRef.current = '';

      if (errorParam) {
        setError('Authentication failed');
        setLoading(false);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setLoading(false);
        return;
      }

      try {
        const link = linking ? `/v2/auth/oauth/link/${provider}` : `/v2/auth/oauth/callback/${provider}`;
        const response = await api.post(link, { code, linking });

        if (cancelled) return;

        if (linking) {
          if (response.status === 200) {
            await fetchUser(true);
            if (!cancelled) handleSuccessfulAuth();
          } else {
            throw new Error('Linking failed');
          }
        } else {
          const newUser = await fetchUser(true);
          if (cancelled) return;
          if (newUser) {
            handleSuccessfulAuth();
          } else {
            throw new Error('No user received from server');
          }
        }
      } catch (err) {
        console.error('OAuth callback error:', err);

        let errorMessage = 'Authentication failed';

        if (err.response) {
          if (err.response.data) {
            if (err.response.data.error) {
              errorMessage = err.response.data.error;
            } else if (err.response.data.message) {
              errorMessage = err.response.data.message;
            } else if (err.response.data.data && err.response.data.data.error) {
              errorMessage = err.response.data.data.error;
            }
          }
        } else if (err.request) {
          errorMessage = 'No response from server';
        } else {
          errorMessage = err.message || 'Authentication failed';
        }

        oauthErrorRef.current = errorMessage;
        setError(errorMessage);
        setLoading(false);
      } finally {
        if (!oauthErrorRef.current) {
          setLoading(false);
        }
      }
    };

    handleCallback();

    return () => {
      cancelled = true;
      if (navigateTimerId != null) window.clearTimeout(navigateTimerId);
      const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const lk = `${urlParams.get('invoice_id') || ''}|${urlParams.get('foreignInvoice') || ''}|${urlParams.get('status') || ''}`;
      if (lk !== '||') xsollaCallbackLocks.delete(lk);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mode === 'xsolla') {
    return (
      <div className="callback-page">
        <div className="callback-container">
          {error ? (
            <>
              <h1>{t('billing.callback.errorTitle', { defaultValue: 'Payment not completed' })}</h1>
              <p className="error-message">{error}</p>
              {redirecting ? (
                <p className="redirect-message">
                  {t('billing.callback.redirectingToBilling', { defaultValue: 'Redirecting to billing...' })}
                </p>
              ) : (
                <button className="continue-button" onClick={handleContinue}>
                  {t('billing.callback.backToBilling', { defaultValue: 'Back to billing' })}
                </button>
              )}
            </>
          ) : (
            <>
              <h1>{t('billing.callback.title')}</h1>
              <p className="status-message">
                {loading
                  ? t('billing.callback.waiting', { defaultValue: 'Confirming your payment with our system...' })
                  : redirecting
                    ? t('billing.callback.redirectingToBilling', { defaultValue: 'Redirecting to billing...' })
                    : t('billing.callback.done', { defaultValue: 'All set!' })}
              </p>
              {xsollaState.invoiceId && (
                <p className="redirect-message">
                  {t('billing.callback.invoice', { defaultValue: 'Invoice' })}: {xsollaState.invoiceId}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="callback-page">
      <div className="callback-container">
        {error ? (
          <>
            <h1>Authentication Failed</h1>
            <p className="error-message">{error}</p>
            {redirecting ? (
              <p className="redirect-message">
                {isLinking ? "Redirecting to profile edit page..." : "Redirecting to login page..."}
              </p>
            ) : (
              <button className="continue-button" onClick={handleContinue}>
                {isLinking ? "Return to Profile Edit" : "Return to Login"}
              </button>
            )}
          </>
        ) : (
          <>
            <h1>Authenticating</h1>
            <p className="status-message">
              {loading
                ? "Please wait while we complete the authentication process..."
                : isLinking ? "Link successful! Redirecting..." : "Authentication successful! Redirecting..."}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default CallbackPage;
