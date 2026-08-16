// tuf-search: #MySubmissionsPage #mySubmissions #account
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { MetaTags } from '@/components/common/display';
import { CustomSelect } from '@/components/common/selectors';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';
import { buildStaticPageMeta } from '@/utils/meta';
import MySubmissionRow from './MySubmissionRow';
import './mySubmissionsPage.css';

const PAGE_SIZE = 20;

const MySubmissionsPage = () => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const runSearch = useDebouncedRequest(500);

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('DATE_DESC');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('mySubmissions.meta.title'),
        description: t('mySubmissions.meta.description'),
        pathname: location.pathname,
        noindex: true,
      }),
    [t, location.pathname],
  );

  const typeOptions = useMemo(
    () => [
      { value: 'all', label: t('mySubmissions.types.all') },
      { value: 'pass', label: t('mySubmissions.types.pass') },
      { value: 'level', label: t('mySubmissions.types.level') },
    ],
    [t],
  );
  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('mySubmissions.status.all') },
      { value: 'pending', label: t('mySubmissions.status.pending') },
      { value: 'approved', label: t('mySubmissions.status.approved') },
      { value: 'declined', label: t('mySubmissions.status.declined') },
    ],
    [t],
  );
  const sortOptions = useMemo(
    () => [
      { value: 'DATE_DESC', label: t('mySubmissions.sort.dateDesc') },
      { value: 'DATE_ASC', label: t('mySubmissions.sort.dateAsc') },
      { value: 'STATUS', label: t('mySubmissions.sort.status') },
      { value: 'TYPE', label: t('mySubmissions.sort.type') },
    ],
    [t],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    api
      .get(routes.form.submissions.root(), {
        params: {
          page,
          limit: PAGE_SIZE,
          query,
          type,
          status,
          sort,
        },
        signal: controller.signal,
      })
      .then((response) => {
        setResults(response.data?.results || []);
        setTotal(Number(response.data?.total) || 0);
      })
      .catch((err) => {
        if (api.isCancel(err)) return;
        console.error('Failed to load submissions:', err);
        setError(true);
        setResults([]);
        setTotal(0);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, query, type, status, sort]);

  useEffect(() => {
    if (!loading && page > totalPages) setPage(totalPages);
  }, [loading, page, totalPages]);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchInput(value);
    runSearch(async () => {
      setPage(1);
      setQuery(value.trim());
    });
  };

  const handleFilterChange = (setter, fallback) => (option) => {
    setter(option?.value ?? fallback);
    setPage(1);
  };

  return (
    <div className="my-submissions-page page-content-70rem">
      <MetaTags {...pageMeta} />

      <div className="my-submissions-page__header">
        <h1 className="my-submissions-page__title">{t('mySubmissions.title')}</h1>
      </div>

      <div className="my-submissions-page__controls">
        <input
          type="text"
          autoComplete="off"
          className="my-submissions-page__search"
          placeholder={t('mySubmissions.search.placeholder')}
          value={searchInput}
          onChange={handleSearchChange}
        />
        <CustomSelect
          options={typeOptions}
          value={typeOptions.find((opt) => opt.value === type) || typeOptions[0]}
          onChange={handleFilterChange(setType, 'all')}
          label={t('mySubmissions.filters.type')}
          width="10rem"
        />
        <CustomSelect
          options={statusOptions}
          value={statusOptions.find((opt) => opt.value === status) || statusOptions[0]}
          onChange={handleFilterChange(setStatus, 'all')}
          label={t('mySubmissions.filters.status')}
          width="11rem"
        />
        <CustomSelect
          options={sortOptions}
          value={sortOptions.find((opt) => opt.value === sort) || sortOptions[0]}
          onChange={handleFilterChange(setSort, 'DATE_DESC')}
          label={t('mySubmissions.filters.sort')}
          width="11rem"
        />
      </div>

      <div className="my-submissions-page__list">
        {error ? (
          <p className="my-submissions-page__empty">{t('mySubmissions.error')}</p>
        ) : loading && !results.length ? (
          <p className="my-submissions-page__empty">{t('mySubmissions.loading')}</p>
        ) : !results.length ? (
          <p className="my-submissions-page__empty">{t('mySubmissions.empty')}</p>
        ) : (
          results.map((submission) => (
            <MySubmissionRow
              key={`${submission.kind}-${submission.id}`}
              submission={submission}
            />
          ))
        )}
      </div>

      {total > 0 ? (
        <div className="my-submissions-page__pagination">
          <span className="my-submissions-page__page-meta">
            {t('mySubmissions.pagination.total', { count: total })}
            {' · '}
            {t('mySubmissions.pagination.page', { page, totalPages })}
          </span>
          <div className="my-submissions-page__page-buttons">
            <button
              type="button"
              className="my-submissions-page__page-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t('mySubmissions.pagination.prev')}
            </button>
            <button
              type="button"
              className="my-submissions-page__page-btn"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              {t('mySubmissions.pagination.next')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MySubmissionsPage;
