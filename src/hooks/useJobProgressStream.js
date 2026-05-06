// tuf-search: #useJobProgressStream
import { useEffect, useState } from 'react';

const baseURL = import.meta.env.VITE_API_URL || '';

/**
 * Subscribe to GET /v2/jobs/:jobId/stream (SSE, cookie auth).
 * Closes the EventSource when the job reaches a terminal phase or the hook disables.
 */
export function useJobProgressStream(jobId, enabled) {
  const [job, setJob] = useState(null);
  const [streamError, setStreamError] = useState(null);

  useEffect(() => {
    if (!enabled || !jobId) {
      setJob(null);
      setStreamError(null);
      return undefined;
    }

    setStreamError(null);
    const url = `${baseURL.replace(/\/$/, '')}/v2/jobs/${encodeURIComponent(jobId)}/stream`;
    const es = new EventSource(url, { withCredentials: true });
    let closed = false;
    let terminal = false;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'waiting') {
          setJob(null);
          return;
        }
        if (msg.type === 'job' && msg.data) {
          setJob(msg.data);
          if (msg.data.phase === 'completed' || msg.data.phase === 'failed') {
            terminal = true;
            es.close();
          }
        }
      } catch {
        /* ignore malformed chunks */
      }
    };

    es.onerror = () => {
      if (closed || terminal) {
        return;
      }
      setStreamError(new Error('Job progress stream interrupted'));
    };

    return () => {
      closed = true;
      es.close();
    };
  }, [jobId, enabled]);

  return { job, streamError };
}
