// tuf-search: #PackItemPlacementPopup #packItemPlacementPopup #popups #packs #placement
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { ChevronIcon } from '@/components/common/icons';
import {
  flattenTreeToPositions,
  getDefaultSlotSelection,
  buildItemPathLabel,
  clampIndentDepth,
  parseLevelIdsInput,
  isPlacementRowVisible,
} from '@/utils/packTreePlacement';
import './PackItemPlacementPopup.css';

const NOTE_BODY_MAX_LENGTH = 2000;

const PackItemPlacementPopup = ({
  isOpen,
  onClose,
  mode = 'add-folder',
  packItems = [],
  movingItem = null,
  onSubmit,
  submitting = false,
}) => {
  const { t } = useTranslation(['components', 'common']);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [noteName, setNoteName] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [levelIdsInput, setLevelIdsInput] = useState('');
  const [selectedSlotKey, setSelectedSlotKey] = useState(null);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState(() => new Set());

  const excludeId = mode === 'move' && movingItem ? movingItem.id : null;

  const positionRows = useMemo(
    () => flattenTreeToPositions(packItems, { excludeId }),
    [packItems, excludeId],
  );

  const resetState = useCallback(() => {
    setFolderName('');
    setFolderDescription('');
    setNoteName('');
    setNoteDescription('');
    setLevelIdsInput('');
    setSelectedSlotKey(null);
    setCollapsedFolderIds(new Set());
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }
    const defaultSlot = getDefaultSlotSelection(packItems, {
      excludeId,
      movingItem: mode === 'move' ? movingItem : null,
    });
    setSelectedSlotKey(defaultSlot.slotKey);
    setCollapsedFolderIds(new Set());
  }, [isOpen, packItems, excludeId, movingItem, mode, resetState]);

  const toggleFolderCollapsed = (folderId) => {
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  if (!isOpen) {
    return null;
  }

  const movingPath =
    mode === 'move' && movingItem
      ? buildItemPathLabel(packItems, movingItem.id)
      : '';

  const titleKey =
    mode === 'add-folder'
      ? 'packPopups.placement.titleAddFolder'
      : mode === 'add-level'
        ? 'packPopups.placement.titleAddLevel'
        : mode === 'add-note'
          ? 'packPopups.placement.titleAddNote'
          : 'packPopups.placement.titleMove';

  const canSubmitMove = Boolean(selectedSlotKey) && !submitting;
  const parsedLevelIds = parseLevelIdsInput(levelIdsInput);
  const canSubmitAddFolder =
    folderName.trim().length > 0 && Boolean(selectedSlotKey) && !submitting;
  const canSubmitAddLevel =
    parsedLevelIds.length > 0 && Boolean(selectedSlotKey) && !submitting;
  const canSubmitAddNote =
    noteName.trim().length > 0 && Boolean(selectedSlotKey) && !submitting;

  const canSubmit =
    mode === 'move'
      ? canSubmitMove
      : mode === 'add-level'
        ? canSubmitAddLevel
        : mode === 'add-note'
          ? canSubmitAddNote
          : canSubmitAddFolder;

  const handleSubmit = () => {
    if (!canSubmit || !onSubmit) return;
    const slot = positionRows.find(
      (r) => r.kind === 'slot' && r.slotKey === selectedSlotKey,
    );
    if (!slot) return;

    onSubmit({
      mode,
      parentId: slot.parentId,
      index: slot.index,
      name: mode === 'add-folder'
        ? folderName.trim()
        : mode === 'add-note'
          ? noteName.trim()
          : undefined,
      description: mode === 'add-folder'
        ? folderDescription
        : mode === 'add-note'
          ? noteDescription
          : undefined,
      levelIds: mode === 'add-level' ? levelIdsInput.trim() : undefined,
    });
  };

  const primaryLabel =
    mode === 'move'
      ? t('packPopups.placement.move')
      : mode === 'add-level'
        ? t('packPopups.placement.addLevels')
        : mode === 'add-note'
          ? t('packPopups.placement.addNote')
          : t('packPopups.placement.addFolder');

  const indentRem = (depth) => `${0.5 + clampIndentDepth(depth) * 1.1}rem`;

  return (
    <PopupShell
      onClose={onClose}
      overlayClassName="pack-item-placement-popup__overlay"
      panelClassName="pack-item-placement-popup"
    >
        <CloseButton
          variant="floating"
          className="pack-item-placement-popup__close-btn"
          onClick={onClose}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="pack-item-placement-popup__content">
          <h2 className="pack-item-placement-popup__title">
            {t(titleKey, { path: movingPath })}
          </h2>

          {mode === 'move' && movingPath && (
            <p className="pack-item-placement-popup__subtitle">{movingPath}</p>
          )}

          {mode === 'add-folder' && (
            <>
              <label className="pack-item-placement-popup__field">
                <span className="pack-item-placement-popup__label">
                  {t('packPopups.placement.folderName')}
                </span>
                <input
                  type="text"
                  className="pack-item-placement-popup__input"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder={t('packPopups.placement.folderNamePlaceholder')}
                  autoFocus
                />
              </label>
              <label className="pack-item-placement-popup__field">
                <span className="pack-item-placement-popup__label">
                  {t('packPopups.placement.folderDescription')}
                </span>
                <textarea
                  className="pack-item-placement-popup__textarea"
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  placeholder={t('packPopups.placement.folderDescriptionPlaceholder')}
                  maxLength={2000}
                  rows={3}
                />
              </label>
            </>
          )}

          {mode === 'add-level' && (
            <label className="pack-item-placement-popup__field">
              <span className="pack-item-placement-popup__label">
                {t('packPopups.placement.levelIds')}
              </span>
              <input
                type="text"
                className="pack-item-placement-popup__input"
                value={levelIdsInput}
                onChange={(e) => setLevelIdsInput(e.target.value)}
                placeholder={t('packPopups.placement.levelIdsPlaceholder')}
                autoFocus
              />
            </label>
          )}

          {mode === 'add-note' && (
            <>
              <label className="pack-item-placement-popup__field">
                <span className="pack-item-placement-popup__label">
                  {t('packPopups.placement.noteTitle')}
                </span>
                <input
                  type="text"
                  className="pack-item-placement-popup__input"
                  value={noteName}
                  onChange={(e) => setNoteName(e.target.value)}
                  placeholder={t('packPopups.placement.noteTitlePlaceholder')}
                  maxLength={255}
                  autoFocus
                />
              </label>
              <label className="pack-item-placement-popup__field">
                <span className="pack-item-placement-popup__label">
                  {t('packPopups.placement.noteBody')}
                </span>
                <textarea
                  className="pack-item-placement-popup__textarea"
                  value={noteDescription}
                  onChange={(e) => setNoteDescription(e.target.value)}
                  placeholder={t('packPopups.placement.noteBodyPlaceholder')}
                  maxLength={NOTE_BODY_MAX_LENGTH}
                  rows={5}
                />
                <span className="pack-item-placement-popup__position-hint">
                  {t('packPopups.placement.noteBodyHelp')}
                </span>
              </label>
            </>
          )}

          <div className="pack-item-placement-popup__position-section">
            <span className="pack-item-placement-popup__label">
              {t('packPopups.placement.positionLabel')}
            </span>
            <p className="pack-item-placement-popup__position-hint">
              {t('packPopups.placement.dividerHint')}
            </p>
            <div
              className="pack-item-placement-popup__tree"
              role="listbox"
              aria-label={t('packPopups.placement.positionLabel')}
            >
              {positionRows.map((row, idx) => {
                if (!isPlacementRowVisible(row, collapsedFolderIds)) {
                  return null;
                }

                if (row.kind === 'slot') {
                  const isSelected = selectedSlotKey === row.slotKey;
                  const parentPath =
                    row.parentId === 0
                      ? t('packPopups.placement.root')
                      : buildItemPathLabel(packItems, row.parentId);
                  return (
                    <button
                      key={row.slotKey}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-label={t('packPopups.placement.insertHere', {
                        path: parentPath,
                        index: row.index,
                      })}
                      className={`pack-item-placement-popup__slot-divider ${isSelected ? 'is-selected' : ''}`}
                      style={{ paddingLeft: indentRem(row.depth) }}
                      onClick={() => setSelectedSlotKey(row.slotKey)}
                    >
                      <span className="pack-item-placement-popup__slot-divider-line" />
                      <span className="pack-item-placement-popup__slot-divider-label">
                        {t('packPopups.placement.insertShort', { index: row.index })}
                      </span>
                    </button>
                  );
                }

                if (row.kind === 'folder-header') {
                  const isCollapsed = collapsedFolderIds.has(row.folderId);
                  return (
                    <button
                      key={`folder-${row.folderId}`}
                      type="button"
                      className="pack-item-placement-popup__folder-header"
                      style={{ paddingLeft: indentRem(row.depth) }}
                      onClick={() => toggleFolderCollapsed(row.folderId)}
                      aria-expanded={!isCollapsed}
                    >
                      <ChevronIcon
                        size={16}
                        direction={isCollapsed ? 'right' : 'down'}
                        className="pack-item-placement-popup__folder-chevron"
                      />
                      <span className="pack-item-placement-popup__folder-icon" aria-hidden>
                        📁
                      </span>
                      <span className="pack-item-placement-popup__folder-label">{row.label}</span>
                      <span className="pack-item-placement-popup__folder-count">
                        {row.childCount}
                      </span>
                    </button>
                  );
                }

                if (row.kind === 'level-ref' || row.kind === 'note-ref') {
                  const isNote = row.kind === 'note-ref';
                  return (
                    <div
                      key={`${isNote ? 'note' : 'level'}-${row.item.id}-${idx}`}
                      className={`pack-item-placement-popup__level-ref${isNote ? ' pack-item-placement-popup__note-ref' : ''}`}
                      style={{ paddingLeft: indentRem(row.depth) }}
                      title={row.label}
                    >
                      <span className="pack-item-placement-popup__level-ref-icon" aria-hidden>
                        {isNote ? '📝' : '🎵'}
                      </span>
                      <span className="pack-item-placement-popup__level-ref-label">{row.label}</span>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>

          <div className="pack-item-placement-popup__actions">
            <button
              type="button"
              className="btn-fill-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              type="button"
              className="btn-fill-primary"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? t('packPopups.placement.submitting') : primaryLabel}
            </button>
          </div>
        </div>
    </PopupShell>
  );
};

export default PackItemPlacementPopup;
