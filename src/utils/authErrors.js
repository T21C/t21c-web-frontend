/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isUnauthorizedError(err) {
  return Boolean(err && typeof err === 'object' && err.response?.status === 401);
}

/**
 * Normalize axios (or similar) auth errors into a consistent shape for login / OAuth UI.
 * @param {unknown} err
 * @param {{ generic?: string, network?: string }} [labels]
 * @returns {{ message: string, retryAfter: number | null, requireCaptcha: boolean }}
 */
export function parseAuthError(err, labels = {}) {
  const generic = labels.generic || 'Authentication failed';
  const network = labels.network || 'No response from server';

  let message = generic;
  let retryAfter = null;
  let requireCaptcha = false;

  if (!err || typeof err !== 'object') {
    return { message: String(err || generic), retryAfter, requireCaptcha };
  }

  const error = /** @type {{ response?: any, request?: unknown, message?: string }} */ (err);

  if (error.response) {
    const data = error.response.data || {};
    const status = error.response.status;
    const headers = error.response.headers || {};

    if (data.retryAfter != null && Number.isFinite(Number(data.retryAfter))) {
      retryAfter = Number(data.retryAfter);
      message = data.message || generic;
    } else if (headers['x-retry-after-ms'] != null && Number.isFinite(Number(headers['x-retry-after-ms']))) {
      retryAfter = Number(headers['x-retry-after-ms']);
      message = data.message || generic;
    } else if (headers['retry-after'] != null && Number.isFinite(Number(headers['retry-after']))) {
      retryAfter = Number(headers['retry-after']) * 1000;
      message = data.message || generic;
    } else if (data.requireCaptcha) {
      requireCaptcha = true;
      message = data.message || data.error || generic;
    } else if (typeof data.message === 'string' && data.message) {
      message = data.message;
      requireCaptcha = Boolean(data.requireCaptcha);
    } else if (typeof data.error === 'string' && data.error) {
      message = data.error;
    } else if (data.data && typeof data.data.error === 'string') {
      message = data.data.error;
    } else if (status === 401) {
      message = data.message || generic;
      requireCaptcha = Boolean(data.requireCaptcha);
    } else if (status === 429) {
      message = data.message || generic;
      if (data.retryAfter != null && Number.isFinite(Number(data.retryAfter))) {
        retryAfter = Number(data.retryAfter);
      }
    }
  } else if (error.request) {
    message = network;
  } else if (typeof error.message === 'string' && error.message) {
    message = error.message;
  }

  return { message, retryAfter, requireCaptcha };
}
