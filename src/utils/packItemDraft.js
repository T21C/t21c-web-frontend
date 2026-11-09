// tuf-search: #packItemDraft #pack
import { cloneTree, findItem, ROOT_PARENT_ID } from '@/utils/packTreePlacement';

export const DEFAULT_MAX_PACK_ITEMS = 250;
export const TUF_STELLAR_MAX_PACK_ITEMS = 2500;

export function rewriteSortOrders(items = []) {
  return items.map((item, index) => ({
    ...item,
    sortOrder: index,
    children: item.type === 'folder' ? rewriteSortOrders(item.children || []) : item.children,
  }));
}

export function removeItemFromTree(tree, itemId) {
  const items = cloneTree(tree);
  const removeFrom = (list) => {
    const idx = list.findIndex((child) => child.id === itemId);
    if (idx >= 0) {
      list.splice(idx, 1);
      return true;
    }
    for (const child of list) {
      if (child.children && removeFrom(child.children)) return true;
    }
    return false;
  };
  if (!removeFrom(items)) return null;
  return rewriteSortOrders(items);
}

export function patchItemInTree(tree, itemId, patch) {
  const items = cloneTree(tree);
  const item = findItem(items, itemId);
  if (!item) return null;
  Object.assign(item, patch);
  return items;
}

export function countPackItemNodes(items = []) {
  return items.reduce((total, current) => {
    const childCount = current.children ? countPackItemNodes(current.children) : 0;
    return total + 1 + childCount;
  }, 0);
}

export function collectSiblingItems(tree, parentId) {
  if (parentId === ROOT_PARENT_ID || parentId === 0) return tree || [];
  return findItem(tree, parentId)?.children || [];
}

export function hasSiblingNameConflict(tree, parentId, name, excludeId) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return false;
  return collectSiblingItems(tree, parentId).some(
    (item) =>
      (item.type === 'folder' || item.type === 'note') &&
      item.id !== excludeId &&
      String(item.name || '').trim() === trimmed,
  );
}

export function siblingHasLevelId(tree, parentId, levelId, excludeId) {
  return collectSiblingItems(tree, parentId).some(
    (item) => item.type === 'level' && item.levelId === levelId && item.id !== excludeId,
  );
}

export function toCommitTree(items = []) {
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    name: item.name ?? null,
    description: item.description ?? null,
    levelId: item.levelId ?? null,
    children:
      item.type === 'folder' && item.children?.length
        ? toCommitTree(item.children)
        : undefined,
  }));
}

export function createLocalFolderNode(id, name, description = null) {
  return {
    id,
    type: 'folder',
    name: String(name).trim(),
    description,
    levelId: null,
    sortOrder: 0,
    children: undefined,
  };
}

export function createLocalNoteNode(id, name, description = null) {
  return {
    id,
    type: 'note',
    name: String(name).trim(),
    description,
    levelId: null,
    sortOrder: 0,
  };
}

export function createLocalLevelNode(id, levelId, referencedLevel) {
  return {
    id,
    type: 'level',
    name: null,
    description: null,
    levelId,
    sortOrder: 0,
    referencedLevel: referencedLevel ?? null,
    isCleared: false,
    isPurePerfect: false,
    isPureXPerfect: false,
  };
}
