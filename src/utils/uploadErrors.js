/**
 * Builds a user-visible message from CDN / API error payloads.
 * Prefers `details.errors` (Shape A), then legacy flat `errors`, then `error`.
 */
export function getCdnErrorMessage(error, defaultMessage) {
  const data = error?.response?.data;
  const detailErrors = data?.details?.errors;
  if (Array.isArray(detailErrors) && detailErrors.length > 0) {
    return detailErrors.join('; ');
  }
  const flatErrors = data?.errors;
  if (Array.isArray(flatErrors) && flatErrors.length > 0) {
    return flatErrors.join('; ');
  }
  if (typeof data?.error === 'string' && data.error.length > 0) {
    return data.error;
  }
  return error?.message || defaultMessage;
}
