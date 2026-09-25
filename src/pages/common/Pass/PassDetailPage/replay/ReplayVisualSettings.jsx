// tuf-search: #ReplayVisualSettings #passDetail #replayVisuals
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { availableDefaults, visualSettingsSchema } from './replayVisualSettings';
import './replay-visual-settings.css';

export default function ReplayVisualSettings({ passId, onClose, onChanged }) {
  const { t } = useTranslation('pages', { keyPrefix: 'passDetail.replay.visualSettings' });
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({ keyviewer_id: null, overlay_id: null });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
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
    const controls = panel.current?.querySelectorAll('button:not(:disabled), select:not(:disabled)');
    if (!controls?.length) { event.preventDefault(); return; }
    const first = controls[0]; const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <PopupShell onClose={onClose} ariaLabel={t('title')} panelClassName="replay-visual-settings">
    <div ref={panel} tabIndex={-1} onKeyDown={trapFocus}>
      <div className="replay-visual-settings-heading"><h2>{t('title')}</h2><button type="button" onClick={onClose}>{t('close')}</button></div>
      <p>{t('description')}</p>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">{t('working')}</p>}
      {!settings && !busy && <button type="button" onClick={() => setAttempt(value => value + 1)}>{t('retry')}</button>}
      {settings && <>
        <form onSubmit={save} aria-busy={busy}>
          {['keyviewer', 'overlay'].map(kind => <label key={kind}>
            <span>{t(kind)}</span>
            <select disabled={busy} value={draft[`${kind}_id`] ?? ''} onChange={event => { setDraft(previous => ({ ...previous, [`${kind}_id`]: event.target.value || null })); setSaved(false); }}>
              <option value="">{t('none')}</option>
              {settings.presets.filter(preset => preset.kind === kind && !preset.is_hidden).map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </select>
          </label>)}
          <button className="btn-fill-primary" type="submit" disabled={busy}>{t('save')}</button>
          {saved && <span role="status">{t('saved')}</span>}
        </form>
        <h3>{t('library')}</h3><p>{t('hideHint')}</p>
        {settings.presets.length === 0 ? <p>{t('empty')}</p> : <ul>
          {settings.presets.map(preset => <li key={preset.id}>
            <div><strong>{preset.name}</strong><small>{t(preset.kind)}{preset.is_hidden ? ` · ${t('hidden')}` : ''}</small></div>
            <button type="button" disabled={busy} onClick={() => visibility(preset)} aria-label={t(preset.is_hidden ? 'showNamed' : 'hideNamed', { name: preset.name })}>{t(preset.is_hidden ? 'show' : 'hide')}</button>
          </li>)}
        </ul>}
      </>}
    </div>
  </PopupShell>;
}
