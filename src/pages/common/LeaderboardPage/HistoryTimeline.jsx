// tuf-search: #HistoryTimeline #historyTimeline #leaderboard
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';
import './historytimeline.css';

const DAY_MS = 86400000;
const TICK_WIDTH = 14;
/** Half-tick offset so the center indicator locks to the tick mark, not the cell's left edge. */
const TICK_CENTER = TICK_WIDTH / 2;
const DEBOUNCE_MS = 280;

function scrollLeftForIndex(idx) {
  return idx * TICK_WIDTH + TICK_CENTER;
}

function indexFromScrollLeft(scrollLeft, dayCount) {
  const idx = Math.round((scrollLeft - TICK_CENTER) / TICK_WIDTH);
  return Math.max(0, Math.min(dayCount - 1, idx));
}

function parseIsoDate(s) {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(s ?? '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

function toIsoDate(dt) {
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function clampDate(iso, minIso, maxIso) {
  if (!iso) return minIso || maxIso || null;
  if (minIso && iso < minIso) return minIso;
  if (maxIso && iso > maxIso) return maxIso;
  return iso;
}

function daysInMonthUtc(year, month1) {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function buildDayList(minIso, maxIso) {
  const min = parseIsoDate(minIso);
  const max = parseIsoDate(maxIso);
  if (!min || !max || min > max) return [];
  const out = [];
  for (let t = min.getTime(); t <= max.getTime(); t += DAY_MS) {
    out.push(toIsoDate(new Date(t)));
  }
  return out;
}

/**
 * Ruler-style timeline scrubber with year/month/day CustomSelects.
 * `onChange` fires live while scrubbing; `onChangeComplete` is debounced for fetches.
 */
const HistoryTimeline = ({
  value,
  min,
  max,
  onChange,
  onChangeComplete,
}) => {
  const { t } = useTranslation('pages');
  const trackRef = useRef(null);
  const debounceRef = useRef(null);
  const isProgrammaticScrollRef = useRef(false);
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startScroll: 0,
    pointerId: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [visualDate, setVisualDate] = useState(() => clampDate(value, min, max));

  const dayList = useMemo(() => buildDayList(min, max), [min, max]);
  const dayIndexByIso = useMemo(() => {
    const map = new Map();
    dayList.forEach((iso, i) => map.set(iso, i));
    return map;
  }, [dayList]);

  const effectiveDate = clampDate(visualDate || value, min, max);

  const emitComplete = useCallback(
    (iso) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChangeComplete?.(iso);
      }, DEBOUNCE_MS);
    },
    [onChangeComplete],
  );

  const setDate = useCallback(
    (iso, { scroll = true, complete = true } = {}) => {
      const next = clampDate(iso, min, max);
      if (!next) return;
      setVisualDate(next);
      onChange?.(next);
      if (complete) emitComplete(next);
      if (scroll && trackRef.current) {
        const idx = dayIndexByIso.get(next);
        if (idx != null) {
          isProgrammaticScrollRef.current = true;
          trackRef.current.scrollLeft = scrollLeftForIndex(idx);
          requestAnimationFrame(() => {
            isProgrammaticScrollRef.current = false;
          });
        }
      }
    },
    [min, max, onChange, emitComplete, dayIndexByIso],
  );

  useEffect(() => {
    const next = clampDate(value, min, max);
    if (!next) return;
    setVisualDate((prev) => (prev === next ? prev : next));
    const track = trackRef.current;
    if (!track) return;
    const idx = dayIndexByIso.get(next);
    if (idx == null) return;
    isProgrammaticScrollRef.current = true;
    track.scrollLeft = scrollLeftForIndex(idx);
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false;
    });
  }, [value, min, max, dayIndexByIso]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleScroll = () => {
    if (isProgrammaticScrollRef.current || !trackRef.current || dayList.length === 0) return;
    const idx = indexFromScrollLeft(trackRef.current.scrollLeft, dayList.length);
    const iso = dayList[idx];
    if (!iso || iso === visualDate) return;
    setVisualDate(iso);
    onChange?.(iso);
    emitComplete(iso);
  };

  const endDrag = useCallback((pointerId) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    setIsDragging(false);
    const track = trackRef.current;
    if (track && pointerId != null) {
      try {
        if (track.hasPointerCapture?.(pointerId)) {
          track.releasePointerCapture(pointerId);
        }
      } catch {
        // ignore release errors when pointer already released
      }
    }
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const track = trackRef.current;
    if (!track) return;
    // Leave native scrollbar interaction alone (clicks near the bottom edge).
    const rect = track.getBoundingClientRect();
    if (rect.height - (e.clientY - rect.top) <= 8) return;

    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startScroll: track.scrollLeft,
      pointerId: e.pointerId,
    };
    track.setPointerCapture(e.pointerId);
    setIsDragging(true);
    e.preventDefault();
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const track = trackRef.current;
    if (!track) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 2) drag.moved = true;
    // Content follows the pointer (grab-and-drag); 1px = 1 scroll px for fine control.
    track.scrollLeft = drag.startScroll - dx;
  };

  const handlePointerUp = (e) => {
    endDrag(e.pointerId);
  };

  const handlePointerCancel = (e) => {
    endDrag(e.pointerId);
  };

  const handleTickClick = (iso, e) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
      return;
    }
    setDate(iso);
  };

  const parsed = parseIsoDate(effectiveDate);
  const year = parsed?.getUTCFullYear() ?? null;
  const month = parsed ? parsed.getUTCMonth() + 1 : null;
  const day = parsed?.getUTCDate() ?? null;

  const yearOptions = useMemo(() => {
    const minDt = parseIsoDate(min);
    const maxDt = parseIsoDate(max);
    if (!minDt || !maxDt) return [];
    const opts = [];
    for (let y = minDt.getUTCFullYear(); y <= maxDt.getUTCFullYear(); y++) {
      opts.push({ value: y, label: String(y) });
    }
    return opts;
  }, [min, max]);

  const monthOptions = useMemo(() => {
    if (year == null) return [];
    const minDt = parseIsoDate(min);
    const maxDt = parseIsoDate(max);
    if (!minDt || !maxDt) return [];
    const start = year === minDt.getUTCFullYear() ? minDt.getUTCMonth() + 1 : 1;
    const end = year === maxDt.getUTCFullYear() ? maxDt.getUTCMonth() + 1 : 12;
    const opts = [];
    for (let m = start; m <= end; m++) {
      opts.push({
        value: m,
        label: t(`leaderboard.past.months.${m}`, { defaultValue: String(m).padStart(2, '0') }),
      });
    }
    return opts;
  }, [year, min, max, t]);

  const dayOptions = useMemo(() => {
    if (year == null || month == null) return [];
    const minDt = parseIsoDate(min);
    const maxDt = parseIsoDate(max);
    if (!minDt || !maxDt) return [];
    const dim = daysInMonthUtc(year, month);
    let start = 1;
    let end = dim;
    if (year === minDt.getUTCFullYear() && month === minDt.getUTCMonth() + 1) {
      start = minDt.getUTCDate();
    }
    if (year === maxDt.getUTCFullYear() && month === maxDt.getUTCMonth() + 1) {
      end = maxDt.getUTCDate();
    }
    const opts = [];
    for (let d = start; d <= end; d++) {
      opts.push({ value: d, label: String(d).padStart(2, '0') });
    }
    return opts;
  }, [year, month, min, max]);

  const applyYmd = (y, m, d) => {
    if (y == null || m == null || d == null) return;
    const dim = daysInMonthUtc(y, m);
    const safeDay = Math.min(d, dim);
    setDate(toIsoDate(new Date(Date.UTC(y, m - 1, safeDay))));
  };

  if (!min || !max || dayList.length === 0) {
    return (
      <div className="history-timeline history-timeline--empty">
        <p className="history-timeline__empty-msg">{t('leaderboard.past.noData')}</p>
      </div>
    );
  }

  return (
    <div className="history-timeline">
      <div className="history-timeline__selects">
        <div className="history-timeline__select">
          <span className="history-timeline__select-label">{t('leaderboard.past.date.year')}</span>
          <CustomSelect
            value={yearOptions.find((o) => o.value === year) ?? null}
            onChange={(opt) => applyYmd(opt?.value, month, day)}
            options={yearOptions}
            width="6.5rem"
            direction="auto"
          />
        </div>
        <div className="history-timeline__select">
          <span className="history-timeline__select-label">{t('leaderboard.past.date.month')}</span>
          <CustomSelect
            value={monthOptions.find((o) => o.value === month) ?? null}
            onChange={(opt) => applyYmd(year, opt?.value, day)}
            options={monthOptions}
            width="8rem"
            direction="auto"
          />
        </div>
        <div className="history-timeline__select">
          <span className="history-timeline__select-label">{t('leaderboard.past.date.day')}</span>
          <CustomSelect
            value={dayOptions.find((o) => o.value === day) ?? null}
            onChange={(opt) => applyYmd(year, month, opt?.value)}
            options={dayOptions}
            width="5.5rem"
            direction="auto"
          />
        </div>
      </div>

      <div className="history-timeline__ruler-wrap">
        <div className="history-timeline__indicator" aria-hidden="true" />
        <div
          className={[
            'history-timeline__track',
            isDragging ? 'history-timeline__track--dragging' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          ref={trackRef}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={dayList.length - 1}
          aria-valuenow={dayIndexByIso.get(effectiveDate) ?? 0}
          aria-valuetext={effectiveDate}
          aria-label={t('leaderboard.past.timelineLabel')}
          tabIndex={0}
          onKeyDown={(e) => {
            const idx = dayIndexByIso.get(effectiveDate) ?? 0;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              const prev = dayList[Math.max(0, idx - 1)];
              if (prev) setDate(prev);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              const next = dayList[Math.min(dayList.length - 1, idx + 1)];
              if (next) setDate(next);
            } else if (e.key === 'Home') {
              e.preventDefault();
              setDate(dayList[0]);
            } else if (e.key === 'End') {
              e.preventDefault();
              setDate(dayList[dayList.length - 1]);
            }
          }}
        >
          <div
            className="history-timeline__spacer"
            style={{ width: '50%' }}
          />
          <div className="history-timeline__ticks">
            {dayList.map((iso) => {
              const dt = parseIsoDate(iso);
              const isMonthStart = dt?.getUTCDate() === 1;
              const isSelected = iso === effectiveDate;
              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    'history-timeline__tick',
                    isMonthStart ? 'history-timeline__tick--month' : '',
                    isSelected ? 'history-timeline__tick--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ width: TICK_WIDTH }}
                  title={iso}
                  onClick={(e) => handleTickClick(iso, e)}
                >
                  <span className="history-timeline__tick-mark" />
                  {isMonthStart && (
                    <span className="history-timeline__tick-label">
                      {t(`leaderboard.past.monthsShort.${dt.getUTCMonth() + 1}`, {
                        defaultValue: String(dt.getUTCMonth() + 1),
                      })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div
            className="history-timeline__spacer"
            style={{ width: '50%' }}
          />
        </div>
      </div>

      <p className="history-timeline__current">{effectiveDate}</p>
    </div>
  );
};

export default HistoryTimeline;
