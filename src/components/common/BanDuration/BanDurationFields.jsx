import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { CustomSelect } from '@/components/common/selectors';
import { BAN_DURATION_MAX, BAN_DURATION_MIN, BAN_DURATION_UNITS, FOREVER_BAN_UNIT, isForeverBanUnit } from './banDuration';
import './banDuration.css';

const BanDurationFields = ({
  duration,
  unit,
  onDurationChange,
  onUnitChange,
  disabled = false,
  allowForever = true,
  units = BAN_DURATION_UNITS,
  label,
  durationAria,
  unitAria,
  unitLabel,
}) => {
  const options = useMemo(() => {
    const timed = units.map((value) => ({ value, label: unitLabel(value) }));
    if (!allowForever) return timed;
    return [...timed, { value: FOREVER_BAN_UNIT, label: unitLabel(FOREVER_BAN_UNIT) }];
  }, [allowForever, unitLabel, units]);

  const selected = options.find((opt) => opt.value === unit) || options[0];
  const hideAmount = allowForever && isForeverBanUnit(unit);

  return (
    <div className="ban-duration-fields">
      {!hideAmount && (
        <>
          <span className="ban-duration-fields__label">{label}</span>
          <input
            type="number"
            min={BAN_DURATION_MIN}
            max={BAN_DURATION_MAX}
            step="1"
            className="ban-duration-fields__value"
            value={duration}
            onChange={(e) => onDurationChange(e.target.value)}
            disabled={disabled}
            aria-label={durationAria}
          />
        </>
      )}
      <div className="ban-duration-fields__unit">
        <CustomSelect
          options={options}
          value={selected}
          onChange={(opt) => onUnitChange(opt?.value || selected?.value)}
          width="8rem"
          isDisabled={disabled}
          isSearchable={false}
          aria-label={unitAria}
        />
      </div>
    </div>
  );
};

BanDurationFields.propTypes = {
  duration: PropTypes.string.isRequired,
  unit: PropTypes.string.isRequired,
  onDurationChange: PropTypes.func.isRequired,
  onUnitChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  allowForever: PropTypes.bool,
  units: PropTypes.arrayOf(PropTypes.string),
  label: PropTypes.string.isRequired,
  durationAria: PropTypes.string.isRequired,
  unitAria: PropTypes.string.isRequired,
  unitLabel: PropTypes.func.isRequired,
};

export default BanDurationFields;
