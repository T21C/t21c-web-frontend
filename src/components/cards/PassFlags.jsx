// tuf-search: #PassFlags #passFlags #cards
import { useTranslation } from 'react-i18next';
import PassAdofaiV2Flag from './PassAdofaiV2Flag';
import { getPassKeycountBadgeType, getPassKeycountBadgeValue } from '@/utils/Utility';

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
  if (!keyCountLabel && !pass?.isNoHoldTap && !pass?.isAdofaiV2) {
    return null;
  }

  return (
    <div className={className}>
      {keyCountLabel ? <div className="flag">{keyCountLabel}</div> : null}
      {pass.isNoHoldTap && <div className="flag">{t('cards.pass.flags.noHoldTap')}</div>}
      {pass.isAdofaiV2 && <PassAdofaiV2Flag className="flag flag--adofai-v2" />}
    </div>
  );
};

export default PassFlags;
