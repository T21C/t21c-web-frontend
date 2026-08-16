import { routes } from '@/api/routes';
import { apiUrl } from '@/config/urls';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import api from '@/utils/api';
import { useAuth } from './AuthContext';

const InboxNotificationContext = createContext(null);

export const useInboxNotifications = () => {
  const context = useContext(InboxNotificationContext);
  if (!context) {
    throw new Error('useInboxNotifications must be used within an InboxNotificationProvider');
  }
  return context;
};

const DROPDOWN_LIMIT = 8;

export const InboxNotificationProvider = ({ children }) => {
  const auth = useAuth();
  const user = auth?.user;
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);

  const reset = useCallback(() => {
    setItems([]);
    setUnreadCount(0);
    setNextCursor(null);
  }, []);

  const fetchPage = useCallback(async ({ cursor = null, replace = false } = {}) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        api.get(routes.notifications.list({ cursor, limit: replace ? DROPDOWN_LIMIT : 20 })),
        replace || !cursor ? api.get(routes.notifications.unreadCount()) : Promise.resolve(null),
      ]);
      const page = listRes.data?.notifications ?? [];
      setNextCursor(listRes.data?.nextCursor ?? null);
      if (replace || !cursor) {
        setItems(page);
      } else {
        setItems((prev) => {
          const seen = new Set(prev.map((row) => row.id));
          return [...prev, ...page.filter((row) => !seen.has(row.id))];
        });
      }
      if (countRes) {
        setUnreadCount(Number(countRes.data?.count) || 0);
      }
    } catch (error) {
      console.error('[Inbox] Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const cleanupSse = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttempts.current = 0;
  }, []);

  const setupSse = useCallback(() => {
    if (!user?.id || eventSourceRef.current) return;

    const url = `${apiUrl(routes.events())}?source=inbox`;
    const source = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = source;

    source.onopen = () => {
      reconnectAttempts.current = 0;
    };

    source.onerror = () => {
      source.close();
      eventSourceRef.current = null;
      if (reconnectAttempts.current >= 5) return;
      reconnectAttempts.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        setupSse();
      }, 5000);
    };

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'inboxNotification' || !data.data) return;
        const incoming = data.data;
        setItems((prev) => {
          if (prev.some((row) => row.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });
        if (!incoming.readAt) {
          setUnreadCount((count) => count + 1);
        }
      } catch (error) {
        console.error('[Inbox] Failed to parse SSE message:', error);
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      cleanupSse();
      reset();
      return undefined;
    }
    fetchPage({ replace: true });
    setupSse();
    return cleanupSse;
  }, [user?.id, cleanupSse, fetchPage, reset, setupSse]);

  const markRead = useCallback(async (id) => {
    try {
      const { data } = await api.post(routes.notifications.read(id));
      const updated = data?.notification;
      if (!updated) return;
      setItems((prev) => {
        const previous = prev.find((row) => row.id === updated.id);
        if (previous && !previous.readAt && updated.readAt) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.map((row) => (row.id === updated.id ? updated : row));
      });
    } catch (error) {
      console.error('[Inbox] Failed to mark read:', error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post(routes.notifications.readAll());
      setItems((prev) =>
        prev.map((row) =>
          row.readAt ? row : { ...row, readAt: new Date().toISOString(), seenAt: row.seenAt || new Date().toISOString() },
        ),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('[Inbox] Failed to mark all read:', error);
    }
  }, []);

  const markSeen = useCallback(async () => {
    try {
      await api.post(routes.notifications.seen());
      setItems((prev) =>
        prev.map((row) => (row.seenAt ? row : { ...row, seenAt: new Date().toISOString() })),
      );
    } catch (error) {
      console.error('[Inbox] Failed to mark seen:', error);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!nextCursor || loading) return;
    return fetchPage({ cursor: nextCursor });
  }, [fetchPage, loading, nextCursor]);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      nextCursor,
      loading,
      refresh: () => fetchPage({ replace: true }),
      loadMore,
      markRead,
      markAllRead,
      markSeen,
    }),
    [fetchPage, items, loadMore, loading, markAllRead, markRead, markSeen, nextCursor, unreadCount],
  );

  return (
    <InboxNotificationContext.Provider value={value}>
      {children}
    </InboxNotificationContext.Provider>
  );
};
