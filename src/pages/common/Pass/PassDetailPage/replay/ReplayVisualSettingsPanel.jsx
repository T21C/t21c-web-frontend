// tuf-search: #ReplayVisualSettings #passDetail #replayVisuals
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { availableDefaults, visualSettingsSchema } from './replayVisualSettings';
import './replay-visual-settings.css';

export default function ReplayVisualSettings({ passId, onClose, onChanged, popupRoot }) {
  const { t } = useTranslation('pages', { keyPrefix: 'passDetail.replay.visualSettings' });
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({ keyviewer_id: null, overlay_id: null });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [kind, setKind] = useState('keyviewer');
  const group = useId();
  const sources = { dmnote: 'DMNote', 'impl-dmnote': 'Impl DMNote', 'jipper-keyviewer': 'Jipper KeyViewer', 'jipper-resourcepack': 'Jipper ResourcePack', implresourcepack: 'ImplResourcePack', 'impl-resourcepack': 'ImplResourcePack' };
  const panel = useRef(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    const before = document.activeElement;
    panel.current?.focus();
    return () => { active.current = false; before?.focus?.(); };
  }, []);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setBusy(true); setError(''); setSettings(null);
    api.get(routes.database.passes.replayVisuals(passId), { signal: controller.signal })
      .then(response => {
        if (!current) return;
        const next = visualSettingsSchema.parse(response.data);
        setSettings(next); setDraft(next.defaults);
      }).catch(() => { if (current) setError(t('loadFailed')); })
      .finally(() => { if (current) setBusy(false); });
    return () => { current = false; controller.abort(); };
  }, [passId, attempt, t]);
  const save = async event => {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try {
      const response = await api.put(routes.database.passes.replayVisuals(passId), draft);
      if (!active.current) return;
      const next = visualSettingsSchema.parse(response.data);
      setSettings(next); setDraft(next.defaults); setSaved(true); onChanged(true);
    } catch { if (active.current) setError(t('saveFailed')); }
    finally { if (active.current) setBusy(false); }
  };
  const visibility = async preset => {
    setBusy(true); setError(''); setSaved(false);
    try {
      const response = await api.put(routes.database.passes.replayVisualVisibility(passId, preset.id), { hidden: !preset.is_hidden });
      if (!active.current) return;
      const next = visualSettingsSchema.parse(response.data);
      setSettings(next); setDraft(previous => availableDefaults(previous, next.presets)); onChanged(false);
    } catch { if (active.current) setError(t('visibilityFailed')); }
    finally { if (active.current) setBusy(false); }
  };
  const trapFocus = event => {
    if (event.key !== 'Tab') return;
    const controls = panel.current?.querySelectorAll('button:not(:disabled):not([tabindex="-1"]), input:not(:disabled), [role="tabpanel"]');
    if (!controls?.length) { event.preventDefault(); return; }
    const first = controls[0]; const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <PopupShell onClose={onClose} ariaLabel={t('title')} overlayClassName="replay-visual-settings-overlay" panelClassName="replay-visual-settings" root={popupRoot}>
    <div ref={panel} tabIndex={-1} onKeyDown={trapFocus} className="replay-visual-settings-layout">
      <header>
      <div className="replay-visual-settings-heading"><h2>{t('title')}</h2><button className="btn-fill-neutral-dark" type="button" onClick={onClose}>{t('close')}</button></div>
      <p>{t('description')}</p>
      <div role="tablist" aria-label={t('library')} className="replay-visual-settings-tabs">
        {['keyviewer', 'overlay'].map(value => <button key={value} type="button" role="tab" id={`${group}-${value}-tab`} aria-controls={`${group}-gallery`} aria-selected={kind === value} tabIndex={kind === value ? 0 : -1} onClick={() => setKind(value)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 'keyviewer' : event.key === 'End' ? 'overlay' : kind === 'keyviewer' ? 'overlay' : 'keyviewer';
          setKind(next); document.getElementById(`${group}-${next}-tab`)?.focus();
        }}>{t(value)}</button>)}
      </div>
      </header>
      <form onSubmit={save} aria-busy={busy}>
        <div className="replay-visual-settings-scroll" role="tabpanel" id={`${group}-gallery`} aria-labelledby={`${group}-${kind}-tab`} tabIndex={0}>
          {settings && <>
            <label className="replay-visual-settings-none"><input type="radio" name={`${group}-${kind}`} checked={draft[`${kind}_id`] === null} disabled={busy} onChange={() => { setDraft(previous => ({ ...previous, [`${kind}_id`]: null })); setSaved(false); }} />{t('none')}</label>
            <div className="replay-visual-settings-grid">
              {settings.presets.filter(preset => preset.kind === kind).map(preset => <div key={preset.id} className={`replay-visual-settings-card${draft[`${kind}_id`] === preset.id ? ' is-selected' : ''}${preset.is_hidden ? ' is-hidden' : ''}`}>
                <label>
                  <input className="replay-visual-settings-radio" type="radio" name={`${group}-${kind}`} checked={draft[`${kind}_id`] === preset.id} disabled={busy || preset.is_hidden} onChange={() => { setDraft(previous => ({ ...previous, [`${kind}_id`]: preset.id })); setSaved(false); }} />
                  <span className="replay-visual-settings-avatar" aria-hidden="true">{Array.from(preset.name)[0] ?? '?'}</span>
                  {draft[`${kind}_id`] === preset.id && <span className="replay-visual-settings-check" aria-hidden="true">✓</span>}
                  <span className="replay-visual-settings-card-info"><strong>{preset.name}</strong><span className="replay-visual-settings-source">{sources[preset.source] ?? preset.source}</span></span>
                </label>
                <div className="replay-visual-settings-card-actions"><span>{preset.is_hidden ? t('hidden') : ''}</span><button className="btn-fill-neutral-dark btn-sm" type="button" disabled={busy} onClick={() => visibility(preset)} aria-label={t(preset.is_hidden ? 'showNamed' : 'hideNamed', { name: preset.name })}>{t(preset.is_hidden ? 'show' : 'hide')}</button></div>
              </div>)}
            </div>
            {!settings.presets.some(preset => preset.kind === kind) && <p className="replay-visual-settings-empty">{t('empty')}</p>}
            <p className="replay-visual-settings-hint">{t('hideHint')}</p>
          </>}
          {!settings && !busy && <button className="btn-fill-neutral-dark" type="button" onClick={() => setAttempt(value => value + 1)}>{t('retry')}</button>}
        </div>
        <footer>
          {error && <p role="alert">{error}</p>}
          <div role="status">{busy ? t('working') : saved ? t('saved') : ''}</div>
          <div className="replay-visual-settings-footer-actions"><button className="btn-fill-neutral-dark" type="button" onClick={onClose}>{t('close')}</button><button className="btn-fill-primary" type="submit" disabled={busy || !settings}>{t('save')}</button></div>
        </footer>
      </form>
    </div>
  </PopupShell>;
}
