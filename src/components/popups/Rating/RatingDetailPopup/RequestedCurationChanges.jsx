// tuf-search: #RequestedCurationChanges #curationRating
import './requestedcurationchanges.css';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import LevelRequestCurationTypes, {
  LevelRequestCurationDiff,
} from '@/components/requests/LevelRequestCurationTypes';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import {
  orderedRequestedCurationBuckets,
  visibleCurationRequests,
} from '@/utils/curationTypeFamilies';

const GROUP_KEYS = {
  chart: 'groupChart',
  vfx: 'groupVfx',
  misc: 'groupMisc',
};

export function RequestedCurationChanges({ requests, compact = false }) {
  const { t } = useTranslation(['components', 'pages']);
  const { curationTypesDict } = useDifficultyContext();
  const visible = useMemo(() => visibleCurationRequests(requests), [requests]);
  const groupLabels = useMemo(
    () =>
      orderedRequestedCurationBuckets(visible, curationTypesDict).map((bucket) =>
        t(`rating.detailPopup.curation.${GROUP_KEYS[bucket]}`),
      ),
    [visible, curationTypesDict, t],
  );

  if (visible.length === 0) return null;

  return (
    <div
      className={`requested-curation-changes${compact ? ' requested-curation-changes--compact' : ''}`}
    >
      {groupLabels.length > 0 && (
        <p className="requested-curation-changes__groups">
          {t('rating.detailPopup.curation.requested', { groups: groupLabels.join(', ') })}
        </p>
      )}
      {visible.map((request) =>
        request.type === 'curation_rerate' ? (
          <LevelRequestCurationDiff
            key={request.id}
            addIds={request.addCurationTypeIds}
            removeIds={request.removeCurationTypeIds}
          />
        ) : (
          <LevelRequestCurationTypes
            key={request.id}
            ids={request.curationTypeIds}
            variant={compact ? 'icons' : 'display'}
          />
        ),
      )}
    </div>
  );
}
