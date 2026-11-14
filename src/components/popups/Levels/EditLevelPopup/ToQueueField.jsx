// tuf-search: #ToQueueField #editLevelPopup #toRate #toCuration
import { useEffect, useState } from 'react';
import { LevelMentionField } from '@/components/misc';

export function ToQueueField({
  enabled,
  checked,
  checkboxName,
  checkboxLabel,
  numberName,
  numberValue,
  numberPlaceholder,
  reasonName,
  reasonValue,
  reasonPlaceholder,
  onChange,
  accessory = 'inputs',
  bulkLabel,
  bulkOn = false,
  onBulkChange,
}) {
  const [localBulkOn, setLocalBulkOn] = useState(false);
  const showBulk = accessory === 'bulk';
  const bulkPressed = typeof onBulkChange === 'function' ? bulkOn : localBulkOn;

  useEffect(() => {
    if (!checked && typeof onBulkChange !== 'function') setLocalBulkOn(false);
  }, [checked, onBulkChange]);

  return (
    <div className={`to-rate-checkbox-container ${enabled ? 'field-enabled' : ''}`}>
      <div className="to-rate-group">
        <label className="to-rate-checkbox">
          <input
            type="checkbox"
            name={checkboxName}
            checked={checked}
            onChange={onChange}
            disabled={!enabled}
          />
          {checkboxLabel}
        </label>
        {!showBulk && (
          <div className={`rerate-num ${checked ? 'show' : ''}`}>
            <input
              type="text"
              autoComplete="off"
              name={numberName}
              value={numberValue}
              onChange={onChange}
              placeholder={numberPlaceholder}
              disabled={!enabled}
            />
          </div>
        )}
      </div>
      {showBulk ? (
        <div className={`to-queue-bulk-slot ${checked ? 'show' : ''}`}>
          <button
            type="button"
            className={`to-queue-bulk btn-fill-ghost btn-sm${bulkPressed ? ' is-on' : ''}`}
            aria-pressed={bulkPressed}
            aria-hidden={!checked}
            tabIndex={checked ? 0 : -1}
            disabled={!enabled || !checked}
            onClick={() => {
              if (typeof onBulkChange === 'function') onBulkChange(!bulkPressed);
              else setLocalBulkOn((on) => !on);
            }}
          >
            {bulkLabel}
          </button>
        </div>
      ) : (
        <div className={`rerate-reason ${checked ? 'show' : ''}`}>
          <LevelMentionField
            as="input"
            autoComplete="off"
            name={reasonName}
            value={reasonValue}
            onChange={onChange}
            placeholder={reasonPlaceholder}
            disabled={!enabled}
          />
        </div>
      )}
    </div>
  );
}
