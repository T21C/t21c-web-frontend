// tuf-search: #RatingZenPage #ratingZen #zen #admin #rating
import { routes } from '@/api/routes';
import './ratingzenpage.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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

const DECK_SIZES = [5, 10, 15, 20, 25, 30];
const DECK_UNIT = 5;
const DEFAULT_DECK_SIZE = 15;
const DEFAULT_RANDOMNESS = 40;

const videoCache = new Map();

async function submitZenRating(id, rating, comment, isCommunityRating) {
  const response = await api.put(`${routes.admin.rating()}/${id}`, {
    rating,
    comment,
    isCommunityRating,
    ratedInZen: true,
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

  useEffect(() => {
    document.documentElement.classList.add('rating-zen-active');
    return () => {
      document.documentElement.classList.remove('rating-zen-active');
    };
  }, []);

  const [phase, setPhase] = useState('setup'); // setup | stage | done
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

  const confirmLeaveSession = useCallback(() => {
    if (!hasUnfinishedSession) return true;
    return window.confirm(
      t('rating.zen.confirmExit')
    );
  }, [hasUnfinishedSession, t]);

  const handleExit = useCallback(() => {
    if (!confirmLeaveSession()) return;
    navigate('/rating');
  }, [confirmLeaveSession, navigate]);

  // Intercept in-app link clicks (navbar, etc.) — BrowserRouter has no useBlocker.
  useEffect(() => {
    if (!hasUnfinishedSession) return undefined;
    const onClickCapture = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!anchor || anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) {
        return;
      }
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      if (!confirmLeaveSession()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [hasUnfinishedSession, confirmLeaveSession]);

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

  const [deckSize, setDeckSize] = useState(DEFAULT_DECK_SIZE);
  const [onlyLowDiff, setOnlyLowDiff] = useState(false);
  const [excludeUniversals, setExcludeUniversals] = useState(false);
  const [sortPreset, setSortPreset] = useState('least'); // least | most | id | recent
  const [randomness, setRandomness] = useState(DEFAULT_RANDOMNESS);
  const [isDealing, setIsDealing] = useState(false);

  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  /** Per-card outcome: null pending | 'rated' | 'peeked' | 'skipped' */
  const [cardOutcomes, setCardOutcomes] = useState([]);
  /** Draft/answer payload per card: { rating, comment, peeked } | null */
  const [cardAnswers, setCardAnswers] = useState([]);
  const [peeksLeft, setPeeksLeft] = useState(0);
  const [peeksAllowed, setPeeksAllowed] = useState(0);
  const [peeksUsed, setPeeksUsed] = useState(0);
  const [cardPeeked, setCardPeeked] = useState(false);
  const [submitted, setSubmitted] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [streak, setStreak] = useState(0);

  const [pendingRating, setPendingRating] = useState('');
  const [pendingComment, setPendingComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [videoData, setVideoData] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [showCommunityPeers, setShowCommunityPeers] = useState(false);

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
    () => deckSizeOptions.find((option) => option.value === deckSize) ?? deckSizeOptions[0],
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
      setCards(dealt);
      setCardOutcomes(dealt.map(() => null));
      setCardAnswers(dealt.map(() => null));
      setIndex(0);
      setPeeksAllowed(data?.peeksAllowed ?? Math.floor(deckSize / DECK_UNIT));
      setPeeksLeft(data?.peeksAllowed ?? Math.floor(deckSize / DECK_UNIT));
      setPeeksUsed(0);
      setCardPeeked(false);
      setSubmitted(0);
      setSkipped(0);
      setStreak(0);
      setPendingRating('');
      setPendingComment('');
      setSaveError(null);
      setPhase(dealt.length === 0 ? 'done' : 'stage');
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
  }, [user, deckSize, onlyLowDiff, excludeUniversals, randomness, sortParams, navigate, t]);

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
    setPendingRating(saved?.rating ?? '');
    setPendingComment(saved?.comment ?? '');
    setCardPeeked(Boolean(saved?.peeked || cardOutcomes[index] === 'peeked'));
    setSaveError(null);
    setShowCommunityPeers(false);
    // Rehydrate only when switching cards; ignore draft edits while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- index/current.id
  }, [index, current?.id]);

  const canGoto = useCallback(
    (target) => Number.isInteger(target) && target >= 0 && target < cards.length,
    [cards.length]
  );

  const handleGoto = useCallback(
    (target) => {
      if (!canGoto(target) || (target === index && phase === 'stage')) return;
      setCardAnswers((prev) => {
        const next = prev.slice();
        next[index] = {
          rating: pendingRating,
          comment: pendingComment,
          peeked: cardPeeked,
        };
        return next;
      });
      if (phase === 'done') setPhase('stage');
      setIndex(target);
    },
    [canGoto, index, phase, pendingRating, pendingComment, cardPeeked]
  );
  const applyOutcomeAndAdvance = useCallback(
    (cardIndex, outcome, answer) => {
      const previous = cardOutcomes[cardIndex];
      const nextOutcomes = cardOutcomes.slice();
      nextOutcomes[cardIndex] = outcome;

      if (!previous) {
        if (outcome === 'skipped') setSkipped((n) => n + 1);
        else setSubmitted((n) => n + 1);
      } else if (previous === 'skipped' && outcome !== 'skipped') {
        setSkipped((n) => Math.max(0, n - 1));
        setSubmitted((n) => n + 1);
      } else if (previous !== 'skipped' && outcome === 'skipped') {
        setSubmitted((n) => Math.max(0, n - 1));
        setSkipped((n) => n + 1);
      }

      setCardOutcomes(nextOutcomes);
      setCardAnswers((prev) => {
        const next = prev.slice();
        next[cardIndex] = answer;
        return next;
      });

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

      if (nextOpen < 0) {
        setPhase('done');
      } else {
        setPhase('stage');
        setIndex(nextOpen);
      }
    },
    [cardOutcomes]
  );

  const handleSkip = () => {
    applyOutcomeAndAdvance(index, 'skipped', {
      rating: '',
      comment: '',
      peeked: cardPeeked,
    });
    setStreak(0);
  };

  const handlePeek = () => {
    if (cardPeeked || peeksLeft <= 0 || !(current?.details || []).length) return;
    const ok = window.confirm(t('rating.zen.confirmPeek'));
    if (!ok) return;
    setCardPeeked(true);
    setPeeksLeft((n) => Math.max(0, n - 1));
    setPeeksUsed((n) => n + 1);
    setCardAnswers((prev) => {
      const next = prev.slice();
      next[index] = {
        rating: pendingRating,
        comment: pendingComment,
        peeked: true,
      };
      return next;
    });
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
    try {
      await submitZenRating(
        current.id,
        pendingRating.trim(),
        pendingComment.trim(),
        !isAdminRater
      );
      applyOutcomeAndAdvance(index, outcome, {
        rating: pendingRating.trim(),
        comment: pendingComment.trim(),
        peeked: cardPeeked,
      });
      setStreak((n) => n + 1);
    } catch (err) {
      setSaveError(
        err.response?.data?.error ||
          err.message ||
          t('rating.zen.errors.submitFailed')
      );
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

          <div className="rating-zen-page__setup-form">
            <div className="rating-zen-page__field">
              <span>{t('rating.zen.setup.deckSize')}</span>
              <CustomSelect
                options={deckSizeOptions}
                value={selectedDeckSizeOption}
                onChange={(option) => setDeckSize(option.value)}
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
                  onChange={(e) => setOnlyLowDiff(e.target.checked)}
                />
                <span>{t('rating.zen.setup.onlyLowDiff')}</span>
              </label>
  
              <label className="rating-zen-page__toggle">
                <input
                  type="checkbox"
                  checked={excludeUniversals}
                  onChange={(e) => setExcludeUniversals(e.target.checked)}
                />
                <span>{t('rating.zen.setup.excludeUniversals')}</span>
              </label>
            </div>

            <div className="rating-zen-page__field">
              <span>{t('rating.zen.setup.sort')}</span>
              <CustomSelect
                options={sortOptions}
                value={selectedSortOption}
                onChange={(option) => setSortPreset(option.value)}
                width="100%"
                menuPlacement="bottom"
                isSearchable={false}
              />
            </div>

            <div className="rating-zen-page__field">
              <div className="rating-zen-page__field-row">
                <span>{t('rating.zen.setup.randomness')}</span>
                <span className="rating-zen-page__field-value">
                  {t('rating.zen.setup.randomnessValue', { n: randomness })}
                </span>
              </div>
              <input
                type="range"
                className="rating-zen-page__range"
                min={0}
                max={100}
                step={1}
                value={randomness}
                onChange={(e) => setRandomness(Number(e.target.value))}
                aria-label={t('rating.zen.setup.randomness')}
              />
              <small>{t('rating.zen.setup.randomnessHint')}</small>
            </div>

            <div className="rating-zen-page__setup-actions">
              <button
                type="button"
                className="rating-zen-page__btn rating-zen-page__btn--primary"
                onClick={() => void startDeal()}
                disabled={isDealing || !user}
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
                  <p className="rating-zen-page__rerate">
                    Rerate: {current.level?.rerateNum || current.requesterFR}
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
                        onChange={setPendingRating}
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
                      onChange={(e) => setPendingComment(e.target.value)}
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
                setPhase('setup');
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
