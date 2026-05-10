// tuf-search: #BillingPage
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import {
  billingHistoryProductDetail,
  buildSupportCopyPayload,
  formatAmount,
  formatDate,
  historyEventLabel,
  processingStatusLabel,
} from "./billingUtils";

export function BillingHistorySection({ events }) {
  const { t, i18n } = useTranslation("pages");
  const locale = i18n.language || undefined;

  const copyBillingSupportInfo = useCallback(
    async (ev) => {
      const text = buildSupportCopyPayload(ev);
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("billing.history.copySupportDone"));
      } catch {
        toast.error(t("billing.history.copySupportFail", { defaultValue: "Could not copy." }));
      }
    },
    [t],
  );

  if (!events.length) return null;

  return (
    <section className="billing-page__card" aria-labelledby="billing-history-heading">
      <div className="billing-page__section-head">
        <h3 id="billing-history-heading" className="billing-page__card-title">
          {t("billing.history.title")}
        </h3>
      </div>
      <div className="billing-page__history-table-wrap" role="region" aria-label={t("billing.history.title")}>
        <table className="billing-page__history-table">
          <thead>
            <tr>
              <th scope="col">{t("billing.history.cols.date")}</th>
              <th scope="col">{t("billing.history.cols.event")}</th>
              <th scope="col">{t("billing.history.cols.status")}</th>
              <th scope="col" className="billing-page__col--right">
                {t("billing.history.cols.amount")}
              </th>
              <th scope="col" className="billing-page__col--support">
                {t("billing.history.cols.support")}
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => {
              const amountStr = formatAmount(ev.amount, ev.currency, locale);
              const productDetail = billingHistoryProductDetail(ev.product, t);
              return (
                <tr key={ev.id}>
                  <td>{formatDate(ev.createdAt, locale)}</td>
                  <td>
                    <div className="billing-page__event-cell-stack">
                      <span className="billing-page__event-type-label">{historyEventLabel(ev, t)}</span>
                      {productDetail ? (
                        <span className="billing-page__event-product-detail">{productDetail}</span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <span className={`billing-page__event-status billing-page__event-status--${ev.status}`}>
                      {processingStatusLabel(ev.status, t)}
                    </span>
                  </td>
                  <td className="billing-page__col--right">{amountStr || "—"}</td>
                  <td className="billing-page__col--support">
                    <button
                      type="button"
                      className="billing-page__btn billing-page__btn--ghost billing-page__support-copy"
                      onClick={() => copyBillingSupportInfo(ev)}
                    >
                      {t("billing.history.copySupport")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
