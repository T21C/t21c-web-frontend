// tuf-search: #ScoreV2GraphCustomLayer #scorev2Graph
import PropTypes from "prop-types";
import { Curve } from "recharts";
import { interpolateCurveScoreAtAccuracy } from "@/utils/scoreV2Curve";

const PIN_SLICE_STROKE = {
  pin1: "var(--btn-primary)",
  pin2: "var(--warning-color, var(--btn-primary))",
};

function getAxis(map) {
  if (!map || typeof map !== "object") {
    return null;
  }
  const values = Object.values(map);
  return values.length ? values[0] : null;
}

function mapPointsToPixels(points, xAxis, yAxis) {
  if (!points?.length || !xAxis?.scale || !yAxis?.scale) {
    return [];
  }
  return points
    .map((p) => {
      const x = xAxis.scale(p.accuracyPct);
      const y = yAxis.scale(p.score);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }
      return { x, y };
    })
    .filter(Boolean);
}

/**
 * Non-interactive decorations: miss-slice curves, axis cursor, zero-miss hover dot.
 */
export function ScoreV2GraphCustomLayer({
  xAxisMap,
  yAxisMap,
  offset,
  layoutRef,
  overlays,
  hoverAccuracyPct,
  zeroMissCurveData,
}) {
  if (layoutRef) {
    layoutRef.current = offset;
  }
  const xAxis = getAxis(xAxisMap);
  const yAxis = getAxis(yAxisMap);
  if (!xAxis?.scale || !yAxis?.scale) {
    return null;
  }

  const hoverScore =
    hoverAccuracyPct != null && zeroMissCurveData?.length
      ? interpolateCurveScoreAtAccuracy(
          zeroMissCurveData,
          hoverAccuracyPct,
        )
      : null;

  let cursorX = null;
  let dotCx = null;
  let dotCy = null;
  if (
    Number.isFinite(hoverAccuracyPct) &&
    Number.isFinite(hoverScore)
  ) {
    cursorX = xAxis.scale(hoverAccuracyPct);
    dotCx = xAxis.scale(hoverAccuracyPct);
    dotCy = yAxis.scale(hoverScore);
  }

  const plotTop = offset?.top ?? 0;
  const plotHeight = offset?.height ?? 0;

  return (
    <g className="scorev2-graph__custom-layer" pointerEvents="none">
      {overlays?.length
        ? overlays.map((overlay) => {
            const pixelPoints = mapPointsToPixels(
              overlay.points,
              xAxis,
              yAxis,
            );
            if (pixelPoints.length < 2) {
              return null;
            }
            return (
              <Curve
                key={overlay.id}
                points={pixelPoints}
                type="monotone"
                layout="horizontal"
                connectNulls
                stroke={PIN_SLICE_STROKE[overlay.variant] ?? PIN_SLICE_STROKE.pin1}
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeOpacity={0.85}
                fill="none"
                pointerEvents="none"
                isAnimationActive={false}
              />
            );
          })
        : null}
      {Number.isFinite(cursorX) && plotHeight > 0 ? (
        <line
          className="scorev2-graph__axis-cursor"
          x1={cursorX}
          x2={cursorX}
          y1={plotTop}
          y2={plotTop + plotHeight}
          stroke="var(--color-white-t55)"
          strokeWidth={1}
          pointerEvents="none"
        />
      ) : null}
      {Number.isFinite(dotCx) && Number.isFinite(dotCy) ? (
        <circle
          className="scorev2-graph__axis-hover-dot"
          cx={dotCx}
          cy={dotCy}
          r={4}
          fill="var(--btn-primary)"
          stroke="var(--color-white)"
          strokeWidth={2}
          pointerEvents="none"
        />
      ) : null}
    </g>
  );
}

ScoreV2GraphCustomLayer.propTypes = {
  xAxisMap: PropTypes.object,
  yAxisMap: PropTypes.object,
  layoutRef: PropTypes.shape({ current: PropTypes.object }),
  offset: PropTypes.shape({
    left: PropTypes.number,
    top: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
  }),
  overlays: PropTypes.array,
  hoverAccuracyPct: PropTypes.number,
  zeroMissCurveData: PropTypes.array,
};
