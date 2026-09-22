// tuf-search: #ContributorEditor #contributorEditor #translations
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandleIcon, TrashIcon } from '@/components/common/icons';
import api from '@/utils/api';
import { routes } from '@/api/routes';

const MAX_CONTRIBUTORS = 40;

function trimmedNames(rows) {
  return rows.map((row) => row.name.trim()).filter(Boolean);
}

function sameNames(left, right) {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function SortableContributorRow({ row, onChange, onRemove }) {
  const { t } = useTranslation(['pages', 'common']);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="translations-page__contributor-row">
      <button
        type="button"
        className="btn-fill-neutral-dark btn-icon btn-sm translations-page__contributor-handle"
        aria-label={t('translations.languages.dragContributor')}
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon size="16px" />
      </button>
      <input
        type="text"
        value={row.name}
        maxLength={80}
        autoComplete="off"
        spellCheck={false}
        placeholder={t('translations.languages.contributorPlaceholder')}
        aria-label={t('translations.languages.contributorPlaceholder')}
        onChange={(event) => onChange(row.id, event.target.value)}
      />
      <button
        type="button"
        className="btn-fill-neutral-dark btn-icon btn-sm"
        aria-label={t('buttons.remove', { ns: 'common' })}
        onClick={() => onRemove(row.id)}
      >
        <TrashIcon size="16px" />
      </button>
    </div>
  );
}

const ContributorEditor = ({ languageCode, names, onSaved }) => {
  const { t } = useTranslation(['pages', 'common']);
  const nextId = useRef(1);
  const [rows, setRows] = useState(() =>
    names.map((name) => ({ id: String(nextId.current++), name })),
  );
  const [savedNames, setSavedNames] = useState(() =>
    names.map((name) => name.trim()).filter(Boolean),
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const currentNames = useMemo(() => trimmedNames(rows), [rows]);
  const dirty = !sameNames(currentNames, savedNames);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((current) => {
      const oldIndex = current.findIndex((row) => row.id === active.id);
      const newIndex = current.findIndex((row) => row.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
    setStatus(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await api.put(routes.admin.translationContributors(languageCode), {
        names: currentNames,
      });
      const saved = Array.isArray(response.data?.names)
        ? response.data.names.filter((name) => typeof name === 'string')
        : currentNames;
      setSavedNames(saved);
      setRows(saved.map((name) => ({ id: String(nextId.current++), name })));
      setStatus({ kind: 'ok', text: t('translations.languages.contributorsSaved') });
      onSaved(saved);
    } catch (saveError) {
      const message = saveError?.response?.data?.error || saveError.message || 'Unknown error';
      setStatus({
        kind: 'error',
        text: t('translations.languages.contributorsSaveError', { message }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="translations-page__contributor-editor">
      <span className="translations-page__language-contributors-label">
        {t('translations.languages.contributors')}
      </span>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          <div className="translations-page__contributor-list">
            {rows.map((row) => (
              <SortableContributorRow
                key={row.id}
                row={row}
                onChange={(id, name) => {
                  setRows((current) =>
                    current.map((item) => (item.id === id ? { ...item, name } : item)),
                  );
                  setStatus(null);
                }}
                onRemove={(id) => {
                  setRows((current) => current.filter((item) => item.id !== id));
                  setStatus(null);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="translations-page__contributor-actions">
        <button
          type="button"
          className="translations-page__button translations-page__button--neutral"
          onClick={() => {
            setRows((current) => [...current, { id: String(nextId.current++), name: '' }]);
            setStatus(null);
          }}
          disabled={saving || rows.length >= MAX_CONTRIBUTORS}
        >
          {t('buttons.add', { ns: 'common' })}
        </button>
        <button
          type="button"
          className="translations-page__button"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? t('loading.saving', { ns: 'common' }) : t('buttons.save', { ns: 'common' })}
        </button>
      </div>
      {status && (
        <p
          className={`translations-page__contributor-status${status.kind === 'error' ? ' error' : ''}`}
        >
          {status.text}
        </p>
      )}
    </div>
  );
};

export default ContributorEditor;
