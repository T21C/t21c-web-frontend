import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EyeIcon, EyeOffIcon } from "@/components/common/icons";
import ProfileHeaderSurfaceSliderField from "./ProfileHeaderSurfaceSliderField";

export default function ProfileHeaderSurfaceLayerOpacityControl({
  visible,
  opacity,
  onToggleVisible,
  onOpacityChange,
}) {
  const { t } = useTranslation(["pages"]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev) => {
      if (rootRef.current && !rootRef.current.contains(ev.target)) {
        setOpen(false);
      }
    };
    // Capture phase: popup panel stops mousedown propagation on bubble.
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open]);

  const percent = Math.round((opacity ?? 1) * 100);

  return (
    <div className="profile-header-surface-layer-opacity" ref={rootRef}>
      <button
        type="button"
        className={
          visible
            ? "profile-header-surface-layer-opacity__toggle"
            : "profile-header-surface-layer-opacity__toggle profile-header-surface-layer-opacity__toggle--hidden"
        }
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={
          visible
            ? t("settings.headerSurface.layerOpacityToggle")
            : t("settings.headerSurface.layerHiddenToggle")
        }
        onClick={(ev) => {
          ev.stopPropagation();
          if (open) {
            setOpen(false);
            return;
          }
          setOpen(true);
        }}
      >
        {visible ? (
          <EyeIcon size={16} color="currentColor" />
        ) : (
          <EyeOffIcon size={16} color="currentColor" />
        )}
      </button>
      {open ? (
        <div
          id={menuId}
          className="profile-header-surface-layer-opacity__menu"
          role="dialog"
          aria-label={t("settings.headerSurface.layerOpacityLabel")}
          onMouseDown={(ev) => ev.stopPropagation()}
        >
          <ProfileHeaderSurfaceSliderField
            className="profile-header-surface-layer-opacity__slider-field"
            label={t("settings.headerSurface.layerOpacityLabel")}
            value={percent}
            sliderMin={0}
            sliderMax={100}
            inputMin={0}
            inputMax={100}
            suffix="%"
            onChange={(n) => onOpacityChange(n / 100)}
          />
          <button
            type="button"
            className="profile-header-surface-layer-opacity__hide-btn"
            onClick={() => {
              onToggleVisible();
              setOpen(false);
            }}
          >
            {visible
              ? t("settings.headerSurface.layerHide")
              : t("settings.headerSurface.layerShow")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
