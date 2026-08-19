import { routes } from '@/api/routes';
import { apiUrl } from '@/config/urls';
import { useEffect, useRef } from 'react';

/**
 * Subscribe to GET /v2/events?source=submission (SSE).
 * Hydrate snapshot on every successful open via onConnected.
 */
export function useSubmissionEvents({ onEvent, onConnected, enabled = true, userId }) {
  const onEventRef = useRef(onEvent);
  const onConnectedRef = useRef(onConnected);
  onEventRef.current = onEvent;
  onConnectedRef.current = onConnected;

  useEffect(() => {
    if (!enabled) return undefined;

    let eventSource = null;
    let reconnectTimeout = null;
    let closed = false;

    const connect = () => {
      if (closed) return;

      const params = new URLSearchParams({ source: 'submission' });
      if (userId) params.set('userId', String(userId));

      const url = `${apiUrl(routes.events())}?${params.toString()}`;
      eventSource = new EventSource(url, { withCredentials: true });

      eventSource.onopen = () => {
        onConnectedRef.current?.();
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.type === 'ping' || data?.type === 'connected' || data?.type === 'userCount') {
            return;
          }
          onEventRef.current?.(data);
        } catch (err) {
          console.error('[useSubmissionEvents] parse error', err);
        }
      };

      eventSource.onerror = () => {
        if (closed) return;
        eventSource?.close();
        eventSource = null;
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, [enabled, userId]);
}
