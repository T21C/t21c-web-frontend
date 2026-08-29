// tuf-search: #passSubmissionTagWarnings #passSubmission
/** Static tag-name → i18n map for pass-submit requirement warnings. Match exact `tag.name`. */

export const PASS_SUBMISSION_TAG_WARNINGS = [
  { tagName: '1 Key Limit', i18nKey: 'passSubmission.tagWarnings.keyLimit', values: { count: 1 } },
  { tagName: '2 Key Limit', i18nKey: 'passSubmission.tagWarnings.keyLimit', values: { count: 2 } },
  { tagName: '4 Key Limit', i18nKey: 'passSubmission.tagWarnings.keyLimit', values: { count: 4 } },
  { tagName: '6 Key Limit', i18nKey: 'passSubmission.tagWarnings.keyLimit', values: { count: 6 } },
  { tagName: '8 Key Limit', i18nKey: 'passSubmission.tagWarnings.keyLimit', values: { count: 8 } },
  { tagName: '10 Key Limit', i18nKey: 'passSubmission.tagWarnings.keyLimit', values: { count: 10 } },
  { tagName: '12 Key Limit', i18nKey: 'passSubmission.tagWarnings.keyLimit', values: { count: 12 } },
  { tagName: '16 Key Limit', i18nKey: 'passSubmission.tagWarnings.keyLimit', values: { count: 16 } },
  { tagName: 'Overlap Allowed', i18nKey: 'passSubmission.tagWarnings.overlapAllowed' },
  { tagName: '2-Hand Pseudos', i18nKey: 'passSubmission.tagWarnings.twoHandPseudos' },
  { tagName: 'Onhand/Offhand Limit', i18nKey: 'passSubmission.tagWarnings.onhandOffhandLimit' },
  { tagName: 'Variable Key Limit', i18nKey: 'passSubmission.tagWarnings.variableKeyLimit' },
  { tagName: 'No Large Keys', i18nKey: 'passSubmission.tagWarnings.noLargeKeys' },
  { tagName: 'Feet Only', i18nKey: 'passSubmission.tagWarnings.feetOnly' },
  { tagName: '4 Key Base Limit', i18nKey: 'passSubmission.tagWarnings.fourKeyBaseLimit' },
  { tagName: '2 Key Base Limit', i18nKey: 'passSubmission.tagWarnings.twoKeyBaseLimit' },
  { tagName: 'Free Roam', i18nKey: 'passSubmission.tagWarnings.freeRoam' },
  { tagName: 'Multi Track', i18nKey: 'passSubmission.tagWarnings.multiTrack' },
  { tagName: 'Math', i18nKey: 'passSubmission.tagWarnings.math' },
  { tagName: 'RPG', i18nKey: 'passSubmission.tagWarnings.rpg' },
  { tagName: 'Memorization', i18nKey: 'passSubmission.tagWarnings.memorization' },
  { tagName: 'Unorthodox Reading', i18nKey: 'passSubmission.tagWarnings.unorthodoxReading' },
  { tagName: 'Arrow Key', i18nKey: 'passSubmission.tagWarnings.arrowKey' },
  { tagName: 'Camera Required', i18nKey: 'passSubmission.tagWarnings.cameraRequired' },
  { tagName: 'Auto Tile', i18nKey: 'passSubmission.tagWarnings.autoTile' },
  { tagName: 'Judgement Limit', i18nKey: 'passSubmission.tagWarnings.judgementLimit' },
  { tagName: 'HP Bar', i18nKey: 'passSubmission.tagWarnings.hpBar' },
  { tagName: 'Detailed Judgement', i18nKey: 'passSubmission.tagWarnings.detailedJudgement' },
  { tagName: 'Timing Window Scale', i18nKey: 'passSubmission.tagWarnings.timingWindowScale' },
];

export function isPassWarningEnabled(tag) {
  return tag?.passWarningEnabled !== false && tag?.passWarningEnabled !== 0;
}

export function getPassSubmissionTagWarnings(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return [];
  }

  const byName = new Map();
  for (const tag of tags) {
    if (tag?.name) {
      byName.set(tag.name, tag);
    }
  }

  const warnings = [];
  for (const entry of PASS_SUBMISSION_TAG_WARNINGS) {
    const tag = byName.get(entry.tagName);
    if (!tag || !isPassWarningEnabled(tag)) {
      continue;
    }
    warnings.push({
      tagName: entry.tagName,
      i18nKey: entry.i18nKey,
      values: entry.values,
      icon: tag.icon || null,
      color: tag.color || null,
    });
  }
  return warnings;
}
