import { ACTUATION_MAX_MM, ACTUATION_MIN_MM, formatActuationMm } from "./keyboardPaint";

export function ActuationSlider({
  label,
  value,
  mixed = false,
  disabled = false,
  onChange,
}) {
  const shown = !mixed && value !== "" && value != null ? formatActuationMm(value) : "";
  const sliderValue = formatActuationMm(value) || String(ACTUATION_MIN_MM);
  const title = shown ? `${label} (${shown} mm)` : label;

  function commit(raw) {
    const next = formatActuationMm(raw);
    if (!next) return;
    onChange(next);
  }

  return (
    <div className={`actuation-slider${mixed ? " is-mixed" : ""}`}>
      <span className="actuation-slider__title">{title}</span>
      <div className="actuation-slider__track">
        <input
          className="actuation-slider__range"
          type="range"
          min={ACTUATION_MIN_MM}
          max={ACTUATION_MAX_MM}
          step="0.1"
          value={sliderValue}
          disabled={disabled}
          aria-label={title}
          onChange={(event) => commit(event.target.value)}
        />
        <span className="actuation-slider__ends">
          <span>{ACTUATION_MIN_MM.toFixed(1)}</span>
          <span>{ACTUATION_MAX_MM.toFixed(1)}</span>
        </span>
      </div>
    </div>
  );
}
