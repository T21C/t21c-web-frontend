// tuf-search: #levelSubmission #submissions
import api from '@/utils/api';
import ChunkedUploadClient from '@/utils/upload/ChunkedUploadClient';

/**
 * Level submission client: orchestrates the three-step flow introduced by the
 * form monolith split:
 *
 *   1. POST /v2/form/level/validate — pure validation, zero side effects.
 *   2. If a zip was attached, run the chunked upload against /v2/upload with
 *      kind `level-zip` and meta `{ forSubmission: true }`.
 *   3. POST /v2/form/level/submit — multipart: { meta: JSON, evidence[]: File }.
 *
 * Each step is its own method so callers can render per-step UI (validation
 * errors, upload progress, final submit spinner) without caring about the
 * orchestration.
 */

const FORM_BASE = '/v2/form/level';

function throwFromError(err, fallbackMessage) {
  const data = err?.response?.data;
  const message = data?.error || err?.message || fallbackMessage || 'Request failed';
  const e = new Error(message);
  e.status = err?.response?.status ?? null;
  e.details = data?.details ?? null;
  e.field = data?.field ?? null;
  throw e;
}

/**
 * @param {object} payload normalised form fields (see LevelSubmissionPage)
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ ok: true, sanitized: object, evidence: object, upload: { kind: string } }>}
 */
export async function validateLevel(payload, { signal } = {}) {
  try {
    const res = await api.post(`${FORM_BASE}/validate`, payload, { signal });
    return res.data;
  } catch (err) {
    throwFromError(err, 'Validation failed');
  }
}

/**
 * Upload a level-zip file via the chunked upload system. Returns the final
 * assembled server-side session (including `id`) so the caller can pass it to
 * `submitLevel` as `uploadSessionId`.
 *
 * @param {File} file
 * @param {object} [opts]
 * @param {(p: { phase: string, percent: number }) => void} [opts.onProgress]
 * @param {AbortSignal} [opts.signal]
 */
export async function uploadLevelZip(file, { onProgress, signal } = {}) {
  const client = new ChunkedUploadClient({ kind: 'level-zip' });
  const { session } = await client.upload(file, {
    meta: { forSubmission: true },
    onProgress,
    signal,
  });
  return session;
}

/**
 * Finalise the submission. `payload` is the sanitised form; `uploadSessionId`
 * is the id of the assembled upload session (or null for a directDL-only
 * submission). `evidenceFiles` is an array of up to 10 File objects.
 */
export async function submitLevel({
  payload,
  uploadSessionId = null,
  uploadJobId = null,
  evidenceFiles = [],
  signal,
  onUploadProgress,
} = {}) {
  const formData = new FormData();
  formData.append(
    'meta',
    JSON.stringify({
      ...payload,
      uploadSessionId,
      uploadJobId,
    }),
  );
  for (const file of evidenceFiles) {
    formData.append('evidence', file);
  }

  try {
    const res = await api.post(`${FORM_BASE}/submit`, formData, {
      signal,
      onUploadProgress:
        typeof onUploadProgress === 'function'
          ? (evt) => {
              const { loaded, total } = evt;
              const percent = total ? Math.round((loaded / total) * 100) : 0;
              onUploadProgress(percent);
            }
          : undefined,
    });
    return res.data;
  } catch (err) {
    throwFromError(err, 'Submission failed');
  }
}

export async function selectLevelChart({ submissionId, selectedLevel, signal } = {}) {
  try {
    const res = await api.post(
      `${FORM_BASE}/select-level`,
      { submissionId, selectedLevel },
      { signal },
    );
    return res.data;
  } catch (err) {
    throwFromError(err, 'Level selection failed');
  }
}
