// tuf-search: #ReplayControls #replayPreview
import { useTranslation } from 'react-i18next';
import { FiPause, FiPlay, FiRotateCcw } from 'react-icons/fi';

const ReplayControls = ({ opened, playing, position, onPlay, onPosition, onRestart }) => {
  const { t } = useTranslation('pages', { keyPrefix: 'passDetail.replay' });
  return (
    <div className="replay-controls">
      <output className="replay-timeline-value">{opened ? `${position}%` : '— / —'}</output>
      <input className="replay-timeline" type="range" min="0" max="100" step="1" value={position} disabled={!opened} aria-label={t('timeline')} aria-valuetext={`${position}%`} onChange={event => onPosition(Number(event.target.value))} style={{ '--replay-progress': `${position}%` }} />
      <div className="replay-transport">
        <button type="button" className="replay-play-button" disabled={!opened} onClick={onPlay} aria-label={t(playing ? 'pause' : 'play')} title={t(playing ? 'pause' : 'play')}>{playing ? <FiPause /> : <FiPlay />}</button>
        <button type="button" className="replay-icon-button" disabled={!opened} onClick={onRestart} aria-label={t('restart')} title={t('restart')}><FiRotateCcw /></button>
      </div>
    </div>
  );
};

export default ReplayControls;
