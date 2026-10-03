import { routes } from '@/api/routes';
// tuf-search: #EditPassPopup #editPassPopup #popups #passes #editPass
import './editpasspopup.css';
import { useTranslation } from 'react-i18next'; 
import { useAuth } from '@/contexts/AuthContext';
import { formatCreatorDisplay, formatPassDate, normalizeKeyCount } from '@/utils/Utility';
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
import { formatKeybind, periodCoversDate } from '@/utils/keyboards/keys';
import { truncateString } from '@/utils/Utility';
import { CloseButton } from '@/components/common/buttons';
import { PopupShell } from '@/components/common/PopupShell';
import { AdminReasonPrompt } from '@/components/common/AdminReasonPrompt';
import { useUnsavedClose } from '@/hooks/useUnsavedClose';

const PASS_UPLOAD_SENTINELS = new Set([
  '2023-07-27T07:27:27.000Z',
  '2023-01-01T07:27:27.000Z',
]);

function uploadDay(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const iso = date.toISOString();
  if (PASS_UPLOAD_SENTINELS.has(iso)) return null;
  return iso.slice(0, 10);
}

function formatBindDate(isoDate, language) {
  if (!isoDate) return '';
  return formatPassDate(`${String(isoDate).slice(0, 10)}T12:00:00.000Z`, language);
}

function layoutTitle(layout) {
  const count = `${layout.keyCount}K`;
  const lane = layout.laneName && layout.laneName !== count ? layout.laneName : '';
  return [count, lane, layout.rigName].filter(Boolean).join(' · ');
}

function collectLayouts(rigs) {
  const layouts = [];
  for (const rig of rigs || []) {
    const rigName = typeof rig.name === 'string' ? rig.name.trim() : '';
    for (const lane of rig.lanes || []) {
      const laneName = typeof lane.name === 'string' ? lane.name.trim() : '';
      for (const period of lane.periods || []) {
        if (period.isGap || !Array.isArray(period.keys) || !period.keys.length) continue;
        layouts.push({
          id: String(period.id),
          rigId: rig.id,
          keyCount: period.keys.length,
          laneName,
          rigName,
          sinceDate: period.sinceDate || null,
          untilDate: period.untilDate || null,
          untilAuto: period.untilAuto !== false,
          keys: period.keys,
          period,
        });
      }
    }
  }
  return layouts;
}

function matchingLayouts(layouts, keyCount, isoDate) {
  if (!keyCount || !isoDate) return [];
  const byRig = new Map();
  for (const layout of layouts) {
    if (layout.keyCount !== keyCount) continue;
    const group = byRig.get(layout.rigId);
    if (group) group.push(layout);
    else byRig.set(layout.rigId, [layout]);
  }
  const matches = [];
  for (const group of byRig.values()) {
    const periods = group.map((layout) => layout.period);
    for (const layout of group) {
      if (periodCoversDate(layout.period, isoDate, periods)) matches.push(layout);
    }
  }
  return matches;
}

function layoutMeta(layout, t, language) {
  const from = formatBindDate(layout.sinceDate, language);
  const until = layout.untilAuto ? '' : formatBindDate(layout.untilDate, language);
  if (from && until) return t('passPopups.edit.keyboard.range', { from, to: until });
  if (from) return t('passPopups.edit.keyboard.since', { date: from });
  return '';
}

function keyTokens(keys) {
  return formatKeybind(keys).split(' ').filter(Boolean);
}

function BindKeyChips({ tokens }) {
  if (!tokens?.length) return null;
  return (
    <span className="edit-pass-bind-keys">
      {tokens.map((token) => (
        <span key={token} className="edit-pass-bind-keys__key">{token}</span>
      ))}
    </span>
  );
}

function BindOptionLabel(option, { context }) {
  if (context === 'value') {
    return <span>{option.title}</span>;
  }
  return (
    <span className="edit-pass-bind-option">
      <span className="edit-pass-bind-option__head">
        <span className="edit-pass-bind-option__title">{option.title}</span>
        {option.matchesPass && (
          <span className="edit-pass-bind-option__match">{option.matchLabel}</span>
        )}
      </span>
      {option.note && <span className="edit-pass-bind-option__note">{option.note}</span>}
      {option.meta && <span className="edit-pass-bind-option__meta">{option.meta}</span>}
      <BindKeyChips tokens={option.keyTokens} />
    </span>
  );
}

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
  const [bindRigs, setBindRigs] = useState(null);
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
      setBindRigs([]);
      return undefined;
    }
    let cancelled = false;
    setBindRigs(null);
    api.get(routes.playersV3.keyboardSetups(bindPlayerId))
      .then(({ data }) => {
        if (!cancelled) setBindRigs(data?.rigs || []);
      })
      .catch(() => {
        if (!cancelled) setBindRigs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [bindPlayerId]);

  const bindModel = useMemo(() => {
    const ready = Array.isArray(bindRigs);
    const layouts = collectLayouts(ready ? bindRigs : []);
    const parsedKeyCount = Number(form.keyCount);
    const keyCount = Number.isInteger(parsedKeyCount) && parsedKeyCount > 0 ? parsedKeyCount : null;
    const isoDate = uploadDay(form.vidUploadTime);
    const matches = matchingLayouts(layouts, keyCount, isoDate);
    const matchIds = new Set(matches.map((layout) => layout.id));
    const matchLabel = t('passPopups.edit.keyboard.matches');
    const autoTitle = matches.length === 1
      ? t('passPopups.edit.keyboard.autoValue', { layout: layoutTitle(matches[0]) })
      : t('passPopups.edit.keyboard.auto');
    let autoNote = '';
    if (ready && !layouts.length) autoNote = t('passPopups.edit.keyboard.noLayouts');
    else if (ready && !keyCount) autoNote = t('passPopups.edit.keyboard.autoNoKeyCount');
    else if (ready && !isoDate) autoNote = t('passPopups.edit.keyboard.autoNoDate');
    else if (ready && matches.length === 1) {
      autoNote = t('passPopups.edit.keyboard.autoUses', { layout: layoutTitle(matches[0]) });
    } else if (ready && matches.length === 0) autoNote = t('passPopups.edit.keyboard.autoNone');
    else if (ready) autoNote = t('passPopups.edit.keyboard.autoMany');

    const layoutOptions = layouts
      .map((layout) => {
        const title = layoutTitle(layout);
        const tokens = keyTokens(layout.keys);
        return {
          value: layout.id,
          label: [title, tokens.join(' ')].filter(Boolean).join(' '),
          title,
          meta: layoutMeta(layout, t, i18n.language),
          keyTokens: tokens,
          keyCount: layout.keyCount,
          matchesPass: matchIds.has(layout.id),
          matchLabel,
          sinceDate: layout.sinceDate || '',
        };
      })
      .sort((left, right) => {
        const matchOrder = Number(right.matchesPass) - Number(left.matchesPass);
        if (matchOrder) return matchOrder;
        const leftSame = keyCount && left.keyCount === keyCount ? 0 : 1;
        const rightSame = keyCount && right.keyCount === keyCount ? 0 : 1;
        if (leftSame !== rightSame) return leftSame - rightSame;
        if (left.keyCount !== right.keyCount) return left.keyCount - right.keyCount;
        return right.sinceDate.localeCompare(left.sinceDate);
      });

    const autoMatch = matches.length === 1 ? matches[0] : null;
    return {
      ready,
      keyCount,
      options: [
        {
          value: '',
          label: autoTitle,
          title: autoTitle,
          note: autoNote,
          meta: '',
          keyTokens: [],
          detailMeta: autoMatch ? layoutMeta(autoMatch, t, i18n.language) : '',
          detailTokens: autoMatch ? keyTokens(autoMatch.keys) : [],
          keyCount: autoMatch?.keyCount ?? null,
          matchesPass: false,
        },
        ...layoutOptions,
      ],
    };
  }, [bindRigs, form.keyCount, form.vidUploadTime, i18n.language, t]);

  const selectedBind = bindModel.options.find((option) => option.value === lanePeriodId) || bindModel.options[0];
  const selectedMismatch = selectedBind?.value
    && bindModel.keyCount
    && selectedBind.keyCount
    && selectedBind.keyCount !== bindModel.keyCount
    ? t('passPopups.edit.keyboard.mismatch', {
      layoutCount: selectedBind.keyCount,
      passCount: bindModel.keyCount,
    })
    : '';

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
              <div className="edit-pass-duplicate">
                <label className="checkbox-container">
                  <input type="checkbox" name="isDuplicate" checked={form.isDuplicate} onChange={handleUserInputChange} />
                  <span className="checkmark"></span>
                  <span>Is Duplicate</span>
                </label>
                {pass.isDuplicate && !pass.isDuplicateOverridden && (
                  <p className="edit-pass-duplicate__hint">{t('passPopups.edit.duplicateGuessHint')}</p>
                )}
              </div>
            </div>
          )}
          renderSubmitActions={() => (
            <div className="edit-pass-keyboard-bind">
              <CustomSelect
                options={bindModel.options}
                value={selectedBind}
                onChange={(option) => {
                  setHasUnsavedChanges(true);
                  setLanePeriodId(option?.value || '');
                }}
                width="100%"
                maxHeight="320px"
                direction="auto"
                wrapOptions
                isSearchable={bindModel.options.length > 8}
                formatOptionLabel={BindOptionLabel}
                label={t('passPopups.edit.keyboard.label')}
              />
              {bindModel.ready && (selectedBind?.note || selectedBind?.meta || selectedBind?.detailMeta || selectedBind?.keyTokens?.length || selectedBind?.detailTokens?.length || selectedMismatch) && (
                <div className="edit-pass-keyboard-bind__detail">
                  {selectedBind.note && (
                    <p className="edit-pass-keyboard-bind__hint">{selectedBind.note}</p>
                  )}
                  {(selectedBind.detailMeta || selectedBind.meta) && (
                    <p className="edit-pass-keyboard-bind__meta">{selectedBind.detailMeta || selectedBind.meta}</p>
                  )}
                  {selectedMismatch && (
                    <p className="edit-pass-keyboard-bind__warn">{selectedMismatch}</p>
                  )}
                  <BindKeyChips tokens={selectedBind.detailTokens?.length ? selectedBind.detailTokens : selectedBind.keyTokens} />
                </div>
              )}
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