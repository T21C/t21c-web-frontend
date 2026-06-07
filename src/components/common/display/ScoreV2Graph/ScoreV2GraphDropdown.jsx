// tuf-search: #ScoreV2GraphDropdown #scorev2Graph #display
import { useEffect, useRef, useState } from "react";
import { Portal } from "@/components/common/Portal";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { PORTALED_PANEL_CLASS, usePortaledPanelAnchor } from "@/hooks/usePortaledPanelAnchor";
import { ScoreV2Graph } from "./ScoreV2Graph";
import "./ScoreV2Graph.css";

export const ScoreV2GraphDropdown = ({
  show,
  onClose,
  containerRef: anchorRef,
  tilecount,
  levelData,
  difficultyDict,
  speed,
  isNoHoldTap,
}) => {
  const { t } = useTranslation("pages");
  const [disablePP, setDisablePP] = useState(false);
  const panelRef = useRef(null);

  const { panelStyle, placement, portalRoot } = usePortaledPanelAnchor({
    open: show,
    anchorRef,
    panelRef,
    reanchorDeps: [tilecount, levelData, disablePP],
  });

  useEffect(() => {
    if (!show) return;
    const handlePointerDownCapture = (event) => {
      if (anchorRef?.current?.contains(event.target)) return;
      if (panelRef?.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handlePointerDownCapture, true);
    return () => document.removeEventListener("mousedown", handlePointerDownCapture, true);
  }, [show, onClose, anchorRef]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  if (!show || !portalRoot) return null;

  return (
    <Portal when={show} root={portalRoot}>
    <div
      ref={panelRef}
      className={`scorev2-graph-dropdown scorev2-graph-dropdown--portal ${PORTALED_PANEL_CLASS} portaled-panel--z-dropdown`}
      role="dialog"
      aria-label={t("levelDetail.scoreGraph.header", { defaultValue: "Score curve" })}
      data-placement={placement}
      style={panelStyle}
    >
      <div className="scorev2-graph-dropdown__header">
        <span className="scorev2-graph-dropdown__title">
          {t("levelDetail.scoreGraph.header", { defaultValue: "Score vs accuracy" })}
        </span>
        <label className="scorev2-graph-dropdown__pp-toggle">
          <input
            type="checkbox"
            checked={disablePP}
            onChange={(e) => setDisablePP(e.target.checked)}
          />
          <span>{t("levelDetail.scoreGraph.disablePP", { defaultValue: "Disable PP" })}</span>
        </label>
      </div>
      <ScoreV2Graph
        tilecount={tilecount}
        levelData={levelData}
        difficultyDict={difficultyDict}
        speed={speed}
        isNoHoldTap={isNoHoldTap}
        disablePP={disablePP}
      />
    </div>
    </Portal>
  );
};

ScoreV2GraphDropdown.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  containerRef: PropTypes.shape({ current: PropTypes.any }),
  tilecount: PropTypes.number,
  levelData: PropTypes.object.isRequired,
  difficultyDict: PropTypes.object,
  speed: PropTypes.number,
  isNoHoldTap: PropTypes.bool,
};
