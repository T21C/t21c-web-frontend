// tuf-search: #waitForJobCompletion #jobs
import api from '@/utils/api';

/**
 * Poll GET /v2/jobs/:jobId until the job reaches a terminal phase (completed | failed).
 *
 * @param {string} jobId
 * @param {{ signal?: AbortSignal, pollMs?: number, timeoutMs?: number }} [opts]
 * @returns {Promise<Record<string, unknown>>} final job document from GET /v2/jobs/:jobId
 */
export async function waitForJobCompletion(jobId, opts = {}) {
  const { signal, pollMs = 800, timeoutMs = 45 * 60 * 1000 } = opts;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new DOMException('aborted', 'AbortError');
    }
    const { data } = await api.get(`/v2/jobs/${encodeURIComponent(jobId)}`, { signal });
    const phase = data?.phase;
    if (phase === 'failed') {
      const err = new Error(typeof data?.error === 'string' ? data.error : 'Processing failed');
      err.job = data;
      throw err;
    }
    if (phase === 'completed') {
      return data;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error('Processing timed out');
}
