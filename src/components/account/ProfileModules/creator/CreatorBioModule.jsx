import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { ChevronIcon } from "@/components/common/icons";
import BioCanvasRenderer from "@/components/account/BioCanvasRenderer/BioCanvasRenderer";
import { useTranslation } from "react-i18next";
import { canvasHasBlocks, getDisplayBioText } from "@/utils/bioCanvas";
import { isTufStellarAccessActive } from "@/utils/profileBanners";

export default function CreatorBioModule({ profile, subjectUser, collapsed, onCollapsedChange }) {
  const { t } = useTranslation("pages");
  const expanded = !collapsed;
  const showCanvas =
    isTufStellarAccessActive(subjectUser) && canvasHasBlocks(profile?.bioCanvas);
  const displayText = showCanvas ? null : getDisplayBioText(profile);
  return (
    <section className="creator-profile-page__section">
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">
          {t("creators.profile.bio.header")}
        </h2>
        <button
          type="button"
          className="account-profile-page__chevron-btn"
          aria-expanded={expanded}
          aria-label={
            collapsed
              ? t("creators.profile.bio.expand", { defaultValue: "Expand bio" })
              : t("creators.profile.bio.collapse", { defaultValue: "Collapse bio" })
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
            <div className="creator-profile-page__bio">
              {showCanvas ? (
                <BioCanvasRenderer
                  canvas={profile.bioCanvas}
                  imageAssets={profile.bioCanvasImageAssets}
                />
              ) : displayText ? (
                <p className="creator-profile-page__bio-text">{displayText}</p>
              ) : (
                <p className="creator-profile-page__bio-placeholder">
                  {t("creators.profile.bio.placeholder")}
                </p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
