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
  const hydratedRef = useRef('');
  const { packs, loading, error } = usePackSearch(searchQuery);

  const trimmedValue = String(value ?? '').trim();

  useEffect(() => {
    if (!trimmedValue) {
      hydratedRef.current = '';
      setResolvedPack(null);
      return undefined;
    }

    const matchInResults = packs.find((pack) => getPackLinkCode(pack) === trimmedValue);
    if (matchInResults) {
      hydratedRef.current = trimmedValue;
      setResolvedPack(matchInResults);
      return undefined;
    }

    if (hydratedRef.current === trimmedValue) {
      return undefined;
    }

    let cancelled = false;
    api
      .get(routes.database.levels.packs.byId(trimmedValue))
      .then((response) => {
        if (!cancelled && response.data) {
          hydratedRef.current = trimmedValue;
          setResolvedPack(response.data);
        }
      })
      .catch((err) => {
        if (axios.isCancel(err) || cancelled) return;
        hydratedRef.current = trimmedValue;
        setResolvedPack({ id: trimmedValue, linkCode: trimmedValue, name: trimmedValue });
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

  return (
    <div className={`pack-ref-select ${className}`.trim()}>
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
