// tuf-search: #TournamentDisplayTreeEditor #tournamentDisplayTree
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "@/components/common/Portal";
import { CloseButton } from "@/components/common/buttons";
import { ChevronIcon, EyeIcon, EyeOffIcon } from "@/components/common/icons";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { getCreditId } from "@/utils/tournamentPlacements";
import {
  buildDisplayNodePathLabel,
  buildNestedDisplayTree,
  clampDisplayIndentDepth,
  flattenDisplayTree,
  flattenDisplayTreeToPositions,
  getDefaultDisplaySlotSelection,
  getDisplayNodeLabel,
  insertDisplayNodesAtPosition,
  isDisplayPlacementRowVisible,
  isGroupMoveIntoDescendant,
  moveDisplayNodeToPosition,
} from "./useTournamentDisplayTree";
import "./tournamentDisplayTreeEditor.css";

let tempNodeId = -1;
function nextTempNodeId() {
  tempNodeId -= 1;
  return tempNodeId;
}

function DisplayPlacementPopup({
  isOpen,
  onClose,
  mode,
  tree,
  movingNode,
  creditById,
  onSubmit,
}) {
  const { t } = useTranslation("pages");
  const popupRef = useRef(null);
  const [groupName, setGroupName] = useState("");
  const [selectedSlotKey, setSelectedSlotKey] = useState(null);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState(() => new Set());

  const excludeId = mode === "move" && movingNode ? movingNode.id : null;

  const positionRows = useMemo(
    () => flattenDisplayTreeToPositions(tree, { excludeId, creditById }),
    [tree, excludeId, creditById],
  );

  useEffect(() => {
    if (!isOpen) {
      setGroupName("");
      setSelectedSlotKey(null);
      setCollapsedGroupIds(new Set());
      return;
    }
    const defaultSlot = getDefaultDisplaySlotSelection(tree, {
      excludeId,
      movingItem: mode === "move" ? movingNode : null,
    });
    setSelectedSlotKey(defaultSlot.slotKey);
  }, [isOpen, tree, excludeId, movingNode, mode]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    const onClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const movingPath =
    mode === "move" && movingNode
      ? buildDisplayNodePathLabel(tree, movingNode.id, creditById)
      : "";

  const canSubmitMove = Boolean(selectedSlotKey);
  const canSubmitAddGroup = groupName.trim().length > 0 && Boolean(selectedSlotKey);
  const canSubmit = mode === "move" ? canSubmitMove : canSubmitAddGroup;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const slot = positionRows.find((row) => row.kind === "slot" && row.slotKey === selectedSlotKey);
    if (!slot) return;
    onSubmit({
      mode,
      parentId: slot.parentId,
      index: slot.index,
      name: mode === "add-group" ? groupName.trim() : undefined,
    });
  };

  const indentRem = (depth) => `${0.5 + clampDisplayIndentDepth(depth) * 1.1}rem`;

  return (
    <Portal>
      <div className="tournament-display-tree-editor__placement-overlay">
        <div className="tournament-display-tree-editor__placement-popup" ref={popupRef}>
          <CloseButton
            variant="floating"
            className="tournament-display-tree-editor__placement-close"
            onClick={onClose}
            aria-label={t("settings.tournaments.cancel")}
          />

          <div className="tournament-display-tree-editor__placement-content">
            <h3 className="tournament-display-tree-editor__placement-title">
              {mode === "add-group"
                ? t("settings.tournaments.displayTree.addGroupTitle")
                : t("settings.tournaments.displayTree.moveTitle")}
            </h3>

            {mode === "move" && movingPath ? (
              <p className="tournament-display-tree-editor__placement-subtitle">{movingPath}</p>
            ) : null}

            {mode === "add-group" ? (
              <label className="tournament-display-tree-editor__placement-field">
                <span className="tournament-display-tree-editor__placement-label">
                  {t("settings.tournaments.displayTree.groupName")}
                </span>
                <input
                  type="text"
                  className="tournament-display-tree-editor__placement-input"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder={t("settings.tournaments.displayTree.groupNamePlaceholder")}
                  autoFocus
                />
              </label>
            ) : null}

            <div className="tournament-display-tree-editor__placement-section">
              <span className="tournament-display-tree-editor__placement-label">
                {t("settings.tournaments.displayTree.positionLabel")}
              </span>
              <div
                className="tournament-display-tree-editor__placement-tree"
                role="listbox"
                aria-label={t("settings.tournaments.displayTree.positionLabel")}
              >
                {positionRows.map((row, idx) => {
                  if (!isDisplayPlacementRowVisible(row, collapsedGroupIds)) return null;

                  if (row.kind === "slot") {
                    const isSelected = selectedSlotKey === row.slotKey;
                    const parentPath =
                      row.parentId === 0
                        ? t("settings.tournaments.displayTree.root")
                        : buildDisplayNodePathLabel(tree, row.parentId, creditById);
                    return (
                      <button
                        key={row.slotKey}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`tournament-display-tree-editor__slot-divider ${isSelected ? "is-selected" : ""}`}
                        style={{ paddingLeft: indentRem(row.depth) }}
                        onClick={() => setSelectedSlotKey(row.slotKey)}
                      >
                        <span className="tournament-display-tree-editor__slot-divider-line" />
                        <span className="tournament-display-tree-editor__slot-divider-label">
                          {t("settings.tournaments.displayTree.insertShort", { index: row.index })}
                          <span className="tournament-display-tree-editor__slot-divider-path">
                            {parentPath}
                          </span>
                        </span>
                      </button>
                    );
                  }

                  if (row.kind === "group-header") {
                    const isCollapsed = collapsedGroupIds.has(row.groupId);
                    return (
                      <button
                        key={`group-${row.groupId}`}
                        type="button"
                        className="tournament-display-tree-editor__group-header"
                        style={{ paddingLeft: indentRem(row.depth) }}
                        onClick={() => {
                          setCollapsedGroupIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(row.groupId)) next.delete(row.groupId);
                            else next.add(row.groupId);
                            return next;
                          });
                        }}
                        aria-expanded={!isCollapsed}
                      >
                        <ChevronIcon
                          size={16}
                          direction={isCollapsed ? "right" : "down"}
                          className="tournament-display-tree-editor__group-chevron"
                        />
                        <span className="tournament-display-tree-editor__group-label">{row.label}</span>
                        <span className="tournament-display-tree-editor__group-count">
                          {row.childCount}
                        </span>
                      </button>
                    );
                  }

                  if (row.kind === "node-ref") {
                    return (
                      <div
                        key={`node-${row.item.id}-${idx}`}
                        className="tournament-display-tree-editor__node-ref"
                        style={{ paddingLeft: indentRem(row.depth) }}
                        title={row.label}
                      >
                        <span className="tournament-display-tree-editor__node-ref-label">
                          {row.label}
                        </span>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>

            <div className="tournament-display-tree-editor__placement-actions">
              <button
                type="button"
                className="tournament-display-tree-editor__placement-btn tournament-display-tree-editor__placement-btn--secondary btn-fill-secondary"
                onClick={onClose}
              >
                {t("settings.tournaments.cancel")}
              </button>
              <button
                type="button"
                className="tournament-display-tree-editor__placement-btn tournament-display-tree-editor__placement-btn--primary btn-fill-primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {mode === "add-group"
                  ? t("settings.tournaments.displayTree.addGroup")
                  : t("settings.tournaments.displayTree.move")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function DisplayTreeRow({ node, depth, creditById, onMove, onToggleVisible }) {
  const { t } = useTranslation("pages");
  const label = getDisplayNodeLabel(node, creditById);
  const indentRem = `${0.35 + clampDisplayIndentDepth(depth) * 1.1}rem`;

  return (
    <div
      className={[
        "tournament-display-tree-editor__row",
        node.visible === false ? "is-hidden" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ paddingLeft: indentRem }}
    >
      <span className="tournament-display-tree-editor__row-label">{label}</span>
      <div className="tournament-display-tree-editor__row-actions">
        <button
          type="button"
          className="tournament-display-tree-editor__icon-btn"
          onClick={() => onMove(node)}
          title={t("settings.tournaments.displayTree.move")}
        >
          ↔
        </button>
        <button
          type="button"
          className="tournament-display-tree-editor__icon-btn"
          onClick={() => onToggleVisible(node.id)}
          aria-pressed={node.visible !== false}
          title={
            node.visible === false
              ? t("settings.tournaments.showPlacement")
              : t("settings.tournaments.hidePlacement")
          }
        >
          {node.visible === false ? (
            <EyeIcon size="16px" color="var(--color-white-t70)" />
          ) : (
            <EyeOffIcon size="16px" color="var(--color-white-t60)" />
          )}
        </button>
      </div>
    </div>
  );
}

function walkVisibleRows(nodes, depth, creditById, onMove, onToggleVisible, rows = []) {
  nodes.forEach((node) => {
    rows.push(
      <DisplayTreeRow
        key={node.id}
        node={node}
        depth={depth}
        creditById={creditById}
        onMove={onMove}
        onToggleVisible={onToggleVisible}
      />,
    );
    if (node.nodeType === "group" && node.children?.length) {
      walkVisibleRows(node.children, depth + 1, creditById, onMove, onToggleVisible, rows);
    }
  });
  return rows;
}

/**
 * @param {{
 *   credits?: Array<any>,
 *   displayMode?: string,
 *   displayNodes?: Array<any>,
 *   onDisplayModeChange?: (mode: string) => void,
 *   onDisplayNodesChange?: (nodes: Array<any>) => void,
 * }} props
 */
export default function TournamentDisplayTreeEditor({
  credits = [],
  displayMode = "defaultHierarchy",
  displayNodes = [],
  onDisplayModeChange,
  onDisplayNodesChange,
}) {
  const { t } = useTranslation("pages");
  const [placementPopup, setPlacementPopup] = useState(null);

  const creditById = useMemo(() => {
    const map = new Map();
    credits.forEach((credit) => {
      const id = getCreditId(credit);
      if (id != null) map.set(id, credit);
    });
    return map;
  }, [credits]);

  const nestedTree = useMemo(() => buildNestedDisplayTree(displayNodes), [displayNodes]);

  const updateNodes = useCallback(
    (nextTree) => {
      onDisplayNodesChange?.(flattenDisplayTree(nextTree));
    },
    [onDisplayNodesChange],
  );

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
        updateNodes(nextTree);
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
        updateNodes(nextTree);
        setPlacementPopup(null);
      }
    },
    [nestedTree, placementPopup, updateNodes],
  );

  const toggleNodeVisible = useCallback(
    (nodeId) => {
      onDisplayNodesChange?.(
        displayNodes.map((node) =>
          node.id === nodeId ? { ...node, visible: node.visible === false } : node,
        ),
      );
    },
    [displayNodes, onDisplayNodesChange],
  );

  const treeRows = useMemo(
    () => walkVisibleRows(nestedTree, 0, creditById, openMovePopup, toggleNodeVisible),
    [nestedTree, creditById, openMovePopup, toggleNodeVisible],
  );

  return (
    <div className="tournament-display-tree-editor">
      <div className="tournament-display-tree-editor__mode-options">
        {["defaultHierarchy", "customLayers"].map((modeId) => (
          <button
            key={modeId}
            type="button"
            className={[
              "tournament-display-tree-editor__mode-btn",
              displayMode === modeId ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onDisplayModeChange?.(modeId)}
          >
            {t(`settings.tournaments.displayMode.${modeId}`)}
          </button>
        ))}
      </div>

      {displayMode === "customLayers" ? (
        <div className="tournament-display-tree-editor__custom-panel">
          <p className="tournament-display-tree-editor__hint">
            {t("settings.tournaments.displayTree.hint")}
          </p>
          <div className="tournament-display-tree-editor__toolbar">
            <button
              type="button"
              className="tournament-display-tree-editor__toolbar-btn btn-fill-secondary"
              onClick={openAddGroupPopup}
            >
              {t("settings.tournaments.displayTree.addGroup")}
            </button>
          </div>
          <div className="tournament-display-tree-editor__list">{treeRows}</div>
        </div>
      ) : (
        <p className="tournament-display-tree-editor__hint">
          {t("settings.tournaments.displayTree.defaultHint")}
        </p>
      )}

      <DisplayPlacementPopup
        isOpen={Boolean(placementPopup)}
        onClose={closePlacementPopup}
        mode={placementPopup?.mode || "move"}
        tree={nestedTree}
        movingNode={placementPopup?.node || null}
        creditById={creditById}
        onSubmit={submitPlacementPopup}
      />
    </div>
  );
}

export { useTournamentDisplayTree } from "./useTournamentDisplayTree";
