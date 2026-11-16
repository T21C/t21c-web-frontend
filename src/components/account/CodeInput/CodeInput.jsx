import React from 'react';
import './codeInput.css';

/**
 * Shared opaque code entry for email verify, password reset, and TOTP.
 */
const CodeInput = ({
  id = 'opaque-code',
  label = 'Verification code',
  value,
  onChange,
  disabled = false,
  autoComplete = 'one-time-code',
  length = 8,
  numeric = false,
}) => {
  const handleChange = (e) => {
    const raw = e.target.value || '';
    const next = numeric
      ? raw.replace(/[^0-9]/g, '')
      : raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
    onChange(next.slice(0, length));
  };

  return (
    <div className="code-input">
      <label htmlFor={id} className="code-input__label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={numeric ? 'numeric' : 'text'}
        autoComplete={autoComplete}
        className="code-input__field"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        maxLength={length}
        spellCheck={false}
      />
    </div>
  );
};

export default CodeInput;
