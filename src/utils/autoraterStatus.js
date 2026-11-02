const pending = new Map();

export function validateAutoraterStatus(data, levelId) {
  if (data?.level_id !== levelId
    || !['current', 'outdated', 'unverified', 'missing'].includes(data.status)
    || data.outdated !== (data.status === 'current' ? false : data.status === 'outdated' ? true : null)
    || !['complete', 'partial', 'stale', 'unavailable'].includes(data.warnings_status)
    || !Array.isArray(data.warnings)
    || !data.warnings.every(item => typeof item?.code === 'string' && typeof item.label === 'string'
      && typeof item.detail === 'string')
    || (data.warnings_status === 'unavailable' ? data.warning_count !== null
      : data.warning_count !== data.warnings.length)) {
    throw new Error('Invalid AutoRater status');
  }
  return data;
}

export function fetchAutoraterStatus(origin, levelId, rating) {
  const url = new URL(`/embed/tuf/${levelId}/status`, origin);
  if (rating) url.searchParams.set('rating', rating);
  const key = url.href;
  // Share in-flight work (including React StrictMode), but recheck on each opening.
  if (!pending.has(key)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const request = fetch(key, { signal: controller.signal, credentials: 'omit', cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('AutoRater status unavailable');
        return response.json();
      })
      .then(data => validateAutoraterStatus(data, levelId))
      .finally(() => {
        clearTimeout(timeout);
        pending.delete(key);
      });
    pending.set(key, request);
  }
  return pending.get(key);
}
