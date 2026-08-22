// tuf-search: #CurationTypeCountView #curationTypeCountView #display
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ChevronIcon from "@/components/common/icons/ChevronIcon";
import ProfileHeaderIconPanelPortal from "@/components/account/ProfileHeader/ProfileHeaderIconPanelPortal";
import { buildCreatorIconSlots } from "@/utils/profileIconSlots";
import {
  getCreatorCurationTypesForHeaderPanel,
  groupCurationTypesForPanel,
} from "@/utils/curationTypeUtils";
import "./curationTypeCountView.css";

/**
 * Creator-style curation type badges (default C→V→O→H priority) plus the
 * expand panel listing every type with a positive count.
 */
const CurationTypeCountView = ({
  curationTypeCounts = {},
  curationTypesDict = {},
  dialogLabel,
}) => {
  const { t } = useTranslation("pages");
  const [iconPanelOpen, setIconPanelOpen] = useState(false);
  const [iconPanelPos, setIconPanelPos] = useState(null);
  const rootRef = useRef(null);
  const iconRowRef = useRef(null);
  const iconPanelPortalRef = useRef(null);

  const slots = useMemo(
    () => buildCreatorIconSlots(curationTypeCounts, curationTypesDict || {}, []),
    [curationTypeCounts, curationTypesDict],
  );

  const panelItems = useMemo(
    () => getCreatorCurationTypesForHeaderPanel(curationTypeCounts, curationTypesDict || {}),
    [curationTypeCounts, curationTypesDict],
  );

  const hasTypesNotOnIconRow = useMemo(() => {
    if (!Array.isArray(panelItems) || panelItems.length === 0) return false;
    const displayed = new Set();
    for (const slot of slots) {
      const n = Number(slot?.curationTypeId);
      if (Number.isFinite(n) && n > 0) displayed.add(n);
    }
    return panelItems.some((item) => {
      const n = Number(item?.id);
      if (!Number.isFinite(n) || n <= 0) return false;
      return !displayed.has(n);
    });
  }, [panelItems, slots]);

  const showIconPanel = panelItems.length > 0 && hasTypesNotOnIconRow;

  const curationPanelGroups = useMemo(() => {
    if (!showIconPanel) return [];
    return groupCurationTypesForPanel(
      panelItems,
      t("settings.creator.curationBadges.fallbackGroup"),
    );
  }, [showIconPanel, panelItems, t]);

  const resolvedDialogLabel =
    dialogLabel || t("creators.profile.curationPanel.dialogLabel");

  const measureIconPanel = useCallback(() => {
    const row = iconRowRef.current;
    if (!row) return;
    const r = row.getBoundingClientRect();
    const margin = 12;
    const maxW = Math.max(200, window.innerWidth - margin * 2);
    const preferred = 360;
    const panelWidth = Math.min(preferred, maxW, Math.max(200, r.width));
    setIconPanelPos({
      top: Math.round(r.bottom + 6),
      rowCenter: Math.round(r.left + r.width / 2),
      minWidth: Math.round(panelWidth),
    });
  }, []);

  useEffect(() => {
    if (!showIconPanel) {
      setIconPanelOpen(false);
      setIconPanelPos(null);
    }
  }, [showIconPanel]);

  useLayoutEffect(() => {
    if (!iconPanelOpen || !showIconPanel) return undefined;
    measureIconPanel();
    const el = iconRowRef.current;
    const rootEl = rootRef.current;
    const ro =
      typeof ResizeObserver !== "undefined" && el ? new ResizeObserver(() => measureIconPanel()) : null;
    if (ro && el) ro.observe(el);
    const rootRo =
      typeof ResizeObserver !== "undefined" && rootEl
        ? new ResizeObserver(() => measureIconPanel())
        : null;
    if (rootRo && rootEl) rootRo.observe(rootEl);
    window.addEventListener("scroll", measureIconPanel, true);
    window.addEventListener("resize", measureIconPanel);
    return () => {
      ro?.disconnect();
      rootRo?.disconnect();
      window.removeEventListener("scroll", measureIconPanel, true);
      window.removeEventListener("resize", measureIconPanel);
    };
  }, [iconPanelOpen, showIconPanel, measureIconPanel]);

  useEffect(() => {
    if (!iconPanelOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setIconPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [iconPanelOpen]);

  useEffect(() => {
    if (!iconPanelOpen) return undefined;
    const onPointerDown = (event) => {
      const node = event.target;
      if (!(node instanceof Node)) return;
      if (iconRowRef.current?.contains(node)) return;
      if (iconPanelPortalRef.current?.contains(node)) return;
      setIconPanelOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [iconPanelOpen]);

  if (slots.length === 0) return null;

  return (
    <div className="curation-type-count-view" ref={rootRef}>
      <div
        className={`curation-type-count-view__slots-block${showIconPanel ? " curation-type-count-view__slots-block--panel" : ""}`}
        ref={iconRowRef}
        role="list"
        aria-label={t("creators.card.curationBadgesAria")}
      >
        {slots.map((slot, index) => (
          <div
            key={slot.key}
            className="curation-type-count-view__slot"
            role="listitem"
            title={slot.tooltip ?? slot.title}
          >
            {slot.iconUrl ? (
              <img
                className="curation-type-count-view__slot-img"
                src={slot.iconUrl}
                alt=""
                decoding="async"
              />
            ) : (
              <span className="curation-type-count-view__slot-letter">{slot.letter}</span>
            )}
            <span className="curation-type-count-view__slot-badge">{slot.badge ?? slot.count ?? 0}</span>
            {showIconPanel && index === slots.length - 1 ? (
              <button
                type="button"
                className="curation-type-count-view__chevron"
                aria-expanded={iconPanelOpen}
                aria-haspopup="dialog"
                aria-label={
                  iconPanelOpen
                    ? t("creators.profile.curationPanel.collapseAria")
                    : t("creators.profile.curationPanel.expandAria")
                }
                onClick={() => setIconPanelOpen((v) => !v)}
              >
                <ChevronIcon
                  direction={iconPanelOpen ? "up" : "down"}
                  color="var(--color-white)"
                  size={12}
                />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <ProfileHeaderIconPanelPortal
        open={showIconPanel && iconPanelOpen}
        pos={iconPanelPos}
        mode="creator"
        portalRef={iconPanelPortalRef}
        creatorDialogLabel={resolvedDialogLabel}
        curationPanelGroups={curationPanelGroups}
      />
    </div>
  );
};

export default CurationTypeCountView;
