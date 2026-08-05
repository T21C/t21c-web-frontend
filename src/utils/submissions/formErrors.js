// tuf-search: #formErrors #submissions
/**
 * Shared FormError → client Error mapping for /v2/form/* responses.
 *
 * Server shape: `{ error: string, details?: object, field?: string }`.
 * `details` is structured metadata (ids, fields), not display text — never
 * prefer it over `error` / `Error.message` when building toast copy.
 */

export function asErrorMessage(value, fallback = null) {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && typeof value.message === 'string' && value.message) {
    return value.message;
  }
  return fallback;
}

/**
 * Display message for a thrown submission error (from {@link throwFromError}
 * or a plain Error). Prefers `message`; only uses `details` when it is a string
 * or has a string `.message`.
 */
export function getSubmissionErrorMessage(err, fallback = 'Unknown error occurred') {
  return (
    asErrorMessage(err?.message, null) ||
    asErrorMessage(typeof err?.details === 'string' ? err.details : null, null) ||
    asErrorMessage(err?.details, null) ||
    fallback
  );
}

export function throwFromError(err, fallbackMessage) {
  const data = err?.response?.data;
  const fallback = fallbackMessage || 'Request failed';
  const message =
    asErrorMessage(data?.error, null) ||
    asErrorMessage(err?.message, null) ||
    fallback;
  const e = new Error(message);
  e.status = err?.response?.status ?? null;
  e.details = data?.details ?? null;
  e.field = data?.field ?? null;
  throw e;
}
