import toast from 'react-hot-toast';

const TOAST_MIN_MS = 3500;
const TOAST_MAX_MS = 14000;
const TOAST_BASE_MS = 4000;
/** Extra ms per character beyond the baseline readable length. */
const TOAST_MS_PER_CHAR = 45;
const TOAST_READABLE_BASE_CHARS = 40;

/**
 * Toast duration scaled so longer messages stay visible long enough to read.
 * @param {string} message
 * @returns {number}
 */
export function toastDurationForMessage(message) {
  const len = String(message ?? '').trim().length;
  const extra = Math.max(0, len - TOAST_READABLE_BASE_CHARS) * TOAST_MS_PER_CHAR;
  return Math.min(TOAST_MAX_MS, Math.max(TOAST_MIN_MS, TOAST_BASE_MS + extra));
}

/**
 * @param {string} message
 */
export function toastError(message) {
  const text = String(message ?? '').trim();
  if (!text) return;
  toast.error(text, { duration: toastDurationForMessage(text) });
}

/**
 * @param {string} message
 */
export function toastSuccess(message) {
  const text = String(message ?? '').trim();
  if (!text) return;
  toast.success(text, { duration: toastDurationForMessage(text) });
}
