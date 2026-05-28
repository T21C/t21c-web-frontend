// tuf-search: #BillingPage
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { CopyIcon } from "@/components/common/icons";
import api from "@/utils/api";
import { routes } from '@/api/routes';
import {
  billingHistoryProductDetail,
  billingRefundPostErrorToast,
  billingRefundPreviewReasonMessage,
  buildSupportCopyPayload,
  formatAmount,
  formatDate,
  formatMinorCurrency,
  historyEventLabel,
  isStripeRefundCandidate,
  processingStatusLabel,
} from "./billingUtils";

export function BillingHistorySection({ events, onAfterRefund }) {
  const { t, i18n } = useTranslation("pages");
  const locale = i18n.language || undefined;

  const [refundModal, setRefundModal] = useState(null);
  /** @type {{ ev: object, preview: object } | null} */
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const copyBillingSupportInfo = useCallback(
    async (ev) => {
      const text = buildSupportCopyPayload(ev, t);
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("billing.history.copySupportDone"));
      } catch {
        toast.error(t("billing.history.copySupportFail", { defaultValue: "Could not copy." }));
      }
    },
    [t],
  );

  const openRefundFlow = useCallback(
    async (ev) => {
      const toastId = toast.loading(t("billing.history.refundLoadingPreview"));
      try {
        const { data } = await api.get(routes.billingV3.stripe.refundPreview(), {
          params: { billingEventId: ev.id },
        });
        toast.dismiss(toastId);
        if (!data?.eligible) {
          const reason = billingRefundPreviewReasonMessage(data?.reasonCode, t);
          toast.error(reason || t("billing.history.refundErrors.REFUND_NOT_ELIGIBLE"));
          return;
        }
        setRefundModal({ ev, preview: data });
      } catch (e) {
        toast.dismiss(toastId);
        toast.error(e?.response?.data?.error?.message || t("billing.history.refundErrors.STRIPE_ERROR"));
      }
    },
    [t],
  );

  const closeRefundModal = useCallback(() => {
    if (refundSubmitting) return;
    setRefundModal(null);
  }, [refundSubmitting]);

  const confirmRefund = useCallback(async () => {
    if (!refundModal?.ev?.id) return;
    setRefundSubmitting(true);
    try {
      await api.post(routes.billingV3.stripe.refund(), { billingEventId: refundModal.ev.id });
      toast.success(t("billing.history.refundSuccess"));
      setRefundModal(null);
      if (typeof onAfterRefund === "function") {
        await onAfterRefund();
      }
    } catch (e) {
      const code = e?.response?.data?.error?.code;
      const mapped = billingRefundPostErrorToast(code, t);
      const fallback = e?.response?.data?.error?.message || t("billing.history.refundErrors.STRIPE_ERROR");
      toast.error(mapped || fallback);
    } finally {
      setRefundSubmitting(false);
    }
  }, [refundModal, t, onAfterRefund]);

  if (!events.length) return null;

  const listUsd = refundModal?.preview?.listUsdPerMonth;
  const maxDays = refundModal?.preview?.maxRefundAgeDays ?? 180;
  const cur = refundModal?.preview?.currency || "USD";
  const refundStr = formatMinorCurrency(refundModal?.preview?.refundCents, cur, locale);
  const listChargeStr = formatMinorCurrency(refundModal?.preview?.listChargeCents, cur, locale);
  const listRateStr =
    listUsd != null && Number.isFinite(Number(listUsd))
      ? formatAmount(Number(listUsd), cur, locale) || `USD ${listUsd}`
      : "";

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
              <th scope="col" className="billing-page__col--actions">
                {t("billing.history.cols.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => {
              const amountStr = formatAmount(ev.amount, ev.currency, locale);
              const productDetail = billingHistoryProductDetail(ev.product, t);
              const showRefund = isStripeRefundCandidate(ev);
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
                  <td className="billing-page__col--actions">
                    <div className="billing-page__history-actions">
                      <button
                        type="button"
                        className="billing-page__btn billing-page__btn--ghost billing-page__history-icon-btn"
                        onClick={() => copyBillingSupportInfo(ev)}
                        aria-label={t("billing.history.copyDetailsAria")}
                      >
                        <CopyIcon color="currentColor" size={20} aria-hidden />
                      </button>
                      {showRefund ? (
                        <button
                          type="button"
                          className="billing-page__btn billing-page__btn--ghost billing-page__history-refund-btn"
                          onClick={() => openRefundFlow(ev)}
                        >
                          {t("billing.history.refundButton")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {refundModal ? (
        <div className="billing-page__overlay" role="presentation" onClick={closeRefundModal}>
          <div
            className="billing-page__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-refund-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="billing-refund-modal-title" className="billing-page__modal-title">
              {t("billing.history.refundConfirmTitle")}
            </h4>
            <p className="billing-page__modal-text">{t("billing.history.refundPolicy180", { days: maxDays })}</p>
            <p className="billing-page__modal-text">
              {refundModal.preview?.mode === "partial"
                ? t("billing.history.refundPartialBody", {
                    listRate: listRateStr,
                    listCharge: listChargeStr || "—",
                    refund: refundStr || "—",
                  })
                : t("billing.history.refundFullBody", { refund: refundStr || "—" })}
            </p>
            <div className="billing-page__modal-actions">
              <button
                type="button"
                className="billing-page__btn billing-page__btn--ghost"
                onClick={closeRefundModal}
                disabled={refundSubmitting}
              >
                {t("billing.history.refundCancel")}
              </button>
              <button
                type="button"
                className="billing-page__btn billing-page__btn--primary"
                onClick={confirmRefund}
                disabled={refundSubmitting}
              >
                {refundSubmitting ? t("billing.history.refundSubmitting") : t("billing.history.refundConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
