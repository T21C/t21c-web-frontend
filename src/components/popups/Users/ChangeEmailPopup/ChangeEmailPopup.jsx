// tuf-search: #ChangeEmailPopup #changeEmailPopup #popups #users #changeEmail
import React, { useState, useEffect } from 'react';
import { Portal } from '@/components/common/Portal';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { hasAccountEmail } from '@/utils/accountEmail';
import './changeEmailPopup.css';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Modal: step-up (password or OAuth) then set pending email.
 */
const ChangeEmailPopup = ({
  isOpen,
  onClose,
  currentEmail,
  hasPassword,
  changeEmail,
  stepUp,
  startOAuthReauth,
}) => {
  const { t } = useTranslation(['pages', 'common']);
  const [step, setStep] = useState('reauth'); // reauth | email
  const [password, setPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      let granted = false;
      try {
        granted = sessionStorage.getItem('stepUpGranted') === '1';
        if (granted) sessionStorage.removeItem('stepUpGranted');
      } catch {
        /* ignore */
      }
      setStep(granted ? 'email' : 'reauth');
      setPassword('');
      setNewEmail('');
      setConfirmNewEmail('');
      setIsSaving(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSettingEmail = !hasAccountEmail({ email: currentEmail });

  const handleStepUp = async (e) => {
    e.preventDefault();
    if (!hasPassword) {
      try {
        setIsSaving(true);
        await startOAuthReauth('discord');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to start re-authentication');
        setIsSaving(false);
      }
      return;
    }
    if (!password) {
      toast.error('Password is required');
      return;
    }
    setIsSaving(true);
    try {
      await stepUp(password);
      setStep('email');
      toast.success('Identity confirmed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Incorrect password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    const next = newEmail.trim().toLowerCase();
    const confirm = confirmNewEmail.trim().toLowerCase();
    const current = (currentEmail || '').trim().toLowerCase();

    if (!next) {
      toast.error(t('editProfile.emailChange.empty'));
      return;
    }
    if (!EMAIL_REGEX.test(next)) {
      toast.error(t('editProfile.emailChange.invalidFormat'));
      return;
    }
    if (next !== confirm) {
      toast.error(t('editProfile.emailChange.mismatch'));
      return;
    }
    if (!isSettingEmail && next === current) {
      toast.error(t('editProfile.emailChange.unchanged'));
      return;
    }

    setIsSaving(true);
    try {
      await changeEmail(next);
      toast.success(
        isSettingEmail
          ? t('editProfile.emailChange.setSuccess')
          : t('editProfile.emailChange.success')
      );
      onClose();
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.message;
      const code = error.response?.data?.code;
      if (status === 403 && code === 'STEP_UP_REQUIRED') {
        setStep('reauth');
        toast.error('Please confirm your identity again');
      } else if (status === 429) {
        toast.error(msg || t('editProfile.emailChange.rateLimited'));
      } else {
        toast.error(msg || t('editProfile.emailChange.failed'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Portal>
      <div
        className="change-email-popup-overlay"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="change-email-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-email-popup-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="change-email-popup-header">
            <h2 id="change-email-popup-title">
              {step === 'reauth'
                ? 'Confirm it\'s you'
                : isSettingEmail
                  ? t('editProfile.emailChange.setTitle')
                  : t('editProfile.emailChange.title')}
            </h2>
            <CloseButton
              variant="inline"
              className="change-email-popup-close"
              onClick={onClose}
              disabled={isSaving}
              aria-label={t('buttons.close', { ns: 'common' })}
            />
          </div>

          {step === 'reauth' ? (
            <form className="change-email-popup-form" onSubmit={handleStepUp}>
              <p className="change-email-popup-current">
                For security, confirm your identity before changing email.
              </p>
              {hasPassword ? (
                <div className="change-email-popup-field">
                  <label htmlFor="change-email-password">Current password</label>
                  <input
                    id="change-email-password"
                    type="password"
                    autoComplete="current-password"
                    className="change-email-popup-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              ) : (
                <p className="change-email-popup-current">
                  This account uses Discord. You will re-authenticate with Discord to continue.
                </p>
              )}
              <div className="change-email-popup-actions">
                <button
                  type="button"
                  className="change-email-popup-btn change-email-popup-btn-secondary"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button
                  type="submit"
                  className="change-email-popup-btn change-email-popup-btn-primary"
                  disabled={isSaving}
                >
                  {isSaving
                    ? '...'
                    : hasPassword
                      ? 'Continue'
                      : 'Continue with Discord'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="change-email-popup-current">
                <span className="change-email-popup-current-label">
                  {t('editProfile.emailChange.current')}
                </span>
                <span className="change-email-popup-current-value">
                  {isSettingEmail
                    ? t('editProfile.emailChange.noEmailOnFile')
                    : currentEmail}
                </span>
              </p>
              <form className="change-email-popup-form" onSubmit={handleSubmitEmail}>
                <div className="change-email-popup-field">
                  <label htmlFor="change-email-new">{t('editProfile.emailChange.new')}</label>
                  <input
                    id="change-email-new"
                    type="email"
                    autoComplete="email"
                    className="change-email-popup-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="change-email-popup-field">
                  <label htmlFor="change-email-confirm">
                    {t('editProfile.emailChange.confirm')}
                  </label>
                  <input
                    id="change-email-confirm"
                    type="email"
                    autoComplete="email"
                    className="change-email-popup-input"
                    value={confirmNewEmail}
                    onChange={(e) => setConfirmNewEmail(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="change-email-popup-actions">
                  <button
                    type="button"
                    className="change-email-popup-btn change-email-popup-btn-secondary"
                    onClick={onClose}
                    disabled={isSaving}
                  >
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                  <button
                    type="submit"
                    className="change-email-popup-btn change-email-popup-btn-primary"
                    disabled={isSaving}
                  >
                    {isSaving
                      ? t('editProfile.emailChange.updating')
                      : isSettingEmail
                        ? t('editProfile.emailChange.setSubmit')
                        : t('editProfile.emailChange.submit')}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
};

export default ChangeEmailPopup;
