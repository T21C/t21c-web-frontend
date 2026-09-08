import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { ChevronIcon, SortAscIcon, SortDescIcon, EyeIcon, EyeOffIcon } from "@/components/common/icons";
import { CustomSelect } from "@/components/common/selectors";
import { VirtualList } from "@/components/common/VirtualList";
import { ScoreCard } from "@/components/cards";
import { useTranslation, Trans } from "react-i18next";

export default function PlayerScoresModule({
  collapsed,
  onCollapsedChange,
  scoresScrollRef,
  scoresScrollParent,
  searchQuery,
  onSearchQueryChange,
  sortOptions,
  selectedSortOption,
  onSortTypeChange,
  sortOrder,
  onSortOrderChange,
  hideReclears,
  onHideReclearsChange,
  isOwnProfile,
  showHiddenPasses,
  onToggleHiddenPasses,
  passesTotal,
  passesInitialLoading,
  displayedPasses,
  loadMorePasses,
  hasMore,
  playerData,
  lowestImpactScore,
  sortType,
  normalizePassSearchQuery,
}) {
  const { t } = useTranslation("pages");
  const expanded = !collapsed;
  return (
    <div className="scores-section">
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">{t("profile.sections.scores.title")}</h2>
        <button
          type="button"
          className="account-profile-page__chevron-btn"
          aria-expanded={expanded}
          aria-label={
            collapsed
              ? t("profile.sections.scores.expand", { defaultValue: "Expand scores" })
              : t("profile.sections.scores.collapse", { defaultValue: "Collapse scores" })
          }
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <ChevronIcon direction={expanded ? "down" : "right"} />
        </button>
      </div>
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => onCollapsedChange(!open)}
        revealOverflow
        duration="0.3s"
        easing="ease-in-out"
      >
        <CollapsibleContent>
          <div
            id="player-scores-scroll-container"
            ref={scoresScrollRef}
            className="player-page__scores-container"
          >
            <div className="scores-controls">
              <div className="search-container">
                <svg
                  className="search-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder={t("profile.search.placeholder")}
                  name="search"
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(normalizePassSearchQuery(e.target.value))}
                />
              </div>
              <div className="scores-controls-row">
                <div className="sort-controls">
                  <CustomSelect
                    options={sortOptions}
                    value={selectedSortOption}
                    onChange={(option) => onSortTypeChange(option.value)}
                    width="12rem"
                    menuPlacement="bottom"
                    isSearchable={false}
                  />
                  <div className="sort-buttons">
                    <SortAscIcon
                      className="svg-fill"
                      style={{
                        backgroundColor: sortOrder === "ASC" ? "rgba(255, 255, 255, 0.4)" : "",
                      }}
                      onClick={() => onSortOrderChange("ASC")}
                    />
                    <SortDescIcon
                      className="svg-fill"
                      style={{
                        backgroundColor: sortOrder === "DESC" ? "rgba(255, 255, 255, 0.4)" : "",
                      }}
                      onClick={() => onSortOrderChange("DESC")}
                    />
                  </div>
                </div>
                <div className="scores-controls-row__actions">
                  <label className="scores-hide-reclears-toggle">
                    <input
                      type="checkbox"
                      checked={hideReclears}
                      onChange={(e) => onHideReclearsChange(e.target.checked)}
                    />
                    <span>{t("profile.sections.scores.hideReclears")}</span>
                  </label>
                  {isOwnProfile && (
                    <button
                      className="toggle-hidden-passes-button"
                      onClick={onToggleHiddenPasses}
                      title={showHiddenPasses ? t("profile.hideHiddenPasses") : t("profile.showHiddenPasses")}
                    >
                      {showHiddenPasses ? <EyeIcon size="20px" /> : <EyeOffIcon size="20px" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="results-count">
                {t("profile.labels.totalPasses", { count: passesTotal })}
              </div>
            </div>
            {passesInitialLoading && displayedPasses.length === 0 ? (
              <div className="scores-section__list-loading" aria-busy="true" aria-live="polite">
                <div className="loader loader-relative" />
              </div>
            ) : (
              <VirtualList
                customScrollParent={scoresScrollParent}
                items={displayedPasses}
                loadMore={loadMorePasses}
                hasMore={hasMore}
                listClassName="scores-list"
                endMessage={
                  displayedPasses.length > 0 && (
                    <p style={{ textAlign: "center", padding: "1rem", color: "rgba(255, 255, 255, 0.6)" }}>
                      <b>{t("profile.infiniteScroll.end")}</b>
                    </p>
                  )
                }
                loader={<div className="loader loader-relative" />}
                style={{ overflow: "visible", paddingBottom: "6rem" }}
                renderItem={(score) => (
                  <div>
                    <li>
                      <ScoreCard
                        scoreData={score}
                        topScores={playerData?.topScores || []}
                        potentialTopScores={playerData?.potentialTopScores || []}
                      />
                    </li>
                    {lowestImpactScore &&
                      lowestImpactScore.id === score.id &&
                      passesTotal > 20 &&
                      sortType === "score" &&
                      sortOrder === "DESC" && (
                        <div className="lowest-impact-score-indicator">
                          <p>
                            <Trans
                              t={t}
                              i18nKey="profile.sections.scores.lowestImpactScore"
                              values={{
                                score: `${(Number(score.scoreV2) + 0.01).toFixed(2)}PP`,
                              }}
                              components={{ pp: <b style={{ color: "#0f0" }} /> }}
                            />
                          </p>
                        </div>
                      )}
                  </div>
                )}
                computeItemKey={(index, score) => score?.id ?? index}
              />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
