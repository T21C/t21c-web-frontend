import PropTypes from 'prop-types';
import CurationTypeSelector from '@/components/account/CurationTypeSelector/CurationTypeSelector';

/**
 * Creator admin: profile presentation (header badges today; more sections later).
 */
const CreatorProfileTab = ({
  creatorId,
  canEdit,
  curationProfile,
  curationProfileLoading,
  curationTypesDict,
  onBadgesSaved,
  tt,
}) => (
  <div className="creator-profile-tab">

    <section className="creator-profile-tab__section" aria-labelledby="creator-profile-tab-badges-heading">
      <h3 id="creator-profile-tab-badges-heading" className="creator-profile-tab__section-title">
        {tt('profile.headerBadges.title')}
      </h3>
      <p className="creator-profile-tab__section-hint">{tt('profile.headerBadges.hint')}</p>

      {!canEdit ? (
        <p className="creator-profile-tab__readonly">{tt('profile.headerBadges.noPermission')}</p>
      ) : curationProfileLoading && !curationProfile ? (
        <p className="creator-profile-tab__loading">{tt('profile.headerBadges.loading')}</p>
      ) : (
        <CurationTypeSelector
          embeddedSectionLabel={tt('profile.headerBadges.selectorLabel')}
          creatorId={creatorId}
          curationTypeCounts={curationProfile?.curationTypeCounts ?? {}}
          displayCurationTypeIds={curationProfile?.displayCurationTypeIds}
          curationTypesDict={curationTypesDict || {}}
          canEdit={canEdit}
          onSaved={onBadgesSaved}
        />
      )}
    </section>
  </div>
);

CreatorProfileTab.propTypes = {
  creatorId: PropTypes.number.isRequired,
  canEdit: PropTypes.bool.isRequired,
  curationProfile: PropTypes.object,
  curationProfileLoading: PropTypes.bool.isRequired,
  curationTypesDict: PropTypes.object,
  onBadgesSaved: PropTypes.func.isRequired,
  tt: PropTypes.func.isRequired,
};

export default CreatorProfileTab;
