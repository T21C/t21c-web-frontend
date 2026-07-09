// tuf-search: #PackRefSelect #packRefSelect #selectors
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import CustomSelect from '../Select/Select';
import { usePackSearch } from '@/hooks/usePackSearch';
import {
  formatPackOptionLabel,
  getPackLinkCode,
} from '@/utils/packRefUtils';
import './packRefSelect.css';

/** @typedef {'idle' | 'loading' | 'found' | 'notFound'} PackResolveState */

const PackRefSelect = ({
  value = '',
  onChange,
  label,
  placeholder,
  id,
  className = '',
  width = '100%',
}) => {
  const { t } = useTranslation('pages');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedPack, setResolvedPack] = useState(null);
  const [resolveState, setResolveState] = useState('idle');
  const hydratedRef = useRef('');
  const { packs, loading, error } = usePackSearch(searchQuery);

  const trimmedValue = String(value ?? '').trim();

  useEffect(() => {
    if (!trimmedValue) {
      hydratedRef.current = '';
      setResolvedPack(null);
      setResolveState('idle');
      return undefined;
    }

    const matchInResults = packs.find((pack) => getPackLinkCode(pack) === trimmedValue);
    if (matchInResults) {
      hydratedRef.current = trimmedValue;
      setResolvedPack(matchInResults);
      setResolveState('found');
      return undefined;
    }

    if (hydratedRef.current === trimmedValue) {
      return undefined;
    }

    let cancelled = false;
    setResolveState('loading');

    api
      .get(routes.database.levels.packs.byId(trimmedValue))
      .then((response) => {
        if (cancelled) return;
        hydratedRef.current = trimmedValue;
        if (response.data) {
          setResolvedPack(response.data);
          setResolveState('found');
          return;
        }
        setResolvedPack(null);
        setResolveState('notFound');
      })
      .catch((err) => {
        if (axios.isCancel(err) || cancelled) return;
        hydratedRef.current = trimmedValue;
        setResolvedPack(null);
        setResolveState('notFound');
      });

    return () => {
      cancelled = true;
    };
  }, [trimmedValue, packs]);

  const options = useMemo(
    () =>
      packs.map((pack) => ({
        value: getPackLinkCode(pack),
        label: formatPackOptionLabel(pack),
      })),
    [packs],
  );

  const selectValue = trimmedValue
    ? {
        value: trimmedValue,
        label: resolvedPack ? formatPackOptionLabel(resolvedPack) : trimmedValue,
      }
    : null;

  const resolvedPlaceholder =
    placeholder || t('tournamentManagement.form.packRefSearchPlaceholder');

  const noOptionsMessage = () => {
    if (loading) return t('tournamentManagement.form.packRefLoading');
    if (error) return t('tournamentManagement.form.packRefSearchFailed');
    if (!searchQuery.trim()) return t('tournamentManagement.form.packRefTypeToSearch');
    return t('tournamentManagement.form.packRefNoResults');
  };

  const showNotFound = Boolean(trimmedValue) && resolveState === 'notFound';

  return (
    <div className={`pack-ref-select ${className}`.trim()}>
      {showNotFound ? (
        <span className="pack-ref-select__not-found" role="status">
          {t('tournamentManagement.form.packRefNotFound')}
        </span>
      ) : null}
      <CustomSelect
        inputId={id}
        label={label}
        width={width}
        options={options}
        value={selectValue}
        onChange={(option) => onChange?.(option?.value ?? '')}
        onInputChange={(input, { action }) => {
          if (action === 'input-change') {
            setSearchQuery(input);
          }
        }}
        placeholder={resolvedPlaceholder}
        isSearchable
        isClearable
        filterOption={() => true}
        isLoading={loading}
        noOptionsMessage={noOptionsMessage}
        className="pack-ref-select__control"
      />
    </div>
  );
};

export default PackRefSelect;
