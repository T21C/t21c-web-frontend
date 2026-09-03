import { routes } from '@/api/routes';
// tuf-search: #TournamentDetailPage #tournamentDetailPage #tournament #tournamentDetail — Tournament
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { formatDate } from '@/utils/Utility';
import { getArtistDisplayName, getSongDisplayName } from '@/utils/levelHelpers';
import api from '@/utils/api';
import { MetaTags } from '@/components/common/display';
import { StatusBanner } from '@/components/common/display/StatusBanner/StatusBanner';
import { buildTournamentMeta } from '@/utils/meta';
import { CommentFormatter } from '@/components/misc';
import { EditIcon, ExternalLinkIcon, WarningIcon, YoutubeIcon } from '@/components/common/icons';
import { UserAvatar } from '@/components/layout';
import { TournamentManagementPopup } from '@/components/popups/Tournaments';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { userAvatarUrls } from '@/utils/playerAvatarDisplay';
import {
  resolveLevelHref,
  resolvePackHref,
} from '@/utils/tournamentPlacements';
import './tournamentDetailPage.css';

function placementPersonHref(placement) {
  if (placement?.playerId) return `/profile/${placement.playerId}`;
  if (placement?.creatorId) return `/creator/${placement.creatorId}`;
  return null;
}

function placementPersonName(placement) {
  return placement?.player?.name || placement?.creator?.name || placement?.displayName || '';
}

function creditHref(credit) {
  if (credit?.playerId) return `/profile/${credit.playerId}`;
  if (credit?.creatorId) return `/creator/${credit.creatorId}`;
  return null;
}

function creditName(credit) {
  return credit?.player?.name || credit?.creator?.name || '';
}

function groupStandingsByTier(tournament) {
  const tiers = [...(tournament?.tiers || [])].sort((a, b) => {
    if ((a.rankWeight ?? 0) !== (b.rankWeight ?? 0)) {
      return (a.rankWeight ?? 0) - (b.rankWeight ?? 0);
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
  const placements = Array.isArray(tournament?.placements) ? tournament.placements : [];
  const used = new Set();
  const groups = tiers
    .map((tier) => {
      const rows = placements
        .filter((placement) => placement.tierId === tier.id || placement.tier?.id === tier.id)
        .sort(
          (a, b) =>
            (a.positionInTier ?? 0) - (b.positionInTier ?? 0) || (a.id ?? 0) - (b.id ?? 0),
        );
      rows.forEach((row) => used.add(row.id));
      return { tier, placements: rows };
    })
    .filter((group) => group.placements.length);

  const leftover = placements.filter((placement) => !used.has(placement.id));
  if (leftover.length) {
    groups.push({ tier: null, placements: leftover });
  }
  return groups;
}

function PlacementBadges({ placement, t }) {
  return (
    <>
      {placement.teamName ? (
        <span className="tournament-detail-page__badge">{placement.teamName}</span>
      ) : null}
      {placement.isPending ? (
        <span className="tournament-detail-page__badge is-pending">
          {t('tournamentDetail.badges.pending')}
        </span>
      ) : null}
      {placement.withdrew ? (
        <span className="tournament-detail-page__badge is-withdrew">
          {t('tournamentDetail.badges.withdrew')}
        </span>
      ) : null}
      {placement.disqualified ? (
        <span className="tournament-detail-page__badge is-disqualified">
          {t('tournamentDetail.badges.disqualified')}
        </span>
      ) : null}
    </>
  );
}

function standingPerson(placement) {
  return placement?.player || placement?.creator || null;
}

function ProfileStandingRow({ placement, t }) {
  const href = placementPersonHref(placement);
  const name = placementPersonName(placement);
  const person = standingPerson(placement);
  const avatarUrls = userAvatarUrls(person);
  const hasAvatar = Boolean(avatarUrls.primaryUrl || avatarUrls.fallbackUrl);
  const tier = placement.tier;
  const identity = (
    <>
      {hasAvatar ? (
        <UserAvatar {...avatarUrls} className="tournament-detail-page__person-avatar" />
      ) : null}
      <span className="tournament-detail-page__person-name">{name}</span>
    </>
  );
  const nameNode = href ? (
    <Link className="tournament-detail-page__person-link" to={href}>
      {identity}
    </Link>
  ) : (
    <span className="tournament-detail-page__person-link">{identity}</span>
  );

  return (
    <div className="tournament-detail-page__standing-row is-profile">
      {tier?.iconUrl ? (
        <img className="tournament-detail-page__tier-icon" src={tier.iconUrl} alt="" />
      ) : (
        <span
          className="tournament-detail-page__tier-swatch"
          style={tier?.color ? { backgroundColor: tier.color } : undefined}
        />
      )}
      <div className="tournament-detail-page__standing-main">
        {nameNode}
        <div className="tournament-detail-page__standing-meta">
          <PlacementBadges placement={placement} t={t} />
        </div>
      </div>
    </div>
  );
}

function LevelStandingRow({ placement, t }) {
  const { difficultyDict } = useDifficultyContext();
  const level = placement.level;
  const song = getSongDisplayName(level) || level?.song || placement.displayName;
  const artist = getArtistDisplayName(level) || level?.artist || '';
  const levelHref = resolveLevelHref(placement.levelId ?? level?.id);
  const credits = Array.isArray(placement.credits) ? placement.credits : [];
  const title = artist ? `${song} — ${artist}` : song;
  const diffIcon = difficultyDict[level?.diffId]?.icon;
  const titleBody = (
    <>
      {diffIcon ? (
        <img
          className="tournament-detail-page__diff-icon"
          src={diffIcon}
          alt=""
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span className="tournament-detail-page__level-title">{title}</span>
    </>
  );
  const titleNode = levelHref ? (
    <Link className="tournament-detail-page__level-link" to={levelHref}>
      {titleBody}
    </Link>
  ) : (
    <span className="tournament-detail-page__level-link">{titleBody}</span>
  );
  const tier = placement.tier;

  return (
    <div className="tournament-detail-page__standing-row is-level">
      {tier?.iconUrl ? (
        <img className="tournament-detail-page__tier-icon" src={tier.iconUrl} alt="" />
      ) : (
        <span
          className="tournament-detail-page__tier-swatch"
          style={tier?.color ? { backgroundColor: tier.color } : undefined}
        />
      )}
      <div className="tournament-detail-page__standing-main">
        {titleNode}
        {credits.length > 0 ? (
          <div className="tournament-detail-page__credits">
            {credits.map((credit) => {
              const name = creditName(credit);
              if (!name) return null;
              const href = creditHref(credit);
              return href ? (
                <Link key={credit.id} className="tournament-detail-page__credit-link" to={href}>
                  {name}
                </Link>
              ) : (
                <span key={credit.id}>{name}</span>
              );
            })}
          </div>
        ) : null}
        <div className="tournament-detail-page__standing-meta">
          <PlacementBadges placement={placement} t={t} />
        </div>
      </div>
    </div>
  );
}

const TournamentDetailPage = () => {
  const { t, i18n } = useTranslation(['pages', 'common']);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [seriesList, setSeriesList] = useState([]);
  const [templates, setTemplates] = useState([]);

  const isSuperAdmin = Boolean(user && hasFlag(user, permissionFlags.SUPER_ADMIN));

  const fetchTournament = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(routes.database.tournaments.byId(id));
      setTournament(response.data);
    } catch (err) {
      console.error('Error fetching tournament:', err);
      setTournament(null);
      setError(err.response?.status === 404 ? 'notFound' : 'loadFailed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  useEffect(() => {
    if (!tournament?.canEdit) return undefined;
    let cancelled = false;
    api
      .get(routes.database.tournaments.series())
      .then(({ data }) => {
        if (!cancelled) setSeriesList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setSeriesList([]);
      });
    if (isSuperAdmin) {
      api
        .get(routes.admin.tournaments.tierTemplates())
        .then(({ data }) => {
          if (!cancelled) setTemplates(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          if (!cancelled) setTemplates([]);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [tournament?.canEdit, isSuperAdmin]);

  useBodyScrollLock(showEditPopup);

  const tournamentMeta = useMemo(
    () => (tournament ? buildTournamentMeta(tournament, t, { pathname: location.pathname }) : null),
    [tournament, t, location.pathname],
  );

  const seriesOptions = useMemo(
    () => [
      { value: '', label: t('tournamentManagement.form.seriesNone') },
      ...[...seriesList]
        .sort((a, b) => (a.sortWeight ?? 0) - (b.sortWeight ?? 0))
        .map((series) => ({ value: String(series.id), label: series.name })),
    ],
    [seriesList, t],
  );

  const standingGroups = useMemo(() => groupStandingsByTier(tournament), [tournament]);

  const handleUpdated = async () => {
    try {
      const { data } = await api.get(routes.database.tournaments.byId(id));
      setTournament(data);
    } catch (err) {
      if (err.response?.status === 404) {
        navigate('/tournaments', { replace: true });
      }
    }
  };

  if (loading) {
    return (
      <div className="tournament-detail-page">
        <div className="loader-shell loader-shell--fill">
          <div className="loader loader-relative" />
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="tournament-detail-page">
        <div className="tournament-detail-page__error">
          <h2>{t(`tournamentDetail.errors.${error || 'notFound'}`)}</h2>
          <Link to="/tournaments" className="btn-fill-secondary">
            {t('tournamentDetail.backToList')}
          </Link>
        </div>
      </div>
    );
  }

  const title = tournament.fullName || tournament.shortName;
  const packHref = resolvePackHref(tournament.packRef);
  const dateParts = [formatDate(tournament.startsAt, i18n.language), formatDate(tournament.endsAt, i18n.language)]
    .filter(Boolean);
  const dateLabel = dateParts.join(' – ');
  const rewards = Array.isArray(tournament.rewards) ? tournament.rewards : [];
  const organizers = Array.isArray(tournament.organizers) ? tournament.organizers : [];

  return (
    <div className="tournament-detail-page">
      {tournamentMeta ? <MetaTags {...tournamentMeta} /> : null}

      <div className="tournament-detail-page__container page-content-70rem">
        <header className="tournament-detail-page__header">
          {tournament.iconUrl ? (
            <div className="tournament-detail-page__icon">
              <img src={tournament.iconUrl} alt="" />
            </div>
          ) : null}
          <div className="tournament-detail-page__header-body">
            <div className="tournament-detail-page__title-row">
              <h1>{title}</h1>
              {tournament.canEdit ? (
                <button
                  type="button"
                  className="tournament-detail-page__edit-btn"
                  onClick={() => setShowEditPopup(true)}
                  aria-label={t('buttons.edit', { ns: 'common' })}
                >
                  <EditIcon size={24} />
                </button>
              ) : null}
            </div>
            {tournament.aka ? (
              <span className="tournament-detail-page__aka">{tournament.aka}</span>
            ) : null}
            <div className="tournament-detail-page__header-meta">
              {tournament.series?.name ? (
                <span className="tournament-detail-page__chip">{tournament.series.name}</span>
              ) : null}
              <span className={`tournament-detail-page__chip is-${tournament.status}`}>
                {t(`tournamentDetail.statuses.${tournament.status}`, {
                  defaultValue: tournament.status,
                })}
              </span>
              {tournament.sortYear ? (
                <span className="tournament-detail-page__chip">{tournament.sortYear}</span>
              ) : null}
              {dateLabel ? <span className="tournament-detail-page__chip">{dateLabel}</span> : null}
              {tournament.isHidden || tournament.status === 'draft' ? (
                <span className="tournament-detail-page__chip is-hidden">
                  {t('tournamentDetail.badges.unlisted')}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {(packHref || tournament.youtubeUrl || tournament.externalUrl) ? (
          <div className="tournament-detail-page__links">
            {packHref ? (
              <Link to={packHref} className="btn-fill-primary">
                {t('tournamentDetail.links.pack')}
              </Link>
            ) : null}
            {tournament.youtubeUrl ? (
              <a
                href={tournament.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-fill-secondary"
              >
                <YoutubeIcon size={16} />
                {t('tournamentDetail.links.youtube')}
              </a>
            ) : null}
            {tournament.externalUrl ? (
              <a
                href={tournament.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-fill-secondary"
              >
                <ExternalLinkIcon size={16} />
                {t('tournamentDetail.links.external')}
              </a>
            ) : null}
          </div>
        ) : null}

        {organizers.length > 0 ? (
          <section className="tournament-detail-page__section">
            <h2>{t('tournamentDetail.sections.organizers')}</h2>
            <div className="tournament-detail-page__organizers">
              {organizers.map((name) => (
                <span key={name} className="tournament-detail-page__chip">
                  {name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {tournament.notes ? (
          <section className="tournament-detail-page__section">
            <h2>{t('tournamentDetail.sections.notes')}</h2>
            <div className="tournament-detail-page__notes">
              <CommentFormatter>{tournament.notes}</CommentFormatter>
            </div>
          </section>
        ) : null}

        {rewards.length > 0 ? (
          <section className="tournament-detail-page__section">
            <h2>{t('tournamentDetail.sections.rewards')}</h2>
            <div className="tournament-detail-page__rewards">
              {rewards.map((reward) => (
                <div key={reward.id} className="tournament-detail-page__reward">
                  {reward.assetUrl ? (
                    <img src={reward.assetUrl} alt="" className="tournament-detail-page__reward-asset" />
                  ) : null}
                  <span>{reward.label}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="tournament-detail-page__section">
          <h2>{t('tournamentDetail.sections.standings')}</h2>
          {!tournament.isResultsFinal ? (
            <StatusBanner tone="warning" placement="default" icon={<WarningIcon size={18} />}>
              {t('tournamentDetail.unofficialBanner')}
            </StatusBanner>
          ) : null}
          {standingGroups.length === 0 ? (
            <p className="tournament-detail-page__empty">{t('tournamentDetail.emptyStandings')}</p>
          ) : (
            <div className="tournament-detail-page__standings">
              {standingGroups.map((group) => (
                <div key={group.tier?.id ?? 'untiered'} className="tournament-detail-page__tier-group">
                  <h3
                    className="tournament-detail-page__tier-title"
                    style={group.tier?.color ? { color: group.tier.color } : undefined}
                  >
                    {group.tier?.iconUrl ? (
                      <img src={group.tier.iconUrl} alt="" className="tournament-detail-page__tier-icon" />
                    ) : null}
                    {group.tier?.label || group.tier?.code || t('tournamentDetail.untiered')}
                  </h3>
                  <div className="tournament-detail-page__tier-rows">
                    {group.placements.map((placement) =>
                      placement.effectiveRowMode === 'level' ? (
                        <LevelStandingRow key={placement.id} placement={placement} t={t} />
                      ) : (
                        <ProfileStandingRow key={placement.id} placement={placement} t={t} />
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showEditPopup ? (
        <TournamentManagementPopup
          tournamentId={tournament.id}
          onClose={() => setShowEditPopup(false)}
          onUpdated={handleUpdated}
          seriesOptions={seriesOptions}
          tierTemplates={templates}
        />
      ) : null}
    </div>
  );
};

export default TournamentDetailPage;
