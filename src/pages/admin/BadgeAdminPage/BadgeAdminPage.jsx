import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { MetaTags, AccessDenied } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { CustomSelect, StateDisplay } from '@/components/common/selectors';
import { QuestionmarkCircleIcon, RefreshIcon } from '@/components/common/icons';
import { CloseButton } from '@/components/common/buttons';
import { PopupShell } from '@/components/common/PopupShell';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import BadgeHelpPopup from '@/components/popups/Badges/BadgeHelpPopup';
import './badgeAdminPage.css';

const REDUCERS = [
  'threshold', 'coverage', 'percentOf', 'record', 'pattern', 'sequence',
  'gap', 'nthClearer', 'chase', 'best', 'manual', 'pack', 'value',
];
const GRANTS = ['live', 'persistTier', 'persistSnapshot', 'resetOnGrowth', 'manualLock', 'chase'];
const IDENTITIES = ['level', 'chartSubgroup', 'vfxSubgroup', 'group'];
const BACKFILLS = ['now', 'forward', 'queue'];
const STATS = ['tier', 'credit', 'bar', 'barThenNumber'];
const CONFIRMS = ['none', 'accuracyFull', 'judgementsFull'];
const AUDIENCES = ['player', 'creator'];
const PAGE_TABS = ['definitions', 'reviews', 'jobs'];

const EXAMPLES = [
  'curve(count(distinct(clears.filter(clear => clear.worldsFirst == true), clear => clear.identity)), 1, 1)',
  'result(difficulty("G10").total >= 8 && difficulty("G10").ratio >= 0.75 ? 1 : 0, difficulty("G10").cleared, 0, difficulty("G10").total)',
  'result(consecutive([264, 11063, 7740, 12290], clear => clear.ppMinusOne == true) == 4 ? 1 : 0, consecutive([264, 11063, 7740, 12290], clear => clear.ppMinusOne == true), 0, 4)',
];

const emptyForm = () => ({
  id: null,
  slug: '',
  name: '',
  audience: 'player',
  reducer: 'value',
  grant: 'live',
  identity: 'level',
  backfill: 'now',
  enabled: true,
  secret: false,
  replace: false,
  weight: 1,
  icon: '',
  color: '',
  stat: 'barThenNumber',
  purple: false,
  confirm: 'none',
  round: 'none',
  direction: 'up',
  start: 1,
  step: 0.5,
  tierLabels: [{ minTier: 1, label: 'common' }],
  expression: 'curve(count(distinct(clears, clear => clear.identity)), 1, 1)',
  aggregate: 'countDistinct',
  role: 'either',
  sole: false,
  source: 'set',
  setName: '',
  curationType: 'V3',
  types: 'C1, C2, C3',
  prefix: true,
  ordered: false,
  roleScoped: false,
  fraction: 0.75,
  minCharts: 10,
  difficultyName: '',
  family: '',
  metric: 'accuracy',
  creditFrom: 'charts',
  requireWorldsFirst: false,
  requireHighestScore: false,
  requireHighestSpeed: false,
  sharedAccuracy: false,
  rangeSize: '',
  order: '',
  consecutive: false,
  exclude: 'Impossible, Censored',
  minDays: 730,
  countN: 100,
  packId: null,
  packName: '',
  manualKind: 'pattern',
});

function asOptions(values) {
  return values.map((value) => ({ value, label: value }));
}

function selected(options, value) {
  return options.find((option) => option.value === value) ?? null;
}

function listText(value) {
  return Array.isArray(value) ? value.join(', ') : '';
}

function editorTabs(t) {
  return [
    { id: 'badge', label: t('badges.admin.sectionBadge', { defaultValue: 'Badge' }) },
    { id: 'condition', label: t('badges.admin.sectionFormula', { defaultValue: 'Grant script' }) },
    { id: 'display', label: t('badges.admin.sectionDisplay', { defaultValue: 'Display' }) },
    { id: 'publish', label: t('badges.admin.sectionPublish', { defaultValue: 'Publish' }) },
  ];
}

function formFromRow(row) {
  const curve = row.curve || {};
  const display = row.display || {};
  const params = row.params || {};
  const sequence = params.sequence || params;
  const pattern = params.pattern || params;
  return {
    ...emptyForm(),
    id: row.id,
    slug: row.slug,
    name: row.name,
    audience: row.audience,
    reducer: row.reducer,
    grant: row.grantMode,
    identity: row.identityMode,
    backfill: row.backfill,
    enabled: row.enabled !== false,
    secret: Boolean(row.secret),
    weight: row.weight ?? 1,
    icon: display.icon || '',
    color: display.color || '',
    stat: display.stat || 'barThenNumber',
    purple: Boolean(display.purple),
    confirm: row.confirmMode || 'none',
    round: curve.round || 'none',
    direction: curve.direction || 'up',
    start: curve.start ?? 1,
    step: curve.step ?? 0.5,
    tierLabels: Array.isArray(row.tierLabels) && row.tierLabels.length ? row.tierLabels : [{ minTier: 1, label: '' }],
    expression: String(pattern.expression || sequence.expression || params.expression || '').replace(/^=/, ''),
    aggregate: params.aggregate || 'countDistinct',
    role: params.role || 'either',
    sole: Boolean(params.sole),
    source: params.source || 'set',
    setName: params.set || '',
    curationType: params.curationType || '',
    types: listText(params.types),
    prefix: params.prefix !== false,
    ordered: Boolean(params.ordered),
    roleScoped: Boolean(params.roleScoped),
    fraction: params.fraction ?? 0.75,
    minCharts: params.minCharts ?? 0,
    difficultyName: params.difficultyName || '',
    family: params.family || '',
    metric: params.metric || 'accuracy',
    creditFrom: params.creditFrom || 'charts',
    requireWorldsFirst: Boolean(params.requireWorldsFirst),
    requireHighestScore: Boolean(params.requireHighestScore),
    requireHighestSpeed: Boolean(params.requireHighestSpeed),
    sharedAccuracy: Boolean(params.sharedAccuracy),
    rangeSize: sequence.rangeSize ?? '',
    order: listText(sequence.order),
    consecutive: Boolean(sequence.consecutive),
    exclude: listText(params.excludeDifficultyNames || sequence.excludeDifficultyNames),
    minDays: params.minDays ?? 0,
    countN: params.n ?? 100,
    packId: params.packId ?? null,
    packName: params.packName || '',
    manualKind: params.kind || 'pattern',
  };
}

function BadgeEditorPopup({
  form,
  setForm,
  formulaState,
  packs,
  packQuery,
  setPackQuery,
  onClose,
  onSave,
}) {
  const { t } = useTranslation(['pages', 'common']);
  const [tab, setTab] = useState('condition');
  const tabs = editorTabs(t);
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!tabs.some((item) => item.id === tab)) setTab(tabs[0]?.id || 'badge');
  }, [tab, tabs]);

  return (
    <PopupShell
      onClose={onClose}
      overlayClassName="badge-editor-popup"
      panelClassName="badge-editor-popup__panel"
      ariaLabelledBy="badge-editor-title"
    >
      <div className="badge-editor-popup__header">
        <h2 id="badge-editor-title">
          {form.id ? form.name || t('badges.admin.title') : t('badges.admin.new')}
        </h2>
        <CloseButton onClick={onClose} aria-label={t('buttons.close', { ns: 'common' })} />
      </div>
      <div className="badge-editor-popup__tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`badge-editor-popup__tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="badge-editor-popup__body" role="tabpanel">
        {tab === 'badge' && (
          <div className="badge-editor-popup__fields">
            <label>{t('badges.admin.slug')}<input value={form.slug} onChange={(event) => setField('slug', event.target.value)} /></label>
            <label>{t('badges.admin.name')}<input value={form.name} onChange={(event) => setField('name', event.target.value)} /></label>
            <CustomSelect label={t('badges.admin.audience')} options={asOptions(AUDIENCES)} value={selected(asOptions(AUDIENCES), form.audience)} onChange={(option) => setField('audience', option.value)} width="16rem" />
            <CustomSelect label={t('badges.admin.identity')} options={asOptions(IDENTITIES)} value={selected(asOptions(IDENTITIES), form.identity)} onChange={(option) => setField('identity', option.value)} width="16rem" />
            <div className="badge-editor-popup__toggles">
              <StateDisplay label={t('badges.admin.enabled')} states={['off', 'on']} currentState={form.enabled ? 'on' : 'off'} onChange={(next) => setField('enabled', next === 'on')} />
              <StateDisplay label={t('badges.admin.secret')} states={['off', 'on']} currentState={form.secret ? 'on' : 'off'} onChange={(next) => setField('secret', next === 'on')} />
            </div>
          </div>
        )}
        {tab === 'condition' && (
          <div className="badge-editor-popup__fields">
            <p className="badge-editor-popup__hint">
              {t('badges.admin.valueHint', { defaultValue: 'This expression returns the tier. clears, levels, and mine are the rows. curve(count, start, step) and curveDown turn a count into tiers. result(tier, credit, from, to) sets the bar yourself. Placeholder judgement sheets keep accuracy and judgement fields empty.' })}
            </p>
            <div className={`badge-editor-popup__formula${formulaState.ok ? '' : ' is-bad'}`}>
              <textarea value={form.expression} rows={8} spellCheck={false} onChange={(event) => setField('expression', event.target.value)} />
            </div>
            <p className={formulaState.ok ? 'badge-editor-popup__ok' : 'badge-editor-popup__err'}>
              {formulaState.ok
                ? t('badges.admin.formulaOk', { defaultValue: 'Expression is valid' })
                : formulaState.error}
            </p>
            <div className="badge-editor-popup__chips">
              {EXAMPLES.map((example) => (
                <button key={example} type="button" onClick={() => setField('expression', example)}>{example}</button>
              ))}
            </div>
            {/\bpack\s*\(/.test(form.expression) && (
              <div className="badge-editor-popup__packs">
                <label>{t('badges.admin.packName', { defaultValue: 'Pack name' })}<input value={form.packName} onChange={(event) => setField('packName', event.target.value)} /></label>
                <input value={packQuery} placeholder={t('badges.admin.packSearch')} onChange={(event) => setPackQuery(event.target.value)} />
                {packs.map((pack) => (
                  <button key={pack.id} type="button" className={form.packId === pack.id ? 'is-active' : ''} onClick={() => setForm((current) => ({ ...current, packId: pack.id, packName: pack.name }))}>
                    {pack.name} #{pack.id}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === 'display' && (
          <div className="badge-editor-popup__fields">
            <CustomSelect label={t('badges.admin.stat')} options={asOptions(STATS)} value={selected(asOptions(STATS), form.stat)} onChange={(option) => setField('stat', option.value)} width="16rem" />
            <CustomSelect label={t('badges.admin.confirm')} options={asOptions(CONFIRMS)} value={selected(asOptions(CONFIRMS), form.confirm)} onChange={(option) => setField('confirm', option.value)} width="16rem" />
            <label>{t('badges.admin.icon')}<input value={form.icon} onChange={(event) => setField('icon', event.target.value)} /></label>
            <label>{t('badges.admin.color')}<input value={form.color} onChange={(event) => setField('color', event.target.value)} /></label>
            <StateDisplay label={t('badges.admin.purple')} states={['off', 'on']} currentState={form.purple ? 'on' : 'off'} onChange={(next) => setField('purple', next === 'on')} />
            <div className="badge-editor-popup__labels">
              <span>{t('badges.admin.labels')}</span>
              {form.tierLabels.map((row, index) => (
                <div key={`${row.minTier}-${index}`} className="badge-editor-popup__label-row">
                  <input type="number" aria-label={t('badges.admin.minTier')} value={row.minTier} onChange={(event) => setForm((current) => {
                    const tierLabels = [...current.tierLabels];
                    tierLabels[index] = { ...row, minTier: Number(event.target.value) };
                    return { ...current, tierLabels };
                  })} />
                  <input aria-label={t('badges.admin.label')} value={row.label} placeholder="common" onChange={(event) => setForm((current) => {
                    const tierLabels = [...current.tierLabels];
                    tierLabels[index] = { ...row, label: event.target.value };
                    return { ...current, tierLabels };
                  })} />
                </div>
              ))}
              <button type="button" className="btn-fill-glass" onClick={() => setForm((current) => ({ ...current, tierLabels: [...current.tierLabels, { minTier: current.tierLabels.length + 1, label: '' }] }))}>
                {t('badges.admin.addLabel')}
              </button>
            </div>
          </div>
        )}
        {tab === 'publish' && (
          <div className="badge-editor-popup__fields">
            <CustomSelect label={t('badges.admin.grant')} options={asOptions(GRANTS)} value={selected(asOptions(GRANTS), form.grant)} onChange={(option) => setField('grant', option.value)} width="16rem" />
            <CustomSelect label={t('badges.admin.backfill')} options={asOptions(BACKFILLS)} value={selected(asOptions(BACKFILLS), form.backfill)} onChange={(option) => setField('backfill', option.value)} width="16rem" />
            <StateDisplay label={t('badges.admin.replace')} states={['off', 'on']} currentState={form.replace ? 'on' : 'off'} onChange={(next) => setField('replace', next === 'on')} />
          </div>
        )}
      </div>
      <div className="badge-editor-popup__footer">
        <button type="button" className="btn-fill-secondary" onClick={onClose}>{t('buttons.cancel', { ns: 'common' })}</button>
        <button type="button" className="btn-fill-primary" onClick={onSave}>{t('badges.admin.save')}</button>
      </div>
    </PopupShell>
  );
}

const BadgeImportPopup = ({ onClose, onImported }) => {
  const { t } = useTranslation(['pages', 'common']);
  const [code, setCode] = useState('');
  const [replace, setReplace] = useState(false);

  const loadRequested = async () => {
    try {
      const res = await api.get(routes.admin.badges.catalog());
      setCode(typeof res.data?.code === 'string' ? res.data.code : '');
      toast.success(t('badges.admin.requestedLoaded'));
    } catch (error) {
      toast.error(error?.response?.data?.error || t('badges.admin.importFailed'));
    }
  };

  const submit = async () => {
    if (!code.trim()) {
      toast.error(t('badges.admin.importFailed'));
      return;
    }
    const toastId = toast.loading(t('loading.saving', { ns: 'common' }));
    try {
      const res = await api.post(routes.admin.badges.import(), { code, replace });
      toast.success(t('badges.admin.imported', { count: res.data?.definitions ?? 0 }), { id: toastId });
      onImported();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.error || t('badges.admin.importFailed'), { id: toastId });
    }
  };

  return (
    <PopupShell
      onClose={onClose}
      overlayClassName="badge-import-popup"
      panelClassName="badge-import-popup__panel"
      ariaLabelledBy="badge-import-title"
    >
      <div className="badge-import-popup__header">
        <h2 id="badge-import-title">{t('badges.admin.importTitle')}</h2>
        <CloseButton onClick={onClose} aria-label={t('buttons.close', { ns: 'common' })} />
      </div>
      <div className="badge-import-popup__body">
        <p className="badge-import-popup__hint">{t('badges.admin.importHint')}</p>
        <textarea
          value={code}
          spellCheck={false}
          onChange={(event) => setCode(event.target.value)}
          aria-label={t('badges.admin.importTitle')}
        />
        <StateDisplay
          label={t('badges.admin.replaceImport')}
          states={['off', 'on']}
          currentState={replace ? 'on' : 'off'}
          onChange={(next) => setReplace(next === 'on')}
        />
      </div>
      <div className="badge-import-popup__footer">
        <button type="button" className="btn-fill-secondary" onClick={loadRequested}>{t('badges.admin.loadRequested')}</button>
        <button type="button" className="btn-fill-secondary" onClick={onClose}>{t('buttons.cancel', { ns: 'common' })}</button>
        <button type="button" className="btn-fill-primary" onClick={submit}>{t('badges.admin.importAction')}</button>
      </div>
    </PopupShell>
  );
};

function progressCount(progress, id) {
  if (!progress || typeof progress !== 'object') return 0;
  const value = progress[id] ?? progress[String(id)];
  return Number(value) || 0;
}

function badgeBackfill(job, row) {
  if (!job || (job.status !== 'running' && job.status !== 'pending')) return null;
  if (job.scope === 'definition' && Number(job.definitionId) !== Number(row.id)) return null;
  if (job.scope === 'player' && row.audience !== 'player') return null;
  if (job.scope === 'creator' && row.audience !== 'creator') return null;
  if (job.scope === 'pack' && Number(row.params?.packId) !== Number(job.packId)) return null;
  const audience = row.audience === 'creator' ? 'creator' : 'player';
  const total = audience === 'creator' ? Number(job.creatorTotal) || 0 : Number(job.playerTotal) || 0;
  if (total <= 0) return null;
  return {
    audience,
    total,
    processed: Math.min(total, progressCount(job.definitionProgress, row.id)),
  };
}

function backfillRatios(job) {
  const ownersDone = Number(job?.processed) || 0;
  const ownersTotal = Number(job?.total) || 0;
  const badgesDone = Number(job?.badgeCursor) || 0;
  const badgesTotal = Number(job?.badgeTotal) || 0;
  return {
    ownersDone,
    ownersTotal,
    badgesDone,
    badgesTotal,
    ownersWidth: ownersTotal ? Math.min(100, (ownersDone / ownersTotal) * 100) : 0,
    badgesWidth: badgesTotal ? Math.min(100, (badgesDone / badgesTotal) * 100) : 0,
    loading: !job || job.status === 'pending' || job.phase === 'loading' || !ownersTotal,
  };
}

function clipName(name, fallback) {
  const text = String(name || '').trim();
  if (!text) return fallback;
  return text.length > 12 ? text.slice(0, 12) : text;
}

function formatEta(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const seconds = Math.round(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function BackfillBars({ job, definitions, t }) {
  const ratios = backfillRatios(job);
  const eta = Number(job?.etaMs) > 0 ? Number(job.etaMs) : null;
  const badge = definitions.find((row) => Number(row.id) === Number(job?.currentDefinitionId));
  const forCreator = badge?.audience === 'creator';
  const who = clipName(job?.currentOwnerName, forCreator ? 'this creator' : 'this player');
  const badgeLabel = t(forCreator ? 'badges.admin.backfillBadgesCreator' : 'badges.admin.backfillBadgesPlayer', {
    defaultValue: forCreator ? 'Badges for {{name}} {{done}} / {{total}}' : 'Badges for {{name}} {{done}} / {{total}}',
    name: who,
    done: ratios.badgesDone,
    total: ratios.badgesTotal,
  });
  return (
    <div className="badge-admin-page__backfill-bars">
      <div className="badge-admin-page__backfill-row">
        <span>{t('badges.admin.backfillOwners', { defaultValue: 'Owners {{done}} / {{total}}', done: ratios.ownersDone, total: ratios.ownersTotal })}</span>
        <div
          className="badge-admin-page__backfill-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={Math.max(ratios.ownersTotal, 1)}
          aria-valuenow={ratios.ownersDone}
          aria-label={t('badges.admin.backfillOwners', { defaultValue: 'Owners {{done}} / {{total}}', done: ratios.ownersDone, total: ratios.ownersTotal })}
        >
          <span style={{ width: `${ratios.ownersWidth}%` }} />
        </div>
      </div>
      <div className="badge-admin-page__backfill-row">
        <span>{badgeLabel}</span>
        <div
          className="badge-admin-page__backfill-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={Math.max(ratios.badgesTotal, 1)}
          aria-valuenow={ratios.badgesDone}
          aria-label={badgeLabel}
        >
          <span style={{ width: `${ratios.badgesWidth}%` }} />
        </div>
      </div>
      <div className="badge-admin-page__backfill-stats">
        <div className={`badge-admin-page__backfill-stat${(Number(job?.playersProcessed) || 0) === 0 && forCreator ? ' is-idle' : ''}`}>
          {!forCreator && (
            <span key={job?.heartbeatAt || `${ratios.ownersDone}-${ratios.badgesDone}`} className="badge-admin-page__pulse" aria-hidden="true" />
          )}
          <span>
            {t('badges.admin.backfillPlayersFinished', {
              defaultValue: '{{done}} / {{total}} players finished',
              done: Number(job?.playersProcessed) || 0,
              total: Number(job?.playerTotal) || 0,
            })}
          </span>
        </div>
        <div className={`badge-admin-page__backfill-stat${(Number(job?.creatorsProcessed) || 0) === 0 && !forCreator ? ' is-idle' : ''}`}>
          {forCreator && (
            <span key={job?.heartbeatAt || `${ratios.ownersDone}-${ratios.badgesDone}-creator`} className="badge-admin-page__pulse" aria-hidden="true" />
          )}
          <span>
            {t('badges.admin.backfillCreatorsFinished', {
              defaultValue: '{{done}} / {{total}} creators finished',
              done: Number(job?.creatorsProcessed) || 0,
              total: Number(job?.creatorTotal) || 0,
            })}
          </span>
        </div>
      </div>
      {badge?.name && <p className="badge-admin-page__backfill-name">{badge.name}</p>}
      {eta != null && (
        <p className="badge-admin-page__backfill-eta">
          {t('badges.admin.backfillEta', { defaultValue: 'About {{eta}} left', eta: formatEta(eta) })}
        </p>
      )}
    </div>
  );
}

const BadgeAdminPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();
  const location = useLocation();
  const [pageTab, setPageTab] = useState('definitions');
  const [definitions, setDefinitions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [formulaState, setFormulaState] = useState({ ok: true, error: '' });
  const [editorOpen, setEditorOpen] = useState(false);
  const [packs, setPacks] = useState([]);
  const [packQuery, setPackQuery] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [reducerFilter, setReducerFilter] = useState('all');
  const [secretFilter, setSecretFilter] = useState('all');
  const [enabledFilter, setEnabledFilter] = useState('all');
  const [videoDrafts, setVideoDrafts] = useState({});
  const [startFrom, setStartFrom] = useState('');

  const audienceOptions = useMemo(() => [
    { value: 'all', label: t('badges.admin.filterAll') },
    { value: 'player', label: t('badges.admin.filterPlayer') },
    { value: 'creator', label: t('badges.admin.filterCreator') },
  ], [t]);
  const reducerOptions = useMemo(() => [
    { value: 'all', label: t('badges.admin.filterAll') },
    ...REDUCERS.map((value) => ({ value, label: value })),
  ], [t]);
  const secretOptions = useMemo(() => [
    { value: 'all', label: t('badges.admin.filterAll') },
    { value: 'secret', label: t('badges.admin.filterSecretOnly') },
    { value: 'public', label: t('badges.admin.filterPublic') },
  ], [t]);
  const enabledOptions = useMemo(() => [
    { value: 'all', label: t('badges.admin.filterAll') },
    { value: 'enabled', label: t('badges.admin.filterEnabledOnly') },
    { value: 'disabled', label: t('badges.admin.filterDisabled') },
  ], [t]);
  const filteredDefinitions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return definitions.filter((row) => {
      if (needle && !`${row.name || ''} ${row.slug || ''} ${row.params?.expression || ''}`.toLowerCase().includes(needle)) return false;
      if (audienceFilter !== 'all' && row.audience !== audienceFilter) return false;
      if (reducerFilter !== 'all' && row.reducer !== reducerFilter) return false;
      if (secretFilter === 'secret' && !row.secret) return false;
      if (secretFilter === 'public' && row.secret) return false;
      if (enabledFilter === 'enabled' && !row.enabled) return false;
      if (enabledFilter === 'disabled' && row.enabled) return false;
      return true;
    });
  }, [definitions, query, audienceFilter, reducerFilter, secretFilter, enabledFilter]);

  const pageMeta = useMemo(
    () => buildStaticPageMeta({
      title: t('badges.admin.metaTitle'),
      description: t('badges.admin.metaDescription'),
      pathname: location.pathname,
      noindex: true,
    }),
    [t, location.pathname],
  );

  const load = useCallback(async () => {
    try {
      const [definitionRes, jobRes, reviewRes] = await Promise.all([
        api.get(routes.admin.badges.definitions()),
        api.get(routes.admin.badges.jobs()),
        api.get(routes.admin.badges.reviews()),
      ]);
      setDefinitions(definitionRes.data?.definitions ?? []);
      setJobs(jobRes.data?.jobs ?? []);
      setReviews(reviewRes.data?.reviews ?? []);
    } catch {
      toast.error(t('badges.admin.loadFailed'));
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const trackedJob = useMemo(() => (
    jobs.find((job) => job.status === 'running') || jobs.find((job) => job.status === 'pending') || null
  ), [jobs]);

  useEffect(() => {
    if (!trackedJob) return undefined;
    const handle = setInterval(() => {
      api.get(routes.admin.badges.jobs())
        .then((res) => setJobs(res.data?.jobs ?? []))
        .catch(() => {});
    }, 2000);
    return () => clearInterval(handle);
  }, [trackedJob?.id, trackedJob?.status]);

  const cancelBackfill = async (jobId) => {
    const confirmed = window.confirm(t('badges.admin.backfillCancelConfirm', { defaultValue: 'Cancel the running backfill?' }));
    if (!confirmed) return;
    const toastId = toast.loading(t('badges.admin.backfillCancelling', { defaultValue: 'Cancelling backfill' }));
    try {
      await api.post(routes.admin.badges.cancel(jobId));
      toast.success(t('badges.admin.backfillCancelled', { defaultValue: 'Backfill cancelled' }), { id: toastId });
      const jobRes = await api.get(routes.admin.badges.jobs());
      setJobs(jobRes.data?.jobs ?? []);
    } catch (error) {
      toast.error(error?.response?.data?.error || t('badges.admin.backfillCancelFailed', { defaultValue: 'Could not cancel the backfill' }), { id: toastId });
    }
  };

  const reportJob = useMemo(
    () => jobs.find((job) => job.status === 'done' && Array.isArray(job.definitionTimings) && job.definitionTimings.length > 0) || null,
    [jobs],
  );

  const refreshBackfill = async () => {
    const toastId = toast.loading(t('badges.admin.backfillStarting', { defaultValue: 'Starting backfill' }));
    try {
      await api.post(routes.admin.badges.backfill(), {
        replace: true,
        startFrom: Math.max(0, Math.floor(Number(startFrom) || 0)),
      });
      toast.success(t('badges.admin.backfillStarted', { defaultValue: 'Replacement backfill started' }), { id: toastId });
      const jobRes = await api.get(routes.admin.badges.jobs());
      setJobs(jobRes.data?.jobs ?? []);
    } catch (error) {
      toast.error(error?.response?.data?.error || t('badges.admin.backfillFailed', { defaultValue: 'Could not start the backfill' }), { id: toastId });
    }
  };

  const downloadTimings = async (jobId) => {
    try {
      const res = await api.get(routes.admin.badges.timings(jobId), { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `badge-backfill-${jobId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('badges.admin.backfillReportFailed', { defaultValue: 'Could not download the timing report' }));
    }
  };

  useEffect(() => {
    if (!editorOpen || !/\bpack\s*\(/.test(form.expression)) return undefined;
    const handle = setTimeout(() => {
      api.get(routes.admin.badges.packs(), { params: { q: packQuery } })
        .then((res) => setPacks(res.data?.packs ?? []))
        .catch(() => setPacks([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [editorOpen, form.expression, packQuery]);

  useEffect(() => {
    if (!editorOpen) return undefined;
    const handle = setTimeout(() => {
      api.post(routes.admin.badges.formula(), { expression: form.expression })
        .then((res) => setFormulaState(res.data?.ok ? { ok: true, error: '' } : { ok: false, error: res.data?.error || 'Invalid expression' }))
        .catch(() => setFormulaState({ ok: false, error: t('badges.admin.saveFailed') }));
    }, 250);
    return () => clearTimeout(handle);
  }, [editorOpen, form.expression, t]);

  const save = async () => {
    if (!formulaState.ok) {
      toast.error(formulaState.error || t('badges.admin.saveFailed'));
      return;
    }
    const toastId = toast.loading(t('loading.saving', { ns: 'common' }));
    const body = {
      slug: form.slug,
      name: form.name,
      audience: form.audience,
      reducer: 'value',
      grant: form.grant,
      identity: form.identity,
      backfill: form.backfill,
      enabled: form.enabled,
      secret: form.secret,
      replace: form.replace,
      weight: Number(form.weight),
      confirm: form.confirm,
      curve: { start: 1, step: 1, round: 'none', direction: 'up' },
      tierLabels: form.tierLabels.filter((row) => row.label && Number(row.minTier) >= 1),
      display: {
        icon: form.icon || null,
        color: form.color || null,
        stat: form.stat,
        purple: form.purple,
      },
      params: {
        expression: form.expression.trim(),
        ...(form.packName ? { packName: form.packName } : {}),
        ...(Number(form.packId) > 0 ? { packId: Number(form.packId) } : {}),
      },
    };
    try {
      if (form.id) await api.put(routes.admin.badges.definition(form.id), body);
      else await api.post(routes.admin.badges.definitions(), body);
      toast.success(t('badges.admin.saved'), { id: toastId });
      setEditorOpen(false);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.error || t('badges.admin.saveFailed'), { id: toastId });
    }
  };

  const decide = async (review, decision) => {
    const videoUrl = videoDrafts[review.id] ?? review.videoUrl ?? '';
    if (decision === 'approved' && !String(videoUrl).trim()) {
      toast.error(t('badges.admin.videoRequired'));
      return;
    }
    try {
      await api.post(routes.admin.badges.review(review.id), { decision, videoUrl });
      toast.success(t('badges.admin.reviewSaved'));
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.error || t('badges.admin.reviewFailed'));
    }
  };

  if (user?.permissionFlags === undefined) {
    return (
      <div className="badge-admin-page">
        <MetaTags {...pageMeta} />
        <div className="page-content-1000">
          <div className="loader-shell loader-shell--tall"><div className="loader loader-relative" /></div>
        </div>
      </div>
    );
  }

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    return (
      <AccessDenied
        metaTitle={t('badges.admin.metaTitle')}
        metaDescription={t('badges.admin.metaDescription')}
      />
    );
  }

  return (
    <div className="badge-admin-page">
      <MetaTags {...pageMeta} />
      <div className="badge-admin-page__container page-content-1000">
        <div className="header-container">
          <h1>{t('badges.admin.title')}</h1>
          <div className="badge-admin-page__header-actions">
            <button type="button" className="badge-admin-page__icon-btn" onClick={() => setHelpOpen(true)} aria-label={t('badges.admin.help')}>
              <QuestionmarkCircleIcon size={28} />
            </button>
            <button type="button" className="badge-admin-page__icon-btn" onClick={load} aria-label={t('difficulty.header.refresh', { defaultValue: 'Refresh' })}>
              <RefreshIcon color="#fff" size="32px" />
            </button>
          </div>
        </div>
        <div className="tab-navigation" role="tablist">
          {PAGE_TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={pageTab === id}
              className={`tab-button${pageTab === id ? ' active' : ''}`}
              onClick={() => setPageTab(id)}
            >
              {t(`badges.admin.pageTabs.${id}`, { defaultValue: id === 'definitions' ? 'Badges' : id === 'reviews' ? 'Reviews' : 'Jobs' })}
            </button>
          ))}
        </div>

        {pageTab === 'definitions' && (
          <>
            <div className="badge-admin-page__actions">
              <div className="badge-admin-page__actions-main">
                <button type="button" className="btn-fill-primary" onClick={() => { setForm(emptyForm()); setEditorOpen(true); }}>
                  {t('badges.admin.new')}
                </button>
                <button type="button" className="btn-fill-secondary" onClick={() => setImportOpen(true)}>
                  {t('badges.admin.importCode')}
                </button>
                {!trackedJob && (
                  <>
                    <label className="badge-admin-page__start">
                      <span>{t('badges.admin.startFrom', { defaultValue: 'Start from #:' })}</span>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={startFrom}
                        onChange={(event) => setStartFrom(event.target.value)}
                      />
                    </label>
                    <button type="button" className="btn-fill-secondary" onClick={refreshBackfill}>
                      {t('badges.admin.refreshBackfill', { defaultValue: 'Refresh backfill' })}
                    </button>
                  </>
                )}
              </div>
              {(trackedJob || reportJob) && (
                <div className="badge-admin-page__actions-side">
                  {trackedJob && (
                    <button type="button" className="btn-fill-secondary" onClick={() => cancelBackfill(trackedJob.id)}>
                      {t('badges.admin.cancelBackfill', { defaultValue: 'Cancel backfill' })}
                    </button>
                  )}
                  {trackedJob && <BackfillBars job={trackedJob} definitions={definitions} t={t} />}
                  {!trackedJob && reportJob && (
                    <div className="badge-admin-page__report">
                      <span>{t('badges.admin.backfillReport', { defaultValue: 'Slowest badges' })}</span>
                      <button type="button" className="btn-fill-secondary" onClick={() => downloadTimings(reportJob.id)}>
                        {t('badges.admin.backfillReportDownload', { defaultValue: 'Download CSV' })}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {definitions.length > 0 && (
              <div className="badge-admin-page__filters">
                <label className="badge-admin-page__search">
                  <span>{t('badges.admin.search')}</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('badges.admin.searchPlaceholder')}
                    aria-label={t('badges.admin.search')}
                  />
                </label>
                <CustomSelect
                  label={t('badges.admin.audience')}
                  options={audienceOptions}
                  value={audienceOptions.find((option) => option.value === audienceFilter) ?? audienceOptions[0]}
                  onChange={(option) => setAudienceFilter(option?.value || 'all')}
                  width="12rem"
                  isSearchable={false}
                />
                <CustomSelect
                  label={t('badges.admin.reducer')}
                  options={reducerOptions}
                  value={reducerOptions.find((option) => option.value === reducerFilter) ?? reducerOptions[0]}
                  onChange={(option) => setReducerFilter(option?.value || 'all')}
                  width="14rem"
                />
                <CustomSelect
                  label={t('badges.admin.secret')}
                  options={secretOptions}
                  value={secretOptions.find((option) => option.value === secretFilter) ?? secretOptions[0]}
                  onChange={(option) => setSecretFilter(option?.value || 'all')}
                  width="12rem"
                  isSearchable={false}
                />
                <CustomSelect
                  label={t('badges.admin.enabled')}
                  options={enabledOptions}
                  value={enabledOptions.find((option) => option.value === enabledFilter) ?? enabledOptions[0]}
                  onChange={(option) => setEnabledFilter(option?.value || 'all')}
                  width="12rem"
                  isSearchable={false}
                />
                <p className="badge-admin-page__count">{t('badges.admin.showing', { count: filteredDefinitions.length, total: definitions.length })}</p>
              </div>
            )}
            {definitions.length === 0 && <p className="badge-admin-page__empty">{t('badges.empty')}</p>}
            {definitions.length > 0 && filteredDefinitions.length === 0 && <p className="badge-admin-page__empty">{t('badges.admin.noMatches')}</p>}
            <div className="badge-admin-page__grid">
              {filteredDefinitions.map((row) => {
                const progress = badgeBackfill(trackedJob, row);
                return (
                <button key={row.id} type="button" className="badge-admin-page__card" onClick={() => { setForm(formFromRow(row)); setEditorOpen(true); }}>
                  <span className="badge-admin-page__card-title">{row.name}</span>
                  <span className="badge-admin-page__card-meta">{row.audience} · {row.grantMode}</span>
                  <code className="badge-admin-page__card-script">
                    {row.params?.expression || t('badges.admin.noScript', { defaultValue: 'No grant script' })}
                  </code>
                  {progress && (
                    <span className="badge-admin-page__card-progress">
                      <span className="badge-admin-page__backfill-bar" aria-hidden="true">
                        <span style={{ width: `${(progress.processed / progress.total) * 100}%` }} />
                      </span>
                      {progress.audience === 'creator'
                        ? t('badges.admin.backfillCreators', { processed: progress.processed, total: progress.total })
                        : t('badges.admin.backfillPlayers', { processed: progress.processed, total: progress.total })}
                    </span>
                  )}
                  {row.secret && <span className="badge-admin-page__card-flag">{t('badges.admin.secret')}</span>}
                </button>
                );
              })}
            </div>
          </>
        )}

        {pageTab === 'reviews' && (
          <div className="badge-admin-page__stack">
            {reviews.length === 0 && <p className="badge-admin-page__empty">{t('badges.admin.noReviews', { defaultValue: 'No pending reviews.' })}</p>}
            {reviews.map((review) => (
              <div key={review.id} className="badge-admin-page__review">
                <span>#{review.id} pass {review.passId}</span>
                <input
                  value={videoDrafts[review.id] ?? review.videoUrl ?? ''}
                  onChange={(event) => setVideoDrafts((current) => ({ ...current, [review.id]: event.target.value }))}
                  placeholder={t('badges.admin.video')}
                />
                <button type="button" className="btn-fill-primary" onClick={() => decide(review, 'approved')}>{t('badges.admin.approve')}</button>
                <button type="button" className="btn-fill-secondary" onClick={() => decide(review, 'rejected')}>{t('badges.admin.reject')}</button>
              </div>
            ))}
          </div>
        )}

        {pageTab === 'jobs' && (
          <div className="badge-admin-page__stack">
            {jobs.length === 0 && <p className="badge-admin-page__empty">{t('badges.admin.noJobs', { defaultValue: 'No jobs yet.' })}</p>}
            {jobs.map((job) => (
              <div key={job.id} className="badge-admin-page__job">
                <span>#{job.id} {job.scope} {job.status}{job.phase ? ` · ${job.phase}` : ''}</span>
                {(job.status === 'running' || job.status === 'pending') && <BackfillBars job={job} definitions={definitions} t={t} />}
                {job.summary && <span>{job.summary}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {editorOpen && (
        <BadgeEditorPopup
          form={form}
          setForm={setForm}
          formulaState={formulaState}
          packs={packs}
          packQuery={packQuery}
          setPackQuery={setPackQuery}
          onClose={() => setEditorOpen(false)}
          onSave={save}
        />
      )}
      {importOpen && (
        <BadgeImportPopup
          onClose={() => setImportOpen(false)}
          onImported={load}
        />
      )}
      {helpOpen && <BadgeHelpPopup onClose={() => setHelpOpen(false)} />}
    </div>
  );
};

export default BadgeAdminPage;
