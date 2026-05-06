// tuf-search: #ChunkedUploadClient #chunkedUploadClient #upload
import api from '@/utils/api';
import { createSHA256 } from 'hash-wasm';

/**
 * Reusable chunked upload client.
 *
 * Usage:
 *   const client = new ChunkedUploadClient({ kind: 'level-zip', baseUrl });
 *   const { session } = await client.upload(file, {
 *     meta: { levelId },
 *     onProgress: ({ phase, percent }) => setPct(percent),
 *     signal: abortController.signal,
 *   });
 *
 * Flow:
 *   1. Stream-hash the file with hash-wasm (sha256) while keeping the File reference only.
 *   2. POST /v2/upload/init with { kind, originalName, mimeType, declaredSize, declaredHash, chunkSize, meta }.
 *   3. PUT each missing chunk to /v2/upload/sessions/:id/chunks/:index as raw bytes.
 *      Respects server-advertised parallelism + retries 429/5xx/network errors with backoff.
 *   4. POST /v2/upload/sessions/:id/complete — server verifies the sha256 and returns the final session.
 *
 * Supports resume: if a session with the same hash+size+kind exists for the user, the server
 * returns it from /init and the client will only upload missing chunks. Pass `forceNew: true`
 * on `upload()` to drop that session server-side (e.g. after a 409 / missing assembled file).
 *
 * Supports cancel: passing `signal.abort()` aborts in-flight XHRs AND best-effort calls
 * DELETE /v2/upload/sessions/:id so the server tears down the row + workspace immediately.
 */

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024; // 8 MiB
const DEFAULT_PARALLEL = 3;
const DEFAULT_RETRIES = 4;

export class UploadError extends Error {
  constructor(message, { status = null, cause = null, phase = null } = {}) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
    this.phase = phase;
    if (cause) this.cause = cause;
  }
}

/**
 * Lightweight sha256 streamer over a File object. Reads 4 MiB slices sequentially to avoid
 * holding the full file in memory and keep the hashing worker fed.
 */
async function sha256OfFile(file, { signal, onProgress } = {}) {
  const hasher = await createSHA256();
  const HASH_SLICE = 4 * 1024 * 1024;
  let cursor = 0;
  while (cursor < file.size) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    const end = Math.min(cursor + HASH_SLICE, file.size);
    const blob = file.slice(cursor, end);
    // Blob#arrayBuffer keeps the data off the main thread and the GC releases it between slices.
    const buf = await blob.arrayBuffer();
    hasher.update(new Uint8Array(buf));
    cursor = end;
    onProgress?.(cursor / file.size);
  }
  return hasher.digest('hex');
}

async function putChunk({ baseUrl, sessionId, index, blob, signal, retries, onProgress }) {
  let attempt = 0;
  let lastErr = null;
  while (attempt <= retries) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    try {
      await api.post(
        `${baseUrl}/sessions/${encodeURIComponent(sessionId)}/chunks/${index}`,
        blob,
        {
          headers: { 'Content-Type': 'application/octet-stream' },
          signal,
          onUploadProgress: (evt) => {
            if (!evt || !evt.total) return;
            onProgress?.(Math.min(1, evt.loaded / evt.total));
          },
        },
      );
      return;
    } catch (err) {
      if (signal?.aborted || err?.name === 'CanceledError' || err?.name === 'AbortError') {
        throw err;
      }
      const status = err?.response?.status;
      const retriable = !status || status === 408 || status === 429 || (status >= 500 && status < 600);
      lastErr = err;
      if (!retriable || attempt === retries) break;
      const backoffMs = Math.min(15_000, 400 * 2 ** attempt) + Math.random() * 200;
      await new Promise((r) => setTimeout(r, backoffMs));
      attempt++;
    }
  }
  throw new UploadError(`Chunk ${index} failed after ${attempt} retries`, {
    status: lastErr?.response?.status ?? null,
    cause: lastErr,
    phase: 'chunk',
  });
}

export class ChunkedUploadClient {
  /**
   * @param {object} opts
   * @param {string} opts.kind - Server-side registered upload kind.
   * @param {string} [opts.baseUrl] - Defaults to `${VITE_API_URL}/v2/upload` via `api` base.
   * @param {number} [opts.chunkSize] - Requested chunk size. Server may clamp via its kind descriptor.
   * @param {number} [opts.parallelism] - Number of concurrent chunk PUTs.
   * @param {number} [opts.retries] - Per-chunk retry budget on retriable errors.
   */
  constructor({ kind, baseUrl = '/v2/upload', chunkSize = DEFAULT_CHUNK_SIZE, parallelism = DEFAULT_PARALLEL, retries = DEFAULT_RETRIES } = {}) {
    if (!kind) throw new Error('ChunkedUploadClient: `kind` is required');
    this.kind = kind;
    this.baseUrl = baseUrl;
    this.chunkSize = chunkSize;
    this.parallelism = Math.max(1, Math.min(8, parallelism));
    this.retries = retries;
  }

  async #init({ file, hash, meta, chunkSize, signal, forceNew = false }) {
    const body = {
      kind: this.kind,
      originalName: file.name.normalize('NFC'),
      mimeType: file.type || null,
      declaredSize: file.size,
      declaredHash: hash,
      chunkSize,
      meta: meta ?? null,
      ...(forceNew ? { forceNew: true } : {}),
    };
    try {
      const res = await api.post(`${this.baseUrl}/init`, body, { signal });
      return res.data;
    } catch (err) {
      throw new UploadError(err?.response?.data?.error || 'Upload init failed', {
        status: err?.response?.status ?? null,
        cause: err,
        phase: 'init',
      });
    }
  }

  async #complete({ sessionId, signal }) {
    try {
      const res = await api.post(`${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}/complete`, {}, {
        signal,
        timeout: 10 * 60 * 1000,
      });
      return res.data.session;
    } catch (err) {
      throw new UploadError(err?.response?.data?.error || 'Upload complete failed', {
        status: err?.response?.status ?? null,
        cause: err,
        phase: 'complete',
      });
    }
  }

  /** Best-effort: fire-and-forget server-side cancel. Ignores network errors. */
  async cancel(sessionId) {
    if (!sessionId) return;
    try {
      await api.delete(`${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}`);
    } catch {
      // Intentional: cancel must never throw.
    }
  }

  /**
   * Upload a File.
   *
   * @param {File} file
   * @param {object} [opts]
   * @param {Record<string, unknown>} [opts.meta] - Kind-specific metadata (e.g. `{ levelId }`).
   * @param {(p: { phase: 'hashing'|'uploading'|'completing', percent: number }) => void} [opts.onProgress]
   * @param {AbortSignal} [opts.signal]
   * @param {boolean} [opts.forceNew] - If true, server drops any resumable session for this file and starts fresh.
   * @returns {Promise<{ session: any }>}
   */
  async upload(file, opts = {}) {
    if (!file || !(file instanceof Blob)) throw new Error('upload(): file must be a Blob/File');
    const { meta = null, onProgress, signal, forceNew = false } = opts;

    const fire = (phase, percent) => onProgress?.({ phase, percent: Math.max(0, Math.min(100, percent)) });

    fire('hashing', 0);
    const hash = await sha256OfFile(file, {
      signal,
      onProgress: (p) => fire('hashing', p * 100),
    });
    fire('hashing', 100);

    const init = await this.#init({ file, hash, meta, chunkSize: this.chunkSize, signal, forceNew });
    const session = init.session;
    const sessionId = session.id;

    if (session.status === 'assembled') {
      fire('uploading', 100);
      fire('completing', 100);
      return { session };
    }

    const totalChunks = session.totalChunks;
    const chunkSize = session.chunkSize;
    const missing = Array.isArray(session.missingChunks) ? session.missingChunks.slice() : [];

    // Ordered dispatch: pull from the `missing` queue and upload in parallel.
    const chunkProgress = new Map(); // index -> fraction [0..1]
    const emitProgress = () => {
      const done = totalChunks - missing.length;
      const partial = Array.from(chunkProgress.values()).reduce((a, b) => a + b, 0);
      const percent = ((done + partial) / totalChunks) * 100;
      fire('uploading', percent);
    };

    emitProgress();
    if (missing.length > 0) {
      const queue = missing.slice();
      const workers = [];
      const concurrency = Math.min(this.parallelism, queue.length);
      const runOne = async () => {
        while (queue.length > 0) {
          if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
          const idx = queue.shift();
          const start = idx * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const blob = file.slice(start, end);
          chunkProgress.set(idx, 0);
          await putChunk({
            baseUrl: this.baseUrl,
            sessionId,
            index: idx,
            blob,
            signal,
            retries: this.retries,
            onProgress: (fraction) => {
              chunkProgress.set(idx, fraction);
              emitProgress();
            },
          });
          chunkProgress.delete(idx);
          const stillMissingIdx = missing.indexOf(idx);
          if (stillMissingIdx >= 0) missing.splice(stillMissingIdx, 1);
          emitProgress();
        }
      };
      for (let i = 0; i < concurrency; i++) workers.push(runOne());
      try {
        await Promise.all(workers);
      } catch (err) {
        // If aborted, best-effort cancel so the server doesn't hold the workspace.
        if (signal?.aborted || err?.name === 'CanceledError' || err?.name === 'AbortError') {
          this.cancel(sessionId);
        }
        throw err;
      }
    }
    fire('uploading', 100);

    fire('completing', 0);
    const finalSession = await this.#complete({ sessionId, signal });
    fire('completing', 100);

    return { session: finalSession };
  }
}

export default ChunkedUploadClient;
