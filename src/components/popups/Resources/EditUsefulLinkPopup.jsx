import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import { ItemPickManager } from '@/components/common/selectors';
import { TrashIcon } from '@/components/common/icons';
import {
  DEFAULT_LINK_LANGUAGE,
  languageLabel,
  resolveLinkLocale,
} from '@/utils/usefulLinkLocales';
import LinkLanguageSelector from './LinkLanguageSelector';
import './EditUsefulLinkPopup.css';

const EMPTY_LOCALES = [];

function localeToFields(locale, fallback) {
  const source = locale || fallback;
  return {
    title: source?.title || '',
    url: source?.url || '',
    description: source?.description || '',
  };
}

const EditUsefulLinkPopup = ({
  title,
  link,
  languageMap = {},
  tags,
  pickerLabels,
  showPublished = false,
  canEditLink = true,
  itemId,
  localeDefaults = [],
  initialLanguageCode,
  onClose,
  onSave,
  onAddLocale,
  onRemoveLocale,
  onSetDefault,
  onDeleteItem,
}) => {
  const { t } = useTranslation(['pages', 'common']);
  const locales = Array.isArray(link?.locales) ? link.locales : EMPTY_LOCALES;
  const attachedCodes = useMemo(
    () => locales.map((row) => row.languageCode),
    [locales],
  );
  const [activeCode, setActiveCode] = useState(() => {
    if (initialLanguageCode && attachedCodes.includes(initialLanguageCode)) {
      return initialLanguageCode;
    }
    return attachedCodes.includes(DEFAULT_LINK_LANGUAGE)
      ? DEFAULT_LINK_LANGUAGE
      : attachedCodes[0] || DEFAULT_LINK_LANGUAGE;
  });
  const [fields, setFields] = useState(
    localeToFields(resolveLinkLocale(locales, activeCode), link),
  );
  const [tagIds, setTagIds] = useState((link?.tags || []).map((tag) => tag.id));
  const [isPublished, setIsPublished] = useState(Boolean(link?.isPublished));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (attachedCodes.length && !attachedCodes.includes(activeCode)) {
      setActiveCode(
        attachedCodes.includes(DEFAULT_LINK_LANGUAGE)
          ? DEFAULT_LINK_LANGUAGE
          : attachedCodes[0],
      );
    }
  }, [attachedCodes, activeCode]);

  useEffect(() => {
    const list = Array.isArray(link?.locales) ? link.locales : EMPTY_LOCALES;
    const next = list.find((row) => row.languageCode === activeCode);
    setFields(localeToFields(next || resolveLinkLocale(list, DEFAULT_LINK_LANGUAGE), link));
  }, [link, activeCode]);

  const run = async (fn) => {
    setSaving(true);
    try {
      await fn();
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = (code) =>
    run(async () => {
      const en =
        activeCode === DEFAULT_LINK_LANGUAGE
          ? fields
          : resolveLinkLocale(locales, DEFAULT_LINK_LANGUAGE) || link;
      await onAddLocale({
        languageCode: code,
        title: en?.title || '',
        url: en?.url || '',
        description: en?.description || '',
      });
      setActiveCode(code);
    });

  const handleRemove = () => {
    if (activeCode === DEFAULT_LINK_LANGUAGE) return;
    const name = languageLabel(activeCode, languageMap);
    if (!window.confirm(t('resources.languages.removeConfirm', { name }))) return;
    return run(() => onRemoveLocale(activeCode));
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (!canEditLink) return;
    return run(() =>
      onSave({
        languageCode: activeCode,
        title: fields.title,
        url: fields.url,
        description: fields.description,
        tagIds,
        isPublished,
      }),
    );
  };

  const isDefault = Boolean(
    itemId &&
      localeDefaults.some(
        (row) => row.languageCode === activeCode && Number(row.itemId) === Number(itemId),
      ),
  );
  const fieldsLocked = saving || !canEditLink;
  const showTags = canEditLink && Array.isArray(tags) && pickerLabels;

  return (
    <div
      className="edit-useful-link-popup"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="edit-useful-link-popup__content"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="edit-useful-link-popup__header">
          <h2>{title}</h2>
          <CloseButton
            onClick={onClose}
            aria-label={t('buttons.close', { ns: 'common' })}
            disabled={saving}
          />
        </div>
        <LinkLanguageSelector
          attachedCodes={attachedCodes}
          activeCode={activeCode}
          languageMap={languageMap}
          onSelect={setActiveCode}
          onAdd={handleAdd}
          disabled={saving}
          allowAdd={canEditLink}
        />
        <form className="edit-useful-link-popup__form" onSubmit={handleSave}>
          <label>
            {t('resources.links.fields.title')}
            <input
              type="text"
              value={fields.title}
              onChange={(event) => setFields({ ...fields, title: event.target.value })}
              maxLength={255}
              required={canEditLink}
              disabled={fieldsLocked}
            />
          </label>
          <label>
            {t('resources.links.fields.url')}
            <input
              type="text"
              value={fields.url}
              onChange={(event) => setFields({ ...fields, url: event.target.value })}
              placeholder={t('resources.links.fields.urlPlaceholder')}
              required={canEditLink}
              disabled={fieldsLocked}
            />
          </label>
          <label>
            {t('resources.links.fields.description')}
            <textarea
              rows={3}
              value={fields.description}
              onChange={(event) => setFields({ ...fields, description: event.target.value })}
              maxLength={2000}
              disabled={fieldsLocked}
            />
          </label>
          {showPublished && canEditLink ? (
            <label className="edit-useful-link-popup__check">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(event) => setIsPublished(event.target.checked)}
                disabled={fieldsLocked}
              />
              <span>{t('resources.links.fields.published')}</span>
            </label>
          ) : null}
          {showTags ? (
            <div className="edit-useful-link-popup__tags">
              <span>{t('resources.links.fields.tags')}</span>
              <ItemPickManager
                items={tags}
                selectedIds={tagIds}
                onSelectedIdsChange={setTagIds}
                enableGrouping
                fallbackGroupLabel={t('resources.ungrouped')}
                labels={pickerLabels}
              />
            </div>
          ) : null}
          <div className="edit-useful-link-popup__actions">
            <div className="edit-useful-link-popup__actions-start">
              {onSetDefault ? (
                <button
                  type="button"
                  className="btn-fill-secondary"
                  disabled={saving || isDefault}
                  onClick={() => run(() => onSetDefault(activeCode))}
                >
                  {t('resources.clusters.defaults.setDefault', { code: activeCode.toUpperCase() })}
                </button>
              ) : null}
              {onDeleteItem ? (
                <button
                  type="button"
                  className="btn-fill-danger edit-useful-link-popup__icon-btn"
                  disabled={saving}
                  onClick={() => run(() => onDeleteItem())}
                  aria-label={t('resources.clusters.items.remove')}
                >
                  <TrashIcon color="#fff" size="16px" />
                </button>
              ) : null}
              {canEditLink && activeCode !== DEFAULT_LINK_LANGUAGE ? (
                <button
                  type="button"
                  className="btn-fill-danger"
                  disabled={saving}
                  onClick={handleRemove}
                >
                  {t('resources.languages.remove')}
                </button>
              ) : null}
            </div>
            <div className="edit-useful-link-popup__actions-end">
              <button type="button" className="btn-fill-secondary" onClick={onClose} disabled={saving}>
                {t('buttons.cancel', { ns: 'common' })}
              </button>
              {canEditLink ? (
                <button type="submit" className="btn-fill-primary" disabled={saving}>
                  {t('buttons.save', { ns: 'common' })}
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUsefulLinkPopup;
