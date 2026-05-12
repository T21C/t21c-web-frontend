// tuf-search: #BillingPage #billingUtils

/** Must match server `tufStellarProductCatalog.ts` order and pricing display. First entry `priceUsd` is the list rate per month for refunds. */
export const TUF_STELLAR_TERM_OPTIONS = [
  { months: 1, priceUsd: 3 },
  { months: 2, priceUsd: 6 },
  { months: 3, priceUsd: 8 },
  { months: 6, priceUsd: 16 },
  { months: 9, priceUsd: 24 },
  { months: 12, priceUsd: 30 },
];

/** Keep in sync with server `misc/utils/time/addCalendarMonthsUtc.ts`. */
export function addCalendarMonthsUtc(from, months) {
  const d = from instanceof Date ? from : new Date(from);
  if (!Number.isFinite(months) || months <= 0) return new Date(d);
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const day = d.getUTCDate();
  const h = d.getUTCHours();
  const min = d.getUTCMinutes();
  const s = d.getUTCSeconds();
  const ms = d.getUTCMilliseconds();

  const targetMonthIndex = mo + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  const lastDayOfTarget = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTarget);

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay, h, min, s, ms));
}

/** Matches server `computePurchasePreviewProjectedExpiry` in billing routes (stack tail + calendar months). */
export function computePurchasePreviewProjectedExpiresIso(accessExpiresAt, months) {
  if (!Number.isFinite(months) || months <= 0) return null;
  const nowMs = Date.now();
  let expMs = NaN;
  if (accessExpiresAt != null && accessExpiresAt !== "") {
    expMs = new Date(accessExpiresAt).getTime();
  }
  const tailMs = Number.isFinite(expMs) && expMs > nowMs ? expMs : nowMs;
  return addCalendarMonthsUtc(new Date(tailMs), months).toISOString();
}

export function formatDate(value, locale) {
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

/** Date only, compact — no time (e.g. access expiry, purchase preview). */
export function formatDateDayOnly(value, locale) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(locale || undefined, {
      dateStyle: "medium",
    });
  } catch {
    try {
      return new Date(value).toISOString().slice(0, 10);
    } catch {
      return null;
    }
  }
}

export function formatAmount(amount, currency, locale) {
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

/** Stripe uses dotted event names; i18n keys use underscores to avoid nested-key collisions. */
export function billingEventTypeTranslationKey(eventType) {
  if (eventType == null || eventType === "") return "";
  return String(eventType).replace(/\./g, "_");
}

export function eventTypeLabel(eventType, t) {
  const key = billingEventTypeTranslationKey(eventType);
  return t(`billing.history.events.${key}`, { defaultValue: eventType });
}

export function referenceKindLabel(kind, t) {
  return t(`billing.history.refLabels.${kind}`, { defaultValue: kind });
}

export function billingHistoryProductDetail(product, t) {
  if (!product || typeof product !== "object") return "";
  const { kind, months, sku, itemId } = product;
  const parts = [];

  if (months != null && Number.isFinite(Number(months))) {
    const c = Number(months);
    if (kind === "purchase") {
      parts.push(t("billing.history.product.purchaseMonths", { count: c }));
    } else {
      parts.push(t("billing.history.product.termMonths", { count: c }));
    }
  }

  if (!parts.length) {
    if (sku) parts.push(t("billing.history.product.sku", { sku }));
    else if (itemId) {
      const id = String(itemId);
      if (id.startsWith("price_")) {
        parts.push(t("billing.history.product.stripePriceId", { priceId: id }));
      } else {
        parts.push(t("billing.history.product.itemId", { itemId: id }));
      }
    }
    return parts.join(" · ");
  }

  return parts.join(" · ");
}

export function historyEventLabel(ev, t) {
  const kind = ev.activityKind ?? "default";
  if (kind === "gift_received") {
    const u = ev.counterpartyUsername || t("billing.history.unknownUser");
    const nick =
      ev.counterpartyNickname && ev.counterpartyNickname !== ev.counterpartyUsername
        ? ` (${ev.counterpartyNickname})`
        : "";
    return t("billing.history.activity.giftReceived", { name: `${u}${nick}` });
  }
  if (kind === "gift_sent") {
    const u = ev.counterpartyUsername || t("billing.history.unknownUser");
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

export function buildSupportCopyPayload(ev, t) {
  const lines = [
    `billing_event_id: ${ev.id}`,
    `provider: ${ev.provider}`,
    `event_type: ${ev.eventType}`,
    `status: ${ev.status}`,
    `created_at: ${ev.createdAt}`,
    `processed_at: ${ev.processedAt ?? ""}`,
  ];
  const p = ev.product;
  if (p && typeof p === "object") {
    if (p.kind) lines.push(`product_kind: ${p.kind}`);
    if (p.months != null) lines.push(`product_months: ${p.months}`);
    if (p.sku) lines.push(`product_sku: ${p.sku}`);
    if (p.itemId) lines.push(`stripe_price_id: ${p.itemId}`);
  }
  if (ev.amount != null && Number.isFinite(Number(ev.amount))) {
    lines.push(`amount: ${ev.amount}${ev.currency ? ` ${ev.currency}` : ""}`);
  }
  const refs = Array.isArray(ev.references) ? ev.references : [];
  for (const ref of refs) {
    lines.push(`${referenceKindLabel(ref.kind, t)}: ${ref.value}`);
  }
  return lines.join("\n");
}

export function approxDaysRemainingLabel(ms, t) {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  if (ms < 86_400_000) return t("billing.access.remainingLessThanOneDay");
  const days = Math.ceil(ms / 86_400_000);
  return t("billing.access.remainingApproxDays", { count: days });
}

export function processingStatusLabel(status, t) {
  return t(`billing.history.processingStatus.${status}`, { defaultValue: status });
}

export function formatMinorCurrency(cents, currency, locale) {
  if (cents == null || !Number.isFinite(Number(cents))) return null;
  return formatAmount(Number(cents) / 100, currency, locale);
}

/** Heuristic only — server validates on preview and refund. */
export function isStripeRefundCandidate(ev) {
  return (
    ev?.provider === "stripe" &&
    ev?.eventType === "checkout.session.completed" &&
    ev?.status === "processed" &&
    ev?.activityKind === "one_time_self"
  );
}

export function billingRefundPreviewReasonMessage(reasonCode, t) {
  if (!reasonCode || reasonCode === "ELIGIBLE") return "";
  const msg = t(`billing.history.refundReason.${reasonCode}`, { defaultValue: "" });
  return msg || "";
}

export function billingRefundPostErrorToast(code, t) {
  if (!code) return null;
  const key = `billing.history.refundErrors.${code}`;
  const translated = t(key);
  return translated !== key ? translated : null;
}
