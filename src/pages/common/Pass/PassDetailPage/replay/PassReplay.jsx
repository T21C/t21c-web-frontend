// tuf-search: #PassReplay #autoSubmission #replayPreview
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlay, FiMaximize2, FiMinimize2, FiSliders, FiX } from 'react-icons/fi';
import ReplayControls from './ReplayControls';
import ReplaySettings from './ReplaySettings';
import usePassReplay from './usePassReplay';
import useReplayPosition from './useReplayPosition';
import { defaultReplaySettings } from './replayDelivery';
import './replay-immersive.css';
import PassAutoSubmissionFlag from '@/components/cards/PassAutoSubmissionFlag';
import './pass-replay.css';
import './replay-controls.css';


const PassReplay = ({ pass }) => {
  const replay = usePassReplay(pass);
  const opened = replay.status === 'ready';
  const playing = !replay.paused;
  const positionUs = useReplayPosition(replay);
  const position = replay.durationUs ? Math.round(positionUs / replay.durationUs * 100) : 0;
  const settings = replay.settings;
  const { t } = useTranslation('pages', { keyPrefix: 'passDetail.replay' });
  const settingsId = useId();
  const expandButtonRef = useRef(null);
  const wasExpanded = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const changeSetting = (key, value) => replay.command('setSettings', { settings: { [key]: value } });
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [expanded]);

  useEffect(() => {
    if (wasExpanded.current && !expanded) expandButtonRef.current?.focus();
    wasExpanded.current = expanded;
  }, [expanded]);

  const closePreview = replay.close;

  const content = (
    <section className={`pass-replay${expanded ? ' pass-replay--expanded replay-full-window' : ''}`} aria-label={t('title')}
      onKeyDown={event => {
        if (event.key === 'Escape' && settingsOpen) {
          event.preventDefault(); event.stopPropagation(); setSettingsOpen(false);
        } else if (event.key === 'Escape' && expanded) {
          event.preventDefault(); setExpanded(false);
        }
      }}>
      <div className="replay-heading">
        <div className="replay-title-row"><h2>{t('title')}</h2><PassAutoSubmissionFlag /></div>
        <div className="replay-heading-actions">
          <button ref={expandButtonRef} type="button" className="replay-icon-button" onClick={() => setExpanded(!expanded)} aria-label={t(expanded ? 'collapse' : 'expand')} aria-pressed={expanded} title={t(expanded ? 'collapse' : 'expand')}>
            {expanded ? <FiMinimize2 /> : <FiMaximize2 />}
          </button>
        </div>
      </div>

      <div className="replay-workspace">
        <div className="replay-main">
          <div className={`replay-stage${opened ? ' replay-stage--opened' : ''}${playing ? ' replay-stage--playing' : ''}`}>
            <div className="replay-stage-content">
              {replay.src && <iframe ref={replay.iframeRef} src={replay.src} title={t('title')} allow="autoplay; fullscreen" style={{ width: '100%', height: '100%', border: 0 }} />}
              {replay.status === 'loading' && <p role="status">{t('loading')}</p>}
              {replay.error && <p role="alert">{t(`errors.${replay.error}`, { defaultValue: t('errors.generic') })}</p>}
              {!opened && replay.status !== 'loading' && <button type="button" className="replay-load-button btn-fill-primary" disabled={!pass.autoSubmissionRunId} onClick={replay.load}><FiPlay />{t('load')}</button>}
            </div>
            {replay.status !== 'idle' && <button type="button" className="replay-close-preview replay-icon-button" onClick={closePreview} aria-label={t('unload')} title={t('unload')}><FiX /></button>}
          </div>
          <ReplayControls opened={opened} playing={playing} position={position}
            onPlay={() => replay.command(playing ? 'pause' : 'play')} onPosition={value => replay.command('seek', { positionUs: Math.round(value / 100 * replay.durationUs) })}
            onRestart={() => replay.command('restart')} />
          <div className="replay-bottom-bar">
            <button type="button" className="replay-vfx-button" disabled={!opened} aria-pressed={settings.vfxEnabled} onClick={() => changeSetting('vfxEnabled', !settings.vfxEnabled)}>
              VFX <span>{t(settings.vfxEnabled ? 'on' : 'off')}</span>
            </button>
            <button type="button" className="replay-settings-button" disabled={!opened} aria-expanded={settingsOpen} aria-controls={settingsId} onClick={() => setSettingsOpen(!settingsOpen)}><FiSliders />{t('settings')}</button>
          </div>
        </div>
        {settingsOpen && opened && <ReplaySettings id={settingsId} settings={settings} onChange={changeSetting} onReset={() => replay.command('setSettings', { settings: defaultReplaySettings })} onClose={() => setSettingsOpen(false)} />}
      </div>
    </section>
  );
  return content;
};

export default PassReplay;
