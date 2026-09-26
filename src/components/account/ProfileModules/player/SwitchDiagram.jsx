import { useEffect, useId, useRef, useState } from "react";
import { SWITCH_ART } from "./switchArt";
import "./switchDiagram.css";

export const SWITCH_STEMS = ["linear", "tactile", "clicky"];

const STEM_COLORS = {
  linear: "#e23b3b",
  tactile: "#7a4e2d",
  clicky: "#2f6fdb",
};

const DEFAULT_BASE = "#1a1a1a";

export function defaultStemColor(stem) {
  return STEM_COLORS[stem] || STEM_COLORS.linear;
}

export function resolveSwitchStem(stem) {
  return SWITCH_STEMS.includes(stem) ? stem : "linear";
}

function safeHex(value, fallback) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function clampOpacity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

function stemOutlineColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const scale = 0.51;
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((channel) =>
    Math.round(channel * scale).toString(16).padStart(2, "0"),
  );
  return `#${channels.join("")}`;
}

const LASER_PATH =
  "M 45.4403,40.9455L 57.6964,45.8649L 54.6964,51.0611L 44.3148,42.9121C 43.8343,43.529 43.2654,44.0736 42.627,44.5269L 46.6048,50.4303L 44.4397,51.6803L 41.3156,45.2827C 40.6339,45.5936 39.901,45.8115 39.133,45.9204L 41.0104,59.0625L 35.0104,59.0625L 36.8874,45.9233C 36.0949,45.813 35.3394,45.5866 34.6389,45.2618L 31.5112,51.6668L 29.3461,50.4168L 33.3337,44.4989C 32.7168,44.0551 32.1656,43.5257 31.6976,42.928L 21.2383,51.138L 18.2383,45.9419L 30.5772,40.9892C 30.2947,40.2885 30.1086,39.5387 30.0353,38.756L 23.0074,39.2441L 23.0074,36.7441L 30.0364,37.2322C 30.1108,36.4502 30.2979,35.701 30.5811,35.001L 18.3289,30.0831L 21.3289,24.887L 31.72,33.0435C 32.1877,32.4517 32.7373,31.9276 33.3516,31.4883L 29.4056,25.6322L 31.5707,24.3822L 34.668,30.7248C 35.3547,30.4098 36.0938,30.1891 36.8685,30.0794L 35,17L 41,17L 39.1315,30.0794C 39.8972,30.1878 40.6279,30.4046 41.3078,30.7137L 44.4177,24.3454L 46.5827,25.5954L 42.6238,31.4708C 43.2486,31.9141 43.807,32.4447 44.2812,33.045L 54.6905,24.8742L 57.6905,30.0703L 45.4171,34.9967C 45.5486,35.3211 45.6594,35.6561 45.748,36L 72.9438,36L 73,38L 72.9438,40L 45.748,40C 45.6647,40.3235 45.5617,40.6392 45.4403,40.9455 Z";

function SensingBadge({ sensing }) {
  const color = "#fffd"
  if (sensing === "optical") {
    return (
      <svg className="switch-diagram__badge" viewBox="0 0 76 76" aria-hidden="true">
        <path fill={color} d={LASER_PATH} />
      </svg>
    );
  }
  // Hall-effect badge. License: MIT. Ionicons: https://github.com/ionic-team/ionicons
  if (sensing === "hall") {
    return (
      <svg transform="matrix(-1, 0, 0, 1, 0, 0)" className="switch-diagram__badge" viewBox="0 0 512 512" aria-hidden="true" fill="none">
        <line x1="191.98" y1="463.79" x2="191.98" y2="415.79" stroke={color} strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" />
        <line x1="90.16" y1="421.61" x2="124.1" y2="387.67" stroke={color} strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" />
        <line x1="47.98" y1="319.79" x2="95.98" y2="319.79" stroke={color} strokeLinecap="round" strokeMiterlimit="10" strokeWidth="32" />
        <path fill={color} d="M267.56,312.32l-31.11,31.11a16,16,0,0,0,0,22.63l45.26,45.25a16,16,0,0,0,22.62,0l31.12-31.11a4,4,0,0,0,0-5.66l-62.23-62.22A4,4,0,0,0,267.56,312.32Z" />
        <path fill={color} d="M131.8,176.55l-31.11,31.12a16,16,0,0,0,0,22.62l45.25,45.26a16,16,0,0,0,22.63,0l31.11-31.11a4,4,0,0,0,0-5.66l-62.22-62.23A4,4,0,0,0,131.8,176.55Z" />
        <path fill={color} d="M428.85,83.28a144,144,0,0,0-203.71-.06l-65.06,65.05a4,4,0,0,0,0,5.66l62.23,62.22a4,4,0,0,0,5.66,0l65-65.05a48,48,0,0,1,68.46.59c18.3,18.92,17.47,49.24-1.14,67.85L295.85,284a4,4,0,0,0,0,5.66l62.22,62.23a4,4,0,0,0,5.66,0l64.08-64.08C484.18,231.47,485.18,139.68,428.85,83.28Z" />
      </svg>
    );
  }
  return null;
}

export default function SwitchDiagram({
  stem,
  sensing,
  baseColor,
  topColor,
  stemColor,
  baseOpacity,
  className = "",
  title,
  colorable = false,
  stemLabel = "Stem color",
  topLabel = "Top color",
  baseLabel = "Base color",
  onStemColor,
  onTopColor,
  onBaseColor,
}) {
  const kind = resolveSwitchStem(stem);
  const explicitStem = SWITCH_STEMS.includes(stem);
  const ink = safeHex(stemColor, explicitStem ? defaultStemColor(kind) : "#b0b4ba");
  const shell = safeHex(baseColor, DEFAULT_BASE);
  const lid = safeHex(topColor, shell);
  const opacity = clampOpacity(baseOpacity == null ? 1 : baseOpacity);
  const Art = SWITCH_ART[kind] || SWITCH_ART.linear;
  const gradientId = `switch-spring-${useId().replace(/:/g, "")}`;
  const rootRef = useRef(null);
  const [open, setOpen] = useState(null);
  const picking = Boolean(colorable && onStemColor && onTopColor && onBaseColor);
  const classes = ["switch-diagram", picking ? "switch-diagram--colorable" : "", className]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!picking || !open) return undefined;
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(null);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [picking, open]);

  function toggleHit(part) {
    setOpen((current) => (current === part ? null : part));
  }

  const pickerValue = open === "stem" ? ink : open === "top" ? lid : shell;
  const pickerLabel = open === "stem" ? stemLabel : open === "top" ? topLabel : baseLabel;

  return (
    <span className={classes} ref={rootRef}>
      <svg className="switch-diagram__art" viewBox="100 50 330 310" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
        <Art
          base={shell}
          top={lid}
          stem={ink}
          stemDark={stemOutlineColor(ink)}
          opacity={opacity}
          gradientId={gradientId}
        />
      </svg>
      <SensingBadge sensing={sensing} />
      {picking && (
        <>
          <button
            type="button"
            className={`switch-diagram__hit switch-diagram__hit--base${open === "base" ? " is-open" : ""}`}
            aria-label={baseLabel}
            aria-expanded={open === "base"}
            onClick={() => toggleHit("base")}
          />
          <button
            type="button"
            className={`switch-diagram__hit switch-diagram__hit--top${open === "top" ? " is-open" : ""}`}
            aria-label={topLabel}
            aria-expanded={open === "top"}
            onClick={() => toggleHit("top")}
          />
          <button
            type="button"
            className={`switch-diagram__hit switch-diagram__hit--stem${open === "stem" ? " is-open" : ""}`}
            aria-label={stemLabel}
            aria-expanded={open === "stem"}
            onClick={() => toggleHit("stem")}
          />
          {open && (
            <div className={`switch-diagram__picker switch-diagram__picker--${open}`} role="dialog">
              <label className="switch-diagram__picker-field">
                <span>{pickerLabel}</span>
                <input
                  type="color"
                  value={pickerValue}
                  onChange={(event) => {
                    const value = event.target.value.toLowerCase();
                    if (open === "stem") onStemColor(value);
                    else if (open === "top") onTopColor(value);
                    else onBaseColor(value);
                  }}
                />
              </label>
            </div>
          )}
        </>
      )}
    </span>
  );
}
