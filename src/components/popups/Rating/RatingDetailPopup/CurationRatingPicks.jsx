// tuf-search: #CurationRatingPicks #ratingDetailPopup
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';
import { collectCurationPickIds, groupCurationTypesForRating } from '@/utils/curationTypeFamilies';

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

export function CurationPickDisplay({ detail, curationTypesDict }) {
  const ids = collectCurationPickIds(detail);
  if (ids.length === 0) return null;
  const dict = curationTypesDict || {};
  return (
    <span className="curation-pick-display">
      {ids.map((id) => {
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

export function CurationRatingPicks({
  chartTypeId,
  vfxTypeId,
  miscTypeIds,
  onChartChange,
  onVfxChange,
  onMiscToggle,
  disabled = false,
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

  return (
    <div className="curation-rating-picks">
      <div className="curation-rating-picks__field">
        <label>{t('rating.detailPopup.curation.chart')}</label>
        <div className="curation-rating-picks__select-row">
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
        </div>
      </div>
      <div className="curation-rating-picks__field">
        <label>{t('rating.detailPopup.curation.vfx')}</label>
        <div className="curation-rating-picks__select-row">
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
        </div>
      </div>
      <div className="curation-rating-picks__field">
        <label>{t('rating.detailPopup.curation.misc')}</label>
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
