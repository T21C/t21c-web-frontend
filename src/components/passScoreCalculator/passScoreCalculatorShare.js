// tuf-search: #passScoreCalculatorShare #passScoreCalculator
const NUM_KEYS = [
  'levelId',
  'speed',
  'playerId',
  'baseScore',
  'ppBaseScore',
  'difficultyBaseScore',
  'diffId',
  'cutoff',
  'poleOffset',
  'topMultiplier',
  'tilecount',
  'targetScore',
  'ePerfect',
  'perfect',
  'lPerfect',
  'tooEarly',
  'early',
  'late',
  'cEPerfect',
  'cPerfect',
  'cLPerfect',
  'cTooEarly',
  'cEarly',
  'cLate',
];

function encodeJsonParam(value) {
  try {
    const json = JSON.stringify(value);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

function decodeJsonParam(raw) {
  if (!raw) return null;
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const json = decodeURIComponent(escape(atob(padded + pad)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Encode calculator state into URLSearchParams (for Copy link).
 */
export function encodeCalculatorShare({ form, overrides, targetScore, compareForm }) {
  const params = new URLSearchParams();
  const put = (k, v) => {
    if (v === undefined || v === null || v === '') return;
    params.set(k, String(v));
  };

  put('levelId', form?.levelId);
  put('speed', form?.speed);
  put('playerId', form?.playerId);
  put('player', form?.leaderboardName);
  if (form?.isNoHold) params.set('noHold', '1');

  put('ePerfect', form?.ePerfect);
  put('perfect', form?.perfect);
  put('lPerfect', form?.lPerfect);
  put('tooEarly', form?.tooEarly);
  put('early', form?.early);
  put('late', form?.late);

  put('baseScore', overrides?.baseScore || overrides?.difficultyBaseScore);
  put('ppBaseScore', overrides?.ppBaseScore);
  put('diffId', overrides?.diffId);
  put('tilecount', overrides?.tilecount);
  put('targetScore', targetScore);

  if (overrides?.xaccCurveMeta && typeof overrides.xaccCurveMeta === 'object') {
    const encoded = encodeJsonParam(overrides.xaccCurveMeta);
    if (encoded) params.set('xaccMeta', encoded);
  } else {
    // Legacy raw E/G share params
    put('cutoff', overrides?.cutoff);
    put('poleOffset', overrides?.poleOffset);
    put('topMultiplier', overrides?.topMultiplier);
  }

  if (compareForm) {
    put('cEPerfect', compareForm.ePerfect);
    put('cPerfect', compareForm.perfect);
    put('cLPerfect', compareForm.lPerfect);
    put('cTooEarly', compareForm.tooEarly);
    put('cEarly', compareForm.early);
    put('cLate', compareForm.late);
  }

  return params;
}

/**
 * Decode calculator share params into form/overrides patches.
 * @param {URLSearchParams|string} search
 */
export function decodeCalculatorShare(search) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const form = {};
  const overrides = {};
  let targetScore = '';
  const compareForm = {};

  const get = (k) => params.get(k);

  if (get('levelId')) form.levelId = get('levelId');
  if (get('speed') != null) form.speed = get('speed');
  if (get('playerId')) form.playerId = get('playerId');
  if (get('player')) form.leaderboardName = get('player');
  form.isNoHold = get('noHold') === '1';

  for (const k of ['ePerfect', 'perfect', 'lPerfect', 'tooEarly', 'early', 'late']) {
    if (get(k) != null) form[k] = get(k);
  }

  if (get('baseScore') != null) overrides.baseScore = get('baseScore');
  else if (get('difficultyBaseScore') != null) overrides.baseScore = get('difficultyBaseScore');
  for (const k of ['ppBaseScore', 'diffId', 'tilecount']) {
    if (get(k) != null) overrides[k] = get(k);
  }

  const meta = decodeJsonParam(get('xaccMeta'));
  if (meta && typeof meta === 'object') {
    overrides.xaccCurveMeta = meta;
  } else {
    for (const k of ['cutoff', 'poleOffset', 'topMultiplier']) {
      if (get(k) != null) overrides[k] = get(k);
    }
  }

  if (get('targetScore') != null) targetScore = get('targetScore');

  const cmap = {
    cEPerfect: 'ePerfect',
    cPerfect: 'perfect',
    cLPerfect: 'lPerfect',
    cTooEarly: 'tooEarly',
    cEarly: 'early',
    cLate: 'late',
  };
  for (const [src, dest] of Object.entries(cmap)) {
    if (get(src) != null) compareForm[dest] = get(src);
  }

  return {
    form,
    overrides,
    targetScore,
    compareForm: Object.keys(compareForm).length ? compareForm : null,
  };
}

export { NUM_KEYS };
