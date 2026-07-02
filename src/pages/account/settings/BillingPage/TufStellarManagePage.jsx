// tuf-search: #TufStellarManagePage #billingPage #settings
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { BillingAccessSection } from "./BillingAccessSection";
import { BillingPurchaseBenefitsSection } from "./BillingPurchaseBenefitsSection";
import { BillingPurchaseSection } from "./BillingPurchaseSection";
import { AdminGrantPanel, AdminGrantPasswordModal } from "./AdminGrantPanel";
import { useBillingData } from "./useBillingData";
import "./billingPage.css";

const TufStellarManagePage = () => {
  const { t } = useTranslation(["pages", "common"]);
  const location = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = user && hasFlag(user, permissionFlags.SUPER_ADMIN);
  const [adminGrantModeActive, setAdminGrantModeActive] = useState(false);
  const [adminGrantPasswordModalOpen, setAdminGrantPasswordModalOpen] = useState(false);
  const [adminGrantStoredPassword, setAdminGrantStoredPassword] = useState("");

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
    if (adminGrantModeActive) return;
    if (location.hash !== "#purchase") return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById("billing-purchase-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [location.hash, loading, adminGrantModeActive]);

  const handleAdminGrantModeToggle = () => {
    if (adminGrantModeActive) {
      setAdminGrantModeActive(false);
      setAdminGrantStoredPassword("");
      return;
    }
    setAdminGrantPasswordModalOpen(true);
  };

  const handleAdminGrantPasswordVerified = (password) => {
    setAdminGrantStoredPassword(password);
    setAdminGrantPasswordModalOpen(false);
    setAdminGrantModeActive(true);
  };

  if (loading && !billing.billingState) {
    return (
      <div className="billing-page">
        <div className="loader-shell loader-shell--tall">
          <div className="loader loader-relative" />
        </div>
      </div>
    );
  }

  if (adminGrantModeActive && isSuperAdmin) {
    return (
      <div className="billing-page billing-page--admin-grant-mode">
        <header className="billing-page__header billing-page__header--toolbar">
          <div className="billing-page__header-text">
            <h2 className="settings-sub-page__title billing-page__title">{t("billing.pages.tufStellarTitle")}</h2>
            <p className="billing-page__subtitle settings-sub-page__text">{t("billing.pages.tufStellarAdminSubtitle")}</p>
          </div>
          <div className="billing-page__header-actions">
            <button
              type="button"
              className="billing-page__btn billing-page__btn--ghost"
              onClick={handleAdminGrantModeToggle}
            >
              {t("billing.adminGrants.exitMode")}
            </button>
          </div>
        </header>

        <AdminGrantPanel
          storedPassword={adminGrantStoredPassword}
          onGrantChange={() => fetchAll({ forceRefresh: true })}
        />
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
        <div className="billing-page__header-actions">
          <button
            type="button"
            className="billing-page__btn billing-page__btn--ghost"
            onClick={() => fetchAll({ forceRefresh: true })}
            disabled={loading}
          >
            {t("billing.actions.refreshPage")}
          </button>
          {isSuperAdmin ? (
            <button
              type="button"
              className="billing-page__btn billing-page__btn--ghost"
              onClick={handleAdminGrantModeToggle}
            >
              {t("billing.adminGrants.openMode")}
            </button>
          ) : null}
        </div>
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

      {isSuperAdmin ? (
        <AdminGrantPasswordModal
          open={adminGrantPasswordModalOpen}
          onClose={() => setAdminGrantPasswordModalOpen(false)}
          onVerified={handleAdminGrantPasswordVerified}
        />
      ) : null}
    </div>
  );
};

export default TufStellarManagePage;
