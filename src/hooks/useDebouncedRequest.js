import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a debounced request runner.
 *
 * Each call to `run(requestFn)` waits `delay` ms before invoking
 * `requestFn`. If `run` is called again before the timer elapses, the
 * pending timer is reset and any in-flight request from a previous
 * call is aborted via the AbortSignal that was handed to `requestFn`.
 *
 * `requestFn` receives `{ signal }`. Pass that signal to your HTTP
 * client so cancellation actually terminates the request, e.g.:
 *
 *   const run = useDebouncedRequest();
 *   run(({ signal }) => api.get(url, { params, signal }))
 *     .then((res) => setData(res.data))
 *     .catch((err) => { if (!axios.isCancel(err)) console.error(err); });
 *
 * Notes:
 *  - When the timer is reset BEFORE the request fires, the prior
 *    promise simply never resolves (it has no observable effect, since
 *    no request was ever made and no callback can run).
 *  - When an in-flight request is aborted, its promise rejects with
 *    a CanceledError that callers can detect via `axios.isCancel`.
 *  - On unmount, the timer is cleared and the in-flight request is
 *    aborted automatically.
 *
 * Extras attached to the returned function:
 *  - `run.cancel()`         clear the timer and abort any in-flight call.
 *  - `run.flush(requestFn)` skip the debounce and run `requestFn` now,
 *                           still under the same cancellation guarantees.
 */
export function useDebouncedRequest(delay = 500) {
  const timerRef = useRef(null);
  const controllerRef = useRef(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  const fire = useCallback(
    (requestFn) =>
      new Promise((resolve, reject) => {
        const controller = new AbortController();
        controllerRef.current = controller;
        Promise.resolve()
          .then(() => requestFn({ signal: controller.signal }))
          .then(resolve, reject)
          .finally(() => {
            if (controllerRef.current === controller) {
              controllerRef.current = null;
            }
          });
      }),
    []
  );

  const run = useCallback(
    (requestFn) => {
      cancel();
      return new Promise((resolve, reject) => {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          fire(requestFn).then(resolve, reject);
        }, delay);
      });
    },
    [cancel, fire, delay]
  );

  run.cancel = cancel;
  run.flush = useCallback(
    (requestFn) => {
      cancel();
      return fire(requestFn);
    },
    [cancel, fire]
  );

  return run;
}

export default useDebouncedRequest;
