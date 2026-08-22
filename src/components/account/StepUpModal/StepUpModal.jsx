// tuf-search: #StepUpModal #stepUpModal #account #stepUp
import React, { useCallback, useEffect, useState } from 'react';
import { Portal } from '@/components/common/Portal';
import { CloseButton } from '@/components/common/buttons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import CodeInput from '@/components/account/CodeInput/CodeInput';
import { useAuth } from '@/contexts/AuthContext';
import { hasAccountEmail } from '@/utils/accountEmail';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import './stepUpModal.css';

const SCOPE_ACTION_KEYS = {
  'email-change': 'emailChange',
  security: 'security',
};

/**
 * Shared confirmation modal: emailed code for verified accounts, or
 * password / OAuth reauth when adding a first email.
 */
const StepUpModal = ({ scope, user, onElevated, onCancel }) => {
  const { t } = useTranslation(['components', 'common', 'pages']);
  const navigate = useNavigate();
  const {
    stepUp,
    requestStepUpEmail,
    startOAuthReauth,
  } = useAuth();

  const hasVerified =
    hasAccountEmail(user) && hasFlag(user, permissionFlags.EMAIL_VERIFIED);
  const hasPassword = Boolean(user?.password);
  const needsFirstEmail = !hasVerified && scope === 'email-change';
  const blockedNeedsEmail = !hasVerified && scope !== 'email-change';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [codeRequested, setCodeRequested] = useState(false);

  useBodyScrollLock(true);

  const actionKey = SCOPE_ACTION_KEYS[scope] || 'security';
  const actionLabel = t(`stepUp.actions.${actionKey}`, {
    defaultValue: scope === 'email-change' ? 'change your email' : 'continue',
  });

  const requestCode = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const data = await requestStepUpEmail(scope);
      setMaskedEmail(data?.maskedEmail || '');
      setResendAvailableAt(data?.emailResendAvailableAt || null);
      setCodeRequested(true);
    } catch (err) {
      setCodeRequested(true);
      const codeName = err.response?.data?.code || err.code;
      const msg = err.response?.data?.message || err.message;
      if (codeName === 'EMAIL_REQUIRED') {
        setError(msg || t('stepUp.emailRequired'));
      } else if (codeName === 'RESEND_COOLDOWN') {
        // Not an error: a still-valid code was sent moments ago (possibly in a
        // previous session) — surface the countdown, keep the prompt intact.
        const retry = err.response?.data?.retryAfter;
        if (typeof retry === 'number') {
          setResendAvailableAt(new Date(Date.now() + retry).toISOString());
        }
        if (err.response?.data?.maskedEmail) {
          setMaskedEmail(err.response.data.maskedEmail);
        }
      } else {
        setError(msg || t('stepUp.sendFailed'));
      }
    } finally {
      setBusy(false);
    }
  }, [requestStepUpEmail, scope, t]);

  useEffect(() => {
    if (hasVerified && !codeRequested) {
      void requestCode();
    }
  }, [hasVerified, codeRequested, requestCode]);

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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    if (!code || code.length < 8) {
      setError(t('stepUp.codeRequired'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await stepUp({ code, scope });
      toast.success(t('stepUp.confirmed'));
      onElevated(data?.expiresIn);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setError(msg || t('stepUp.invalidCode'));
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordStepUp = async (e) => {
    e.preventDefault();
    if (hasPassword) {
      if (!password) {
        setError(t('stepUp.passwordRequired'));
        return;
      }
      setBusy(true);
      setError('');
      try {
        const data = await stepUp({ password, scope });
        toast.success(t('stepUp.confirmed'));
        onElevated(data?.expiresIn);
      } catch (err) {
        setError(err.response?.data?.message || err.message || t('stepUp.passwordFailed'));
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const linkedProviders = Array.isArray(user?.providers) ? user.providers : [];
      const oauthProvider =
        linkedProviders.find((p) => p.name === 'discord')?.name ||
        linkedProviders[0]?.name;
      if (!oauthProvider) {
        setError(t('stepUp.oauthFailed'));
        setBusy(false);
        return;
      }
      await startOAuthReauth(oauthProvider, scope);
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('stepUp.oauthFailed'));
      setBusy(false);
    }
  };

  const goAddEmail = () => {
    onCancel();
    navigate('/settings/account');
  };

  return (
    <Portal>
      <div className="step-up-modal-overlay" role="presentation" onClick={() => !busy && onCancel()}>
        <div
          className="step-up-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="step-up-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="step-up-modal__header">
            <h2 id="step-up-modal-title">{t('stepUp.title')}</h2>
            <CloseButton
              variant="inline"
              className="step-up-modal__close"
              onClick={onCancel}
              disabled={busy}
              aria-label={t('buttons.close', { ns: 'common' })}
            />
          </div>

          {blockedNeedsEmail ? (
            <div className="step-up-modal__body">
              <p className="step-up-modal__text">{t('stepUp.emailRequiredBody')}</p>
              <div className="step-up-modal__actions">
                <button type="button" className="step-up-modal__btn step-up-modal__btn--secondary" onClick={onCancel}>
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button type="button" className="step-up-modal__btn step-up-modal__btn--primary" onClick={goAddEmail}>
                  {t('stepUp.addEmail')}
                </button>
              </div>
            </div>
          ) : needsFirstEmail ? (
            <form className="step-up-modal__body" onSubmit={handlePasswordStepUp}>
              <p className="step-up-modal__text">
                {t('stepUp.firstEmailPrompt', { action: actionLabel })}
              </p>
              {hasPassword ? (
                <div className="step-up-modal__field">
                  <label htmlFor="step-up-password">{t('stepUp.currentPassword')}</label>
                  <input
                    id="step-up-password"
                    type="password"
                    autoComplete="current-password"
                    className="step-up-modal__input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                  />
                </div>
              ) : (
                <p className="step-up-modal__text">{t('stepUp.discordPrompt')}</p>
              )}
              {error ? <p className="step-up-modal__error">{error}</p> : null}
              <div className="step-up-modal__actions">
                <button type="button" className="step-up-modal__btn step-up-modal__btn--secondary" onClick={onCancel} disabled={busy}>
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button type="submit" className="step-up-modal__btn step-up-modal__btn--primary" disabled={busy}>
                  {busy ? '...' : hasPassword ? t('stepUp.continue') : t('stepUp.continueDiscord')}
                </button>
              </div>
            </form>
          ) : (
            <form className="step-up-modal__body" onSubmit={handleConfirmCode}>
              <p className="step-up-modal__text">
                {t('stepUp.codePrompt', {
                  action: actionLabel,
                  email: maskedEmail || t('stepUp.yourEmail'),
                })}
              </p>
              <CodeInput
                id="step-up-code"
                label={t('stepUp.codeLabel')}
                value={code}
                onChange={setCode}
                disabled={busy}
              />
              {error ? <p className="step-up-modal__error">{error}</p> : null}
              <div className="step-up-modal__actions">
                <button
                  type="button"
                  className="step-up-modal__btn step-up-modal__btn--secondary"
                  onClick={() => void requestCode()}
                  disabled={busy || resendSeconds > 0}
                >
                  {resendSeconds > 0
                    ? t('stepUp.resendIn', { seconds: resendSeconds })
                    : t('stepUp.resend')}
                </button>
                <button
                  type="submit"
                  className="step-up-modal__btn step-up-modal__btn--primary"
                  disabled={busy || code.length < 8}
                >
                  {busy ? '...' : t('stepUp.confirm')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Portal>
  );
};

export default StepUpModal;
