// tuf-search: #ScoreV2Graph #scorev2Graph #display
import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import {
  enumerateScoreV2CurvePoints,
  getScoreV2CurveYMax,
  isPurePerfectAccuracy,
  scoreV2GraphXAxisDomain,
  interpolateCurveScoreAtAccuracy,
} from "@/utils/scoreV2Curve";
import { formatScore } from "@/utils/Utility";
import { pickLevelXaccCurve } from "@/utils/scoreV2XaccCurve.js";
import { ScoreV2GraphTooltip } from "./ScoreV2GraphTooltip";
import "./ScoreV2Graph.css";

const SLIDER_MAX = 50;

const PIN_MARKER_STYLE = {
  anchor: {
    fill: "var(--color-gray-2)",
    stroke: "var(--color-white)",
  },
  pin1: {
    fill: "var(--btn-primary)",
    stroke: "var(--color-white)",
  },
  pin2: {
    fill: "var(--warning-color, var(--btn-primary))",
    stroke: "var(--color-white)",
  },
};

export const ScoreV2Graph = ({
  tilecount,
  levelData,
  difficultyDict,
  speed = 1,
  isNoHoldTap = false,
  disablePP = false,
  xaccCurve,
  pinMarkers,
  /** When set and disablePP is false, Y axis is fixed to [0, yAxisMax]. With disablePP, top is derived from the visible curve. */
  yAxisMax = null,
  /** When true, pin markers use the given scores (admin editor); otherwise snap Y to the plotted curve. */
  pinMarkersUseExactScores = false,
}) => {
  const { t } = useTranslation("pages");
  const [misses, setMisses] = useState(0);

  const effectiveLevelData = useMemo(() => {
    const curve =
      xaccCurve ?? levelData?.xaccCurve ?? pickLevelXaccCurve(levelData);
    if (!curve) return levelData;
    return { ...levelData, xaccCurve: curve };
  }, [levelData, xaccCurve]);

  const levelCurveKey = useMemo(
    () =>
      [
        tilecount,
        effectiveLevelData?.baseScore,
        effectiveLevelData?.ppBaseScore,
        effectiveLevelData?.diffId,
        effectiveLevelData?.difficulty?.name,
        effectiveLevelData?.xaccCurve?.poleOffset ?? "",
        effectiveLevelData?.xaccCurve?.topMultiplier ?? "",
        speed,
        isNoHoldTap,
      ].join("|"),
    [
      tilecount,
      effectiveLevelData,
      speed,
      isNoHoldTap,
    ],
  );

  const zeroMissCurve = useMemo(
    () =>
      enumerateScoreV2CurvePoints({
        tilecount,
        misses: 0,
        levelData: effectiveLevelData,
        difficultyDict,
        speed,
        isNoHoldTap,
      }),
    [levelCurveKey, tilecount, effectiveLevelData, difficultyDict, speed, isNoHoldTap],
  );

  const chartData = useMemo(() => {
    if (misses === 0) return zeroMissCurve;
    return enumerateScoreV2CurvePoints({
      tilecount,
      misses,
      levelData: effectiveLevelData,
      difficultyDict,
      speed,
      isNoHoldTap,
    });
  }, [misses, zeroMissCurve, levelCurveKey, tilecount, effectiveLevelData, difficultyDict, speed, isNoHoldTap]);

  const displayData = useMemo(() => {
    if (!disablePP) return chartData;
    return chartData.filter((p) => !isPurePerfectAccuracy(p.accuracy));
  }, [chartData, disablePP]);

  const resolvedPinMarkers = useMemo(() => {
    if (!pinMarkers?.length) return [];
    if (pinMarkersUseExactScores) return pinMarkers;
    return pinMarkers.map((pin) => {
      const curveScore = interpolateCurveScoreAtAccuracy(
        displayData,
        pin.accuracyPct,
      );
      return {
        ...pin,
        score: curveScore ?? pin.score,
      };
    });
  }, [pinMarkers, displayData, pinMarkersUseExactScores]);

  const yAxisDomain = useMemo(() => {
    const fixedMax = Number(yAxisMax);
    if (
      !disablePP &&
      Number.isFinite(fixedMax) &&
      fixedMax > 0
    ) {
      return [0, fixedMax];
    }

    const maxFromCurve = displayData.length
      ? Math.max(...displayData.map((p) => p.score))
      : 0;
    const maxFromPins = resolvedPinMarkers.length
      ? Math.max(...resolvedPinMarkers.map((p) => p.score))
      : 0;
    const maxScore =
      Math.max(maxFromCurve, maxFromPins) > 0
        ? Math.max(maxFromCurve, maxFromPins)
        : getScoreV2CurveYMax({
            tilecount,
            levelData: effectiveLevelData,
            difficultyDict,
            speed,
            isNoHoldTap,
            excludePurePerfect: disablePP,
          });
    if (maxScore <= 0) return [0, 1];
    return [0, maxScore];
  }, [
    yAxisMax,
    disablePP,
    displayData,
    resolvedPinMarkers,
    tilecount,
    effectiveLevelData,
    difficultyDict,
    speed,
    isNoHoldTap,
  ]);

  const xAxisDomain = useMemo(() => {
    const pcts = displayData.map((d) => d.accuracyPct);
    if (resolvedPinMarkers.length) {
      pcts.push(...resolvedPinMarkers.map((p) => p.accuracyPct));
    }
    return scoreV2GraphXAxisDomain(pcts);
  }, [displayData, resolvedPinMarkers]);

  const handleSliderChange = (e) => {
    setMisses(Math.max(0, parseInt(e.target.value, 10) || 0));
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setMisses(0);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      setMisses(parsed);
    }
  };

  if (!tilecount || tilecount <= 0) {
    return (
      <div className="scorev2-graph">
        <p className="scorev2-graph__empty">
          {t("levelDetail.scoreGraph.noTilecount", { defaultValue: "Tilecount is required to plot this chart." })}
        </p>
      </div>
    );
  }

  return (
    <div className="scorev2-graph">
      <div className="scorev2-graph__controls">
        <div className="scorev2-graph__misses-row">
          <span className="scorev2-graph__misses-label">
            {t("levelDetail.scoreGraph.missesLabel", { defaultValue: "Misses" })}
          </span>
          <input
            type="range"
            className="scorev2-graph__misses-slider"
            min={0}
            max={SLIDER_MAX}
            value={Math.min(misses, SLIDER_MAX)}
            onChange={handleSliderChange}
            aria-label={t("levelDetail.scoreGraph.missesAria", { defaultValue: "Miss count" })}
          />
          <input
            type="number"
            className="scorev2-graph__misses-input"
            min={0}
            value={misses}
            onChange={handleInputChange}
            aria-label={t("levelDetail.scoreGraph.missesAria", { defaultValue: "Miss count" })}
          />
        </div>
      </div>
      {displayData.length === 0 ? (
        <p className="scorev2-graph__empty">
          {t("levelDetail.scoreGraph.emptyCurve", { defaultValue: "No score curve data for this level." })}
        </p>
      ) : (
        <div className="scorev2-graph__chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={displayData}
              margin={{ top: 8, right: 28, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.08)"
                vertical={false}
              />
              <XAxis
                dataKey="accuracyPct"
                type="number"
                domain={xAxisDomain}
                allowDataOverflow
                tick={{ fill: "var(--color-gray-2)", fontSize: 11 }}
                tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                tickLine={false}
              />
              <YAxis
                dataKey="score"
                domain={yAxisDomain}
                allowDataOverflow
                tick={{ fill: "var(--color-gray-2)", fontSize: 11 }}
                tickFormatter={(v) => formatScore(v)}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<ScoreV2GraphTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--btn-primary)"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              {resolvedPinMarkers.map((pin) => {
                const style = PIN_MARKER_STYLE[pin.variant] ?? PIN_MARKER_STYLE.pin1;
                return (
                  <ReferenceDot
                    key={pin.id}
                    x={pin.accuracyPct}
                    y={pin.score}
                    r={5}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={2}
                    isFront
                    ifOverflow="visible"
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

ScoreV2Graph.propTypes = {
  tilecount: PropTypes.number,
  levelData: PropTypes.shape({
    baseScore: PropTypes.number,
    ppBaseScore: PropTypes.number,
    diffId: PropTypes.number,
    difficulty: PropTypes.object,
  }).isRequired,
  difficultyDict: PropTypes.object,
  speed: PropTypes.number,
  isNoHoldTap: PropTypes.bool,
  disablePP: PropTypes.bool,
  xaccCurve: PropTypes.shape({
    poleOffset: PropTypes.number,
    topMultiplier: PropTypes.number,
  }),
  pinMarkers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      accuracyPct: PropTypes.number.isRequired,
      score: PropTypes.number.isRequired,
      variant: PropTypes.oneOf(["anchor", "pin1", "pin2"]),
    }),
  ),
  yAxisMax: PropTypes.number,
  pinMarkersUseExactScores: PropTypes.bool,
};
