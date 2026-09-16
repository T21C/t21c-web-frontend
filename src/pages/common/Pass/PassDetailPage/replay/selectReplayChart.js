// tuf-search: #replayChartSelection #gameplayHash
function safePath(path) {
  const normalized = path.replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || normalized.includes(':') || normalized.split('/').includes('..')) throw new Error('chart_not_found');
  return normalized;
}

export async function selectReplayChart(zip, preferredPath) {
  const safePreferredPath = safePath(preferredPath);
  const preferred = zip.file(safePreferredPath);
  if (preferred && (!preferred.unsafeOriginalName || preferred.unsafeOriginalName === safePreferredPath)) {
    return { path: safePreferredPath, chart: preferred };
  }

  const candidates = await Promise.all(Object.values(zip.files)
    .filter(entry => !entry.dir && entry.name.toLowerCase().endsWith('.adofai'))
    .map(async entry => ({ entry, path: safePath(entry.name), bytes: await entry.async('arraybuffer') })));
  candidates.sort((left, right) => right.bytes.byteLength - left.bytes.byteLength || left.path.localeCompare(right.path));
  const selected = candidates.find(({ entry, path }) => !entry.unsafeOriginalName || entry.unsafeOriginalName === path);
  if (!selected) throw new Error('chart_not_found');
  return { path: selected.path, chart: selected.entry };
}
