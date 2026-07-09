// tuf-search: #useTournamentDisplayTree #tournamentDisplayTree
import { useCallback, useMemo, useState } from "react";
import {
  getCreditId,
  normalizePlacementDisplayMode,
  resolvePlacementListLabel,
} from "@/utils/tournamentPlacements";

export const DISPLAY_TREE_ROOT_PARENT_ID = 0;
export const DISPLAY_TREE_MAX_DEPTH = 5;

const sortNodesByOrder = (nodes = []) =>
  [...nodes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

let tempNodeId = -1;
function nextTempNodeId() {
  tempNodeId -= 1;
  return tempNodeId;
}

export function cloneDisplayTree(nodes) {
  return (nodes || []).map((node) => ({
    ...node,
    children: node.children ? cloneDisplayTree(node.children) : undefined,
  }));
}

export function findDisplayNode(nodes, nodeId) {
  for (const node of nodes || []) {
    if (node.id === nodeId) return node;
    if (node.children) {
      const found = findDisplayNode(node.children, nodeId);
      if (found) return found;
    }
  }
  return null;
}

export function findDisplayParent(nodes, nodeId, parent = null) {
  for (const node of nodes || []) {
    if (node.id === nodeId) return parent;
    if (node.children) {
      const found = findDisplayParent(node.children, nodeId, node);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function findDisplayParentId(nodes, nodeId) {
  const parent = findDisplayParent(nodes, nodeId);
  if (parent === undefined) return undefined;
  return parent?.id ?? DISPLAY_TREE_ROOT_PARENT_ID;
}

function getDisplayChildList(nodes, parentId) {
  if (parentId === DISPLAY_TREE_ROOT_PARENT_ID) return nodes;
  const parentNode = findDisplayNode(nodes, parentId);
  if (!parentNode) return null;
  if (!parentNode.children) parentNode.children = [];
  return parentNode.children;
}

function collectDisplaySubtreeIds(node) {
  const ids = new Set();
  const walk = (current) => {
    if (!current) return;
    ids.add(current.id);
    (current.children || []).forEach(walk);
  };
  walk(node);
  return ids;
}

export function getDisplayExcludedIds(nodes, excludeId) {
  if (excludeId == null) return new Set();
  return collectDisplaySubtreeIds(findDisplayNode(nodes, excludeId));
}

export function getDisplayNodeLabel(node, creditById = new Map()) {
  if (!node) return "";
  if (node.label?.trim()) return node.label.trim();
  if (node.nodeType === "credit" && node.refId != null) {
    const credit = creditById.get(node.refId);
    if (credit) return resolvePlacementListLabel(credit);
    return `Credit #${node.refId}`;
  }
  if (node.nodeType === "seriesRef" && node.refId != null) {
    return `Series #${node.refId}`;
  }
  if (node.nodeType === "tournamentRef" && node.refId != null) {
    return `Tournament #${node.refId}`;
  }
  if (node.nodeType === "group") return "Group";
  return "Node";
}

export function buildDisplayNodePathLabel(nodes, nodeId, creditById, separator = " / ") {
  const segments = [];
  let current = findDisplayNode(nodes, nodeId);
  while (current) {
    segments.unshift(getDisplayNodeLabel(current, creditById));
    const parent = findDisplayParent(nodes, current.id);
    if (!parent) break;
    current = parent;
  }
  return segments.join(separator);
}

export function clampDisplayIndentDepth(depth) {
  return Math.min(Math.max(0, depth), DISPLAY_TREE_MAX_DEPTH);
}

export function flattenDisplayTreeToPositions(nodes, { excludeId, creditById = new Map() } = {}) {
  const excludedIds = getDisplayExcludedIds(nodes, excludeId);
  const rows = [];

  const walkContainer = (children, parentId, depth, ancestorGroupIds) => {
    const visible = sortNodesByOrder(children).filter((child) => !excludedIds.has(child.id));

    rows.push({
      kind: "slot",
      parentId,
      index: 0,
      depth: clampDisplayIndentDepth(depth),
      slotKey: `${parentId}:0`,
      containedByGroups: ancestorGroupIds,
    });

    visible.forEach((child, i) => {
      const isGroup = child.nodeType === "group";
      const groupAncestors = isGroup ? [...ancestorGroupIds, child.id] : ancestorGroupIds;

      if (isGroup) {
        rows.push({
          kind: "group-header",
          groupId: child.id,
          item: child,
          label: getDisplayNodeLabel(child, creditById),
          depth: clampDisplayIndentDepth(depth + 1),
          containedByGroups: ancestorGroupIds,
          childCount: sortNodesByOrder(child.children || []).filter(
            (c) => !excludedIds.has(c.id),
          ).length,
        });
        walkContainer(child.children || [], child.id, depth + 1, groupAncestors);
      } else {
        rows.push({
          kind: "node-ref",
          item: child,
          label: getDisplayNodeLabel(child, creditById),
          depth: clampDisplayIndentDepth(depth + 1),
          containedByGroups: ancestorGroupIds,
        });
      }

      rows.push({
        kind: "slot",
        parentId,
        index: i + 1,
        depth: clampDisplayIndentDepth(depth),
        slotKey: `${parentId}:${i + 1}`,
        containedByGroups: ancestorGroupIds,
      });
    });
  };

  walkContainer(nodes, DISPLAY_TREE_ROOT_PARENT_ID, 0, []);
  return rows;
}

export function isDisplayPlacementRowVisible(row, collapsedGroupIds) {
  if (!row?.containedByGroups?.length) return true;
  return !row.containedByGroups.some((id) => collapsedGroupIds.has(id));
}

export function getDefaultDisplaySlotSelection(nodes, { excludeId, movingItem } = {}) {
  const rows = flattenDisplayTreeToPositions(nodes, { excludeId });
  const slots = rows.filter((row) => row.kind === "slot");
  if (!slots.length) {
    return { parentId: DISPLAY_TREE_ROOT_PARENT_ID, index: 0, slotKey: "0:0" };
  }

  if (movingItem) {
    const parentId = findDisplayParentId(nodes, movingItem.id) ?? DISPLAY_TREE_ROOT_PARENT_ID;
    const parentList = sortNodesByOrder(
      parentId === DISPLAY_TREE_ROOT_PARENT_ID
        ? nodes
        : findDisplayNode(nodes, parentId)?.children || [],
    ).filter((child) => !getDisplayExcludedIds(nodes, excludeId).has(child.id));
    const index = parentList.length;
    const slotKey = `${parentId}:${index}`;
    const match = slots.find((slot) => slot.slotKey === slotKey);
    if (match) {
      return { parentId: match.parentId, index: match.index, slotKey: match.slotKey };
    }
  }

  const last = slots[slots.length - 1];
  return { parentId: last.parentId, index: last.index, slotKey: last.slotKey };
}

export function insertDisplayNodesAtPosition(tree, nodes, destParentId, destIndex) {
  if (!nodes?.length) return cloneDisplayTree(tree);
  const items = cloneDisplayTree(tree);
  const destList = getDisplayChildList(items, destParentId);
  if (!destList) return null;
  const targetIndex = Math.max(0, Math.min(destIndex, destList.length));
  destList.splice(targetIndex, 0, ...nodes);
  return items;
}

export function moveDisplayNodeToPosition(tree, nodeId, destParentId, destIndex) {
  const nodes = cloneDisplayTree(tree);
  let sourceParentId = findDisplayParentId(nodes, nodeId);
  if (sourceParentId === undefined) return null;
  sourceParentId = sourceParentId ?? DISPLAY_TREE_ROOT_PARENT_ID;

  const sourceList = getDisplayChildList(nodes, sourceParentId);
  if (!sourceList) return null;

  const sourceIndex = sourceList.findIndex((child) => child.id === nodeId);
  if (sourceIndex < 0) return null;

  const destList = getDisplayChildList(nodes, destParentId);
  if (!destList) return null;

  const [movedNode] = sourceList.splice(sourceIndex, 1);
  if (!movedNode) return null;

  let targetIndex = destIndex;
  if (sourceParentId === destParentId && destIndex > sourceIndex) {
    targetIndex = destIndex - 1;
  }
  targetIndex = Math.max(0, Math.min(targetIndex, destList.length));
  destList.splice(targetIndex, 0, movedNode);
  return nodes;
}

export function isGroupMoveIntoDescendant(tree, groupId, destParentId) {
  if (destParentId === DISPLAY_TREE_ROOT_PARENT_ID || destParentId === 0) return false;
  let currentParentId = destParentId;
  while (currentParentId !== DISPLAY_TREE_ROOT_PARENT_ID && currentParentId != null) {
    if (currentParentId === groupId) return true;
    const next = findDisplayParentId(tree, currentParentId);
    if (next === undefined) break;
    currentParentId = next;
  }
  return false;
}

export function buildNestedDisplayTree(flatNodes = []) {
  const byId = new Map();
  const roots = [];

  flatNodes.forEach((node) => {
    byId.set(node.id, { ...node, children: [] });
  });

  byId.forEach((node) => {
    const parentId = node.parentId ?? DISPLAY_TREE_ROOT_PARENT_ID;
    if (parentId === DISPLAY_TREE_ROOT_PARENT_ID || parentId === 0 || !byId.has(parentId)) {
      roots.push(node);
      return;
    }
    byId.get(parentId).children.push(node);
  });

  const sortTree = (nodes) => {
    nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    nodes.forEach((node) => {
      if (node.children?.length) sortTree(node.children);
    });
  };
  sortTree(roots);
  return roots;
}

export function flattenDisplayTree(nodes, parentId = DISPLAY_TREE_ROOT_PARENT_ID) {
  const flat = [];
  sortNodesByOrder(nodes).forEach((node, index) => {
    const { children, ...rest } = node;
    flat.push({
      ...rest,
      parentId,
      sortOrder: index,
    });
    if (children?.length) {
      flat.push(...flattenDisplayTree(children, node.id));
    }
  });
  return flat;
}

export function buildDefaultDisplayTreeFromCredits(credits = []) {
  return credits.map((credit, index) => ({
    id: nextTempNodeId(),
    parentId: DISPLAY_TREE_ROOT_PARENT_ID,
    sortOrder: index,
    visible: true,
    nodeType: "credit",
    refId: getCreditId(credit),
    label: null,
  }));
}

function normalizeDisplayNodes(nodes) {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((node) => ({
    id: node.id ?? nextTempNodeId(),
    parentId: node.parentId ?? DISPLAY_TREE_ROOT_PARENT_ID,
    sortOrder: node.sortOrder ?? 0,
    visible: node.visible !== false,
    nodeType: node.nodeType || "credit",
    refId: node.refId ?? null,
    label: node.label ?? null,
  }));
}

/**
 * @param {{
 *   credits?: Array<any>,
 *   initialDisplayMode?: string,
 *   initialDisplayNodes?: Array<any>,
 * }} options
 */
export function useTournamentDisplayTree({
  credits = [],
  initialDisplayMode = "defaultHierarchy",
  initialDisplayNodes = [],
} = {}) {
  const creditById = useMemo(() => {
    const map = new Map();
    credits.forEach((credit) => {
      const id = getCreditId(credit);
      if (id != null) map.set(id, credit);
    });
    return map;
  }, [credits]);

  const [displayMode, setDisplayMode] = useState(() =>
    normalizePlacementDisplayMode(initialDisplayMode),
  );
  const [flatNodes, setFlatNodes] = useState(() => {
    if (initialDisplayNodes.length) return normalizeDisplayNodes(initialDisplayNodes);
    return buildDefaultDisplayTreeFromCredits(credits);
  });
  const [placementPopup, setPlacementPopup] = useState(null);

  const nestedTree = useMemo(() => buildNestedDisplayTree(flatNodes), [flatNodes]);

  const openMovePopup = useCallback((node) => {
    setPlacementPopup({ mode: "move", node });
  }, []);

  const openAddGroupPopup = useCallback(() => {
    setPlacementPopup({ mode: "add-group", node: null });
  }, []);

  const closePlacementPopup = useCallback(() => {
    setPlacementPopup(null);
  }, []);

  const submitPlacementPopup = useCallback(
    ({ mode, parentId, index, name }) => {
      if (mode === "move" && placementPopup?.node) {
        const movingNode = placementPopup.node;
        if (
          movingNode.nodeType === "group" &&
          isGroupMoveIntoDescendant(nestedTree, movingNode.id, parentId)
        ) {
          return;
        }
        const nextTree = moveDisplayNodeToPosition(nestedTree, movingNode.id, parentId, index);
        if (!nextTree) return;
        setFlatNodes(flattenDisplayTree(nextTree));
        setPlacementPopup(null);
        return;
      }

      if (mode === "add-group" && name?.trim()) {
        const newNode = {
          id: nextTempNodeId(),
          parentId,
          sortOrder: index,
          visible: true,
          nodeType: "group",
          refId: null,
          label: name.trim(),
          children: [],
        };
        const nextTree = insertDisplayNodesAtPosition(nestedTree, [newNode], parentId, index);
        if (!nextTree) return;
        setFlatNodes(flattenDisplayTree(nextTree));
        setPlacementPopup(null);
      }
    },
    [nestedTree, placementPopup],
  );

  const toggleNodeVisible = useCallback((nodeId) => {
    setFlatNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, visible: !node.visible } : node)),
    );
  }, []);

  const renameNode = useCallback((nodeId, label) => {
    const trimmed = String(label || "").trim();
    setFlatNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, label: trimmed || null } : node)),
    );
  }, []);

  const resetFromCredits = useCallback(() => {
    setFlatNodes(buildDefaultDisplayTreeFromCredits(credits));
  }, [credits]);

  return {
    displayMode,
    setDisplayMode,
    flatNodes,
    nestedTree,
    creditById,
    placementPopup,
    openMovePopup,
    openAddGroupPopup,
    closePlacementPopup,
    submitPlacementPopup,
    toggleNodeVisible,
    renameNode,
    resetFromCredits,
    setFlatNodes,
  };
}
