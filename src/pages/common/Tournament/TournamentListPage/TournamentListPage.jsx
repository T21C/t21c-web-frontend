import { routes } from '@/api/routes';
// tuf-search: #TournamentListPage #tournamentListPage #tournament #tournamentList — Tournaments
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import api from '@/utils/api';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { CustomSelect } from '@/components/common/selectors';
import { groupPublicTournamentsBySeries } from '@/utils/tournamentPlacements';
import './tournamentListPage.css';

const TournamentListPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('tournamentList.meta.title'),
        description: t('tournamentList.meta.description'),
        pathname: location.pathname,
        type: 'website',
      }),
    [t, location.pathname],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const runRequest = useDebouncedRequest(500);

  const statusOptions = useMemo(
    () => [
      { value: null, label: t('tournamentList.filter.allStatuses') },
      { value: 'ongoing', label: t('tournamentList.statuses.ongoing') },
      { value: 'completed', label: t('tournamentList.statuses.completed') },
      { value: 'cancelled', label: t('tournamentList.statuses.cancelled') },
    ],
    [t],
  );

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (status) params.status = status;
      try {
        const response = await runRequest(({ signal }) =>
          api.get(routes.database.tournaments.root(), { params, signal }),
        );
        setTournaments(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        if (axios.isCancel(error)) return;
        console.error('Error fetching tournaments:', error);
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [searchQuery, status, runRequest]);

  const groups = useMemo(
    () => groupPublicTournamentsBySeries(tournaments, t('tournamentList.unseriesed')),
    [tournaments, t],
  );

  return (
    <div className="tournament-list-page">
      <MetaTags {...pageMeta} />

      <div className="tournament-list-page__container page-content-70rem">
        <h1>{t('tournamentList.title')}</h1>

        <div className="tournament-list-page__controls">
          <div className="tournament-list-page__search">
            <input
              type="text"
              autoComplete="off"
              className="tournament-list-page__search-input"
              placeholder={t('tournamentList.search.placeholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <CustomSelect
            options={statusOptions}
            value={statusOptions.find((option) => option.value === status) || statusOptions[0]}
            onChange={(option) => setStatus(option?.value || null)}
            label={t('tournamentList.filter.status')}
            width="12rem"
          />
        </div>

        {loading ? (
          <div className="loader-shell loader-shell--tall">
            <div className="loader loader-relative" />
          </div>
        ) : groups.length === 0 ? (
          <p className="tournament-list-page__empty">{t('tournamentList.empty')}</p>
        ) : (
          <div className="tournament-list-page__groups">
            {groups.map((group) => (
              <section key={group.key} className="tournament-list-page__group">
                <h2 className="tournament-list-page__group-title">{group.label}</h2>
                <div className="tournament-list-page__cards">
                  {group.items.map((tournament) => {
                    const title = tournament.fullName || tournament.shortName;
                    return (
                      <Link
                        key={tournament.id}
                        className="tournament-list-page__card"
                        to={`/tournaments/${tournament.id}`}
                      >
                        {tournament.iconUrl ? (
                          <div className="tournament-list-page__card-icon">
                            <img src={tournament.iconUrl} alt="" />
                          </div>
                        ) : (
                          <div className="tournament-list-page__card-icon is-placeholder" />
                        )}
                        <div className="tournament-list-page__card-body">
                          <h3 className="tournament-list-page__card-title">{title}</h3>
                          <div className="tournament-list-page__card-meta">
                            <span className={`tournament-list-page__status is-${tournament.status}`}>
                              {t(`tournamentList.statuses.${tournament.status}`, {
                                defaultValue: tournament.status,
                              })}
                            </span>
                            {tournament.sortYear ? (
                              <span className="tournament-list-page__year">{tournament.sortYear}</span>
                            ) : null}
                            {tournament.series?.name ? (
                              <span className="tournament-list-page__series">{tournament.series.name}</span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentListPage;
