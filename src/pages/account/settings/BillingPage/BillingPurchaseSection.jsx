// tuf-search: #BillingPage
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProfileSelector } from "@/components/common/selectors";
import { BillingGiftRecipientPreview } from "./BillingGiftRecipientPreview";
import { formatDateDayOnly, TUF_STELLAR_TERM_OPTIONS } from "./billingUtils";

export function BillingPurchaseSection({
  canPurchaseOneTime,
  purchaseAsGift,
  setPurchaseAsGift,
  giftRecipient,
  handleRecipientProfileChange,
  clearRecipient,
  checkoutTermIndex,
  setCheckoutTermIndex,
  termSliderFillPct,
  checkoutTermPreview,
  subscribing,
  canOpenCheckout,
  onCheckout,
  termAccessPreview,
}) {
  const { t, i18n } = useTranslation("pages");
  const locale = i18n.language || undefined;

  const projectedIso = !purchaseAsGift && termAccessPreview?.projectedExpiresAt ? termAccessPreview.projectedExpiresAt : null;
  const projectedDateLabel = useMemo(() => {
    if (!projectedIso) return null;
    return formatDateDayOnly(projectedIso, locale);
  }, [projectedIso, locale]);

  return (
    <section className="billing-page__card" aria-labelledby="billing-purchase-heading">
      <h3 id="billing-purchase-heading" className="billing-page__card-title">
        {t("billing.pages.checkoutEntryTitle")}
      </h3>
      <div className="billing-page__gift-option">
        <label className="billing-page__gift-checkbox-row">
          <input
            type="checkbox"
            className="billing-page__auto-renew-input"
            checked={purchaseAsGift}
            onChange={(ev) => setPurchaseAsGift(ev.target.checked)}
            disabled={!canPurchaseOneTime}
          />
          <span className="billing-page__auto-renew-label-text">{t("billing.checkout.purchaseAsGift")}</span>
        </label>

        {purchaseAsGift ? (
          giftRecipient?.userId ? (
            <div className="billing-page__recipient-selected">
              {giftRecipient.playerId != null ? (
                <Link
                  to={`/profile/${giftRecipient.playerId}`}
                  className="billing-page__recipient-profile-link"
                  aria-label={t("billing.checkout.openRecipientProfileAria", {
                    name: giftRecipient.username || giftRecipient.nickname || giftRecipient.userId,
                  })}
                >
                  <BillingGiftRecipientPreview recipient={giftRecipient} />
                </Link>
              ) : (
                <div className="billing-page__recipient-profile-static">
                  <BillingGiftRecipientPreview recipient={giftRecipient} />
                </div>
              )}
              <button
                type="button"
                className="billing-page__btn billing-page__btn--ghost billing-page__recipient-change"
                onClick={clearRecipient}
              >
                {t("billing.checkout.changeRecipient")}
              </button>
            </div>
          ) : (
            <ProfileSelector
              type="user"
              className="billing-page__profile-selector"
              placeholder={t("billing.checkout.searchUsersPlaceholder")}
              value={null}
              onChange={handleRecipientProfileChange}
            />
          )
        ) : null}
      </div>

      <div className="billing-page__checkout-term">
        <p className="billing-page__checkout-term-label">{t("billing.checkout.chooseTerm")}</p>

        <input
          type="range"
          className="billing-page__term-slider"
          style={{
            "--billing-term-slider-fill": `${termSliderFillPct}%`,
          }}
          min={0}
          max={TUF_STELLAR_TERM_OPTIONS.length - 1}
          step={1}
          value={checkoutTermIndex}
          onChange={(ev) => setCheckoutTermIndex(Number(ev.target.value))}
          aria-valuetext={checkoutTermPreview.ariaText}
          aria-label={t("billing.checkout.sliderAria")}
          disabled={!canPurchaseOneTime}
        />
        <div className="billing-page__term-ticks" aria-hidden>
          {TUF_STELLAR_TERM_OPTIONS.map((opt) => (
            <div key={opt.months} className="billing-page__term-tick-container">
              <span className="billing-page__term-tick">{t("billing.checkout.tickMonths", { count: opt.months })}</span>
            </div>
          ))}
        </div>

        <div className="billing-page__term-summary-box" aria-live="polite">
          <p className="billing-page__term-summary-price">
            {t("billing.checkout.priceUsdWhole", {
              amount: checkoutTermPreview.priceWholeUsd,
            })}
          </p>
          <p className="billing-page__term-summary-duration">{checkoutTermPreview.duration}</p>
          {checkoutTermPreview.savePct > 0 ? (
            <p className="billing-page__term-summary-save">
              {t("billing.checkout.savePercent", { pct: checkoutTermPreview.savePct })}
            </p>
          ) : null}
          {projectedDateLabel ? (
            <p className="billing-page__term-summary-preview">
              {t("billing.checkout.projectedAccessUntil", { date: projectedDateLabel })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="billing-page__action-row">
        <button
          type="button"
          className="billing-page__btn billing-page__btn--primary"
          onClick={onCheckout}
          disabled={subscribing || !canOpenCheckout}
        >
          {subscribing
            ? t("billing.actions.openingCheckout", {
                defaultValue: t("buttons.loading", { ns: "common", defaultValue: "Loading..." }),
              })
            : t("billing.actions.continueCheckout")}
        </button>
      </div>
    </section>
  );
}
