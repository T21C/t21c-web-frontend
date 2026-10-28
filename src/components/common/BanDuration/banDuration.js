/** Timed units. Keep in step with server `BAN_DURATION_UNITS`. */
export const BAN_DURATION_UNITS = ['hours', 'days', 'weeks', 'months'];

/** No expiry. Duration is ignored. Keep in step with server `BAN_FOREVER_UNIT`. */
export const FOREVER_BAN_UNIT = 'forever';

export const BAN_DURATION_MIN = 1;
export const BAN_DURATION_MAX = 999;
export const DEFAULT_BAN_DURATION = '1';
export const DEFAULT_BAN_UNIT = 'days';

export const isForeverBanUnit = (unit) => unit === FOREVER_BAN_UNIT;

export const isBanDurationValid = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= BAN_DURATION_MIN && n <= BAN_DURATION_MAX;
};

/** True when a ban can be submitted: forever, or a duration in range. */
export const isBanDurationReady = (duration, unit) =>
  isForeverBanUnit(unit) || isBanDurationValid(duration);

/**
 * Fields for a ban request. Forever sends only the unit.
 * Timed bans send duration and unit.
 */
export const banDurationRequestFields = (duration, unit) =>
  isForeverBanUnit(unit)
    ? { unit: FOREVER_BAN_UNIT }
    : { duration: Number(duration), unit };

export const formatBanInstant = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
};
