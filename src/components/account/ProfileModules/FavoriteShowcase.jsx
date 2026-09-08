import { useMemo } from "react";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { ChevronIcon } from "@/components/common/icons";
import { LevelCard, ScoreCard, PackCard, PlayerCard } from "@/components/cards";
import { useLevelsByIds, usePassesByIds } from "@/hooks/useFeaturedEntitiesByIds";
import { useTranslation } from "react-i18next";
import "./profileModules.css";

function ShowcaseItem({ item, levelById, passById, levelsLoading, passesLoading }) {
  if (item.kind === "pass") {
    const pass = passById.get(item.id) || (passesLoading ? null : item.pass);
    if (!pass) return null;
    return <ScoreCard scoreData={pass} mode="featured" />;
  }
  if (item.kind === "level") {
    const level = levelById.get(item.id) || (levelsLoading ? null : item.level);
    if (!level) return null;
    return (
      <LevelCard
        level={level}
        displayMode="featured"
      />
    );
  }
  if (item.kind === "pack" && item.pack) {
    return (
      <PackCard
        packId={item.pack.id}
        pack={item.pack}
        displayMode="showcase"
      />
    );
  }
  if (item.kind === "player" && item.player) {
    return <PlayerCard player={item.player} displayMode="showcase" />;
  }
  return null;
}

export default function FavoriteShowcase({
  items = [],
  collapsed,
  onCollapsedChange,
  sectionClassName = "player-page__section",
}) {
  const { t } = useTranslation(["pages", "common"]);
  const expanded = !collapsed;
  const levelIds = useMemo(
    () => items.filter((item) => item.kind === "level").map((item) => item.id),
    [items],
  );
  const passIds = useMemo(
    () => items.filter((item) => item.kind === "pass").map((item) => item.id),
    [items],
  );
  const { byId: levelById, loading: levelsLoading } = useLevelsByIds(levelIds);
  const { byId: passById, loading: passesLoading } = usePassesByIds(passIds);
  const loading =
    (levelIds.length > 0 && levelsLoading) || (passIds.length > 0 && passesLoading);

  return (
    <section className={sectionClassName}>
      <div className="profile-showcase">
        <div className="account-profile-page__section-title-row">
          <h2 className="account-profile-page__section-title">
            {t("profile.modules.types.favorite")}
          </h2>
          <button
            type="button"
            className="account-profile-page__chevron-btn"
            aria-expanded={expanded}
            aria-label={
              collapsed
                ? t("profile.modules.expandFavorite")
                : t("profile.modules.collapseFavorite")
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
            <div className="account-profile-page__collapsible profile-showcase__list">
              {loading ? (
                <p className="profile-showcase__loading">
                  {t("loading.generic", { ns: "common" })}
                </p>
              ) : null}
              {items.map((item) => {
                if (item.kind === "level" && levelsLoading && !levelById.has(item.id)) {
                  return null;
                }
                if (item.kind === "pass" && passesLoading && !passById.has(item.id)) {
                  return null;
                }
                return (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="profile-showcase__row"
                  >
                    <ShowcaseItem
                      item={item}
                      levelById={levelById}
                      passById={passById}
                      levelsLoading={levelsLoading}
                      passesLoading={passesLoading}
                    />
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
}
