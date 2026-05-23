// tuf-search: #AdminLevelXaccCurvePopup #xaccCurve #levels #admin
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import './adminlevelxacccurvepopup.css';
import api from '@/utils/api';
import { CloseButton } from '@/components/common/buttons';
import { getPortalRoot } from '@/utils/portalRoot';
import toast from 'react-hot-toast';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { ScoreV2Graph } from '@/components/common/display/ScoreV2Graph/ScoreV2Graph';
import {
  defaultSliderValues,
  levelToSliderValues,
  poleOffsetFromSlider,
  slidersToXaccCurve,
  topMultiplierFromSlider,
} from '@/utils/scoreV2XaccCurveSliders.js';

function formatPoleOffset(value) {
  return Number(value).toFixed(4);
}

function formatTopMultiplier(value) {
  return Number(value).toFixed(3);
}

export const AdminLevelXaccCurvePopup = ({ level, onClose, onSaved }) => {
  const { t } = useTranslation(['components', 'pages']);
  const { difficultyDict } = useDifficultyContext();
  const initial = useMemo(() => levelToSliderValues(level), [level?.id, level?.xaccPoleOffset, level?.xaccTopMultiplier]);

  const [poleDisplay, setPoleDisplay] = useState(initial.poleDisplay);
  const [topDisplay, setTopDisplay] = useState(initial.topDisplay);
  const [saveAsDefaults, setSaveAsDefaults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [disablePP, setDisablePP] = useState(false);

  const poleOffset = poleOffsetFromSlider(poleDisplay);
  const topMultiplier = topMultiplierFromSlider(topDisplay);
  const draftCurve = slidersToXaccCurve(poleDisplay, topDisplay);

  const tilecount = level?.tilecount > 0 ? level.tilecount : 100;
  const tilecountHint = !level?.tilecount || level.tilecount <= 0;

  const graphLevelData = useMemo(
    () => ({
      baseScore: level?.baseScore ?? 0,
      ppBaseScore: level?.ppBaseScore ?? 0,
      diffId: level?.diffId,
      difficulty: level?.difficulty,
      xaccCurve: draftCurve,
    }),
    [
      level?.baseScore,
      level?.ppBaseScore,
      level?.diffId,
      level?.difficulty,
      draftCurve.poleOffset,
      draftCurve.topMultiplier,
    ],
  );

  const hasChanges =
    saveAsDefaults ||
    poleDisplay !== initial.poleDisplay ||
    topDisplay !== initial.topDisplay;

  useEffect(() => {
    const next = levelToSliderValues(level);
    setPoleDisplay(next.poleDisplay);
    setTopDisplay(next.topDisplay);
    setSaveAsDefaults(false);
    setError(null);
  }, [level?.id, level?.xaccPoleOffset, level?.xaccTopMultiplier]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const handleReset = () => {
    const def = defaultSliderValues();
    setPoleDisplay(def.poleDisplay);
    setTopDisplay(def.topDisplay);
    setSaveAsDefaults(true);
    setError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!hasChanges) {
      onClose();
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = saveAsDefaults
        ? { xaccPoleOffset: null, xaccTopMultiplier: null }
        : {
            xaccPoleOffset: poleOffset,
            xaccTopMultiplier: topMultiplier,
          };
      const res = await api.patch(
        `${import.meta.env.VITE_LEVELS}/${level.id}/xacc-curve`,
        payload,
      );
      const updated = res.data?.level;
      if (updated && onSaved) {
        onSaved({
          xaccPoleOffset: updated.xaccPoleOffset ?? null,
          xaccTopMultiplier: updated.xaccTopMultiplier ?? null,
        });
      }
      toast.success(t('levelPopups.edit.xaccCurve.toastSaved'));
      onClose();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error || t('levelPopups.edit.xaccCurve.errors.save');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleOverlay = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const content = (
    <div className="admin-level-xacc-curve-popup" onClick={handleOverlay}>
      <div
        className="admin-level-xacc-curve-popup__panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="admin-xacc-curve-title"
      >
        <div className="admin-level-xacc-curve-popup__header">
          <h2 id="admin-xacc-curve-title">
            {t('levelPopups.edit.xaccCurve.title')}
          </h2>
          <CloseButton
            variant="inline"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label={t('levelPopups.edit.close')}
          />
        </div>
        <p className="admin-level-xacc-curve-popup__hint">
          {t('levelPopups.edit.xaccCurve.hint')}
        </p>
        {tilecountHint ? (
          <p className="admin-level-xacc-curve-popup__hint admin-level-xacc-curve-popup__hint--warn">
            {t('levelPopups.edit.xaccCurve.tilecountFallback')}
          </p>
        ) : null}
        <form
          className="admin-level-xacc-curve-popup__form"
          onSubmit={handleSave}
        >
          <div className="admin-level-xacc-curve-popup__sliders">
            <div className="admin-level-xacc-curve-popup__slider-row">
              <label htmlFor="xacc-pole-slider">
                {t('levelPopups.edit.xaccCurve.labels.pole')}
              </label>
              <input
                id="xacc-pole-slider"
                type="range"
                min={1}
                max={100}
                value={poleDisplay}
                onChange={(e) => {
                  setPoleDisplay(Number(e.target.value));
                  setSaveAsDefaults(false);
                }}
              />
              <span className="admin-level-xacc-curve-popup__slider-meta">
                {t('levelPopups.edit.xaccCurve.sliderDisplay', {
                  value: poleDisplay,
                })}{' '}
                · E = {formatPoleOffset(poleOffset)}
              </span>
            </div>
            <div className="admin-level-xacc-curve-popup__slider-row">
              <label htmlFor="xacc-top-slider">
                {t('levelPopups.edit.xaccCurve.labels.top')}
              </label>
              <input
                id="xacc-top-slider"
                type="range"
                min={1}
                max={100}
                value={topDisplay}
                onChange={(e) => {
                  setTopDisplay(Number(e.target.value));
                  setSaveAsDefaults(false);
                }}
              />
              <span className="admin-level-xacc-curve-popup__slider-meta">
                {t('levelPopups.edit.xaccCurve.sliderDisplay', {
                  value: topDisplay,
                })}{' '}
                · G = {formatTopMultiplier(topMultiplier)}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="admin-level-xacc-curve-popup__btn admin-level-xacc-curve-popup__btn--secondary btn-fill-neutral-muted"
            onClick={handleReset}
            disabled={saving}
          >
            {t('levelPopups.edit.xaccCurve.resetDefaults')}
          </button>
          <div className="admin-level-xacc-curve-popup__graph">
            <div className="admin-level-xacc-curve-popup__graph-toolbar">
              <label className="admin-level-xacc-curve-popup__pp-toggle">
                <input
                  type="checkbox"
                  checked={disablePP}
                  onChange={(e) => setDisablePP(e.target.checked)}
                />
                <span>
                  {t('levelDetail.scoreGraph.disablePP', {
                    ns: 'pages',
                    defaultValue: 'Disable PP',
                  })}
                </span>
              </label>
            </div>
            <ScoreV2Graph
              tilecount={tilecount}
              levelData={graphLevelData}
              difficultyDict={difficultyDict}
              xaccCurve={draftCurve}
              disablePP={disablePP}
            />
          </div>
          {error ? (
            <div className="admin-level-xacc-curve-popup__error">{error}</div>
          ) : null}
          <div className="admin-level-xacc-curve-popup__actions">
            <button
              type="button"
              className="admin-level-xacc-curve-popup__btn admin-level-xacc-curve-popup__btn--secondary btn-fill-neutral-muted"
              onClick={onClose}
              disabled={saving}
            >
              {t('levelPopups.edit.xaccCurve.cancel')}
            </button>
            <button
              type="submit"
              className="admin-level-xacc-curve-popup__btn admin-level-xacc-curve-popup__btn--primary btn-fill-primary"
              disabled={saving || !hasChanges}
            >
              {saving
                ? t('levelPopups.edit.xaccCurve.saving')
                : t('levelPopups.edit.xaccCurve.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, getPortalRoot());
};
