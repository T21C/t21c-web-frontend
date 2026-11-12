import { routes } from '@/api/routes';
// tuf-search: #RatingDetailPopup #ratingDetailPopup #popups #rating #ratingDetail
import "./ratingdetailpopup.css";
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { careerForDetail, compareAccuracyDetails } from '@/utils/ratingAccuracy';
import { PopupShell } from '@/components/common/PopupShell';
import { WebAdofaiViewerButton } from '@/components/popups/Levels';
import { usePopupHistory } from '@/hooks/usePopupHistory';
import { getLocalVideoPreview, getVideoEmbedModifierClass, getVideoIframeReferrerPolicy, getVideoIframeScrolling } from "@/utils/videoLink";
import { RatingItem } from '@/components/cards';
import { RatingInput } from '@/components/common/selectors';
import api from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import { ExternalLinkIcon, DownloadIcon, DraftIcon, EditIcon, CopyIcon } from '@/components/common/icons';
import DiscordVoteNotice from '@/components/popups/Rating/DiscordVoteNotice';
import RatingDiscordThreadButton from '@/components/popups/Rating/RatingDiscordThreadButton';
import { mergeRatingThreadState } from '@/components/discord/ratingThread';
import { isVoteRatingCard } from '@/utils/ratingRequestBand';
import { formatCreatorDisplay, ICON_SIZE, selectIconSize } from "@/utils/Utility";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { hasAnyFlag, hasFlag, permissionFlags } from "@/utils/UserPermissions";
import toast from 'react-hot-toast';
import { RatingFlowActions, RatingFlowMarks } from '@/components/cards/RatingCard/RatingFlowActions';
import autoratercato from "@/assets/icons/autorater-v2.png";
import { Tooltip } from '@/components/common/display/Tooltip';
import { CommentFormatter, LevelMentionField } from '@/components/misc';
import LevelRequestScoreTargets from '@/components/requests/LevelRequestScoreTargets';
import { RatingHeaderMeta } from './RatingHeaderMeta';
import { CurationRatingPicks } from './CurationRatingPicks';
import {
  getCurationTypesResolved,
  sortCurationsForDisplay,
  sortCurationTypesForDisplay,
} from '@/utils/curationTypeUtils';
import { useViewDurationTracker } from '@/utils/viewDurationTracker';
import {
  getRatingDraft,
  setRatingDraft,
  clearRatingDraft,
} from '@/utils/ratingDrafts';


async function updateRating(id, rating, comment, isCommunityRating = false, viewDurationSeconds = 0) {
  try {
    const response = await api.put(`${routes.admin.rating()}/${id}`, {
      rating,
      comment,
      isCommunityRating,
      viewDurationSeconds,
    });

    if (!response.data.rating) {
      throw new Error(response.error || 'Failed to update rating');
    }

    return response.data;
  } catch (error) {
    console.error('Error updating rating:', error);
    throw error;
  }
}

function picksFromDetail(detail) {
  return {
    chartTypeId: detail?.chartTypeId ?? null,
    vfxTypeId: detail?.vfxTypeId ?? null,
    miscTypeIds: Array.isArray(detail?.miscTypeIds) ? detail.miscTypeIds.map(Number) : [],
  };
}

function picksEqual(a, b) {
  if (a.chartTypeId !== b.chartTypeId || a.vfxTypeId !== b.vfxTypeId) return false;
  if (a.miscTypeIds.length !== b.miscTypeIds.length) return false;
  const other = new Set(b.miscTypeIds);
  return a.miscTypeIds.every((id) => other.has(id));
}

function picksEmpty(picks) {
  return picks.chartTypeId == null && picks.vfxTypeId == null && picks.miscTypeIds.length === 0;
}

export const RatingDetailPopup = ({ 
  selectedRating, 
  setSelectedRating = () => {},
  setRatings = () => {}, 
  user = null, 
  isSuperAdmin = false,
  showingConfirmed=false,
  weeklyRaterActivity = [],
  ratingAccuracyStats: ratingAccuracyStatsProp,
  onEditLevel = null,
  mode = 'difficulty',
}) => {
  const currentUser = user;
  const { t } = useTranslation(['components', 'common']);
  const isCurationMode = mode === 'curation';
  const isRatingLocked = Boolean(showingConfirmed || selectedRating?.confirmedAt);

  const { difficulties, difficultyDict, curationTypesDict } = useDifficultyContext();
  const videoLink = selectedRating?.displayVideoLink || selectedRating?.level?.videoLink;
  const videoData = useMemo(() => (videoLink ? getLocalVideoPreview(videoLink) : null), [videoLink]);
  const currentCurationTypes = useMemo(() => {
    const level = selectedRating?.level;
    if (!isCurationMode || !level) return [];
    const raw = level.curations?.length
      ? level.curations
      : level.curation
        ? [level.curation]
        : [];
    const seen = new Set();
    const types = [];
    for (const curation of sortCurationsForDisplay(raw, curationTypesDict)) {
      for (const type of getCurationTypesResolved(curation, curationTypesDict)) {
        if (type?.id == null || seen.has(type.id)) continue;
        seen.add(type.id);
        types.push(curationTypesDict[type.id] || type);
      }
    }
    return sortCurationTypesForDisplay(types, curationTypesDict);
  }, [isCurationMode, selectedRating?.level, curationTypesDict]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingRating, setPendingRating] = useState("");
  const [pendingComment, setPendingComment] = useState("");
  const [initialRating, setInitialRating] = useState("");
  const [initialComment, setInitialComment] = useState("");
  const emptyPicks = { chartTypeId: null, vfxTypeId: null, miscTypeIds: [] };
  const [pendingPicks, setPendingPicks] = useState(emptyPicks);
  const [initialPicks, setInitialPicks] = useState(emptyPicks);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [otherRatings, setOtherRatings] = useState([]);
  const [commentError, setCommentError] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCommentRequired, setIsCommentRequired] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const [showSecondRatings, setShowSecondRatings] = useState(false);
  const [isAutorating, setIsAutorating] = useState(false);
  const [isCommentFieldOpen, setIsCommentFieldOpen] = useState(false);
  const [showUnsavedDraftPrompt, setShowUnsavedDraftPrompt] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [fetchedAccuracyStats, setFetchedAccuracyStats] = useState([]);
  const [linkedRequest, setLinkedRequest] = useState(null);

  const detailsHydratedSeededRef = useRef(false);
  const seededRatingIdRef = useRef(null);
  const hasUnsavedChangesRef = useRef(false);
  const draftViewDurationRef = useRef(0);
  const { snapshotSeconds: snapshotViewDurationSeconds } = useViewDurationTracker(
    selectedRating?.id ?? null
  );

  const resolveViewDurationSeconds = useCallback(() => {
    return Math.max(
      draftViewDurationRef.current,
      snapshotViewDurationSeconds()
    );
  }, [snapshotViewDurationSeconds]);

  const initiateClose = useCallback(() => {
    setShowUnsavedDraftPrompt(false);
    setIsExiting(true);
    // Wait for exit animation to complete
    setTimeout(() => {
      setSelectedRating(null);
      setPendingRating("");
      setPendingComment("");
      setInitialRating("");
      setInitialComment("");
      setPendingPicks({ chartTypeId: null, vfxTypeId: null, miscTypeIds: [] });
      setInitialPicks({ chartTypeId: null, vfxTypeId: null, miscTypeIds: [] });
      setHasUnsavedChanges(false);
      setSaveError(null);
      setCommentError(false);
      setOtherRatings([]);
      setIsExiting(false);
      seededRatingIdRef.current = null;
      detailsHydratedSeededRef.current = false;
      draftViewDurationRef.current = 0;
      setHasSavedDraft(false);
    }, 200); // Match the exit animation duration
  }, [setSelectedRating]);

  const handleClose = useCallback(() => {
    if (isAnimating) return; // Prevent closing during entry animation

    if (hasUnsavedChanges) {
      if (isCurationMode || showingConfirmed || selectedRating?.confirmedAt) {
        if (window.confirm(t('rating.detailPopup.errors.unsavedChanges'))) {
          initiateClose();
        }
        return;
      }
      setShowUnsavedDraftPrompt(true);
      return;
    }
    initiateClose();
  }, [isAnimating, hasUnsavedChanges, showingConfirmed, selectedRating?.confirmedAt, t, initiateClose, isCurationMode]);

  const handleCancelDraftPrompt = useCallback(() => {
    setShowUnsavedDraftPrompt(false);
  }, []);

  const handleSaveDraftAndClose = useCallback(() => {
    if (!showingConfirmed && !selectedRating?.confirmedAt && currentUser?.id && selectedRating?.id) {
      setRatingDraft(currentUser.id, selectedRating.id, {
        rating: pendingRating,
        comment: pendingComment,
        viewDurationSeconds: resolveViewDurationSeconds(),
      });
    }
    initiateClose();
  }, [
    showingConfirmed,
    selectedRating?.confirmedAt,
    currentUser?.id,
    selectedRating?.id,
    pendingRating,
    pendingComment,
    resolveViewDurationSeconds,
    initiateClose,
  ]);

  const handleDiscardDraftAndClose = useCallback(() => {
    if (!showingConfirmed && !selectedRating?.confirmedAt && currentUser?.id && selectedRating?.id) {
      clearRatingDraft(currentUser.id, selectedRating.id);
    }
    draftViewDurationRef.current = 0;
    initiateClose();
  }, [showingConfirmed, selectedRating?.confirmedAt, currentUser?.id, selectedRating?.id, initiateClose]);

  // One history entry per open cycle; cleaned up on Back or programmatic close.
  // Must not re-push when `selectedRating` object identity changes (SSE / parent re-renders).
  usePopupHistory(Boolean(selectedRating), handleClose);

  useEffect(() => {
    if (!selectedRating) return undefined;
    setIsExiting(false);
    setShowUnsavedDraftPrompt(false);
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedRating?.id]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!selectedRating?.id) return;

    const details = Array.isArray(selectedRating.details) ? selectedRating.details : [];
    const userDetail = details.find((detail) => detail.userId === currentUser?.id);
    const rating = userDetail?.rating || "";
    const comment = userDetail?.comment || "";
    const nextPicks = picksFromDetail(userDetail);
    // Complete payloads include `comment` and/or nested `user`; list rows are slim.
    const detailsAreFull = details.some(
      (d) => d && (d.user != null || Object.prototype.hasOwnProperty.call(d, 'comment'))
    );
    const isNewOpen = seededRatingIdRef.current !== selectedRating.id;

    if (isNewOpen) {
      seededRatingIdRef.current = selectedRating.id;
      detailsHydratedSeededRef.current = detailsAreFull;
      draftViewDurationRef.current = 0;

      let nextRating = rating;
      let nextComment = comment;
      let restoredDraft = false;
      if (!isCurationMode && !showingConfirmed && !selectedRating?.confirmedAt && currentUser?.id) {
        const draft = getRatingDraft(currentUser.id, selectedRating.id);
        if (
          draft &&
          (draft.rating !== rating || draft.comment !== comment)
        ) {
          nextRating = draft.rating;
          nextComment = draft.comment;
          draftViewDurationRef.current = draft.viewDurationSeconds;
          restoredDraft = true;
        }
      }
      setHasSavedDraft(restoredDraft);

      setPendingRating(nextRating);
      setPendingComment(nextComment);
      setInitialRating(rating);
      setInitialComment(comment);
      setPendingPicks(nextPicks);
      setInitialPicks(nextPicks);
      if (!isCurationMode) validateRating(nextRating);
    } else if (detailsAreFull && !detailsHydratedSeededRef.current) {
      detailsHydratedSeededRef.current = true;
      if (!hasUnsavedChangesRef.current) {
        setPendingRating(rating);
        setPendingComment(comment);
        setPendingPicks(nextPicks);
        if (!isCurationMode) validateRating(rating);
      }
      setInitialRating(rating);
      setInitialComment(comment);
      setInitialPicks(nextPicks);
    } else {
      setInitialRating(rating);
      setInitialComment(comment);
      setInitialPicks(nextPicks);
      if (!isCurationMode) validateRating(rating);
    }

    setOtherRatings(details);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per open/hydrate; avoid pending loops
  }, [selectedRating, currentUser?.id, selectedRating?.details, showingConfirmed]);

  useEffect(() => {
    if (isCurationMode) {
      const picksChanged = !picksEqual(pendingPicks, initialPicks);
      const commentChanged = pendingComment !== initialComment;
      setHasUnsavedChanges(picksChanged || commentChanged);
      return;
    }
    const hasValidChanges = Boolean(
      (initialRating !== "" && pendingRating === "")
      ||
      (
        pendingRating !== "" && pendingComment !== ""
        &&
        (
          initialRating !== pendingRating
          ||
          initialComment !== pendingComment
        )
      )
    );
    
    setHasUnsavedChanges(hasValidChanges);
  }, [pendingRating, pendingComment, initialRating, initialComment, pendingPicks, initialPicks, isCurationMode]);

  useEffect(() => {
    if (isCurationMode) return undefined;
    if (Array.isArray(ratingAccuracyStatsProp)) return undefined;
    let cancelled = false;
    api.get(routes.admin.statisticsRatingAccuracy())
      .then(({ data }) => {
        if (!cancelled) setFetchedAccuracyStats(data?.stats || []);
      })
      .catch((error) => {
        console.error('Error fetching rating accuracy:', error);
        if (!cancelled) setFetchedAccuracyStats([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ratingAccuracyStatsProp, selectedRating?.id, isCurationMode]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Check for Ctrl+Enter
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (
          !isRatingLocked
          && !isSaving
          && (
            isCurationMode
              ? hasUnsavedChanges
              : ((hasUnsavedChanges && (!isCommentRequired || pendingComment.trim())) || (!pendingRating && initialRating))
          )
        ) {
          handleSaveChanges();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [hasUnsavedChanges, isSaving, pendingRating, pendingComment, isCommentRequired, initialRating, isRatingLocked, isCurationMode]);


  const runAutorate = async (ratingId) => {
    if (isAutorating || isRatingLocked) return;
    setIsAutorating(true);
    try {
      await api.post(routes.external.autorate(ratingId));
      toast.success(t('rating.detailPopup.messages.autorateSuccess'));
      const { data } = await api.get(routes.admin.ratingById(ratingId), {
        params: { completeObject: true },
      });
      if (data) {
        setSelectedRating(data);
        setRatings((prev) =>
          Array.isArray(prev)
            ? prev.map((r) =>
                r.id === data.id
                  ? {
                      ...r,
                      averageDifficultyId: data.averageDifficultyId,
                      communityDifficultyId: data.communityDifficultyId,
                      cardBand: data.cardBand ?? null,
                      flow: data.flow,
                      rankState: data.rankState,
                      settleActor: data.settleActor,
                      suggestedDiffName: data.suggestedDiffName,
                      showRankable: data.showRankable,
                      showRatingOff: data.showRatingOff,
                      autoRankDisabled: data.autoRankDisabled,
                      indicators: data.indicators,
                      autoRankBlock: data.autoRankBlock ?? null,
                      autoraterCombined: data.autoraterCombined ?? null,
                      details: (data.details || []).map((d) => ({
                        id: d.id,
                        userId: d.userId,
                        rating: d.rating,
                        isCommunityRating: d.isCommunityRating,
                      })),
                    }
                  : r
              )
            : prev
        );
      }
    } catch (error) {
      console.error('Error autorating rating:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || error.message || error.error || t('rating.detailPopup.errors.autorateFailed'));
    } finally {
      setIsAutorating(false);
    }
  };


  const validateRating = (rating) => {
      setIsCommentRequired(true);
      return true;
    /*
    if (!rating) {
      setIsCommentRequired(false);
      return true;
    }

    // Handle bare -2 case first
    if (rating.trim() === '-2') {
      setIsCommentRequired(true);
      return true;
    }

    // Find the first separator and split only once
    const match = rating.match(/^([^-~\s]+)([-~\s])(.+)$/);
    if (!match) {
      setIsCommentRequired(false);
      return true;
    }

    const [_, firstPart, separator, secondPart] = match;
    const parts = [firstPart, secondPart];
    
    // Check if any part is exactly "-2"
    const containsMinusTwo = parts.some(part => {
      // Exclude cases like -21 or other negative numbers
      if (part.startsWith('-') && part !== '-2') {
        return false;
      }
      const isMinusTwo = part === '-2';
      return isMinusTwo;
    });

    setIsCommentRequired(containsMinusTwo);
    return true;
    */
  };

  const ratingAccuracyStats = Array.isArray(ratingAccuracyStatsProp)
    ? ratingAccuracyStatsProp
    : fetchedAccuracyStats;

  // Split ratings into admin and community, highest shrunk PGU accuracy first
  const adminRatings = otherRatings
    .filter(r => !r.isCommunityRating)
    .sort((a, b) => compareAccuracyDetails(a, b, ratingAccuracyStats));
  const communityRatings = otherRatings
    .filter(r => r.isCommunityRating)
    .sort((a, b) => compareAccuracyDetails(a, b, ratingAccuracyStats));

  const isAdminRater = () => {
    return user && (hasAnyFlag(user, [permissionFlags.SUPER_ADMIN, permissionFlags.RATER]));
  };

  const applyCurationSavePayload = (updatePayload) => {
    const updatedRating = updatePayload.complete || updatePayload.listRow || updatePayload.rating;
    const listRow = updatePayload.listRow;
    setRatings((prevRatings) => {
      if (!Array.isArray(prevRatings)) return prevRatings;
      return prevRatings.map((rating) => {
        if (rating.id !== (listRow?.id || updatedRating?.id)) return rating;
        if (listRow) return { ...rating, ...listRow };
        return { ...rating, ...updatedRating };
      });
    });
    if (updatedRating) {
      setSelectedRating((prev) => ({ ...prev, ...updatedRating, details: updatedRating.details }));
      setOtherRatings(updatedRating.details || []);
    }
    setInitialPicks(pendingPicks);
    setInitialComment(pendingComment);
    setHasUnsavedChanges(false);
    detailsHydratedSeededRef.current = true;
  };

  const handleSaveChanges = async () => {
    if (!selectedRating || isRatingLocked) return;
    if (!isCurationMode && !hasUnsavedChanges) return;
    if (isCurationMode && !hasUnsavedChanges) return;
  
    setIsSaving(true);
    setSaveError(null);
    setCommentError(false);

    try {
      if (pendingComment.length > 10000) {
        setCommentError(true);
        setSaveError(t('rating.detailPopup.errors.commentLength'));
        setIsSaving(false);
        return;
      }

      if (isCurationMode) {
        const response = await api.put(routes.admin.curationRatingById(selectedRating.id), {
          chartTypeId: pendingPicks.chartTypeId,
          vfxTypeId: pendingPicks.vfxTypeId,
          miscTypeIds: pendingPicks.miscTypeIds,
          comment: pendingComment,
        });
        applyCurationSavePayload(response.data || {});
        toast.success(t('rating.detailPopup.curation.saved'));
        return;
      }

      if (isCommentRequired && !pendingComment.trim()) {
        setCommentError(true);
        setSaveError(t('rating.detailPopup.errors.commentRequired'));
        setIsSaving(false);
        return;
      }

      const isCommunityRating = !isAdminRater();
      const viewDurationSeconds = resolveViewDurationSeconds();
      const updatePayload = await updateRating(
        selectedRating.id,
        pendingRating,
        pendingComment,
        isCommunityRating,
        viewDurationSeconds
      );
      const updatedRating = updatePayload.complete || updatePayload.rating;
      const listRow = updatePayload.listRow;

      // If rating is empty or whitespace, also clear the comment
      if (!pendingRating || pendingRating.trim() === '') {
        setPendingComment('');
      }

      setRatings(prevRatings => {
        if (!Array.isArray(prevRatings)) return prevRatings;
        return prevRatings.map(rating => {
        if (rating.id !== (listRow?.id || updatedRating?.id)) return rating;
        if (listRow) return { ...rating, ...listRow };
        return {
          ...rating,
          averageDifficultyId: updatedRating.averageDifficultyId,
          communityDifficultyId: updatedRating.communityDifficultyId,
          details: (updatedRating.details || []).map((d) => ({
            id: d.id,
            userId: d.userId,
            rating: d.rating,
            isCommunityRating: d.isCommunityRating,
          })),
        };
      });
      });

      setSelectedRating(prev => ({
        ...prev,
        ...updatedRating,
        details: updatedRating.details,
        averageDifficulty: updatedRating.averageDifficulty,
        communityDifficulty: updatedRating.communityDifficulty
      }));
      
      setOtherRatings(updatedRating.details || []);
      setInitialRating(pendingRating);
      setInitialComment(!pendingRating || pendingRating.trim() === '' ? '' : pendingComment);
      setHasUnsavedChanges(false);
      detailsHydratedSeededRef.current = true;
      draftViewDurationRef.current = 0;
      setHasSavedDraft(false);
      if (!showingConfirmed && currentUser?.id) {
        clearRatingDraft(currentUser.id, selectedRating.id);
      }
    } catch (error) {
      console.error('[RatingDetailPopup] Save failed:', error);
      setSaveError(error.response?.data?.error || error.response?.data?.message || error.message || error.error || t('rating.detailPopup.errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettleCuration = async () => {
    if (!selectedRating || isRatingLocked) return;
    if (picksEmpty(pendingPicks)) {
      toast.error(t('rating.detailPopup.curation.settleRequired'));
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      await api.post(routes.admin.curationRatingSettle(selectedRating.id), {
        chartTypeId: pendingPicks.chartTypeId,
        vfxTypeId: pendingPicks.vfxTypeId,
        miscTypeIds: pendingPicks.miscTypeIds,
        comment: pendingComment,
      });
      toast.success(t('rating.detailPopup.curation.settled'));
      setRatings((prev) => (Array.isArray(prev) ? prev.filter((row) => row.id !== selectedRating.id) : prev));
      initiateClose();
    } catch (error) {
      console.error('[RatingDetailPopup] Settle failed:', error);
      setSaveError(error.response?.data?.error || error.response?.data?.message || error.message || t('rating.detailPopup.curation.settleFailed'));
      toast.error(error.response?.data?.error || t('rating.detailPopup.curation.settleFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleVideoLoad = () => {
    const iframe = document.querySelector('.video-iframe');
    if (iframe) {
      iframe.classList.add('loaded');
    }
  };

  const handleDeleteRating = async (userId) => {
    if (isRatingLocked) return;
    try {
      const deleteUrl = isCurationMode
        ? routes.admin.curationRatingDetail(selectedRating.id, userId)
        : `${routes.admin.rating()}/${selectedRating.id}/detail/${userId}`;
      const response = await api.delete(deleteUrl);
      
      if (response.status === 200) {
        const listRow = response.data?.listRow;
        const complete = response.data?.complete || response.data?.rating;
        const updatedDetails = (complete?.details || otherRatings).filter(detail => detail.userId !== userId);
        setOtherRatings(updatedDetails);
        
        setRatings(prevRatings => {
          if (!Array.isArray(prevRatings)) return prevRatings;
          return prevRatings.map(rating => {
          if (rating.id !== selectedRating.id) return rating;
          if (listRow) return { ...rating, ...listRow };
          return {
            ...rating,
            details: (rating.details || []).filter(detail => detail.userId !== userId)
          };
        });
        });

        if (complete) {
          setSelectedRating((prev) => ({ ...prev, ...complete, details: complete.details }));
        }
      }
    } catch (error) {
      console.error('Error deleting rating:', error);
      alert(t('rating.detailPopup.errors.deleteFailed'));
    }
  };

  const navigateToLevel = () => {
    window.open(`/levels/${selectedRating.level.id}`, '_blank');
  }

  const renderRatingsContent = (ratings, type) => (
    <div className={`other-ratings-section ${ratings.length === 0 ? 'empty' : ''}`}>
      {ratings.length > 0 ? (
        <div className="other-ratings-content">
          {ratings.map((ratingDetail) => (
            <RatingItem
              key={ratingDetail.id || ratingDetail.userId || ratingDetail.user?.id}
              ratingDetail={ratingDetail}
              levelId={selectedRating?.level?.id || selectedRating?.levelId}
              isSuperAdmin={isSuperAdmin}
              onDelete={handleDeleteRating}
              weeklyRaterActivity={isCurationMode ? [] : weeklyRaterActivity}
              career={isCurationMode ? null : careerForDetail(ratingDetail, ratingAccuracyStats)}
              showingConfirmed={isRatingLocked}
              mode={mode}
            />
          ))}
        </div>
      ) : (
        <div className="no-ratings-message">
          {isCurationMode
            ? t('rating.detailPopup.curation.noPicks')
            : (type === 'admin' ? t('rating.detailPopup.labels.noAdminRatings') : t('rating.detailPopup.labels.noCommunityRatings'))}
        </div>
      )}
    </div>
  );

  const getSaveButtonText = () => {
    if (isSaving) return t('buttons.saving', { ns: 'common' });
    if (isCurationMode) {
      if (picksEmpty(pendingPicks) && !picksEmpty(initialPicks)) {
        return t('rating.detailPopup.buttons.removeRating');
      }
      return t('rating.detailPopup.buttons.saveChanges');
    }
    if (!pendingRating && initialRating) return t('rating.detailPopup.buttons.removeRating');
    return t('rating.detailPopup.buttons.saveChanges');
  };

  const getSaveButtonClass = () => {
    const baseClass = 'save-rating-changes-btn';
    if (isSaving) return `${baseClass} saving`;
    if (isCurationMode) {
      if (picksEmpty(pendingPicks) && !picksEmpty(initialPicks)) return `${baseClass} remove`;
      return baseClass;
    }
    if (!pendingRating && initialRating) return `${baseClass} remove`;
    return baseClass;
  };

  const isVoteCard = !isCurationMode && isVoteRatingCard(selectedRating, linkedRequest);
  const showDiscordSettlement = isVoteCard;
  const canSaveCuration = hasAnyFlag(currentUser, [
    permissionFlags.RATER,
    permissionFlags.CURATOR,
    permissionFlags.HEAD_CURATOR,
    permissionFlags.SUPER_ADMIN,
  ]);
  const canSettleCuration = hasAnyFlag(currentUser, [
    permissionFlags.CURATOR,
    permissionFlags.HEAD_CURATOR,
    permissionFlags.SUPER_ADMIN,
  ]);
  const applyPostedRating = (next) => {
    if (!next) return;
    setSelectedRating((current) => mergeRatingThreadState(current, next));
    setRatings((prev) => (
      Array.isArray(prev)
        ? prev.map((row) => (row.id === next.id ? mergeRatingThreadState(row, next) : row))
        : prev
    ));
  };

  useEffect(() => {
    const ratingId = selectedRating?.id;
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
  }, [selectedRating?.id, isCurationMode]);

  if (!selectedRating) return null;

  const copyNotes = async (event) => {
    event.stopPropagation();
    const text = selectedRating.level?.notes || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('rating.detailPopup.messages.notesCopied'));
    } catch {
      toast.error(t('rating.detailPopup.errors.notesCopyFailed'));
    }
  };

  const showEditLevel = typeof onEditLevel === 'function' && selectedRating.level?.id != null;
  return (
    <>
    <PopupShell
      onClose={handleClose}
      closeDisabled={isAnimating}
      overlayClassName={`rating-popup-overlay${isExiting ? ' exiting' : ''}`}
      panelClassName={`rating-popup${isExiting ? ' exiting' : ''}${showEditLevel ? ' rating-popup--can-edit' : ''}`}
      overlayChildren={
        selectedRating.level?.id && selectedRating.level?.fileId ? (
          <WebAdofaiViewerButton levelId={selectedRating.level.id} portaled={false} />
        ) : null
      }
    >
        <div className="rating-popup-header-actions">
          {showEditLevel && (
            <button
              type="button"
              className="rating-popup-edit"
              onClick={() => onEditLevel(selectedRating.level.id)}
              disabled={isAnimating}
              aria-label={t('rating.ratingCard.buttons.editLevel')}
              title={t('rating.ratingCard.buttons.editLevel')}
            >
              <EditIcon color="currentColor" size="20px" />
            </button>
          )}
          <CloseButton
            className="rating-popup-close"
            variant="floating"
            onClick={handleClose}
            aria-label={t('rating.detailPopup.closeButton')}
          />
        </div>
        <div className="popup-content">
          <div className="popup-header">
            <div className="top-header-content">
              <h2 onClick={navigateToLevel}>{selectedRating.level.song} <ExternalLinkIcon /></h2>
              {selectedRating.level.dlLink && (
              <a 
                href={selectedRating.level.dlLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="download-link"
                style={{ minWidth: '24px' }}
              >
                <DownloadIcon color="#ffffff" size={"24px"} strokeWidth={"2.5"} />
              </a>
            )}
            </div>
            <RatingHeaderMeta level={selectedRating.level} />

            <p className="artist">{selectedRating.level.artist}</p>
            <span className="creator">{formatCreatorDisplay(selectedRating.level)}</span>
            <div className="level-id-cleared-count-container">
            <span className="level-id">#{selectedRating.level.id}</span>
            <span className={`cleared-count${Number(selectedRating.level.clears) > 0 ? ' has-clears' : ''}`}>
              {t('rating.detailPopup.labels.clearedCount', { count: selectedRating.level.clears || 0 })}
            </span>
            </div>
          </div>
          {(isCurationMode ? selectedRating.level.curationRerateReason : selectedRating.level.rerateReason) && (
            <div
            onClick={() => setIsCommentFieldOpen(!isCommentFieldOpen)} 
            className={`detail-field comment-field ${isCommentFieldOpen ? 'open' : ''}`}
            >
              <span className="detail-label">{t('rating.detailPopup.labels.rerateReason')}</span>
              <div className="detail-value">
                <CommentFormatter>
                  {isCurationMode ? selectedRating.level.curationRerateReason : selectedRating.level.rerateReason}
                </CommentFormatter>
              </div>
            </div>
          )}
          {!isCurationMode && (
          <div className="rating-popup__score-targets">
            <LevelRequestScoreTargets
              payload={linkedRequest?.payload}
              level={selectedRating.level}
            />
          </div>
          )}
          {!isCurationMode && (
          <div className="rating-popup__thread-actions">
            <RatingFlowActions
              only="block"
              rating={selectedRating}
              user={currentUser}
              onChange={(complete) => setSelectedRating(complete)}
            />
            <RatingDiscordThreadButton
              rating={selectedRating}
              allowed={isSuperAdmin}
              onUpdated={applyPostedRating}
            />
          </div>
          )}
          {selectedRating.level.notes && (
            <div className="detail-field comment-field notes-field open">
              <div className="notes-field__header">
                <span className="detail-label">{t('rating.detailPopup.labels.notes')}</span>
                <button
                  type="button"
                  className="notes-field__copy"
                  onClick={copyNotes}
                  aria-label={t('rating.detailPopup.buttons.copyNotes')}
                  data-tooltip-id="notes-copy-tooltip"
                  data-tooltip-content={t('rating.detailPopup.buttons.copyNotes')}
                >
                  <CopyIcon size={16} color="currentColor" />
                </button>
                <Tooltip id="notes-copy-tooltip" place="left" noArrow />
              </div>
              <div className="detail-value">
                <CommentFormatter>{selectedRating.level.notes}</CommentFormatter>
              </div>
            </div>
          )}
          <div className="popup-main-content-container">
            <div className="popup-main-content">
              <div className="video-container">
                <div className={`video-aspect-ratio ${getVideoEmbedModifierClass(videoLink)}`.trim()}>
                  {videoData ? (
                    <iframe 
                      src={videoData.embed}
                      title="Video"
                      className="video-iframe"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      referrerPolicy={getVideoIframeReferrerPolicy(videoLink)}
                      scrolling={getVideoIframeScrolling(videoLink)}
                      allowFullScreen
                      onLoad={handleVideoLoad}
                    />
                  ) : (
                    <div className="video-placeholder">
                      No video available
                    </div>
                  )}
                  
                  <button 
                      className={`toggle-details-btn ${isDetailsCollapsed ? 'collapsed' : ''}`}
                      onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
                      aria-label={isDetailsCollapsed ? 'Show details' : 'Hide details'}
                    >
                    <span>{isDetailsCollapsed ? 'Show' : 'Hide'} Details</span>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className={`details-container ${isDetailsCollapsed ? 'collapsed' : ''}`}>
                <div className="detail-field rerate-field">
                  <span className="detail-label">{t('rating.detailPopup.labels.rerateNum')}</span>
                  <span className="detail-value">
                    {isCurationMode
                      ? (selectedRating.level.curationRerateNum || '')
                      : (showingConfirmed ? selectedRating.requesterFR : (selectedRating.level.rerateNum || selectedRating.requesterFR))}
                  </span>
                </div>
                {isCurationMode && (
                <div className="detail-field">
                  <span className="detail-label">{t('rating.detailPopup.curation.currentTypes')}</span>
                  <span className="detail-value curation-current-types">
                    {currentCurationTypes.length > 0 ? currentCurationTypes.map((type) => (
                      type.icon ? (
                        <img
                          key={type.id}
                          src={selectIconSize(type.icon, ICON_SIZE.MEDIUM)}
                          alt={type.name || ''}
                          title={type.name}
                          className="detail-value lv-icon"
                        />
                      ) : (
                        <span key={type.id} className="curation-current-types__name">{type.name}</span>
                      )
                    )) : t('rating.detailPopup.curation.noCurrentTypes')}
                  </span>
                </div>
                )}
                {!isCurationMode && (
                  <>
                <div className="detail-field">
                  <span className="detail-label">{t('rating.detailPopup.labels.currentDifficulty')}</span>
                  <img src={selectIconSize(difficultyDict[selectedRating.level.diffId]?.icon, ICON_SIZE.MEDIUM)} alt="" className="detail-value lv-icon" />
                </div>
                <div className="detail-field" style={{visibility: selectedRating.averageDifficultyId ? 'visible' : 'hidden'}}>
                  <span className="detail-label">{t('rating.detailPopup.labels.averageRating')}</span>
                  <img src={selectIconSize(difficultyDict[selectedRating.averageDifficultyId]?.icon, ICON_SIZE.MEDIUM)} alt="" className="detail-value lv-icon" />
                </div>
                <div className="detail-field" style={{visibility: selectedRating.communityDifficultyId ? 'visible' : 'hidden'}}>
                  <span className="detail-label">{t('rating.detailPopup.labels.communityRating')}</span>
                  <img src={selectIconSize(difficultyDict[selectedRating.communityDifficultyId]?.icon, ICON_SIZE.MEDIUM)} alt="" className="detail-value lv-icon" />
                </div>
                  </>
                )}

              </div>
            </div>

            <div className="rating-section">
              <div className="rating-columns">
                {showDiscordSettlement ? (
                  <DiscordVoteNotice threadUrl={linkedRequest?.discordMessageUrl || selectedRating?.discordMessageUrl} />
                ) : hasFlag(user, permissionFlags.RATING_BANNED) ? (
                  <div className="rating-banned-message">
                    {t('rating.detailPopup.messages.ratingBanned')}
                  </div>
                ) : user && (!isCurationMode || canSaveCuration) ? (
                  <div className="rating-field-group">
                    {isCurationMode ? (
                      <CurationRatingPicks
                        chartTypeId={pendingPicks.chartTypeId}
                        vfxTypeId={pendingPicks.vfxTypeId}
                        miscTypeIds={pendingPicks.miscTypeIds}
                        disabled={isRatingLocked}
                        onChartChange={(value) => setPendingPicks((prev) => ({ ...prev, chartTypeId: value }))}
                        onVfxChange={(value) => setPendingPicks((prev) => ({ ...prev, vfxTypeId: value }))}
                        onMiscToggle={(typeId) => {
                          const id = Number(typeId);
                          setPendingPicks((prev) => {
                            const has = prev.miscTypeIds.includes(id);
                            return {
                              ...prev,
                              miscTypeIds: has
                                ? prev.miscTypeIds.filter((item) => item !== id)
                                : [...prev.miscTypeIds, id],
                            };
                          });
                        }}
                      />
                    ) : (
                    <div className="rating-field">
                      <label>
                        {t('rating.detailPopup.labels.yourRating')}
                        {hasSavedDraft && (
                          <DraftIcon
                            className="rating-draft-icon"
                            size={16}
                            color="var(--warning-color)"
                            title={t('rating.detailPopup.labels.savedDraft')}
                          />
                        )}
                      </label>
                      <div className="rating-input-container">
                        <RatingInput
                          value={pendingRating}
                          onChange={(value) => {
                            setPendingRating(value);
                            validateRating(value);
                          }}
                          showDiff={false}
                          difficulties={difficulties}
                          allowCustomInput={true}
                          disabled={isRatingLocked}
                        />
                        {(pendingRating && difficulties.find(d => d.name === pendingRating)) && 
                          <img src={selectIconSize(difficulties.find(d => d.name === pendingRating)?.icon, ICON_SIZE.MEDIUM)} alt="" className="detail-value lv-icon" />}
                      </div>
                    </div>
                    )}
                    <div className="rating-field">
                      <label>
                        {t('rating.detailPopup.labels.yourComment')}
                        {!isCurationMode && isCommentRequired && <span className="required-mark" data-tooltip-id="required-tooltip" />}
                        {hasSavedDraft && (
                          <DraftIcon
                            className="rating-draft-icon"
                            size={16}
                            color="var(--warning-color)"
                            title={t('rating.detailPopup.labels.savedDraft')}
                          />
                        )}
                      </label>
                      <LevelMentionField
                        value={pendingComment}
                        onChange={(e) => setPendingComment(e.target.value)}
                        disabled={isRatingLocked}
                        style={{
                          borderColor: commentError ? 'red' : '',
                          backgroundColor: isCommentRequired && commentError ? 'rgba(255, 0, 0, 0.05)' : ''
                        }}
                        placeholder={t(isCurationMode ? 'rating.detailPopup.curation.commentPlaceholder' : 'rating.detailPopup.placeholders.communityComment')}
                      />
                    </div>
                    {!isRatingLocked && (
                    <>
                    {!isCurationMode && <RatingFlowMarks rating={selectedRating} />}
                    {!isCurationMode && (
                    <RatingFlowActions
                      rating={selectedRating}
                      user={currentUser}
                      onChange={(complete) => setSelectedRating(complete)}
                    />
                    )}
                    <div className="save-button-container">
                      <button 
                        className={getSaveButtonClass()}
                        disabled={
                          isCurationMode
                            ? !hasUnsavedChanges || isSaving
                            : (
                          (
                            !hasUnsavedChanges 
                            || 
                            isSaving 
                            || 
                            (
                              isCommentRequired 
                              && 
                              !pendingComment.trim()
                            )
                          )
                          ^
                          (!pendingRating && initialRating)
                        )
                        }
                        onClick={handleSaveChanges}
                      >
                        {getSaveButtonText()}
                      </button>
                      {isCurationMode && canSettleCuration && (
                        <button
                          type="button"
                          className="save-rating-changes-btn curation-rating-settle-btn"
                          disabled={isSaving || picksEmpty(pendingPicks)}
                          onClick={handleSettleCuration}
                        >
                          {t('rating.detailPopup.curation.settle')}
                        </button>
                      )}
                    </div>
                    </>
                    )}
                    {saveError && (
                      <div className="save-error-message">
                        {saveError}
                      </div>
                    )}
                  </div>
                ) : null}

                {!showDiscordSettlement && <div className="rating-field other-ratings">
                  <div className="other-ratings-header">
                    <label className="rating-field-label">
                      {isCurationMode
                        ? t('rating.detailPopup.curation.otherPicks')
                        : (showSecondRatings ? t('rating.detailPopup.labels.communityRatings') : t('rating.detailPopup.labels.adminRatings'))}
                    </label>
                    {!isCurationMode && isAdminRater() && !isRatingLocked && (
                      <button
                        type="button"
                        className={`autorater-icon-btn ${isAutorating ? 'autorater-icon--loading' : ''}`}
                        onClick={() => runAutorate(selectedRating?.id)}
                        disabled={isAutorating}
                        aria-busy={isAutorating}
                        aria-label="Autorate"
                      >
                        <img 
                        src={autoratercato} 
                          alt="Auto Rater Cat V2"
                          className="autorater-icon"
                          data-tooltip-id="autorate-tooltip"
                        />
                      </button>
                    )}
                    {!isCurationMode && (
                    <Tooltip id="autorate-tooltip" place="right" noArrow >
                      Estimate rating
                      <br /> 
                      meow :3
                    </Tooltip>
                    )}
                  
                    {!isCurationMode && (
                    <button 
                      className={`ratings-toggle-btn ${showSecondRatings ? 'show-second' : ''}`}
                      onClick={() => setShowSecondRatings(!showSecondRatings)}
                    >
                      <span>
                        {showSecondRatings ? t('rating.detailPopup.buttons.viewAdminRatings') : t('rating.detailPopup.buttons.viewCommunityRatings')}
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    )}
                  </div>
                  <div className="other-ratings-container">
                    {isCurationMode ? (
                      renderRatingsContent(otherRatings, 'admin')
                    ) : (
                    <div className={`other-ratings-slider ${showSecondRatings ? 'show-second' : ''}`}>
                      {renderRatingsContent(adminRatings, 'admin')}
                      {renderRatingsContent(communityRatings, 'community')}
                    </div>
                    )}
                  </div>
                </div>}
              </div>
            </div>
          </div>
        </div>
    </PopupShell>
    {showUnsavedDraftPrompt && (
      <PopupShell
        onClose={handleCancelDraftPrompt}
        overlayClassName="rating-unsaved-draft-prompt__overlay"
        panelClassName="rating-unsaved-draft-prompt"
        ariaLabelledBy="rating-unsaved-draft-prompt-title"
      >
            <h3 id="rating-unsaved-draft-prompt-title" className="rating-unsaved-draft-prompt__title">
              {t('rating.detailPopup.confirmations.unsavedDraft.title')}
            </h3>
            <p className="rating-unsaved-draft-prompt__body">
              {t('rating.detailPopup.confirmations.unsavedDraft.body')}
            </p>
            <div className="rating-unsaved-draft-prompt__actions">
              <button
                type="button"
                className="btn-fill-primary"
                onClick={handleSaveDraftAndClose}
              >
                {t('rating.detailPopup.confirmations.unsavedDraft.save')}
              </button>
              <button
                type="button"
                className="btn-fill-danger"
                onClick={handleDiscardDraftAndClose}
              >
                {t('rating.detailPopup.confirmations.unsavedDraft.discard')}
              </button>
              <button
                type="button"
                className="btn-fill-neutral-dark"
                onClick={handleCancelDraftPrompt}
              >
                {t('buttons.cancel', { ns: 'common' })}
              </button>
            </div>
      </PopupShell>
    )}
    </>
  );
};
