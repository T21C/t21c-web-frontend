// tuf-search: #BillingPage #useBillingData
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/utils/api";
import { isTufStellarEnabledForUser } from "@/utils/tufStellarFeature";
import { computePurchasePreviewProjectedExpiresIso, TUF_STELLAR_TERM_OPTIONS } from "./billingUtils";

/** @param {{ loadEvents?: boolean, enableTermPreview?: boolean }} options */
export function useBillingData(options = {}) {
  const { loadEvents = false, enableTermPreview = false } = options;
  const { t } = useTranslation(["pages", "common"]);
  const { fetchUser, user } = useAuth();

  const [billingState, setBillingState] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [checkoutTermIndex, setCheckoutTermIndex] = useState(2);
  const [purchaseAsGift, setPurchaseAsGift] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState(null);

  const fetchAll = useCallback(async (opts = {}) => {
    const forceRefresh = Boolean(opts.forceRefresh);
    const cacheBust = { _t: Date.now() };
    const meParams = forceRefresh ? { ...cacheBust, refresh: 1 } : cacheBust;
    const eventsParams = forceRefresh ? { limit: 20, ...cacheBust, refresh: 1 } : { limit: 20, ...cacheBust };

    if (!isTufStellarEnabledForUser(user)) {
      setLoading(false);
      setErrorState(false);
      setBillingState(null);
      setEvents([]);
      return;
    }

    setLoading(true);
    setErrorState(false);
    try {
      const requests = [api.get("/v3/billing/me", { params: meParams })];
      if (loadEvents) {
        requests.push(api.get("/v3/billing/me/events", { params: eventsParams }));
      }
      const results = await Promise.all(requests);
      const stateRes = results[0];
      setBillingState(stateRes.data || null);
      if (loadEvents && results[1]) {
        const eventsRes = results[1];
        setEvents(Array.isArray(eventsRes.data?.events) ? eventsRes.data.events : []);
      } else if (!loadEvents) {
        setEvents([]);
      }
      if (forceRefresh) {
        try {
          await fetchUser(true, { silent: true });
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.error("Billing fetch failed:", e);
      setErrorState(true);
      setBillingState(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [loadEvents, user, fetchUser]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!purchaseAsGift) {
      setGiftRecipient(null);
    }
  }, [purchaseAsGift]);

  const accessSegments = useMemo(() => {
    const raw = billingState?.accessSegments;
    return Array.isArray(raw) ? raw : [];
  }, [billingState]);

  const accessActive = Boolean(billingState?.access?.active ?? billingState?.active);
  const accessExpiresAt = billingState?.access?.expiresAt ?? billingState?.expiresAt ?? null;

  const purchaseFundedRemainingMsRaw = billingState?.access?.purchaseFundedRemainingMs;
  const purchaseFundedRemainingMs =
    purchaseFundedRemainingMsRaw != null && Number.isFinite(Number(purchaseFundedRemainingMsRaw))
      ? Number(purchaseFundedRemainingMsRaw)
      : 0;

  const accessPillKey = accessActive ? "active" : "inactive";

  const canPurchaseOneTime = Boolean(billingState?.allowedActions?.purchaseOneTime);

  const billingToastForCode = useCallback(
    (code, fallbackMsg) => {
      if (code === "INVALID_CHECKOUT_TERM") return t("billing.toasts.checkoutInvalidTerm");
      if (code === "GIFT_RECIPIENT_NOT_FOUND") return t("billing.toasts.giftRecipientNotFound");
      if (code === "GIFT_RECIPIENT_BLOCKED") return t("billing.toasts.giftRecipientBlocked");
      if (code === "GIFT_EMAIL_REQUIRED") return t("billing.toasts.giftEmailRequired");
      if (code === "INVALID_RECIPIENT_ID") return t("billing.toasts.invalidRecipientId");
      if (code === "BILLING_ACCOUNT_BLOCKED") return t("billing.toasts.billingAccountBlocked");
      if (code === "INVALID_SEARCH_QUERY") return t("billing.toasts.searchQueryInvalid");
      if (code === "MISCONFIGURED") return t("billing.toasts.checkoutError");
      if (code === "STRIPE_ERROR") return t("billing.toasts.checkoutError");
      if (code === "REFUND_GIFT_NOT_ALLOWED") return t("billing.history.refundErrors.REFUND_GIFT_NOT_ALLOWED");
      if (code === "REFUND_TOO_OLD") return t("billing.history.refundErrors.REFUND_TOO_OLD");
      if (code === "REFUND_ALREADY_REFUNDED") return t("billing.history.refundErrors.REFUND_ALREADY_REFUNDED");
      if (code === "REFUND_ZERO_AMOUNT") return t("billing.history.refundErrors.REFUND_ZERO_AMOUNT");
      if (code === "REFUND_NOT_ELIGIBLE") return t("billing.history.refundErrors.REFUND_NOT_ELIGIBLE");
      return fallbackMsg;
    },
    [t],
  );

  const selectedCheckoutTerm = TUF_STELLAR_TERM_OPTIONS[checkoutTermIndex] ?? TUF_STELLAR_TERM_OPTIONS[0];

  /** Instant preview — same calendar logic as GET /v3/billing/me?previewMonths (see billingUtils). */
  const termAccessPreview = useMemo(() => {
    if (!enableTermPreview || purchaseAsGift || !billingState || !canPurchaseOneTime) return null;
    const months = selectedCheckoutTerm?.months;
    if (!months) return null;
    const projectedExpiresAt = computePurchasePreviewProjectedExpiresIso(accessExpiresAt, months);
    if (!projectedExpiresAt) return null;
    return { months, projectedExpiresAt };
  }, [
    enableTermPreview,
    purchaseAsGift,
    billingState,
    canPurchaseOneTime,
    selectedCheckoutTerm?.months,
    accessExpiresAt,
  ]);

  const termSliderFillPct = useMemo(() => {
    const maxIdx = TUF_STELLAR_TERM_OPTIONS.length - 1;
    if (maxIdx <= 0) return 100;
    return (checkoutTermIndex / maxIdx) * 100;
  }, [checkoutTermIndex]);

  const checkoutTermPreview = useMemo(() => {
    const term = selectedCheckoutTerm;
    const baseline = TUF_STELLAR_TERM_OPTIONS[0];
    const baselinePerMonth = baseline.priceUsd / baseline.months;
    const listUsd = term.months * baselinePerMonth;
    const rawSave = listUsd > term.priceUsd ? Math.round((1 - term.priceUsd / listUsd) * 100) : 0;
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

  const canOpenCheckout = canPurchaseOneTime && (!purchaseAsGift || Boolean(giftRecipient?.userId));

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
    if (!isTufStellarEnabledForUser(user)) {
      toast.error(t("billing.toasts.checkoutError"));
      return;
    }
    if (purchaseAsGift && !giftRecipient?.userId) {
      toast.error(t("billing.toasts.recipientRequired"));
      return;
    }
    const term = TUF_STELLAR_TERM_OPTIONS[checkoutTermIndex] ?? TUF_STELLAR_TERM_OPTIONS[0];

    setSubscribing(true);
    const toastId = toast.loading(t("billing.toasts.startingCheckout"));
    try {
      const payload = { months: term.months };
      if (purchaseAsGift && giftRecipient?.userId) payload.recipientUserId = giftRecipient.userId;
      const { data } = await api.post("/v3/billing/stripe/checkout", payload);
      const url = data?.url;
      if (!url) throw new Error("Missing checkout url");
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success(t("billing.toasts.checkoutOpened"), { id: toastId });
    } catch (e) {
      const code = e?.response?.data?.error?.code;
      const msg = billingToastForCode(code, e?.response?.data?.error?.message || t("billing.toasts.checkoutError"));
      toast.error(msg, { id: toastId });
    } finally {
      setSubscribing(false);
    }
  }, [subscribing, user, purchaseAsGift, giftRecipient, checkoutTermIndex, t, billingToastForCode]);

  const showIdleNote = billingState && !canPurchaseOneTime;

  return {
    billingState,
    events,
    loading,
    errorState,
    fetchAll,
    subscribing,
    checkoutTermIndex,
    setCheckoutTermIndex,
    purchaseAsGift,
    setPurchaseAsGift,
    giftRecipient,
    accessActive,
    accessExpiresAt,
    purchaseFundedRemainingMs,
    accessSegments,
    termAccessPreview,
    accessPillKey,
    canPurchaseOneTime,
    canOpenCheckout,
    showIdleNote,
    billingToastForCode,
    selectedCheckoutTerm,
    termSliderFillPct,
    checkoutTermPreview,
    handleRecipientProfileChange,
    clearRecipient,
    handleCheckout,
  };
}
