// tuf-search: #MySubmissionRow #mySubmissions
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { formatAccuracyRatio, formatFloat } from '@/utils/statFormatters';
import { ICON_SIZE, formatDate, formatTimeAgo, selectIconSize } from '@/utils/Utility';

function safeCssColor(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (
    /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ||
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/.test(trimmed) ||
    /^[a-zA-Z]{3,20}$/.test(trimmed)
  ) {
    return trimmed;
  }
  return undefined;
}

function difficultyFact(key, label, difficulty) {
  if (!difficulty?.name) return null;
  return {
    key,
    label,
    value: difficulty.name,
    color: safeCssColor(difficulty.color),
  };
}

function catalogDifficulty(difficulties, name) {
  if (!name || !Array.isArray(difficulties)) return null;
  const target = String(name).trim().toLowerCase();
  if (!target) return null;
  return difficulties.find((diff) => diff?.name?.trim().toLowerCase() === target) || null;
}

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
 *   passHref: string | null,
 *   workshopLink: string | null,
 *   downloadLink: string | null,
 *   extra?: Record<string, unknown>,
 * } }} props
 */
const MySubmissionRow = ({ submission }) => {
  const { t, i18n } = useTranslation('pages');
  const { difficulties } = useDifficultyContext();
  const extra = submission.extra || {};
  const title = submission.title || `#${submission.id}`;
  const sideDifficulty = submission.kind === 'pass'
    ? extra.difficulty
    : (extra.publishedDifficulty || catalogDifficulty(difficulties, extra.requestedDiff));
  const sideIcon = sideDifficulty?.icon
    ? selectIconSize(sideDifficulty.icon, ICON_SIZE.MEDIUM)
    : null;
  const facts = [];

  if (submission.kind === 'pass') {
    if (Number.isFinite(Number(extra.scoreV2))) {
      facts.push({
        key: 'score',
        label: t('mySubmissions.row.score'),
        value: formatFloat(extra.scoreV2),
      });
    }
    if (Number.isFinite(Number(extra.accuracy))) {
      facts.push({
        key: 'accuracy',
        label: t('mySubmissions.row.accuracy'),
        value: formatAccuracyRatio(extra.accuracy),
      });
    }
    if (Number.isFinite(Number(extra.speed)) && Number(extra.speed) !== 1) {
      facts.push({
        key: 'speed',
        label: t('mySubmissions.row.speed'),
        value: t('mySubmissions.row.speedValue', { value: formatFloat(extra.speed, 2) }),
      });
    }
    const difficulty = difficultyFact(
      'difficulty',
      t('mySubmissions.row.difficulty'),
      extra.difficulty,
    );
    if (difficulty) facts.push(difficulty);
  } else {
    if (extra.charter) {
      facts.push({
        key: 'charter',
        label: t('mySubmissions.row.charter'),
        value: extra.charter,
      });
    }
    if (extra.requestedDiff) {
      facts.push({
        key: 'requested',
        label: t('mySubmissions.row.requestedDiff'),
        value: extra.requestedDiff,
      });
    }
    const rated = difficultyFact(
      'rated',
      t('mySubmissions.row.rated'),
      extra.publishedDifficulty,
    );
    if (rated) facts.push(rated);
  }

  const links = [];
  if (submission.href) {
    links.push({
      key: 'level',
      to: submission.href,
      label: t('mySubmissions.row.openLevel'),
      primary: true,
    });
  }
  if (submission.passHref) {
    links.push({
      key: 'pass',
      to: submission.passHref,
      label: t('mySubmissions.row.openPass'),
      primary: true,
    });
  }
  if (submission.videoLink) {
    links.push({
      key: 'video',
      href: submission.videoLink,
      label: t('mySubmissions.row.watchVideo'),
    });
  }
  if (submission.workshopLink) {
    links.push({
      key: 'workshop',
      href: submission.workshopLink,
      label: t('mySubmissions.row.workshop'),
    });
  }
  if (submission.downloadLink) {
    links.push({
      key: 'download',
      href: submission.downloadLink,
      label: t('mySubmissions.row.download'),
    });
  }

  return (
    <article className={`my-submissions-page__row is-status-${submission.status}`}>
      <div className="my-submissions-page__diff">
        {sideIcon && (
          <img
            className="my-submissions-page__diff-icon"
            src={sideIcon}
            alt={sideDifficulty?.name || ''}
          />
        )}
      </div>
      <div className="my-submissions-page__identity">
        <div className="my-submissions-page__badges">
          <span className={`my-submissions-page__badge is-kind-${submission.kind}`}>
            {t(`mySubmissions.types.${submission.kind}`)}
          </span>
          <span className={`my-submissions-page__badge is-status-${submission.status}`}>
            {t(`mySubmissions.status.${submission.status}`)}
          </span>
        </div>
        <div className="my-submissions-page__copy">
          <h3 className="my-submissions-page__row-title" title={title}>
            {submission.href && (
              <Link className="my-submissions-page__title-link" to={submission.href}>
                {title}
              </Link>
            )}
            {!submission.href && title}
          </h3>
          {submission.artist && (
            <p className="my-submissions-page__row-artist" title={submission.artist}>
              {submission.artist}
            </p>
          )}
        </div>
      </div>

      <dl className="my-submissions-page__facts">
        {facts.map((fact) => (
          <div key={fact.key} className="my-submissions-page__fact">
            <dt className="my-submissions-page__fact-label">{fact.label}</dt>
            <dd
              className="my-submissions-page__fact-value"
              title={fact.value}
              style={fact.color ? { color: fact.color } : undefined}
            >
              <span className="my-submissions-page__fact-text">{fact.value}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="my-submissions-page__links">
        {links.map((link) => {
          const className = link.primary
            ? 'btn-fill-accent btn-sm'
            : 'btn-fill-glass btn-sm';
          if (link.to) {
            return (
              <Link key={link.key} className={className} to={link.to}>
                {link.label}
              </Link>
            );
          }
          return (
            <a
              key={link.key}
              className={className}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          );
        })}
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
