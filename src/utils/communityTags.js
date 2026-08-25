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
