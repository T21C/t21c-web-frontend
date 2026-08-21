// tuf-search: #AdminReasonPrompt #adminReasonPrompt
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Portal } from '@/components/common/Portal';
import { CloseButton } from '@/components/common/buttons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import './adminReasonPrompt.css';

const REASON_MAX_LENGTH = 4000;
const TEXTAREA_MIN_PX = 72;

export default function AdminReasonPrompt({
  isOpen,
  title,
  message,
  confirmLabel,
  submitting = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation('common');
  const textareaRef = useRef(null);
  const [reason, setReason] = useState('');

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    setReason('');
    const id = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el || !isOpen) return;
    el.style.height = 'auto';
    const maxPx = window.innerHeight * 0.4;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, TEXTAREA_MIN_PX), maxPx)}px`;
  }, [reason, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !submitting) {
        onCancel?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel, submitting]);

  if (!isOpen) return null;

  return (
    <Portal mount="documentBody">
      <div className="admin-reason-prompt" role="presentation">
        <button
          type="button"
          className="admin-reason-prompt__backdrop"
          aria-label={t('buttons.cancel')}
          disabled={submitting}
          onClick={() => {
            if (!submitting) onCancel?.();
          }}
        />
        <div
          className="admin-reason-prompt__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-reason-prompt-title"
        >
          <CloseButton
            variant="floating"
            onClick={onCancel}
            disabled={submitting}
            aria-label={t('buttons.close')}
          />
          <h2 id="admin-reason-prompt-title" className="admin-reason-prompt__title">
            {title}
          </h2>
          {message ? (
            <p className="admin-reason-prompt__message">{message}</p>
          ) : null}
          <label className="admin-reason-prompt__field">
            <span className="admin-reason-prompt__label">{t('adminReasonPrompt.reason')}</span>
            <textarea
              ref={textareaRef}
              className="admin-reason-prompt__textarea"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('adminReasonPrompt.placeholder')}
              maxLength={REASON_MAX_LENGTH}
              disabled={submitting}
              rows={3}
            />
          </label>
          <div className="admin-reason-prompt__actions">
            <button
              type="button"
              className="admin-reason-prompt__cancel btn-fill-secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              {t('buttons.cancel')}
            </button>
            <button
              type="button"
              className="admin-reason-prompt__confirm btn-fill-danger"
              onClick={() => onConfirm?.(reason.trim())}
              disabled={submitting}
            >
              {confirmLabel || t('buttons.confirm')}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
