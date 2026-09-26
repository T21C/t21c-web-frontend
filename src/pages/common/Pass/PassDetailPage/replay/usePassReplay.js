// tuf-search: #usePassReplay #replaySession
import { useCallback, useEffect, useRef, useState } from 'react';
import { playerMessageSchema, replayConfiguration, replayOpenPayload } from './replayDelivery';

export default function usePassReplay(pass) {
  const iframeRef = useRef(null);
  const session = useRef(null);
  const [view, setView] = useState({ status: 'idle', error: '', src: '' });
  const dispose = useCallback(() => {
    const current = session.current;
    if (!current) return;
    clearTimeout(current.timeout);
    iframeRef.current?.contentWindow?.postMessage({ source: 'tuf-replay', protocolVersion: 3, sessionId: current.id, type: 'host.dispose' }, current.config.player);
    session.current = null;
  }, []);
  const close = useCallback(() => { dispose(); setView({ status: 'idle', src: '', error: '' }); }, [dispose]);
  useEffect(() => {
    const onMessage = event => {
      const current = session.current;
      if (!current || event.origin !== current.config.player || event.source !== iframeRef.current?.contentWindow) return;
      const parsed = playerMessageSchema.safeParse(event.data);
      if (!parsed.success || parsed.data.sessionId !== current.id) return;
      if (parsed.data.type === 'player.ready') {
        clearTimeout(current.timeout);
        iframeRef.current.contentWindow.postMessage({ source: 'tuf-replay', protocolVersion: 3, sessionId: current.id, type: 'host.open', payload: current.request }, current.config.player);
        setView(previous => ({ ...previous, status: 'ready' }));
      }
      if (parsed.data.type === 'player.close') close();
    };
    window.addEventListener('message', onMessage);
    return () => { window.removeEventListener('message', onMessage); dispose(); };
  }, [dispose, close]);
  useEffect(() => { close(); }, [pass.id, pass.autoSubmissionRunId, close]);
  const load = () => {
    dispose();
    try {
      const config = replayConfiguration();
      const current = { config, id: crypto.randomUUID(), request: replayOpenPayload(pass) };
      session.current = current;
      const query = new URLSearchParams({ protocolVersion: '3', sessionId: current.id, parentOrigin: location.origin });
      setView({ status: 'loading', src: `${config.player}/replay/embed?${query}`, error: '' });
      // Only the iframe handshake is timed out here; downloads/retries belong to the player.
      current.timeout = setTimeout(() => {
        if (session.current !== current) return;
        dispose(); setView({ status: 'error', src: '', error: 'replay_load_timeout' });
      }, 30000);
    } catch { setView({ status: 'error', src: '', error: 'replay_not_configured' }); }
  };
  const visualsChanged = useDefaults => {
    const current = session.current;
    if (!current) return;
    iframeRef.current?.contentWindow?.postMessage({ source: 'tuf-replay', protocolVersion: 3, sessionId: current.id, type: 'host.visualsChanged', payload: { useDefaults } }, current.config.player);
  };
  return { ...view, iframeRef, load, close, visualsChanged };
}
