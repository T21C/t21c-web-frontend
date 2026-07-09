import { useCallback, useEffect, useState } from "react";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { userAvatarDisplayUrl } from "@/utils/playerAvatarDisplay";

const cache = new Map();

export function invalidateNomineeCandidates(levelId) {
  if (levelId != null) cache.delete(String(levelId));
}

export function useNomineeCandidates(levelId) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!levelId) {
      setCandidates([]);
      setLoading(false);
      setError(false);
      return;
    }

    const key = String(levelId);
    const cached = cache.get(key);
    if (cached) {
      setCandidates(cached);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get(routes.admin.tournaments.nomineeCandidates(levelId));
      const list = Array.isArray(data) ? data : [];
      cache.set(key, list);
      setCandidates(list);
    } catch {
      setCandidates([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [levelId]);

  useEffect(() => {
    load();
  }, [load]);

  return { candidates, loading, error, reload: load };
}

export function getNomineeDisplayName(candidate) {
  return (
    candidate?.creatorName ||
    candidate?.name ||
    candidate?.creator?.name ||
    (candidate?.creatorId != null ? `#${candidate.creatorId}` : "")
  );
}

export function resolveSelectedNominees(candidates, creditedCreatorIds) {
  if (!candidates.length) return [];
  if (creditedCreatorIds === null) return candidates;
  if (!Array.isArray(creditedCreatorIds) || !creditedCreatorIds.length) return [];
  const idSet = new Set(creditedCreatorIds);
  return candidates.filter((c) => idSet.has(c.creatorId ?? c.id));
}

export function nomineeHasDisplayAvatar(candidate) {
  return Boolean(userAvatarDisplayUrl(candidate));
}

/** Puts nominees with profile pictures first while preserving relative order. */
export function sortNomineesForAvatarStack(nominees) {
  if (nominees.length <= 1) return nominees;

  const withAvatar = [];
  const withoutAvatar = [];

  for (const nominee of nominees) {
    if (nomineeHasDisplayAvatar(nominee)) withAvatar.push(nominee);
    else withoutAvatar.push(nominee);
  }

  return [...withAvatar, ...withoutAvatar];
}
