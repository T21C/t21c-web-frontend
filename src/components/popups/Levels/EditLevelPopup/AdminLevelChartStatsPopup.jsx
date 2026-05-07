// tuf-search: #AdminLevelChartStatsPopup #chartStats #levels #admin
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import './adminlevelchartstatspopup.css';
import api from '@/utils/api';
import { CloseButton } from '@/components/common/buttons';
import { getPortalRoot } from '@/utils/portalRoot';
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

export const AdminLevelChartStatsPopup = ({ level, onClose, onSaved }) => {
  const { t } = useTranslation('components');
  const [bpm, setBpm] = useState('');
  const [tilecount, setTilecount] = useState('');
  const [lengthSeconds, setLengthSeconds] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setBpm(fieldToInput(level?.bpm));
    setTilecount(fieldToInput(level?.tilecount));
    setLengthSeconds(msToLengthSecondsInput(level?.levelLengthInMs));
    setError(null);
  }, [level?.id, level?.bpm, level?.tilecount, level?.levelLengthInMs]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

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
    if (lengthSeconds.trim() !== '') {
      const n = Number(lengthSeconds);
      if (!Number.isFinite(n) || n < 0) {
        return t('levelPopups.edit.chartStats.errors.length');
      }
    }
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        bpm: bpm.trim() === '' ? null : Number(bpm),
        tilecount: tilecount.trim() === '' ? null : Number(tilecount),
        levelLengthInMs:
          lengthSeconds.trim() === ''
            ? null
            : Math.round(Number(lengthSeconds) * 1000),
      };
      const res = await api.patch(
        `${import.meta.env.VITE_LEVELS}/${level.id}/chart-stats`,
        payload,
      );
      const updated = res.data?.level;
      if (updated && onSaved) {
        onSaved({
          bpm: updated.bpm ?? null,
          tilecount: updated.tilecount ?? null,
          levelLengthInMs: updated.levelLengthInMs ?? null,
        });
      }
      toast.success(t('levelPopups.edit.chartStats.toastSaved'));
      onClose();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        t('levelPopups.edit.chartStats.errors.save');
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
    <div className="admin-level-chart-stats-popup" onClick={handleOverlay}>
      <div
        className="admin-level-chart-stats-popup__panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="admin-chart-stats-title"
      >
        <div className="admin-level-chart-stats-popup__header">
          <h2 id="admin-chart-stats-title">
            {t('levelPopups.edit.chartStats.title')}
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
              {t('levelPopups.edit.chartStats.cancel')}
            </button>
            <button
              type="submit"
              className="admin-level-chart-stats-popup__btn admin-level-chart-stats-popup__btn--primary btn-fill-primary"
              disabled={saving}
            >
              {saving
                ? t('levelPopups.edit.chartStats.saving')
                : t('levelPopups.edit.chartStats.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, getPortalRoot());
};
