// tuf-search: #communityTags #tags

export const COMMUNITY_TAG_CARD_CAP = 7;

export function compareSerializedTagOrder(a, b) {
  const groupedA = a.group && String(a.group).trim() !== '';
  const groupedB = b.group && String(b.group).trim() !== '';
  const groupA = groupedA ? (a.groupSortOrder ?? 0) : Number.MAX_SAFE_INTEGER;
  const groupB = groupedB ? (b.groupSortOrder ?? 0) : Number.MAX_SAFE_INTEGER;
  if (groupA !== groupB) return groupA - groupB;
  const sortA = a.sortOrder ?? 0;
  const sortB = b.sortOrder ?? 0;
  if (sortA !== sortB) return sortA - sortB;
  const nameCmp = String(a.name || '').localeCompare(String(b.name || ''));
  if (nameCmp !== 0) return nameCmp;
  return (a.id ?? 0) - (b.id ?? 0);
}

export function sortTagsByGroupThenSortOrder(tags = []) {
  return [...tags].sort(compareSerializedTagOrder);
}

export function groupTagsByGroup(tags = []) {
  const sorted = sortTagsByGroupThenSortOrder(tags);
  const groups = [];
  const indexByName = new Map();
  for (const tag of sorted) {
    const name = tag.group && String(tag.group).trim() !== '' ? tag.group : '';
    if (!indexByName.has(name)) {
      indexByName.set(name, groups.length);
      groups.push({ name, tags: [] });
    }
    groups[indexByName.get(name)].tags.push(tag);
  }
  return groups;
}

export function formatCommunityTagScore(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return '';
  return `${Math.round(Math.min(1, Math.max(0, score)) * 100)}%`;
}

export function communityTagHoverTitle(tag) {
  const parts = [];
  if (tag?.name) parts.push(tag.name);
  if (tag?.description) parts.push(tag.description);
  const score = tag?.isCommunity ? formatCommunityTagScore(tag.score) : '';
  if (score) parts.push(score);
  return parts.join(' — ');
}

/** Matches server env fallbacks in getCommunityTagConfig(). */
export const COMMUNITY_TAG_DEFAULT_KNOBS = {
  wilsonZ: 4,
  scoreOn: 0.45,
  scoreOff: 0.35,
};

/**
 * Smallest all-upvote weight that reaches `threshold` under Wilson Z:
 * n / (n + z²) >= t  =>  n >= t * z² / (1 - t)
 */
export function minWeightToPassThreshold(wilsonZ, threshold) {
  const z = Number(wilsonZ);
  const t = Number(threshold);
  if (!(z > 0) || !Number.isFinite(t) || t < 0) return null;
  if (t === 0) return 0;
  if (t >= 1) return null;
  const needed = (t * z * z) / (1 - t);
  if (!Number.isFinite(needed) || needed < 0) return null;
  return Math.ceil(needed - 1e-12);
}

function compareScoreThenSortOrder(a, b) {
  const scoreA = typeof a.score === 'number' && Number.isFinite(a.score) ? a.score : -1;
  const scoreB = typeof b.score === 'number' && Number.isFinite(b.score) ? b.score : -1;
  if (scoreA !== scoreB) return scoreB - scoreA;
  const sortA = a.sortOrder ?? 0;
  const sortB = b.sortOrder ?? 0;
  if (sortA !== sortB) return sortA - sortB;
  return (a.id ?? 0) - (b.id ?? 0);
}

export function selectLevelCardDisplayTags(tags = [], cap = COMMUNITY_TAG_CARD_CAP) {
  const nonCommunity = [];
  const pinnedCommunity = [];
  const unpinnedCommunity = [];

  for (const tag of tags) {
    if (!tag.isCommunity) {
      nonCommunity.push(tag);
      continue;
    }
    if (tag.pinned) {
      pinnedCommunity.push(tag);
    } else {
      unpinnedCommunity.push(tag);
    }
  }

  unpinnedCommunity.sort(compareScoreThenSortOrder);
  const limitedUnpinned = unpinnedCommunity.slice(0, Math.max(0, cap));
  const communityVisible = [...pinnedCommunity, ...limitedUnpinned].sort(compareScoreThenSortOrder);
  return [...nonCommunity, ...communityVisible];
}
