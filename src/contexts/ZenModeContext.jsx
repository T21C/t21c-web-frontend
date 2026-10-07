// tuf-search: #ZenModeContext #zenMode #ratingZen
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { routes } from '@/api/routes';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';

const STORAGE_KEY_PREFIX = 'tuf.ratingZen:';
const LEGACY_STORAGE_KEY = 'tuf.ratingZen';
const SAVE_DEBOUNCE_MS = 800;

export const DEFAULT_DECK_SIZE = 15;
export const DEFAULT_RANDOMNESS = 40;

/** @typedef {'setup' | 'stage' | 'done'} ZenPhase */

/**
 * @typedef {object} ZenSession
 * @property {ZenPhase} phase
 * @property {number} deckSize
 * @property {boolean} includeP
 * @property {boolean} includeG
 * @property {boolean} includeU
 * @property {string} sortPreset
 * @property {number} randomness
 * @property {array} cards
 * @property {number} index
 * @property {array} cardOutcomes
 * @property {array} cardAnswers
 * @property {number} peeksLeft
 * @property {number} peeksAllowed
 * @property {number} peeksUsed
 * @property {boolean} cardPeeked
 * @property {number} submitted
 * @property {number} skipped
 * @property {number} streak
 * @property {string} pendingRating
 * @property {string} pendingComment
 */

/** @returns {ZenSession} */
export function createDefaultZenSession() {
  return {
    phase: 'setup',
    deckSize: DEFAULT_DECK_SIZE,
    includeP: true,
    includeG: true,
    includeU: true,
    sortPreset: 'least',
    randomness: DEFAULT_RANDOMNESS,
    cards: [],
    index: 0,
    cardOutcomes: [],
    cardAnswers: [],
    peeksLeft: 0,
    peeksAllowed: 0,
    peeksUsed: 0,
    cardPeeked: false,
    submitted: 0,
    skipped: 0,
    streak: 0,
    pendingRating: '',
    pendingComment: '',
  };
}

function isValidPhase(phase) {
  return phase === 'setup' || phase === 'stage' || phase === 'done';
}

function includeBandsFromParsed(parsed) {
  if (
    typeof parsed.includeP === 'boolean' ||
    typeof parsed.includeG === 'boolean' ||
    typeof parsed.includeU === 'boolean'
  ) {
    return {
      includeP: parsed.includeP !== false,
      includeG: parsed.includeG !== false,
      includeU: parsed.includeU !== false,
    };
  }
  if (parsed.onlyLowDiff) {
    return { includeP: true, includeG: false, includeU: false };
  }
  if (parsed.excludeUniversals) {
    return { includeP: true, includeG: true, includeU: false };
  }
  return { includeP: true, includeG: true, includeU: true };
}

function storageKeyForUser(userId) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function mergeSession(parsed) {
  if (!parsed || typeof parsed !== 'object') return createDefaultZenSession();
  const base = createDefaultZenSession();
  const next = { ...base, ...parsed, ...includeBandsFromParsed(parsed) };
  delete next.onlyLowDiff;
  delete next.excludeUniversals;
  delete next.hideRequestedRating;
  if (!isValidPhase(next.phase)) next.phase = 'setup';
  if (!Array.isArray(next.cards)) next.cards = [];
  if (!Array.isArray(next.cardOutcomes)) next.cardOutcomes = [];
  if (!Array.isArray(next.cardAnswers)) next.cardAnswers = [];
  return next;
}

function reconcileRatedCards(session, userId) {
  if (!userId || !Array.isArray(session.cards) || session.cards.length === 0) {
    return session;
  }
  const cardOutcomes = session.cardOutcomes.slice();
  const cardAnswers = session.cardAnswers.slice();
  while (cardOutcomes.length < session.cards.length) cardOutcomes.push(null);
  while (cardAnswers.length < session.cards.length) cardAnswers.push(null);

  for (let i = 0; i < session.cards.length; i++) {
    const detail = (session.cards[i]?.details || []).find(
      (entry) => entry.userId === userId
    );
    if (!detail) continue;
    if (cardOutcomes[i] == null) {
      cardOutcomes[i] = 'rated';
    }
    if (!cardAnswers[i]?.rating) {
      cardAnswers[i] = {
        rating: detail.rating || '',
        comment: detail.comment || '',
        peeked: Boolean(cardAnswers[i]?.peeked || cardOutcomes[i] === 'peeked'),
        viewDurationSeconds:
          cardAnswers[i]?.viewDurationSeconds ??
          detail.viewDurationSeconds ??
          0,
      };
    }
  }

  const open = cardOutcomes.findIndex((outcome) => outcome == null);
  const submitted = cardOutcomes.filter(
    (outcome) => outcome === 'rated' || outcome === 'peeked'
  ).length;
  const skipped = cardOutcomes.filter((outcome) => outcome === 'skipped').length;
  let phase = session.phase;
  if (open < 0 && session.phase === 'stage') {
    phase = 'done';
  }

  return {
    ...session,
    cardOutcomes,
    cardAnswers,
    submitted,
    skipped,
    phase,
  };
}

function sessionFromServer(data, userId) {
  return reconcileRatedCards(mergeSession(data), userId);
}

export function toZenSessionPayload(session) {
  const cards = Array.isArray(session.cards) ? session.cards : [];
  const ratingIds = cards
    .map((card) => Number(card?.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const len = ratingIds.length;
  const cardOutcomes = (Array.isArray(session.cardOutcomes) ? session.cardOutcomes : []).slice(
    0,
    len
  );
  const cardAnswers = (Array.isArray(session.cardAnswers) ? session.cardAnswers : []).slice(
    0,
    len
  );
  while (cardOutcomes.length < len) cardOutcomes.push(null);
  while (cardAnswers.length < len) cardAnswers.push(null);
  return {
    phase: isValidPhase(session.phase) ? session.phase : 'setup',
    deckSize: session.deckSize,
    includeP: session.includeP !== false,
    includeG: session.includeG !== false,
    includeU: session.includeU !== false,
    sortPreset: session.sortPreset || 'least',
    randomness: session.randomness,
    ratingIds,
    index: session.index,
    cardOutcomes,
    cardAnswers,
    peeksLeft: session.peeksLeft,
    peeksAllowed: session.peeksAllowed,
    peeksUsed: session.peeksUsed,
    cardPeeked: Boolean(session.cardPeeked),
    submitted: session.submitted,
    skipped: session.skipped,
    streak: session.streak,
    pendingRating: session.pendingRating || '',
    pendingComment: session.pendingComment || '',
  };
}

function hasPersistableDeck(session) {
  return Array.isArray(session?.cards) && session.cards.length > 0;
}

export function isUnfinishedZenSession(session) {
  if (!hasPersistableDeck(session)) return false;
  return session.phase === 'stage' || session.phase === 'setup';
}

function readStoredSession(userId) {
  if (!userId) return null;
  try {
    const raw = sessionStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    return mergeSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStoredSession(userId, session) {
  if (!userId) return;
  try {
    sessionStorage.setItem(
      storageKeyForUser(userId),
      JSON.stringify(toZenSessionPayload(session))
    );
  } catch {
    /* ignore */
  }
}

function clearStoredSession(userId) {
  try {
    if (userId) sessionStorage.removeItem(storageKeyForUser(userId));
    sessionStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const ZenModeContext = createContext(null);

export function ZenModeProvider({ children }) {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const userId = user?.id ?? null;
  const [session, setSession] = useState(createDefaultZenSession);
  const [sessionHydrated, setSessionHydrated] = useState(false);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const saveTimerRef = useRef(null);
  const dirtyRef = useRef(false);
  const serverHasSessionRef = useRef(false);
  const persistInFlightRef = useRef(null);
  const skipPersistRef = useRef(false);

  const persistNow = useCallback(async (snapshot) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const next = snapshot || sessionRef.current;
    writeStoredSession(uid, next);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!hasPersistableDeck(next)) {
      if (serverHasSessionRef.current) {
        await api.delete(routes.admin.ratingZenSession());
        serverHasSessionRef.current = false;
      }
      dirtyRef.current = false;
      return;
    }
    await api.put(routes.admin.ratingZenSession(), toZenSessionPayload(next));
    serverHasSessionRef.current = true;
    dirtyRef.current = false;
  }, []);

  const scheduleSave = useCallback(() => {
    if (skipPersistRef.current) return;
    if (!userIdRef.current) return;
    dirtyRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistInFlightRef.current = persistNow(sessionRef.current).catch(() => {
        dirtyRef.current = true;
      });
    }, SAVE_DEBOUNCE_MS);
  }, [persistNow]);

  const applySession = useCallback(
    (next, { persist = true } = {}) => {
      sessionRef.current = next;
      setSession(next);
      if (userIdRef.current) writeStoredSession(userIdRef.current, next);
      if (persist) scheduleSave();
      return next;
    },
    [scheduleSave]
  );

  const patchSession = useCallback(
    (partial) => {
      const prev = sessionRef.current;
      const next = {
        ...prev,
        ...(typeof partial === 'function' ? partial(prev) : partial),
      };
      return applySession(next);
    },
    [applySession]
  );

  const startSession = useCallback(
    async (payload) => {
      const prev = sessionRef.current;
      const next = applySession({ ...prev, ...payload }, { persist: false });
      dirtyRef.current = true;
      try {
        await persistNow(next);
      } catch (error) {
        applySession(prev, { persist: false });
        throw error;
      }
      return next;
    },
    [applySession, persistNow]
  );

  const clearSession = useCallback(async () => {
    const next = createDefaultZenSession();
    applySession(next, { persist: false });
    clearStoredSession(userIdRef.current);
    dirtyRef.current = false;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!userIdRef.current) return;
    try {
      await api.delete(routes.admin.ratingZenSession());
    } finally {
      serverHasSessionRef.current = false;
    }
  }, [applySession]);

  const resetToSetup = useCallback(async () => {
    const prev = sessionRef.current;
    const next = {
      ...createDefaultZenSession(),
      deckSize: prev.deckSize,
      includeP: prev.includeP,
      includeG: prev.includeG,
      includeU: prev.includeU,
      sortPreset: prev.sortPreset,
      randomness: prev.randomness,
      phase: 'setup',
    };
    applySession(next, { persist: false });
    dirtyRef.current = false;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!userIdRef.current) return;
    try {
      await api.delete(routes.admin.ratingZenSession());
    } finally {
      serverHasSessionRef.current = false;
      clearStoredSession(userIdRef.current);
    }
  }, [applySession]);

  const flushSession = useCallback(async () => {
    if (!userIdRef.current) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!dirtyRef.current) {
      if (persistInFlightRef.current) await persistInFlightRef.current;
      return;
    }
    await persistNow(sessionRef.current);
  }, [persistNow]);

  useEffect(() => {
    let cancelled = false;
    skipPersistRef.current = true;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (authLoading) {
      setSessionHydrated(false);
      return undefined;
    }

    if (!isAuthenticated || !userId) {
      applySession(createDefaultZenSession(), { persist: false });
      serverHasSessionRef.current = false;
      dirtyRef.current = false;
      setSessionHydrated(true);
      skipPersistRef.current = false;
      return undefined;
    }

    setSessionHydrated(false);
    const cached = readStoredSession(userId);
    if (cached && hasPersistableDeck(cached)) {
      applySession({ ...cached, cards: [] }, { persist: false });
    }

    (async () => {
      try {
        const { data } = await api.get(routes.admin.ratingZenSession());
        if (cancelled) return;
        if (data?.session) {
          serverHasSessionRef.current = true;
          applySession(sessionFromServer(data.session, userId), { persist: false });
        } else {
          serverHasSessionRef.current = false;
          applySession(createDefaultZenSession(), { persist: false });
          clearStoredSession(userId);
        }
      } catch {
        if (cancelled) return;
        serverHasSessionRef.current = Boolean(cached && hasPersistableDeck(cached));
      } finally {
        if (!cancelled) {
          skipPersistRef.current = false;
          setSessionHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, userId, applySession]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        void flushSession();
      }
    };
    const onPageHide = () => {
      void flushSession();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flushSession]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    []
  );

  const hasUnfinishedDeck = isUnfinishedZenSession(session);
  const hasActiveSession =
    session.phase === 'stage' ||
    session.phase === 'done' ||
    (session.phase === 'setup' &&
      Array.isArray(session.cards) &&
      session.cards.length > 0);
  const hasResumableDeck =
    session.phase === 'setup' &&
    Array.isArray(session.cards) &&
    session.cards.length > 0;

  const value = useMemo(
    () => ({
      session,
      sessionHydrated,
      patchSession,
      startSession,
      clearSession,
      resetToSetup,
      flushSession,
      hasActiveSession,
      hasResumableDeck,
      hasUnfinishedDeck,
    }),
    [
      session,
      sessionHydrated,
      patchSession,
      startSession,
      clearSession,
      resetToSetup,
      flushSession,
      hasActiveSession,
      hasResumableDeck,
      hasUnfinishedDeck,
    ]
  );

  return <ZenModeContext.Provider value={value}>{children}</ZenModeContext.Provider>;
}

export function useZenMode() {
  const ctx = useContext(ZenModeContext);
  if (!ctx) {
    throw new Error('useZenMode must be used within ZenModeProvider');
  }
  return ctx;
}
