// tuf-search: #BillingPage #TufStellarManagePage
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ChevronIcon, TUFStellarIcon } from "@/components/common/icons";
import { GalleryInspectPopup } from "@/components/popups/Evidence";
import pfpDemo from "@/assets/misc/pfp demo.gif";
import bannerDemo from "@/assets/misc/banner demo.jpg";
const BENEFITS_PANEL_ID = "billing-purchase-benefits-panel";
const DISCORD_SUGGESTIONS_URL = "https://discord.gg/AjyAVbqaxf";

export function BillingPurchaseBenefitsSection() {
  const { t } = useTranslation("pages");
  const [benefitsCollapsed, setBenefitsCollapsed] = useState(true);
  const [benefitsDemoGallery, setBenefitsDemoGallery] = useState(null);
  const expanded = !benefitsCollapsed;

  return (
    <section className="billing-page__card billing-page__benefits-card" aria-labelledby="billing-benefits-heading">
      <div className="billing-page__benefits-section-title-row">
        <h3 id="billing-benefits-heading" className="billing-page__benefits-section-title">
          {t("billing.benefits.sectionTitle")}
        </h3>
        <button
          type="button"
          className="billing-page__benefits-chevron-btn"
          aria-expanded={expanded}
          aria-controls={BENEFITS_PANEL_ID}
          aria-label={benefitsCollapsed ? t("billing.benefits.expand") : t("billing.benefits.collapse")}
          onClick={() => setBenefitsCollapsed((v) => !v)}
        >
          <ChevronIcon direction={expanded ? "down" : "right"} />
        </button>
      </div>
      <div
        id={BENEFITS_PANEL_ID}
        className={["billing-page__benefits-collapsible", benefitsCollapsed ? "hidden" : ""].join(" ").trim()}
      >
        <div className="billing-page__benefits-body">
          <h4 className="billing-page__benefits-subheading">{t("billing.benefits.includedHeading")}</h4>

          <div className="billing-page__benefits-included-grid">
            <div className="billing-page__benefits-segment billing-page__benefits-segment--includedAnimatedPfp">
              <div className="billing-page__benefits-segment-copy">
                <span className="billing-page__benefits-segment-title">{t("billing.benefits.included.animatedPfp.title")}</span>
                <p className="billing-page__benefits-segment-body">{t("billing.benefits.included.animatedPfp.body")}</p>
              </div>
              <button
                type="button"
                className="billing-page__benefits-demo-trigger billing-page__benefits-demo-trigger--pfp billing-page__media-fit billing-page__media-fit--max-h-10"
                onClick={() =>
                  setBenefitsDemoGallery([{ id: "billing-benefits-pfp-demo", link: pfpDemo }])
                }
                aria-label={t("billing.benefits.demoImageEnlargeAria")}
              >
                <img
                  src={pfpDemo}
                  alt=""
                  className="billing-page__benefits-segment-image billing-page__benefits-segment-image--pfpDemo billing-page__media-fit__img"
                  decoding="async"
                />
              </button>
            </div>

            <div className="billing-page__benefits-segment billing-page__benefits-segment--includedBanners">
              <div className="billing-page__benefits-segment-copy billing-page__benefits-segment-copy--bannerIntro">
                <span className="billing-page__benefits-segment-title">{t("billing.benefits.included.customBanners.title")}</span>
                <p className="billing-page__benefits-segment-body">{t("billing.benefits.included.customBanners.body")}</p>
              </div>
              <button
                type="button"
                className="billing-page__benefits-demo-trigger billing-page__benefits-demo-trigger--banner billing-page__media-fit billing-page__media-fit--full-width billing-page__media-fit--max-h-10"
                onClick={() =>
                  setBenefitsDemoGallery([{ id: "billing-benefits-banner-demo", link: bannerDemo }])
                }
                aria-label={t("billing.benefits.demoImageEnlargeAria")}
              >
                <img
                  src={bannerDemo}
                  alt=""
                  className="billing-page__benefits-segment-image billing-page__benefits-segment-image--bannerDemo billing-page__media-fit__img"
                  decoding="async"
                />
              </button>
            </div>

            <div className="billing-page__benefits-segment billing-page__benefits-segment--includedSupporterIcon">
              <div className="billing-page__benefits-segment-copy">
                <span className="billing-page__benefits-segment-title">{t("billing.benefits.included.supporterIcon.title")}</span>
                <p className="billing-page__benefits-segment-body">{t("billing.benefits.included.supporterIcon.body")}</p>
              </div>
              <div
                className="billing-page__benefits-supporter-icons"
                role="group"
                aria-label={t("billing.benefits.included.supporterIcon.title")}
              >
                <TUFStellarIcon variant="1" className="billing-page__benefits-supporter-icon" alt="" aria-hidden />
                <TUFStellarIcon variant="2" className="billing-page__benefits-supporter-icon" alt="" aria-hidden />
                <TUFStellarIcon variant="3" className="billing-page__benefits-supporter-icon" alt="" aria-hidden />
              </div>
            </div>
          </div>
          <hr style={{ margin: "0.5rem 0", borderColor: "var(--color-white-t10)" }} />
          <h4 className="billing-page__benefits-subheading billing-page__benefits-subheading--spaced">
            {t("billing.benefits.comingHeading")}
          </h4>
          <p className="billing-page__benefits-lead">{t("billing.benefits.comingIntro")}</p>

          <div className="billing-page__benefits-segment billing-page__benefits-segment--comingGradients">
            <span className="billing-page__benefits-segment-title">{t("billing.benefits.coming.gradients.title")}</span>
            <p className="billing-page__benefits-segment-body">{t("billing.benefits.coming.gradients.body")}</p>
          </div>

          <div className="billing-page__benefits-segment billing-page__benefits-segment--comingBios">
            <span className="billing-page__benefits-segment-title">{t("billing.benefits.coming.bios.title")}</span>
            <p className="billing-page__benefits-segment-body">{t("billing.benefits.coming.bios.body")}</p>
          </div>

          <div className="billing-page__benefits-segment billing-page__benefits-segment--comingLayout">
            <span className="billing-page__benefits-segment-title">{t("billing.benefits.coming.layout.title")}</span>
            <p className="billing-page__benefits-segment-body">{t("billing.benefits.coming.layout.body")}</p>
          </div>

          <div className="billing-page__benefits-segment billing-page__benefits-segment--ideas">
            <h4 className="billing-page__benefits-subheading billing-page__benefits-subheading--inline">
              {t("billing.benefits.ideasHeading")}
            </h4>
            <p className="billing-page__benefits-segment-body billing-page__benefits-segment-body--ideas">
              <Trans
                ns="pages"
                i18nKey="billing.benefits.ideasBody"
                components={{
                  discordLink: (
                    <a
                      className="billing-page__benefits-discord-link"
                      href={DISCORD_SUGGESTIONS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                }}
              />
            </p>
          </div>
        </div>
      </div>

      {benefitsDemoGallery ? (
        <GalleryInspectPopup
          evidence={benefitsDemoGallery}
          onClose={() => setBenefitsDemoGallery(null)}
          showTitleHeader={false}
        />
      ) : null}
    </section>
  );
}
