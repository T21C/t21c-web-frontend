import { createPortal } from "react-dom";
import { getPortalRoot } from "@/utils/portalRoot";
import "./profileHeaderIconPanelPortal.css";

const filterDiffs = (d) => {
  const nameCheck = d.name !== "Unranked";
  const typeCheck = d.type !== "LEGACY" && d.type !== "SPECIAL";
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
  if (!open || !pos) return null;

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
        <div className="profile-header__icon-panel" role="dialog" aria-label={playerDialogLabel}>
          <div className="profile-header__icon-panel-inner">
            <div className="profile-header__difficulty-grid">
              {(playerDifficultyPanelDifficulties || []).filter(filterDiffs).map((d) => {
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
                return (
                  <div
                    key={id ?? name}
                    className="profile-header__difficulty-cell"
                    data-lit={lit ? "true" : "false"}
                    title={`${name} · ${clears}`}
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
          </div>
        </div>
      )}
    </div>,
    getPortalRoot(),
  );
}

