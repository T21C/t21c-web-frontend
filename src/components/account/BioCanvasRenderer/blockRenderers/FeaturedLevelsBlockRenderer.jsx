// tuf-search: #FeaturedLevelsBlockRenderer #featuredLevels
import LevelCard from "@/components/cards/LevelCard/LevelCard";
import ScoreCard from "@/components/cards/ScoreCard/ScoreCard";
import { useLevelsByIds, usePassesByIds } from "@/hooks/useFeaturedEntitiesByIds";

function LevelList({ ids }) {
  const { rows: levels, loading } = useLevelsByIds(ids);

  return (
    <>
      {loading ? <p className="bio-canvas-block__loading">Loading levels…</p> : null}
      <div className="bio-canvas-block__featured-list">
        {levels.map((level) => (
          <LevelCard
            key={level.id}
            level={level}
            displayMode="featured"
            showTags={false}
          />
        ))}
      </div>
    </>
  );
}

function PassList({ ids }) {
  const { rows: passes, loading } = usePassesByIds(ids);

  return (
    <>
      {loading ? <p className="bio-canvas-block__loading">Loading passes…</p> : null}
      <div className="bio-canvas-block__featured-list">
        {passes.map((pass) => (
          <ScoreCard
            key={pass.id}
            scoreData={pass}
            mode="featured"
          />
        ))}
      </div>
    </>
  );
}

export default function FeaturedLevelsBlockRenderer({ block }) {
  const mode = block.data?.mode === "passes" ? "passes" : "levels";
  const levelIds = Array.isArray(block.data?.levelIds) ? block.data.levelIds : [];
  const passIds = Array.isArray(block.data?.passIds) ? block.data.passIds : [];
  const ids = mode === "passes" ? passIds : levelIds;

  if (!ids.length) return null;

  return (
    <div className="bio-canvas-block bio-canvas-block--featured-levels">
      {mode === "passes" ? <PassList ids={passIds} /> : <LevelList ids={levelIds} />}
    </div>
  );
}
