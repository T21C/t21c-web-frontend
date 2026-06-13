/**
 * User-visible text from a failed job document or an error thrown by {@link waitForJobCompletion}.
 * Prefers the pipeline `message` (e.g. zip-slip / zip-bomb detail) over generic `error` labels.
 *
 * @param {unknown} err
 * @param {string} [fallback]
 * @returns {string}
 */
export function formatJobFailureMessage(err, fallback = 'Something went wrong') {
  const job = err && typeof err === 'object' ? err.job : null;
  if (job && typeof job === 'object') {
    const message = typeof job.message === 'string' ? job.message.trim() : '';
    const error = typeof job.error === 'string' ? job.error.trim() : '';
    if (message) return message;
    if (error) return error;
  }

  if (err instanceof Error) {
    const msg = err.message?.trim();
    if (msg && msg !== 'Processing failed') {
      return msg;
    }
  }

  return fallback;
}
