// tuf-search: #BillingPage #TufStellarManagePage
import { useLayoutEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ChevronIcon, TUFStellarIcon } from "@/components/common/icons";
import { GalleryInspectPopup } from "@/components/popups/Evidence";
import pfpDemo from "@/assets/misc/pfp demo.gif";
import bannerDemo from "@/assets/misc/banner demo.jpg";
import packDemo from "@/assets/misc/pack demo.png";
import iconDemo1 from "@/assets/misc/name demo1.jpg";
import iconDemo2 from "@/assets/misc/name demo2.png";
const BENEFITS_PANEL_ID = "billing-purchase-benefits-panel";
const DISCORD_SUGGESTIONS_URL = "https://discord.gg/AjyAVbqaxf";

/**
 * Picks horizontal placement for a range caption under a stat so it stays inside
 * `.billing-page__benefits-level-packs-main` (narrow column + wrap).
 */
function computePackStatRangeAlign(statEl, rangeEl, containerEl, pad = 4) {
  const containerRect = containerEl.getBoundingClientRect();
  const statRect = statEl.getBoundingClientRect();
  const rangeWidth = rangeEl.getBoundingClientRect().width;
  if (rangeWidth < 1) return "center";

  const leftBound = containerRect.left + pad;
  const rightBound = containerRect.right - pad;
  const statCenter = statRect.left + statRect.width / 2;
  const statLeft = statRect.left;
  const statRight = statRect.right;

  const placeCenterL = statCenter - rangeWidth / 2;
  const placeCenterR = statCenter + rangeWidth / 2;
  const fitsCenter = placeCenterL >= leftBound && placeCenterR <= rightBound;

  const placeStartL = statLeft;
  const placeStartR = statLeft + rangeWidth;
  const fitsStart = placeStartL >= leftBound && placeStartR <= rightBound;

  const placeEndL = statRight - rangeWidth;
  const placeEndR = statRight;
  const fitsEnd = placeEndL >= leftBound && placeEndR <= rightBound;

  if (fitsCenter) return "center";
  if (fitsStart) return "start";
  if (fitsEnd) return "end";

  const overflow = (a, b) => Math.max(0, leftBound - a) + Math.max(0, b - rightBound);
  const oCenter = overflow(placeCenterL, placeCenterR);
  const oStart = overflow(placeStartL, placeStartR);
  const oEnd = overflow(placeEndL, placeEndR);
  if (oStart <= oCenter && oStart <= oEnd) return "start";
  if (oEnd <= oCenter && oEnd <= oStart) return "end";
  return "center";
}

function BillingPackStatRange({ children }) {
  const ref = useRef(null);

  const [align, setAlign] = useState(() => "center");

  useLayoutEffect(() => {
    const rangeEl = ref.current;
    if (!rangeEl) return undefined;

    const run = () => {
      const collapsible = rangeEl.closest(".billing-page__benefits-collapsible");
      if (collapsible?.classList.contains("hidden")) return;

      const container = rangeEl.closest(".billing-page__benefits-level-packs-main");
      const stat = rangeEl.closest(".billing-page__benefits-pack-stat");
      if (!container || !stat) return;

      const next = computePackStatRangeAlign(stat, rangeEl, container, 4);
      setAlign((prev) => (prev === next ? prev : next));
    };

    run();

    const container = rangeEl.closest(".billing-page__benefits-level-packs-main");
    const stat = rangeEl.closest(".billing-page__benefits-pack-stat");
    const collapsible = rangeEl.closest(".billing-page__benefits-collapsible");

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(run);
    });
    if (container) ro.observe(container);
    if (stat) ro.observe(stat);
    ro.observe(rangeEl);
    if (collapsible) ro.observe(collapsible);

    window.addEventListener("resize", run);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [children]);

  const alignClass =
    align === "start"
      ? "billing-page__benefits-pack-stat-range--align-start"
      : align === "end"
        ? "billing-page__benefits-pack-stat-range--align-end"
        : "billing-page__benefits-pack-stat-range--align-center";

  return (
    <span ref={ref} className={["billing-page__benefits-pack-stat-range", alignClass].join(" ")}>
      {children}
    </span>
  );
}

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
              <div className="billing-page__benefits-demo-trigger-container">
              <button
                type="button"
                className="billing-page__benefits-demo-trigger billing-page__benefits-demo-trigger--iconDemos billing-page__media-fit billing-page__media-fit--max-h-10"
                onClick={() =>
                  setBenefitsDemoGallery([
                    { id: "billing-benefits-icon-demo-1", link: iconDemo1 },
                    { id: "billing-benefits-icon-demo-2", link: iconDemo2 },
                  ])
                }
                aria-label={t("billing.benefits.demoImageEnlargeAria")}
              >
                <span className="billing-page__benefits-icon-demos" aria-hidden>
                  <img
                    src={iconDemo1}
                    alt=""
                    className="billing-page__benefits-icon-demo-thumb billing-page__media-fit__img"
                    decoding="async"
                  />
                  <img
                    src={iconDemo2}
                    alt=""
                    className="billing-page__benefits-icon-demo-thumb billing-page__media-fit__img"
                    decoding="async"
                  />
                </span>
              </button>
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

            <div className="billing-page__benefits-segment billing-page__benefits-segment--includedLevelPacks">
              <div className="billing-page__benefits-level-packs-main">
                <span className="billing-page__benefits-segment-title">{t("billing.benefits.included.levelPacks.title")}</span>
                <p className="billing-page__benefits-segment-body billing-page__benefits-segment-body--levelPacks">
                  <Trans
                    ns="pages"
                    i18nKey="billing.benefits.included.levelPacks.body"
                    components={{
                      start: <span className="billing-page__benefits-pack-stat--start" />,
                      packStat: <span className="billing-page__benefits-pack-stat" />,
                      packMult: <span className="billing-page__benefits-pack-stat-mult" />,
                      packRange: <BillingPackStatRange />,
                      itemStat: <span className="billing-page__benefits-pack-stat" />,
                      itemMult: <span className="billing-page__benefits-pack-stat-mult" />,
                      itemRange: <BillingPackStatRange />,
                    }}
                  />
                </p>
              </div>
              <button
                type="button"
                className="billing-page__benefits-demo-trigger billing-page__benefits-demo-trigger--pack billing-page__media-fit billing-page__media-fit--max-h-10"
                onClick={() =>
                  setBenefitsDemoGallery([{ id: "billing-benefits-pack-demo", link: packDemo }])
                }
                aria-label={t("billing.benefits.demoImageEnlargeAria")}
              >
                <img
                  src={packDemo}
                  alt=""
                  className="billing-page__benefits-segment-image billing-page__benefits-segment-image--packDemo billing-page__media-fit__img"
                  decoding="async"
                />
              </button>
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

          {/* will be global
          <div className="billing-page__benefits-segment billing-page__benefits-segment--comingLayout">
            <span className="billing-page__benefits-segment-title">{t("billing.benefits.coming.layout.title")}</span>
            <p className="billing-page__benefits-segment-body">{t("billing.benefits.coming.layout.body")}</p>
          </div>
          */}

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
          key={benefitsDemoGallery.map((e) => e.id).join("|")}
          evidence={benefitsDemoGallery}
          onClose={() => setBenefitsDemoGallery(null)}
          showTitleHeader={false}
        />
      ) : null}
    </section>
  );
}
