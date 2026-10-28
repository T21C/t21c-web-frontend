export default function SwitchTopPlaceholder({ base, top, stem, opacity = 1, size, absent = false }) {
  if (absent) {
    return (
      <span
        className="keyboard-setup__switch-top is-absent"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className="keyboard-setup__switch-top"
      style={{
        width: size,
        height: size,
        "--switch-base": base,
        "--switch-top": top,
        "--switch-stem": stem,
        "--switch-top-opacity": opacity,
      }}
      aria-hidden="true"
    >
      <span className="keyboard-setup__switch-top-base" />
      <span className="keyboard-setup__switch-top-housing" />
      <span className="keyboard-setup__switch-top-stem" />
    </span>
  );
}
