// tuf-search: #LevelCreditsEditPopup #levelCreditsEditPopup #popups #creators #creditManagement
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDndContext,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { CloseButton } from '@/components/common/buttons';
import { CustomSelect } from '@/components/common/selectors';
import { DragHandleIcon, SearchIcon } from '@/components/common/icons';
import MarqueeText from '@/components/common/display/MarqueeText/MarqueeText';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import toast from 'react-hot-toast';
import './levelcreditseditpopup.css';

const CreditRole = {
  CHARTER: 'charter',
  VFXER: 'vfxer',
};

const CHARTER_ZONE_ID = 'charter-zone';
const VFXER_ZONE_ID = 'vfxer-zone';
const MAX_CREATOR_RESULTS = 100;

const roleFromZoneId = (zoneId) => {
  if (zoneId === CHARTER_ZONE_ID) return CreditRole.CHARTER;
  if (zoneId === VFXER_ZONE_ID) return CreditRole.VFXER;
  return null;
};

const isZoneId = (id) => id === CHARTER_ZONE_ID || id === VFXER_ZONE_ID;

// A creator appears at most once per role, so role+id is a stable, unique
// sortable id. It only changes on drop (when the role actually changes), never
// mid-drag, which keeps dnd-kit's active tracking consistent.
const getSortableId = (creator) => `${creator.role}-${creator.id}`;

const parseSortableId = (id) => {
  const str = String(id);
  const dash = str.indexOf('-');
  if (dash < 0) return null;
  const role = str.slice(0, dash);
  const creatorId = Number(str.slice(dash + 1));
  if (
    (role !== CreditRole.CHARTER && role !== CreditRole.VFXER) ||
    Number.isNaN(creatorId)
  ) {
    return null;
  }
  return { role, creatorId };
};

// Zone an over/active droppable belongs to, read from data we attach to every
// droppable so cross-zone logic never depends on id string parsing.
const zoneIdOfEntry = (entry) => {
  if (!entry) return null;
  if (isZoneId(entry.id)) return entry.id;
  return entry.data?.current?.zoneId ?? null;
};

// Collision detection that keeps every result inside the single zone the
// pointer is currently within, so the two containers never leak targets (or
// auto-scroll) into one another.
const isolatedZoneCollision = (args) => {
  const { droppableContainers } = args;

  const pointerHits = pointerWithin(args);
  const baseHits = pointerHits.length > 0 ? pointerHits : rectIntersection(args);

  let zoneId = baseHits.find((c) => isZoneId(c.id))?.id ?? null;

  if (!zoneId) {
    const zoneContainers = droppableContainers.filter((c) => isZoneId(c.id));
    zoneId =
      closestCenter({ ...args, droppableContainers: zoneContainers })[0]?.id ?? null;
  }

  if (!zoneId) return [];

  const zoneItems = droppableContainers.filter(
    (c) => !isZoneId(c.id) && c.data?.current?.zoneId === zoneId && !c.disabled,
  );

  if (zoneItems.length > 0) {
    const within = closestCenter({ ...args, droppableContainers: zoneItems });
    if (within.length > 0) return within;
  }

  const zoneContainer = droppableContainers.find((c) => c.id === zoneId && !c.disabled);
  return zoneContainer ? [{ id: zoneId }] : [];
};

// The only place the arrangement mutates. Runs once on drop, so nothing reflows
// during the drag (the source of the previous jitter + scroll leak).
const computeDrop = (prev, event) => {
  const { active, over } = event;
  const activeParsed = parseSortableId(active.id);
  if (!over || !activeParsed) return { next: prev, duplicate: false };

  const sourceRole = activeParsed.role;
  const destRole = isZoneId(over.id)
    ? roleFromZoneId(over.id)
    : parseSortableId(over.id)?.role ?? null;
  if (!destRole) return { next: prev, duplicate: false };

  let charters = prev.filter((c) => c.role === CreditRole.CHARTER);
  let vfxers = prev.filter((c) => c.role === CreditRole.VFXER);

  if (sourceRole === destRole) {
    const list = sourceRole === CreditRole.CHARTER ? [...charters] : [...vfxers];
    const from = list.findIndex((c) => getSortableId(c) === String(active.id));
    if (from < 0) return { next: prev, duplicate: false };

    const to = isZoneId(over.id)
      ? list.length - 1
      : list.findIndex((c) => getSortableId(c) === String(over.id));
    if (to < 0 || to === from) return { next: prev, duplicate: false };

    const reordered = arrayMove(list, from, to);
    if (sourceRole === CreditRole.CHARTER) charters = reordered;
    else vfxers = reordered;
  } else {
    const source = sourceRole === CreditRole.CHARTER ? [...charters] : [...vfxers];
    const dest = destRole === CreditRole.CHARTER ? [...charters] : [...vfxers];

    const from = source.findIndex((c) => getSortableId(c) === String(active.id));
    if (from < 0) return { next: prev, duplicate: false };

    const moved = source[from];
    if (dest.some((c) => c.id === moved.id)) {
      return { next: prev, duplicate: true };
    }

    source.splice(from, 1);

    let insertAt = dest.length;
    if (!isZoneId(over.id)) {
      const overIndex = dest.findIndex((c) => getSortableId(c) === String(over.id));
      if (overIndex >= 0) {
        const overRect = event.over?.rect;
        const translated = event.active.rect.current?.translated;
        const after =
          overRect && translated
            ? translated.top + translated.height / 2 >
              overRect.top + overRect.height / 2
            : false;
        insertAt = after ? overIndex + 1 : overIndex;
      }
    }

    dest.splice(insertAt, 0, { ...moved, role: destRole });

    if (sourceRole === CreditRole.CHARTER) charters = source;
    else vfxers = source;
    if (destRole === CreditRole.CHARTER) charters = dest;
    else vfxers = dest;
  }

  return { next: [...charters, ...vfxers], duplicate: false };
};

const buildPendingTeamFromLevel = (level) =>
  level.team ? { id: level.team.id, name: level.team.name } : null;

const buildPendingCreatorsFromLevel = (level) =>
  level.currentCreators?.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role || CreditRole.CHARTER,
    isOwner: c.isOwner,
    verificationStatus: c.verificationStatus || 'allowed',
    levelCount: c.levelCount || 0,
    aliases: c.aliases || c.creatorAliases?.map((alias) => alias.name) || [],
  })) || [];

const formatCreatorItemLabel = (creator) => {
  const levelLabel = creator.levelCount === 1 ? 'level' : 'levels';
  const aliasPart =
    creator.aliases?.length > 0
      ? ` • Aliases: ${creator.aliases.join(', ')}`
      : '';
  return `${creator.name} (ID: ${creator.id} • ${creator.levelCount} ${levelLabel})${aliasPart}`;
};

const CreatorNameMarquee = ({ creator }) => {
  const levelLabel = creator.levelCount === 1 ? 'level' : 'levels';
  const aliasPart =
    creator.aliases?.length > 0
      ? ` • Aliases: ${creator.aliases.join(', ')}`
      : '';
  const fullLabel = formatCreatorItemLabel(creator);

  return (
    <MarqueeText
      className="level-credits-edit-popup__creator-marquee"
      title={fullLabel}
    >
      <span className="level-credits-edit-popup__creator-name-primary">{creator.name}</span>
      <span className="level-credits-edit-popup__creator-name-meta">
        {` (ID: ${creator.id} • ${creator.levelCount} ${levelLabel})${aliasPart}`}
      </span>
    </MarqueeText>
  );
};

const matchesCreatorSearch = (creator, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (creator.name?.toLowerCase().includes(q)) return true;
  if (String(creator.id).includes(q)) return true;
  if (creator.aliases?.some((alias) => alias.toLowerCase().includes(q))) return true;
  return false;
};

const SortableCreatorItem = ({
  creator,
  role,
  zoneId,
  zoneModifier,
  dropDisabled,
  onToggleOwner,
  onRemove,
}) => {
  const itemId = getSortableId(creator);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: itemId,
    data: { type: 'creator', role, zoneId, creator },
    // Stay draggable, but stop being a drop target while this zone is blocked
    // so a creator can't be dropped into a role it already holds.
    disabled: { draggable: false, droppable: dropDisabled },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`level-credits-edit-popup__creator-item level-credits-edit-popup__creator-item--${zoneModifier}${isDragging ? ' is-sortable-ghost' : ''}`}
    >
      <button
        type="button"
        className="level-credits-edit-popup__drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <DragHandleIcon />
      </button>
      <div className="level-credits-edit-popup__creator-name">
        <CreatorNameMarquee creator={creator} />
      </div>
      <div className="level-credits-edit-popup__creator-controls">
        <button
          type="button"
          className={`level-credits-edit-popup__toggle-owner${creator.isOwner ? ' is-owner' : ''}`}
          onClick={() => onToggleOwner(creator.id, role)}
        >
          {creator.isOwner ? 'Remove Owner' : 'Make Owner'}
        </button>
        <button
          type="button"
          className="level-credits-edit-popup__remove"
          onClick={() => onRemove(creator.id, role)}
        >
          Remove
        </button>
      </div>
    </div>
  );
};

const CreatorItemPreview = ({ creator }) => (
  <div className="level-credits-edit-popup__creator-item level-credits-edit-popup__creator-item--overlay">
    <div className="level-credits-edit-popup__creator-name">
      <CreatorNameMarquee creator={creator} />
    </div>
  </div>
);

const CreditRoleZone = ({
  zoneId,
  role,
  credits,
  title,
  zoneModifier,
  isDropDisabled,
  onToggleOwner,
  onRemove,
  searchPlaceholder,
  noResultsLabel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { active, over } = useDndContext();

  const { setNodeRef } = useDroppable({
    id: zoneId,
    disabled: isDropDisabled,
    data: { type: 'zone', zoneId, role },
  });

  const filteredCredits = useMemo(
    () => credits.filter((c) => matchesCreatorSearch(c, searchQuery)),
    [credits, searchQuery],
  );

  const sortableIds = useMemo(
    () => filteredCredits.map((c) => getSortableId(c)),
    [filteredCredits],
  );

  const isSearching = searchQuery.trim().length > 0;
  const countLabel = isSearching
    ? `${filteredCredits.length} / ${credits.length}`
    : String(credits.length);

  // Highlight only when an item from the other zone is currently over this one.
  const activeZoneId = zoneIdOfEntry(active);
  const overZoneId = zoneIdOfEntry(over);
  const isCrossZoneTarget =
    Boolean(active) &&
    !isDropDisabled &&
    Boolean(activeZoneId) &&
    activeZoneId !== zoneId &&
    overZoneId === zoneId;

  return (
    <div
      className={`level-credits-edit-popup__credit-zone level-credits-edit-popup__credit-zone--${zoneModifier}${isCrossZoneTarget ? ' is-drag-over' : ''}${isDropDisabled ? ' is-drop-disabled' : ''}`}
    >
      <div className="level-credits-edit-popup__zone-header">
        <span className="level-credits-edit-popup__zone-title">{title}</span>
        <span className="level-credits-edit-popup__zone-count">{countLabel}</span>
        {isDropDisabled && (
          <span className="level-credits-edit-popup__already-exists">Already exists</span>
        )}
      </div>
      <div className="level-credits-edit-popup__zone-search">
        <SearchIcon className="level-credits-edit-popup__zone-search-icon" size="16px" />
        <input
          type="search"
          className="level-credits-edit-popup__zone-search-input"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label={searchPlaceholder}
        />
      </div>
      <div ref={setNodeRef} className="level-credits-edit-popup__zone-list">
        {credits.length === 0 && (
          <p className="level-credits-edit-popup__zone-empty">Drop creators here</p>
        )}
        {credits.length > 0 && filteredCredits.length === 0 && (
          <p className="level-credits-edit-popup__zone-empty">{noResultsLabel}</p>
        )}
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {filteredCredits.map((creator) => (
            <SortableCreatorItem
              key={getSortableId(creator)}
              creator={creator}
              role={role}
              zoneId={zoneId}
              zoneModifier={zoneModifier}
              dropDisabled={isDropDisabled}
              onToggleOwner={onToggleOwner}
              onRemove={onRemove}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

export const LevelCreditsEditPopup = ({
  level,
  teamsList = [],
  excludeAliases = false,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation(['components', 'common']);
  const popupRef = useRef(null);

  const [pendingTeam, setPendingTeam] = useState(() => buildPendingTeamFromLevel(level));
  const [pendingCreators, setPendingCreators] = useState(() => buildPendingCreatorsFromLevel(level));
  const [activeId, setActiveId] = useState(null);
  const [draggingInfo, setDraggingInfo] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [fetchedCreators, setFetchedCreators] = useState(null);
  const [creatorToAddSearchQuery, setCreatorToAddSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useBodyScrollLock(true);

  const requestClose = useCallback(() => {
    if (
      hasUnsavedChanges &&
      !window.confirm(t('levelPopups.edit.confirmations.unsavedChanges', { ns: 'components' }))
    ) {
      return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose, t]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        requestClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [requestClose]);

  useEffect(() => {
    let cancelToken;

    const fetchAvailableCreators = async () => {
      try {
        if (cancelToken) {
          cancelToken.cancel('New search initiated');
        }
        cancelToken = api.CancelToken.source();
        setFetchedCreators(null);

        const params = new URLSearchParams({
          page: 1,
          limit: MAX_CREATOR_RESULTS,
          search: creatorToAddSearchQuery,
          excludeAliases,
        });

        const response = await api.get(`${routes.database.creators.root()}?${params}`, {
          cancelToken: cancelToken.token,
        });

        setFetchedCreators(response.data.results);
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error('Error fetching creators:', error);
          setFetchedCreators([]);
        }
      }
    };

    fetchAvailableCreators();

    return () => {
      if (cancelToken) {
        cancelToken.cancel('Component unmounted or search changed');
      }
    };
  }, [creatorToAddSearchQuery, excludeAliases]);

  const availableCreators = useMemo(() => {
    if (fetchedCreators === null) return null;
    return fetchedCreators.filter(
      (creator) =>
        !pendingCreators.some(
          (pc) => pc.id === creator.id && pc.role === creator.role,
        ),
    );
  }, [fetchedCreators, pendingCreators]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      requestClose();
    }
  };

  const handleTeamInputChange = (input) => {
    if (!input) {
      setPendingTeam(null);
      setHasUnsavedChanges(true);
      return;
    }
    const matchingTeam = teamsList?.find(
      (team) => team.name.toLowerCase() === input?.toLowerCase(),
    );
    const newPendingTeam = matchingTeam
      ? { id: matchingTeam.id, name: matchingTeam.name }
      : { name: input };
    setPendingTeam(newPendingTeam);
    setHasUnsavedChanges(true);
  };

  const handleAddCreator = (creator) => {
    const existingCreatorRoles = pendingCreators
      .filter((c) => c.id === creator.id)
      .map((c) => c.role);

    let assignedRole = CreditRole.CHARTER;
    if (existingCreatorRoles.includes(CreditRole.CHARTER)) {
      assignedRole = CreditRole.VFXER;
    } else if (existingCreatorRoles.includes(CreditRole.VFXER)) {
      assignedRole = CreditRole.CHARTER;
    }

    setPendingCreators((prev) => [
      ...prev,
      {
        id: creator.id,
        name: creator.name,
        isOwner: false,
        role: assignedRole,
        verificationStatus: creator.verificationStatus || 'allowed',
        levelCount: creator.credits?.length || 0,
        aliases: creator.creatorAliases?.map((alias) => alias.name) || [],
      },
    ]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveCreator = (creatorId, role) => {
    setPendingCreators((prev) => prev.filter((c) => !(c.id === creatorId && c.role === role)));
    setHasUnsavedChanges(true);
  };

  const handleToggleOwner = (creatorId, role) => {
    setPendingCreators((prev) =>
      prev.map((c) =>
        c.id === creatorId && c.role === role ? { ...c, isOwner: !c.isOwner } : c,
      ),
    );
    setHasUnsavedChanges(true);
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    const parsed = parseSortableId(active.id);
    if (parsed) {
      setDraggingInfo({ creatorId: parsed.creatorId, sourceRole: parsed.role });
    }
  };

  const resetDrag = () => {
    setActiveId(null);
    setDraggingInfo(null);
  };

  const handleDragEnd = (event) => {
    resetDrag();

    const { over } = event;
    if (!over) return;

    // State never changes during the drag, so this closure's pendingCreators
    // is the authoritative current arrangement.
    const { next, duplicate } = computeDrop(pendingCreators, event);

    if (duplicate) {
      const destRole = isZoneId(over.id)
        ? roleFromZoneId(over.id)
        : parseSortableId(over.id)?.role;
      toast.error(
        `Creator already exists as ${destRole === CreditRole.CHARTER ? 'Charter' : 'VFXer'}`,
      );
      return;
    }

    if (next !== pendingCreators) {
      setPendingCreators(next);
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (pendingTeam) {
        await api.put(routes.database.creators.levelTeam(level.id), {
          teamId: pendingTeam.id,
          name: pendingTeam.name,
          members: pendingCreators.map((c) => c.id),
        });
      } else {
        await api.delete(routes.database.creators.levelTeam(level.id));
      }

      const response = await api.put(routes.database.creators.level(level.id), {
        creators: pendingCreators.map((c) => ({
          id: c.id,
          role: c.role,
          isOwner: c.isOwner,
        })),
      });

      if (response.status >= 200 && response.status < 300) {
        const message = response.data?.message || 'Changes saved successfully';
        toast.success(message);
        await onSaved?.();
        onClose();
      } else {
        toast.error(response.data?.message || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving level credits:', error);
      if (error.response?.status >= 200 && error.response?.status < 300) {
        const message = error.response.data?.message || 'Changes saved successfully';
        toast.success(message);
        await onSaved?.();
        onClose();
      } else {
        toast.error(
          error.response?.data?.message ||
            error.response?.data?.error ||
            'Failed to save changes',
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const charterCredits = pendingCreators.filter((c) => c.role === CreditRole.CHARTER);
  const vfxerCredits = pendingCreators.filter((c) => c.role === CreditRole.VFXER);

  // Block dropping a creator into a role it already holds. State is stable
  // during the drag, so these never flip mid-gesture.
  const charterDropDisabled =
    !!draggingInfo &&
    draggingInfo.sourceRole !== CreditRole.CHARTER &&
    pendingCreators.some(
      (c) => c.role === CreditRole.CHARTER && c.id === draggingInfo.creatorId,
    );

  const vfxerDropDisabled =
    !!draggingInfo &&
    draggingInfo.sourceRole !== CreditRole.VFXER &&
    pendingCreators.some(
      (c) => c.role === CreditRole.VFXER && c.id === draggingInfo.creatorId,
    );

  const activeCreator = useMemo(() => {
    if (!activeId) return null;
    const parsed = parseSortableId(activeId);
    if (!parsed) return null;
    return (
      pendingCreators.find(
        (c) => c.id === parsed.creatorId && c.role === parsed.role,
      ) ?? null
    );
  }, [activeId, pendingCreators]);

  return (
    <div className="level-credits-edit-popup-container">
      <div
        className="level-credits-edit-popup-overlay"
        onClick={handleBackdropClick}
        role="presentation"
      >
        <div
          className="level-credits-edit-popup"
          ref={popupRef}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-credits-edit-popup-title"
        >
          <CloseButton variant="floating" onClick={requestClose} aria-label="Close" />

          <header className="level-credits-edit-popup__header">
            <h2 id="level-credits-edit-popup-title" className="level-credits-edit-popup__title">
              Edit credits — {level.song}
            </h2>
            <p className="level-credits-edit-popup__subtitle">
              #{level.id} · {level.artist}
            </p>
          </header>

          <div className="level-credits-edit-popup__body">
            <div className="level-credits-edit-popup__team-section">
              <label className="level-credits-edit-popup__label">Team</label>
              <div className="level-credits-edit-popup__team-input-group">
                <CustomSelect
                  width="100%"
                  options={teamsList.map((team) => ({
                    value: team.name,
                    label: team.name,
                  }))}
                  value={
                    pendingTeam
                      ? { value: pendingTeam.name, label: pendingTeam.name }
                      : null
                  }
                  onChange={(selected) => {
                    handleTeamInputChange(selected?.value || '');
                  }}
                  onInputChange={(input, { action }) => {
                    if (action === 'input-change') {
                      handleTeamInputChange(input);
                    }
                  }}
                  isCreatable
                  isClearable
                  placeholder="Enter or select team name..."
                  className="level-credits-edit-popup__team-select"
                />
                {pendingTeam && (
                  <span
                    className={
                      pendingTeam.id
                        ? 'level-credits-edit-popup__team-badge existing'
                        : 'level-credits-edit-popup__team-badge new'
                    }
                  >
                    {pendingTeam.id ? `ID: ${pendingTeam.id}` : 'New Team'}
                  </span>
                )}
              </div>
            </div>

            <div className="level-credits-edit-popup__credits-section">
              <DndContext
                sensors={sensors}
                collisionDetection={isolatedZoneCollision}
                onDragStart={handleDragStart}
                onDragCancel={resetDrag}
                onDragEnd={handleDragEnd}
              >
                <div className="level-credits-edit-popup__credit-zones">
                  <CreditRoleZone
                    zoneId={CHARTER_ZONE_ID}
                    role={CreditRole.CHARTER}
                    credits={charterCredits}
                    title="Charters"
                    zoneModifier="charter"
                    isDropDisabled={charterDropDisabled}
                    onToggleOwner={handleToggleOwner}
                    onRemove={handleRemoveCreator}
                    searchPlaceholder={t('levelPopups.creditsEdit.searchPlaceholder', { ns: 'components' })}
                    noResultsLabel={t('levelPopups.creditsEdit.noResults', { ns: 'components' })}
                  />
                  <CreditRoleZone
                    zoneId={VFXER_ZONE_ID}
                    role={CreditRole.VFXER}
                    credits={vfxerCredits}
                    title="VFXers"
                    zoneModifier="vfxer"
                    isDropDisabled={vfxerDropDisabled}
                    onToggleOwner={handleToggleOwner}
                    onRemove={handleRemoveCreator}
                    searchPlaceholder={t('levelPopups.creditsEdit.searchPlaceholder', { ns: 'components' })}
                    noResultsLabel={t('levelPopups.creditsEdit.noResults', { ns: 'components' })}
                  />
                </div>
                <DragOverlay dropAnimation={null}>
                  {activeCreator ? <CreatorItemPreview creator={activeCreator} /> : null}
                </DragOverlay>
              </DndContext>

              <div className="level-credits-edit-popup__add-creator">
                <CustomSelect
                  width="100%"
                  options={
                    availableCreators === null
                      ? []
                      : availableCreators.map((creator) => ({
                          value: creator.id,
                          label: `${creator.name} (ID: ${creator.id}, Charts: ${creator.credits?.length || 0})${creator.creatorAliases?.length > 0 ? ` [${creator.creatorAliases.map((alias) => alias.name).join(', ')}]` : ''}`,
                        }))
                  }
                  value={null}
                  onChange={(option) => {
                    const creator = availableCreators?.find((c) => c.id === option?.value);
                    if (creator) {
                      handleAddCreator(creator);
                    }
                  }}
                  placeholder="Search and select creator..."
                  onInputChange={(value) => setCreatorToAddSearchQuery(value)}
                  isSearchable
                  className="level-credits-edit-popup__creator-select"
                  isLoading={availableCreators === null}
                  noOptionsMessage={() =>
                    availableCreators === null ? 'Loading...' : 'Type to search creators...'
                  }
                />
              </div>
            </div>
          </div>

          <footer className="level-credits-edit-popup__footer">
            <button
              type="button"
              className="level-credits-edit-popup__btn level-credits-edit-popup__btn--save"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="level-credits-edit-popup__btn level-credits-edit-popup__btn--cancel"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default LevelCreditsEditPopup;
