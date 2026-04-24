import {
  formatCount,
  formatDurationMs,
  formatFloat,
  formatPercentRatio,
  formatDateIso,
} from "@/utils/statFormatters";

/**
 * @param {object | null | undefined} ff server `funFacts` payload
 * @param {(key: string) => string} t i18n `t` bound to `pages` namespace
 */
export function buildPlayerStatGroups(ff, t) {
  if (!ff || typeof ff !== "object") return [];

  const c = ff.counts || {};
  const j = ff.judgements || {};
  const l = ff.levelsCleared || {};
  const x = ff.extremes || {};
  const a = ff.activity || {};
  const byType = ff.clearsByDifficultyType || {};

  const groups = [
    {
      key: "counts",
      label: t("profile.funFacts.groups.counts"),
      rows: [
        { key: "totalPasses", label: t("profile.funFacts.counts.totalPasses"), value: formatCount(c.totalPasses) },
        {
          key: "uniqueLevelsCleared",
          label: t("profile.funFacts.counts.uniqueLevelsCleared"),
          value: formatCount(c.uniqueLevelsCleared),
        },
        {
          key: "worldsFirstCount",
          label: t("profile.funFacts.counts.worldsFirstCount"),
          value: formatCount(c.worldsFirstCount),
        },
        { key: "clears12K", label: t("profile.funFacts.counts.clears12K"), value: formatCount(c.clears12K) },
        { key: "clears16K", label: t("profile.funFacts.counts.clears16K"), value: formatCount(c.clears16K) },
        {
          key: "clearsNoHoldTap",
          label: t("profile.funFacts.counts.clearsNoHoldTap"),
          value: formatCount(c.clearsNoHoldTap),
        },
        {
          key: "duplicatePasses",
          label: t("profile.funFacts.counts.duplicatePasses"),
          value: formatCount(c.duplicatePasses),
        },
        { key: "hiddenPasses", label: t("profile.funFacts.counts.hiddenPasses"), value: formatCount(c.hiddenPasses) },
      ],
    },
    {
      key: "judgements",
      label: t("profile.funFacts.groups.judgements"),
      rows: [
        { key: "totalTilesHit", label: t("profile.funFacts.judgements.totalTilesHit"), value: formatCount(j.totalTilesHit) },
        { key: "earlyDouble", label: t("profile.funFacts.judgements.earlyDouble"), value: formatCount(j.earlyDouble) },
        { key: "earlySingle", label: t("profile.funFacts.judgements.earlySingle"), value: formatCount(j.earlySingle) },
        { key: "ePerfect", label: t("profile.funFacts.judgements.ePerfect"), value: formatCount(j.ePerfect) },
        { key: "perfect", label: t("profile.funFacts.judgements.perfect"), value: formatCount(j.perfect) },
        { key: "lPerfect", label: t("profile.funFacts.judgements.lPerfect"), value: formatCount(j.lPerfect) },
        { key: "lateSingle", label: t("profile.funFacts.judgements.lateSingle"), value: formatCount(j.lateSingle) },
        { key: "lateDouble", label: t("profile.funFacts.judgements.lateDouble"), value: formatCount(j.lateDouble) },
        {
          key: "perfectRatio",
          label: t("profile.funFacts.judgements.perfectRatio"),
          value: formatPercentRatio(j.perfectRatio),
        },
        {
          key: "earlyVsLateBias",
          label: t("profile.funFacts.judgements.earlyVsLateBias"),
          value: formatFloat(j.earlyVsLateBias, 4),
        },
      ],
    },
    {
      key: "levelsCleared",
      label: t("profile.funFacts.groups.levelsCleared"),
      rows: [
        {
          key: "totalTilecountCleared",
          label: t("profile.funFacts.levelsCleared.totalTilecountCleared"),
          value: formatCount(l.totalTilecountCleared),
        },
        {
          key: "totalLevelLengthMs",
          label: t("profile.funFacts.levelsCleared.totalLevelLengthMs"),
          value: formatDurationMs(l.totalLevelLengthMs),
        },
        {
          key: "totalPlaytimeMs",
          label: t("profile.funFacts.levelsCleared.totalPlaytimeMs"),
          value: formatDurationMs(l.totalPlaytimeMs),
        },
        {
          key: "averageBpm",
          label: t("profile.funFacts.levelsCleared.averageBpm"),
          value: formatFloat(l.averageBpm, 2),
        },
        {
          key: "totalScoreV2",
          label: t("profile.funFacts.levelsCleared.totalScoreV2"),
          value: formatFloat(l.totalScoreV2, 2),
        },
      ],
    },
    {
      key: "extremes",
      label: t("profile.funFacts.groups.extremes"),
      rows: [
        { key: "firstPassAt", label: t("profile.funFacts.extremes.firstPassAt"), value: formatDateIso(x.firstPassAt) },
        { key: "latestPassAt", label: t("profile.funFacts.extremes.latestPassAt"), value: formatDateIso(x.latestPassAt) },
        {
          key: "bestAccuracy",
          label: t("profile.funFacts.extremes.bestAccuracy"),
          value: x.bestAccuracy != null ? formatPercentRatio(x.bestAccuracy) : "—",
        },
        {
          key: "worstAccuracy",
          label: t("profile.funFacts.extremes.worstAccuracy"),
          value: x.worstAccuracy != null ? formatPercentRatio(x.worstAccuracy) : "—",
        },
        {
          key: "topSpeed",
          label: t("profile.funFacts.extremes.topSpeed"),
          value: x.topSpeed != null ? formatFloat(x.topSpeed, 3) : "—",
        },
        {
          key: "highestTilecountCleared",
          label: t("profile.funFacts.extremes.highestTilecountCleared"),
          value: x.highestTilecountCleared != null ? formatCount(x.highestTilecountCleared) : "—",
        },
        {
          key: "longestLevelMs",
          label: t("profile.funFacts.extremes.longestLevelMs"),
          value: x.longestLevelMs != null ? formatDurationMs(x.longestLevelMs) : "—",
        },
        {
          key: "highestBpmCleared",
          label: t("profile.funFacts.extremes.highestBpmCleared"),
          value: x.highestBpmCleared != null ? formatFloat(x.highestBpmCleared, 2) : "—",
        },
      ],
    },
    {
      key: "activity",
      label: t("profile.funFacts.groups.activity"),
      rows: [
        { key: "accountAgeDays", label: t("profile.funFacts.activity.accountAgeDays"), value: formatCount(a.accountAgeDays) },
        { key: "daysActive", label: t("profile.funFacts.activity.daysActive"), value: formatCount(a.daysActive) },
        {
          key: "passesLast30Days",
          label: t("profile.funFacts.activity.passesLast30Days"),
          value: formatCount(a.passesLast30Days),
        },
        {
          key: "uniqueLevelsLiked",
          label: t("profile.funFacts.activity.uniqueLevelsLiked"),
          value: formatCount(a.uniqueLevelsLiked),
        },
        { key: "packsOwned", label: t("profile.funFacts.activity.packsOwned"), value: formatCount(a.packsOwned) },
        {
          key: "packsFavorited",
          label: t("profile.funFacts.activity.packsFavorited"),
          value: formatCount(a.packsFavorited),
        },
      ],
    },
  ];

  const typeRows = ["PGU", "SPECIAL", "LEGACY", "UNKNOWN"].map((k) => ({
    key: `type_${k}`,
    label: t(`profile.funFacts.difficultyType.${k}`),
    value: formatCount(byType[k] ?? 0),
  }));

  groups.push({
    key: "breakdownByType",
    label: t("profile.funFacts.groups.breakdownByType"),
    rows: typeRows,
  });

  return groups;
}

/**
 * @param {unknown} ff
 * @param {(key: string) => string} t
 * @param {Record<string, { name?: string; sortOrder?: number }>} difficultyDict
 */
export function buildCreatorStatGroups(ff, t, difficultyDict) {
  if (!ff || typeof ff !== "object") return [];

  const idn = ff.identity || {};
  const cr = ff.credits || {};
  const co = ff.content || {};
  const au = ff.audience || {};
  const cu = ff.curation || {};
  const tl = ff.timeline || {};
  const byDiff = ff.levelsByDifficulty || {};
  const byType = ff.levelsByDifficultyType || {};

  const groups = [
    {
      key: "identity",
      label: t("creators.profile.funFacts.groups.identity"),
      rows: [
        { key: "aliasCount", label: t("creators.profile.funFacts.identity.aliasCount"), value: formatCount(idn.aliasCount) },
        { key: "teamsJoined", label: t("creators.profile.funFacts.identity.teamsJoined"), value: formatCount(idn.teamsJoined) },
      ],
    },
    {
      key: "credits",
      label: t("creators.profile.funFacts.groups.credits"),
      rows: [
        {
          key: "levelsCreditedDistinct",
          label: t("creators.profile.funFacts.credits.levelsCreditedDistinct"),
          value: formatCount(cr.levelsCreditedDistinct),
        },
        {
          key: "levelsAsCharter",
          label: t("creators.profile.funFacts.credits.levelsAsCharter"),
          value: formatCount(cr.levelsAsCharter),
        },
        {
          key: "levelsAsVfxer",
          label: t("creators.profile.funFacts.credits.levelsAsVfxer"),
          value: formatCount(cr.levelsAsVfxer),
        }],
    },
    {
      key: "content",
      label: t("creators.profile.funFacts.groups.content"),
      rows: [
        {
          key: "totalTilesMade",
          label: t("creators.profile.funFacts.content.totalTilesMade"),
          value: formatCount(co.totalTilesMade),
        },
        {
          key: "totalLevelDurationMs",
          label: t("creators.profile.funFacts.content.totalLevelDurationMs"),
          value: formatDurationMs(co.totalLevelDurationMs),
        },
        {
          key: "averageTilecount",
          label: t("creators.profile.funFacts.content.averageTilecount"),
          value: formatFloat(co.averageTilecount, 2),
        },
        {
          key: "averageLevelLengthMs",
          label: t("creators.profile.funFacts.content.averageLevelLengthMs"),
          value: formatDurationMs(co.averageLevelLengthMs),
        },
        { key: "averageBpm", label: t("creators.profile.funFacts.content.averageBpm"), value: formatFloat(co.averageBpm, 2) },
        {
          key: "totalClearsOnLevels",
          label: t("creators.profile.funFacts.content.totalClearsOnLevels"),
          value: formatCount(co.totalClearsOnLevels),
        },
        {
          key: "totalLikesOnLevels",
          label: t("creators.profile.funFacts.content.totalLikesOnLevels"),
          value: formatCount(co.totalLikesOnLevels),
        },
        {
          key: "totalDownloadsOnLevels",
          label: t("creators.profile.funFacts.content.totalDownloadsOnLevels"),
          value: formatCount(co.totalDownloadsOnLevels),
        },
      ],
    },
    {
      key: "audience",
      label: t("creators.profile.funFacts.groups.audience"),
      rows: [
        {
          key: "uniquePlayersCleared",
          label: t("creators.profile.funFacts.audience.uniquePlayersCleared"),
          value: formatCount(au.uniquePlayersCleared),
        },
        {
          key: "worldsFirstsOnLevels",
          label: t("creators.profile.funFacts.audience.worldsFirstsOnLevels"),
          value: formatCount(au.worldsFirstsOnLevels),
        },
        {
          key: "totalTilesPlayedOnLevels",
          label: t("creators.profile.funFacts.audience.totalTilesPlayedOnLevels"),
          value: formatCount(au.totalTilesPlayedOnLevels),
        },
      ],
    },
    {
      key: "timeline",
      label: t("creators.profile.funFacts.groups.timeline"),
      rows: [
        {
          key: "firstLevelAt",
          label: t("creators.profile.funFacts.timeline.firstLevelAt"),
          value: formatDateIso(tl.firstLevelAt),
        },
        {
          key: "latestLevelAt",
          label: t("creators.profile.funFacts.timeline.latestLevelAt"),
          value: formatDateIso(tl.latestLevelAt),
        },
      ],
    },
  ];

  groups.push({
    key: "breakdownByType",
    label: t("creators.profile.funFacts.groups.breakdownByType"),
    rows: ["PGU", "SPECIAL"].map((k) => ({
      key: `type_${k}`,
      label: t(`creators.profile.funFacts.difficultyType.${k}`),
      value: formatCount(byType[k] ?? 0),
    })),
  });

  return groups;
}
