// tuf-search: #RatingAccuracyKernelChart #ratingAccuracy
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { formatAccuracyScore } from '@/utils/ratingAccuracy';
import './ratingAccuracyKernelChart.css';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point?.name) return null;
  return (
    <div className="rating-accuracy-kernel-chart__tooltip">
      <span className="rating-accuracy-kernel-chart__tooltip-name">{point.name}</span>
      <span className="rating-accuracy-kernel-chart__tooltip-k">
        {formatAccuracyScore(point.k)}
      </span>
    </div>
  );
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};

export const RatingAccuracyKernelChart = ({ chart }) => {
  const points = Array.isArray(chart?.points) ? chart.points : [];
  const data = points
    .filter((p) => p?.name && !p.phantom)
    .map((p) => ({
      name: p.name,
      k: Number(p.k) || 0,
      inRangeK: p.inRange ? Number(p.k) || 0 : 0,
    }));
  if (data.length === 0) return null;

  return (
    <div className="rating-accuracy-kernel-chart">
      <ResponsiveContainer width="100%" height={120}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="name"
            interval="preserveStartEnd"
            tick={{ fontSize: 10, fill: 'var(--color-white-t70)' }}
            axisLine={{ stroke: 'var(--color-white-t20)' }}
            tickLine={false}
          />
          <YAxis domain={[0, 1]} hide />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="k"
            stroke="none"
            fill="var(--color-purple-1)"
            fillOpacity={0.18}
            isAnimationActive={false}
          />
          <Bar
            dataKey="inRangeK"
            fill="var(--warning-color)"
            fillOpacity={0.45}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="k"
            stroke="var(--color-purple-1)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

RatingAccuracyKernelChart.propTypes = {
  chart: PropTypes.shape({
    points: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        k: PropTypes.number,
        inRange: PropTypes.bool,
        phantom: PropTypes.bool,
      })
    ),
  }),
};

export default RatingAccuracyKernelChart;
