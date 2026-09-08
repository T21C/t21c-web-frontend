import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { CustomSelect, ProfileSelector } from "@/components/common/selectors";
import { DragHandleIcon, TrashIcon } from "@/components/common/icons";
import { Portal } from "@/components/common/Portal";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { useDebouncedRequest } from "@/hooks/useDebouncedRequest";
import { PORTALED_PANEL_CLASS, usePortaledPanelAnchor } from "@/hooks/usePortaledPanelAnchor";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { formatCreatorDisplay } from "@/utils/Utility";
import { userAvatarDisplayUrl } from "@/utils/playerAvatarDisplay";
import {
  normalizeLevelSearchQuery,
  normalizePackSearchQuery,
  normalizePassSearchQuery,
  parseHashtagIdQuery,
  parseHashtagPackQuery,
} from "@/utils/normalizeEntitySearchQuery";
import {
  FAVORITE_ITEM_KINDS,
  MAX_FAVORITE_ITEMS,
  isFavoriteEntityHidden,
} from "@/utils/profileModules";
import {
  favoriteEntityId,
  favoriteItemFromEntity,
  favoriteItemHasEntity,
} from "@/utils/profileModules/favoriteEntityShape";
import { fetchFavoriteEntity } from "@/utils/profileModules/fetchFavoriteEntities";
import "./profileModules.css";

const KIND_DROPPABLE = "favorite-items";

function listRows(data) {
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.packs)) return data.packs;
  if (Array.isArray(data)) return data;
  return [];
}

function favoriteEntityFromSearch(kind, row) {
  return favoriteItemFromEntity(kind, row) || { kind, id: row.id, [kind]: row };
}

function levelCharterLabel(level) {
  if (!level) return "";
  if (typeof level.team === "string" && level.team.trim()) return level.team.trim();
  if (Array.isArray(level.levelCredits) && level.levelCredits.length > 0) {
    const label = formatCreatorDisplay(level);
    return label && label !== "No credits" ? label : "";
  }
  return "";
}

function describeFavoriteEntity(item, difficultyDict, t) {
  const kind = item?.kind;
  if (kind === "level") {
    const level = item.level;
    if (!level) {
      return {
        iconSrc: null,
        iconKind: "diff",
        title: `Level #${item.id}`,
        metaParts: [],
      };
    }
    const diff = difficultyDict?.[level.diffId] || level.difficulty;
    return {
      iconSrc: diff?.icon || null,
      iconKind: "diff",
      title:
        (typeof level.song === "string" && level.song.trim()) ||
        t("settings.modules.unknownLevel", { defaultValue: "Unknown chart" }),
      metaParts: [level.artist, levelCharterLabel(level)].filter(
        (part) => typeof part === "string" && part.trim(),
      ),
    };
  }
  if (kind === "pass") {
    const pass = item.pass;
    if (!pass) {
      return {
        iconSrc: null,
        iconKind: "diff",
        title: `Pass #${item.id}`,
        metaParts: [],
      };
    }
    const level = pass.level || {};
    const diff = difficultyDict?.[level.diffId] || level.difficulty;
    const song =
      (typeof level.song === "string" && level.song.trim()) ||
      t("settings.modules.unknownLevel", { defaultValue: "Unknown chart" });
    return {
      iconSrc: diff?.icon || null,
      iconKind: "diff",
      title: `${song} (ID: ${item.id})`,
      metaParts: [pass.player?.name, level.artist].filter(
        (part) => typeof part === "string" && part.trim(),
      ),
    };
  }
  if (kind === "pack") {
    const pack = item.pack;
    if (!pack) {
      return {
        iconSrc: null,
        iconKind: "pack",
        title: `Pack #${item.id}`,
        metaParts: [],
      };
    }
    const owner =
      pack.packOwner?.nickname ||
      pack.packOwner?.username ||
      pack.owner?.name ||
      "";
    return {
      iconSrc: pack.iconUrl || null,
      iconKind: "pack",
      title:
        (typeof pack.name === "string" && pack.name.trim()) || `Pack #${item.id}`,
      metaParts: owner ? [owner] : [],
    };
  }
  if (kind === "player") {
    const player = item.player;
    if (!player) {
      return {
        iconSrc: null,
        iconKind: "avatar",
        title: `Player #${item.id}`,
        metaParts: [],
      };
    }
    const name = player.user?.nickname || player.name || `Player #${item.id}`;
    const handle = player.user?.username ? `@${player.user.username}` : "";
    return {
      iconSrc: userAvatarDisplayUrl(player),
      iconKind: "avatar",
      title: name,
      metaParts: handle ? [handle] : [],
    };
  }
  return {
    iconSrc: null,
    iconKind: "diff",
    title: `${kind} #${item?.id ?? ""}`,
    metaParts: [],
  };
}

function FavoriteEntityRow({ item, difficultyDict, t }) {
  const { iconSrc, iconKind, title, metaParts } = describeFavoriteEntity(
    item,
    difficultyDict,
    t,
  );
  const iconClass = [
    "profile-modules-editor__entity-icon",
    iconKind === "avatar" ? "profile-modules-editor__entity-icon--avatar" : "",
    !iconSrc ? "profile-modules-editor__entity-icon--placeholder" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className="profile-modules-editor__entity">
      {iconSrc ? (
        <img className={iconClass} src={iconSrc} alt="" />
      ) : (
        <span className={iconClass} aria-hidden />
      )}
      <span className="profile-modules-editor__entity-text">
        <span className="profile-modules-editor__entity-title">{title}</span>
        {metaParts.length > 0 ? (
          <span className="profile-modules-editor__entity-meta">
            {metaParts.map((part, index) => (
              <span key={`${index}-${part}`}>{part}</span>
            ))}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export default function FavoriteItemsEditor({
  items = [],
  resolvedItems = [],
  maxFavoriteItems = MAX_FAVORITE_ITEMS,
  onChange,
}) {
  const { t } = useTranslation(["pages", "common"]);
  const { difficultyDict } = useDifficultyContext();
  const [kind, setKind] = useState("level");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const runSearch = useDebouncedRequest(350);
  const searchWrapRef = useRef(null);
  const anchorRef = useRef(null);
  const dropdownRef = useRef(null);
  const failedLookupKeysRef = useRef(new Set());
  const [entityByKey, setEntityByKey] = useState(() => new Map());

  const kindOptions = useMemo(
    () =>
      FAVORITE_ITEM_KINDS.map((value) => ({
        value,
        label: t(`profile.modules.favoriteKinds.${value}`),
      })),
    [t],
  );
  const selectedKind = kindOptions.find((o) => o.value === kind) || kindOptions[0];

  const hydrated = useMemo(() => {
    const resolvedByKey = new Map(
      (resolvedItems || []).map((row) => [`${row.kind}:${row.id}`, row]),
    );
    return items.map((item) => {
      const key = `${item.kind}:${item.id}`;
      const resolved = resolvedByKey.get(key);
      if (favoriteItemHasEntity(resolved)) return resolved;
      const cached = entityByKey.get(key);
      if (favoriteItemHasEntity(cached)) return cached;
      return item;
    });
  }, [items, resolvedItems, entityByKey]);

  const queryTrimmed = String(query).trim();
  const dropdownOpen =
    kind !== "player" && showDropdown && queryTrimmed.length >= 1;

  const { panelStyle, portalRoot } = usePortaledPanelAnchor({
    open: dropdownOpen,
    anchorRef,
    panelRef: dropdownRef,
    reanchorDeps: [searching, results.length, query, kind],
    maxHeightCap: 240,
    minHeight: 80,
  });

  useEffect(() => {
    if (kind === "player") {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    const trimmed =
      kind === "pass"
        ? normalizePassSearchQuery(query)
        : kind === "level"
          ? normalizeLevelSearchQuery(query)
          : normalizePackSearchQuery(query);
    if (!String(trimmed).trim()) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    runSearch(async ({ signal }) => {
      if (kind === "pack") {
        const packLookup = parseHashtagPackQuery(trimmed);
        if (packLookup) {
          try {
            const entity = await fetchFavoriteEntity("pack", packLookup, { signal });
            setResults(entity ? [entity] : []);
          } catch (error) {
            if (api.isCancel(error)) throw error;
            setResults([]);
          }
          setSearching(false);
          return;
        }
      }
      let url;
      const hashId = kind === "pack" ? null : parseHashtagIdQuery(trimmed);
      const params = {
        query: hashId || trimmed,
        limit: 30,
        offset: 0,
      };
      if (kind === "level") {
        url = routes.database.levels.root();
        params.deletedFilter = "hide";
      } else if (kind === "pass") {
        url = routes.database.passes.root();
        params.deletedFilter = "hide";
        params.sort = "SCORE_DESC";
      } else {
        url = routes.database.levels.packs.root();
      }
      const { data } = await api.get(url, { params, signal });
      setResults(listRows(data));
      setSearching(false);
    }).catch((error) => {
      if (api.isCancel(error)) return;
      setResults([]);
      setSearching(false);
    });
    return () => {
      runSearch.cancel();
    };
  }, [kind, query, runSearch]);

  useEffect(() => {
    const resolvedByKey = new Map(
      (resolvedItems || []).map((row) => [`${row.kind}:${row.id}`, row]),
    );
    const missing = items.filter((item) => {
      const key = `${item.kind}:${item.id}`;
      if (favoriteItemHasEntity(resolvedByKey.get(key))) return false;
      if (favoriteItemHasEntity(entityByKey.get(key))) return false;
      if (failedLookupKeysRef.current.has(key)) return false;
      return true;
    });
    if (!missing.length) return undefined;

    const controller = new AbortController();
    Promise.all(
      missing.map(async (item) => {
        const key = `${item.kind}:${item.id}`;
        try {
          const entity = await fetchFavoriteEntity(item.kind, item.id, {
            signal: controller.signal,
          });
          const row = favoriteItemFromEntity(item.kind, entity, item.id);
          if (!row) {
            failedLookupKeysRef.current.add(key);
            return null;
          }
          return row;
        } catch (error) {
          if (api.isCancel(error)) return null;
          failedLookupKeysRef.current.add(key);
          return null;
        }
      }),
    ).then((rows) => {
      if (controller.signal.aborted) return;
      const found = rows.filter(Boolean);
      if (!found.length) return;
      setEntityByKey((prev) => {
        const next = new Map(prev);
        for (const row of found) {
          next.set(`${row.kind}:${row.id}`, row);
        }
        return next;
      });
    });

    return () => {
      controller.abort();
    };
  }, [items, resolvedItems, entityByKey]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (searchWrapRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const atCap = items.length >= maxFavoriteItems;
  const existing = new Set(items.map((item) => `${item.kind}:${item.id}`));

  const rememberEntity = (nextKind, entity) => {
    const row = favoriteItemFromEntity(nextKind, entity);
    if (!row) return;
    const key = `${row.kind}:${row.id}`;
    failedLookupKeysRef.current.delete(key);
    setEntityByKey((prev) => {
      const next = new Map(prev);
      next.set(key, row);
      return next;
    });
  };

  const addItem = (nextKind, entity) => {
    const id = favoriteEntityId(nextKind, entity);
    if (!id || atCap) return;
    if (isFavoriteEntityHidden(nextKind, entity)) return;
    const key = `${nextKind}:${id}`;
    if (existing.has(key)) return;
    rememberEntity(nextKind, entity);
    onChange([...items, { kind: nextKind, id }]);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const handleDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;
    const next = [...items];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    onChange(next);
  };

  const dropdownPanel = (
    <div
      ref={dropdownRef}
      className={`profile-modules-editor__favorite-menu ${PORTALED_PANEL_CLASS} portaled-panel--z-popover`}
      style={panelStyle}
    >
      {searching && results.length === 0 ? (
        <p className="profile-modules-editor__favorite-menu-status">
          {t("loading.generic", { ns: "common" })}
        </p>
      ) : results.length === 0 ? (
        <p className="profile-modules-editor__favorite-menu-status">
          {t("settings.modules.searchNoResults")}
        </p>
      ) : (
        results.map((row) => {
          const hidden = isFavoriteEntityHidden(kind, row);
          const already = existing.has(`${kind}:${favoriteEntityId(kind, row)}`);
          const disabled = hidden || already || atCap;
          return (
            <button
              key={`${kind}-${row.id}`}
              type="button"
              className="profile-modules-editor__favorite-option"
              disabled={disabled}
              onClick={() => addItem(kind, row)}
            >
              <FavoriteEntityRow
                item={favoriteEntityFromSearch(kind, row)}
                difficultyDict={difficultyDict}
                t={t}
              />
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div className="profile-modules-editor__favorite">
      <p className="profile-modules-editor__hint">
        {t("settings.modules.favoriteCount", {
          used: items.length,
          max: maxFavoriteItems,
        })}
      </p>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={KIND_DROPPABLE}>
          {(provided) => (
            <div
              className="profile-modules-editor__favorite-list"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {hydrated.map((item, index) => (
                <Draggable
                  key={`${item.kind}-${item.id}`}
                  draggableId={`${item.kind}-${item.id}`}
                  index={index}
                >
                  {(drag) => (
                    <div
                      className="profile-modules-editor__favorite-row"
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      style={drag.draggableProps.style}
                    >
                      <button
                        type="button"
                        className="profile-modules-editor__drag"
                        aria-label={t("settings.modules.dragAria")}
                        {...drag.dragHandleProps}
                      >
                        <DragHandleIcon size="16px" color="currentColor" />
                      </button>
                      <FavoriteEntityRow
                        item={item}
                        difficultyDict={difficultyDict}
                        t={t}
                      />
                      <button
                        type="button"
                        className="profile-modules-editor__btn profile-modules-editor__btn--icon btn-fill-secondary"
                        onClick={() =>
                          onChange(items.filter((_, i) => i !== index))
                        }
                      >
                        <TrashIcon size="16px" color="currentColor" />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="profile-modules-editor__add">
        <CustomSelect
          options={kindOptions}
          value={selectedKind}
          onChange={(option) => {
            setKind(option.value);
            setQuery("");
            setResults([]);
            setShowDropdown(false);
          }}
          width="10rem"
          isSearchable={false}
        />
        {kind === "player" ? (
          <div className="profile-modules-editor__favorite-search">
            <ProfileSelector
              type="player"
              value={null}
              allowRequestNew={false}
              disabled={atCap}
              portalDropdown
              placeholder={t("settings.modules.searchPlayer")}
              onChange={(player) => addItem("player", player)}
            />
          </div>
        ) : (
          <div className="profile-modules-editor__favorite-search" ref={searchWrapRef}>
            <div ref={anchorRef}>
              <input
                type="search"
                className="profile-modules-editor__favorite-input"
                value={query}
                disabled={atCap}
                placeholder={t("settings.modules.searchEntity")}
                onChange={(ev) => {
                  setQuery(ev.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={(ev) => {
                  if (ev.key === "Escape") {
                    ev.preventDefault();
                    setShowDropdown(false);
                  }
                }}
              />
            </div>
            {dropdownOpen ? (
              <Portal when={dropdownOpen} root={portalRoot}>
                {dropdownPanel}
              </Portal>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
