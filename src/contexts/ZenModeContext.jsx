// tuf-search: #ZenModeContext #zenMode #ratingZen
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'tuf.ratingZen';

export const DEFAULT_DECK_SIZE = 15;
export const DEFAULT_RANDOMNESS = 40;

/** @typedef {'setup' | 'stage' | 'done'} ZenPhase */

/**
 * @typedef {object} ZenSession
 * @property {ZenPhase} phase
 * @property {number} deckSize
 * @property {boolean} onlyLowDiff
 * @property {boolean} excludeUniversals
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
    onlyLowDiff: false,
    excludeUniversals: false,
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

/** @returns {ZenSession} */
function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultZenSession();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createDefaultZenSession();
    const base = createDefaultZenSession();
    const next = { ...base, ...parsed };
    if (!isValidPhase(next.phase)) next.phase = 'setup';
    if (!Array.isArray(next.cards)) next.cards = [];
    if (!Array.isArray(next.cardOutcomes)) next.cardOutcomes = [];
    if (!Array.isArray(next.cardAnswers)) next.cardAnswers = [];
    return next;
  } catch {
    return createDefaultZenSession();
  }
}

/** @param {ZenSession} session */
function writeStoredSession(session) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

function clearStoredSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const ZenModeContext = createContext(null);

export function ZenModeProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [session, setSession] = useState(readStoredSession);

  useEffect(() => {
    writeStoredSession(session);
  }, [session]);

  useEffect(() => {
    // Wait for auth boot so a null user on first paint does not wipe the session.
    if (authLoading) return;
    if (!isAuthenticated) {
      setSession(createDefaultZenSession());
      clearStoredSession();
    }
  }, [authLoading, isAuthenticated]);

  const patchSession = useCallback((partial) => {
    setSession((prev) => ({
      ...prev,
      ...(typeof partial === 'function' ? partial(prev) : partial),
    }));
  }, []);

  const startSession = useCallback((payload) => {
    setSession((prev) => ({
      ...prev,
      ...payload,
    }));
  }, []);

  const clearSession = useCallback(() => {
    setSession(createDefaultZenSession());
    clearStoredSession();
  }, []);

  /** Keep setup prefs; wipe deck progress and return to setup. */
  const resetToSetup = useCallback(() => {
    setSession((prev) => ({
      ...createDefaultZenSession(),
      deckSize: prev.deckSize,
      onlyLowDiff: prev.onlyLowDiff,
      excludeUniversals: prev.excludeUniversals,
      sortPreset: prev.sortPreset,
      randomness: prev.randomness,
      phase: 'setup',
    }));
  }, []);

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
      patchSession,
      startSession,
      clearSession,
      resetToSetup,
      hasActiveSession,
      hasResumableDeck,
    }),
    [
      session,
      patchSession,
      startSession,
      clearSession,
      resetToSetup,
      hasActiveSession,
      hasResumableDeck,
    ],
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
