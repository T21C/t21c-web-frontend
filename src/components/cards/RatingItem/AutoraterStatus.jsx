import { useEffect, useState } from 'react';
import { fetchAutoraterStatus } from '@/utils/autoraterStatus';
import './autoraterstatus.css';

const widgetOrigin = new URL(
  import.meta.env.VITE_AUTORATER_WIDGET_URL || 'https://www.auto-rater-cat.com'
).origin;

export default function AutoraterStatus({ levelId, rating }) {
  const [state, setState] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const id = Number(levelId);
  const validId = Number.isSafeInteger(id) && id > 0 && id <= 2147483647;
  useEffect(() => {
    let active = true;
    setState(null);
    if (!validId) return undefined;
    fetchAutoraterStatus(widgetOrigin, id, rating).then(
      data => { if (active) setState({ id, rating, data }); },
      () => { if (active) setState({ id, rating, error: true }); },
    );
    return () => { active = false; };
  }, [id, validId, rating, attempt]);

  if (!validId) return null;
  const current = state?.id === id && state?.rating === rating ? state : null;
  const data = current?.data;
  const status = data?.outdated === true ? 'outdated'
    : data?.outdated === false ? 'not outdated' : 'Status unknown';
  const retry = <button type="button" onClick={() => setAttempt(value => value + 1)}>Check again</button>;
  let content;
  if (!current) {
    content = <span role="status">Checking AutoRater status…</span>;
  } else if (current.error) {
    content = <span role="status">Status unavailable — Warnings: Unknown {retry}</span>;
  } else {
    const warningLabel = data.warning_count === null ? 'Warnings: Unknown'
      : data.warning_count === 0 && data.warnings_status === 'complete' ? 'Warning: None'
        : `Warnings (${data.warning_count})${data.warnings_status === 'complete' ? '' : ` · ${data.warnings_status}`}`;
    const label = <>
      <span className="autorater-status-rating" data-outdated={data.outdated === null ? 'unknown' : String(data.outdated)}>{status}</span>
      {' — '}<span className="autorater-status-warning">{warningLabel}</span>
    </>;
    content = <>
      {data.warnings.length ? <details>
        <summary>
          <span>{label}</span>
          <span className="autorater-status-preview">{data.warnings.map(item => item.label).join(', ')}</span>
        </summary>
        <ul className="autorater-status-reasons" aria-label="AutoRater warning reasons" tabIndex={0}>
          {data.warnings.map(item => <li key={item.code}><strong>{item.label}</strong>{item.detail && `: ${item.detail}`}</li>)}
        </ul>
      </details> : <span>{label}</span>}
      {(data.outdated === null || data.warnings_status !== 'complete') && <div className="autorater-status-note">
        {data.reason === 'missing_record' || data.status === 'missing' ? 'Open the analysis to generate a saved rating. '
          : 'The saved analysis could not fully verify this status. '}{retry}
      </div>}
    </>;
  }
  return <div className="autorater-status" data-status={data?.status || 'unknown'}
    data-has-warnings={Boolean(data?.warnings.length)}
    onClick={event => event.stopPropagation()}>{content}</div>;
}
