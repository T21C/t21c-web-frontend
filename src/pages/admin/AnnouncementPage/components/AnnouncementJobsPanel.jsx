import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function StatusChip({ status, t }) {
  return (
    <span className={`announcement-status-chip announcement-status-chip--${status || 'queued'}`}>
      {t(`announcement.panel.status.${status || 'queued'}`)}
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

function RequestTree({ request, focusedRequestId, t }) {
  const [expanded, setExpanded] = useState(
    () => request.requestId === focusedRequestId || request.status === 'sending' || request.status === 'queued',
  );

  const isFocused = focusedRequestId && request.requestId === focusedRequestId;
  const items = request.items || [];

  return (
    <div
      className={`announcement-job-request${isFocused ? ' announcement-job-request--focused' : ''}`}
    >
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

      {expanded && (
        <div className="announcement-job-request-body">
          {items.length === 0 ? (
            <p className="announcement-jobs-empty announcement-jobs-empty--nested">
              {t('announcement.panel.noAnnouncements')}
            </p>
          ) : (
            items.map(item => (
              <div key={item.itemId} className="announcement-job-item">
                <div className="announcement-job-item-row">
                  <span className="announcement-job-item-label" title={item.label}>
                    {item.label || `#${item.itemId}`}
                  </span>
                  <StatusChip status={item.status} t={t} />
                </div>
                {(item.batches || []).length > 0 && (
                  <ul className="announcement-job-batches">
                    {item.batches.map(batch => (
                      <li key={batch.batchId} className="announcement-job-batch">
                        <span>{batch.webhookLabel}</span>
                        <span className="announcement-job-batch-progress">
                          {batch.destinationsDone}/{batch.destinationsRequired}
                        </span>
                        <StatusChip status={batch.status} t={t} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
          {request.error && (
            <div className="announcement-job-error">{request.error}</div>
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
}) {
  const { t } = useTranslation('pages');

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
              />
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={t('announcement.panel.recent')}
        count={recent.length}
        defaultOpen={false}
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
              />
            ))}
          </div>
        )}
      </CollapsibleSection>
    </aside>
  );
}

function formatRetryMs(ms) {
  const totalSeconds = Math.max(1, Math.ceil(Number(ms || 0) / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return `${Math.ceil(totalSeconds / 60)}m`;
}
