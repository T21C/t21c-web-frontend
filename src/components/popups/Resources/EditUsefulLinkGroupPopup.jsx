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
    name: source?.name || '',
  };
}

function normalizeFields(fields) {
  return {
    name: (fields?.name || '').trim(),
  };
}

const EditUsefulLinkGroupPopup = ({
  title,
  group,
  languageMap = {},
  onClose,
  onSave,
  onAddLocale,
  onRemoveLocale,
}) => {
  const { t } = useTranslation(['pages', 'common']);
  const locales = useMemo(() => {
    if (Array.isArray(group?.locales) && group.locales.length) return group.locales;
    if (group?.name) {
      return [{ languageCode: DEFAULT_LINK_LANGUAGE, name: group.name }];
    }
    return EMPTY_LOCALES;
  }, [group]);
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
    localeToFields(resolveLinkLocale(locales, activeCode), group),
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
    const next = locales.find((row) => row.languageCode === activeCode);
    setFields(localeToFields(next || resolveLinkLocale(locales, DEFAULT_LINK_LANGUAGE), group));
  }, [group, locales, activeCode]);

  const savedFields = useMemo(() => {
    const next = locales.find((row) => row.languageCode === activeCode);
    return normalizeFields(localeToFields(next || resolveLinkLocale(locales, DEFAULT_LINK_LANGUAGE), group));
  }, [group, locales, activeCode]);

  const isDirty = useMemo(() => {
    const current = normalizeFields(fields);
    return current.name !== savedFields.name;
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
          : resolveLinkLocale(locales, DEFAULT_LINK_LANGUAGE) || group;
      await onAddLocale({
        languageCode: code,
        name: en?.name || '',
      });
      setActiveCode(code);
    });
  };

  const handleRemove = () => {
    if (activeCode === DEFAULT_LINK_LANGUAGE) return;
    const name = languageLabel(activeCode, languageMap);
    if (!window.confirm(t('resources.groups.removeLocaleConfirm', { name }))) return;
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
        name: fields.name,
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
            {t('resources.groups.edit.name')}
            <input
              type="text"
              value={fields.name}
              onChange={(event) => setFields({ ...fields, name: event.target.value })}
              maxLength={64}
              required
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

export default EditUsefulLinkGroupPopup;
