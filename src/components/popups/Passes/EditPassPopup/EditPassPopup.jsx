import './editpasspopup.css';
import { useTranslation } from 'react-i18next'; 
import { useAuth } from '@/contexts/AuthContext';
import { formatCreatorDisplay } from '@/utils/Utility';
import placeholder from '@/assets/placeholder/4.png';
import { FetchIcon } from '@/components/common/icons';
import { useNavigate } from 'react-router-dom';
import { PlayerInput } from '@/components/common/selectors';
import { useState } from 'react';
import api from "@/utils/api";
import toast from 'react-hot-toast';
import { PassCoreForm } from '@/components/common/cores/PassCoreForm/PassCoreForm';
import { usePassCoreForm } from '@/components/common/cores/PassCoreForm/usePassCoreForm';
import { truncateString } from '@/utils/Utility';
import { CloseButton } from '@/components/common/buttons';

export const EditPassPopup = ({ pass, onClose, onUpdate }) => {
  const { t } = useTranslation('components');

  const initialFormState = {
    levelId: pass.levelId.toString() || '',
    videoLink: pass.videoLink || '',
    speed: pass.speed || '1',
    playerId: pass.playerId || '',
    leaderboardName: pass.player.name || '',
    feelingRating: pass.feelingRating || '',
    ePerfect: pass.judgements.ePerfect.toString() || '',
    perfect: pass.judgements.perfect.toString() || '',
    lPerfect: pass.judgements.lPerfect.toString() || '',
    tooEarly: pass.judgements.earlyDouble.toString() || '',
    early: pass.judgements.earlySingle.toString() || '',
    late: pass.judgements.lateSingle.toString() || '',
    isNoHold: pass.isNoHoldTap || false,
    is12K: pass.is12K || false,
    is16K: pass.is16K || false,
    isAnnounced: pass.isAnnounced || false,
    isDuplicate: pass.isDuplicate || false,
    vidUploadTime: pass.vidUploadTime || new Date().toISOString()
  };
  const { user } = useAuth();
  const [submission, setSubmission] = useState(false);

  const navigate = useNavigate();

  const {
    form,
    setForm,
    submitAttempt,
    setSubmitAttempt,
    isFormValid,
    isFormValidDisplay,
    isValidFeelingRating,
    isValidSpeed,
    isValidTimestamp,
    level,
    levelLoading,
    videoDetail,
    accuracy,
    score,
    isUDiff,
    handleInputChange,
  } = usePassCoreForm({
    mode: "edit",
    initialForm: initialFormState,
    isUDiffLevel: (lvl) => lvl?.difficulty?.id >= 41,
  });

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
      vidTitle: videoDetail?.title || level?.song || '',
      videoLink: form.videoLink,
      vidUploadTime: form.vidUploadTime,
      is12K: isUDiff && form.is12K,
      is16K: isUDiff && form.is16K,
      isNoHoldTap: form.isNoHold,
      isAnnounced: form.isAnnounced,
      isDuplicate: form.isDuplicate,

      // Judgements in the exact format expected by the API
      judgements: {
        earlyDouble: parseInt(form.tooEarly) || 0,
        earlySingle: parseInt(form.early) || 0,
        ePerfect: parseInt(form.ePerfect) || 0,
        perfect: parseInt(form.perfect) || 0,
        lPerfect: parseInt(form.lPerfect) || 0,
        lateSingle: parseInt(form.late) || 0,
        lateDouble: 0
      }
    };

    
    const response = await api.put(
      `${import.meta.env.VITE_PASSES}/${pass.id}`,
      updateData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data) {
      toast.success(t('pass.updated', { ns: 'common' }), { id: toastId });
      if (onUpdate) {
        await onUpdate(response.data.pass);
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

  const handleDelete = async () => {
    if (!window.confirm(t('passPopups.edit.confirmations.delete'))) {
      return;
    }

    setSubmission(true);
    const toastId = toast.loading(t('loading.generic', { ns: 'common' }));

    try {
      const response = await api.delete(`${import.meta.env.VITE_PASSES}/${pass.id}`);
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
      const response = await api.patch(`${import.meta.env.VITE_PASSES}/${pass.id}/restore`);
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
    <div className="edit-pass-popup-overlay">
      <div className="form-container">
        <CloseButton
          variant="floating"
          className="edit-pass-popup-close"
          onClick={onClose}
          aria-label={t('passPopups.edit.close')}
        />
        <PassCoreForm
          mode="edit"
          placeholderImage={placeholder}
          form={form}
          isFormValidDisplay={isFormValidDisplay}
          isValidSpeed={isValidSpeed}
          isValidFeelingRating={isValidFeelingRating}
          isValidTimestamp={isValidTimestamp}
          submitAttempt={submitAttempt}
          isFormValid={isFormValid}
          level={level}
          levelLoading={levelLoading}
          videoDetail={videoDetail}
          accuracy={accuracy}
          score={score}
          onInputChange={handleInputChange}
          renderVerified={() => {
            const color = !form.levelId ? "#ffc107" : levelLoading ? "#ffc107" : level ? "#28a745" : "#dc3545";
            return <FetchIcon form={form} levelLoading={levelLoading} level={level} color={color} />;
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
                setForm((prev) => ({
                  ...prev,
                  leaderboardName: value,
                }));
              }}
              onSelect={(player) => {
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
                <input type="checkbox" name="isAnnounced" checked={form.isAnnounced} onChange={handleInputChange} />
                <span className="checkmark"></span>
                <span>Is Announced</span>
              </label>
              <label className="checkbox-container">
                <input type="checkbox" name="isDuplicate" checked={form.isDuplicate} onChange={handleInputChange} />
                <span className="checkmark"></span>
                <span>Is Duplicate</span>
              </label>
            </div>
          )}
          renderSubmitActions={() => (
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
          )}
          formatCreatorDisplay={formatCreatorDisplay}
          truncateString={truncateString}
        />
        </div>
      </div>
    );
}; 