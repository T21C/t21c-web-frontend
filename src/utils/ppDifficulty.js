/**
 * Highest non-legacy difficulty whose default baseScore the PP score has reached.
 * Ties go to the higher sortOrder.
 * @param {number | null | undefined} ppBaseScore
 * @param {Array<{ id: number, baseScore: number, sortOrder: number, type?: string }>} difficulties
 * @returns {number | null}
 */
export function derivePpDiffId(ppBaseScore, difficulties) {
  const score = Number(ppBaseScore);
  if (!Number.isFinite(score) || score <= 0 || !Array.isArray(difficulties) || difficulties.length === 0) {
    return null;
  }

  let best = null;
  for (const diff of difficulties) {
    if (!diff || diff.type === 'LEGACY') continue;
    const base = Number(diff.baseScore);
    if (!Number.isFinite(base) || score < base) continue;
    if (
      !best ||
      base > Number(best.baseScore) ||
      (base === Number(best.baseScore) && diff.sortOrder > best.sortOrder)
    ) {
      best = diff;
    }
  }
  return best?.id ?? null;
}

/**
 * Stored ppDiffId when present in the dict; otherwise derived from ppBaseScore.
 * Hidden when there is no PP score.
 * @param {{ ppBaseScore?: number | null, ppDiffId?: number | null } | null | undefined} level
 * @param {Record<string, { id?: number, icon?: string, name?: string, baseScore?: number, sortOrder?: number, type?: string }>} difficultyDict
 */
export function resolvePpDifficulty(level, difficultyDict) {
  const score = Number(level?.ppBaseScore);
  if (!Number.isFinite(score) || score <= 0) return null;
  const dict = difficultyDict && typeof difficultyDict === 'object' ? difficultyDict : {};
  const stored = dict[level.ppDiffId] ?? dict[String(level.ppDiffId)];
  if (stored?.icon) return stored;
  const derivedId = derivePpDiffId(score, Object.values(dict));
  if (derivedId == null) return null;
  return dict[derivedId] ?? dict[String(derivedId)] ?? null;
}
