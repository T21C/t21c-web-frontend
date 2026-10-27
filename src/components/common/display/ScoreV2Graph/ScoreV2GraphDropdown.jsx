// tuf-search: #ScoreV2GraphDropdown #scorev2Graph #display
import { useEffect, useRef, useState } from "react";
import { Portal } from "@/components/common/Portal";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { PORTALED_PANEL_CLASS, usePortaledPanelAnchor } from "@/hooks/usePortaledPanelAnchor";
import { ScoreV2Graph } from "./ScoreV2Graph";
import autoraterIcon from "@/assets/icons/autorater-v2.png";
import { AutoraterLevelPopup } from "@/components/popups/Levels/AutoraterLevelPopup/AutoraterLevelPopup";
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
  const [autoraterLevelId, setAutoraterLevelId] = useState(null);
  const levelId = Number(levelData.id);
  const hasLevelId = Number.isSafeInteger(levelId) && levelId > 0 && levelId <= 2147483647;
  const showAutorater = hasLevelId && autoraterLevelId === levelId;
  const panelRef = useRef(null);

  useEffect(() => {
    setAutoraterLevelId(null);
  }, [show, levelId]);

  const { panelStyle, placement, portalRoot } = usePortaledPanelAnchor({
    open: show,
    anchorRef,
    panelRef,
    reanchorDeps: [tilecount, levelData, disablePP],
  });

  useEffect(() => {
    if (!show || showAutorater) return;
    const handlePointerDownCapture = (event) => {
      if (anchorRef?.current?.contains(event.target)) return;
      if (panelRef?.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handlePointerDownCapture, true);
    return () => document.removeEventListener("mousedown", handlePointerDownCapture, true);
  }, [show, showAutorater, onClose, anchorRef]);

  useEffect(() => {
    if (!show || showAutorater) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, showAutorater, onClose]);

  if (!show || !portalRoot) return null;

  return (
    <>
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
        <div className="scorev2-graph-dropdown__heading">
          <span className="scorev2-graph-dropdown__title">
            {t("levelDetail.scoreGraph.header", { defaultValue: "Score vs accuracy" })}
          </span>
          {hasLevelId && (
            <button
              type="button"
              className="scorev2-graph-dropdown__autorater"
              aria-haspopup="dialog"
              aria-expanded={showAutorater}
              onClick={() => setAutoraterLevelId(levelId)}
            >
              <img src={autoraterIcon} alt="" aria-hidden="true" />
              <span>Auto Rater Cat v2</span>
            </button>
          )}
        </div>
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
    {showAutorater && (
      <AutoraterLevelPopup levelId={levelId} onClose={() => setAutoraterLevelId(null)} />
    )}
    </>
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
