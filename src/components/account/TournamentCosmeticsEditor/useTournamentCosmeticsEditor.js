// tuf-search: #useTournamentCosmeticsEditor
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import {
  getCreditId,
  listEditablePlacements,
  normalizePlacementDisplayMode,
  sortPlacementsByOrder,
} from "@/utils/tournamentPlacements";
import { buildDefaultDisplayTreeFromCredits } from "@/components/account/TournamentPlacements/useTournamentDisplayTree";

function normalizeIdList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((n) => Number.isFinite(n)))];
}

function buildSnapshot({
  equippedFrameId,
  orderIds,
  hiddenIds,
  displayMode,
  displayNodes,
}) {
  return {
    equippedFrameId: equippedFrameId ?? null,
    orderIds: normalizeIdList(orderIds),
    hiddenIds: normalizeIdList(hiddenIds).sort((a, b) => a - b),
    displayMode: normalizePlacementDisplayMode(displayMode),
    displayNodes: Array.isArray(displayNodes) ? displayNodes.map((node) => ({ ...node })) : [],
  };
}

function sortedArraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((id, i) => id === sortedB[i]);
}

function orderArraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

function displayNodesEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((node, index) => {
    const other = b[index];
    return (
      node.id === other.id &&
      node.parentId === other.parentId &&
      node.sortOrder === other.sortOrder &&
      node.visible === other.visible &&
      node.nodeType === other.nodeType &&
      node.refId === other.refId &&
      node.label === other.label
    );
  });
}

function snapshotsEqual(a, b) {
  if (!a || !b) return false;
  if (a.equippedFrameId !== b.equippedFrameId) return false;
  if (!sortedArraysEqual(a.hiddenIds, b.hiddenIds)) return false;
  if (!orderArraysEqual(a.orderIds, b.orderIds)) return false;
  if (a.displayMode !== b.displayMode) return false;
  if (!displayNodesEqual(a.displayNodes, b.displayNodes)) return false;
  return true;
}

function deriveInitialOrderIds(placements, initialOrderIds) {
  const editable = listEditablePlacements(placements);
  const visible = editable.filter((p) => !p.isProfileHidden);
  const normalized = normalizeIdList(initialOrderIds);
  if (normalized.length) {
    const visibleIds = new Set(visible.map((p) => getCreditId(p)).filter((id) => id != null));
    const ordered = normalized.filter((id) => visibleIds.has(id));
    const missing = visible
      .map((p) => getCreditId(p))
      .filter((id) => id != null && !ordered.includes(id));
    return [...ordered, ...missing];
  }
  return sortPlacementsByOrder(visible).map((p) => getCreditId(p)).filter((id) => id != null);
}

/**
 * @param {{
 *   mode: 'player' | 'creator',
 *   isOpen?: boolean,
 *   placements?: Array<any>,
 *   initialEquipped?: any,
 *   initialEntitlements?: Array<any>,
 *   initialOrderIds?: number[],
 *   initialHiddenIds?: number[],
 *   initialDisplayMode?: string,
 *   initialDisplayNodes?: Array<any>,
 *   onSaved?: () => void,
 * }} props
 */
export function useTournamentCosmeticsEditor({
  mode,
  isOpen = false,
  placements = [],
  initialEquipped = null,
  initialEntitlements = [],
  initialOrderIds = [],
  initialHiddenIds = [],
  initialDisplayMode = "defaultHierarchy",
  initialDisplayNodes = [],
  onSaved,
}) {
  const { t } = useTranslation("pages");
  const snapshotAtOpenRef = useRef(null);

  const routesRoot = mode === "creator" ? routes.creatorsV3 : routes.playersV3;
  const editablePlacements = useMemo(
    () => listEditablePlacements(placements),
    [placements],
  );

  const savedHiddenIds = useMemo(() => {
    const fromPlacements = editablePlacements
      .filter((p) => p.isProfileHidden)
      .map((p) => getCreditId(p))
      .filter((id) => id != null);
    if (fromPlacements.length) return fromPlacements;
    return normalizeIdList(initialHiddenIds);
  }, [editablePlacements, initialHiddenIds]);

  const savedOrderIds = useMemo(
    () => deriveInitialOrderIds(placements, initialOrderIds),
    [placements, initialOrderIds],
  );

  const savedDisplayNodes = useMemo(() => {
    if (initialDisplayNodes.length) return initialDisplayNodes;
    return buildDefaultDisplayTreeFromCredits(editablePlacements);
  }, [initialDisplayNodes, editablePlacements]);

  const [entitlements, setEntitlements] = useState(initialEntitlements);
  const [draft, setDraft] = useState(() =>
    buildSnapshot({
      equippedFrameId: initialEquipped?.entitlementId ?? null,
      orderIds: savedOrderIds,
      hiddenIds: savedHiddenIds,
      displayMode: initialDisplayMode,
      displayNodes: savedDisplayNodes,
    }),
  );
  const [saveBusy, setSaveBusy] = useState(false);

  const frames = useMemo(
    () => entitlements.filter((e) => e.rewardType === "avatar_frame"),
    [entitlements],
  );

  useEffect(() => {
    if (!isOpen) return;
    const snapshot = buildSnapshot({
      equippedFrameId: initialEquipped?.entitlementId ?? null,
      orderIds: savedOrderIds,
      hiddenIds: savedHiddenIds,
      displayMode: initialDisplayMode,
      displayNodes: savedDisplayNodes,
    });
    snapshotAtOpenRef.current = snapshot;
    setDraft(snapshot);
  }, [
    isOpen,
    initialEquipped?.entitlementId,
    savedOrderIds,
    savedHiddenIds,
    initialDisplayMode,
    savedDisplayNodes,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(routesRoot.mePlacementEntitlements());
        if (cancelled) return;
        setEntitlements(data.entitlements || []);
      } catch {
        setEntitlements(initialEntitlements);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routesRoot, initialEntitlements]);

  const isDirty = useMemo(
    () => !snapshotsEqual(draft, snapshotAtOpenRef.current),
    [draft],
  );

  const placementById = useMemo(() => {
    const map = new Map();
    editablePlacements.forEach((placement) => {
      const id = getCreditId(placement);
      if (id != null) map.set(id, placement);
    });
    return map;
  }, [editablePlacements]);

  const visibleCreditIds = useMemo(
    () => draft.orderIds.filter((id) => !draft.hiddenIds.includes(id)),
    [draft.orderIds, draft.hiddenIds],
  );

  const visiblePlacements = useMemo(
    () =>
      visibleCreditIds
        .map((id) => placementById.get(id))
        .filter(Boolean),
    [visibleCreditIds, placementById],
  );

  const hiddenPlacements = useMemo(
    () =>
      draft.hiddenIds
        .map((id) => placementById.get(id))
        .filter(Boolean),
    [draft.hiddenIds, placementById],
  );

  const selectFrame = useCallback((entitlementId) => {
    setDraft((prev) => ({
      ...prev,
      equippedFrameId: entitlementId ?? null,
    }));
  }, []);

  const setDisplayMode = useCallback((displayMode) => {
    setDraft((prev) => ({
      ...prev,
      displayMode: normalizePlacementDisplayMode(displayMode),
    }));
  }, []);

  const setDisplayNodes = useCallback((displayNodes) => {
    setDraft((prev) => ({
      ...prev,
      displayNodes: Array.isArray(displayNodes)
        ? displayNodes.map((node) => ({ ...node }))
        : [],
    }));
  }, []);

  const toggleHidden = useCallback((creditId) => {
    setDraft((prev) => {
      if (prev.hiddenIds.includes(creditId)) {
        const nextHidden = prev.hiddenIds.filter((id) => id !== creditId);
        const nextOrder = prev.orderIds.includes(creditId)
          ? prev.orderIds
          : [...prev.orderIds, creditId];
        return {
          ...prev,
          hiddenIds: nextHidden,
          orderIds: nextOrder,
        };
      }
      return {
        ...prev,
        hiddenIds: [...prev.hiddenIds, creditId],
        orderIds: prev.orderIds.filter((id) => id !== creditId),
      };
    });
  }, []);

  const reorderPlacements = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    setDraft((prev) => {
      const visibleIds = prev.orderIds.filter((id) => !prev.hiddenIds.includes(id));
      const nextVisible = [...visibleIds];
      const [moved] = nextVisible.splice(fromIndex, 1);
      if (moved == null) return prev;
      nextVisible.splice(toIndex, 0, moved);
      const hiddenSet = new Set(prev.hiddenIds);
      const trailing = prev.orderIds.filter(
        (id) => hiddenSet.has(id) && !nextVisible.includes(id),
      );
      return {
        ...prev,
        orderIds: [...nextVisible, ...trailing],
      };
    });
  }, []);

  const revertDraft = useCallback(() => {
    if (snapshotAtOpenRef.current) {
      const snap = snapshotAtOpenRef.current;
      setDraft({
        ...snap,
        orderIds: [...snap.orderIds],
        hiddenIds: [...snap.hiddenIds],
        displayNodes: snap.displayNodes.map((node) => ({ ...node })),
      });
    }
  }, []);

  const saveAll = useCallback(async () => {
    const baseline = snapshotAtOpenRef.current;
    if (!baseline) return false;

    const frameChanged = draft.equippedFrameId !== baseline.equippedFrameId;
    const hiddenChanged = !sortedArraysEqual(draft.hiddenIds, baseline.hiddenIds);
    const orderChanged = !orderArraysEqual(draft.orderIds, baseline.orderIds);
    const displayModeChanged = draft.displayMode !== baseline.displayMode;
    const displayNodesChanged = !displayNodesEqual(draft.displayNodes, baseline.displayNodes);
    const displayChanged =
      hiddenChanged || orderChanged || displayModeChanged || displayNodesChanged;

    if (!displayChanged && !frameChanged) return true;

    setSaveBusy(true);
    try {
      if (displayChanged) {
        const payload = {};
        if (hiddenChanged) payload.hiddenPlacementIds = draft.hiddenIds;
        if (orderChanged) {
          payload.placementOrderIds = draft.orderIds.filter(
            (id) => !draft.hiddenIds.includes(id),
          );
        }
        if (displayModeChanged) payload.placementDisplayMode = draft.displayMode;
        if (displayNodesChanged) payload.placementDisplayNodes = draft.displayNodes;
        await api.patch(routesRoot.mePlacementDisplay(), payload);
      }
      if (frameChanged) {
        await api.patch(routesRoot.meEquippedCosmetic(), {
          rewardType: "avatar_frame",
          entitlementId: draft.equippedFrameId,
        });
      }

      snapshotAtOpenRef.current = buildSnapshot({
        equippedFrameId: draft.equippedFrameId,
        orderIds: draft.orderIds,
        hiddenIds: draft.hiddenIds,
        displayMode: draft.displayMode,
        displayNodes: draft.displayNodes,
      });
      toast.success(t("settings.tournaments.saveSuccess"));
      onSaved?.();
      return true;
    } catch (e) {
      toast.error(e?.response?.data?.error || t("settings.tournaments.saveError"));
      return false;
    } finally {
      setSaveBusy(false);
    }
  }, [draft, onSaved, routesRoot, t]);

  return {
    editablePlacements,
    visiblePlacements,
    hiddenPlacements,
    frames,
    draft,
    isDirty,
    saveBusy,
    selectFrame,
    setDisplayMode,
    setDisplayNodes,
    toggleHidden,
    reorderPlacements,
    revertDraft,
    saveAll,
  };
}
