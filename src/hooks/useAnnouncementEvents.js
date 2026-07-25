import { routes } from '@/api/routes';
import { apiUrl } from '@/config/urls';
// tuf-search: #useAnnouncementEvents #announcement #sse
import { useEffect, useRef } from 'react';

/**
 * Subscribe to GET /v2/events?source=announcement (SSE).
 * Calls onEvent for each message; onReconnect after reconnect opens.
 */
export function useAnnouncementEvents({ onEvent, onReconnect, enabled = true, userId }) {
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  onEventRef.current = onEvent;
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!enabled) return undefined;

    let eventSource = null;
    let reconnectTimeout = null;
    let closed = false;
    let hadConnection = false;

    const connect = () => {
      if (closed) return;

      const params = new URLSearchParams({ source: 'announcement' });
      if (userId) params.set('userId', String(userId));

      const url = `${apiUrl(routes.events())}?${params.toString()}`;
      eventSource = new EventSource(url, { withCredentials: true });

      eventSource.onopen = () => {
        if (hadConnection && onReconnectRef.current) {
          onReconnectRef.current();
        }
        hadConnection = true;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.type === 'ping' || data?.type === 'connected') return;
          onEventRef.current?.(data);
        } catch (err) {
          console.error('[useAnnouncementEvents] parse error', err);
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
