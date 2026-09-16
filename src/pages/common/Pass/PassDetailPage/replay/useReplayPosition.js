// tuf-search: #useReplayPosition #replayTimeline
import { useEffect, useState } from 'react';

export function interpolateReplayPosition(snapshot, elapsedMs) {
  if (snapshot.paused || snapshot.ended) return snapshot.positionUs;
  return Math.min(snapshot.durationUs, snapshot.positionUs + Math.max(0, elapsedMs) * 1000 * snapshot.settings.pitchPercent / 100);
}

export default function useReplayPosition(replay) {
  const [position, setPosition] = useState(0);
  const { positionUs, durationUs, paused, ended, settings } = replay;
  const pitchPercent = settings.pitchPercent;
  useEffect(() => {
    const snapshot = { positionUs, durationUs, paused, ended, settings: { pitchPercent } };
    const receivedAt = performance.now();
    let frame;
    const update = now => {
      setPosition(interpolateReplayPosition(snapshot, now - receivedAt));
      if (!paused && !ended) frame = requestAnimationFrame(update);
    };
    update(receivedAt);
    return () => cancelAnimationFrame(frame);
  }, [positionUs, durationUs, paused, ended, pitchPercent]);
  return position;
}
