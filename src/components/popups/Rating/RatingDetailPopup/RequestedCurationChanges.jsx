// tuf-search: #RequestedCurationChanges #curationRating
import './requestedcurationchanges.css';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { requestedCurationTypesByBucket } from '@/utils/curationTypeFamilies';
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';

const COLUMNS = [
  { bucket: 'chart', key: 'columnChart', fallback: 'C' },
  { bucket: 'vfx', key: 'columnVfx', fallback: 'V' },
  { bucket: 'misc', key: 'columnMisc', fallback: 'Misc' },
];

export function RequestedCurationChanges({ requests, compact = false }) {
  const { t } = useTranslation('components');
  const { curationTypesDict } = useDifficultyContext();
  const grouped = useMemo(
    () => requestedCurationTypesByBucket(requests, curationTypesDict),
    [requests, curationTypesDict],
  );
  const hasAny = grouped.chart.length + grouped.vfx.length + grouped.misc.length > 0;

  if (!hasAny) return null;

  return (
    <div
      className={`requested-curation-changes${compact ? ' requested-curation-changes--compact' : ''}`}
    >
      <div className="requested-curation-changes__columns">
        {COLUMNS.map((column) => (
          <div key={column.bucket} className="requested-curation-changes__column">
            <p className="requested-curation-changes__column-title">
              {t(`rating.detailPopup.curation.${column.key}`, { defaultValue: column.fallback })}
            </p>
            <div className="requested-curation-changes__types">
              {grouped[column.bucket].map(({ type, change }) => {
                const changePrefix = change === 'add' ? '+' : change === 'remove' ? '−' : '';
                return (
                  <span
                    key={type.id}
                    className={`requested-curation-changes__type${change === 'add' ? ' is-add' : ''}${change === 'remove' ? ' is-remove' : ''}`}
                    title={`${changePrefix ? `${changePrefix} ` : ''}${type.name || ''}`.trim()}
                  >
                    <span className="requested-curation-changes__type-mark">
                      <span className="requested-curation-changes__change" aria-hidden="true">
                        {changePrefix}
                      </span>
                      {type.icon ? (
                        <img
                          src={selectIconSize(type.icon, ICON_SIZE.SMALL)}
                          alt=""
                        />
                      ) : (
                        <span className="requested-curation-changes__type-fallback">
                          {type.name}
                        </span>
                      )}
                    </span>
                    {!!type.icon && (
                      <span className="requested-curation-changes__type-name">{type.name}</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
