// tuf-search: #CreatorChartsSection #creatorProfile #export
import { useCallback, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { LevelContext } from '@/contexts/LevelContext';
import { ChevronIcon, ExternalLinkIcon } from '@/components/common/icons';
import { Collapsible, CollapsibleContent } from '@/components/common/Collapsible';
import { LevelListExportPopup } from '@/components/popups/Levels';
import LevelPage from '@/pages/common/Level/LevelPage/LevelPage';
import {
  buildLevelListExportRows,
  downloadPackExport,
} from '@/utils/packExportUtils';
import {
  buildCreatorLevelExportParams,
  collectLevelsForExport,
} from './collectCreatorLevelExport';

/**
 * Charts collapsible: header (Export as + chevron) outside LevelPage,
 * body embeds LevelPage. Must render under LevelContextProvider.
 */
const CreatorChartsSection = ({
  creatorName,
  levelsCollapsed,
  setLevelsCollapsed,
  levelsScrollRef,
  levelsScrollParent,
  embeddedHiddenFilters,
}) => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const { difficultyDict, curationTypesDict } = useDifficultyContext();
  const [showExportPopup, setShowExportPopup] = useState(false);
  const levelsExpanded = !levelsCollapsed;

  const {
    query,
    sort,
    order,
    deletedFilter,
    clearedFilter,
    availableDlFilter,
    selectedLowFilterDiff,
    selectedHighFilterDiff,
    selectedSpecialDiffs,
    sliderQRange,
    qSliderVisible,
    levelFacetFilters,
    onlyMyLikes,
    totalLevels,
  } = useContext(LevelContext);

  const handleLevelListExport = useCallback(
    async (format, { signal, onProgress }) => {
      const params = buildCreatorLevelExportParams({
        query,
        sort,
        order,
        deletedFilter,
        clearedFilter,
        availableDlFilter,
        selectedLowFilterDiff,
        selectedHighFilterDiff,
        selectedSpecialDiffs,
        sliderQRange,
        qSliderVisible,
        levelFacetFilters,
        onlyMyLikes,
        user,
        hiddenFilters: embeddedHiddenFilters,
      });

      const levels = await collectLevelsForExport({
        params,
        signal,
        onProgress,
      });

      const { headers, rows } = buildLevelListExportRows(levels, {
        difficultyDict,
        curationTypesDict,
        unavailableLabel: t('creators.profile.levels.export.unavailable'),
      });

      await downloadPackExport({
        format,
        packName: `${creatorName || 'creator'}_charts`,
        headers,
        rows,
      });
    },
    [
      query,
      sort,
      order,
      deletedFilter,
      clearedFilter,
      availableDlFilter,
      selectedLowFilterDiff,
      selectedHighFilterDiff,
      selectedSpecialDiffs,
      sliderQRange,
      qSliderVisible,
      levelFacetFilters,
      onlyMyLikes,
      user,
      embeddedHiddenFilters,
      difficultyDict,
      curationTypesDict,
      creatorName,
      t,
    ],
  );

  const exportDisabled = !totalLevels || totalLevels <= 0;

  return (
    <>
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">
          {t('creators.profile.levels.header')}
        </h2>
        <div className="creator-profile-page__levels-header-actions">
          {levelsExpanded ? (
            <button
              type="button"
              className="creator-profile-page__export-btn"
              onClick={() => setShowExportPopup(true)}
              disabled={exportDisabled}
            >
              <ExternalLinkIcon color="#ffffff" size="18px" />
              <span>{t('creators.profile.levels.exportAs')}</span>
            </button>
          ) : null}
          <button
            type="button"
            className="account-profile-page__chevron-btn"
            aria-expanded={levelsExpanded}
            aria-label={
              levelsCollapsed
                ? t('creators.profile.levels.expand')
                : t('creators.profile.levels.collapse')
            }
            onClick={() => setLevelsCollapsed((v) => !v)}
          >
            <ChevronIcon direction={levelsExpanded ? 'down' : 'right'} />
          </button>
        </div>
      </div>

      {/*
        Embed the full LevelPage rather than re-implementing search/sort/filter.
        LevelContextProvider (parent) uses a unique storage prefix per creator.
        The byCreatorId hidden filter scopes results without exposing it in the UI.
      */}
      <Collapsible
        open={!levelsCollapsed}
        onOpenChange={(open) => setLevelsCollapsed(!open)}
        revealOverflow
        duration="0.3s"
        easing="ease-in-out"
      >
        <CollapsibleContent>
          <div
            ref={levelsScrollRef}
            className="creator-profile-page__levels-container"
          >
            <LevelPage
              embedded
              customScrollParent={levelsScrollParent}
              hiddenFilters={embeddedHiddenFilters}
              disabledFeatures={['myLikes']}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <LevelListExportPopup
        isOpen={showExportPopup}
        onClose={() => setShowExportPopup(false)}
        contextName={creatorName}
        onExport={handleLevelListExport}
      />
    </>
  );
};

export default CreatorChartsSection;
