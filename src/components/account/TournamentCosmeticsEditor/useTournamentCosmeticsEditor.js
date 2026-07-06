// tuf-search: #useTournamentCosmeticsEditor
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import {
  listEditablePlacements,
  normalizePlacementCardLayout,
  sortPlacementsByOrder,
} from "@/utils/tournamentPlacements";

export const MAX_FEATURED_PLACEMENTS = 5;

function normalizeIdList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((n) => Number.isFinite(n)))];
}

function buildSnapshot({
  cardLayout,
  equippedFrameId,
  featuredIds,
  orderIds,
  hiddenIds,
}) {
  return {
    cardLayout: normalizePlacementCardLayout(cardLayout),
    equippedFrameId: equippedFrameId ?? null,
    featuredIds: normalizeIdList(featuredIds).sort((a, b) => a - b),
    orderIds: normalizeIdList(orderIds),
    hiddenIds: normalizeIdList(hiddenIds).sort((a, b) => a - b),
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

function snapshotsEqual(a, b) {
  if (!a || !b) return false;
  if (a.cardLayout !== b.cardLayout) return false;
  if (a.equippedFrameId !== b.equippedFrameId) return false;
  if (!sortedArraysEqual(a.featuredIds, b.featuredIds)) return false;
  if (!sortedArraysEqual(a.hiddenIds, b.hiddenIds)) return false;
  if (!orderArraysEqual(a.orderIds, b.orderIds)) return false;
  return true;
}

function deriveInitialOrderIds(placements, initialOrderIds) {
  const editable = listEditablePlacements(placements);
  const visible = editable.filter((p) => !p.isProfileHidden);
  const normalized = normalizeIdList(initialOrderIds);
  if (normalized.length) {
    const visibleIds = new Set(visible.map((p) => p.id));
    const ordered = normalized.filter((id) => visibleIds.has(id));
    const missing = visible.map((p) => p.id).filter((id) => !ordered.includes(id));
    return [...ordered, ...missing];
  }
  return sortPlacementsByOrder(visible).map((p) => p.id);
}

/**
 * @param {{
 *   mode: 'player' | 'creator',
 *   isOpen?: boolean,
 *   placements?: Array<any>,
 *   initialEquipped?: any,
 *   initialEntitlements?: Array<any>,
 *   initialCardLayout?: string,
 *   initialOrderIds?: number[],
 *   initialHiddenIds?: number[],
 *   onSaved?: () => void,
 * }} props
 */
export function useTournamentCosmeticsEditor({
  mode,
  isOpen = false,
  placements = [],
  initialEquipped = null,
  initialEntitlements = [],
  initialCardLayout = "default",
  initialOrderIds = [],
  initialHiddenIds = [],
  onSaved,
}) {
  const { t } = useTranslation("pages");
  const snapshotAtOpenRef = useRef(null);

  const routesRoot = mode === "creator" ? routes.creatorsV3 : routes.playersV3;
  const editablePlacements = useMemo(
    () => listEditablePlacements(placements),
    [placements],
  );

  const savedFeaturedIds = useMemo(
    () => editablePlacements.filter((p) => p.isFeatured).map((p) => p.id),
    [editablePlacements],
  );

  const savedHiddenIds = useMemo(() => {
    const fromPlacements = editablePlacements
      .filter((p) => p.isProfileHidden)
      .map((p) => p.id);
    if (fromPlacements.length) return fromPlacements;
    return normalizeIdList(initialHiddenIds);
  }, [editablePlacements, initialHiddenIds]);

  const savedOrderIds = useMemo(
    () => deriveInitialOrderIds(placements, initialOrderIds),
    [placements, initialOrderIds],
  );

  const [entitlements, setEntitlements] = useState(initialEntitlements);
  const [draft, setDraft] = useState(() =>
    buildSnapshot({
      cardLayout: initialCardLayout,
      equippedFrameId: initialEquipped?.entitlementId ?? null,
      featuredIds: savedFeaturedIds,
      orderIds: savedOrderIds,
      hiddenIds: savedHiddenIds,
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
      cardLayout: initialCardLayout,
      equippedFrameId: initialEquipped?.entitlementId ?? null,
      featuredIds: savedFeaturedIds,
      orderIds: savedOrderIds,
      hiddenIds: savedHiddenIds,
    });
    snapshotAtOpenRef.current = snapshot;
    setDraft(snapshot);
  }, [
    isOpen,
    initialCardLayout,
    initialEquipped?.entitlementId,
    savedFeaturedIds,
    savedOrderIds,
    savedHiddenIds,
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

  const placementById = useMemo(
    () => new Map(editablePlacements.map((p) => [p.id, p])),
    [editablePlacements],
  );

  const visiblePlacementIds = useMemo(
    () => draft.orderIds.filter((id) => !draft.hiddenIds.includes(id)),
    [draft.orderIds, draft.hiddenIds],
  );

  const visiblePlacements = useMemo(
    () =>
      visiblePlacementIds
        .map((id) => placementById.get(id))
        .filter(Boolean),
    [visiblePlacementIds, placementById],
  );

  const hiddenPlacements = useMemo(
    () =>
      draft.hiddenIds
        .map((id) => placementById.get(id))
        .filter(Boolean),
    [draft.hiddenIds, placementById],
  );

  const setCardLayout = useCallback((nextLayout) => {
    setDraft((prev) => ({
      ...prev,
      cardLayout: normalizePlacementCardLayout(nextLayout),
    }));
  }, []);

  const selectFrame = useCallback((entitlementId) => {
    setDraft((prev) => ({
      ...prev,
      equippedFrameId: entitlementId ?? null,
    }));
  }, []);

  const toggleFeatured = useCallback((placementId) => {
    setDraft((prev) => {
      if (prev.hiddenIds.includes(placementId)) return prev;
      if (prev.featuredIds.includes(placementId)) {
        return {
          ...prev,
          featuredIds: prev.featuredIds.filter((id) => id !== placementId),
        };
      }
      if (prev.featuredIds.length >= MAX_FEATURED_PLACEMENTS) return prev;
      return {
        ...prev,
        featuredIds: [...prev.featuredIds, placementId],
      };
    });
  }, []);

  const toggleHidden = useCallback((placementId) => {
    setDraft((prev) => {
      if (prev.hiddenIds.includes(placementId)) {
        const nextHidden = prev.hiddenIds.filter((id) => id !== placementId);
        const nextOrder = prev.orderIds.includes(placementId)
          ? prev.orderIds
          : [...prev.orderIds, placementId];
        return {
          ...prev,
          hiddenIds: nextHidden,
          orderIds: nextOrder,
        };
      }
      return {
        ...prev,
        hiddenIds: [...prev.hiddenIds, placementId],
        featuredIds: prev.featuredIds.filter((id) => id !== placementId),
        orderIds: prev.orderIds.filter((id) => id !== placementId),
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
        featuredIds: [...snap.featuredIds],
        orderIds: [...snap.orderIds],
        hiddenIds: [...snap.hiddenIds],
      });
    }
  }, []);

  const saveAll = useCallback(async () => {
    const baseline = snapshotAtOpenRef.current;
    if (!baseline) return false;

    const layoutChanged = draft.cardLayout !== baseline.cardLayout;
    const frameChanged = draft.equippedFrameId !== baseline.equippedFrameId;
    const featuredChanged = !sortedArraysEqual(draft.featuredIds, baseline.featuredIds);
    const hiddenChanged = !sortedArraysEqual(draft.hiddenIds, baseline.hiddenIds);
    const orderChanged = !orderArraysEqual(draft.orderIds, baseline.orderIds);
    const displayChanged =
      layoutChanged || hiddenChanged || orderChanged;

    if (!displayChanged && !frameChanged && !featuredChanged) return true;

    setSaveBusy(true);
    try {
      if (displayChanged) {
        const payload = {};
        if (layoutChanged) payload.cardLayout = draft.cardLayout;
        if (hiddenChanged) payload.hiddenPlacementIds = draft.hiddenIds;
        if (orderChanged) {
          payload.placementOrderIds = draft.orderIds.filter(
            (id) => !draft.hiddenIds.includes(id),
          );
        }
        await api.patch(routesRoot.mePlacementDisplay(), payload);
      }
      if (frameChanged) {
        await api.patch(routesRoot.meEquippedCosmetic(), {
          rewardType: "avatar_frame",
          entitlementId: draft.equippedFrameId,
        });
      }
      if (featuredChanged) {
        await api.patch(routesRoot.meFeaturedPlacements(), {
          placementIds: draft.featuredIds,
        });
      }

      snapshotAtOpenRef.current = buildSnapshot({
        cardLayout: draft.cardLayout,
        equippedFrameId: draft.equippedFrameId,
        featuredIds: draft.featuredIds,
        orderIds: draft.orderIds,
        hiddenIds: draft.hiddenIds,
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
    setCardLayout,
    selectFrame,
    toggleFeatured,
    toggleHidden,
    reorderPlacements,
    revertDraft,
    saveAll,
    maxFeaturedPlacements: MAX_FEATURED_PLACEMENTS,
  };
}
