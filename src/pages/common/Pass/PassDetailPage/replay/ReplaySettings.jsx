// tuf-search: #ReplaySettings #replayPreview
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';

const ReplaySettings = ({ id, settings, onChange, onReset, onClose }) => {
  const { t } = useTranslation('pages', { keyPrefix: 'passDetail.replay' });
  return (
    <aside className="replay-settings" id={id} aria-label={t('settings')}>
      <div className="replay-settings-heading"><h3>{t('settings')}</h3><button type="button" className="replay-icon-button" onClick={onClose} aria-label={t('closeSettings')}><FiX /></button></div>
      <fieldset><legend>{t('audio')}</legend>
        {['songVolumePercent', 'hitSoundVolumePercent'].map(key => <label className="replay-volume" key={key}>
          <span>{t(key)}<output>{settings[key]}%</output></span>
          <input type="range" min="0" max="100" value={settings[key]} aria-label={t(key)} onChange={event => onChange(key, Number(event.target.value))} />
        </label>)}
      </fieldset>
      <fieldset><legend>{t('visuals')}</legend>
        {['vfxEnabled', 'forceDefaultTrackAppearance', 'showAllIcons', 'hitErrorMeterVisible'].map(key => <label className="replay-switch-row" key={key}>
          <span>{t(key)}</span><input type="checkbox" role="switch" checked={settings[key]} onChange={event => onChange(key, event.target.checked)} />
        </label>)}
      </fieldset>
      <fieldset><legend>{t('playback')}</legend>
        <label className="replay-volume"><span>Pitch<output>{settings.pitchPercent}%</output></span>
          <input type="number" min="1" max="1000" value={settings.pitchPercent} aria-label="Pitch" onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 1000) onChange('pitchPercent', value); }} />
        </label>
        {['hitErrorMeterSize', 'hitErrorMeterShape'].map(key => <label className="replay-switch-row" key={key}><span>{t(key)}</span>
          <select value={settings[key]} onChange={event => onChange(key, event.target.value)}>
            {(key === 'hitErrorMeterSize' ? ['small', 'normal', 'large', 'extra_large'] : ['straight', 'curved']).map(value => <option key={value} value={value}>{t(value)}</option>)}
          </select>
        </label>)}
      </fieldset>
      <button type="button" className="replay-reset-settings" onClick={onReset}>{t('resetSettings')}</button>
    </aside>
  );
};

export default ReplaySettings;
