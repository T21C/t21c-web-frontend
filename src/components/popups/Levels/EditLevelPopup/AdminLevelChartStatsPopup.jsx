import { routes } from '@/api/routes';
// tuf-search: #AdminLevelChartStatsPopup #chartStats #levels #admin
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './adminlevelchartstatspopup.css';
import api from '@/utils/api';
import { CloseButton } from '@/components/common/buttons';
import { PopupShell } from '@/components/common/PopupShell';
import { formatSecondsAsHhMmSs } from '@/utils/levelHelpers';
import toast from 'react-hot-toast';

function fieldToInput(value) {
  if (value == null || value === '') return '';
  return String(value);
}

/** DB stores ms; editor uses seconds (float). */
function msToLengthSecondsInput(ms) {
  if (ms == null || ms === '') return '';
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return '';
  const s = n / 1000;
  return String(Number(s.toFixed(6)));
}

function parseOptionalNonNegInt(raw) {
  if (raw.trim() === '') return null;
  return Number(raw);
}

function sameNullableNumber(a, b) {
  if (a == null && b == null) return true;
  return a === b;
}

function midspinOrZero(value) {
  if (value == null || !Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.floor(Number(value)));
}

function formatSignedDelta(n) {
  if (n > 0) return `+${n}`;
  return String(n);
}

export const AdminLevelChartStatsPopup = ({ level, onClose, onSaved }) => {
  const { t } = useTranslation(['components', 'common']);
  const [bpm, setBpm] = useState('');
  const [tilecount, setTilecount] = useState('');
  const [midspinCount, setMidspinCount] = useState('');
  const [lengthSeconds, setLengthSeconds] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [perfectsPrompt, setPerfectsPrompt] = useState(null);

  useEffect(() => {
    setBpm(fieldToInput(level?.bpm));
    setTilecount(fieldToInput(level?.tilecount));
    setMidspinCount(fieldToInput(level?.midspinCount));
    setLengthSeconds(msToLengthSecondsInput(level?.levelLengthInMs));
    setError(null);
    setPerfectsPrompt(null);
  }, [level?.id, level?.bpm, level?.tilecount, level?.midspinCount, level?.levelLengthInMs]);

  const lengthTimeLabel = (() => {
    const raw = lengthSeconds.trim();
    if (raw === '') return '';
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return '';
    return formatSecondsAsHhMmSs(n);
  })();

  const validate = () => {
    if (bpm.trim() !== '') {
      const n = Number(bpm);
      if (!Number.isFinite(n) || n <= 0) {
        return t('levelPopups.edit.chartStats.errors.bpm');
      }
    }
    if (tilecount.trim() !== '') {
      const n = Number(tilecount);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        return t('levelPopups.edit.chartStats.errors.tilecount');
      }
    }
    if (midspinCount.trim() !== '') {
      const n = Number(midspinCount);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        return t('levelPopups.edit.chartStats.errors.midspinCount');
      }
    }
    if (lengthSeconds.trim() !== '') {
      const n = Number(lengthSeconds);
      if (!Number.isFinite(n) || n < 0) {
        return t('levelPopups.edit.chartStats.errors.length');
      }
    }
    return null;
  };

  const buildPayload = () => ({
    bpm: bpm.trim() === '' ? null : Number(bpm),
    tilecount: tilecount.trim() === '' ? null : Number(tilecount),
    midspinCount: parseOptionalNonNegInt(midspinCount),
    levelLengthInMs:
      lengthSeconds.trim() === ''
        ? null
        : Math.round(Number(lengthSeconds) * 1000),
  });

  const submitChartStats = async (payload, applyPerfectsDifference) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch(
        `${routes.database.levels.root()}/${level.id}/chart-stats`,
        { ...payload, applyPerfectsDifference: Boolean(applyPerfectsDifference) },
      );
      const updated = res.data?.level;
      if (updated && onSaved) {
        onSaved({
          bpm: updated.bpm ?? null,
          tilecount: updated.tilecount ?? null,
          midspinCount: updated.midspinCount ?? null,
          levelLengthInMs: updated.levelLengthInMs ?? null,
        });
      }
      const updatedCount = Number(res.data?.passesUpdated) || 0;
      const skippedCount = Number(res.data?.passesSkipped) || 0;
      if (applyPerfectsDifference && updatedCount > 0) {
        toast.success(
          skippedCount > 0
            ? t('levelPopups.edit.chartStats.perfectsDifference.toastSavedWithPassesSkipped', {
                updated: updatedCount,
                skipped: skippedCount,
              })
            : t('levelPopups.edit.chartStats.perfectsDifference.toastSavedWithPasses', {
                count: updatedCount,
              }),
        );
      } else {
        toast.success(t('levelPopups.edit.chartStats.toastSaved'));
      }
      onClose();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        t('levelPopups.edit.chartStats.errors.save');
      setError(msg);
      toast.error(msg);
      setPerfectsPrompt(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    const payload = buildPayload();
    const previousMidspin =
      level?.midspinCount == null || level?.midspinCount === ''
        ? null
        : Number(level.midspinCount);
    const nextMidspin = payload.midspinCount;
    if (!sameNullableNumber(previousMidspin, nextMidspin)) {
      const delta =
        midspinOrZero(previousMidspin) - midspinOrZero(nextMidspin);
      if (delta !== 0) {
        setPerfectsPrompt({
          payload,
          from: previousMidspin,
          to: nextMidspin,
          delta,
        });
        return;
      }
    }
    await submitChartStats(payload, false);
  };

  const handlePromptAnswer = async (applyPerfectsDifference) => {
    if (!perfectsPrompt) return;
    await submitChartStats(perfectsPrompt.payload, applyPerfectsDifference);
  };

  const displayMidspin = (value) =>
    value == null
      ? t('levelPopups.edit.chartStats.perfectsDifference.unset')
      : String(value);

  const content = (
    <PopupShell
      onClose={onClose}
      closeDisabled={saving}
      overlayClassName="admin-level-chart-stats-popup"
      panelClassName={`admin-level-chart-stats-popup__panel${
        perfectsPrompt ? ' admin-level-chart-stats-popup__panel--prompt' : ''
      }`}
      ariaLabelledBy="admin-chart-stats-title"
    >
        <div className="admin-level-chart-stats-popup__header">
          <h2 id="admin-chart-stats-title">
            {perfectsPrompt
              ? t('levelPopups.edit.chartStats.perfectsDifference.title')
              : t('levelPopups.edit.chartStats.title')}
          </h2>
          <CloseButton
            variant="inline"
            onClick={onClose}
            aria-label={t('levelPopups.edit.close')}
          />
        </div>
        {perfectsPrompt ? (
          <div className="admin-level-chart-stats-popup__prompt">
            <p className="admin-level-chart-stats-popup__hint">
              {t('levelPopups.edit.chartStats.perfectsDifference.message', {
                from: displayMidspin(perfectsPrompt.from),
                to: displayMidspin(perfectsPrompt.to),
                delta: formatSignedDelta(perfectsPrompt.delta),
              })}
            </p>
            <p className="admin-level-chart-stats-popup__hint">
              {t('levelPopups.edit.chartStats.perfectsDifference.question')}
            </p>
            {error ? (
              <div className="admin-level-chart-stats-popup__error">{error}</div>
            ) : null}
            <div className="admin-level-chart-stats-popup__actions admin-level-chart-stats-popup__actions--prompt">
              <button
                type="button"
                className="admin-level-chart-stats-popup__btn admin-level-chart-stats-popup__btn--secondary btn-fill-neutral-muted"
                onClick={() => {
                  setPerfectsPrompt(null);
                  setError(null);
                }}
                style={{ marginRight: 'auto' }}
                disabled={saving}
              >
                {t('buttons.back', { ns: 'common' })}
              </button>
              <div className="admin-level-chart-stats-popup__actions-end">
                <button
                  type="button"
                  className="admin-level-chart-stats-popup__btn admin-level-chart-stats-popup__btn--secondary btn-fill-danger"
                  onClick={() => handlePromptAnswer(false)}
                  disabled={saving}
                >
                  {t('buttons.no', { ns: 'common' })}
                </button>
                <button
                  type="button"
                  className="admin-level-chart-stats-popup__btn admin-level-chart-stats-popup__btn--primary btn-fill-success"
                  onClick={() => handlePromptAnswer(true)}
                  disabled={saving}
                >
                  {t('buttons.yes', { ns: 'common' })}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
        <p className="admin-level-chart-stats-popup__hint">
          {t('levelPopups.edit.chartStats.clearHint')}
        </p>
        <form
          className="admin-level-chart-stats-popup__form"
          onSubmit={handleSave}
        >
          <div className="admin-level-chart-stats-popup__fields">
            <div className="admin-level-chart-stats-popup__field">
              <label htmlFor="chart-stats-bpm">
                {t('levelPopups.edit.chartStats.labels.bpm')}
              </label>
              <input
                id="chart-stats-bpm"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
              />
            </div>
            <div className="admin-level-chart-stats-popup__field">
              <label htmlFor="chart-stats-tiles">
                {t('levelPopups.edit.chartStats.labels.tilecount')}
              </label>
              <input
                id="chart-stats-tiles"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={tilecount}
                onChange={(e) => setTilecount(e.target.value)}
              />
            </div>
            <div className="admin-level-chart-stats-popup__field">
              <label htmlFor="chart-stats-midspins">
                {t('levelPopups.edit.chartStats.labels.midspinCount')}
              </label>
              <input
                id="chart-stats-midspins"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={midspinCount}
                onChange={(e) => setMidspinCount(e.target.value)}
              />
            </div>
            <div className="admin-level-chart-stats-popup__field">
              <label htmlFor="chart-stats-length">
                {t('levelPopups.edit.chartStats.labels.lengthSeconds')}
              </label>
              <input
                id="chart-stats-length"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={lengthSeconds}
                onChange={(e) => setLengthSeconds(e.target.value)}
              />
              {lengthTimeLabel ? (
                <span className="admin-level-chart-stats-popup__time-label">
                  {lengthTimeLabel}
                </span>
              ) : null}
            </div>
          </div>
          {error ? (
            <div className="admin-level-chart-stats-popup__error">{error}</div>
          ) : null}
          <div className="admin-level-chart-stats-popup__actions">
            <button
              type="button"
              className="admin-level-chart-stats-popup__btn admin-level-chart-stats-popup__btn--secondary btn-fill-neutral-muted"
              onClick={onClose}
              disabled={saving}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              type="submit"
              className="admin-level-chart-stats-popup__btn admin-level-chart-stats-popup__btn--primary btn-fill-primary"
              disabled={saving}
            >
              {saving
                ? t('loading.saving', { ns: 'common' })
                : t('buttons.save', { ns: 'common' })}
            </button>
          </div>
        </form>
          </>
        )}
    </PopupShell>
  );

  return content;
};
