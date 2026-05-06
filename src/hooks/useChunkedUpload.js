// tuf-search: #useChunkedUpload
import { useCallback, useRef, useState } from 'react';
import { ChunkedUploadClient } from '@/utils/upload/ChunkedUploadClient';

/**
 * Thin React hook over {@link ChunkedUploadClient}.
 *
 * Keeps upload progress as `{ phase, percent }` and exposes an `abort()` that tears down the
 * in-flight request + tells the server to drop the session. A fresh AbortController is minted
 * for every `upload()` call so the hook can be reused across multiple uploads.
 */
export function useChunkedUpload({ kind, baseUrl, chunkSize, parallelism, retries } = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ phase: 'idle', percent: 0 });
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const controllerRef = useRef(null);
  const clientRef = useRef(null);

  if (!clientRef.current || clientRef.current.kind !== kind) {
    clientRef.current = new ChunkedUploadClient({ kind, baseUrl, chunkSize, parallelism, retries });
  }

  const upload = useCallback(
    async (file, { meta = null } = {}) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsUploading(true);
      setError(null);
      setSession(null);
      setProgress({ phase: 'hashing', percent: 0 });
      try {
        const { session: finalSession } = await clientRef.current.upload(file, {
          meta,
          signal: controller.signal,
          onProgress: (p) => setProgress(p),
        });
        setSession(finalSession);
        setProgress({ phase: 'completed', percent: 100 });
        return finalSession;
      } catch (err) {
        if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
          setProgress({ phase: 'cancelled', percent: 0 });
        } else {
          setError(err);
          setProgress({ phase: 'failed', percent: 0 });
        }
        throw err;
      } finally {
        setIsUploading(false);
        controllerRef.current = null;
      }
    },
    [],
  );

  const abort = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  return { upload, abort, isUploading, progress, error, session };
}

export default useChunkedUpload;
