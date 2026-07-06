import { useRef } from "react";
import { useTranslation } from "react-i18next";

/**
 * @param {{
 *   url?: string | null,
 *   variant?: 'icon' | 'card' | 'reward',
 *   accept?: string,
 *   disabled?: boolean,
 *   onUpload?: (file: File) => void,
 *   onRemove?: () => void,
 * }} props
 */
const VisualAssetSlot = ({
  url,
  variant = "icon",
  accept = "image/*",
  disabled = false,
  onUpload,
  onRemove,
}) => {
  const { t } = useTranslation("pages");
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload?.(file);
    e.target.value = "";
  };

  const slotClass = [
    "tournament-management-popup__asset-slot",
    `tournament-management-popup__asset-slot--${variant}`,
    !url ? "is-empty" : "",
    disabled ? "is-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="tournament-management-popup__asset-slot-wrap">
      {disabled ? (
        <div className={slotClass} aria-disabled="true">
          {url ? (
            <img className="tournament-management-popup__asset-slot-image" src={url} alt="" />
          ) : (
            <span className="tournament-management-popup__asset-empty">
              {t("tournamentManagement.visuals.noImage")}
            </span>
          )}
        </div>
      ) : (
        <label className={slotClass}>
          {url ? (
            <img className="tournament-management-popup__asset-slot-image" src={url} alt="" />
          ) : (
            <span className="tournament-management-popup__asset-empty">
              {t("tournamentManagement.visuals.noImage")}
            </span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            hidden
            onChange={handleChange}
          />
        </label>
      )}
      {url && onRemove && !disabled ? (
        <button type="button" className="btn-fill-danger" onClick={onRemove}>
          {t("tournamentManagement.visuals.remove")}
        </button>
      ) : null}
    </div>
  );
};

export default VisualAssetSlot;
