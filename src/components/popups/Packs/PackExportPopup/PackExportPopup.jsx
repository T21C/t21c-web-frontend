// tuf-search: #PackExportPopup #packExportPopup #popups #packs #packExport
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { CloseButton } from '@/components/common/buttons';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { buildExportRows, downloadPackExport } from '@/utils/packExportUtils';
import './PackExportPopup.css';

const PackExportPopup = ({
  isOpen,
  onClose,
  packName,
  pack,
  packItems,
}) => {
  const { t } = useTranslation(['components', 'common']);
  const popupRef = useRef(null);
  const { difficultyDict, curationTypesDict } = useDifficultyContext();
  const [format, setFormat] = useState('xlsx');
  const [includeFolders, setIncludeFolders] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const resetState = useCallback(() => {
    setFormat('xlsx');
    setIncludeFolders(true);
    setExporting(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
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
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleExport = async () => {
    setError(null);
    setExporting(true);
    try {
      const { headers, rows } = buildExportRows(
        pack,
        packItems,
        { includeFolders },
        {
          difficultyDict,
          curationTypesDict,
          unavailableLabel: t('packPopups.exportPack.unavailable'),
        },
      );
      await downloadPackExport({
        format,
        packName: packName || pack?.name,
        headers,
        rows,
      });
      onClose();
    } catch (err) {
      console.error('Pack export failed:', err);
      setError(t('packPopups.exportPack.errors.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const displayName = packName || pack?.name || t('packPopups.exportPack.defaultContextName');

  return (
    <div className="pack-export-popup__overlay">
      <div className="pack-export-popup" ref={popupRef}>
        <CloseButton
          variant="floating"
          className="pack-export-popup__close-btn"
          onClick={onClose}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="pack-export-popup__content">
          <h2 className="pack-export-popup__title">
            {t('packPopups.exportPack.title', { contextName: displayName })}
          </h2>

          <p className="pack-export-popup__description">
            {t('packPopups.exportPack.description', { contextName: displayName })}
          </p>

          <fieldset className="pack-export-popup__fieldset">
            <legend className="pack-export-popup__legend">
              {t('packPopups.exportPack.formatLabel')}
            </legend>
            <div className="pack-export-popup__radio-group">
              <label className="pack-export-popup__radio-label">
                <input
                  type="radio"
                  name="pack-export-format"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={() => setFormat('xlsx')}
                />
                {t('packPopups.exportPack.format.xlsx')}
              </label>
              <label className="pack-export-popup__radio-label">
                <input
                  type="radio"
                  name="pack-export-format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                />
                {t('packPopups.exportPack.format.csv')}
              </label>
            </div>
          </fieldset>

          <fieldset className="pack-export-popup__fieldset">
            <legend className="pack-export-popup__legend">
              {t('packPopups.exportPack.structureLabel')}
            </legend>
            <div className="pack-export-popup__radio-group">
              <label className="pack-export-popup__radio-label">
                <input
                  type="radio"
                  name="pack-export-structure"
                  checked={includeFolders}
                  onChange={() => setIncludeFolders(true)}
                />
                {t('packPopups.exportPack.structure.includeFolders')}
              </label>
              <label className="pack-export-popup__radio-label">
                <input
                  type="radio"
                  name="pack-export-structure"
                  checked={!includeFolders}
                  onChange={() => setIncludeFolders(false)}
                />
                {t('packPopups.exportPack.structure.flatten')}
              </label>
            </div>
          </fieldset>

          {error && (
            <div className="pack-export-popup__error" role="alert">
              {error}
            </div>
          )}

          <div className="pack-export-popup__actions">
            <button
              type="button"
              className="pack-export-popup__secondary-btn"
              onClick={onClose}
              disabled={exporting}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              type="button"
              className="pack-export-popup__primary-btn"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting
                ? t('packPopups.exportPack.exporting')
                : t('packPopups.exportPack.export')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackExportPopup;
