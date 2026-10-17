// tuf-search: #CountrySelect #countrySelect #selectors
import { useState, useEffect, useMemo } from 'react';
import { isoToEmoji } from '@/utils';
import "./countryselect.css";
import { COUNTRY_CODES } from "@/utils/countryCodes";
import { CONTINENTS } from "@/utils/continents";
import { useTranslation } from 'react-i18next';

export const CountrySelect = ({ value, onChange, includeContinents = false }) => {
  const { t } = useTranslation('components');

  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSelect = (country, e) => {
    e.stopPropagation();
    onChange(country.code);
    setShowDropdown(false);
    setSearchTerm('');
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const filteredCountries = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const matches = (item) =>
      item.name.toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term);
    const countries = COUNTRY_CODES.filter(matches);
    if (!includeContinents) return countries;
    return [...countries, ...CONTINENTS.filter(matches)];
  }, [searchTerm, includeContinents]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.select-country-wrapper')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCountry = COUNTRY_CODES.find(c => c.code === value)
    || (includeContinents ? CONTINENTS.find(c => c.code === value) : undefined);

  const renderMark = (item) => {
    const isContinent = includeContinents && CONTINENTS.some(c => c.code === item.code);
    if (isContinent) {
      return <span className="select-country-mark">{item.code}</span>;
    }
    return (
      <img
        src={isoToEmoji(item.code)}
        alt={item.name}
        className="select-country-flag"
      />
    );
  };

  return (
    <div className="select-country-wrapper" onClick={(e) => e.stopPropagation()}>
      <div className="select-country-container">
        <div 
          className="select-country-display"
          onClick={toggleDropdown}
        >
          {selectedCountry ? (
            <>
              {renderMark(selectedCountry)}
              <span>{selectedCountry.name}</span>
            </>
          ) : (
            <span className="select-country-placeholder">{t('player.countrySelect.placeholder')}</span>
          )}
          <div className={`select-country-dropdown-toggle-icon ${showDropdown ? 'open' : ''}`}>▼</div>
        </div>
      </div>
      
      {showDropdown && (
        <div className="select-country-dropdown">
          <input
            type="text"
            autoComplete='off'
            className="select-country-search"
            placeholder={t('player.countrySelect.search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="select-country-options">
            {filteredCountries.map((country) => (
              <div
                key={country.code}
                className="select-country-option"
                onClick={(e) => handleSelect(country, e)}
              >
                {renderMark(country)}
                <span className="select-country-name">{country.name}</span>
                <span className="select-country-code">({country.code})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 
