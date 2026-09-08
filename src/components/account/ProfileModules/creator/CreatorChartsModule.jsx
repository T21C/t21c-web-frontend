import { LevelContextProvider } from "@/contexts/LevelContext";
import CreatorChartsSection from "@/pages/account/CreatorProfilePage/CreatorChartsSection";

export default function CreatorChartsModule({
  creatorId,
  creatorName,
  levelsCollapsed,
  setLevelsCollapsed,
  levelsScrollRef,
  levelsScrollParent,
  embeddedHiddenFilters,
}) {
  return (
    <section className="creator-profile-page__section creator-profile-page__section--levels">
      <LevelContextProvider key={creatorId} storagePrefix={`creator_${creatorId}_`}>
        <CreatorChartsSection
          creatorName={creatorName}
          levelsCollapsed={levelsCollapsed}
          setLevelsCollapsed={setLevelsCollapsed}
          levelsScrollRef={levelsScrollRef}
          levelsScrollParent={levelsScrollParent}
          embeddedHiddenFilters={embeddedHiddenFilters}
        />
      </LevelContextProvider>
    </section>
  );
}
