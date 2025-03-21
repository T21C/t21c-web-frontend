import { useState, useEffect } from 'react';
import DefaultAvatar from '@/components/common/icons/DefaultAvatar';
import './useravatar.css';

const UserAvatar = ({ 
  primaryUrl, 
  fallbackUrl, 
  className = '', 
  onError = () => {} 
}) => {
  const [imgSrc, setImgSrc] = useState(null);

  const handleImageError = async (primary, fallback) => {
    try {
      // Try primary URL first
      if (primary) {
        const response = await fetch(primary);
        if (response.ok) {
          setImgSrc(primary);
          return;
        }
      }
      
      // Try fallback URL if primary fails
      if (fallback && fallback !== 'none') {
        console.log('fallback', fallback);
        const response = await fetch(fallback);
        if (response.ok) {
          setImgSrc(fallback);
          return;
        }
      }
      
      // If both fail, set to null to show default avatar
      setImgSrc(null);
      onError();
    } catch (error) {
      console.error('Error loading avatar:', error);
      setImgSrc(null);
      onError();
    }
  };

  useEffect(() => {
    handleImageError(primaryUrl, fallbackUrl);
  }, [primaryUrl, fallbackUrl]);

  return (
    <div className={`avatar-container ${className}`}>
      {imgSrc ? (
        <img 
          src={imgSrc} 
          referrerPolicy="no-referrer" 
          alt="User avatar" 
          className="avatar-image"
          onError={() => {
            setImgSrc(null);
            onError();
          }}
        />
      ) : (
        <DefaultAvatar className="default-avatar" />
      )}
    </div>
  );
};

export default UserAvatar; 