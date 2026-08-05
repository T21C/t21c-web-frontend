// tuf-search: #LevelListExportPopup #levelListExportPopup #popups #levels #export
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { CloseButton } from '@/components/common/buttons';
import './LevelListExportPopup.css';

/**
 * Format-only export popup for a flat level list.
 * Caller performs collection + download via onExport(format, { signal, onProgress }).
 */
const LevelListExportPopup = ({
  isOpen,
  onClose,
  contextName,
  onExport,
}) => {
  const { t } = useTranslation(['pages', 'components', 'common']);
  const popupRef = useRef(null);
  const abortRef = useRef(null);
  const [format, setFormat] = useState('xlsx');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const resetState = useCallback(() => {
    setFormat('xlsx');
    setExporting(false);
    setProgress(null);
    setError(null);
  }, []);

  const abortActive = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      abortActive();
      resetState();
    }
  }, [isOpen, resetState, abortActive]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && !exporting) {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (exporting) return;
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, exporting]);

  if (!isOpen) {
    return null;
  }

  const displayName =
    contextName || t('creators.profile.levels.export.defaultContextName');

  const handleCancel = () => {
    if (exporting) {
      abortActive();
      setExporting(false);
      setProgress(null);
      return;
    }
    onClose();
  };

  const handleExport = async () => {
    if (typeof onExport !== 'function') return;

    setError(null);
    setExporting(true);
    setProgress({ fetched: 0, total: null });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await onExport(format, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      onClose();
    } catch (err) {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
        setError(null);
        return;
      }
      console.error('Level list export failed:', err);
      setError(t('creators.profile.levels.export.errors.exportFailed'));
    } finally {
      abortRef.current = null;
      setExporting(false);
      setProgress(null);
    }
  };

  const progressLabel =
    exporting && progress
      ? t('creators.profile.levels.export.progress', {
          fetched: progress.fetched,
          total: progress.total ?? '…',
        })
      : null;

  return (
    <div className="level-list-export-popup__overlay">
      <div className="level-list-export-popup" ref={popupRef}>
        <CloseButton
          variant="floating"
          className="level-list-export-popup__close-btn"
          onClick={handleCancel}
          disabled={exporting}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="level-list-export-popup__content">
          <h2 className="level-list-export-popup__title">
            {t('creators.profile.levels.export.title', { contextName: displayName })}
          </h2>

          <p className="level-list-export-popup__description">
            {t('creators.profile.levels.export.description', {
              contextName: displayName,
            })}
          </p>

          <fieldset className="level-list-export-popup__fieldset">
            <legend className="level-list-export-popup__legend">
              {t('packPopups.exportPack.formatLabel', { ns: 'components' })}
            </legend>
            <div className="level-list-export-popup__radio-group">
              <label className="level-list-export-popup__radio-label">
                <input
                  type="radio"
                  name="level-list-export-format"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  disabled={exporting}
                  onChange={() => setFormat('xlsx')}
                />
                {t('packPopups.exportPack.format.xlsx', { ns: 'components' })}
              </label>
              <label className="level-list-export-popup__radio-label">
                <input
                  type="radio"
                  name="level-list-export-format"
                  value="csv"
                  checked={format === 'csv'}
                  disabled={exporting}
                  onChange={() => setFormat('csv')}
                />
                {t('packPopups.exportPack.format.csv', { ns: 'components' })}
              </label>
            </div>
          </fieldset>

          {progressLabel && (
            <p className="level-list-export-popup__progress" aria-live="polite">
              {progressLabel}
            </p>
          )}

          {error && (
            <div className="level-list-export-popup__error" role="alert">
              {error}
            </div>
          )}

          <div className="level-list-export-popup__actions">
            <button
              type="button"
              className="level-list-export-popup__secondary-btn"
              onClick={handleCancel}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              type="button"
              className="level-list-export-popup__primary-btn"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting
                ? t('creators.profile.levels.export.exporting')
                : t('creators.profile.levels.export.export')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelListExportPopup;
