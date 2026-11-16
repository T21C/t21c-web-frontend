// tuf-search: #passSubmission #submissions
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { throwFromError } from '@/utils/submissions/formErrors';

/**
 * Pass submission client. The pass branch is pure JSON — no files, no
 * multipart, no upload orchestration. The one-shot endpoint at
 * `/v2/form/pass/submit` handles everything server-side.
 */

export async function submitPass(payload, { signal } = {}) {
  try {
    const res = await api.post(routes.form.pass.submit(), payload, { signal });
    return res.data;
  } catch (err) {
    throwFromError(err, 'Pass submission failed');
  }
}

export async function getOwnedPassSubmission(submissionId, { signal } = {}) {
  try {
    const res = await api.get(routes.form.pass.item(submissionId), { signal });
    return res.data?.submission;
  } catch (err) {
    throwFromError(err, 'Failed to load pass submission');
  }
}

export async function updateOwnedPassSubmission(submissionId, payload, { signal } = {}) {
  try {
    const res = await api.put(routes.form.pass.item(submissionId), payload, { signal });
    return res.data;
  } catch (err) {
    throwFromError(err, 'Failed to update pass submission');
  }
}

const EMPTY_JUDGEMENTS = {
  earlyDouble: 0,
  earlySingle: 0,
  ePerfect: 0,
  perfectMinus: 0,
  perfect: 0,
  perfectPlus: 0,
  lPerfect: 0,
  lateSingle: 0,
  lateDouble: 0,
};

/**
 * Map a PassSubmission API object into the shape EditPassPopup already reads.
 */
export function passFromSubmission(submission) {
  if (!submission) return null;
  const flags = submission.flags || {};
  const assigned = submission.assignedPlayer || null;
  const playerName = assigned?.name || submission.passer || '';
  const playerId = assigned?.id ?? submission.assignedPlayerId ?? submission.passerId ?? '';
  const rawJudgements = submission.judgements || {};
  const judgements = { ...EMPTY_JUDGEMENTS };
  for (const key of Object.keys(EMPTY_JUDGEMENTS)) {
    const value = rawJudgements[key];
    judgements[key] = value == null ? 0 : value;
  }
  return {
    id: submission.id,
    levelId: submission.levelId,
    videoLink: submission.videoLink || '',
    speed: submission.speed,
    playerId,
    player: { id: playerId || undefined, name: playerName },
    feelingRating: submission.feelingDifficulty || '',
    expectedRating: submission.expectedDifficulty || '',
    details: submission.details || '',
    keyCount: submission.keyCount,
    judgements,
    isNoHoldTap: flags.isNoHoldTap ?? submission.isNoHoldTap ?? false,
    isAdofaiV2: flags.isAdofaiV2 ?? submission.isAdofaiV2 ?? false,
    adofaiVersion: flags.adofaiVersion ?? submission.adofaiVersion,
    isXPerfectMode: !!(flags.isXPerfectMode ?? submission.isXPerfectMode),
    passMetaFlags: flags.passMetaFlags ?? 0,
    vidUploadTime: submission.rawTime || '',
    vidTitle: submission.title || '',
    status: submission.status,
  };
}
