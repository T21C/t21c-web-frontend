// tuf-search: #DevelopersRedirectChips
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateRedirectUri } from './redirectUriUtils';

/**
 * @param {{ uris: string[], onChange: (uris: string[]) => void, disabled?: boolean, max?: number }} props
 */
const DevelopersRedirectChips = ({ uris, onChange, disabled = false, max = 10 }) => {
  const { t } = useTranslation('pages');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);

  const addUri = () => {
    const next = draft.trim();
    if (!next) return;
    const check = validateRedirectUri(next);
    if (!check.ok) {
      setError(t(`developers.redirectErrors.${check.error}`));
      return;
    }
    if (uris.includes(next)) {
      setError(t('developers.redirectErrors.duplicate'));
      return;
    }
    if (uris.length >= max) {
      setError(t('developers.redirectErrors.max'));
      return;
    }
    setError(null);
    onChange([...uris, next]);
    setDraft('');
  };

  const removeUri = (uri) => {
    onChange(uris.filter((u) => u !== uri));
  };

  return (
    <div className="developers-portal__chips-field">
      <div className="developers-portal__chips">
        {uris.map((uri) => (
          <span key={uri} className="developers-portal__chip">
            <span className="developers-portal__chip-text">{uri}</span>
            {!disabled && (
              <button
                type="button"
                className="developers-portal__chip-remove"
                onClick={() => removeUri(uri)}
                aria-label={t('developers.removeRedirect')}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="developers-portal__chip-add">
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUri();
              }
            }}
            placeholder={t('developers.redirectPlaceholder')}
            disabled={disabled}
          />
          <button
            type="button"
            className="developers-portal__btn developers-portal__btn--secondary"
            onClick={addUri}
            disabled={disabled}
          >
            {t('developers.addRedirect')}
          </button>
        </div>
      )}
      <p className="developers-portal__hint">{t('developers.redirectHint')}</p>
      {error && (
        <p className="developers-portal__field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default DevelopersRedirectChips;
