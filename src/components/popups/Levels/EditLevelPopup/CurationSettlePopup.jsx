import { routes } from '@/api/routes';
// tuf-search: #CurationSettlePopup #curationSettlePopup #popups #curation
import { useEffect, useMemo, useState } from 'react';
import './curationsettlepopup.css';
import api from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import { PopupShell } from '@/components/common/PopupShell';
import { LevelMentionField } from '@/components/misc';
import { CurationRatingPicks } from '@/components/popups/Rating/RatingDetailPopup/CurationRatingPicks';
import { RequestedCurationChanges } from '@/components/popups/Rating/RatingDetailPopup/RequestedCurationChanges';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import {
  emptyCurationPicks,
  picksAreEmpty,
  picksFromCurationTypes,
  requestedCurationBuckets,
} from '@/utils/curationTypeFamilies';
import { toastError, toastSuccess } from '@/utils/toastMessage';

function publishedTypes(level, dict) {
  const rows = level?.curations?.[0]?.types || [];
  return rows.map((type) => dict?.[type.id] || type);
}

export function CurationSettlePopup({
  ratingId = null,
  levelId = null,
  onClose,
  onSettled,
}) {
  const { t } = useTranslation(['components', 'common']);
  const { curationTypesDict } = useDifficultyContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rating, setRating] = useState(null);
  const [picks, setPicks] = useState(emptyCurationPicks());
  const [reason, setReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const url = ratingId
          ? routes.admin.curationRatingById(ratingId)
          : routes.admin.curationRatingByLevelId(levelId);
        const { data } = await api.get(url);
        if (cancelled) return;
        setRating(data);
        const published = picksFromCurationTypes(publishedTypes(data?.level, curationTypesDict));
        setPicks({
          ...published,
          chartTypeId: data?.averageChartTypeId ?? published.chartTypeId,
          vfxTypeId: data?.averageVfxTypeId ?? published.vfxTypeId,
        });
        setReason(data?.level?.curationRerateReason || '');
      } catch (error) {
        if (cancelled) return;
        toastError(error.response?.data?.error || t('rating.detailPopup.curation.settleFailed'));
        onClose?.();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [ratingId, levelId, curationTypesDict, onClose, t]);

  const canSettle = useMemo(() => !picksAreEmpty(picks) && !isSaving && !isLoading && rating?.id, [picks, isSaving, isLoading, rating?.id]);
  const requestedBuckets = useMemo(
    () => requestedCurationBuckets(rating?.curationRequests, curationTypesDict),
    [rating?.curationRequests, curationTypesDict],
  );

  const handleSettle = async (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!canSettle) {
      toastError(t('rating.detailPopup.curation.settleRequired'));
      return;
    }
    setIsSaving(true);
    try {
      await api.post(routes.admin.curationRatingSettle(rating.id), {
        chartTypeId: picks.chartTypeId,
        vfxTypeId: picks.vfxTypeId,
        miscTypeIds: picks.miscTypeIds,
        curationRerateReason: reason,
      });
      toastSuccess(t('rating.detailPopup.curation.settled'));
      onSettled?.(rating);
      onClose?.();
    } catch (error) {
      toastError(error.response?.data?.error || t('rating.detailPopup.curation.settleFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    onClose?.();
  };

  return (
    <PopupShell
      onClose={handleCancel}
      closeDisabled={isSaving}
      overlayClassName="curation-settle-popup-overlay"
      panelClassName="curation-settle-popup"
    >
      <CloseButton
        variant="floating"
        onClick={handleCancel}
        aria-label={t('buttons.close', { ns: 'common' })}
      />
      <div className="curation-settle-popup__content">
        <h2>{t('levelPopups.edit.form.buttons.manageCurations')}</h2>
        {rating?.level && (
          <p className="curation-settle-popup__level">
            {rating.level.song} — {rating.level.artist} #{rating.level.id}
          </p>
        )}
        {isLoading ? (
          <div className="loader loader-relative" />
        ) : (
          <>
            <RequestedCurationChanges requests={rating?.curationRequests} />
            <CurationRatingPicks
              chartTypeId={picks.chartTypeId}
              vfxTypeId={picks.vfxTypeId}
              miscTypeIds={picks.miscTypeIds}
              requestedBuckets={requestedBuckets}
              allowRange={false}
              onChartChange={(value) => setPicks((prev) => ({ ...prev, chartTypeId: value }))}
              onVfxChange={(value) => setPicks((prev) => ({ ...prev, vfxTypeId: value }))}
              onMiscToggle={(typeId) => {
                const id = Number(typeId);
                setPicks((prev) => {
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
            <label className="curation-settle-popup__reason">
              <span>{t('levelPopups.edit.form.placeholders.curationRerateReason')}</span>
              <LevelMentionField
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t('levelPopups.edit.form.placeholders.curationRerateReason')}
              />
            </label>
            <div className="curation-settle-popup__actions">
              <button
                type="button"
                className="btn-fill-neutral-dark"
                onClick={handleCancel}
                disabled={isSaving}
              >
                {t('buttons.cancel', { ns: 'common' })}
              </button>
              <button
                type="button"
                className="btn-fill-primary"
                onClick={handleSettle}
                disabled={!canSettle}
              >
                {isSaving ? t('buttons.saving', { ns: 'common' }) : t('rating.detailPopup.curation.settle')}
              </button>
            </div>
          </>
        )}
      </div>
    </PopupShell>
  );
}
