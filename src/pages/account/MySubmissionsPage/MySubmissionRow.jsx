// tuf-search: #MySubmissionRow #mySubmissions
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChartIcon, PassIcon } from '@/components/common/icons';
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

const PGU_RANGE = /[PGU](?:20|1[0-9]|[1-9])\s*[-~]\s*[PGU](?:20|1[0-9]|[1-9])/i;

/** First PGU range in the text. Later ranges, including a parenthetical one, are ignored. */
function firstRequestedRange(raw) {
  const match = String(raw || '').match(PGU_RANGE);
  if (!match) return null;
  const [start, end] = match[0].split(/[-~]/).map((part) => part.trim());
  if (!start || !end) return null;
  return [start, end];
}

function difficultyIcon(difficulty) {
  if (!difficulty?.icon) return null;
  return selectIconSize(difficulty.icon, ICON_SIZE.MEDIUM);
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
  const requestedRange = submission.kind === 'level' ? firstRequestedRange(extra.requestedDiff) : null;
  const rangeLow = requestedRange ? catalogDifficulty(difficulties, requestedRange[0]) : null;
  const rangeHigh = requestedRange ? catalogDifficulty(difficulties, requestedRange[1]) : null;
  const lowIcon = difficultyIcon(rangeLow);
  const highIcon = difficultyIcon(rangeHigh);
  const hasRangeIcons = Boolean(lowIcon && highIcon);
  const sideDifficulty = hasRangeIcons
    ? null
    : submission.kind === 'pass'
      ? extra.difficulty
      : (extra.publishedDifficulty || catalogDifficulty(difficulties, extra.requestedDiff));
  const sideIcon = difficultyIcon(sideDifficulty);
  const qqDifficulty = submission.kind === 'level'
    && extra.requestedDiff
    && !hasRangeIcons
    && !sideIcon
    && difficulties.length > 0
    ? catalogDifficulty(difficulties, 'Qq')
    : null;
  const qqIcon = difficultyIcon(qqDifficulty);
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

  const KindIcon = submission.kind === 'pass' ? PassIcon : ChartIcon;

  return (
    <article className={`my-submissions-page__row is-kind-${submission.kind} is-status-${submission.status}`}>
      {(submission.kind === 'pass' || submission.kind === 'level') && (
        <span className="my-submissions-page__kind-watermark" aria-hidden="true">
          <KindIcon size="5.5rem" color="currentColor" />
        </span>
      )}
      <div className="my-submissions-page__diff">
        {hasRangeIcons && (
          <span className="my-submissions-page__diff-stack" aria-label={`${rangeLow.name}–${rangeHigh.name}`}>
            <img
              className="my-submissions-page__diff-icon my-submissions-page__diff-icon--low"
              src={lowIcon}
              alt=""
            />
            <img
              className="my-submissions-page__diff-icon my-submissions-page__diff-icon--high"
              src={highIcon}
              alt=""
            />
          </span>
        )}
        {!hasRangeIcons && sideIcon && (
          <img
            className="my-submissions-page__diff-icon"
            src={sideIcon}
            alt={sideDifficulty?.name || ''}
          />
        )}
        {!hasRangeIcons && !sideIcon && qqIcon && (
          <img
            className="my-submissions-page__diff-icon"
            src={qqIcon}
            alt={qqDifficulty?.name || 'Qq'}
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
