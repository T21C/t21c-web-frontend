// tuf-search: #SearchField #searchField #searchClear
import { forwardRef, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import './searchField.css';

function assignRef(ref, node) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}

export const SearchField = forwardRef(function SearchField(
  {
    value,
    onChange,
    onKeyDown,
    className = '',
    style,
    disabled = false,
    clearLabel,
    name,
    ...rest
  },
  ref,
) {
  const { t } = useTranslation('common');
  const inputRef = useRef(null);
  const controlled = value !== undefined;
  const text = controlled && value != null ? String(value) : '';
  const showClear = controlled && text.length > 0 && !disabled;
  const label = clearLabel || t('buttons.clearSearch');

  const setInputRef = (node) => {
    inputRef.current = node;
    assignRef(ref, node);
  };

  const handleClear = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onChange?.({
      type: 'change',
      target: { value: '', name: name || '' },
      currentTarget: { value: '', name: name || '' },
      preventDefault() {},
      stopPropagation() {},
    });
    inputRef.current?.focus();
  };

  return (
    <div className={`search-field${showClear ? ' search-field--filled' : ''}`}>
      <input
        {...rest}
        ref={setInputRef}
        name={name}
        disabled={disabled}
        className={className}
        style={showClear ? { ...style, paddingRight: '1.9rem' } : style}
        value={controlled ? (value ?? '') : undefined}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      {showClear && (
        <button
          type="button"
          className="search-field__clear"
          aria-label={label}
          title={label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleClear}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

SearchField.displayName = 'SearchField';

SearchField.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onKeyDown: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
  disabled: PropTypes.bool,
  clearLabel: PropTypes.string,
  name: PropTypes.string,
};

export default SearchField;
