// tuf-search: #ScoreV2Graph #scorev2Graph #display
import { useCallback, useMemo, useRef, useState } from "react";
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
  Customized,
} from "recharts";
import {
  enumerateScoreV2CurvePoints,
  getScoreV2CurveYMax,
  isPurePerfectAccuracy,
  scoreV2GraphXAxisDomain,
  SCOREV2_XACC_ADMIN_GRAPH_X_DOMAIN,
  interpolateCurveScoreAtAccuracy,
  accuracyPctFromChartPointer,
  scoreV2GraphHoverAccuracyMax,
} from "@/utils/scoreV2Curve";
import { formatScore } from "@/utils/Utility";
import { pickLevelXaccCurve } from "@/utils/scoreV2XaccCurve.js";
import { ScoreV2GraphTooltip } from "./ScoreV2GraphTooltip";
import { ScoreV2GraphCustomLayer } from "./ScoreV2GraphCustomLayer";
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

/** Recharts series name for the primary (zero-miss) curve — only this line drives tooltips. */
const ZERO_MISS_CURVE_NAME = "zeroMiss";

export const ScoreV2Graph = ({
  tilecount,
  levelData,
  difficultyDict,
  speed = 1,
  isNoHoldTap = false,
  disablePP = false,
  xaccCurve,
  pinMarkers,
  /** Dotted miss-count slices for admin xacc pins (misses > 0 only). */
  missSliceOverlays = null,
  /** When set and disablePP is false, Y axis is fixed to [0, yAxisMax]. With disablePP, top is derived from the visible curve. */
  yAxisMax = null,
  /** When true, pin markers use the given scores (admin editor); otherwise snap Y to the plotted curve. */
  pinMarkersUseExactScores = false,
  /** Admin xacc editor: hide misses control, fixed 95–100.5% x-axis, solid line always zero misses. */
  adminXaccEditor = false,
}) => {
  const { t } = useTranslation("pages");
  const [misses, setMisses] = useState(0);
  const [hoverAccuracyPct, setHoverAccuracyPct] = useState(null);
  const chartPlotOffsetRef = useRef(null);
  const chartMisses = adminXaccEditor ? 0 : misses;

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
    if (chartMisses === 0) return zeroMissCurve;
    return enumerateScoreV2CurvePoints({
      tilecount,
      misses: chartMisses,
      levelData: effectiveLevelData,
      difficultyDict,
      speed,
      isNoHoldTap,
    });
  }, [chartMisses, zeroMissCurve, levelCurveKey, tilecount, effectiveLevelData, difficultyDict, speed, isNoHoldTap]);

  const filterCurveForDisplay = useCallback(
    (points) => {
      if (!disablePP) return points;
      return points.filter((p) => !isPurePerfectAccuracy(p.accuracy));
    },
    [disablePP],
  );

  const displayData = useMemo(
    () => filterCurveForDisplay(chartData),
    [chartData, filterCurveForDisplay],
  );

  const overlayCurveData = useMemo(() => {
    if (!missSliceOverlays?.length) return [];
    return missSliceOverlays.map((overlay) => {
      const hitTiles =
        overlay.hitTiles > 0
          ? overlay.hitTiles
          : tilecount;
      const points = enumerateScoreV2CurvePoints({
        tilecount: hitTiles,
        misses: overlay.misses,
        levelData: effectiveLevelData,
        difficultyDict,
        speed,
        isNoHoldTap,
      });
      return {
        ...overlay,
        points: filterCurveForDisplay(points),
      };
    });
  }, [
    missSliceOverlays,
    tilecount,
    effectiveLevelData,
    difficultyDict,
    speed,
    isNoHoldTap,
    filterCurveForDisplay,
  ]);

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
    const maxFromOverlays = overlayCurveData.length
      ? Math.max(
          ...overlayCurveData.flatMap((o) =>
            o.points.length ? o.points.map((p) => p.score) : [0],
          ),
        )
      : 0;
    const maxScore =
      Math.max(maxFromCurve, maxFromPins, maxFromOverlays) > 0
        ? Math.max(maxFromCurve, maxFromPins, maxFromOverlays)
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
    overlayCurveData,
    tilecount,
    effectiveLevelData,
    difficultyDict,
    speed,
    isNoHoldTap,
  ]);

  const useAxisHover =
    adminXaccEditor || (overlayCurveData?.length ?? 0) > 0;

  const zeroMissDisplayData = useMemo(
    () => filterCurveForDisplay(zeroMissCurve),
    [zeroMissCurve, filterCurveForDisplay],
  );

  const tooltipCurveData = useAxisHover ? zeroMissDisplayData : displayData;

  const hoverAccuracyMax = useMemo(
    () => scoreV2GraphHoverAccuracyMax(zeroMissDisplayData, { disablePP }),
    [zeroMissDisplayData, disablePP],
  );

  const xAxisDomain = useMemo(() => {
    if (adminXaccEditor) {
      return [...SCOREV2_XACC_ADMIN_GRAPH_X_DOMAIN];
    }
    const pcts = displayData.map((d) => d.accuracyPct);
    if (resolvedPinMarkers.length) {
      pcts.push(...resolvedPinMarkers.map((p) => p.accuracyPct));
    }
    return scoreV2GraphXAxisDomain(pcts);
  }, [adminXaccEditor, displayData, resolvedPinMarkers]);

  const handleChartMouseMove = useCallback(
    (state) => {
      if (!useAxisHover) {
        return;
      }
      const acc = accuracyPctFromChartPointer(
        state?.chartX,
        chartPlotOffsetRef.current,
        xAxisDomain,
      );
      if (acc == null) {
        return;
      }
      const clamped =
        hoverAccuracyMax != null && Number.isFinite(hoverAccuracyMax)
          ? Math.min(acc, hoverAccuracyMax)
          : acc;
      setHoverAccuracyPct(clamped);
    },
    [useAxisHover, xAxisDomain, hoverAccuracyMax],
  );

  const handleChartMouseLeave = useCallback(() => {
    setHoverAccuracyPct(null);
  }, []);

  const renderCustomLayer = useCallback(
    (layerProps) => (
      <ScoreV2GraphCustomLayer
        {...layerProps}
        layoutRef={chartPlotOffsetRef}
        overlays={overlayCurveData}
        hoverAccuracyPct={hoverAccuracyPct}
        zeroMissCurveData={zeroMissDisplayData}
      />
    ),
    [overlayCurveData, hoverAccuracyPct, zeroMissDisplayData],
  );

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
      {!adminXaccEditor ? (
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
      ) : null}
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
              onMouseMove={useAxisHover ? handleChartMouseMove : undefined}
              onMouseLeave={useAxisHover ? handleChartMouseLeave : undefined}
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
                allowDataOverflow={!adminXaccEditor}
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
              {useAxisHover ? (
                <Tooltip
                  active={hoverAccuracyPct != null}
                  cursor={false}
                  isAnimationActive={false}
                  animationDuration={0}
                  content={() => (
                    <ScoreV2GraphTooltip
                      active={hoverAccuracyPct != null}
                      hoverAccuracyPct={hoverAccuracyPct}
                      curveData={tooltipCurveData}
                      axisTooltip
                    />
                  )}
                />
              ) : (
                <Tooltip
                  isAnimationActive={false}
                  animationDuration={0}
                  content={(tooltipProps) => (
                    <ScoreV2GraphTooltip {...tooltipProps} />
                  )}
                />
              )}
              <Line
                name={ZERO_MISS_CURVE_NAME}
                type="monotone"
                dataKey="score"
                stroke="var(--btn-primary)"
                strokeWidth={2}
                dot={false}
                activeDot={
                  useAxisHover
                    ? false
                    : { r: 4, stroke: "var(--color-white)", strokeWidth: 2 }
                }
                connectNulls
                isAnimationActive={false}
              />
              {useAxisHover ? (
                <Customized component={renderCustomLayer} />
              ) : null}
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
  adminXaccEditor: PropTypes.bool,
  missSliceOverlays: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      misses: PropTypes.number.isRequired,
      variant: PropTypes.oneOf(["pin1", "pin2"]),
      hitTiles: PropTypes.number,
    }),
  ),
};
