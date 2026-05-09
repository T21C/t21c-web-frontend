// tuf-search: #TUFStellarIcon #tufStellarIcon #icons
import React, { useMemo } from 'react';
import tufStellar1 from '@/assets/icons/tufstellar1.png';
import tufStellar2 from '@/assets/icons/tufstellar2.png';
import tufStellar3 from '@/assets/icons/tufstellar3.png';

export const TUFStellarIcon = ({ size = 24, svg = false, variant = "1", ...props }) => {
  const tufStellarImage = useMemo(() => {
    switch (variant) {
      case "1":
        return tufStellar1;
      case "2":
        return tufStellar2;
      case "3":
        return tufStellar3;
      default:
        return tufStellar1;
    }
  }, [variant]);

  return svg ? (
    <image href={tufStellarImage} alt="TUF Stellar" width={size} height={size} {...props} />
    ) : (
    <img src={tufStellarImage} alt="TUF Stellar" width={size} height={size} {...props} />
    )
}
