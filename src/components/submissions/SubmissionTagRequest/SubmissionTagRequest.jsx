// tuf-search: #SubmissionTagRequest #submissionTagRequest #submissions #tags
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { TagManagementPopup } from '@/components/popups/Levels/EditLevelPopup/TagManagementPopup';
import './submissionTagRequest.css';

const normalizeIds = (ids) => {
  const seen = new Set();
  const next = [];
  (Array.isArray(ids) ? ids : []).forEach((id) => {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0 || seen.has(n)) return;
    seen.add(n);
    next.push(n);
  });
  return next;
};

export default function SubmissionTagRequest({
  tagIds = [],
  onChange,
  disabled = false,
  variant = 'form',
}) {
  const { t } = useTranslation(variant === 'form' ? ['pages', 'common'] : ['components', 'common']);
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const ids = useMemo(() => normalizeIds(tagIds), [tagIds]);
  const catalogById = useMemo(() => new Map(catalog.map((tag) => [Number(tag.id), tag])), [catalog]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setCatalogLoading(true);
      try {
        const response = await api.get(`${routes.database.difficulties.root()}/tags`);
        if (!cancelled) setCatalog(response.data || []);
      } catch (err) {
        console.error('Error fetching tags:', err);
        if (!cancelled) setCatalog([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(
    () => ids.map((id) => catalogById.get(id) || { id, name: `#${id}` }),
    [ids, catalogById],
  );

  const currentTags = useMemo(
    () => items.map((tag) => (tag.isCommunity ? { ...tag, pinned: true } : tag)),
    [items],
  );

  const buttonLabel = variant === 'form'
    ? t('levelSubmission.buttons.requestTags')
    : t('levelSubmissions.buttons.requestTags');
  const emptyHint = variant === 'form'
    ? t('levelSubmission.placeholders.tags')
    : t('levelSubmissions.details.tagsEmpty');

  const handleSave = async (tags) => {
    const nextIds = normalizeIds((tags || []).map((tag) => tag.id));
    await onChange(nextIds);
  };

  return (
    <div className="submission-tag-request">
      <button
        type="button"
        className="submission-tag-request__button btn-fill-neutral"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {buttonLabel}
      </button>
      {!catalogLoading && ids.length === 0 && (
        <span className="submission-tag-request__hint">{emptyHint}</span>
      )}
      {!catalogLoading && ids.length > 0 && (
        <div className="submission-tag-request__icons">
          {items.map((item) => (
            <span key={item.id} className="submission-tag-request__item" title={item.name}>
              {item.icon && (
                <img
                  src={selectIconSize(item.icon, ICON_SIZE.SMALL)}
                  alt=""
                  className="submission-tag-request__icon"
                />
              )}
              {!item.icon && (
                <span className="submission-tag-request__name">{item.name}</span>
              )}
            </span>
          ))}
        </div>
      )}
      {open && (
        <TagManagementPopup
          currentTags={currentTags}
          onClose={() => setOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
