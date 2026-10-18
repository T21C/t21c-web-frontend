/** Shared rating-thread actions. New screens should use this instead of inventing a confirm flow. */

export function ratingThreadAction({url, closed}) {
  if (!url) return 'create';
  if (closed) return 'reopen';
  return 'close';
}

export function ratingThreadConfirmMessage(t, {action, ping}) {
  const mark = ping ? t('discordThread.willPing') : t('discordThread.willNotPing');
  if (action === 'reopen') return t('discordThread.confirmReopen', {ping: mark});
  if (action === 'close') return t('discordThread.confirmClose', {ping: mark});
  return t('discordThread.confirmCreate', {ping: mark});
}

export function mergeRatingThreadState(card, next) {
  if (!next) return card;
  if (!card) return next;
  return {
    ...card,
    requesterFR: next.requesterFR,
    discordMessageUrl: next.discordMessageUrl || null,
    discordThreadClosed: Boolean(next.discordThreadClosed),
    discordPostError: next.discordPostError || null,
    isDiscordVote: Boolean(next.isDiscordVote),
    level: card.level ? {...card.level, ...(next.level || {})} : next.level,
  };
}
