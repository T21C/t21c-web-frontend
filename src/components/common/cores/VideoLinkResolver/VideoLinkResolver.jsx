// tuf-search: #VideoLinkResolver #cores #videoLinkResolver #b23
import { useTranslation } from 'react-i18next';
import { useVideoLinkResolver } from './useVideoLinkResolver';
import './VideoLinkResolver.css';

/**
 * Drop-in element that resolves b23.tv short links in a video-link field and
 * replaces the value with the expanded Bilibili URL. Mount it next to any video
 * link input, feeding it the current value and an onResolve setter. It renders
 * an unobtrusive status line only while a resolve is in flight.
 *
 * @param {object} props
 * @param {string} props.value                     Current video link value.
 * @param {(url: string) => void} props.onResolve  Called with the expanded URL.
 * @param {boolean} [props.enabled=true]           Disable to skip resolving.
 * @param {string} [props.toastMessage]            Override success toast copy.
 * @param {string} [props.className]               Extra class on the wrapper.
 */
export const VideoLinkResolver = ({
  value,
  onResolve,
  enabled = true,
  toastMessage,
  className = '',
}) => {
  const { t } = useTranslation('common');
  const resolvedToast =
    toastMessage ??
    t('videoResolver.resolved', { defaultValue: 'Short link resolved to Bilibili URL' });

  const { resolving } = useVideoLinkResolver({
    value,
    onResolve,
    enabled,
    toastMessage: resolvedToast,
  });

  if (!resolving) return null;

  return (
    <div className={`video-link-resolver ${className}`.trim()}>
      <span className="video-link-resolver__spinner" aria-hidden="true" />
      <span className="video-link-resolver__label">
        {t('videoResolver.resolving', { defaultValue: 'Resolving short link…' })}
      </span>
    </div>
  );
};

export default VideoLinkResolver;
