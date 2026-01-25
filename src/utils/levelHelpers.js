/**
 * Level dependency pipeline utilities
 * Provides backward compatibility for levels that haven't been migrated yet
 * Pattern: newObject || oldProperty
 */

/**
 * Get song name from level with fallback
 * @param {Object} level - Level object
 * @returns {string} Song name or empty string
 */
export const getSongName = (level) => {
  if (!level) return '';
  return level.songObject?.name || level.song || '';
};

/**
 * Get artist object from level with fallback
 * Returns the full artistObject if available, otherwise creates a minimal object from legacy artist string
 * @param {Object} level - Level object
 * @returns {Object|null} Artist object or null
 */
export const getArtists = (level) => {
  if (!level) return null;
  if (level.artists) return level.artists;
  return null;
};

export const getArtistDisplayName = (level) => {
  if (!level) return '';
  return getArtists(level)?.map(artist => artist.name).join(', ') || level.artist;
};


/**
 * Get full song display name with suffix if applicable
 * @param {Object} level - Level object
 * @returns {string} Song name with suffix or just song name
 */
export const getSongDisplayName = (level) => {
  if (!level) return '';
  const songName = getSongName(level);
  if (level.suffix && songName && level.songObject) {
    return `${songName} ${level.suffix}`;
  } else {
    return songName;
  }
};
