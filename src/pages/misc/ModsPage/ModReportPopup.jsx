// tuf-search: #ModReportPopup
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { Portal } from '@/components/common/Portal';
import { CloseButton } from '@/components/common/buttons';
import { CustomSelect } from '@/components/common/selectors';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { getRateLimitMessage } from '@/utils/rateLimitError';
import './modReportPopup.css';

const REASONS = ['deprecated', 'abuse', 'duplicate'];
const NOTE_MAX = 4000;
const VERSION_MAX = 64;

const EMPTY_FORM = {
  reason: 'deprecated',
  version: '',
  brokenEffect: '',
  note: '',
  targetUrl: '',
  mergeWhy: '',
};

function toPayload(form) {
  if (form.reason === 'deprecated') {
    return {
      reason: 'deprecated',
      version: form.version.trim(),
      brokenEffect: form.brokenEffect.trim(),
    };
  }
  if (form.reason === 'abuse') {
    return {reason: 'abuse', note: form.note.trim()};
  }
  return {
    reason: 'duplicate',
    targetUrl: form.targetUrl.trim(),
    mergeWhy: form.mergeWhy.trim(),
  };
}

function canSubmit(form) {
  if (form.reason === 'deprecated') {
    return Boolean(form.version.trim() && form.brokenEffect.trim());
  }
  if (form.reason === 'abuse') return Boolean(form.note.trim());
  return Boolean(form.targetUrl.trim() && form.mergeWhy.trim());
}

export default function ModReportPopup({ isOpen, mod, onClose }) {
  const { t } = useTranslation(['pages', 'common']);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    setForm(EMPTY_FORM);
    setSubmitting(false);
    const onKey = (event) => {
      if (event.key !== 'Escape' || submitting) return;
      if (document.querySelector('.custom-select-menu')) return;
      onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, submitting]);

  const reasonOptions = useMemo(
    () =>
      REASONS.map((reason) => ({
        value: reason,
        label: t(`mods.report.reasons.${reason}`),
      })),
    [t],
  );
  const selectedReason =
    reasonOptions.find((option) => option.value === form.reason) || reasonOptions[0];

  if (!isOpen || !mod?.slug) return null;

  const setField = (field) => (event) => {
    setForm((prev) => ({...prev, [field]: event.target.value}));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit(form) || submitting) return;
    setSubmitting(true);
    try {
      await api.post(routes.mods.report(mod.slug), toPayload(form));
      toast.success(t('mods.report.sent'));
      onClose?.();
    } catch (error) {
      toast.error(
        getRateLimitMessage(error) || error?.response?.data?.error || t('mods.report.failed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal mount="documentBody">
      <div className="mod-report-popup" role="presentation">
        <button
          type="button"
          className="mod-report-popup__backdrop"
          aria-label={t('buttons.cancel', { ns: 'common' })}
          disabled={submitting}
          onClick={() => {
            if (!submitting) onClose?.();
          }}
        />
        <form
          className="mod-report-popup__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mod-report-popup-title"
          onSubmit={submit}
        >
          <CloseButton
            variant="floating"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('buttons.close', { ns: 'common' })}
          />
          <h2 id="mod-report-popup-title" className="mod-report-popup__title">
            {t('mods.report.title', { name: mod.name })}
          </h2>
          <div className="mod-report-popup__field">
            <span>{t('mods.report.reason')}</span>
            <CustomSelect
              options={reasonOptions}
              value={selectedReason}
              onChange={(option) => {
                if (!option?.value) return;
                setForm((prev) => ({...prev, reason: option.value}));
              }}
              width="100%"
              isSearchable={false}
              isDisabled={submitting}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
          </div>
          {form.reason === 'deprecated' ? (
            <>
              <label className="mod-report-popup__field">
                <span>{t('mods.report.version')}</span>
                <input
                  type="text"
                  value={form.version}
                  onChange={setField('version')}
                  maxLength={VERSION_MAX}
                  disabled={submitting}
                  required
                />
              </label>
              <label className="mod-report-popup__field">
                <span>{t('mods.report.brokenEffect')}</span>
                <textarea
                  value={form.brokenEffect}
                  onChange={setField('brokenEffect')}
                  maxLength={NOTE_MAX}
                  disabled={submitting}
                  rows={4}
                  required
                />
              </label>
            </>
          ) : null}
          {form.reason === 'abuse' ? (
            <label className="mod-report-popup__field">
              <span>{t('mods.report.note')}</span>
              <textarea
                value={form.note}
                onChange={setField('note')}
                maxLength={NOTE_MAX}
                disabled={submitting}
                rows={4}
                required
              />
            </label>
          ) : null}
          {form.reason === 'duplicate' ? (
            <>
              <label className="mod-report-popup__field">
                <span>{t('mods.report.targetUrl')}</span>
                <input
                  type="url"
                  value={form.targetUrl}
                  onChange={setField('targetUrl')}
                  disabled={submitting}
                  required
                />
              </label>
              <label className="mod-report-popup__field">
                <span>{t('mods.report.mergeWhy')}</span>
                <textarea
                  value={form.mergeWhy}
                  onChange={setField('mergeWhy')}
                  maxLength={NOTE_MAX}
                  disabled={submitting}
                  rows={4}
                  required
                />
              </label>
            </>
          ) : null}
          <div className="mod-report-popup__actions">
            <button
              type="button"
              className="btn-fill-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              type="submit"
              className="btn-fill-danger"
              disabled={submitting || !canSubmit(form)}
            >
              {t('mods.report.submit')}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
