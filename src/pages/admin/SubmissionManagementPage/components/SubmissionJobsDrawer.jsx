import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChartIcon, PassIcon } from '@/components/common/icons';

function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function KindIcon({ kind }) {
  const Icon = kind === 'pass' ? PassIcon : ChartIcon;
  return (
    <span className="submission-job-kind-icon" aria-hidden="true">
      <Icon size={16} color="currentColor" />
    </span>
  );
}

function ResultLink({ item, t }) {
  if (item.kind === 'pass' && item.passId) {
    return (
      <Link
        className="submission-job-level-link"
        to={`/passes/${item.passId}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={event => event.stopPropagation()}
      >
        {t('submissionManagement.jobs.openPass', { id: item.passId })}
      </Link>
    );
  }
  if (item.kind === 'level' && item.levelId) {
    return (
      <Link
        className="submission-job-level-link"
        to={`/levels/${item.levelId}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={event => event.stopPropagation()}
      >
        {t('submissionManagement.jobs.openLevel', { id: item.levelId })}
      </Link>
    );
  }
  return null;
}

function chipStatus(status, action) {
  if (status === 'completed' && action === 'decline') return 'declined';
  if (status === 'completed') return 'accepted';
  return status || 'queued';
}

function StatusChip({ status, action, t }) {
  const display = chipStatus(status, action);
  return (
    <span className={`submission-status-chip submission-status-chip--${display}`}>
      {t(`submissionManagement.jobs.status.${display}`)}
    </span>
  );
}

function currentStep(item) {
  return (item?.steps || []).find(step => step.status === 'processing')
    || (item?.steps || []).find(step => step.status === 'failed')
    || null;
}

function CollapsibleSection({ title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`submission-jobs-section${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="submission-jobs-section-toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="submission-jobs-section-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span className="submission-jobs-section-title">{title}</span>
        <span className="submission-jobs-section-count">{count}</span>
      </button>
      {open && (
        <div className="submission-jobs-section-body">
          {children}
        </div>
      )}
    </section>
  );
}

function isBatchRequest(request) {
  return request.origin === 'auto' || (request.items?.length || request.itemIds?.length || 0) > 1;
}

function ItemProgress({ item, t, showLabel = true }) {
  const step = currentStep(item);
  return (
    <div className="submission-job-item">
      {showLabel && (
        <div className="submission-job-item-row">
          <span className="submission-job-item-label" title={item.label}>
            {item.label || `#${item.itemId}`}
          </span>
          <StatusChip status={item.status} action={item.action} t={t} />
        </div>
      )}
      <ResultLink item={item} t={t} />
      {step && (
        <div className="submission-job-step">
          <span>{t(`submissionManagement.jobs.steps.${step.id}`, { defaultValue: step.id })}</span>
          <StatusChip status={step.status} t={t} />
        </div>
      )}
      {item.error && (
        <div className="submission-job-error">{item.error}</div>
      )}
    </div>
  );
}

function RequestTree({ request, t }) {
  const items = request.items || [];
  const batch = isBatchRequest(request);
  const primary = items[0];
  const [expanded, setExpanded] = useState(
    () => request.status === 'processing' || request.status === 'queued',
  );

  const title = batch
    ? (request.requestedBy?.username || '—')
    : (primary?.label || `#${primary?.itemId || request.itemIds?.[0] || ''}`);
  const status = batch ? request.status : (primary?.status || request.status);

  return (
    <div className={`submission-job-request${batch ? ' submission-job-request--batch' : ''}`}>
      <button
        type="button"
        className="submission-job-request-header"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <span className="submission-job-request-kind">
          <KindIcon kind={request.kind} />
        </span>
        <span className="submission-job-request-meta">
          <span className="submission-job-request-title" title={title}>
            {title}
          </span>
          <span className="submission-job-request-sub">
            {batch
              ? t('submissionManagement.jobs.autoAllowBatch')
              : t('submissionManagement.jobs.requestedBy', {
                  name: request.requestedBy?.username || '—',
                })}
            <span className="submission-job-request-time">{formatTime(request.createdAt)}</span>
          </span>
        </span>
        <StatusChip status={status} action={request.action || primary?.action} t={t} />
      </button>

      {expanded && (
        <div className="submission-job-request-body">
          {items.length === 0 ? (
            <p className="submission-jobs-empty submission-jobs-empty--nested">
              {t('submissionManagement.jobs.emptyItems')}
            </p>
          ) : batch ? (
            items.map(item => (
              <ItemProgress
                key={`${item.kind}:${item.itemId}`}
                item={item}
                t={t}
              />
            ))
          ) : (
            <ItemProgress item={primary} t={t} showLabel={false} />
          )}
          {request.error && (
            <div className="submission-job-error">{request.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SubmissionJobsDrawer({
  open = [],
  recent = [],
  loading = false,
  expanded,
  onToggle,
}) {
  const { t } = useTranslation('pages');
  const recentDefaultOpen = recent.length > 0 || open.length === 0;
  const title = t('submissionManagement.jobs.title');

  return (
    <aside className={`submission-jobs-drawer${expanded ? ' is-expanded' : ''}`}>
      <div className="submission-jobs-drawer-inner">
        <button
          type="button"
          className="submission-jobs-drawer-handle"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls="submission-jobs-drawer-panel"
          title={expanded ? t('submissionManagement.jobs.hide') : title}
        >
          <span className="submission-jobs-drawer-handle-label">{title}</span>
          {open.length > 0 && (
            <span className="submission-jobs-drawer-badge">{open.length}</span>
          )}
        </button>

        <div
          id="submission-jobs-drawer-panel"
          className="submission-jobs-drawer-body"
        >
          <h2 className="submission-jobs-drawer-title">{title}</h2>

          {loading ? (
            <div className="submission-jobs-loading" aria-busy="true">
              <div className="loader loader-relative" />
              <p className="submission-jobs-empty">{t('submissionManagement.jobs.loading')}</p>
            </div>
          ) : (
            <>
              <CollapsibleSection
                title={t('submissionManagement.jobs.processing')}
                count={open.length}
                defaultOpen
              >
                {open.length === 0 ? (
                  <p className="submission-jobs-empty">{t('submissionManagement.jobs.emptyProcessing')}</p>
                ) : (
                  <div className="submission-jobs-list">
                    {open.map(req => (
                      <RequestTree key={req.requestId} request={req} t={t} />
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title={t('submissionManagement.jobs.done')}
                count={recent.length}
                defaultOpen={recentDefaultOpen}
              >
                {recent.length === 0 ? (
                  <p className="submission-jobs-empty">{t('submissionManagement.jobs.emptyDone')}</p>
                ) : (
                  <div className="submission-jobs-list">
                    {recent.map(req => (
                      <RequestTree key={req.requestId} request={req} t={t} />
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
