// tuf-search: #BillingPage #billingUtils

/**
 * Catalog term lengths only (order matches server `TUF_STELLAR_ALLOWED_MONTHS`).
 * Display amounts come from GET /v3/billing/me `pricingDisplay`; USD fallback below matches
 * server `tufStellarDisplayPriceMatrix.ts` when the API field is absent.
 */
export const TUF_STELLAR_TERM_OPTIONS = [
  { months: 1 },
  { months: 2 },
  { months: 3 },
  { months: 6 },
  { months: 9 },
  { months: 12 },
];

/** Major-unit USD amounts keyed like `pricingDisplay.amountsByMonths` (client-only fallback). */
export const TUF_STELLAR_DISPLAY_USD_FALLBACK_AMOUNTS = {
  "1": 3,
  "2": 6,
  "3": 8,
  "6": 16,
  "9": 24,
  "12": 30,
};

/** ISO 4217 codes with checkout pricing — keep in sync with server `tufStellarDisplayPriceMatrix.ts`. */
export const TUF_STELLAR_CHECKOUT_CURRENCIES = [
  "USD",
  "SGD",
  "KRW",
  "JPY",
  "EUR",
  "CNY",
  "BRL",
  "PLN",
  "MYR",
  "GBP",
  "CAD",
  "AUD",
  "THB",
  "PHP",
  "TWD",
  "IDR",
  "HKD",
  "VND",
];

/** Major units per term by currency — keep in sync with server `tufStellarDisplayPriceMatrix.ts`. */
export const TUF_STELLAR_DISPLAY_AMOUNTS_BY_CURRENCY = {
  USD: { "1": 3, "2": 6, "3": 8, "6": 16, "9": 24, "12": 30 },
  SGD: { "1": 4, "2": 8, "3": 11, "6": 22, "9": 33, "12": 40 },
  KRW: { "1": 4500, "2": 9000, "3": 12000, "6": 24000, "9": 36000, "12": 45000 },
  JPY: { "1": 450, "2": 900, "3": 1200, "6": 2400, "9": 3600, "12": 4500 },
  EUR: { "1": 2.8, "2": 5.5, "3": 7.5, "6": 15, "9": 22, "12": 28 },
  CNY: { "1": 20, "2": 40, "3": 54, "6": 108, "9": 162, "12": 200 },
  BRL: { "1": 15, "2": 30, "3": 40, "6": 80, "9": 120, "12": 150 },
  PLN: { "1": 11, "2": 22, "3": 30, "6": 60, "9": 90, "12": 110 },
  MYR: { "1": 12, "2": 24, "3": 32, "6": 64, "9": 96, "12": 120 },
  GBP: { "1": 2.5, "2": 5, "3": 6.5, "6": 13, "9": 19, "12": 24 },
  CAD: { "1": 4, "2": 8, "3": 11, "6": 22, "9": 33, "12": 40 },
  AUD: { "1": 4, "2": 8, "3": 11, "6": 22, "9": 33, "12": 40 },
  THB: { "1": 100, "2": 200, "3": 270, "6": 540, "9": 810, "12": 1000 },
  PHP: { "1": 180, "2": 360, "3": 480, "6": 960, "9": 1440, "12": 1800 },
  TWD: { "1": 95, "2": 190, "3": 255, "6": 510, "9": 765, "12": 950 },
  IDR: { "1": 52000, "2": 104000, "3": 140000, "6": 280000, "9": 420000, "12": 520000 },
  HKD: { "1": 24, "2": 48, "3": 64, "6": 128, "9": 192, "12": 240 },
  VND: { "1": 79000, "2": 158000, "3": 210000, "6": 420000, "9": 630000, "12": 790000 },
};

/** @param {string} code ISO 4217 or `auto` resolved upstream */
export function getCheckoutAmountsForCurrency(code) {
  const u = String(code ?? "")
    .trim()
    .toUpperCase();
  return TUF_STELLAR_DISPLAY_AMOUNTS_BY_CURRENCY[u] ?? TUF_STELLAR_DISPLAY_USD_FALLBACK_AMOUNTS;
}

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
