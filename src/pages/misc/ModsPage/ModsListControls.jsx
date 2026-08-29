import { useMemo } from 'react';
import { CustomSelect } from '@/components/common/selectors';
import { DEFAULT_MOD_SORT, MOD_SORT_OPTIONS } from './modListSort';

const ModsListControls = ({ query, onQueryChange, sort, onSortChange, t }) => {
  const sortOptions = useMemo(
    () =>
      MOD_SORT_OPTIONS.map((option) => ({
        value: option.value,
        label: t(`mods.sort.${option.labelKey}`),
      })),
    [t],
  );
  const selected =
    sortOptions.find((option) => option.value === sort) ||
    sortOptions.find((option) => option.value === DEFAULT_MOD_SORT) ||
    sortOptions[0];

  return (
    <div className="mods-page__search">
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={t('mods.searchPlaceholder')}
      />
      <CustomSelect
        options={sortOptions}
        value={selected}
        onChange={(option) => onSortChange(option?.value ?? DEFAULT_MOD_SORT)}
        label={t('mods.sort.label')}
        width="13rem"
        isSearchable={false}
      />
    </div>
  );
};

export default ModsListControls;
