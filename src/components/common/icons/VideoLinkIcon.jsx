// tuf-search: #VideoLinkIcon #videoLinkIcon #icons
import React from 'react';
import { getVideoProvider } from '@/utils/videoLink';
import VideoIcon from './VideoIcon';
import YoutubeIcon from './YoutubeIcon';
import BilibiliIcon from './BilibiliIcon';

const VideoLinkIcon = ({
  url,
  className = '',
  size = '1em',
  color = '#ffffff',
  ...props
}) => {
  const provider = getVideoProvider(url);
  const iconProps = { className, size, color, ...props };

  if (provider === 'youtube') {
    return <YoutubeIcon {...iconProps} />;
  }
  if (provider === 'bilibili') {
    return <BilibiliIcon {...iconProps} />;
  }
  return <VideoIcon {...iconProps} />;
};

export default VideoLinkIcon;
