import { useTranslation } from 'react-i18next';

const FACET_LABEL_KEYS = {
  DIFF: 'facets.diff',
  BASE_SCORE: 'facets.baseScore',
  PP_BASE_SCORE: 'facets.ppBaseScore',
  CURVE: 'facets.curve',
};

const AnnouncementFacetChips = ({ facets = [] }) => {
  const { t } = useTranslation('components');

  if (!facets?.length) return null;

  return (
    <div className="announcement-facet-chips">
      {facets.map(facet => (
        <span key={facet} className="announcement-facet-chip">
          {t(`reratesTab.${FACET_LABEL_KEYS[facet]}`, { defaultValue: facet })}
        </span>
      ))}
    </div>
  );
};

export default AnnouncementFacetChips;
