import { routes } from '@/api/routes';
// tuf-search: #EditPassPopup #editPassPopup #popups #passes #editPass
import './editpasspopup.css';
import { useTranslation } from 'react-i18next'; 
import { useAuth } from '@/contexts/AuthContext';
import { formatCreatorDisplay, formatDateShort, normalizeKeyCount } from '@/utils/Utility';
import placeholder from '@/assets/placeholder/4.png';
import { FetchIcon } from '@/components/common/icons';
import { useNavigate } from 'react-router-dom';
import { PlayerInput } from '@/components/common/selectors';
import { useEffect, useMemo, useState } from 'react';
import api from "@/utils/api";
import toast from 'react-hot-toast';
import { PassCoreForm } from '@/components/common/cores/PassCoreForm/PassCoreForm';
import { usePassCoreForm } from '@/components/common/cores/PassCoreForm/usePassCoreForm';
import { CustomSelect } from '@/components/common/selectors';
import { formatKeybind } from '@/utils/keyboards/keys';
import { truncateString } from '@/utils/Utility';
import { CloseButton } from '@/components/common/buttons';
import { PopupShell } from '@/components/common/PopupShell';
import { AdminReasonPrompt } from '@/components/common/AdminReasonPrompt';
import { useUnsavedClose } from '@/hooks/useUnsavedClose';

export const EditPassPopup = ({ pass, onClose, onUpdate }) => {
  const { t, i18n } = useTranslation(['components', 'pages', 'common']);

  const initialFormState = {
    levelId: pass.levelId.toString() || '',
    videoLink: pass.videoLink || '',
    speed: pass.speed || '1',
    playerId: pass.playerId || '',
    leaderboardName: pass.player.name || '',
    feelingRating: pass.feelingRating || '',
    expectedRating: pass.expectedRating || '',
    keyCount: pass.keyCount != null ? String(pass.keyCount) : '',
    ePerfect: pass.judgements.ePerfect.toString() || '',
    perfectMinus: (pass.judgements.perfectMinus ?? 0).toString(),
    perfect: pass.judgements.perfect.toString() || '',
    perfectPlus: (pass.judgements.perfectPlus ?? 0).toString(),
    lPerfect: pass.judgements.lPerfect.toString() || '',
    tooEarly: pass.judgements.earlyDouble.toString() || '',
    early: pass.judgements.earlySingle.toString() || '',
    late: pass.judgements.lateSingle.toString() || '',
    isNoHold: pass.isNoHoldTap || false,
    isAnnounced: pass.isAnnounced || false,
    isDuplicate: pass.isDuplicate || false,
    isAdofaiV2: pass.isAdofaiV2 || false,
    adofaiVersion: pass.adofaiVersion != null ? Number(pass.adofaiVersion) : (pass.isAdofaiV2 ? 1 : 2),
    isXPerfectMode: !!pass.isXPerfectMode,
    passMetaFlags: pass.passMetaFlags ?? 0,
    vidUploadTime: pass.vidUploadTime || new Date().toISOString()
  };
  const { user } = useAuth();
  const [submission, setSubmission] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialBindId =
    pass.keyboardSetup?.source === 'override' && pass.keyboardSetup?.lanePeriodId
      ? String(pass.keyboardSetup.lanePeriodId)
      : '';
  const [bindOptions, setBindOptions] = useState([]);
  const [lanePeriodId, setLanePeriodId] = useState(initialBindId);

  const navigate = useNavigate();

  const {
    form,
    setForm,
    submitAttempt,
    setSubmitAttempt,
    isFormValid,
    isFormValidDisplay,
    isValidFeelingRating,
    isValidExpectedRating,
    isValidKeyCount,
    isValidSpeed,
    isValidTimestamp,
    level,
    levelLoading,
    videoDetail,
    videoLinkResolving,
    accuracy,
    score,
    handleInputChange,
    handleAdofaiVersionChange,
  } = usePassCoreForm({
    mode: "edit",
    initialForm: initialFormState,
    isUDiffLevel: (lvl) => (lvl?.diffId ?? 0) >= 41,
  });

  const { requestClose } = useUnsavedClose({
    isDirty: hasUnsavedChanges,
    onClose,
  });

  const bindPlayerId = Number(form.playerId) || pass.playerId || pass.player?.id || null;

  useEffect(() => {
    const originalId = Number(pass.playerId || pass.player?.id || 0);
    if (bindPlayerId && originalId && Number(bindPlayerId) !== originalId) {
      setLanePeriodId('');
    }
  }, [bindPlayerId, pass.playerId, pass.player?.id]);

  useEffect(() => {
    if (!bindPlayerId) {
      setBindOptions([]);
      return undefined;
    }
    let cancelled = false;
    api.get(routes.playersV3.keyboardSetups(bindPlayerId))
      .then(({ data }) => {
        if (cancelled) return;
        const options = [];
        for (const rig of data?.rigs || []) {
          for (const lane of rig.lanes || []) {
            for (const period of lane.periods || []) {
              if (period.isGap || !Array.isArray(period.keys) || !period.keys.length) continue;
              const since = period.sinceDate
                ? t('profile.keyboards.since', { date: formatDateShort(period.sinceDate, i18n.language) })
                : null;
              options.push({
                value: String(period.id),
                keyCount: lane.keyCount,
                label: [
                  rig.name || t('profile.keyboards.rig'),
                  (typeof lane.name === "string" && lane.name.trim()) || `${lane.keyCount}K`,
                  since,
                  formatKeybind(period.keys),
                ]
                  .filter(Boolean)
                  .join(' · '),
              });
            }
          }
        }
        setBindOptions(options);
      })
      .catch(() => {
        if (!cancelled) setBindOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [bindPlayerId, t]);

  const bindSelectOptions = useMemo(() => {
    const keyCount = Number(form.keyCount);
    const sorted = [...bindOptions].sort((left, right) => {
      const leftMatch = left.keyCount === keyCount ? 0 : 1;
      const rightMatch = right.keyCount === keyCount ? 0 : 1;
      return leftMatch - rightMatch || left.keyCount - right.keyCount;
    });
    return [
      { value: '', label: t('profile.keyboards.autoBind') },
      ...sorted,
    ];
  }, [bindOptions, form.keyCount, t]);

  const handleUserInputChange = (e) => {
    setHasUnsavedChanges(true);
    handleInputChange(e);
  };

  const handleUserAdofaiVersionChange = (value) => {
    setHasUnsavedChanges(true);
    handleAdofaiVersionChange(value);
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  const toastId = toast.loading(t('loading.saving', { ns: 'common' }));
  
  if (!user) {
    console.error("no user");
    toast.error(t('passPopups.edit.alert.login'), { id: toastId });
    return;
  }

  // Check if player is selected
  if (!form.playerId) {
    toast.error(t('pass.errors.playerRequired', { ns: 'common' }), { id: toastId });
    return;
  }

  if (!isFormValid || (typeof isFormValid === "object" && Object.values(isFormValid).some((ok) => !ok))) {
    setSubmitAttempt(true);
    toast.error(t('passPopups.edit.alert.form'), { id: toastId });
    console.error("incomplete form, returning");
    return;
  }

  setSubmission(true);

  try {
    const updateData = {
      // Required fields from the API
      levelId: parseInt(form.levelId),
      playerId: form.playerId,
      speed: parseFloat(form.speed) >= 1 ? parseFloat(form.speed) : 1,
      feelingRating: form.feelingRating,
      expectedRating: form.expectedRating?.trim() || null,
      keyCount: normalizeKeyCount(form.keyCount),
      vidTitle: pass.vidTitle || level?.song || '',
      videoLink: form.videoLink,
      vidUploadTime: form.vidUploadTime,
      isNoHoldTap: form.isNoHold,
      isAnnounced: form.isAnnounced,
      isDuplicate: form.isDuplicate,
      isAdofaiV2: form.adofaiVersion === 1,
      adofaiVersion: form.adofaiVersion,
      isXPerfectMode: !!form.isXPerfectMode && form.adofaiVersion === 3,

      judgements: {
        earlyDouble: parseInt(form.tooEarly) || 0,
        earlySingle: parseInt(form.early) || 0,
        ePerfect: parseInt(form.ePerfect) || 0,
        perfectMinus: parseInt(form.perfectMinus) || 0,
        perfect: parseInt(form.perfect) || 0,
        perfectPlus: parseInt(form.perfectPlus) || 0,
        lPerfect: parseInt(form.lPerfect) || 0,
        lateSingle: parseInt(form.late) || 0,
        lateDouble: 0
      }
    };

    
    const response = await api.put(
      `${routes.database.passes.root()}/${pass.id}`,
      updateData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data) {
      let updatedPass = response.data.pass;
      if (lanePeriodId !== initialBindId) {
        const bindResponse = await api.patch(routes.playersV3.mePassKeyboardSetup(pass.id), {
          lanePeriodId: lanePeriodId || null,
        });
        if (updatedPass) {
          updatedPass = {
            ...updatedPass,
            keyboardSetup: bindResponse.data?.keyboardSetup ?? null,
          };
        }
      }
      toast.success(t('pass.updated', { ns: 'common' }), { id: toastId });
      setHasUnsavedChanges(false);
      if (onUpdate) {
        await onUpdate(updatedPass);
      }
    } else {
      toast.error(t('pass.errors.updateFailed', { ns: 'common' }), { id: toastId });
    }
  } catch (err) {
    console.error("Error updating pass:", err);
    toast.error(
      err.response?.data?.error || err.message || err.error || "Unknown error occurred",
      { id: toastId }
    );
  } finally {
    setSubmission(false);
    setSubmitAttempt(false);
  }
};

  const handleDelete = () => {
    setShowDeletePrompt(true);
  };

  const runSoftDelete = async (reason) => {
    setSubmission(true);
    const toastId = toast.loading(t('loading.generic', { ns: 'common' }));

    try {
      const response = await api.delete(
        `${routes.database.passes.root()}/${pass.id}`,
        reason ? { data: { reason } } : undefined,
      );
      if (response.data) {
        if (onUpdate) {
          await onUpdate(response.data.pass);
        }
        toast.success(t('pass.deleted', { ns: 'common' }), { id: toastId });
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || t('pass.errors.deleteFailed', { ns: 'common' }), { id: toastId });
    } finally {
      setSubmission(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm(t('passPopups.edit.confirmations.restore'))) {
      return;
    }

    setSubmission(true);
    const toastId = toast.loading(t('loading.generic', { ns: 'common' }));

    try {
      const response = await api.patch(`${routes.database.passes.root()}/${pass.id}/restore`);
      if (response.data) {
        if (onUpdate) {
          await onUpdate(response.data);
        }
        toast.success(t('pass.restored', { ns: 'common' }), { id: toastId });
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || t('pass.errors.restoreFailed', { ns: 'common' }), { id: toastId });
    } finally {
      setSubmission(false);
    }
  };

  return (
    <>
    <PopupShell
      onClose={requestClose}
      closeDisabled={showDeletePrompt}
      overlayClassName="edit-pass-popup-overlay"
      panelClassName="form-container"
    >
        <CloseButton
          variant="floating"
          className="edit-pass-popup-close"
          onClick={requestClose}
          aria-label={t('passPopups.edit.close')}
        />
        <PassCoreForm
          mode="edit"
          placeholderImage={placeholder}
          form={form}
          isFormValidDisplay={isFormValidDisplay}
          isValidSpeed={isValidSpeed}
          isValidFeelingRating={isValidFeelingRating}
          isValidExpectedRating={isValidExpectedRating}
          isValidKeyCount={isValidKeyCount}
          isValidTimestamp={isValidTimestamp}
          submitAttempt={submitAttempt}
          isFormValid={isFormValid}
          level={level}
          levelLoading={levelLoading}
          videoDetail={videoDetail}
          videoLinkResolving={videoLinkResolving}
          accuracy={accuracy}
          score={score}
          onInputChange={handleUserInputChange}
          onAdofaiVersionChange={handleUserAdofaiVersionChange}
          renderVerified={() => {
            const color = !form.levelId ? "#ffc107" : levelLoading ? "#ffc107" : level ? "#28a745" : "#dc3545";
            return <FetchIcon className="fetch-icon" form={form} levelLoading={levelLoading} level={level} color={color} />;
          }}
          renderGotoLink={() => (
            <a
              href={level ? (level.id == form.levelId ? `/levels/${level.id}` : "#") : "#"}
              onClick={(e) => {
                if (!level) e.preventDefault();
                else if (level && level.id != form.levelId) e.preventDefault();
              }}
              target="_blank"
              rel="noopener noreferrer"
              className="button-goto"
              style={{
                backgroundColor: !form.levelId ? "#ffc107" : levelLoading ? "#ffc107" : level ? "#28a745" : "#dc3545",
                cursor: !form.levelId ? "not-allowed" : levelLoading ? "wait" : level ? "pointer" : "not-allowed",
              }}
            >
              {!form.levelId
                ? t('passPopups.edit.form.levelFetching.input')
                : levelLoading
                  ? t('passPopups.edit.form.levelFetching.fetching')
                  : level
                    ? t('passPopups.edit.form.levelFetching.goto')
                    : t('passPopups.edit.form.levelFetching.notfound')}
            </a>
          )}
          renderPrimarySelector={() => (
            <PlayerInput
              value={form.leaderboardName || ""}
              onChange={(value) => {
                setHasUnsavedChanges(true);
                setForm((prev) => ({
                  ...prev,
                  leaderboardName: value,
                }));
              }}
              onSelect={(player) => {
                setHasUnsavedChanges(true);
                setForm((prev) => ({
                  ...prev,
                  leaderboardName: player.name,
                  playerId: player.id,
                }));
              }}
            />
          )}
          renderExtraCheckboxes={() => (
            <div className="announcement-status">
              <label className="checkbox-container">
                <input type="checkbox" name="isAnnounced" checked={form.isAnnounced} onChange={handleUserInputChange} />
                <span className="checkmark"></span>
                <span>Is Announced</span>
              </label>
              <label className="checkbox-container">
                <input type="checkbox" name="isDuplicate" checked={form.isDuplicate} onChange={handleUserInputChange} />
                <span className="checkmark"></span>
                <span>Is Duplicate</span>
              </label>
            </div>
          )}
          renderSubmitActions={() => (
            <div className="edit-pass-keyboard-bind">
              <CustomSelect
                options={bindSelectOptions}
                value={bindSelectOptions.find((option) => option.value === lanePeriodId) || bindSelectOptions[0]}
                onChange={(option) => {
                  setHasUnsavedChanges(true);
                  setLanePeriodId(option?.value || '');
                }}
                width="100%"
                label={t('profile.keyboards.bindField')}
              />
              {!bindOptions.length ? (
                <p className="edit-pass-keyboard-bind__hint">{t('profile.keyboards.noLayouts')}</p>
              ) : null}
              <div className="button-group">
              <button disabled={submission} className="save-button btn-fill-primary" onClick={handleSubmit}>
                {submission
                  ? t('loading.saving', { ns: 'common' })
                  : t('buttons.save', { ns: 'common' })}
              </button>

              <button
                type="button"
                className="delete-button btn-fill-danger"
                onClick={pass.isDeleted ? handleRestore : handleDelete}
                disabled={submission}
              >
                {pass.isDeleted
                  ? t('buttons.restore', { ns: 'common' })
                  : t('buttons.delete', { ns: 'common' })}
              </button>
            </div>
            </div>
          )}
          formatCreatorDisplay={formatCreatorDisplay}
          truncateString={truncateString}
        />
    </PopupShell>
      <AdminReasonPrompt
        isOpen={showDeletePrompt}
        title={t('passPopups.edit.reasonPrompt.deleteTitle')}
        message={t('passPopups.edit.confirmations.delete')}
        confirmLabel={t('buttons.delete', { ns: 'common' })}
        submitting={submission}
        onCancel={() => setShowDeletePrompt(false)}
        onConfirm={(reason) => {
          setShowDeletePrompt(false);
          void runSoftDelete(reason);
        }}
      />
    </>
    );
}; 