// tuf-search: #youtubeChannel #youtubeVideoMatch

/**
 * @param {{ channelId: string, handle?: string | null }} channel
 */
export function youtubeChannelUrl(channel) {
  const handle = typeof channel?.handle === 'string' ? channel.handle.trim() : '';
  if (handle) {
    return `https://www.youtube.com/@${handle.replace(/^@/, '')}`;
  }
  return `https://www.youtube.com/channel/${channel.channelId}`;
}

/**
 * Green (submitter) wins when both identities match.
 * @returns {'submitter' | 'player' | null}
 */
export function resolveYoutubeVideoMatch({
  videoChannelId,
  submitterChannelIds = [],
  assignedPlayerChannelIds = [],
} = {}) {
  const id = typeof videoChannelId === 'string' ? videoChannelId.trim() : '';
  if (!id) return null;
  if (Array.isArray(submitterChannelIds) && submitterChannelIds.includes(id)) {
    return 'submitter';
  }
  if (Array.isArray(assignedPlayerChannelIds) && assignedPlayerChannelIds.includes(id)) {
    return 'player';
  }
  return null;
}

export function sortYoutubeChannels(channels) {
  if (!Array.isArray(channels)) return [];
  return [...channels].sort((a, b) => {
    if (a.isPrimary === b.isPrimary) return 0;
    return a.isPrimary ? -1 : 1;
  });
}

/**
 * Mirrors server `youtubeChannelLinkingEnabled` on the auth user.
 * @param {{ youtubeChannelLinkingEnabled?: boolean } | null | undefined} user
 */
export function isYoutubeChannelLinkingEnabledForUser(user) {
  return Boolean(user?.youtubeChannelLinkingEnabled);
}
