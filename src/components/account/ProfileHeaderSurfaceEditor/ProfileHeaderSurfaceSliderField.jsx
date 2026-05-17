import { useCallback, useState } from "react";

function roundNumeric(n, step) {
  if (step >= 1) return Math.round(n);
  return Math.round(n * 10) / 10;
}

export default function ProfileHeaderSurfaceSliderField({
  label,
  value,
  onChange,
  sliderMin,
  sliderMax,
  inputMin,
  inputMax,
  step = 1,
  suffix = "",
  variant = "stacked",
  className = "",
  inputId,
  "aria-label": ariaLabel,
}) {
  const [draft, setDraft] = useState(null);

  const displayValue = draft !== null ? draft : value;
  const sliderValue = Math.min(sliderMax, Math.max(sliderMin, value));

  const commit = useCallback(
    (raw) => {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        setDraft(null);
        return;
      }
      setDraft(null);
      onChange(roundNumeric(n, step));
    },
    [onChange, step],
  );

  const resolvedAriaLabel = ariaLabel ?? (typeof label === "string" ? label : undefined);

  const rootClass = [
    "profile-header-surface-slider-field",
    variant === "inline" ? "profile-header-surface-slider-field--inline" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={rootClass}>
      {label ? <span className="profile-header-surface-slider-field__label">{label}</span> : null}
      <div className="profile-header-surface-slider-field__controls">
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={step}
          value={sliderValue}
          aria-label={resolvedAriaLabel}
          onChange={(ev) => onChange(Number(ev.target.value))}
        />
        <div className="profile-header-surface-slider-field__input-wrap">
          <input
            id={inputId}
            type="number"
            step={step}
            value={displayValue}
            aria-label={resolvedAriaLabel}
            onChange={(ev) => setDraft(ev.target.value)}
            onBlur={(ev) => commit(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") {
                ev.preventDefault();
                commit(ev.currentTarget.value);
                ev.currentTarget.blur();
              }
            }}
          />
          {suffix ? <span className="profile-header-surface-slider-field__suffix">{suffix}</span> : null}
        </div>
      </div>
    </label>
  );
}
