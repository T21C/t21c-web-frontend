// tuf-search: #PackDetailPage #packDetailPage #pack #packDetail
import "./packdetailpage.css";
import React, { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from "react";
import { Link, useParams, useNavigate, useLocation, useNavigationType } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMementoHistory, useMementoShortcuts } from "@/hooks/useMementoHistory";
import PackItem, { PackLevelItem } from "@/components/cards/PackItem/PackItem";
import PackDescription from "@/components/cards/PackCard/PackDescription";
import { MetaTags, CurationTypeCountView } from "@/components/common/display";
import { buildPackMeta } from '@/utils/meta';
import { ScrollButton } from "@/components/common/buttons";
import { EditIcon, UndoIcon, RedoIcon, PinIcon, LockIcon, EyeIcon, UsersIcon, ArrowIcon, PlusIcon, LikeIcon, DownloadIcon, ChevronIcon, ExternalLinkIcon } from "@/components/common/icons";
import { EditPackPopup, EditFolderPopup, EditNotePopup, PackDownloadPopup, PackExportPopup, PackItemPlacementPopup, PackAddLevelsConfirmPopup } from "@/components/popups/Packs";
import {
  moveItemToPosition,
  insertNodesAtPosition,
  isFolderMoveIntoDescendant,
  cloneTree,
  findParentId as findTreeParentId,
  parseLevelIdsInput,
} from '@/utils/packTreePlacement';
import {
  rewriteSortOrders,
  removeItemFromTree,
  patchItemInTree,
  countPackItemNodes,
  collectSiblingItems,
  hasSiblingNameConflict,
  siblingHasLevelId,
  toCommitTree,
  createLocalFolderNode,
  createLocalNoteNode,
  createLocalLevelNode,
  DEFAULT_MAX_PACK_ITEMS,
  TUF_STELLAR_MAX_PACK_ITEMS,
} from '@/utils/packItemDraft';
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { usePackContext } from "@/contexts/PackContext";
import api from "@/utils/api";
import { routes } from '@/api/routes';
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { UserAvatar } from "@/components/layout";
import { userAvatarUrls } from "@/utils/playerAvatarDisplay";
import { Tooltip } from '@/components/common/display/Tooltip';
import { getPackExpandedFolders, setPackExpandedFolders } from "@/utils/folderState";
import toast from 'react-hot-toast';
import { summarizePackSize, summarizeFolderSize, summarizePackClears, formatEstimatedSize } from '@/utils/packDownloadUtils';
import { curationTypeCountsFromPackItems } from '@/utils/packCurationTypeCounts';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import i18next from 'i18next';
import { formatDate, ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { validatePackLevelInsert } from '@/utils/packLevelInsert';
import { isTufStellarAccessActive } from '@/utils/profileBanners';

const ROOT_DROPPABLE_ID = 'folder-root';

// Remembers window scroll position per pack id (in-memory, survives SPA route
// changes) so returning from a level detail page via back/forward restores the
// user to where they left off instead of jumping to the top.
const packScrollPositions = new Map();

// Render clone for dragging items - this renders in a portal to prevent layout shifts
// from affecting hit detection on Droppables above the source
const RenderClone = ({ item, provided, snapshot, user, canEdit }) => {
  if (item?.type === 'level') {
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`pack-item pack-item--level dragging-clone ${snapshot.isDragging ? 'is-dragging' : ''}`}
        style={{
          ...provided.draggableProps.style,
          // Ensure clone is visible and on top
          zIndex: 9999,
          opacity: 1,
        }}
      >
        <div className="pack-item__level-wrapper">
          <PackLevelItem
            item={item}
            canEdit={canEdit}
            isReordering={false}
            user={user}
            onDeleteItem={() => {}}
            dragHandleProps={provided.dragHandleProps}
          />
        </div>
      </div>
    );
  }
  
  if (item?.type === 'note') {
    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`pack-item pack-item--note dragging-clone ${snapshot.isDragging ? 'is-dragging' : ''}`}
        style={{
          ...provided.draggableProps.style,
          zIndex: 9999,
          opacity: 1,
        }}
      >
        <div className="pack-item__header">
          <div className="pack-item__icon">📝</div>
          <div className="pack-item__info">
            <div className="pack-item__name">{item.name}</div>
          </div>
        </div>
      </div>
    );
  }

  // For folders (though folders have isDragDisabled=true currently)
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`pack-item pack-item--folder dragging-clone ${snapshot.isDragging ? 'is-dragging' : ''}`}
      style={{
        ...provided.draggableProps.style,
        zIndex: 9999,
        opacity: 1,
      }}
    >
      <div className="pack-item__header">
        <div className="pack-item__icon">📁</div>
        <div className="pack-item__info">
          <div className="pack-item__name">{item.name}</div>
          <div className="pack-item__count">{item.children?.length || 0} items</div>
        </div>
      </div>
    </div>
  );
};

const parseDroppableId = (droppableId) => {
  if (droppableId === ROOT_DROPPABLE_ID) return 0;
  if (droppableId?.startsWith('folder-')) {
    const id = Number(droppableId.replace('folder-', ''));
    return Number.isNaN(id) ? 0 : id;
  }
  return 0;
};

const sortItemsByOrder = (items = []) => [...items].sort((a, b) => a.sortOrder - b.sortOrder);

const countPackItems = countPackItemNodes;

/** Merge GET /packs/:id/cdnData into tree items for size estimates (download UI). */
const enrichPackItemTree = (items, cdnMap) => {
  if (!items?.length) return [];
  return items.map((item) => {
    const next = { ...item };
    if (item.children?.length) {
      next.children = enrichPackItemTree(item.children, cdnMap);
    }
    if (item.type === 'level' && item.levelId != null && cdnMap) {
      const meta = cdnMap.get(item.levelId);
      if (meta) {
        if (meta.fileId) {
          next.downloadSizeBytes = meta.size ?? null;
          next.cdnDownload = {
            fileId: meta.fileId,
            size: meta.size ?? null,
            originalFilename: meta.originalFilename ?? null,
            ...(meta.metadata && typeof meta.metadata === 'object'
              ? { metadata: meta.metadata }
              : {}),
          };
        } else {
          next.downloadSizeBytes = null;
        }
      }
    }
    return next;
  });
};

const PackDetailPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const { user } = useAuth();
  const { curationTypesDict } = useDifficultyContext();
  const { toggleFavorite } = usePackContext();
  
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editFolderItem, setEditFolderItem] = useState(null);
  const [editFolderSubmitting, setEditFolderSubmitting] = useState(false);
  const [editNoteItem, setEditNoteItem] = useState(null);
  const [editNoteSubmitting, setEditNoteSubmitting] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [downloadContext, setDownloadContext] = useState(null);
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [placement, setPlacement] = useState({ open: false, mode: 'add-folder', item: null });
  const [placementSubmitting, setPlacementSubmitting] = useState(false);
  const [levelInsertConfirm, setLevelInsertConfirm] = useState({
    open: false,
    validLevelIds: [],
    invalid: [],
    parentId: 0,
    index: null,
    skippedCount: 0,
    fromPlacement: false,
  });
  const [levelInsertSubmitting, setLevelInsertSubmitting] = useState(false);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [itemsSaveBusy, setItemsSaveBusy] = useState(false);
  const [cdnMetadataByLevelId, setCdnMetadataByLevelId] = useState(() => new Map());
  const scrollRef = useRef(null);
  const itemsBaselineRef = useRef(null);
  const nextLocalIdRef = useRef(-1);
  const quotaMaxRef = useRef(null);
  const isEditingItemsRef = useRef(false);
  const packItemsSourceRef = useRef([]);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const hasRestoredScrollRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const {
    record: recordHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
  } = useMementoHistory({ resetKey: isEditingItems ? `edit:${id}` : 'view' });
  isEditingItemsRef.current = isEditingItems;

  const fetchPackCdnData = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(routes.database.levels.packs.cdnData(id));
      const map = new Map();
      for (const it of response.data.items ?? []) {
        map.set(it.levelId, it);
      }
      setCdnMetadataByLevelId(map);
    } catch (err) {
      console.error('Error fetching pack CDN metadata:', err);
      setCdnMetadataByLevelId(new Map());
    }
  }, [id]);

  const packItems = useMemo(
    () => enrichPackItemTree(pack?.items || [], cdnMetadataByLevelId),
    [pack?.items, cdnMetadataByLevelId]
  );
  packItemsSourceRef.current = pack?.items || [];
  const packSizeSummary = useMemo(() => summarizePackSize(packItems), [packItems]);
  const totalLevels = packSizeSummary.levelCount;
  const packSizeLabel = useMemo(() => formatEstimatedSize(packSizeSummary), [packSizeSummary]);
  const packClears = useMemo(() => summarizePackClears(packItems), [packItems]);
  const showPackProgress = Boolean(user) && packClears.total > 0;
  const packDownloadDisabled = totalLevels === 0;
  const packExportDisabled = totalLevels === 0;
  const sortedRootItems = useMemo(() => sortItemsByOrder(packItems), [packItems]);
  const totalRenderableItems = useMemo(() => countPackItems(packItems), [packItems]);
  const packCurationTypeCounts = useMemo(
    () => curationTypeCountsFromPackItems(packItems),
    [packItems],
  );
  const packMeta = useMemo(() => {
    if (!pack) return null;
    return buildPackMeta(pack, t, {
      pathname: location.pathname,
      totalLevels,
    });
  }, [pack, t, location.pathname, totalLevels]);

  // Fetch pack details (CDN sizes loaded separately via fetchPackCdnData)
  const fetchPack = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(false);
      }
      
      const response = await api.get(`${routes.database.levels.packs.byId(id)}?tree=true`);
      setPack((prev) => {
        if (isEditingItemsRef.current && prev) {
          return { ...response.data, items: prev.items };
        }
        return response.data;
      });
      fetchPackCdnData();
    } catch (error) {
      console.error('Error fetching pack:', error);
      if (!silent) {
        setError(true);
      }
      if (error.response?.status === 404) {
        toast.error(t('packDetail.error.notFound'));
      } else if (error.response?.status === 403) {
        toast.error(t('packDetail.error.accessDenied'));
      } else {
        toast.error(t('packDetail.error.loadFailed'));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [id, t, fetchPackCdnData]);

  useEffect(() => {
    if (id) {
      hasRestoredScrollRef.current = false;
      lastScrollYRef.current = 0;
      setCdnMetadataByLevelId(new Map());
      isEditingItemsRef.current = false;
      itemsBaselineRef.current = null;
      nextLocalIdRef.current = -1;
      quotaMaxRef.current = null;
      setIsEditingItems(false);
      setItemsSaveBusy(false);
      // Load expanded folders from cookies for this pack
      const savedExpandedFolders = getPackExpandedFolders(id);
      setExpandedFolders(savedExpandedFolders);
      fetchPack();
    }
  }, [id, fetchPack]);

  // Persist the window scroll position while viewing this pack so it can be
  // restored when the user returns from a level detail page (back/forward).
  // We track the latest position in a ref synchronously on every scroll event,
  // because the unmount cleanup runs as a passive effect AFTER
  // ScrollToTopOnNavigate has already reset window.scrollY to 0 — reading
  // window.scrollY at cleanup time would clobber the real value with 0.
  useEffect(() => {
    if (!id) return;
    const handleScroll = () => {
      lastScrollYRef.current = window.scrollY;
      packScrollPositions.set(id, window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      packScrollPositions.set(id, lastScrollYRef.current);
    };
  }, [id]);

  // Restore the remembered scroll position once the pack content is fully
  // loaded, but only on back/forward (POP) navigation. ScrollToTopOnNavigate
  // handles resetting to the top for fresh (PUSH) navigations.
  useLayoutEffect(() => {
    if (loading || error || !pack) return;
    if (hasRestoredScrollRef.current) return;
    hasRestoredScrollRef.current = true;

    if (navigationType !== 'POP') return;
    const saved = packScrollPositions.get(id);
    if (!saved) return;

    window.scrollTo(0, saved);
  }, [loading, error, pack, navigationType, id, sortedRootItems.length]);

  // Listen for pack updates from external sources (e.g., AddToPackPopup)
  useEffect(() => {
    const handlePackUpdate = (event) => {
      if (event.detail?.packId === id || event.detail?.packId === pack?.id) {
        if (isEditingItemsRef.current) return;
        fetchPack(true); // Silent refetch
      }
    };

    window.addEventListener('packUpdated', handlePackUpdate);
    return () => window.removeEventListener('packUpdated', handlePackUpdate);
  }, [id, pack?.id, fetchPack]);

  // Handle edit pack
  const handleEditPack = async (updatedPack) => {
    setPack({ ...pack, ...updatedPack });
    setShowEditPopup(false);
    toast.success(t('packDetail.edit.success'));
  };

  // Handle delete pack
  const handleDeletePack = () => {
    navigate('/packs');
  };

  // Handle favorite toggle
  const handleFavoriteClick = async () => {
    if (!user) {
      toast.error('Please log in to favorite packs');
      return;
    }

    try {
      const success = await toggleFavorite(pack.id);
      if (success) {
        // Update pack data immediately with the new favorite status
        setPack(prevPack => ({
          ...prevPack,
          isFavorited: !prevPack.isFavorited
        }));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(error.response?.data?.error || 'Failed to update favorite status');
    }
  };

  // Folder expansion state
  const toggleFolderExpanded = (itemId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      // Save to cookies
      if (id) {
        setPackExpandedFolders(id, newSet);
      }
      return newSet;
    });
  };

  // Helper to get all folder IDs from the tree
  const getAllFolderIds = (items) => {
    const folderIds = [];
    items?.forEach(item => {
      if (item.type === 'folder') {
        folderIds.push(item.id);
        if (item.children) {
          folderIds.push(...getAllFolderIds(item.children));
        }
      }
    });
    return folderIds;
  };

  // Collapse/expand all folders
  const handleCollapseExpandAll = (expand) => {
    if (!pack?.items) return;
    
    const allFolderIds = getAllFolderIds(packItems);
    const newExpandedFolders = expand ? new Set(allFolderIds) : new Set();
    
    setExpandedFolders(newExpandedFolders);
    
    // Save to cookies
    if (id) {
      setPackExpandedFolders(id, newExpandedFolders);
    }
  };

  // Check if all folders are expanded
  const areAllFoldersExpanded = () => {
    if (!pack?.items) return false;
    const allFolderIds = getAllFolderIds(packItems);
    return allFolderIds.length > 0 && allFolderIds.every(folderId => expandedFolders.has(folderId));
  };

  const allocLocalId = useCallback(() => {
    const nextId = nextLocalIdRef.current;
    nextLocalIdRef.current -= 1;
    return nextId;
  }, []);

  const getDraftMaxItems = useCallback(() => {
    if (quotaMaxRef.current != null) return quotaMaxRef.current;
    if (user && hasFlag(user, permissionFlags.SUPER_ADMIN)) return Number.MAX_SAFE_INTEGER;
    if (isTufStellarAccessActive(user)) return TUF_STELLAR_MAX_PACK_ITEMS;
    return DEFAULT_MAX_PACK_ITEMS;
  }, [user]);

  const applyItemsDraft = useCallback((nextTree, destParentId) => {
    recordHistory(packItemsSourceRef.current);
    const ordered = rewriteSortOrders(nextTree);
    setPack((prev) => ({ ...prev, items: ordered }));
    if (destParentId && destParentId !== 0) {
      setExpandedFolders((prev) => {
        const newSet = new Set(prev);
        newSet.add(destParentId);
        if (id) {
          setPackExpandedFolders(id, newSet);
        }
        return newSet;
      });
    }
  }, [recordHistory, id]);

  const undoItems = useCallback(() => {
    if (itemsSaveBusy) return;
    const prev = undoHistory(packItemsSourceRef.current);
    if (prev) setPack((current) => ({ ...current, items: prev }));
  }, [undoHistory, itemsSaveBusy]);

  const redoItems = useCallback(() => {
    if (itemsSaveBusy) return;
    const next = redoHistory(packItemsSourceRef.current);
    if (next) setPack((current) => ({ ...current, items: next }));
  }, [redoHistory, itemsSaveBusy]);

  useMementoShortcuts({
    enabled: isEditingItems && !itemsSaveBusy,
    undo: undoItems,
    redo: redoItems,
  });

  const isItemsDirty = useMemo(() => {
    if (!isEditingItems) return false;
    return JSON.stringify(pack?.items || []) !== JSON.stringify(itemsBaselineRef.current || []);
  }, [isEditingItems, pack?.items]);

  useEffect(() => {
    if (!isItemsDirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isItemsDirty]);

  const enterEditItems = useCallback(() => {
    const snapshot = rewriteSortOrders(cloneTree(pack?.items || []));
    itemsBaselineRef.current = cloneTree(snapshot);
    nextLocalIdRef.current = -1;
    quotaMaxRef.current = null;
    setPack((prev) => ({ ...prev, items: snapshot }));
    setIsEditingItems(true);
  }, [pack?.items]);

  const requestExitEditItems = useCallback(() => {
    if (itemsSaveBusy) return;
    if (isItemsDirty && !window.confirm(t('confirmations.unsavedChanges', { ns: 'common' }))) {
      return;
    }
    setPack((prev) => ({ ...prev, items: itemsBaselineRef.current || prev.items }));
    setIsEditingItems(false);
    itemsBaselineRef.current = null;
  }, [isItemsDirty, itemsSaveBusy, t]);

  const handleSaveItems = useCallback(async () => {
    if (!pack?.id || itemsSaveBusy || !isItemsDirty) return;
    setItemsSaveBusy(true);
    const toastId = toast.loading(t('loading.saving', { ns: 'common' }));
    try {
      const response = await api.put(routes.database.levels.packs.itemsCommit(pack.id), {
        items: toCommitTree(pack.items || []),
      });
      setPack((prev) => ({ ...prev, items: response.data.items }));
      setIsEditingItems(false);
      itemsBaselineRef.current = null;
      fetchPackCdnData();
      toast.success(t('packDetail.editItems.saveSuccess'), { id: toastId });
      window.dispatchEvent(new CustomEvent('packUpdated', {
        detail: { packId: pack.id },
      }));
    } catch (error) {
      console.error('Error saving pack items:', error);
      toast.error(error.response?.data?.error || t('packDetail.editItems.saveError'), { id: toastId });
    } finally {
      setItemsSaveBusy(false);
    }
  }, [pack?.id, pack?.items, itemsSaveBusy, isItemsDirty, fetchPackCdnData, t]);

  const assertCanAddItems = useCallback((count = 1) => {
    if (countPackItemNodes(packItemsSourceRef.current) + count > getDraftMaxItems()) {
      toast.error(t('packDetail.editItems.quotaExceeded'));
      return false;
    }
    return true;
  }, [getDraftMaxItems, t]);

  // Handle adding new folder
  const handleAddFolder = () => {
    if (itemsSaveBusy) return;
    const folderName = prompt(t('packDetail.createFolder.prompt'));
    if (!folderName?.trim()) return;
    if (hasSiblingNameConflict(packItemsSourceRef.current, 0, folderName)) {
      toast.error(t('packDetail.editItems.nameConflict', { name: folderName.trim() }));
      return;
    }
    if (!assertCanAddItems()) return;
    const node = createLocalFolderNode(allocLocalId(), folderName);
    const current = packItemsSourceRef.current;
    const newTree = insertNodesAtPosition(current, [node], 0, current.length);
    if (!newTree) return;
    applyItemsDraft(newTree);
  };

  const closePlacement = useCallback(() => {
    setPlacement({ open: false, mode: 'add-folder', item: null });
  }, []);

  const openAddFolderPlacement = useCallback(() => {
    setPlacement({ open: true, mode: 'add-folder', item: null });
  }, []);

  const openAddLevelPlacement = useCallback(() => {
    setPlacement({ open: true, mode: 'add-level', item: null });
  }, []);

  const openAddNotePlacement = useCallback(() => {
    setPlacement({ open: true, mode: 'add-note', item: null });
  }, []);

  const openMovePlacement = useCallback((item) => {
    if (!item) return;
    setPlacement({ open: true, mode: 'move', item });
  }, []);

  const closeLevelInsertConfirm = useCallback(() => {
    setLevelInsertConfirm({
      open: false,
      validLevelIds: [],
      invalid: [],
      parentId: 0,
      index: null,
      skippedCount: 0,
      fromPlacement: false,
    });
  }, []);

  const classifyDraftLevelInsert = useCallback(async (levelIds, parentId) => {
    const parsed = parseLevelIdsInput(levelIds);
    const destParentId = parentId ?? 0;
    const notFound = new Set();

    if (pack?.id && parsed.length > 0) {
      try {
        const result = await validatePackLevelInsert(pack.id, parsed, 0);
        if (result.quota?.maxAllowed != null) {
          quotaMaxRef.current = result.quota.maxAllowed;
        }
        for (const entry of result.invalid || []) {
          if (entry.reason === 'not_found') notFound.add(entry.levelId);
        }
      } catch (error) {
        if (error.response?.status === 400 && Array.isArray(error.response?.data?.details?.invalid)) {
          for (const entry of error.response.data.details.invalid) {
            if (entry.reason === 'not_found') notFound.add(entry.levelId);
          }
        } else {
          throw error;
        }
      }
    }

    const remainingSlots = Math.max(
      0,
      getDraftMaxItems() - countPackItemNodes(packItemsSourceRef.current),
    );
    const pendingLevelIds = new Set();
    const validLevelIds = [];
    const invalid = [];
    let slotsUsed = 0;

    for (const levelId of parsed) {
      if (notFound.has(levelId)) {
        invalid.push({ levelId, reason: 'not_found' });
        continue;
      }
      if (
        siblingHasLevelId(packItemsSourceRef.current, destParentId, levelId) ||
        pendingLevelIds.has(levelId)
      ) {
        invalid.push({ levelId, reason: 'already_in_pack' });
        continue;
      }
      if (slotsUsed >= remainingSlots) {
        invalid.push({ levelId, reason: 'quota_exceeded' });
        continue;
      }
      pendingLevelIds.add(levelId);
      validLevelIds.push(levelId);
      slotsUsed += 1;
    }

    return { validLevelIds, invalid };
  }, [pack?.id, getDraftMaxItems]);

  const submitValidatedLevelInsert = useCallback(async ({
    validLevelIds,
    parentId,
    index,
    fromPlacement = false,
  }) => {
    if (validLevelIds.length === 0) return;

    const destParentId = parentId ?? 0;
    const referencedById = new Map();
    await Promise.all(validLevelIds.map(async (levelId) => {
      try {
        const { data } = await api.get(routes.database.levels.byIdQuery(levelId));
        referencedById.set(levelId, data);
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error;
        }
      }
    }));

    const missing = validLevelIds.filter((levelId) => !referencedById.has(levelId));
    const insertIds = validLevelIds.filter((levelId) => referencedById.has(levelId));
    if (insertIds.length === 0) {
      toast.error(t('packDetail.addLevel.error'));
      closeLevelInsertConfirm();
      if (fromPlacement) closePlacement();
      return;
    }

    const nodes = insertIds.map((levelId) =>
      createLocalLevelNode(allocLocalId(), levelId, referencedById.get(levelId)),
    );
    const destIndex = fromPlacement && index != null
      ? index
      : collectSiblingItems(packItemsSourceRef.current, destParentId).length;
    const newTree = insertNodesAtPosition(packItemsSourceRef.current, nodes, destParentId, destIndex);
    if (!newTree) {
      toast.error(t('packDetail.addLevel.error'));
      return;
    }
    applyItemsDraft(newTree, destParentId);
    closePlacement();
    closeLevelInsertConfirm();
    if (missing.length > 0) {
      toast.error(t('packDetail.addLevel.error'));
    }
  }, [allocLocalId, applyItemsDraft, closePlacement, closeLevelInsertConfirm, t]);

  const requestLevelInsert = useCallback(async ({
    levelIds,
    parentId,
    index = null,
    fromPlacement = false,
  }) => {
    if (fromPlacement) {
      setPlacementSubmitting(true);
    } else {
      setLevelInsertSubmitting(true);
    }

    try {
      const { validLevelIds, invalid } = await classifyDraftLevelInsert(
        levelIds,
        parentId ?? 0,
      );

      if (invalid.length === 0) {
        await submitValidatedLevelInsert({
          validLevelIds,
          parentId: parentId ?? 0,
          index,
          fromPlacement,
        });
        return;
      }

      setLevelInsertConfirm({
        open: true,
        validLevelIds,
        invalid,
        parentId: parentId ?? 0,
        index,
        skippedCount: invalid.length,
        fromPlacement,
      });
    } catch (error) {
      console.error('Level insert validation failed:', error);
      toast.error(error.response?.data?.error || t('packDetail.addLevel.error'));
    } finally {
      if (fromPlacement) {
        setPlacementSubmitting(false);
      } else {
        setLevelInsertSubmitting(false);
      }
    }
  }, [classifyDraftLevelInsert, submitValidatedLevelInsert, t]);

  const handleLevelInsertConfirm = useCallback(async () => {
    const { validLevelIds, parentId, index, fromPlacement } = levelInsertConfirm;
    if (validLevelIds.length === 0) return;

    setLevelInsertSubmitting(true);
    try {
      await submitValidatedLevelInsert({
        validLevelIds,
        parentId,
        index,
        fromPlacement,
      });
    } catch (error) {
      console.error('Error adding levels:', error);
      toast.error(error.response?.data?.error || t('packDetail.addLevel.error'));
    } finally {
      setLevelInsertSubmitting(false);
    }
  }, [levelInsertConfirm, submitValidatedLevelInsert, t]);

  const handlePlacementSubmit = useCallback(async ({ mode, parentId, index, name, description, levelIds }) => {
    if (itemsSaveBusy) return;
    setPlacementSubmitting(true);
    try {
      const destParentId = parentId ?? 0;
      const current = packItemsSourceRef.current;

      if (mode === 'move') {
        const movingItem = placement.item;
        if (!movingItem) return;

        if (
          movingItem.type === 'folder' &&
          isFolderMoveIntoDescendant(current, movingItem.id, destParentId)
        ) {
          toast.error(t('packDetail.move.cannotMoveIntoSelf'));
          return;
        }

        const newTree = moveItemToPosition(current, movingItem.id, destParentId, index);
        if (!newTree) {
          toast.error(t('packDetail.move.error'));
          return;
        }

        applyItemsDraft(newTree, destParentId);
        closePlacement();
      } else if (mode === 'add-folder') {
        if (hasSiblingNameConflict(current, destParentId, name)) {
          toast.error(t('packDetail.editItems.nameConflict', { name: String(name || '').trim() }));
          return;
        }
        if (!assertCanAddItems()) return;
        const node = createLocalFolderNode(allocLocalId(), name, description ?? null);
        const newTree = insertNodesAtPosition(current, [node], destParentId, index);
        if (!newTree) {
          toast.error(t('packDetail.createFolder.error'));
          return;
        }
        applyItemsDraft(newTree, destParentId);
        closePlacement();
      } else if (mode === 'add-note') {
        if (hasSiblingNameConflict(current, destParentId, name)) {
          toast.error(t('packDetail.editItems.nameConflict', { name: String(name || '').trim() }));
          return;
        }
        if (!assertCanAddItems()) return;
        const node = createLocalNoteNode(allocLocalId(), name, description ?? null);
        const newTree = insertNodesAtPosition(current, [node], destParentId, index);
        if (!newTree) {
          toast.error(t('packDetail.createNote.error'));
          return;
        }
        applyItemsDraft(newTree, destParentId);
        closePlacement();
      } else if (mode === 'add-level') {
        await requestLevelInsert({
          levelIds,
          parentId: destParentId,
          index,
          fromPlacement: true,
        });
      }
    } catch (error) {
      console.error('Placement submit failed:', error);
      const message =
        error.response?.data?.error ||
        (mode === 'move'
          ? t('packDetail.move.error')
          : mode === 'add-folder'
            ? t('packDetail.createFolder.error')
            : mode === 'add-note'
              ? t('packDetail.createNote.error')
              : t('packDetail.addLevel.error'));
      toast.error(message);
    } finally {
      setPlacementSubmitting(false);
    }
  }, [
    placement.item,
    applyItemsDraft,
    closePlacement,
    requestLevelInsert,
    allocLocalId,
    assertCanAddItems,
    itemsSaveBusy,
    t,
  ]);

  // Handle adding new level (supports single ID or comma-separated IDs for bulk insert)
  const handleAddLevel = async () => {
    if (itemsSaveBusy) return;
    const levelId = prompt(t('packDetail.addLevel.prompt'));
    if (!levelId?.trim()) return;

    await requestLevelInsert({
      levelIds: levelId,
      parentId: 0,
      fromPlacement: false,
    });
  };

  const handlePackDownloadClick = () => {
    if (!pack) return;
    setDownloadContext({
      type: 'pack',
      name: pack.name,
      sizeSummary: packSizeSummary,
      folderId: null
    });
  };

  const handleFolderDownload = useCallback((folderItem) => {
    if (!folderItem) return;
    const summary = summarizeFolderSize(folderItem);
    setDownloadContext({
      type: 'folder',
      name: folderItem.name,
      sizeSummary: summary,
      folderId: folderItem.id
    });
  }, []);

  const handleCloseDownloadPopup = () => setDownloadContext(null);

  const handleRequestDownload = useCallback(async (downloadId, options = {}) => {
    if (!downloadContext || !pack?.id) {
      throw new Error('Missing download context.');
    }

    const payload = {};
    if (downloadContext.folderId) {
      payload.folderId = downloadContext.folderId;
    }
    // Pass the client-generated downloadId for progress tracking
    if (downloadId) {
      payload.downloadId = downloadId;
    }
    if (options.trimFolderNames !== undefined) {
      payload.trimFolderNames = options.trimFolderNames;
    }

    const response = await api.post(
      routes.database.levels.packs.downloadLink(pack.id),
      payload
    );

    return response.data;
  }, [downloadContext, pack?.id]);

  const openEditFolder = useCallback((item) => {
    setEditFolderItem(item);
  }, []);

  const closeEditFolder = useCallback(() => {
    if (editFolderSubmitting) return;
    setEditFolderItem(null);
  }, [editFolderSubmitting]);

  const handleSaveFolder = useCallback(({ name, description }) => {
    if (!editFolderItem) return;
    const parentId = findTreeParentId(packItemsSourceRef.current, editFolderItem.id) ?? 0;
    if (hasSiblingNameConflict(packItemsSourceRef.current, parentId, name, editFolderItem.id)) {
      toast.error(t('packDetail.editItems.nameConflict', { name: String(name || '').trim() }));
      return;
    }
    const newTree = patchItemInTree(packItemsSourceRef.current, editFolderItem.id, {
      name: String(name || '').trim(),
      description: description ?? null,
    });
    if (!newTree) {
      toast.error(t('packDetail.editFolder.error'));
      return;
    }
    applyItemsDraft(newTree);
    setEditFolderItem(null);
  }, [editFolderItem, applyItemsDraft, t]);

  const openEditNote = useCallback((item) => {
    setEditNoteItem(item);
  }, []);

  const closeEditNote = useCallback(() => {
    if (editNoteSubmitting) return;
    setEditNoteItem(null);
  }, [editNoteSubmitting]);

  const handleSaveNote = useCallback(({ name, description }) => {
    if (!editNoteItem) return;
    const parentId = findTreeParentId(packItemsSourceRef.current, editNoteItem.id) ?? 0;
    if (hasSiblingNameConflict(packItemsSourceRef.current, parentId, name, editNoteItem.id)) {
      toast.error(t('packDetail.editItems.nameConflict', { name: String(name || '').trim() }));
      return;
    }
    const newTree = patchItemInTree(packItemsSourceRef.current, editNoteItem.id, {
      name: String(name || '').trim(),
      description: description ?? null,
    });
    if (!newTree) {
      toast.error(t('packDetail.editNote.error'));
      return;
    }
    applyItemsDraft(newTree);
    setEditNoteItem(null);
  }, [editNoteItem, applyItemsDraft, t]);

  // Handle delete item
  const handleDeleteItem = (item) => {
    if (itemsSaveBusy) return;
    const confirmMessage = item?.type === 'folder'
      ? t('packDetail.deleteFolder.confirm', { name: item.name })
      : item?.type === 'note'
        ? t('packDetail.deleteNote.confirm', { name: item.name })
        : t('packDetail.deleteLevel.confirm');
    
    if (!confirm(confirmMessage)) return;

    const newTree = removeItemFromTree(packItemsSourceRef.current, item.id);
    if (!newTree) {
      toast.error(t('packDetail.deleteItem.error'));
      return;
    }
    applyItemsDraft(newTree);
  };

  // Helper to find item by ID in tree
  const findItem = (items, itemId) => {
    for (const item of items) {
      if (item.id === itemId) return item;
      if (item.children) {
        const found = findItem(item.children, itemId);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper to find parent of an item
  const findParent = (items, itemId, parent = null) => {
    for (const item of items) {
      if (item.id === itemId) return parent;
      if (item.children) {
        const found = findParent(item.children, itemId, item);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };


  const findParentId = (items, itemId) => {
    const parentItem = findParent(items, itemId);
    if (parentItem === undefined) {
      return undefined;
    }
    return parentItem?.id ?? 0;
  };

  const getChildList = (items, parentId) => {
    if (parentId === 0) {
      return items;
    }

    const parentItem = findItem(items, parentId);
    if (!parentItem) {
      return null;
    }

    if (!parentItem.children) {
      parentItem.children = [];
    }

    return parentItem.children;
  };

  const moveItemInTree = (items, { sourceParentId, sourceIndex, destinationParentId, destinationIndex }) => {

    const sourceList = getChildList(items, sourceParentId);
    const destinationList = getChildList(items, destinationParentId);

    if (!sourceList || !destinationList) {
      return false;
    }

    if (sourceIndex < 0 || sourceIndex >= sourceList.length) {
      return false;
    }

    const [movedItem] = sourceList.splice(sourceIndex, 1);

    if (!movedItem) {
      return false;
    }

    let targetIndex = destinationIndex;
    if (sourceParentId === destinationParentId && destinationIndex > sourceIndex) {
      targetIndex = destinationIndex;
    }

    if (targetIndex < 0) {
      targetIndex = 0;
    }

    if (targetIndex > destinationList.length) {
      targetIndex = destinationList.length;
    }

    destinationList.splice(targetIndex, 0, movedItem);
    return true;
  };

  // Track mouse position for manual collision detection
  useEffect(() => {
    const handleMouseMove = (e) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Manual collision detection - find which folder the mouse is over
  const detectFolderAtPoint = (x, y) => {
    if (!window.__folderDroppables) return null;
    
    for (const [folderId, info] of window.__folderDroppables) {
      const el = info.element;
      if (!el) continue;
      
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        // Mouse is inside this folder's droppable area
        // Calculate the drop index based on Y position
        const children = el.children;
        let dropIndex = info.childCount; // Default to end
        
        for (let i = 0; i < children.length; i++) {
          const childRect = children[i].getBoundingClientRect();
          const childMidY = childRect.top + childRect.height / 2;
          if (y < childMidY) {
            dropIndex = i;
            break;
          }
        }
        
        return { folderId, dropIndex };
      }
    }
    return null;
  };

  // Handle drag start
  const handleDragStart = () => {
    // Mouse tracking is already active via useEffect
  };

  // Handle drag update - not needed for manual collision detection
  const handleDragUpdate = () => {
    // We use mouse position tracking instead
  };

  // Handle drag end with DnD context
  const handleDragEnd = (result) => {
    if (!isEditingItems || itemsSaveBusy || !result.destination || !pack?.items) {
      return;
    }

    const { source, destination, draggableId } = result;
    let sourceParentId = parseDroppableId(source.droppableId);
    let destinationParentId = parseDroppableId(destination.droppableId);
    let destinationIndex = destination.index;

    // Manual collision detection: if library says destination is root,
    // check if mouse is actually over a folder droppable
    if (destinationParentId === 0 && sourceParentId !== 0) {
      const mousePos = lastMousePosRef.current;
      const manualDetection = detectFolderAtPoint(mousePos.x, mousePos.y);
      
      if (manualDetection) {
        // Override with manual detection
        destinationParentId = manualDetection.folderId;
        destinationIndex = manualDetection.dropIndex;
      }
    }

    if (sourceParentId === destinationParentId && source.index === destinationIndex) {
      return;
    }

    const activeId = parseInt(draggableId.replace('item-', ''), 10);
    const activeItem = findItem(packItems, activeId);

    if (!activeItem) {
      console.error('Active item not found');
      return;
    }

    if (activeItem.type === 'folder') {
      let currentParentId = destinationParentId;
      while (currentParentId !== 0 && currentParentId !== undefined) {
        if (currentParentId === activeId) {
          toast.error(t('packDetail.move.cannotMoveIntoSelf'));
          return;
        }
        const nextParentId = findParentId(packItems, currentParentId);
        if (nextParentId === undefined || nextParentId === 0) {
          break;
        }
        currentParentId = nextParentId;
      }
    }

    const newTree = cloneTree(packItemsSourceRef.current);
    const moveSucceeded = moveItemInTree(newTree, {
      sourceParentId,
      sourceIndex: source.index,
      destinationParentId,
      destinationIndex
    });

    if (!moveSucceeded) {
      return;
    }

    applyItemsDraft(newTree, destinationParentId);
  };

  // Get view mode icon and text
  const getViewModeIcon = () => {
    if (!pack) return null;
    
    switch (parseInt(pack.viewMode)) {
      case 1: // PUBLIC
        return <EyeIcon className="view-icon public" />;
      case 2: // LINKONLY
        return <UsersIcon className="view-icon linkonly" />;
      case 3: // PRIVATE
        return <LockIcon className="view-icon private" />;
      case 4: // FORCED_PRIVATE
        return <LockIcon className="view-icon forced-private" />;
      default:
        return <EyeIcon className="view-icon public" />;
    }
  };

  const getViewModeText = () => {
    if (!pack) return '';
    
    switch (parseInt(pack.viewMode)) {
      case 1: return t('packDetail.viewMode.public');
      case 2: return t('packDetail.viewMode.linkonly');
      case 3: return t('packDetail.viewMode.private');
      case 4: return t('packDetail.viewMode.forcedPrivate');
      default: return t('packDetail.viewMode.public');
    }
  };

  const canManagePack = Boolean(user && pack && (
    pack.ownerId === user.id ||
    hasFlag(user, permissionFlags.SUPER_ADMIN)
  ));
  const canEditItems = canManagePack && isEditingItems;

  if (loading) {
    return (
      <div className="pack-detail-page">
        
        <div className="loader loader-pass-detail" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="pack-detail-page">
        
        <div className="error">
          <h2>{t('packDetail.error.title')}</h2>
          <p>{t('packDetail.error.message')}</p>
          <button 
            className="retry-btn"
            onClick={() => fetchPack(false)}
          >
            {t('packDetail.error.retry')}
          </button>
          <Link className="back-btn" style={{alignSelf: 'center'}} to="/packs">
            {t('packDetail.backToPacks')}
          </Link>
        </div>
      </div>
    );
  }

  const isDownloadPopupOpen = Boolean(downloadContext);
  const popupContextName = downloadContext?.name || pack?.name;
  const popupSizeSummary = downloadContext?.sizeSummary || packSizeSummary;
  const packOwner = pack.packOwner;
  const ownerProfileTo = packOwner?.creatorId
    ? `/creator/${packOwner.creatorId}`
    : packOwner?.playerId
      ? `/profile/${packOwner.playerId}`
      : null;

  return (
    <div className="pack-detail-page">
      {packMeta ? <MetaTags {...packMeta} /> : null}
      
      
      <div className="pack-body page-content-70rem">
        <div className="pack-top-bar">
          <Link className="back-btn" to="/packs">
            <ChevronIcon size={28} direction="left" />
            <span>{t('packDetail.backToPacks')}</span>
          </Link>
          <button
            type="button"
            className="export-btn"
            onClick={() => setShowExportPopup(true)}
            disabled={packExportDisabled}
            data-tooltip-id="export-pack-tooltip"
            data-tooltip-content={
              packExportDisabled
                ? t('packDetail.items.empty')
                : t('packDetail.actions.exportAs')
            }
            data-tooltip-place="bottom"
          >
            <ExternalLinkIcon color="#ffffff" size="20px" />
            <span>{t('packDetail.actions.exportAs')}</span>
          </button>
          <Tooltip id="export-pack-tooltip" place="bottom" noArrow />
        </div>
          <div className="header-container">
        {/* Header */}
        <div className="header">
          {showPackProgress ? (
            <div
              className={`pack-clear-progress${packClears.percent >= 100 ? ' is-complete' : ''}${packClears.percent >= 100 && packClears.allPureXPerfect ? ' is-pure-xperfect' : ''}`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={packClears.total}
              aria-valuenow={packClears.cleared}
              aria-label={t('packDetail.folderProgress.aria', {
                percent: packClears.percent,
                cleared: packClears.cleared,
                total: packClears.total,
              })}
            >
              <div className="pack-clear-progress__track">
                <div
                  className="pack-clear-progress__fill"
                  style={{ width: `${packClears.percent}%` }}
                />
              </div>
              <span className="pack-clear-progress__label">
                {t('packDetail.folderProgress.label', {
                  percent: packClears.percent,
                  cleared: packClears.cleared,
                  total: packClears.total,
                })}
              </span>
            </div>
          ) : null}

          <div className="title-section">
            <div className="title-content">
              <div className="icon">
                {pack.iconUrl ? (
                  <img 
                    src={selectIconSize(pack.iconUrl, ICON_SIZE.MEDIUM)} 
                    alt={pack.name}
                    className="icon-img"
                  />
                ) : (
                  <div className="icon-placeholder">
                    📦
                  </div>
                )}
              </div>
              <div className="title-text">
                <h1 className="title">
                  {pack.name}
                  {pack.isPinned && (
                    <PinIcon className="pinned-icon" />
                  )}
                </h1>
                <div className="pack-description__meta">
                  <div className="owner">
                    {ownerProfileTo ? (
                      <Link className="owner-link" to={ownerProfileTo}>
                        <UserAvatar
                          {...userAvatarUrls(packOwner)}
                          className="owner-avatar"
                        />
                        <span className="owner-name">
                          {t('packDetail.by')} {packOwner?.username || 'Unknown'}
                        </span>
                      </Link>
                    ) : (
                      <>
                        <UserAvatar
                          {...userAvatarUrls(packOwner)}
                          className="owner-avatar"
                        />
                        <span className="owner-name">
                          {t('packDetail.by')} {packOwner?.username || 'Unknown'}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="view-mode">
                    {getViewModeIcon()}
                    <span className="view-mode-text">
                      {getViewModeText()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
<div className="actions-container">
          <div className="actions">
            <button
              className="download-btn"
              onClick={handlePackDownloadClick}
              disabled={packDownloadDisabled || !user}
              data-tooltip-id="download-pack-tooltip"
              data-tooltip-content={
                packDownloadDisabled
                  ? 'No downloadable levels available yet'
                  : !user
                    ? 'You must be logged in to download a pack'
                  : `${t('packDetail.actions.downloadPack')} (${packSizeLabel.sizeLabel})${
                      packSizeLabel.missingCount > 0
                        ? ` ${t('packDetail.download.estimatedLong', { count: packSizeLabel.missingCount })}`
                        : ''
                    }`
              }
              data-tooltip-place="bottom"
            >
              <DownloadIcon color="#ffffff" size={"20px"} />
              <span>{t('packDetail.actions.downloadPack')}</span>
            </button>
            <Tooltip id="download-pack-tooltip" place="bottom" noArrow />
          </div>
          {canManagePack && (
            <div className="actions">
              <button
                className="edit-btn"
                onClick={() => setShowEditPopup(true)}
                title={t('packDetail.actions.edit')}
              >
                <EditIcon />
                <span>{t('packDetail.actions.edit')}</span>
              </button>
            </div>
          )}

          {user && (
            <div className="actions">
              <button
                className="favorite-btn"
                onClick={handleFavoriteClick}
              >
                <LikeIcon color={pack.isFavorited ? "#ffffff" : "none"} />
                <span>{pack.isFavorited ? t('packDetail.actions.removeFromFavorites') : t('packDetail.actions.addToFavorites')}</span>
              </button>
            </div>
          )}
          </div>
        </div>

        <PackDescription
          description={pack.description}
          variant="detail"
          itemCount={totalRenderableItems}
          footer={(
            <div className="pack-description__stats">
              <div className="pack-description__stats-main">
                <div className="pack-description__stat">
                  <span className="pack-description__stat-value">{totalLevels}</span>
                  <span className="pack-description__stat-label">{t('packDetail.stats.levels')}</span>
                </div>
                <div className="pack-description__stat">
                  <span className="pack-description__stat-value">{pack.items?.length || 0}</span>
                  <span className="pack-description__stat-label">{t('packDetail.stats.items')}</span>
                </div>
                <div className="pack-description__stat">
                  <span className="pack-description__stat-value">{formatDate(pack?.createdAt, i18next?.language)}</span>
                  <span className="pack-description__stat-label">{t('packDetail.stats.created')}</span>
                </div>
              </div>
              <div className="pack-description__stats-curations">
                <CurationTypeCountView
                  curationTypeCounts={packCurationTypeCounts}
                  curationTypesDict={curationTypesDict || {}}
                  dialogLabel={t('packDetail.stats.curationPanelDialog')}
                />
              </div>
            </div>
          )}
        />

        </div>

        {/* Content */}
        <div className="content" ref={scrollRef}>
          <div className="levels-header">
          {pack?.items && pack.items.length > 0 && getAllFolderIds(packItems).length > 0 && (
            <div className="tree-controls">
              {areAllFoldersExpanded() ? (
                <button
                  className="collapse-expand-btn"
                  onClick={() => handleCollapseExpandAll(false)}
                  title={t('packDetail.actions.collapseAll')}
                >
                  📁➖ {t('packDetail.actions.collapseAll')}
                </button>
              ) : (
                <button
                  className="collapse-expand-btn"
                  onClick={() => handleCollapseExpandAll(true)}
                  title={t('packDetail.actions.expandAll')}
                >
                  📁➕ {t('packDetail.actions.expandAll')}
                </button>
              )}
            </div>
          )}
            <h2 className="levels-title">
              {t('packDetail.items.title')}
            </h2>
            <div className="levels-header-right">
              {canManagePack && !isEditingItems && (
                <button
                  type="button"
                  className="btn-fill-neutral"
                  onClick={enterEditItems}
                >
                  <EditIcon size="18px" />
                  {t('packDetail.actions.editItems')}
                </button>
              )}
              {canEditItems && (
                <div className="items-edit-toolbar">
                  <div className="items-edit-toolbar__history">
                    <button
                      type="button"
                      className={canUndo && !itemsSaveBusy ? "btn-fill-primary" : "btn-fill-neutral"}
                      onClick={undoItems}
                      disabled={itemsSaveBusy || !canUndo}
                      data-tooltip-id="pack-items-undo"
                    >
                      <UndoIcon />
                      {t('buttons.undo', { ns: 'common' })}
                    </button>
                    <button
                      type="button"
                      className={canRedo && !itemsSaveBusy ? "btn-fill-primary" : "btn-fill-neutral"}
                      onClick={redoItems}
                      disabled={itemsSaveBusy || !canRedo}
                      data-tooltip-id="pack-items-redo"
                    >
                      <RedoIcon />
                      {t('buttons.redo', { ns: 'common' })}
                    </button>
                    <Tooltip id="pack-items-undo" place="top" noArrow>
                      {t('packDetail.editItems.undoHint')}
                    </Tooltip>
                    <Tooltip id="pack-items-redo" place="top" noArrow>
                      {t('packDetail.editItems.redoHint')}
                    </Tooltip>
                  </div>
                  <div className="items-edit-toolbar__persist">
                    <button
                      type="button"
                      className="btn-fill-neutral"
                      onClick={requestExitEditItems}
                      disabled={itemsSaveBusy}
                    >
                      {t('buttons.cancel', { ns: 'common' })}
                    </button>
                    <button
                      type="button"
                      className="btn-fill-primary"
                      onClick={handleSaveItems}
                      disabled={itemsSaveBusy || !isItemsDirty}
                    >
                      {t('buttons.save', { ns: 'common' })}
                    </button>
                  </div>
                </div>
              )}
              {canEditItems && (
                <div className={`add-buttons${itemsSaveBusy ? ' is-disabled' : ''}`}>
                  <div className="add-buttons__group">
                    <button
                      type="button"
                      className="add-btn btn-fill-glass"
                      onClick={handleAddFolder}
                      title={t('packDetail.actions.addFolder')}
                    >
                      <PlusIcon /> 📁 {t('packDetail.actions.addFolder')}
                    </button>
                    <button
                      type="button"
                      className="add-to-folder-btn btn-fill-glass btn-icon"
                      onClick={openAddFolderPlacement}
                      title={t('packDetail.actions.addToFolder')}
                      aria-label={t('packDetail.actions.addToFolder')}
                    >
                      ➔📁
                    </button>
                  </div>
                  <div className="add-buttons__group">
                    <button
                      type="button"
                      className="add-btn btn-fill-glass"
                      onClick={handleAddLevel}
                      title={t('packDetail.actions.addLevel')}
                    >
                      <PlusIcon /> 🎵 {t('packDetail.actions.addLevel')}
                    </button>
                    <button
                      type="button"
                      className="add-to-folder-btn btn-fill-glass btn-icon"
                      onClick={openAddLevelPlacement}
                      title={t('packDetail.actions.addToFolder')}
                      aria-label={t('packDetail.actions.addToFolder')}
                    >
                      ➔📁
                    </button>
                  </div>
                  <div className="add-buttons__group">
                    <button
                      type="button"
                      className="add-btn btn-fill-glass"
                      onClick={openAddNotePlacement}
                      title={t('packDetail.actions.addNote')}
                    >
                      <PlusIcon /> 📝 {t('packDetail.actions.addNote')}
                    </button>
                  </div>
                </div>
              )}
              {canEditItems && totalRenderableItems > 1 && (
                <span className="drag-hint">
                  {t('packDetail.items.dragHint')}
                </span>
              )}
            </div>
          </div>

          {pack.items && pack.items.length > 0 ? (
            <DragDropContext onDragStart={handleDragStart} onDragUpdate={handleDragUpdate} onDragEnd={handleDragEnd}>
              <Droppable 
                droppableId={ROOT_DROPPABLE_ID} 
                type="ITEM"
                renderClone={(provided, snapshot, rubric) => {
                  // Find the item being dragged from the flat list of all items
                  const draggedItemId = parseInt(rubric.draggableId.replace('item-', ''), 10);
                  const draggedItem = findItem(packItems, draggedItemId);
                  
                  return (
                    <RenderClone
                      item={draggedItem}
                      provided={provided}
                      snapshot={snapshot}
                      user={user}
                      canEdit={canEditItems}
                    />
                  );
                }}
              >
                {(provided, snapshot) => (
                  <div
                    className={`items-list ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {sortedRootItems.map((item, index) => (
                      <PackItem
                        key={item.id}
                        item={item}
                        index={index}
                        depth={0}
                        expandedFolders={expandedFolders}
                        onToggleExpanded={toggleFolderExpanded}
                        canEdit={canEditItems}
                        user={user}
                        onEditFolder={openEditFolder}
                        onEditNote={openEditNote}
                        onDeleteItem={handleDeleteItem}
                        onDownloadFolder={handleFolderDownload}
                        onRequestMove={openMovePlacement}
                        allItems={packItems}
                        findItemFn={findItem}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="empty">
              <p>{t('packDetail.items.empty')}</p>
              {canManagePack && !isEditingItems && (
                <div className="empty-actions">
                  <button
                    type="button"
                    className="btn-fill-neutral"
                    onClick={enterEditItems}
                  >
                    <EditIcon size="18px" />
                    {t('packDetail.actions.editItems')}
                  </button>
                </div>
              )}
              {canEditItems && (
                <div className="empty-actions">
                  <div className="add-buttons__group">
                    <button type="button" className="add-btn btn-fill-glass" onClick={handleAddFolder}>
                      <PlusIcon /> {t('packDetail.actions.addFolder')}
                    </button>
                    <button
                      type="button"
                      className="add-to-folder-btn btn-fill-glass btn-icon"
                      onClick={openAddFolderPlacement}
                      title={t('packDetail.actions.addToFolder')}
                      aria-label={t('packDetail.actions.addToFolder')}
                    >
                      ➔📁
                    </button>
                  </div>
                  <div className="add-buttons__group">
                    <button type="button" className="add-btn btn-fill-glass" onClick={handleAddLevel}>
                      <PlusIcon /> {t('packDetail.actions.addLevel')}
                    </button>
                    <button
                      type="button"
                      className="add-to-folder-btn btn-fill-glass btn-icon"
                      onClick={openAddLevelPlacement}
                      title={t('packDetail.actions.addToFolder')}
                      aria-label={t('packDetail.actions.addToFolder')}
                    >
                      ➔📁
                    </button>
                  </div>
                  <div className="add-buttons__group">
                    <button
                      type="button"
                      className="add-btn btn-fill-glass"
                      onClick={openAddNotePlacement}
                    >
                      <PlusIcon /> {t('packDetail.actions.addNote')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <ScrollButton targetRef={scrollRef} />
      </div>

      <PackDownloadPopup
        isOpen={isDownloadPopupOpen}
        onClose={handleCloseDownloadPopup}
        contextName={popupContextName}
        sizeSummary={popupSizeSummary}
        onRequestDownload={handleRequestDownload}
      />

      <PackExportPopup
        isOpen={showExportPopup}
        onClose={() => setShowExportPopup(false)}
        packName={pack?.name}
        pack={pack}
        packItems={packItems}
      />

      <EditFolderPopup
        isOpen={Boolean(editFolderItem)}
        folder={editFolderItem}
        onClose={closeEditFolder}
        onSave={handleSaveFolder}
        submitting={editFolderSubmitting}
      />

      <EditNotePopup
        isOpen={Boolean(editNoteItem)}
        note={editNoteItem}
        onClose={closeEditNote}
        onSave={handleSaveNote}
        submitting={editNoteSubmitting}
      />

      <PackItemPlacementPopup
        isOpen={placement.open}
        onClose={closePlacement}
        mode={placement.mode}
        packId={id}
        packItems={packItems}
        movingItem={placement.item}
        onSubmit={handlePlacementSubmit}
        submitting={placementSubmitting}
      />

      <PackAddLevelsConfirmPopup
        isOpen={levelInsertConfirm.open}
        invalid={levelInsertConfirm.invalid}
        validCount={levelInsertConfirm.validLevelIds.length}
        allInvalid={levelInsertConfirm.validLevelIds.length === 0}
        onConfirm={handleLevelInsertConfirm}
        onCancel={closeLevelInsertConfirm}
        submitting={levelInsertSubmitting}
      />

      {showEditPopup && (
        <EditPackPopup
          pack={pack}
          onClose={() => setShowEditPopup(false)}
          onUpdate={handleEditPack}
          onDelete={handleDeletePack}
        />
      )}

      {/* Tooltips */}
      <Tooltip id="edit-pack-tooltip" />
      <Tooltip id="favorite-pack-tooltip" />
    </div>
  );
};

export default PackDetailPage;