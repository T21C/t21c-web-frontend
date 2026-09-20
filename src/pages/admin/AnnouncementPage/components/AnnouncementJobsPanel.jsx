import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STALE_MS = 2 * 60 * 1000;
const ITEM_TERMINAL = new Set(['delivered', 'failed', 'skipped']);
const ITEM_IN_PROGRESS = new Set(['pending', 'sending']);
const REQUEST_IN_PROGRESS = new Set(['queued', 'sending', 'blocked']);
const PHASES = new Set([
  'queued',
  'preparing',
  'resolving',
  'waiting_gate',
  'sending_webhook',
  'recording',
]);

function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function isStale(updatedAt, now) {
  return Boolean(updatedAt) && now - updatedAt > STALE_MS;
}

function itemChipKey(item) {
  if (ITEM_TERMINAL.has(item.status)) return item.status;
  return item.phase || item.status || 'queued';
}

function chipLabel(status, t, extra = {}) {
  if (status === 'sending_webhook') {
    const label = extra.label;
    if (label) return t('announcement.panel.phase.sending_webhook', { label });
    return t('announcement.panel.status.sending');
  }
  if (PHASES.has(status)) {
    return t(`announcement.panel.phase.${status}`, extra);
  }
  return t(`announcement.panel.status.${status || 'queued'}`);
}

function StatusChip({ status, t, extra }) {
  return (
    <span className={`announcement-status-chip announcement-status-chip--${status || 'queued'}`}>
      {chipLabel(status, t, extra)}
    </span>
  );
}

function CollapsibleSection({ title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`announcement-jobs-section${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="announcement-jobs-section-toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="announcement-jobs-section-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span className="announcement-jobs-section-title">{title}</span>
        <span className="announcement-jobs-section-count">{count}</span>
      </button>
      {open && (
        <div className="announcement-jobs-section-body">
          {children}
        </div>
      )}
    </section>
  );
}

function formatErrorText(error, t) {
  if (!error) return '';
  if (error === 'Discarded') return t('announcement.panel.discarded');
  return error;
}

function StaleNote({ updatedAt, t }) {
  return (
    <div className="announcement-job-stale">
      {t('announcement.panel.stale', { time: formatTime(updatedAt) })}
    </div>
  );
}

function RequestTree({ request, focusedRequestId, t, now, onDiscard, discarding }) {
  const [expanded, setExpanded] = useState(
    () =>
      request.requestId === focusedRequestId
      || request.status === 'sending'
      || request.status === 'queued'
      || request.status === 'blocked',
  );

  const isFocused = focusedRequestId && request.requestId === focusedRequestId;
  const items = request.items || [];
  const requestStale =
    REQUEST_IN_PROGRESS.has(request.status) && isStale(request.updatedAt, now);
  const canDiscard = REQUEST_IN_PROGRESS.has(request.status);

  return (
    <div
      className={`announcement-job-request${isFocused ? ' announcement-job-request--focused' : ''}${
        requestStale ? ' announcement-job-request--stale' : ''
      }`}
    >
      <div className="announcement-job-request-top">
        <button
          type="button"
          className="announcement-job-request-header"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
        >
          <span className="announcement-job-request-meta">
            <span className="announcement-job-request-user">
              {request.requestedBy?.username || '—'}
            </span>
            <span className="announcement-job-request-time">{formatTime(request.createdAt)}</span>
          </span>
          <StatusChip status={request.status} t={t} />
        </button>
        {canDiscard && (
          <button
            type="button"
            className="announcement-job-discard"
            disabled={discarding}
            onClick={() => onDiscard?.(request)}
          >
            {t('announcement.panel.discard')}
          </button>
        )}
      </div>

      {expanded && (
        <div className="announcement-job-request-body">
          {requestStale && <StaleNote updatedAt={request.updatedAt} t={t} />}
          {items.length === 0 ? (
            <p className="announcement-jobs-empty announcement-jobs-empty--nested">
              {t('announcement.panel.noAnnouncements')}
            </p>
          ) : (
            items.map(item => {
              const chip = itemChipKey(item);
              const sendingBatch = (item.batches || []).find(b => b.status === 'sending');
              const itemStale =
                ITEM_IN_PROGRESS.has(item.status) && isStale(item.updatedAt, now);
              return (
                <div
                  key={item.itemId}
                  className={`announcement-job-item${itemStale ? ' announcement-job-item--stale' : ''}`}
                >
                  <div className="announcement-job-item-row">
                    <span className="announcement-job-item-label" title={item.label}>
                      {item.label || `#${item.itemId}`}
                    </span>
                    <StatusChip
                      status={chip}
                      t={t}
                      extra={
                        chip === 'sending_webhook'
                          ? { label: sendingBatch?.webhookLabel || '' }
                          : undefined
                      }
                    />
                  </div>
                  {item.attempt > 1 && (
                    <div className="announcement-job-attempt">
                      {t('announcement.panel.attempt', { count: item.attempt })}
                    </div>
                  )}
                  {itemStale && <StaleNote updatedAt={item.updatedAt} t={t} />}
                  {(item.batches || []).length > 0 && (
                    <ul className="announcement-job-batches">
                      {item.batches.map(batch => (
                        <li key={batch.batchId} className="announcement-job-batch-wrap">
                          <div className="announcement-job-batch">
                            <span>{batch.webhookLabel}</span>
                            <span className="announcement-job-batch-progress">
                              {batch.destinationsDone}/{batch.destinationsRequired}
                            </span>
                            <StatusChip status={batch.status} t={t} />
                          </div>
                          {batch.error && (
                            <div className="announcement-job-error">{formatErrorText(batch.error, t)}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.error && (
                    <div className="announcement-job-error">{formatErrorText(item.error, t)}</div>
                  )}
                </div>
              );
            })
          )}
          {request.error && (
            <div className="announcement-job-error">{formatErrorText(request.error, t)}</div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Per-tab announcement progress side panel.
 */
export default function AnnouncementJobsPanel({
  open = [],
  recent = [],
  focusedRequestId = null,
  gate = null,
  loading = false,
  onDiscard = null,
  discardingRequestId = null,
}) {
  const { t } = useTranslation('pages');
  const [now, setNow] = useState(() => Date.now());
  // Keep Recent expanded by default so completed jobs are visible after refresh
  // (In progress is often empty once delivery finishes).
  const recentDefaultOpen = recent.length > 0 || open.length === 0;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="announcement-jobs-panel">
      <h2 className="announcement-jobs-panel-title">{t('announcement.panel.title')}</h2>

      {gate?.blocked && (
        <div className="announcement-gate-banner announcement-gate-banner--panel" role="status">
          {t('announcement.gate.banner', {
            time: formatRetryMs(gate.retryAfterMs),
          })}
        </div>
      )}

      {loading ? (
        <div className="announcement-jobs-loading" aria-busy="true">
          <div className="loader loader-relative" />
          <p className="announcement-jobs-empty">{t('announcement.panel.loading')}</p>
        </div>
      ) : (
        <>
          <CollapsibleSection
            title={t('announcement.panel.inProgress')}
            count={open.length}
            defaultOpen
          >
            {open.length === 0 ? (
              <p className="announcement-jobs-empty">{t('announcement.panel.emptyInProgress')}</p>
            ) : (
              <div className="announcement-jobs-list">
                {open.map(req => (
                  <RequestTree
                    key={req.requestId}
                    request={req}
                    focusedRequestId={focusedRequestId}
                    t={t}
                    now={now}
                    onDiscard={onDiscard}
                    discarding={discardingRequestId === req.requestId}
                  />
                ))}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title={t('announcement.panel.recent')}
            count={recent.length}
            defaultOpen={recentDefaultOpen}
          >
            {recent.length === 0 ? (
              <p className="announcement-jobs-empty">{t('announcement.panel.emptyRecent')}</p>
            ) : (
              <div className="announcement-jobs-list">
                {recent.map(req => (
                  <RequestTree
                    key={req.requestId}
                    request={req}
                    focusedRequestId={focusedRequestId}
                    t={t}
                    now={now}
                    onDiscard={onDiscard}
                    discarding={discardingRequestId === req.requestId}
                  />
                ))}
              </div>
            )}
          </CollapsibleSection>
        </>
      )}
    </aside>
  );
}

function formatRetryMs(ms) {
  const totalSeconds = Math.max(1, Math.ceil(Number(ms || 0) / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return `${Math.ceil(totalSeconds / 60)}m`;
}
