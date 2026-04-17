import api from '@/utils/api';

/**
 * Pass submission client. The pass branch is pure JSON — no files, no
 * multipart, no upload orchestration. The one-shot endpoint at
 * `/v2/form/pass/submit` handles everything server-side.
 */

const FORM_BASE = '/v2/form/pass';

function throwFromError(err, fallbackMessage) {
  const data = err?.response?.data;
  const message = data?.error || err?.message || fallbackMessage || 'Request failed';
  const e = new Error(message);
  e.status = err?.response?.status ?? null;
  e.details = data?.details ?? null;
  e.field = data?.field ?? null;
  throw e;
}

export async function submitPass(payload, { signal } = {}) {
  try {
    const res = await api.post(`${FORM_BASE}/submit`, payload, { signal });
    return res.data;
  } catch (err) {
    throwFromError(err, 'Pass submission failed');
  }
}
