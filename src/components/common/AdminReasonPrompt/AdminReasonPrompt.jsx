// tuf-search: #AdminReasonPrompt #adminReasonPrompt
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import './adminReasonPrompt.css';

const REASON_MAX_LENGTH = 4000;
const TEXTAREA_MIN_PX = 72;

export default function AdminReasonPrompt({
  isOpen,
  title,
  message,
  confirmLabel,
  submitting = false,
  presets = [],
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation('common');
  const textareaRef = useRef(null);
  const [reason, setReason] = useState('');
  const hasPresets = presets.length > 0;

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

  if (!isOpen) return null;

  return (
    <PopupShell
      onClose={onCancel}
      closeDisabled={submitting}
      overlayClassName="admin-reason-prompt"
      panelClassName="admin-reason-prompt__panel"
      ariaLabelledBy="admin-reason-prompt-title"
      mount="documentBody"
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
          <div className="admin-reason-prompt__field">
            <div className="admin-reason-prompt__label-row">
              <label
                htmlFor="admin-reason-prompt-textarea"
                className="admin-reason-prompt__label"
              >
                {t('adminReasonPrompt.reason')}
              </label>
              {hasPresets && (
                /* selector-reconciliation: skip — low-profile native preset paste */
                <select
                  data-selector-skip=""
                  className="admin-reason-prompt__preset"
                  value=""
                  disabled={submitting}
                  aria-label="Preset"
                  onChange={(event) => {
                    const selected = presets.find((preset) => preset.id === event.target.value);
                    if (selected?.text) setReason(selected.text);
                  }}
                >
                  <option value="">Preset</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <textarea
              id="admin-reason-prompt-textarea"
              ref={textareaRef}
              className="admin-reason-prompt__textarea"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('adminReasonPrompt.placeholder')}
              maxLength={REASON_MAX_LENGTH}
              disabled={submitting}
              rows={3}
            />
          </div>
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
    </PopupShell>
  );
}
