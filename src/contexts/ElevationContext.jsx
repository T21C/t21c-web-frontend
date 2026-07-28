import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StepUpModal from '@/components/account/StepUpModal/StepUpModal';

const STORAGE_KEY = 'tuf.elevation';

/** @typedef {'email-change' | 'security'} StepUpScope */

const ElevationContext = createContext(null);

function readStoredElevations() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const now = Date.now();
    const next = {};
    for (const [scope, expiresAt] of Object.entries(parsed)) {
      if (typeof expiresAt === 'number' && expiresAt > now) {
        next[scope] = expiresAt;
      }
    }
    return next;
  } catch {
    return {};
  }
}

function writeStoredElevations(map) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function ElevationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [elevations, setElevations] = useState(readStoredElevations);
  const [pending, setPending] = useState(null);
  const pendingResolveRef = useRef(null);
  const pendingRejectRef = useRef(null);

  useEffect(() => {
    writeStoredElevations(elevations);
  }, [elevations]);

  useEffect(() => {
    if (!isAuthenticated) {
      setElevations({});
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem('stepUpGranted');
      } catch {
        /* ignore */
      }
    }
  }, [isAuthenticated]);

  const isElevated = useCallback(
    (scope) => {
      const expiresAt = elevations[scope];
      return typeof expiresAt === 'number' && expiresAt > Date.now();
    },
    [elevations],
  );

  const markElevated = useCallback((scope, expiresInSec) => {
    const ttl = typeof expiresInSec === 'number' && expiresInSec > 0 ? expiresInSec : 600;
    const expiresAt = Date.now() + ttl * 1000;
    setElevations((prev) => ({ ...prev, [scope]: expiresAt }));
  }, []);

  const clearElevation = useCallback((scope) => {
    setElevations((prev) => {
      if (!scope) return {};
      const next = { ...prev };
      delete next[scope];
      return next;
    });
  }, []);

  const closePending = useCallback((result) => {
    const resolve = pendingResolveRef.current;
    const reject = pendingRejectRef.current;
    pendingResolveRef.current = null;
    pendingRejectRef.current = null;
    setPending(null);
    if (result?.ok) {
      resolve?.(true);
    } else if (result?.cancelled) {
      reject?.(Object.assign(new Error('Elevation cancelled'), { code: 'ELEVATION_CANCELLED' }));
    } else if (result?.error) {
      reject?.(result.error);
    } else {
      resolve?.(false);
    }
  }, []);

  /**
   * Run `fn` immediately when a live grant exists for `scope`; otherwise open
   * the step-up modal first, then run `fn` after elevation succeeds.
   */
  const requireElevation = useCallback(
    async (scope, fn) => {
      if (isElevated(scope)) {
        return fn();
      }
      await new Promise((resolve, reject) => {
        pendingResolveRef.current = resolve;
        pendingRejectRef.current = reject;
        setPending({ scope });
      });
      return fn();
    },
    [isElevated],
  );

  const value = useMemo(
    () => ({
      elevations,
      isElevated,
      markElevated,
      clearElevation,
      requireElevation,
      openStepUp: (scope) =>
        new Promise((resolve, reject) => {
          if (isElevated(scope)) {
            resolve(true);
            return;
          }
          pendingResolveRef.current = resolve;
          pendingRejectRef.current = reject;
          setPending({ scope });
        }),
    }),
    [elevations, isElevated, markElevated, clearElevation, requireElevation],
  );

  return (
    <ElevationContext.Provider value={value}>
      {children}
      {pending ? (
        <StepUpModal
          scope={pending.scope}
          user={user}
          onElevated={(expiresIn) => {
            markElevated(pending.scope, expiresIn);
            closePending({ ok: true });
          }}
          onCancel={() => closePending({ cancelled: true })}
        />
      ) : null}
    </ElevationContext.Provider>
  );
}

export function useElevation() {
  const ctx = useContext(ElevationContext);
  if (!ctx) {
    throw new Error('useElevation must be used within ElevationProvider');
  }
  return ctx;
}
