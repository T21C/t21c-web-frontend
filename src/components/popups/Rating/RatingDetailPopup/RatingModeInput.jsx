// tuf-search: #RatingModeInput #rating #curationRating
import { RatingInput } from '@/components/common/selectors';
import { emptyCurationPicks, updateCurationPicks } from '@/utils/curationTypeFamilies';
import { CurationRatingPicks } from './CurationRatingPicks';
import { RequestedCurationChanges } from './RequestedCurationChanges';

/**
 * Difficulty rating and curation picks share one slot.
 * Pass mode "difficulty" or "curation"; the surrounding labels stay with the page.
 */
export function RatingModeInput({
  mode = 'difficulty',
  disabled = false,
  difficulties,
  rating = '',
  onRatingChange,
  picks,
  onPicksChange,
  requestedBuckets = null,
  requests = null,
}) {
  if (mode === 'curation') {
    const current = picks || emptyCurationPicks();
    const change = (patch) => onPicksChange?.(updateCurationPicks(current, patch));
    return (
      <>
        <RequestedCurationChanges requests={requests} />
        <CurationRatingPicks
          chartTypeId={current.chartTypeId}
          chartTypeHighId={current.chartTypeHighId}
          vfxTypeId={current.vfxTypeId}
          vfxTypeHighId={current.vfxTypeHighId}
          chartRating={current.chartRating}
          vfxRating={current.vfxRating}
          miscTypeIds={current.miscTypeIds}
          requestedBuckets={requestedBuckets}
          disabled={disabled}
          onChartChange={(value) => change({ chartTypeId: value, chartTypeHighId: null, chartRating: '' })}
          onVfxChange={(value) => change({ vfxTypeId: value, vfxTypeHighId: null, vfxRating: '' })}
          onChartRatingChange={(value) => change({ chartRating: value, chartTypeId: null, chartTypeHighId: null })}
          onVfxRatingChange={(value) => change({ vfxRating: value, vfxTypeId: null, vfxTypeHighId: null })}
          onMiscToggle={(typeId) => change({ miscToggle: typeId })}
        />
      </>
    );
  }

  return (
    <RatingInput
      value={rating}
      onChange={onRatingChange}
      showDiff={false}
      difficulties={difficulties}
      allowCustomInput={true}
      disabled={disabled}
    />
  );
}
