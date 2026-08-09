// tuf-search: #SubmissionPage #useSubmissionLabelWaypoints #labelMotion
import { useEffect } from 'react';

const BOB_PEAK_Y_REM = -0.3;
const BOB_PEAK_BRIGHT = 0.12;
const EASE = 'var(--ease-in-out-sine)';

/**
 * Drives label bob/spin via discrete waypoints; CSS transitions interpolate between them.
 * JS only updates at waypoint boundaries (not every frame).
 * Caller disables this hook under minimal / reduced motion (same path).
 */
export function useSubmissionLabelWaypoints({ enabled, stageRef, motionRef }) {
  useEffect(() => {
    if (!enabled) return undefined;

    const stage = stageRef.current;
    if (!stage) return undefined;

    const cleanups = [];

    const bindSide = (side) => {
      const label = stage.querySelector(`.submission-label--${side}`);
      if (!label) return;

      const lines = label.querySelectorAll('.submission-label__line');
      const configs = [
        { bobMs: 1700, spinMs: 2000, spinDir: 1, spinDeg: 2 },
        { bobMs: 2400, spinMs: 1600, spinDir: -1, spinDeg: 1.7 },
      ];

      lines.forEach((line, index) => {
        const config = configs[index] ?? configs[0];
        const bob = line.querySelector('.submission-label__bob');
        const spin = line.querySelector('.submission-label__spin');
        if (!bob || !spin) return;

        cleanups.push(
          runWaypointLoop({
            element: bob,
            periodMs: config.bobMs,
            getIntensity: () => motionRef.current[side] ?? 0,
            buildWaypoint: (intensity, phase) => {
              const up = phase === 1;
              const y = up ? BOB_PEAK_Y_REM * intensity : 0;
              const bright = 1 + (up ? BOB_PEAK_BRIGHT * intensity : 0);
              return {
                transform: `translateY(${y}rem)`,
                filter: `brightness(${bright})`,
              };
            },
          }),
        );

        cleanups.push(
          runWaypointLoop({
            element: spin,
            periodMs: config.spinMs,
            getIntensity: () => motionRef.current[side] ?? 0,
            buildWaypoint: (intensity, phase) => {
              // spinDeg = peak amplitude; oscillate CW/CCW (±amp).
              // spinDir only sets which extreme is visited first.
              const amp = config.spinDeg * intensity;
              const sign = phase === 1 ? 1 : -1;
              const rot = sign * config.spinDir * amp;
              return {
                transform: `rotate(${rot}deg)`,
              };
            },
          }),
        );
      });
    };

    bindSide('pass');
    bindSide('level');

    return () => {
      cleanups.forEach((stop) => stop());
    };
  }, [enabled, stageRef, motionRef]);
}

function runWaypointLoop({
  element,
  periodMs,
  getIntensity,
  buildWaypoint,
}) {
  let timeoutId = 0;
  let settleId = 0;
  let cancelled = false;
  let phase = 0;

  const apply = (waypoint, durationMs) => {
    element.style.transition =
      `transform ${durationMs}ms ${EASE}, filter ${durationMs}ms ${EASE}`;
    element.style.transform = waypoint.transform;
    if (waypoint.filter != null) {
      element.style.filter = waypoint.filter;
    }
  };

  const rest = () => buildWaypoint(0, 0);

  const goRest = () => {
    phase = 0;
    apply(rest(), Math.min(periodMs, 480));
  };

  const step = () => {
    if (cancelled) return;

    const intensity = getIntensity();
    if (intensity <= 0.01) {
      goRest();
      timeoutId = window.setTimeout(step, Math.min(periodMs, 640));
      return;
    }

    phase = phase === 0 ? 1 : 0;
    apply(buildWaypoint(intensity, phase), periodMs);
    timeoutId = window.setTimeout(step, Math.max(periodMs, 32));
  };

  apply(rest(), 0);
  timeoutId = window.setTimeout(step, 16);
  settleId = window.setInterval(() => {
    if (cancelled) return;
    if (getIntensity() > 0.01) return;
    if (phase === 0) return;
    window.clearTimeout(timeoutId);
    goRest();
    timeoutId = window.setTimeout(step, Math.min(periodMs, 640));
  }, 100);

  return () => {
    cancelled = true;
    window.clearTimeout(timeoutId);
    window.clearInterval(settleId);
    element.style.transition = '';
    element.style.transform = '';
    element.style.filter = '';
  };
}
