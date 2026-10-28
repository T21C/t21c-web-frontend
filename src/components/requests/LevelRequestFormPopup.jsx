import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { CustomSelect, RatingInput } from '@/components/common/selectors';
import { GraphIcon, TrashIcon } from '@/components/common/icons';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { LevelSelectionPopup, CDNTosPopup } from '@/components/popups/Levels';
import { AdminLevelXaccCurvePopup } from '@/components/popups/Levels/EditLevelPopup/AdminLevelXaccCurvePopup';
import { uploadLevelZip } from '@/utils/submissions/levelSubmission';
import { prepareArchiveForUpload } from '@/utils/zipUtils';
import { CLIENT_PREF_KEYS, getClientPreference, setClientPreferences } from '@/utils/clientPreferences';
import {
  CREATOR_EDITABLE_KINDS,
  INFO_KINDS,
  assignableTagIds,
  buildInfoDraft,
  creditSignature,
  curationRequestIssue,
  curationTypeIdsFromLevel,
  currentInfoValue,
  infoChangeMatchesLevel,
  normalizeTagIds,
  applyOptionalScoreInput,
  curveEditorLevelFromRequest,
  curveMetaEqual,
  optionalScoreBodyValue,
  optionalScoreDraft,
  optionalScoresEqual,
  payloadHasRequestedCurve,
  requestErrorMessage,
  reratingComparisonFromRefs,
  sameIdSet,
  tagRequestDiff,
  tagRequestIssue,
  tagRequestTargetIds,
  withoutUnrequestableTagIds,
} from './levelRequestShared';
import { useUnsavedClose } from '@/hooks/useUnsavedClose';
import { useArchiveFilePaste } from '@/hooks/useArchiveFilePaste';
import { collectLevelReferenceIds, getLevelReferences, peekLevelReferences } from '@/utils/levelReferences';
import LevelRequestCurationTypes, { LevelRequestCurationDiff } from './LevelRequestCurationTypes';
import LevelRequestInfoFields from './LevelRequestInfoFields';
import LevelRequestTags, { LevelRequestTagDiff } from './LevelRequestTags';

const LevelRequestFormPopup = ({
  levelId,
  type,
  request = null,
  level = null,
  levelTags = null,
  levelTagIds = null,
  canEditChart = false,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation(['pages', 'common']);
  const { difficulties, tags: catalogTags, tagsLoading } = useDifficultyContext();
  const payload = request?.payload || {};
  const seededApplied = Array.isArray(levelTagIds)
    ? normalizeTagIds(levelTagIds)
    : (Array.isArray(levelTags) ? assignableTagIds(levelTags) : null);
  const hasStoredTarget = Array.isArray(payload.targetTagIds);
  const initialKind = payload.kind || 'song';
  const initialInfo = buildInfoDraft(payload, level, initialKind);
  const initialKeptDownload = payload.kind === 'download' && payload.fileId
    ? { originalName: payload.originalName || '' }
    : null;
  const initialInfoValue = initialKeptDownload ? '' : initialInfo.value;
  const initialTargetIds = (() => {
    if (type !== 'tag') return [];
    if (request && (hasStoredTarget || seededApplied != null)) {
      return tagRequestTargetIds(payload, seededApplied || []);
    }
    if (request) return null;
    return seededApplied;
  })();
  const curationSeedKnown = (type === 'curation' || type === 'curation_rerate') && (
    Array.isArray(level?.curationTypeIds) || Array.isArray(level?.curations) || Boolean(level?.curation)
  );
  const seededCurationIds = curationSeedKnown ? curationTypeIdsFromLevel(level) : null;
  const legacyCurationTarget = type === 'curation_rerate' && request && !Array.isArray(payload.addCurationTypeIds);
  const initialCurationTarget = type === 'curation_rerate'
    ? (request
      ? normalizeTagIds(legacyCurationTarget
        ? [...(seededCurationIds || []), ...normalizeTagIds(payload.curationTypeIds)]
        : payload.curationTypeIds)
      : (seededCurationIds || []))
    : normalizeTagIds(payload.curationTypeIds);
  const [reason, setReason] = useState(request?.reason || '');
  const [requestedRating, setRequestedRating] = useState(payload.requestedRating || '');
  const [requestedBaseScore, setRequestedBaseScore] = useState(optionalScoreDraft(payload.baseScore));
  const [requestedPpBaseScore, setRequestedPpBaseScore] = useState(optionalScoreDraft(payload.ppBaseScore));
  const [requestedCurveMeta, setRequestedCurveMeta] = useState(
    payloadHasRequestedCurve(payload) ? payload.xaccCurveMeta : null,
  );
  const [showCurveEditor, setShowCurveEditor] = useState(false);
  const [chartLevel, setChartLevel] = useState(level);
  const [kind, setKind] = useState(initialKind);
  const [infoLevel, setInfoLevel] = useState(level);
  const [songId, setSongId] = useState(initialInfo.songId);
  const [songName, setSongName] = useState(initialInfo.songName);
  const [suffix, setSuffix] = useState(initialInfo.suffix);
  const [artistId, setArtistId] = useState(initialInfo.artistId);
  const [artistName, setArtistName] = useState(initialInfo.artistName);
  const [infoValue, setInfoValue] = useState(initialInfoValue);
  const [downloadFile, setDownloadFile] = useState(null);
  const [keptDownload, setKeptDownload] = useState(initialKeptDownload);
  const [uploadProgress, setUploadProgress] = useState({ phase: 'idle', percent: 0 });
  const [levelFiles, setLevelFiles] = useState([]);
  const [chartRequest, setChartRequest] = useState(null);
  const [showCdnTos, setShowCdnTos] = useState(false);
  const [pendingZip, setPendingZip] = useState(null);
  const [creditTeam, setCreditTeam] = useState(initialInfo.team);
  const [creditList, setCreditList] = useState(initialInfo.credits);
  const [appliedIds, setAppliedIds] = useState(seededApplied);
  const [targetIds, setTargetIds] = useState(initialTargetIds);
  const [baseline, setBaseline] = useState(() => ({
    reason: request?.reason || '',
    requestedRating: payload.requestedRating || '',
    requestedBaseScore: optionalScoreDraft(payload.baseScore),
    requestedPpBaseScore: optionalScoreDraft(payload.ppBaseScore),
    requestedCurveMeta: payloadHasRequestedCurve(payload) ? payload.xaccCurveMeta : null,
    kind: payload.kind || 'song',
    curationTypeIds: initialCurationTarget,
    targetIds: initialTargetIds,
    songId: initialInfo.songId,
    songName: initialInfo.songName,
    suffix: initialInfo.suffix,
    artistId: initialInfo.artistId,
    artistName: initialInfo.artistName,
    value: initialInfoValue,
    keptDownload: Boolean(initialKeptDownload),
    creditSignature: creditSignature(initialInfo.credits, initialInfo.team),
  }));
  const [tagsReady, setTagsReady] = useState(type !== 'tag' || hasStoredTarget || seededApplied != null);
  const [appliedCurationIds, setAppliedCurationIds] = useState(seededCurationIds);
  const [curationTypeIds, setCurationTypeIds] = useState(initialCurationTarget);
  const [curationReady, setCurationReady] = useState(
    (type !== 'curation' && type !== 'curation_rerate') || curationSeedKnown || Boolean(request),
  );
  const [saving, setSaving] = useState(false);
  const [reratingComparison, setReratingComparison] = useState(null);
  const userEditedTags = useRef(false);
  const userEditedCuration = useRef(false);
  const curationSeededRef = useRef(seededCurationIds != null);
  curationSeededRef.current = seededCurationIds != null;
  const infoEditedRef = useRef(false);
  const kindRef = useRef(kind);
  kindRef.current = kind;
  const targetIdsRef = useRef(targetIds);
  targetIdsRef.current = targetIds;
  const requestRef = useRef(request);
  const seededAppliedRef = useRef(seededApplied);
  const catalogTagsRef = useRef(catalogTags);
  requestRef.current = request;
  seededAppliedRef.current = seededApplied;
  catalogTagsRef.current = catalogTags;

  const kindOptions = useMemo(
    () => INFO_KINDS.map((value) => ({ value, label: t(`levelRequests.kinds.${value}`) })),
    [t],
  );
  const showCreatorHint = type === 'info_change' && canEditChart && CREATOR_EDITABLE_KINDS.has(kind);
  const requestedRatingIcon = difficulties.find(
    (diff) => diff.name?.toLowerCase() === String(requestedRating).trim().toLowerCase(),
  )?.icon;
  const communityTagSources = useMemo(
    () => [...(catalogTags || []), ...(Array.isArray(levelTags) ? levelTags : [])],
    [catalogTags, levelTags],
  );
  const requestableTargetIds = useMemo(
    () => (targetIds == null ? null : withoutUnrequestableTagIds(targetIds, communityTagSources)),
    [communityTagSources, targetIds],
  );
  const requestableAppliedIds = useMemo(
    () => (appliedIds == null ? null : withoutUnrequestableTagIds(appliedIds, communityTagSources)),
    [appliedIds, communityTagSources],
  );
  const tagDiff = useMemo(
    () => tagRequestDiff(requestableTargetIds || [], requestableAppliedIds || []),
    [requestableAppliedIds, requestableTargetIds],
  );
  const tagIssue = type === 'tag' && tagsReady ? tagRequestIssue(requestableTargetIds, requestableAppliedIds) : null;
  const curationDiff = useMemo(
    () => tagRequestDiff(curationTypeIds, appliedCurationIds || []),
    [appliedCurationIds, curationTypeIds],
  );
  const curationIssue = (type === 'curation' || type === 'curation_rerate')
    ? curationRequestIssue(
      type,
      curationTypeIds,
      type === 'curation_rerate' && curationReady ? appliedCurationIds : undefined,
    )
    : null;
  const curationSlotIssue = type === 'curation' && Array.isArray(appliedCurationIds) && appliedCurationIds.length > 0
    ? 'has_curation'
    : (type === 'curation_rerate' && Array.isArray(appliedCurationIds) && appliedCurationIds.length === 0
      ? 'no_curation'
      : null);
  const infoDraft = useMemo(() => ({
    songId,
    songName,
    suffix,
    artistId,
    artistName,
    value: infoValue,
    downloadAttached: Boolean(downloadFile || keptDownload),
    team: creditTeam,
    credits: creditList,
  }), [artistId, artistName, creditList, creditTeam, downloadFile, infoValue, keptDownload, songId, songName, suffix]);
  const infoReady = type !== 'info_change' || infoLevel != null;
  const infoUnchanged = type === 'info_change' && infoChangeMatchesLevel(kind, infoLevel, infoDraft);
  const infoMissing = type === 'info_change' && (
    (kind === 'song' && !(Number(songId) > 0))
    || (kind === 'artist' && !(Number(artistId) > 0))
    || (kind === 'download' && !downloadFile && !keptDownload && !String(infoValue || '').trim())
    || ((kind === 'video' || kind === 'description' || kind === 'multiple') && !String(infoValue || '').trim())
  );
  const reasonRequired = type === 'rerate' || type === 'curation_rerate';
  const ratingMissing = type === 'rerate' && !String(requestedRating).trim();
  const reasonMissing = reasonRequired && !reason.trim();
  const comparisonIds = useMemo(
    () => (type === 'rerate' ? collectLevelReferenceIds(reason) : []),
    [reason, type],
  );
  const curveEditorLevel = useMemo(
    () => (type === 'rerate'
      ? curveEditorLevelFromRequest(chartLevel || level, payload, {
          baseScore: requestedBaseScore,
          ppBaseScore: requestedPpBaseScore,
          xaccCurveMeta: requestedCurveMeta,
        })
      : null),
    [chartLevel, level, payload, requestedBaseScore, requestedCurveMeta, requestedPpBaseScore, type],
  );
  const infoIssue = type === 'info_change' && infoReady
    ? (infoMissing
      ? (kind === 'song' ? 'song' : kind === 'artist' ? 'artist' : kind === 'credits' ? 'credits' : 'value')
      : (infoUnchanged ? 'unchanged' : null))
    : null;
  const stillLoading = (type === 'tag' && (tagsLoading || !tagsReady || targetIds == null || appliedIds == null))
    || (type === 'info_change' && !infoReady)
    || (type === 'curation_rerate' && (!curationReady || appliedCurationIds == null));
  const formBlocked = stillLoading
    || ratingMissing
    || reasonMissing
    || Boolean(tagIssue || infoIssue || curationSlotIssue || curationIssue || reratingComparison);
  const isDirty = useMemo(() => {
    if (reason !== baseline.reason) return true;
    if (type === 'rerate') {
      if (requestedRating !== baseline.requestedRating) return true;
      if (!optionalScoresEqual(requestedBaseScore, baseline.requestedBaseScore)) return true;
      if (!optionalScoresEqual(requestedPpBaseScore, baseline.requestedPpBaseScore)) return true;
      if (!curveMetaEqual(requestedCurveMeta, baseline.requestedCurveMeta)) return true;
    }
    if (type === 'info_change') {
      if (kind !== baseline.kind) return true;
      if (kind === 'song' && (Number(songId) !== Number(baseline.songId) || songName !== baseline.songName || suffix !== baseline.suffix)) return true;
      if (kind === 'artist' && (Number(artistId) !== Number(baseline.artistId) || artistName !== baseline.artistName)) return true;
      if (kind === 'download' && (downloadFile || Boolean(keptDownload) !== Boolean(baseline.keptDownload) || infoValue !== baseline.value)) return true;
      if ((kind === 'video' || kind === 'description' || kind === 'multiple') && infoValue !== baseline.value) return true;
      if (kind === 'credits' && creditSignature(creditList, creditTeam) !== baseline.creditSignature) return true;
    }
    if ((type === 'curation' || type === 'curation_rerate') && !sameIdSet(curationTypeIds, baseline.curationTypeIds)) return true;
    if (type === 'tag') {
      if (requestableTargetIds == null || baseline.targetIds == null) return false;
      if (!sameIdSet(requestableTargetIds, withoutUnrequestableTagIds(baseline.targetIds, communityTagSources))) return true;
    }
    return false;
  }, [artistId, artistName, baseline, communityTagSources, creditList, creditTeam, curationTypeIds, downloadFile, infoValue, keptDownload, kind, reason, requestableTargetIds, requestedBaseScore, requestedCurveMeta, requestedPpBaseScore, requestedRating, songId, songName, suffix, type]);
  const { requestClose } = useUnsavedClose({ isDirty, onClose });

  useEffect(() => {
    if (type !== 'tag' || !levelId) return undefined;
    let cancelled = false;
    api.get(routes.database.difficulties.levelTags(levelId))
      .then((response) => {
        if (cancelled) return;
        const rows = Array.isArray(response.data) ? response.data : [];
        const ids = assignableTagIds(rows);
        const currentRequest = requestRef.current;
        let nextTarget = targetIdsRef.current;
        if (currentRequest) {
          if (nextTarget == null) nextTarget = tagRequestTargetIds(currentRequest.payload, ids);
        } else if (!userEditedTags.current || nextTarget == null) {
          nextTarget = ids;
        }
        nextTarget = nextTarget == null
          ? null
          : withoutUnrequestableTagIds(nextTarget, [...(catalogTagsRef.current || []), ...rows]);
        setAppliedIds(ids);
        setTargetIds(nextTarget);
        if (!userEditedTags.current) {
          setBaseline((current) => ({ ...current, targetIds: nextTarget }));
        }
        setTagsReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        const canContinue = seededAppliedRef.current != null || Array.isArray(requestRef.current?.payload?.targetTagIds);
        if (!canContinue) toast.error(requestErrorMessage(t, err));
        setTagsReady(canContinue);
      });
    return () => {
      cancelled = true;
    };
  }, [type, levelId, t]);

  useEffect(() => {
    if ((type !== 'curation' && type !== 'curation_rerate') || !levelId) return undefined;
    let cancelled = false;
    api.get(`${routes.database.levels.root()}/${levelId}`)
      .then((response) => {
        if (cancelled) return;
        const full = response.data?.level ?? response.data;
        const ids = curationTypeIdsFromLevel(full);
        setAppliedCurationIds(ids);
        if (type === 'curation_rerate' && !userEditedCuration.current) {
          const currentRequest = requestRef.current;
          const nextTarget = !currentRequest
            ? ids
            : (!Array.isArray(currentRequest.payload?.addCurationTypeIds)
              ? normalizeTagIds([...ids, ...normalizeTagIds(currentRequest.payload?.curationTypeIds)])
              : null);
          if (nextTarget != null) {
            setCurationTypeIds(nextTarget);
            setBaseline((current) => ({ ...current, curationTypeIds: nextTarget }));
          }
        }
        setCurationReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        const canContinue = curationSeededRef.current || Boolean(requestRef.current);
        if (!canContinue) toast.error(requestErrorMessage(t, err));
        setCurationReady(canContinue);
      });
    return () => {
      cancelled = true;
    };
  }, [type, levelId, t]);

  useEffect(() => {
    if (type !== 'info_change' || !levelId) return undefined;
    let cancelled = false;
    api.get(`${routes.database.levels.root()}/${levelId}`)
      .then((response) => {
        if (cancelled) return;
        const full = response.data?.level ?? response.data;
        if (!full) return;
        setInfoLevel(full);
        if (!infoEditedRef.current) {
          const draft = buildInfoDraft(requestRef.current?.payload || {}, full, kindRef.current);
          setSongId(draft.songId);
          setSongName(draft.songName);
          setSuffix(draft.suffix);
          setArtistId(draft.artistId);
          setArtistName(draft.artistName);
          setInfoValue(draft.value);
          setCreditTeam(draft.team);
          setCreditList(draft.credits);
          setBaseline((current) => ({
            ...current,
            songId: draft.songId,
            songName: draft.songName,
            suffix: draft.suffix,
            artistId: draft.artistId,
            artistName: draft.artistName,
            value: draft.value,
            creditSignature: creditSignature(draft.credits, draft.team),
          }));
        }
      })
      .catch((err) => {
        if (!cancelled) toast.error(requestErrorMessage(t, err));
      });
    return () => {
      cancelled = true;
    };
  }, [type, levelId, t]);

  useEffect(() => {
    if (type !== 'rerate' || !levelId) return undefined;
    let cancelled = false;
    api.get(`${routes.database.levels.root()}/${levelId}`)
      .then((response) => {
        if (cancelled) return;
        const full = response.data?.level ?? response.data;
        if (full) setChartLevel(full);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [type, levelId]);

  useEffect(() => {
    if (type !== 'rerate') {
      setReratingComparison(null);
      return undefined;
    }
    if (comparisonIds.length === 0) {
      setReratingComparison(null);
      return undefined;
    }
    const apply = (map) => {
      setReratingComparison(reratingComparisonFromRefs(comparisonIds, map));
    };
    const cached = peekLevelReferences(comparisonIds);
    if (cached) {
      apply(cached);
      return undefined;
    }
    let cancelled = false;
    getLevelReferences(comparisonIds).then((map) => {
      if (!cancelled) apply(map);
    });
    return () => {
      cancelled = true;
    };
  }, [comparisonIds, type]);

  const uploadAbortRef = useRef(null);
  useEffect(() => () => uploadAbortRef.current?.abort(), []);

  const progressLabel = () => {
    if (uploadProgress.phase === 'hashing') return t('levelRequests.form.hashing', { percent: uploadProgress.percent });
    if (uploadProgress.phase === 'uploading') return t('levelRequests.form.uploading', { percent: uploadProgress.percent });
    if (uploadProgress.phase === 'completing') return t('levelRequests.form.assembling');
    if (uploadProgress.phase === 'submitting') return t('levelRequests.form.sending');
    return '';
  };

  const storeDownloadFile = (file) => {
    try {
      const prepared = prepareArchiveForUpload(file);
      if (!prepared) {
        toast.error(t('levelRequests.form.invalidArchive'));
        return;
      }
      infoEditedRef.current = true;
      setDownloadFile(prepared);
      setKeptDownload(null);
      setInfoValue('');
    } catch {
      toast.error(t('levelRequests.form.invalidArchive'));
    }
  };

  const pickDownloadFile = (file) => {
    if (getClientPreference(CLIENT_PREF_KEYS.SUBMISSIONS_CDN_TOS_AGREED, false) !== true) {
      setPendingZip(file);
      setShowCdnTos(true);
      return;
    }
    storeDownloadFile(file);
  };

  useArchiveFilePaste(
    pickDownloadFile,
    kind === 'download' && !saving && !showCdnTos && levelFiles.length === 0,
  );

  const finishSaved = (savedRequest, responseData) => {
    if (responseData?.requiresLevelSelection && Array.isArray(responseData.levelFiles)) {
      setChartRequest(savedRequest);
      setLevelFiles(responseData.levelFiles);
      onSaved?.(savedRequest);
      return;
    }
    toast.success(request ? t('levelRequests.form.save') : t('levelRequests.form.submitted'));
    onSaved?.(savedRequest);
    onClose();
  };

  const selectChart = async (selectedLevel) => {
    if (!chartRequest?.id) return;
    setSaving(true);
    try {
      const response = await api.post(routes.database.levelRequests.selectLevel(chartRequest.id), { selectedLevel });
      setLevelFiles([]);
      setChartRequest(null);
      toast.success(request ? t('levelRequests.form.save') : t('levelRequests.form.submitted'));
      onSaved?.(response.data?.request || chartRequest);
      onClose();
    } catch (err) {
      toast.error(requestErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  };

  const closeChartPicker = () => {
    const saved = chartRequest;
    setLevelFiles([]);
    setChartRequest(null);
    toast.success(t('levelRequests.form.chartLater'));
    onSaved?.(saved);
    onClose();
  };

  const submit = async () => {
    if (stillLoading) return;
    if (reratingComparison) {
      toast.error(t('levelRequests.errors.comparison_rerating', { label: reratingComparison.label }));
      return;
    }
    const issue = [
      ratingMissing && 'rating',
      reasonMissing && 'reason',
      tagIssue,
      infoIssue,
      curationSlotIssue,
      curationIssue,
    ].find(Boolean);
    if (issue) {
      toast.error(t(`levelRequests.errors.${issue}`));
      return;
    }
    const trimmedReason = reason.trim();
    if (type === 'rerate') {
      const hasReferences = collectLevelReferenceIds(trimmedReason).length > 0;
      if (!hasReferences && !window.confirm(t('levelRequests.form.noReferencesConfirm'))) {
        return;
      }
    }
    setSaving(true);
    const body = { type, reason };
    if (type === 'rerate') {
      body.requestedRating = requestedRating;
      body.baseScore = optionalScoreBodyValue(requestedBaseScore);
      body.ppBaseScore = optionalScoreBodyValue(requestedPpBaseScore);
      body.xaccCurveMeta = requestedCurveMeta || null;
    }
    if (type === 'info_change') {
      body.kind = kind;
      if (kind === 'song') {
        body.songId = songId;
        body.songName = songName;
        body.suffix = suffix;
      } else if (kind === 'artist') {
        body.artistId = artistId;
        body.artistName = artistName;
      } else if (kind === 'credits') {
        body.team = creditTeam;
        body.credits = creditList;
      } else if (kind === 'download' && keptDownload && !downloadFile) {
        body.keepDownloadFile = true;
      } else if (kind !== 'download' || !downloadFile) {
        body.value = infoValue;
      }
    }
    if (type === 'tag') body.targetTagIds = withoutUnrequestableTagIds(targetIds, communityTagSources);
    if (type === 'curation' || type === 'curation_rerate') body.curationTypeIds = curationTypeIds;
    const abortController = new AbortController();
    uploadAbortRef.current = abortController;
    try {
      if (kind === 'download' && downloadFile) {
        setUploadProgress({ phase: 'uploading', percent: 0 });
        const session = await uploadLevelZip(downloadFile.file, {
          meta: { forLevelRequest: true },
          signal: abortController.signal,
          onProgress: (progress) => {
            const percent = typeof progress?.percent === 'number' ? progress.percent : 0;
            setUploadProgress({ phase: progress?.phase || 'uploading', percent });
          },
        });
        body.uploadSessionId = session?.id;
        body.uploadJobId = crypto.randomUUID();
        setUploadProgress({ phase: 'submitting', percent: 100 });
      }
      const response = request
        ? await api.patch(routes.database.levelRequests.byId(request.id), body)
        : await api.post(routes.database.levelRequests.create(levelId), body);
      finishSaved(response.data?.request, response.data);
    } catch (err) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') return;
      toast.error(requestErrorMessage(t, err));
    } finally {
      uploadAbortRef.current = null;
      setUploadProgress({ phase: 'idle', percent: 0 });
      setSaving(false);
    }
  };

  return (
    <>
    <PopupShell
      onClose={requestClose}
      closeDisabled={saving || levelFiles.length > 0}
      panelClassName={[
        'level-requests',
        'level-requests__popup',
        (type === 'info_change' || type === 'tag' || type === 'curation' || type === 'curation_rerate') && 'level-requests__popup--types',
      ].filter(Boolean).join(' ')}
    >
      <CloseButton variant="floating" onClick={requestClose} />
      <h2>
        {request
          ? t('levelRequests.form.editTitle', { type: t(`levelRequests.types.${type}`) })
          : t('levelRequests.form.title', { type: t(`levelRequests.types.${type}`) })}
      </h2>
      <div className="level-requests__form">
        {type === 'rerate' && (
          <div className="level-requests__field">
            <span>{t('levelRequests.form.requestedRating')}</span>
            <div className="rating-input-container">
              <RatingInput
                value={requestedRating}
                onChange={(value) => setRequestedRating(value)}
                showDiff={false}
                difficulties={difficulties}
                allowCustomInput
                placeholder={t('levelRequests.form.requestedRatingPlaceholder')}
              />
              {requestedRatingIcon && (
                <img className="detail-value lv-icon" src={requestedRatingIcon} alt="" />
              )}
            </div>
            {ratingMissing && (
              <span className="level-requests__hint level-requests__hint--issue">{t('levelRequests.errors.rating')}</span>
            )}
          </div>
        )}
        {type === 'rerate' && (
          <div className="level-requests__score-row">
            <div className="level-requests__field">
              <span>{t('levelRequests.form.baseScore')}</span>
              <div className="rating-input-container">
                <RatingInput
                  value={requestedBaseScore}
                  onChange={(value, isFromDropdown) => {
                    setRequestedBaseScore(applyOptionalScoreInput(value, isFromDropdown, difficulties));
                  }}
                  showDiff={false}
                  difficulties={difficulties}
                  allowCustomInput
                  placeholder={t('levelRequests.form.baseScorePlaceholder')}
                />
              </div>
            </div>
            <div className="level-requests__field">
              <span>{t('levelRequests.form.ppBaseScore')}</span>
              <div className="rating-input-container">
                <RatingInput
                  value={requestedPpBaseScore}
                  onChange={(value, isFromDropdown) => {
                    setRequestedPpBaseScore(applyOptionalScoreInput(value, isFromDropdown, difficulties));
                  }}
                  showDiff={false}
                  difficulties={difficulties}
                  allowCustomInput
                  placeholder={t('levelRequests.form.ppBaseScorePlaceholder')}
                />
              </div>
            </div>
            <div className="level-requests__field">
              <span>{t('levelRequests.form.scoreCurve')}</span>
              <div className="level-requests__score-curve-actions">
                <button
                  type="button"
                  className="level-requests__button"
                  onClick={() => setShowCurveEditor(true)}
                  disabled={!curveEditorLevel}
                >
                  <GraphIcon size="16px" />
                  {t('levelRequests.form.scoreCurveOpen')}
                </button>
                {requestedCurveMeta && (
                  <button
                    type="button"
                    className="level-requests__button level-requests__button--icon"
                    onClick={() => setRequestedCurveMeta(null)}
                    aria-label={t('levelRequests.form.scoreCurveClear')}
                    title={t('levelRequests.form.scoreCurveClear')}
                  >
                    <TrashIcon size={16} color="currentColor" />
                  </button>
                )}
              </div>
              {requestedCurveMeta && (
                <span className="level-requests__hint">{t('levelRequests.form.scoreCurveSet')}</span>
              )}
            </div>
          </div>
        )}
        {type === 'info_change' && (
          <div className="level-requests__field">
            <span>{t('levelRequests.form.kind')}</span>
            <CustomSelect
              options={kindOptions}
              value={kindOptions.find((option) => option.value === kind) || kindOptions[0]}
              onChange={(option) => {
                const next = option?.value || 'song';
                infoEditedRef.current = true;
                setKind(next);
                setDownloadFile(null);
                setKeptDownload(null);
                if (next === 'video' || next === 'download' || next === 'description' || next === 'multiple') {
                  setInfoValue(next === 'multiple' ? '' : currentInfoValue(infoLevel, next));
                }
              }}
            />
            {showCreatorHint && (
              <span className="level-requests__hint">
                {t('levelRequests.form.creatorEditable')}
              </span>
            )}
          </div>
        )}
        {type === 'info_change' && (
          <>
            <LevelRequestInfoFields
              kind={kind}
              level={infoLevel}
              songId={songId}
              songName={songName}
              suffix={suffix}
              onSong={(song) => {
                infoEditedRef.current = true;
                setSongId(song.songId);
                setSongName(song.songName);
              }}
              onSuffix={(next) => {
                infoEditedRef.current = true;
                setSuffix(next);
              }}
              artistId={artistId}
              artistName={artistName}
              onArtist={(artist) => {
                infoEditedRef.current = true;
                setArtistId(artist.artistId);
                setArtistName(artist.artistName);
              }}
              value={infoValue}
              onValue={(next) => {
                infoEditedRef.current = true;
                setInfoValue(next);
                if (kind === 'download' && next) {
                  setDownloadFile(null);
                  setKeptDownload(null);
                }
              }}
              downloadName={downloadFile?.originalName || keptDownload?.originalName || ''}
              onPickDownload={pickDownloadFile}
              onClearDownload={() => {
                infoEditedRef.current = true;
                setDownloadFile(null);
                setKeptDownload(null);
              }}
              team={creditTeam}
              credits={creditList}
              onCredits={(draft) => {
                infoEditedRef.current = true;
                setCreditTeam(draft.team);
                setCreditList(draft.credits);
              }}
            />
            {infoIssue && (
              <span className="level-requests__hint level-requests__hint--issue">{t(`levelRequests.errors.${infoIssue}`)}</span>
            )}
          </>
        )}
        {type === 'tag' && (
          <div className="level-requests__field">
            {tagsReady && targetIds != null && (
              <LevelRequestTags
                ids={requestableTargetIds}
                onChange={(ids) => {
                  userEditedTags.current = true;
                  setTargetIds(withoutUnrequestableTagIds(ids, communityTagSources));
                }}
              />
            )}
            {tagsReady && targetIds != null && (
              <span className="level-requests__hint">{t('levelRequests.form.communityTagsHint')}</span>
            )}
            {tagsReady && targetIds != null && (
              <span className="level-requests__hint">{t('levelRequests.form.automaticTagsHint')}</span>
            )}
            {(!tagsReady || requestableTargetIds == null) && (
              <span className="level-requests__hint">{t('loading.generic', { ns: 'common' })}</span>
            )}
            {tagsReady && requestableTargetIds != null && requestableAppliedIds != null && (
              <LevelRequestTagDiff addIds={tagDiff.addIds} removeIds={tagDiff.removeIds} />
            )}
            {tagIssue && (
              <span className="level-requests__hint level-requests__hint--issue">{t(`levelRequests.errors.${tagIssue}`)}</span>
            )}
          </div>
        )}
        {type === 'curation' && (
          <div className="level-requests__field">
            <LevelRequestCurationTypes
              ids={curationTypeIds}
              onChange={(ids) => {
                userEditedCuration.current = true;
                setCurationTypeIds(ids);
              }}
            />
            {(curationSlotIssue || curationIssue) && (
              <span className="level-requests__hint level-requests__hint--issue">
                {t(`levelRequests.errors.${curationSlotIssue || curationIssue}`)}
              </span>
            )}
          </div>
        )}
        {type === 'curation_rerate' && (
          <div className="level-requests__field">
            {curationReady && (
              <LevelRequestCurationTypes
                ids={curationTypeIds}
                onChange={(ids) => {
                  userEditedCuration.current = true;
                  setCurationTypeIds(ids);
                }}
              />
            )}
            {!curationReady && (
              <span className="level-requests__hint">{t('loading.generic', { ns: 'common' })}</span>
            )}
            {curationReady && appliedCurationIds != null && (
              <LevelRequestCurationDiff addIds={curationDiff.addIds} removeIds={curationDiff.removeIds} />
            )}
            {(curationSlotIssue || curationIssue) && (
              <span className="level-requests__hint level-requests__hint--issue">
                {t(`levelRequests.errors.${curationSlotIssue || curationIssue}`)}
              </span>
            )}
          </div>
        )}
        <label className="level-requests__field">
          <span>{reasonRequired ? t('levelRequests.form.reason') : t('levelRequests.form.reasonOptional')}</span>
          <textarea
            value={reason}
            maxLength={1000}
            onChange={(event) => setReason(event.target.value)}
            placeholder={reasonRequired ? t('levelRequests.form.reasonPlaceholder') : t('levelRequests.form.reasonPlaceholderOptional')}
          />
          {reasonMissing && (
            <span className="level-requests__hint level-requests__hint--issue">{t('levelRequests.errors.reason')}</span>
          )}
          {reratingComparison && (
            <span className="level-requests__hint level-requests__hint--issue">
              {t('levelRequests.errors.comparison_rerating', { label: reratingComparison.label })}
            </span>
          )}
        </label>
        <div className="level-requests__actions">
          {uploadProgress.phase !== 'idle' && (
            <span className="level-requests__hint level-requests__upload-progress">{progressLabel()}</span>
          )}
          <button
            type="button"
            className="level-requests__button level-requests__button--primary"
            onClick={submit}
            disabled={saving || formBlocked}
          >
            {saving ? t('levelRequests.form.submitting') : request ? t('levelRequests.form.save') : t('levelRequests.form.submit')}
          </button>
          <button type="button" className="level-requests__button" onClick={requestClose} disabled={saving}>
            {t('levelRequests.form.cancel')}
          </button>
        </div>
      </div>
    </PopupShell>
    {levelFiles.length > 0 && (
      <LevelSelectionPopup
        isOpen
        levelFiles={levelFiles}
        onSelect={selectChart}
        onClose={closeChartPicker}
      />
    )}
    {showCurveEditor && curveEditorLevel && (
      <AdminLevelXaccCurvePopup
        level={curveEditorLevel}
        sandbox
        title={t('levelRequests.form.scoreCurveTitle')}
        hint={t('levelRequests.form.scoreCurveHint')}
        onApply={(meta) => setRequestedCurveMeta(meta || null)}
        onClose={() => setShowCurveEditor(false)}
      />
    )}
    {showCdnTos && (
      <CDNTosPopup
        onAgree={() => {
          setShowCdnTos(false);
          setClientPreferences({ [CLIENT_PREF_KEYS.SUBMISSIONS_CDN_TOS_AGREED]: true });
          if (pendingZip) storeDownloadFile(pendingZip);
          setPendingZip(null);
        }}
        onDecline={() => {
          setShowCdnTos(false);
          setPendingZip(null);
        }}
      />
    )}
    </>
  );
};

export default LevelRequestFormPopup;
