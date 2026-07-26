import React from 'react';
import './codeInput.css';

/**
 * Shared opaque code entry for email verify and password reset.
 */
const CodeInput = ({
  id = 'opaque-code',
  label = 'Verification code',
  value,
  onChange,
  disabled = false,
  autoComplete = 'one-time-code',
}) => {
  return (
    <div className="code-input">
      <label htmlFor={id} className="code-input__label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="text"
        autoComplete={autoComplete}
        className="code-input__field"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8))}
        disabled={disabled}
        maxLength={8}
        spellCheck={false}
      />
    </div>
  );
};

export default CodeInput;
