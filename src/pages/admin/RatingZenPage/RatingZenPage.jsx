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
import { CustomSelect, RatingInput } from '@/components/common/selectors';
import { RatingItem } from '@/components/cards';
import { CloseButton, ReferencesButton } from '@/components/common/buttons';
import { CheckmarkIcon, EyeIcon, SkipIcon } from '@/components/common/icons';
import { Tooltip } from 'react-tooltip';
import { CommentFormatter } from '@/components/misc';
import api from '@/utils/api';
import { getVideoDetails } from '@/utils';
import { formatCreatorDisplay } from '@/utils/Utility';
import { getSongDisplayName } from '@/utils/levelHelpers';
import { hasAnyFlag, hasFlag, permissionFlags } from '@/utils/UserPermissions';
import toast from 'react-hot-toast';
import { createViewDurationTracker } from '@/utils/viewDurationTracker';

const DECK_SIZES = [5, 10, 15, 20, 25, 30];
const DECK_UNIT = 5;

const videoCache = new Map();

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

const RatingZenPage = () => {
  const { t } = useTranslation(['pages', 'components', 'common']);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { difficulties, difficultyDict } = useDifficultyContext();
  const {
    session,
    patchSession,
    startSession,
    clearSession,
    resetToSetup,
    hasResumableDeck,
  } = useZenMode();

  const {
    phase,
    deckSize,
    onlyLowDiff,
    excludeUniversals,
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
        title: t('rating.zen.meta.title'),
        description: t('rating.zen.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname]
  );

  const [isDealing, setIsDealing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [showCommunityPeers, setShowCommunityPeers] = useState(false);
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
        peeked: prev.cardPeeked,
        viewDurationSeconds,
      };
      return {
        cardAnswers: nextAnswers,
        phase: 'setup',
      };
    });
    navigate('/rating');
  }, [navigate, patchSession, readViewDurationSeconds]);

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
  const isAdminRater = Boolean(
    user && hasAnyFlag(user, [permissionFlags.SUPER_ADMIN, permissionFlags.RATER])
  );

  const deckSizeOptions = useMemo(
    () =>
      DECK_SIZES.map((n) => ({
        value: n,
        label: `${n} (${n / DECK_UNIT} peeks)`,
      })),
    []
  );

  const selectedDeckSizeOption = useMemo(
    () =>
      deckSizeOptions.find((option) => option.value === deckSize) ??
      deckSizeOptions.find((option) => option.value === DEFAULT_DECK_SIZE) ??
      deckSizeOptions[0],
    [deckSize, deckSizeOptions]
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
    clearSession();
  }, [clearSession, disposeViewTrackers]);

  const startDeal = useCallback(async () => {
    if (!user) {
      toast.error(t('rating.zen.errors.loginRequired'));
      navigate('/login');
      return;
    }
    setIsDealing(true);
    try {
      const { data } = await api.get(routes.admin.ratingZenDeal(), {
        params: {
          deckSize,
          onlyLowDiff: onlyLowDiff ? 'true' : 'false',
          excludeUniversals: excludeUniversals ? 'true' : 'false',
          randomness,
          ...sortParams,
        },
      });
      const dealt = data?.cards || [];
      const peeks = data?.peeksAllowed ?? Math.floor(deckSize / DECK_UNIT);
      disposeViewTrackers();
      startSession({
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
        phase: dealt.length === 0 ? 'done' : 'stage',
        deckSize,
        onlyLowDiff,
        excludeUniversals,
        sortPreset,
        randomness,
      });
      setSaveError(null);
      if (dealt.length === 0) {
        toast(t('rating.zen.messages.emptyDeck'));
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
    onlyLowDiff,
    excludeUniversals,
    randomness,
    sortPreset,
    sortParams,
    navigate,
    t,
    startSession,
    disposeViewTrackers,
  ]);

  useEffect(() => {
    const videoLink = current?.displayVideoLink || current?.level?.videoLink;
    if (!videoLink) {
      setVideoData(null);
      setIsVideoLoading(false);
      return;
    }
    setIsVideoLoading(true);
    const link = videoLink;
    const cached = videoCache.get(link);
    if (cached) {
      setVideoData(cached);
      setIsVideoLoading(false);
      return;
    }
    void getVideoDetails(link)
      .then((data) => {
        if (data) videoCache.set(link, data);
        setVideoData(data);
      })
      .finally(() => setIsVideoLoading(false));
  }, [current?.displayVideoLink, current?.level?.videoLink, current?.id]);

  useEffect(() => {
    const saved = cardAnswers[index];
    patchSession({
      pendingRating: saved?.rating ?? '',
      pendingComment: saved?.comment ?? '',
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
          peeked: prev.cardPeeked,
          viewDurationSeconds,
        };
        return {
          cardAnswers: nextAnswers,
          phase: prev.phase === 'done' ? 'stage' : prev.phase,
          index: target,
        };
      });
    },
    [canGoto, index, phase, patchSession, readViewDurationSeconds]
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

        const streakPatch =
          streakDelta === null
            ? {}
            : streakDelta === 0
              ? { streak: 0 }
              : { streak: prev.streak + streakDelta };

        if (nextOpen < 0) {
          return {
            cardOutcomes: nextOutcomes,
            cardAnswers: nextAnswers,
            submitted: nextSubmitted,
            skipped: nextSkipped,
            phase: 'done',
            ...streakPatch,
          };
        }
        return {
          cardOutcomes: nextOutcomes,
          cardAnswers: nextAnswers,
          submitted: nextSubmitted,
          skipped: nextSkipped,
          phase: 'stage',
          index: nextOpen,
          ...streakPatch,
        };
      });
    },
    [patchSession]
  );

  const handleSkip = () => {
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
        peeked: cardPeeked,
        viewDurationSeconds,
      },
      0
    );
  };

  const handlePeek = () => {
    if (cardPeeked || peeksLeft <= 0 || !(current?.details || []).length) return;
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
    // Resume timing after flush (peek stays on same card).
    getOrCreateViewTracker(current?.id)?.start();
  };

  const handleReport = async () => {
    if (!current) return;
    const note = window.prompt(
      t('rating.zen.reportPrompt'),
      ''
    );
    if (note === null) return;
    try {
      await api.post(routes.admin.ratingZenReport(), {
        ratingId: current.id,
        levelId: current.level?.id || current.levelId,
        note: note || undefined,
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
    if (!current || !user) return;
    if (!pendingRating.trim()) {
      setSaveError(t('rating.zen.errors.ratingRequired'));
      return;
    }
    if (!pendingComment.trim()) {
      setSaveError(t('rating.zen.errors.commentRequired'));
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    const outcome = cardPeeked ? 'peeked' : 'rated';
    const viewDurationSeconds = readViewDurationSeconds(
      current.id,
      cardAnswers[index]?.viewDurationSeconds
    );
    try {
      await submitZenRating(
        current.id,
        pendingRating.trim(),
        pendingComment.trim(),
        !isAdminRater,
        viewDurationSeconds
      );
      applyOutcomeAndAdvance(
        index,
        outcome,
        {
          rating: pendingRating.trim(),
          comment: pendingComment.trim(),
          peeked: cardPeeked,
          viewDurationSeconds,
        },
        1
      );
    } catch (err) {
      setSaveError(
        err.response?.data?.error ||
          err.message ||
          t('rating.zen.errors.submitFailed')
      );
      getOrCreateViewTracker(current.id, viewDurationSeconds)?.start();
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit =
    Boolean(pendingRating.trim()) && Boolean(pendingComment.trim()) && !isSaving;

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
  }, [phase, canSubmit, pendingRating, pendingComment, current?.id]);

  const peerDetails = current?.details || [];
  const adminRatings = peerDetails.filter((d) => !d.isCommunityRating);
  const communityRatings = peerDetails.filter((d) => d.isCommunityRating);
  const visiblePeers = showCommunityPeers ? communityRatings : adminRatings;
  const hasPeersToPeek = peerDetails.length > 0;
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

  if (user === undefined) {
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
            <h1>{t('rating.zen.setup.title')}</h1>
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
                  className="rating-zen-page__btn rating-zen-page__btn--primary"
                  onClick={handleContinueSession}
                >
                  {t('rating.zen.setup.continue')}
                </button>
                <button
                  type="button"
                  className="rating-zen-page__btn rating-zen-page__btn--ghost"
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
                onChange={(option) => patchSession({ deckSize: option.value })}
                width="100%"
                menuPlacement="bottom"
                isSearchable={false}
              />
              <small>
                {t('rating.zen.setup.peekHint')}
              </small>
            </div>

            <div className="rating-zen-page__field-row">
              <label className="rating-zen-page__toggle">
                <input
                  type="checkbox"
                  checked={onlyLowDiff}
                  onChange={(e) => patchSession({ onlyLowDiff: e.target.checked })}
                />
                <span>{t('rating.zen.setup.onlyLowDiff')}</span>
              </label>

              <label className="rating-zen-page__toggle">
                <input
                  type="checkbox"
                  checked={excludeUniversals}
                  onChange={(e) =>
                    patchSession({ excludeUniversals: e.target.checked })
                  }
                />
                <span>{t('rating.zen.setup.excludeUniversals')}</span>
              </label>
            </div>

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
                className="rating-zen-page__btn rating-zen-page__btn--primary"
                onClick={() => void startDeal()}
                disabled={isDealing || !user || showResumeActions}
              >
                {isDealing
                  ? t('rating.zen.setup.dealing')
                  : t('rating.zen.setup.start')}
              </button>
              <Link to="/rating" className="rating-zen-page__btn rating-zen-page__btn--ghost">
                {t('rating.zen.setup.back')}
              </Link>
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
            <div className="rating-zen-page__bar-actions">
              <ReferencesButton />
            </div>
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
              <div className="rating-zen-page__video-aspect">
                {isVideoLoading ? (
                  <div className="rating-zen-page__video-placeholder">
                    <div className="spinner spinner-xlarge" />
                  </div>
                ) : !videoData ? (
                  <div className="rating-zen-page__video-placeholder">
                    {t('rating.zen.noVideo')}
                  </div>
                ) : (
                  <iframe
                    src={videoData.embed}
                    title="Video"
                    className="rating-zen-page__video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </div>

            <aside className="rating-zen-page__panel">
              {hasFlag(user, permissionFlags.RATING_BANNED) ? (
                <p className="rating-zen-page__banned">
                  {t('components:rating.detailPopup.messages.ratingBanned')}
                </p>
              ) : (
                <div className="rating-zen-page__actions">
                  <button
                    type="button"
                    className="rating-zen-page__btn rating-zen-page__btn--ghost rating-zen-page__btn--icon"
                    onClick={handleSkip}
                    disabled={isSaving}
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
                      className="rating-zen-page__btn rating-zen-page__btn--secondary rating-zen-page__btn--icon"
                      onClick={handlePeek}
                      disabled={cardPeeked || peeksLeft <= 0 || isSaving || !hasPeersToPeek}
                      aria-label={
                        cardPeeked
                          ? t('rating.zen.actions.peeked')
                          : t('rating.zen.actions.peek', { n: peeksLeft })
                      }
                      title={
                        hasPeersToPeek
                          ? cardPeeked
                            ? t('rating.zen.actions.peeked')
                            : t('rating.zen.actions.peek', { n: peeksLeft })
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
                    className="rating-zen-page__btn rating-zen-page__btn--primary rating-zen-page__btn--icon"
                    onClick={() => void handleSubmit()}
                    disabled={!canSubmit}
                    aria-label={
                      isSaving
                        ? t('rating.zen.actions.saving')
                        : t('rating.zen.actions.submit')
                    }
                    title={
                      isSaving
                        ? t('rating.zen.actions.saving')
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
              )}
              {!hasPeersToPeek && !hasFlag(user, permissionFlags.RATING_BANNED) && (
                <Tooltip id="rating-zen-peek-empty" place="bottom" noArrow>
                  {t('rating.zen.noPeers')}
                </Tooltip>
              )}

              <div className="rating-zen-page__meta">
                <div className="rating-zen-page__meta-header">
                  <div className="rating-zen-page__meta-header-left">
                    {difficultyDict[current.level?.diffId]?.icon && (
                      <img
                        src={difficultyDict[current.level.diffId].icon}
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
                {(current.level?.rerateNum || current.requesterFR) && (
                  <p className="rating-zen-page__request-rating">
                    {t(`components:rating.ratingCard.labels.${current.level?.rerateNum ? 'rerateNumber' : 'requestedRating'}`)}
                    {': '}
                    {current.level?.rerateNum || current.requesterFR}
                  </p>
                )}
                {current.level?.rerateReason && (
                  <div className="rating-zen-page__reason">
                    <CommentFormatter>{current.level.rerateReason}</CommentFormatter>
                  </div>
                )}
              </div>

              {!hasFlag(user, permissionFlags.RATING_BANNED) && (
                <div className="rating-zen-page__form">
                  <div className="rating-zen-page__field">
                    <span>{t('components:rating.detailPopup.labels.yourRating')}</span>
                    <div className="rating-zen-page__rating-row">
                      <RatingInput
                        value={pendingRating}
                        onChange={(value) => patchSession({ pendingRating: value })}
                        showDiff={false}
                        difficulties={difficulties}
                        allowCustomInput={true}
                      />
                    </div>
                  </div>
                  <label className="rating-zen-page__field">
                    <span>{t('components:rating.detailPopup.labels.yourComment')}</span>
                    <textarea
                      name="rating-zen-page__comment"
                      value={pendingComment}
                      onChange={(e) =>
                        patchSession({ pendingComment: e.target.value })
                      }
                      rows={4}
                      placeholder={t('components:rating.detailPopup.placeholders.communityComment')}
                    />
                  </label>
                  {saveError && <p className="rating-zen-page__error">{saveError}</p>}
                </div>
              )}

              {cardPeeked && (
                <div className="rating-zen-page__peers">
                  <div className="rating-zen-page__peers-header">
                    <span>
                      {showCommunityPeers
                        ? t('components:rating.detailPopup.labels.communityRatings')
                        : t('components:rating.detailPopup.labels.adminRatings')}
                    </span>
                    <button
                      type="button"
                      className="rating-zen-page__btn rating-zen-page__btn--ghost"
                      onClick={() => setShowCommunityPeers((v) => !v)}
                    >
                      {showCommunityPeers
                        ? t('components:rating.detailPopup.buttons.viewAdminRatings')
                        : t('components:rating.detailPopup.buttons.viewCommunityRatings')}
                    </button>
                  </div>
                  <div className="rating-zen-page__peers-list">
                    {visiblePeers.length === 0 ? (
                      <p className="rating-zen-page__peers-empty">
                        {t('rating.zen.noPeers')}
                      </p>
                    ) : (
                      visiblePeers.map((detail) => (
                        <RatingItem
                          key={detail.id || detail.userId}
                          ratingDetail={detail}
                          isSuperAdmin={false}
                          weeklyRaterActivity={[]}
                        />
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
              className="rating-zen-page__btn rating-zen-page__btn--primary"
              onClick={() => {
                disposeViewTrackers();
                resetToSetup();
              }}
            >
              {t('rating.zen.done.again')}
            </button>
            <Link to="/rating" className="rating-zen-page__btn rating-zen-page__btn--ghost">
              {t('rating.zen.done.queue')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingZenPage;
