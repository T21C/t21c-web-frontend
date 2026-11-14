// tuf-search: #RatingZenPage #ratingZen #zen #admin #rating
import { routes } from '@/api/routes';
import './ratingzenpage.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useZenMode,
  DEFAULT_DECK_SIZE,
  DEFAULT_RANDOMNESS,
} from '@/contexts/ZenModeContext';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { CustomSelect } from '@/components/common/selectors';
import { RatingItem } from '@/components/cards';
import { CloseButton, ReferencesButton } from '@/components/common/buttons';
import { CheckmarkIcon, ChartIcon, EyeIcon, MetronomeIcon, SkipIcon, TimeIcon } from '@/components/common/icons';
import { WebAdofaiViewerButton } from '@/components/popups/Levels';
import { Tooltip } from '@/components/common/display/Tooltip';
import { CommentFormatter, LevelMentionField } from '@/components/misc';
import api from '@/utils/api';
import { getLocalVideoPreview, getVideoEmbedModifierClass, getVideoIframeReferrerPolicy, getVideoIframeScrolling } from '@/utils/videoLink';
import { formatCreatorDisplay, ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { formatAutoTilecountTooltip, formatDuration, getSongDisplayName } from '@/utils/levelHelpers';
import { hasAnyFlag, hasFlag, permissionFlags } from '@/utils/UserPermissions';
import toast from 'react-hot-toast';
import { createViewDurationTracker } from '@/utils/viewDurationTracker';
import { isAutoraterDetail } from '@/utils/autorater';
import { REQUEST_BANDS, autoraterHideBand, isVoteRatingCard } from '@/utils/ratingRequestBand';
import { CurationPickDisplay } from '@/components/popups/Rating/RatingDetailPopup/CurationRatingPicks';
import { RatingModeInput } from '@/components/popups/Rating/RatingDetailPopup/RatingModeInput';
import { curationRatingPayload, emptyCurationPicks, picksAreEmpty, requestedCurationBuckets } from '@/utils/curationTypeFamilies';
import DiscordVoteNotice from '@/components/popups/Rating/DiscordVoteNotice';
import LevelRequestScoreTargets from '@/components/requests/LevelRequestScoreTargets';
import RatingDiscordThreadButton from '@/components/popups/Rating/RatingDiscordThreadButton';
import { mergeRatingThreadState } from '@/components/discord/ratingThread';

const DECK_SIZES = [
  5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200,
];
const DECK_UNIT = 5;
const MIN_DECK_SIZE = 1;
const MAX_DECK_SIZE = 200;
const CUSTOM_DECK_VALUE = 'custom';
const CURATION_POOLS = [
  ['recent', 'includeRecent'],
  ['rerate', 'includeRerate'],
  ['bulk', 'includeBulk'],
];

function peeksForDeckSize(n) {
  return Math.floor(Math.max(0, Number(n) || 0) / DECK_UNIT);
}

function isPeekAutorater(detail) {
  if (isAutoraterDetail(detail)) return true;
  const username = detail?.user?.username || detail?.username || '';
  return String(username).toLowerCase() === 'autorater';
}

function parseDeckSizeInput(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < MIN_DECK_SIZE || n > MAX_DECK_SIZE) return null;
  return n;
}

async function submitZenRating(id, rating, comment, isCommunityRating, viewDurationSeconds = 0) {
  const response = await api.put(`${routes.admin.rating()}/${id}`, {
    rating,
    comment,
    isCommunityRating,
    ratedInZen: true,
    viewDurationSeconds,
  });
  if (!response.data?.rating) {
    throw new Error(response.data?.error || 'Failed to update rating');
  }
  return response.data;
}

async function submitZenCuration(id, picks, comment, viewDurationSeconds = 0, curationTypesDict) {
  const response = await api.put(routes.admin.curationRatingById(id), {
    ...curationRatingPayload(picks, curationTypesDict),
    comment,
    ratedInZen: true,
    viewDurationSeconds,
  });
  if (!response.data?.complete && !response.data?.listRow) {
    throw new Error(response.data?.error || 'Failed to update curation rating');
  }
  return response.data;
}

const RatingZenPage = ({ mode = 'difficulty' }) => {
  const { t } = useTranslation(['pages', 'components', 'common']);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { difficulties, difficultyDict, curationTypesDict } = useDifficultyContext();
  const isCurationMode = mode === 'curation';
  const listPath = isCurationMode ? '/admin/curations/rating' : '/rating';
  const {
    session,
    patchSession,
    startSession,
    clearSession,
    resetToSetup,
    flushSession,
    hasResumableDeck,
    hasUnfinishedDeck,
    sessionHydrated,
  } = useZenMode(isCurationMode ? 'curation' : 'difficulty');

  const {
    phase,
    deckSize,
    includeP,
    includeG,
    includeU,
    includeRecent = true,
    includeRerate = true,
    includeBulk = true,
    sortPreset,
    randomness,
    cards,
    index,
    cardOutcomes,
    cardAnswers,
    peeksLeft,
    peeksAllowed,
    peeksUsed,
    cardPeeked,
    submitted,
    skipped,
    streak,
    pendingRating,
    pendingComment,
    pendingPicks = emptyCurationPicks(),
  } = session;

  useEffect(() => {
    document.documentElement.classList.add('rating-zen-active');
    return () => {
      document.documentElement.classList.remove('rating-zen-active');
    };
  }, []);

  const hasUnfinishedSession = phase === 'stage';

  useEffect(() => {
    if (!hasUnfinishedSession) return undefined;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnfinishedSession]);

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t(isCurationMode ? 'rating.curationRating.zen.meta.title' : 'rating.zen.meta.title'),
        description: t(isCurationMode ? 'rating.curationRating.zen.meta.description' : 'rating.zen.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname, isCurationMode]
  );

  const [isDealing, setIsDealing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showCommunityPeers, setShowCommunityPeers] = useState(false);
  const [customDeckPicked, setCustomDeckPicked] = useState(
    () => !DECK_SIZES.includes(session.deckSize)
  );
  const [customDeckDraft, setCustomDeckDraft] = useState(() => String(session.deckSize));
  const [linkedRequest, setLinkedRequest] = useState(null);
  const viewTrackersRef = useRef(new Map());

  const disposeViewTrackers = useCallback(() => {
    for (const tracker of viewTrackersRef.current.values()) {
      tracker.dispose();
    }
    viewTrackersRef.current.clear();
  }, []);

  const getOrCreateViewTracker = useCallback((ratingId, seedSeconds = 0) => {
    if (ratingId == null) return null;
    let tracker = viewTrackersRef.current.get(ratingId);
    if (!tracker) {
      tracker = createViewDurationTracker(seedSeconds);
      viewTrackersRef.current.set(ratingId, tracker);
    }
    return tracker;
  }, []);

  const readViewDurationSeconds = useCallback(
    (ratingId, fallback = 0) => {
      const tracker = ratingId != null ? viewTrackersRef.current.get(ratingId) : null;
      if (!tracker) return Math.max(0, Math.floor(Number(fallback) || 0));
      tracker.pause();
      return tracker.peekSeconds();
    },
    []
  );

  const handleExit = useCallback(() => {
    // Pause into setup so return shows Continue / Discard; deck stays in sessionStorage.
    patchSession((prev) => {
      if (prev.phase !== 'stage') return {};
      const ratingId = prev.cards[prev.index]?.id;
      const viewDurationSeconds = readViewDurationSeconds(
        ratingId,
        prev.cardAnswers[prev.index]?.viewDurationSeconds
      );
      const nextAnswers = prev.cardAnswers.slice();
      nextAnswers[prev.index] = {
        rating: prev.pendingRating,
        comment: prev.pendingComment,
        picks: prev.pendingPicks || emptyCurationPicks(),
        peeked: prev.cardPeeked,
        viewDurationSeconds,
      };
      return {
        cardAnswers: nextAnswers,
        phase: 'setup',
      };
    });
    void flushSession();
  }, [flushSession, patchSession, readViewDurationSeconds]);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const patchSessionRef = useRef(patchSession);
  patchSessionRef.current = patchSession;

  useEffect(
    () => () => {
      const prev = sessionRef.current;
      if (prev.phase === 'stage') {
        const ratingId = prev.cards[prev.index]?.id;
        const tracker = ratingId != null ? viewTrackersRef.current.get(ratingId) : null;
        if (tracker) {
          tracker.pause();
          const viewDurationSeconds = tracker.peekSeconds();
          patchSessionRef.current((s) => {
            const nextAnswers = s.cardAnswers.slice();
            nextAnswers[s.index] = {
              rating: s.pendingRating,
              comment: s.pendingComment,
              picks: s.pendingPicks || emptyCurationPicks(),
              peeked: s.cardPeeked,
              viewDurationSeconds,
            };
            return { cardAnswers: nextAnswers };
          });
        }
      }
      disposeViewTrackers();
    },
    [disposeViewTrackers]
  );

  const current = cards[index] || null;
  const isVoteCard = isCurationMode
    ? Boolean(current?.isDiscordVote)
    : isVoteRatingCard(current, linkedRequest);
  const requestedBuckets = useMemo(
    () => requestedCurationBuckets(current?.curationRequests, curationTypesDict),
    [current?.curationRequests, curationTypesDict],
  );

  useEffect(() => {
    const ratingId = current?.id;
    if (!ratingId || isCurationMode) {
      setLinkedRequest(null);
      return undefined;
    }
    let cancelled = false;
    api.get(routes.database.levelRequests.forRating(ratingId))
      .then((res) => {
        if (!cancelled) setLinkedRequest(res.data?.request || null);
      })
      .catch(() => {
        if (!cancelled) setLinkedRequest(null);
      });
    return () => {
      cancelled = true;
    };
  }, [current?.id]);
  const currentRequestBand = autoraterHideBand(current);
  const videoLink = current?.displayVideoLink || current?.level?.videoLink;
  const videoData = useMemo(() => (videoLink ? getLocalVideoPreview(videoLink) : null), [videoLink]);
  const showRequestedRating = !currentRequestBand
    || (currentRequestBand === 'P' && includeP)
    || (currentRequestBand === 'G' && includeG)
    || (currentRequestBand === 'U' && includeU);
  const isAdminRater = Boolean(
    user && hasAnyFlag(user, [
      permissionFlags.SUPER_ADMIN,
      permissionFlags.RATER,
      ...(isCurationMode ? [permissionFlags.CURATOR, permissionFlags.HEAD_CURATOR] : []),
    ])
  );
  const alreadyRated = Boolean(
    cardOutcomes[index] === 'rated' ||
      cardOutcomes[index] === 'peeked' ||
      (user?.id &&
        (current?.details || []).some((detail) => detail.userId === user.id))
  );

  const deckSizeOptions = useMemo(
    () => [
      ...DECK_SIZES.map((n) => ({
        value: n,
        label: `${n} (${peeksForDeckSize(n)} peeks)`,
      })),
      {
        value: CUSTOM_DECK_VALUE,
        label: t('rating.zen.setup.deckSizeCustom'),
      },
    ],
    [t]
  );

  const showCustomDeckInput = customDeckPicked || !DECK_SIZES.includes(deckSize);
  const customDeckParsed = parseDeckSizeInput(customDeckDraft);
  const deckSizeIsValid = showCustomDeckInput
    ? customDeckParsed != null
    : DECK_SIZES.includes(deckSize);

  const selectedDeckSizeOption = useMemo(
    () =>
      showCustomDeckInput
        ? deckSizeOptions.find((option) => option.value === CUSTOM_DECK_VALUE)
        : deckSizeOptions.find((option) => option.value === deckSize) ??
          deckSizeOptions.find((option) => option.value === DEFAULT_DECK_SIZE) ??
          deckSizeOptions[0],
    [deckSize, deckSizeOptions, showCustomDeckInput]
  );

  const requestedPeeks = peeksForDeckSize(
    showCustomDeckInput && customDeckParsed != null ? customDeckParsed : deckSize
  );

  const sortOptions = useMemo(
    () => [
      {
        value: 'least',
        label: t('rating.zen.setup.sortLeast'),
      },
      {
        value: 'most',
        label: t('rating.zen.setup.sortMost'),
      },
      {
        value: 'id',
        label: t('rating.zen.setup.sortId'),
      },
      {
        value: 'recent',
        label: t('rating.zen.setup.sortRecent'),
      },
      {
        value: 'added',
        label: t('rating.zen.setup.sortAdded'),
      },
    ],
    [t]
  );

  const selectedSortOption = useMemo(
    () => sortOptions.find((option) => option.value === sortPreset) ?? sortOptions[0],
    [sortOptions, sortPreset]
  );

  const sortParams = useMemo(() => {
    switch (sortPreset) {
      case 'most':
        return { sort: 'ratings', order: 'DESC' };
      case 'id':
        return { sort: 'id', order: 'ASC' };
      case 'recent':
        return { sort: 'updatedAt', order: 'DESC' };
      case 'added':
        return { sort: 'createdAt', order: 'DESC' };
      case 'least':
      default:
        return { sort: 'ratings', order: 'ASC' };
    }
  }, [sortPreset]);

  const handleContinueSession = useCallback(() => {
    patchSession({ phase: 'stage' });
  }, [patchSession]);

  const handleDiscardSession = useCallback(() => {
    disposeViewTrackers();
    setCustomDeckPicked(false);
    setCustomDeckDraft(String(DEFAULT_DECK_SIZE));
    void clearSession();
  }, [clearSession, disposeViewTrackers]);

  const handleDeckSizeOptionChange = useCallback(
    (option) => {
      if (!option) return;
      if (option.value === CUSTOM_DECK_VALUE) {
        setCustomDeckPicked(true);
        setCustomDeckDraft(String(deckSize));
        return;
      }
      setCustomDeckPicked(false);
      setCustomDeckDraft(String(option.value));
      patchSession({ deckSize: option.value });
    },
    [deckSize, patchSession]
  );

  const handleCustomDeckDraftChange = useCallback(
    (raw) => {
      setCustomDeckDraft(raw);
      const parsed = parseDeckSizeInput(raw);
      if (parsed != null) {
        patchSession({ deckSize: parsed });
      }
    },
    [patchSession]
  );

  const startDeal = useCallback(async () => {
    if (!user) {
      toast.error(t('rating.zen.errors.loginRequired'));
      navigate('/login');
      return;
    }
    const requestedSize = showCustomDeckInput
      ? parseDeckSizeInput(customDeckDraft)
      : deckSize;
    if (requestedSize == null) {
      toast.error(t('rating.zen.errors.invalidDeckSize'));
      return;
    }
    setIsDealing(true);
    try {
      const dealUrl = isCurationMode ? routes.admin.curationRatingZenDeal() : routes.admin.ratingZenDeal();
      const { data } = await api.get(dealUrl, {
        params: {
          deckSize: requestedSize,
          ...(isCurationMode
            ? {
                includeRecent: includeRecent ? 'true' : 'false',
                includeRerate: includeRerate ? 'true' : 'false',
                includeBulk: includeBulk ? 'true' : 'false',
              }
            : {
                includeP: includeP ? 'true' : 'false',
                includeG: includeG ? 'true' : 'false',
                includeU: includeU ? 'true' : 'false',
              }),
          randomness,
          ...sortParams,
        },
      });
      const dealt = data?.cards || [];
      const peeks = peeksForDeckSize(dealt.length);
      disposeViewTrackers();
      await startSession({
        cards: dealt,
        cardOutcomes: dealt.map(() => null),
        cardAnswers: dealt.map(() => null),
        index: 0,
        peeksAllowed: peeks,
        peeksLeft: peeks,
        peeksUsed: 0,
        cardPeeked: false,
        submitted: 0,
        skipped: 0,
        streak: 0,
        pendingRating: '',
        pendingComment: '',
        pendingPicks: emptyCurationPicks(),
        phase: dealt.length === 0 ? 'done' : 'stage',
        deckSize: requestedSize,
        includeP,
        includeG,
        includeU,
        includeRecent,
        includeRerate,
        includeBulk,
        sortPreset,
        randomness,
      });
      setSaveError(null);
      if (dealt.length === 0) {
        toast(t('rating.zen.messages.emptyDeck'));
      } else if (dealt.length < requestedSize) {
        toast(t('rating.zen.messages.shortDeck', { n: dealt.length, requested: requestedSize }));
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.error ||
          t('rating.zen.errors.dealFailed')
      );
    } finally {
      setIsDealing(false);
    }
  }, [
    user,
    deckSize,
    customDeckDraft,
    showCustomDeckInput,
    includeP,
    includeG,
    includeU,
    includeRecent,
    includeRerate,
    includeBulk,
    randomness,
    sortPreset,
    sortParams,
    navigate,
    t,
    startSession,
    disposeViewTrackers,
    isCurationMode,
  ]);

  useEffect(() => {
    const saved = cardAnswers[index];
    patchSession({
      pendingRating: saved?.rating ?? '',
      pendingComment: saved?.comment ?? '',
      pendingPicks: saved?.picks || emptyCurationPicks(),
      cardPeeked: Boolean(saved?.peeked || cardOutcomes[index] === 'peeked'),
    });
    setSaveError(null);
    setShowCommunityPeers(false);
    // Rehydrate only when switching cards; ignore draft edits while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- index/current.id
  }, [index, current?.id]);

  // Per-card view duration: start/resume when card is current, pause on leave.
  useEffect(() => {
    if (phase !== 'stage' || !current?.id) return undefined;
    const ratingId = current.id;
    const seed = cardAnswers[index]?.viewDurationSeconds ?? 0;
    const tracker = getOrCreateViewTracker(ratingId, seed);
    tracker?.start();
    return () => {
      tracker?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed only on first create
  }, [phase, index, current?.id, getOrCreateViewTracker]);

  const canGoto = useCallback(
    (target) => Number.isInteger(target) && target >= 0 && target < cards.length,
    [cards.length]
  );

  const handleGoto = useCallback(
    (target) => {
      if (!canGoto(target) || (target === index && phase === 'stage')) return;
      patchSession((prev) => {
        const ratingId = prev.cards[prev.index]?.id;
        const viewDurationSeconds = readViewDurationSeconds(
          ratingId,
          prev.cardAnswers[prev.index]?.viewDurationSeconds
        );
        const nextAnswers = prev.cardAnswers.slice();
        nextAnswers[prev.index] = {
          rating: prev.pendingRating,
          comment: prev.pendingComment,
          picks: prev.pendingPicks || emptyCurationPicks(),
          peeked: prev.cardPeeked,
          viewDurationSeconds,
        };
        const nextSaved = nextAnswers[target];
        return {
          cardAnswers: nextAnswers,
          phase: prev.phase === 'done' ? 'stage' : prev.phase,
          index: target,
          pendingRating: nextSaved?.rating ?? '',
          pendingComment: nextSaved?.comment ?? '',
          pendingPicks: nextSaved?.picks || emptyCurationPicks(),
          cardPeeked: Boolean(nextSaved?.peeked || prev.cardOutcomes[target] === 'peeked'),
        };
      });
      void flushSession();
    },
    [canGoto, index, phase, flushSession, patchSession, readViewDurationSeconds]
  );

  const applyOutcomeAndAdvance = useCallback(
    (cardIndex, outcome, answer, streakDelta = null) => {
      patchSession((prev) => {
        const previous = prev.cardOutcomes[cardIndex];
        const nextOutcomes = prev.cardOutcomes.slice();
        nextOutcomes[cardIndex] = outcome;

        let nextSubmitted = prev.submitted;
        let nextSkipped = prev.skipped;
        if (!previous) {
          if (outcome === 'skipped') nextSkipped += 1;
          else nextSubmitted += 1;
        } else if (previous === 'skipped' && outcome !== 'skipped') {
          nextSkipped = Math.max(0, nextSkipped - 1);
          nextSubmitted += 1;
        } else if (previous !== 'skipped' && outcome === 'skipped') {
          nextSubmitted = Math.max(0, nextSubmitted - 1);
          nextSkipped += 1;
        }

        const nextAnswers = prev.cardAnswers.slice();
        nextAnswers[cardIndex] = answer;

        let nextOpen = -1;
        for (let i = cardIndex + 1; i < nextOutcomes.length; i++) {
          if (nextOutcomes[i] == null) {
            nextOpen = i;
            break;
          }
        }
        if (nextOpen < 0) {
          for (let i = 0; i < nextOutcomes.length; i++) {
            if (nextOutcomes[i] == null) {
              nextOpen = i;
              break;
            }
          }
        }

        const isRepeatSubmit = previous != null && previous !== 'skipped';
        const streakPatch =
          streakDelta === null
            ? {}
            : streakDelta === 0
              ? { streak: 0 }
              : isRepeatSubmit
                ? {}
                : { streak: prev.streak + streakDelta };

        if (nextOpen < 0) {
          return {
            cardOutcomes: nextOutcomes,
            cardAnswers: nextAnswers,
            submitted: nextSubmitted,
            skipped: nextSkipped,
            phase: 'done',
            pendingRating: '',
            pendingComment: '',
            pendingPicks: emptyCurationPicks(),
            cardPeeked: false,
            ...streakPatch,
          };
        }
        const nextSaved = nextAnswers[nextOpen];
        return {
          cardOutcomes: nextOutcomes,
          cardAnswers: nextAnswers,
          submitted: nextSubmitted,
          skipped: nextSkipped,
          phase: 'stage',
          index: nextOpen,
          pendingRating: nextSaved?.rating ?? '',
          pendingComment: nextSaved?.comment ?? '',
          pendingPicks: nextSaved?.picks || emptyCurationPicks(),
          cardPeeked: Boolean(nextSaved?.peeked || nextOutcomes[nextOpen] === 'peeked'),
          ...streakPatch,
        };
      });
    },
    [patchSession]
  );

  const handleSkip = () => {
    if (alreadyRated) return;
    const viewDurationSeconds = readViewDurationSeconds(
      current?.id,
      cardAnswers[index]?.viewDurationSeconds
    );
    applyOutcomeAndAdvance(
      index,
      'skipped',
      {
        rating: '',
        comment: '',
        picks: emptyCurationPicks(),
        peeked: cardPeeked,
        viewDurationSeconds,
      },
      0
    );
    void flushSession();
  };

  const handlePeek = () => {
    if (alreadyRated) return;
    const peekable = (current?.details || []).filter((d) => !isPeekAutorater(d));
    if (cardPeeked || peeksLeft <= 0 || peekable.length === 0) return;
    const ok = window.confirm(t('rating.zen.confirmPeek'));
    if (!ok) return;
    patchSession((prev) => {
      const ratingId = prev.cards[prev.index]?.id;
      const viewDurationSeconds = readViewDurationSeconds(
        ratingId,
        prev.cardAnswers[prev.index]?.viewDurationSeconds
      );
      const nextAnswers = prev.cardAnswers.slice();
      nextAnswers[prev.index] = {
        rating: prev.pendingRating,
        comment: prev.pendingComment,
        picks: prev.pendingPicks || emptyCurationPicks(),
        peeked: true,
        viewDurationSeconds,
      };
      return {
        cardPeeked: true,
        peeksLeft: Math.max(0, prev.peeksLeft - 1),
        peeksUsed: prev.peeksUsed + 1,
        cardAnswers: nextAnswers,
      };
    });
    void flushSession();
    // Resume timing after flush (peek stays on same card).
    getOrCreateViewTracker(current?.id)?.start();
  };

  const handleReport = async () => {
    if (!current) return;
    const entered = window.prompt(t('rating.zen.reportPrompt'), '');
    if (entered === null) return;
    const note = entered.trim();
    if (!note) {
      toast.error(t('rating.zen.errors.reportNoteRequired'));
      return;
    }
    try {
      await api.post(isCurationMode ? routes.admin.curationRatingZenReport() : routes.admin.ratingZenReport(), {
        ratingId: current.id,
        levelId: current.level?.id || current.levelId,
        note,
      });
      toast.success(t('rating.zen.messages.reportSent'));
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          t('rating.zen.errors.reportFailed')
      );
    }
  };

  const handleSubmit = async () => {
    if (!current || !user || alreadyRated) return;
    if (isCurationMode) {
      if (picksAreEmpty(pendingPicks)) {
        setSaveError(t('rating.zen.errors.picksRequired'));
        return;
      }
    } else {
      if (!pendingRating.trim()) {
        setSaveError(t('rating.zen.errors.ratingRequired'));
        return;
      }
      if (!pendingComment.trim()) {
        setSaveError(t('rating.zen.errors.commentRequired'));
        return;
      }
    }
    setIsSaving(true);
    setSaveError(null);
    const outcome = cardPeeked ? 'peeked' : 'rated';
    const viewDurationSeconds = readViewDurationSeconds(
      current.id,
      cardAnswers[index]?.viewDurationSeconds
    );
    try {
      if (isCurationMode) {
        await submitZenCuration(
          current.id,
          pendingPicks,
          pendingComment.trim(),
          viewDurationSeconds,
          curationTypesDict
        );
      } else {
        await submitZenRating(
          current.id,
          pendingRating.trim(),
          pendingComment.trim(),
          !isAdminRater,
          viewDurationSeconds
        );
      }
      applyOutcomeAndAdvance(
        index,
        outcome,
        {
          rating: isCurationMode ? '' : pendingRating.trim(),
          comment: pendingComment.trim(),
          picks: pendingPicks,
          peeked: cardPeeked,
          viewDurationSeconds,
        },
        1
      );
      void flushSession();
    } catch (err) {
      const status = err.response?.status;
      setSaveError(
        status === 409
          ? t('rating.zen.errors.alreadyRated')
          : err.response?.data?.error ||
            err.message ||
            t('rating.zen.errors.submitFailed')
      );
      getOrCreateViewTracker(current.id, viewDurationSeconds)?.start();
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = isCurationMode
    ? !picksAreEmpty(pendingPicks) && !isSaving && !alreadyRated
    : Boolean(pendingRating.trim()) &&
      Boolean(pendingComment.trim()) &&
      !isSaving &&
      !alreadyRated;

  useEffect(() => {
    if (phase !== 'stage') return undefined;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canSubmit) void handleSubmit();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // Intentionally bind to current stage fields each render cycle of deps below
  }, [phase, canSubmit, pendingRating, pendingComment, pendingPicks, current?.id]);

  const peerDetails = (current?.details || []).filter((d) => !isPeekAutorater(d));
  const adminRatings = peerDetails.filter((d) => !d.isCommunityRating);
  const communityRatings = peerDetails.filter((d) => d.isCommunityRating);
  const visiblePeers = isCurationMode
    ? peerDetails
    : showCommunityPeers
      ? communityRatings
      : adminRatings;
  const hasPeersToPeek = peerDetails.length > 0;
  const peekSourceKind =
    adminRatings.length > 0
      ? 'has-managers'
      : communityRatings.length > 0
        ? 'community-only'
        : 'none';
  const peekSourceLabel =
    peekSourceKind === 'has-managers'
      ? t('rating.zen.peekSources.hasManagers', {
          managers: adminRatings.length,
          community: communityRatings.length,
        })
      : peekSourceKind === 'community-only'
        ? t('rating.zen.peekSources.communityOnly', {
            count: communityRatings.length,
          })
        : t('rating.zen.noPeers');
  const showResumeActions = hasResumableDeck;

  const progressBar = cards.length > 0 && (
    <div
      className="rating-zen-page__progress"
      role="navigation"
      aria-label={t('rating.zen.progress.aria', {
        done: cardOutcomes.filter(Boolean).length,
        total: cards.length,
      })}
    >
      {cards.map((card, i) => {
        const outcome = cardOutcomes[i];
        const state = outcome || 'pending';
        const isActive = phase === 'stage' && i === index;
        return (
          <button
            key={card.id ?? i}
            type="button"
            className={[
              'rating-zen-page__progress-seg',
              `rating-zen-page__progress-seg--${state}`,
              'rating-zen-page__progress-seg--clickable',
              isActive ? 'rating-zen-page__progress-seg--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => handleGoto(i)}
            disabled={isSaving}
            title={
              state === 'rated'
                ? t('rating.zen.progress.rated')
                : state === 'peeked'
                  ? t('rating.zen.progress.peeked')
                  : state === 'skipped'
                    ? t('rating.zen.progress.skipped')
                    : isActive
                      ? t('rating.zen.progress.current')
                      : t('rating.zen.progress.pending')
            }
            aria-label={t('rating.zen.progress.goTo', { n: i + 1 })}
            aria-current={isActive ? 'step' : undefined}
          />
        );
      })}
    </div>
  );

  if (user === undefined || !sessionHydrated) {
    return (
      <div className="rating-zen-page">
        <MetaTags {...pageMeta} />
        <div className="rating-zen-page__loader">
          <div className="loader loader-relative" />
        </div>
      </div>
    );
  }

  return (
    <div className="rating-zen-page">
      <MetaTags {...pageMeta} />

      {phase === 'setup' && (
        <div className="rating-zen-page__setup">
          <header className="rating-zen-page__setup-header">
            <h1>{t(isCurationMode ? 'rating.curationRating.zen.setupTitle' : 'rating.zen.setup.title')}</h1>
            <p>
              {t('rating.zen.setup.subtitle')}
            </p>
          </header>

          {showResumeActions ? (
            <div className="rating-zen-page__setup-resume">
              <p>{t('rating.zen.setup.resumeHint')}</p>
              <div className="rating-zen-page__setup-actions">
                <button
                  type="button"
                  className="btn-fill-primary"
                  onClick={handleContinueSession}
                >
                  {t('rating.zen.setup.continue')}
                </button>
                <button
                  type="button"
                  className="btn-fill-neutral-dark"
                  onClick={handleDiscardSession}
                >
                  {t('rating.zen.setup.discard')}
                </button>
              </div>
            </div>
          ) : null}

          <div className="rating-zen-page__setup-form">
            <div className="rating-zen-page__field">
              <span>{t('rating.zen.setup.deckSize')}</span>
              <CustomSelect
                options={deckSizeOptions}
                value={selectedDeckSizeOption}
                onChange={handleDeckSizeOptionChange}
                width="100%"
                menuPlacement="bottom"
                isSearchable={false}
              />
              {showCustomDeckInput ? (
                <input
                  type="number"
                  className="rating-zen-page__number"
                  min={MIN_DECK_SIZE}
                  max={MAX_DECK_SIZE}
                  step={1}
                  inputMode="numeric"
                  value={customDeckDraft}
                  onChange={(e) => handleCustomDeckDraftChange(e.target.value)}
                  aria-label={t('rating.zen.setup.deckSizeCustom')}
                  aria-invalid={!deckSizeIsValid}
                />
              ) : null}
              <small>
                {t('rating.zen.setup.peekHint', { peeks: requestedPeeks })}
              </small>
              {showCustomDeckInput && !deckSizeIsValid ? (
                <small className="rating-zen-page__field-error">
                  {t('rating.zen.errors.invalidDeckSize')}
                </small>
              ) : null}
            </div>

            {!isCurationMode && (
            <div className="rating-zen-page__field">
              <span>{t('rating.zen.setup.requestBands')}</span>
              <div className="rating-zen-page__pgu">
                {REQUEST_BANDS.map(([band, key]) => {
                  const included =
                    key === 'includeP'
                      ? includeP
                      : key === 'includeG'
                        ? includeG
                        : includeU;
                  return (
                    <label key={band} className="rating-zen-page__pgu-item">
                      <input
                        type="checkbox"
                        checked={!included}
                        onChange={(e) =>
                          patchSession({ [key]: !e.target.checked })
                        }
                      />
                      <span>{band}</span>
                    </label>
                  );
                })}
              </div>
              <small>{t('rating.zen.setup.requestBandsHint')}</small>
            </div>
            )}

            {isCurationMode && (
            <div className="rating-zen-page__field">
              <span>{t('rating.curationRating.zen.pools')}</span>
              <div className="rating-zen-page__pgu rating-zen-page__pgu--pools">
                {CURATION_POOLS.map(([pool, key]) => {
                  const included =
                    key === 'includeRecent'
                      ? includeRecent
                      : key === 'includeRerate'
                        ? includeRerate
                        : includeBulk;
                  return (
                    <label key={pool} className="rating-zen-page__pgu-item">
                      <input
                        type="checkbox"
                        checked={!included}
                        onChange={(e) =>
                          patchSession({ [key]: !e.target.checked })
                        }
                      />
                      <span>{t(`rating.curationRating.flows.${pool}`)}</span>
                    </label>
                  );
                })}
              </div>
              <small>{t('rating.curationRating.zen.poolsHint')}</small>
            </div>
            )}

            <div className="rating-zen-page__field">
              <span>{t('rating.zen.setup.sort')}</span>
              <CustomSelect
                options={sortOptions}
                value={selectedSortOption}
                onChange={(option) => patchSession({ sortPreset: option.value })}
                width="100%"
                menuPlacement="bottom"
                isSearchable={false}
              />
            </div>

            <div className="rating-zen-page__field">
              <div className="rating-zen-page__field-row">
                <span>{t('rating.zen.setup.randomness')}</span>
                <span className="rating-zen-page__field-value">
                  {t('rating.zen.setup.randomnessValue', {
                    n: randomness ?? DEFAULT_RANDOMNESS,
                  })}
                </span>
              </div>
              <input
                type="range"
                className="rating-zen-page__range"
                min={0}
                max={100}
                step={1}
                value={randomness}
                onChange={(e) =>
                  patchSession({ randomness: Number(e.target.value) })
                }
                aria-label={t('rating.zen.setup.randomness')}
              />
              <small>{t('rating.zen.setup.randomnessHint')}</small>
            </div>

            <div className="rating-zen-page__setup-actions">
              <button
                type="button"
                className="btn-fill-primary"
                onClick={() => void startDeal()}
                disabled={isDealing || !user || showResumeActions || !deckSizeIsValid}
              >
                {isDealing
                  ? t('rating.zen.setup.dealing')
                  : t('rating.zen.setup.start')}
              </button>
              {!hasUnfinishedDeck && (
                <Link to={listPath} className="btn-fill-neutral-dark">
                  {t('rating.zen.setup.back')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {phase === 'stage' && current && (
        <div className="rating-zen-page__stage">
          <CloseButton
            variant="floating"
            onClick={handleExit}
            aria-label={t('rating.zen.exit')}
          />
          <header className="rating-zen-page__bar">
            <div className="rating-zen-page__bar-main">
              <div className="rating-zen-page__bar-stats">
                <span>
                  {index + 1} / {cards.length}
                </span>
                <span>
                  {t('rating.zen.stats.peeks', { n: peeksLeft })}
                </span>
                {streak > 1 && (
                  <span className="rating-zen-page__streak">
                    {t('rating.zen.stats.streak', { n: streak })}
                  </span>
                )}
              </div>
              {progressBar}
              <div className="rating-zen-page__progress-legend" aria-hidden="true">
                <span className="rating-zen-page__progress-legend-item rating-zen-page__progress-legend-item--rated">
                  {t('rating.zen.progress.rated')}
                </span>
                <span className="rating-zen-page__progress-legend-item rating-zen-page__progress-legend-item--peeked">
                  {t('rating.zen.progress.peeked')}
                </span>
                <span className="rating-zen-page__progress-legend-item rating-zen-page__progress-legend-item--skipped">
                  {t('rating.zen.progress.skipped')}
                </span>
              </div>
            </div>
            {!isCurationMode && (
            <div className="rating-zen-page__bar-actions">
              <ReferencesButton />
            </div>
            )}
          </header>

          <div className="rating-zen-page__main">
            <div className="rating-zen-page__video-wrap">
              <button
                type="button"
                className="rating-zen-page__flag"
                onClick={() => void handleReport()}
                title={t('rating.zen.report')}
                aria-label={t('rating.zen.report')}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              </button>
              <div className={`rating-zen-page__video-aspect ${getVideoEmbedModifierClass(videoLink)}`.trim()}>
                {videoData ? (
                  <iframe
                    src={videoData.embed}
                    title="Video"
                    className="rating-zen-page__video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy={getVideoIframeReferrerPolicy(videoLink)}
                    scrolling={getVideoIframeScrolling(videoLink)}
                    allowFullScreen
                  />
                ) : (
                  <div className="rating-zen-page__video-placeholder">
                    {t('rating.zen.noVideo')}
                  </div>
                )}
              </div>
              {current.level?.id && current.level?.fileId ? (
                <WebAdofaiViewerButton levelId={current.level.id} portaled={false} />
              ) : null}
              {current.level?.notes?.trim() && (
                <div className="rating-zen-page__notes">
                  <span className="rating-zen-page__notes-label">
                    {t('components:rating.detailPopup.labels.notes')}
                  </span>
                  <div className="rating-zen-page__notes-body">
                    <CommentFormatter>{current.level.notes}</CommentFormatter>
                  </div>
                </div>
              )}
            </div>

            <aside className="rating-zen-page__panel">
              {isVoteCard ? (
                <div className="rating-zen-page__actions-block">
                  <DiscordVoteNotice threadUrl={linkedRequest?.discordMessageUrl || current?.discordMessageUrl} />
                  <RatingDiscordThreadButton
                    rating={current}
                    allowed={hasFlag(user, permissionFlags.SUPER_ADMIN)}
                    endpoint={isCurationMode ? routes.admin.curationRatingDiscord : undefined}
                    onUpdated={(next) => {
                      patchSession((prev) => ({
                        cards: prev.cards.map((card) => (
                          card.id === next.id ? mergeRatingThreadState(card, next) : card
                        )),
                      }));
                    }}
                  />
                  <div className="rating-zen-page__actions">
                    <button
                      type="button"
                      className="btn-fill-neutral-dark btn-block"
                      onClick={handleSkip}
                      disabled={isSaving}
                      aria-label={t('rating.zen.actions.skip')}
                      title={t('rating.zen.actions.skip')}
                    >
                      <span aria-hidden="true">
                        <SkipIcon size={22} color="currentColor" />
                      </span>
                    </button>
                  </div>
                </div>
              ) : hasFlag(user, permissionFlags.RATING_BANNED) ? (
                <p className="rating-zen-page__banned">
                  {t('components:rating.detailPopup.messages.ratingBanned')}
                </p>
              ) : (
                <div className="rating-zen-page__actions-block">
                  <RatingDiscordThreadButton
                    rating={current}
                    allowed={hasFlag(user, permissionFlags.SUPER_ADMIN)}
                    endpoint={isCurationMode ? routes.admin.curationRatingDiscord : undefined}
                    onUpdated={(next) => {
                      patchSession((prev) => ({
                        cards: prev.cards.map((card) => (
                          card.id === next.id ? mergeRatingThreadState(card, next) : card
                        )),
                      }));
                    }}
                  />
                  <div className="rating-zen-page__actions">
                    <button
                      type="button"
                      className="btn-fill-neutral-dark btn-block"
                      onClick={handleSkip}
                      disabled={isSaving || alreadyRated}
                      aria-label={t('rating.zen.actions.skip')}
                      title={t('rating.zen.actions.skip')}
                    >
                      <span aria-hidden="true">
                        <SkipIcon size={22} color="currentColor" />
                      </span>
                    </button>
                    <span
                      className="rating-zen-page__action-slot"
                      data-tooltip-id={!hasPeersToPeek ? 'rating-zen-peek-empty' : undefined}
                    >
                      <button
                        type="button"
                        className="btn-fill-admin btn-block"
                        onClick={handlePeek}
                        disabled={alreadyRated || cardPeeked || peeksLeft <= 0 || isSaving || !hasPeersToPeek}
                        aria-label={
                          cardPeeked
                            ? t('rating.zen.actions.peeked')
                            : `${t('rating.zen.actions.peek', { n: peeksLeft })}. ${peekSourceLabel}`
                        }
                        title={
                          cardPeeked
                            ? t('rating.zen.actions.peeked')
                            : hasPeersToPeek
                              ? `${t('rating.zen.actions.peek', { n: peeksLeft })} — ${peekSourceLabel}`
                              : undefined
                        }
                      >
                        <span aria-hidden="true">
                          <EyeIcon size={22} color="currentColor" />
                        </span>
                      </button>
                    </span>
                    <button
                      type="button"
                      className="btn-fill-primary btn-block"
                      onClick={() => void handleSubmit()}
                      disabled={!canSubmit || alreadyRated}
                      aria-label={
                        isSaving
                          ? t('loading.saving', { ns: 'common' })
                          : t('rating.zen.actions.submit')
                      }
                      title={
                        isSaving
                          ? t('loading.saving', { ns: 'common' })
                          : isCurationMode
                            ? (picksAreEmpty(pendingPicks)
                              ? t('rating.zen.errors.picksRequired')
                              : t('rating.zen.actions.submit'))
                            : !pendingRating.trim()
                              ? t('rating.zen.errors.ratingRequired')
                              : !pendingComment.trim()
                                ? t('rating.zen.errors.commentRequired')
                                : t('rating.zen.actions.submit')
                      }
                    >
                      <span aria-hidden="true">
                        {isSaving ? (
                          <span className="spinner spinner-small" />
                        ) : (
                          <CheckmarkIcon size={20} color="currentColor" />
                        )}
                      </span>
                    </button>
                  </div>
                  {!cardPeeked && (
                    <p
                      className={`rating-zen-page__peek-sources rating-zen-page__peek-sources--${peekSourceKind}`}
                    >
                      {peekSourceLabel}
                    </p>
                  )}
                  {!hasPeersToPeek && (
                    <Tooltip id="rating-zen-peek-empty" place="bottom" noArrow>
                      {t('rating.zen.noPeers')}
                    </Tooltip>
                  )}
                </div>
              )}

              <div className="rating-zen-page__meta">
                <div className="rating-zen-page__meta-header">
                  <div className="rating-zen-page__meta-header-left">
                    {difficultyDict[current.level?.diffId]?.icon && (
                      <img
                        src={selectIconSize(difficultyDict[current.level.diffId].icon, ICON_SIZE.MEDIUM)}
                        alt={difficultyDict[current.level.diffId]?.name || ''}
                        className="rating-zen-page__diff-icon"
                      />
                    )}
                  </div>

                  <span className="rating-zen-page__meta-id">
                    <span>
                    #{current.level?.id}
                    </span>
                    <span>
                    {t('components:rating.detailPopup.labels.clearedCount', {
                      count: current.level?.clears || 0,
                    })}
                  </span>
                  </span>
                  <a
                    href={`/levels/${current.level?.id}`}
                    className="rating-zen-page__meta-header-right"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <h2>{getSongDisplayName(current.level)}</h2>
                    <p className="rating-zen-page__artist">{current.level?.artist}</p>
                    <p className="rating-zen-page__creator">{formatCreatorDisplay(current.level)}</p>
                  </a>
                </div>
                {(current.level?.tilecount || current.level?.bpm || current.level?.levelLengthInMs) && (
                  <div className="rating-zen-page__metadata">
                    {!!current.level?.levelLengthInMs && (
                      <div className="rating-zen-page__metadata-item">
                        <TimeIcon size={18} />
                        <span className="rating-zen-page__metadata-value">
                          {formatDuration(current.level.levelLengthInMs)}
                        </span>
                      </div>
                    )}
                    {!!current.level?.tilecount && (() => {
                      const autoTilecountTooltip = formatAutoTilecountTooltip(
                        current.level.tilecount,
                        current.level.autoTileCount,
                        current.level.midspinCount,
                      );
                      const tilecountTooltipId = `rating-zen-tilecount-${current.level.id}`;
                      return (
                        <div
                          className="rating-zen-page__metadata-item"
                          {...(autoTilecountTooltip
                            ? {
                                'data-tooltip-id': tilecountTooltipId,
                                'data-tooltip-content': autoTilecountTooltip,
                              }
                            : {})}
                        >
                          <ChartIcon size={18} />
                          <span className="rating-zen-page__metadata-value">
                            {current.level.tilecount}
                          </span>
                          {autoTilecountTooltip && (
                            <Tooltip
                              style={{ zIndex: 10, fontSize: '0.85rem', fontWeight: 500 }}
                              id={tilecountTooltipId}
                              place="bottom"
                            />
                          )}
                        </div>
                      );
                    })()}
                    {!!current.level?.bpm && (
                      <div className="rating-zen-page__metadata-item">
                        <MetronomeIcon size={18} />
                        <span className="rating-zen-page__metadata-value">
                          {current.level.bpm}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {isCurationMode && current.level?.curationRerateReason && (
                  <div className="rating-zen-page__reason">
                    <CommentFormatter>{current.level.curationRerateReason}</CommentFormatter>
                  </div>
                )}
                {!isCurationMode && showRequestedRating && (current.level?.rerateNum || current.requesterFR) && (
                  <p className="rating-zen-page__request-rating">
                    {t(`components:rating.ratingCard.labels.${current.level?.rerateNum ? 'rerateNumber' : 'requestedRating'}`)}
                    {': '}
                    {current.level?.rerateNum || current.requesterFR}
                  </p>
                )}
                {!isCurationMode && showRequestedRating && current.level?.rerateReason && (
                  <div className="rating-zen-page__reason">
                    <CommentFormatter>{current.level.rerateReason}</CommentFormatter>
                  </div>
                )}
                {!isCurationMode && showRequestedRating && (
                  <div className="rating-zen-page__score-targets">
                    <LevelRequestScoreTargets
                      payload={linkedRequest?.payload}
                      level={current.level}
                    />
                  </div>
                )}
              </div>

              {!isVoteCard && !hasFlag(user, permissionFlags.RATING_BANNED) && (
                <div className="rating-zen-page__form">
                  {isCurationMode ? (
                    <RatingModeInput
                      mode="curation"
                      disabled={alreadyRated}
                      picks={pendingPicks}
                      onPicksChange={(next) => patchSession({ pendingPicks: next })}
                      requestedBuckets={requestedBuckets}
                      requests={current?.curationRequests}
                    />
                  ) : (
                  <div className="rating-zen-page__field">
                    <span>{t('components:rating.detailPopup.labels.yourRating')}</span>
                    <div className="rating-zen-page__rating-row">
                      <RatingModeInput
                        mode="difficulty"
                        disabled={alreadyRated}
                        difficulties={difficulties}
                        rating={pendingRating}
                        onRatingChange={(value) => patchSession({ pendingRating: value })}
                      />
                    </div>
                  </div>
                  )}
                  <label className="rating-zen-page__field">
                    <span>{t('components:rating.detailPopup.labels.yourComment')}</span>
                    <LevelMentionField
                      name="rating-zen-page__comment"
                      value={pendingComment}
                      onChange={(e) =>
                        patchSession({ pendingComment: e.target.value })
                      }
                      rows={4}
                      disabled={alreadyRated}
                      placeholder={t(isCurationMode ? 'components:rating.detailPopup.curation.commentPlaceholder' : 'components:rating.detailPopup.placeholders.communityComment')}
                    />
                  </label>
                  {alreadyRated && (
                    <p className="rating-zen-page__error">
                      {t('rating.zen.errors.alreadyRated')}
                    </p>
                  )}
                  {saveError && !alreadyRated && (
                    <p className="rating-zen-page__error">{saveError}</p>
                  )}
                </div>
              )}

              {cardPeeked && (
                <div className="rating-zen-page__peers">
                  <div className="rating-zen-page__peers-header">
                    <span>
                      {isCurationMode
                        ? t('components:rating.detailPopup.curation.otherPicks')
                        : showCommunityPeers
                          ? t('components:rating.detailPopup.labels.communityRatings')
                          : t('components:rating.detailPopup.labels.adminRatings')}
                    </span>
                    {!isCurationMode && (
                    <button
                      type="button"
                      className="btn-fill-neutral-dark"
                      onClick={() => setShowCommunityPeers((v) => !v)}
                    >
                      {showCommunityPeers
                        ? t('components:rating.detailPopup.buttons.viewAdminRatings')
                        : t('components:rating.detailPopup.buttons.viewCommunityRatings')}
                    </button>
                    )}
                  </div>
                  <div className="rating-zen-page__peers-list">
                    {visiblePeers.length === 0 ? (
                      <p className="rating-zen-page__peers-empty">
                        {t('rating.zen.noPeers')}
                      </p>
                    ) : (
                      visiblePeers.map((detail) => (
                        isCurationMode ? (
                          <CurationPickDisplay
                            key={detail.id || detail.userId}
                            detail={detail}
                            curationTypesDict={curationTypesDict}
                          />
                        ) : (
                        <RatingItem
                          key={detail.id || detail.userId}
                          ratingDetail={detail}
                          levelId={current?.level?.id || current?.levelId}
                          isSuperAdmin={false}
                          weeklyRaterActivity={[]}
                        />
                        )
                      ))
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="rating-zen-page__done">
          <h1>{t('rating.zen.done.title')}</h1>
          {progressBar}
          <div className="rating-zen-page__progress-legend" aria-hidden="true">
            <span className="rating-zen-page__progress-legend-item rating-zen-page__progress-legend-item--rated">
              {t('rating.zen.progress.rated')}
            </span>
            <span className="rating-zen-page__progress-legend-item rating-zen-page__progress-legend-item--peeked">
              {t('rating.zen.progress.peeked')}
            </span>
            <span className="rating-zen-page__progress-legend-item rating-zen-page__progress-legend-item--skipped">
              {t('rating.zen.progress.skipped')}
            </span>
          </div>
          <ul className="rating-zen-page__done-stats">
            <li>
              {t('rating.zen.done.submitted', { n: submitted })}
            </li>
            <li>
              {t('rating.zen.done.skipped', { n: skipped })}
            </li>
            <li>
              {t('rating.zen.done.peeks', {
                n: peeksUsed,
                max: peeksAllowed,
              })}
            </li>
          </ul>
          <div className="rating-zen-page__setup-actions">
            <button
              type="button"
              className="btn-fill-primary"
              onClick={() => {
                disposeViewTrackers();
                void resetToSetup();
              }}
            >
              {t('rating.zen.done.again')}
            </button>
            <Link to={listPath} className="btn-fill-neutral-dark">
              {t('rating.zen.done.queue')}
            </Link>
          </div>
        </div>
      )}

    </div>
  );
};

export default RatingZenPage;
