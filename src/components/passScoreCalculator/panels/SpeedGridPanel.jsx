// tuf-search: #SpeedGridPanel #passScoreCalculator
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Pure perfect = exactly 100% accuracy only. */
function isPurePerfectAccuracy(accuracy) {
  return Number(accuracy) === 1;
}

function formatAccTick(acc) {
  if (Number(acc) === 1) return '100%';
  const pct = Number(acc) * 100;
  if (pct >= 99.995) return `${pct.toFixed(4)}%`;
  if (pct >= 99) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(1)}%`;
}

function formatSpeedTick(speed) {
  return `${Number(speed)}×`;
}

/** Evenly spaced ticks including both ends; drop a stride tick that would crowd the last. */
function pickAxisTicks(values, every, format) {
  const last = values.length - 1;
  if (last < 0) return [];
  const ticks = [];
  for (let i = 0; i <= last; i += 1) {
    if (i === 0 || i === last || i % every === 0) {
      ticks.push({ i, label: format(values[i]) });
    }
  }
  if (ticks.length >= 2) {
    const prev = ticks[ticks.length - 2];
    const end = ticks[ticks.length - 1];
    if (end.i - prev.i < every * 0.75) {
      ticks.splice(ticks.length - 2, 1);
    }
  }
  return ticks;
}

function RangeLegend({ label, min, max, variant }) {
  return (
    <div className={`psc-heatmap-legend psc-heatmap-legend--${variant}`} aria-hidden>
      <span className="psc-heatmap-legend__label">{label}</span>
      <span>{min.toFixed(0)}</span>
      <div className="psc-heatmap-legend__bar" />
      <span>{max.toFixed(0)}</span>
    </div>
  );
}

function normalizeRange(min, max) {
  let lo = min;
  let hi = max;
  if (!Number.isFinite(lo)) lo = 0;
  if (!Number.isFinite(hi) || hi <= lo) hi = lo + 1;
  return { min: lo, max: hi };
}

function parseCssColor(value) {
  const raw = String(value || '').trim();
  const hex = raw.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      h = h.split('').map((c) => c + c).join('');
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  const rgb = raw.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }
  return { r: 74, g: 144, b: 226 };
}

function mixRgb(a, b, t) {
  const u = Math.min(1, Math.max(0, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u),
  };
}

function rgbCss({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

function scoreT(score, min, max) {
  const span = max - min;
  if (span <= 1e-9) return 0.5;
  return Math.min(1, Math.max(0, (score - min) / span));
}

function readThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    primary: parseCssColor(styles.getPropertyValue('--btn-primary')),
    success: parseCssColor(styles.getPropertyValue('--btn-success')),
    dark: parseCssColor(styles.getPropertyValue('--color-black')),
    tick: parseCssColor(styles.getPropertyValue('--color-gray-2')),
  };
}

function SpeedGridHeatmap({ chart, speedLabel, accuracyLabel }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState(null);
  const themeRef = useRef(null);

  const { speeds, accuracies, cells, meta } = chart;
  const cols = speeds.length;
  const rows = accuracies.length;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    themeRef.current = readThemeColors();
    const canvas = canvasRef.current;
    if (!canvas || size.w < 2 || size.h < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(size.w * dpr);
    canvas.height = Math.floor(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const theme = themeRef.current;
    const cellW = size.w / cols;
    const cellH = size.h / rows;
    const { nonPpMin, nonPpMax, ppMin, ppMax } = meta;

    ctx.clearRect(0, 0, size.w, size.h);
    for (let si = 0; si < cols; si += 1) {
      for (let ai = 0; ai < rows; ai += 1) {
        const score = cells[si][ai];
        if (!Number.isFinite(score)) continue;
        const isPp = isPurePerfectAccuracy(accuracies[ai]);
        const t = isPp
          ? scoreT(score, ppMin, ppMax)
          : scoreT(score, nonPpMin, nonPpMax);
        const hot = isPp ? theme.success : theme.primary;
        const fill = mixRgb(theme.dark, hot, t);
        ctx.fillStyle = rgbCss(fill);
        const y = size.h - (ai + 1) * cellH;
        ctx.fillRect(si * cellW, y, cellW + 0.5, cellH + 0.5);
      }
    }
  }, [accuracies, cells, cols, meta, rows, size.h, size.w]);

  const hitCell = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas || size.w < 1 || size.h < 1) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
      const si = Math.min(cols - 1, Math.max(0, Math.floor((x / rect.width) * cols)));
      const ai = Math.min(
        rows - 1,
        Math.max(0, Math.floor(((rect.height - y) / rect.height) * rows)),
      );
      const score = cells[si][ai];
      if (!Number.isFinite(score)) return null;
      const accuracy = accuracies[ai];
      return {
        si,
        ai,
        score,
        speedLabel: `${speeds[si]}×`,
        accLabel: formatAccTick(accuracy),
        isPp: isPurePerfectAccuracy(accuracy),
        left: x,
        top: y,
      };
    },
    [accuracies, cells, cols, rows, size.h, size.w, speeds],
  );

  return (
    <div className="psc-heatmap-plot">
      <div className="psc-heatmap-yaxis" aria-hidden>
        <span className="psc-heatmap-axis-title psc-heatmap-axis-title--y">{accuracyLabel}</span>
        {meta.accTicks.map(({ i, label }) => (
          <span
            key={`acc-${i}`}
            className="psc-heatmap-tick psc-heatmap-tick--y"
            style={{ bottom: `${((i + 0.5) / rows) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="psc-heatmap-main">
        <div
          ref={wrapRef}
          className="psc-heatmap-canvas-wrap"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => setHover(hitCell(e.clientX, e.clientY))}
        >
          <canvas ref={canvasRef} className="psc-heatmap-canvas" />
          {hover ? (
            <div
              className="psc-heatmap-tooltip"
              style={{ left: hover.left + 12, top: hover.top + 12 }}
            >
              <div>
                {hover.speedLabel} · {hover.accLabel}
                {hover.isPp ? ' · PP' : ''}
              </div>
              <div className="psc-heatmap-tooltip__score">{hover.score.toFixed(2)}</div>
            </div>
          ) : null}
        </div>
        <div className="psc-heatmap-xaxis" aria-hidden>
          {meta.speedTicks.map(({ i, label }) => (
            <span
              key={`spd-${i}`}
              className="psc-heatmap-tick psc-heatmap-tick--x"
              style={{ left: `${((i + 0.5) / cols) * 100}%` }}
            >
              {label}
            </span>
          ))}
          <span className="psc-heatmap-axis-title psc-heatmap-axis-title--x">{speedLabel}</span>
        </div>
      </div>
    </div>
  );
}

function SpeedGridPanelInner({ result }) {
  const { t } = useTranslation('pages');
  const grid = result?.speedGrid;
  const chart = useMemo(() => {
    if (!grid?.speeds?.length || !grid?.accuracies?.length) return null;
    const { speeds, accuracies, cells } = grid;
    let nonPpMin = Infinity;
    let nonPpMax = -Infinity;
    let ppMin = Infinity;
    let ppMax = -Infinity;
    let hasPp = false;
    let hasNonPp = false;

    for (let si = 0; si < speeds.length; si += 1) {
      for (let ai = 0; ai < accuracies.length; ai += 1) {
        const score = cells[si][ai];
        if (!Number.isFinite(score)) continue;
        if (isPurePerfectAccuracy(accuracies[ai])) {
          hasPp = true;
          ppMin = Math.min(ppMin, score);
          ppMax = Math.max(ppMax, score);
        } else {
          hasNonPp = true;
          nonPpMin = Math.min(nonPpMin, score);
          nonPpMax = Math.max(nonPpMax, score);
        }
      }
    }
    if (!hasPp && !hasNonPp) return null;

    const nonPp = normalizeRange(nonPpMin, nonPpMax);
    const pp = normalizeRange(ppMin, ppMax);
    const speedTickEvery = Math.max(1, Math.ceil(speeds.length / 12));
    const accTickEvery = Math.max(1, Math.ceil(accuracies.length / 10));
    const speedTicks = pickAxisTicks(speeds, speedTickEvery, formatSpeedTick);
    const accTicks = pickAxisTicks(accuracies, accTickEvery, formatAccTick);

    return {
      speeds,
      accuracies,
      cells,
      hasPp,
      hasNonPp,
      meta: {
        nonPpMin: nonPp.min,
        nonPpMax: nonPp.max,
        ppMin: pp.min,
        ppMax: pp.max,
        speedTicks,
        accTicks,
      },
    };
  }, [grid]);

  if (!chart) return null;

  return (
    <div className="psc-panel psc-panel--speed-grid">
      <h3>{t('passSubmission.calculator.panels.speedGrid')}</h3>
      <div className="psc-heatmap">
        <SpeedGridHeatmap
          chart={chart}
          speedLabel={t('passSubmission.calculator.labels.speed')}
          accuracyLabel={t('passSubmission.calculator.labels.accuracy')}
        />
        <div className="psc-heatmap-legends">
          {chart.hasNonPp ? (
            <RangeLegend
              label={t('passSubmission.calculator.speedGrid.legendNonPp')}
              min={chart.meta.nonPpMin}
              max={chart.meta.nonPpMax}
              variant="non-pp"
            />
          ) : null}
          {chart.hasPp ? (
            <RangeLegend
              label={t('passSubmission.calculator.speedGrid.legendPp')}
              min={chart.meta.ppMin}
              max={chart.meta.ppMax}
              variant="pp"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const SpeedGridPanel = memo(SpeedGridPanelInner);
