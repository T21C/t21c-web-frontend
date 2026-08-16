// tuf-search: #MySubmissionRow #mySubmissions
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatAccuracyRatio, formatFloat } from '@/utils/statFormatters';
import { formatDate, formatTimeAgo } from '@/utils/Utility';

/**
 * @param {{ submission: {
 *   kind: 'pass' | 'level',
 *   id: number,
 *   status: 'pending' | 'approved' | 'declined',
 *   createdAt: string,
 *   videoLink: string | null,
 *   title: string,
 *   artist: string | null,
 *   href: string | null,
 *   extra?: Record<string, unknown>,
 * } }} props
 */
const MySubmissionRow = ({ submission }) => {
  const { t, i18n } = useTranslation('pages');
  const extra = submission.extra || {};
  const extras = [];

  if (submission.kind === 'pass') {
    if (Number.isFinite(Number(extra.scoreV2))) {
      extras.push(
        t('mySubmissions.row.score', { value: formatFloat(extra.scoreV2) }),
      );
    }
    if (Number.isFinite(Number(extra.accuracy))) {
      extras.push(
        t('mySubmissions.row.accuracy', {
          value: formatAccuracyRatio(extra.accuracy),
        }),
      );
    }
    if (Number.isFinite(Number(extra.speed)) && Number(extra.speed) !== 1) {
      extras.push(
        t('mySubmissions.row.speed', { value: formatFloat(extra.speed, 2) }),
      );
    }
    if (extra.difficulty?.name) extras.push(extra.difficulty.name);
  } else {
    if (extra.charter) {
      extras.push(t('mySubmissions.row.charter', { name: extra.charter }));
    }
    if (extra.requestedDiff) {
      extras.push(
        t('mySubmissions.row.requestedDiff', { diff: extra.requestedDiff }),
      );
    }
  }

  return (
    <article className="my-submissions-page__row">
      <div className="my-submissions-page__row-main">
        <div className="my-submissions-page__badges">
          <span className={`my-submissions-page__badge is-kind-${submission.kind}`}>
            {t(`mySubmissions.types.${submission.kind}`)}
          </span>
          <span className={`my-submissions-page__badge is-status-${submission.status}`}>
            {t(`mySubmissions.status.${submission.status}`)}
          </span>
        </div>
        <div className="my-submissions-page__copy">
          <h3 className="my-submissions-page__row-title">
            {submission.title || `#${submission.id}`}
          </h3>
          {submission.artist ? (
            <p className="my-submissions-page__row-artist">{submission.artist}</p>
          ) : null}
          {extras.length ? (
            <p className="my-submissions-page__row-extra">{extras.join(' · ')}</p>
          ) : null}
        </div>
        <div className="my-submissions-page__row-actions">
          {submission.videoLink ? (
            <a
              className="my-submissions-page__row-link"
              href={submission.videoLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('mySubmissions.row.watchVideo')}
            </a>
          ) : null}
          {submission.href ? (
            <Link className="my-submissions-page__row-link" to={submission.href}>
              {t('mySubmissions.row.openLevel')}
            </Link>
          ) : null}
        </div>
      </div>
      <time
        className="my-submissions-page__row-date"
        dateTime={submission.createdAt}
        title={formatDate(submission.createdAt, i18n.language)}
      >
        {formatTimeAgo(submission.createdAt, i18n.language)}
      </time>
    </article>
  );
};

export default MySubmissionRow;
