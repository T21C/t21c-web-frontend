// tuf-search: #ScoreV2GraphDropdown #scorev2Graph #display
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { ScoreV2Graph } from "./ScoreV2Graph";
import "./ScoreV2Graph.css";

export const ScoreV2GraphDropdown = ({
  show,
  onClose,
  containerRef,
  tilecount,
  levelData,
  difficultyDict,
  speed,
  isNoHoldTap,
}) => {
  const { t } = useTranslation("pages");
  const [disablePP, setDisablePP] = useState(false);

  useEffect(() => {
    if (!show) return;
    const handlePointerDownCapture = (event) => {
      if (containerRef?.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handlePointerDownCapture, true);
    return () => document.removeEventListener("mousedown", handlePointerDownCapture, true);
  }, [show, onClose, containerRef]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="scorev2-graph-dropdown" role="dialog" aria-label={t("levelDetail.scoreGraph.header", { defaultValue: "Score curve" })}>
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
