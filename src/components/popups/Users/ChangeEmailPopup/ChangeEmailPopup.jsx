// tuf-search: #ChangeEmailPopup #changeEmailPopup #popups #users #changeEmail
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getPortalRoot } from '@/utils/portalRoot';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import './changeEmailPopup.css';

/** Align with server registration / auth email validation */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Modal to change account email (dedicated API). Not tied to profile PUT /me.
 */
const ChangeEmailPopup = ({ isOpen, onClose, currentEmail, changeEmail }) => {
  const { t } = useTranslation(['pages', 'common']);
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
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

  const handleSubmit = async (e) => {
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
    if (next === current) {
      toast.error(t('editProfile.emailChange.unchanged'));
      return;
    }

    setIsSaving(true);
    try {
      await changeEmail(next);
      toast.success(t('editProfile.emailChange.success'));
      onClose();
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.message;
      if (status === 429) {
        toast.error(msg || t('editProfile.emailChange.rateLimited'));
      } else {
        toast.error(msg || t('editProfile.emailChange.failed'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
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
          <h2 id="change-email-popup-title">{t('editProfile.emailChange.title')}</h2>
          <CloseButton
            variant="inline"
            className="change-email-popup-close"
            onClick={onClose}
            disabled={isSaving}
            aria-label={t('buttons.close', { ns: 'common' })}
          />
        </div>

        <p className="change-email-popup-current">
          <span className="change-email-popup-current-label">{t('editProfile.emailChange.current')}</span>
          <span className="change-email-popup-current-value">{currentEmail || '—'}</span>
        </p>

        <form className="change-email-popup-form" onSubmit={handleSubmit}>
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
            <label htmlFor="change-email-confirm">{t('editProfile.emailChange.confirm')}</label>
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
            <button type="submit" className="change-email-popup-btn change-email-popup-btn-primary" disabled={isSaving}>
              {isSaving ? t('editProfile.emailChange.updating') : t('editProfile.emailChange.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    getPortalRoot()
  );
};

export default ChangeEmailPopup;
