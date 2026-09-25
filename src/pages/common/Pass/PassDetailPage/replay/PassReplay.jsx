// tuf-search: #PassReplay #autoSubmission #replayPreview
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlay, FiMaximize2, FiMinimize2, FiX } from 'react-icons/fi';
import ReplayImmersiveView from './ReplayImmersiveView';
import usePassReplay from './usePassReplay';
import './replay-immersive.css';
import PassAutoSubmissionFlag from '@/components/cards/PassAutoSubmissionFlag';
import './pass-replay.css';
import { useAuth } from '@/contexts/AuthContext';
import ReplayVisualSettings from './ReplayVisualSettings.jsx';


const PassReplay = ({ pass }) => {
  const replay = usePassReplay(pass);
  const opened = !!replay.src;
  const { t } = useTranslation('pages', { keyPrefix: 'passDetail.replay' });
  const expandButtonRef = useRef(null);
  const wasExpanded = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [editingVisuals, setEditingVisuals] = useState(false);
  const { user } = useAuth();
  const ownsPass = !!user?.playerId && Number(user.playerId) === Number(pass.playerId ?? pass.player?.id);
  useEffect(() => {
    if (wasExpanded.current && !expanded) expandButtonRef.current?.focus();
    wasExpanded.current = expanded;
  }, [expanded]);

  const closePreview = replay.close;

  const content = (
    <section className={`pass-replay${expanded ? ' pass-replay--expanded replay-full-window' : ''}`} aria-label={t('title')}
      onKeyDown={event => {
        if (event.key === 'Escape' && expanded) {
          event.preventDefault(); setExpanded(false);
        }
      }}>
      <div className="replay-heading">
        <div className="replay-title-row"><h2>{t('title')}</h2><PassAutoSubmissionFlag /></div>
        <div className="replay-heading-actions">
          {ownsPass && <button type="button" onClick={() => setEditingVisuals(true)}>{t('visualSettings.title')}</button>}
          <button ref={expandButtonRef} type="button" className="replay-icon-button" onClick={() => setExpanded(!expanded)} aria-label={t(expanded ? 'collapse' : 'expand')} aria-pressed={expanded} title={t(expanded ? 'collapse' : 'expand')}>
            {expanded ? <FiMinimize2 /> : <FiMaximize2 />}
          </button>
        </div>
      </div>

      <div className="replay-workspace">
        <div className="replay-main">
          <div className="replay-stage">
            <div className="replay-stage-content">
              {replay.src && <iframe ref={replay.iframeRef} src={replay.src} title={t('title')} allow="autoplay; fullscreen" style={{ width: '100%', height: '100%', border: 0 }} />}
              {replay.error && <p role="alert">{t(`errors.${replay.error}`, { defaultValue: t('errors.generic') })}</p>}
              {!opened && replay.status !== 'loading' && <button type="button" className="replay-load-button btn-fill-primary" disabled={!pass.autoSubmissionRunId} onClick={replay.load}><FiPlay />{t('load')}</button>}
            </div>
            {replay.status !== 'idle' && <button type="button" className="replay-close-preview replay-icon-button" onClick={closePreview} aria-label={t('unload')} title={t('unload')}><FiX /></button>}
          </div>
        </div>
      </div>
      {editingVisuals && ownsPass && <ReplayVisualSettings key={`${pass.id}:${user.id}`} passId={pass.id} onClose={() => setEditingVisuals(false)} onChanged={replay.visualsChanged} />}
    </section>
  );
  return expanded ? <ReplayImmersiveView label={t('title')} onClose={() => setExpanded(false)}>{content}</ReplayImmersiveView> : content;
};

export default PassReplay;
