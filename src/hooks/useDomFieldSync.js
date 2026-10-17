// tuf-search: #useDomFieldSync #autofill #submission
import { useEffect, useRef } from 'react';
import './domFieldSync.css';

const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'password',
  'email',
  'number',
  '',
]);

const FOLLOW_UP_DELAYS_MS = [0, 60, 240];
const MOUNT_SCAN_DELAYS_MS = [80, 400, 1000];

/**
 * Fields whose DOM value differs from the controlled string state.
 * Read-only and disabled controls are skipped so selectors and locked
 * inputs cannot be overwritten by a browser-filled value.
 *
 * @param {ParentNode | null | undefined} root
 * @param {Record<string, unknown> | null | undefined} values
 * @param {Element | null} [ignoreEl]
 * @returns {Record<string, string> | null}
 */
export function collectDomFieldPatch(root, values, ignoreEl = null) {
  if (!root || !values) return null;

  const fields = root.querySelectorAll('input[name], textarea[name]');
  /** @type {Record<string, string>} */
  const patch = {};

  fields.forEach((el) => {
    if (ignoreEl && el === ignoreEl) return;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    if (el.disabled || el.readOnly) return;

    if (el instanceof HTMLInputElement) {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (!TEXT_INPUT_TYPES.has(type)) return;
    }

    const { name } = el;
    if (!Object.prototype.hasOwnProperty.call(values, name)) return;
    const current = values[name];
    if (typeof current !== 'string' || el.value === current) return;
    patch[name] = el.value;
  });

  return Object.keys(patch).length ? patch : null;
}

function isSingleCharEdit(event, values) {
  const el = event?.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
  const previous = values?.[el.name];
  if (typeof previous !== 'string') return false;
  return Math.abs(el.value.length - previous.length) <= 1;
}

/**
 * Copy browser-filled input values into React state.
 *
 * Autofill and password managers often write several fields in one turn and
 * dispatch an input/change event for only one of them. Controlled inputs then
 * keep showing the filled text while state (and validation) still has "".
 * A later render can also reset the other fields and the browser paints them
 * back without a second event. Re-read every named field on the event and
 * again just after, when those sibling values have landed.
 *
 * @param {import('react').RefObject<HTMLElement | null>} containerRef
 * @param {Record<string, unknown>} values
 * @param {(patch: Record<string, string>) => void} onPatch
 * @param {{ scanOnMount?: boolean }} [options]
 */
export function useDomFieldSync(containerRef, values, onPatch, options = {}) {
  const { scanOnMount = false } = options;
  const valuesRef = useRef(values);
  const onPatchRef = useRef(onPatch);
  valuesRef.current = values;
  onPatchRef.current = onPatch;

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;

    /** @type {number[]} */
    let timers = [];
    const clearTimers = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers = [];
    };

    const syncNow = (ignoreEl = null) => {
      const patch = collectDomFieldPatch(root, valuesRef.current, ignoreEl);
      if (patch) onPatchRef.current(patch);
    };

    const schedule = (event) => {
      const ignoreEl = isSingleCharEdit(event, valuesRef.current) ? event.target : null;
      syncNow(ignoreEl);
      clearTimers();
      FOLLOW_UP_DELAYS_MS.forEach((delay) => {
        timers.push(window.setTimeout(() => syncNow(null), delay));
      });
    };

    const onAnimationStart = (event) => {
      if (event.animationName === 'tuf-autofill-start') schedule(event);
    };

    root.addEventListener('input', schedule, true);
    root.addEventListener('change', schedule, true);
    root.addEventListener('animationstart', onAnimationStart, true);

    if (scanOnMount) {
      MOUNT_SCAN_DELAYS_MS.forEach((delay) => {
        timers.push(window.setTimeout(() => syncNow(null), delay));
      });
    }

    return () => {
      clearTimers();
      root.removeEventListener('input', schedule, true);
      root.removeEventListener('change', schedule, true);
      root.removeEventListener('animationstart', onAnimationStart, true);
    };
  }, [containerRef, scanOnMount]);
}
