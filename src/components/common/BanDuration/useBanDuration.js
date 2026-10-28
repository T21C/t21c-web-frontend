import { useCallback, useState } from 'react';
import {
  DEFAULT_BAN_DURATION,
  DEFAULT_BAN_UNIT,
  banDurationRequestFields,
  isBanDurationReady,
  isForeverBanUnit,
} from './banDuration';

export function useBanDuration() {
  const [duration, setDuration] = useState(DEFAULT_BAN_DURATION);
  const [unit, setUnit] = useState(DEFAULT_BAN_UNIT);

  const reset = useCallback(() => {
    setDuration(DEFAULT_BAN_DURATION);
    setUnit(DEFAULT_BAN_UNIT);
  }, []);

  return {
    duration,
    setDuration,
    unit,
    setUnit,
    reset,
    isForever: isForeverBanUnit(unit),
    isReady: isBanDurationReady(duration, unit),
    requestFields: () => banDurationRequestFields(duration, unit),
  };
}
