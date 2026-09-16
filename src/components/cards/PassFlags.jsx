// tuf-search: #PassFlags #passFlags #cards
import { useTranslation } from 'react-i18next';
import PassAdofaiV2Flag from './PassAdofaiV2Flag';
import { AdofaiIcon } from '@/components/common/icons';
import PassAutoSubmissionFlag from './PassAutoSubmissionFlag';
import { isAutoSubmittedPass } from '@/utils/passSubmissionSource';
import { getPassKeycountBadgeType, getPassKeycountBadgeValue } from '@/utils/Utility';
import { ADOFAI_VERSION, adofaiVersionFromPass } from '@/utils/adofaiVersion';

const keyCountFlagLabel = (pass, t) => {
  const type = getPassKeycountBadgeType(pass);
  if (type === 'keyCount') {
    return t('cards.pass.flags.keyCount', { count: getPassKeycountBadgeValue(pass) });
  }
  if (type === '16k') {
    return t('cards.pass.flags.sixteenKey');
  }
  if (type === '12k') {
    return t('cards.pass.flags.twelveKey');
  }
  return null;
};

const PassFlags = ({ pass, className = 'flags-wrapper' }) => {
  const { t } = useTranslation('components');
  const keyCountLabel = keyCountFlagLabel(pass, t);
  const era = adofaiVersionFromPass(pass);
  const showV2 = era === ADOFAI_VERSION.V2;
  const showPre340 = era === ADOFAI_VERSION.PRE_3_4_0;
  const showXPerfect = !!(pass?.isXPerfectMode || pass?.flags?.isXPerfectMode);
  if (!keyCountLabel && !pass?.isNoHoldTap && !showV2 && !showPre340 && !showXPerfect && !isAutoSubmittedPass(pass)) {
    return null;
  }

  return (
    <div className={className}>
      {isAutoSubmittedPass(pass) && <PassAutoSubmissionFlag />}
      {keyCountLabel ? <div className="flag">{keyCountLabel}</div> : null}
      {pass.isNoHoldTap && <div className="flag">{t('cards.pass.flags.noHoldTap')}</div>}
      {showV2 && <PassAdofaiV2Flag className="flag flag--adofai-v2" />}
      {showPre340 && (
        <span className="flag flag--adofai-pre340">
          <AdofaiIcon size={14} color="currentColor" rotation={-20} aria-hidden />
          {t('cards.pass.flags.adofaiPre340')}
        </span>
      )}
      {showXPerfect && <div className="flag">{t('cards.pass.flags.xPerfect')}</div>}
    </div>
  );
};

export default PassFlags;
