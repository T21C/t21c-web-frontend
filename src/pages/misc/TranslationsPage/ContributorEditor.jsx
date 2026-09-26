// tuf-search: #ContributorEditor #contributorEditor #translations
import { useCallback, useMemo, useRef, useState } from 'react';
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
import toast from 'react-hot-toast';
import { DragHandleIcon, EditIcon, TrashIcon } from '@/components/common/icons';
import { useUnsavedClose } from '@/hooks/useUnsavedClose';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { toastDurationForMessage } from '@/utils/toastMessage';

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

const ContributorEditor = ({ languageCode, names, header, children, onSaved }) => {
  const { t } = useTranslation(['pages', 'common']);
  const nextId = useRef(1);
  const baselineRef = useRef(names);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const currentNames = useMemo(() => trimmedNames(rows), [rows]);
  const dirty = editing && !sameNames(currentNames, baselineRef.current);

  const closeEdit = useCallback(() => {
    setEditing(false);
    setRows([]);
  }, []);

  const { requestClose } = useUnsavedClose({ isDirty: dirty, onClose: closeEdit });

  const openEdit = () => {
    const baseline = names.map((name) => name.trim()).filter(Boolean);
    baselineRef.current = baseline;
    setRows(baseline.map((name) => ({ id: String(nextId.current++), name })));
    setEditing(true);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((current) => {
      const oldIndex = current.findIndex((row) => row.id === active.id);
      const newIndex = current.findIndex((row) => row.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading(t('loading.saving', { ns: 'common' }));
    try {
      const response = await api.put(routes.admin.translationContributors(languageCode), {
        names: currentNames,
      });
      const saved = Array.isArray(response.data?.names)
        ? response.data.names.filter((name) => typeof name === 'string')
        : currentNames;
      baselineRef.current = saved;
      setEditing(false);
      setRows([]);
      const savedText = t('translations.languages.contributorsSaved');
      toast.success(savedText, { id: toastId, duration: toastDurationForMessage(savedText) });
      onSaved(saved);
    } catch (saveError) {
      const message = saveError?.response?.data?.error || saveError.message || 'Unknown error';
      const errorText = t('translations.languages.contributorsSaveError', { message });
      toast.error(errorText, { id: toastId, duration: toastDurationForMessage(errorText) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="translations-page__language-header">
        {header}
        <button
          type="button"
          className={`btn-icon btn-sm translations-page__language-edit ${editing ? 'btn-fill-accent' : 'btn-fill-neutral-dark'}`}
          aria-label={t('buttons.edit', { ns: 'common' })}
          aria-pressed={editing}
          disabled={saving}
          onClick={editing ? requestClose : openEdit}
        >
          <EditIcon size="16px" color="currentColor" />
        </button>
      </div>
      {children}
      {editing && (
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
                    }}
                    onRemove={(id) => {
                      setRows((current) => current.filter((item) => item.id !== id));
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="translations-page__contributor-actions">
            <button
              type="button"
              className="btn-fill-neutral btn-sm"
              onClick={() => {
                setRows((current) => [...current, { id: String(nextId.current++), name: '' }]);
              }}
              disabled={saving || rows.length >= MAX_CONTRIBUTORS}
            >
              {t('buttons.add', { ns: 'common' })}
            </button>
            <div className="translations-page__contributor-commit">
              <button
                type="button"
                className="btn-fill-neutral btn-sm"
                onClick={requestClose}
                disabled={saving}
              >
                {t('buttons.cancel', { ns: 'common' })}
              </button>
              <button
                type="button"
                className="btn-fill-primary btn-sm"
                onClick={handleSave}
                disabled={saving || !dirty}
              >
                {saving ? t('loading.saving', { ns: 'common' }) : t('buttons.save', { ns: 'common' })}
              </button>
            </div>
          </div>
        </div>
      )}
      {!editing && names.length > 0 && (
        <div className="translations-page__language-contributors">
          <span className="translations-page__language-contributors-label">
            {t('translations.languages.contributors')}
          </span>
          <span className="translations-page__language-contributors-names">
            {names.join(', ')}
          </span>
        </div>
      )}
    </>
  );
};

export default ContributorEditor;
