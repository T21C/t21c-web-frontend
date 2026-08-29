import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
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
    shorthand: source?.shorthand || '',
  };
}

function normalizeFields(fields) {
  return {
    title: (fields?.title || '').trim(),
    url: (fields?.url || '').trim(),
    description: (fields?.description || '').trim(),
    shorthand: (fields?.shorthand || '').trim(),
  };
}

const EditUsefulLinkPopup = ({
  title,
  link,
  languageMap = {},
  onClose,
  onSave,
  onAddLocale,
  onRemoveLocale,
}) => {
  const { t } = useTranslation(['pages', 'common']);
  const locales = Array.isArray(link?.locales) ? link.locales : EMPTY_LOCALES;
  const attachedCodes = useMemo(
    () => locales.map((row) => row.languageCode),
    [locales],
  );
  const [activeCode, setActiveCode] = useState(() =>
    attachedCodes.includes(DEFAULT_LINK_LANGUAGE)
      ? DEFAULT_LINK_LANGUAGE
      : attachedCodes[0] || DEFAULT_LINK_LANGUAGE,
  );
  const [fields, setFields] = useState(
    localeToFields(resolveLinkLocale(locales, activeCode), link),
  );
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

  const savedFields = useMemo(() => {
    const list = Array.isArray(link?.locales) ? link.locales : EMPTY_LOCALES;
    const next = list.find((row) => row.languageCode === activeCode);
    return normalizeFields(localeToFields(next || resolveLinkLocale(list, DEFAULT_LINK_LANGUAGE), link));
  }, [link, activeCode]);

  const isDirty = useMemo(() => {
    const current = normalizeFields(fields);
    return (
      current.title !== savedFields.title ||
      current.url !== savedFields.url ||
      current.description !== savedFields.description ||
      current.shorthand !== savedFields.shorthand
    );
  }, [fields, savedFields]);

  const run = async (fn) => {
    setSaving(true);
    try {
      await fn();
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = (code) => {
    if (isDirty && !window.confirm(t('confirmations.unsavedChanges', { ns: 'common' }))) return;
    return run(async () => {
      const en =
        activeCode === DEFAULT_LINK_LANGUAGE
          ? fields
          : resolveLinkLocale(locales, DEFAULT_LINK_LANGUAGE) || link;
      await onAddLocale({
        languageCode: code,
        title: en?.title || '',
        url: en?.url || '',
        description: en?.description || '',
        shorthand: en?.shorthand || '',
      });
      setActiveCode(code);
    });
  };

  const handleRemove = () => {
    if (activeCode === DEFAULT_LINK_LANGUAGE) return;
    const name = languageLabel(activeCode, languageMap);
    if (!window.confirm(t('resources.languages.removeConfirm', { name }))) return;
    return run(() => onRemoveLocale(activeCode));
  };

  const handleSelectLanguage = (code) => {
    if (code === activeCode) return;
    if (isDirty && !window.confirm(t('confirmations.unsavedChanges', { ns: 'common' }))) return;
    setActiveCode(code);
  };

  const requestClose = () => {
    if (saving) return;
    if (isDirty && !window.confirm(t('confirmations.unsavedChanges', { ns: 'common' }))) return;
    onClose();
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (!isDirty) return;
    return run(async () => {
      await onSave({
        languageCode: activeCode,
        title: fields.title,
        url: fields.url,
        description: fields.description,
        shorthand: fields.shorthand,
      });
      onClose();
    });
  };

  return (
    <div
      className="edit-useful-link-popup"
      onClick={requestClose}
    >
      <div
        className="edit-useful-link-popup__content"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="edit-useful-link-popup__header">
          <h2>{title}</h2>
          <CloseButton
            onClick={requestClose}
            aria-label={t('buttons.close', { ns: 'common' })}
            disabled={saving}
          />
        </div>
        <LinkLanguageSelector
          attachedCodes={attachedCodes}
          activeCode={activeCode}
          languageMap={languageMap}
          onSelect={handleSelectLanguage}
          onAdd={handleAdd}
          disabled={saving}
          allowAdd
        />
        <form className="edit-useful-link-popup__form" onSubmit={handleSave}>
          <label>
            {t('resources.links.fields.title')}
            <input
              type="text"
              value={fields.title}
              onChange={(event) => setFields({ ...fields, title: event.target.value })}
              maxLength={255}
              required
              disabled={saving}
            />
          </label>
          <label>
            {t('resources.links.fields.url')}
            <input
              type="text"
              value={fields.url}
              onChange={(event) => setFields({ ...fields, url: event.target.value })}
              placeholder={t('resources.links.fields.urlPlaceholder')}
              required
              disabled={saving}
            />
          </label>
          <label>
            {t('resources.links.fields.shorthand')}
            <input
              type="text"
              value={fields.shorthand}
              onChange={(event) => setFields({ ...fields, shorthand: event.target.value })}
              placeholder={t('resources.links.fields.shorthandPlaceholder')}
              maxLength={64}
              disabled={saving}
            />
          </label>
          <label>
            {t('resources.links.fields.description')}
            <textarea
              rows={3}
              value={fields.description}
              onChange={(event) => setFields({ ...fields, description: event.target.value })}
              maxLength={2000}
              disabled={saving}
            />
          </label>
          <div className="edit-useful-link-popup__actions">
            <div className="edit-useful-link-popup__actions-start">
              {activeCode !== DEFAULT_LINK_LANGUAGE ? (
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
              <button type="button" className="btn-fill-secondary" onClick={requestClose} disabled={saving}>
                {t('buttons.cancel', { ns: 'common' })}
              </button>
              <button type="submit" className="btn-fill-primary" disabled={saving || !isDirty}>
                {t('buttons.save', { ns: 'common' })}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUsefulLinkPopup;
