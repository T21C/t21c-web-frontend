import { listVisiblePlacements } from "@/utils/tournamentPlacements";
import { canvasHasBlocks, getDisplayBioText } from "@/utils/bioCanvas";

export function isBioModuleEmpty(profile, { canvasEntitled = true } = {}) {
  if (canvasEntitled && canvasHasBlocks(profile?.bioCanvas)) return false;
  if (canvasEntitled) {
    const hasText = typeof profile?.bio === "string" && profile.bio.trim().length > 0;
    return !hasText;
  }
  const text = getDisplayBioText(profile);
  return !(typeof text === "string" && text.trim().length > 0);
}

export function isTournamentsModuleEmpty(profile) {
  return listVisiblePlacements(profile?.tournamentPlacements).length === 0;
}

export function isDifficultyModuleEmpty(graphData) {
  return !Array.isArray(graphData) || graphData.length === 0;
}

export function isRankHistoryModuleEmpty({ loading, error, series }) {
  if (loading || error) return false;
  return !Array.isArray(series) || series.length === 0;
}

export function isScoresModuleEmpty({ loading, total, displayedCount, funFactTotal }) {
  if (loading) return false;
  return !(
    Number(total) > 0 ||
    Number(displayedCount) > 0 ||
    Number(funFactTotal) > 0
  );
}

export function isChartsModuleEmpty(profile) {
  const total =
    profile?.chartsTotal ??
    profile?.funFacts?.counts?.chartsTotal ??
    profile?.creator?.chartsTotal;
  return !(Number(total) > 0);
}

export function isFavoriteModuleEmpty(resolvedItems) {
  return !Array.isArray(resolvedItems) || resolvedItems.length === 0;
}

export function profileModuleIsEmpty(type, ctx) {
  if (type === "scoreBreakdown") return false;
  if (type === "bio") {
    return isBioModuleEmpty(ctx.profile, { canvasEntitled: ctx.bioCanvasEntitled !== false });
  }
  if (type === "tournaments") return isTournamentsModuleEmpty(ctx.profile);
  if (type === "difficulty") return isDifficultyModuleEmpty(ctx.difficultyGraphData);
  if (type === "rankHistory") return isRankHistoryModuleEmpty(ctx.rankHistory);
  if (type === "scores") return isScoresModuleEmpty(ctx.scores);
  if (type === "charts") return isChartsModuleEmpty(ctx.profile);
  if (type === "favorite") return isFavoriteModuleEmpty(ctx.favoriteItems);
  return false;
}
