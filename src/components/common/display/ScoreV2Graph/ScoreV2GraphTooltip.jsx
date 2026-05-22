// tuf-search: #ScoreV2GraphTooltip #scorev2Graph #display
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { formatScore } from "@/utils/Utility";

const JUDGEMENT_COLUMNS = [
  { key: "miss", labelKey: "levelDetail.scoreGraph.judgementMiss", className: "miss" },
  { key: "early", labelKey: "levelDetail.scoreGraph.judgementEarly", className: "early" },
  { key: "ePerfect", labelKey: "levelDetail.scoreGraph.judgementEPerfect", className: "e-perfect" },
  { key: "perfect", labelKey: "levelDetail.scoreGraph.judgementPerfect", className: "perfect" },
  { key: "lPerfect", labelKey: "levelDetail.scoreGraph.judgementLPerfect", className: "l-perfect" },
  { key: "late", labelKey: "levelDetail.scoreGraph.judgementLate", className: "late" },
];

export const ScoreV2GraphTooltip = ({ active, payload }) => {
  const { t } = useTranslation("pages");
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row?.judgementCounts) return null;

  const counts = row.judgementCounts;

  return (
    <div className="scorev2-graph-tooltip">
      <div className="scorev2-graph-tooltip__summary">
        <span className="scorev2-graph-tooltip__accuracy">
          {row.accuracyPct.toFixed(2)}%
        </span>
        <span className="scorev2-graph-tooltip__score">{formatScore(row.score)}</span>
      </div>
      <div className="scorev2-graph-tooltip__judgements" role="group" aria-label={t("levelDetail.scoreGraph.judgementsAria", { defaultValue: "Judgement breakdown" })}>
        {JUDGEMENT_COLUMNS.map((col) => (
          <div key={col.key} className="scorev2-graph-tooltip__judgement-cell">
            <span
              className={`scorev2-graph-tooltip__judgement-label scorev2-graph-tooltip__judgement-label--${col.className}`}
            >
              {t(col.labelKey)}
            </span>
            <span
              className={`scorev2-graph-tooltip__judgement-value scorev2-graph-tooltip__judgement-value--${col.className}`}
            >
              {counts[col.key] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

ScoreV2GraphTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};
