// tuf-search: #UserAvatar #userAvatar #layout
import { useState, useEffect, useRef } from 'react';
import DefaultAvatar from '@/components/common/icons/DefaultAvatar';
import './useravatar.css';
import { selectIconSize } from '@/utils/Utility';

const UserAvatar = ({
  primaryUrl,
  fallbackUrl = '',
  className = '',
  onError = () => {},
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

  return (
    <div className={`user-avatar-container ${className}`}>
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
  );
};

export default UserAvatar;
