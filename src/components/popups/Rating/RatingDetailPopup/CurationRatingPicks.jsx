// tuf-search: #CurationRatingPicks #ratingDetailPopup
import './curationratingpicks.css';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect, RatingInput } from '@/components/common/selectors';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';
import {
  collectCurationPickIds,
  formatCurationRangeLabel,
  groupCurationTypesForRating,
} from '@/utils/curationTypeFamilies';

function typeOption(type) {
  return {
    value: type.id,
    label: type.name,
    icon: type.icon,
  };
}

function TypeIcon({ type }) {
  if (!type) return null;
  if (type.icon) {
    return (
      <img
        src={selectIconSize(type.icon, ICON_SIZE.SMALL)}
        alt=""
        className="curation-rating-picks__icon"
      />
    );
  }
  return <span className="curation-rating-picks__icon-fallback">{String(type.name || '?').charAt(0)}</span>;
}

function formatTypeOption(option) {
  return (
    <span className="curation-rating-picks__option">
      {option.icon ? (
        <img
          src={selectIconSize(option.icon, ICON_SIZE.SMALL)}
          alt=""
          className="curation-rating-picks__icon"
        />
      ) : null}
      <span>{option.label}</span>
    </span>
  );
}

function RangePickDisplay({ lowId, highId, dict }) {
  const label = formatCurationRangeLabel(lowId, highId, dict);
  if (!label) return null;
  const low = dict[lowId];
  const high = highId && Number(highId) !== Number(lowId) ? dict[highId] : null;
  return (
    <span className="curation-pick-display__item">
      <TypeIcon type={low} />
      {high ? <TypeIcon type={high} /> : null}
      <span>{label}</span>
    </span>
  );
}

export function CurationPickDisplay({ detail, curationTypesDict }) {
  const ids = collectCurationPickIds(detail);
  if (ids.length === 0) return null;
  const dict = curationTypesDict || {};
  const miscIds = Array.isArray(detail?.miscTypeIds) ? detail.miscTypeIds : [];
  return (
    <span className="curation-pick-display">
      <RangePickDisplay key="chart" lowId={detail?.chartTypeId} highId={detail?.chartTypeHighId} dict={dict} />
      <RangePickDisplay key="vfx" lowId={detail?.vfxTypeId} highId={detail?.vfxTypeHighId} dict={dict} />
      {miscIds.map((id) => {
        const type = dict[id];
        if (!type) return null;
        return (
          <span key={id} className="curation-pick-display__item">
            <TypeIcon type={type} />
            <span>{type.name}</span>
          </span>
        );
      })}
    </span>
  );
}

function requestedBucketSet(requestedBuckets) {
  if (!requestedBuckets) return null;
  const items = requestedBuckets instanceof Set
    ? [...requestedBuckets]
    : Array.isArray(requestedBuckets)
      ? requestedBuckets
      : [];
  return items.length > 0 ? new Set(items) : null;
}

export function CurationRatingPicks({
  chartTypeId,
  chartTypeHighId = null,
  vfxTypeId,
  vfxTypeHighId = null,
  chartRating = '',
  vfxRating = '',
  miscTypeIds,
  onChartChange,
  onVfxChange,
  onChartRatingChange,
  onVfxRatingChange,
  onMiscToggle,
  disabled = false,
  requestedBuckets = null,
  allowRange = true,
}) {
  const { t } = useTranslation('components');
  const { curationTypes, curationTypesDict } = useDifficultyContext();
  const groups = useMemo(() => groupCurationTypesForRating(curationTypes), [curationTypes]);
  const chartOptions = useMemo(() => groups.chart.map(typeOption), [groups.chart]);
  const vfxOptions = useMemo(() => groups.vfx.map(typeOption), [groups.vfx]);
  const selectedMisc = useMemo(
    () => new Set((miscTypeIds || []).map((id) => Number(id))),
    [miscTypeIds],
  );
  const requested = useMemo(() => requestedBucketSet(requestedBuckets), [requestedBuckets]);
  const chartInputValue = allowRange
    ? (chartRating || formatCurationRangeLabel(chartTypeId, chartTypeHighId, curationTypesDict))
    : '';
  const vfxInputValue = allowRange
    ? (vfxRating || formatCurationRangeLabel(vfxTypeId, vfxTypeHighId, curationTypesDict))
    : '';

  const fieldClass = (bucket) =>
    requested && !requested.has(bucket)
      ? 'curation-rating-picks__field is-not-requested'
      : 'curation-rating-picks__field';

  const fieldLabel = (key, bucket) => (
    <label className="curation-rating-picks__field-label">
      <span>{t(key)}</span>
      {requested && !requested.has(bucket) && (
        <span className="curation-rating-picks__hint">
          {t('rating.detailPopup.curation.notRequested')}
        </span>
      )}
    </label>
  );

  return (
    <div className="curation-rating-picks">
      <div className={fieldClass('chart')}>
        {fieldLabel('rating.detailPopup.curation.chart', 'chart')}
        <div className="curation-rating-picks__select-row">
          {allowRange ? (
            <RatingInput
              value={chartInputValue}
              onChange={(value) => onChartRatingChange?.(value)}
              difficulties={groups.chart}
              allowCustomInput
              disabled={disabled}
              placeholder={t('rating.detailPopup.curation.chartPlaceholder')}
            />
          ) : (
            <>
              <CustomSelect
                options={chartOptions}
                value={chartOptions.find((option) => option.value === chartTypeId) || null}
                onChange={(option) => onChartChange(option?.value ?? null)}
                isClearable
                isDisabled={disabled}
                width="100%"
                formatOptionLabel={formatTypeOption}
                placeholder={t('rating.detailPopup.curation.chartPlaceholder')}
              />
              <TypeIcon type={curationTypesDict?.[chartTypeId]} />
            </>
          )}
        </div>
      </div>
      <div className={fieldClass('vfx')}>
        {fieldLabel('rating.detailPopup.curation.vfx', 'vfx')}
        <div className="curation-rating-picks__select-row">
          {allowRange ? (
            <RatingInput
              value={vfxInputValue}
              onChange={(value) => onVfxRatingChange?.(value)}
              difficulties={groups.vfx}
              allowCustomInput
              disabled={disabled}
              placeholder={t('rating.detailPopup.curation.vfxPlaceholder')}
            />
          ) : (
            <>
              <CustomSelect
                options={vfxOptions}
                value={vfxOptions.find((option) => option.value === vfxTypeId) || null}
                onChange={(option) => onVfxChange(option?.value ?? null)}
                isClearable
                isDisabled={disabled}
                width="100%"
                formatOptionLabel={formatTypeOption}
                placeholder={t('rating.detailPopup.curation.vfxPlaceholder')}
              />
              <TypeIcon type={curationTypesDict?.[vfxTypeId]} />
            </>
          )}
        </div>
      </div>
      <div className={fieldClass('misc')}>
        {fieldLabel('rating.detailPopup.curation.misc', 'misc')}
        <div className="curation-rating-picks__chips">
          {groups.misc.map((type) => {
            const selected = selectedMisc.has(Number(type.id));
            return (
              <button
                key={type.id}
                type="button"
                className={`curation-rating-picks__chip${selected ? ' is-selected' : ''}`}
                disabled={disabled}
                onClick={() => onMiscToggle(type.id)}
              >
                <TypeIcon type={type} />
                <span>{type.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
