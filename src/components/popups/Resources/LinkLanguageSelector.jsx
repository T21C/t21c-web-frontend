import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';
import { isoToEmoji } from '@/utils';
import { DEFAULT_LINK_LANGUAGE, languageLabel } from '@/utils/usefulLinkLocales';
import './LinkLanguageSelector.css';

const LinkLanguageSelector = ({
  attachedCodes = [],
  activeCode,
  languageMap = {},
  onSelect,
  onAdd,
  disabled = false,
  allowAdd = true,
}) => {
  const { t } = useTranslation(['pages', 'common']);
  const [addCode, setAddCode] = useState(null);

  const addOptions = useMemo(
    () =>
      Object.keys(languageMap)
        .filter((code) => !attachedCodes.includes(code))
        .map((code) => ({
          value: code,
          label: languageLabel(code, languageMap),
        })),
    [languageMap, attachedCodes],
  );

  const handleAdd = async () => {
    if (!addCode || disabled || !allowAdd) return;
    await onAdd(addCode);
    setAddCode(null);
  };

  return (
    <div className="link-language-selector">
      <div className="link-language-selector__chips">
        {attachedCodes.map((code) => {
          const country = languageMap[code]?.countryCode || (code === DEFAULT_LINK_LANGUAGE ? 'us' : code);
          return (
            <button
              key={code}
              type="button"
              className={`link-language-selector__chip${
                activeCode === code ? ' link-language-selector__chip--active' : ''
              }`}
              onClick={() => onSelect(code)}
              disabled={disabled}
            >
              <img src={isoToEmoji(country)} alt="" />
              <span>{languageLabel(code, languageMap)}</span>
              {code === DEFAULT_LINK_LANGUAGE ? (
                <span className="link-language-selector__locked">{t('resources.languages.enLocked')}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {allowAdd ? (
        <div className="link-language-selector__add">
          {addOptions.length ? (
            <>
              <CustomSelect
                options={addOptions}
                value={addOptions.find((option) => option.value === addCode) || null}
                onChange={(option) => setAddCode(option?.value || null)}
                placeholder={t('resources.languages.addPlaceholder')}
                width="16rem"
                isDisabled={disabled}
              />
              <button
                type="button"
                className="btn-fill-secondary"
                onClick={handleAdd}
                disabled={!addCode || disabled}
              >
                {t('resources.languages.add')}
              </button>
            </>
          ) : (
            <p>{t('resources.languages.emptyAdd')}</p>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default LinkLanguageSelector;
