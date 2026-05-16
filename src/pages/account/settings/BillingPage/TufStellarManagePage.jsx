// tuf-search: #TufStellarManagePage #billingPage #settings
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { BillingAccessSection } from "./BillingAccessSection";
import { BillingPurchaseBenefitsSection } from "./BillingPurchaseBenefitsSection";
import { BillingPurchaseSection } from "./BillingPurchaseSection";
import { useBillingData } from "./useBillingData";
import "./billingPage.css";

const TufStellarManagePage = () => {
  const { t } = useTranslation(["pages", "common"]);
  const location = useLocation();

  const billing = useBillingData({ loadEvents: false, enableTermPreview: true });

  const {
    loading,
    errorState,
    fetchAll,
    accessPillKey,
    accessActive,
    accessExpiresAt,
    purchaseFundedRemainingMs,
    accessSegments,
    canPurchaseOneTime,
    showIdleNote,
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
    handleCheckout,
    termAccessPreview,
    checkoutCurrencyOptions,
    selectedCheckoutCurrencyOption,
    handleCheckoutCurrencyChange,
  } = billing;

  useEffect(() => {
    if (location.hash !== "#purchase") return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById("billing-purchase-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [location.hash, loading]);

  if (loading && !billing.billingState) {
    return (
      <div className="billing-page">
        <div className="loader loader-level-detail" />
      </div>
    );
  }

  return (
    <div className="billing-page">
      <header className="billing-page__header billing-page__header--toolbar">
        <div className="billing-page__header-text">
          <h2 className="settings-sub-page__title billing-page__title">{t("billing.pages.tufStellarTitle")}</h2>
          <p className="billing-page__subtitle settings-sub-page__text">{t("billing.pages.tufStellarSubtitle")}</p>
        </div>
        <button
          type="button"
          className="billing-page__btn billing-page__btn--ghost"
          onClick={() => fetchAll({ forceRefresh: true })}
          disabled={loading}
        >
          {t("billing.actions.refreshPage")}
        </button>
      </header>

      {errorState ? (
        <div className="billing-page__card billing-page__card--error">
          <p className="settings-sub-page__text">{t("billing.loadError")}</p>
          <button type="button" className="billing-page__btn billing-page__btn--secondary" onClick={() => fetchAll({ forceRefresh: true })}>
            {t("billing.actions.retry", { defaultValue: t("buttons.retry", { ns: "common", defaultValue: "Retry" }) })}
          </button>
        </div>
      ) : null}

      <nav className="billing-page__cross-links billing-page__cross-links--toolbar" aria-label={t("billing.crossLinks.navAria")}>
        <Link className="billing-page__btn billing-page__btn--ghost billing-page__cross-link" to="/settings/billing">
          {t("billing.crossLinks.viewBillingHistory")}
        </Link>
      </nav>

      <BillingAccessSection
        accessPillKey={accessPillKey}
        accessActive={accessActive}
        accessExpiresAt={accessExpiresAt}
        purchaseFundedRemainingMs={purchaseFundedRemainingMs}
        accessSegments={accessSegments}
      />

      <BillingPurchaseBenefitsSection />

      <BillingPurchaseSection
        canPurchaseOneTime={canPurchaseOneTime}
        purchaseAsGift={purchaseAsGift}
        setPurchaseAsGift={setPurchaseAsGift}
        giftRecipient={giftRecipient}
        handleRecipientProfileChange={handleRecipientProfileChange}
        clearRecipient={clearRecipient}
        checkoutTermIndex={checkoutTermIndex}
        setCheckoutTermIndex={setCheckoutTermIndex}
        termSliderFillPct={termSliderFillPct}
        checkoutTermPreview={checkoutTermPreview}
        subscribing={subscribing}
        canOpenCheckout={canOpenCheckout}
        onCheckout={handleCheckout}
        termAccessPreview={termAccessPreview}
        checkoutCurrencyOptions={checkoutCurrencyOptions}
        selectedCheckoutCurrencyOption={selectedCheckoutCurrencyOption}
        onCheckoutCurrencyChange={handleCheckoutCurrencyChange}
      />

      {showIdleNote ? (
        <section className="billing-page__card billing-page__status-card">
          <p className="billing-page__idle-note">{t("billing.actions.noneNeeded")}</p>
        </section>
      ) : null}
    </div>
  );
};

export default TufStellarManagePage;
