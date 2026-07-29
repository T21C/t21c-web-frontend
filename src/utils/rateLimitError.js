// tuf-search: #rateLimit #toast #429
import { toast } from 'react-hot-toast';
import { parseAuthError } from '@/utils/authErrors';

/**
 * Read retry-after from JSON body or response headers (HEAD omits bodies).
 * @param {unknown} error
 * @returns {number | null} milliseconds
 */
export function getRetryAfterMs(error) {
  if (!error || typeof error !== 'object') return null;
  const response = /** @type {{ response?: { data?: any, headers?: Record<string, string> } }} */ (error)
    .response;
  if (!response) return null;

  const data = response.data || {};
  if (data.retryAfter != null && Number.isFinite(Number(data.retryAfter))) {
    return Number(data.retryAfter);
  }

  const headers = response.headers || {};
  const headerMs = headers['x-retry-after-ms'];
  if (headerMs != null && Number.isFinite(Number(headerMs))) {
    return Number(headerMs);
  }

  const headerSec = headers['retry-after'];
  if (headerSec != null && Number.isFinite(Number(headerSec))) {
    return Number(headerSec) * 1000;
  }

  return null;
}

/**
 * @param {number} ms
 * @returns {string} M:SS
 */
export function formatRetryAfter(ms) {
  const totalSeconds = Math.max(0, Math.ceil(Number(ms) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Toast a 429 rate-limit error. Returns true when handled.
 * @param {unknown} error
 * @param {string} [fallbackMessage]
 * @returns {boolean}
 */
export function toastIfRateLimited(
  error,
  fallbackMessage = 'Too many attempts. Please try again later.',
) {
  const message = getRateLimitMessage(error, fallbackMessage);
  if (!message) return false;
  toast.error(message);
  return true;
}

/**
 * Rate-limit message for toast.promise `error` callbacks, or null if not 429.
 * @param {unknown} error
 * @param {string} [fallbackMessage]
 * @returns {string | null}
 */
export function getRateLimitMessage(
  error,
  fallbackMessage = 'Too many attempts. Please try again later.',
) {
  if (
    !error ||
    typeof error !== 'object' ||
    /** @type {{ response?: { status?: number } }} */ (error).response?.status !== 429
  ) {
    return null;
  }

  const parsed = parseAuthError(error, { generic: fallbackMessage });
  const retryMs = parsed.retryAfter ?? getRetryAfterMs(error);
  let message = parsed.message || fallbackMessage;
  if (retryMs != null && Number.isFinite(retryMs) && retryMs > 0) {
    message = `${message} (${formatRetryAfter(retryMs)})`;
  }
  return message;
}
