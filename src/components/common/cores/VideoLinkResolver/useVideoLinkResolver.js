// tuf-search: #useVideoLinkResolver #cores #videoLinkResolver #b23
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { getLocalVideoPreview } from '@/utils/videoLink';
import { resolveSubmissionVideoUrl } from '@/utils/resolveVideoUrl';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';

/**
 * Shared b23.tv resolve-and-replace logic used by submission and edit forms.
 *
 * Watches `value`; when it contains a b23.tv short link that resolves to a
 * different (Bilibili) URL, it calls `onResolve(resolvedUrl)` so the caller can
 * swap the field value, and shows a success toast. When `onVideoDetail` is
 * provided, it also builds a quota-free local embed preview.
 *
 * @param {object} args
 * @param {string} args.value                 Current video link value.
 * @param {(url: string) => void} [args.onResolve]      Called with the expanded URL.
 * @param {(details: object|null) => void} [args.onVideoDetail] Called with local preview.
 * @param {string} [args.toastMessage]        Success toast shown after a replace.
 * @param {boolean} [args.enabled=true]       Disable to skip all resolving.
 * @param {number} [args.debounceMs=500]      Debounce window for the request.
 * @returns {{ resolving: boolean }}
 */
export function useVideoLinkResolver({
  value,
  onResolve,
  onVideoDetail,
  toastMessage,
  enabled = true,
  debounceMs = 500,
}) {
  const [resolving, setResolving] = useState(false);
  const resolveRequest = useDebouncedRequest(debounceMs);

  // Keep the latest callbacks/message in refs so the effect only re-runs on
  // meaningful input changes (value/enabled), never on parent re-renders.
  const onResolveRef = useRef(onResolve);
  const onVideoDetailRef = useRef(onVideoDetail);
  const toastMessageRef = useRef(toastMessage);
  onResolveRef.current = onResolve;
  onVideoDetailRef.current = onVideoDetail;
  toastMessageRef.current = toastMessage;

  useEffect(() => {
    if (!enabled) {
      setResolving(false);
      return undefined;
    }

    const videoLink = value?.trim?.() ?? '';
    if (!videoLink) {
      setResolving(false);
      onVideoDetailRef.current?.(null);
      return undefined;
    }

    onVideoDetailRef.current?.(getLocalVideoPreview(videoLink));
    setResolving(true);

    resolveRequest(({ signal }) =>
      resolveSubmissionVideoUrl(videoLink, { signal })
        .then(({ url: resolvedUrl, resolved }) => {
          if (resolved && resolvedUrl && resolvedUrl !== videoLink) {
            onResolveRef.current?.(resolvedUrl);
            if (toastMessageRef.current) {
              toast.success(toastMessageRef.current);
            }
          }

          onVideoDetailRef.current?.(getLocalVideoPreview(resolvedUrl) || null);
        })
        .catch((error) => {
          if (api.isCancel(error)) return;
          if (!getLocalVideoPreview(videoLink)) {
            onVideoDetailRef.current?.(null);
          }
        })
        .finally(() => {
          setResolving(false);
        }),
    );

    return () => {
      resolveRequest.cancel();
    };
  }, [value, enabled, resolveRequest]);

  return { resolving };
}

export default useVideoLinkResolver;
