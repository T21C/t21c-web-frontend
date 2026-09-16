// tuf-search: #PassMedia #passDetail #autoSubmission
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getVideoDetails } from '@/utils';
import { getPrimaryVideoLink } from '@/utils/videoLink';
import { isAutoSubmittedPass } from '@/utils/passSubmissionSource';
import PassReplay from './replay/PassReplay';

const PassMedia = ({ pass }) => {
  const { t } = useTranslation('pages');
  const [resolved, setResolved] = useState(null);
  const autoSubmitted = isAutoSubmittedPass(pass);
  const videoLink = autoSubmitted ? null : pass.videoLink;

  useEffect(() => {
    let active = true;
    if (videoLink) {
      void getVideoDetails(videoLink).then((detail) => {
        if (active) setResolved({ videoLink, detail });
      }).catch(() => {
        if (active) setResolved({ videoLink, detail: null });
      });
    }
    return () => { active = false; };
  }, [videoLink]);

  if (autoSubmitted) return <PassReplay key={`${pass.id}:${pass.autoSubmissionRunId}`} pass={pass} />;
  const videoDetail = resolved?.videoLink === videoLink ? resolved.detail : null;

  return (
    <div className="youtube">
      {videoDetail ? (
        <iframe
          src={videoDetail.embed}
          title="Video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <div className="thumbnail-container">
          <div className="thumbnail-text">
            <p>{t('passDetail.video.notAvailable.text')}</p>
            {videoLink && (
              <a href={getPrimaryVideoLink(videoLink)} target="_blank" rel="noopener noreferrer">
                {t('passDetail.video.notAvailable.watchOnYoutube')}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PassMedia;
