// tuf-search: #ModReleasePopup
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { ExternalLinkIcon } from '@/components/common/icons';
import api from '@/utils/api';
import { isZipUrl, modPlatforms, releaseDownloadFields } from './modReleaseDownloads';
export { buildModReleaseBody } from './modReleaseDownloads';
import './modReleasePopup.css';

const VERSION_MAX = 64;
const NOTE_MAX = 16384;
const ZIP_MAX_BYTES = 100 * 1024 * 1024;
const pad = (value) => String(value).padStart(2, '0');

export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function fromDatetimeLocalValue(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
function emptyForm(release) {
  return {
    source: release?.source === 'hosted' ? 'zip' : 'github',
    version: release?.version || '', notes: release?.notes || '',
    releasedAt: toDatetimeLocalValue(release?.releasedAt),
    githubUrl: release?.githubUrl || (release?.source === 'github' ? release.downloadUrl || '' : ''),
    downloadUrl: isZipUrl(release?.downloadUrl) ? release.downloadUrl : '',
    platformDownloadUrls: release?.platformDownloadUrls || {},
    downloadMode: Object.keys(release?.platformDownloadUrls || {}).length ? 'platforms' : 'common',
    file: null,
  };
}
function activeUrls(form) {
  return [form.downloadUrl, ...(form.downloadMode === 'platforms'
    ? Object.values(form.platformDownloadUrls) : [])].filter((url) => url?.trim());
}
function canSubmit(form, sourceLocked) {
  if (!form.version.trim()) return false;
  if (form.source === 'zip') return sourceLocked || Boolean(form.file && form.file.size <= ZIP_MAX_BYTES);
  const urls = activeUrls(form);
  return urls.length > 0 && urls.every(isZipUrl);
}
export default function ModReleasePopup({ isOpen, release, onClose, onSubmit, assetsUrl }) {
  const { t } = useTranslation(['pages', 'common']);
  const isEdit = Boolean(release);
  const sourceLocked = isEdit && release?.source === 'hosted';
  const [form, setForm] = useState(() => emptyForm(release));
  const [submitting, setSubmitting] = useState(false);
  const [fileError, setFileError] = useState('');
  const [assets, setAssets] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [assetError, setAssetError] = useState('');
  const [touched, setTouched] = useState({});
  const detection = useRef(null);
  const versionInput = useRef(null);
  const importDetails = useRef(null);
  const busy = submitting || detecting;
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement;
    setForm(emptyForm(release)); setSubmitting(false); setFileError('');
    setAssets([]); setAssetError(''); setDetecting(false); setTouched({});
    const timer = setTimeout(() => versionInput.current?.focus(), 0);
    return () => { clearTimeout(timer); detection.current?.abort(); previousFocus?.focus?.(); };
  }, [isOpen, release]);
  if (!isOpen) return null;
  const ux = (key, options) => t(`mods.releases.ux.${key}`, options);
  const setField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  const onFileChange = (event) => {
    const next = event.target.files?.[0] || null;
    if (next && (next.size > ZIP_MAX_BYTES || !/\.zip$/i.test(next.name))) {
      setFileError(next.size > ZIP_MAX_BYTES ? t('mods.releases.zipTooLarge') : ux('invalidFile'));
      setForm((prev) => ({ ...prev, file: null })); event.target.value = ''; return;
    }
    setFileError(''); setForm((prev) => ({ ...prev, file: next }));
  };
  const detectAssets = async () => {
    if (!assetsUrl || !form.githubUrl.trim() || busy) return;
    const controller = new AbortController();
    detection.current?.abort(); detection.current = controller;
    setDetecting(true); setAssetError(''); setAssets([]);
    try {
      const {data} = await api.post(assetsUrl, {githubUrl: form.githubUrl.trim()}, {signal: controller.signal});
      if (controller.signal.aborted) return;
      setAssets(data.assets || []); setTouched({});
      setForm((prev) => ({...prev,
        githubUrl: data.githubUrl || prev.githubUrl, version: prev.version || data.version || '',
        downloadUrl: data.downloadUrl || '', platformDownloadUrls: data.platformDownloadUrls || {},
        downloadMode: (data.assets || []).some((asset) => modPlatforms.includes(asset.platform)) ? 'platforms' : 'common',
      }));
      if (importDetails.current) {
        importDetails.current.open = false;
        importDetails.current.querySelector('summary')?.focus();
      }
    } catch (error) {
      if (!controller.signal.aborted) setAssetError(error.response?.data?.error || t('mods.releases.detectFailed'));
    } finally { if (!controller.signal.aborted) setDetecting(false); }
  };
  const zipField = (key, label, value, onChange, placeholder) => {
    const invalid = touched[key] && value?.trim() && !isZipUrl(value);
    const candidates = assets.filter((asset) => asset.platform === (key === 'common' ? 'common' : key));
    const ordered = [...candidates, ...assets.filter((asset) => !candidates.includes(asset))];
    return (
      <div className="mod-release-popup__url-row" key={key}>
        <label htmlFor={`mod-release-url-${key}`}>{label}</label>
        <div className="mod-release-popup__url-control">
          <input id={`mod-release-url-${key}`} type="url" value={value || ''} maxLength={2048}
            onChange={(event) => onChange(event.target.value)} onBlur={() => setTouched((prev) => ({...prev, [key]: true}))}
            disabled={busy} placeholder={placeholder} aria-invalid={Boolean(invalid)}
            aria-describedby={invalid ? `mod-release-error-${key}` : undefined} />
          {assets.length > 0 && (candidates.length !== 1 || candidates[0].url !== value) && (
            <select value={assets.some((asset) => asset.url === value) ? value : ''}
              onChange={(event) => event.target.value && onChange(event.target.value)} disabled={busy}
              aria-label={`${label} — ${t('mods.releases.chooseAsset')}`}>
              <option value="">{t('mods.releases.chooseAsset')}</option>
              {ordered.map((asset) => <option key={asset.url} value={asset.url}>{asset.name}</option>)}
            </select>
          )}
          {invalid ? <p id={`mod-release-error-${key}`} className="mod-release-popup__error">{ux('invalidUrl')}</p> : null}
        </div>
      </div>
    );
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit(form, sourceLocked) || busy) return;
    setSubmitting(true);
    try {
      await onSubmit?.({version: form.version.trim(), notes: form.notes.trim(),
        releasedAt: fromDatetimeLocalValue(form.releasedAt),
        ...(form.source === 'github' ? releaseDownloadFields(form) : {}),
        file: form.source === 'zip' ? form.file : null});
    } catch { /* Parent shows the error toast; keep the draft open. */ }
    finally { setSubmitting(false); }
  };
  const trapFocus = (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll('button, input, textarea, select, summary, a[href]')]
      .filter((node) => !node.disabled && node.getClientRects().length);
    const first = controls[0]; const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  const status = !form.version.trim() ? ux('needVersion')
    : form.source === 'zip' ? (sourceLocked || form.file ? '' : t('mods.releases.zipHint'))
    : !activeUrls(form).length ? ux('needUrl') : !activeUrls(form).every(isZipUrl) ? ux('invalidUrl') : '';
  return (
    <PopupShell onClose={onClose} closeDisabled={busy} overlayClassName="mod-release-popup"
      panelClassName="mod-release-popup__panel" ariaLabelledBy="mod-release-popup-title" mount="documentBody" when={isOpen}>
      <form onSubmit={submit} onKeyDown={trapFocus}>
        <header className="mod-release-popup__header">
          <div><h2 id="mod-release-popup-title" className="mod-release-popup__title">
            {isEdit ? t('mods.releases.editTitle') : t('mods.releases.addTitle')}
          </h2>{isEdit && <p className="mod-release-popup__subtitle">{release.version}</p>}</div>
          <CloseButton onClick={onClose} disabled={busy} aria-label={t('buttons.close', {ns: 'common'})} />
        </header>
        <div className="mod-release-popup__body">
          <div className="mod-release-popup__metadata">
            <label className="mod-release-popup__field"><span>{t('mods.fields.version')}</span>
              <input ref={versionInput} type="text" value={form.version} onChange={setField('version')}
                maxLength={VERSION_MAX} disabled={busy} required placeholder="1.0.0" />
            </label>
            <label className="mod-release-popup__field"><span>{t('mods.releases.releasedAt')}</span>
              <input type="datetime-local" value={form.releasedAt} onChange={setField('releasedAt')} disabled={busy} />
            </label>
          </div>
          <section className="mod-release-popup__section" aria-labelledby="mod-release-download-title">
            <div className="mod-release-popup__section-heading">
              <h3 id="mod-release-download-title">{ux('downloads')}</h3>
              <div className="mod-release-popup__segments" role="group" aria-label={t('mods.releases.source')}>
                {['github', 'zip'].map((source) => (
                  <button key={source} type="button" aria-pressed={form.source === source} disabled={sourceLocked || busy}
                    onClick={() => {setForm((prev) => ({...prev, source, file: null})); setFileError('');}}>
                    {ux(source === 'github' ? 'urlSource' : 'uploadSource')}
                  </button>
                ))}
              </div>
            </div>
            {form.source === 'zip' ? sourceLocked ? (
              <div className="mod-release-popup__upload">
                <a href={release.downloadUrl} className="mod-release-popup__zip-link">
                  {release.originalFilename || t('mods.releases.downloadZipFallback')}
                  <ExternalLinkIcon size={16} color="currentColor" />
                </a><p className="mod-release-popup__hint">{t('mods.releases.hostedZipHint')}</p>
              </div>
            ) : (
              <label className="mod-release-popup__upload"><span>{t('mods.releases.zip')}</span>
                <input type="file" accept=".zip,application/zip" onChange={onFileChange} disabled={busy} />
                <span className="mod-release-popup__hint">{t('mods.releases.zipHint')}</span>
                {fileError && <span className="mod-release-popup__error" role="alert">{fileError}</span>}
              </label>
            ) : (
              <div className="mod-release-popup__downloads">
                <details ref={importDetails} className="mod-release-popup__import">
                  <summary>{ux('importGithub')}<span>{ux('optional')}</span></summary>
                  <div className="mod-release-popup__import-body">
                    <label htmlFor="mod-release-github">{t('mods.releases.githubUrl')}</label>
                    <div className="mod-release-popup__import-row">
                      <input id="mod-release-github" type="url" value={form.githubUrl} onChange={setField('githubUrl')}
                        disabled={busy} placeholder="https://github.com/org/repo/releases/tag/v1.0.0" />
                      <button type="button" className="btn-fill-secondary" onClick={detectAssets}
                        disabled={busy || !assetsUrl || !form.githubUrl.trim()}>
                        {detecting ? t('mods.releases.detecting') : ux('importAction')}
                      </button>
                    </div><p className="mod-release-popup__hint">{ux('importHint')}</p>
                    {assetError && <p className="mod-release-popup__error" role="alert">{assetError}</p>}
                  </div>
                </details>
                {assets.length > 0 && <p className="mod-release-popup__import-result" role="status">
                  <strong>{ux('imported', {count: assets.length})}</strong> {t('mods.releases.assetsHint')}
                </p>}
                <div className="mod-release-popup__segments mod-release-popup__mode" role="group" aria-label={t('mods.releases.downloadMode')}>
                  {['common', 'platforms'].map((mode) => (
                    <button key={mode} type="button" aria-pressed={form.downloadMode === mode} disabled={busy}
                      onClick={() => setForm((prev) => ({...prev, downloadMode: mode}))}>
                      {ux(mode === 'common' ? 'commonMode' : 'platformMode')}
                    </button>
                  ))}
                </div>
                <p className="mod-release-popup__hint">{ux(form.downloadMode === 'common' ? 'commonHint' : 'platformHint')}</p>
                <div className="mod-release-popup__url-list">
                  {form.downloadMode === 'platforms' && modPlatforms.map((platform) => zipField(platform,
                    t(`mods.releases.platforms.${platform}`), form.platformDownloadUrls[platform],
                    (url) => setForm((prev) => ({...prev, platformDownloadUrls: {...prev.platformDownloadUrls, [platform]: url}})),
                    `https://example.com/Mod.${platform}.zip`))}
                  {zipField('common', ux(form.downloadMode === 'platforms' ? 'fallbackLabel' : 'commonLabel'), form.downloadUrl,
                    (downloadUrl) => setForm((prev) => ({...prev, downloadUrl})), 'https://example.com/Mod.zip')}
                </div>
              </div>
            )}
          </section>
          <label className="mod-release-popup__field mod-release-popup__notes">
            <span>{t('mods.fields.notes')} <small>{ux('optional')}</small></span>
            <textarea value={form.notes} onChange={setField('notes')} maxLength={NOTE_MAX} disabled={busy} rows={3} />
          </label>
        </div>
        <footer className="mod-release-popup__footer">
          <p className="mod-release-popup__hint" aria-live="polite">{status}</p>
          <div className="mod-release-popup__actions">
            <button type="button" className="btn-fill-secondary" onClick={onClose} disabled={busy}>{t('buttons.cancel', {ns: 'common'})}</button>
            <button type="submit" className="btn-fill-primary" disabled={busy || !canSubmit(form, sourceLocked)}>
              {submitting ? ux('saving') : isEdit ? t('mods.releases.save') : t('mods.releases.add')}
            </button>
          </div>
        </footer>
      </form>
    </PopupShell>
  );
}
