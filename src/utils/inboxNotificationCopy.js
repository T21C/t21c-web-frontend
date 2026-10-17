// tuf-search: #inboxNotificationCopy
/**
 * @param {(key: string, opts?: object) => string} t
 * @param {{ type?: string, payload?: object }} notification
 */
export function inboxNotificationCopy(t, notification) {
  const payload = notification?.payload && typeof notification.payload === 'object'
    ? notification.payload
    : {};
  const song = payload.song || t('notifications.untitledLevel', { levelId: payload.levelId ?? '' });
  const artist = payload.artist || t('notifications.unknownArtist');
  const visibility = payload.isHidden
    ? t('notifications.visibility.hidden')
    : t('notifications.visibility.public');
  const swappedWithSong = payload.swappedWithLevelId
    ? (payload.swappedWithSong || t('notifications.untitledLevel', { levelId: payload.swappedWithLevelId }))
    : payload.swappedWithSong;
  const swappedWithArtist = payload.swappedWithLevelId
    ? (payload.swappedWithArtist || t('notifications.unknownArtist'))
    : payload.swappedWithArtist;
  const vars = {
    ...payload,
    song,
    artist,
    visibility,
    swappedWithSong,
    swappedWithArtist,
  };
  const type = notification?.type || 'unknown';
  if (type === 'request.updated') {
    return {
      ...requestUpdatedCopy(t, payload, vars),
      href: notification?.href || null,
    };
  }
  const reasonText = typeof payload.reason === 'string' ? payload.reason.trim() : '';
  const body = t(`notifications.types.${type}.body`, {
    ...vars,
    defaultValue: t('notifications.unknown.body'),
  });
  const withReason = reasonText
    ? [body, t('notifications.reason', { reason: reasonText })].filter(Boolean).join('\n')
    : body;
  return {
    title: t(`notifications.types.${type}.title`, {
      ...vars,
      defaultValue: t('notifications.unknown.title'),
    }),
    body: withReason,
    href: notification?.href || null,
  };
}

function friendlyToken(value) {
  return String(value || '').replace(/_/g, ' ');
}

function requestSongLabel(payload, t) {
  const base = payload.song || t('notifications.untitledLevel', { levelId: payload.levelId ?? '' });
  const suffix = typeof payload.suffix === 'string' ? payload.suffix.trim() : '';
  if (!suffix || base.includes(suffix)) return base;
  return `${base} ${suffix}`;
}

function requestCopyKey(payload) {
  const status = typeof payload.status === 'string' ? payload.status : '';
  const event = payload.event === 'note' ? 'note' : 'status';
  const hasNote = typeof payload.publicNote === 'string' && payload.publicNote.trim().length > 0;
  const hasActor = typeof payload.actorName === 'string' && payload.actorName.trim().length > 0;
  const hasRating = typeof payload.requestedRating === 'string' && payload.requestedRating.trim().length > 0;
  const hasPrevious = typeof payload.previousDifficulty === 'string' && payload.previousDifficulty.trim().length > 0;
  const hasSettled = typeof payload.settledDifficulty === 'string' && payload.settledDifficulty.trim().length > 0;

  if (event === 'note') return hasActor ? 'noteWithActor' : 'note';
  if (status === 'rejected') {
    if (hasNote && hasActor) return 'rejectedWithNoteAndActor';
    if (hasNote) return 'rejectedWithNote';
    if (hasActor) return 'rejectedWithActor';
    return 'rejected';
  }
  if (status === 'completed_changed') {
    return hasPrevious && hasSettled ? 'completed_changed' : 'completed';
  }
  if (status === 'completed_unchanged') {
    return hasSettled ? 'completed_unchanged' : 'completed';
  }
  if (status === 'added_to_rating_page') {
    return hasRating ? 'added_to_rating_pageWithRating' : 'added_to_rating_page';
  }
  if (
    status === 'accepted'
    || status === 'completed'
    || status === 'discord_vote'
  ) {
    return status;
  }
  return '';
}

function requestUpdatedCopy(t, payload, vars) {
  const status = typeof payload.status === 'string' ? payload.status : '';
  const typedLabel = t(`levelRequests.types.${payload.requestType}`, {
    defaultValue: friendlyToken(payload.requestType) || 'request',
  });
  const requestTypeLabel = typedLabel
    ? typedLabel.charAt(0).toLowerCase() + typedLabel.slice(1)
    : 'request';
  const statusLabel = t(`levelRequests.statuses.${status}`, {
    defaultValue: friendlyToken(status),
  });
  const filled = {
    ...vars,
    song: requestSongLabel(payload, t),
    requestTypeLabel,
    statusLabel,
    publicNote: typeof payload.publicNote === 'string' ? payload.publicNote.trim() : '',
    actorName: typeof payload.actorName === 'string' ? payload.actorName.trim() : '',
    requestedRating: typeof payload.requestedRating === 'string' ? payload.requestedRating.trim() : '',
    previousDifficulty: typeof payload.previousDifficulty === 'string' ? payload.previousDifficulty.trim() : '',
    settledDifficulty: typeof payload.settledDifficulty === 'string' ? payload.settledDifficulty.trim() : '',
  };
  const copyKey = requestCopyKey(payload);
  const title = copyKey
    ? t(`notifications.types.request.updated.${copyKey}.title`, {
      ...filled,
      defaultValue: t('notifications.types.request.updated.title', filled),
    })
    : t('notifications.types.request.updated.title', filled);
  const body = copyKey
    ? t(`notifications.types.request.updated.${copyKey}.body`, {
      ...filled,
      defaultValue: t('notifications.types.request.updated.body', filled),
    })
    : t('notifications.types.request.updated.body', filled);
  return { title, body };
}
