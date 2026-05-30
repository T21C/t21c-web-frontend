import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/utils/api";
import { routes } from "@/api/routes";

function LevelList({ ids }) {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ids.length) {
      setLevels([]);
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all(
      ids.map(async (id) => {
        try {
          const { data } = await api.get(`${routes.database.levels.root()}/${id}`);
          return data?.level ?? data ?? null;
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      if (!alive) return;
      setLevels(rows.filter(Boolean));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [ids.join(",")]);

  return (
    <>
      {loading ? <p className="bio-canvas-block__loading">Loading levels…</p> : null}
      <div className="bio-canvas-block__featured-list">
        {levels.map((level) => {
          const songName =
            (typeof level.song === "object" && level.song?.name) ||
            (typeof level.song === "string" && level.song) ||
            level.name ||
            `#${level.id}`;
          const artistName =
            (typeof level.artist === "object" && level.artist?.name) ||
            (typeof level.artist === "string" && level.artist) ||
            null;

          return (
            <Link
              key={level.id}
              to={`/levels/${level.id}`}
              className="bio-canvas-block__featured-item"
            >
              <span className="bio-canvas-block__featured-name">{songName}</span>
              {artistName ? (
                <span className="bio-canvas-block__featured-artist">{artistName}</span>
              ) : null}
            </Link>
          );
        })}
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
    let alive = true;
    setLoading(true);
    Promise.all(
      ids.map(async (id) => {
        try {
          const { data } = await api.get(routes.database.passes.byIdPath(id));
          return data?.pass ?? data ?? null;
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      if (!alive) return;
      setPasses(rows.filter(Boolean));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [ids.join(",")]);

  return (
    <>
      {loading ? <p className="bio-canvas-block__loading">Loading passes…</p> : null}
      <div className="bio-canvas-block__featured-list">
        {passes.map((pass) => {
          const songName = pass.level?.song || `#${pass.id}`;
          const playerName = pass.player?.name || null;

          return (
            <Link
              key={pass.id}
              to={`/passes/${pass.id}`}
              className="bio-canvas-block__featured-item"
            >
              <span className="bio-canvas-block__featured-name">{songName}</span>
              {playerName ? (
                <span className="bio-canvas-block__featured-artist">{playerName}</span>
              ) : null}
            </Link>
          );
        })}
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
