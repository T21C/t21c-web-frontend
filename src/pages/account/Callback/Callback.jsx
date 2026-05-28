// tuf-search: #Callback #account #callback
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from "@/contexts/AuthContext";
import api from '@/utils/api';
import { routes } from '@/api/routes';
import './callback.css';

const BILLING_POLL_INTERVAL_MS = 1500;
const BILLING_POLL_TIMEOUT_MS = 25000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Survives React 18 Strict Mode: skip duplicate billing return handler runs for the same URL. */
const billingCallbackLocks = new Map();

function readBillingReturnParams(search) {
  const urlParams = new URLSearchParams(search);
  const sessionId = urlParams.get('session_id');
  return {
    sessionId,
    isBillingReturn: Boolean(sessionId && String(sessionId).trim().length > 0),
    lockKey: `stripe|${sessionId || ''}`,
  };
}

function initialBillingState(search) {
  const { sessionId } = readBillingReturnParams(search);
  return {
    sessionId: sessionId || null,
  };
}

const CallbackPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('pages');
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const billingFromUrl = readBillingReturnParams(search);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [mode, setMode] = useState(() => (billingFromUrl.isBillingReturn ? 'billing' : 'oauth'));
  const [billingState, setBillingState] = useState(() => initialBillingState(search));
  const { fetchUser, getOriginUrl } = useAuth();

  /** OAuth branch only: stable empty-string ref so finally doesn't read stale state `error`. */
  const oauthErrorRef = useRef('');

  const handleContinue = () => {
    setRedirecting(true);
    if (mode === 'billing') {
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

      const sessionId = urlParams.get('session_id');
      const isBillingReturn = Boolean(sessionId && String(sessionId).trim().length > 0);

      if (isBillingReturn) {
        setMode('billing');
        setBillingState({ sessionId: sessionId || null });

        const lockKey = `stripe|${sessionId || ''}`;
        if (billingCallbackLocks.get(lockKey)) {
          setLoading(false);
          setRedirecting(true);
          navigateTimerId = window.setTimeout(() => {
            if (!cancelled) navigate('/settings/billing', { replace: true });
          }, 400);
          return;
        }
        billingCallbackLocks.set(lockKey, true);

        try {
          if (!cancelled) await fetchUser(true, { silent: true });
        } catch {
          /* keep going; webhook may still arrive */
        }

        const startedAt = Date.now();
        let confirmed = false;
        let pollError = '';

        while (!cancelled && Date.now() - startedAt < BILLING_POLL_TIMEOUT_MS) {
          try {
            const { data } = await api.get(routes.billingV3.stripe.checkoutStatus(), {
              params: { session_id: sessionId },
            });
            if (data?.fulfillmentReady) {
              confirmed = true;
              break;
            }
            if (data?.fulfillmentFailed) {
              pollError = 'fulfillment_failed';
              break;
            }
          } catch (e) {
            const status = e?.response?.status;
            const code = e?.response?.data?.error?.code;
            if (status === 403 && code === 'CHECKOUT_SESSION_FORBIDDEN') {
              pollError = 'session_forbidden';
              break;
            }
            if (status === 404 && code === 'CHECKOUT_SESSION_NOT_FOUND') {
              pollError = 'session_not_found';
              break;
            }
            if (status === 404 && code === 'TUF_STELLAR_DISABLED') {
              break;
            }
            /* network blip; keep polling */
          }
          await wait(BILLING_POLL_INTERVAL_MS);
        }

        if (cancelled) return;

        try {
          await fetchUser(true, { silent: true });
        } catch {
          /* ignore */
        }

        if (cancelled) return;

        if (pollError === 'session_forbidden') {
          setError(t('billing.callback.sessionForbidden'));
          setLoading(false);
          return;
        }
        if (pollError === 'session_not_found') {
          setError(t('billing.callback.sessionNotFound'));
          setLoading(false);
          return;
        }
        if (pollError === 'fulfillment_failed') {
          setError(t('billing.callback.fulfillmentFailed'));
          setLoading(false);
          return;
        }

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
        const link = linking ? routes.auth.oauthLink(provider) : routes.auth.oauthCallback(provider);
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
      const sid = urlParams.get('session_id');
      const lk = `stripe|${sid || ''}`;
      if (lk !== 'stripe|') billingCallbackLocks.delete(lk);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mode === 'billing') {
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
              {billingState.sessionId && (
                <div className="callback-page__checkout-session-meta">
                  <span className="callback-page__checkout-session-label">
                    {t('billing.callback.session', { defaultValue: 'Checkout session' })}
                  </span>
                  <code className="callback-page__checkout-session-id">{billingState.sessionId}</code>
                </div>
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
