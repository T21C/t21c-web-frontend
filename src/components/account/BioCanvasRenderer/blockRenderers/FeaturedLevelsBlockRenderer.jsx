import { useEffect, useState } from "react";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import LevelCard from "@/components/cards/LevelCard/LevelCard";
import ScoreCard from "@/components/cards/ScoreCard/ScoreCard";

/** Search language: `|` is OR, `,` is AND. Prefer `id:` over `#` (client-only single-ID shortcut). */
function buildIdOrQuery(ids) {
  return ids.map((id) => `id:${id}`).join(" | ");
}

function orderByIds(rows, ids) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

function LevelList({ ids }) {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ids.length) {
      setLevels([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    api
      .get(routes.database.levels.root(), {
        params: {
          query: buildIdOrQuery(ids),
          limit: ids.length,
          offset: 0,
          deletedFilter: "hide",
        },
        signal: controller.signal,
      })
      .then(({ data }) => {
        setLevels(orderByIds(data?.results ?? [], ids));
        setLoading(false);
      })
      .catch((error) => {
        if (api.isCancel(error)) return;
        setLevels([]);
        setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [ids.join(",")]);

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
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ids.length) {
      setPasses([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    api
      .get(routes.database.passes.root(), {
        params: {
          query: buildIdOrQuery(ids),
          limit: ids.length,
          offset: 0,
          deletedFilter: "hide",
        },
        signal: controller.signal,
      })
      .then(({ data }) => {
        setPasses(orderByIds(data?.results ?? [], ids));
        setLoading(false);
      })
      .catch((error) => {
        if (api.isCancel(error)) return;
        setPasses([]);
        setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [ids.join(",")]);

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
