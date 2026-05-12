// tuf-search: #BillingPage #billingPage #account #settings #billing
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isTufStellarEnabledForUser } from "@/utils/tufStellarFeature";
import { BillingAccessSection } from "./BillingAccessSection";
import { BillingHistorySection } from "./BillingHistorySection";
import { useBillingData } from "./useBillingData";
import "./billingPage.css";

const BillingPage = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { user } = useAuth();

  const billing = useBillingData({ loadEvents: true });

  const {
    loading,
    errorState,
    fetchAll,
    accessPillKey,
    accessActive,
    accessExpiresAt,
    purchaseFundedRemainingMs,
    accessSegments,
  } = billing;

  if (loading && !billing.billingState) {
    return (
      <div className="settings-sub-page settings-sub-page--centered billing-page">
        <div className="loader loader-level-detail" />
      </div>
    );
  }

  return (
    <div className="settings-sub-page billing-page">
      <header className="billing-page__header billing-page__header--toolbar">
        <div className="billing-page__header-text">
          <h2 className="settings-sub-page__title billing-page__title">{t("billing.pages.billingTitle")}</h2>
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

      {isTufStellarEnabledForUser(user) ? (
        <nav className="billing-page__cross-links" aria-label={t("billing.crossLinks.navAria")}>
          <Link className="billing-page__btn billing-page__btn--ghost billing-page__cross-link" to="/tuf-stellar">
            {t("billing.crossLinks.manageTufStellar")}
          </Link>
        </nav>
      ) : null}

      <BillingAccessSection
        accessPillKey={accessPillKey}
        accessActive={accessActive}
        accessExpiresAt={accessExpiresAt}
        purchaseFundedRemainingMs={purchaseFundedRemainingMs}
        accessSegments={accessSegments}
      />

      <BillingHistorySection events={billing.events} onAfterRefund={() => fetchAll({ forceRefresh: true })} />
    </div>
  );
};

export default BillingPage;
