// tuf-search: #usePassReplay #replaySession
import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultReplaySettings, playerMessageSchema, replayConfiguration } from './replayDelivery';

export default function usePassReplay(pass) {
  const iframeRef = useRef(null);
  const session = useRef(null);
  const [view, setView] = useState({ status: 'idle', error: '', src: '', paused: true, positionUs: 0, durationUs: 0, settings: defaultReplaySettings });
  const dispose = useCallback(() => {
    const current = session.current;
    if (!current) return;
    current.abort.abort(); clearTimeout(current.timeout);
    iframeRef.current?.contentWindow?.postMessage({ source: 'tuf-replay', protocolVersion: 1, sessionId: current.id, type: 'host.command', payload: { commandId: ++current.commandId, command: 'dispose' } }, current.config.player);
    session.current = null;
  }, []);
  const close = useCallback(() => { dispose(); setView(current => ({ ...current, status: 'idle', src: '', error: '', positionUs: 0, paused: true })); }, [dispose]);
  const fail = useCallback(code => { dispose(); setView(current => ({ ...current, status: 'error', src: '', error: code, paused: true })); }, [dispose]);
  const command = useCallback((name, payload = {}) => {
    const current = session.current;
    if (!current?.loaded) return;
    iframeRef.current?.contentWindow?.postMessage({ source: 'tuf-replay', protocolVersion: 1, sessionId: current.id, type: 'host.command', payload: { commandId: ++current.commandId, command: name, ...payload } }, current.config.player);
  }, []);
  useEffect(() => {
    const onMessage = event => {
      const current = session.current;
      if (!current || event.origin !== current.config.player || event.source !== iframeRef.current?.contentWindow) return;
      const parsed = playerMessageSchema.safeParse(event.data);
      if (!parsed.success || parsed.data.sessionId !== current.id) return;
      const { type, payload } = parsed.data;
      if (type === 'player.ready' && current.data && !current.sent) {
        current.sent = true;
        const init = { ...current.data, initialSettings: current.settings };
        iframeRef.current.contentWindow.postMessage({ source: 'tuf-replay', protocolVersion: 1, sessionId: current.id, type: 'host.init', payload: init }, current.config.player, [init.level.archive, ...init.replay.files.map(file => file.data)]);
        current.data = null;
      }
      if (type === 'player.loaded' && current.sent && !current.loaded) {
        clearTimeout(current.timeout); current.loaded = true;
        setView(previous => ({ ...previous, status: 'ready', durationUs: payload.durationUs, positionUs: payload.positionUs, settings: payload.appliedSettings, paused: true }));
      }
      if (type === 'player.state' && current.loaded && payload.appliedCommandId === current.commandId && payload.positionUs <= payload.durationUs) {
        setView(previous => ({ ...previous, ...payload }));
      }
      if (type === 'player.error') fail(payload.code);
    };
    window.addEventListener('message', onMessage);
    return () => { window.removeEventListener('message', onMessage); dispose(); };
  }, [dispose, fail]);
  const load = async () => {
    dispose();
    let current;
    try {
      const config = replayConfiguration();
      current = { config, id: crypto.randomUUID(), abort: new AbortController(), commandId: 0, loaded: false, sent: false, settings: view.settings };
      session.current = current;
      setView(previous => ({ ...previous, status: 'loading', src: '', error: '' }));
      current.timeout = setTimeout(() => { if (session.current === current) fail('replay_load_timeout'); }, 120000);
      const { loadReplay } = await import('./loadReplay');
      if (session.current !== current) return;
      current.data = await loadReplay(pass, config, current.abort.signal);
      if (session.current !== current) return;
      const query = new URLSearchParams({ protocolVersion: '1', sessionId: current.id, parentOrigin: location.origin });
      setView(previous => ({ ...previous, src: `${config.player}/replay/embed?${query}` }));
    } catch (error) {
      if (current && session.current !== current) return;
      fail(error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : 'replay_download_failed');
    }
  };
  return { ...view, iframeRef, load, close, command };
}
