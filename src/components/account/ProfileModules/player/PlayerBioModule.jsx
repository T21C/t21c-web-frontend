import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { ChevronIcon } from "@/components/common/icons";
import BioCanvasRenderer from "@/components/account/BioCanvasRenderer";
import { useTranslation } from "react-i18next";
import { canvasHasBlocks, getDisplayBioText } from "@/utils/bioCanvas";
import { isTufStellarAccessActive } from "@/utils/profileBanners";

export default function PlayerBioModule({
  playerData,
  subjectUser,
  collapsed,
  onCollapsedChange,
}) {
  const { t } = useTranslation("pages");
  const expanded = !collapsed;
  const showCanvas =
    isTufStellarAccessActive(subjectUser) && canvasHasBlocks(playerData?.bioCanvas);
  const displayText = showCanvas ? null : getDisplayBioText(playerData);
  return (
    <section className="player-page__section">
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">{t("profile.bio.header")}</h2>
        <button
          type="button"
          className="account-profile-page__chevron-btn"
          aria-expanded={expanded}
          aria-label={
            collapsed
              ? t("profile.bio.expand", { defaultValue: "Expand bio" })
              : t("profile.bio.collapse", { defaultValue: "Collapse bio" })
          }
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <ChevronIcon direction={expanded ? "down" : "right"} />
        </button>
      </div>
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => onCollapsedChange(!open)}
        revealOverflow
        duration="0.3s"
        easing="ease-in-out"
      >
        <CollapsibleContent>
          <div className="account-profile-page__collapsible">
            <div className="player-page__bio">
              {showCanvas ? (
                <BioCanvasRenderer
                  canvas={playerData.bioCanvas}
                  imageAssets={playerData.bioCanvasImageAssets}
                />
              ) : displayText ? (
                <p className="player-page__bio-text">{displayText}</p>
              ) : (
                <p className="player-page__bio-placeholder">{t("profile.bio.placeholder")}</p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
