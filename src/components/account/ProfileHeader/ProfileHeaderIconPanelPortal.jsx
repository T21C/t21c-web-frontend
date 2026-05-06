// tuf-search: #ProfileHeaderIconPanelPortal #profileHeaderIconPanelPortal #account #profileHeader
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import { getPortalRoot } from "@/utils/portalRoot";
import "./profileHeaderIconPanelPortal.css";

const PROFILE_HEADER_DIFFICULTY_GRID_TOOLTIP_ID = "profile-header-difficulty-grid-tooltip";
const PROFILE_HEADER_SPECIAL_DIFFICULTY_GRID_TOOLTIP_ID = "profile-header-special-difficulty-grid-tooltip";

const filterDiffs = (d) => {
  const nameCheck = d.name !== "Unranked";
  const typeCheck = d.type !== "LEGACY" && d.type !== "SPECIAL";
  return nameCheck && typeCheck;
};

const filterSpecialDiffs = (d) => {
  const nameCheck = !["Unranked", "Impossible", "Qq"].includes(d.name);
  const typeCheck = d.type === "SPECIAL";
  return nameCheck && typeCheck;
};

/**
 * Portal dropdown for ProfileHeader icon row.
 * Handles creator curation panel and player difficulty grid.
 */
export default function ProfileHeaderIconPanelPortal({
  open,
  pos,
  mode,
  portalRef,
  creatorDialogLabel,
  curationPanelGroups,
  playerDialogLabel = "Difficulties cleared",
  playerDifficultyPanelDifficulties,
  playerDifficultyPanelClearsByDifficulty,
}) {
  const { t } = useTranslation("pages");

  if (!open || !pos) return null;

  const renderDifficultyGrid = ({ filter, tooltipId }) => (
    <div className="profile-header__difficulty-grid">
      {(playerDifficultyPanelDifficulties || []).filter(filter).sort((a, b) => a.sortOrder - b.sortOrder).map((d) => {
        const id = d?.id;
        const icon = d?.icon;
        const name = d?.name ?? `#${id}`;
        const clears =
          Number(
            playerDifficultyPanelClearsByDifficulty?.[String(id)] ??
              playerDifficultyPanelClearsByDifficulty?.[id] ??
              0,
          ) || 0;
        const lit = clears > 0;
        const tooltipContent = t("profile.funFacts.difficultyHeaderGridCellTooltip", {
          name,
          count: clears,
        });
        return (
          <div
            key={id ?? name}
            className="profile-header__difficulty-cell"
            data-lit={lit ? "true" : "false"}
            data-tooltip-id={tooltipId}
            data-tooltip-content={tooltipContent}
            aria-label={tooltipContent}
          >
            {icon ? (
              <img className="profile-header__difficulty-cell-img" src={icon} alt="" decoding="async" />
            ) : (
              <span className="profile-header__difficulty-cell-fallback">{String(name).slice(0, 2)}</span>
            )}
          </div>
        );
      })}
    </div>
  );

  return createPortal(
    <div
      ref={portalRef}
      className="profile-header__icon-panel-portal-anchor"
      style={
        {
          "--profile-header-icon-panel-top": `${pos.top}px`,
          "--profile-header-icon-panel-row-center": `${pos.rowCenter}px`,
          "--profile-header-icon-panel-min-width": `${pos.minWidth}px`,
        }
      }
    >
      {mode === "creator" ? (
        <div className="profile-header__icon-panel" role="dialog" aria-label={creatorDialogLabel}>
          <div className="profile-header__icon-panel-inner">
            {curationPanelGroups.map(([group, data]) => (
              <div key={group} className="profile-header__curation-group">
                <h4 className="profile-header__curation-group-title">{group}</h4>
                <div className="profile-header__curation-chips">
                  {data.items.map((ct) => {
                    const id = ct.id;
                    const cnt = Number(ct.count) || 0;
                    const nm = ct.name ?? `#${id}`;
                    return (
                      <div key={id} className="profile-header__curation-chip" title={nm}>
                        {ct.icon ? (
                          <img className="profile-header__curation-chip-icon" src={ct.icon} alt="" decoding="async" />
                        ) : (
                          <span className="profile-header__curation-chip-fallback">{nm.slice(0, 2)}</span>
                        )}
                        <span className="profile-header__curation-chip-count">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="profile-header__icon-panel" role="dialog" aria-label={playerDialogLabel}>
            <div className="profile-header__icon-panel-inner">
              {renderDifficultyGrid({
                filter: filterDiffs,
                tooltipId: PROFILE_HEADER_DIFFICULTY_GRID_TOOLTIP_ID,
              })}
              <hr className="profile-header__difficulty-grid-separator" />
              {renderDifficultyGrid({
                filter: filterSpecialDiffs,
                tooltipId: PROFILE_HEADER_SPECIAL_DIFFICULTY_GRID_TOOLTIP_ID,
              })}
            </div>
          </div>
          <Tooltip
            id={PROFILE_HEADER_DIFFICULTY_GRID_TOOLTIP_ID}
            className="profile-header__difficulty-grid-tooltip"
            place="top"
          />
          <Tooltip
            id={PROFILE_HEADER_SPECIAL_DIFFICULTY_GRID_TOOLTIP_ID}
            className="profile-header__difficulty-grid-tooltip"
            place="top"
          />
        </>
      )}
    </div>,
    getPortalRoot(),
  );
}

