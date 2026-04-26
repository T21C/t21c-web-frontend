import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./DifficultyGraph.css";

const CustomTooltip = ({ active, payload, label, labelMode }) => {
  if (active && payload && payload.length) {
    const difficulty = payload[0].payload;
    const lm = labelMode;
    const showPasses = lm === "all" || lm === "passes";
    const showLevels = lm === "all" || lm === "levels";
    return (
      <div className="difficulty-graph__custom-tooltip">
        <div className="difficulty-graph__tooltip-content">
          <div className="difficulty-graph__tooltip-left">
            <img
              src={difficulty.icon}
              alt={label}
              className="difficulty-graph__difficulty-icon"
            />
            <span
              className="difficulty-graph__tooltip-label"
              style={{ color: difficulty.originalColor }}
            >
              {label}
            </span>
          </div>
          <div className="difficulty-graph__tooltip-right">
            <div className="difficulty-graph__tooltip-stats">
              {showPasses ? (
                <span className="difficulty-graph__tooltip-value">
                  {difficulty.passCount.toLocaleString()} Passes
                </span>
              ) : null}
              {showLevels ? (
                <span className="difficulty-graph__tooltip-value">
                  {difficulty.levelCount.toLocaleString()} Levels
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
  labelMode: PropTypes.oneOf(["passes", "levels", "all"]),
};

export const DifficultyGraph = ({ data, mode, labelMode }) => {
  const { difficultyDict } = useDifficultyContext();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  /** Which counts appear in the tooltip; defaults to `mode` (one line). Use `"all"` for both. */
  const effectiveLabelMode = labelMode ?? mode;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Combine difficulties with "J" variants
  const combinedData = data.reduce((acc, diff) => {
    // Skip if it's a J variant
    if (diff.name.endsWith("J")) {
      // Find the parent difficulty
      const parentName = diff.name.slice(0, -1); // Remove the J
      const parentDiff = acc.find((d) => d.name === parentName);

      if (parentDiff) {
        // Add the J variant's counts to the parent
        parentDiff.passCount += diff.passCount;
        parentDiff.levelCount += diff.levelCount;
      }
      return acc;
    }

    // For non-J variants, add them to the accumulator
    acc.push({
      name: diff.name,
      passCount: diff.passCount,
      levelCount: diff.levelCount,
      id: diff.id,
    });

    return acc;
  }, []);

  const chartData = combinedData.map((diff) => {
    const difficultyInfo = difficultyDict[diff.id] || {};
    return {
      name: diff.name,
      value: mode === "passes" ? diff.passCount : diff.levelCount,
      passCount: diff.passCount,
      levelCount: diff.levelCount,
      fill: difficultyInfo.color || "#ff2ad1",
      originalColor: difficultyInfo.color || "#ff2ad1",
      icon: difficultyInfo.icon || null,
    };
  });

  const containerProps = isMobile
    ? {
        width: "100%",
        height: 200,
      }
    : {
        width: "100%",
        height: 300,
      };

  return (
    <div className="difficulty-graph">
      <ResponsiveContainer {...containerProps}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barGap={0}
          barCategoryGap={-0.5}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke="#ffffff"
            fontSize={12}
            tickLine={false}
            interval={isMobile ? 3 : 1}
            angle={isMobile ? 45 : 0}
            textAnchor={isMobile ? "start" : "middle"}
            height={isMobile ? 60 : 30}
          />
          <YAxis
            stroke="#ffffff"
            fontSize={isMobile ? 10 : 12}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={isMobile ? 35 : 45}
          />
          <Tooltip
            content={<CustomTooltip labelMode={effectiveLabelMode} />}
            cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
            offset={10}
            wrapperStyle={{
              outline: "none",
              zIndex: 100,
            }}
            animationDuration={0}
          />
          <Bar
            dataKey="value"
            name={mode === "passes" ? "Passes" : "Levels"}
            onMouseEnter={(barData, index, e) => {
              e.target.style.fill = barData.payload.originalColor;
            }}
            onMouseLeave={(barData, index, e) => {
              e.target.style.fill = barData.payload.fill;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

DifficultyGraph.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      passCount: PropTypes.number,
      levelCount: PropTypes.number,
    }),
  ).isRequired,
  mode: PropTypes.oneOf(["passes", "levels"]).isRequired,
  labelMode: PropTypes.oneOf(["passes", "levels", "all"]),
};

