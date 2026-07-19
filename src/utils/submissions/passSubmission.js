// tuf-search: #passSubmission #submissions
import api from '@/utils/api';
import { routes } from '@/api/routes';

/**
 * Pass submission client. The pass branch is pure JSON — no files, no
 * multipart, no upload orchestration. The one-shot endpoint at
 * `/v2/form/pass/submit` handles everything server-side.
 */

function asErrorMessage(value, fallback) {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && typeof value.message === 'string' && value.message) {
    return value.message;
  }
  return fallback;
}

function throwFromError(err, fallbackMessage) {
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

export async function submitPass(payload, { signal } = {}) {
  try {
    const res = await api.post(routes.form.pass.submit(), payload, { signal });
    return res.data;
  } catch (err) {
    throwFromError(err, 'Pass submission failed');
  }
}
