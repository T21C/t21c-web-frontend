import { hasFlag, permissionFlags } from '@/utils/UserPermissions';

export const REQUEST_TYPES = ['rerate', 'info_change', 'tag', 'curation', 'curation_rerate'];

export const ALL_STATUSES = [
  'pending',
  'accepted',
  'added_to_rating_page',
  'discord_vote',
  'rejected',
  'withdrawn',
  'completed',
  'completed_changed',
  'completed_unchanged',
];

export const PIPELINE_ACTIONS = [
  'accept',
  'add_to_rating',
  'discord_vote',
  'complete',
  'retry_discord',
  'delete_discord',
  'reopen_discord',
  'reject',
];

const RERATE_ONLY = new Set(['added_to_rating_page', 'discord_vote']);

export const INFO_KINDS = ['song', 'artist', 'credits', 'video', 'download', 'description', 'multiple'];
export const TAG_ACTIONS = ['add', 'remove', 'multiple'];

export function normalizeTagIds(ids) {
  return [...new Set((ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
}

export function sameIdSet(left, right) {
  const a = normalizeTagIds(left);
  const b = normalizeTagIds(right);
  if (a.length !== b.length) return false;
  const known = new Set(b);
  return a.every((id) => known.has(id));
}

export function curationRequestIssue(type, targetIds, currentIds) {
  const target = normalizeTagIds(targetIds);
  if (type === 'curation') return target.length === 0 ? 'curation_empty' : null;
  if (type === 'curation_rerate') {
    if (!Array.isArray(currentIds)) return null;
    return sameIdSet(target, currentIds) ? 'unchanged_curation' : null;
  }
  return null;
}

export function tagRequestIssue(targetIds, currentIds) {
  if (targetIds == null || currentIds == null) return null;
  return sameIdSet(targetIds, currentIds) ? 'unchanged_tags' : null;
}

/** Same codes the server throws for a stored payload versus the live level. */
export function storedRequestIssue(type, payload, level) {
  if (type === 'rerate' && !String(payload?.requestedRating || '').trim()) return 'rating';
  if (type === 'tag') {
    if (!Array.isArray(level?.tagIds)) return null;
    return tagRequestIssue(tagRequestTargetIds(payload, level.tagIds), level.tagIds);
  }
  if (type === 'curation' || type === 'curation_rerate') {
    const current = Array.isArray(level?.curationTypeIds) ? level.curationTypeIds : null;
    if (type === 'curation' && Array.isArray(current) && current.length > 0) return 'has_curation';
    if (type === 'curation_rerate' && Array.isArray(current) && current.length === 0) return 'no_curation';
    return curationRequestIssue(type, payload?.curationTypeIds, current);
  }
  return null;
}

/** Same selection the admin tag editor starts from: staff tags, plus pinned community tags. */
export function assignableTagIds(tags) {
  return normalizeTagIds((tags || []).filter((tag) => {
    if (!tag) return false;
    if (!tag.isCommunity) return true;
    return Boolean(tag.pinned);
  }).map((tag) => tag.id));
}

/** Desired tags. Older requests stored an add/remove action plus one id list. */
export function tagRequestTargetIds(payload, appliedIds) {
  const applied = normalizeTagIds(appliedIds);
  if (Array.isArray(payload?.targetTagIds)) return normalizeTagIds(payload.targetTagIds);
  const ids = normalizeTagIds(payload?.tagIds);
  if (payload?.action === 'remove') return applied.filter((id) => !ids.includes(id));
  if (payload?.action === 'add') return [...new Set([...applied, ...ids])];
  if (payload?.action === 'multiple') {
    const next = new Set(applied);
    ids.forEach((id) => {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    });
    return [...next];
  }
  return applied;
}

export function tagRequestDiff(targetIds, appliedIds) {
  const applied = normalizeTagIds(appliedIds);
  const target = normalizeTagIds(targetIds);
  const appliedSet = new Set(applied);
  const targetSet = new Set(target);
  return {
    addIds: target.filter((id) => !appliedSet.has(id)),
    removeIds: applied.filter((id) => !targetSet.has(id)),
  };
}

export function curationRequestDiff(payload, currentIds) {
  if (Array.isArray(payload?.addCurationTypeIds) || Array.isArray(payload?.removeCurationTypeIds)) {
    return tagRequestDiff(payload?.curationTypeIds, currentIds);
  }
  const current = new Set(normalizeTagIds(currentIds));
  return {
    addIds: normalizeTagIds(payload?.curationTypeIds).filter((id) => !current.has(id)),
    removeIds: [],
  };
}

export function levelHasCuration(level) {
  if (!level || typeof level !== 'object') return false;
  if (Array.isArray(level.curations) && level.curations.length > 0) return true;
  return Boolean(level.curation && typeof level.curation === 'object');
}

export function curationRequestTypeForLevel(level) {
  return levelHasCuration(level) ? 'curation_rerate' : 'curation';
}

export function curationMenuType(level, eligibility) {
  if (eligibility?.curation?.code === 'has_curation') return 'curation_rerate';
  if (eligibility?.curation_rerate?.code === 'no_curation') return 'curation';
  return curationRequestTypeForLevel(level);
}

export function curationTypeIdsFromLevel(level) {
  if (!level || typeof level !== 'object') return [];
  if (Array.isArray(level.curationTypeIds)) return normalizeTagIds(level.curationTypeIds);
  const rows = Array.isArray(level.curations) && level.curations.length
    ? level.curations
    : (level.curation ? [level.curation] : []);
  const ids = [];
  rows.forEach((row) => {
    const types = Array.isArray(row?.types) ? row.types : [];
    types.forEach((entry) => {
      const id = Number(entry?.id ?? entry);
      if (Number.isInteger(id) && id > 0) ids.push(id);
    });
    if (!types.length && Array.isArray(row?.typeIds)) {
      row.typeIds.forEach((entry) => {
        const id = Number(entry);
        if (Number.isInteger(id) && id > 0) ids.push(id);
      });
    }
    if (!types.length && !Array.isArray(row?.typeIds)) {
      const legacyId = Number(row?.type?.id ?? row?.typeId);
      if (Number.isInteger(legacyId) && legacyId > 0) ids.push(legacyId);
    }
  });
  return normalizeTagIds(ids);
}

const CREDIT_ROLE_ORDER = ['charter', 'vfxer', 'specialThanks'];

export function teamFromLevel(level) {
  if (!level) return null;
  const raw = level.team;
  const objectTeam = raw && typeof raw === 'object'
    ? raw
    : (level.teamObject && typeof level.teamObject === 'object' ? level.teamObject : null);
  const id = objectTeam?.id ?? level.teamId ?? null;
  const name = objectTeam?.name || (typeof raw === 'string' ? raw : '');
  if (!id && !name) return null;
  return { id: id || null, name };
}

export function artistFromLevel(level) {
  const artists = Array.isArray(level?.songObject?.artists) ? level.songObject.artists : [];
  if (artists.length === 1 && Number(artists[0]?.id) > 0) {
    return { artistId: Number(artists[0].id), artistName: artists[0].name || level?.artist || '' };
  }
  return { artistId: null, artistName: level?.artist || '' };
}

export function creditsFromLevel(level) {
  return canonicalRequestCredits(level?.levelCredits || level?.credits || []);
}

export function canonicalRequestCredits(credits) {
  const items = (credits || []).map((credit, index) => ({
    creatorId: Number(credit.creatorId ?? credit.creator?.id ?? credit.id),
    name: credit.name || credit.creator?.name || '',
    role: credit.role || 'charter',
    isOwner: Boolean(credit.isOwner),
    sortOrder: Number.isInteger(Number(credit.sortOrder)) ? Number(credit.sortOrder) : index,
  })).filter((credit) => Number.isInteger(credit.creatorId) && credit.creatorId > 0 && CREDIT_ROLE_ORDER.includes(credit.role));

  const ordered = [];
  CREDIT_ROLE_ORDER.forEach((role) => {
    items
      .filter((credit) => credit.role === role)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.creatorId - b.creatorId)
      .forEach((credit, index) => ordered.push({ ...credit, sortOrder: index }));
  });
  return ordered;
}

export function creditSignature(credits, team) {
  return JSON.stringify({
    team: team ? { id: team.id ?? null, name: team.name || '' } : null,
    credits: canonicalRequestCredits(credits).map((credit) => [
      credit.creatorId,
      credit.role,
      credit.isOwner ? 1 : 0,
      credit.sortOrder,
    ]),
  });
}

export function creditRequestDiff(currentCredits, targetCredits, currentTeam, targetTeam) {
  const current = canonicalRequestCredits(currentCredits);
  const target = canonicalRequestCredits(targetCredits);
  const currentMap = new Map(current.map((credit) => [`${credit.creatorId}:${credit.role}`, credit]));
  const targetMap = new Map(target.map((credit) => [`${credit.creatorId}:${credit.role}`, credit]));
  const add = [];
  const remove = [];
  const change = [];
  target.forEach((credit) => {
    const previous = currentMap.get(`${credit.creatorId}:${credit.role}`);
    if (!previous) add.push(credit);
    else if (previous.isOwner !== credit.isOwner || previous.sortOrder !== credit.sortOrder) change.push(credit);
  });
  current.forEach((credit) => {
    if (!targetMap.has(`${credit.creatorId}:${credit.role}`)) remove.push(credit);
  });
  const currentTeamNorm = currentTeam?.id || currentTeam?.name ? { id: currentTeam.id ?? null, name: currentTeam.name || '' } : null;
  const targetTeamNorm = targetTeam?.id || targetTeam?.name ? { id: targetTeam.id ?? null, name: targetTeam.name || '' } : null;
  const teamChanged = (currentTeamNorm?.id ?? null) !== (targetTeamNorm?.id ?? null)
    || (currentTeamNorm?.name || '') !== (targetTeamNorm?.name || '');
  return { add, remove, change, teamChanged, currentTeam: currentTeamNorm, targetTeam: targetTeamNorm };
}

export function currentInfoValue(level, kind) {
  if (!level) return '';
  if (kind === 'video') return level.videoLink || '';
  if (kind === 'download') return level.dlLink || '';
  if (kind === 'description') return level.description || '';
  return '';
}

export function songRequestLabel(songName, suffix) {
  const name = String(songName || '').trim();
  const extra = String(suffix || '').trim();
  return extra ? `${name} ${extra}` : name;
}

/** `Artist - Song (suffix)` for rerate comparison errors. */
export function rerateComparisonLabel(artist, song, suffix) {
  const artistPart = String(artist ?? '').trim() || 'Unknown';
  const songPart = String(song ?? '').trim() || 'Unknown';
  const extra = String(suffix ?? '').trim();
  if (!extra) return `${artistPart} - ${songPart}`;
  const wrapped = extra.startsWith('(') ? extra : `(${extra})`;
  return `${artistPart} - ${songPart} ${wrapped}`;
}

export function reratingComparisonFromRefs(ids, levelsById) {
  for (const id of ids || []) {
    const level = levelsById?.[id];
    if (!level?.toRate) continue;
    return {
      label: rerateComparisonLabel(level.artist, level.songObject?.name || level.song, level.suffix),
    };
  }
  return null;
}

export function buildInfoDraft(payload, level, kind) {
  const hasCredits = Array.isArray(payload?.credits);
  const artist = artistFromLevel(level);
  return {
    songId: payload?.songId ?? level?.songId ?? null,
    songName: payload?.songName || level?.songObject?.name || level?.song || '',
    suffix: typeof payload?.suffix === 'string' ? payload.suffix : (level?.suffix || ''),
    artistId: payload?.artistId ?? artist.artistId,
    artistName: payload?.artistName || artist.artistName,
    value: typeof payload?.value === 'string' ? payload.value : currentInfoValue(level, kind),
    team: hasCredits ? (payload.team ?? null) : teamFromLevel(level),
    credits: hasCredits ? payload.credits : creditsFromLevel(level),
  };
}

const sameText = (left, right) => (left || '').trim() === (right || '').trim();

export function infoChangeMatchesLevel(kind, level, draft) {
  if (!level) return true;
  if (kind === 'song') {
    const sameSong = Number(draft?.songId) > 0 && Number(draft.songId) === Number(level.songId);
    const sameSuffix = (draft?.suffix || '').trim() === (level.suffix || '').trim();
    return sameSong && sameSuffix;
  }
  if (kind === 'artist') return sameText(draft?.artistName, level.artist);
  if (kind === 'video') return sameText(draft?.value, level.videoLink);
  if (kind === 'download') return sameText(draft?.value, level.dlLink);
  if (kind === 'description') return sameText(draft?.value, level.description);
  if (kind === 'multiple') return !String(draft?.value || '').trim();
  if (kind === 'credits') {
    return creditSignature(draft?.credits, draft?.team) === creditSignature(creditsFromLevel(level), teamFromLevel(level));
  }
  return true;
}
export const CREATOR_EDITABLE_KINDS = new Set(['song', 'video', 'download']);

export const HASH_BY_TYPE = {
  rerate: 'rerate',
  info_change: 'info',
  tag: 'tag',
  curation: 'curation',
  curation_rerate: 'curation-rerate',
};

export const TYPE_BY_HASH = {
  rerate: 'rerate',
  info: 'info_change',
  tag: 'tag',
  curation: 'curation',
  'curation-rerate': 'curation_rerate',
};

export const REQUEST_LIST_SORTS = ['created_desc', 'created_asc', 'updated_desc', 'updated_asc'];
export const DEFAULT_REQUEST_LIST_SORT = 'created_desc';
const COMPLETED_FILTERS = new Set(['hide', 'show', 'only']);
const REQUEST_FILTER_STORAGE_KEY = 'levelRequests.admin.filters';

export function isRequestListSort(value) {
  return REQUEST_LIST_SORTS.includes(value);
}

export function statusesForType(type) {
  if (type === 'rerate') return ALL_STATUSES.filter((status) => status !== 'completed');
  return ALL_STATUSES.filter((status) => !RERATE_ONLY.has(status) && !status.startsWith('completed_'));
}

function emptyAdminFilters() {
  return {
    search: '',
    completed: 'hide',
    sort: DEFAULT_REQUEST_LIST_SORT,
  };
}

function sanitizeAdminFilters(saved) {
  const next = emptyAdminFilters();
  if (!saved || typeof saved !== 'object') return next;
  next.search = typeof saved.search === 'string' ? saved.search : '';
  next.sort = isRequestListSort(saved.sort) ? saved.sort : DEFAULT_REQUEST_LIST_SORT;
  next.completed = COMPLETED_FILTERS.has(saved.completed) ? saved.completed : 'hide';
  return next;
}

export function readAdminRequestFilters(type) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(REQUEST_FILTER_STORAGE_KEY) || '{}');
    return sanitizeAdminFilters(parsed?.[type]);
  } catch {
    return emptyAdminFilters();
  }
}

export function writeAdminRequestFilters(type, filters) {
  if (!type) return;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(REQUEST_FILTER_STORAGE_KEY) || '{}');
    const store = parsed && typeof parsed === 'object' ? parsed : {};
    store[type] = sanitizeAdminFilters(filters);
    window.localStorage.setItem(REQUEST_FILTER_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function actionButtonClass(action) {
  if (action === 'reject' || action === 'delete_discord') return 'level-requests__button--danger';
  if (action === 'accept' || action === 'complete' || action === 'add_to_rating') {
    return 'level-requests__button--primary';
  }
  return '';
}

export function canViewRequestType(user, type) {
  if (!user) return false;
  if (hasFlag(user, permissionFlags.SUPER_ADMIN)) return true;
  if (type === 'rerate') return hasFlag(user, permissionFlags.RATER);
  if (type === 'curation' || type === 'curation_rerate') {
    return hasFlag(user, permissionFlags.CURATOR) || hasFlag(user, permissionFlags.HEAD_CURATOR);
  }
  return false;
}

export function canManageRequestType(user, type) {
  if (!user) return false;
  if (hasFlag(user, permissionFlags.SUPER_ADMIN)) return true;
  if (type === 'curation' || type === 'curation_rerate') {
    return hasFlag(user, permissionFlags.CURATOR) || hasFlag(user, permissionFlags.HEAD_CURATOR);
  }
  return false;
}

export function userCanEditLevel(user, level) {
  if (!user || !level) return false;
  if (hasFlag(user, permissionFlags.SUPER_ADMIN)) return true;
  const credits = level.levelCredits || [];
  const isOwner = credits.some((credit) => credit.creatorId === user.creatorId && credit.isOwner);
  if (isOwner) return true;
  const charters = credits.filter((credit) => credit.role?.toLowerCase() === 'charter');
  const isCharter = charters.some((credit) => credit.creatorId === user.creatorId);
  return isCharter && charters.length <= 2;
}

export function requestErrorMessage(t, err) {
  const code = err?.response?.data?.code;
  const details = err?.response?.data?.details;
  if (code) {
    return t(`levelRequests.errors.${code}`, {
      defaultValue: err.response?.data?.error || t('levelRequests.errors.generic'),
      ...(details && typeof details === 'object' ? details : {}),
    });
  }
  return err?.response?.data?.error || t('levelRequests.errors.generic');
}
