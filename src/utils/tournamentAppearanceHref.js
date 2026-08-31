// tuf-search: #tournamentAppearanceHref
/**
 * Public catalog URL helpers. Keep this file free of path aliases so node:test can import it.
 */

/**
 * @param {string | null | undefined} packRef
 * @returns {string | null}
 */
export function resolvePackHref(packRef) {
  if (!packRef) return null;
  return `/packs/${encodeURIComponent(String(packRef))}`;
}

/**
 * @param {{ id?: number | string | null } | null | undefined} tournament
 * @returns {string | null}
 */
export function resolveTournamentPageHref(tournament) {
  const id = Number(tournament?.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return `/tournaments/${id}`;
}

/**
 * @param {any} appearance
 * @returns {{ href: string | null, external: boolean }}
 */
export function resolveTournamentAppearanceHref(appearance) {
  const tournament = appearance?.tournament;
  if (!tournament) return { href: null, external: false };

  const pageHref = resolveTournamentPageHref(tournament);
  if (pageHref) return { href: pageHref, external: false };

  const packHref = resolvePackHref(tournament.packRef);
  if (packHref) return { href: packHref, external: false };

  const externalUrl =
    typeof tournament.externalUrl === "string" && tournament.externalUrl.trim()
      ? tournament.externalUrl.trim()
      : null;
  if (externalUrl) return { href: externalUrl, external: true };

  const youtubeUrl =
    typeof tournament.youtubeUrl === "string" && tournament.youtubeUrl.trim()
      ? tournament.youtubeUrl.trim()
      : null;
  if (youtubeUrl) return { href: youtubeUrl, external: true };

  return { href: null, external: false };
}
