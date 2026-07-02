// tuf-search: #BillingPage
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { approxDaysRemainingLabel, formatDateDayOnly } from "./billingUtils";

/** @param {{ accessPillKey: string, accessActive: boolean, accessExpiresAt: string | null, purchaseFundedRemainingMs: number, accessSegments?: Array<Record<string, unknown>> }} props */
export function BillingAccessSection({
  accessPillKey,
  accessActive,
  accessExpiresAt,
  purchaseFundedRemainingMs,
  accessSegments = [],
}) {
  const { t, i18n } = useTranslation("pages");
  const locale = i18n.language || undefined;

  const accessExpiresFormatted = useMemo(
    () => formatDateDayOnly(accessExpiresAt, locale),
    [accessExpiresAt, locale],
  );

  const hasSegmentList = Array.isArray(accessSegments) && accessSegments.length > 0;

  return (
    <section className="billing-page__card billing-page__card--compact" aria-labelledby="billing-access-heading">
      <h3 id="billing-access-heading" className="billing-page__card-title">
        {t("billing.access.title")}
      </h3>
      <div className="billing-page__access-row">
        <div className={`billing-page__status-label billing-page__pill billing-page__pill--${accessPillKey}`}>
          <span className="billing-page__status-label-text">
            {accessActive ? t("billing.access.statusActive") : t("billing.access.statusInactive")}
          </span>
        </div>
        {accessActive && accessExpiresFormatted ? (
          <p className="billing-page__access-date">
            {t("billing.access.untilDate", { date: accessExpiresFormatted })}
          </p>
        ) : null}
      </div>

      {hasSegmentList ? (
        <ul className="billing-page__access-segments">
          {accessSegments.map((seg) => {
            const id = seg.segmentId ?? seg.id;
            const months = Number(seg.months);
            const startsAt = seg.startsAt != null ? formatDateDayOnly(seg.startsAt, locale) : "";
            const endsAt = seg.endsAt != null ? formatDateDayOnly(seg.endsAt, locale) : "";
            const remMs = Number(seg.remainingMs);
            const duration =
              Number.isFinite(remMs) && remMs > 0 ? approxDaysRemainingLabel(remMs, t) : "";
            const source = String(seg.source ?? "unknown");
            const giftFrom = seg.giftFrom && typeof seg.giftFrom === "object" ? seg.giftFrom : null;
            const grantFrom = seg.grantFrom && typeof seg.grantFrom === "object" ? seg.grantFrom : null;
            const giverName = giftFrom?.username || giftFrom?.userId || "";
            const granterName = grantFrom?.username || grantFrom?.userId || "";
            const durationKind = seg.durationKind != null ? String(seg.durationKind) : null;
            const durationValue = Number(seg.durationValue);

            let sourceLabel = t("billing.access.segmentSourceUnknown");
            if (source === "self_purchase") sourceLabel = t("billing.access.segmentSourceSelf");
            else if (source === "gift_received")
              sourceLabel = giverName
                ? t("billing.access.segmentSourceGiftFrom", { name: giverName })
                : t("billing.access.segmentSourceGift");
            else if (source === "admin_grant")
              sourceLabel = granterName
                ? t("billing.access.segmentSourceGrantFrom", { name: granterName })
                : t("billing.access.segmentSourceGrantSelf");

            let termLabel = t("billing.checkout.durationMonths", { count: Number.isFinite(months) ? months : 0 });
            if (source === "admin_grant" && durationKind === "days" && Number.isFinite(durationValue) && durationValue > 0) {
              termLabel = t("billing.adminGrants.durationDays", { count: durationValue });
            } else if (source === "admin_grant" && durationKind === "months" && Number.isFinite(durationValue) && durationValue > 0) {
              termLabel = t("billing.checkout.durationMonths", { count: durationValue });
            }

            return (
              <li key={String(id)} className="billing-page__access-segment">
                <div className="billing-page__access-segment-main">
                  <span className="billing-page__access-segment-source">{sourceLabel}</span>
                  <span className="billing-page__access-segment-term">{termLabel}</span>
                </div>
                <div className="billing-page__access-segment-dates">
                  {startsAt && endsAt ? (
                    <span className="billing-page__access-segment-window">
                      {t("billing.access.segmentWindow", { start: startsAt, end: endsAt })}
                    </span>
                  ) : null}
                  {duration ? (
                    <span className="billing-page__access-segment-remaining">
                      {t("billing.access.segmentRemaining", { duration })}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : accessActive && purchaseFundedRemainingMs > 0 ? (
        <p className="billing-page__access-meta">
          {t("billing.access.purchaseStackRemaining", {
            duration: approxDaysRemainingLabel(purchaseFundedRemainingMs, t),
          })}
        </p>
      ) : null}
    </section>
  );
}
