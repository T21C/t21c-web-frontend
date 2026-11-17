// tuf-search: #SubmissionSortControl #submissionManagement — sort by for submission queues
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/common/display';
import { SortAscIcon, SortDescIcon } from '@/components/common/icons';
import { CustomSelect } from '@/components/common/selectors';
import { defaultSortDir, submissionSortOptions } from './submissionSort';

const STORAGE_PREFIX = 'submission_management_sort_';

function readStoredSort(kind) {
  const options = submissionSortOptions(kind);
  const fallback = { sort: 'submitted', dir: 'desc' };
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${kind}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const match = options.find((option) => option.value === parsed?.sort);
    if (!match) return fallback;
    const dir = parsed?.dir === 'asc' || parsed?.dir === 'desc'
      ? parsed.dir
      : defaultSortDir(match.type);
    return { sort: match.value, dir };
  } catch {
    return fallback;
  }
}

export function useStoredSubmissionSort(kind) {
  const [state, setState] = useState(() => readStoredSort(kind));

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${kind}`, JSON.stringify(state));
    } catch {
      // Private mode or a full disk should not break the queue.
    }
  }, [kind, state]);

  const setSort = (sort) => {
    setState((prev) => {
      if (prev.sort === sort) return prev;
      const match = submissionSortOptions(kind).find((option) => option.value === sort);
      if (!match) return prev;
      return { sort: match.value, dir: defaultSortDir(match.type) };
    });
  };

  const setDir = (dir) => {
    if (dir !== 'asc' && dir !== 'desc') return;
    setState((prev) => ({ ...prev, dir }));
  };

  return { sort: state.sort, dir: state.dir, setSort, setDir };
}

const SubmissionSortControl = ({ kind, sort, dir, onSort, onDir }) => {
  const { t } = useTranslation('pages');
  const options = submissionSortOptions(kind).map((option) => ({
    value: option.value,
    label: t(`submissionManagement.sort.${option.value}`),
  }));
  const selected = options.find((option) => option.value === sort) || options[0];

  return (
    <div className="submission-sort">
      <CustomSelect
        label={t('submissionManagement.sort.label')}
        options={options}
        value={selected}
        onChange={(option) => {
          if (option?.value) onSort(option.value);
        }}
        width="16rem"
        isSearchable={false}
        menuPlacement="bottom"
      />
      <div className="submission-sort__order" role="group" aria-label={t('submissionManagement.sort.order')}>
        <Tooltip id="submission-sort-asc" place="bottom" noArrow>
          {t('submissionManagement.sort.asc')}
        </Tooltip>
        <Tooltip id="submission-sort-desc" place="bottom" noArrow>
          {t('submissionManagement.sort.desc')}
        </Tooltip>
        <button
          type="button"
          className={`submission-sort__dir${dir === 'asc' ? ' is-active' : ''}`}
          aria-pressed={dir === 'asc'}
          aria-label={t('submissionManagement.sort.asc')}
          data-tooltip-id="submission-sort-asc"
          onClick={() => onDir('asc')}
        >
          <SortAscIcon />
        </button>
        <button
          type="button"
          className={`submission-sort__dir${dir === 'desc' ? ' is-active' : ''}`}
          aria-pressed={dir === 'desc'}
          aria-label={t('submissionManagement.sort.desc')}
          data-tooltip-id="submission-sort-desc"
          onClick={() => onDir('desc')}
        >
          <SortDescIcon />
        </button>
      </div>
    </div>
  );
};

export default SubmissionSortControl;
