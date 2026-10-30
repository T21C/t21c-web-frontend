// tuf-search: #OwnPassEditPopup #ownPassEditPopup #popups #passes
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { validateFeelingRating } from '@/utils/Utility';
import { Tooltip } from '@/components/common/display/Tooltip';
import { CloseButton } from '@/components/common/buttons';
import { PopupShell } from '@/components/common/PopupShell';
import { useUnsavedClose } from '@/hooks/useUnsavedClose';
import { PassKeyboardBindField, usePassKeyboardBind } from '@/components/common/cores/PassKeyboardBindField/PassKeyboardBindField';
import '@/components/common/cores/PassCoreForm/PassCoreForm.css';
import './ownpasseditpopup.css';

const FEELING_MAX = 500;
const EXPECTED_MAX = 1000;
const DETAILS_MAX = 2000;
const KEY_COUNT_MAX = 64;

function ownerKeyCount(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return { valid: true, value: null };
  if (!/^\d+$/.test(trimmed)) return { valid: false, value: null };
  const count = Number(trimmed);
  if (count < 1 || count > KEY_COUNT_MAX) return { valid: false, value: null };
  return { valid: true, value: count };
}

export const OwnPassEditPopup = ({ pass, onClose, onUpdate }) => {
  const { t } = useTranslation(['pages', 'components', 'common']);
  const [feelingRating, setFeelingRating] = useState(pass.feelingRating || '');
  const [expectedRating, setExpectedRating] = useState(pass.expectedRating || '');
  const [details, setDetails] = useState(pass.details || '');
  const [keyCount, setKeyCount] = useState(pass.keyCount != null ? String(pass.keyCount) : '');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitAttempt, setSubmitAttempt] = useState(false);

  const keyboardBind = usePassKeyboardBind({
    pass,
    playerId: pass.playerId || pass.player?.id || null,
    keyCount,
    vidUploadTime: pass.vidUploadTime,
  });

  const { requestClose } = useUnsavedClose({
    isDirty: dirty,
    onClose,
  });

  const feelingTrimmed = feelingRating.trim();
  const expectedTrimmed = expectedRating.trim();
  const feelingFormatOk = !feelingTrimmed || validateFeelingRating(feelingRating);
  const expectedFormatOk = !expectedTrimmed || validateFeelingRating(expectedRating);
  const keyCountState = ownerKeyCount(keyCount);
  const feelingMissing = !feelingTrimmed;

  const markDirty = (setter) => (value) => {
    setDirty(true);
    setter(value);
  };

  const handleSave = async () => {
    if (feelingMissing || !keyCountState.valid) {
      setSubmitAttempt(true);
      toast.error(t('passPopups.edit.alert.form', { ns: 'components' }));
      return;
    }

    const toastId = toast.loading(t('loading.saving', { ns: 'common' }));
    setSaving(true);
    try {
      await api.patch(routes.database.passes.self(pass.id), {
        feelingRating: feelingTrimmed,
        expectedRating: expectedTrimmed || null,
        details,
        keyCount: keyCountState.value,
      });
      if (keyboardBind.lanePeriodId !== keyboardBind.initialBindId) {
        await api.patch(routes.playersV3.mePassKeyboardSetup(pass.id), {
          lanePeriodId: keyboardBind.lanePeriodId || null,
        });
      }
      toast.success(t('pass.updated', { ns: 'common' }), { id: toastId });
      setDirty(false);
      if (onUpdate) await onUpdate();
    } catch (err) {
      console.error('Error updating own pass:', err);
      toast.error(
        err.response?.data?.error || err.message || t('pass.errors.updateFailed', { ns: 'common' }),
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  };

  const renderRatingField = ({
    name,
    value,
    onValue,
    placeholderKey,
    tooltipKey,
    tooltipId,
    formatValid,
    showInvalid,
    maxLength,
  }) => (
    <div className="info-input-field rating-field">
      <input
        type="text"
        autoComplete="off"
        placeholder={t(placeholderKey, { ns: 'components' })}
        name={name}
        value={value}
        maxLength={maxLength}
        disabled={saving}
        onChange={(event) => onValue(event.target.value)}
        className={showInvalid ? 'field-invalid-dark' : undefined}
      />
      <div
        className="fr-tooltip-icon"
        data-tooltip-id={formatValid ? '' : tooltipId}
        data-tooltip-content={t(tooltipKey, { ns: 'components' })}
      >
        <span style={{ visibility: formatValid ? 'hidden' : 'visible' }}>?</span>
        <Tooltip
          className="tooltip"
          id={tooltipId}
          place="bottom-end"
          effect="solid"
          style={{
            maxWidth: '300px',
            zIndex: 100,
            background: 'var(--color-black)',
          }}
        />
      </div>
    </div>
  );

  return (
    <PopupShell
      onClose={requestClose}
      closeDisabled={saving}
      overlayClassName="own-pass-edit-overlay"
      panelClassName="own-pass-edit"
      ariaLabelledBy="own-pass-edit-title"
    >
      <CloseButton
        variant="floating"
        className="own-pass-edit__close"
        onClick={requestClose}
        disabled={saving}
        aria-label={t('buttons.close', { ns: 'common' })}
      />
      <div className="pass-core-form">
        <div className="info">
          <h1 id="own-pass-edit-title">{t('passDetail.ownEdit.title')}</h1>
          <div className="info-input info-input-grid">
            {renderRatingField({
              name: 'feelingRating',
              value: feelingRating,
              onValue: markDirty(setFeelingRating),
              placeholderKey: 'passPopups.edit.form.submInfo.feelDiff',
              tooltipKey: 'passPopups.edit.feelingTooltip',
              tooltipId: 'own-pass-feeling-tooltip',
              formatValid: feelingFormatOk,
              showInvalid: submitAttempt && feelingMissing,
              maxLength: FEELING_MAX,
            })}
            {renderRatingField({
              name: 'expectedRating',
              value: expectedRating,
              onValue: markDirty(setExpectedRating),
              placeholderKey: 'passPopups.edit.form.submInfo.expectedDiff',
              tooltipKey: 'passPopups.edit.expectedTooltip',
              tooltipId: 'own-pass-expected-tooltip',
              formatValid: expectedFormatOk,
              showInvalid: false,
              maxLength: EXPECTED_MAX,
            })}
            <div className="info-input-field keycount-field">
              <input
                type="number"
                min={1}
                max={KEY_COUNT_MAX}
                step={1}
                autoComplete="off"
                placeholder={t('passPopups.edit.form.submInfo.keyCount', { ns: 'components' })}
                name="keyCount"
                value={keyCount}
                disabled={saving}
                onChange={(event) => markDirty(setKeyCount)(event.target.value)}
                className={submitAttempt && !keyCountState.valid ? 'field-invalid-dark' : undefined}
              />
              <div
                className="fr-tooltip-icon"
                data-tooltip-id="own-pass-keycount-tooltip"
                data-tooltip-content={t('passPopups.edit.keyCountTooltip', { ns: 'components' })}
              >
                <span>?</span>
                <Tooltip
                  className="tooltip"
                  id="own-pass-keycount-tooltip"
                  place="bottom-end"
                  effect="solid"
                  style={{
                    maxWidth: '300px',
                    zIndex: 100,
                    background: 'var(--color-black)',
                  }}
                />
              </div>
            </div>
          </div>
          <label className="pass-core-form__details">
            <span>{t('passPopups.edit.form.submInfo.details', { ns: 'components' })}</span>
            <textarea
              name="details"
              rows={4}
              maxLength={DETAILS_MAX}
              value={details}
              disabled={saving}
              onChange={(event) => markDirty(setDetails)(event.target.value)}
              placeholder={t('passPopups.edit.form.submInfo.detailsPlaceholder', { ns: 'components' })}
            />
          </label>
          <PassKeyboardBindField
            bind={keyboardBind}
            onChange={(nextId) => {
              setDirty(true);
              keyboardBind.setLanePeriodId(nextId);
            }}
          />
          <div className="own-pass-edit__actions">
            <button
              type="button"
              className="btn-fill-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? t('loading.saving', { ns: 'common' })
                : t('buttons.save', { ns: 'common' })}
            </button>
            <button
              type="button"
              className="btn-fill-neutral-dark"
              onClick={requestClose}
              disabled={saving}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
          </div>
        </div>
      </div>
    </PopupShell>
  );
};
