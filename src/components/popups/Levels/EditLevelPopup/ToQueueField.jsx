// tuf-search: #ToQueueField #editLevelPopup #toRate #toCuration
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
}) {
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
      </div>
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
    </div>
  );
}
