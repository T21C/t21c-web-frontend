// tuf-search: #BillingPage #billingPage #account #settings #billing
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/utils/api";
import "./billingPage.css";

const STATUS_LABEL_KEY = {
  active: "billing.status.active",
  inactive: "billing.status.inactive",
  cancelling: "billing.status.cancelling",
};

function formatDate(value, locale) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return new Date(value).toISOString();
  }
}

function formatAmount(amount, currency, locale) {
  if (amount == null || !Number.isFinite(amount)) return null;
  try {
    if (currency) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }).format(amount);
    }
    return new Intl.NumberFormat(locale).format(amount);
  } catch {
    return `${amount}${currency ? ` ${currency}` : ""}`;
  }
}

const BillingPage = () => {
  const { t, i18n } = useTranslation(["pages", "common"]);
  const locale = i18n.language || undefined;
  const { fetchUser } = useAuth();

  const [billingState, setBillingState] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [resubscribing, setResubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErrorState(false);
    try {
      const [stateRes, eventsRes] = await Promise.all([
        api.get("/v3/billing/me"),
        api.get("/v3/billing/me/events", { params: { limit: 20 } }),
      ]);
      setBillingState(stateRes.data || null);
      setEvents(Array.isArray(eventsRes.data?.events) ? eventsRes.data.events : []);
    } catch (e) {
      console.error("BillingPage fetch failed:", e);
      setErrorState(true);
      setBillingState(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const statusKey = useMemo(() => {
    const L = billingState?.lifecycle;
    if (!billingState || !L) return "inactive";
    if (L === "inactive") return "inactive";
    if (L === "active_cancelling") return "cancelling";
    return "active";
  }, [billingState]);

  const { canCheckout, canCancel, canResubscribe } = useMemo(() => {
    const a = billingState?.allowedActions;
    return {
      canCheckout: Boolean(a?.checkout),
      canCancel: Boolean(a?.cancel),
      canResubscribe: Boolean(a?.resubscribe),
    };
  }, [billingState?.allowedActions]);

  const billingToastForCode = useCallback(
    (code, fallbackMsg) => {
      if (code === "SUBSCRIPTION_ALREADY_ACTIVE") return t("billing.toasts.checkoutBlockedActive");
      if (code === "USE_RESUBSCRIBE") return t("billing.toasts.checkoutUseResubscribe");
      if (code === "SUBSCRIPTION_NOT_READY" || code === "NO_RECURRING_SUBSCRIPTION") {
        return t("billing.toasts.subscriptionNotReady");
      }
      return fallbackMsg;
    },
    [t],
  );

  const expiresAtFormatted = useMemo(
    () => formatDate(billingState?.expiresAt, locale),
    [billingState?.expiresAt, locale],
  );
  const cancelledAtFormatted = useMemo(
    () => formatDate(billingState?.cancelledAt, locale),
    [billingState?.cancelledAt, locale],
  );

  const handleSubscribe = useCallback(async () => {
    if (subscribing) return;
    setSubscribing(true);
    const toastId = toast.loading(t("billing.toasts.startingCheckout"));
    try {
      const { data } = await api.post("/v3/billing/xsolla/checkout");
      const url = data?.url;
      if (!url) throw new Error("Missing checkout url");
      // With noopener/noreferrer, many browsers return null even when a new tab opens.
      // Never fall back to location.assign — that would duplicate Pay Station in the original tab too.
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success(t("billing.toasts.checkoutOpened"), { id: toastId });
    } catch (e) {
      const code = e?.response?.data?.error?.code;
      const msg = billingToastForCode(code, e?.response?.data?.error?.message || t("billing.toasts.checkoutError"));
      toast.error(msg, { id: toastId });
      if (code === "SUBSCRIPTION_ALREADY_ACTIVE" || code === "USE_RESUBSCRIBE") {
        try {
          await fetchAll();
        } catch {
          /* ignore */
        }
      }
    } finally {
      setSubscribing(false);
    }
  }, [subscribing, t, billingToastForCode, fetchAll]);

  const handleResubscribe = useCallback(async () => {
    if (resubscribing) return;
    setResubscribing(true);
    const toastId = toast.loading(t("billing.toasts.resubscribing"));
    try {
      await api.post("/v3/billing/xsolla/resubscribe");
      toast.success(t("billing.toasts.resubscribeSuccess"), { id: toastId });
      await fetchAll();
      try { await fetchUser(true); } catch { /* ignore */ }
    } catch (e) {
      const msg = e?.response?.data?.error?.message || t("billing.toasts.resubscribeError");
      toast.error(msg, { id: toastId });
    } finally {
      setResubscribing(false);
    }
  }, [resubscribing, t, fetchAll, fetchUser]);

  const handleCancel = useCallback(async () => {
    if (cancelling) return;
    setCancelling(true);
    const toastId = toast.loading(t("billing.toasts.cancelling"));
    try {
      await api.post("/v3/billing/xsolla/cancel");
      toast.success(t("billing.toasts.cancelRequested"), { id: toastId });
      setConfirmCancelOpen(false);
      await fetchAll();
      try { await fetchUser(true); } catch { /* ignore */ }
    } catch (e) {
      const code = e?.response?.data?.error?.code;
      const msg = billingToastForCode(code, e?.response?.data?.error?.message || t("billing.toasts.cancelError"));
      toast.error(msg, { id: toastId });
      if (
        code === "NO_ACTIVE_SUBSCRIPTION"
        || code === "SUBSCRIPTION_NOT_READY"
        || code === "NO_RECURRING_SUBSCRIPTION"
      ) {
        try {
          await fetchAll();
        } catch {
          /* ignore */
        }
      }
    } finally {
      setCancelling(false);
    }
  }, [cancelling, t, fetchAll, fetchUser, billingToastForCode]);

  if (loading && !billingState) {
    return (
      <div className="settings-sub-page settings-sub-page--centered billing-page">
        <div className="loader loader-level-detail" />
      </div>
    );
  }

  return (
    <div className="settings-sub-page billing-page">
      <header className="billing-page__header">
        <h2 className="settings-sub-page__title billing-page__title">{t("billing.title")}</h2>
        <p className="settings-sub-page__text billing-page__subtitle">
          {t("billing.subtitle")}
        </p>
      </header>

      {errorState ? (
        <div className="billing-page__card billing-page__card--error">
          <p className="settings-sub-page__text">{t("billing.loadError")}</p>
          <button
            type="button"
            className="billing-page__btn billing-page__btn--secondary"
            onClick={fetchAll}
          >
            {t("billing.actions.retry", { defaultValue: t("buttons.retry", { ns: "common", defaultValue: "Retry" }) })}
          </button>
        </div>
      ) : null}

      <section className="billing-page__card billing-page__status-card" aria-labelledby="billing-status-heading">
        <div className="billing-page__status-row">
          <div className="billing-page__status-text">
            <h3 id="billing-status-heading" className="billing-page__card-title">
              {t("billing.status.title")}
            </h3>
            <span className={`billing-page__pill billing-page__pill--${statusKey}`}>
              {t(STATUS_LABEL_KEY[statusKey])}
            </span>
          </div>
          <div className="billing-page__status-meta">
            {billingState?.plan ? (
              <p className="billing-page__meta-line">
                <span className="billing-page__meta-label">{t("billing.fields.plan")}</span>
                <span className="billing-page__meta-value">{billingState.plan}</span>
              </p>
            ) : null}
            {expiresAtFormatted ? (
              <p className="billing-page__meta-line">
                <span className="billing-page__meta-label">
                  {statusKey === "cancelling"
                    ? t("billing.fields.cancelsOn")
                    : t("billing.fields.renewsOn")}
                </span>
                <span className="billing-page__meta-value">{expiresAtFormatted}</span>
              </p>
            ) : null}
            {statusKey === "cancelling" && cancelledAtFormatted ? (
              <p className="billing-page__meta-line">
                <span className="billing-page__meta-label">{t("billing.fields.cancelledAt")}</span>
                <span className="billing-page__meta-value">{cancelledAtFormatted}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="billing-page__actions">
          {canCancel ? (
            <button
              type="button"
              className="billing-page__btn billing-page__btn--danger"
              onClick={() => setConfirmCancelOpen(true)}
              disabled={cancelling}
            >
              {t("billing.actions.cancel")}
            </button>
          ) : null}

          {billingState?.lifecycle === "active_checkout_pending" ? (
            <p className="settings-sub-page__text billing-page__actions-hint">
              {t("billing.hints.activating")}
            </p>
          ) : null}

          {canResubscribe ? (
            <button
              type="button"
              className="billing-page__btn billing-page__btn--primary"
              onClick={handleResubscribe}
              disabled={resubscribing}
            >
              {resubscribing
                ? t("billing.actions.resubscribing", { defaultValue: t("buttons.loading", { ns: "common", defaultValue: "Loading..." }) })
                : t("billing.actions.resubscribe")}
            </button>
          ) : null}

          {canCheckout ? (
            <button
              type="button"
              className="billing-page__btn billing-page__btn--primary"
              onClick={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing
                ? t("billing.actions.subscribing", { defaultValue: t("buttons.loading", { ns: "common", defaultValue: "Loading..." }) })
                : t("billing.actions.subscribe")}
            </button>
          ) : null}
        </div>
      </section>

      <section className="billing-page__card" aria-labelledby="billing-history-heading">
        <h3 id="billing-history-heading" className="billing-page__card-title">
          {t("billing.history.title")}
        </h3>
        {events.length === 0 ? (
          <p className="settings-sub-page__text">{t("billing.history.empty")}</p>
        ) : (
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
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const amountStr = formatAmount(ev.amount, ev.currency, locale);
                  return (
                    <tr key={ev.id}>
                      <td>{formatDate(ev.createdAt, locale)}</td>
                      <td>
                        <code className="billing-page__event-type">{ev.eventType}</code>
                      </td>
                      <td>
                        <span className={`billing-page__event-status billing-page__event-status--${ev.status}`}>
                          {ev.status}
                        </span>
                      </td>
                      <td className="billing-page__col--right">{amountStr || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirmCancelOpen ? (
        <div
          className="billing-page__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="billing-cancel-confirm-title"
          onClick={() => !cancelling && setConfirmCancelOpen(false)}
        >
          <div
            className="billing-page__modal"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h4 id="billing-cancel-confirm-title" className="billing-page__modal-title">
              {t("billing.cancelConfirm.title")}
            </h4>
            <p className="billing-page__modal-text">
              {t("billing.cancelConfirm.body", {
                date: expiresAtFormatted ?? "",
                defaultValue:
                  "Cancel your TUFStellar subscription? You keep access until {{date}}.",
              })}
            </p>
            <div className="billing-page__modal-actions">
              <button
                type="button"
                className="billing-page__btn billing-page__btn--secondary"
                onClick={() => setConfirmCancelOpen(false)}
                disabled={cancelling}
              >
                {t("billing.cancelConfirm.keep")}
              </button>
              <button
                type="button"
                className="billing-page__btn billing-page__btn--danger"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling
                  ? t("billing.cancelConfirm.confirming", {
                      defaultValue: t("buttons.loading", { ns: "common", defaultValue: "Loading..." }),
                    })
                  : t("billing.cancelConfirm.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BillingPage;
