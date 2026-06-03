// tuf-search: #packTreePlacement #pack #placement
import { getSongDisplayName } from '@/utils/levelHelpers';

export const MAX_INDENT_DEPTH = 6;
export const ROOT_PARENT_ID = 0;

const sortItemsByOrder = (items = []) =>
  [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

export function cloneTree(items) {
  return (items || []).map((item) => ({
    ...item,
    children: item.children ? cloneTree(item.children) : undefined,
  }));
}

export function findItem(items, itemId) {
  for (const item of items || []) {
    if (item.id === itemId) return item;
    if (item.children) {
      const found = findItem(item.children, itemId);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(items, itemId, parent = null) {
  for (const item of items || []) {
    if (item.id === itemId) return parent;
    if (item.children) {
      const found = findParent(item.children, itemId, item);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function findParentId(items, itemId) {
  const parentItem = findParent(items, itemId);
  if (parentItem === undefined) return undefined;
  return parentItem?.id ?? ROOT_PARENT_ID;
}

function getChildList(items, parentId) {
  if (parentId === ROOT_PARENT_ID) {
    return items;
  }
  const parentItem = findItem(items, parentId);
  if (!parentItem) return null;
  if (!parentItem.children) {
    parentItem.children = [];
  }
  return parentItem.children;
}

function collectSubtreeIds(item) {
  const ids = new Set();
  const walk = (node) => {
    if (!node) return;
    ids.add(node.id);
    (node.children || []).forEach(walk);
  };
  walk(item);
  return ids;
}

export function getExcludedIds(items, excludeId) {
  if (excludeId == null) return new Set();
  const excluded = collectSubtreeIds(findItem(items, excludeId));
  return excluded;
}

export function getItemDisplayLabel(item) {
  if (!item) return '';
  if (item.type === 'folder') {
    return item.name || 'Folder';
  }
  const level = item.referencedLevel;
  if (level) {
    const song = getSongDisplayName(level);
    if (song) return song;
  }
  return item.levelId != null ? `Level #${item.levelId}` : 'Level';
}

export function buildItemPathLabel(items, itemId, separator = ' / ') {
  const segments = [];
  let current = findItem(items, itemId);
  while (current) {
    segments.unshift(getItemDisplayLabel(current));
    const parent = findParent(items, current.id);
    if (!parent) break;
    current = parent;
  }
  return segments.join(separator);
}

export function clampIndentDepth(depth) {
  return Math.min(Math.max(0, depth), MAX_INDENT_DEPTH);
}

/**
 * Flatten pack tree for the placement selector.
 * Rows: folder-header (collapsible), level-ref (compact), slot (insertion divider).
 * containedByFolders: ancestor folder ids — row hidden when any is collapsed.
 */
export function flattenTreeToPositions(items, { excludeId } = {}) {
  const excludedIds = getExcludedIds(items, excludeId);
  const rows = [];

  const walkContainer = (children, parentId, depth, ancestorFolderIds) => {
    const visible = sortItemsByOrder(children).filter((c) => !excludedIds.has(c.id));

    rows.push({
      kind: 'slot',
      parentId,
      index: 0,
      depth: clampIndentDepth(depth),
      slotKey: `${parentId}:0`,
      containedByFolders: ancestorFolderIds,
    });

    visible.forEach((child, i) => {
      if (child.type === 'folder') {
        const folderAncestors = [...ancestorFolderIds, child.id];
        rows.push({
          kind: 'folder-header',
          folderId: child.id,
          item: child,
          label: getItemDisplayLabel(child),
          depth: clampIndentDepth(depth + 1),
          containedByFolders: ancestorFolderIds,
          childCount: sortItemsByOrder(child.children || []).filter(
            (c) => !excludedIds.has(c.id),
          ).length,
        });
        walkContainer(child.children || [], child.id, depth + 1, folderAncestors);
      } else {
        rows.push({
          kind: 'level-ref',
          item: child,
          label: getItemDisplayLabel(child),
          depth: clampIndentDepth(depth + 1),
          containedByFolders: ancestorFolderIds,
        });
      }

      rows.push({
        kind: 'slot',
        parentId,
        index: i + 1,
        depth: clampIndentDepth(depth),
        slotKey: `${parentId}:${i + 1}`,
        containedByFolders: ancestorFolderIds,
      });
    });
  };

  walkContainer(items, ROOT_PARENT_ID, 0, []);
  return rows;
}

/** All folder ids in tree (for default expanded state). */
export function collectFolderIds(items, excludeId = null) {
  const excludedIds = getExcludedIds(items, excludeId);
  const ids = [];
  const walk = (nodes) => {
    for (const node of sortItemsByOrder(nodes)) {
      if (excludedIds.has(node.id)) continue;
      if (node.type === 'folder') {
        ids.push(node.id);
        walk(node.children || []);
      }
    }
  };
  walk(items || []);
  return ids;
}

export function isPlacementRowVisible(row, collapsedFolderIds) {
  if (!row?.containedByFolders?.length) return true;
  return !row.containedByFolders.some((id) => collapsedFolderIds.has(id));
}

export function getDefaultSlotSelection(items, { excludeId, movingItem } = {}) {
  const rows = flattenTreeToPositions(items, { excludeId });
  const slots = rows.filter((r) => r.kind === 'slot');
  if (slots.length === 0) {
    return { parentId: ROOT_PARENT_ID, index: 0, slotKey: '0:0' };
  }

  if (movingItem) {
    const parentId = findParentId(items, movingItem.id) ?? ROOT_PARENT_ID;
    const parentList = sortItemsByOrder(
      parentId === ROOT_PARENT_ID
        ? items
        : findItem(items, parentId)?.children || [],
    ).filter((c) => !getExcludedIds(items, excludeId).has(c.id));
    const index = parentList.length;
    const slotKey = `${parentId}:${index}`;
    const match = slots.find((s) => s.slotKey === slotKey);
    if (match) {
      return { parentId: match.parentId, index: match.index, slotKey: match.slotKey };
    }
  }

  const last = slots[slots.length - 1];
  return { parentId: last.parentId, index: last.index, slotKey: last.slotKey };
}

export function moveItemToPosition(tree, itemId, destParentId, destIndex) {
  const items = cloneTree(tree);
  let sourceParentId = findParentId(items, itemId);
  if (sourceParentId === undefined) return null;
  sourceParentId = sourceParentId ?? ROOT_PARENT_ID;

  const sourceList = getChildList(items, sourceParentId);
  if (!sourceList) return null;

  const sourceIndex = sourceList.findIndex((c) => c.id === itemId);
  if (sourceIndex < 0) return null;

  const destList = getChildList(items, destParentId);
  if (!destList) return null;

  const [movedItem] = sourceList.splice(sourceIndex, 1);
  if (!movedItem) return null;

  let targetIndex = destIndex;
  if (sourceParentId === destParentId && destIndex > sourceIndex) {
    targetIndex = destIndex - 1;
  }
  targetIndex = Math.max(0, Math.min(targetIndex, destList.length));
  destList.splice(targetIndex, 0, movedItem);
  return items;
}

export function insertNodesAtPosition(tree, nodes, destParentId, destIndex) {
  if (!nodes?.length) return cloneTree(tree);
  const items = cloneTree(tree);
  const destList = getChildList(items, destParentId);
  if (!destList) return null;
  const targetIndex = Math.max(0, Math.min(destIndex, destList.length));
  destList.splice(targetIndex, 0, ...nodes);
  return items;
}

export function isFolderMoveIntoDescendant(tree, folderId, destParentId) {
  if (destParentId === ROOT_PARENT_ID || destParentId === 0) return false;
  let currentParentId = destParentId;
  while (currentParentId !== ROOT_PARENT_ID && currentParentId != null) {
    if (currentParentId === folderId) return true;
    const next = findParentId(tree, currentParentId);
    if (next === undefined) break;
    currentParentId = next;
  }
  return false;
}

export function parseLevelIdsInput(input) {
  if (input == null || String(input).trim() === '') return [];
  const str = String(input).trim();
  const matches = str.match(/\d+/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => parseInt(m, 10)).filter((id) => Number.isFinite(id) && id > 0))];
}

export function slotSelectionFromKey(slotKey) {
  if (!slotKey) return null;
  const [parentPart, indexPart] = slotKey.split(':');
  const parentId = parseInt(parentPart, 10);
  const index = parseInt(indexPart, 10);
  if (!Number.isFinite(parentId) || !Number.isFinite(index)) return null;
  return { parentId, index };
}
