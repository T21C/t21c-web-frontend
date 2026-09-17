// tuf-search: #ratingAccuracy
import { isAutoraterDetail } from '@/pages/admin/RatingPage/RankReadyTable';

export const RATING_ACCURACY_PROVISIONAL_N = 10;

export function careerForDetail(detail, stats = []) {
  const userId = detail?.userId || detail?.user?.id;
  if (!userId || !Array.isArray(stats)) return null;
  const isCommunity = Boolean(detail?.isCommunityRating);
  return (
    stats.find(
      (row) => row.userId === userId && Boolean(row.isCommunityRating) === isCommunity
    ) || null
  );
}

export function compareAccuracyDetails(a, b, stats = []) {
  const aBot = isAutoraterDetail(a);
  const bBot = isAutoraterDetail(b);
  if (aBot !== bBot) return aBot ? 1 : -1;
  if (aBot && bBot) return 0;

  const ca = careerForDetail(a, stats);
  const cb = careerForDetail(b, stats);
  const aProv = !ca || (ca.pguN ?? 0) < RATING_ACCURACY_PROVISIONAL_N;
  const bProv = !cb || (cb.pguN ?? 0) < RATING_ACCURACY_PROVISIONAL_N;
  if (aProv !== bProv) return aProv ? 1 : -1;

  const shrunkA = Number(ca?.pguShrunkMean ?? 0.5);
  const shrunkB = Number(cb?.pguShrunkMean ?? 0.5);
  if (shrunkB !== shrunkA) return shrunkB - shrunkA;
  return (Number(cb?.pguN ?? 0) - Number(ca?.pguN ?? 0));
}

export function formatAccuracyScore(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${Math.round(Number(value) * 100)}%`;
}

export function accuracyModeLabel(sample, t) {
  if (!sample) return '';
  const chart = sample.chart || {};
  const settled = chart.settledName || '';
  if (sample.scoringMode === 'q') {
    return t('rating.detailPopup.accuracy.modeQ', {
      settled,
      defaultValue: '{{settled}}',
    });
  }
  if (sample.scoringMode === 'special') {
    return t('rating.detailPopup.accuracy.modeSpecial', {
      settled,
      defaultValue: '{{settled}} special',
    });
  }
  const center = chart.centerName || settled;
  return t('rating.detailPopup.accuracy.modeRank', {
    center,
    defaultValue: '{{center}} precise',
  });
}

export function accuracyMappingLabel(sample, t) {
  if (!sample) return '';
  const ranks = sample.chart?.scoredRankNames || [];
  const specials = sample.chart?.specialTokens || [];
  if (sample.track === 'special') {
    return t('rating.detailPopup.accuracy.scoredAs', {
      value: specials.join(', ') || sample.frozenRating,
      defaultValue: 'Scored as {{value}}',
    });
  }
  if (ranks.length === 1) {
    return t('rating.detailPopup.accuracy.scoredAs', {
      value: ranks[0],
      defaultValue: 'Scored as {{value}}',
    });
  }
  if (ranks.length > 1) {
    return t('rating.detailPopup.accuracy.scoredAs', {
      value: `${ranks[0]}–${ranks[ranks.length - 1]}`,
      defaultValue: 'Scored as {{value}}',
    });
  }
  return t('rating.detailPopup.accuracy.scoredAs', {
    value: sample.frozenRating || '—',
    defaultValue: 'Scored as {{value}}',
  });
}
