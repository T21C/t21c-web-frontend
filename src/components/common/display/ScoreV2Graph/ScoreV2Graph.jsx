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
} from "recharts";
import {
  enumerateScoreV2CurvePoints,
  getScoreV2CurveYMax,
  isPurePerfectAccuracy,
  SCOREV2_CURVE_ACCURACY_CUTOFF,
} from "@/utils/scoreV2Curve";
import { formatScore } from "@/utils/Utility";
import { pickLevelXaccCurve } from "@/utils/scoreV2XaccCurve.js";
import { ScoreV2GraphTooltip } from "./ScoreV2GraphTooltip";
import "./ScoreV2Graph.css";

const SLIDER_MAX = 50;

export const ScoreV2Graph = ({
  tilecount,
  levelData,
  difficultyDict,
  speed = 1,
  isNoHoldTap = false,
  disablePP = false,
  xaccCurve,
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

  const yAxisDomain = useMemo(() => {
    const pool = disablePP
      ? zeroMissCurve.filter((p) => !isPurePerfectAccuracy(p.accuracy))
      : zeroMissCurve;
    const maxFromCurve = pool.length
      ? Math.max(...pool.map((p) => p.score))
      : 0;
    const maxScore =
      maxFromCurve > 0
        ? maxFromCurve
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
  }, [zeroMissCurve, disablePP, tilecount, effectiveLevelData, difficultyDict, speed, isNoHoldTap]);

  const xAxisDomain = useMemo(() => {
    if (!displayData.length) return [SCOREV2_CURVE_ACCURACY_CUTOFF * 100, 100];
    const pcts = displayData.map((d) => d.accuracyPct);
    const dataMin = Math.min(...pcts);
    const dataMax = Math.max(...pcts);
    const span = Math.max(dataMax - dataMin, 0.5);
    return [
      Math.max(SCOREV2_CURVE_ACCURACY_CUTOFF * 100, dataMin - span * 0.02),
      dataMax + Math.max(span * 0.1, 0.35),
    ];
  }, [displayData]);

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
};
