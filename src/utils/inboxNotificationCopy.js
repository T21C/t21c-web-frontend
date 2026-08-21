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
  const vars = { ...payload, song, artist, visibility };
  const type = notification?.type || 'unknown';
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
