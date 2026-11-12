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
}) {
  const [bulkOn, setBulkOn] = useState(false);
  const showBulk = accessory === 'bulk';

  useEffect(() => {
    if (!checked) setBulkOn(false);
  }, [checked]);

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
            className={`to-queue-bulk btn-fill-ghost btn-sm${bulkOn ? ' is-on' : ''}`}
            aria-pressed={bulkOn}
            aria-hidden={!checked}
            tabIndex={checked ? 0 : -1}
            disabled={!enabled || !checked}
            onClick={() => setBulkOn((on) => !on)}
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
