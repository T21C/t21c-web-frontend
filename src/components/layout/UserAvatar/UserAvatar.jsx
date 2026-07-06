// tuf-search: #UserAvatar #userAvatar #layout
import { useState, useEffect, useRef } from 'react';
import DefaultAvatar from '@/components/common/icons/DefaultAvatar';
import './useravatar.css';
import { selectIconSize } from '@/utils/Utility';

/**
 * @param {{
 *   primaryUrl?: string,
 *   fallbackUrl?: string,
 *   className?: string,
 *   onError?: () => void,
 *   frame?: { url?: string | null, config?: Record<string, unknown> | null } | null,
 * }} props
 */
const UserAvatar = ({
  primaryUrl,
  fallbackUrl = '',
  className = '',
  onError = () => {},
  frame = null,
}) => {
  const [imgSrc, setImgSrc] = useState(null);
  const switchedToFallbackRef = useRef(false);

  useEffect(() => {
    switchedToFallbackRef.current = false;
    const primary = selectIconSize(primaryUrl, 'small');
    const fallback = selectIconSize(fallbackUrl, 'small');
    if (primary) {
      setImgSrc(primary);
    } else if (fallback && fallback !== 'none') {
      setImgSrc(fallback);
    } else {
      setImgSrc(null);
    }
  }, [primaryUrl, fallbackUrl]);

  const handleImgError = () => {
    const primary = selectIconSize(primaryUrl, 'small');
    const fallback = selectIconSize(fallbackUrl, 'small');
    if (
      !switchedToFallbackRef.current &&
      primary &&
      fallback &&
      fallback !== 'none' &&
      fallback !== primary
    ) {
      switchedToFallbackRef.current = true;
      setImgSrc(fallback);
      return;
    }
    setImgSrc(null);
    onError();
  };

  const frameUrl = frame?.url || null;
  const inset =
    frame?.config && typeof frame.config.inset === 'number'
      ? frame.config.inset
      : 8;
  const frameStyle = frameUrl
    ? {
        ['--avatar-frame-inset']: `${inset}%`,
        ...(frame?.config?.zIndex != null
          ? { zIndex: Number(frame.config.zIndex) }
          : {}),
      }
    : undefined;

  return (
    <div
      className={`user-avatar-container${frameUrl ? ' user-avatar-container--framed' : ''} ${className}`}
      style={frameStyle}
    >
      <div className="user-avatar-inner">
        {imgSrc ? (
          <img
            src={imgSrc}
            referrerPolicy="no-referrer"
            alt="User avatar"
            className="avatar-image"
            onError={handleImgError}
          />
        ) : (
          <DefaultAvatar className="avatar-image" />
        )}
      </div>
      {frameUrl ? (
        <img
          src={frameUrl}
          alt=""
          className="user-avatar-frame"
          aria-hidden="true"
          draggable={false}
        />
      ) : null}
    </div>
  );
};

export default UserAvatar;
