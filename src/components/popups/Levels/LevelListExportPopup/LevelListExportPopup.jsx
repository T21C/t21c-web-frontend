// tuf-search: #LevelListExportPopup #levelListExportPopup #popups #levels #export
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { StateDisplay } from '@/components/common/selectors';
import './LevelListExportPopup.css';

const EXPORT_SCOPE_STATES = ['requestExportDefault', 'requestExportFilters'];

/**
 * Format-only export popup for a flat level list.
 * Caller performs collection + download via onExport(format, { signal, onProgress, scope }).
 */
const LevelListExportPopup = ({
  isOpen,
  onClose,
  contextName,
  onExport,
  showScope = false,
  scopeLabel,
  title,
  description,
  progressText,
  errorMessage,
  exportingLabel,
  exportLabel,
}) => {
  const { t } = useTranslation(['pages', 'components', 'common']);
  const abortRef = useRef(null);
  const [format, setFormat] = useState('xlsx');
  const [exportScope, setExportScope] = useState('requestExportDefault');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const resetState = useCallback(() => {
    setFormat('xlsx');
    setExportScope('requestExportDefault');
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
        scope: showScope && exportScope === 'requestExportFilters' ? 'filters' : 'default',
      });
      onClose();
    } catch (err) {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED' || err?.name === 'EmptyExportError') {
        setError(null);
        return;
      }
      console.error('Level list export failed:', err);
      setError(errorMessage || t('creators.profile.levels.export.errors.exportFailed'));
    } finally {
      abortRef.current = null;
      setExporting(false);
      setProgress(null);
    }
  };

  const progressLabel =
    exporting && progress
      ? (typeof progressText === 'function'
          ? progressText(progress)
          : t('creators.profile.levels.export.progress', {
              fetched: progress.fetched,
              total: progress.total ?? '…',
            }))
      : null;

  return (
    <PopupShell
      onClose={onClose}
      closeDisabled={exporting}
      overlayClassName="level-list-export-popup__overlay"
      panelClassName="level-list-export-popup"
    >
        <CloseButton
          variant="floating"
          className="level-list-export-popup__close-btn"
          onClick={handleCancel}
          disabled={exporting}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="level-list-export-popup__content">
          <h2 className="level-list-export-popup__title">
            {title || t('creators.profile.levels.export.title', { contextName: displayName })}
          </h2>

          <p className="level-list-export-popup__description">
            {description || t('creators.profile.levels.export.description', {
              contextName: displayName,
            })}
          </p>

          {showScope && (
            <div className="level-list-export-popup__scope">
              <StateDisplay
                currentState={exportScope}
                states={EXPORT_SCOPE_STATES}
                activeStates={['requestExportFilters']}
                onChange={setExportScope}
                label={scopeLabel || t('levelRequests.list.export.scope')}
                width={72}
              />
            </div>
          )}

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
                ? (exportingLabel || t('creators.profile.levels.export.exporting'))
                : (exportLabel || t('creators.profile.levels.export.export'))}
            </button>
          </div>
        </div>
    </PopupShell>
  );
};

export default LevelListExportPopup;
