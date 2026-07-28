// tuf-search: #ChangeEmailPopup #changeEmailPopup #popups #users #changeEmail
import React, { useState, useEffect, useRef } from 'react';
import { Portal } from '@/components/common/Portal';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { hasAccountEmail } from '@/utils/accountEmail';
import { useElevation } from '@/contexts/ElevationContext';
import './changeEmailPopup.css';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Modal: set pending email after elevation (code modal or first-email password/OAuth).
 */
const ChangeEmailPopup = ({
  isOpen,
  onClose,
  currentEmail,
  changeEmail,
}) => {
  const { t } = useTranslation(['pages', 'common']);
  const { requireElevation } = useElevation();
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const elevatingRef = useRef(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setReady(false);
      elevatingRef.current = false;
      return undefined;
    }

    setNewEmail('');
    setConfirmNewEmail('');
    setIsSaving(false);

    if (elevatingRef.current) return undefined;
    elevatingRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        await requireElevation('email-change', async () => {});
        if (!cancelled) setReady(true);
      } catch (err) {
        if (err?.code === 'ELEVATION_CANCELLED') {
          onClose();
          return;
        }
        toast.error(err?.response?.data?.message || err?.message || t('editProfile.emailChange.failed'));
        onClose();
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally only re-run when the popup opens/closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !ready) return null;

  const isSettingEmail = !hasAccountEmail({ email: currentEmail });

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
      await requireElevation('email-change', () => changeEmail(next));
      toast.success(
        isSettingEmail
          ? t('editProfile.emailChange.setSuccess')
          : t('editProfile.emailChange.success')
      );
      onClose();
    } catch (error) {
      if (error?.code === 'ELEVATION_CANCELLED') return;
      const status = error.response?.status;
      const msg = error.response?.data?.message;
      const code = error.response?.data?.code;
      if (status === 403 && code === 'STEP_UP_REQUIRED') {
        toast.error(t('editProfile.emailChange.stepUpAgain', { defaultValue: 'Please confirm again' }));
      } else if (status === 403 && code === 'EMAIL_REQUIRED') {
        toast.error(msg || t('editProfile.emailChange.emailRequired', { defaultValue: 'Verify an email first' }));
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
              {isSettingEmail
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
        </div>
      </div>
    </Portal>
  );
};

export default ChangeEmailPopup;
