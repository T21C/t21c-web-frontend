import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { CustomSelect, RatingInput } from '@/components/common/selectors';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
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
  requestErrorMessage,
  reratingComparisonFromRefs,
  sameIdSet,
  tagRequestDiff,
  tagRequestIssue,
  tagRequestTargetIds,
} from './levelRequestShared';
import { useUnsavedClose } from '@/hooks/useUnsavedClose';
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
  const { difficulties } = useDifficultyContext();
  const payload = request?.payload || {};
  const seededApplied = Array.isArray(levelTagIds)
    ? normalizeTagIds(levelTagIds)
    : (Array.isArray(levelTags) ? assignableTagIds(levelTags) : null);
  const hasStoredTarget = Array.isArray(payload.targetTagIds);
  const initialKind = payload.kind || 'song';
  const initialInfo = buildInfoDraft(payload, level, initialKind);
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
  const [kind, setKind] = useState(initialKind);
  const [infoLevel, setInfoLevel] = useState(level);
  const [songId, setSongId] = useState(initialInfo.songId);
  const [songName, setSongName] = useState(initialInfo.songName);
  const [suffix, setSuffix] = useState(initialInfo.suffix);
  const [artistId, setArtistId] = useState(initialInfo.artistId);
  const [artistName, setArtistName] = useState(initialInfo.artistName);
  const [infoValue, setInfoValue] = useState(initialInfo.value);
  const [creditTeam, setCreditTeam] = useState(initialInfo.team);
  const [creditList, setCreditList] = useState(initialInfo.credits);
  const [appliedTags, setAppliedTags] = useState(Array.isArray(levelTags) ? levelTags : []);
  const [appliedIds, setAppliedIds] = useState(seededApplied);
  const [targetIds, setTargetIds] = useState(initialTargetIds);
  const [baseline, setBaseline] = useState(() => ({
    reason: request?.reason || '',
    requestedRating: payload.requestedRating || '',
    kind: payload.kind || 'song',
    curationTypeIds: initialCurationTarget,
    targetIds: initialTargetIds,
    songId: initialInfo.songId,
    songName: initialInfo.songName,
    suffix: initialInfo.suffix,
    artistId: initialInfo.artistId,
    artistName: initialInfo.artistName,
    value: initialInfo.value,
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
  requestRef.current = request;
  seededAppliedRef.current = seededApplied;

  const kindOptions = useMemo(
    () => INFO_KINDS.map((value) => ({ value, label: t(`levelRequests.kinds.${value}`) })),
    [t],
  );
  const showCreatorHint = type === 'info_change' && canEditChart && CREATOR_EDITABLE_KINDS.has(kind);
  const requestedRatingIcon = difficulties.find(
    (diff) => diff.name?.toLowerCase() === String(requestedRating).trim().toLowerCase(),
  )?.icon;
  const tagDiff = useMemo(
    () => tagRequestDiff(targetIds || [], appliedIds || []),
    [targetIds, appliedIds],
  );
  const tagIssue = type === 'tag' && tagsReady ? tagRequestIssue(targetIds, appliedIds) : null;
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
    team: creditTeam,
    credits: creditList,
  }), [artistId, artistName, creditList, creditTeam, infoValue, songId, songName, suffix]);
  const infoReady = type !== 'info_change' || infoLevel != null;
  const infoUnchanged = type === 'info_change' && infoChangeMatchesLevel(kind, infoLevel, infoDraft);
  const infoMissing = type === 'info_change' && (
    (kind === 'song' && !(Number(songId) > 0))
    || (kind === 'artist' && !(Number(artistId) > 0))
    || ((kind === 'video' || kind === 'download' || kind === 'description' || kind === 'multiple') && !String(infoValue || '').trim())
  );
  const reasonRequired = type === 'rerate' || type === 'curation_rerate';
  const ratingMissing = type === 'rerate' && !String(requestedRating).trim();
  const reasonMissing = reasonRequired && !reason.trim();
  const comparisonIds = useMemo(
    () => (type === 'rerate' ? collectLevelReferenceIds(reason) : []),
    [reason, type],
  );
  const infoIssue = type === 'info_change' && infoReady
    ? (infoMissing
      ? (kind === 'song' ? 'song' : kind === 'artist' ? 'artist' : kind === 'credits' ? 'credits' : 'value')
      : (infoUnchanged ? 'unchanged' : null))
    : null;
  const stillLoading = (type === 'tag' && (!tagsReady || targetIds == null || appliedIds == null))
    || (type === 'info_change' && !infoReady)
    || (type === 'curation_rerate' && (!curationReady || appliedCurationIds == null));
  const formBlocked = stillLoading
    || ratingMissing
    || reasonMissing
    || Boolean(tagIssue || infoIssue || curationSlotIssue || curationIssue || reratingComparison);
  const isDirty = useMemo(() => {
    if (reason !== baseline.reason) return true;
    if (type === 'rerate' && requestedRating !== baseline.requestedRating) return true;
    if (type === 'info_change') {
      if (kind !== baseline.kind) return true;
      if (kind === 'song' && (Number(songId) !== Number(baseline.songId) || songName !== baseline.songName || suffix !== baseline.suffix)) return true;
      if (kind === 'artist' && (Number(artistId) !== Number(baseline.artistId) || artistName !== baseline.artistName)) return true;
      if ((kind === 'video' || kind === 'download' || kind === 'description' || kind === 'multiple') && infoValue !== baseline.value) return true;
      if (kind === 'credits' && creditSignature(creditList, creditTeam) !== baseline.creditSignature) return true;
    }
    if ((type === 'curation' || type === 'curation_rerate') && !sameIdSet(curationTypeIds, baseline.curationTypeIds)) return true;
    if (type === 'tag') {
      if (targetIds == null || baseline.targetIds == null) return false;
      if (!sameIdSet(targetIds, baseline.targetIds)) return true;
    }
    return false;
  }, [artistId, artistName, baseline, creditList, creditTeam, curationTypeIds, infoValue, kind, reason, requestedRating, songId, songName, suffix, targetIds, type]);
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
        setAppliedTags(rows);
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
    if (type === 'rerate') body.requestedRating = requestedRating;
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
      } else {
        body.value = infoValue;
      }
    }
    if (type === 'tag') body.targetTagIds = targetIds;
    if (type === 'curation' || type === 'curation_rerate') body.curationTypeIds = curationTypeIds;
    try {
      const response = request
        ? await api.patch(routes.database.levelRequests.byId(request.id), body)
        : await api.post(routes.database.levelRequests.create(levelId), body);
      toast.success(request ? t('levelRequests.form.save') : t('levelRequests.form.submitted'));
      onSaved?.(response.data?.request);
      onClose();
    } catch (err) {
      toast.error(requestErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PopupShell
      onClose={requestClose}
      closeDisabled={saving}
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
                ids={targetIds}
                assignedTags={appliedTags}
                onChange={(ids) => {
                  userEditedTags.current = true;
                  setTargetIds(ids);
                }}
              />
            )}
            {(!tagsReady || targetIds == null) && (
              <span className="level-requests__hint">{t('loading.generic', { ns: 'common' })}</span>
            )}
            {tagsReady && targetIds != null && appliedIds != null && (
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
  );
};

export default LevelRequestFormPopup;
