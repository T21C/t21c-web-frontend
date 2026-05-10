// tuf-search: #BillingPage #billingPage #account #settings #billing
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileSelector } from "@/components/common/selectors";
import { userAvatarDisplayUrl } from "@/utils/playerAvatarDisplay";
import api from "@/utils/api";
import "./billingPage.css";

/** Snapshot after picking a gift recipient (search row + profile link). */
function BillingGiftRecipientPreview({ recipient }) {
  const src = userAvatarDisplayUrl(recipient);
  const primary = recipient.username || recipient.nickname || recipient.userId;
  const showSecondary = recipient.nickname && recipient.username && recipient.nickname !== recipient.username;
  return (
    <span className="billing-page__recipient-rich">
      {src ? (
        <img className="billing-page__recipient-rich-avatar" src={src} alt="" />
      ) : (
        <span className="billing-page__recipient-rich-avatar billing-page__recipient-rich-avatar--placeholder" aria-hidden />
      )}
      <span className="billing-page__recipient-rich-text">
        <span className="billing-page__recipient-rich-primary">{primary}</span>
        {showSecondary ? (
          <span className="billing-page__recipient-rich-secondary">{recipient.nickname}</span>
        ) : null}
      </span>
    </span>
  );
}

/** Must match server `tufStellarProductCatalog.ts` order and pricing display. */
const TUF_STELLAR_TERM_OPTIONS = [
  { months: 1, priceUsd: 3 },
  { months: 2, priceUsd: 6 },
  { months: 3, priceUsd: 8 },
  { months: 6, priceUsd: 16 },
  { months: 9, priceUsd: 24 },
  { months: 12, priceUsd: 30 },
];

const SUBSCRIPTION_PILL_KEY = {
  inactive: "inactive",
  active_renewing: "active",
  active_cancelling: "cancelling",
  active_checkout_pending: "active",
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

function eventTypeLabel(eventType, t) {
  return t(`billing.history.events.${eventType}`, { defaultValue: eventType });
}

function historyEventLabel(ev, t) {
  const kind = ev.activityKind ?? "default";
  if (kind === "gift_received") {
    const u = ev.counterpartyUsername || t("billing.history.fallbackUser");
    const nick =
      ev.counterpartyNickname && ev.counterpartyNickname !== ev.counterpartyUsername
        ? ` (${ev.counterpartyNickname})`
        : "";
    return t("billing.history.activity.giftReceived", { name: `${u}${nick}` });
  }
  if (kind === "gift_sent") {
    const u = ev.counterpartyUsername || t("billing.history.fallbackUser");
    const nick =
      ev.counterpartyNickname && ev.counterpartyNickname !== ev.counterpartyUsername
        ? ` (${ev.counterpartyNickname})`
        : "";
    return t("billing.history.activity.giftSent", { name: `${u}${nick}` });
  }
  if (kind === "one_time_self") {
    return eventTypeLabel(ev.eventType, t);
  }
  return eventTypeLabel(ev.eventType, t);
}

function buildSupportCopyPayload(ev) {
  const lines = [
    `billing_event_id: ${ev.id}`,
    `provider: ${ev.provider}`,
    `event_type: ${ev.eventType}`,
    `status: ${ev.status}`,
    `created_at: ${ev.createdAt}`,
    `processed_at: ${ev.processedAt ?? ""}`,
  ];
  if (ev.amount != null && Number.isFinite(Number(ev.amount))) {
    lines.push(`amount: ${ev.amount}${ev.currency ? ` ${ev.currency}` : ""}`);
  }
  const refs = Array.isArray(ev.references) ? ev.references : [];
  for (const ref of refs) {
    lines.push(`${ref.kind}: ${ref.value}`);
  }
  return lines.join("\n");
}

function approxDaysRemainingLabel(ms, t) {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const days = Math.max(1, Math.ceil(ms / 86_400_000));
  return t("billing.access.remainingApproxDays", { count: days });
}

function processingStatusLabel(status, t) {
  return t(`billing.history.processingStatus.${status}`, { defaultValue: status });
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
  const [checkoutTermIndex, setCheckoutTermIndex] = useState(2);
  const [checkoutAutoRenew, setCheckoutAutoRenew] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState("gift");
  const [purchaseAsGift, setPurchaseAsGift] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState(null);

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

  useEffect(() => {
    if (checkoutMode === "subscription") {
      setPurchaseAsGift(false);
      setGiftRecipient(null);
    }
  }, [checkoutMode]);

  useEffect(() => {
    if (!purchaseAsGift) {
      setGiftRecipient(null);
    }
  }, [purchaseAsGift]);

  const accessActive = Boolean(billingState?.access?.active ?? billingState?.active);
  const accessExpiresAt = billingState?.access?.expiresAt ?? billingState?.expiresAt ?? null;
  const recurringPeriodEndsAt =
    billingState?.subscription?.recurringPeriodEndsAt ?? billingState?.access?.recurringPeriodEndsAt ?? null;
  const oneTimeRemainingMsRaw = billingState?.access?.oneTimeRemainingMs;
  const oneTimeRemainingMs =
    oneTimeRemainingMsRaw != null && Number.isFinite(Number(oneTimeRemainingMsRaw))
      ? Number(oneTimeRemainingMsRaw)
      : 0;

  const subscriptionLifecycle = billingState?.subscription?.lifecycle ?? billingState?.lifecycle ?? "inactive";
  const subscriptionCancelledAt = billingState?.subscription?.cancelledAt ?? billingState?.cancelledAt ?? null;
  const subscriptionAllowed = billingState?.subscription?.allowedActions;
  const subscriptionTermMonthsRaw = billingState?.subscription?.termMonths;
  const subscriptionTermMonths =
    subscriptionTermMonthsRaw != null && Number.isFinite(Number(subscriptionTermMonthsRaw))
      ? Number(subscriptionTermMonthsRaw)
      : null;
  const hasRecurringSubscription = Boolean(billingState?.subscription?.hasRecurringSubscription);

  const accessPillKey = accessActive ? "active" : "inactive";

  const subscriptionPillKey = SUBSCRIPTION_PILL_KEY[subscriptionLifecycle] ?? "inactive";

  const { canPurchaseGift, canPurchaseSubscription, canCancel, canResubscribe } = useMemo(() => {
    const a = billingState?.allowedActions;
    return {
      canPurchaseGift: a?.purchaseGift !== undefined ? Boolean(a.purchaseGift) : true,
      canPurchaseSubscription: Boolean(a?.purchaseSubscription ?? a?.checkout),
      canCancel: Boolean(subscriptionAllowed?.cancel ?? a?.cancel),
      canResubscribe: Boolean(subscriptionAllowed?.resubscribe ?? a?.resubscribe),
    };
  }, [billingState?.allowedActions, subscriptionAllowed]);

  const canOpenCheckout =
    checkoutMode === "subscription"
      ? canPurchaseSubscription
      : canPurchaseGift && (!purchaseAsGift || Boolean(giftRecipient?.userId));

  const isCheckoutPending = subscriptionLifecycle === "active_checkout_pending";
  const hasSubscriptionManagement = canResubscribe || canCancel || isCheckoutPending;
  const hasPurchasePanel = canPurchaseGift || canPurchaseSubscription;
  const showIdleNote = billingState && !hasPurchasePanel && !hasSubscriptionManagement;

  const billingToastForCode = useCallback(
    (code, fallbackMsg) => {
      if (code === "SUBSCRIPTION_ALREADY_ACTIVE") return t("billing.toasts.checkoutBlockedActive");
      if (code === "USE_RESUBSCRIBE") return t("billing.toasts.checkoutUseResubscribe");
      if (code === "INVALID_CHECKOUT_TERM") return t("billing.toasts.checkoutInvalidTerm");
      if (code === "SUBSCRIPTION_NOT_READY" || code === "NO_RECURRING_SUBSCRIPTION") {
        return t("billing.toasts.subscriptionNotReady");
      }
      if (code === "GIFT_RECIPIENT_NOT_FOUND") return t("billing.toasts.giftRecipientNotFound");
      if (code === "GIFT_RECIPIENT_BLOCKED") return t("billing.toasts.giftRecipientBlocked");
      if (code === "GIFT_EMAIL_REQUIRED") return t("billing.toasts.giftEmailRequired");
      if (code === "INVALID_RECIPIENT_ID") return t("billing.toasts.invalidRecipientId");
      if (code === "SUBSCRIPTION_SELF_ONLY") return t("billing.toasts.subscriptionSelfOnly");
      if (code === "BILLING_ACCOUNT_BLOCKED") return t("billing.toasts.billingAccountBlocked");
      if (code === "INVALID_SEARCH_QUERY") return t("billing.toasts.searchQueryInvalid");
      if (code === "SUBSCRIPTION_TERMINATED_USE_CHECKOUT") return t("billing.toasts.resubscribeTerminatedUseCheckout");
      return fallbackMsg;
    },
    [t],
  );

  const accessExpiresFormatted = useMemo(
    () => formatDate(accessExpiresAt, locale),
    [accessExpiresAt, locale],
  );

  const subscriptionExpiresFormatted = useMemo(
    () => formatDate(accessExpiresAt, locale),
    [accessExpiresAt, locale],
  );

  const recurringEndsFormatted = useMemo(
    () => formatDate(recurringPeriodEndsAt, locale),
    [recurringPeriodEndsAt, locale],
  );

  const subscriptionRenewalDisplayFormatted = recurringEndsFormatted ?? subscriptionExpiresFormatted;

  const cancelledAtFormatted = useMemo(
    () => formatDate(subscriptionCancelledAt, locale),
    [subscriptionCancelledAt, locale],
  );

  const hasSubscriptionPlanDetail =
    subscriptionLifecycle !== "inactive" && (subscriptionTermMonths != null || hasRecurringSubscription);

  const hasSubscriptionDetailRows = Boolean(
    hasSubscriptionPlanDetail
    || (subscriptionLifecycle !== "inactive" && subscriptionRenewalDisplayFormatted)
    || (subscriptionPillKey === "cancelling" && cancelledAtFormatted),
  );

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

  const selectedCheckoutTerm = TUF_STELLAR_TERM_OPTIONS[checkoutTermIndex] ?? TUF_STELLAR_TERM_OPTIONS[0];
  const termSliderFillPct = useMemo(() => {
    const maxIdx = TUF_STELLAR_TERM_OPTIONS.length - 1;
    if (maxIdx <= 0) return 100;
    return (checkoutTermIndex / maxIdx) * 100;
  }, [checkoutTermIndex]);

  /** Tooltip summary: price line, duration, savings vs paying the 1-month rate for each month. */
  const checkoutTermPreview = useMemo(() => {
    const term = selectedCheckoutTerm;
    const baseline = TUF_STELLAR_TERM_OPTIONS[0];
    const baselinePerMonth = baseline.priceUsd / baseline.months;
    const listUsd = term.months * baselinePerMonth;
    const rawSave =
      listUsd > term.priceUsd ? Math.round((1 - term.priceUsd / listUsd) * 100) : 0;
    const duration = t("billing.checkout.durationMonths", { count: term.months });
    const priceWholeUsd = Math.round(term.priceUsd);
    const ariaText =
      rawSave > 0
        ? t("billing.checkout.summaryAriaWithSave", {
            price: priceWholeUsd,
            duration,
            pct: rawSave,
          })
        : t("billing.checkout.summaryAria", { price: priceWholeUsd, duration });
    return {
      priceWholeUsd,
      duration,
      savePct: rawSave,
      ariaText,
    };
  }, [selectedCheckoutTerm, t]);

  const handleRecipientProfileChange = useCallback((profile) => {
    if (profile?.id == null || profile?.isNewRequest === true || String(profile.id).length === 0) return;
    const pid = profile.playerId;
    setGiftRecipient({
      userId: String(profile.id),
      playerId: pid != null && Number.isFinite(Number(pid)) ? Number(pid) : null,
      username: profile.username ?? null,
      nickname: profile.nickname ?? null,
      avatarUrl: profile.avatarUrl ?? null,
    });
  }, []);

  const clearRecipient = useCallback(() => {
    setGiftRecipient(null);
  }, []);

  const handleCheckout = useCallback(async () => {
    if (subscribing) return;
    if (checkoutMode === "gift" && purchaseAsGift && !giftRecipient?.userId) {
      toast.error(t("billing.toasts.recipientRequired"));
      return;
    }
    setSubscribing(true);
    const toastId = toast.loading(t("billing.toasts.startingCheckout"));
    try {
      const term = TUF_STELLAR_TERM_OPTIONS[checkoutTermIndex] ?? TUF_STELLAR_TERM_OPTIONS[0];
      const payload = { months: term.months };
      if (checkoutMode === "gift") {
        payload.mode = "gift";
        if (purchaseAsGift && giftRecipient?.userId) payload.recipientUserId = giftRecipient.userId;
      } else {
        payload.mode = "subscription";
        payload.autoRenew = checkoutAutoRenew;
      }
      const { data } = await api.post("/v3/billing/xsolla/checkout", payload);
      const url = data?.url;
      if (!url) throw new Error("Missing checkout url");
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
  }, [
    subscribing,
    checkoutMode,
    purchaseAsGift,
    giftRecipient,
    checkoutTermIndex,
    checkoutAutoRenew,
    t,
    billingToastForCode,
    fetchAll,
  ]);

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
      const code = e?.response?.data?.error?.code;
      const msg = billingToastForCode(code, e?.response?.data?.error?.message || t("billing.toasts.resubscribeError"));
      toast.error(msg, { id: toastId });
      if (code === "SUBSCRIPTION_TERMINATED_USE_CHECKOUT") {
        try {
          await fetchAll();
          await fetchUser(true);
        } catch {
          /* ignore */
        }
      }
    } finally {
      setResubscribing(false);
    }
  }, [resubscribing, t, fetchAll, fetchUser, billingToastForCode]);

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
      <header className="billing-page__header billing-page__header--toolbar">
        <div className="billing-page__header-text">
          <h2 className="settings-sub-page__title billing-page__title">{t("billing.title")}</h2>
        </div>
        <button
          type="button"
          className="billing-page__btn billing-page__btn--ghost"
          onClick={fetchAll}
          disabled={loading}
        >
          {t("billing.actions.refreshPage")}
        </button>
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

      <section className="billing-page__card billing-page__card--compact" aria-labelledby="billing-access-heading">
        <h3 id="billing-access-heading" className="billing-page__card-title">
          {t("billing.access.title")}
        </h3>
        <div className="billing-page__access-row">
          <div
            className={`billing-page__status-label billing-page__pill billing-page__pill--${accessPillKey}`}
          >
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
        {accessActive && hasRecurringSubscription && oneTimeRemainingMs > 0 ? (
          <p className="billing-page__access-meta">
            {t("billing.access.oneTimeCushion", {
              duration: approxDaysRemainingLabel(oneTimeRemainingMs, t),
            })}
          </p>
        ) : null}
      </section>

      <section className="billing-page__card billing-page__status-card" aria-labelledby="billing-subscription-heading">
        <h3 id="billing-subscription-heading" className="billing-page__card-title">
          {t("billing.subscription.title")}
        </h3>

        <div className="billing-page__layout">
          <div className="billing-page__column">
            <div className="billing-page__subscription-status-stack">
              <div
                className={`billing-page__status-label billing-page__pill billing-page__pill--${subscriptionPillKey}`}
              >
                <span className="billing-page__status-label-text">
                  {t(`billing.subscription.status.${subscriptionLifecycle}`, {
                    defaultValue: t("billing.subscription.status.inactive"),
                  })}
                </span>
              </div>

              {isCheckoutPending ? (
                <p className="billing-page__subscription-activating-hint">{t("billing.hints.activating")}</p>
              ) : null}

              {canResubscribe || canCancel ? (
                <div className="billing-page__subscription-actions">
                  {canResubscribe ? (
                    <button
                      type="button"
                      className="billing-page__btn billing-page__btn--primary"
                      onClick={handleResubscribe}
                      disabled={resubscribing}
                    >
                      {resubscribing
                        ? t("billing.actions.resubscribing", {
                            defaultValue: t("buttons.loading", { ns: "common", defaultValue: "Loading..." }),
                          })
                        : t("billing.actions.resubscribe")}
                    </button>
                  ) : null}
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
                </div>
              ) : null}
            </div>
          </div>

          {hasSubscriptionDetailRows ? (
            <div className="billing-page__column">
              <div className="billing-page__detail-list">
                {hasSubscriptionPlanDetail ? (
                  <div className="billing-page__detail-row">
                    <p className="billing-page__detail-term">{t("billing.fields.plan")}</p>
                    <p className="billing-page__detail-def">
                      {subscriptionTermMonths != null
                        ? t("billing.subscription.planWithTerm", {
                            product: t("billing.subscription.productName"),
                            term: t("billing.checkout.durationMonths", { count: subscriptionTermMonths }),
                          })
                        : t("billing.subscription.productName")}
                    </p>
                  </div>
                ) : null}

                {subscriptionLifecycle !== "inactive" && subscriptionRenewalDisplayFormatted ? (
                  <div className="billing-page__detail-row">
                    <p className="billing-page__detail-term">
                      {subscriptionPillKey === "cancelling"
                        ? t("billing.fields.cancelsOn")
                        : t("billing.fields.nextSubscriptionCharge")}
                    </p>
                    <p className="billing-page__detail-def">{subscriptionRenewalDisplayFormatted}</p>
                  </div>
                ) : null}

                {subscriptionPillKey === "cancelling" && cancelledAtFormatted ? (
                  <div className="billing-page__detail-row">
                    <p className="billing-page__detail-term">{t("billing.fields.cancelledAt")}</p>
                    <p className="billing-page__detail-def">{cancelledAtFormatted}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {showIdleNote ? <p className="billing-page__idle-note">{t("billing.actions.noneNeeded")}</p> : null}
      </section>

      {hasPurchasePanel ? (
        <section className="billing-page__card" aria-labelledby="billing-purchase-heading">
          <h3 id="billing-purchase-heading" className="billing-page__card-title">
            {t("billing.purchase.title")}
          </h3>

          <div className="billing-page__mode-toggle" role="group" aria-label={t("billing.purchase.modeGroupAria")}>
            <button
              type="button"
              className={`billing-page__btn billing-page__mode-btn ${checkoutMode === "gift" ? "billing-page__mode-btn--selected" : "billing-page__btn--ghost"}`}
              aria-pressed={checkoutMode === "gift"}
              onClick={() => setCheckoutMode("gift")}
              disabled={!canPurchaseGift}
            >
              {t("billing.checkout.modeOneTime")}
            </button>
            <button
              type="button"
              className={`billing-page__btn billing-page__mode-btn ${checkoutMode === "subscription" ? "billing-page__mode-btn--selected" : "billing-page__btn--ghost"}`}
              aria-pressed={checkoutMode === "subscription"}
              onClick={() => setCheckoutMode("subscription")}
              disabled={!canPurchaseSubscription}
            >
              {t("billing.checkout.modeSubscription")}
            </button>
          </div>

          {checkoutMode === "gift" ? (
            <div className="billing-page__gift-option">
              <label className="billing-page__gift-checkbox-row">
                <input
                  type="checkbox"
                  className="billing-page__auto-renew-input"
                  checked={purchaseAsGift}
                  onChange={(ev) => setPurchaseAsGift(ev.target.checked)}
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
          ) : null}

          {checkoutMode === "subscription" ? (
            <div className="billing-page__auto-renew">
              <label className="billing-page__auto-renew-row">
                <input
                  type="checkbox"
                  className="billing-page__auto-renew-input"
                  checked={checkoutAutoRenew}
                  onChange={(ev) => setCheckoutAutoRenew(ev.target.checked)}
                />
                <span className="billing-page__auto-renew-label-text">
                  {t("billing.checkout.autoRenew")}
                </span>
              </label>
            </div>
          ) : null}

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
            />
            <div className="billing-page__term-ticks" aria-hidden>
              {TUF_STELLAR_TERM_OPTIONS.map((opt) => (
                <div key={opt.months} className="billing-page__term-tick-container">
                  <span className="billing-page__term-tick">
                    {t("billing.checkout.tickMonths", { count: opt.months })}
                  </span>
                </div>
              ))}
            </div>

            <div className="billing-page__term-summary-box" aria-live="polite">
              <p className="billing-page__term-summary-price">
                {t("billing.checkout.priceUsdWhole", {
                  amount: checkoutTermPreview.priceWholeUsd,
                })}
              </p>
              <p className="billing-page__term-summary-duration">
                {checkoutTermPreview.duration}
              </p>
              {checkoutTermPreview.savePct > 0 ? (
                <p className="billing-page__term-summary-save">
                  {t("billing.checkout.savePercent", { pct: checkoutTermPreview.savePct })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="billing-page__action-row">
            <button
              type="button"
              className="billing-page__btn billing-page__btn--primary"
              onClick={handleCheckout}
              disabled={subscribing || !canOpenCheckout}
            >
              {subscribing
                ? t("billing.actions.openingCheckout", { defaultValue: t("buttons.loading", { ns: "common", defaultValue: "Loading..." }) })
                : t("billing.actions.continueCheckout")}
            </button>
          </div>
        </section>
      ) : null}

      {events.length > 0 ? (
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
                  return (
                    <tr key={ev.id}>
                      <td>{formatDate(ev.createdAt, locale)}</td>
                      <td>
                        <span className="billing-page__event-type-label">{historyEventLabel(ev, t)}</span>
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
      ) : null}

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
                date: subscriptionExpiresFormatted ?? "",
                defaultValue: "You keep TUFStellar benefits until {{date}}.",
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
