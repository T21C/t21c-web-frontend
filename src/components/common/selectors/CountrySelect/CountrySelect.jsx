import { useState, useEffect } from 'react';
import { isoToEmoji } from '@/utils';
import "./countryselect.css";
import { COUNTRY_CODES } from "@/utils/countryCodes";
import { useTranslation } from 'react-i18next';

export const CountrySelect = ({ value, onChange }) => {
  const { t } = useTranslation('components');

  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCountries, setFilteredCountries] = useState(COUNTRY_CODES);

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

  // Filter countries based on search
  useEffect(() => {
    const filtered = COUNTRY_CODES.filter(country => 
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCountries(filtered);
  }, [searchTerm]);

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

  const selectedCountry = COUNTRY_CODES.find(c => c.code === value);

  return (
    <div className="select-country-wrapper" onClick={(e) => e.stopPropagation()}>
      <div className="select-country-container">
        <div 
          className="select-country-display"
          onClick={toggleDropdown}
        >
          {selectedCountry ? (
            <>
              <img 
                src={isoToEmoji(selectedCountry.code)}
                alt={selectedCountry.name}
                className="select-country-flag"
              />
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
                <img 
                  src={isoToEmoji(country.code)}
                  alt={country.name}
                  className="select-country-flag"
                />
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